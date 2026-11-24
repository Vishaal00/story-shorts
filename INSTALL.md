# INSTALL - story-shorts

Read at step 0. The skill folder is `~/.claude/skills/story-shorts/`; the engine template is `template/`.

## Needs (checked 2026-11-23)
Node >= 20 with npm, Python 3.12 with numpy + faster-whisper (model `small.en` in the local cache), ffmpeg + ffprobe on PATH, a GPU for `--gl=angle`. Remotion downloads its Chrome Headless Shell on first render (~130 MB, once).

## New video (one folder per video, one fresh session per video)
1. Ask the user where videos live. Make `<videos>/<slug>/`. Never build inside the skill folder; never touch another video's folder.
2. Copy the template (everything except `node_modules`), then install:
   ```
   cp -r ~/.claude/skills/story-shorts/template/. <videos>/<slug>/
   cd <videos>/<slug> && npm install
   ```
   npm 11 may skip esbuild's install script; that is fine (the platform binary ships in `@esbuild/win32-x64`).
3. Fill `CLAUDE.md` (the facts block) and keep it under 40 lines. `.claude/settings.json` already denies reading `.env`, secrets and credentials (the Fish API key); keep secrets in `.env` only.
4. Copy the supplied conor WAV to `voice/narration.wav` (copy only; never edit, re-encode or re-generate it). Put the supplied music bed at `audio/music_bed.wav`.
5. Measure the words FIRST, aligned to the approved script text:
   ```
   python tools/words.py voice/narration.wav --script story/script.txt
   ```
6. Start the logs: every prompt word for word -> `_log/PROMPTS.md`; decisions -> `_log/DECISIONS.md`; keep `HANDOFF.md` current.

## Commands per step
| Step | Command |
|---|---|
| plan gates | `npx tsx tools/scene_audit.ts` |
| character sheet | `npx remotion still src/index.ts CharacterSheet stills/sheet_<id>.png --props="{\"who\":\"<id>\"}" --gl=angle` |
| test stills | `node tools/bridge-stills.mjs --scale 0.5` |
| sound | `python tools/timeline.py` (writes `public/mix.wav`, `audio/stems/`, `cues.md`) |
| motion draft | `npm run draft` then `python tools/finish.py out/draft_silent.mp4 out/draft.mp4` |
| final 2K | `npm run final` then `python tools/finish.py out/final_silent.mp4 out/final.mp4` |
| frame stats + flicker | `python tools/frame_stats.py out/final.mp4 --cuts <cuts from qa/plan.json>` (listing in QA.md section 3) |
| 9 gates | `python tools/validate.py out/final.mp4` |
| preview | `npm run studio` |

## Validation (run after any engine change, and once after install)
```
bash ~/.claude/skills/story-shorts/validation/run_validation.sh
```
Copies the template to `validation/run/`, makes a TEST voice (Windows speech, NOT conor) and a synthetic bed, measures words, builds a 10 s / 300-frame story on the measured words, audits, renders 1440x2560, mixes, and runs the 9 gates. It must print `9/9 PASS`. The result is in `validation/run/qa/VALIDATION.md`.
