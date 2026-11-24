// Scene: the only React glue between Remotion's frame and the World.
// No useFrame (forbidden): the frame comes from useCurrentFrame() and the
// World is posed during render, before <ThreeCanvas> advances R3F.
import React, {useMemo} from 'react';
import {useCurrentFrame} from 'remotion';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {EffectComposer, Bloom, ToneMapping} from '@react-three/postprocessing';
import {ToneMappingMode} from 'postprocessing';
import {stage} from './engine/world';
import {InkPass} from './engine/ink';
import {Grade, Grain, LensBlur} from './engine/effects';
import {GRADES} from './engine/grade';
import {LOOK} from './engine/lights';
import {shotIndexAt, type Story, type Word} from './engine/story';
import {PLACES} from './places';

export const Scene: React.FC<{story: Story; words: Word[]}> = ({story, words}) => {
  const f = useCurrentFrame();
  const {scene, camera} = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  const world = useMemo(() => stage(scene, story, words, PLACES), [scene, story, words]);
  const post = useMemo(
    () => ({ink: new InkPass(scene, cam), lens: new LensBlur(), grade: new Grade(GRADES.day), grain: new Grain(LOOK.grain)}),
    [scene, cam],
  );
  world.attach(post);
  const si = shotIndexAt(story, words, f / story.fps);
  world.update(story.shots[si].id, f, cam, scene);
  return (
    <EffectComposer multisampling={4} enableNormalPass={false}>
      <primitive object={post.ink} />
      <primitive object={post.lens} />
      <Bloom luminanceThreshold={LOOK.bloomThreshold} luminanceSmoothing={0.05} intensity={LOOK.bloomIntensity} mipmapBlur />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <primitive object={post.grade} />
      <primitive object={post.grain} />
    </EffectComposer>
  );
};
