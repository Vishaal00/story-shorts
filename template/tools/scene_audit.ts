// scene_audit.ts: plan-level gates, run in Node on the SAME engine code as
// the render (camera, acting, places). Writes:
//   qa/plan.json          cut + caption frames for validate.py
//   qa/intersections.txt  zero-intersection gate (actor vs solid, actor vs
//                         actor, camera inside a solid)
//   qa/props.txt          props in frame per shot (15-40)
//   qa/audit.txt          every gate line, PASS/FAIL
// Usage: npx tsx tools/scene_audit.ts      (exit 1 on any FAIL)
import fs from 'node:fs';
import * as THREE from 'three';
import {camAt, applyCam, BEAT_S, ROLL_RANGE} from '../src/engine/camera';
import {actorAt} from '../src/engine/acting';
import {captionGroups} from '../src/engine/captions';
import {shotStarts, shotRange, t, type Story, type Word} from '../src/engine/story';
import {Kit} from '../src/places/kit';
import {PLACES} from '../src/places';

const story: Story = JSON.parse(fs.readFileSync('story/story.json', 'utf8'));
const words: Word[] = JSON.parse(fs.readFileSync('voice/words.json', 'utf8'));
const fps = story.fps;
const N = Math.round(story.durationSec * fps);
const lines: string[] = [];
let fails = 0;
const gate = (ok: boolean, msg: string) => { lines.push(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) fails++; };

// places in node (no DOM: geometry only)
const kits: Record<string, Kit> = {};
for (const p of Object.values(PLACES)) { const g = new THREE.Group(); const k = new Kit(g, p); p.draw(k); g.updateMatrixWorld(true); kits[p.id] = k; }

const starts = shotStarts(story, words);
const cutFrames = starts.map((s) => Math.round(s * fps));
gate(story.durationSec <= 70, `length ${story.durationSec}s <= 70 s (1:10 max; < 60 s ideal${story.durationSec > 60 ? ' - OVER IDEAL' : ''})`);
gate(!!story.hook && words.length > 0 && words[0].s < 1.0 && starts[0] === 0, `hook in first 1-2 s: first word at ${words[0]?.s.toFixed(2)} s, hook "${story.hook}"`);
gate(!story.quote || typeof story.quote === 'object', 'at most ONE documented quote');

story.shots.forEach((s, i) => {
  const [a, b] = shotRange(story, words, i);
  const len = b - a, last = i === story.shots.length - 1;
  gate(last ? len >= 1.5 && len <= 3.05 : len >= 2.5 && len <= 3.05, `shot ${s.id} length ${len.toFixed(2)} s (cuts every 2.5-3 s)`);
  if (i > 0) gate(typeof s.at === 'object' && Math.abs(t(s.at, words) - a) < 1e-6, `shot ${s.id} cut on a word (frame ${cutFrames[i]})`);
  gate(!!PLACES[s.place], `shot ${s.id} place "${s.place}" exists`);
  for (const k of s.cam) if (k.roll) gate(Math.abs(k.roll) >= ROLL_RANGE[0] && Math.abs(k.roll) <= ROLL_RANGE[1], `shot ${s.id} roll ${k.roll} in 4-8 deg`);
});
// one consistent location per scene: consecutive shots on one place form a scene
const scenes = story.shots.reduce((acc: string[], s) => (acc[acc.length - 1] === s.place ? acc : [...acc, s.place]), []);
gate(new Set(scenes).size === scenes.length, `one place per scene, no return to a used place mid-film (${scenes.join(' > ')})`);

// per-frame geometry
const cam = new THREE.PerspectiveCamera(50, 9 / 16, 0.1, 200);
const frustum = new THREE.Frustum();
const inter: string[] = [];
const propsPerShot: Record<string, number[]> = {};
const faceFails: string[] = [];
let still = 0;
let prevPos: THREE.Vector3 | null = null, prevLook: THREE.Vector3 | null = null;
for (let f = 0; f < N; f++) {
  const cp = camAt(story, words, f);
  const shot = story.shots[cp.shot];
  applyCam(cam, cp); cam.updateProjectionMatrix();
  frustum.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
  const kit = kits[shot.place];
  if (prevPos && prevLook && cp.pos.distanceTo(prevPos) < 0.0005 && cp.look.distanceTo(prevLook) < 0.0005) still++;
  prevPos = cp.pos.clone(); prevLook = cp.look.clone();
  for (const sb of kit.solids) if (sb.box.containsPoint(cp.pos)) inter.push(`f${f} camera inside ${sb.name}`);
  const pos = shot.actors.map((a) => ({a, s: actorAt(story, words, cp.shot, a, f)}));
  for (const {a, s} of pos) {
    const foot = new THREE.Box3(new THREE.Vector3(s.x - 0.2, 0.05, s.z - 0.2), new THREE.Vector3(s.x + 0.2, 1.7, s.z + 0.2));
    for (const sb of kit.solids) if (sb.box.intersectsBox(foot)) inter.push(`f${f} ${a.id} intersects ${sb.name}`);
    // face: never cut by the frame, never in the bottom 30 %
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
    const pts = [[-0.3, 1.2], [0.3, 1.2], [-0.3, 1.85], [0.3, 1.85]].map(([dx, y]) =>
      new THREE.Vector3(s.x, y + s.y, s.z).addScaledVector(right, dx).project(cam));
    const xs = pts.map((p) => (p.x + 1) / 2), ys = pts.map((p) => (1 - p.y) / 2);
    const cut = Math.min(...xs) < 0 || Math.max(...xs) > 1 || Math.min(...ys) < 0;
    const low = Math.max(...ys) > 0.7;
    if ((cut || low) && f % 3 === 0) faceFails.push(`f${f} ${a.id} face ${cut ? 'cut by frame' : 'in bottom 30 %'} (y ${Math.max(...ys).toFixed(2)})`);
  }
  for (let i = 0; i < pos.length; i++) for (let j = i + 1; j < pos.length; j++)
    if (Math.hypot(pos[i].s.x - pos[j].s.x, pos[i].s.z - pos[j].s.z) < 0.45) inter.push(`f${f} ${pos[i].a.id} overlaps ${pos[j].a.id}`);
  if (f % 3 === 0) {
    let n = 0;
    for (const p of kit.props) {
      const c = new THREE.Box3().setFromObject(p).getCenter(new THREE.Vector3());
      if (frustum.containsPoint(c) && c.distanceTo(cam.position) < 60) n++;
    }
    (propsPerShot[shot.id] ??= []).push(n);
  }
}
fs.mkdirSync('qa', {recursive: true});
fs.writeFileSync('qa/intersections.txt', `intersections: ${inter.length}\n` + inter.slice(0, 200).join('\n') + '\n');
gate(inter.length === 0, `zero intersections (qa/intersections.txt: ${inter.length})`);
gate(faceFails.length === 0, `faces in frame and above the bottom 30 % (${faceFails.length} fails${faceFails.length ? ': ' + faceFails.slice(0, 3).join('; ') : ''})`);
const pl: string[] = [];
for (const [id, ns] of Object.entries(propsPerShot)) {
  const mn = Math.min(...ns), mx = Math.max(...ns);
  pl.push(`${id}: min ${mn} max ${mx}`);
  gate(mn >= 15 && mx <= 40, `shot ${id} props in frame ${mn}-${mx} (15-40)`);
}
fs.writeFileSync('qa/props.txt', pl.join('\n') + '\n');
const keys = story.shots.reduce((n, s) => n + s.cam.length, 0);
const movesPerMin = (keys / story.durationSec) * 60;
lines.push(`INFO  camera beats [MIRO-STUDY]: ${movesPerMin.toFixed(0)} moves/min (target ~56), framing every ${(story.durationSec / keys).toFixed(2)} s (target ~${BEAT_S}), still ${((100 * still) / N).toFixed(1)} % (target ~5 %)`);
const caps = captionGroups(words);
fs.writeFileSync('qa/plan.json', JSON.stringify({fps, frames: N, cuts: cutFrames, captions: caps.map((c) => ({f: Math.round(c.s * fps), off: Math.round(c.e * fps), text: c.text})), wordStarts: words.map((w) => Math.round(w.s * fps))}, null, 1));
fs.writeFileSync('qa/audit.txt', lines.join('\n') + `\n\n${fails ? 'FAIL' : 'PASS'} (${fails} fails)\n`);
console.log(lines.join('\n'));
console.log(fails ? `AUDIT FAIL (${fails})` : 'AUDIT PASS');
process.exit(fails ? 1 : 0);
