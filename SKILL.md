---
name: story-shorts
description: Make one History Nerd (@HistoryNerdClips) true-history story Short - vertical 9:16, 2D cartoon cards in a 3D three.js world, Remotion, supplied conor narration WAV, Rick-spec captions, final 1440x2560 at -14 LUFS. Run only when the user types /story-shorts.
disable-model-invocation: true
---

# story-shorts

Input: one true history story + a narration WAV in the conor voice. Output, in order: study + directing brief -> story + stills (gate) -> low-res motion draft (gate) -> final 2K.

Guards (always):
- NEVER Blender, never make-short, never AI images or image-to-video. If a step would need one, STOP and say so.
- The supplied conor WAV is used exactly as supplied. Never re-generate the voice.
- Base engine = cartoon-3d-short rules + this skill. Remotion skills are helpers only; on conflict this skill wins.
- One video = one fresh session and one folder. Never continue an old video's session.
- Mark every claim about the story or a reference SEEN / INFERRED / UNKNOWN.
- When the user corrects an output or says they like one, ask: "Should this become a permanent rule in the skill?" If yes, write it into the right reference file.

## Steps

0. **Set up.** Read [INSTALL.md](INSTALL.md) and make the video folder. If [STYLE_BIBLE.md](STYLE_BIBLE.md) section "Rick 17-rule update" says PENDING, ask the user for the Nov 21 paste and write it in first.
1. **Study.** Read [STYLE_BIBLE.md](STYLE_BIBLE.md) sections 1-2. Study the story and its era, collect references for every hard subject and every character, log prompts and decisions, write `STUDY.md` (numbers only) and the directing brief.
2. **The Look (gate 1).** Read [STYLE_BIBLE.md](STYLE_BIBLE.md) sections 3-7 and [CODE_PATTERNS.md](CODE_PATTERNS.md). Measure words, write `story/story.json`, build places + cast, render character sheets and 3 stills. STOP. Offer the user 2-3 options. Nothing moves before a yes.
3. **Motion draft (gate 2).** Read [QA.md](QA.md) sections 1-3. Audit, half-res draft, critic loop to every score >= 8. STOP. Offer the user 2-3 options.
4. **Plateau.** If a score sits still for 3 rounds, run the director pass ([QA.md](QA.md) section 4).
5. **Final.** Read [QA.md](QA.md) section 5. Render 1440x2560, mix, run the 9 gates, deliver only at 9/9.
6. **Feedback.** Take user notes only as numbered, timestamped points with a frame ([QA.md](QA.md) section 6). Each point becomes a check that must pass.
