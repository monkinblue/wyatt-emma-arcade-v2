#!/usr/bin/env python3
"""
Offline ElevenLabs Voice & Acoustic Tabletop SFX Builder for "Great Hall Box of Ten" (`ShutTheBoxScene.ts`)
Reads `ELEVENLABS_API_KEY` strictly from `.env` (never imported or referenced in `src/`) and generates:
  1. `public/assets/audio/shutthebox/numbers/num_<1..20>.mp3`
  2. `public/assets/audio/shutthebox/prompts/<id>.mp3` (turn announcements, scroll prompts, score math & praise)
  3. `public/assets/audio/shutthebox/sfx/<id>.mp3` (7 custom tabletop acoustic SFX via POST /v1/sound-generation)

Voice Configuration:
  - Voice: "Josh - Teacher for Kids" (`nzFihrBIvB34imQBuxub`)
  - Model: `eleven_turbo_v2_5` for crystal-clear single-number pronunciation (`previous_text` + `next_text` anchored)
  - Settings: `stability=0.86, similarity_boost=0.75, style=0.0, use_speaker_boost=False`
  - Calm period endings ('.'), ZERO exclamation marks, and gentle headroom attenuation.
"""

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from typing import Dict, Tuple

NUMBERS_DICT: Dict[str, Tuple[str, str, str]] = {
    "1": ("One.", "Let's count the numbers clearly.", "Two, three, four."),
    "2": ("Two.", "One.", "Three, four, five."),
    "3": ("Three.", "One, two.", "Four, five, six."),
    "4": ("Four.", "One, two, three.", "Five, six, seven."),
    "5": ("Five.", "Two, three, four.", "Six, seven, eight."),
    "6": ("Six.", "Three, four, five.", "Seven, eight, nine."),
    "7": ("Seven.", "Four, five, six.", "Eight, nine, ten."),
    "8": ("Eight.", "Five, six, seven.", "Nine, ten, eleven."),
    "9": ("Nine.", "Six, seven, eight.", "Ten, eleven, twelve."),
    "10": ("Ten.", "Seven, eight, nine.", "Eleven, twelve."),
    "11": ("Eleven.", "Eight, nine, ten.", "Twelve, thirteen."),
    "12": ("Twelve.", "Nine, ten, eleven.", "Thirteen, fourteen."),
    "13": ("Thirteen.", "Ten, eleven, twelve.", "Fourteen, fifteen."),
    "14": ("Fourteen.", "Eleven, twelve, thirteen.", "Fifteen, sixteen."),
    "15": ("Fifteen.", "Twelve, thirteen, fourteen.", "Sixteen, seventeen."),
    "16": ("Sixteen.", "Thirteen, fourteen, fifteen.", "Seventeen, eighteen."),
    "17": ("Seventeen.", "Fourteen, fifteen, sixteen.", "Eighteen, nineteen."),
    "18": ("Eighteen.", "Fifteen, sixteen, seventeen.", "Nineteen, twenty."),
    "19": ("Nineteen.", "Sixteen, seventeen, eighteen.", "Twenty."),
    "20": ("Twenty.", "Seventeen, eighteen, nineteen.", "Great counting."),
}

PROMPTS_DICT: Dict[str, str] = {
    "welcome_title": "Welcome to the Great Hall Box of Ten.",
    "turn_wyatt": "Wyatt's turn to roll the dice.",
    "turn_emma": "Emma's turn to roll the dice.",
    "turn_sparky": "Now it is Professor Sparky's turn.",
    "prompt_roll": "Tap the dice cup to roll on the green felt.",
    "prompt_scroll": "Count the dots and tap the magic number.",
    "prompt_flip": "Now flip the wooden tiles that make that number.",
    "prompt_score_math": "Let's add up your House gems for this round.",
    "praise_math": "Wonderful math. Now flip your wooden tiles.",
    "praise_shut_box": "Incredible. You shut every single tile in the box.",
    "praise_wyatt_win": "Great job, Wyatt. Your House hourglass is glowing.",
    "praise_emma_win": "Wonderful job, Emma. Doggie loves your House gems.",
    "praise_sparky_turn": "Professor Sparky flipped his wooden tiles.",
    "mode_one_die": "One die mode. Numbers one through six.",
    "mode_two_dice": "Two dice mode. Add both dice together.",
}

