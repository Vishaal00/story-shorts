// lights.ts: LIGHTS (day / golden only - NO night preset) + LOOK.
// Labels: [VALIDATED date] = proven by a validation run; [R20] = from the
// Rick study; [C6] = channel decision; [START] = starting value, not proven.
// Never relabel a [START] value as validated. When a value is validated,
// MERGE it into its row; never overwrite a validated row with a new guess.
import type {Light, V3} from './story';

export type Rig = {
  lit: V3; // key-side light on characters and world
  shade: V3; // shade-side / fill light
  sat: number;
  keyDir: V3; // direction TO the key light (world)
  keyGain: number; // world key intensity multiplier
  fillGain: number;
  rim: V3; // rim light colour (separates card from wall)
  fog: {color: string; near: number; far: number};
  label: string;
};

export const LIGHTS: Record<Light, Rig> = {
  day: {
    lit: [1.42, 1.35, 1.2], // [VALIDATED 2026-11-17]
    shade: [0.26, 0.25, 0.33], // [VALIDATED 2026-11-17]
    sat: 1.0, // [VALIDATED 2026-11-17]
    keyDir: [-0.55, 0.78, 0.42], // [START]
    keyGain: 1.0, // [START] world key = lit x pi x keyGain
    fillGain: 1.5, // [START]
    rim: [0.55, 0.62, 0.8], // [START] cool rim
    fog: {color: '#8d9db2', near: 18, far: 70}, // [START]
    label: 'day',
  },
  golden: {
    lit: [1.55, 1.12, 0.72], // [START]
    shade: [0.2, 0.19, 0.3], // [START]
    sat: 1.0, // [START]
    keyDir: [0.75, 0.35, 0.35], // [START] low sun / fire side
    keyGain: 1.5, // [START] raised 2026-11-23: warm interior luma 60 -> target 75-100
    fillGain: 2.6, // [START] raised 2026-11-23 (same reason)
    rim: [0.45, 0.5, 0.75], // [START]
    fog: {color: '#6b4a3a', near: 9, far: 40}, // [START]
    label: 'golden',
  },
};

export const LOOK = {
  ink: '#241726', // character plum [C6]
  bloomThreshold: 1.0, // the glow trigger (linear luminance) [START]
  // Characters are capped JUST BELOW the glow trigger. Capping much lower
  // flattens the face (warm-interior lesson). [START]
  charCap: 0.95,
  bloomIntensity: 0.55, // [START]
  grain: 0.035, // [START]
  interiorTarget: [75, 100] as [number, number], // mean luma 0-255, aim 80+ [C6]
  shutter: 0.5, // camera motion blur strength [START] verify on motion draft
  dofMaxPx: 6, // LensBlur max radius at 1080 wide [START]
  cardKey: 0.85, // share of lit on the card's lit edge [START]
};
