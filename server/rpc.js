// Shrimpion game-data API (Turso / libSQL).
// One POST endpoint, /api/rpc, takes { action, ...args }. Used by api/rpc.js on Vercel
// and by the Vite dev middleware locally. Secrets come from process.env and never reach the browser.
import { createClient } from '@libsql/client';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const USERNAME_RE = /^[a-zA-Z0-9_]{3,16}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const CAT_RE = /^[a-z0-9_-]{1,32}$/;
const RUN_ID_RE = /^[a-zA-Z0-9:_-]{1,80}$/;
const PFP_RE = /^[a-z0-9_-]{1,32}$/;
const MAX_DIVE_POINTS = 1225;
const MAX_RUN_BYTES = 64 * 1024;
const MAX_STATS_BYTES = 8 * 1024;
const MAX_RECORD_BYTES = 32 * 1024;
const HISTORY_ID_RE = /^daily:\d{4}-\d{2}-\d{2}:[a-z0-9_-]{1,32}$/;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const bad = (msg) => new HttpError(400, msg);

/* ---------- database ---------- */

let client = null;
let schemaReady = null;

function db() {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL;
    if (!url) throw new HttpError(503, 'The database isn’t configured yet.');
    client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  }
  return client;
}

export const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    uid TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    username_lower TEXT NOT NULL UNIQUE,
    pfp TEXT NOT NULL DEFAULT 'basic',
    stats TEXT NOT NULL DEFAULT '{}',
    today_date TEXT,
    today_points INTEGER NOT NULL DEFAULT 0,
    today_dives INTEGER NOT NULL DEFAULT 0,
    last_seen INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS runs (
    uid TEXT NOT NULL,
    run_id TEXT NOT NULL,
    data TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (uid, run_id)
  )`,
  `CREATE TABLE IF NOT EXISTS history (
    uid TEXT NOT NULL,
    record_id TEXT NOT NULL,
    data TEXT NOT NULL,
    finished_at INTEGER NOT NULL,
    PRIMARY KEY (uid, record_id)
  )`,
  `CREATE TABLE IF NOT EXISTS daily_scores (
    board TEXT NOT NULL,
    uid TEXT NOT NULL,
    points INTEGER NOT NULL,
    pct INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (board, uid)
  )`,
  `CREATE INDEX IF NOT EXISTS daily_scores_rank ON daily_scores (board, points DESC)`,
  `CREATE TABLE IF NOT EXISTS unlimited_scores (
    uid TEXT PRIMARY KEY,
    points INTEGER NOT NULL,
    ascents INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS unlimited_scores_rank ON unlimited_scores (points DESC)`,
  `CREATE TABLE IF NOT EXISTS friend_requests (
    from_uid TEXT NOT NULL,
    to_uid TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (from_uid, to_uid)
  )`,
  `CREATE INDEX IF NOT EXISTS friend_requests_to ON friend_requests (to_uid)`,
  `CREATE TABLE IF NOT EXISTS friends (
    uid TEXT NOT NULL,
    fid TEXT NOT NULL,
    since INTEGER NOT NULL,
    PRIMARY KEY (uid, fid)
  )`,
];

export async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = db()
      .batch(SCHEMA, 'write')
      .catch((e) => {
        schemaReady = null;
        throw e;
      });
  }
  return schemaReady;
}

/* ---------- auth (Firebase ID tokens) ---------- */

const JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));

async function verify(authHeader) {
  const m = /^Bearer (.+)$/.exec(authHeader || '');
  if (!m) return null;
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) throw new HttpError(503, 'Sign-in isn’t configured on the server.');
  try {
    const { payload } = await jwtVerify(m[1], JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });
    if (!payload.sub) return null;
    return { uid: payload.sub, name: payload.name || '' };
  } catch {
    throw new HttpError(401, 'Your session expired. Sign in again.');
  }
}

/* ---------- helpers ---------- */

const now = () => Date.now();
const int = (v, min, max) => {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n) || n < min || n > max) throw bad('Out of range.');
  return n;
};
const str = (v, re, msg = 'Invalid value.') => {
  if (typeof v !== 'string' || !re.test(v)) throw bad(msg);
  return v;
};
const parseJson = (s, fallback) => {
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
};

function profileOf(row) {
  if (!row) return null;
  return {
    id: row.uid,
    username: row.username,
    usernameLower: row.username_lower,
    pfp: row.pfp,
    stats: parseJson(row.stats, {}),
    today: row.today_date ? { date: row.today_date, points: Number(row.today_points), dives: Number(row.today_dives) } : null,
    lastSeen: Number(row.last_seen) || 0,
    createdAt: Number(row.created_at) || 0,
  };
}

async function getUser(uid) {
  const r = await db().execute({ sql: 'SELECT * FROM users WHERE uid = ?', args: [uid] });
  return r.rows[0] || null;
}

async function requireUser(me) {
  const row = await getUser(me.uid);
  if (!row) throw new HttpError(409, 'Profile not set up yet.');
  return row;
}

async function nameTaken(lower, uid) {
  const r = await db().execute({ sql: 'SELECT uid FROM users WHERE username_lower = ?', args: [lower] });
  return r.rows.length > 0 && r.rows[0].uid !== uid;
}

/* ---------- 7 Seas rankings ---------- */

const DAY_MS = 864e5;
const shiftDay = (key, n) => new Date(Date.parse(`${key}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);

