#!/usr/bin/env python3
"""
tools/build_colorado_p6_sfx.py
------------------------------
Generates the 4 supplementary single-concept atomic Page 6 ("Royal Gorge Train Vista Car")
ElevenLabs sound effects in `public/assets/audio/colorado/sfx/` using `ELEVENLABS_API_KEY`
from `.env`.

STRICT PROTECTED FILES (NEVER TOUCH OR OVERWRITE):
- `public/assets/audio/colorado/sfx/p2_grandparents_hug.mp3`
- `public/assets/audio/colorado/sfx/sfx_train_horn.mp3`
- `public/assets/audio/colorado/sfx/sfx_train_chug.mp3`
- Any existing voice narration files (`page_5.mp3`, `page_6.mp3`, etc.)
"""

import json
import os
from pathlib import Path
import sys
import urllib.request

ROOT_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = ROOT_DIR / ".env"
SFX_DIR = ROOT_DIR / "public" / "assets" / "audio" / "colorado" / "sfx"

P6_SFX_SPECS: list[tuple[str, str, float]] = [
    (
        "p6_ambient_river_rapids.mp3",
        "Rushing mountain canyon whitewater river rapids flowing steadily",
        10.0,
    ),
    (
        "p6_otter_splash.mp3",
        "Playful river water splash with a cute happy otter chirp",
        1.8,
    ),
    (
        "p6_conductor_doggie_bell.mp3",
        "Bright brass train conductor hand-bell ding-ding with a cute toy puppy squeak yip",
        1.8,
    ),
    (
        "p6_kids_horn_laugh.mp3",
        "Happy 4-year-old boy and 3-year-old toddler girl laughing joyfully",
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
        print(f"  [GENERATED P6 SFX] sfx/{filename} ({len(audio_bytes):,} bytes) — '{prompt}'")
    return out_path


def main() -> None:
    force = "--force" in sys.argv
    env = load_env(ENV_PATH)
    api_key = env.get("ELEVENLABS_API_KEY") or os.environ.get("ELEVENLABS_API_KEY")
    if not api_key:
        raise RuntimeError("ELEVENLABS_API_KEY not found in .env")

    for filename, prompt, duration_sec in P6_SFX_SPECS:
        generate_sfx(api_key, filename, prompt, duration_sec, force=force)


if __name__ == "__main__":
    main()
