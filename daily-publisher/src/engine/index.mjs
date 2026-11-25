/**
 * Let's Fix Tracks — Platform-Independent Puzzle Engine (Phase 2: Route Editor)
 * Zero dependencies on React, DOM, or browser storage APIs.
 */

export const SCHEMA_VERSION = "1.0.0";
export const PLAYER_PUZZLE_FORMAT = "lets-fix-tracks.player-puzzle";
export const EDITABLE_PROJECT_FORMAT = "lets-fix-tracks.editable-project";

/**
 * Explicit Kotlin game-core wire compatibility status (Phase 2 Section 1).
 * Remains UNRESOLVED_PENDING_KOTLIN_SOURCE until actual Kotlin data classes / JSON fixtures
 * from the Android/Steam repository are inspected.
 */
export const KOTLIN_COMPATIBILITY_STATUS = "UNRESOLVED_PENDING_KOTLIN_SOURCE";

export const REQUIRED_KOTLIN_FILES = Object.freeze([
  "TrackPiece.kt / CellState.kt (exact enum names for the 6 track orientations, placeholder, and cross mark)",
  "Terminal.kt / Direction.kt (coordinate conventions row/col vs x/y and terminal tail/orientation representation)",
  "PuzzleLevel.kt / LevelJsonSerializer.kt (root JSON field names for clues, terminals, and fixed givens)",
  "Sample exported level JSON from Android/Steam assets (e.g. assets/levels/easy_01.json)"
]);

export const DIFFICULTY_GRID_SIZE = Object.freeze({
  easy: 6,
  medium: 9,
  hard: 11,
  expert: 13,
});

export const TRACK_PIECES = Object.freeze([
  "HORIZONTAL",
  "VERTICAL",
  "TOP_LEFT",
  "TOP_RIGHT",
  "BOTTOM_LEFT",
  "BOTTOM_RIGHT",
]);

export const CELL_ANNOTATIONS = Object.freeze([
  "CROSS_MARK",
  "PLACEHOLDER",
  "EMPTY",
]);

export const CARDINAL_SIDES = Object.freeze(["NORTH", "EAST", "SOUTH", "WEST"]);

export const SIDE_DELTA = Object.freeze({
  NORTH: { dRow: -1, dCol: 0, opposite: "SOUTH" },
  EAST:  { dRow: 0,  dCol: 1, opposite: "WEST" },
  SOUTH: { dRow: 1,  dCol: 0, opposite: "NORTH" },
  WEST:  { dRow: 0,  dCol: -1, opposite: "EAST" },
});

export const PIECE_CONNECTIONS = Object.freeze({
  HORIZONTAL:   Object.freeze(["WEST", "EAST"]),
  VERTICAL:     Object.freeze(["NORTH", "SOUTH"]),
  TOP_LEFT:     Object.freeze(["NORTH", "WEST"]),
  TOP_RIGHT:    Object.freeze(["NORTH", "EAST"]),
  BOTTOM_LEFT:  Object.freeze(["SOUTH", "WEST"]),
  BOTTOM_RIGHT: Object.freeze(["SOUTH", "EAST"]),
});

export function isValidDifficultyGrid(difficulty, gridSize) {
  if (!Object.prototype.hasOwnProperty.call(DIFFICULTY_GRID_SIZE, difficulty)) {
    return false;
  }
  return DIFFICULTY_GRID_SIZE[difficulty] === gridSize;
}

/**
 * Section 2 & 4.5 — Strict Distinction Between Track Pieces, Placeholder, Cross Mark, and Fixed Empty:
 * - Track Pieces: count toward clue occupancy AND satisfy route topology.
 * - Placeholder ('PLACEHOLDER'): counts toward clue occupancy feedback, NEVER satisfies route topology.
 * - Cross Mark ('CROSS_MARK'): player/editor empty-cell 'X' annotation. NEVER counts toward clue occupancy,
 *   NEVER satisfies route topology, and NEVER becomes a Fixed Empty constraint.
 * - Fixed Empty ('FIXED_EMPTY'): author constraint. NEVER counts toward clue occupancy or route topology.
 */
export function countsTowardClueOccupancy(cellKind) {
  if (cellKind === "CROSS_MARK" || cellKind === "FIXED_EMPTY" || cellKind === "EMPTY" || !cellKind) {
    return false;
  }
  return cellKind === "PLACEHOLDER" || TRACK_PIECES.includes(cellKind);
}

export function isValidRouteTopologyPiece(cellKind) {
  return TRACK_PIECES.includes(cellKind);
}

export function isCrossMarkAnnotation(cellKind) {
  return cellKind === "CROSS_MARK";
}

/**
 * Perimeter & Terminal Placement Rules (Phase 2 Section 3):
 * Returns all valid outward-facing perimeter sides for a cell at (row, col) on a gridSize x gridSize board.
 * Interior cells return an empty array `[]`.
 * Non-corner edge cells return 1 side (e.g. `["NORTH"]`).
 * Corner cells return 2 sides (e.g. `["NORTH", "WEST"]` for `(0,0)`).
 */
