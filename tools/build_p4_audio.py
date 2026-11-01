"""
tools/build_p4_audio.py
-----------------------
Synthesizes pleasant, distinct placeholder audio files for Story Page 4 ("Nana's Convertible in the Garage!")
into `public/assets/stories/nana/audio/` so `BootScene.ts` and `AudioBus.ts` preload with zero 404 errors
and every Page 4 gag plays distinct audio immediately (ready for ElevenLabs MP3 drop-in!).
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
    # 1. p4-narration.mp3 (~6.2s warm story cadence placeholder)
    dur = 6.2
    buf = [0.0] * int(dur * SR)
    notes = [523.25, 587.33, 659.25, 783.99, 659.25, 783.99, 880.0, 1046.5]
    for i, f in enumerate(notes):
        add_tone(buf, 0.12 + i * 0.72, 0.55, f, f * 1.002, 0.18, "sine")
        add_tone(buf, 0.12 + i * 0.72, 0.35, f * 2, f * 2, 0.05, "triangle")
    save_audio("p4-narration.mp3", buf)

    # 2. sfx-car-horn-rev.mp3 (Classic British roadster double horn beep-beep + revving engine + kids cheering)
    buf = [0.0] * int(2.0 * SR)
    for b_start in (0.04, 0.28):
        add_tone(buf, b_start, 0.18, 440.0, 440.0, 0.36, "triangle")
        add_tone(buf, b_start, 0.18, 554.37, 554.37, 0.34, "triangle")
    # Engine rev
    add_tone(buf, 0.55, 0.55, 110.0, 260.0, 0.30, "square")
    add_tone(buf, 1.10, 0.45, 260.0, 140.0, 0.25, "triangle")
    # Cheerful kids arpeggio
    for i, f in enumerate([587.33, 739.99, 880.0, 1174.66]):
        add_tone(buf, 1.25 + i * 0.12, 0.20, f, f * 1.05, 0.28, "sine")
    save_audio("sfx-car-horn-rev.mp3", buf)

    # 3. sfx-polish-keys.mp3 (Squeaky-clean fender polish buff + jingling car keys + sparkle chime)
    buf = [0.0] * int(1.85 * SR)
    # Squeaky polish rub
    for r in range(4):
        add_tone(buf, 0.05 + r * 0.18, 0.14, 720, 1280, 0.26, "sine")
    # Jingling metallic keys
    for k in range(7):
        add_tone(buf, 0.78 + k * 0.07, 0.06, 2200 + (k % 3) * 450, 2800, 0.22, "triangle")
    # Sparkle chord
    for i, f in enumerate([783.99, 987.77, 1318.5, 1567.98]):
        add_tone(buf, 1.28 + i * 0.10, 0.25, f, f, 0.26, "sine")
    save_audio("sfx-polish-keys.mp3", buf)

    # 4. sfx-leaf-blower.mp3 (Funny revving leaf blower whoosh + swirling dry leaves)
    buf = [0.0] * int(2.1 * SR)
    add_tone(buf, 0.04, 0.55, 140, 340, 0.26, "triangle")
    add_tone(buf, 0.59, 0.85, 340, 380, 0.24, "triangle")
    add_noise(buf, 0.25, 1.65, 0.36)
    add_tone(buf, 1.44, 0.50, 380, 150, 0.22, "triangle")
    save_audio("sfx-leaf-blower.mp3", buf)

    # 5. sfx-sparky-wrench.mp3 (Wooden cabinet door creak + cute baby dragon chirp + metallic wrench clink)
    buf = [0.0] * int(1.85 * SR)
    add_tone(buf, 0.04, 0.26, 240, 390, 0.28, "triangle")
    for i, f in enumerate([587.33, 783.99, 987.77, 1174.66]):
        add_tone(buf, 0.35 + i * 0.10, 0.14, f * 0.95, f * 1.08, 0.32, "sine")
    add_tone(buf, 0.88, 0.18, 1680, 1640, 0.34, "triangle")
    add_tone(buf, 1.12, 0.25, 2120, 2080, 0.30, "sine")
    save_audio("sfx-sparky-wrench.mp3", buf)

    # 6. sfx-wall-oven-ding.mp3 (Vintage kitchen timer DING! + playful juggling boing)
    buf = [0.0] * int(1.8 * SR)
    add_tone(buf, 0.03, 0.55, 1567.98, 1567.98, 0.42, "sine")
    add_tone(buf, 0.03, 0.35, 3135.96, 3135.96, 0.18, "triangle")
    for b in range(4):
        add_tone(buf, 0.52 + b * 0.26, 0.22, 320 + b * 60, 740 + b * 80, 0.32, "sine")
    save_audio("sfx-wall-oven-ding.mp3", buf)

    # 7. sfx-air-compressor.mp3 (Chugging air compressor rattle + funny cartoon steam-whistle pop)
    buf = [0.0] * int(1.9 * SR)
    for c in range(7):
        add_tone(buf, 0.04 + c * 0.12, 0.09, 130 + c * 15, 95, 0.34, "square")
    add_noise(buf, 0.92, 0.75, 0.35)
    add_tone(buf, 0.92, 0.65, 680, 1480, 0.34, "sine")
    save_audio("sfx-air-compressor.mp3", buf)

    # 8. sfx-wreath-bird.mp3 (Rustling leaves + cheerful bluebird tweet-tweet)
    buf = [0.0] * int(1.75 * SR)
    add_noise(buf, 0.03, 0.32, 0.22)
    for i, (f0, f1) in enumerate([(1180, 1680), (1320, 1880), (1180, 1760), (1480, 2040)]):
        add_tone(buf, 0.34 + i * 0.28, 0.20, f0, f1, 0.34, "sine")
    save_audio("sfx-wreath-bird.mp3", buf)

    # 9. sfx-hutch-xylophone.mp3 (Playful tin-can & glass-bottle xylophone boogie run)
    buf = [0.0] * int(1.85 * SR)
    scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 880.0, 1046.5]
    for i, f in enumerate(scale):
        add_tone(buf, 0.04 + i * 0.19, 0.18, f, f * 0.995, 0.35, "triangle")
        add_tone(buf, 0.04 + i * 0.19, 0.10, f * 2.0, f * 2.0, 0.14, "sine")
    save_audio("sfx-hutch-xylophone.mp3", buf)

    # 10. sfx-garage-light.mp3 (Heavy overhead pull-switch clunk + warm electric hum)
    buf = [0.0] * int(1.6 * SR)
    add_tone(buf, 0.03, 0.08, 420, 160, 0.42, "square")
    add_tone(buf, 0.12, 0.09, 680, 280, 0.38, "triangle")
    add_tone(buf, 0.22, 1.15, 120.0, 120.0, 0.18, "sine")
    add_tone(buf, 0.25, 0.85, 880.0, 1318.5, 0.24, "sine")
    save_audio("sfx-garage-light.mp3", buf)


if __name__ == "__main__":
    print("=== Building Page 4 Audio Placeholders ===")
    build_all()