const DAILY_RANKINGS = ['today', 'accuracy', 'week', 'alltime', 'friends'];
const UNLIMITED_RANKINGS = ['best', 'ascents', 'friends'];

const dailyRow = (x) => ({
  uid: x.uid,
  username: x.username,
  pfp: x.pfp,
  points: Number(x.points),
  pct: Number(x.pct),
  days: Number(x.days ?? 1),
});
const unlimitedRow = (x) => ({ uid: x.uid, username: x.username, pfp: x.pfp, points: Number(x.points), ascents: Number(x.ascents) });

/** One daily-category board ranked a given way. `me` is only needed for the friends ranking. */
async function dailyRanking({ date, cat, type }, me = null) {
  str(date, DATE_RE);
  str(cat, CAT_RE);
  if (!DAILY_RANKINGS.includes(type)) throw bad('Unknown ranking.');
  const base = 'SELECT s.uid, u.username, u.pfp';
  const join = 'FROM daily_scores s JOIN users u ON u.uid = s.uid';
  let q;
  if (type === 'today' || type === 'accuracy') {
    const order = type === 'accuracy' ? 's.pct DESC, s.points DESC, s.created_at ASC' : 's.points DESC, s.created_at ASC';
    q = { sql: `${base}, s.points, s.pct ${join} WHERE s.board = ? ORDER BY ${order} LIMIT 50`, args: [`${date}_${cat}`] };
  } else if (type === 'friends') {
    q = {
      sql: `${base}, s.points, s.pct ${join} WHERE s.board = ? AND (s.uid = ? OR s.uid IN (SELECT fid FROM friends WHERE uid = ?))
            ORDER BY s.points DESC, s.created_at ASC LIMIT 50`,
      args: [`${date}_${cat}`, me.uid, me.uid],
    };
  } else {
    const agg = `${base}, SUM(s.points) AS points, ROUND(AVG(s.pct)) AS pct, COUNT(*) AS days ${join}`;
    const tail = 'GROUP BY s.uid ORDER BY points DESC, MIN(s.created_at) ASC LIMIT 50';
    if (type === 'week') {
      const boards = Array.from({ length: 7 }, (_, i) => `${shiftDay(date, -i)}_${cat}`);
      q = { sql: `${agg} WHERE s.board IN (${boards.map(() => '?').join(', ')}) ${tail}`, args: boards };
    } else {
      // board = 'YYYY-MM-DD_<cat>', so the category starts at character 12
      q = { sql: `${agg} WHERE substr(s.board, 12) = ? ${tail}`, args: [cat] };
    }
  }
  const r = await db().execute(q);
  return r.rows.map(dailyRow);
}

