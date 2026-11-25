// GENERATED from Workshop source by build-publisher-kit.mjs. Do not edit.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {readdir,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import {DAILY_DIFFICULTIES,dailyCacheKey} from '../src/engine/dailyCatalogue.mjs';
import {computePlayerPuzzleCanonicalHash} from '../src/engine/generator.mjs';
import {validatePlayerPuzzleV1} from '../src/engine/index.mjs';
const manifestName = "manifest.json";

const filenames = [manifestName, ...DAILY_DIFFICULTIES.map((difficulty) => difficulty + ".json")];

const playerSchema = readSchema("player-puzzle.schema.json");

const manifestSchema = readSchema("official-daily-manifest.schema.json");

const ajv = new Ajv2020({ allErrors: true });

const validatePlayerSchema = ajv.compile(playerSchema);

const validateManifestSchema = ajv.compile(manifestSchema);

function readSchema(filename) {
  return JSON.parse(readFileSync(new URL("../src/schemas/" + filename, import.meta.url), "utf8"));
}

function parseJson(bytes) {
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function officialPuzzleId(date, difficulty) {
  return "lft_daily_" + date + "_" + difficulty;
}

export function validateOfficialDailyPackage(files) {
  const errors = [];
  const fail = (message) => ({ ok: false, errors: [...errors, message] });
  function addSchemaErrors(file, validator) {
    errors.push(...validator.errors.map((error) =>
      file + (error.instancePath || "/") + ": " + error.message +
      (error.params.additionalProperty ? " (" + error.params.additionalProperty + ")" : "")));
  }

  for (const name of filenames) {
    if (!files.has(name)) errors.push("Missing file: " + name);
  }
  for (const name of files.keys()) {
    if (!filenames.includes(name)) errors.push("Unexpected file: " + name);
  }
  if (!files.has(manifestName)) return { ok: false, errors };

  let manifest;
  try {
    manifest = parseJson(files.get(manifestName));
  } catch {
    return fail("manifest.json is not valid UTF-8 JSON.");
  }
  if (!validateManifestSchema(manifest)) {
    addSchemaErrors(manifestName, validateManifestSchema);
    return { ok: false, errors };
  }
  try {
    dailyCacheKey({ date: manifest.date, difficulty: "easy" });
  } catch (error) {
    return fail(error.message);
  }

  const difficulties = new Set();
  const identities = new Set();
  for (const entry of manifest.puzzles) {
    if (difficulties.has(entry.difficulty)) errors.push("Duplicate difficulty: " + entry.difficulty);
    if (identities.has(entry.puzzleId)) errors.push("Duplicate puzzle ID: " + entry.puzzleId);
    difficulties.add(entry.difficulty);
    identities.add(entry.puzzleId);

    const path = entry.difficulty + ".json";
    if (entry.date !== manifest.date) errors.push(path + ": entry date differs from the manifest date.");
    if (entry.puzzleId !== officialPuzzleId(manifest.date, entry.difficulty)) {
      errors.push(path + ": official ID does not match the package date and difficulty.");
    }
    if (entry.path !== path) {
      errors.push(path + ": manifest path must be " + path + ".");
      continue;
    }
    if (!files.has(path)) continue;
    const bytes = files.get(path);
    if (sha256(bytes) !== entry.sha256) errors.push(path + ": SHA-256 checksum mismatch.");

    let puzzle;
    try {
      puzzle = parseJson(bytes);
    } catch {
      errors.push(path + ": invalid UTF-8 JSON.");
      continue;
    }
    if (!validatePlayerSchema(puzzle)) {
      addSchemaErrors(path, validatePlayerSchema);
      continue;
    }
    const boardCheck = validatePlayerPuzzleV1(puzzle);
    errors.push(...boardCheck.errors.map((error) => path + ": " + error));
    if (puzzle.difficulty !== entry.difficulty) errors.push(path + ": payload difficulty does not match the entry.");
    if (puzzle.puzzleId !== entry.puzzleId) errors.push(path + ": payload ID does not match the entry.");
    if (puzzle.format !== entry.playerFormat || puzzle.schemaVersion !== entry.playerSchemaVersion) {
      errors.push(path + ": payload player format or schema version does not match the entry.");
    }
    if (computePlayerPuzzleCanonicalHash(puzzle) !== entry.canonicalHash) {
      errors.push(path + ": canonical board hash mismatch.");
    }
  }
  for (const difficulty of DAILY_DIFFICULTIES) {
    if (!difficulties.has(difficulty)) errors.push("Missing difficulty: " + difficulty);
  }
  return { ok: errors.length === 0, errors };
}

export async function readOfficialDailyPackageDirectory(directory) {
  const files = new Map();
  const invalid = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (!entry.isFile()) {
      invalid.push("Expected a regular file: " + entry.name);
    } else if (filenames.includes(entry.name)) {
      files.set(entry.name, await readFile(join(directory, entry.name)));
    } else {
      invalid.push("Unexpected file: " + entry.name);
    }
  }
  const checked = validateOfficialDailyPackage(files);
  const errors = [...invalid, ...checked.errors];
  return { ok: errors.length === 0, errors, files };
}