SFX_DICT: Dict[str, Tuple[str, float]] = {
    "dice_cup_shake": ("Wooden dice rattling inside a leather and brass dice shaker cup", 1.4),
    "dice_roll_felt": ("Two ivory wooden dice tumbling and rolling to a stop on soft green baize felt table", 1.6),
    "tile_clack_shut": ("Crisp mechanical hinged maple wood tile flipping and clacking shut on a wooden box", 1.0),
    "scroll_unfurl": ("Thick antique parchment scroll unfurling smoothly with a soft magical shimmer", 1.4),
    "math_chime": ("Warm magical celesta and antique brass bell chord for solving a wizard puzzle", 1.8),
    "gems_pour_glass": ("Glowing crystal ruby and emerald gems clinking and pouring into a glass hourglass", 2.0),
    "house_fanfare": ("Cozy magical banquet hall harp and warm brass fanfare celebration", 2.5),
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
    previous_text: str = "Let's count the numbers.",
    next_text: str = "",
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
    if next_text:
        payload["next_text"] = next_text

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


def synthesize_sfx_mp3(api_key: str, prompt: str, out_path: str, duration_seconds: float = 1.5) -> int:
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
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with urllib.request.urlopen(req, timeout=60) as resp:
        audio_bytes = resp.read()
    with open(out_path, "wb") as f:
        f.write(audio_bytes)
    return len(audio_bytes)


def main() -> int:
    parser = argparse.ArgumentParser(description="Build Great Hall Box of Ten offline voice & SFX library.")
    parser.add_argument("--force", action="store_true", help="Regenerate files even if cached.")
    parser.add_argument("--regen-numbers", action="store_true", help="Force regenerate number clips 1..20.")
    args = parser.parse_args()

    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    env_vars = load_env_file(root_dir)
    api_key = env_vars.get("ELEVENLABS_API_KEY", "").strip()
    voice_id = env_vars.get("ELEVENLABS_VOICE_ID", "nzFihrBIvB34imQBuxub").strip()

    if not api_key:
        print("ERROR: ELEVENLABS_API_KEY not found in .env!", file=sys.stderr)
        return 1

    base_out_dir = os.path.join(root_dir, "public", "assets", "audio", "shutthebox")
    numbers_dir = os.path.join(base_out_dir, "numbers")
    prompts_dir = os.path.join(base_out_dir, "prompts")
    sfx_dir = os.path.join(base_out_dir, "sfx")

    for d in (numbers_dir, prompts_dir, sfx_dir):
        os.makedirs(d, exist_ok=True)

    # 1. Numbers 1..20 using eleven_turbo_v2_5 + previous_text + next_text
    for num_key, (text, prev_txt, next_txt) in NUMBERS_DICT.items():
        out_path = os.path.join(numbers_dir, f"num_{num_key}.mp3")
        force_this = args.force or args.regen_numbers or num_key == "1"
        if not force_this and os.path.exists(out_path) and os.path.getsize(out_path) > 800:
            print(f"  [CACHE HIT] numbers/num_{num_key}.mp3")
            continue
        size_b = synthesize_voice_mp3(
            api_key,
            voice_id,
            text,
            out_path,
            model_id="eleven_turbo_v2_5",
            previous_text=prev_txt,
            next_text=next_txt,
        )
        print(f"  [GENERATED NUMBER] numbers/num_{num_key}.mp3 ({size_b:,} bytes) — '{text}'")
        time.sleep(0.1)

    # 2. Turn Announcements & Encouragement Prompts
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
            previous_text="Let's guide the children warmly and calmly in our Great Hall game.",
        )
        print(f"  [GENERATED PROMPT] prompts/{prompt_key}.mp3 ({size_b:,} bytes) — '{text}'")
        time.sleep(0.12)

    # 3. Tabletop Acoustic SFX via ElevenLabs Sound Generation API
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
