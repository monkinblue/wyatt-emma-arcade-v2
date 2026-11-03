#!/usr/bin/env python3
"""
tools/build_colorado_p4_sfx.py
------------------------------
Generates the 9 single-concept atomic Page 4 ("Eleven Mile Canyon & South Platte River")
ElevenLabs sound effects in `public/assets/audio/colorado/sfx/` using `ELEVENLABS_API_KEY`
from `.env`.

STRICT RULE:
- NEVER overwrite `p2_grandparents_hug.mp3` or any existing Page 4 voice narration (`page_4.mp3` / `p4.mp3`).
"""

import json
import os
from pathlib import Path
import sys
import urllib.request

ROOT_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = ROOT_DIR / ".env"
SFX_DIR = ROOT_DIR / "public" / "assets" / "audio" / "colorado" / "sfx"

P4_SFX_SPECS: list[tuple[str, str, float]] = [
    (
        "p4_ambient_stream.mp3",
        "Gentle crystal clear mountain river stream babbling and flowing softly over smooth creek stones",
        8.0,
    ),
    (
        "p4_cessna_prop.mp3",
        "Distant small single-engine propeller airplane humming softly across open mountain sky",
        2.5,
    ),
    (
        "p4_water_splash.mp3",
        "Playful barefoot water splash in a shallow clear river stream",
        1.8,
    ),
    (
        "p4_kids_giggle_splash.mp3",
        "Happy young toddler joyful giggle",
        1.8,
    ),
    (
        "p4_sparky_splash.mp3",
        "Inflatable rubber river tube bobbing in water with a cute happy baby dragon chirp",
        2.0,
    ),
    (
        "p4_doggie_reel.mp3",
        "Fishing reel clicking and spinning fast zzzzz-click-click",
        2.0,
    ),
    (
        "p4_doggie_bark.mp3",
        "Cute small stuffed toy puppy squeaky double bark yip-yip",
        1.5,
    ),
    (
        "p4_bighorn_leap.mp3",
        "Hooves bounding lightly up three rocky mountain cliff steps",
        1.8,
    ),
    (
        "p4_dragonfly_zip.mp3",
        "Delicate magical fairy wings fluttering with a soft sparkle chime",
        1.8,
    ),
]


def load_env(env_path: Path) -> dict[str, str]:
    env_vars: dict[str, str] = {}
    if env_path.exists():
        for raw_line in env_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env_vars[k.strip()] = v.strip().strip('"').strip("'")
    return env_vars


def generate_sfx(api_key: str, filename: str, prompt: str, duration_sec: float, force: bool = False) -> Path:
    SFX_DIR.mkdir(parents=True, exist_ok=True)
    out_path = SFX_DIR / filename
    if out_path.exists() and out_path.stat().st_size > 1024 and not force:
        print(f"  [CACHE HIT] sfx/{filename} ({out_path.stat().st_size:,} bytes)")
        return out_path

    url = "https://api.elevenlabs.io/v1/sound-generation"
    payload = {
        "text": prompt,
        "duration_seconds": duration_sec,
        "prompt_influence": 0.45,
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "xi-api-key": api_key,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=90) as resp:
        audio_bytes = resp.read()
        out_path.write_bytes(audio_bytes)
        print(f"  [GENERATED P4 SFX] sfx/{filename} ({len(audio_bytes):,} bytes) — '{prompt}'")
    return out_path


def main() -> None:
    force = "--force" in sys.argv
    env = load_env(ENV_PATH)
    api_key = env.get("ELEVENLABS_API_KEY") or os.environ.get("ELEVENLABS_API_KEY")
    if not api_key:
        raise RuntimeError("ELEVENLABS_API_KEY not found in .env")

    for filename, prompt, duration_sec in P4_SFX_SPECS:
        generate_sfx(api_key, filename, prompt, duration_sec, force=force)


if __name__ == "__main__":
    main()
