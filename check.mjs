import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';

const site = process.env.SITE_URL ? new URL(process.env.SITE_URL) : null;
const base = site?.pathname.replace(/\/?$/, '/') ?? '/';
const routes = ['index.html', 'about/index.html', 'privacy/index.html', 'terms/index.html', 'support/index.html', '404.html'];
let links = 0;

for (const route of routes) {
  const html = readFileSync(`dist/${route}`, 'utf8');
  assert.equal([...html.matchAll(/<h1>/g)].length, 1, `Expected one H1 in ${route}`);
  for (const [, reference] of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    if (reference.startsWith('#')) {
      assert.ok(html.includes(`id="${reference.slice(1)}"`), `Missing anchor ${reference} in ${route}`);
    } else if (reference.startsWith('/')) {
      assert.ok(reference.startsWith(base), `Link outside site base in ${route}: ${reference}`);
      const target = reference.slice(base.length);
      const file = target === '' || target.endsWith('/') ? `${target}index.html` : target;
      assert.ok(statSync(`dist/${file}`, { throwIfNoEntry: false })?.isFile(), `Missing ${reference} in ${route}`);
    } else {
      assert.match(reference, /^(https:\/\/|mailto:)/, `Unexpected link in ${route}: ${reference}`);
    }
    links += 1;
  }
}

if (site) {
  const sitemap = readFileSync('dist/sitemap.xml', 'utf8');
  for (const route of routes.filter((path) => path !== '404.html')) {
    const canonical = `<loc>${new URL(route.replace(/index\.html$/, ''), new URL(base, site)).href}</loc>`;
    assert.ok(sitemap.includes(canonical), `Missing sitemap URL for ${route}`);
  }
}
console.log(`Checked ${links} links, image paths and anchors across ${routes.length} pages.`);
