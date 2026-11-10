#!/usr/bin/env python3
"""
CrossOver Promo — Audio Production — LAC-309
Generates a 35s procedural electronic/lo-fi beat with:
  - Drop at Hook (0s)
  - Steady uptempo body (3-25s)
  - Swell at Proof Beat (25-34s)
  - Fade-out at CTA (34-35s)

Then mixes audio into all three draft videos.
"""
import numpy as np
import subprocess
import sys
from pathlib import Path
import wave
import struct

SR   = 44100
DUR  = 35.0
BPM  = 128
BEAT = 60 / BPM      # 0.469s per beat
N    = int(SR * DUR)

OUT  = Path("/Users/lacy/repo/crossover/docs/video")
TMP  = Path("/tmp/xover-audio")
TMP.mkdir(parents=True, exist_ok=True)

# ── Synthesis helpers ──────────────────────────────────────────────────────────

def t_arr(duration):
    return np.linspace(0, duration, int(SR * duration), endpoint=False)

def sine(freq, dur, amp=1.0):
    t = t_arr(dur)
    return (np.sin(2 * np.pi * freq * t) * amp).astype(np.float32)

def noise(dur, amp=1.0):
    return (np.random.randn(int(SR * dur)) * amp).astype(np.float32)

def env(sig, attack=0.002, decay=0.05, sustain=0.3, release=0.08):
    n = len(sig)
    a = int(SR * attack)
    d = int(SR * decay)
    r = int(SR * release)
    s_len = max(0, n - a - d - r)
    env_arr = np.concatenate([
        np.linspace(0, 1, a),
        np.linspace(1, sustain, d),
        np.full(s_len, sustain),
        np.linspace(sustain, 0, r),
    ]).astype(np.float32)
    env_arr = env_arr[:n]
    return sig[:len(env_arr)] * env_arr

def place(buf, sig, sample_pos):
    start = int(sample_pos)
    end   = start + len(sig)
    if start >= len(buf): return
    if end > len(buf):
        sig = sig[:len(buf) - start]
        end = len(buf)
    buf[start:end] += sig

# ── Drum sounds ───────────────────────────────────────────────────────────────

def kick(dur=0.28, amp=0.85):
    t = t_arr(dur)
    freq = 60 * np.exp(-t * 22)          # pitch sweep 60→~5 Hz
    sig = np.sin(2 * np.pi * np.cumsum(freq) / SR) * amp
    click = noise(0.004, 0.15)
    click_padded = np.zeros(len(sig))
    click_padded[:len(click)] += click
    sig = sig + click_padded
    return env(sig.astype(np.float32), attack=0.001, decay=0.18, sustain=0.0, release=0.08)

def snare(dur=0.18, amp=0.45):
    t = t_arr(dur)
    tone = np.sin(2 * np.pi * 200 * t) * 0.3
    snap = noise(dur, amp)
    sig = (tone + snap).astype(np.float32)
    return env(sig, attack=0.002, decay=0.06, sustain=0.1, release=0.09)

def hihat(dur=0.06, amp=0.22, open_=False):
    sig = noise(dur, amp)
    if open_:
        return env(sig, attack=0.001, decay=0.04, sustain=0.4, release=0.04)
    return env(sig, attack=0.001, decay=0.015, sustain=0.0, release=0.02)

def clap(dur=0.12, amp=0.35):
    sig = noise(dur, amp * 1.2)
    # slight room reverb feel — two fast repeats
    out = np.zeros(int(SR * 0.18), dtype=np.float32)
    out[:len(sig)] += sig
    delay = int(0.012 * SR)
    out[delay:delay+len(sig)] += sig * 0.5
    return env(out, attack=0.001, decay=0.05, sustain=0.1, release=0.06)

# ── Bass synth ─────────────────────────────────────────────────────────────────

def bass_hit(freq=55, dur=0.35, amp=0.5):
    t = t_arr(dur)
    # saw wave (harmonics) with low-pass feel
    sig = np.zeros(len(t), dtype=np.float32)
    for h in range(1, 6):
        sig += np.sin(2 * np.pi * freq * h * t) / h
    sig = sig * amp
    return env(sig, attack=0.004, decay=0.12, sustain=0.4, release=0.1)

# ── Synth pad swell ────────────────────────────────────────────────────────────

def pad_swell(dur=9.0, amp=0.35):
    t = t_arr(dur)
    freqs = [110, 138.6, 165, 220]  # A2 chord-ish
    sig = np.zeros(len(t), dtype=np.float32)
    for i, f in enumerate(freqs):
        phase_off = i * 0.25
        lfo = 1 + 0.003 * np.sin(2 * np.pi * 0.5 * t + phase_off)
        sig += np.sin(2 * np.pi * f * t * lfo) * (amp / len(freqs))
    # amplitude envelope: slow fade-in over 3s, hold, slight fade out
    attack_n = int(3.0 * SR)
    env_arr = np.ones(len(t), dtype=np.float32)
    env_arr[:attack_n] = np.linspace(0, 1, attack_n)
    env_arr[-int(1.0*SR):] = np.linspace(1, 0, int(1.0*SR))
    return sig * env_arr

# ── Rise FX (white-noise pitch rise going into Hook) ──────────────────────────

def riser(dur=0.5, amp=0.18):
    t = t_arr(dur)
    sig = noise(dur, amp)
    # high-pass feel: multiply by rising freq sine
    freq_rise = np.linspace(400, 8000, len(t))
    sig *= np.sin(2 * np.pi * np.cumsum(freq_rise) / SR) * 0.5 + 0.5
    env_arr = np.linspace(0, 1, len(t)).astype(np.float32)
    return (sig * env_arr).astype(np.float32)

