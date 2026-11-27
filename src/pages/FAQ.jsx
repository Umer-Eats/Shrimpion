import { Link } from 'react-router-dom';
import PageShell from './PageShell.jsx';
import { TIERS, ASCENT_MAX, MAX_DIVE_POINTS } from '../game/tiers.js';
import { TEST_TYPES } from '../game/tests.js';
import Icon, { TierIcon } from '../components/Icon.jsx';
import { KRILLION_GUIDE, PAGES } from '../seo.js';

const QA = [
  {
    q: 'What is Shrimpion?',
    a: (
      <>
        Shrimpion is a free daily trivia game. Start at the bottom of the Challenger Deep and swim through seven ascents.
        The first six each teach you seven facts with no timer and then quiz you on them. The seventh is the 14-question
        Surface Exam, which reviews all six rounds.
      </>
    ),
  },
  {
    q: 'How does an ascent work?',
    a: (
      <>
        Every day picks seven topics. Ascents 1–6 each teach one fact per topic, and every ascent goes one level more niche, from
        common knowledge down to deep cuts. Each ascent tests you a different way:
        <ul>
          {TEST_TYPES.map((t, i) => (
            <li key={t.id}>
              <strong>
                {i + 1}. {t.name}
              </strong>{' '}
              — {t.how}
            </li>
          ))}
        </ul>
      </>
    ),
  },
  {
    q: 'How is scoring done?',
    a: (
      <>
        The higher you climb, the more each ascent is worth: Ascent 1 is worth up to {ASCENT_MAX[0]} points and the Surface Exam up
        to {ASCENT_MAX[ASCENT_MAX.length - 1]}. You earn that ascent’s max times your accuracy, and a perfect day is{' '}
        {MAX_DIVE_POINTS}. The points you earn on an ascent decide which sea creature you become:
        <ul>
          {TIERS.map((t) => (
            <li key={t.id}>
              <TierIcon tier={t} /> <strong style={{ color: t.color }}>{t.name}</strong>: {t.min}+ points
            </li>
          ))}
        </ul>
        So a perfect first ascent makes you a Dolphin. One in a Shrimpion only opens up from Ascent 5, where you need a perfect
        score, and on the Surface Exam you need 80% or better.
      </>
    ),
  },
  {
    q: 'Is there a timer?',
    a: 'Never. Shrimpion is about learning, so every card and every test question waits for you.',
  },
  {
    q: 'What does the Category button do?',
    a: 'It’s set to Daily Random by default: a mix of topics from every category, the same for everyone that day. You can also pick Classic, Words & Language, At the Movies, Sports, Geography or Music. Every category has its own daily ascent and leaderboard. More categories are coming.',
  },
  {
    q: 'How does Unlimited work?',
    a: 'Seven ascents make a block. After the surface exam you dive back down for a new block of topics, forever. Each block’s exam also reaches back into earlier blocks: 14 questions, then 21, then 28 and up. Bank your run whenever you like; your best total counts on the 7 Seas.',
  },
  {
    q: 'What are the 7 Seas?',
    a: 'The global leaderboards: today’s Daily Swim, one board per category, and Unlimited. Only your first attempt each day counts, and archive replays don’t post.',
  },
  {
    q: 'How do I unlock new profile shrimp?',
    a: 'Keep learning! There are ten shrimp to collect, earned through streaks, facts learned, ascents finished and perfect “One in a Shrimpion” ascents. See them all on My Shrimpion.',
  },
  {
    q: 'What is Urchin Party?',
    a: 'A multiplayer mode we’re building where friends learn together instead of competing. The urchin is ready; the party is coming soon.',
  },
];

export default function FAQ() {
  const page = PAGES['/faq'];
  return (
    <PageShell v={6.6} kicker="Questions from the shallows" title={page.heading} intro={page.description} wide>
      <div className="faq">
        {QA.map((item) => (
          <details key={item.q} className="panel faq-item">
            <summary>{item.q}</summary>
            <div className="faq-a">{item.a}</div>
          </details>
        ))}
      </div>

      <section className="panel creator">
        <h2>{KRILLION_GUIDE.heading}</h2>
        <p>{KRILLION_GUIDE.description}</p>
        <ol>
          {KRILLION_GUIDE.steps.map((step) => <li key={step}>{step}</li>)}
        </ol>
        <div className="stage-actions">
          {KRILLION_GUIDE.links.map(({ path, label }) => (
            <Link key={path} to={path} className="btn">{label}</Link>
          ))}
        </div>
      </section>

      <section className="panel creator">
        <p className="kicker">Who made this?</p>
        <h2>Umer Qureshi</h2>
        <p>
          Shrimpion was created by Umer Qureshi, a high schooler at Pembroke Pines Charter High School in Pembroke Pines, Florida.
          Umer builds robots, apps and study tools where electrical engineering meets neuroscience, with free access as the default.
          His projects include Korah, a free standardized-test education tool that has reached more than 100,000 people; Iris AI, a
          navigation app for visually impaired people that won the global OTIS Made to Move Communities challenge; and RADIX, a
          Lemelson-MIT InvenTeams project. He’s part of MIT’s MITES Semester and has earned two VEX Robotics Worlds awards.
        </p>
        <p>Shrimpion follows the same idea: good learning tools should reach everyone, free.</p>
        <a className="btn btn-primary" href="https://heyumerqureshi.com" target="_blank" rel="noopener noreferrer">
          heyumerqureshi.com →
        </a>
      </section>

      <p className="center">
        <Link to="/" className="btn">
          ▲ Back to the ascent
        </Link>
      </p>
    </PageShell>
  );
}
