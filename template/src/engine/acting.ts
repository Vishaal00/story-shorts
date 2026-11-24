// acting.ts: what a character does on frame f. Bodies HOLD a pose; faces do
// the acting on narration beats; limbs move only for the ONE clear story
// action of the shot. Holds breathe: breathing, weight shift, head drift,
// blinks every 0.5-2.3 s. Walk: bob 5 % of height, lean 1-7 deg, planted
// 0.8 m stride, step cadence 11 f (reference 9-12 f).
import {EXPR, EYE_LAG, MOUTH_LAG, talkMouth, type ExprName, type MouthName} from './face';
import {hash, rng, smooth} from './rng';
import {t, shotRange, type Actor, type Story, type Word} from './story';

export const STRIDE_M = 0.8;
export const STEP_F = 11; // reference 9-12 f
export const WALK_BOB = 0.05; // of character height, peak to peak
export const WALK_LEAN_DEG = 4; // inside 1-7
export const BLINK_S: [number, number] = [0.5, 2.3];
export const BLINK_F = 3;

export type ActorState = {
  x: number; z: number; y: number; lean: number; walkU: number | null; stepOdd: boolean;
  dir: [number, number]; brow: ExprName; eye: ExprName; mouth: MouthName; blink: boolean;
  breath: number; headDx: number; armU: number; stride: number;
};

export const actorAt = (story: Story, words: Word[], si: number, a: Actor, f: number): ActorState => {
  const fps = story.fps, sec = f / fps;
  const seed = hash(a.id + ':' + si);
  let x = a.x, z = a.z, walkU: number | null = null, stepOdd = false, lean = 0, y = 0;
  let dir: [number, number] = [a.facing ?? 1, 0];
  let stride = STRIDE_M;
  if (a.walk) {
    const ts = t(a.walk.at, words);
    const dx = a.walk.to[0] - a.x, dz = a.walk.to[1] - a.z;
    const dist = Math.hypot(dx, dz);
    const steps = Math.max(1, Math.ceil(dist / STRIDE_M));
    stride = dist / steps;
    const stepS = STEP_F / fps;
    const k = (sec - ts) / stepS;
    dir = [dx / (dist || 1), dz / (dist || 1)];
    if (k >= steps) { x = a.walk.to[0]; z = a.walk.to[1]; }
    else if (k > 0) {
      const i = Math.floor(k), u = k - i;
      const d = stride * (i + u); // constant speed inside a step = planted foot
      x = a.x + dir[0] * d; z = a.z + dir[1] * d;
      walkU = u; stepOdd = i % 2 === 1;
      y = (WALK_BOB * 1.75) * Math.abs(Math.sin(Math.PI * u)) - (WALK_BOB * 1.75) / 2;
      lean = WALK_LEAN_DEG;
    }
  }
  // breathing hold: weight shift + head drift (never frozen)
  const breath = Math.sin((2 * Math.PI * sec) / 3.2 + (seed % 7));
  x += 0.012 * Math.sin(sec * 0.55 + (seed % 5));
  const headDx = 3 * Math.sin(sec * 0.8 + (seed % 11));
  if (walkU === null) lean = 1 + 0.6 * Math.sin(sec * 0.5 + (seed % 3)); // 1-2 deg idle lean
  // blinks: deterministic gaps in 0.5-2.3 s
  const r = rng(seed);
  let tb = r() * BLINK_S[1], blink = false;
  while (tb < story.durationSec + 1) {
    if (sec >= tb && sec < tb + BLINK_F / fps) { blink = true; break; }
    tb += BLINK_S[0] + r() * (BLINK_S[1] - BLINK_S[0]);
  }
  // discrete face: brows lead, eyes +2 f, mouth +4 f
  const pick = (lagF: number): ExprName => {
    let e: ExprName = 'neutral';
    for (const b of a.beats) if (sec >= t(b.at, words) + lagF / fps) e = b.expr;
    return e;
  };
  const brow = pick(0), eye = pick(EYE_LAG), mExpr = pick(MOUTH_LAG);
  let mouth: MouthName = EXPR[mExpr].mouth;
  if (a.talks) {
    const [s0, s1] = shotRange(story, words, si);
    const w = words.find((w) => sec >= w.s && sec < w.e && w.s >= s0 - 0.01 && w.s < s1);
    if (w) mouth = talkMouth(w.w, Math.floor((f - Math.round(w.s * fps)) / 3));
  }
  const armU = a.action && a.action !== 'none' && a.actionAt !== undefined ? smooth((sec - t(a.actionAt, words)) / 0.5) : 0;
  return {x, z, y, lean, walkU, stepOdd, dir, brow, eye, mouth, blink, breath, headDx, armU, stride};
};
