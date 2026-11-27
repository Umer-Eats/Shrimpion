import { readFileSync, writeFileSync } from 'node:fs';
import { getPageHead, KRILLION_GUIDE, NOT_FOUND, PAGES, SITE_URL } from '../src/seo.js';

const dist = new URL('../dist/', import.meta.url);
const template = readFileSync(new URL('index.html', dist), 'utf8');
const publicPages = Object.entries(PAGES).filter(([, page]) => page.index);
const headPlaceholder = '<title data-route-seo>Shrimpion</title>';
const rootPlaceholder = '<div id="root"></div>';

if (!template.includes(headPlaceholder) || !template.includes(rootPlaceholder)) {
  throw new Error('The built HTML is missing its metadata or app placeholder.');
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

function renderHeadTag({ tag, attrs = {}, text }) {
  const attributes = Object.entries(attrs).map(([key, value]) => ` ${key}="${escapeHtml(value)}"`).join('');
  const open = `<${tag} data-route-seo${attributes}>`;
  if (text === undefined) return open;
  const content = tag === 'script' ? text.replace(/</g, '\\u003c') : escapeHtml(text);
  return `${open}${content}</${tag}>`;
}

function renderIntro(path, page) {
  const links = path === '/'
    ? [
        ['/dive', 'Play today’s trivia game'],
        ['/faq', 'How to play'],
        ['/unlimited', 'Unlimited trivia practice'],
        ['/archive', 'Past trivia games'],
        ['/seas', 'Trivia leaderboards'],
      ]
    : [['/', 'Play Shrimpion']];
  const guide = path === '/faq'
    ? `<section class="panel"><h2>${escapeHtml(KRILLION_GUIDE.heading)}</h2>
  <p>${escapeHtml(KRILLION_GUIDE.description)}</p>
  <p>${escapeHtml(KRILLION_GUIDE.tip)}</p>
  <a href="/archive">Browse past ascents</a></section>`
    : '';
  return `<main class="page"><div class="page-inner">
  <h1 class="page-title">${escapeHtml(page.heading)}</h1>
  <p class="page-intro">${escapeHtml(page.description)}</p>
  ${guide}
  <ul>${links.map(([href, label]) => `<li><a href="${href}">${label}</a></li>`).join('')}</ul>
</div></main>`;
}

for (const [path, page] of [...Object.entries(PAGES), ['/404', NOT_FOUND]]) {
  const html = template
    .replace(headPlaceholder, () => getPageHead(path).map(renderHeadTag).join('\n    '))
    .replace(rootPlaceholder, () => `<div id="root">${renderIntro(path, page)}</div>`);
  const filename = path === '/' ? 'index.html' : `${path.slice(1)}.html`;
  writeFileSync(new URL(filename, dist), html);
}

const urls = publicPages.map(([path]) => `  <url><loc>${SITE_URL}${path}</loc></url>`).join('\n');
writeFileSync(new URL('sitemap.xml', dist), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`);
writeFileSync(new URL('robots.txt', dist), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