export function getValidPerimeterExternalSides(gridSize, row, col) {
  if (row < 0 || row >= gridSize || col < 0 || col >= gridSize) {
    return [];
  }
  const sides = [];
  if (row === 0) sides.push("NORTH");
  if (row === gridSize - 1) sides.push("SOUTH");
  if (col === 0) sides.push("WEST");
  if (col === gridSize - 1) sides.push("EAST");
  return sides;
}

export function isPerimeterCell(gridSize, row, col) {
  return getValidPerimeterExternalSides(gridSize, row, col).length > 0;
}

/**
 * Validate whether a terminal ('start' or 'destination') can be placed at (row, col)
 * given the other terminal's position.
 */
export function validateTerminalPlacement(gridSize, row, col, otherTerminal, preferredExternalSide = null) {
  const validSides = getValidPerimeterExternalSides(gridSize, row, col);
  if (validSides.length === 0) {
    return {
      valid: false,
      externalSide: null,
      validExternalSides: [],
      error: `Invalid terminal position (${row},${col}): terminals must occupy perimeter cells on the board edge.`,
    };
  }
  if (otherTerminal && otherTerminal.row === row && otherTerminal.col === col) {
    return {
      valid: false,
      externalSide: null,
      validExternalSides: validSides,
      error: `Terminal collision at (${row},${col}): Start and Destination terminals must occupy different perimeter cells.`,
    };
  }
  const externalSide =
    preferredExternalSide && validSides.includes(preferredExternalSide)
      ? preferredExternalSide
      : validSides[0];

  return {
    valid: true,
    externalSide,
    validExternalSides: validSides,
    error: null,
  };
}

export function getRelativeSide(fromCell, toCell) {
  if (!fromCell || !toCell) return null;
  const dRow = toCell.row - fromCell.row;
  const dCol = toCell.col - fromCell.col;
  if (dRow === -1 && dCol === 0) return "NORTH";
  if (dRow === 1 && dCol === 0) return "SOUTH";
  if (dRow === 0 && dCol === 1) return "EAST";
  if (dRow === 0 && dCol === -1) return "WEST";
  return null;
}

export function pieceFromSides(sideA, sideB) {
  const set = new Set([sideA, sideB]);
  if (set.size !== 2) return null;
  for (const piece of TRACK_PIECES) {
    const [s1, s2] = PIECE_CONNECTIONS[piece];
    if (set.has(s1) && set.has(s2)) {
      return piece;
    }
  }
  return null;
}

/**
 * Relocate the Start or Destination terminal without silently corrupting the existing route (Phase 2 Section 3).
 * - Validates perimeter placement and non-collision.
 * - Removes any Fixed-Empty or Cross-Mark on the new terminal cell.
 * - Adapts the route cleanly if the new terminal lands on or adjacent to the existing path;
 *   otherwise preserves the existing route segments so the editor can clearly display an
 *   Incomplete / Disconnected Route state for the author to repair.
 */
export function relocateTerminalInProject(project, whichTerminal, newRow, newCol, preferredExternalSide = null) {
  if (whichTerminal !== "start" && whichTerminal !== "destination") {
    throw new Error(`Unknown terminal type '${whichTerminal}'.`);
  }
  const gridSize = project.metadata.gridSize;
  const otherTerminal =
    whichTerminal === "start" ? project.terminals.destination : project.terminals.start;

  const check = validateTerminalPlacement(
    gridSize,
    newRow,
    newCol,
    otherTerminal,
    preferredExternalSide
  );
  if (!check.valid) {
    return {
      ok: false,
      error: check.error,
      project,
    };
  }

  const nextProject = JSON.parse(JSON.stringify(project));
  let chosenExternalSide = check.externalSide;
  const path = nextProject.solution.path || [];

  // Determine how the relocated terminal relates to the existing path
  if (whichTerminal === "start") {
    const existingIdx = path.findIndex((pt) => pt.row === newRow && pt.col === newCol);
    if (existingIdx !== -1) {
      // Trim any prefix before existingIdx so the route starts at the relocated Start terminal
      nextProject.solution.path = path.slice(existingIdx);
    } else if (path.length > 0 && getRelativeSide({ row: newRow, col: newCol }, path[0])) {
      // New start is orthogonally adjacent to the previous start -> prepend seamlessly
      nextProject.solution.path = [{ row: newRow, col: newCol }, ...path];
    } else if (path.length <= 1) {
      // Single-cell stub moves with the start terminal
      nextProject.solution.path = [{ row: newRow, col: newCol }];
    }
    // If corner cell has 2 valid external sides and one conflicts with the first interior step, pick the other
    if (
      nextProject.solution.path.length > 1 &&
      nextProject.solution.path[0].row === newRow &&
      nextProject.solution.path[0].col === newCol
    ) {
      const stepSide = getRelativeSide(nextProject.solution.path[0], nextProject.solution.path[1]);
      if (stepSide === chosenExternalSide && check.validExternalSides.length > 1) {
        chosenExternalSide = check.validExternalSides.find((s) => s !== stepSide) || chosenExternalSide;
      }
    }
    nextProject.terminals.start = {
      row: newRow,
      col: newCol,
      externalSide: chosenExternalSide,
    };
  } else {
    const existingIdx = path.findIndex((pt) => pt.row === newRow && pt.col === newCol);
    if (existingIdx > 0) {
      // Trim any tail after existingIdx so the route ends at the relocated Destination terminal
      nextProject.solution.path = path.slice(0, existingIdx + 1);
    } else if (
      path.length > 0 &&
      getRelativeSide(path[path.length - 1], { row: newRow, col: newCol })
    ) {
      // New destination is orthogonally adjacent to the current route head -> append seamlessly
      nextProject.solution.path = [...path, { row: newRow, col: newCol }];
    }
    const updatedPath = nextProject.solution.path;
    if (
      updatedPath.length > 1 &&
      updatedPath[updatedPath.length - 1].row === newRow &&
      updatedPath[updatedPath.length - 1].col === newCol
    ) {
      const entrySide = getRelativeSide(
        updatedPath[updatedPath.length - 1],
        updatedPath[updatedPath.length - 2]
      );
      if (entrySide === chosenExternalSide && check.validExternalSides.length > 1) {
        chosenExternalSide = check.validExternalSides.find((s) => s !== entrySide) || chosenExternalSide;
      }
    }
    nextProject.terminals.destination = {
      row: newRow,
      col: newCol,
      externalSide: chosenExternalSide,
    };
  }

  // Ensure the new terminal cell does not carry a contradictory Fixed-Empty constraint or Cross Mark
  nextProject.constraints.fixedEmpty = (nextProject.constraints.fixedEmpty || []).filter(
    (fe) => !(fe.row === newRow && fe.col === newCol)
  );
  if (nextProject.annotations && Array.isArray(nextProject.annotations.crossMarks)) {
    nextProject.annotations.crossMarks = nextProject.annotations.crossMarks.filter(
      (cm) => !(cm.row === newRow && cm.col === newCol)
    );
  }

  // Filter fixedTracks so only cells still on the path remain fixed tracks
  const pathKeySet = new Set(nextProject.solution.path.map((pt) => `${pt.row},${pt.col}`));
  nextProject.constraints.fixedTracks = (nextProject.constraints.fixedTracks || []).filter((ft) =>
    pathKeySet.has(`${ft.row},${ft.col}`)
  );

  return {
    ok: true,
    error: null,
    project: nextProject,
  };
}