# ── Build the track ────────────────────────────────────────────────────────────

buf = np.zeros(N, dtype=np.float32)

B = BEAT          # one beat = 0.469s at 128 BPM
H = B / 2         # half-beat
Q = B / 4         # quarter-beat

# Section timing (in seconds)
SEC_HOOK  = 0.0
SEC_BODY  = 3.0
SEC_PROOF = 25.0
SEC_CTA   = 34.0

# ── Pre-roll riser (0 → 0.5s) ──────────────────────────────────────────────────
place(buf, riser(0.5, 0.18), 0)

# ── HOOK  (0 – 3s):  hard kick on every beat, open hats, bass ─────────────────
t = SEC_HOOK
while t < SEC_BODY:
    place(buf, kick(),    t * SR)
    place(buf, bass_hit(55, 0.28), t * SR)
    place(buf, hihat(open_=False), (t + H) * SR)
    place(buf, hihat(open_=True,  amp=0.18), (t + H * 1.7) * SR)
    t += B

# Snare/clap on beats 2 & 4 (offset by 2 beats into hook)
t = SEC_HOOK + B
while t < SEC_BODY:
    place(buf, clap(), t * SR)
    t += 2 * B

# ── BODY  (3 – 25s):  full pattern ────────────────────────────────────────────
t = SEC_BODY
while t < SEC_PROOF:
    place(buf, kick(),              t * SR)
    place(buf, kick(amp=0.5),      (t + H + Q) * SR)   # ghost kick
    place(buf, hihat(amp=0.20),    (t + H) * SR)
    place(buf, hihat(amp=0.16),    (t + Q) * SR)
    place(buf, hihat(amp=0.14),    (t + H + Q) * SR)
    # bass
    place(buf, bass_hit(55,  0.4), t * SR)
    place(buf, bass_hit(41,  0.3), (t + H) * SR)
    t += B

# Snare/clap beats 2 & 4
t = SEC_BODY + B
while t < SEC_PROOF:
    place(buf, clap(), t * SR)
    t += 2 * B

# ── PROOF BEAT swell  (25 – 34s) ───────────────────────────────────────────────
swell_sig = pad_swell(dur=9.0, amp=0.40)
place(buf, swell_sig, SEC_PROOF * SR)

# Keep beat rolling but slightly reduced during proof section
t = SEC_PROOF
while t < SEC_CTA:
    place(buf, kick(amp=0.6),     t * SR)
    place(buf, hihat(amp=0.14),   (t + H) * SR)
    place(buf, bass_hit(55, 0.35), t * SR)
    t += B

t = SEC_PROOF + B
while t < SEC_CTA:
    place(buf, clap(amp=0.25), t * SR)
    t += 2 * B

# ── CTA  (34 – 35s):  fade out ────────────────────────────────────────────────
cta_start = int(SEC_CTA * SR)
fade_n = N - cta_start
if fade_n > 0:
    fade = np.linspace(1, 0, fade_n).astype(np.float32)
    buf[cta_start:] *= fade

# ── Master limiter / normalize ─────────────────────────────────────────────────
peak = np.max(np.abs(buf))
if peak > 0:
    buf = buf / peak * 0.82   # headroom

# ── Write WAV ─────────────────────────────────────────────────────────────────
wav_path = TMP / "crossover-beat.wav"
with wave.open(str(wav_path), 'w') as wf:
    wf.setnchannels(1)
    wf.setsampwidth(2)
    wf.setframerate(SR)
    pcm = (buf * 32767).astype(np.int16)
    wf.writeframes(pcm.tobytes())
print(f"  ✓ Audio generated: {wav_path}  ({DUR:.0f}s mono 44.1kHz)")

# ── Mix audio into each video ──────────────────────────────────────────────────
def ff(*args):
    cmd = ["ffmpeg", "-y"] + [str(a) for a in args]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print("ERR:", r.stderr[-1500:], file=sys.stderr)
        raise RuntimeError(f"ffmpeg failed: {' '.join(cmd[:6])}")
    return r

drafts = [
    ("crossover-promo-9x16-draft.mp4",  "crossover-promo-9x16-final.mp4"),
    ("crossover-promo-16x9-draft.mp4",  "crossover-promo-16x9-final.mp4"),
    ("crossover-promo-1x1-draft.mp4",   "crossover-promo-1x1-final.mp4"),
]

for src_name, dst_name in drafts:
    src = OUT / src_name
    dst = OUT / dst_name
    print(f"Mixing audio → {dst_name}...")
    ff(
        "-i", src,
        "-i", wav_path,
        "-c:v", "copy",
        "-c:a", "aac", "-b:a", "192k",
        "-shortest",
        "-map", "0:v:0", "-map", "1:a:0",
        dst,
    )
    print(f"  ✓ {dst_name}")

print("\n" + "═" * 60)
print("Audio mix complete — final outputs:")
print("═" * 60)
for _, dst_name in drafts:
    dst = OUT / dst_name
    r = subprocess.run(
        ["ffprobe", "-v", "quiet", "-show_entries", "format=duration,size",
         "-of", "csv=p=0", str(dst)],
        capture_output=True, text=True
    )
    parts = r.stdout.strip().split(",") if r.stdout.strip() else ["?", "?"]
    dur = float(parts[0]) if parts[0] != "?" else 0
    sz  = int(parts[1]) // 1024 if len(parts) > 1 and parts[1] != "?" else 0
    print(f"  {dst_name:<45}  {dur:.1f}s  {sz}KB")
print()
