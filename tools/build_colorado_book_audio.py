#!/usr/bin/env python3
"""
tools/build_colorado_book_audio.py
----------------------------------
Automated ElevenLabs Narration & Acoustic SFX Generator for Book 2:
"To Babci and Grandpa's House We Go! / A Colorado Adventure"

Features:
1. Strictly uses the exact same ElevenLabs Grandpa/Storybook narrator voice as Book 1 (Michigan book):
   - Voice Name: `Spuds Oxley - Grandpa`
   - Voice ID: `NOpBlnGInO9m6vDvFkFC`
   - Never uses the `Josh - Teacher for Kids` (`nzFihrBIvB34imQBuxub`) voice from `.env`!
2. CRITICAL PRONUNCIATION RULE FOR "BABCI":
   - On-screen UI titles and karaoke text spell her name `Babci` (and `Babci's`).
   - All text strings sent to the ElevenLabs TTS API automatically replace `"Babci's"` with
     `"Bob-chee's"` and `"Babci"` with `"Bob-chee"` so Grandpa pronounces it 100%
     accurately as "Bob-chee"!
3. Generates `title.mp3` and `page_1.mp3` .. `page_9.mp3` into `public/assets/audio/colorado/narration/`.
4. Generates 12 custom acoustic SFX via ElevenLabs Sound Generation API (`POST /v1/sound-generation`)
   into `public/assets/audio/colorado/sfx/`.
"""

import argparse
import json
import os
from pathlib import Path
import urllib.request

ROOT_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = ROOT_DIR / ".env"
NARRATION_DIR = ROOT_DIR / "public" / "assets" / "audio" / "colorado" / "narration"
SFX_DIR = ROOT_DIR / "public" / "assets" / "audio" / "colorado" / "sfx"

# Exact Michigan Book (Book 1) Grandpa Narrator Voice (extracted from tools/sync_audio.py):
MICHIGAN_BOOK_VOICE_NAME = "Spuds Oxley - Grandpa"
MICHIGAN_BOOK_VOICE_ID = "NOpBlnGInO9m6vDvFkFC"
MICHIGAN_BOOK_VOICE_SETTINGS = {
    "stability": 0.68,
    "similarity_boost": 0.82,
    "style": 0.15,
    "use_speaker_boost": True,
}

NARRATION_SCRIPTS = {
    "title": "To Babci and Grandpa's House We Go. A Colorado Adventure.",
    "page_1": (
        "We packed up our gray Subaru and our big rooftop box for a family road trip to Colorado. "
        "Dad held Wyatt in his cozy blue pajamas and Mom held baby Emma as we looked out over the golden autumn mountains."
    ),
    "page_2": (
        "Hooray, we made it to Babci and Grandpa's sunny house in Colorado. "
        "Grandpa and Babci waved from the front porch by the purple lavender flowers and gave Wyatt and Emma the warmest hugs."
    ),
    "page_3": (
        "Next we visited the magical Manitou Springs Penny Arcade. "
        "Wyatt and Emma rolled wooden Skee-Balls, rode the bouncy pony, and won long strings of golden tickets while Grandpa and Babci cheered."
    ),
    "page_4": (
        "In sunny Eleven Mile Canyon, Grandpa held Wyatt on the riverbank so he could dip his blue water shoes into the sparkling stream. "
        "Little sister Emma sat on a smooth river stone and splashed her hands in the cool water."
    ),
    "page_5": (
        "Way up high across the Royal Gorge Bridge, we walked together over the deep red canyon. "
        "Wyatt and Emma waved at the bright red gondola gliding through the blue Colorado sky."
    ),
    "page_6": (
        "All aboard the orange Royal Gorge train chugging right beside the rushing river. "
        "Grandpa lifted Wyatt up to pull the shiny brass cord, and the big train horn blasted a giant choo-choo through the canyon."
    ),
    "page_7": (
        "At Garden of the Gods, giant glowing red rocks reached all the way up toward snowy Pikes Peak. "
        "Wyatt, Emma, Babci, and Grandpa explored the sunny trail with friendly bluebirds and a little bunny."
    ),
    "page_8": (
        "Back in Babci's sunny backyard, barefoot Mom pulled Wyatt and laughing Emma across the green grass in their red Radio Flyer wagon. "
        "Right beside the brick patio, we tapped golf balls into the two-hole putting green."
    ),
    "page_9": (
        "Inside Babci's cozy kitchen, we rolled out soft dough and pinched delicious homemade potato and cheese pierogis together. "
        "Wyatt and Emma got silly puffs of white flour on their noses while golden pierogis sizzled in butter on the stove."
    ),
}

SFX_PROMPTS = [
    ("sfx_car_horn.mp3", "Friendly cheerful family SUV double road trip horn beep", 2.0),
    ("sfx_door_welcome.mp3", "Warm wooden front door opening with cheerful doorbell chime", 2.2),
    ("sfx_penny_arcade.mp3", "Retro mechanical penny arcade skee-ball roll, bells ringing, and tickets dispensing", 2.5),
    ("sfx_river_splash.mp3", "Playful mountain river water splash and bubbling stream with child giggle", 2.2),
    ("sfx_trout_jump.mp3", "Fish leaping out of river water with crisp splash", 1.8),
    ("sfx_gondola_bell.mp3", "High mountain aerial cable car bell ding and gentle wind breeze", 2.2),
    ("sfx_train_horn.mp3", "Big powerful vintage Colorado canyon diesel-steam train horn blast echoing through canyon walls, choo choo", 2.8),
    ("sfx_train_chug.mp3", "Rhythmic railroad train wheels clacking on tracks along a river", 2.5),
    ("sfx_red_rocks_birds.mp3", "Peaceful canyon hawk cry and mountain songbirds", 2.4),
    ("sfx_wagon_roll.mp3", "Red toy wagon rolling over grass with happy toddler laughter", 2.4),
    ("sfx_golf_putt.mp3", "Golf club putt tap and ball dropping into metal golf cup", 2.0),
    ("sfx_pierogi_sizzle.mp3", "Butter sizzling in a warm kitchen pan with happy wooden rolling pin taps", 2.4),
]


def load_env(env_path: Path) -> dict:
    env = {}
    if env_path.exists():
        for raw_line in env_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def apply_babci_pronunciation(text: str) -> str:
    """
    Replaces "Babci's" -> "Bob-chee's" and "Babci" -> "Bob-chee" for ElevenLabs TTS
    so Grandpa pronounces Babci as "Bob-chee", while UI text keeps "Babci".
    """
    return (
        text.replace("Babci's", "Bob-chee's")
        .replace("Babci", "Bob-chee")
        .replace("Bahb-chee's", "Bob-chee's")
        .replace("Bahb-chee", "Bob-chee")
    )


def resolve_michigan_narrator_voice(api_key: str) -> str:
    req = urllib.request.Request(
        "https://api.elevenlabs.io/v1/voices",
        headers={"xi-api-key": api_key, "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            voices = data.get("voices", [])
            for v in voices:
                if v.get("voice_id") == MICHIGAN_BOOK_VOICE_ID or "spuds" in v.get("name", "").lower():
                    print(f"[Voice Resolved] {v.get('name')} ({v.get('voice_id')})")
                    return v.get("voice_id")
    except Exception as exc:
        print(
            f"[Voice Lookup Note] Using default Michigan Book Voice: "
            f"{MICHIGAN_BOOK_VOICE_NAME} ({MICHIGAN_BOOK_VOICE_ID}): {exc}"
        )
    return MICHIGAN_BOOK_VOICE_ID


def generate_tts(api_key: str, voice_id: str, text: str, out_path: Path) -> None:
    tts_text = apply_babci_pronunciation(text)
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=mp3_44100_128"
    payload = {
        "text": tts_text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": MICHIGAN_BOOK_VOICE_SETTINGS,
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
    with urllib.request.urlopen(req, timeout=60) as resp:
        audio_bytes = resp.read()
        out_path.write_bytes(audio_bytes)
        print(f"  [GENERATED NARRATION] {out_path.name} ({len(audio_bytes):,} bytes) | TTS: {tts_text!r}")


def generate_sfx(api_key: str, prompt: str, duration_seconds: float, out_path: Path) -> None:
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
    with urllib.request.urlopen(req, timeout=60) as resp:
        audio_bytes = resp.read()
        out_path.write_bytes(audio_bytes)
        print(f"  [GENERATED SFX] {out_path.name} ({len(audio_bytes):,} bytes) — {prompt!r}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build Colorado Storybook Narration & SFX")
    parser.add_argument("--force-sfx", action="store_true", help="Also regenerate existing SFX files")
    args = parser.parse_args()

    env = load_env(ENV_PATH)
    api_key = env.get("ELEVENLABS_API_KEY") or os.environ.get("ELEVENLABS_API_KEY")
    if not api_key:
        raise RuntimeError("ELEVENLABS_API_KEY not found in .env")

    NARRATION_DIR.mkdir(parents=True, exist_ok=True)
    SFX_DIR.mkdir(parents=True, exist_ok=True)

    voice_id = resolve_michigan_narrator_voice(api_key)
    print(f"[Narrator Voice Locked] {MICHIGAN_BOOK_VOICE_NAME} (voice_id={voice_id})")

    for key, script in NARRATION_SCRIPTS.items():
        out_path = NARRATION_DIR / f"{key}.mp3"
        generate_tts(api_key, voice_id, script, out_path)

    for filename, prompt, dur in SFX_PROMPTS:
        out_path = SFX_DIR / filename
        if out_path.exists() and out_path.stat().st_size > 1024 and not args.force_sfx:
            print(f"  [CACHE HIT] sfx/{out_path.name}")
            continue
        generate_sfx(api_key, prompt, dur, out_path)


if __name__ == "__main__":
    main()
