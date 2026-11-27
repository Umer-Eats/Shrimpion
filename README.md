# Shrimpion

A daily trivia game that **teaches** instead of tests. You start at the bottom of the ocean and swim up through 7 ascents. Ascents 1–6 each show you 7 facts (no timer) and then test you a different way. Ascent 7 is a 14-question exam on everything you learned.

## Run locally

Requires Node 20+.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build into dist/
npm run preview    # serve the build
npm run check:content   # validate the fact database
npm run make:icon       # regenerate public/favicon.svg from the shrimp sprite
```

Without Firebase keys the game runs in **local mode**: progress lives in the browser's localStorage, and sign-in, Friends and the 7 Seas show a "not configured" notice.

## How data is stored

- **Signed out:** everything (stats, history, and the ascent you're in the middle of, down to the card or question) is saved in `localStorage` on every change, so closing the tab mid-ascent resumes exactly there.
- **Signed in:** **Firebase** only handles sign-in. All game data lives in **Turso** (libSQL), behind one serverless function, `POST /api/rpc` (`api/rpc.js` → `server/rpc.js`). The browser sends its Firebase ID token; the function verifies it and reads/writes Turso. Tables are created automatically on first request.
- In-progress ascents sync to the `runs` table (debounced, plus a `keepalive` request when the tab closes); the newest copy wins when you come back, even on another device.
- `npm run dev` serves `/api/rpc` from the same handler through a Vite middleware, so local dev talks to the real database.

## Deploy to Vercel

1. Push this folder to GitHub and import it in Vercel. `vercel.json` sets the Vite framework, `npm run build`, the `dist` output, and an SPA rewrite (everything except `/api/*`) so routes like `/faq` work on refresh.
2. In **Project → Settings → Environment Variables**, add every key from `.env.example`:
   - the six `VITE_FIREBASE_*` values (public, inlined into the browser bundle at build time), and
   - `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` (**server-only**: never prefix them with `VITE_`).
3. Redeploy. Vite inlines `VITE_*` variables at build time, so rebuild after changing them.

## Firebase setup (sign-in only)

1. Create a project at console.firebase.google.com and add a **Web app**. Copy its config into `.env` (for local dev) and into Vercel.
2. **Authentication → Sign-in method:** enable **Google** and **Email/Password**.
3. **Authentication → Settings → Authorized domains:** add your Vercel domain (e.g. `shrimpion.vercel.app`) and any custom domain.

Firestore isn't used. The Firebase web API key is meant to be public; the Turso token never leaves the server.

## Project layout

| Path | What it holds |
|---|---|
| `src/game/content/` | 6 categories × 8 topics × 6 levels of facts |
| `src/game/plan.js` | Seeded daily and unlimited dive plans |
| `src/game/tests.js` | The 7 test strategies, all built from one fact format |
| `src/scene/` | The pixel-art ocean canvas and the camera that rises through depths |
| `src/art/` | Hand-placed sprites (shrimp faces right) and the renderer |
| `src/dive/` | The ascent state machine: learn → test → result → ascend |
| `src/firebase/` | Sign-in, plus the client for `/api/rpc` (profiles, friends, presence, leaderboards, saved runs) |
| `src/data/` | Local progress store and the run sync to your account |
| `src/audio/sfx.js` | Chiptune sound effects synthesized with Web Audio (mute toggle in the top bar) |
| `api/`, `server/` | The Vercel function and the Turso data layer it runs |
| `src/pages/` | Home, Unlimited, Archive, My Shrimpion, Friends, 7 Seas, FAQ, Urchin Party |
