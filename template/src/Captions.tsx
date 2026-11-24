// Captions: white bold rounded, thick black outline, small, stable
// lower-third position, sentence case, 1-3 words. Never colour, never a pop.
import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont} from '@remotion/google-fonts/Nunito';
import {CAP, captionGroups} from './engine/captions';
import type {Word} from './engine/story';

const {fontFamily} = loadFont('normal', {weights: ['900'], subsets: ['latin']});

export const Captions: React.FC<{words: Word[]}> = ({words}) => {
  const f = useCurrentFrame();
  const {fps, height} = useVideoConfig();
  const sec = f / fps;
  const groups = React.useMemo(() => captionGroups(words), [words]);
  const g = groups.find((x) => sec >= x.s && sec < x.e);
  if (!g) return null;
  const size = Math.round(height * CAP.sizeH);
  const stroke = Math.round((CAP.outlinePx * height) / 1920);
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute', left: 0, right: 0, top: `${CAP.centerY * 100}%`, transform: 'translateY(-50%)',
          textAlign: 'center', fontFamily, fontWeight: 900, fontSize: size, lineHeight: 1.1, color: '#ffffff',
          WebkitTextStroke: `${stroke}px #000000`, paintOrder: 'stroke fill', letterSpacing: 0.5, padding: '0 8%',
        }}
      >
        {g.text}
      </div>
    </AbsoluteFill>
  );
};
