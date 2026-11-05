#!/usr/bin/env python3
"""
Offline ElevenLabs Voice & Magical SFX Builder for "Princess Emma's Unicorn Castle" (`UnicornCastleScene.ts`).

Reads `ELEVENLABS_API_KEY` strictly from `.env` (never imported or referenced in `src/`) and generates:
  1. `public/assets/audio/unicorn/numbers/num_<1..5>.mp3` ("One." .. "Five.")
  2. `public/assets/audio/unicorn/shapes/<id>.mp3` (Colors & Shapes: "Pink heart.", "Purple star.", etc.)
  3. `public/assets/audio/unicorn/prompts/<id>.mp3` (Pretend-play room transitions, tea party, spatial prompts)
  4. `public/assets/audio/unicorn/sfx/<id>.mp3` (8 custom magical SFX via POST /v1/sound-generation)

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
import urllib.error
import urllib.request
from typing import Dict, Tuple

NUMBERS_DICT: Dict[str, Tuple[str, str, str]] = {
    "1": ("One.", "Let's count the royal treats calmly.", "Two, three, four."),
    "2": ("Two.", "One.", "Three, four, five."),
    "3": ("Three.", "One, two.", "Four, five."),
    "4": ("Four.", "One, two, three.", "Five."),
    "5": ("Five.", "Two, three, four.", "Wonderful counting."),
}

SHAPES_AND_COLORS_DICT: Dict[str, str] = {
    "pink_heart": "Pink heart.",
    "purple_star": "Purple star.",
    "blue_diamond": "Blue diamond.",
    "yellow_circle": "Yellow circle.",
    "green_square": "Green square.",
    "red_circle": "Red circle.",
    "yellow_star": "Yellow star.",
    "blue_triangle": "Blue triangle.",
    "color_pink": "Rose pink.",
    "color_blue": "Sky blue.",
    "color_lavender": "Royal lavender.",
    "color_gold": "Sunshine gold.",
    "pattern_match": "What a lovely royal pattern.",
}

PROMPTS_DICT: Dict[str, str] = {
    "welcome_title": "Welcome to Princess Emma's Unicorn Castle. Royal Sticker Kingdom.",
    "room_spa": "Let's brush the unicorn's mane.",
    "room_teaparty": "Time for the royal tea party.",
    "room_stickers": "Pick a magical sticker for the castle.",
    "spa_wash_bubbles": "Lovely bubbly shampoo. Now rinse with the golden cloud shower.",
    "spa_rinse_clean": "All clean and sparkling.",
    "spa_tiara_prompt": "Match the crystal gems to the royal crown.",
    "spa_tiara_complete": "The royal unicorn crown is complete.",
    "tea_pour_complete": "Warm rainbow tea is served.",
    "tea_count_one": "One royal treat.",
    "tea_count_cookies": "Two star cookies.",
    "tea_count_cupcakes": "Three cupcakes.",
    "tea_count_hearts": "Four sugar hearts.",
    "tea_count_berries": "Five rainbow berries.",
    "tea_care_blanket": "So warm and cozy under the royal blanket.",
    "tea_care_pillow": "Sweet dreams on the starlight pillow.",
    "tea_care_tickle": "What a happy royal tickle.",
    "spatial_high_sky": "Can you stick a rainbow high up in the sky.",
    "spatial_next_to_emma": "Let's put a baby unicorn next to Princess Emma.",
    "spatial_on_stairs": "Try placing a royal friend on the grand staircase.",
    "spatial_by_water": "Can you place a friend near the sparkling water.",
    "step1_unicorn_pink_heart": "Give the Unicorn the pink heart crown.",
    "step1_unicorn_purple_star": "Give the Unicorn the purple star crown.",
    "step1_doggie_yellow_star": "Give Doggie the yellow star crown.",
    "step1_doggie_blue_circle": "Give Doggie the blue circle crown.",
    "step1_sparky_green_square": "Give Sparky the green square bow.",
    "step1_sparky_pink_heart": "Give Sparky the pink heart bow.",
    "step1_grandparents_gold_crown": "Give Babci and Grandpa the golden star crown.",
    "hint_color_pink": "That one is pink.",
    "hint_color_blue": "That one is blue.",
    "hint_color_yellow": "That one is yellow.",
    "hint_color_green": "That one is green.",
    "hint_color_purple": "That one is purple.",
    "step1_done_crown": "What a royal crown.",
    "step2_pour_pink_tea": "Pour the pink strawberry tea.",
    "step2_pour_blue_tea": "Pour the blue skyberry tea.",
    "step2_pour_gold_tea": "Pour the golden honey tea.",
    "step2_done_sip": "Warm royal tea. Delicious.",
    "step3_put_1_cupcake": "Put one cupcake on the plate.",
    "step3_put_2_cupcakes": "Put two cupcakes on the plate.",
    "step3_put_3_cupcakes": "Put three cupcakes on the plate.",
    "step3_put_2_cookies": "Put two star cookies on the plate.",
    "step3_put_3_hearts": "Put three strawberry hearts on the plate.",
    "count_1_cupcake": "One cupcake.",
    "count_2_cupcakes": "Two cupcakes.",
    "count_3_hearts": "Three strawberry hearts.",
    "guest_star_earned": "Hooray. You earned a golden crown star.",
    "finale_party_prompt": "Wonderful tea party, Princess Emma. Tap anywhere to place magical stickers.",
}

SFX_DICT: Dict[str, Tuple[str, float]] = {
    "shampoo_bubbles": (
        "Gentle magical soapy shampoo bubble lathering and soft sparkling foam pops",
        1.4,
    ),
    "waterfall_rinse": (
        "Warm gentle golden cloud shower water rinsing and soft crystal droplets",
        1.6,
    ),
    "gem_socket_chime": (
        "Crisp crystal gem snapping into a golden crown socket with a bright magical bell chime",
        1.1,
    ),
    "teapot_pour": (
        "Gentle porcelain teapot pouring warm tea into a teacup with a soft musical shimmer",
        1.6,
    ),
    "unicorn_whinny": (
        "Cute gentle friendly magical baby unicorn nuzzle and soft happy whinny",
        1.5,
    ),
    "teacup_clink": (
        "Delicate royal porcelain teacup and silver spoon clink with a warm chime",
        0.9,
    ),
    "sticker_peel": (
        "Crisp tactile paper sticker peeling and sticking onto a storybook page with a soft pop",
        0.9,
    ),
    "royal_fanfare": (
        "Warm enchanting harp and celesta music box royal princess castle fanfare",
        2.6,
    ),
    "teacup_sip": (
        "Gentle happy royal teacup sip with a warm contented sigh and soft sparkle chime",
        1.3,
    ),
    "treat_munch": (
        "Cute happy cartoon pastry cupcake munching and gentle sweet cookie crunch",
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
    previous_text: str = "Let's read a warm, gentle fairy tale for three year old Princess Emma.",
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
    parser = argparse.ArgumentParser(description="Build Princess Emma's Unicorn Castle offline voice & SFX library.")
    parser.add_argument("--force", action="store_true", help="Regenerate files even if cached.")
    args = parser.parse_args()

    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    env_vars = load_env_file(root_dir)
    api_key = env_vars.get("ELEVENLABS_API_KEY", "").strip()
    voice_id = env_vars.get("ELEVENLABS_VOICE_ID", "nzFihrBIvB34imQBuxub").strip()

    mjs_script = os.path.join(os.path.dirname(os.path.abspath(__file__)), "build_unicorn_audio.mjs")
    if not api_key and os.path.exists(mjs_script):
        return subprocess.call(["node", mjs_script])

    if not api_key:
        print("ERROR: ELEVENLABS_API_KEY not found in .env!", file=sys.stderr)
        return 1

    base_out_dir = os.path.join(root_dir, "public", "assets", "audio", "unicorn")
    numbers_dir = os.path.join(base_out_dir, "numbers")
    shapes_dir = os.path.join(base_out_dir, "shapes")
    prompts_dir = os.path.join(base_out_dir, "prompts")
    sfx_dir = os.path.join(base_out_dir, "sfx")

    for d in (numbers_dir, shapes_dir, prompts_dir, sfx_dir):
        os.makedirs(d, exist_ok=True)

    stb_numbers_dir = os.path.join(root_dir, "public", "assets", "audio", "shutthebox", "numbers")

    # 1. Numbers 1..5
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
            api_key, voice_id, text, out_path, model_id="eleven_turbo_v2_5", previous_text=prev_txt, next_text=next_txt
        )
        print(f"  [GENERATED NUMBER] numbers/num_{num_key}.mp3 ({size_b:,} bytes) — '{text}'")
        time.sleep(0.08)

    # 2. Colors & Shapes
    for shape_key, text in SHAPES_AND_COLORS_DICT.items():
        out_path = os.path.join(shapes_dir, f"{shape_key}.mp3")
        if not args.force and os.path.exists(out_path) and os.path.getsize(out_path) > 800:
            print(f"  [CACHE HIT] shapes/{shape_key}.mp3")
            continue
        size_b = synthesize_voice_mp3(
            api_key,
            voice_id,
            text,
            out_path,
            model_id="eleven_turbo_v2_5",
            previous_text="Let's name the royal crystal gem shapes and colors calmly and clearly.",
        )
        print(f"  [GENERATED SHAPE/COLOR] shapes/{shape_key}.mp3 ({size_b:,} bytes) — '{text}'")
        time.sleep(0.09)

    # 3. Pretend-Play Encouragement & Room Prompts
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
            previous_text="Let's guide three year old Princess Emma warmly and gently in her Unicorn Castle.",
        )
        print(f"  [GENERATED PROMPT] prompts/{prompt_key}.mp3 ({size_b:,} bytes) — '{text}'")
        time.sleep(0.1)

    # 4. Magical Unicorn Castle SFX
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
