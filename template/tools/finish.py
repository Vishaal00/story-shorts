"""finish.py: mux the silent render with public/mix.wav -> out/<name>.mp4.
AAC 320k, 48 kHz. Re-measures loudness on the delivered file.
Usage: python tools/finish.py out/final_silent.mp4 out/final.mp4
"""
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from audio_io import loudness  # noqa: E402

src, dst = sys.argv[1], sys.argv[2]
subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", src, "-i", "public/mix.wav", "-map", "0:v:0", "-map", "1:a:0",
                "-c:v", "copy", "-c:a", "aac", "-b:a", "320k", "-ar", "48000", "-shortest", "-movflags", "+faststart", dst], check=True)
I, TP = loudness(dst)
print(f"{dst}: {I:.2f} LUFS, TP {TP:.2f} dBTP")
