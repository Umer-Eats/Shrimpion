import { F, T } from '../helpers.js';
import { rngFor, shuffle } from '../../rng.js';

function alternatives(answer, candidates, question) {
  const options = [...new Set(candidates.map(String))].filter((option) =>
    option.toLowerCase() !== answer.toLowerCase() && option.length <= 36);
  return shuffle(options, rngFor(question)).slice(0, 3);
}

function fact(question, answer, choices, sentence) {
  const value = String(answer);
  const options = alternatives(value, choices, question);
  return F(question, value, options, sentence(value));
}

function stat(subject, label, answer, choices) {
  return fact(`What was the ${label} for ${subject}?`, answer, choices,
    (a) => `For ${subject}, the ${label} was ${a}.`);
}

function numbers(value) {
  const n = Number(value);
  const step = Math.max(1, Math.round(n * 0.14));
  return [n + step, n + 2 * step, n + 3 * step];
}

function measurement(subject, label, value, unit, digits = 0) {
  const n = Number(value);
  const delta = Math.max(10 ** -digits * 2, Math.abs(n) * 0.22);
  const format = (v) => `${v.toFixed(digits)} ${unit}`;
  return stat(subject, label, format(n), [n + delta, n + delta * 2, n + delta * 3].map(format));
}

export function buildTopicPools({ elements, planets, quakes, movies, baseball, soccer, tracks, cities, words }, prefix) {
  const topic = (id, name, facts) => T(prefix + "-" + id, name, facts);

  const elementTopics = elements.map(([name, symbol, number, period, group, block, category]) => {
    const subject = name.toLowerCase();
    return topic(`element-${number}`, name, [
      stat(subject, 'chemical symbol', symbol, elements.map((row) => row[1])),
      stat(subject, 'atomic number', number, numbers(number)),
      stat(subject, 'period in the periodic table', period, [1, 2, 3, 4, 5, 6, 7]),
      stat(subject, 'group in the periodic table', group, elements.map((row) => row[4])),
      fact(`Which orbital block contains ${subject} in the periodic table?`, `${block}-block`,
        ['s-block', 'p-block', 'd-block', 'f-block'], (a) => `The periodic table places ${subject} in the ${a}.`),
      stat(subject, 'element family in this classification', category, elements.map((row) => row[6])),
    ]);
  });

  const planetTopics = planets.map(([name, method, year, period, orbit, radius, temperature], index) =>
    topic(`planet-${index + 1}`, name, [
      stat(name, 'discovery method', method, ['Transit', 'Radial Velocity', 'Imaging', 'Microlensing', 'Timing']),
      stat(name, 'reported discovery year', year, [Number(year) - 2, Number(year) - 4, Number(year) + 1]),
      measurement(name, 'approximate orbital period', period, 'days', 1),
      measurement(name, 'approximate orbital semimajor axis', orbit, 'AU', 2),
      measurement(name, 'approximate planet radius', radius, 'Jupiter radii', 2),
      measurement(name, 'approximate host star temperature', temperature, 'K'),
    ]));

  const quakeTopics = quakes.map(([id, place, instant, magnitude, longitude, latitude, depth]) => {
    const subject = `the USGS earthquake ${id}`;
    const [date, time] = instant.split('T');
    const formatLocation = (v, positive, negative) => `${Math.abs(v).toFixed(1)}° ${v >= 0 ? positive : negative}`;
    const coordinate = (label, v, positive, negative) => stat(subject, label, formatLocation(v, positive, negative),
      [-v, v * 0.73, v * 0.48].map((n) => formatLocation(n, positive, negative)));
    return topic(`quake-${id}`, `Earthquake near ${place}`, [
      stat(subject, 'UTC calendar date', date, quakes.map((row) => row[2].slice(0, 10))),
      stat(subject, 'reported magnitude', magnitude.toFixed(1), [magnitude - 0.5, magnitude + 0.7, magnitude + 1.4].map((n) => n.toFixed(1))),
      measurement(subject, 'approximate depth', depth, 'km', 1),
      coordinate('approximate epicenter latitude', latitude, 'N', 'S'),
      coordinate('approximate epicenter longitude', longitude, 'E', 'W'),
      stat(subject, 'UTC origin time to the minute', time.slice(0, 5), quakes.map((row) => row[2].slice(11, 16))),
    ]);
  });

  const movieTopics = movies.map(([name, year, director, genre, rating, runtime, distributor], index) => {
    const subject = `the film “${name}”`;
    return topic(`film-${index + 1}`, name, [
      stat(subject, 'release year in The Numbers dataset', year, [Number(year) - 1, Number(year) - 4, Number(year) + 2]),
      fact(`Who directed “${name}”?`, director, movies.map((row) => row[2]), (a) => `${a} directed “${name}.”`),
      stat(subject, 'primary genre in The Numbers dataset', genre, movies.map((row) => row[3])),
      stat(subject, 'U.S. theatrical rating', rating, ['G', 'PG', 'PG-13', 'R', 'NC-17']),
      measurement(subject, 'listed running time', runtime, 'minutes'),
      stat(subject, 'distributor listed by The Numbers', distributor, movies.map((row) => row[6])),
    ]);
  });

  const baseballTopics = baseball.map(([team, year, wins, homers, runs, steals, park, doubles], index) => {
    const subject = `the ${year} ${team}`;
    const question = (label, n) => stat(subject, label, n, numbers(n));
    return topic(`baseball-${index + 1}`, `${team} • ${year}`, [
      stat(subject, 'listed home ballpark', park, baseball.map((row) => row[6])),
      question('regular-season win total', wins),
      question('regular-season home run total', homers),
      question('regular-season run total', runs),
      question('regular-season stolen base total', steals),
      question('regular-season doubles total', doubles),
    ]);
  });

  const soccerTopics = soccer.map(([date, home, away, homeGoals, awayGoals, tournament, city, country], index) => {
    const subject = `${home} vs. ${away} in ${date.slice(0, 4)} (fixture ${index + 1})`;
    const teamGoals = (team, goals) => stat(subject, `goal total for ${team}`, `${goals} goals`,
      [0, 1, 2, 3, 4, 5, 6, 7].map((n) => `${n} goals`));
    return topic(`soccer-${index + 1}`, `${home} vs. ${away}`, [
      stat(subject, 'competition', tournament, soccer.map((row) => row[5])),
      stat(subject, 'host city', city, soccer.map((row) => row[6])),
      stat(subject, 'match date', date, soccer.map((row) => row[0])),
      teamGoals(home, homeGoals),
      teamGoals(away, awayGoals),
      fact(`Which country hosted ${subject}?`, country, soccer.map((row) => row[7]),
        (a) => `Fixture ${index + 1}, played on ${date} at the venue in ${city}, was hosted by ${a}.`),
    ]);
  });

  const trackTopics = tracks.filter((row) => row[1] !== 'Three Dog Night').map(([song, artist, date, rank, previous, peak, weeks], index) => {
    const subject = `“${song}” in the Billboard Hot 100 snapshot`;
    const position = (label, n) => stat(subject, label, `No. ${n}`,
      [n % 100 + 1, (n + 20) % 100 + 1, (n + 40) % 100 + 1].map((v) => `No. ${v}`));
    return topic(`track-${index + 1}`, song, [
      stat(subject, 'credited artist', artist, tracks.map((row) => row[1])),
      position('chart position that week', rank),
      stat(subject, 'date of the chart issue used here', date, tracks.map((row) => row[2])),
      position('chart position the prior week', previous),
      position('peak chart position as of that issue', peak),
      stat(subject, 'cumulative chart run as of that issue', `${weeks} weeks`, numbers(weeks).map((n) => `${n} weeks`)),
    ]);
  });

  const cityFacts = cities.map(([city, country, region], index) => index % 2 === 0
    ? fact(`Which country contains the city of ${city} in ${region}?`, country,
        cities.filter((row) => row[2] !== region).map((row) => row[1]),
        (a) => `${city} lies in ${region}, an administrative area of ${a}.`)
    : fact(`Which administrative area of ${country} contains ${city}?`, region,
        cities.filter((row) => row[1] === country).map((row) => row[2]),
        (a) => `${city} is in the ${a} administrative area of ${country}.`));

  const vowelExamples = {
    AA: 'father', AE: 'cat', AH: 'cup', AO: 'thought', AW: 'cow', AY: 'eye',
    EH: 'bet', ER: 'bird', EY: 'day', IH: 'sit', IY: 'see', OW: 'go',
    OY: 'boy', UH: 'book', UW: 'food',
  };

  const wordFacts = words.map(([word, pronunciation], index) => {
    const vowels = pronunciation.split(' ').filter((sound) => /\d$/.test(sound));
    const stress = vowels.findIndex((vowel) => vowel.endsWith('1'));
    const label = `the word “${word}” in CMU’s US English pronunciation`;
    if (index % 3 === 0) {
      return stat(label, 'number of syllables', vowels.length, [1, 2, 3, 4, 5, 6, 7]);
    }
    if (index % 3 === 1) {
      return stat(label, 'syllable bearing the primary stress', ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'][stress],
        ['first', 'second', 'third', 'fourth', 'fifth', 'sixth']);
    }
    const example = vowelExamples[vowels[stress]?.slice(0, -1)];
    return fact(`Which example word has the same primary stressed vowel as “${word}” in CMU’s US English pronunciation?`,
      example, Object.values(vowelExamples),
      (a) => `In CMU’s US English pronunciation, the primary stressed vowel of “${word}” sounds like the vowel in “${a}.”`);
  });

  function isUsable({ a, d, f }) {
    return a.length > 0 && a.length <= 24 && d.length === 3 && f.split(a).length === 2;
  }

  function groupFacts(facts, id, title) {
    const available = facts.filter(isUsable);
    return Array.from({ length: Math.floor(available.length / 6) }, (_, index) => {
      const start = index * 6;
      return topic(`${id}-${index + 1}`, `${title} ${index + 1}`, available.slice(start, start + 6));
    });
  }

  const topicPools = {
    classic: shuffle([...elementTopics, ...planetTopics, ...quakeTopics], rngFor('winter-classic')),
    words: groupFacts(wordFacts, 'words', prefix === 'winter' ? 'English Pronunciation' : 'Pronunciation Workshop'),
    movies: movieTopics,
    sports: shuffle([...baseballTopics, ...soccerTopics], rngFor('winter-sports')),
    geography: groupFacts(cityFacts, 'cities', prefix === 'winter' ? 'World Cities' : 'Cities and Regions'),
    music: trackTopics,
  };

  return Object.fromEntries(Object.entries(topicPools).map(([category, pool]) =>
    [category, pool.filter((entry) => entry.facts.every(isUsable))]));
}
