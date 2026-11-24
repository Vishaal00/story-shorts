# QA - story-shorts

Read the section the step names. Every gate writes a file under `qa/` in the video folder; "done" means the file says PASS.

## 1. Plan gates (before any render) - `npx tsx tools/scene_audit.ts`
Runs on the SAME engine code as the render. Writes `qa/audit.txt`, `qa/plan.json`, `qa/intersections.txt`, `qa/props.txt`. Exit 1 on any FAIL. Gates:
- length <= 70 s (warn over 60 s); hook: first word in the first second, `hook` = first narration line
- shot lengths 2.5-3 s (last shot 1.5-3 s); every cut on a measured word start; place exists; rolls 4-8 deg
- one place per scene; zero intersections (actor vs solid, actor vs actor, camera inside a solid) -> `qa/intersections.txt` must read `intersections: 0`
- faces never cut by the frame, never in the bottom 30 %; 15-40 props in frame in every shot
- INFO: camera beats vs [MIRO-STUDY] targets (~56 moves/min, framing every ~0.86 s, still ~5 %)

## 2. Stills gate (step 2) - nothing moves before the user says yes
1. Per character: `npx remotion still src/index.ts CharacterSheet stills/sheet_<id>.png --props="{\"who\":\"<id>\"}" --gl=angle` (front, 3/4, side, 6 expressions, walk).
2. `node tools/bridge-stills.mjs --scale 0.5` -> one still per shot (test still of EVERY shot).
3. Pick 3 stills of different places; put each next to the closest study frame (side by side).
4. Show the user, with the reference table (which reference governs what; any subject built from the brief only). Offer 2-3 options (e.g. "A: as is", "B: warmer interior / fewer props", "C: different hook framing"). STOP.

## 3. Motion draft + critic (step 3)
1. `npm run draft` (half-res 540x960, muted) -> `python tools/finish.py out/draft_silent.mp4 out/draft.mp4`.
2. Critic frames at full res: `node tools/bridge-stills.mjs --scale 1.3333333333333333 --out _review/rounds/rNN/frames`.
3. Run `python tools/frame_stats.py out/draft.mp4 --cuts <qa/plan.json cuts>` -> `qa/flicker.txt` must read `flicker events: 0`.
4. The critic is a SEPARATE strict agent that has not seen the work (fresh subagent, brief = frames + study frames + this section only). It compares each frame to the closest study frame and scores 1-10: characters, motion, light, world, camera, captions. It FAILS any frame with: a face cut by the frame, a caption over a face, a prop not held, an empty background, a limb through a body.
5. Fix the WEAKEST category first, render again. Keep every round in `_review/rounds/rNN/` with `scores.md` (a table, one row per round). Loop until every score is >= 8. Then show the user the draft with 2-3 options. STOP.
6. Motion blur strength (`LOOK.shutter`, [START]) is judged on this draft.