/**
 * Automatically derive the track piece orientation for every cell along an ordered path,
 * plus derive terminal orientations from their connection to their adjacent route cell.
 */
export function deriveRoutePieces(path, startTerminal, destinationTerminal) {
  if (!Array.isArray(path) || path.length === 0) {
    return { pieces: [], errors: ["Route path is empty."], completeEndpointMatch: false };
  }
  const errors = [];
  const pieces = [];

  const startsAtStartTerminal =
    path[0].row === startTerminal?.row && path[0].col === startTerminal?.col;
  const endsAtDestTerminal =
    path.length >= 2 &&
    path[path.length - 1].row === destinationTerminal?.row &&
    path[path.length - 1].col === destinationTerminal?.col;

  if (!startsAtStartTerminal) {
    errors.push(
      `Route does not start at the Start terminal (${startTerminal?.row},${startTerminal?.col}); current route begins at (${path[0].row},${path[0].col}).`
    );
  }
  if (!endsAtDestTerminal) {
    errors.push(
      `Route is incomplete: head is at (${path[path.length - 1].row},${path[path.length - 1].col}) and has not reached the Destination terminal (${destinationTerminal?.row},${destinationTerminal?.col}).`
    );
  }

  // Check for duplicate cells (self-intersection / loop in path array)
  const seenKeys = new Set();
  for (let i = 0; i < path.length; i++) {
    const k = `${path[i].row},${path[i].col}`;
    if (seenKeys.has(k)) {
      errors.push(`Route crosses or loops back onto itself at (${path[i].row},${path[i].col}).`);
    }
    seenKeys.add(k);
  }

  for (let i = 0; i < path.length; i++) {
    const curr = path[i];
    let sideA = null;
    let sideB = null;

    const isAtStart = curr.row === startTerminal?.row && curr.col === startTerminal?.col;
    const isAtDest = curr.row === destinationTerminal?.row && curr.col === destinationTerminal?.col;

    if (i === 0) {
      sideA = isAtStart ? startTerminal?.externalSide || "NORTH" : null;
      if (path.length > 1) {
        sideB = getRelativeSide(curr, path[i + 1]);
        if (!sideB) {
          errors.push(
            `Non-adjacent step between (${curr.row},${curr.col}) and (${path[i + 1].row},${path[i + 1].col}).`
          );
        }
        if (!sideA && sideB) {
          sideA = SIDE_DELTA[sideB]?.opposite || "NORTH";
        }
      } else {
        sideB = sideA ? SIDE_DELTA[sideA]?.opposite || "SOUTH" : "SOUTH";
        if (!sideA) sideA = "NORTH";
      }
    } else if (i === path.length - 1) {
      sideA = getRelativeSide(curr, path[i - 1]);
      if (!sideA) {
        errors.push(`Non-adjacent final step at (${curr.row},${curr.col}).`);
      }
      if (isAtDest) {
        sideB = destinationTerminal?.externalSide || "SOUTH";
      } else {
        sideB = sideA ? SIDE_DELTA[sideA]?.opposite || null : null;
      }
    } else {
      sideA = getRelativeSide(curr, path[i - 1]);
      sideB = getRelativeSide(curr, path[i + 1]);
      if (!sideA || !sideB) {
        errors.push(`Invalid step adjacency at index ${i} (${curr.row},${curr.col}).`);
      }
    }

    const piece = pieceFromSides(sideA, sideB);
    if (!piece) {
      errors.push(
        `Cannot derive legal track orientation at (${curr.row},${curr.col}) from sides [${sideA}, ${sideB}].`
      );
    } else {
      pieces.push({ row: curr.row, col: curr.col, piece });
    }
  }

  return {
    pieces,
    errors,
    completeEndpointMatch: startsAtStartTerminal && endsAtDestTerminal,
  };
}

