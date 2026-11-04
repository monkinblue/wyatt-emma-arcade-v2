#!/usr/bin/env python3
"""
Offline ElevenLabs Voice & Arcade Kart SFX Builder for "Zoomy Cloud Kart" (`CloudKartScene.ts`)
Reads `ELEVENLABS_API_KEY` strictly from `.env` (never imported or referenced in `src/`) and generates:
  1. `public/assets/audio/cloudkart/letters/letter_<a..z>.mp3`
  2. `public/assets/audio/cloudkart/numbers/num_<0..9>.mp3`
  3. `public/assets/audio/cloudkart/prompts/<id>.mp3` (stroke guidance, gate announcements & podium praise)
  4. `public/assets/audio/cloudkart/sfx/<id>.mp3` (7 custom kart & penmanship SFX via POST /v1/sound-generation)

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

LETTERS_DICT: Dict[str, str] = {
    "a": "A.",
    "b": "Bee.",
    "c": "See.",
    "d": "Dee.",
    "e": "Ee.",
    "f": "Eff.",
    "g": "Jee.",
    "h": "Eightch.",
    "i": "Eye.",
    "j": "Jay.",
    "k": "Kay.",
    "l": "Ell.",
    "m": "Emm.",
    "n": "Enn.",
    "o": "Oh.",
    "p": "Pee.",
    "q": "Cue.",
    "r": "Are.",
    "s": "Ess.",
    "t": "Tee.",
    "u": "You.",
    "v": "Vee.",
    "w": "Double-you.",
    "x": "Ex.",
    "y": "Why.",
    "z": "Zee.",
}

NUMBERS_DICT: Dict[str, Tuple[str, str, str]] = {
    "0": ("Zero.", "Let's count the numbers clearly.", "One, two, three."),
    "1": ("One.", "Zero.", "Two, three, four."),
    "2": ("Two.", "Zero, one.", "Three, four, five."),
    "3": ("Three.", "One, two.", "Four, five, six."),
    "4": ("Four.", "One, two, three.", "Five, six, seven."),
    "5": ("Five.", "Two, three, four.", "Six, seven, eight."),
    "6": ("Six.", "Three, four, five.", "Seven, eight, nine."),
    "7": ("Seven.", "Four, five, six.", "Eight, nine."),
    "8": ("Eight.", "Five, six, seven.", "Nine, ten."),
    "9": ("Nine.", "Six, seven, eight.", "Ten."),
}

PROMPTS_DICT: Dict[str, str] = {
    "welcome_title": "Welcome to Zoomy Cloud Kart. Rainbow Hill Racer.",
    "race_start_wyatt": "Ready, Wyatt. Steer your Cloud Kart down Rainbow Hill.",
    "race_start_emma": "Ready, Emma. Steer your Cloud Kart down Rainbow Hill.",
    "gate_intro_letter": "Sky Gate ahead. Trace the letter from the green flag to power your rainbow boost.",
    "gate_intro_number": "Sky Gate ahead. Trace the number from the green flag to power your rainbow boost.",
    "stroke_start_flag": "Start at the green flag at the top.",
    "stroke_next": "Nice stroke. Now start at the next green flag.",
    "stroke_stay_on_track": "Stay on the glowing cloud track. Slide back to the green circle.",
    "stroke_try_rewrite": "Canvas cleared. Let's write it fresh from the green flag.",
    "admire_letter": "Wonderful handwriting. Look at the letter you wrote.",
    "admire_number": "Wonderful handwriting. Look at the number you wrote.",
    "turbo_boost_go": "Mega rainbow turbo boost. Zoom through the clouds.",
    "podium_wyatt": "Congratulations, Wyatt. Look at all three letters you wrote on the championship banner.",
    "podium_emma": "Congratulations, Emma. Look at all three letters you wrote on the championship banner.",
    "mode_uppercase": "Uppercase letters mode. A through Z.",
    "mode_numbers": "Numbers mode. Zero through nine.",
    "mode_mixed": "Letters and numbers mix mode.",
    "mode_sequential": "In order mode.",
    "mode_random": "Surprise random mode.",
    "track_precision": "Standard precision track for Wyatt.",
    "track_cozy": "Wide cozy track for Emma.",
}

SFX_DICT: Dict[str, Tuple[str, float]] = {
    "kart_engine_purr": (
        "Warm vintage clockwork roadster engine purring smoothly with gentle wind in the clouds",
        2.0,
    ),
    "rainbow_turbo_boost": (
        "Magical 32-bit arcade kart rainbow turbo boost whoosh with sparkling starlight chimes",
        1.8,
    ),
    "chalk_trace_loop": (
        "Soft magical golden starlight chalk gliding smoothly across a cloud canvas",
        1.5,
    ),
    "off_track_rumble": (
        "Gentle soft puffy cloud tire rumble and mild wooden spring bounce",
        1.0,
    ),
    "star_coin_chime": (
        "Bright cheerful arcade gold star coin pickup chime",
        0.9,
    ),
    "sky_gate_open": (
        "Grand brass clockwork archway opening with a warm magical harp glissando",
        1.8,
    ),
    "podium_fanfare": (
        "Joyful Nintendo style brass and harp championship podium celebration fanfare",
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
    previous_text: str = "Let's practice writing our letters and numbers calmly.",
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
    parser = argparse.ArgumentParser(description="Build Zoomy Cloud Kart offline voice & SFX library.")
    parser.add_argument("--force", action="store_true", help="Regenerate files even if cached.")
    args = parser.parse_args()

    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    env_vars = load_env_file(root_dir)
    api_key = env_vars.get("ELEVENLABS_API_KEY", "").strip()
    voice_id = env_vars.get("ELEVENLABS_VOICE_ID", "nzFihrBIvB34imQBuxub").strip()

    if not api_key:
        mjs_script = os.path.join(os.path.dirname(os.path.abspath(__file__)), "build_cloudkart_audio.mjs")
        if os.path.exists(mjs_script):
            return subprocess.call(["node", mjs_script])
        print("ERROR: ELEVENLABS_API_KEY not found in .env!", file=sys.stderr)
        return 1

    base_out_dir = os.path.join(root_dir, "public", "assets", "audio", "cloudkart")
    letters_dir = os.path.join(base_out_dir, "letters")
    numbers_dir = os.path.join(base_out_dir, "numbers")
    prompts_dir = os.path.join(base_out_dir, "prompts")
    sfx_dir = os.path.join(base_out_dir, "sfx")

    for d in (letters_dir, numbers_dir, prompts_dir, sfx_dir):
        os.makedirs(d, exist_ok=True)

    # 1. Letters A..Z (reuse verified Josh letter clips from balloon-pop if available, or synthesize)
    balloon_letters_dir = os.path.join(root_dir, "public", "assets", "audio", "balloon-pop", "letters")
    for ch, spoken in LETTERS_DICT.items():
        out_path = os.path.join(letters_dir, f"letter_{ch}.mp3")
        if not args.force and os.path.exists(out_path) and os.path.getsize(out_path) > 800:
            print(f"  [CACHE HIT] letters/letter_{ch}.mp3")
            continue
        src_cached = os.path.join(balloon_letters_dir, f"letter_{ch}.mp3")
        if not args.force and os.path.exists(src_cached) and os.path.getsize(src_cached) > 800:
            shutil.copy2(src_cached, out_path)
            print(f"  [COPIED VERIFIED LETTER] letters/letter_{ch}.mp3")
            continue
        size_b = synthesize_voice_mp3(
            api_key,
            voice_id,
            spoken,
            out_path,
            model_id="eleven_turbo_v2_5",
            previous_text="Let's say the alphabet letter clearly.",
        )
        print(f"  [GENERATED LETTER] letters/letter_{ch}.mp3 ({size_b:,} bytes) — '{spoken}'")
        time.sleep(0.08)

    # 2. Numbers 0..9 (reuse verified Josh number clips from shutthebox if available, or synthesize)
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
            api_key,
            voice_id,
            text,
            out_path,
            model_id="eleven_turbo_v2_5",
            previous_text=prev_txt,
            next_text=next_txt,
        )
        print(f"  [GENERATED NUMBER] numbers/num_{num_key}.mp3 ({size_b:,} bytes) — '{text}'")
        time.sleep(0.08)

    # 3. Stroke Guidance & Race Prompts
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
            previous_text="Let's guide the children warmly and calmly in our Cloud Kart handwriting game.",
        )
        print(f"  [GENERATED PROMPT] prompts/{prompt_key}.mp3 ({size_b:,} bytes) — '{text}'")
        time.sleep(0.1)

    # 4. Arcade Kart & Penmanship SFX via ElevenLabs Sound Generation API
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
