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
