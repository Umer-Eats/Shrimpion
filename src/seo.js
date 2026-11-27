export const SITE_URL = 'https://www.shrimpion.io';

export const KRILLION_GUIDE = {
  heading: 'Can Shrimpion help me study for Krillion?',
  description: 'Shrimpion is a free daily trivia game inspired by Krillion’s daily dives. If you’re studying for Krillion, use Shrimpion to build general trivia knowledge with fact cards, recall quizzes, and a daily review exam.',
  steps: [
    'Pick a category you want to improve. Try Geography for places and landmarks, or use Daily Random for a mix of topics.',
    'After each fact card, look away and say the answer from memory. Use the quiz review to revisit the facts you missed.',
    'Return the next day and recall a few facts from your last session before starting a new ascent. Play a past ascent to quiz yourself on those facts again.',
  ],
  links: [
    { path: '/archive', label: 'Replay past trivia games' },
    { path: '/unlimited', label: 'Practice in Unlimited' },
  ],
};

// Set lastModified when a page's main content changes. Deploys alone do not change it.
export const PAGES = {
  '/': {
    title: 'Shrimpion | Free Daily Trivia Game & Study App',
    heading: 'Shrimpion',
    description: 'Play Shrimpion, a free daily trivia game and study app. Learn 42 facts in six rounds, then test your recall in the 14-question Surface Exam.',
    index: true,
    lastModified: '2026-11-26',
  },
  '/faq': {
    title: 'How to Play Shrimpion | Trivia & Krillion Study Guide',
    heading: 'How to Play Shrimpion',
    description: 'Learn how Shrimpion’s daily trivia game works, from fact cards to the Surface Exam, and how to use it to study for Krillion.',
    index: true,
    lastModified: '2026-11-26',
  },
  '/unlimited': {
    title: 'Unlimited Trivia Practice | Shrimpion',
    heading: 'The Endless Ascent',
    description: 'Practice trivia without a daily limit in Shrimpion Unlimited. Learn new facts, quiz yourself, and review earlier topics in cumulative exams.',
    index: true,
  },
  '/archive': {
    title: 'Daily Trivia Game Archive | Shrimpion',
    heading: 'Archive',
    description: 'Replay past Shrimpion trivia games by date and category. Browse daily ascents in geography, music, sports, movies, language, and more.',
    index: true,
  },
  '/seas': {
    title: 'The 7 Seas Trivia Leaderboards | Shrimpion',
    heading: 'The 7 Seas',
    description: 'Explore the Shrimpion trivia leaderboards for Daily Swim, category games, and Unlimited runs.',
    index: true,
  },
  '/dive': {
    title: 'Ascending | Shrimpion',
    heading: 'Shrimpion Ascent',
    description: 'Learn facts and test your recall on a Shrimpion ascent.',
  },
  '/me': {
    title: 'My Shrimpion',
    heading: 'My Shrimpion',
    description: 'See your Shrimpion progress, streaks, and unlocked profile shrimp.',
  },
  '/friends': {
    title: 'Friends | Shrimpion',
    heading: 'Friends',
    description: 'Find and manage your friends on Shrimpion.',
  },
  '/urchin-party': {
    title: 'Urchin Party | Shrimpion',
    heading: 'Urchin Party',
    description: 'See what’s planned for Shrimpion’s cooperative multiplayer mode.',
  },
};

export const NOT_FOUND = {
  title: 'Page Not Found | Shrimpion',
  heading: 'Page not found',
  description: 'Try the daily trivia game or find another page in the Shrimpion menu.',
};

export function getPageHead(pathname) {
  const path = pathname.toLowerCase().replace(/\/+$/, '') || '/';
  const page = Object.hasOwn(PAGES, path) ? PAGES[path] : NOT_FOUND;
  const titleAndDescription = [
    { tag: 'title', text: page.title },
    { tag: 'meta', attrs: { name: 'description', content: page.description } },
  ];
  if (!page.index) {
    return [...titleAndDescription, { tag: 'meta', attrs: { name: 'robots', content: 'noindex, follow' } }];
  }

  const url = SITE_URL + path;
  const social = {
    'og:type': 'website',
    'og:site_name': 'Shrimpion',
    'og:locale': 'en_US',
    'og:title': page.title,
    'og:description': page.description,
    'og:url': url,
    'og:image': SITE_URL + '/shrimpion-share.png',
    'og:image:width': '1200',
    'og:image:height': '630',
    'og:image:alt': 'Shrimpion, a free daily trivia game, with a pink pixel-art shrimp',
  };
  const twitter = {
    'twitter:card': 'summary_large_image',
    'twitter:title': page.title,
    'twitter:description': page.description,
    'twitter:image': social['og:image'],
    'twitter:image:alt': social['og:image:alt'],
  };
  const tags = [
    ...titleAndDescription,
    { tag: 'link', attrs: { rel: 'canonical', href: url } },
    ...Object.entries(social).map(([property, content]) => ({ tag: 'meta', attrs: { property, content } })),
    ...Object.entries(twitter).map(([name, content]) => ({ tag: 'meta', attrs: { name, content } })),
  ];
  if (path === '/') {
    tags.push({
      tag: 'script',
      attrs: { type: 'application/ld+json' },
      text: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Shrimpion',
        alternateName: 'Shrimpion.io',
        url,
      }),
    });
  }
  return tags;
}
