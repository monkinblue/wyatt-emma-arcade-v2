#!/usr/bin/env python3
"""
Discreet, Low-Credit ElevenLabs Audio & SFX Builder for Animal Match Safari (`MemoryMatchScene.ts`)
Reads `ELEVENLABS_API_KEY` strictly from `.env` (never imported in `src/`) and saves static MP3s:
  1. `public/assets/audio/memory-match/words/word_<w>.mp3` (only new nouns not already in balloon-pop)
  2. `public/assets/audio/memory-match/whispers/<id>.mp3` (4 short calm event whispers)
  3. `public/assets/audio/memory-match/sfx/<id>.mp3` (6 crisp acoustic sound effects via ElevenLabs Sound Generation)
"""

import argparse
import json
import os
import shutil
import sys
import time
import urllib.error
import urllib.request
from typing import Dict, Tuple

NEW_WORDS_DICT: Dict[str, str] = {
    "cub": "cub.",
    "elephant": "elephant.",
    "calf": "calf.",
    "owl": "owl.",
    "owlet": "owlet.",
    "tadpole": "tadpole.",
    "fox": "fox.",
    "kit": "kit.",
    "monkey": "monkey.",
    "duckling": "duckling.",
    "octopus": "octopus.",
    "turtle": "turtle.",
    "clownfish": "clownfish.",
    "dolphin": "dolphin.",
    "seahorse": "seahorse.",
    "starfish": "starfish.",
    "trex": "T-Rex.",
    "triceratops": "triceratops.",
    "stegosaurus": "stegosaurus.",
    "brachiosaurus": "brachiosaurus.",
    "pterodactyl": "pterodactyl.",
    "ankylosaurus": "ankylosaurus.",
    "dinosaur": "dinosaur.",
    "airship": "airship.",
    "firetruck": "fire truck.",
    "submarine": "submarine.",
    "biplane": "biplane.",
    "tractor": "tractor.",
    "dragon": "dragon.",
    "unicorn": "unicorn.",
    "crystal": "crystal.",
    "map": "map.",
    "cupcake": "cupcake.",
    "strawberry": "strawberry.",
    "acorn": "acorn.",
}

WHISPERS_DICT: Dict[str, str] = {
    "key_found": "You found the hidden golden key.",
    "chest_open": "The mystery treasure chest is open.",
    "mama_baby": "Mama and baby are back together.",
    "board_clear": "Wonderful matching.",
}

