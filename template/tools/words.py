"""words.py: MEASURE word timings from the supplied narration WAV.

The supplied conor WAV is used exactly as supplied: this script only READS
it. Never re-generate, re-voice, speed up, trim or tighten the voice.
Output: voice/words.json  [{"w": "In", "s": 0.12, "e": 0.31}, ...]
Usage:  python tools/words.py voice/narration.wav [--model small.en]
"""
import argparse
import json
import subprocess
from pathlib import Path

import numpy as np

from faster_whisper import WhisperModel

ap = argparse.ArgumentParser()
ap.add_argument("wav", nargs="?", default="voice/narration.wav")
ap.add_argument("--model", default="small.en")
ap.add_argument("--out", default="voice/words.json")
ap.add_argument("--script", default="", help="approved script text; its words replace the transcript words 1:1 when the counts match")
a = ap.parse_args()

model = WhisperModel(a.model, device="cpu", compute_type="int8")
# decode with ffmpeg (avoids PyAV version clashes); the WAV file itself is never changed
pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", a.wav, "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True, check=True).stdout
audio = np.frombuffer(pcm, np.float32)
segs, info = model.transcribe(audio, word_timestamps=True, language="en", vad_filter=False, beam_size=5)
words = []
for s in segs:
    for w in s.words:
        t = w.word.strip()
        if t:
            words.append({"w": t, "s": round(w.start, 3), "e": round(w.end, 3)})
if a.script and Path(a.script).exists():
    sw = Path(a.script).read_text(encoding="utf-8").split()
    if len(sw) == len(words):
        for w, t in zip(words, sw):
            w["w"] = t
        print("script text applied (timings stay measured)")
    else:
        print(f"WARNING: script has {len(sw)} words, transcript {len(words)}; captions use the transcript - check numbers/names")
Path(a.out).write_text(json.dumps(words, indent=1), encoding="utf-8")
print(f"{len(words)} words, voice {info.duration:.2f}s -> {a.out}")
print(" ".join(f"[{i}]{w['w']}@{w['s']:.2f}" for i, w in enumerate(words)))
