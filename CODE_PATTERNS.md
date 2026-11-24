# CODE_PATTERNS - story-shorts engine

Read at step 2 (The Look). The engine is `template/` (copied into each video folder by INSTALL.md). Remotion + React Three Fiber + three.js 0.178 + postprocessing 6.37. Never Blender.

## 1. Files
| File | Holds |
|---|---|
| `src/engine/story.ts` | types; `Light = 'day' \| 'golden'`; anchors (seconds or `{word: i}`); shot timing helpers |
| `src/engine/lights.ts` | `LIGHTS` (day/golden only) + `LOOK` (ink colour, glow trigger, char cap, grain, shutter, DOF) |
| `src/engine/grade.ts` | `GRADES` rows + monotone-cubic `curveLUT` |
| `src/engine/face.ts` | `Expr` (14), `MouthK` (10), `HandK` (3) enums; `faceFront()`; `talkMouth()` |
| `src/engine/cast.ts` | `CAST` of this video, `CONTACT` rows, `drawCharacter()`, `Card` (billboard + contact shadow + cast shadow) |
| `src/engine/shade.ts` | card light shader (`CARD_FRAG`), `untone()` + GLSL `untone_gl` |
| `src/engine/acting.ts` | `actorAt()`: hold/breath/blink/walk/face per frame |
| `src/engine/camera.ts` | `camAt()`, `applyCam()`, `dofAt()`, `vpAt()`, `EASE_F`, `KICKS` handling |
| `src/engine/ink.ts` | `NOINK = 3`, `InkPass` |
| `src/engine/effects.ts` | `LensBlur`, `Grade`, `Grain` |
| `src/engine/world.ts` | `stage()`, `World.update()`, `cloudMaps` |
| `src/engine/captions.ts` | `captionGroups()` (pure; QA uses it too) |
| `src/places/kit.ts` | `Place` type, `Kit` builders (box, cyl, ball, roof, compound, sign), procedural textures |
| `src/places/*.ts` | one file per place; `index.ts` = `PLACES` |
| `src/Scene.tsx`, `BridgeShort.tsx`, `Captions.tsx`, `CharacterSheet.tsx`, `Root.tsx` | Remotion glue |
| `tools/*.py`, `tools/scene_audit.ts`, `tools/bridge-stills.mjs` | measure, mix, audit, stills, QA |

## 2. The composer chain (fixed order)
R3F `<EffectComposer>` with **InkPass -> LensBlur -> Bloom -> ToneMapping -> Grade -> Grain** (`src/Scene.tsx`). Not vanilla three.js EffectComposer, not a custom Sobel pass. Custom effects are postprocessing `Effect` subclasses mounted with `<primitive object={...}/>`. Renderer tone mapping is OFF (`flat`, `NoToneMapping`); ToneMapping (ACES) happens in the chain, then the Grade curve.
- InkPass renders a normal+depth prepass each frame. Objects on layer `NOINK = 3` (sky, sun, dust, light shafts, sign faces) are left out. Cards render with their mask material (alpha 0 = no ink), so world lines never cross a character.
- LensBlur = DOF from `dofAt(f)` + camera motion blur from the previous frame's view-projection (`vpAt(f-1)`, none across a cut). NO BokehPass.
- Bloom threshold = `LOOK.bloomThreshold` (the glow trigger). Cards are soft-capped at `LOOK.charCap` just below it.

## 3. The posing hook (zero useFrame)
```ts
const world = useMemo(() => stage(scene, story, words, PLACES), [scene, story, words]);
world.attach(post);
world.update(story.shots[si].id, f, camera, scene);   // during render, f = useCurrentFrame()
```
`stage()` calls `Place.draw(kit)` once per place. `World.update(id, f, cam, scene)` shows the shot's place, sets the light rig, poses camera + cards, drives dust/flicker, feeds the post chain. NO `useFrame` anywhere in templates (Remotion renders frames out of order; anything not driven by `f` flickers). No `Math.random()`, no clock time: use `rng(hash(...))`.

