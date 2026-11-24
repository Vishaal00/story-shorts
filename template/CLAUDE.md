# <Video title> - History Nerd story Short

Process lives in the story-shorts skill (run /story-shorts). This file holds FACTS only.

## Facts
- Channel: History Nerd (@HistoryNerdClips). True history only. One story, this folder only.
- Voice: conor, `voice/narration.wav` exactly as supplied. Never re-generate, trim or speed it.
- Words: `voice/words.json` is measured from that WAV (`python tools/words.py ... --script story/script.txt`). Every cut and caption is locked to it.
- Length: narration under 60 s ideal, 1:10 max.
- Final: 1440x2560, render scale exactly 1.3333333333333333, 30 fps.
- Audio: -14 LUFS, true peak <= -1 dB; continuous bed >= 10 dB under voice; silencedetect -30dB/0.3s finds no silence.
- Captions: sentence case, white bold rounded, thick black outline, small, lower third, 1-3 words, punctuation kept, no colour, no pop.
- Engine: Remotion + three.js (template from story-shorts). NEVER Blender, never AI images or image-to-video.
- Light: day lit [1.42,1.35,1.2] shade [.26,.25,.33] sat 1.0 [VALIDATED 2026-11-17]; LIGHTS day/golden only.

## Before you say "done"
- Run `npx tsx tools/scene_audit.ts` and read `qa/audit.txt` (0 FAIL).
- Run `python tools/validate.py out/final.mp4` and paste the 9-row table (9/9 PASS).
- Update `HANDOFF.md` and `_log/DECISIONS.md`.

## Story facts (fill at step 1; label SEEN / INFERRED / UNKNOWN)
- Who:
- When / where:
- Hook line (= first narration line):
- The one documented quote (or none) + source:
