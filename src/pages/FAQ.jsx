import { Link } from 'react-router-dom';
import PageShell from './PageShell.jsx';
import { TIERS } from '../game/tiers.js';
import { TEST_TYPES } from '../game/tests.js';

const QA = [
  {
    q: 'What is Shrimpion?',
    a: (
      <>
        A daily trivia game that teaches instead of quizzing you cold. You start at the bottom of the Challenger Deep and swim up
        through seven ascents. Each ascent teaches you seven facts with no timer, then tests you on them. Reach the surface and
        you’ve learned 42 new things.
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
        Every ascent is worth up to 100 points: your accuracy on that test. A perfect day is 700. Your accuracy decides which sea
        creature you become for that ascent:
        <ul>
          {TIERS.map((t) => (
            <li key={t.id}>
              {t.emoji} <strong style={{ color: t.color }}>{t.name}</strong> — {t.id === 'shrimpion' ? '100%' : `${t.min}% and up`}
            </li>
          ))}
        </ul>
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
    a: 'The global leaderboards: today’s Daily Dive, one board per category, and Unlimited. Only your first attempt each day counts, and archive replays don’t post.',
  },
  {
    q: 'How do I unlock new profile shrimp?',
    a: 'Keep learning! There are ten shrimp to collect, earned through streaks, facts learned, ascents finished and perfect “One in a Shrimpion” ascents. See them all on My Shrimpion.',
  },
  {
    q: 'What is Urchin Party?',
    a: 'A multiplayer mode we’re building where friends learn together instead of competing. The urchin is ready; the party is coming soon.',
  },
  {
    q: 'Is Shrimpion related to Krillion?',
    a: 'Shrimpion is a learning-first companion inspired by the daily-dive format Krillion made popular. Krillion tests how deep your knowledge goes; Shrimpion helps you build it, one ascent at a time.',
  },
];

export default function FAQ() {
  return (
    <PageShell v={6} kicker="Questions from the shallows" title="FAQ" wide>
      <div className="faq">
        {QA.map((item) => (
          <details key={item.q} className="panel faq-item">
            <summary>{item.q}</summary>
            <div className="faq-a">{item.a}</div>
          </details>
        ))}
      </div>

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
          heyumerqureshi.com ↗
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
