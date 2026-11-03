#!/usr/bin/env python3
"""
Offline ElevenLabs Audio Generator for Wyatt & Emma's Alphabet & Word Sky-Ship ("Balloon Pop")
Reads ELEVENLABS_API_KEY strictly from local `.env` (never exposed in frontend code)
and generates static MP3 files into `public/assets/audio/balloon-pop/` using "Josh - Teacher for Kids":
  - `letters/letter_a.mp3` .. `letter_z.mp3` (26 files)
  - `phonics/phonics_a.mp3` .. `phonics_z.mp3` (26 files)
  - `words/word_<word>.mp3` (96 categorized kid words across 6 themes)
  - `praise/<id>.mp3` (7 warm teacher praise & mode prompt clips)

Usage:
  python tools/build_balloon_audio.py --test --force   # Generates 3 sample clips to preview voice
  python tools/build_balloon_audio.py --all --force    # Regenerates full library with calm voice settings
"""

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from typing import Dict, List, Tuple

# ---------------------------------------------------------------------------
# 1. COMPLETE DICTIONARY OF LETTERS, PHONICS, 96 WORDS & 7 PRAISE CLIPS
#    (ZERO exclamation points — every prompt ends calmly with a period '.')
# ---------------------------------------------------------------------------

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

PHONICS_DICT: Dict[str, str] = {
    "a": "ah, as in apple.",
    "b": "buh, as in bear.",
    "c": "kuh, as in cat.",
    "d": "duh, as in dog.",
    "e": "eh, as in elephant.",
    "f": "fff, as in fish.",
    "g": "guh, as in goat.",
    "h": "huh, as in hat.",
    "i": "ih, as in igloo.",
    "j": "juh, as in jet.",
    "k": "kuh, as in kite.",
    "l": "lll, as in lion.",
    "m": "mmm, as in monkey.",
    "n": "nnn, as in nest.",
    "o": "aw, as in octopus.",
    "p": "puh, as in pig.",
    "q": "kwuh, as in queen.",
    "r": "rrr, as in rabbit.",
    "s": "sss, as in sun.",
    "t": "tuh, as in train.",
    "u": "uh, as in umbrella.",
    "v": "vvv, as in van.",
    "w": "wuh, as in wagon.",
    "x": "ks, as in fox.",
    "y": "yuh, as in yo-yo.",
    "z": "zzz, as in zebra.",
}

WORD_THEMES: Dict[str, List[str]] = {
    "family": [
        "WYATT", "EMMA", "MAMA", "DADA", "NANA", "PAPA", "DOG", "SPARKY",
    ],
    "animals": [
        "CAT", "PIG", "BUG", "FOX", "HEN", "COW", "BAT", "OWL",
        "FROG", "BEAR", "DUCK", "FISH", "LION", "CRAB", "GOAT", "DEER",
        "TIGER", "ZEBRA", "SHARK", "WHALE", "HORSE", "SHEEP", "MOUSE", "SNAKE",
    ],
    "vehicles": [
        "CAR", "BUS", "VAN", "JET", "SUB", "SHIP",
        "TRAIN", "TRUCK", "PLANE", "BOAT", "ROCKET", "TRACTOR",
    ],
    "nature": [
        "SUN", "SKY", "MUD", "LOG", "WEB", "STAR", "MOON", "TREE",
        "RAIN", "SNOW", "WIND", "LEAF", "ROCK", "CLOUD", "EARTH", "OCEAN",
    ],
    "food": [
        "JAM", "PIE", "CUP", "EGG", "NUT", "CAKE", "MILK", "CORN",
        "PEAR", "PLUM", "SOUP", "TACO", "APPLE", "BREAD", "PIZZA", "BERRY",
    ],
    "home": [
        "HAT", "BED", "BOX", "RUG", "TOP", "PEN", "BAG", "KEY",
        "BOOK", "DRUM", "BALL", "DOLL", "KITE", "BELL", "TENT", "ROBOT",
        "CLOCK", "CROWN",
    ],
}

WORDS_DICT: Dict[str, str] = {}
for _theme, _word_list in WORD_THEMES.items():
    for _w in _word_list:
        _key = _w.lower()
        WORDS_DICT[_key] = f"{_key}."

PRAISE_DICT: Dict[str, str] = {
    "praise_wyatt": "Great job spelling, Wyatt.",
    "praise_emma": "Wonderful job, Emma.",
    "praise_frenzy": "Bonus rainbow balloons. Pop as many as you like.",
    "praise_star": "You earned a gold star.",
    "praise_complete": "Well done, you built the whole word.",
    "prompt_phonics": "Find and pop the matching letter balloon.",
    "prompt_spell": "Pop the balloons in order to spell the word.",
}


