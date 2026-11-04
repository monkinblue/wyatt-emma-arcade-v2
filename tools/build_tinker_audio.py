#!/usr/bin/env python3
"""
Offline ElevenLabs Voice & Dynamic Physics SFX Builder for "Tinker Workshop" (`TinkerWorkshopScene.ts`)
Reads `ELEVENLABS_API_KEY` strictly from `.env` (never imported or referenced in `src/`) and generates:
  1. `public/assets/audio/tinker/prompts/<id>.mp3`
     — Calm, supportive engineering & resilience coaching lines spoken by Josh (`nzFihrBIvB34imQBuxub`),
       `eleven_turbo_v2_5`, `stability=0.86, similarity_boost=0.75, style=0.0, use_speaker_boost=False`,
       period endings ('.'), ZERO exclamation marks.
  2. `public/assets/audio/tinker/sfx/<id>.mp3`
     — Crisp physical-material sound effects via ElevenLabs Sound Generation API (`POST /v1/sound-generation`):
       soft wooden tap, hard wooden clack, brass bell ding, spring drum boing, bellows wind whoosh,
       wooden rolling loop, star chime, funnel spiral drop, paddle wheel whir, and minecart catch fanfare.
"""

import argparse
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from typing import Dict, Tuple

PROMPTS_DICT: Dict[str, str] = {
    "welcome_title": "Welcome to Tinker Workshop. Let's build a marble run together.",
    "mode_stars": "Star Challenge Mode. Guide the marble through all three golden stars into Doggie's minecart.",
    "mode_sandbox": "Free Sandbox Mode. Build any contraption you can imagine.",
    "miss_trail_1": "So close. Follow the dotted trail and nudge your ramp a little bit.",
    "miss_trail_2": "Nice test. Look at the glowing trail to see where the marble bounced, then tilt a piece.",
    "miss_trail_3": "Every test helps us learn. Try moving a ramp right onto the dotted path.",
    "almost_stars": "Doggie caught the marble. Now let's angle our ramps to touch all three golden stars on the way down.",
    "victory_wyatt": "Wonderful engineering, Wyatt. Your contraption collected all three stars and landed right in Doggie's cart.",
    "victory_emma": "Wonderful engineering, Emma. Your contraption collected all three stars and landed right in Doggie's cart.",
    "fountain_on": "Marble shower ready. Watch all the marbles roll and bounce together.",
    "gravity_moon": "Moon gravity on. Everything floats gently.",
    "gravity_normal": "Normal workshop gravity.",
}

SFX_DICT: Dict[str, Tuple[str, float]] = {
    "wood_tap_soft": (
        "Soft warm hardwood marble tap on a polished walnut wooden block",
        0.6,
    ),
    "wood_clack_hard": (
        "Crisp resonant hardwood marble clack against a solid walnut wooden ramp",
        0.7,
    ),
    "brass_bell_ding": (
        "Bright resonant antique brass bell ding in a warm wooden workshop",
        1.1,
    ),
    "spring_drum_boing": (
        "Tactile vintage brass spring and leather drum bumper boing bounce",
        0.9,
    ),
    "bellows_wind_whoosh": (
        "Warm Victorian leather bellows and brass fan upward air whoosh gust",
        1.2,
    ),
    "wood_roll_loop": (
        "Smooth glass marble rolling steadily along a carved hardwood wooden chute",
        2.0,
    ),
    "star_chime": (
        "Magical golden compass star pickup chime with warm glockenspiel sparkle",
        1.0,
    ),
    "funnel_spiral_drop": (
        "Glass marble swirling quickly inside a hammered copper funnel and dropping out",
        1.0,
    ),
    "paddle_wheel_whir": (
        "Mechanical clockwork brass paddle wheel spinning with warm wooden clicks",
        1.0,
    ),
    "minecart_catch_fanfare": (
        "Joyful Nintendo style wooden minecart catch and warm brass clockwork victory fanfare",
        2.5,
    ),
}


