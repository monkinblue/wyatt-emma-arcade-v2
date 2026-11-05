#!/usr/bin/env python3
"""
Wyatt & Emma Arcade v2.0 — Grandpa's Clockwork Train Table (`TrainTableScene.ts`) Asset Pipeline
=================================================================================================
Generates (via GEMINI_API_KEY in .env or staged raw plates) and slices 32-bit Hi-Bit Pixel Art
assets for `TrainTableScene.ts` and the `PLAY ARCADE` shelf in `HubScene.ts`:
  1. `public/assets/hub/arcade/hub-toy-train.png` (and `public/assets/hub/sprites/hub-toy-train.png`)
     — Gleaming crimson-and-brass vintage steam locomotive sitting on a curved beechwood Brio track
       over a miniature stone arch bridge on a carved mahogany pedestal, puffing golden starlight steam.
  2. `public/assets/games/train/train-table-bg.png` (1280x720)
     — Clean-stage 32-bit pixel art Heirloom Emerald Felt & Carved Mahogany Train Table background.
  3. `public/assets/games/train/sprites/*.png` (24 sliced sprites from three 2x4 sheets):
     — Train consist: `train-locomotive.png`, `train-car-red.png`, `train-car-blue.png`, `train-car-gold.png`
     — Engineers & passengers: `char-grandpa.png`, `char-wyatt.png`, `char-emma.png`, `char-doggie.png`, `char-sparky.png`
     — Track modules & station: `mod-royal-bridge.png`, `mod-stone-tunnel.png`, `mod-xylophone-track.png`,
       `mod-crossing-gate.png`, `prop-station-depot.png`
     — Scenery toys: `prop-trex.png`, `prop-unicorn-pasture.png`, `prop-windmill.png`, `prop-pine-forest.png`,
       `prop-water-tower.png`
     — Cargo items & whistle: `cargo-golden-log.png`, `cargo-milk-barrel.png`, `cargo-treasure-chest.png`,
       `cargo-star-crate.png`, `prop-whistle-cord.png`

Chroma-Key Pipeline:
  - Outer border 8-connected BFS flood-fill for `#FF00FF` neon magenta background.
  - Interior enclosed `#FF00FF` hole clearing (bridge cables, windmill lattice sails, water tower trestles,
    locomotive cab windows, fence pickets, crane cables, whistle rope loop) while protecting crimson paint,
    pastel pink milk barrels, and violet xylophone/crystal facets.
  - 2px perimeter de-spill pass and 4px tight bounding-box auto-crop.

Strictly offline build tool — API keys live only in `.env` and are NEVER imported into `src/`.
"""

import base64
from collections import deque
import json
import os
from pathlib import Path
import shutil
import subprocess
import urllib.request

ROOT_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = ROOT_DIR / ".env"

HUB_RAW_PATH = ROOT_DIR / "public" / "assets" / "hub" / "raw" / "hub-toy-train-raw.jpg"
HUB_ARCADE_OUT = ROOT_DIR / "public" / "assets" / "hub" / "arcade" / "hub-toy-train.png"
HUB_SPRITE_OUT = ROOT_DIR / "public" / "assets" / "hub" / "sprites" / "hub-toy-train.png"

GAME_DIR = ROOT_DIR / "public" / "assets" / "games" / "train"
RAW_DIR = GAME_DIR / "raw"
SPRITES_DIR = GAME_DIR / "sprites"

STAGED_ARTIFACT_DIR = Path(r"C:\Users\RobaD\.gemini\antigravity\brain\40abd95d-41c1-4ab2-b279-5395c5b64d9d")
STAGED_FILES = {
    HUB_RAW_PATH: STAGED_ARTIFACT_DIR / "hub_toy_train_raw_1793845369290.jpg",
    RAW_DIR / "train-table-bg-raw.jpg": STAGED_ARTIFACT_DIR / "train_table_bg_raw_1793845388230.jpg",
    RAW_DIR / "train-sheet-1-raw.jpg": STAGED_ARTIFACT_DIR / "train_sheet_1_raw_v2_1793845402968.jpg",
    RAW_DIR / "train-sheet-2-raw.jpg": STAGED_ARTIFACT_DIR / "train_sheet_2_raw_1793845376217.jpg",
    RAW_DIR / "train-sheet-3-raw.jpg": STAGED_ARTIFACT_DIR / "train_sheet_3_raw_1793845373730.jpg",
}

GEMINI_PROMPTS = {
    HUB_RAW_PATH: (
        "32-bit Hi-Bit Pixel Art standing heirloom arcade shelf toy on a solid flat #FF00FF neon magenta "
        "background: a gleaming crimson-and-brass vintage steam locomotive sitting on a curved beechwood "
        "Brio track over a miniature stone arch bridge on a carved dark mahogany pedestal base, puffing "
        "golden starlight steam. Zero text."
    ),
    RAW_DIR / "train-table-bg-raw.jpg": (
        "16:9 widescreen (1280x720) 32-bit Hi-Bit Pixel Art top-down Heirloom Emerald Felt & Carved Mahogany "
        "Train Table with brass corner brackets, clover meadow on the left, painted blue canyon river in the "
        "upper center, sandstone plateau on the upper right, and a walnut toy drawer along the bottom. "
        "100% empty felt center playfield."
    ),
}


def load_dotenv(dotenv_path: Path) -> None:
    if not dotenv_path.exists():
        return
    for line in dotenv_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def generate_with_gemini_if_missing(api_key: str, prompt: str, out_path: Path) -> None:
    if out_path.exists() or not api_key:
        return
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"gemini-2.5-flash-image-preview:generateContent?key={api_key}"
    )
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseModalities": ["TEXT", "IMAGE"]},
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        for cand in data.get("candidates", []):
            for part in cand.get("content", {}).get("parts", []):
                inline = part.get("inlineData") or part.get("inline_data")
                if inline and inline.get("data"):
                    out_path.parent.mkdir(parents=True, exist_ok=True)
                    out_path.write_bytes(base64.b64decode(inline["data"]))
                    print(f"  [GEMINI GENERATED] {out_path.name}")
                    return


def main() -> None:
    load_dotenv(ENV_PATH)
    for dest_path, staged_src in STAGED_FILES.items():
        if staged_src.exists() and not dest_path.exists():
            dest_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(staged_src, dest_path)
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    for dest_path, prompt in GEMINI_PROMPTS.items():
        if not dest_path.exists() and api_key:
            generate_with_gemini_if_missing(api_key, prompt, dest_path)

    ps1_script = Path(__file__).resolve().parent / "build_train_assets.ps1"
    subprocess.run(
        ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(ps1_script)],
        check=True,
    )


if __name__ == "__main__":
    main()
