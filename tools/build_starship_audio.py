#!/usr/bin/env python3
"""
tools/build_starship_audio.py
-----------------------------
Offline ElevenLabs Mission Control Announcer & Sci-Fi SFX Builder for
"STARSHIP UNICORN: ORBITAL TRIVIA" (`StarshipUnicornScene.ts` & `StarshipAudioEngine.ts`).

Reads `ELEVENLABS_API_KEY` strictly from `.env` (never imported or referenced in `src/`) and generates:
  1. `public/assets/audio/starship/voice/<clip_id>.mp3` (31 personalized astronaut turn & mission event callouts)
  2. `public/assets/audio/starship/sfx/<sfx_id>.mp3` (6 cinematic SpaceX / FICSIT orbital SFX clips)
"""

import argparse
import json
import os
import subprocess
import sys
import time
import urllib.request
from pathlib import Path
from typing import Dict, Tuple

VOICE_CLIPS: Dict[str, str] = {
    "turn_robert": "Commander Robert, step to the launchpad.",
    "turn_rita": "Flight Director Rita, telemetry locked.",
    "turn_wyatt": "Astro-Ranger Wyatt, ready for ignition.",
    "turn_emma": "Space Princess Emma, engage starlight thrusters.",
    "turn_papa": "Chief Engineer Papa, your turn at the helm.",
    "turn_nana": "Science Officer Nana, mission control standing by.",
    "turn_grandpa": "Fleet Admiral Grandpa, orbital path clear.",
    "turn_babci": "Navigator Babci, ready for launch.",
    "turn_guest": "Guest Specialist, step up to the console.",
    "welcome_title": "Welcome to Starship Unicorn: Orbital Trivia.",
    "lobby_select": "Select two to six astronauts and choose your orbital trajectory.",
    "launch_sequence": "Telemetry nominal. All crew locked in. Initiating orbital launch sequence.",
    "overclock_engaged": "Overclock engaged. Twin booster dice unlocked.",
    "standard_thruster": "Nice try. Standard thruster engaged.",
    "color_warp_bonus": "Color synchronization achieved. Warping to the next matching orbital pad.",
    "tile_wormhole": "Hyperloop wormhole activated.",
    "tile_overclock": "FICSIT turbo boost.",
    "tile_asteroid": "Warning: Asteroid gravity well.",
    "tile_rainbow_starship": "Rainbow Starship warp engaged.",
    "roll_prompt": "Engage thruster roll.",
    "almost_there": "Final orbital approach to the Cyber-Unicorn Citadel.",
    "victory_citadel": "We have liftoff. A new Galactic Unicorn Champion has reached the Citadel.",
    "victory_robert": "We have liftoff. Commander Robert has reached the Unicorn Citadel.",
    "victory_rita": "We have liftoff. Flight Director Rita has reached the Unicorn Citadel.",
    "victory_wyatt": "We have liftoff. Astro-Ranger Wyatt has reached the Unicorn Citadel.",
    "victory_emma": "We have liftoff. Space Princess Emma has reached the Unicorn Citadel.",
    "victory_papa": "We have liftoff. Chief Engineer Papa has reached the Unicorn Citadel.",
    "victory_nana": "We have liftoff. Science Officer Nana has reached the Unicorn Citadel.",
    "victory_grandpa": "We have liftoff. Fleet Admiral Grandpa has reached the Unicorn Citadel.",
    "victory_babci": "We have liftoff. Navigator Babci has reached the Unicorn Citadel.",
    "victory_guest": "We have liftoff. Guest Specialist has reached the Unicorn Citadel.",
}

SFX_CLIPS: Dict[str, Tuple[str, float]] = {
    "rocket_ignition": (
        "Deep cinematic SpaceX orbital rocket booster ignition rumble and plasma thruster whoosh",
        2.0,
    ),
    "hyperloop_whoosh": (
        "Futuristic sci-fi magnetic hyperloop plasma tube warp whoosh with shimmering synth chime",
        1.6,
    ),
    "overclock_chime": (
        "High-tech FICSIT industrial power-up overclock telemetry lock chime and energetic synth chord",
        1.4,
    ),
    "asteroid_retro": (
        "Sci-fi spacecraft retro-thruster braking burst and gentle magnetic shield deflect",
        1.3,
    ),
    "dice_tumble": (
        "Futuristic metallic titanium and holographic energy dice tumbling on a glass console",
        1.2,
    ),
    "citadel_fanfare": (
        "Epic triumphant synthwave sci-fi orchestral fanfare with shimmering starlight arpeggios",
        3.0,
    ),
}


def main() -> int:
    mjs_script = Path(__file__).resolve().parent / "build_starship_audio.mjs"
    if mjs_script.exists():
        return subprocess.call(["node", str(mjs_script)] + sys.argv[1:])
    return 1


if __name__ == "__main__":
    sys.exit(main())
