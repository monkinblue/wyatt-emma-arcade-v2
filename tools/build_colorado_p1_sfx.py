#!/usr/bin/env python3
"""
tools/build_colorado_p1_sfx.py
------------------------------
Step 2: ElevenLabs Page 1 SFX Generator for Book 2 ("A Colorado Adventure").
Note: Page 1 voice narration (`page_1.mp3`) is ALREADY generated — this script ONLY generates
the 8 Page 1 sound effects in `public/assets/audio/colorado/sfx/` and never touches narration!
"""

import argparse
import json
import os
from pathlib import Path
import urllib.request

ROOT_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = ROOT_DIR / ".env"
SFX_DIR = ROOT_DIR / "public" / "assets" / "audio" / "colorado" / "sfx"

P1_SFX_SPECS = [
    (
        "p1_ambient_idle.mp3",
        "Soft cozy low SUV engine idle hum blended with gentle autumn mountain breeze and distant birdsong",
        6.0,
    ),
    (
        "p1_exhaust_rev.mp3",
        "Playful friendly car engine double rev vroom-vroom with soft puffing exhaust smoke",
        2.0,
    ),
    (
        "p1_thule_sparky.mp3",
        "Cargo box latch popping open, rubber party balloons inflating and floating up, and a cute baby dragon happy chirp",
        2.5,
    ),
    (
        "p1_doggie_bark.mp3",
        "Cute small stuffed toy puppy squeaky double bark yip-yip with a playful suitcase thump",
        1.8,
    ),
    (
        "p1_bluebird_chirp.mp3",
        "Metallic road sign wobble boing followed by cheerful mountain bluebird melody chirp and fluttering wings",
        2.0,
    ),
    (
        "p1_eagle_soar.mp3",
        "Majestic mountain hawk eagle cry echoing softly over open canyon sky with gentle wing whoosh",
        2.5,
    ),
    (
        "p1_chipmunk_munch.mp3",
        "Cute cartoon chipmunk fast crunchy nibbling on a pinecone followed by a playful little boing flip",
        2.0,
    ),
    (
        "p1_cooler_pop.mp3",
        "Plastic camping cooler lid popping open with a refreshing cold fizz and playful magical chime",
        2.0,
    ),
]


def load_env(env_path: Path) -> dict:
    env = {}
    if env_path.exists():
        for raw_line in env_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def generate_sfx(api_key: str, prompt: str, duration_seconds: float, out_path: Path) -> None:
    url = "https://api.elevenlabs.io/v1/sound-generation"
    payload = {
        "text": prompt,
        "duration_seconds": duration_seconds,
        "prompt_influence": 0.45,
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "xi-api-key": api_key,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        audio_bytes = resp.read()
        out_path.write_bytes(audio_bytes)
        print(f"  [GENERATED P1 SFX] {out_path.name} ({len(audio_bytes):,} bytes) — {prompt!r}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build Colorado Page 1 SFX via ElevenLabs")
    parser.add_argument("--force", action="store_true", help="Regenerate even if cached")
    args = parser.parse_args()

    env = load_env(ENV_PATH)
    api_key = env.get("ELEVENLABS_API_KEY") or os.environ.get("ELEVENLABS_API_KEY")
    if not api_key:
        raise RuntimeError("ELEVENLABS_API_KEY not found in .env")

    SFX_DIR.mkdir(parents=True, exist_ok=True)

    for filename, prompt, dur in P1_SFX_SPECS:
        out_path = SFX_DIR / filename
        if out_path.exists() and out_path.stat().st_size > 1024 and not args.force:
            print(f"  [CACHE HIT] sfx/{out_path.name} ({out_path.stat().st_size:,} bytes)")
            continue
        generate_sfx(api_key, prompt, dur, out_path)


if __name__ == "__main__":
    main()
