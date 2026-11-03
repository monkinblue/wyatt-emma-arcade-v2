#!/usr/bin/env python3
"""
tools/build_colorado_p5_sfx.py
------------------------------
Generates the 8 single-concept atomic Page 5 ("Royal Gorge Bridge & Aerial Gondola")
ElevenLabs sound effects in `public/assets/audio/colorado/sfx/` using `ELEVENLABS_API_KEY`
from `.env`.

STRICT RULE:
- NEVER overwrite `p2_grandparents_hug.mp3` or any existing voice narration (`page_4.mp3`, `page_5.mp3`, etc.).
"""

import json
import os
from pathlib import Path
import sys
import urllib.request

ROOT_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = ROOT_DIR / ".env"
SFX_DIR = ROOT_DIR / "public" / "assets" / "audio" / "colorado" / "sfx"

P5_SFX_SPECS: list[tuple[str, str, float]] = [
    (
        "p5_ambient_gorge_wind.mp3",
        "Gentle high-altitude mountain canyon breeze blowing softly across an open vista",
        10.0,
    ),
    (
        "p5_gondola_cable_loop.mp3",
        "Smooth rhythmic steel aerial cable car pulley wheels humming and rolling softly along a wire",
        8.0,
    ),
    (
        "p5_gondola_bell.mp3",
        "Bright vintage brass aerial tramway ding-ding bell chime",
        1.8,
    ),
    (
        "p5_eagle_call.mp3",
        "Majestic high-pitched golden eagle call echoing across a canyon",
        2.0,
    ),
    (
        "p5_eagle_wings.mp3",
        "Large bird wings flapping whoosh-whoosh-whoosh in open air",
        1.8,
    ),
    (
        "p5_flags_flutter.mp3",
        "Three cloth flags snapping and fluttering briskly in a mountain breeze",
        2.0,
    ),
    (
        "p5_raft_splash.mp3",
        "Playful whitewater river rapid splash and wooden paddles dipping in water",
        2.0,
    ),
    (
        "p5_doggie_yip.mp3",
        "Cute small stuffed puppy toy cheerful double squeak-bark yip-yip",
        1.5,
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
        print(f"  [GENERATED P5 SFX] sfx/{filename} ({len(audio_bytes):,} bytes) — '{prompt}'")
    return out_path


def main() -> None:
    force = "--force" in sys.argv
    env = load_env(ENV_PATH)
    api_key = env.get("ELEVENLABS_API_KEY") or os.environ.get("ELEVENLABS_API_KEY")
    if not api_key:
        raise RuntimeError("ELEVENLABS_API_KEY not found in .env")

    for filename, prompt, duration_sec in P5_SFX_SPECS:
        generate_sfx(api_key, filename, prompt, duration_sec, force=force)


if __name__ == "__main__":
    main()
