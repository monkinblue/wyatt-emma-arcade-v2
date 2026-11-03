#!/usr/bin/env python3
"""
tools/build_colorado_p2_sfx.py
------------------------------
Step 2: ElevenLabs Page 2 SFX Generator for Book 2 ("A Colorado Adventure").
Note: Page 2 voice narration (`page_2.mp3`) is ALREADY generated — this script ONLY generates
the 8 Page 2 sound effects in `public/assets/audio/colorado/sfx/` and never touches narration!
"""

import argparse
import json
import os
from pathlib import Path
import subprocess
import urllib.request

ROOT_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = ROOT_DIR / ".env"
SFX_DIR = ROOT_DIR / "public" / "assets" / "audio" / "colorado" / "sfx"

P2_SFX_SPECS = [
    (
        "p2_ambient_morning.mp3",
        "Sunny peaceful Colorado suburban morning ambience with gentle breeze, distant cheerful songbirds, and soft leaves rustling",
        6.0,
    ),
    (
        "p2_kids_run_giggle.mp3",
        "Two happy young children running footsteps on sidewalk with joyful toddler giggles and excited cheering",
        2.5,
    ),
    (
        "p2_grandparents_hug.mp3",
        "Warm loving grandparents welcoming laugh, cheerful hand claps, and a cozy heartwarming chime",
        2.2,
    ),
    (
        "p2_chimney_sparky.mp3",
        "Cute friendly baby dragon popping out of a metal chimney with a playful puff of magical golden sparkles and chirp",
        2.2,
    ),
    (
        "p2_bush_doggie.mp3",
        "Leafy green bush rustling followed by a cute stuffed puppy toy double squeak-bark yip-yip",
        1.8,
    ),
    (
        "p2_lavender_butterflies.mp3",
        "Gentle magical harp sparkle glissando with soft fluttering butterfly wings and a cute bumblebee buzz",
        2.2,
    ),
    (
        "p2_lawn_sprinkler.mp3",
        "Classic lawn sprinkler popping up tchk-tchk-tchk-pssshhh spraying refreshing water droplets in the sun",
        2.5,
    ),
    (
        "p2_squirrel_juggle.mp3",
        "Cute red pine squirrel excited chatter followed by playful cartoon juggling whooshes and pinecone catches",
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
        print(f"  [GENERATED P2 SFX] {out_path.name} ({len(audio_bytes):,} bytes) — {prompt!r}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build Colorado Page 2 SFX via ElevenLabs")
    parser.add_argument("--force", action="store_true", help="Regenerate even if cached")
    args = parser.parse_args()

    env = load_env(ENV_PATH)
    api_key = env.get("ELEVENLABS_API_KEY") or os.environ.get("ELEVENLABS_API_KEY")
    if not api_key:
        mjs_path = ROOT_DIR / "tools" / "build_colorado_p2_sfx.mjs"
        if mjs_path.exists():
            subprocess.run(["node", str(mjs_path)], check=True)
            return
        raise RuntimeError("ELEVENLABS_API_KEY not found in .env")

    SFX_DIR.mkdir(parents=True, exist_ok=True)

    for filename, prompt, dur in P2_SFX_SPECS:
        out_path = SFX_DIR / filename
        if out_path.exists() and out_path.stat().st_size > 1024 and not args.force:
            print(f"  [CACHE HIT] sfx/{out_path.name} ({out_path.stat().st_size:,} bytes)")
            continue
        generate_sfx(api_key, prompt, dur, out_path)


if __name__ == "__main__":
    main()
