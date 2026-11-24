// CharacterSheet: front, 3/4, side, the 6 sheet expressions and a walk,
// for ONE character. Rendered as a still at the stills gate. STOP after it.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {CAST, CH, CW, drawCharacter, type Pose} from './engine/cast';
import {SHEET_EXPR, EXPR, type View} from './engine/face';

const base = (view: View, over: Partial<Pose> = {}): Pose => ({
  view, facing: 1, hand: 'open', arm: 'down', armU: 0, walkU: null, stepOdd: false, strideM: 0.8, breath: 0, headDx: 0,
  face: {brow: 'neutral', eye: 'neutral', mouth: 'closed', blink: false, look: 0, view},
  ...over,
});

const Cell: React.FC<{who: string; pose: Pose; w: number; crop?: boolean; label: string}> = ({who, pose, w, crop, label}) => {
  const ref = React.useCallback((c: HTMLCanvasElement | null) => {
    if (!c) return;
    const full = document.createElement('canvas'); full.width = CW; full.height = CH;
    drawCharacter(full.getContext('2d')!, CAST[who], pose);
    const g = c.getContext('2d')!;
    g.clearRect(0, 0, c.width, c.height);
    if (crop) g.drawImage(full, 96, 40, 320, 360, 0, 0, c.width, c.height);
    else g.drawImage(full, 0, 0, CW, CH, 0, 0, c.width, c.height);
  }, [who, pose, crop]);
  const h = crop ? Math.round((w * 360) / 320) : w * 2;
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', margin: 6}}>
      <canvas ref={ref} width={w * 2} height={h * 2} style={{width: w, height: h, background: '#efe4cf', borderRadius: 12}} />
      <div style={{font: '600 20px sans-serif', color: '#3a2a20', marginTop: 4}}>{label}</div>
    </div>
  );
};

export const CharacterSheet: React.FC<{who: string}> = ({who}) => (
  <AbsoluteFill style={{background: '#f6eedd', padding: 30, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
    <div style={{font: '800 34px sans-serif', color: '#241726', marginBottom: 10}}>{CAST[who].name}</div>
    <div style={{display: 'flex'}}>
      <Cell who={who} pose={base('front')} w={300} label="front" />
      <Cell who={who} pose={base('threeq')} w={300} label="3/4" />
      <Cell who={who} pose={base('side')} w={300} label="side" />
    </div>
    <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'center', width: 1000}}>
      {SHEET_EXPR.map((e) => (
        <Cell key={e} who={who} crop w={300} label={e}
          pose={base('front', {face: {brow: e, eye: e, mouth: EXPR[e].mouth, blink: false, look: 0, view: 'front'}})} />
      ))}
    </div>
    <div style={{display: 'flex'}}>
      {[0, 0.33, 0.66, 0.99].map((u, i) => (
        <Cell key={i} who={who} w={220} label={`walk ${i + 1}`} pose={base('threeq', {walkU: u, stepOdd: i % 2 === 1, strideM: 0.8})} />
      ))}
    </div>
  </AbsoluteFill>
);