SFX_DICT: Dict[str, str] = {
    "card_flip": "Crisp tactile wooden tile flip click on soft felt table",
    "match_chime": "Warm magical antique brass music box chime chord",
    "chest_unlock": "Ornate brass treasure chest lock click and magical sparkle chime",
    "firefly_twinkle": "Soft magical fairy firefly bell shimmer",
    "spyglass_peek": "Gentle brass telescope lens click and warm magical hum",
    "mismatch_thud": "Soft gentle wooden tap",
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


def api_get_json(url: str, api_key: str):
    req = urllib.request.Request(
        url,
        headers={
            "xi-api-key": api_key,
            "Accept": "application/json",
            "User-Agent": "WyattEmmaMatchAudioBuilder/2.0",
        },
        method="GET",
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode("utf-8"))


def check_subscription_credits(api_key: str, label: str = "Subscription") -> Tuple[int, int, int]:
    try:
        sub = api_get_json("https://api.elevenlabs.io/v1/user/subscription", api_key)
        used = int(sub.get("character_count", 0))
        limit = int(sub.get("character_limit", 0))
        remaining = max(0, limit - used)
        tier = sub.get("tier", "unknown")
        print(
            f"[ElevenLabs {label}] Tier: {tier} | Used: {used:,} / {limit:,} | Remaining credits: {remaining:,} chars"
        )
        return used, limit, remaining
    except Exception as exc:
        print(f"[ElevenLabs {label}] Could not read subscription info ({exc})")
        return 0, 0, 0


def synthesize_voice_mp3(
    api_key: str,
    voice_id: str,
    text: str,
    out_path: str,
    previous_text: str = "Let's read the word calmly:",
) -> int:
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=mp3_44100_128"
    payload = {
        "text": text,
        "model_id": "eleven_multilingual_v2",
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
    parser = argparse.ArgumentParser(description="Build Animal Match Safari audio & SFX library.")
    parser.add_argument("--force", action="store_true", help="Regenerate files even if cached.")
    args = parser.parse_args()

    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    env_vars = load_env_file(root_dir)
    api_key = env_vars.get("ELEVENLABS_API_KEY", "").strip()
    voice_id = env_vars.get("ELEVENLABS_VOICE_ID", "nzFihrBIvB34imQBuxub").strip()

    if not api_key:
        print("ERROR: ELEVENLABS_API_KEY not found in .env!", file=sys.stderr)
        return 1

    check_subscription_credits(api_key, "Before Build")

    base_out_dir = os.path.join(root_dir, "public", "assets", "audio", "memory-match")
    words_dir = os.path.join(base_out_dir, "words")
    whispers_dir = os.path.join(base_out_dir, "whispers")
    sfx_dir = os.path.join(base_out_dir, "sfx")
    for d in (words_dir, whispers_dir, sfx_dir):
        os.makedirs(d, exist_ok=True)

    balloon_words_dir = os.path.join(root_dir, "public", "assets", "audio", "balloon-pop", "words")

    # 1. Words (reuse balloon-pop MP3s if overlapping, generate only missing new words)
    for word_key, prompt_text in NEW_WORDS_DICT.items():
        out_path = os.path.join(words_dir, f"word_{word_key}.mp3")
        balloon_existing = os.path.join(balloon_words_dir, f"word_{word_key}.mp3")
        if not args.force and not os.path.exists(out_path) and os.path.exists(balloon_existing):
            shutil.copyfile(balloon_existing, out_path)
            print(f"  [REUSED BALLOON-POP] words/word_{word_key}.mp3 (0 credits)")
            continue
        if not args.force and os.path.exists(out_path) and os.path.getsize(out_path) > 800:
            print(f"  [CACHE HIT] words/word_{word_key}.mp3")
            continue
        size_b = synthesize_voice_mp3(api_key, voice_id, prompt_text, out_path)
        print(f"  [GENERATED WORD] words/word_{word_key}.mp3 ({size_b:,} bytes) — '{prompt_text}'")
        time.sleep(0.12)

    # 2. Whispers (4 calm event lines)
    for whisper_id, prompt_text in WHISPERS_DICT.items():
        out_path = os.path.join(whispers_dir, f"{whisper_id}.mp3")
        if not args.force and os.path.exists(out_path) and os.path.getsize(out_path) > 800:
            print(f"  [CACHE HIT] whispers/{whisper_id}.mp3")
            continue
        size_b = synthesize_voice_mp3(
            api_key,
            voice_id,
            prompt_text,
            out_path,
            previous_text="Let's whisper calmly and warmly to the children:",
        )
        print(f"  [GENERATED WHISPER] whispers/{whisper_id}.mp3 ({size_b:,} bytes) — '{prompt_text}'")
        time.sleep(0.12)

    # 3. Acoustic Sound Effects (6 SFX via ElevenLabs Sound Generation)
    for sfx_id, sfx_prompt in SFX_DICT.items():
        out_path = os.path.join(sfx_dir, f"{sfx_id}.mp3")
        if not args.force and os.path.exists(out_path) and os.path.getsize(out_path) > 800:
            print(f"  [CACHE HIT] sfx/{sfx_id}.mp3")
            continue
        try:
            size_b = synthesize_sfx_mp3(api_key, sfx_prompt, out_path, duration_seconds=1.5)
            print(f"  [GENERATED SFX] sfx/{sfx_id}.mp3 ({size_b:,} bytes) — '{sfx_prompt}'")
            time.sleep(0.15)
        except Exception as exc:
            print(f"  [SFX FALLBACK NOTE] sfx/{sfx_id}.mp3 ({exc}) — WebAudio synth fallback will handle.")

    check_subscription_credits(api_key, "After Build")
    return 0


if __name__ == "__main__":
    sys.exit(main())
