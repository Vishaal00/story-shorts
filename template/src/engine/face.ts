// face.ts: discrete faces. Expr and MouthK are ENUMS, never continuous
// blends. faceFront() draws one face state. A change of expression steps in
// discrete frames with the eyebrows leading: brows at +0 f, eyes at +2 f,
// mouth at +4 f (3-6 f per change). Proportions are fixed numbers, never nudged:
// head h/w 0.94, eye centres 0.26 head-widths apart.
export enum Expr {
  neutral, happy, laugh, sad, angry, scared, surprised,
  worried, smug, determined, disgusted, confused, tired, shocked,
}
export type ExprName = keyof typeof Expr;
export const SHEET_EXPR: ExprName[] = ['neutral', 'happy', 'sad', 'angry', 'scared', 'surprised'];

export enum MouthK { closed, smile, grin, open, wide, O, frown, flat, smirk, teeth }
export type MouthName = keyof typeof MouthK;

export enum HandK { open, grip, point }
export type HandName = keyof typeof HandK;

export const BROW_LEAD = 0, EYE_LAG = 2, MOUTH_LAG = 4; // frames
export const EYE_SEP = 0.26; // head-widths between eye centres
export const HEAD_HW = 0.94; // head height / width

type ExprSpec = {brow: number; browY: number; eye: number; pupil: number; mouth: MouthName; blush: number};
// brow: inner-end tilt in degrees (+ = worried/sad up, - = angry down)
export const EXPR: Record<ExprName, ExprSpec> = {
  neutral: {brow: 0, browY: 0, eye: 1, pupil: 1, mouth: 'closed', blush: 0.25},
  happy: {brow: 6, browY: -0.02, eye: 0.9, pupil: 1, mouth: 'smile', blush: 0.5},
  laugh: {brow: 10, browY: -0.04, eye: 0.35, pupil: 1, mouth: 'grin', blush: 0.7},
  sad: {brow: 22, browY: 0.01, eye: 0.85, pupil: 1.05, mouth: 'frown', blush: 0.2},
  angry: {brow: -24, browY: 0.03, eye: 0.8, pupil: 0.8, mouth: 'teeth', blush: 0.55},
  scared: {brow: 26, browY: -0.05, eye: 1.25, pupil: 0.6, mouth: 'wide', blush: 0.1},
  surprised: {brow: 4, browY: -0.08, eye: 1.3, pupil: 0.75, mouth: 'O', blush: 0.3},
  worried: {brow: 18, browY: -0.02, eye: 1, pupil: 0.9, mouth: 'flat', blush: 0.2},
  smug: {brow: -8, browY: 0.02, eye: 0.6, pupil: 1, mouth: 'smirk', blush: 0.4},
  determined: {brow: -14, browY: 0.02, eye: 0.85, pupil: 0.95, mouth: 'flat', blush: 0.3},
  disgusted: {brow: -10, browY: 0.0, eye: 0.7, pupil: 0.9, mouth: 'frown', blush: 0.2},
  confused: {brow: 12, browY: -0.03, eye: 1.05, pupil: 0.9, mouth: 'flat', blush: 0.25},
  tired: {brow: 8, browY: 0.03, eye: 0.45, pupil: 1, mouth: 'flat', blush: 0.15},
  shocked: {brow: 8, browY: -0.1, eye: 1.4, pupil: 0.5, mouth: 'wide', blush: 0.1},
};

export type View = 'front' | 'threeq' | 'side';
export type FaceState = {brow: ExprName; eye: ExprName; mouth: MouthName; blink: boolean; look: number; view: View};
export type HeadGeo = {cx: number; cy: number; hw: number; hh: number; ink: string; lw: number; freckles: boolean; facing: 1 | -1};

const pen = (ctx: CanvasRenderingContext2D, ink: string, lw: number) => {
  ctx.strokeStyle = ink; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
};

