import { copyFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { pages, release } from './content.mjs';

const site = process.env.SITE_URL ? new URL(process.env.SITE_URL) : null;
const releaseBuild = process.argv.includes('--release');
if (site && (site.protocol !== 'https:' || site.search || site.hash || site.username || site.password)) {
  throw new Error('SITE_URL must be a public HTTPS origin or project URL.');
}
if (site && !site.pathname.endsWith('/')) site.pathname += '/';
const url = (path) => `${site?.pathname ?? '/'}${path}`;
const escape = (value) => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const contact = (email) => email
  ? `<a href="mailto:${escape(email)}">${escape(email)}</a>`
  : '<span class="pending" data-development-only>[Development only · email pending confirmation]</span>';
const artwork = (file, width, height, alt, hero = false) =>
  `<img src="${url(`assets/${file}`)}" width="${width}" height="${height}" alt="${escape(alt)}" ${hero ? 'fetchpriority="high"' : 'loading="lazy" decoding="async"'}>`;
const download = release.playUrl
  ? `<a class="download" href="${escape(release.playUrl)}">Get it on Google Play</a>`
  : '';
const routes = pages({
  url, artwork, download,
  developer: release.developer ? escape(release.developer) : '<span class="pending" data-development-only>[Development only · developer name pending confirmation]</span>',
  supportEmail: contact(release.supportEmail),
});
const drafts = new Set(routes.filter(({ body }) => body.includes('data-development-only')).map(({ route }) => route));
if (releaseBuild && (!site || drafts.size)) {
  console.error('Release build blocked. Set SITE_URL and resolve development-only content on: ' +
    ([...drafts].map((route) => '/' + route).join(', ') || 'none'));
  process.exit(1);
}
const nav = [['', 'Home'], ['about/', 'About'], ['support/', 'Support']];
const brand = `<a class="brand" href="${url('')}"><img src="${url('assets/icon.png')}" width="36" height="36" alt="">Let’s Fix Tracks</a>`;
const assets = [
  'style.css', 'carousel.js', 'icon.png', 'dm-sans.ttf', 'DM_Sans_OFL.txt',
  'first-route-board.webp', 'first-route-dark-board.webp', 'hint-detail.webp', 'difficulty-detail.webp',
  'first-route-light.webp', 'first-route-dark.webp', 'puzzle-hint.webp',
];
const sitemap = site && routes.filter(({ route }) => route !== '404.html')
  .map(({ route }) => `  <url><loc>${escape(new URL(route, site).href)}</loc></url>`).join('\n');

mkdirSync('dist/assets', { recursive: true });
for (const asset of assets) copyFileSync(`assets/${asset}`, `dist/assets/${asset}`);
for (const { route, title, description, body } of routes) {
  const fullTitle = route === '' ? title : `${title} | Let’s Fix Tracks`;
  const canonical = site && route !== '404.html' ? escape(new URL(route, site).href) : null;
  const file = `dist/${route.endsWith('.html') ? route : `${route}index.html`}`;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${fullTitle}</title>
  <meta name="description" content="${escape(description)}">
  <meta name="theme-color" content="#faf9f5">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Let’s Fix Tracks">
  <meta property="og:title" content="${fullTitle}">
  <meta property="og:description" content="${escape(description)}">
  ${canonical ? `<link rel="canonical" href="${canonical}"><meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${escape(new URL('assets/first-route-board.webp', site).href)}">
  <meta property="og:image:alt" content="The First Route board mid-solve">` : ''}
  ${route === '404.html' || drafts.has(route) ? '<meta name="robots" content="noindex">' : ''}
  <link rel="icon" href="${url('assets/icon.png')}" type="image/png">
  <link rel="stylesheet" href="${url('assets/style.css')}">
</head>
<body>
  <a class="skip" href="#main">Skip to content</a>
  <header class="site-header"><div class="wrap header-inner">
    ${brand}
    <nav aria-label="Main"><ul>${nav.map(([path, label]) =>
      `<li><a href="${url(path)}"${route === path ? ' aria-current="page"' : ''}>${label}</a></li>`).join('')}</ul></nav>
  </div></header>
  <main id="main" tabindex="-1">${body}</main>
  <footer class="site-footer"><div class="wrap footer-inner">
    ${brand}
    <nav aria-label="Footer"><ul>
      <li><a href="${url('support/')}"${route === 'support/' ? ' aria-current="page"' : ''}>Support</a></li>
      <li><a href="${url('privacy/')}"${route === 'privacy/' ? ' aria-current="page"' : ''}>Privacy Policy</a></li>
      <li><a href="${url('terms/')}"${route === 'terms/' ? ' aria-current="page"' : ''}>Terms &amp; Conditions</a></li>
    </ul></nav>
  </div></footer>
  ${route === '' ? `<script src="${url('assets/carousel.js')}" defer></script>` : ''}
</body>
</html>
`);
}
if (sitemap) writeFileSync('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemap}
</urlset>
`);
else rmSync('dist/sitemap.xml', { force: true });
console.log(`Built ${routes.length} pages for ${url('')}`);
