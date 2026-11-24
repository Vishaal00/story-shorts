// camera.ts: one pure function of the frame. Pure so that QA (scene_audit)
// and the motion-blur previous-frame matrix use the same camera.
//  - Keys in story.json are anchored to words. Between keys the camera eases
//    over EASE_F = 23 f [R20], arriving ON the key time.
//  - The camera always drifts a little (nobody frozen, camera never locked).
//  - Rolls 4-8 deg, reached over >= 18 f (ROLL_MIN_F).
//  - KICKS: impacts at times in SECONDS (time-based, not frames), 7 f decay.
//  - Camera beats [MIRO-STUDY]: ~56 moves/min, a new framing every ~0.86 s,
//    camera still ~5 % of the time. Unconfirmed until our QA confirms it.
import * as THREE from 'three';
import {easeInOut, lerp} from './rng';
import {shotIndexAt, shotRange, t, type Story, type V3, type Word} from './story';
import {actorAt} from './acting';

export const EASE_F = 23; // [R20]
export const ROLL_MIN_F = 18; // rolls 4-8 deg over >= 18 f
export const ROLL_RANGE: [number, number] = [4, 8];
export const KICK_DECAY_S = 7 / 30;
export const BEAT_S = 0.86; // [MIRO-STUDY]
export const MOVES_PER_MIN = 56; // [MIRO-STUDY]
export const STILL_SHARE = 0.05; // [MIRO-STUDY]
export const DRIFT_M = 0.035; // [START]

export type CamPose = {pos: THREE.Vector3; look: THREE.Vector3; fov: number; roll: number; shot: number; focus: number};

const v = (a: V3) => new THREE.Vector3(...a);

export const camAt = (story: Story, words: Word[], f: number): CamPose => {
  const fps = story.fps;
  const sec = f / fps;
  const si = shotIndexAt(story, words, sec);
  const shot = story.shots[si];
  const [s0] = shotRange(story, words, si);
  const keys = shot.cam.map((k, i) => ({...k, ts: i === 0 ? s0 : t(k.at, words)}));
  let a = keys[0], b = keys[0], u = 0;
  for (let i = 0; i < keys.length - 1; i++) {
    if (sec >= keys[i].ts) { a = keys[i]; b = keys[i + 1]; }
  }
  if (sec >= keys[keys.length - 1].ts) { a = b = keys[keys.length - 1]; }
  if (a !== b) {
    const easeS = Math.min(EASE_F / fps, b.ts - a.ts);
    u = easeInOut((sec - (b.ts - easeS)) / easeS);
  }
  const pos = v(a.pos).lerp(v(b.pos), u);
  const look = v(a.look).lerp(v(b.look), u);
  const fov = lerp(a.fov ?? 50, b.fov ?? 50, u);
  // roll: eased over >= ROLL_MIN_F
  const rollEase = Math.max(ROLL_MIN_F, EASE_F) / fps;
  const ru = a === b ? 0 : easeInOut((sec - (b.ts - Math.min(rollEase, b.ts - a.ts))) / Math.min(rollEase, b.ts - a.ts));
  const roll = lerp(a.roll ?? 0, b.roll ?? 0, ru);
  // drift: always on, slow, deterministic
  pos.x += DRIFT_M * Math.sin(sec * 0.9 + si * 1.7);
  pos.y += DRIFT_M * 0.6 * Math.sin(sec * 1.3 + 0.4);
  look.x += DRIFT_M * 0.5 * Math.sin(sec * 0.7 + 2.1);
  // KICKS (seconds)
  for (const k of shot.kicks ?? []) {
    const dt = sec - k;
    if (dt >= 0 && dt < KICK_DECAY_S * 3) {
      const e = Math.exp(-dt / KICK_DECAY_S);
      pos.y += 0.05 * e * Math.sin(dt * 90);
      pos.x += 0.03 * e * Math.sin(dt * 70 + 1);
    }
  }
  // focus distance for DOF: the focus actor's head
  const fa = shot.actors.find((x) => x.id === (b.focus ?? a.focus)) ?? shot.actors[0];
  let focus = pos.distanceTo(look);
  if (fa) {
    const p = actorAt(story, words, si, fa, f);
    focus = pos.distanceTo(new THREE.Vector3(p.x, 1.4, p.z));
  }
  return {pos, look, fov, roll, shot: si, focus};
};

export const applyCam = (cam: THREE.PerspectiveCamera, p: CamPose) => {
  cam.position.copy(p.pos);
  cam.up.set(0, 1, 0);
  cam.lookAt(p.look);
  cam.rotateZ(THREE.MathUtils.degToRad(p.roll));
  if (cam.fov !== p.fov) { cam.fov = p.fov; cam.updateProjectionMatrix(); }
  cam.updateMatrixWorld(true);
};

// DOF for frame f: focus on the acting face, gentle blur [START].
export const dofAt = (story: Story, words: Word[], f: number) => {
  const p = camAt(story, words, f);
  return {focus: p.focus, range: Math.max(2.5, p.focus * 1.6), maxPx: 6};
};

// View-projection matrix of the camera at frame f (for motion blur).
export const vpAt = (story: Story, words: Word[], f: number, aspect: number) => {
  const c = new THREE.PerspectiveCamera(50, aspect, 0.1, 200);
  applyCam(c, camAt(story, words, f));
  c.updateProjectionMatrix();
  return new THREE.Matrix4().multiplyMatrices(c.projectionMatrix, c.matrixWorldInverse);
};
