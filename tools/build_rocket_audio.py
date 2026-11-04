#!/usr/bin/env python3
"""
Offline ElevenLabs Composable Place-Value Voice (1 to 999) & Space Rocketry SFX Builder
for "Rocket Number Blast" (`RocketBlastScene.ts`).

Reads `ELEVENLABS_API_KEY` strictly from `.env` (never imported or referenced in `src/`) and generates:
  1. `public/assets/audio/rocket/numbers/num_<1..19, 20..90, 100..900>.mp3`
  2. `public/assets/audio/rocket/prompts/<id>.mp3` (mission briefings, countdown, stage separation, valve cues)
  3. `public/assets/audio/rocket/sfx/<id>.mp3` (8 custom space rocketry SFX via POST /v1/sound-generation)

Voice Configuration:
  - Voice: "Josh - Teacher for Kids" (`nzFihrBIvB34imQBuxub`)
  - Model: `eleven_turbo_v2_5`
  - Settings: `stability=0.86, similarity_boost=0.75, style=0.0, use_speaker_boost=False`
  - Calm period endings ('.'), ZERO exclamation marks, and gentle headroom attenuation.
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request
from typing import Dict, Tuple

ONES_AND_TEENS_DICT: Dict[str, Tuple[str, str, str]] = {
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
}

TENS_DICT: Dict[str, Tuple[str, str, str]] = {
    "20": ("Twenty.", "Ten.", "Thirty, forty."),
    "30": ("Thirty.", "Ten, twenty.", "Forty, fifty."),
    "40": ("Forty.", "Twenty, thirty.", "Fifty, sixty."),
    "50": ("Fifty.", "Thirty, forty.", "Sixty, seventy."),
    "60": ("Sixty.", "Forty, fifty.", "Seventy, eighty."),
    "70": ("Seventy.", "Fifty, sixty.", "Eighty, ninety."),
    "80": ("Eighty.", "Sixty, seventy.", "Ninety, one hundred."),
    "90": ("Ninety.", "Seventy, eighty.", "One hundred."),
}

HUNDREDS_DICT: Dict[str, Tuple[str, str, str]] = {
    "100": ("One hundred.", "Let's count by hundreds.", "Two hundred, three hundred."),
    "200": ("Two hundred.", "One hundred.", "Three hundred, four hundred."),
    "300": ("Three hundred.", "One hundred, two hundred.", "Four hundred, five hundred."),
    "400": ("Four hundred.", "Two hundred, three hundred.", "Five hundred, six hundred."),
    "500": ("Five hundred.", "Three hundred, four hundred.", "Six hundred, seven hundred."),
    "600": ("Six hundred.", "Four hundred, five hundred.", "Seven hundred, eight hundred."),
    "700": ("Seven hundred.", "Five hundred, six hundred.", "Eight hundred, nine hundred."),
    "800": ("Eight hundred.", "Six hundred, seven hundred.", "Nine hundred."),
    "900": ("Nine hundred.", "Seven hundred, eight hundred.", "Great counting."),
}

PROMPTS_DICT: Dict[str, str] = {
    "welcome_title": "Welcome to Rocket Number Blast. Starlight Launchpad.",
    "mode_star_hopper": "Star Hopper mode. Numbers one through ten.",
    "mode_lunar_cadet": "Lunar Cadet mode. Tens and ones.",
    "mode_commander": "Commander mode. Hundreds, tens, and ones.",
    "mission_wyatt": "Ready, Commander Wyatt. Fuel the rocket to match the target number.",
    "mission_emma": "Ready, Star Hopper Emma. Tap the glowing stars to fuel the rocket.",
    "ready_for_launch": "Target number matched. Pull the big red launch lever.",
    "countdown_3": "Three.",
    "countdown_2": "Two.",
    "countdown_1": "One.",
    "blast_off": "Blast off.",
    "stage_separation": "Stage separation.",
    "over_fuel_valve": "Too much fuel in that tank. Pull the steam valve.",
    "steam_released": "Steam released. Tank level adjusted.",
    "landing_cheese_moon": "Touchdown on the Cheese Moon. Look at your space flag.",
    "landing_mars_saturn": "Touchdown on the Red Craters of Mars. Look at your space flag.",
    "landing_crystal_nebula": "Touchdown at the Crystal Nebula Space Station. Look at your space flag.",
}

SFX_DICT: Dict[str, Tuple[str, float]] = {
    "laser_chime_1": (
        "Bright high crystal starlight laser beam zing and magical bell chime",
        0.9,
    ),
    "laser_chord_10": (
        "Rich golden constellation laser beam whoosh and warm celestial chord chime",
        1.1,
    ),
    "laser_supernova_100": (
        "Deep resonant sapphire supernova plasma beam thrum and cosmic brass pulse",
        1.4,
    ),
    "gantry_clamps": (
        "Heavy antique brass hydraulic launch gantry clamps retracting with mechanical hiss",
        1.6,
    ),
    "steam_whistle_valve": (
        "Funny tactile brass steam whistle valve release pssshhh pop with playful puff",
        1.3,
    ),
    "rocket_engine_roar": (
        "Warm powerful retro moon rocket engine ignition roar and rumbling ascent thrust",
        2.6,
    ),
    "stage_separation_pyro": (
        "Crisp mechanical rocket booster stage separation bolts popping and upper stage thruster ignition",
        1.6,
    ),
    "planet_flag_fanfare": (
        "Joyful Nintendo style cosmic brass and starry harp planetary touchdown flag fanfare",
        2.8,
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
    previous_text: str = "Let's count our rocket fuel numbers calmly.",
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
    parser = argparse.ArgumentParser(description="Build Rocket Number Blast offline voice & SFX library.")
    parser.add_argument("--force", action="store_true", help="Regenerate files even if cached.")
    args = parser.parse_args()

    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    env_vars = load_env_file(root_dir)
    api_key = env_vars.get("ELEVENLABS_API_KEY", "").strip()
    voice_id = env_vars.get("ELEVENLABS_VOICE_ID", "nzFihrBIvB34imQBuxub").strip()

    if not api_key:
        mjs_script = os.path.join(os.path.dirname(os.path.abspath(__file__)), "build_rocket_audio.mjs")
        if os.path.exists(mjs_script):
            return subprocess.call(["node", mjs_script])
        print("ERROR: ELEVENLABS_API_KEY not found in .env!", file=sys.stderr)
        return 1

    base_out_dir = os.path.join(root_dir, "public", "assets", "audio", "rocket")
    numbers_dir = os.path.join(base_out_dir, "numbers")
    prompts_dir = os.path.join(base_out_dir, "prompts")
    sfx_dir = os.path.join(base_out_dir, "sfx")

    for d in (numbers_dir, prompts_dir, sfx_dir):
        os.makedirs(d, exist_ok=True)

    stb_numbers_dir = os.path.join(root_dir, "public", "assets", "audio", "shutthebox", "numbers")

    # 1. Ones & Teens (1..19)
    for num_key, (text, prev_txt, next_txt) in ONES_AND_TEENS_DICT.items():
        out_path = os.path.join(numbers_dir, f"num_{num_key}.mp3")
        if not args.force and os.path.exists(out_path) and os.path.getsize(out_path) > 800:
            print(f"  [CACHE HIT] numbers/num_{num_key}.mp3")
            continue
        src_cached = os.path.join(stb_numbers_dir, f"num_{num_key}.mp3")
        if not args.force and os.path.exists(src_cached) and os.path.getsize(src_cached) > 800:
            shutil.copy2(src_cached, out_path)
            print(f"  [COPIED VERIFIED NUMBER] numbers/num_{num_key}.mp3")
            continue
        size_b = synthesize_voice_mp3(
            api_key, voice_id, text, out_path, model_id="eleven_turbo_v2_5", previous_text=prev_txt, next_text=next_txt
        )
        print(f"  [GENERATED NUMBER] numbers/num_{num_key}.mp3 ({size_b:,} bytes) — '{text}'")
        time.sleep(0.08)

    # 2. Tens (20..90)
    for num_key, (text, prev_txt, next_txt) in TENS_DICT.items():
        out_path = os.path.join(numbers_dir, f"num_{num_key}.mp3")
        if not args.force and os.path.exists(out_path) and os.path.getsize(out_path) > 800:
            print(f"  [CACHE HIT] numbers/num_{num_key}.mp3")
            continue
        src_cached = os.path.join(stb_numbers_dir, f"num_{num_key}.mp3")
        if not args.force and os.path.exists(src_cached) and os.path.getsize(src_cached) > 800:
            shutil.copy2(src_cached, out_path)
            print(f"  [COPIED VERIFIED NUMBER] numbers/num_{num_key}.mp3")
            continue
        size_b = synthesize_voice_mp3(
            api_key, voice_id, text, out_path, model_id="eleven_turbo_v2_5", previous_text=prev_txt, next_text=next_txt
        )
        print(f"  [GENERATED TENS] numbers/num_{num_key}.mp3 ({size_b:,} bytes) — '{text}'")
        time.sleep(0.08)

    # 3. Hundreds (100..900)
    for num_key, (text, prev_txt, next_txt) in HUNDREDS_DICT.items():
        out_path = os.path.join(numbers_dir, f"num_{num_key}.mp3")
        if not args.force and os.path.exists(out_path) and os.path.getsize(out_path) > 800:
            print(f"  [CACHE HIT] numbers/num_{num_key}.mp3")
            continue
        size_b = synthesize_voice_mp3(
            api_key, voice_id, text, out_path, model_id="eleven_turbo_v2_5", previous_text=prev_txt, next_text=next_txt
        )
        print(f"  [GENERATED HUNDREDS] numbers/num_{num_key}.mp3 ({size_b:,} bytes) — '{text}'")
        time.sleep(0.08)

    # 4. Mission Prompts & Countdown Cues
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
            previous_text="Let's guide the children warmly and calmly in our Rocket Number Blast space game.",
        )
        print(f"  [GENERATED PROMPT] prompts/{prompt_key}.mp3 ({size_b:,} bytes) — '{text}'")
        time.sleep(0.1)

    # 5. Space Rocketry SFX via ElevenLabs Sound Generation API
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