def load_env_file(root_dir: str) -> Dict[str, str]:
    """Reads `.env` from project root via python-dotenv if available, or clean line parsing."""
    env_vars: Dict[str, str] = {}
    env_path = os.path.join(root_dir, ".env")

    try:
        from dotenv import dotenv_values  # type: ignore
        loaded = dotenv_values(env_path)
        for k, v in loaded.items():
            if k and v is not None:
                env_vars[k] = str(v).strip()
    except ImportError:
        if os.path.exists(env_path):
            with open(env_path, "r", encoding="utf-8") as f:
                for raw_line in f:
                    line = raw_line.strip()
                    if not line or line.startswith("#") or "=" not in line:
                        continue
                    k, v = line.split("=", 1)
                    env_vars[k.strip()] = v.strip().strip('"').strip("'")

    for key in ("ELEVENLABS_API_KEY", "ELEVENLABS_VOICE_NAME", "ELEVENLABS_VOICE_ID"):
        if key not in env_vars and os.environ.get(key):
            env_vars[key] = os.environ[key]

    return env_vars


def api_get_json(url: str, api_key: str):
    req = urllib.request.Request(
        url,
        headers={
            "xi-api-key": api_key,
            "Accept": "application/json",
            "User-Agent": "WyattEmmaArcadeAudioBuilder/2.0",
        },
        method="GET",
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode("utf-8"))


def check_subscription_credits(api_key: str) -> None:
    try:
        sub = api_get_json("https://api.elevenlabs.io/v1/user/subscription", api_key)
        used = sub.get("character_count", 0)
        limit = sub.get("character_limit", 0)
        remaining = max(0, limit - used)
        tier = sub.get("tier", "unknown")
        print(f"[ElevenLabs Subscription] Tier: {tier} | Used: {used:,} / {limit:,} | Remaining credits: {remaining:,} chars")
    except Exception as exc:
        print(f"[ElevenLabs Subscription] Note: Could not read subscription info ({exc}); continuing with voice synthesis.")


def resolve_josh_voice_id(api_key: str, default_voice_id: str) -> Tuple[str, str]:
    try:
        data = api_get_json("https://api.elevenlabs.io/v1/voices", api_key)
        voices = data.get("voices", [])
        # 1. Prefer exact/substring match on 'josh - teacher for kids'
        for v in voices:
            name = str(v.get("name", ""))
            vid = str(v.get("voice_id", ""))
            if "josh - teacher for kids" in name.lower() and vid:
                print(f"[Voice Lookup] Found preferred Josh voice: '{name}' (voice_id={vid})")
                return vid, name
        # 2. Fallback to any voice containing 'josh'
        for v in voices:
            name = str(v.get("name", ""))
            vid = str(v.get("voice_id", ""))
            if "josh" in name.lower() and vid:
                print(f"[Voice Lookup] Found matching Josh voice: '{name}' (voice_id={vid})")
                return vid, name
        print(f"[Voice Lookup] 'Josh' not in custom list ({len(voices)} voices returned); using configured ELEVENLABS_VOICE_ID={default_voice_id}")
    except Exception as exc:
        print(f"[Voice Lookup] Could not list voices ({exc}); falling back to ELEVENLABS_VOICE_ID={default_voice_id}")
    return default_voice_id, "Josh - Teacher for Kids"


def synthesize_to_mp3(
    api_key: str,
    voice_id: str,
    text: str,
    out_path: str,
    model_id: str = "eleven_multilingual_v2",
    previous_text: str = "",
    next_text: str = "",
) -> int:
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=mp3_44100_128"
    payload = {
        "text": text,
        "model_id": model_id,
        "voice_settings": {
            "stability": 0.86,
            "similarity_boost": 0.75,
            "style": 0.0,
            "use_speaker_boost": False,
        },
    }
    if previous_text:
        payload["previous_text"] = previous_text
    if next_text:
        payload["next_text"] = next_text
    if model_id == "eleven_turbo_v2_5":
        payload["language_code"] = "en"
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "xi-api-key": api_key,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
            "User-Agent": "WyattEmmaArcadeAudioBuilder/2.0",
        },
        method="POST",
    )

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with urllib.request.urlopen(req, timeout=45) as resp:
        audio_bytes = resp.read()

    with open(out_path, "wb") as f:
        f.write(audio_bytes)

    return len(audio_bytes)