async function unlimitedRanking({ type }, me = null) {
  if (!UNLIMITED_RANKINGS.includes(type)) throw bad('Unknown ranking.');
  const order = type === 'ascents' ? 's.ascents DESC, s.points DESC, s.updated_at ASC' : 's.points DESC, s.updated_at ASC';
  const friendsOnly = type === 'friends' ? 'WHERE s.uid = ? OR s.uid IN (SELECT fid FROM friends WHERE uid = ?)' : '';
  const r = await db().execute({
    sql: `SELECT s.uid, u.username, u.pfp, s.points, s.ascents FROM unlimited_scores s JOIN users u ON u.uid = s.uid
          ${friendsOnly} ORDER BY ${order} LIMIT 50`,
    args: type === 'friends' ? [me.uid, me.uid] : [],
  });
  return r.rows.map(unlimitedRow);
}

/* ---------- actions ---------- */

const PUBLIC = {
  /** Any public ranking of a 7 Seas board (the friends ranking goes through seas.friends). */
  async 'seas.board'({ board, type, date }) {
    if (type === 'friends') throw new HttpError(401, 'Sign in to see your friends’ rankings.');
    if (board === 'unlimited') return unlimitedRanking({ type });
    return dailyRanking({ date, cat: board, type });
  },

  async 'daily.board'({ date, cat }) {
    str(date, DATE_RE);
    str(cat, CAT_RE);
    const r = await db().execute({
      sql: `SELECT s.uid, u.username, u.pfp, s.points, s.pct FROM daily_scores s JOIN users u ON u.uid = s.uid
            WHERE s.board = ? ORDER BY s.points DESC, s.created_at ASC LIMIT 50`,
      args: [`${date}_${cat}`],
    });
    return r.rows.map((x) => ({ uid: x.uid, username: x.username, pfp: x.pfp, points: Number(x.points), pct: Number(x.pct) }));
  },

  async 'unlimited.board'() {
    const r = await db().execute(
      `SELECT s.uid, u.username, u.pfp, s.points, s.ascents FROM unlimited_scores s JOIN users u ON u.uid = s.uid
       ORDER BY s.points DESC, s.updated_at ASC LIMIT 50`,
    );
    return r.rows.map((x) => ({ uid: x.uid, username: x.username, pfp: x.pfp, points: Number(x.points), ascents: Number(x.ascents) }));
  },
};

