#!/usr/bin/env python3
"""
Offline ElevenLabs Rhyming Riddles, Item Names & Studio SFX Builder for
"I Spy Curio Cabinet" (`ISpyScene.ts` & `ISpyAudioEngine.ts`).

Reads `ELEVENLABS_API_KEY` strictly from `.env` (never imported or referenced in `src/`) and generates:
  1. `public/assets/audio/ispy/riddles/riddle_b<1..4>_t<1..3>.mp3` (12 Walter Wick rhyming riddles)
  2. `public/assets/audio/ispy/items/<item_id>.mp3` (34 studio miniature object names)
  3. `public/assets/audio/ispy/prompts/<prompt_id>.mp3` (count confirmations, hints, case solved)
  4. `public/assets/audio/ispy/sfx/<sfx_id>.mp3` (6 studio SFX: lens whoosh, brass click, chime discovery pop, wax seal stamp, fanfare, curio sparkle)

Voice Configuration:
  - Voice: "Josh - Teacher for Kids" (`nzFihrBIvB34imQBuxub`)
  - Model: `eleven_turbo_v2_5`
  - Settings: `stability=0.86, similarity_boost=0.75, style=0.0, use_speaker_boost=False`
  - Calm storybook tone, period endings ('.'), ZERO exclamation marks.
"""

import argparse
import json
import os
import subprocess
import sys
import time
import urllib.request
from typing import Dict, Tuple

RIDDLES_DICT: Dict[str, str] = {
    "riddle_b1_t1": (
        "I spy with my little eye, inside Grandpa's watchmaker drawer... "
        "three brass keys, two red dice, and one golden pocket watch ticking nice."
    ),
    "riddle_b1_t2": (
        "I spy with my little eye, gleaming in the velvet tray... "
        "three swirl marbles, two silver thimbles, and one tiny airplane ready to fly away."
    ),
    "riddle_b1_t3": (
        "I spy with my little eye, hidden among the clockwork gears... "
        "three pearl buttons, two chess knights, two red roadsters, and one little Sparky dragon."
    ),
    "riddle_b2_t1": (
        "I spy with my little eye, deep in the pirate treasure chest... "
        "three ocean starfish, two golden crowns, and one brass compass pointing west."
    ),
    "riddle_b2_t2": (
        "I spy with my little eye, where the captain's doubloons shine... "
        "three ruby rings, two striped seashells, and one brass sextant on the brine."
    ),
    "riddle_b2_t3": (
        "I spy with my little eye, beside the pirate map and rope... "
        "three brass keys, two jade turtles, two golden acorns, and one fluffy Doggie."
    ),
    "riddle_b3_t1": (
        "I spy with my little eye, up in the cozy toymaker's loft... "
        "three red racecars, two bowling pins, and one wooden train chugging soft."
    ),
    "riddle_b3_t2": (
        "I spy with my little eye, tucked by the wooden blocks so neat... "
        "three blue dominoes, two strawberry erasers, and one painted ladybug sweet."
    ),
    "riddle_b3_t3": (
        "I spy with my little eye, where the toymaker's ribbons curl... "
        "three shiny paperclips, two alphabet blocks, two porcelain teacups, and one golden bell."
    ),
    "riddle_b4_t1": (
        "I spy with my little eye, across the moon sand crater floor... "
        "three green dinosaurs, two purple crystals, and one space rocket ready to soar."
    ),
    "riddle_b4_t2": (
        "I spy with my little eye, among the glowing crystal stones... "
        "three swirl marbles, two triceratops, and one silver whistle with bright tones."
    ),
    "riddle_b4_t3": (
        "I spy with my little eye, in the starlight crystal crater box... "
        "three golden acorns, two red roadsters, two tiny airplanes, and one little Sparky on the rocks."
    ),
}

ITEMS_DICT: Dict[str, str] = {
    "item_brass_key": "Brass skeleton key.",
    "item_red_die": "Red casino die.",
    "item_glass_marble": "Swirl glass marble.",
    "item_silver_thimble": "Silver thimble.",
    "item_chess_knight": "Wooden chess knight.",
    "item_red_racecar": "Red toy racecar.",
    "item_golden_acorn": "Golden acorn.",
    "item_green_trex": "Green dinosaur.",
    "item_pearl_button": "Pearl button.",
    "item_brass_compass": "Brass compass.",
    "item_strawberry_eraser": "Strawberry eraser.",
    "item_blue_domino": "Blue domino.",
    "item_painted_ladybug": "Painted ladybug.",
    "item_t6_airplane": "Tiny T-Six airplane.",
    "item_red_roadster": "Red vintage roadster.",
    "item_golden_crown": "Golden royal crown.",
    "item_starfish": "Ocean starfish.",
    "item_paperclip": "Shiny paperclip.",
    "item_pocket_watch": "Golden pocket watch.",
    "item_bowling_pin": "Wooden bowling pin.",
    "item_sparky_figurine": "Little Sparky dragon.",
    "item_doggie_figurine": "Fluffy Doggie sidekick.",
    "item_ruby_ring": "Royal ruby ring.",
    "item_seashell": "Striped conch seashell.",
    "item_wooden_train": "Wooden train engine.",
    "item_alphabet_block": "Wooden alphabet block.",
    "item_porcelain_teacup": "Porcelain teacup.",
    "item_amethyst_crystal": "Purple amethyst crystal.",
    "item_retro_rocket": "Retro space rocket.",
    "item_triceratops": "Toy triceratops.",
    "item_brass_sextant": "Antique brass sextant.",
    "item_silver_whistle": "Silver detective whistle.",
    "item_jade_turtle": "Jade sea turtle.",
    "item_music_bell": "Golden chime bell.",
}

