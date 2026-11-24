// bridge-stills.mjs: test stills of every shot (the stills gate and critic
// frames). The composition id is HARDCODED: 'BridgeShort'. If you rename
// the composition, change COMP below too.
// Usage: node tools/bridge-stills.mjs [--scale 0.5] [--frames 12,40] [--out stills]
// Default frames = the middle of every shot (from qa/plan.json; run audit first).
import fs from 'node:fs';
import path from 'node:path';
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';

const COMP = 'BridgeShort';
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const scale = Number(arg('--scale', '0.5'));
const outDir = arg('--out', 'stills');
const plan = JSON.parse(fs.readFileSync('qa/plan.json', 'utf8'));
const cuts = [...plan.cuts, plan.frames];
const frames = arg('--frames', '') ? arg('--frames').split(',').map(Number) : plan.cuts.map((c, i) => Math.round((c + cuts[i + 1]) / 2));

fs.mkdirSync(outDir, {recursive: true});
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const composition = await selectComposition({serveUrl, id: COMP, chromiumOptions: {gl: 'angle'}});
for (const [i, frame] of frames.entries()) {
  const output = path.join(outDir, `shot_${String(i + 1).padStart(2, '0')}_f${frame}.png`);
  await renderStill({serveUrl, composition, frame, output, scale, chromiumOptions: {gl: 'angle'}});
  console.log(output);
}