// One face state. Used for front, 3/4 and side (features shift toward facing).
export const faceFront = (ctx: CanvasRenderingContext2D, g: HeadGeo, s: FaceState) => {
  const {cx, cy, hw, hh, ink, lw} = g;
  const shift = s.view === 'threeq' ? 0.12 * hw * g.facing : s.view === 'side' ? 0.26 * hw * g.facing : 0;
  const fx = cx + shift;
  const eb = EXPR[s.brow], ee = EXPR[s.eye];
  const eyeY = cy + 0.02 * hh;
  const sep = (EYE_SEP / 2) * hw;
  const eyes = s.view === 'side' ? [1] : [-1, 1];
  // blush + freckles
  for (const side of eyes) {
    const bx = fx + side * (sep + 0.05 * hw) * (s.view === 'side' ? 0 : 1), by = cy + 0.2 * hh;
    ctx.fillStyle = `rgba(232,110,110,${0.18 + 0.3 * ee.blush})`;
    ctx.beginPath(); ctx.ellipse(bx, by, 0.08 * hw, 0.045 * hh, 0, 0, Math.PI * 2); ctx.fill();
    if (g.freckles) {
      ctx.fillStyle = 'rgba(120,64,40,0.75)';
      for (const [dx, dy] of [[-0.035, -0.01], [0, 0.012], [0.035, -0.006]]) {
        ctx.beginPath(); ctx.arc(bx + dx * hw, by + dy * hh, 0.0075 * hw, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  // large eyes, big pupils
  for (const side of eyes) {
    const narrow = s.view === 'threeq' && side === -g.facing ? 0.78 : 1;
    const ex = fx + (s.view === 'side' ? 0.02 * hw * g.facing : side * sep * narrow);
    const rx = 0.1 * hw * narrow, ry = 0.13 * hh * ee.eye;
    pen(ctx, ink, lw);
    if (s.blink) {
      ctx.beginPath(); ctx.moveTo(ex - rx, eyeY); ctx.quadraticCurveTo(ex, eyeY + 0.05 * hh, ex + rx, eyeY); ctx.stroke();
    } else {
      ctx.fillStyle = '#fbf6ee';
      ctx.beginPath(); ctx.ellipse(ex, eyeY, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      const pr = 0.062 * hw * ee.pupil * narrow;
      const px = ex + s.look * 0.035 * hw + (s.view === 'front' ? 0 : 0.03 * hw * g.facing);
      ctx.fillStyle = '#1b1220';
      ctx.beginPath(); ctx.ellipse(px, eyeY + 0.01 * hh, pr, Math.min(pr * 1.08, ry * 0.95), 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(px - pr * 0.35, eyeY - pr * 0.35, pr * 0.32, 0, Math.PI * 2); ctx.fill();
    }
    // thick moving brows (they lead every change)
    const by = eyeY - 0.19 * hh + eb.browY * hh;
    const tilt = ((eb.brow * Math.PI) / 180) * side * -1;
    ctx.save(); ctx.translate(ex, by); ctx.rotate(tilt);
    ctx.strokeStyle = ink; ctx.lineWidth = lw * 2.4;
    ctx.beginPath(); ctx.moveTo(-rx * 1.05, 0.01 * hh); ctx.quadraticCurveTo(0, -0.03 * hh, rx * 1.05, 0.01 * hh); ctx.stroke();
    ctx.restore();
  }
  // nose
  pen(ctx, ink, lw * 0.9);
  const dir = s.view === 'front' ? 1 : g.facing;
  const nx = fx + (s.view === 'front' ? 0 : 0.06 * hw * g.facing), ny = cy + 0.15 * hh;
  ctx.beginPath(); ctx.moveTo(nx - 0.02 * hw * dir, ny - 0.04 * hh); ctx.quadraticCurveTo(nx + 0.04 * hw * dir, ny, nx - 0.015 * hw * dir, ny + 0.02 * hh); ctx.stroke();
  mouth(ctx, fx + (s.view === 'side' ? 0.05 * hw * g.facing : 0), cy + 0.3 * hh, hw * (s.view === 'side' ? 0.6 : 1), hh, s.mouth, ink, lw);
};

// Big mouth, discrete shapes only.
export const mouth = (ctx: CanvasRenderingContext2D, x: number, y: number, hw: number, hh: number, m: MouthName, ink: string, lw: number) => {
  const w = 0.17 * hw;
  pen(ctx, ink, lw);
  const inside = (draw: () => void) => {
    ctx.fillStyle = '#4a1d2c'; ctx.beginPath(); draw(); ctx.fill();
    ctx.save(); ctx.clip(); ctx.fillStyle = '#d0606a';
    ctx.beginPath(); ctx.ellipse(x, y + 0.07 * hh, w * 0.6, 0.04 * hh, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.beginPath(); draw(); ctx.stroke();
  };
  switch (m) {
    case 'closed': ctx.beginPath(); ctx.moveTo(x - w * 0.6, y); ctx.quadraticCurveTo(x, y + 0.015 * hh, x + w * 0.6, y); ctx.stroke(); break;
    case 'flat': ctx.beginPath(); ctx.moveTo(x - w * 0.5, y + 0.01 * hh); ctx.lineTo(x + w * 0.5, y + 0.01 * hh); ctx.stroke(); break;
    case 'smile': ctx.beginPath(); ctx.moveTo(x - w, y - 0.02 * hh); ctx.quadraticCurveTo(x, y + 0.08 * hh, x + w, y - 0.02 * hh); ctx.stroke(); break;
    case 'smirk': ctx.beginPath(); ctx.moveTo(x - w * 0.7, y + 0.01 * hh); ctx.quadraticCurveTo(x + w * 0.2, y + 0.03 * hh, x + w * 0.8, y - 0.04 * hh); ctx.stroke(); break;
    case 'frown': ctx.beginPath(); ctx.moveTo(x - w * 0.8, y + 0.04 * hh); ctx.quadraticCurveTo(x, y - 0.04 * hh, x + w * 0.8, y + 0.04 * hh); ctx.stroke(); break;
    case 'grin': inside(() => { ctx.moveTo(x - w * 1.1, y - 0.03 * hh); ctx.quadraticCurveTo(x, y + 0.16 * hh, x + w * 1.1, y - 0.03 * hh); ctx.closePath(); }); break;
    case 'open': inside(() => ctx.ellipse(x, y + 0.02 * hh, w * 0.7, 0.06 * hh, 0, 0, Math.PI * 2)); break;
    case 'wide': inside(() => ctx.ellipse(x, y + 0.03 * hh, w * 1.0, 0.085 * hh, 0, 0, Math.PI * 2)); break;
    case 'O': inside(() => ctx.ellipse(x, y + 0.03 * hh, w * 0.45, 0.075 * hh, 0, 0, Math.PI * 2)); break;
    case 'teeth':
      inside(() => { ctx.moveTo(x - w, y - 0.01 * hh); ctx.lineTo(x + w, y - 0.01 * hh); ctx.lineTo(x + w * 0.8, y + 0.06 * hh); ctx.lineTo(x - w * 0.8, y + 0.06 * hh); ctx.closePath(); });
      ctx.fillStyle = '#fbf6ee'; ctx.fillRect(x - w * 0.85, y - 0.005 * hh, w * 1.7, 0.025 * hh);
      ctx.strokeRect(x - w * 0.85, y - 0.005 * hh, w * 1.7, 0.025 * hh); break;
  }
};

// Talking mouth from the measured words: one discrete shape per 3-frame step.
export const talkMouth = (word: string, step: number): MouthName => {
  const letters = word.toLowerCase().replace(/[^a-z]/g, '');
  const seq: MouthName[] = [];
  for (const c of letters) {
    if (c === 'o' || c === 'u') seq.push('O');
    else if (c === 'a' || c === 'i') seq.push('wide');
    else if (c === 'e') seq.push('open');
    else if (c === 'm' || c === 'b' || c === 'p') seq.push('closed');
  }
  if (!seq.length) seq.push('open');
  return seq[step % seq.length];
};
