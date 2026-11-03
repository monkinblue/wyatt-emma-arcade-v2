#!/usr/bin/env python3
"""
tools/build_colorado_p7_p8_sfx.py
---------------------------------
Generates single-concept atomic ElevenLabs SFX for Book 2 — Page 7 (Garden of the Gods)
and Page 8 Finale (Babci's Pierogi Kitchen) in `public/assets/audio/colorado/sfx/`,
skipping any file that already exists and is > 1KB.
"""

import json
import os
from pathlib import Path
from urllib import request

ROOT_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = ROOT_DIR / ".env"
SFX_DIR = ROOT_DIR / "public" / "assets" / "audio" / "colorado" / "sfx"

SFX_JOBS = [
    (
        "p7_ambient_nature_breeze.mp3",
        "Peaceful sunny mountain park breeze rustling softly through pine needles",
        10.0,
    ),
    (
        "p7_ambient_meadow_birds.mp3",
        "Cheerful songbirds singing and chirping melodically in a sunny outdoor park",
        10.0,
    ),
    (
        "p7_bluebirds_chirp.mp3",
        "Two happy mountain bluebirds chirping tweet-tweet-tweet with fluttering wings",
        1.8,
    ),
    (
        "p7_sparky_magic_puff.mp3",
        "Cute baby dragon happy chirp with magical twinkling crystal sparkles",
        2.0,
    ),
    (
        "p7_doggie_camera_shutter.mp3",
        "Classic mechanical camera shutter click and flash pop with a cute toy puppy squeak yip",
        1.8,
    ),
    (
        "p7_wyatt_wow.mp3",
        "Happy 4-year-old little boy excited laugh and cheerful giggle",
        1.8,
    ),
    (
        "p7_camels_kiss_harp.mp3",
        "Warm magical glissando harp chord with a cute playful kiss pop sound",
        2.2,
    ),
    (
        "p8_pierogi_sizzle_loop.mp3",
        "Comforting steady sound of butter and dumplings frying, sizzling, and crackling gently in a cast iron pan on a stove",
        12.0,
    ),
    (
        "p8_cozy_kitchen_guitar.mp3",
        "Warm slow fingerpicked acoustic guitar bedtime lullaby melody, peaceful and cozy",
        14.0,
    ),
]


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    if ENV_PATH.exists():
        for raw in ENV_PATH.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def generate_sfx(api_key: str, filename: str, prompt: str, duration: float) -> None:
    out_path = SFX_DIR / filename
    if out_path.exists() and out_path.stat().st_size > 1024:
        print(f"[SKIP] {filename} already exists ({out_path.stat().st_size:,} bytes)")
        return

    payload = json.dumps(
        {
            "text": prompt,
            "duration_seconds": duration,
            "prompt_influence": 0.55,
        }
    ).encode("utf-8")

    req = request.Request(
        "https://api.elevenlabs.io/v1/sound-generation",
        data=payload,
        headers={
            "xi-api-key": api_key,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
        },
        method="POST",
    )
    with request.urlopen(req) as resp:
        audio_bytes = resp.read()

    SFX_DIR.mkdir(parents=True, exist_ok=True)
    out_path.write_bytes(audio_bytes)
    print(f"[OK] Generated {filename} ({len(audio_bytes):,} bytes)")


def main() -> None:
    env = load_env()
    api_key = env.get("ELEVENLABS_API_KEY") or os.environ.get("ELEVENLABS_API_KEY")
    if not api_key:
        raise RuntimeError("Missing ELEVENLABS_API_KEY in .env")

    for filename, prompt, duration in SFX_JOBS:
        generate_sfx(api_key, filename, prompt, duration)


if __name__ == "__main__":
    main()
