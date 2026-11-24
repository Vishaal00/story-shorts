import React from 'react';
import {Composition, Still} from 'remotion';
import {BridgeShort} from './BridgeShort';
import {CharacterSheet} from './CharacterSheet';
import storyJson from '../story/story.json';
import wordsJson from '../voice/words.json';
import type {Story, Word} from './engine/story';
import {CAST} from './engine/cast';

const story = storyJson as unknown as Story;
const words = wordsJson as unknown as Word[];

export const Root: React.FC = () => (
  <>
    <Composition
      id="BridgeShort"
      component={BridgeShort}
      width={1080}
      height={1920}
      fps={30}
      durationInFrames={Math.round(story.durationSec * 30)}
      defaultProps={{story, words}}
    />
    <Still id="CharacterSheet" component={CharacterSheet} width={1080} height={1920} defaultProps={{who: Object.keys(CAST)[0]}} />
  </>
);
