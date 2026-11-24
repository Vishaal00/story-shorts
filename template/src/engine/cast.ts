// cast.ts: the 2D cartoon card characters + CONTACT shadow rows.
// A character is a flat camera-facing billboard drawn in code on a canvas:
// bean head (h/w 0.94), eyes 0.26 head-widths apart, adults 3.5 head-heights
// tall, thin plum ink (#241726) with variable width, stick limbs, clothes with
// folds + pocket + stain, one iconic hook, hair as a cap (zigzag fringe +
// strand lines + two tufts), three hand shapes, held props drawn IN the fist.
// NOT a 3D model, NOT a real likeness, NOT a stickman, NOT a dot-eye figure.
import * as THREE from 'three';
import {faceFront, type FaceState, type HandName, type View} from './face';
import {makeCardMask, makeCardMaterial} from './shade';
import type {Light} from './story';
import {LOOK} from './lights';

export type Hook = 'crown' | 'hat' | 'hood' | 'scarf' | 'moustache' | 'beard' | 'apron';
export type CharDef = {
  name: string;
  heightM: number; // adults 1.75 (3.5 heads)
  heads: number; // 3.5 adults
  build: number; // 0.85 thin .. 1.2 wide
  skin: string;
  hair: string;
  tunic: string;
  trim: string;
  legs: string;
  shoes: string;
  hooks: Hook[]; // ONE iconic hook (a second only for a named real person)
  hookColor: string;
  freckles: boolean;
  stain: string;
};

// The cast of THIS video. Replace per story after the character sheet gate.
export const CAST: Record<string, CharDef> = {
  king: {
    name: 'King (named real person: crown + beard, never a real face)',
    heightM: 1.75, heads: 3.5, build: 1.1, skin: '#f0c7a0', hair: '#7a4a2a',
    tunic: '#7a2238', trim: '#e0b04a', legs: '#3a2f45', shoes: '#3b2418',
    hooks: ['crown', 'beard'], hookColor: '#e8b83c', freckles: false, stain: '#5b2a20',
  },
  scribe: {
    name: 'Scribe (ordinary figure)',
    heightM: 1.75, heads: 3.5, build: 0.92, skin: '#e9b98f', hair: '#c46a2c',
    tunic: '#5f7a52', trim: '#d9c79a', legs: '#6b5440', shoes: '#3b2418',
    hooks: ['hood'], hookColor: '#8a6a4a', freckles: true, stain: '#3d3a2a',
  },
};

// CONTACT shadow rows, one per Light. The image is REBUILT each run and its
// centre alpha is asserted > 0 (bug 1: fully transparent image). It is drawn
// after the floor with polygon offset (bug 2: floor drawn over it) and its
// depth size grows when the camera is low (bug 3: low camera squashes it).
export const CONTACT: Record<Light, {alpha: number; w: number; d: number; color: string}> = {
  day: {alpha: 0.62, w: 1.15, d: 0.55, color: '#1c1424'}, // [START]
  golden: {alpha: 0.7, w: 1.2, d: 0.6, color: '#1a1018'}, // [START]
};

export type Pose = {
  view: View;
  facing: 1 | -1;
  face: FaceState;
  hand: HandName;
  holds?: string;
  arm: 'down' | 'hold' | 'raise' | 'point';
  armU: number; // 0..1 progress of the one arm action
  walkU: number | null; // 0..1 within one step, null = standing
  strideM: number; // this walk's step length (<= 0.8 m), keeps the foot planted
  stepOdd: boolean;
  breath: number; // -1..1
  headDx: number; // px head drift
};

export const CW = 512, CH = 1024, FEET = 1000; // canvas px; 512 px = 1 m
const PXM = 512;

const strokeV = (ctx: CanvasRenderingContext2D, p: Path2D, lw: number, ink = LOOK.ink) => {
  // variable-width ink: a thin full stroke + a heavier offset stroke (lower-right)
  ctx.strokeStyle = ink; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.lineWidth = lw; ctx.stroke(p);
  ctx.save(); ctx.translate(lw * 0.3, lw * 0.35); ctx.lineWidth = lw * 0.75; ctx.stroke(p); ctx.restore();
};
const fillInk = (ctx: CanvasRenderingContext2D, p: Path2D, fill: string | CanvasGradient, lw: number) => {
  ctx.fillStyle = fill; ctx.fill(p); strokeV(ctx, p, lw);
};
const shadeGrad = (ctx: CanvasRenderingContext2D, y0: number, y1: number, base: string) => {
  const c = new THREE.Color(base);
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, '#' + c.clone().offsetHSL(0, 0, 0.06).getHexString());
  g.addColorStop(1, '#' + c.clone().offsetHSL(0, 0.02, -0.07).getHexString());
  return g;
};

