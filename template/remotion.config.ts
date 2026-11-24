// story-shorts: Remotion config. Render scale is passed on the command line
// (draft 0.5, final exactly 1.3333333333333333 -> 1440x2560). Never Blender.
import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setChromiumOpenGlRenderer('angle');
Config.setConcurrency(2);
Config.setPublicDir('public');
