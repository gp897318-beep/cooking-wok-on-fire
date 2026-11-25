// Wok On Fire — the hand-in program (Node 22, standard library only).
// It gathers the game and its screenshots from beside this file, lays them
// out under /output (or MAKEFUN_OUTPUT_DIR outside the grader), and writes
// /output/dossier.json with the kit's vendored library, which is what the
// judge reads. Nothing here needs the network or any installed package.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The caps mirror the scorer's own limits (see the competition's gate rules):
// the dossier text is capped, screenshots are at most four and 256 KiB each,
// and game/ stays within its file and byte budgets.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
