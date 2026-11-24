// captions.ts: Rick-spec caption groups from the MEASURED words.
// Sentence case, punctuation kept, 1-3 words per group, a group never
// crosses a sentence end or comma, normal gaps (hidden in pauses > 0.3 s).
// No colour highlight, no scale pop. Pure, so QA uses the same groups.
import type {Word} from './story';

export type CapGroup = {text: string; s: number; e: number; first: number};
export const CAP = {maxWords: 3, gapHide: 0.3, centerY: 0.75, sizeH: 0.036, outlinePx: 9} as const; // [C6] spec, sizes [START]

export const captionGroups = (words: Word[]): CapGroup[] => {
  const out: CapGroup[] = [];
  let cur: Word[] = [], first = 0;
  const flush = () => {
    if (!cur.length) return;
    out.push({text: cur.map((w) => w.w.trim()).join(' '), s: cur[0].s, e: cur[cur.length - 1].e, first});
    cur = [];
  };
  words.forEach((w, i) => {
    if (!cur.length) first = i;
    cur.push(w);
    const brk = /[.,!?;:]$/.test(w.w.trim());
    const next = words[i + 1];
    const pause = next ? next.s - w.e > CAP.gapHide : true;
    if (brk || pause || cur.length >= CAP.maxWords) flush();
  });
  flush();
  // sentence case: first letter after a sentence end is upper, the rest kept as spoken
  let start = true;
  for (const g of out) {
    if (start) g.text = g.text.charAt(0).toUpperCase() + g.text.slice(1);
    start = /[.!?]$/.test(g.text);
  }
  // display window: from group start until next group start, or end + gapHide
  out.forEach((g, i) => {
    const nx = out[i + 1];
    g.e = nx && nx.s - g.e <= CAP.gapHide ? nx.s : g.e + 0.12;
  });
  return out;
};
