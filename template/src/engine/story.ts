// story.ts: the data types of one video. The video's data lives in
// story/story.json (shots anchored to words) and voice/words.json (measured).
// Adding a Light preset needs ALL of: this union, LIGHTS + LOOK (lights.ts),
// a GRADES row (grade.ts), a CONTACT row (cast.ts), a cloudMaps entry (world.ts).
import type {ExprName, MouthName, HandName} from './face';

export type Light = 'day' | 'golden'; // NO night preset until one is validated
export type V3 = [number, number, number];
export type Word = {w: string; s: number; e: number};

// A time is either seconds, or a word index (+ offset in seconds) in words.json.
export type Anchor = number | {word: number; offset?: number};

export type Beat = {at: Anchor; expr: ExprName}; // face changes on narration beats
export type Walk = {at: Anchor; to: [number, number]}; // planted 0.8 m stride
export type Actor = {
  id: string; // key into CAST (cast.ts)
  x: number;
  z: number;
  facing?: 1 | -1; // 1 = faces screen-right
  hand?: HandName; // open | grip | point
  holds?: string; // prop drawn IN the hand (grips.ts props) - never floating
  beats: Beat[];
  walk?: Walk; // the ONE clear story action of the shot, if it is a walk
  action?: 'raise' | 'point' | 'none'; // or one arm action
  talks?: boolean; // lip-sync to the narration (quotes / own lines only)
  view?: 'front' | 'threeq' | 'side';
  actionAt?: Anchor;
};
export type CamKey = {
  at: Anchor;
  pos: V3;
  look: V3;
  fov?: number; // vertical degrees
  roll?: number; // degrees, |roll| 4-8, reached over >= 18 f
  focus?: string; // actor id for DOF, default = first actor
};
export type Shot = {
  id: string;
  place: string; // key into PLACES
  light: Light;
  at: Anchor; // cut-in time; MUST be a word anchor (every cut on a word)
  cam: CamKey[];
  actors: Actor[];
  action: string; // the one clear story action, plain words
  kicks?: number[]; // KICKS: seconds (absolute), small camera impacts
  props?: number; // filled by scene_audit (count in frame)
};
export type Story = {
  title: string;
  fps: 30;
  durationSec: number;
  hook: string; // must match the first narration line, lands in 0-2 s
  quote?: {text: string; source: string} | null; // max ONE documented quote
  warmInteriors?: string[]; // places held to the warm-interior luma target
  shots: Shot[];
};

export const t = (a: Anchor, words: Word[]): number =>
  typeof a === 'number' ? a : (words[a.word]?.s ?? 0) + (a.offset ?? 0);

export const shotStarts = (story: Story, words: Word[]) =>
  story.shots.map((s, i) => (i === 0 ? 0 : t(s.at, words)));

export const shotIndexAt = (story: Story, words: Word[], sec: number) => {
  const st = shotStarts(story, words);
  let k = 0;
  for (let i = 0; i < st.length; i++) if (sec >= st[i]) k = i;
  return k;
};

export const shotRange = (story: Story, words: Word[], i: number): [number, number] => {
  const st = shotStarts(story, words);
  return [st[i], i + 1 < st.length ? st[i + 1] : story.durationSec];
};

export type {ExprName, MouthName, HandName};
