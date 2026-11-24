# story-shorts

A Claude Code skill that makes Ricks-style true-history story Shorts — vertical 9:16, narration-driven, one true story per video.

Built from scratch for the [History Nerd](https://www.youtube.com/@HistoryNerdClips) channel. History only. Never a copied Rick video, never a science fable.

## What it does

Given a true story and a narration WAV, the skill runs the full build in order:

1. **Study** — facts checked, visual study, 1–3 reference images for the hard subjects, setting brief that locks visual markers and anachronisms.
2. **Picture plan** — every named thing tied to an exact word, one action per beat, one planned stillness per film.
3. **Stills gate** — story + stills approved before any render. Detailed lived-in backgrounds (10+ counted things per room), directional light, real shadows, contact shadow under every grounded character.
4. **Low-res motion draft** — approved before the 2K render. No static frame over 1.5s.
5. **Final 2K render** — 1440×2560, 30fps, -14 LUFS / TP -1dB, continuous music bed ≥10dB under the voice, Rick-spec captions (sentence case, 1–3 words, lower-third, no pop).

Look: 2D cartoon characters in a 3D world, Vasa style. Remotion + three.js. No Blender, no AI video generators, no AI background images.

## Validation

A 300-frame 10-second test render passed 9/9 checks on 23 Nov 2026: format 1440×2560, render scale exact, caption sync 8/8, -14.2 LUFS / TP -1.4dB, no silence in pauses, music bed 14.7dB under voice, zero flicker, zero geometry intersections, 16–25 props per shot.

Caveat, stated plainly: the test used a test voice and a synthetic music bed, so it proves the pipeline works, not that the art is at Rick quality yet.

## Requirements

- Claude Code
- Node.js, ffmpeg, Remotion
- The [cartoon-3d-short](https://github.com/mromidev/claude-animated-shorts) skill by Mr omi (free, MIT) — this skill builds on its pipeline; install that first.

## Install

Copy this folder to your Claude Code skills folder and restart Claude Code:

```
~/.claude/skills/story-shorts
```

Then open a new session in a video project folder and describe the story. One folder per video. Supply the narration WAV — the skill uses it exactly as given and never re-generates the voice.

## Rules the skill enforces

- Facts stay true; every study finding is labelled SEEN, INFERRED or UNKNOWN.
- Captions use the script words, never Whisper mis-hearings.
- Image changes about every 3s, through soft transitions (whip-pan, dissolve, camera flight) — not hard cuts.
- Hook visual big and clear in the first 1–2 seconds, matching the first narration line. Final shot calls back to the opening.
- Max one documented quote per video, performed by the narrator.

## License

MIT. See [LICENSE](LICENSE).