def build_task_list(base_out_dir: str, test_only: bool) -> List[Tuple[str, str, str]]:
    """Returns list of (category_label, text_to_speak, absolute_mp3_path)."""
    letters_dir = os.path.join(base_out_dir, "letters")
    phonics_dir = os.path.join(base_out_dir, "phonics")
    words_dir = os.path.join(base_out_dir, "words")
    praise_dir = os.path.join(base_out_dir, "praise")

    if test_only:
        return [
            ("letter_a", LETTERS_DICT["a"], os.path.join(letters_dir, "letter_a.mp3")),
            ("phonics_h", PHONICS_DICT["h"], os.path.join(phonics_dir, "phonics_h.mp3")),
            ("word_mama", WORDS_DICT["mama"], os.path.join(words_dir, "word_mama.mp3")),
        ]

    tasks: List[Tuple[str, str, str]] = []
    for ch, text in sorted(LETTERS_DICT.items()):
        tasks.append((f"letter_{ch}", text, os.path.join(letters_dir, f"letter_{ch}.mp3")))
    for ch, text in sorted(PHONICS_DICT.items()):
        tasks.append((f"phonics_{ch}", text, os.path.join(phonics_dir, f"phonics_{ch}.mp3")))
    for word_key, text in WORDS_DICT.items():
        tasks.append((f"word_{word_key}", text, os.path.join(words_dir, f"word_{word_key}.mp3")))
    for praise_id, text in PRAISE_DICT.items():
        tasks.append((praise_id, text, os.path.join(praise_dir, f"{praise_id}.mp3")))
    return tasks


def main() -> int:
    parser = argparse.ArgumentParser(description="Build Balloon Pop offline ElevenLabs audio library.")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--test", action="store_true", help="Generate ONLY the 3 sample clips to preview the voice.")
    group.add_argument("--all", action="store_true", help="Generate the full library (letters, phonics, 96 words, 7 praise clips).")
    group.add_argument("--only", type=str, help="Generate ONLY a specific clip label (e.g. letter_a) and force overwrite.")
    parser.add_argument("--force", action="store_true", help="Regenerate files even if cached > 1000 bytes.")
    args = parser.parse_args()

    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    env_vars = load_env_file(root_dir)

    api_key = env_vars.get("ELEVENLABS_API_KEY", "").strip()
    default_voice_id = env_vars.get("ELEVENLABS_VOICE_ID", "NOpBlnGInO9m6vDvFkFC").strip()

    if not api_key:
        print("ERROR: ELEVENLABS_API_KEY not found in .env!", file=sys.stderr)
        return 1

    check_subscription_credits(api_key)
    voice_id, voice_name = resolve_josh_voice_id(api_key, default_voice_id)
    print(f"[Audio Builder] Using voice '{voice_name}' ({voice_id})")

    base_out_dir = os.path.join(root_dir, "public", "assets", "audio", "balloon-pop")
    for sub in ("letters", "phonics", "words", "praise"):
        os.makedirs(os.path.join(base_out_dir, sub), exist_ok=True)

    tasks = build_task_list(base_out_dir, test_only=args.test)
    if args.only:
        wanted = {s.strip() for s in args.only.split(",")}
        tasks = [t for t in build_task_list(base_out_dir, test_only=False) if t[0] in wanted]
        args.force = True
    generated_count = 0
    skipped_count = 0

    for label, text, out_path in tasks:
        rel_path = os.path.relpath(out_path, root_dir).replace("\\", "/")
        if not args.force and os.path.exists(out_path) and os.path.getsize(out_path) > 1000:
            size_b = os.path.getsize(out_path)
            print(f"  [CACHE HIT] {rel_path} ({size_b:,} bytes) — '{text}'")
            skipped_count += 1
            continue

        try:
            next_ctx = ""
            if label == "letter_a":
                prev_ctx = "Let's say the first letter of the English alphabet calmly, which rhymes with day and play:"
                next_ctx = "is for apron."
            elif label == "letter_h":
                prev_ctx = "The eighth letter of the English alphabet is pronounced:"
            elif label == "letter_r":
                prev_ctx = "The letter after Q in the English alphabet is pronounced:"
            elif label.startswith("letter_"):
                prev_ctx = "Here is the next letter of the English alphabet:"
            elif label.startswith("word_"):
                prev_ctx = "Let's read the word calmly:"
            else:
                prev_ctx = ""

            size_b = synthesize_to_mp3(
                api_key,
                voice_id,
                text,
                out_path,
                model_id="eleven_multilingual_v2",
                previous_text=prev_ctx,
                next_text=next_ctx,
            )
            print(f"  [GENERATED] {rel_path} ({size_b:,} bytes) — '{text}'")
            generated_count += 1
            time.sleep(0.15)
        except urllib.error.HTTPError as http_err:
            err_body = http_err.read().decode("utf-8", errors="replace")
            print(f"  [HTTP ERROR {http_err.code}] {rel_path}: {err_body}", file=sys.stderr)
            return 1
        except Exception as exc:
            print(f"  [ERROR] {rel_path}: {exc}", file=sys.stderr)
            return 1

    print(f"\nDone! Generated: {generated_count} | Cached/Skipped: {skipped_count} | Total: {len(tasks)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
