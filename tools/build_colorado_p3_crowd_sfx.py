#!/usr/bin/env python3
"""
tools/build_colorado_p3_crowd_sfx.py
------------------------------------
Generates the 14.0-second Page 3 ("Manitou Springs Penny Arcade") additional
looping crowd/kids laughing track at `public/assets/audio/colorado/sfx/p3_ambient_crowd_chatter.mp3`
using `ELEVENLABS_API_KEY` from `.env`.

STRICT RULE:
- NEVER touch or overwrite `p2_grandparents_hug.mp3` or `page_3.mp3`.
"""

import json
import os
from pathlib import Path
import sys
import urllib.request

ROOT_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = ROOT_DIR / ".env"
SFX_DIR = ROOT_DIR / "public" / "assets" / "audio" / "colorado" / "sfx"

CROWD_SFX_SPEC: tuple[str, str, float] = (
    "p3_ambient_crowd_chatter.mp3",
    "Happy children laughing and giggling with warm lively indoor family crowd chatter and cheerful voices",
    14.0,
)


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
        print(f"  [GENERATED P3 CROWD SFX] sfx/{filename} ({len(audio_bytes):,} bytes) — '{prompt}'")
    return out_path


def main() -> None:
    force = "--force" in sys.argv
    env = load_env(ENV_PATH)
    api_key = env.get("ELEVENLABS_API_KEY") or os.environ.get("ELEVENLABS_API_KEY")
    if not api_key:
        raise RuntimeError("ELEVENLABS_API_KEY not found in .env")

    filename, prompt, duration_sec = CROWD_SFX_SPEC
    generate_sfx(api_key, filename, prompt, duration_sec, force=force)


if __name__ == "__main__":
    main()
