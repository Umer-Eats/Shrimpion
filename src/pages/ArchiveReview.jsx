import { Link } from 'react-router-dom';
import PageShell from './PageShell.jsx';
import { TierIcon } from '../components/Icon.jsx';
import { categoryName } from '../game/content/index.js';
import { dayNumber, prettyDate } from '../game/daily.js';
import { buildDiveReview } from '../game/review.js';
import { ascentMax, MAX_DIVE_POINTS, TIER_BY_ID } from '../game/tiers.js';

const playedAt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export function ArchiveDate({ record }) {
  return record.at ? <time dateTime={new Date(record.at).toISOString()}>{playedAt.format(record.at)}</time> : prettyDate(record.date);
}

export default function ArchiveReview({ record }) {
  const ascents = record ? buildDiveReview(record) : [];
  const hasAnswers = ascents.some(({ questions }) => questions.some((question) => question.given != null));

  return (
    <PageShell kicker="⟲ The logbook" title="Ascent review" intro={record && `${categoryName(record.cat)} · Daily ascent #${dayNumber(record.date)}`}>
      <div><Link className="btn btn-ghost" to="/archive">← Back to Archive</Link></div>
      {record ? (
        <>
          <p className="archive-review-meta"><ArchiveDate record={record} /> · <strong>{record.points}/{MAX_DIVE_POINTS} pts</strong></p>
          {!hasAnswers && <p className="muted">This ascent was saved before individual answers were recorded.</p>}
          {ascents.map(({ type, tier, points, questions }, ascent) => (
            <section key={type.id} className="panel archive-review" aria-labelledby={`review-${type.id}`}>
              <header className="archive-review-head">
                <h2 id={`review-${type.id}`}>Ascent {ascent + 1} · {type.name}</h2>
                {points != null && <span><TierIcon tier={TIER_BY_ID[tier]} /> {points}/{ascentMax(ascent)} pts</span>}
              </header>
              <ol className="archive-questions">
                {questions.map(({ prompt, choices, correct, given, ok, explanation }, index) => (
                  <li key={index}>
                    <p className="archive-question">{prompt}</p>
                    {choices && <ol className="archive-choices" type="A">{choices.map((choice, i) => <li key={i}>{choice}</li>)}</ol>}
                    <dl className="archive-answers">
                      <div><dt>Correct answer</dt><dd>{correct}</dd></div>
                      <div>
                        <dt>Your answer{given != null && typeof ok === 'boolean' && <span className={ok ? 'archive-correct' : 'archive-incorrect'}> · {ok ? 'Correct' : 'Incorrect'}</span>}</dt>
                        <dd className={given == null ? 'muted' : undefined}>{given ?? 'Unavailable'}</dd>
                      </div>
                    </dl>
                    {explanation && <p className="archive-explanation"><strong>Real fact</strong> {explanation}</p>}
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </>
      ) : <p className="muted">This ascent isn’t in your Archive.</p>}
    </PageShell>
  );
}