const limb = (ctx: CanvasRenderingContext2D, x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, color: string, w: number, lw: number) => {
  ctx.lineCap = 'round';
  ctx.strokeStyle = LOOK.ink; ctx.lineWidth = w + lw * 2;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(cx, cy, x1, y1); ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(cx, cy, x1, y1); ctx.stroke();
};

const heldProp = (ctx: CanvasRenderingContext2D, kind: string, x: number, y: number, s: number, lw: number) => {
  const P = new Path2D();
  switch (kind) {
    case 'candle': {
      fillInk(ctx, (() => { const p = new Path2D(); p.ellipse(x, y + 0.2 * s, 0.32 * s, 0.07 * s, 0, 0, Math.PI * 2); return p; })(), '#9a7a4a', lw);
      P.rect(x - 0.09 * s, y - 0.9 * s, 0.18 * s, 1.05 * s); fillInk(ctx, P, '#efe3c4', lw);
      const fl = new Path2D(); fl.moveTo(x, y - 1.35 * s); fl.quadraticCurveTo(x + 0.14 * s, y - 1.0 * s, x, y - 0.92 * s); fl.quadraticCurveTo(x - 0.14 * s, y - 1.0 * s, x, y - 1.35 * s);
      ctx.fillStyle = '#ffd36b'; ctx.fill(fl); ctx.strokeStyle = '#e0702a'; ctx.lineWidth = lw * 0.6; ctx.stroke(fl);
      break;
    }
    case 'cup': P.moveTo(x - 0.28 * s, y - 0.45 * s); P.lineTo(x + 0.28 * s, y - 0.45 * s); P.lineTo(x + 0.2 * s, y + 0.25 * s); P.lineTo(x - 0.2 * s, y + 0.25 * s); P.closePath(); fillInk(ctx, P, '#8a5a32', lw); break;
    case 'scroll': P.roundRect(x - 0.8 * s, y - 0.16 * s, 1.6 * s, 0.32 * s, 0.14 * s); fillInk(ctx, P, '#eadbb4', lw);
      ctx.strokeStyle = '#b8955a'; ctx.lineWidth = lw * 0.5; ctx.beginPath(); ctx.moveTo(x - 0.55 * s, y); ctx.lineTo(x + 0.55 * s, y); ctx.stroke(); break;
    case 'quill': P.moveTo(x, y + 0.2 * s); P.quadraticCurveTo(x + 0.5 * s, y - 0.6 * s, x + 0.2 * s, y - 1.2 * s); P.quadraticCurveTo(x - 0.05 * s, y - 0.5 * s, x, y + 0.2 * s); fillInk(ctx, P, '#f3efe6', lw); break;
  }
};

const hand = (ctx: CanvasRenderingContext2D, shape: HandName, x: number, y: number, r: number, skin: string, lw: number, dir: number) => {
  const p = new Path2D();
  if (shape === 'open') {
    p.arc(x, y, r, 0, Math.PI * 2);
    for (let i = -1; i <= 1; i++) p.moveTo(x + i * r * 0.6 + r * 0.25, y + r * 0.9), p.arc(x + i * r * 0.6, y + r * 0.9, r * 0.25, 0, Math.PI * 2);
    fillInk(ctx, p, skin, lw);
  } else {
    p.arc(x, y, r, 0, Math.PI * 2); fillInk(ctx, p, skin, lw);
    ctx.strokeStyle = LOOK.ink; ctx.lineWidth = lw * 0.6;
    ctx.beginPath(); ctx.moveTo(x - r * 0.6, y - r * 0.1); ctx.lineTo(x + r * 0.5, y - r * 0.1); ctx.stroke();
    if (shape === 'point') {
      ctx.lineWidth = r * 0.55 + lw * 2; ctx.strokeStyle = LOOK.ink;
      ctx.beginPath(); ctx.moveTo(x + dir * r * 0.6, y - r * 0.3); ctx.lineTo(x + dir * r * 2.1, y - r * 0.5); ctx.stroke();
      ctx.lineWidth = r * 0.55; ctx.strokeStyle = skin; ctx.stroke();
    }
  }
};

