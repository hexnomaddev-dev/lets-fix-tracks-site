import { readFileSync } from 'node:fs';
import { howToPlay, teachingBoard } from './how-to-play.mjs';

export const release = {
  developer: 'Independent developer',
  supportEmail: 'hexnomad.dev@gmail.com',
  playUrl: '',
};

const slides = [
  {
    label: 'Find the terminals', description: 'The square is your start. The circle is your destination. Their short tails show where the route connects.',
    board: { stage: 1 },
  },
  {
    label: 'Let the clues lead', description: 'A zero means no track in that row or column. Mark those cells. The highlighted row now has four cells available for its clue of four.',
    board: { stage: 2, highlight: 'row' },
  },
  {
    label: 'Build from the start', description: 'Join straights and corners from the square. Each piece counts as one cell in both its row and its column.',
    board: { stage: 3, markZeros: true },
  },
  {
    label: 'Bring the ends together', description: 'Turn toward the fixed piece and follow it toward the circle. One gap remains. Which shape fits?',
    board: { stage: 3, markZeros: true, visiblePieces: [0, 1, 2, 3, 4, 5, 6, 8] },
  },
  {
    label: 'One continuous route', description: 'The final horizontal piece closes the gap. Both terminals connect, every clue matches, and the puzzle is complete.',
    board: { stage: 4, markZeros: true },
  },
];

