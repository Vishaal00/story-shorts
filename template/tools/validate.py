"""validate.py: the 9 render gates on a delivered video. Writes qa/VALIDATION.md.

 1 FORMAT    1440x2560, 30 fps, frame count = story length, scale exactly 4/3
 2 SYNC      caption changes seen in the video land on measured word starts
             (+-1 f) at >= 5 boundaries; every cut is on a word start
 3 LOUDNESS  -14 LUFS (+-0.5), true peak <= -1.0 dBTP
 4 SILENCE   silencedetect -30 dB / 0.3 s finds NO silence
 5 BED       music bed >= 10 dB under the voice (stems)
 6 MOTION    no locked frame run over 1.5 s (45 f); shots 2.5-3 s (audit)
 7 FLICKER   qa/flicker.txt has 0 events
 8 GEOMETRY  qa/audit.txt PASS: 0 intersections, faces in frame and above the
             bottom 30 %, 15-40 props per shot
 9 LOOK      every frame has detail (no flat colour), characters stay below
             the glow trigger (audit/plan), warm interior shots mean luma 75-100
Usage: python tools/validate.py out/final.mp4 [--expect-w 1440 --expect-h 2560]
Run tools/frame_stats.py first (it writes qa/frame_stats.csv and qa/flicker.txt).
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from audio_io import loudness, silences  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument("video")
ap.add_argument("--expect-w", type=int, default=1440)
ap.add_argument("--expect-h", type=int, default=2560)
a = ap.parse_args()

story = json.loads(Path("story/story.json").read_text(encoding="utf-8"))
plan = json.loads(Path("qa/plan.json").read_text(encoding="utf-8"))
rows = np.loadtxt("qa/frame_stats.csv", delimiter=",", skiprows=1)
fps = 30
res = []


def gate(name, ok, detail):
    res.append((name, bool(ok), detail))


# 1 FORMAT
pr = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_frames", "-show_entries",
                     "stream=width,height,r_frame_rate,nb_read_frames", "-of", "json", a.video], capture_output=True, text=True)
st = json.loads(pr.stdout)["streams"][0]
w, h, nf = st["width"], st["height"], int(st["nb_read_frames"])
num, den = map(int, st["r_frame_rate"].split("/"))
expect_n = round(story["durationSec"] * fps)
scale = w / 1080
gate("FORMAT", (w, h) == (a.expect_w, a.expect_h) and num / den == 30 and nf == expect_n,
     f"{w}x{h}, {num / den:g} fps, {nf} frames (expect {a.expect_w}x{a.expect_h}, 30, {expect_n}); scale {scale!r}")

# 2 SYNC: detect caption on/changes from the caption band, compare to plan
chg = rows[:, 6]
cuts = set(plan["cuts"])
detected = [int(rows[i, 0]) for i in range(len(rows)) if chg[i] > 0.004 and int(rows[i, 0]) not in cuts]
expected = [c["f"] for c in plan["captions"] if c["f"] not in cuts and c["f"] < nf]
hits = [e for e in expected if any(abs(d - e) <= 1 for d in detected)]
cut_on_word = all(c == 0 or c in plan["wordStarts"] for c in plan["cuts"])
gate("SYNC", len(hits) >= 5 and len(hits) >= 0.8 * len(expected) and cut_on_word,
     f"{len(hits)}/{len(expected)} caption boundaries matched within 1 f (need >= 5 and >= 80 %); cuts on word starts: {cut_on_word}")

# 3 LOUDNESS
I, TP = loudness(a.video)
gate("LOUDNESS", abs(I + 14) <= 0.5 and TP <= -1.0, f"{I:.2f} LUFS, TP {TP:.2f} dBTP (target -14 / <= -1)")

# 4 SILENCE
s = silences(a.video)
gate("SILENCE", len(s) == 0, f"silencedetect -30dB/0.3s found {len(s)} silences {s[:5]}")

# 5 BED
lv, _ = loudness("audio/stems/voice.wav")
lb, _ = loudness("audio/stems/bed.wav")
gate("BED", lv - lb >= 10, f"voice {lv:.1f} LUFS, bed {lb:.1f} LUFS, under by {lv - lb:.1f} dB (>= 10)")

# 6 MOTION
diff = rows[:, 4]
run = best = 0
for i in range(1, len(diff)):
    run = run + 1 if diff[i] < 0.15 else 0
    best = max(best, run)
audit = Path("qa/audit.txt").read_text(encoding="utf-8")
shots_ok = all("PASS" in ln for ln in audit.splitlines() if "length" in ln and ln.startswith(("PASS", "FAIL")) and "shot" in ln)
gate("MOTION", best < 45 and shots_ok, f"longest near-still run {best} f (< 45 = 1.5 s); shot lengths 2.5-3 s: {shots_ok}")

# 7 FLICKER
fl = Path("qa/flicker.txt").read_text(encoding="utf-8").splitlines()[0]
gate("FLICKER", fl.strip() == "flicker events: 0", fl)

# 8 GEOMETRY
geo_lines = [ln for ln in audit.splitlines() if any(k in ln for k in ("intersections", "faces", "props in frame"))]
gate("GEOMETRY", all(ln.startswith("PASS") for ln in geo_lines) and geo_lines, f"{len(geo_lines)} geometry gates: " + "; ".join(ln[6:60] for ln in geo_lines[:3]))

# 9 LOOK
edge, luma = rows[:, 3], rows[:, 1]
interior = [i for sh_i, sh in enumerate(story["shots"]) if sh["place"] in story.get("warmInteriors", [])
            for i in range(plan["cuts"][sh_i], plan["cuts"][sh_i + 1] if sh_i + 1 < len(plan["cuts"]) else nf)]
int_mean = float(np.mean(luma[interior])) if interior else float("nan")
import re
lt = Path("src/engine/lights.ts").read_text(encoding="utf-8")
cap = float(re.search(r"charCap:\s*([\d.]+)", lt).group(1)); glow = float(re.search(r"bloomThreshold:\s*([\d.]+)", lt).group(1))
look_ok = cap < glow and edge.min() >= 0.02 and rows[:, 2].min() >= 18 and (not interior or 75 <= int_mean <= 100)
gate("LOOK", look_ok, f"char cap {cap} < glow trigger {glow}; edge share min {edge.min():.3f} (>= 0.02), luma std min {rows[:, 2].min():.1f} (>= 18, no flat colour), "
     f"warm interior mean luma {int_mean:.1f} (75-100, aim 80+)")

passed = sum(ok for _, ok, _ in res)
out = ["# VALIDATION", "", f"video: `{a.video}`", "", "| # | gate | result | numbers |", "|---|---|---|---|"]
out += [f"| {i + 1} | {n} | {'PASS' if ok else 'FAIL'} | {d} |" for i, (n, ok, d) in enumerate(res)]
out += ["", f"**{passed}/{len(res)} PASS**"]
Path("qa/VALIDATION.md").write_text("\n".join(out) + "\n", encoding="utf-8")
print("\n".join(out))
sys.exit(0 if passed == len(res) else 1)