// Draw one character state onto a 512x1024 canvas (feet at y = 1000).
export const drawCharacter = (ctx: CanvasRenderingContext2D, d: CharDef, p: Pose) => {
  ctx.clearRect(0, 0, CW, CH);
  const lw = 5; // thin ink at card scale
  const hpx = d.heightM * PXM;
  const hh = hpx / d.heads, hw = hh / 0.94;
  const top = FEET - hpx;
  const breathY = p.breath * 2.5;
  const cx = CW / 2;
  const headCx = cx + p.headDx, headCy = top + hh / 2 + breathY * 0.6;
  const neckY = top + hh * 0.97 + breathY * 0.5;
  const shY = neckY + 0.1 * hh;
  const hipY = FEET - hpx * 0.42;
  const hemY = hipY + 0.28 * hh;
  const side = p.view === 'side', tq = p.view === 'threeq';
  const bw = d.build * (side ? 0.62 : tq ? 0.85 : 1);
  const shW = hw * 0.36 * bw, hipW = hw * 0.4 * bw;
  const f = p.facing;

  // legs (stick limbs, planted stride while walking)
  const legX = side ? [0, 0] : [-0.13 * hw * bw, 0.13 * hw * bw];
  const stride = p.strideM * PXM; // planted step length
  let feet = legX.map((lx) => [cx + lx, FEET]);
  if (p.walkU !== null) {
    const u = p.walkU;
    const planted = stride / 2 - stride * u; // moves back at body speed = planted in world
    const swing = -stride / 2 + stride * u;
    const lift = Math.sin(Math.PI * u) * 0.12 * hh;
    const a = p.stepOdd ? [planted, swing] : [swing, planted];
    feet = a.map((dx, i) => [cx + dx * f * (p.view === 'front' ? 0.25 : p.view === 'threeq' ? 0.7 : 1), FEET - (a[i] === swing ? lift : 0)]);
  }
  feet.forEach(([fx, fy], i) => {
    limb(ctx, cx + legX[i] * 0.8, hipY, (cx + legX[i] + fx) / 2, (hipY + fy) / 2, fx, fy - 0.06 * hh, d.legs, 0.07 * hw, lw);
    const sh = new Path2D(); sh.ellipse(fx + f * 0.04 * hw, fy - 0.045 * hh, 0.09 * hw, 0.05 * hh, 0, 0, Math.PI * 2);
    fillInk(ctx, sh, d.shoes, lw);
  });

  // arms: back arm first
  const shoulder = (s: number) => [cx + s * shW * 0.95, shY + 0.03 * hh] as const;
  const handAt = (s: number): [number, number] => {
    const [sx, sy] = shoulder(s);
    const front = s === f || side;
    if (front && p.arm === 'hold') return [cx + f * 0.34 * hw, shY + 0.42 * hh];
    if (front && p.arm === 'raise') return [sx + f * 0.1 * hw, sy - (0.25 + 0.75 * p.armU) * hh];
    if (front && p.arm === 'point') return [sx + f * (0.25 + 0.55 * p.armU) * hw, sy + (0.45 - 0.4 * p.armU) * hh];
    const swing = p.walkU !== null ? Math.sin(Math.PI * 2 * (p.walkU / 2 + (p.stepOdd ? 0.5 : 0))) * 0.18 * hw * (s === f ? 1 : -1) : 0;
    return [sx + s * 0.06 * hw + swing, hipY + 0.12 * hh + p.breath];
  };
  const drawArm = (s: number) => {
    const [sx, sy] = shoulder(s);
    const [hx, hy] = handAt(s);
    limb(ctx, sx, sy, (sx + hx) / 2 + s * 0.08 * hw, (sy + hy) / 2, hx, hy, d.tunic, 0.085 * hw, lw);
    const front = s === f || side;
    const shape: HandName = front ? (p.arm === 'point' ? 'point' : p.holds ? 'grip' : p.hand) : 'open';
    if (front && p.holds) heldProp(ctx, p.holds, hx, hy, 0.3 * hh, lw * 0.8); // prop first, fist on top = visibly held
    hand(ctx, shape, hx, hy, 0.055 * hw, d.skin, lw * 0.8, f);
  };
  if (!side) drawArm(-f);

  // tunic with folds, belt, pocket, stain
  const t = new Path2D();
  t.moveTo(cx - shW, shY); t.lineTo(cx + shW, shY);
  t.quadraticCurveTo(cx + hipW * 1.15, (shY + hemY) / 2, cx + hipW * 1.1, hemY);
  t.quadraticCurveTo(cx, hemY + 0.06 * hh, cx - hipW * 1.1, hemY);
  t.quadraticCurveTo(cx - hipW * 1.15, (shY + hemY) / 2, cx - shW, shY); t.closePath();
  fillInk(ctx, t, shadeGrad(ctx, shY, hemY, d.tunic), lw);
  ctx.save(); ctx.clip(t);
  ctx.strokeStyle = d.trim; ctx.lineWidth = 0.05 * hh; ctx.beginPath(); ctx.moveTo(cx - hipW * 1.2, hemY - 0.02 * hh); ctx.quadraticCurveTo(cx, hemY + 0.04 * hh, cx + hipW * 1.2, hemY - 0.02 * hh); ctx.stroke();
  ctx.fillStyle = '#3a2418'; ctx.fillRect(cx - hipW * 1.2, hipY - 0.06 * hh, hipW * 2.4, 0.07 * hh);
  ctx.fillStyle = d.stain; ctx.globalAlpha = 0.35;
  ctx.beginPath(); ctx.ellipse(cx - f * 0.12 * hw, hipY + 0.12 * hh, 0.05 * hw, 0.035 * hh, 0.4, 0, Math.PI * 2); ctx.ellipse(cx - f * 0.09 * hw, hipY + 0.15 * hh, 0.025 * hw, 0.02 * hh, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1; ctx.restore();
  ctx.strokeStyle = LOOK.ink; ctx.lineWidth = lw * 0.6;
  for (const k of [-0.5, 0.1, 0.6]) { ctx.beginPath(); ctx.moveTo(cx + k * hipW, shY + 0.35 * hh); ctx.quadraticCurveTo(cx + k * hipW + 0.03 * hw, (shY + hemY) / 2 + 0.1 * hh, cx + k * hipW * 1.1, hemY - 0.04 * hh); ctx.stroke(); }
  const pk = new Path2D(); pk.roundRect(cx + f * 0.06 * hw, hipY + 0.03 * hh, 0.13 * hw, 0.12 * hh, 4); fillInk(ctx, pk, shadeGrad(ctx, hipY, hipY + 0.15 * hh, d.tunic), lw * 0.7);
  ctx.beginPath(); ctx.moveTo(cx + f * 0.06 * hw, hipY + 0.06 * hh); ctx.lineTo(cx + f * 0.06 * hw + 0.13 * hw, hipY + 0.06 * hh); ctx.stroke();
  if (d.hooks.includes('scarf') || d.hooks.includes('hood')) {
    const sc = new Path2D(); sc.ellipse(cx, shY + 0.02 * hh, shW * 1.05, 0.1 * hh, 0, 0, Math.PI * 2); fillInk(ctx, sc, d.hookColor, lw);
  }

  // head (bean) + ears
  const hx = headCx, hy = headCy, rw = hw / 2, rh = hh / 2;
  if (!side) for (const s of [-1, 1]) { const e = new Path2D(); e.ellipse(hx + s * rw * 0.98, hy + 0.05 * hh, 0.07 * hw, 0.1 * hh, 0, 0, Math.PI * 2); fillInk(ctx, e, d.skin, lw * 0.8); }
  const head = new Path2D();
  head.moveTo(hx, hy - rh);
  head.bezierCurveTo(hx + rw * 0.62, hy - rh, hx + rw, hy - rh * 0.45, hx + rw, hy + rh * 0.05);
  head.bezierCurveTo(hx + rw * 1.02, hy + rh * 0.7, hx + rw * 0.6, hy + rh, hx, hy + rh);
  head.bezierCurveTo(hx - rw * 0.6, hy + rh, hx - rw * 1.02, hy + rh * 0.7, hx - rw, hy + rh * 0.05);
  head.bezierCurveTo(hx - rw, hy - rh * 0.45, hx - rw * 0.62, hy - rh, hx, hy - rh);
  fillInk(ctx, head, shadeGrad(ctx, hy - rh, hy + rh, d.skin), lw);

  if (d.hooks.includes('beard')) { // chin beard: below the mouth, cheeks stay skin
    const b = new Path2D(); b.moveTo(hx - rw * 0.55, hy + rh * 0.62); b.quadraticCurveTo(hx - rw * 0.45, hy + rh * 1.32, hx, hy + rh * 1.38);
    b.quadraticCurveTo(hx + rw * 0.45, hy + rh * 1.32, hx + rw * 0.55, hy + rh * 0.62); b.quadraticCurveTo(hx, hy + rh * 0.9, hx - rw * 0.55, hy + rh * 0.62);
    fillInk(ctx, b, shadeGrad(ctx, hy + rh * 0.6, hy + rh * 1.4, d.hair), lw);
  }
  // face (discrete enums)
  faceFront(ctx, {cx: hx, cy: hy, hw, hh, ink: LOOK.ink, lw: lw * 0.8, freckles: d.freckles, facing: f}, p.face);
  if (d.hooks.includes('moustache')) { const m = new Path2D(); m.ellipse(hx - 0.07 * hw, hy + 0.24 * hh, 0.08 * hw, 0.03 * hh, 0.2, 0, Math.PI * 2); m.ellipse(hx + 0.07 * hw, hy + 0.24 * hh, 0.08 * hw, 0.03 * hh, -0.2, 0, Math.PI * 2); fillInk(ctx, m, d.hair, lw * 0.7); }

  // hair like a cap: volume + zigzag fringe + strand lines + two tufts
  const back = side ? -f * 0.08 * hw : tq ? -f * 0.04 * hw : 0;
  const hr = new Path2D();
  const fy = hy - 0.14 * hh, L = hx - rw * 1.07 + back, R = hx + rw * 1.07 + back;
  hr.moveTo(L, hy + 0.06 * hh);
  hr.bezierCurveTo(L - 0.02 * hw, hy - rh * 1.25, R + 0.02 * hw, hy - rh * 1.25, R, hy + 0.06 * hh);
  const teeth = 7;
  for (let i = teeth; i >= 0; i--) {
    const x = R - ((R - L) * (teeth - i)) / teeth;
    hr.lineTo(x, i % 2 ? fy + 0.07 * hh : fy - 0.015 * hh);
  }
  hr.closePath();
  fillInk(ctx, hr, shadeGrad(ctx, hy - rh * 1.2, fy, d.hair), lw);
  ctx.strokeStyle = LOOK.ink; ctx.lineWidth = lw * 0.55;
  for (const k of [-0.55, -0.2, 0.15, 0.5]) { ctx.beginPath(); ctx.moveTo(hx + back + k * rw * 0.5, hy - rh * 0.95); ctx.quadraticCurveTo(hx + back + k * rw * 1.1, hy - rh * 0.6, hx + back + k * rw * 1.3, fy - 0.01 * hh); ctx.stroke(); }
  for (const s of [-1, 1]) {
    const tf = new Path2D(); const bx = hx + back + s * 0.12 * hw, by = hy - rh * 0.96;
    tf.moveTo(bx - 0.05 * hw, by); tf.quadraticCurveTo(bx + s * 0.02 * hw, by - 0.22 * hh, bx + s * 0.12 * hw, by - 0.18 * hh); tf.quadraticCurveTo(bx + s * 0.02 * hw, by - 0.08 * hh, bx + 0.05 * hw, by + 0.01 * hh);
    fillInk(ctx, tf, d.hair, lw * 0.8);
  }
  if (d.hooks.includes('crown')) {
    const c = new Path2D(); const cy0 = hy - rh * 0.95, cwid = hw * 0.62;
    c.moveTo(hx - cwid / 2, cy0); c.lineTo(hx - cwid / 2, cy0 - 0.2 * hh); c.lineTo(hx - cwid / 4, cy0 - 0.1 * hh); c.lineTo(hx, cy0 - 0.26 * hh); c.lineTo(hx + cwid / 4, cy0 - 0.1 * hh); c.lineTo(hx + cwid / 2, cy0 - 0.2 * hh); c.lineTo(hx + cwid / 2, cy0); c.closePath();
    fillInk(ctx, c, d.hookColor, lw);
    for (const k of [-0.25, 0, 0.25]) { ctx.fillStyle = '#b8304a'; ctx.beginPath(); ctx.arc(hx + k * cwid, cy0 - 0.05 * hh, 0.018 * hw, 0, Math.PI * 2); ctx.fill(); }
  }
  if (d.hooks.includes('hat')) { const h = new Path2D(); h.ellipse(hx + back, hy - rh * 0.8, rw * 1.35, 0.07 * hh, 0, 0, Math.PI * 2); h.roundRect(hx + back - rw * 0.7, hy - rh * 1.45, rw * 1.4, 0.38 * hh, 10); fillInk(ctx, h, d.hookColor, lw); }

  if (!side) drawArm(f); else drawArm(f);
};

// ---- 3D card --------------------------------------------------------------
const contactTexture = (() => {
  let tex: THREE.CanvasTexture | null = null;
  return () => {
    if (tex) return tex;
    const c = document.createElement('canvas'); c.width = 256; c.height = 128;
    const g = c.getContext('2d')!;
    const r = g.createRadialGradient(128, 64, 0, 128, 64, 128);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.45, 'rgba(255,255,255,0.65)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.setTransform(1, 0, 0, 0.5, 0, 32); g.fillStyle = r; g.fillRect(0, 0, 256, 256);
    if (g.getImageData(128, 64, 1, 1).data[3] < 200) throw new Error('contact shadow image is transparent (bug 1)');
    tex = new THREE.CanvasTexture(c); return tex;
  };
})();

export class Card {
  group = new THREE.Group();
  mesh: THREE.Mesh;
  contact: THREE.Mesh;
  mat = makeCardMaterial();
  mask = makeCardMask();
  private cache = new Map<string, THREE.CanvasTexture>();
  private depthMat: THREE.MeshDepthMaterial;
  private distMat: THREE.MeshDistanceMaterial;
  constructor(public def: CharDef) {
    const geo = new THREE.PlaneGeometry(1, 2);
    geo.translate(0, 1 - ((CH - FEET) / CH) * 2, 0); // feet at y = 0
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.castShadow = true; // the character casts a real shadow (key + candle)
    this.depthMat = new THREE.MeshDepthMaterial({depthPacking: THREE.RGBADepthPacking, alphaTest: 0.5});
    this.distMat = new THREE.MeshDistanceMaterial({alphaTest: 0.5});
    this.mesh.customDepthMaterial = this.depthMat;
    this.mesh.customDistanceMaterial = this.distMat;
    this.mesh.userData.inkMask = this.mask;
    this.contact = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({map: contactTexture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, color: '#000', fog: true}),
    );
    this.contact.position.y = 0.012;
    this.contact.renderOrder = 5; // after the floor (bug 2)
    this.group.add(this.mesh, this.contact);
  }
  texture(p: Pose) {
    const key = JSON.stringify(p);
    let tex = this.cache.get(key);
    if (!tex) {
      const c = document.createElement('canvas'); c.width = CW; c.height = CH;
      drawCharacter(c.getContext('2d')!, this.def, p);
      tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      this.cache.set(key, tex);
      if (this.cache.size > 400) { const k = this.cache.keys().next().value!; this.cache.get(k)!.dispose(); this.cache.delete(k); }
    }
    return tex;
  }
  set(p: Pose, light: Light, camElevDeg: number) {
    const tex = this.texture(p);
    this.mat.uniforms.map.value = tex;
    this.mask.uniforms.map.value = tex;
    this.depthMat.map = tex; this.distMat.map = tex;
    const row = CONTACT[light];
    (this.contact.material as THREE.MeshBasicMaterial).opacity = row.alpha;
    (this.contact.material as THREE.MeshBasicMaterial).color.set(row.color);
    const low = THREE.MathUtils.clamp(1 / Math.max(0.25, Math.sin(THREE.MathUtils.degToRad(Math.max(camElevDeg, 4)))), 1, 2.4);
    this.contact.scale.set(row.w, 1, row.d * Math.min(low, 1.8)); // bug 3: enlarge for low cameras
  }
}
