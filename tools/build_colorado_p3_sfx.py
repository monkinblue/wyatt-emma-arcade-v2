#!/usr/bin/env python3
"""
tools/build_colorado_p3_sfx.py
------------------------------
Generates the 14 single-concept atomic Page 3 ("Manitou Springs Penny Arcade")
ElevenLabs sound effects in `public/assets/audio/colorado/sfx/` using `ELEVENLABS_API_KEY`
from `.env`.

STRICT RULE:
- DO NOT overwrite or regenerate Page 3's voice narration MP3 (`page_3.mp3` / `p3.mp3`).
"""

import json
import os
from pathlib import Path
import sys
import urllib.request

ROOT_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = ROOT_DIR / ".env"
SFX_DIR = ROOT_DIR / "public" / "assets" / "audio" / "colorado" / "sfx"

P3_SFX_SPECS: list[tuple[str, str, float]] = [
    (
        "p3_ambient_arcade_loop.mp3",
        "Classic family penny arcade room ambience with gentle vintage arcade cabinet hums and distant cheerful arcade chimes",
        14.0,
    ),
    (
        "p3_skeeball_roll.mp3",
        "Heavy wooden ball rolling fast up a smooth wooden bowling lane track",
        1.8,
    ),
    (
        "p3_skeeball_ding.mp3",
        "Bright retro mechanical arcade scoreboard bell ding-ding-ding",
        1.5,
    ),
    (
        "p3_tickets_dispense.mp3",
        "Fast paper arcade ticket dispenser whirring and fluttering paper strip",
        2.0,
    ),
    (
        "p3_emma_giggle.mp3",
        "Happy 3-year-old little girl joyful giggle",
        1.8,
    ),
    (
        "p3_grandparents_clap.mp3",
        "Warm enthusiastic hand clapping and cheerful applause",
        2.0,
    ),
    (
        "p3_pony_spring.mp3",
        "Rhythmic heavy metal coil spring bouncing boing-squeak-boing",
        2.2,
    ),
    (
        "p3_doggie_squeak.mp3",
        "Cute rubber squeaky toy puppy double bark yip-yip",
        1.5,
    ),
    (
        "p3_claw_servo.mp3",
        "Small electric toy crane motor servo whirring down and clicking shut",
        2.2,
    ),
    (
        "p3_sparky_chime.mp3",
        "Playful magical crystal sparkle chime",
        1.8,
    ),
    (
        "p3_fortune_organ.mp3",
        "Warm mystical carnival calliope organ chord shimmer",
        2.5,
    ),
    (
        "p3_wheel_spin.mp3",
        "Plastic prize wheel pegs clicking rapidly tick-tick-tick-tick slowing to a stop",
        2.5,
    ),
    (
        "p3_pinball_bumpers.mp3",
        "Classic mechanical pinball machine solenoids and pop bumpers rapidly kicking thump-thump-thump",
        2.2,
    ),
    (
        "p3_pinball_bells.mp3",
        "Vintage pinball machine high score chimes and metallic bells ringing",
        2.0,
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
        print(f"  [GENERATED P3 SFX] sfx/{filename} ({len(audio_bytes):,} bytes) — '{prompt}'")
    return out_path


def main() -> None:
    force = "--force" in sys.argv
    env = load_env(ENV_PATH)
    api_key = env.get("ELEVENLABS_API_KEY") or os.environ.get("ELEVENLABS_API_KEY")
    if not api_key:
        raise RuntimeError("ELEVENLABS_API_KEY not found in .env")

    for filename, prompt, duration_sec in P3_SFX_SPECS:
        generate_sfx(api_key, filename, prompt, duration_sec, force=force)


if __name__ == "__main__":
    main()