PROMPTS_DICT: Dict[str, str] = {
    "welcome_title": "Welcome to the I Spy Curio Cabinet. Pick up the brass magnifying glass and let's solve a riddle.",
    "count_one_found": "One found.",
    "count_two_found": "Two found.",
    "count_all_two_found": "Both found.",
    "count_all_three_found": "All three found.",
    "count_one_key": "One brass key.",
    "count_two_keys": "Two brass keys.",
    "count_all_three_keys": "All three brass keys found.",
    "case_solved": "Case solved, Junior Detective.",
    "case_solved_wyatt": "Wonderful detective work, Wyatt and Sparky. You earned a golden wax seal.",
    "case_solved_emma": "Wonderful detective work, Emma and Doggie. You earned a golden wax seal.",
    "hint_shimmer": "Look closely where the golden stars are twinkling.",
    "casebook_open": "Junior Detective Casebook and Curio Trophy Shelf.",
    "curio_unlocked": "A rare golden curio has been added to your shelf.",
}

SFX_DICT: Dict[str, Tuple[str, float]] = {
    "lens_whoosh": (
        "Soft warm antique brass magnifying glass glide whoosh across velvet",
        0.9,
    ),
    "brass_click": (
        "Crisp mechanical antique watchmaker brass bezel click and latch",
        0.7,
    ),
    "chime_discovery_pop": (
        "Warm magical crystal bell chime and joyful discovery pop",
        1.2,
    ),
    "wax_seal_stamp": (
        "Rich tactile heavy brass stamp pressing into warm wax seal with a golden bell ring",
        1.2,
    ),
    "detective_fanfare": (
        "Warm enchanting music box celesta and brass detective mystery solved fanfare",
        2.6,
    ),
    "curio_sparkle": (
        "Delicate sparkling crystal glass curio chime and music box glissando",
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
    previous_text: str = "Let's read a calm, warm Walter Wick I Spy rhyming riddle for young detectives.",
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


def synthesize_sfx_mp3(api_key: str, prompt: str, out_path: str, duration_seconds: float = 1.2) -> int:
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
    parser = argparse.ArgumentParser(description="Build I Spy Curio Cabinet offline voice & SFX library.")
    parser.add_argument("--force", action="store_true", help="Regenerate files even if cached.")
    args = parser.parse_args()

    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    env_vars = load_env_file(root_dir)
    api_key = env_vars.get("ELEVENLABS_API_KEY", "").strip()
    voice_id = env_vars.get("ELEVENLABS_VOICE_ID", "nzFihrBIvB34imQBuxub").strip()

    mjs_script = os.path.join(os.path.dirname(os.path.abspath(__file__)), "build_ispy_audio.mjs")
    if not api_key and os.path.exists(mjs_script):
        return subprocess.call(["node", mjs_script])

    if not api_key:
        print("ERROR: ELEVENLABS_API_KEY not found in .env", file=sys.stderr)
        return 1

    base_out_dir = os.path.join(root_dir, "public", "assets", "audio", "ispy")
    riddles_dir = os.path.join(base_out_dir, "riddles")
    items_dir = os.path.join(base_out_dir, "items")
    prompts_dir = os.path.join(base_out_dir, "prompts")
    sfx_dir = os.path.join(base_out_dir, "sfx")

    for d in (riddles_dir, items_dir, prompts_dir, sfx_dir):
        os.makedirs(d, exist_ok=True)

    for riddle_key, text in RIDDLES_DICT.items():
        out_path = os.path.join(riddles_dir, f"{riddle_key}.mp3")
        if not args.force and os.path.exists(out_path) and os.path.getsize(out_path) > 800:
            print(f"  [CACHE HIT] riddles/{riddle_key}.mp3")
            continue
        size_b = synthesize_voice_mp3(api_key, voice_id, text, out_path)
        print(f"  [GENERATED RIDDLE] riddles/{riddle_key}.mp3 ({size_b:,} bytes)")
        time.sleep(0.09)

    for item_key, text in ITEMS_DICT.items():
        out_path = os.path.join(items_dir, f"{item_key}.mp3")
        if not args.force and os.path.exists(out_path) and os.path.getsize(out_path) > 800:
            print(f"  [CACHE HIT] items/{item_key}.mp3")
            continue
        size_b = synthesize_voice_mp3(
            api_key,
            voice_id,
            text,
            out_path,
            previous_text="Let's name each miniature curio treasure clearly and calmly.",
        )
        print(f"  [GENERATED ITEM] items/{item_key}.mp3 ({size_b:,} bytes)")
        time.sleep(0.08)

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
            previous_text="Let's encourage our young detectives calmly and warmly.",
        )
        print(f"  [GENERATED PROMPT] prompts/{prompt_key}.mp3 ({size_b:,} bytes)")
        time.sleep(0.08)

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