### frame_stats.py (full listing; INSTALL.md and validate.py invoke it)
```python
"""frame_stats.py: per-frame numbers of a rendered video (every frame).

Writes qa/frame_stats.csv and qa/flicker.txt. Columns: frame, luma (0-255
mean, BT.709), std, edge (share of strong-gradient pixels), diff (mean abs
luma change vs previous frame), cap_white (share of near-white pixels in the
caption band 0.70-0.82 H), cap_change (XOR of that mask vs previous frame).
Flicker = a one-frame luma spike that returns (|d1|,|d2| > 3, opposite sign)
away from a cut. Usage: python tools/frame_stats.py out/final.mp4 [--cuts 0,78,..]
"""
import argparse
import subprocess
from pathlib import Path

import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument("video")
ap.add_argument("--cuts", default="")
ap.add_argument("--w", type=int, default=270)
a = ap.parse_args()
W, H = a.w, a.w * 16 // 9
cuts = {int(c) for c in a.cuts.split(",") if c.strip()}

p = subprocess.Popen(["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", a.video, "-vf", f"scale={W}:{H}:flags=area",
                      "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
rows, prev_l, prev_m = [], None, None
y0, y1 = int(0.70 * H), int(0.82 * H)
i = 0
while True:
    buf = p.stdout.read(W * H * 3)
    if len(buf) < W * H * 3:
        break
    f = np.frombuffer(buf, np.uint8).reshape(H, W, 3).astype(np.float32)
    lum = f @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    gx, gy = np.abs(np.diff(lum, axis=1))[:-1, :], np.abs(np.diff(lum, axis=0))[:, :-1]
    edge = float(((gx + gy) > 24).mean())
    band = f[y0:y1].min(axis=2) > 235
    diff = float(np.abs(lum - prev_l).mean()) if prev_l is not None else 0.0
    cap_change = float((band ^ prev_m).mean()) if prev_m is not None else float(band.mean())
    rows.append((i, float(lum.mean()), float(lum.std()), edge, diff, float(band.mean()), cap_change))
    prev_l, prev_m, i = lum, band, i + 1
p.wait()

Path("qa").mkdir(exist_ok=True)
with open("qa/frame_stats.csv", "w") as fh:
    fh.write("frame,luma,std,edge,diff,cap_white,cap_change\n")
    for r in rows:
        fh.write(",".join(f"{v:.5f}" if isinstance(v, float) else str(v) for v in r) + "\n")

L = np.array([r[1] for r in rows])
events = []
for k in range(1, len(L) - 1):
    d1, d2 = L[k] - L[k - 1], L[k + 1] - L[k]
    near_cut = any(abs(k - c) <= 1 for c in cuts)
    if abs(d1) > 3 and abs(d2) > 3 and np.sign(d1) != np.sign(d2) and not near_cut:
        events.append((k, round(float(d1), 2), round(float(d2), 2)))
Path("qa/flicker.txt").write_text(
    f"flicker events: {len(events)}\n" + "".join(f"frame {k}: {d1:+} then {d2:+}\n" for k, d1, d2 in events), encoding="utf-8")
print(f"{len(rows)} frames, flicker events {len(events)}")
```

## 4. Plateau / director pass (step 4)
If a score sits still for 3 rounds: do NOT render fast. Put our characters side by side with the study frames; list every object and detail they have that we do not; fix all of it; then render. Act as a director, not a critic: for every shot ask what makes it funnier, clearer, more alive (life in the background, acting between the lines, props in hands). If a score still does not move for 3 rounds, change the APPROACH, not the numbers, and write why in `_log/DECISIONS.md`. Keep going until the user says stop.

## 5. Final (step 5) - the 9 gates
```
npm run final                                   # 1440x2560, scale exactly 1.3333333333333333, muted
python tools/finish.py out/final_silent.mp4 out/final.mp4
python tools/frame_stats.py out/final.mp4 --cuts <cuts from qa/plan.json>
python tools/validate.py out/final.mp4          # -> qa/VALIDATION.md, exit 0 only at 9/9
```
| # | Gate | Pass |
|---|---|---|
| 1 | FORMAT | 1440x2560, 30 fps, frames = story length, scale exactly 4/3 |
| 2 | SYNC | caption changes in the video on measured word starts (+-1 f) at >= 5 boundaries and >= 80 %; cuts on word starts |
| 3 | LOUDNESS | -14 LUFS +-0.5, true peak <= -1.0 dBTP |
| 4 | SILENCE | `silencedetect -30dB / 0.3 s` finds none |
| 5 | BED | music bed >= 10 dB under voice (stems) |
| 6 | MOTION | no near-still run >= 45 f (1.5 s); shot lengths pass |
| 7 | FLICKER | `qa/flicker.txt` = 0 events |
| 8 | GEOMETRY | audit: 0 intersections, faces placed, 15-40 props |
| 9 | LOOK | detail in every frame (edge share >= 0.02, luma std >= 18), char cap below glow trigger, warm interiors mean luma 75-100 |
Deliver only at 9/9. Report the table to the user.

## 6. Feedback (step 6)
User notes must be numbered points, each with its time in the video and a frame as proof (`ffmpeg -ss <t> -i out/final.mp4 -frames:v 1 _review/notes/NN.png`). Each point becomes a check in `_review/CHECKS.md` that must pass before the next delivery. For faces, measure against the fixed proportions (eye size, eye distance 0.26 head-widths, mouth height) instead of nudging. "Make it better" is not a check: ask for the timestamped point.
When the user corrects an output or says they like one, ask: "Should this become a permanent rule in the skill?" If yes, write it into STYLE_BIBLE.md / CODE_PATTERNS.md / QA.md with a label, and log it in `_log/DECISIONS.md`.
