// Teaching example: one 6 × 6 board, reused across every construction stage.
// Terminals face east/west; the horizontal piece at row 4, column 2 is fixed.
const route = [[1, 1], [1, 2], [2, 2], [2, 1], [2, 0], [3, 0], [3, 1], [3, 2], [3, 3]];
const rowClues = [0, 2, 3, 4, 0, 0];
const columnClues = [2, 3, 3, 1, 0, 0];
const pieces = [
  ['HORIZONTAL', 'Horizontal', 'West + east', 'M0 24H48'],
  ['VERTICAL', 'Vertical', 'North + south', 'M24 0V48'],
  ['CURVE_NORTH_EAST', 'Corner NE', 'North + east', 'M24 0V14Q24 24 34 24H48'],
  ['CURVE_SOUTH_EAST', 'Corner SE', 'South + east', 'M48 24H34Q24 24 24 34V48'],
  ['CURVE_SOUTH_WEST', 'Corner SW', 'South + west', 'M24 48V34Q24 24 14 24H0'],
  ['CURVE_WEST_NORTH', 'Corner NW', 'North + west', 'M0 24H14Q24 24 24 14V0'],
];
const pieceByCell = ['START', 'CURVE_SOUTH_WEST', 'CURVE_WEST_NORTH', 'HORIZONTAL',
  'CURVE_SOUTH_EAST', 'CURVE_NORTH_EAST', 'HORIZONTAL', 'HORIZONTAL', 'END'];

function pieceDiagram(index, id) {
  const [, name, ports, path] = pieces[index];
  return `<svg viewBox="-6 -6 60 60" role="img" aria-labelledby="${id}">
    <title id="${id}">${name}. Connects ${ports.toLowerCase()}.</title>
    <rect x="0" y="0" width="48" height="48" rx="5" class="guide-cell"/>
    <path d="${path}" class="guide-track"/>
    <circle r="2" cx="24" cy="24" class="guide-joint"/>
  </svg>`;
}

function board(id, { stage = 4, highlight, invalid = false, markZeros = false, visiblePieces, label } = {}) {
  const visible = new Set(visiblePieces ?? (stage === 4 ? route.map((_, i) => i)
    : stage === 3 ? [0, 1, 2, 3, 4, 6, 8] : [0, 6, 8]));
  const occupied = route.filter((_, index) => visible.has(index));
  const rows = rowClues.map((_, r) => occupied.filter(([row]) => row === r).length);
  const columns = columnClues.map((_, c) => occupied.filter(([, column]) => column === c).length);
  const cells = [];
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      const marked = (stage === 2 || markZeros) && (rowClues[r] === 0 || columnClues[c] === 0);
      const emphasis = highlight === 'row' && r === 3 || highlight === 'column' && c === 2;
      cells.push(`<g transform="translate(${48 + c * 48} ${48 + r * 48})">
        <rect x="0" y="0" width="48" height="48" rx="5" class="guide-cell${emphasis ? ' guide-highlight' : ''}"/>
        ${marked ? '<path d="M19 19L29 29M29 19L19 29" class="guide-empty"/>' : ''}
      </g>`);
    }
  }
  const track = route.map(([r, c], i) => {
    if (!visible.has(i)) return '';
    let path;
    if (i === 0) path = '<path d="M24 24H48" class="guide-track"/><rect x="14" y="14" width="20" height="20" class="guide-terminal"/><rect x="20" y="20" width="8" height="8" class="guide-dot"/>';
    else if (i === 8) path = '<path d="M0 24H24" class="guide-track"/><circle cx="24" cy="24" r="11" class="guide-terminal"/><circle cx="24" cy="24" r="4" class="guide-dot"/>';
    else {
      const piece = pieces.find(([name]) => name === (invalid && i === 2 ? 'CURVE_SOUTH_EAST' : pieceByCell[i]));
      path = `<path d="${piece[3]}" class="guide-track${i === 6 ? ' guide-fixed' : ''}${invalid && i === 2 ? ' guide-wrong' : ''}"/>
        ${i === 6 ? '<circle cx="24" cy="24" r="4" class="guide-fixed-dot"/>' : ''}`;
    }
    return `<g transform="translate(${48 + c * 48} ${48 + r * 48})">${path}</g>`;
  }).join('');
  const clues = rowClues.map((clue, r) => `<text x="26" y="${77 + r * 48}" class="${rows[r] === clue ? 'guide-exact' : ''}">${clue}</text>`).join('') +
    columnClues.map((clue, c) => `<text x="${72 + c * 48}" y="30" class="${columns[c] === clue ? 'guide-exact' : ''}">${clue}</text>`).join('');
  return `<svg class="guide-board" viewBox="0 0 354 354" role="img" aria-labelledby="${id}-title ${id}-desc">
    <title id="${id}-title">${label ?? (invalid ? 'Invalid route with a mismatched corner' : stage === 4 ? 'Completed teaching board' : 'Teaching board, stage ' + stage)}</title>
    <desc id="${id}-desc">Six rows and six columns. Row clues 0, 2, 3, 4, 0, 0. Column clues 2, 3, 3, 1, 0, 0.
      Square start at row 2, column 2 faces right. Circular destination at row 4, column 4 faces left.
      A fixed horizontal track is at row 4, column 2.
      ${highlight === 'row' ? 'The fourth row is highlighted. Its clue requires four occupied cells, including the fixed piece and the destination.' : ''}
      ${highlight === 'column' ? 'The third column is highlighted. Three track cells satisfy its clue of three.' : ''}
      ${stage === 2 || markZeros ? 'X marks cover the zero rows and columns.' : ''}
      ${invalid ? 'The corner at row 3, column 3 faces east and south, breaking the route. All counts still match.' : ''}
    </desc>
    ${cells.join('')}${clues}${track}
    ${invalid ? '<rect x="142" y="142" width="52" height="52" rx="7" class="guide-error-ring"/>' : ''}
  </svg>`;
}

