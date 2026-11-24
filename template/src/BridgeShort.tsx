// BridgeShort: the one video composition (id hardcoded in tools/bridge-stills.mjs).
// 1080x1920 base; draft renders at --scale=0.5, the final at exactly
// --scale=1.3333333333333333 -> 1440x2560. Audio is muxed after render.
import React from 'react';
import {AbsoluteFill, Audio, getStaticFiles, staticFile, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import * as THREE from 'three';
import {Scene} from './Scene';
import {Captions} from './Captions';
import type {Story, Word} from './engine/story';

export type ShortProps = {story: Story; words: Word[]};

export const BridgeShort: React.FC<ShortProps> = ({story, words}) => {
  const {width, height} = useVideoConfig();
  const hasMix = getStaticFiles().some((f) => f.name === 'mix.wav');
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      <ThreeCanvas
        width={width}
        height={height}
        shadows
        flat
        camera={{fov: 50, near: 0.1, far: 200, position: [0, 1.6, 5]}}
        gl={{antialias: false, toneMapping: THREE.NoToneMapping, preserveDrawingBuffer: true, powerPreference: 'high-performance'}}
      >
        <Scene story={story} words={words} />
      </ThreeCanvas>
      <Captions words={words} />
      {hasMix ? <Audio src={staticFile('mix.wav')} /> : null}
    </AbsoluteFill>
  );
};
