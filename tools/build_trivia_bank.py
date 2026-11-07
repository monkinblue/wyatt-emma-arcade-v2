#!/usr/bin/env python3
"""
tools/build_trivia_bank.py
--------------------------
Mentor Note: Offline Question Bank Generator for "STARSHIP UNICORN: ORBITAL TRIVIA" (`StarshipUnicornScene.ts`).
Generates `src/data/starshipTrivia.json` containing 335+ verified multiple-choice questions (4 options each: Red, Blue, Amber, Emerald):
  - 225+ Adult Party Trivia Questions across 9 categories:
      * Space & Aerospace (SpaceX, NASA, Astronomy)
      * 80s/90s/2000s Movies & TV
      * Music & Rock/Pop History
      * World Geography & Landmarks
      * Food, Drinks & BBQ
      * Video Games & Tech
      * History & Amazing Inventions
      * Sports & Olympics
      * Wild Nature & Science Facts
  - 55+ Wyatt (Age 4) Questions tailored to a sharp 4-year-old boy (Dinosaurs, Space & Planets, Construction Trucks, Ocean Animals, Counting, Science & Action).
  - 55+ Emma (Age 3) Visual Questions tailored to a joyful 3-year-old girl with unmistakable large emojis + labels on every button.
"""

import subprocess
import sys
from pathlib import Path


def main() -> int:
    mjs_script = Path(__file__).resolve().parent / "build_trivia_bank.mjs"
    if mjs_script.exists():
        return subprocess.call(["node", str(mjs_script)] + sys.argv[1:])
    print("ERROR: build_trivia_bank.mjs not found", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