/**
 * Revise or splice a section of an existing route path between `fromIndex` and `toIndex`
 * with `replacementCells` (Phase 2 Section 4: Replace or revise route sections).
 * Automatically removes any Cross Marks covered by the new route cells.
 */
export function spliceRouteSection(path, fromIndex, toIndex, replacementCells = []) {
  if (!Array.isArray(path) || fromIndex < 0 || toIndex < fromIndex || toIndex >= path.length) {
    throw new Error("Invalid splice indices for route revision.");
  }
  const prefix = path.slice(0, fromIndex + 1);
  const suffix = path.slice(toIndex);
  const merged = [...prefix];

  for (const cell of replacementCells) {
    const last = merged[merged.length - 1];
    if (last && last.row === cell.row && last.col === cell.col) continue;
    merged.push({ row: cell.row, col: cell.col });
  }
  for (const cell of suffix) {
    const last = merged[merged.length - 1];
    if (last && last.row === cell.row && last.col === cell.col) continue;
    merged.push({ row: cell.row, col: cell.col });
  }
  return merged;
}

/**
 * Calculate automatic row and column clues from a list of occupied route cells.
 * Excludes external terminal tails and ignores Cross Marks.
 */
export function calculateClues(gridSize, occupiedCells) {
  const rows = new Array(gridSize).fill(0);
  const cols = new Array(gridSize).fill(0);
  const seen = new Set();

  for (const cell of occupiedCells) {
    if (cell.row < 0 || cell.row >= gridSize || cell.col < 0 || cell.col >= gridSize) {
      continue;
    }
    if (cell.kind && !countsTowardClueOccupancy(cell.kind)) {
      continue;
    }
    const key = `${cell.row},${cell.col}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows[cell.row] += 1;
    cols[cell.col] += 1;
  }

  return { rows, cols };
}

/**
 * Calculate player-board clue occupancy counts:
 * - Includes the 6 legal track pieces and PLACEHOLDER dashed-crosses.
 * - Strictly excludes CROSS_MARK ('X'), FIXED_EMPTY, and EMPTY cells.
 */
export function calculateBoardClueOccupancy(gridSize, boardCells) {
  const rows = new Array(gridSize).fill(0);
  const cols = new Array(gridSize).fill(0);
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const cellKind = boardCells[r]?.[c] || "EMPTY";
      if (countsTowardClueOccupancy(cellKind)) {
        rows[r] += 1;
        cols[c] += 1;
      }
    }
  }
  return { rows, cols };
}

const BLIND_EXIT_SIDES = Object.fromEntries(CARDINAL_SIDES.map((entry) =>
  [entry, CARDINAL_SIDES.filter((side) => side !== entry)]
));

const BLIND_EXIT_SIDES_BY_PIECE = Object.fromEntries(Object.entries(PIECE_CONNECTIONS).map(([piece, sides]) =>
  [piece, Object.fromEntries(CARDINAL_SIDES.map((entry) =>
    [entry, sides.includes(entry) ? sides.filter((side) => side !== entry) : []]
  ))]
));

/**
 * Validate route topology on an arbitrary grid of cell states.
 * Note: CROSS_MARK ('X') is a non-route empty-cell annotation and is ignored by route topology
 * (just like EMPTY), whereas PLACEHOLDER ('+') is flagged because it represents an unresolved occupied piece.
 */
export function validateBoardRouteTopology(gridSize, boardCells, startTerminal, destinationTerminal) {
  const errors = [];
  let totalOccupied = 0;
  let placeholderCount = 0;

  if (!isPerimeterCell(gridSize, startTerminal.row, startTerminal.col)) {
    errors.push(`Start terminal (${startTerminal.row},${startTerminal.col}) is not on the grid perimeter.`);
  }
  if (!isPerimeterCell(gridSize, destinationTerminal.row, destinationTerminal.col)) {
    errors.push(`Destination terminal (${destinationTerminal.row},${destinationTerminal.col}) is not on the grid perimeter.`);
  }
  if (
    startTerminal.row === destinationTerminal.row &&
    startTerminal.col === destinationTerminal.col
  ) {
    errors.push("Start and Destination terminals cannot occupy the same cell.");
  }

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const kind = boardCells[r]?.[c] || "EMPTY";
      if (kind === "PLACEHOLDER") {
        placeholderCount += 1;
      } else if (isValidRouteTopologyPiece(kind)) {
        totalOccupied += 1;
      }
    }
  }

  if (placeholderCount > 0) {
    errors.push(
      `Board contains ${placeholderCount} dashed-cross placeholder piece(s); placeholders count for clue occupancy but do not satisfy route topology.`
    );
  }

  const startPiece = boardCells[startTerminal.row]?.[startTerminal.col] || "EMPTY";
  const destPiece = boardCells[destinationTerminal.row]?.[destinationTerminal.col] || "EMPTY";

  if (!isValidRouteTopologyPiece(startPiece)) {
    errors.push("Start terminal does not contain a valid track piece.");
  }
  if (!isValidRouteTopologyPiece(destPiece)) {
    errors.push("Destination terminal does not contain a valid track piece.");
  }
  if (errors.length > 0) {
    return { valid: false, errors, totalOccupied };
  }

  if (!PIECE_CONNECTIONS[startPiece].includes(startTerminal.externalSide)) {
    errors.push(
      `Start terminal piece (${startPiece}) does not connect to its external side (${startTerminal.externalSide}).`
    );
  }
  if (!PIECE_CONNECTIONS[destPiece].includes(destinationTerminal.externalSide)) {
    errors.push(
      `Destination terminal piece (${destPiece}) does not connect to its external side (${destinationTerminal.externalSide}).`
    );
  }

  const adj = new Map();
  const keyOf = (r, c) => `${r},${c}`;

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const piece = boardCells[r][c];
      if (!isValidRouteTopologyPiece(piece)) continue;

      const isStart = r === startTerminal.row && c === startTerminal.col;
      const isDest = r === destinationTerminal.row && c === destinationTerminal.col;
      const neighbors = [];

      for (const side of PIECE_CONNECTIONS[piece]) {
        if (isStart && side === startTerminal.externalSide) continue;
        if (isDest && side === destinationTerminal.externalSide) continue;

        const { dRow, dCol, opposite } = SIDE_DELTA[side];
        const nr = r + dRow;
        const nc = c + dCol;

        if (nr < 0 || nr >= gridSize || nc < 0 || nc >= gridSize) {
          errors.push(`Track at (${r},${c}) points off the board toward ${side}.`);
          continue;
        }

        const neighborPiece = boardCells[nr][nc];
        if (!isValidRouteTopologyPiece(neighborPiece)) {
          errors.push(`Track at (${r},${c}) has an unreciprocated open connection toward (${nr},${nc}).`);
          continue;
        }

        if (!PIECE_CONNECTIONS[neighborPiece].includes(opposite)) {
          errors.push(
            `Track at (${r},${c}) points to (${nr},${nc}), which does not connect back from ${opposite}.`
          );
          continue;
        }

        neighbors.push(keyOf(nr, nc));
      }

      const expectedInteriorDegree = isStart || isDest ? 1 : 2;
      if (neighbors.length !== expectedInteriorDegree) {
        errors.push(
          `Cell (${r},${c}) has interior degree ${neighbors.length}, expected ${expectedInteriorDegree}.`
        );
      }
      adj.set(keyOf(r, c), neighbors);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, totalOccupied };
  }

  const startKey = keyOf(startTerminal.row, startTerminal.col);
  const destKey = keyOf(destinationTerminal.row, destinationTerminal.col);
  const visited = new Set([startKey]);
  let curr = startKey;

  while (curr !== destKey) {
    const nextCandidates = (adj.get(curr) || []).filter((n) => !visited.has(n));
    if (nextCandidates.length === 0) {
      errors.push("Route fails to reach the destination terminal.");
      break;
    }
    curr = nextCandidates[0];
    visited.add(curr);
  }

  if (visited.size !== totalOccupied) {
    errors.push(
      `Route contains disconnected segments or an isolated loop (${visited.size} connected cells vs. ${totalOccupied} occupied cells).`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    totalOccupied,
  };
}

export function validateConstraints(
  gridSize,
  derivedPieces,
  startTerminal,
  destinationTerminal,
  fixedTracks,
  fixedEmpty
) {
  const errors = [];
  const solutionMap = new Map();
  for (const item of derivedPieces) {
    solutionMap.set(`${item.row},${item.col}`, item.piece);
  }

  const fixedTrackSet = new Set();
  for (const ft of fixedTracks) {
    const key = `${ft.row},${ft.col}`;
    if (fixedTrackSet.has(key)) {
      errors.push(`Duplicate fixed-track constraint at (${ft.row},${ft.col}).`);
    }
    fixedTrackSet.add(key);

    const solPiece = solutionMap.get(key);
    if (!solPiece) {
      errors.push(
        `Fixed-track constraint at (${ft.row},${ft.col}) contradicts the solution (cell is empty in solution).`
      );
    } else if (ft.piece && ft.piece !== solPiece) {
      errors.push(
        `Fixed-track piece (${ft.piece}) at (${ft.row},${ft.col}) does not match solution orientation (${solPiece}).`
      );
    }
  }

  const fixedEmptySet = new Set();
  for (const fe of fixedEmpty) {
    const key = `${fe.row},${fe.col}`;
    if (fixedEmptySet.has(key)) {
      errors.push(`Duplicate fixed-empty constraint at (${fe.row},${fe.col}).`);
    }
    fixedEmptySet.add(key);

    if (fixedTrackSet.has(key)) {
      errors.push(`Cell (${fe.row},${fe.col}) cannot be both fixed-track and fixed-empty.`);
    }
    if (solutionMap.has(key)) {
      errors.push(
        `Fixed-empty constraint at (${fe.row},${fe.col}) contradicts the solution (cell contains a route segment).`
      );
    }
    if (
      (fe.row === startTerminal.row && fe.col === startTerminal.col) ||
      (fe.row === destinationTerminal.row && fe.col === destinationTerminal.col)
    ) {
      errors.push(`Terminal cell (${fe.row},${fe.col}) cannot be marked fixed-empty.`);
    }
  }

  return {
    consistent: errors.length === 0,
    errors,
  };
}

export function solvePlayerPuzzleIndependently(playerPuzzle, maxSolutions = 2, maxSearchNodes = 12000) {
  if (!playerPuzzle || typeof playerPuzzle !== "object") {
    throw new Error("Invalid player puzzle input.");
  }
  if (
    "solution" in playerPuzzle ||
    "hiddenSolution" in playerPuzzle ||
    "derivedPieces" in playerPuzzle ||
    "annotations" in playerPuzzle ||
    "crossMarks" in playerPuzzle
  ) {
    throw new Error(
      "SECURITY_VIOLATION: Hidden solution or editor annotation data must never be passed to the independent solver."
    );
  }

  const { gridSize, terminals, clues, givens } = playerPuzzle;
  const targetRows = clues.rows;
  const targetCols = clues.cols;
  const totalRequiredCells = targetRows.reduce((a, b) => a + b, 0);
  const totalColSum = targetCols.reduce((a, b) => a + b, 0);

  if (totalRequiredCells !== totalColSum || totalRequiredCells < 2) {
    return {
      solutionCount: 0,
      unique: false,
      status: "ZERO_SOLUTIONS",
      solutions: [],
      searchNodes: 0,
      branchDecisions: 0,
    };
  }

  const fixedEmptyMask = Array.from({ length: gridSize }, () => new Array(gridSize).fill(false));
  for (const fe of givens.fixedEmpty || []) {
    fixedEmptyMask[fe.row][fe.col] = true;
  }

  const fixedPieceMap = Array.from({ length: gridSize }, () => new Array(gridSize).fill(null));
  for (const ft of givens.fixedTracks || []) {
    fixedPieceMap[ft.row][ft.col] = ft.piece;
  }
  fixedPieceMap[terminals.start.row][terminals.start.col] = terminals.start.piece;
  fixedPieceMap[terminals.destination.row][terminals.destination.col] = terminals.destination.piece;

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (fixedPieceMap[r][c] && fixedEmptyMask[r][c]) {
        return {
          solutionCount: 0,
          unique: false,
          status: "ZERO_SOLUTIONS",
          solutions: [],
          searchNodes: 0,
          branchDecisions: 0,
        };
      }
    }
  }

  const remainingFixedInRow = new Array(gridSize).fill(0);
  const remainingFixedInCol = new Array(gridSize).fill(0);
  let totalFixedCount = 0;

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (fixedPieceMap[r][c]) {
        remainingFixedInRow[r] += 1;
        remainingFixedInCol[c] += 1;
        totalFixedCount += 1;
      }
    }
  }

  const start = terminals.start;
  const dest = terminals.destination;

  const startSides = PIECE_CONNECTIONS[start.piece];
  if (!startSides || !startSides.includes(start.externalSide)) {
    return {
      solutionCount: 0,
      unique: false,
      status: "ZERO_SOLUTIONS",
      solutions: [],
      searchNodes: 0,
      branchDecisions: 0,
    };
  }
  const initialStepSide = startSides.find((s) => s !== start.externalSide);

  const destSides = PIECE_CONNECTIONS[dest.piece];
  if (!destSides || !destSides.includes(dest.externalSide)) {
    return {
      solutionCount: 0,
      unique: false,
      status: "ZERO_SOLUTIONS",
      solutions: [],
      searchNodes: 0,
      branchDecisions: 0,
    };
  }
  const requiredDestOpenSide = destSides.find((s) => s !== dest.externalSide);

  const visited = Array.from({ length: gridSize }, () => new Array(gridSize).fill(false));
  const rowUsed = new Array(gridSize).fill(0);
  const colUsed = new Array(gridSize).fill(0);

  if (targetRows[start.row] < 1 || targetCols[start.col] < 1) {
    return {
      solutionCount: 0,
      unique: false,
      status: "ZERO_SOLUTIONS",
      solutions: [],
      searchNodes: 0,
      branchDecisions: 0,
    };
  }

  visited[start.row][start.col] = true;
  rowUsed[start.row] += 1;
  colUsed[start.col] += 1;
  remainingFixedInRow[start.row] -= 1;
  remainingFixedInCol[start.col] -= 1;

  const cells = Array.from({ length: gridSize }, (_, row) =>
    Array.from({ length: gridSize }, (_, col) => ({ row, col }))
  );
  const currentPath = [cells[start.row][start.col]];
  const foundSolutions = [];
  let searchNodes = 0;
  let branchDecisions = 0;

  let budgetExceeded = false;
  function backtrack(r, c, outgoingSide, visitedFixedCount) {
    if (foundSolutions.length >= maxSolutions || budgetExceeded) return;
    searchNodes += 1;
    if (searchNodes > maxSearchNodes) { budgetExceeded = true; return; }

    const { dRow, dCol, opposite: entrySideIntoNext } = SIDE_DELTA[outgoingSide];
    const nr = r + dRow;
    const nc = c + dCol;

    if (nr < 0 || nr >= gridSize || nc < 0 || nc >= gridSize) return;
    if (visited[nr][nc] || fixedEmptyMask[nr][nc]) return;

    if (rowUsed[nr] + 1 > targetRows[nr]) return;
    if (colUsed[nc] + 1 > targetCols[nc]) return;

    const isDest = nr === dest.row && nc === dest.col;
    const fixedPieceAtNext = fixedPieceMap[nr][nc];
    const nextIsFixed = fixedPieceAtNext !== null;

    const remRowFixedAfter = remainingFixedInRow[nr] - (nextIsFixed ? 1 : 0);
    const remColFixedAfter = remainingFixedInCol[nc] - (nextIsFixed ? 1 : 0);
    if (rowUsed[nr] + 1 + remRowFixedAfter > targetRows[nr]) return;
    if (colUsed[nc] + 1 + remColFixedAfter > targetCols[nc]) return;

    const stepsSoFar = currentPath.length + 1;
    const newVisitedFixed = visitedFixedCount + (nextIsFixed ? 1 : 0);
    const unvisitedFixedRemaining = totalFixedCount - newVisitedFixed;
    if (totalRequiredCells - stepsSoFar < unvisitedFixedRemaining) return;

    const manhattanToDest = Math.abs(dest.row - nr) + Math.abs(dest.col - nc);
    if (manhattanToDest > totalRequiredCells - stepsSoFar) return;

    if (isDest) {
      if (stepsSoFar !== totalRequiredCells) return;
      if (entrySideIntoNext !== requiredDestOpenSide) return;
      if (newVisitedFixed !== totalFixedCount) return;

      rowUsed[nr] += 1;
      colUsed[nc] += 1;
      let allCluesMatch = true;
      for (let i = 0; i < gridSize; i++) {
        if (rowUsed[i] !== targetRows[i] || colUsed[i] !== targetCols[i]) {
          allCluesMatch = false;
          break;
        }
      }
      rowUsed[nr] -= 1;
      colUsed[nc] -= 1;

      if (allCluesMatch) {
        const solution = currentPath.map(({ row, col }) => ({ row, col }));
        solution.push({ row: nr, col: nc });
        foundSolutions.push(solution);
      }
      return;
    }

    const candidateExitSides = fixedPieceAtNext
      ? BLIND_EXIT_SIDES_BY_PIECE[fixedPieceAtNext][entrySideIntoNext]
      : BLIND_EXIT_SIDES[entrySideIntoNext];
    if (candidateExitSides.length === 0) return;

    visited[nr][nc] = true;
    rowUsed[nr] += 1;
    colUsed[nc] += 1;
    if (nextIsFixed) {
      remainingFixedInRow[nr] -= 1;
      remainingFixedInCol[nc] -= 1;
    }
    currentPath.push(cells[nr][nc]);

    if (candidateExitSides.length > 1) {
      branchDecisions += 1;
    }

    for (const nextExitSide of candidateExitSides) {
      backtrack(nr, nc, nextExitSide, newVisitedFixed);
      if (foundSolutions.length >= maxSolutions) break;
    }

    currentPath.pop();
    if (nextIsFixed) {
      remainingFixedInRow[nr] += 1;
      remainingFixedInCol[nc] += 1;
    }
    rowUsed[nr] -= 1;
    colUsed[nc] -= 1;
    visited[nr][nc] = false;
  }

  backtrack(start.row, start.col, initialStepSide, 1);

  const count = foundSolutions.length;
  const status = budgetExceeded
    ? "SEARCH_BUDGET_EXCEEDED"
    : count === 0
    ? "ZERO_SOLUTIONS"
    : count === 1
    ? "UNIQUE_SOLUTION"
    : "MULTIPLE_SOLUTIONS";

  const totalCells = gridSize * gridSize;
  const fixedGivenCount =
    (givens.fixedTracks?.length || 0) + (givens.fixedEmpty?.length || 0);
  const unknownCount = Math.max(0, totalCells - 2 - fixedGivenCount);
  const unknownRatio = unknownCount / totalCells;
  const rawScore = Math.min(
    100,
    Math.round(
      gridSize * 3.2 +
        unknownRatio * 35 +
        Math.log2(Math.max(1, branchDecisions + 1)) * 6.5
    )
  );
  const preliminaryDifficultyBand =
    rawScore < 38
      ? "Easy (Preliminary Estimate)"
      : rawScore < 58
      ? "Medium (Preliminary Estimate)"
      : rawScore < 76
      ? "Hard (Preliminary Estimate)"
      : "Expert (Preliminary Estimate)";

  return {
    solutionCount: count,
    unique: !budgetExceeded && count === 1,
    budgetExceeded,
    status,
    solutions: foundSolutions,
    searchNodes,
    branchDecisions,
    preliminaryDifficultyScore: rawScore,
    preliminaryDifficultyBand,
  };
}

/**
 * Export a clean, versioned Player-Facing Puzzle JSON object (v1.0.0).
 * Strictly excludes hidden solution paths, non-fixed orientations, authorNotes, and Cross Marks!
 */
export function exportPlayerPuzzleV1(project) {
  const { metadata, terminals, solution, clues, constraints } = project;
  if (!isValidDifficultyGrid(metadata.difficulty, metadata.gridSize)) {
    throw new Error(
      `Unsupported difficulty/gridSize combination: ${metadata.difficulty} (${metadata.gridSize}x${metadata.gridSize}).`
    );
  }

  const pieceMap = new Map();
  for (const item of solution.derivedPieces || []) {
    pieceMap.set(`${item.row},${item.col}`, item.piece);
  }

  const startKey = `${terminals.start.row},${terminals.start.col}`;
  const destKey = `${terminals.destination.row},${terminals.destination.col}`;
  const startPiece = terminals.start.piece || pieceMap.get(startKey);
  const destPiece = terminals.destination.piece || pieceMap.get(destKey);

  if (!startPiece || !destPiece) {
    throw new Error("Cannot export player puzzle: start or destination terminal orientation is missing.");
  }

  const fixedTracks = (constraints.fixedTracks || [])
    .filter((ft) => {
      const k = `${ft.row},${ft.col}`;
      return k !== startKey && k !== destKey;
    })
    .map((ft) => {
      const piece = ft.piece || pieceMap.get(`${ft.row},${ft.col}`);
      if (!piece) {
        throw new Error(`Fixed track at (${ft.row},${ft.col}) has no valid solution piece.`);
      }
      return { row: ft.row, col: ft.col, piece };
    });

  // Only author-defined fixedEmpty constraints are exported; Cross Marks in project.annotations.crossMarks are NEVER exported
  const fixedEmpty = (constraints.fixedEmpty || []).map((fe) => ({
    row: fe.row,
    col: fe.col,
  }));

  return {
    format: PLAYER_PUZZLE_FORMAT,
    schemaVersion: SCHEMA_VERSION,
    puzzleId: project.projectId.replace(/^proj_/, "lft_"),
    title: metadata.title,
    difficulty: metadata.difficulty,
    gridSize: metadata.gridSize,
    terminals: {
      start: {
        row: terminals.start.row,
        col: terminals.start.col,
        piece: startPiece,
        externalSide: terminals.start.externalSide,
      },
      destination: {
        row: terminals.destination.row,
        col: terminals.destination.col,
        piece: destPiece,
        externalSide: terminals.destination.externalSide,
      },
    },
    clues: {
      rows: [...clues.rows],
      cols: [...clues.cols],
    },
    givens: {
      fixedTracks,
      fixedEmpty,
    },
  };
}

export function validatePlayerPuzzleV1(payload) {
  const errors = [];
  if (!payload || typeof payload !== "object") {
    return { valid: false, errors: ["Payload must be a JSON object."] };
  }

  const forbiddenKeys = [
    "solution",
    "hiddenSolution",
    "derivedPieces",
    "path",
    "authorNotes",
    "validation",
    "history",
    "annotations",
    "crossMarks",
  ];
  for (const key of forbiddenKeys) {
    if (key in payload) {
      errors.push(`Forbidden authoring field '${key}' leaked into player-facing puzzle JSON.`);
    }
  }

  if (payload.format !== PLAYER_PUZZLE_FORMAT) {
    errors.push(`Unsupported format '${payload.format}'; expected '${PLAYER_PUZZLE_FORMAT}'.`);
  }
  if (payload.schemaVersion !== SCHEMA_VERSION) {
    errors.push(`Unsupported schemaVersion '${payload.schemaVersion}'; expected '${SCHEMA_VERSION}'.`);
  }
  if (!isValidDifficultyGrid(payload.difficulty, payload.gridSize)) {
    errors.push(`Invalid difficulty/gridSize combination: ${payload.difficulty} / ${payload.gridSize}.`);
  }
  if (!payload.terminals?.start || !payload.terminals?.destination) {
    errors.push("Missing start or destination terminal.");
  } else {
    if (!isPerimeterCell(payload.gridSize, payload.terminals.start.row, payload.terminals.start.col)) {
      errors.push("Start terminal is not on the grid perimeter.");
    }
    if (!isPerimeterCell(payload.gridSize, payload.terminals.destination.row, payload.terminals.destination.col)) {
      errors.push("Destination terminal is not on the grid perimeter.");
    }
  }
  if (!payload.clues || !Array.isArray(payload.clues.rows) || !Array.isArray(payload.clues.cols)) {
    errors.push("Missing row or column clues array.");
  } else if (
    payload.clues.rows.length !== payload.gridSize ||
    payload.clues.cols.length !== payload.gridSize
  ) {
    errors.push("Clue array lengths do not match gridSize.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
