#!/usr/bin/env python3
"""
Offline ElevenLabs Voice & Steam Engine SFX Builder for
"Grandpa's Clockwork Train Table" (`TrainTableScene.ts` & `TrainAudioEngine.ts`).

Reads `ELEVENLABS_API_KEY` strictly from `.env` (never imported or referenced in `src/`) and generates:
  1. `public/assets/audio/train/numbers/num_<1..5>.mp3`
  2. `public/assets/audio/train/prompts/<prompt_id>.mp3`
  3. `public/assets/audio/train/sfx/<sfx_id>.mp3`

Voice Configuration:
  - Voice: "Josh - Teacher for Kids" (`nzFihrBIvB34imQBuxub`)
  - Model: `eleven_turbo_v2_5`
  - Settings: `stability=0.86, similarity_boost=0.75, style=0.0, use_speaker_boost=False`
  - Calm storybook tone, period endings ('.'), ZERO exclamation marks.
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
import time
import urllib.request
from typing import Dict, Tuple

NUMBERS_DICT: Dict[str, Tuple[str, str, str]] = {
    "1": ("One.", "Let's count the wooden train cargo calmly.", "Two, three, four, five."),
    "2": ("Two.", "One.", "Three, four, five."),
    "3": ("Three.", "One, two.", "Four, five."),
    "4": ("Four.", "One, two, three.", "Five."),
    "5": ("Five.", "Two, three, four.", "All aboard."),
}

PROMPTS_DICT: Dict[str, str] = {
    "welcome_title": (
        "Welcome to the Clockwork Train Table. Pull the golden rope to blow the whistle, "
        "or push the brass lever to go."
    ),
    "all_aboard": "All aboard.",
    "pulling_into_station": "Pulling into Grand Central Station.",
    "great_job_engineer": "Great job, little engineer.",
    "great_job_wyatt": "Wonderful engineering, Wyatt and Sparky. The express train is rolling.",
    "great_job_emma": "Wonderful engineering, Emma and Doggie. The express train is rolling.",
    "layout_meadow": "Sunny Meadow Oval track ready.",
    "layout_gorge": "Royal Gorge Figure-Eight track ready.",
    "layout_canyon": "Winding Mountain Canyon track ready.",
    "module_bridge": "Royal Gorge Suspension Bridge snapped onto the rails.",
    "module_tunnel": "Echo Mountain Stone Tunnel snapped over the track.",
    "module_xylophone": "Rainbow Xylophone Melodic Track snapped into place.",
    "module_crossing": "Clanging Railroad Crossing Gate ready.",
    "engineer_grandpa": "Engineer Grandpa is in the cab.",
    "engineer_wyatt": "Engineer Wyatt is at the throttle.",
    "engineer_emma": "Princess Emma is riding the rails.",
    "engineer_doggie": "Conductor Doggie is ready with his cap.",
    "engineer_sparky": "Sparky is stoking the golden steam.",
    "order_logs_2": "Load two golden logs onto the train.",
    "order_logs_3": "Load three golden logs onto the train.",
    "order_logs_4": "Load four golden logs onto the train.",
    "order_barrels_2": "Load two strawberry milk barrels.",
    "order_barrels_3": "Load three strawberry milk barrels.",
    "order_barrels_5": "Load five strawberry milk barrels.",
    "order_chests_2": "Load two treasure chests.",
    "order_chests_3": "Load three treasure chests.",
    "order_chests_4": "Load four treasure chests.",
    "order_crates_1": "Load one crystal star crate.",
    "order_crates_3": "Load three crystal star crates.",
    "order_crates_4": "Load four crystal star crates.",
    "done_logs": "Golden logs loaded. All aboard.",
    "done_barrels": "Strawberry milk barrels loaded. All aboard.",
    "done_chests": "Treasure chests loaded. All aboard.",
    "done_crates": "Crystal star crates loaded. All aboard.",
}

SFX_DICT: Dict[str, Tuple[str, float]] = {
    "steam_whistle": (
        "Warm joyful vintage brass dual-chime steam locomotive train whistle choo choo",
        1.6,
    ),
    "tunnel_echo_whistle": (
        "Echoing vintage steam train whistle inside a deep stone mountain canyon tunnel",
        1.8,
    ),
    "crossing_bell": (
        "Classic mechanical brass railroad crossing signal bell clanging ding ding ding ding",
        1.5,
    ),
    "wood_track_clack": (
        "Crisp tactile carved beechwood Brio toy train track piece snapping into place",
        0.8,
    ),
    "steam_brake_hiss": (
        "Warm vintage steam locomotive brass air brake release pssshhh hiss",
        1.2,
    ),
    "cargo_crane_thunk": (
        "Tactile wooden crane dropping a chunky wooden cargo block into a toy train car with a spring bounce",
        1.0,
    ),
    "water_tower_splash": (
        "Playful wooden railroad water tower spout pouring a splash of water into a steam tank",
        1.3,
    ),
    "trex_friendly_roar": (
        "Cute playful friendly cartoon dinosaur roar and wooden toy jaw clack",
        1.3,
    ),
    "unicorn_whinny_sparkle": (
        "Magical gentle pony whinny with sparkling crystal chimes",
        1.4,
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
    previous_text: str = "Let's guide our young train engineers calmly and warmly.",
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


def synthesize_sfx_mp3(api_key: str, prompt: str, out_path: str, duration_seconds: float = 1.3) -> int:
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
    parser = argparse.ArgumentParser(description="Build Clockwork Train Table offline voice & SFX library.")
    parser.add_argument("--force", action="store_true", help="Regenerate files even if cached.")
    args = parser.parse_args()

    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    env_vars = load_env_file(root_dir)
    api_key = env_vars.get("ELEVENLABS_API_KEY", "").strip()
    voice_id = env_vars.get("ELEVENLABS_VOICE_ID", "nzFihrBIvB34imQBuxub").strip()

    mjs_script = os.path.join(os.path.dirname(os.path.abspath(__file__)), "build_train_audio.mjs")
    if not api_key and os.path.exists(mjs_script):
        return subprocess.call(["node", mjs_script])

    if not api_key:
        print("ERROR: ELEVENLABS_API_KEY not found in .env", file=sys.stderr)
        return 1

    base_out_dir = os.path.join(root_dir, "public", "assets", "audio", "train")
    numbers_dir = os.path.join(base_out_dir, "numbers")
    prompts_dir = os.path.join(base_out_dir, "prompts")
    sfx_dir = os.path.join(base_out_dir, "sfx")

    for d in (numbers_dir, prompts_dir, sfx_dir):
        os.makedirs(d, exist_ok=True)

    stb_numbers_dir = os.path.join(root_dir, "public", "assets", "audio", "shutthebox", "numbers")

    for num_key, (text, prev_txt, next_txt) in NUMBERS_DICT.items():
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
            api_key, voice_id, text, out_path, previous_text=prev_txt, next_text=next_txt
        )
        print(f"  [GENERATED NUMBER] numbers/num_{num_key}.mp3 ({size_b:,} bytes)")
        time.sleep(0.08)

    for prompt_key, text in PROMPTS_DICT.items():
        out_path = os.path.join(prompts_dir, f"{prompt_key}.mp3")
        if not args.force and os.path.exists(out_path) and os.path.getsize(out_path) > 800:
            print(f"  [CACHE HIT] prompts/{prompt_key}.mp3")
            continue
        size_b = synthesize_voice_mp3(api_key, voice_id, text, out_path)
        print(f"  [GENERATED PROMPT] prompts/{prompt_key}.mp3 ({size_b:,} bytes)")
        time.sleep(0.09)

    for sfx_key, (sfx_prompt, dur) in SFX_DICT.items():
        out_path = os.path.join(sfx_dir, f"{sfx_key}.mp3")
        if not args.force and os.path.exists(out_path) and os.path.getsize(out_path) > 800:
            print(f"  [CACHE HIT] sfx/{sfx_key}.mp3")
            continue
        try:
            size_b = synthesize_sfx_mp3(api_key, sfx_prompt, out_path, duration_seconds=dur)
            print(f"  [GENERATED SFX] sfx/{sfx_key}.mp3 ({size_b:,} bytes)")
            time.sleep(0.14)
        except Exception as exc:
            print(f"  [SFX FALLBACK NOTE] sfx/{sfx_key}.mp3 ({exc}) — WebAudio synth fallback will handle.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