def load_env_file(root_dir: str) -> Dict[str, str]:
    env_vars: Dict[str, str] = {}
    env_path = os.path.join(root_dir, ".env")
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for raw_line in f:
                line = raw_line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                env_vars[k.strip()] = v.strip().strip('"').strip("'")
    return env_vars


def synthesize_voice_mp3(
    api_key: str,
    voice_id: str,
    text: str,
    out_path: str,
    model_id: str = "eleven_turbo_v2_5",
    previous_text: str = "Let's encourage the young builders calmly and warmly in our wooden marble workshop.",
) -> int:
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=mp3_44100_128"
    payload = {
        "text": text,
        "model_id": model_id,
        "previous_text": previous_text,
        "voice_settings": {
            "stability": 0.86,
            "similarity_boost": 0.75,
            "style": 0.0,
            "use_speaker_boost": False,
        },
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
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with urllib.request.urlopen(req, timeout=45) as resp:
        audio_bytes = resp.read()
    with open(out_path, "wb") as f:
        f.write(audio_bytes)
    return len(audio_bytes)


def synthesize_sfx_mp3(api_key: str, prompt: str, out_path: str, duration_seconds: float = 1.0) -> int:
    url = "https://api.elevenlabs.io/v1/sound-generation"
    payload = {
        "text": prompt,
        "duration_seconds": duration_seconds,
        "prompt_influence": 0.5,
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
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with urllib.request.urlopen(req, timeout=60) as resp:
        audio_bytes = resp.read()
    with open(out_path, "wb") as f:
        f.write(audio_bytes)
    return len(audio_bytes)


def main() -> int:
    parser = argparse.ArgumentParser(description="Build Tinker Workshop offline voice & SFX library.")
    parser.add_argument("--force", action="store_true", help="Regenerate files even if cached.")
    args = parser.parse_args()

    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    env_vars = load_env_file(root_dir)
    api_key = env_vars.get("ELEVENLABS_API_KEY", "").strip()
    voice_id = env_vars.get("ELEVENLABS_VOICE_ID", "nzFihrBIvB34imQBuxub").strip()

    if not api_key:
        mjs_script = os.path.join(os.path.dirname(os.path.abspath(__file__)), "build_tinker_audio.mjs")
        if os.path.exists(mjs_script):
            return subprocess.call(["node", mjs_script])
        print("ERROR: ELEVENLABS_API_KEY not found in .env", file=sys.stderr)
        return 1

    base_out_dir = os.path.join(root_dir, "public", "assets", "audio", "tinker")
    prompts_dir = os.path.join(base_out_dir, "prompts")
    sfx_dir = os.path.join(base_out_dir, "sfx")

    for d in (prompts_dir, sfx_dir):
        os.makedirs(d, exist_ok=True)

    for prompt_key, text in PROMPTS_DICT.items():
        out_path = os.path.join(prompts_dir, f"{prompt_key}.mp3")
        if not args.force and os.path.exists(out_path) and os.path.getsize(out_path) > 800:
            print(f"  [CACHE HIT] prompts/{prompt_key}.mp3")
            continue
        size_b = synthesize_voice_mp3(
            api_key,
            voice_id,
            text,
            out_path,
            model_id="eleven_turbo_v2_5",
        )
        print(f"  [GENERATED PROMPT] prompts/{prompt_key}.mp3 ({size_b:,} bytes) — '{text}'")
        time.sleep(0.1)

    for sfx_key, (sfx_prompt, dur) in SFX_DICT.items():
        out_path = os.path.join(sfx_dir, f"{sfx_key}.mp3")
        if not args.force and os.path.exists(out_path) and os.path.getsize(out_path) > 800:
            print(f"  [CACHE HIT] sfx/{sfx_key}.mp3")
            continue
        try:
            size_b = synthesize_sfx_mp3(api_key, sfx_prompt, out_path, duration_seconds=dur)
            print(f"  [GENERATED SFX] sfx/{sfx_key}.mp3 ({size_b:,} bytes) — '{sfx_prompt}'")
            time.sleep(0.15)
        except Exception as exc:
            print(f"  [SFX FALLBACK NOTE] sfx/{sfx_key}.mp3 ({exc}) — WebAudio synth fallback will handle.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
