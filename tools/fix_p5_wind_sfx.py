#!/usr/bin/env python3
"""
tools/fix_p5_wind_sfx.py
------------------------
Generates the clearly audible 10.0-second gusting mountain canyon wind track
at `public/assets/audio/colorado/sfx/p5_gusting_canyon_wind.mp3` using
`ELEVENLABS_API_KEY` from `.env`.
"""

import json
import os
from pathlib import Path
import urllib.request

ROOT_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = ROOT_DIR / ".env"
OUT_PATH = ROOT_DIR / "public" / "assets" / "audio" / "colorado" / "sfx" / "p5_gusting_canyon_wind.mp3"


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


def main() -> None:
    env = load_env(ENV_PATH)
    api_key = env.get("ELEVENLABS_API_KEY") or os.environ.get("ELEVENLABS_API_KEY")
    if not api_key:
        raise RuntimeError("ELEVENLABS_API_KEY not found in .env")

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    prompt = "Strong rushing high-altitude mountain wind gusting and whistling clearly through a deep rocky canyon"
    payload = {
        "text": prompt,
        "duration_seconds": 10.0,
        "prompt_influence": 0.75,
    }
    req = urllib.request.Request(
        "https://api.elevenlabs.io/v1/sound-generation",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "xi-api-key": api_key,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=90) as resp:
        audio_bytes = resp.read()
        OUT_PATH.write_bytes(audio_bytes)
        print(f"[GENERATED] {OUT_PATH.name} ({len(audio_bytes):,} bytes) — '{prompt}'")


if __name__ == "__main__":
    main()
