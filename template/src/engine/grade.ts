// grade.ts: GRADES rows, one per Light. Curve = 7 output values at inputs
// 0, 1/6 .. 1 (display space), smoothed with a monotone cubic. sat = shadow /
// mid / highlight saturation multipliers.
import type {Light} from './story';

export type GradeRow = {curve: number[]; sat: [number, number, number]};

export const GRADES: Record<Light, GradeRow> = {
  day: {
    curve: [0.025, 0.08, 0.18, 0.5, 0.875, 0.965, 1], // [VALIDATED 2026-11-17]
    sat: [0.6, 0.86, 0.9], // [VALIDATED 2026-11-17]
  },
  golden: {
    curve: [0.025, 0.08, 0.18, 0.5, 0.875, 0.965, 1], // [START] copy of day
    sat: [0.62, 0.9, 0.92], // [START]
  },
};

// Monotone cubic (Fritsch-Carlson) -> 256-entry LUT.
export const curveLUT = (ys: number[], n = 256): Float32Array => {
  const k = ys.length - 1;
  const xs = ys.map((_, i) => i / k);
  const d = ys.slice(0, -1).map((y, i) => (ys[i + 1] - y) / (xs[i + 1] - xs[i]));
  const m = ys.map((_, i) => (i === 0 ? d[0] : i === k ? d[k - 1] : d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2));
  for (let i = 0; i < k; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) { const tau = 3 / Math.sqrt(s); m[i] = tau * a * d[i]; m[i + 1] = tau * b * d[i]; }
  }
  const out = new Float32Array(n);
  for (let j = 0; j < n; j++) {
    const x = j / (n - 1);
    const i = Math.min(k - 1, Math.floor(x * k));
    const h = xs[i + 1] - xs[i], u = (x - xs[i]) / h;
    const h00 = 2 * u ** 3 - 3 * u ** 2 + 1, h10 = u ** 3 - 2 * u ** 2 + u;
    const h01 = -2 * u ** 3 + 3 * u ** 2, h11 = u ** 3 - u ** 2;
    out[j] = h00 * ys[i] + h10 * h * m[i] + h01 * ys[i + 1] + h11 * h * m[i + 1];
  }
  return out;
};
