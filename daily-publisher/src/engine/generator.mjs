// GENERATED from Workshop source by build-publisher-kit.mjs. Do not edit.
export function hashStringFNV1a(str) {
  const input = String(str ?? "lets-fix-tracks-default-seed");
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function computePlayerPuzzleCanonicalHash(playerPuzzle) {
  const { gridSize, terminals, clues, givens } = playerPuzzle;
  const sStr = `${terminals.start.row},${terminals.start.col}:${terminals.start.piece}:${terminals.start.externalSide}`;
  const dStr = `${terminals.destination.row},${terminals.destination.col}:${terminals.destination.piece}:${terminals.destination.externalSide}`;
  const orderedEndpoints = sStr < dStr ? `${sStr}|${dStr}` : `${dStr}|${sStr}`;

  const sortedTracks = [...(givens.fixedTracks || [])]
    .map((ft) => `${ft.row},${ft.col}:${ft.piece}`)
    .sort()
    .join(";");

  const sortedEmpty = [...(givens.fixedEmpty || [])]
    .map((fe) => `${fe.row},${fe.col}`)
    .sort()
    .join(";");

  const canonicalPayload = [
    `G:${gridSize}`,
    `T:${orderedEndpoints}`,
    `R:${clues.rows.join(",")}`,
    `C:${clues.cols.join(",")}`,
    `FT:${sortedTracks}`,
    `FE:${sortedEmpty}`,
  ].join("#");

  const h1 = hashStringFNV1a(canonicalPayload).toString(16).padStart(8, "0");
  const h2 = hashStringFNV1a(canonicalPayload + "|salt:lft-v1").toString(16).padStart(8, "0");
  return `lft_hash_${h1}${h2}`;
}