export function pages({ url, artwork, download, developer, supportEmail }) {
  const screenshot = (file, alt, caption) => `<figure>
    <a class="screenshot" href="${url(`assets/${file}`)}" aria-label="View full screenshot: ${caption}">${artwork(file, 720, 1600, alt)}</a>
    <figcaption>${caption}</figcaption>
  </figure>`;
  return [
    {
      route: '', title: "Let's Fix Tracks — A railway logic puzzle",
      description: 'Connect two terminals with a single continuous railway track. A minimalist logic puzzle for Android.',
      body: `
        <div class="home-page">
          <section class="wrap home-hero">
            <div class="home-introduction">
              <p class="eyebrow">A railway logic puzzle</p>
              <h1>Let’s Fix<br><em>Tracks.</em></h1>
              <p class="home-tagline">A few clues. A little thought.<br>One satisfying connection.</p>
              <p class="home-intro">Find a continuous route from the square to the circle. Every row and column has a clue. Every piece brings you a little closer.</p>
              <div class="home-actions">
                ${download || `<a class="home-primary" href="${url('about/')}">Learn to play</a>`}
                <a class="text-link" href="#gallery-title">See the game</a>
              </div>
              <div class="home-route-key"><span class="home-square" aria-hidden="true"></span><span>Start</span><span class="home-key-line" aria-hidden="true"></span><span class="home-circle" aria-hidden="true"></span><span>Destination</span></div>
            </div>
            <section class="hero-art home-demo" aria-label="Solve a puzzle in five steps" aria-roledescription="carousel" data-carousel>
              <div class="home-demo-heading"><h2>A puzzle, in five steps.</h2><span class="carousel-count" aria-hidden="true">1 / 5</span></div>
              <div class="carousel-stage" id="hero-slides">
                ${slides.map(({label, description, board}, index) => `<div class="carousel-slide${index === 0 ? ' is-active' : ''}" role="group" aria-roledescription="slide" aria-label="Step ${index + 1} of ${slides.length}. ${label}" aria-hidden="${index !== 0}" data-caption="${label}" data-description="${description}">
                  ${teachingBoard('home-step-' + index, {...board, label: 'Step ' + (index + 1) + '. ' + label})}
                </div>`).join('')}
              </div>
              <div class="home-demo-copy"><p class="carousel-caption">${slides[0].label}</p><p class="carousel-description">${slides[0].description}</p></div>
              <div class="carousel-controls" hidden>
                <button class="carousel-play" type="button" aria-label="Pause autoplay" title="Pause autoplay"><span aria-hidden="true">Ⅱ</span></button>
                <button class="carousel-prev" type="button" aria-label="Previous step" aria-controls="hero-slides"><span aria-hidden="true">‹</span></button>
                <div class="carousel-dots" role="group" aria-label="Choose a solving step">
                  ${slides.map(({label}, index) => `<button type="button" aria-label="Step ${index + 1}: ${label}" aria-controls="hero-slides"${index === 0 ? ' aria-current="step"' : ''}>${index + 1}</button>`).join('')}
                </div>
                <button class="carousel-next" type="button" aria-label="Next step" aria-controls="hero-slides"><span aria-hidden="true">›</span></button>
              </div>
              <p class="carousel-status" aria-live="polite" aria-atomic="true"></p>
              <p class="home-demo-note">Illustrated 6 × 6 teaching puzzle</p>
            </section>
          </section>

          <section class="wrap home-principles" aria-label="The puzzle in three ideas">
            <div><svg viewBox="0 0 64 48" aria-hidden="true"><rect x="9" y="12" width="42" height="28" rx="3"/><path d="M23 12V40M37 12V40M9 26H51"/><text x="28" y="9">2</text><path class="home-icon-track" d="M16 33H44"/></svg><h2>Read the clues</h2><p>Each number tells you how many cells in that row or column contain track.</p></div>
            <div><svg viewBox="0 0 64 48" aria-hidden="true"><rect x="9" y="7" width="42" height="34" rx="3"/><path d="M30 7V41"/><path class="home-icon-track" d="M9 24H29Q41 24 41 36V41"/></svg><h2>Find your way</h2><p>Choose straights and corners. Let the clues guide each connection.</p></div>
            <div><svg viewBox="0 0 64 48" aria-hidden="true"><path class="home-icon-track" d="M14 12H30Q40 12 40 24V26Q40 36 50 36"/><rect x="8" y="6" width="12" height="12"/><circle cx="51" cy="36" r="6"/></svg><h2>Complete the route</h2><p>Connect the square and circle with one line that satisfies every clue.</p></div>
          </section>

          <section class="home-gallery" aria-labelledby="gallery-title">
            <div class="wrap">
              <div class="home-gallery-heading"><div><p class="eyebrow">Inside the game</p><h2 id="gallery-title">A little space<br>to think.</h2></div><p>Light or dark. A hint when you need it.<br>The focus stays on the next connection.</p></div>
              <div class="gallery">
                ${screenshot('first-route-light.webp', 'A real game board in the light theme, with track pieces, clues and editing controls', 'Light theme')}
                ${screenshot('first-route-dark.webp', 'The same puzzle and controls in the dark theme', 'Dark theme')}
                <figure class="home-hint-shot"><a class="screenshot" href="${url('assets/puzzle-hint.webp')}" aria-label="View full screenshot: A hint in play">${artwork('hint-detail.webp', 880, 894, 'An actual hint highlights where a Corner NE piece should go')}</a><figcaption>A hint in play</figcaption><h3>A nudge in the right direction.</h3><p>Reveal a useful cell, then make the next move yourself.</p></figure>
              </div>
            </div>
          </section>

          <section class="wrap home-next">
            <div class="home-next-route" aria-hidden="true"><svg viewBox="0 0 160 140"><path d="M25 25H71Q98 25 98 52V82Q98 109 125 109"/><rect x="15" y="15" width="20" height="20"/><circle cx="128" cy="109" r="11"/></svg></div>
            <div><p class="eyebrow">Your first connection</p><h2>Every route starts<br>with a little curiosity.</h2><p>New to track puzzles? Our visual guide walks you through the board, the clues, and your first complete route.</p></div>
            <a class="home-primary" href="${url('about/')}">Explore How to Play</a>
          </section>
        </div>`,
    },
    {
      route: 'about/', title: 'How to Play — A Visual Guide', description: 'Learn to read clues, connect track pieces and solve Let’s Fix Tracks puzzles with illustrated boards, controls and step-by-step examples.',
      body: howToPlay({ url, artwork, download }),
    },
    {
      route: 'privacy/', title: 'Privacy Policy', description: 'Privacy information for the Let’s Fix Tracks Android game.',
      body: readFileSync(new URL('./legal/privacy.html', import.meta.url), 'utf8'),
    },
    {
      route: 'terms/', title: 'Terms &amp; Conditions', description: 'Terms of use for the Let’s Fix Tracks Android game.',
      body: readFileSync(new URL('./legal/terms.html', import.meta.url), 'utf8'),
    },
    {
      route: 'support/', title: 'Support', description: 'Get help with Let’s Fix Tracks, report a bug or find answers to common questions.',
      body: `<article class="wrap reading"><h1>Support</h1>
        <p class="intro">Stuck on a puzzle or something behaving unexpectedly? Here’s what to include so the developer can help.</p>
        <section><h2>Contact the developer</h2><p>Support email: ${supportEmail}</p></section>
        <section><h2>Report a bug</h2><ul>
          <li>Include your device model, Android version and game version.</li>
          <li>Share the puzzle name or the screen where the problem happened.</li>
          <li>Describe what you did, what you expected and what happened.</li>
          <li>Attach a screenshot if it helps. Remove personal information before sharing it.</li>
        </ul></section>
        <section class="faq"><h2>Frequently asked questions</h2>
          <details><summary>What do the numbers around the board mean?</summary><p>Each number tells you how many cells in that row or column should contain track, including any endpoints and fixed pieces.</p></details>
          <details><summary>What can I do if I’m stuck?</summary><p>Start with rows or columns that have a zero, count the fixed pieces, or use the hint control for help with a move.</p></details>
          ${release.playUrl ? `<details><summary>Where can I download the game?</summary><p>Open the official Google Play listing from the <a href="${url('')}">home page</a>.</p></details>` : ''}
        </section>
        <section><h2>Legal information</h2><p><a href="${url('privacy/')}">Privacy Policy</a> · <a href="${url('terms/')}">Terms &amp; Conditions</a></p></section>
      </article>`,
    },
    {
      route: '404.html', title: 'Page missing', description: 'The requested page could not be found.',
      body: `<div class="wrap reading missing"><p class="eyebrow">404</p><h1>Page missing</h1><p class="intro">Check the address or head back to the home page.</p><a class="text-link" href="${url('')}">Back to home <span aria-hidden="true">↗</span></a></div>`,
    },
  ];
}
