# STYLE_BIBLE - story-shorts

The rules of the look, the story and the sound. Read the section the step names, not the whole file.
Labels on numbers: `[VALIDATED date]` proven by a validation run; `[R20]` from the Rick study; `[C6]` a channel decision; `[MIRO-STUDY]` from the mr miro method study, unconfirmed until our QA confirms it; `[START]` a starting value, not proven. Never relabel a `[START]` value as validated. Where this file and any other file disagree, the user's build spec of 2026-11-23 wins, then this file.

## 1. Channel and format
- Channel: History Nerd (@HistoryNerdClips). One TRUE history story per video. History only: never a science fable, never a copy of a Rick video. [C6]
- Vertical 9:16 Short, narration-driven. Narration under 60 s ideal, 1:10 max. One story, one voice (conor), one folder per video. [C6]
- Look: 2D cartoon characters in a 3D world (Vasa style). Remotion + three.js only, on the cartoon-3d-short engine rules. Never Blender, never make-short. [C6]
- Script words: plain common words the TTS reads cleanly (write "eleven twenty", not "1120"). At most ONE documented quote per video, with its source. [C6]
- The supplied conor WAV is used exactly as supplied: never re-generated, re-voiced, sped up, trimmed or tightened. [C6]

## 2. Study (step 1)
- **Study every story.** Before any build: who, where, when, what happened, what is disputed. Write the directing brief: hook line, beats, places, cast, the one action per shot, the light arc (day -> golden -> night only where the story goes there).
- **Evidence labels.** Every fact and every reference choice is SEEN (read in a source / seen in an image), INFERRED (reasoned from SEEN facts) or UNKNOWN (say so; never fill a gap with invention presented as fact).
- **References rule.** For every hard subject (vehicle, building, uniform, key prop, place) and every character (outfit/uniform, hair, face shape, era clothing, held props), find as many reference images as possible, matched to the era and place of the story. Record in `refs/REFERENCES.md` which reference governs which subject. No reference supplied for a subject -> build from the setting brief and SAY SO at the stills gate.
- **Anachronism list.** Write `refs/ANACHRONISMS.md`: things that must not appear in this era/place. Nothing on it appears in any shot.
- **Study the reference (Rick) at full 30 fps**, every frame of a walk, gesture, turn, reaction, talk - not screenshots every few seconds. Write `STUDY.md` with NUMBERS only: frames per step, gesture length, shot length, caption position and size, where light comes from, how full the backgrounds are. Learn the grammar only; never copy characters, scenes or frames.
- **Never re-study Rick in the same session as a video build** (context rot). Study once, keep `STUDY.md`.
- Logs: every user prompt word for word in `_log/PROMPTS.md`, every decision in `_log/DECISIONS.md`, `HANDOFF.md` kept current.

## 3. Characters (2D card in the 3D world)
Build exactly this kind and no other: a flat 2D cartoon card, camera-facing billboard, placed in the 3D world. NOT a 3D model, NOT a realistic human, NOT a stickman, NOT a minimal dot-eye figure, NOT an AI image, NOT a real likeness. [C6]
- Bean head, head height/width 0.94, eye centres 0.26 head-widths apart, adults 3.5 head-heights tall (1.75 m in the world). [C6]
- Thin ink outline on nearly every edge, character plum `#241726`, variable width (heavier lower-right). [C6]
- The face acts: large eyes, big pupils, moving thick brows, big mouth, freckles + blush, hair with volume + tufts + strand lines. Hair is drawn like a cap: zigzag fringe + strand lines + two tufts. [C6]
- Face library: 14 expressions (`Expr` enum); a sheet shows 6 (neutral, happy, sad, angry, scared, surprised). Changes are DISCRETE steps, eyebrows leading, 3-6 f per change (brows +0 f, eyes +2 f, mouth +4 f). Mouths are the `MouthK` enum (10 shapes), talking mouth one shape per 3 f. [C6]
- Body: stick limbs, clothes with folds + pocket + stain, ONE iconic hook per character (hat, crown, hood, scarf, moustache...). Named real people must look visibly different from ordinary figures (e.g. crown + chin beard) but never copy a real face. One iconic outfit per character, the same in every shot. [C6]
- Hands: three shapes (open, grip, point). Hands visibly hold every prop: the prop is drawn first, the fist over it. [C6]
- Motion: bodies HOLD a pose; faces change on narration beats; limbs move only for ONE clear story action per shot. Holds breathe: breathing, weight shift, head drift, blinks every 0.5-2.3 s. Walk: bob 5 % of height, lean 1-7 deg (4 used), planted 0.8 m stride, step cadence reference 9-12 f (11 used). [C6] [R20]
- Contact shadow under every grounded character's feet, always. Plus a cast shadow away from the key (and from the candle where there is one). [C6]
- Character sheet first: front, 3/4, side, 6 expressions, a walk. Then STOP for approval before any animation.

## 4. World (human type, human scale)
- **Reference -> 3D geometry, in this order, no shortcuts.** Step 1: references per hard subject (section 2). Step 2: build every background, set and prop in three.js code as 3D geometry, shapes and proportions from the governing reference, cartoon style with ink outlines. Never copy a reference's logos, badges, text or real likenesses.
- Never AI-generated background images, never a still image with a slow zoom/pan, never Kling / Runway / Veo or any image-to-video clip. The world is a real 3D world built in code.
- Real human scale (metres): door 2.1 x 0.9, table top 0.75, chair seat 0.45, window sill 0.9, storey 3.0-3.4. Camera at human eye level (1.5-1.65 m) unless the story needs otherwise. No miniature / toy / dollhouse look, no giant props, no squashed proportions. [C6]
- Lived-in, not empty: 15-40 props in every frame (audited), no empty skies, texture on every surface. Three separated layers in every shot: foreground / midground / background; distant objects built to their distance band (far = silhouette + fog, no texture). [C6]
- A named place must LOOK like that place, its real markers visible in every scene; nothing from the anachronism list in any shot.
- One consistent location per scene; character consistency across shots.
- Signs carry MADE-UP words only. Sign faces stay unlit so they stay readable.
- Backdrop direction (approved, not yet applied): a supplied painterly backdrop per scene (`backdrop_<scene>.png`) may serve ONLY as the far band behind the 3D midground/foreground, with character light matched to the backdrop's light; never as the whole shot, never with readable text baked in, never AI-generated.

## 5. Light
- Every shot: warm directional key + cool fill + rim light + ONE visible practical source (lamp, candle, window, sun). No flat light, no light without a source. [C6]
- Day light: lit `[1.42, 1.35, 1.2]`, shade `[.26, .25, .33]`, sat `1.0`. [VALIDATED 2026-11-17]
- Grade curve `[0.025, 0.08, 0.18, 0.5, 0.875, 0.965, 1]`, sat `[0.6, 0.86, 0.9]`. [VALIDATED 2026-11-17]
- LIGHTS are day / golden only. No night preset until one is validated. A validated value is MERGED into its row, never overwritten.
- Light is cast ON the character: warm on the key/lamp side, cool on the window side, gradient shading, never flat white, rim light separating the card from the wall. Characters stay lit, never flat-shaded. Bloom never touches a character.
- **Warm interior look:** brightness target mean luma 75-100, aim 80+ [C6]. Head halo fix: cap character brightness JUST below the glow trigger (`charCap 0.95 < bloomThreshold 1.0`) - capping much lower flattens the face. Foot shadow fix (three bugs): the shadow image was fully transparent (rebuild it, assert centre alpha), the floor drew over it (draw after the floor with polygon offset), a low camera squashed it (enlarge its depth when the camera is low). The character also casts a real candle shadow.
- Known open issue, do NOT fix now: weak character floor reflection (legs reflect pale; cup and furnace reflect well).
- Light shafts only where the shot is dusty or smoky, aligned to their source. Atmosphere (haze, dust, rain, glow) where the story calls for it. Light follows the story arc: warm and bright toward deep night blue only where the story goes there; night darker than day.

## 6. Camera, cuts and motion
- Cuts every 2.5-3 s, every cut on a word (measured start). [C6] (The good-Short slide says 1.5-2 s shots; the locked 2.5-3 s rule wins. New framings inside a shot come from camera beats.)
- Camera beats [MIRO-STUDY]: ~56 moves/min, a new framing ~every 0.86 s, camera still only ~5 % of the time.
- Motion in every shot; no locked frame over ~1.5 s; the camera always drifts a little; nobody frozen. [C6]
- Camera ease ~23 f [R20]. Rolls 4-8 deg, reached over >= 18 f. KICKS are time-based (seconds), 7 f decay. There is no ease-out-burst grammar (deleted by the spec; never use it).
- Real motion blur on camera moves [START] strength (`LOOK.shutter 0.5`), verified on the motion draft. Depth of field: custom LensBlur via `dofAt(f)`, never BokehPass.
- Hook in the first 1-2 s, matching the first narration line.
- Faces never cut by the frame and never in the bottom 30 %. Captions never over a face.

## 7. Captions, sync, sound
- Captions (Rick spec, locked): sentence case, white, bold, rounded font, thick black outline, small, stable lower-third position, 1-3 words, normal gaps, punctuation kept, NO colour highlight, NO scale pop. [C6]
- A/V sync: measure word timings from the supplied WAV FIRST (`voice/words.json`); lock every cut and caption to them; verify at 5+ boundaries in the render.
- Continuous music bed >= 10 dB under the voice, ducked -3 dB under words; `silencedetect -30dB/0.3s` finds NO silence. Final audio -14 LUFS, true peak <= -1 dB. [C6]
- SFX cues land on on-screen actions (Cue objects, seconds).

## 8. The good-Short check (adapted from the method study, our spec wins)
Cuts on words (2.5-3 s here); captions Rick spec, lower-third, never over a face; faces never cut, never in the bottom 30 %; hands hold every prop visibly; nobody frozen, camera always drifts; light follows the story; 15-40 props per frame, no empty skies; a test still of EVERY shot before the full render.

## 9. Rick 17-rule update (delivered Nov 21)
STATUS: **PENDING** - the paste was not included in the build spec. Before step 1 of the next video, ask the user for the Nov 21 paste and write the 17 rules here, word for word, each with a label. Do not assume any of them is already in this skill.

## 10. Workflow facts
- Fresh session per video; `/clear` when starting a new task. Context degrades measurably from ~50k tokens.
- Facts go in the video's `CLAUDE.md` (short, specific); process lives in this skill. Secrets are blocked by `.claude/settings.json` deny rules, not by CLAUDE.md.
- Plan Mode only for skill architecture or changes across several parts; never for a render fix.
- Don't design the perfect skill on day 1: run the 10-second validation, fix the rule Claude still misses, then make Henry I as the first real video.