## 4. Faces
`faceFront(ctx, headGeo, {brow, eye, mouth, blink, look, view})` draws ONE discrete state. `brow`/`eye` are `Expr` names, `mouth` a `MouthK` name. Never interpolate between expressions. Lags: `BROW_LEAD 0`, `EYE_LAG 2`, `MOUTH_LAG 4` frames. Card textures are cached by pose key; quantise continuous inputs (breath /4, walk phase /12) so holds stay cheap.

## 5. Lights
`LIGHTS[light]` + `LOOK` live in `lights.ts`. Adding a preset (e.g. a validated night) needs ALL of: the `Light` union in `story.ts`, a `LIGHTS` row, a `GRADES` row (`grade.ts`), a `CONTACT` row (`cast.ts`), a `cloudMaps` entry (`world.ts`). Merge validated values into their row; never overwrite a validated value with a guess.
World light units: three.js Lambert divides by pi, so the world key is `max(lit) * PI * keyGain` and the fill `max(shade) * PI * fillGain`; the card shader takes `lit`/`shade` directly. Interior shells (walls, ceiling, beams) use `cast: false` so the key reaches the room.

## 6. Places
```ts
export const tavern: Place = {
  id: 'tavern', kind: 'interior',
  practical: {pos: [x, y, z], color: '#ffad55', power: 3.5, flicker: true, shadow: true, label: 'candle'},
  key: [-0.85, 0.5, 0.35],          // direction TO the key, from the practical side
  dust: {center: [...], size: [...]}, fog: {...}, inkFade: [8, 22],
  draw: (k) => { k.box(w, h, d, colour, [x, yBottom, z], {tex: 'planks', prop: 'table', solid: true}); ... },
};
```
`prop:` counts toward the 15-40 gate; `solid:` joins the intersection gate; `compound()` = one prop of many parts; `far: true` = silhouette + fog material; `sign()` = made-up words, unlit face. Write the governing reference for each subject in a comment at the top of the place file.

## 7. Characters
Add each character to `CAST` (cast.ts) after its references are recorded. One iconic hook (`hooks`), a named real person gets a second distinguishing hook. `holds:` draws the prop in the fist; `walk:` is the shot's one action, or `action: 'raise' | 'point'` at `actionAt`.

## 8. Story data
`story/story.json`: `durationSec`, `hook` (= first narration line), `quote` (max one), `warmInteriors`, `shots[]` each with `place`, `light`, `at` (a WORD anchor for every cut after the first), `cam[]` keys (2-3 per shot for ~56 moves/min), `actors[]`, `action`, `kicks` (seconds). Cuts 2.5-3 s apart.

## 9. Sound
`tools/sfx.py`: `Cue(t_seconds, name, gain_db, file=None, why='')`. `tools/timeline.py`: the `CUES` list (or `story/cues.json`), bed level, duck -3 dB under every word of `voice/words.json`, master -14 LUFS / TP -1 -> `public/mix.wav` + `audio/stems/`. `cues.md` is GENERATED output: never edit it.

## 10. Known traps
- `untone` name collision in shade.ts: the TS `untone()` and the GLSL helper; the GLSL one must stay `untone_gl` (postprocessing merges shader chunks).
- `NOINK = 3` lives in ink.ts; lights stay on layer 0; the camera enables layer 3.
- `KICKS` are seconds, not frames. Cue times are seconds.
- `bridge-stills.mjs` hardcodes the composition id `BridgeShort`; rename both or neither.
- postprocessing 6.37 needs three < 0.179 (pinned 0.178.0).
- faster-whisper is fed ffmpeg-decoded PCM (PyAV version clash); the WAV is only read.
- Motion blur covers camera moves only. Card motion blur on fast actions is NOT implemented (cards are alpha-tested); verify fast actions on the motion draft and keep them short.
- Backdrop PNGs (`backdrop_<scene>.png`) are not wired yet; when first used, load with `delayRender` + `staticFile` onto a far-band plane, never as the whole shot.
