"""
tools/build_p3_audio.py
-----------------------
Synthesizes pleasant, distinct placeholder audio files for Story Page 3 ("Cozy Kitchen & Living Room")
into `public/assets/stories/nana/audio/` so `BootScene.ts` and `AudioBus.ts` preload with zero 404 errors
and every Page 3 gag plays distinct audio immediately (ready for tonight's ElevenLabs MP3 drop-in!).
"""

import math
import os
import shutil
import struct
import subprocess
import tempfile
import wave

AUDIO_DIR = os.path.join("public", "assets", "stories", "nana", "audio")
SR = 44100


def find_ffmpeg():
    ff = shutil.which("ffmpeg")
    if ff:
        return ff
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return None


def save_audio(filename: str, samples: list[float]):
    os.makedirs(AUDIO_DIR, exist_ok=True)
    out_path = os.path.join(AUDIO_DIR, filename)
    # Don't overwrite if a real large ElevenLabs MP3 (>60KB) was already dropped in
    if os.path.exists(out_path) and os.path.getsize(out_path) > 65000:
        print(f"  [skip] {filename} already exists ({os.path.getsize(out_path)} bytes)")
        return

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp_wav = tmp.name

    with wave.open(tmp_wav, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        clamped = [max(-0.98, min(0.98, s)) for s in samples]
        packed = struct.pack(f"<{len(clamped)}h", *[int(s * 32767) for s in clamped])
        wf.writeframes(packed)

    ffmpeg_bin = find_ffmpeg()
    if ffmpeg_bin:
        subprocess.run(
            [ffmpeg_bin, "-y", "-loglevel", "error", "-i", tmp_wav, "-codec:a", "libmp3lame", "-qscale:a", "4", out_path],
            check=True,
        )
        os.remove(tmp_wav)
        print(f"  [mp3] Generated {out_path} ({os.path.getsize(out_path)} bytes)")
    else:
        shutil.move(tmp_wav, out_path)
        print(f"  [wav->mp3] Generated {out_path} ({os.path.getsize(out_path)} bytes)")


def add_tone(buf: list[float], start_sec: float, dur_sec: float, f0: float, f1: float, vol: float = 0.35, wave_type: str = "sine"):
    i0 = int(start_sec * SR)
    n = int(dur_sec * SR)
    phase = 0.0
    for i in range(n):
        idx = i0 + i
        if idx >= len(buf):
            break
        t = i / max(1, n)
        freq = f0 + (f1 - f0) * t
        phase += 2.0 * math.pi * freq / SR
        if wave_type == "triangle":
            raw = 2.0 * abs(2.0 * ((phase / (2.0 * math.pi)) % 1.0) - 1.0) - 1.0
        elif wave_type == "square":
            raw = 1.0 if math.sin(phase) >= 0 else -1.0
        else:
            raw = math.sin(phase)
        env = math.sin(math.pi * t) ** 0.45 * ((1.0 - t) ** 0.6)
        buf[idx] += raw * vol * env


def add_noise(buf: list[float], start_sec: float, dur_sec: float, vol: float = 0.15):
    import random
    rng = random.Random(42)
    i0 = int(start_sec * SR)
    n = int(dur_sec * SR)
    prev = 0.0
    for i in range(n):
        idx = i0 + i
        if idx >= len(buf):
            break
        t = i / max(1, n)
        env = math.sin(math.pi * t)
        white = rng.uniform(-1.0, 1.0)
        prev = 0.75 * prev + 0.25 * white
        buf[idx] += prev * vol * env


def build_all():
    # 1. p3-narration.mp3 (~5.8s gentle music-box story cadence placeholder)
    dur = 5.8
    buf = [0.0] * int(dur * SR)
    notes = [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 783.99, 523.25]
    for i, f in enumerate(notes):
        add_tone(buf, 0.15 + i * 0.65, 0.55, f, f * 1.002, 0.18, "sine")
        add_tone(buf, 0.15 + i * 0.65, 0.35, f * 2, f * 2, 0.05, "triangle")
    save_audio("p3-narration.mp3", buf)

    # 2. sfx-doggie-clock-pull.mp3 (Doggie bark + clock chain tug/winding gears + boing)
    buf = [0.0] * int(1.85 * SR)
    # Bark #1 & #2
    add_tone(buf, 0.04, 0.11, 580, 1180, 0.38, "triangle")
    add_tone(buf, 0.16, 0.13, 640, 1320, 0.40, "triangle")
    # Chain ratchet clicks
    for c in range(7):
        add_tone(buf, 0.36 + c * 0.065, 0.04, 920 - c * 40, 380, 0.28, "square")
    # Spring boing release
    for b in range(5):
        add_tone(buf, 0.90 + b * 0.14, 0.14, 280 + b * 75, 680 + b * 60, 0.34, "sine")
    save_audio("sfx-doggie-clock-pull.mp3", buf)

    # 3. sfx-cuckoo-clock.mp3 (Cuckoo bird two-tone call + clock chimes)
    buf = [0.0] * int(1.9 * SR)
    # Spring pop
    add_tone(buf, 0.02, 0.10, 320, 740, 0.25, "triangle")
    # Cuck-oo #1
    add_tone(buf, 0.18, 0.18, 659.25, 659.25, 0.42, "sine")
    add_tone(buf, 0.42, 0.30, 523.25, 523.25, 0.42, "sine")
    # Cuck-oo #2
    add_tone(buf, 0.88, 0.18, 659.25, 659.25, 0.42, "sine")
    add_tone(buf, 1.12, 0.32, 523.25, 523.25, 0.42, "sine")
    # Brass chime shimmer
    add_tone(buf, 1.48, 0.35, 1046.5, 1318.5, 0.24, "sine")
    save_audio("sfx-cuckoo-clock.mp3", buf)

    # 4. sfx-baking-giggle.mp3 (Warm oven tray clink + Emma/Nana happy giggle)
    buf = [0.0] * int(1.75 * SR)
    # Tray clink
    add_tone(buf, 0.03, 0.14, 1180, 880, 0.26, "triangle")
    add_tone(buf, 0.12, 0.18, 1560, 1240, 0.22, "sine")
    # Playful giggle notes + heart chime
    for idx, f in enumerate([660, 780, 700, 880, 987.77, 1174.66]):
        add_tone(buf, 0.32 + idx * 0.15, 0.13, f, f * 1.14, 0.34, "sine")
    add_tone(buf, 1.25, 0.42, 1318.5, 1567.98, 0.28, "sine")
    save_audio("sfx-baking-giggle.mp3", buf)

    # 5. sfx-toy-train.mp3 (Wooden choo-choo whistle + chugging track clatter)
    buf = [0.0] * int(2.0 * SR)
    # Wooden two-tone train whistle "Choo-choo!"
    for w_start in (0.04, 0.42):
        add_tone(buf, w_start, 0.30, 440.0, 446.0, 0.30, "triangle")
        add_tone(buf, w_start, 0.30, 554.37, 560.0, 0.28, "triangle")
    # Chugga-chugga-chugga-chugga puff clatter
    for chug in range(8):
        t0 = 0.80 + chug * 0.13
        add_noise(buf, t0, 0.09, 0.32)
        add_tone(buf, t0, 0.07, 190, 120, 0.24, "triangle")
    save_audio("sfx-toy-train.mp3", buf)

    # 6. sfx-cookie-dragon.mp3 (Ceramic jar lid pop + magical dragon chirp & crunch)
    buf = [0.0] * int(1.8 * SR)
    # Ceramic lid pop
    add_tone(buf, 0.04, 0.11, 340, 780, 0.38, "sine")
    # Dragon chirp trill
    for idx, f in enumerate([523.25, 659.25, 783.99, 1046.5, 1318.5]):
        add_tone(buf, 0.22 + idx * 0.08, 0.11, f * 0.94, f * 1.06, 0.32, "triangle")
    # Cookie crunch-munch
    for cr in (0.82, 1.06, 1.28):
        add_noise(buf, cr, 0.13, 0.34)
        add_tone(buf, cr, 0.09, 420, 210, 0.25, "square")
    save_audio("sfx-cookie-dragon.mp3", buf)

    # 7. sfx-kettle-whistle.mp3 (Cheerful whistling teakettle steam)
    buf = [0.0] * int(1.85 * SR)
    # Rattle clatter
    for r in range(5):
        add_tone(buf, 0.03 + r * 0.07, 0.05, 680 + r * 60, 360, 0.25, "triangle")
    # Rising whistle + steam noise
    add_noise(buf, 0.40, 1.30, 0.18)
    add_tone(buf, 0.40, 0.65, 1080, 1520, 0.34, "sine")
    add_tone(buf, 1.05, 0.65, 1520, 1680, 0.34, "sine")
    save_audio("sfx-kettle-whistle.mp3", buf)

    # 8. sfx-tulip-bee.mp3 (Playful bumblebee buzz + sparkle chime)
    buf = [0.0] * int(1.75 * SR)
    # Bumblebee buzz flight loop
    for b in range(14):
        f_buzz = 195 + math.sin(b * 0.7) * 45
        add_tone(buf, 0.04 + b * 0.08, 0.085, f_buzz, f_buzz * 1.08, 0.24, "square")
    # Sparkle flower chime
    for idx, f in enumerate([783.99, 987.77, 1174.66, 1567.98]):
        add_tone(buf, 1.10 + idx * 0.11, 0.22, f, f * 1.01, 0.28, "sine")
    save_audio("sfx-tulip-bee.mp3", buf)


if __name__ == "__main__":
    print("=== Building Page 3 Audio Placeholders ===")
    build_all()