export { board as teachingBoard };

function difficultyGrid(size, label) {
  const lines = Array.from({ length: size + 1 }, (_, i) =>
    `<path d="M${i * 6} 0V${size * 6}M0 ${i * 6}H${size * 6}"/>`).join('');
  return `<figure><div class="guide-size-space"><svg width="${size * 6}" height="${size * 6}" viewBox="-1 -1 ${size * 6 + 2} ${size * 6 + 2}" role="img" aria-label="${label}, ${size} by ${size} grid">${lines}</svg></div>
    <figcaption><strong>${label}</strong><span>${size} × ${size}</span></figcaption></figure>`;
}

export function howToPlay({ url, artwork, download }) {
  return `<article class="wrap guide">
    <header class="guide-opening">
      <p class="eyebrow">How to Play</p>
      <h1>One grid. Two terminals.<br><em>One continuous route.</em></h1>
      <p class="guide-lead">Connect the square starting point to the circular destination by building one continuous railway route that satisfies every row and column clue.</p>
    </header>
    <div class="guide-board-intro">
      <figure class="guide-paper">${board('welcome', { stage: 3 })}<figcaption>A 6 × 6 teaching example, partway through a solve.</figcaption></figure>
      <div class="guide-board-notes">
        <h2>Meet your board</h2>
        <dl class="guide-legend">
          <div><dt><span class="guide-square" aria-hidden="true"></span> Square</dt><dd>Your starting point.</dd></div>
          <div><dt><span class="guide-circle" aria-hidden="true"></span> Circle</dt><dd>Your destination.</dd></div>
          <div><dt>Grid cells</dt><dd>Each cell holds one piece, or stays empty.</dd></div>
          <div><dt>Row numbers</dt><dd>A clue at the left counts track cells across that row.</dd></div>
          <div><dt>Column numbers</dt><dd>A clue above the grid counts track cells down that column.</dd></div>
          <div><dt>Fixed pieces</dt><dd>The dark horizontal piece is given. It and the terminals stay in place and already count toward the clues.</dd></div>
        </dl>
        <p class="guide-note">Follow the short tail on each terminal. It shows the side where the route must connect.</p>
      </div>
    </div>
    <nav class="guide-contents" aria-label="Guide sections">
      <a href="#clues">Read the clues</a><a href="#pieces">Track pieces</a><a href="#build-route">Build a route</a><a href="#controls">Game controls</a><a href="#route-rules">Route rules</a><a href="#difficulty">Difficulty</a>
    </nav>

    <section id="clues" class="guide-section">
      <div class="guide-section-heading"><p class="eyebrow">Read the board</p><h2>Count cells, one at a time.</h2><p>A corner counts as one cell, just like a straight. Every occupied cell contributes to both its row and its column.</p></div>
      <div class="guide-pair">
        <figure class="guide-example">${board('count-row', { highlight: 'row' })}
          <figcaption><h3>The fourth row needs 4</h3><p>Three track pieces + the destination = <strong>4 occupied cells</strong>. The fixed horizontal piece is one of those three.</p></figcaption></figure>
        <figure class="guide-example">${board('count-column', { highlight: 'column' })}
          <figcaption><h3>The third column needs 3</h3><p>Read the clue above the column. Two corners + one horizontal = <strong>3 occupied cells</strong>.</p></figcaption></figure>
      </div>
      <p class="guide-note"><strong>What stays out of the total?</strong> Blank cells, X marks and “Possible track” markers. Only real track pieces and the two terminals count.</p>
    </section>

    <section id="pieces" class="guide-section">
      <div class="guide-section-heading"><p class="eyebrow">Your palette</p><h2>Mark a possibility. Choose a shape.</h2><p>The palette starts with a placeholder marker, followed by six track shapes. North is up, east is right, south is down and west is left.</p></div>
      <div class="guide-pieces">
        <figure>
          <svg viewBox="-6 -6 60 60" role="img" aria-labelledby="piece-placeholder">
            <title id="piece-placeholder">Possible track placeholder. A dashed cross with a soft circular centre marks an undecided cell.</title>
            <rect x="0" y="0" width="48" height="48" rx="5" class="guide-cell"/>
            <g fill="#5a7a61">
              <circle cx="24" cy="24" r="14.88" opacity=".10"/>
              <circle cx="24" cy="24" r="9.6" opacity=".16"/>
              <circle cx="24" cy="24" r="4.8" opacity=".35"/>
            </g>
            <path d="M24 24V5.76M24 24H42.24M24 24V42.24M24 24H5.76" fill="none" stroke="#4c6753" stroke-opacity=".55" stroke-width="1.4" stroke-dasharray="4.8 3.6" stroke-linecap="round"/>
            <circle cx="24" cy="24" r="2.16" fill="#4c6753"/>
            <circle cx="24" cy="24" r="3.6" fill="none" stroke="#4c6753" stroke-opacity=".65"/>
          </svg>
          <figcaption><strong>Possible track</strong><span>Placeholder marker</span></figcaption>
        </figure>
        ${pieces.map(([, name, ports], index) => `<figure>${pieceDiagram(index, 'piece-' + index)}<figcaption><strong>${name}</strong><span>${ports}</span></figcaption></figure>`).join('')}
      </div>
      <p class="guide-note"><strong>Keep a possibility in mind.</strong> Select Possible track and tap an undecided cell to add this marker. Tap it again with Possible track selected to remove it, or place a real track piece there when you know its shape. The marker contributes zero to the row and column totals.</p>
      <div class="guide-two-notes"><p><strong>Straights</strong> join opposite sides of a cell.</p><p><strong>Corners</strong> join adjacent sides. Choose a shape whose connections align with the pieces in neighbouring cells.</p></div>
      <div class="guide-adjacency">
        <h3>Neighbours connect only when their ends meet.</h3>
        <p>Two track cells can sit beside each other without joining. Check the connection directions at their shared edge.</p>
        <div class="guide-connections">
          <figure>
            <svg viewBox="-6 -6 108 60" role="img" aria-labelledby="neighbours-connected">
              <title id="neighbours-connected">Connected neighbours. Two horizontal pieces meet across the shared edge.</title>
              <rect width="48" height="48" rx="5" class="guide-cell"/>
              <rect x="48" width="48" height="48" rx="5" class="guide-cell"/>
              <path d="M0 24H96" class="guide-track"/>
            </svg>
            <figcaption><strong>Connected</strong><span>The left piece faces east; the right piece faces west. Their ends meet.</span></figcaption>
          </figure>
          <figure>
            <svg viewBox="-6 -6 108 60" role="img" aria-labelledby="neighbours-separate">
              <title id="neighbours-separate">Separate neighbours. Two vertical pieces sit side by side. Neither has a connection across their shared edge.</title>
              <rect width="48" height="48" rx="5" class="guide-cell"/>
              <rect x="48" width="48" height="48" rx="5" class="guide-cell"/>
              <path d="M24 0V48M72 0V48" class="guide-track"/>
            </svg>
            <figcaption><strong>Side by side, separate</strong><span>Both pieces face north and south. Neither opens toward the other.</span></figcaption>
          </figure>
        </div>
        <p class="guide-note">Separate neighbours are allowed. If one piece does point toward its neighbour, that neighbour must point back. A one-sided connection is a mismatch.</p>
      </div>
    </section>

    <section id="build-route" class="guide-section">
      <div class="guide-section-heading"><p class="eyebrow">A solve in four steps</p><h2>Build the same route, bit by bit.</h2><p>These diagrams follow one example. The endpoints, fixed piece and clues stay the same.</p></div>
      <ol class="guide-stages">
        <li><div class="guide-step-title"><span>1</span><h3>Inspect the endpoints and clues</h3></div>${board('step-one', { stage: 1 })}<p>The start faces right. The destination faces left. The given horizontal track must remain part of the final route.</p></li>
        <li><div class="guide-step-title"><span>2</span><h3>Work out where track can go</h3></div>${board('step-two', { stage: 2, highlight: 'row' })}<p>Mark the zero rows and columns with Xs. The fourth row needs four cells; after those exclusions, all four remaining cells must contain track.</p></li>
        <li><div class="guide-step-title"><span>3</span><h3>Place straights and corners</h3></div>${board('step-three', { stage: 3, markZeros: true })}<p>Extend right from the start, turn down, then work left along the third row. Leave the unfinished ends ready for the next pieces.</p></li>
        <li><div class="guide-step-title"><span>4</span><h3>Connect and count again</h3></div>${board('step-four', { markZeros: true })}<p>Turn up from the fixed piece to join the route, then add the last horizontal before the destination. Every clue now matches.</p></li>
      </ol>
    </section>

    <section id="controls" class="guide-section">
      <div class="guide-section-heading"><p class="eyebrow">At your fingertips</p><h2>Choose a tool. Tap a cell.</h2><p>The palette selects what you place. The tools below it help you edit and explore.</p></div>
      <div class="guide-controls-layout">
        <figure class="guide-real-controls">${artwork('guide-controls.webp', 720, 420, 'Actual game controls with Corner SW selected: Possible track, six track pieces, Track, Mark empty, Erase, Undo, Redo, Reset and Hint.')}<figcaption>Actual Android controls. Corner SW is selected.</figcaption></figure>
        <dl class="guide-actions">
          <div><dt>Select and place</dt><dd>Tap one of the six shapes, then tap a cell. Selecting a shape activates Track. A different shape replaces your existing piece in that cell.</dd></div>
          <div><dt>Rotate a corner</dt><dd>With the matching corner selected, tap that same placed corner again to rotate it 90° clockwise. Straights keep their orientation; choose Horizontal or Vertical to change it.</dd></div>
          <div><dt>Possible track</dt><dd>The first palette option adds a temporary marker to an undecided cell. Tap again with that option to remove it. It does not add to the clues.</dd></div>
        </dl>
      </div>
      <figure class="guide-rotation"><div>${pieceDiagram(2, 'rotate-ne')}<span>90° clockwise</span>${pieceDiagram(3, 'rotate-se')}</div><figcaption>Corner NE becomes Corner SE.</figcaption></figure>
      <dl class="guide-tool-list">
        <div><dt>Mark empty <span aria-hidden="true">×</span></dt><dd>Select Mark empty, then tap an unoccupied cell to add an X. A real track piece can replace the mark later.</dd></div>
        <div><dt>Erase</dt><dd>Select Erase, then tap your piece, X or possible-track marker to remove it. Terminals and fixed pieces stay locked.</dd></div>
        <div><dt>Undo</dt><dd>Go back one edit, including changes to your possible-track markers.</dd></div>
        <div><dt>Redo</dt><dd>Restore an undone edit. Making a new edit starts a new path forward and clears the redo history.</dd></div>
        <div><dt>Reset</dt><dd>Confirm Restart to clear this puzzle’s moves, markers and timer. The original endpoints and fixed pieces return; other saved puzzles are unaffected.</dd></div>
        <div><dt>Hint</dt><dd>Tap Hint to highlight a cell and reveal a piece to use, a cell to mark empty, or track to erase. Make the suggested edit yourself. The control shows your remaining allowance when limited.</dd></div>
      </dl>
    </section>

    <section id="route-rules" class="guide-section">
      <div class="guide-section-heading"><p class="eyebrow">Check the whole route</p><h2>Every piece belongs to one line.</h2></div>
      <ol class="guide-rule-list"><li>Connect the square start to the circular destination.</li><li>Keep the route continuous, with every connection aligned.</li><li>Keep a single route without branches.</li><li>Keep the route from crossing itself.</li><li>Keep the route open between terminals, without loops.</li><li>Satisfy every row and column clue.</li></ol>
      <div class="guide-pair">
        <figure class="guide-example">${board('valid-example')}<figcaption><h3 class="guide-valid">Valid · one connected route</h3><p>All nine occupied cells belong to the same line. Each terminal has one connection, and every clue matches.</p></figcaption></figure>
        <figure class="guide-example">${board('invalid-example', { invalid: true })}<figcaption><h3 class="guide-invalid">Invalid · a corner faces away</h3><p>The outlined corner has been rotated to SE. It no longer joins the piece above or to its left. Matching the counts alone cannot complete this puzzle.</p></figcaption></figure>
      </div>
      <p class="guide-note">Open ends are expected while you build. For completion, all pieces must join the route, no connection may point off the board, and the terminals must connect through their tails. The palette has no branch or crossing pieces.</p>
    </section>

    <section class="guide-section" aria-labelledby="tips-title">
      <div class="guide-section-heading"><p class="eyebrow">When you need a foothold</p><h2 id="tips-title">Look for the next certain cell.</h2></div>
      <ul class="guide-tips">
        <li><strong>0 means empty.</strong><span>Start by marking zero rows and columns.</span></li>
        <li><strong>Count what is given.</strong><span>Endpoints and fixed pieces are already in the totals.</span></li>
        <li><strong>Find tight clues.</strong><span>A clue with few available cells limits the choices.</span></li>
        <li><strong>Follow the connections.</strong><span>A neighbour’s open end narrows the possible shapes.</span></li>
        <li><strong>Recount as you go.</strong><span>Check both the row and column after placing a piece.</span></li>
        <li><strong>Keep your progress.</strong><span>Use Undo to test a possibility, and Hint when you are stuck.</span></li>
      </ul>
    </section>

    <section id="difficulty" class="guide-section">
      <div class="guide-section-heading"><p class="eyebrow">Room to think</p><h2>Four sizes. The same rules.</h2><p>Begin with Easy, then try a larger board. These grids share one scale, so you can see how the solving space grows.</p></div>
      <div class="guide-difficulties">${[[6, 'Easy'], [9, 'Medium'], [11, 'Hard'], [13, 'Expert']].map(([size, name]) => difficultyGrid(size, name)).join('')}</div>
      <p class="guide-note"><strong>Why does Expert take more thought?</strong> Its 13 × 13 board has 169 cells, compared with Easy’s 36. A larger board gives you more possible routes to consider. Compare several row and column clues together, keep useful marks, and check connections as you go. The route rules stay the same.</p>
      <p class="guide-size-context">The 6 × 6 board in this guide is a teaching example. The homepage’s 4 × 4 image is an earlier gameplay preview. The current difficulty sizes are shown above.</p>
    </section>

    <section class="guide-finish guide-section">
      <figure class="guide-paper">${board('complete-board')}<figcaption>Completed · all row and column clues satisfied.</figcaption></figure>
      <div><p class="eyebrow">Puzzle complete</p><h2>Both ends connected.<br>Every clue satisfied.</h2><p>The game completes the puzzle when the entire route is valid and all counts match. You can leave unused cells blank.</p><p>Ready to try? Start with an Easy puzzle and find your first connection.</p>${download ? `<div class="guide-download">${download}</div>` : ''}<a class="text-link" href="${url('support/')}">Get help with the game</a></div>
    </section>
  </article>`;
}