const PRIVATE = {
  /** Create the profile on first sign-in (with a unique username) or return the existing one. */
  async 'me.ensure'(me, { username, pfp, stats }) {
    const existing = await getUser(me.uid);
    if (existing) {
      const t = now();
      await db().execute({ sql: 'UPDATE users SET last_seen = ? WHERE uid = ?', args: [t, me.uid] });
      return profileOf({ ...existing, last_seen: t });
    }
    const base = String(username || me.name || 'shrimp').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 12) || 'shrimp';
    let chosen = null;
    for (let i = 0; i < 10 && !chosen; i++) {
      const candidate = i === 0 && USERNAME_RE.test(base) ? base : `${base.slice(0, 10)}${Math.floor(1000 + Math.random() * 9000)}`;
      if (USERNAME_RE.test(candidate) && !(await nameTaken(candidate.toLowerCase(), me.uid))) chosen = candidate;
    }
    chosen ||= `shrimp${me.uid.slice(0, 8).replace(/[^a-zA-Z0-9]/g, '')}`;
    const statsJson = JSON.stringify(stats && typeof stats === 'object' ? stats : {});
    if (statsJson.length > MAX_STATS_BYTES) throw bad('Stats too large.');
    const t = now();
    await db().execute({
      sql: `INSERT INTO users (uid, username, username_lower, pfp, stats, last_seen, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(uid) DO NOTHING`,
      args: [me.uid, chosen, chosen.toLowerCase(), PFP_RE.test(pfp || '') ? pfp : 'basic', statsJson, t, t],
    });
    return profileOf(await getUser(me.uid));
  },

  async 'me.get'(me) {
    return profileOf(await getUser(me.uid));
  },

  async 'me.claimUsername'(me, { username }) {
    if (typeof username !== 'string' || !USERNAME_RE.test(username)) throw bad('Use 3–16 letters, numbers or underscores.');
    await requireUser(me);
    if (await nameTaken(username.toLowerCase(), me.uid)) throw bad('That username is taken.');
    try {
      await db().execute({ sql: 'UPDATE users SET username = ?, username_lower = ? WHERE uid = ?', args: [username, username.toLowerCase(), me.uid] });
    } catch {
      throw bad('That username is taken.');
    }
    return true;
  },

  async 'me.heartbeat'(me) {
    await db().execute({ sql: 'UPDATE users SET last_seen = ? WHERE uid = ?', args: [now(), me.uid] });
    return true;
  },

  async 'me.save'(me, { stats, pfp, today }) {
    const sets = [];
    const args = [];
    if (stats !== undefined) {
      const j = JSON.stringify(stats && typeof stats === 'object' ? stats : {});
      if (j.length > MAX_STATS_BYTES) throw bad('Stats too large.');
      sets.push('stats = ?');
      args.push(j);
    }
    if (pfp !== undefined) {
      sets.push('pfp = ?');
      args.push(str(pfp, PFP_RE));
    }
    if (today) {
      sets.push('today_date = ?', 'today_points = ?', 'today_dives = ?');
      args.push(str(today.date, DATE_RE), int(today.points || 0, 0, MAX_DIVE_POINTS), int(today.dives || 0, 0, 1000));
    }
    if (!sets.length) return true;
    sets.push('last_seen = ?');
    args.push(now(), me.uid);
    const result = await db().execute({ sql: `UPDATE users SET ${sets.join(', ')} WHERE uid = ?`, args });
    if (pfp !== undefined && !result.rowsAffected) throw new HttpError(409, 'Profile not set up yet.');
    return true;
  },

  /* ----- in-progress ascents (resume after closing the tab) ----- */

  async 'runs.list'(me) {
    const r = await db().execute({ sql: 'SELECT run_id, data, updated_at FROM runs WHERE uid = ?', args: [me.uid] });
    return r.rows.map((x) => ({ id: x.run_id, data: parseJson(x.data, null), updatedAt: Number(x.updated_at) })).filter((x) => x.data);
  },

  async 'runs.put'(me, { id, data, updatedAt }) {
    str(id, RUN_ID_RE);
    const j = JSON.stringify(data ?? null);
    if (j.length > MAX_RUN_BYTES) throw bad('Run too large.');
    const t = int(updatedAt || now(), 0, now() + 60_000);
    await db().batch(
      [
        {
          sql: `INSERT INTO runs (uid, run_id, data, updated_at) VALUES (?, ?, ?, ?)
                ON CONFLICT(uid, run_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
                WHERE excluded.updated_at >= runs.updated_at`,
          args: [me.uid, id, j, t],
        },
        // keep the table small: drop runs untouched for 14 days
        { sql: 'DELETE FROM runs WHERE uid = ? AND updated_at < ?', args: [me.uid, now() - 14 * 864e5] },
      ],
      'write',
    );
    return true;
  },

  async 'runs.delete'(me, { id }) {
    str(id, RUN_ID_RE);
    await db().execute({ sql: 'DELETE FROM runs WHERE uid = ? AND run_id = ?', args: [me.uid, id] });
    return true;
  },

  /* ----- finished ascents (the Archive logbook) ----- */

  async 'history.list'(me) {
    const r = await db().execute({ sql: 'SELECT data FROM history WHERE uid = ? ORDER BY finished_at DESC', args: [me.uid] });
    return r.rows.map((x) => parseJson(x.data, null)).filter((x) => x && typeof x === 'object');
  },

  /** Save finished ascents. The first copy of each one wins: a finished ascent never changes. */
  async 'history.put'(me, { records }) {
    if (!Array.isArray(records) || records.length > 400) throw bad('Too many records.');
    const stmts = [];
    for (const rec of records) {
      if (!rec || typeof rec !== 'object') throw bad('Invalid record.');
      str(rec.id, HISTORY_ID_RE);
      int(rec.points, 0, MAX_DIVE_POINTS);
      const j = JSON.stringify(rec);
      if (j.length > MAX_RECORD_BYTES) throw bad('Record too large.');
      stmts.push({
        sql: 'INSERT INTO history (uid, record_id, data, finished_at) VALUES (?, ?, ?, ?) ON CONFLICT(uid, record_id) DO NOTHING',
        args: [me.uid, rec.id, j, int(rec.at || now(), 0, now() + 60_000)],
      });
    }
    if (stmts.length) await db().batch(stmts, 'write');
    return true;
  },

  /* ----- the 7 Seas ----- */

  async 'seas.friends'(me, { board, date }) {
    if (board === 'unlimited') return unlimitedRanking({ type: 'friends' }, me);
    return dailyRanking({ date, cat: board, type: 'friends' }, me);
  },

  async 'daily.submit'(me, { date, cat, points, pct }) {
    await requireUser(me);
    str(date, DATE_RE);
    str(cat, CAT_RE);
    const r = await db().execute({
      sql: 'INSERT INTO daily_scores (board, uid, points, pct, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(board, uid) DO NOTHING',
      args: [`${date}_${cat}`, me.uid, int(points, 0, MAX_DIVE_POINTS), int(pct, 0, 100), now()],
    });
    return r.rowsAffected > 0; // first attempt only
  },

  async 'unlimited.submit'(me, { points, ascents }) {
    await requireUser(me);
    const r = await db().execute({
      sql: `INSERT INTO unlimited_scores (uid, points, ascents, updated_at) VALUES (?, ?, ?, ?)
            ON CONFLICT(uid) DO UPDATE SET points = excluded.points, ascents = excluded.ascents, updated_at = excluded.updated_at
            WHERE excluded.points > unlimited_scores.points`,
      args: [me.uid, int(points, 0, 10_000_000), int(ascents, 0, 100_000), now()],
    });
    return r.rowsAffected > 0;
  },

  /* ----- friends ----- */

  async 'friends.request'(me, { username }) {
    const lower = String(username || '').trim().toLowerCase();
    if (!lower) throw bad('Type a username.');
    await requireUser(me);
    const r = await db().execute({ sql: 'SELECT uid FROM users WHERE username_lower = ?', args: [lower] });
    if (!r.rows.length) throw bad('No shrimp by that name.');
    const to = r.rows[0].uid;
    if (to === me.uid) throw bad('That’s you!');
    const f = await db().execute({ sql: 'SELECT 1 FROM friends WHERE uid = ? AND fid = ?', args: [me.uid, to] });
    if (f.rows.length) throw bad('You’re already friends.');
    const rev = await db().execute({ sql: 'SELECT 1 FROM friend_requests WHERE from_uid = ? AND to_uid = ?', args: [to, me.uid] });
    if (rev.rows.length) {
      await makeFriends(me.uid, to);
      return 'accepted';
    }
    await db().execute({
      sql: 'INSERT INTO friend_requests (from_uid, to_uid, created_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING',
      args: [me.uid, to, now()],
    });
    return 'sent';
  },

  async 'friends.requests'(me) {
    const q = (sql) => db().execute({ sql, args: [me.uid] });
    const [inc, out] = await Promise.all([
      q(`SELECT r.from_uid, r.to_uid, u.username, u.pfp FROM friend_requests r JOIN users u ON u.uid = r.from_uid
         WHERE r.to_uid = ? ORDER BY r.created_at DESC LIMIT 100`),
      q(`SELECT r.from_uid, r.to_uid, u.username, u.pfp FROM friend_requests r JOIN users u ON u.uid = r.to_uid
         WHERE r.from_uid = ? ORDER BY r.created_at DESC LIMIT 100`),
    ]);
    const id = (x) => `${x.from_uid}_${x.to_uid}`;
    return {
      incoming: inc.rows.map((x) => ({ id: id(x), from: x.from_uid, to: x.to_uid, fromName: x.username, fromPfp: x.pfp })),
      outgoing: out.rows.map((x) => ({ id: id(x), from: x.from_uid, to: x.to_uid, toName: x.username, toPfp: x.pfp })),
    };
  },

  async 'friends.accept'(me, { from }) {
    if (typeof from !== 'string') throw bad('Bad request.');
    const r = await db().execute({ sql: 'SELECT 1 FROM friend_requests WHERE from_uid = ? AND to_uid = ?', args: [from, me.uid] });
    if (!r.rows.length) throw bad('That request is gone.');
    await makeFriends(me.uid, from);
    return true;
  },

  async 'friends.decline'(me, { from, to }) {
    if (from !== me.uid && to !== me.uid) throw new HttpError(403, 'Not your request.');
    await db().execute({ sql: 'DELETE FROM friend_requests WHERE from_uid = ? AND to_uid = ?', args: [String(from), String(to)] });
    return true;
  },

  async 'friends.remove'(me, { fid }) {
    await db().batch(
      [
        { sql: 'DELETE FROM friends WHERE uid = ? AND fid = ?', args: [me.uid, String(fid)] },
        { sql: 'DELETE FROM friends WHERE uid = ? AND fid = ?', args: [String(fid), me.uid] },
      ],
      'write',
    );
    return true;
  },

  async 'friends.list'(me) {
    const r = await db().execute({
      sql: 'SELECT u.* FROM friends f JOIN users u ON u.uid = f.fid WHERE f.uid = ? ORDER BY u.username_lower LIMIT 200',
      args: [me.uid],
    });
    return r.rows.map(profileOf);
  },
};

