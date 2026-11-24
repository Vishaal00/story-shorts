// world.ts: the posing hook. ZERO useFrame anywhere in templates.
//   const world = stage(scene, story, words)      // build once
//   world.update(shotId, f, camera, scene)        // pose everything for frame f
// stage() calls Place.draw(kit) for every place once; update() shows the
// shot's place, sets the light rig (warm key + cool fill + rim + one visible
// practical), poses the camera and every card, drives dust and flicker, and
// feeds the post chain (DOF via dofAt, motion-blur matrices, grade row, grain).
import * as THREE from 'three';
import {Card, CAST} from './cast';
import {applyCam, camAt, dofAt, vpAt} from './camera';
import {actorAt} from './acting';
import {LIGHTS, LOOK} from './lights';
import {GRADES} from './grade';
import {NOINK, type InkPass} from './ink';
import type {Grade, Grain, LensBlur} from './effects';
import {rng} from './rng';
import {shotStarts, type Light, type Story, type Word} from './story';
import {Kit, type Place} from '../places/kit';

// One sky per Light: gradient + layered clouds. No empty skies.
export const cloudMaps: Record<Light, () => THREE.Texture> = {
  day: () => skyTex(['#5f8fc9', '#9cc0e6', '#dfe8ee'], '#ffffff', 0.85, 11),
  golden: () => skyTex(['#3d4f7a', '#d98a5a', '#f3c98a'], '#ffe2c0', 0.75, 23),
};

