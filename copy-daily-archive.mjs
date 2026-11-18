import { copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const packageFiles = ['easy.json', 'expert.json', 'hard.json', 'manifest.json', 'medium.json'];

export function copyDailyArchive() {
  const archive = 'daily-puzzles';
  if (!existsSync(archive)) return;
  if (!lstatSync(archive).isDirectory()) throw new Error('Expected a real daily-puzzles/ directory.');
  const directories = (parent, pattern) => readdirSync(parent, { withFileTypes: true }).map((entry) => {
    if (!entry.isDirectory() || !pattern.test(entry.name)) {
      throw new Error('Unexpected daily archive entry: ' + join(parent, entry.name));
    }
    return entry.name;
  });
  for (const year of directories(archive, /^\d{4}$/)) {
    const yearPath = join(archive, year);
    for (const month of directories(yearPath, /^\d{2}$/)) {
      const monthPath = join(yearPath, month);
      for (const day of directories(monthPath, /^\d{2}$/)) {
        const source = join(monthPath, day);
        const entries = readdirSync(source, { withFileTypes: true });
        const names = entries.map((entry) => entry.name).sort();
        if (entries.some((entry) => !entry.isFile()) || names.join('|') !== packageFiles.join('|')) {
          throw new Error('Expected one complete five-file daily package at ' + source);
        }
        const target = join('dist', source);
        mkdirSync(target, { recursive: true });
        for (const file of packageFiles) copyFileSync(join(source, file), join(target, file));
      }
    }
  }
}