async function makeFriends(a, b) {
  const t = now();
  await db().batch(
    [
      { sql: 'INSERT INTO friends (uid, fid, since) VALUES (?, ?, ?) ON CONFLICT DO NOTHING', args: [a, b, t] },
      { sql: 'INSERT INTO friends (uid, fid, since) VALUES (?, ?, ?) ON CONFLICT DO NOTHING', args: [b, a, t] },
      { sql: 'DELETE FROM friend_requests WHERE (from_uid = ? AND to_uid = ?) OR (from_uid = ? AND to_uid = ?)', args: [a, b, b, a] },
    ],
    'write',
  );
}

/** Transport-agnostic entry point: returns { status, json }. */
export async function handleRpc(body, authHeader) {
  try {
    const { action, ...args } = body && typeof body === 'object' ? body : {};
    const pub = Object.hasOwn(PUBLIC, action) ? PUBLIC[action] : null;
    const priv = Object.hasOwn(PRIVATE, action) ? PRIVATE[action] : null;
    if (!pub && !priv) throw new HttpError(404, 'Unknown action.');
    await ensureSchema();
    if (pub) return { status: 200, json: { ok: true, data: await pub(args) } };
    const me = await verify(authHeader);
    if (!me) throw new HttpError(401, 'Sign in first.');
    return { status: 200, json: { ok: true, data: await priv(me, args) } };
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    if (status === 500) console.error('[rpc]', e);
    return { status, json: { ok: false, error: status === 500 ? 'The deep sea is having trouble. Try again.' : e.message } };
  }
}

/** Read a JSON body from a Node request (Vercel may pre-parse it as req.body). */
async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return parseJson(req.body, {});
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > 256 * 1024) throw new HttpError(413, 'Too large.');
    chunks.push(c);
  }
  return parseJson(Buffer.concat(chunks).toString('utf8') || '{}', {});
}

/** Node (req, res) handler used by both Vercel and the Vite dev server. */
export async function nodeHandler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: 'POST only.' }));
    return;
  }
  let body;
  try {
    body = await readJsonBody(req);
  } catch (e) {
    res.statusCode = e.status || 400;
    res.end(JSON.stringify({ ok: false, error: 'Bad body.' }));
    return;
  }
  // navigator.sendBeacon can't set headers, so a closing tab sends its token in the body
  let authHeader = req.headers.authorization || '';
  if (body && typeof body === 'object' && typeof body.idToken === 'string') {
    authHeader ||= `Bearer ${body.idToken}`;
    delete body.idToken;
  }
  const { status, json } = await handleRpc(body, authHeader);
  res.statusCode = status;
  res.end(JSON.stringify(json));
}
