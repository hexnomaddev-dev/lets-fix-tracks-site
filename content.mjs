import { readFileSync } from 'node:fs';
import { howToPlay } from './how-to-play.mjs';

export const release = {
  developer: 'Independent developer',
  supportEmail: 'hexnomad.dev@gmail.com',
  playUrl: '',
};

const slides = [
  {
    label: 'Actual gameplay', caption: 'The First Route · 4 × 4',
    images: [['first-route-board.webp', 880, 894, 'A partly laid route with numbered clues, a square start and a circular endpoint.']],
  },
  {
    label: 'Light and dark themes', caption: 'The same puzzle in light and dark',
    images: [
      ['first-route-board.webp', 880, 894, 'The First Route on a light board.'],
      ['first-route-dark-board.webp', 880, 893, 'The First Route on a dark board.'],
    ],
  },
  {
    label: 'Hints and assistance', caption: 'A hint explains where to place a corner',
    images: [['hint-detail.webp', 880, 894, 'The hint panel suggests placing the Corner NE piece in the highlighted cell.']],
  },
  {
    label: 'Puzzle variety', caption: 'Daily challenges in four difficulty levels',
    images: [['difficulty-detail.webp', 659, 894, 'The daily puzzle menu lists Easy, Medium, Hard and Expert.']],
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
        <section class="wrap hero">
          <div class="hero-copy">
            <p class="eyebrow"><span class="terminal" aria-hidden="true"></span> A minimalist logic puzzle</p>
            <h1>Let’s Fix<br><em>Tracks.</em></h1>
            <p class="intro">Build one continuous railway line. Read the clues, place the pieces, and find the route from start to finish.</p>
            <div class="hero-actions">${download}
              <a class="text-link" href="${url('about/')}">How to play <span aria-hidden="true">↗</span></a>
            </div>
          </div>
          <section class="hero-art" aria-label="Gameplay showcase" aria-roledescription="carousel" data-carousel>
            <div class="board-field">
              <svg class="board-track" viewBox="0 0 560 360" preserveAspectRatio="none" aria-hidden="true">
                <path d="M17 272h43q26 0 26-26v-30q0-24 24-24h322q26 0 26-26v-42q0-24 24-24h63"/>
                <rect x="12" y="267" width="10" height="10"/>
                <circle cx="545" cy="100" r="5"/>
              </svg>
              <div class="carousel-stage" id="hero-slides">
                ${slides.map(({ label, caption, images }, index) => `
                  <div class="carousel-slide${index === 0 ? ' is-active' : ''}" role="group" aria-roledescription="slide"
                    aria-label="${index + 1} of ${slides.length} · ${label}" aria-hidden="${index !== 0}" data-caption="${caption}">
                    ${images.map(([file, width, height, alt]) => `<div class="slide-image">
                      ${artwork(file, width, height, alt, index === 0)}
                      <p class="image-fallback" hidden>Screenshot unavailable</p>
                    </div>`).join('')}
                  </div>`).join('')}
              </div>
            </div>
            <p class="carousel-caption">${slides[0].caption}</p>
            <div class="carousel-controls" hidden>
              <button class="carousel-play" type="button" aria-label="Pause autoplay" title="Pause autoplay"><span aria-hidden="true">Ⅱ</span></button>
              <button class="carousel-arrow carousel-prev" type="button" aria-label="Previous slide" aria-controls="hero-slides"><span aria-hidden="true">←</span></button>
              <div class="carousel-dots" role="group" aria-label="Choose a slide">
                ${slides.map(({ label }, index) => `<button type="button" aria-label="Show ${label.toLowerCase()}" aria-controls="hero-slides"${index === 0 ? ' aria-current="true"' : ''}></button>`).join('')}
              </div>
              <button class="carousel-arrow carousel-next" type="button" aria-label="Next slide" aria-controls="hero-slides"><span aria-hidden="true">→</span></button>
            </div>
            <p class="carousel-status" aria-live="polite" aria-atomic="true"></p>
          </section>
        </section>
        <section class="rules">
          <div class="wrap rules-grid">
            <div><span class="rule-icon start" aria-hidden="true"></span><h2>Read the clues</h2><p>Each number tells you how many cells in that row or column contain track.</p></div>
            <div><span class="rule-icon bend" aria-hidden="true"></span><h2>Lay the track</h2><p>Use straight pieces and corners to connect the square and circle.</p></div>
            <div><span class="rule-icon finish" aria-hidden="true"></span><h2>Complete the route</h2><p>Join both ends with one unbroken line that satisfies every clue.</p></div>
          </div>
        </section>
        <section class="wrap showcase" aria-labelledby="gallery-title">
          <h2 id="gallery-title">A look at the game</h2>
          <div class="gallery">
            ${screenshot('first-route-light.webp', 'Partly built track on a light board, with clues and track tools', 'Light theme')}
            ${screenshot('first-route-dark.webp', 'The same puzzle in dark mode, with a pale track on the grid', 'Dark theme')}
            ${screenshot('puzzle-hint.webp', 'A hint points to a cell where a corner piece should go', 'A hint in play')}
          </div>
        </section>
        <section class="wrap home-about">
          <div><h2>About the game</h2><p>Inspired by Train Tracks puzzles, Let’s Fix Tracks gives you a grid, two endpoints, and just enough clues to work out what goes between them.</p></div>
          <a class="text-link" href="${url('about/')}">More about the game <span aria-hidden="true">↗</span></a>
        </section>`,
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
