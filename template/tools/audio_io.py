"""audio_io.py: tiny WAV + loudness helpers (numpy + ffmpeg only)."""
import json
import re
import subprocess
import wave

import numpy as np


def read_wav(path):
    with wave.open(str(path), "rb") as w:
        sr, ch, sw, n = w.getframerate(), w.getnchannels(), w.getsampwidth(), w.getnframes()
        raw = w.readframes(n)
    if sw == 2:
        x = np.frombuffer(raw, dtype="<i2").astype(np.float32) / 32768.0
    elif sw == 4:
        x = np.frombuffer(raw, dtype="<i4").astype(np.float32) / 2147483648.0
    elif sw == 3:
        b = np.frombuffer(raw, dtype=np.uint8).reshape(-1, 3)
        x = ((b[:, 0].astype(np.int32) | (b[:, 1].astype(np.int32) << 8) | (b[:, 2].astype(np.int32) << 16)) << 8 >> 8).astype(np.float32) / 8388608.0
    else:
        raise ValueError(f"unsupported sample width {sw}")
    x = x.reshape(-1, ch)
    return x, sr


def write_wav(path, x, sr):
    x = np.clip(np.asarray(x, dtype=np.float32), -1, 1)
    if x.ndim == 1:
        x = x[:, None]
    with wave.open(str(path), "wb") as w:
        w.setnchannels(x.shape[1]); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes((x * 32767).astype("<i2").tobytes())


def to_stereo(x):
    return np.repeat(x, 2, axis=1) if x.shape[1] == 1 else x[:, :2]


def resample(x, sr, to):
    if sr == to:
        return x
    n = int(round(len(x) * to / sr))
    t_old = np.linspace(0, 1, len(x), endpoint=False)
    t_new = np.linspace(0, 1, n, endpoint=False)
    return np.stack([np.interp(t_new, t_old, x[:, c]) for c in range(x.shape[1])], axis=1).astype(np.float32)


def loudness(path):
    """Integrated LUFS and true peak (dBTP) via ffmpeg ebur128."""
    p = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-af", "ebur128=peak=true", "-f", "null", "-"],
                       capture_output=True, text=True)
    s = p.stderr
    i = re.findall(r"I:\s+(-?[\d.]+|-inf) LUFS", s)
    tp = re.findall(r"Peak:\s+(-?[\d.]+|-inf) dBFS", s)
    f = lambda v: float("-inf") if v == "-inf" else float(v)
    return f(i[-1]) if i else float("-inf"), f(tp[-1]) if tp else float("-inf")


def silences(path, db=-30, d=0.3):
    p = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-af", f"silencedetect=noise={db}dB:d={d}", "-f", "null", "-"],
                       capture_output=True, text=True)
    return re.findall(r"silence_start: (-?[\d.]+)", p.stderr)


def loudnorm(src, dst, target=-14.0, tp=-1.0, tries=10):
    """Gain to target LUFS + oversampled peak limiter (true peak <= tp).
    Iterates because limiting lowers loudness a little. Returns (I, TP)."""
    gain = 0.0
    I0, _ = loudness(src)
    gain = target - I0
    for _ in range(tries):
        af = (f"volume={gain:.3f}dB,aresample=192000,"
              f"alimiter=limit={10 ** ((tp - 0.6) / 20):.4f}:attack=2:release=60:level=false,aresample=48000")
        subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(src), "-af", af, "-c:a", "pcm_s16le", str(dst)], check=True)
        I, TP = loudness(dst)
        if abs(I - target) <= 0.15 and TP <= tp:
            break
        gain += target - I
    return I, TP
