// GENERATED from Workshop source by build-publisher-kit.mjs. Do not edit.
const GENERATOR_VERSION="validation-only";
export const DAILY_DIFFICULTIES = Object.freeze(["easy", "medium", "hard", "expert"]);

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function assertDate(date) {
  if (typeof date !== "string" || !DATE_PATTERN.test(date)) {
    throw new Error(`Invalid daily date '${date}'; expected YYYY-MM-DD.`);
  }
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new Error(`Invalid calendar date '${date}'.`);
  }
}

function assertDifficulty(difficulty) {
  if (!DAILY_DIFFICULTIES.includes(difficulty)) {
    throw new Error(`Unsupported daily difficulty '${difficulty}'.`);
  }
}

function assertVersion(generatorVersion) {
  if (typeof generatorVersion !== "string" || generatorVersion.length === 0) {
    throw new Error("generatorVersion must be a non-empty string.");
  }
}

export function dailyCacheKey({ date, difficulty, generatorVersion = GENERATOR_VERSION }) {
  assertDate(date);
  assertDifficulty(difficulty);
  assertVersion(generatorVersion);
  return `lft-daily-cache-v1|${date}|${difficulty}|${generatorVersion}`;
}