const skyTex = (stops: string[], cloud: string, alpha: number, seed: number) => {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const g = c.getContext('2d')!;
  const gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, stops[0]); gr.addColorStop(0.55, stops[1]); gr.addColorStop(1, stops[2]);
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 512);
  const r = rng(seed);
  for (let i = 0; i < 70; i++) {
    const x = r() * 1024, y = 120 + r() * 230, w = 60 + r() * 160;
    for (let j = 0; j < 5; j++) {
      g.fillStyle = cloud; g.globalAlpha = alpha * (0.35 + 0.4 * r());
      g.beginPath(); g.ellipse(x + j * w * 0.22, y - r() * 18, w * 0.3, w * 0.13, 0, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 0.18; g.fillStyle = '#7a8aa8';
    g.beginPath(); g.ellipse(x + w * 0.45, y + 10, w * 0.5, w * 0.06, 0, 0, Math.PI * 2); g.fill();
  }
  g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

export type Post = {ink?: InkPass; lens?: LensBlur; grade?: Grade; grain?: Grain};

export class World {
  kits = new Map<string, Kit>();
  cards = new Map<string, Card>();
  key = new THREE.DirectionalLight('#ffffff', 2);
  fill = new THREE.HemisphereLight('#8090b0', '#5a4030', 1);
  rim = new THREE.DirectionalLight('#9ab0d0', 0.8);
  pract = new THREE.PointLight('#ffb060', 0, 14, 2);
  sky: THREE.Mesh;
  sun: THREE.Mesh;
  dust: THREE.Points;
  post: Post = {};
  private skies = new Map<Light, THREE.Texture>();

  constructor(public scene: THREE.Scene, public story: Story, public words: Word[], public places: Record<string, Place>) {
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(150, 32, 16), new THREE.MeshBasicMaterial({side: THREE.BackSide, fog: false, color: new THREE.Color(0.5, 0.52, 0.56)}));
    this.sun = new THREE.Mesh(new THREE.CircleGeometry(4, 32), new THREE.MeshBasicMaterial({color: new THREE.Color(4, 3.7, 3.2), fog: false}));
    const n = 500, pos = new Float32Array(n * 3), r = rng(7);
    for (let i = 0; i < n * 3; i++) pos[i] = r() - 0.5;
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.dust = new THREE.Points(geo, new THREE.PointsMaterial({color: '#ffd9a0', size: 0.018, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending}));
  }

  stage() {
    const {scene} = this;
    for (const p of Object.values(this.places)) {
      const g = new THREE.Group(); g.name = 'place:' + p.id; g.visible = false;
      const k = new Kit(g, p); p.draw(k); this.kits.set(p.id, k); scene.add(g);
    }
    for (const s of this.story.shots) for (const a of s.actors) {
      if (this.cards.has(a.id)) continue;
      const def = CAST[a.id];
      if (!def) throw new Error(`actor ${a.id} has no CAST entry`);
      const c = new Card(def); c.group.visible = false; this.cards.set(a.id, c); scene.add(c.group);
    }
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(2048, 2048);
    this.key.shadow.bias = -0.0004; this.key.shadow.normalBias = 0.03;
    const sc = this.key.shadow.camera; sc.left = -14; sc.right = 14; sc.top = 14; sc.bottom = -14; sc.near = 0.5; sc.far = 80;
    this.pract.castShadow = true; this.pract.shadow.mapSize.set(1024, 1024); this.pract.shadow.bias = -0.002;
    scene.add(this.key, this.key.target, this.fill, this.rim, this.rim.target, this.pract);
    for (const o of [this.sky, this.sun, this.dust]) { o.layers.set(NOINK); scene.add(o); }
    return this;
  }

  attach(post: Post) { this.post = post; return this; }

  update(id: string, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const si = this.story.shots.findIndex((s) => s.id === id);
    const shot = this.story.shots[si];
    const place = this.places[shot.place];
    const rig = LIGHTS[shot.light];
    const sec = f / this.story.fps;
    for (const [pid, k] of this.kits) k.g.visible = pid === shot.place;
    place.update?.(this.kits.get(place.id)!, f, sec);

    // camera
    const cp = camAt(this.story, this.words, f);
    applyCam(cam, cp);
    cam.layers.enable(NOINK);

    // light rig: warm key + cool fill + rim + one visible practical
    const keyDir = new THREE.Vector3(...(place.key ?? rig.keyDir)).normalize();
    const lit = new THREE.Vector3(...rig.lit), shade = new THREE.Vector3(...rig.shade);
    const litMax = Math.max(lit.x, lit.y, lit.z);
    this.key.color.setRGB(lit.x / litMax, lit.y / litMax, lit.z / litMax);
    this.key.intensity = litMax * Math.PI * rig.keyGain; // lambert /pi: lit side = albedo * lit
    this.key.target.position.copy(cp.look).setY(0);
    this.key.position.copy(this.key.target.position).addScaledVector(keyDir, 25);
    this.fill.color.setRGB(shade.x, shade.y, shade.z).multiplyScalar(1 / Math.max(shade.x, shade.y, shade.z));
    this.fill.groundColor.set(shot.light === 'golden' ? '#6a4630' : '#7a6a58');
    this.fill.intensity = Math.max(shade.x, shade.y, shade.z) * Math.PI * rig.fillGain;
    this.rim.color.setRGB(...rig.rim);
    this.rim.intensity = 0.5 * Math.PI;
    this.rim.target.position.copy(this.key.target.position);
    this.rim.position.copy(this.key.target.position).add(new THREE.Vector3(-keyDir.x, 0.6, -keyDir.z).normalize().multiplyScalar(20));
    const pr = place.practical;
    const flick = pr.flicker ? 0.88 + 0.12 * Math.sin(sec * 23.0) * Math.sin(sec * 7.3 + 1.1) : 1;
    this.pract.position.set(...pr.pos);
    this.pract.color.set(pr.color);
    this.pract.intensity = pr.power * flick;
    this.pract.castShadow = !!pr.shadow;
    this.pract.visible = pr.power > 0;
    const fog = place.fog ?? rig.fog;
    scene.fog = new THREE.Fog(fog.color, fog.near, fog.far);
    scene.background = new THREE.Color(fog.color);

    // sky + sun (exterior), dust (where the place is dusty)
    this.sky.visible = place.kind === 'exterior';
    this.sun.visible = place.kind === 'exterior' && pr.label === 'sun';
    if (this.sky.visible) {
      if (!this.skies.has(shot.light)) this.skies.set(shot.light, cloudMaps[shot.light]());
      (this.sky.material as THREE.MeshBasicMaterial).map = this.skies.get(shot.light)!;
      (this.sky.material as THREE.MeshBasicMaterial).needsUpdate = true;
      this.sky.position.copy(cam.position);
      this.sun.position.set(...pr.pos).normalize().multiplyScalar(140).add(cam.position);
      this.sun.lookAt(cam.position);
    }
    this.dust.visible = !!place.dust;
    if (place.dust) {
      this.dust.position.set(...place.dust.center);
      this.dust.scale.set(...place.dust.size);
      this.dust.rotation.y = sec * 0.04;
      this.dust.position.y += 0.05 * Math.sin(sec * 0.6);
    }

    // cards: camera-facing billboards (Y axis only, feet stay planted)
    const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion).setY(0).normalize();
    const side = Math.sign(keyDir.clone().setY(0).dot(camRight)) || 1;
    for (const [aid, card] of this.cards) card.group.visible = shot.actors.some((a) => a.id === aid);
    for (const a of shot.actors) {
      const card = this.cards.get(a.id)!;
      const s = actorAt(this.story, this.words, si, a, f);
      card.group.position.set(s.x, s.y, s.z);
      const walking = s.walkU !== null;
      const screenDir = walking ? Math.sign(s.dir[0] * camRight.x + s.dir[1] * camRight.z) || 1 : a.facing ?? 1;
      const facing = (screenDir >= 0 ? 1 : -1) as 1 | -1;
      card.mesh.rotation.set(0, Math.atan2(cam.position.x - s.x, cam.position.z - s.z), THREE.MathUtils.degToRad(-facing * s.lean), 'YXZ');
      const view = walking ? 'threeq' : a.view ?? 'front';
      const q = (x: number, n: number) => Math.round(x * n) / n;
      const elev = THREE.MathUtils.radToDeg(Math.atan2(cam.position.y - 0.0, Math.hypot(cam.position.x - s.x, cam.position.z - s.z)));
      card.set({
        view, facing,
        face: {brow: s.brow, eye: s.eye, mouth: s.mouth, blink: s.blink, look: facing * 0.6, view},
        hand: a.hand ?? 'open', holds: a.holds,
        arm: a.holds ? 'hold' : a.action === 'raise' ? 'raise' : a.action === 'point' ? 'point' : 'down',
        armU: q(s.armU, 8), walkU: walking ? q(s.walkU!, 12) : null, stepOdd: s.stepOdd,
        strideM: s.stride, breath: q(s.breath, 4), headDx: Math.round(s.headDx),
      }, shot.light, elev);
      const u = card.mat.uniforms;
      const pd = Math.max(0.5, Math.hypot(pr.pos[0] - s.x, pr.pos[2] - s.z));
      const pa = pr.power > 0 ? (pr.power * flick * 0.09) / (pd * pd) : 0;
      const pc = new THREE.Color(pr.color);
      u.uSide.value = side; u.uLit.value.copy(lit); u.uShade.value.copy(shade);
      u.uRim.value.set(...rig.rim); u.uPract.value.set(pc.r * pa, pc.g * pa, pc.b * pa);
      u.uSat.value = rig.sat; u.uCap.value = LOOK.charCap; u.uFlip.value = 0; u.uKey.value = LOOK.cardKey;
    }

    // post chain
    const {ink, lens, grade, grain} = this.post;
    if (ink) ink.setFade(...(place.inkFade ?? [12, 45]));
    if (grade) grade.setRow(GRADES[shot.light]);
    if (grain) grain.setFrame(f);
    if (lens) {
      const d = dofAt(this.story, this.words, f);
      const aspect = cam.aspect;
      const vp = new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
      const cut = shotStarts(this.story, this.words).some((s0) => Math.round(s0 * this.story.fps) === f);
      const prev = f === 0 || cut ? vp : vpAt(this.story, this.words, f - 1, aspect);
      lens.set({focus: d.focus, range: d.range, maxPx: LOOK.dofMaxPx, near: cam.near, far: cam.far, shutter: LOOK.shutter, invVP: vp.clone().invert(), prevVP: prev});
    }
    return {shot: si, cam: cp};
  }
}

export const stage = (scene: THREE.Scene, story: Story, words: Word[], places: Record<string, Place>) =>
  new World(scene, story, words, places).stage();
