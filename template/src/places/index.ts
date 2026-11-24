// PLACES of this video. One consistent location per scene: a scene's shots
// all use the same place id. Replace the worked examples per story.
import type {Place} from './kit';
import {hall} from './hall';
import {street} from './street';

export const PLACES: Record<string, Place> = {hall, street};
