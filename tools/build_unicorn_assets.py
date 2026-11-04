#!/usr/bin/env python3
"""
Wyatt & Emma Arcade v2.0 — Princess Emma's Unicorn Castle ("Royal Sticker Kingdom") Asset Pipeline
==================================================================================================
Generates (via GEMINI_API_KEY in .env or staged raw plates) and slices 32-bit Hi-Bit
Pixel Art assets for `UnicornCastleScene.ts` and the `PLAY ARCADE` shelf in `HubScene.ts`:
  1. `public/assets/hub/arcade/hub-toy-unicorn.png` (and `public/assets/hub/sprites/hub-toy-unicorn.png`)
     — Enchanting rose-gold, crystal, and carved mahogany Music-Box Unicorn Castle with a
       prancing white winged unicorn, sparkling rainbow spire, and golden crown on a wooden pedestal.
  2. Clean-Stage 1280x720 32-Bit Pixel Art Backgrounds (`public/assets/games/unicorn/`):
     — `unicorn-spa-bg.png` (Act 1: The Royal Unicorn Spa & Crystal Courtyard)
     — `unicorn-teaparty-bg.png` (Act 2: The Royal Castle Tea Party & Cupcake Bakery)
     — `unicorn-sticker-meadow-bg.png` (Act 3 Backdrop 1: Rainbow Waterfall & Pegasus Meadow)
     — `unicorn-sticker-ballroom-bg.png` (Act 3 Backdrop 2: Crystal Ballroom & Grand Staircase)
     — `unicorn-sticker-bedroom-bg.png` (Act 3 Backdrop 3: Starlight Royal Bedroom & Balcony)
  3. 56 Modular Sprites (`public/assets/games/unicorn/sprites/*.png`):
     — 8 Characters & Royal Accessories (`char-emma-princess.png`, `char-emma-wand.png`,
       `char-unicorn-base.png`, `char-unicorn-happy.png`, `char-sparky-bowtie.png`,
       `char-doggie-crown.png`, `acc-royal-saddle.png`, `acc-royal-tiara.png`)
     — 12 Spa Tools, Color Potions & Crown Gems (`spa-potion-pink.png`, `spa-potion-blue.png`,
       `spa-potion-gold.png`, `spa-brush-starlight.png`, `spa-shower-cloud.png`,
       `spa-soap-bubble.png`, `acc-wing-bow.png`, `spa-wand-rainbow.png`,
       `gem-circle-ruby.png`, `gem-heart-quartz.png`, `gem-star-topaz.png`, `gem-square-emerald.png`)
     — 12 Tea Party, Bakery Treats, Caretaking Props & Triangle Gem (`gem-triangle-sapphire.png`,
       `tea-teapot.png`, `tea-cup-saucer.png`, `tea-plate-silver.png`, `treat-cupcake.png`,
       `treat-star-cookie.png`, `treat-sugar-heart.png`, `treat-rainbow-berry.png`,
       `tea-bakery-stand.png`, `care-velvet-blanket.png`, `care-starlight-pillow.png`,
       `care-feather-wand.png`)
     — 24 Die-Cut Peel-and-Stick Living Stickers (`stk-*.png`) + 4 Bonus Stickers (28 total!)

Chroma-Key Pipeline:
  - Outer border BFS flood-fill for `#FF00FF` neon magenta background.
  - Interior enclosed `#FF00FF` hole clearing (teapot handles, tiered bakery arches, carriage wheels,
    showerhead pipes) while protecting rose-pink gowns, strawberry frosting, and ruby facets.
  - 2px perimeter de-spill pass and 4px tight bounding-box auto-crop.

Strictly offline build tool — API keys live only in `.env` and are NEVER imported
into `src/` frontend code.
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

HUB_RAW_PATH = ROOT_DIR / "public" / "assets" / "hub" / "raw" / "hub-toy-unicorn-raw.jpg"
HUB_ARCADE_OUT = ROOT_DIR / "public" / "assets" / "hub" / "arcade" / "hub-toy-unicorn.png"
HUB_SPRITE_OUT = ROOT_DIR / "public" / "assets" / "hub" / "sprites" / "hub-toy-unicorn.png"

GAME_DIR = ROOT_DIR / "public" / "assets" / "games" / "unicorn"
RAW_DIR = GAME_DIR / "raw"
SPRITES_DIR = GAME_DIR / "sprites"

STAGED_ARTIFACT_DIR = Path(r"C:\Users\RobaD\.gemini\antigravity\brain\ee389a3e-a397-4319-a67d-aaf405565771")
STAGED_FILES = {
    HUB_RAW_PATH: STAGED_ARTIFACT_DIR / "hub_toy_unicorn_raw_1793766969665.jpg",
    RAW_DIR / "unicorn-spa-bg-raw.jpg": STAGED_ARTIFACT_DIR / "unicorn_spa_bg_raw_1793766983556.jpg",
    RAW_DIR / "unicorn-teaparty-bg-raw.jpg": STAGED_ARTIFACT_DIR / "unicorn_teaparty_bg_raw_1793766997352.jpg",
    RAW_DIR / "unicorn-sticker-meadow-bg-raw.jpg": STAGED_ARTIFACT_DIR / "unicorn_sticker_meadow_bg_raw_1793766977986.jpg",
    RAW_DIR / "unicorn-sticker-ballroom-bg-raw.jpg": STAGED_ARTIFACT_DIR / "unicorn_sticker_ballroom_bg_raw_1793766998274.jpg",
    RAW_DIR / "unicorn-sticker-bedroom-bg-raw.jpg": STAGED_ARTIFACT_DIR / "unicorn_sticker_bedroom_bg_raw_1793767013212.jpg",
    RAW_DIR / "unicorn-characters-raw.jpg": STAGED_ARTIFACT_DIR / "unicorn_characters_raw_1793766984861.jpg",
    RAW_DIR / "unicorn-spa-gems-raw.jpg": STAGED_ARTIFACT_DIR / "unicorn_spa_gems_raw_1793767002529.jpg",
    RAW_DIR / "unicorn-teaparty-props-raw.jpg": STAGED_ARTIFACT_DIR / "unicorn_teaparty_props_raw_v2_1793767034884.jpg",
    RAW_DIR / "unicorn-stickers-1-raw.jpg": STAGED_ARTIFACT_DIR / "unicorn_stickers_1_raw_1793766980313.jpg",
    RAW_DIR / "unicorn-stickers-2-raw.jpg": STAGED_ARTIFACT_DIR / "unicorn_stickers_2_raw_1793766998434.jpg",
}

BACKGROUNDS = [
    ("unicorn-spa-bg-raw.jpg", "unicorn-spa-bg.png"),
    ("unicorn-teaparty-bg-raw.jpg", "unicorn-teaparty-bg.png"),
    ("unicorn-sticker-meadow-bg-raw.jpg", "unicorn-sticker-meadow-bg.png"),
    ("unicorn-sticker-ballroom-bg-raw.jpg", "unicorn-sticker-ballroom-bg.png"),
    ("unicorn-sticker-bedroom-bg-raw.jpg", "unicorn-sticker-bedroom-bg.png"),
]

CHARACTERS_GRID_2X4 = [
    ("char-emma-princess.png", 0, 0, (240, 280)),
    ("char-emma-wand.png", 0, 1, (250, 280)),
    ("char-unicorn-base.png", 0, 2, (320, 300)),
    ("char-unicorn-happy.png", 0, 3, (320, 300)),
    ("char-sparky-bowtie.png", 1, 0, (240, 250)),
    ("char-doggie-crown.png", 1, 1, (220, 240)),
    ("acc-royal-saddle.png", 1, 2, (220, 200)),
    ("acc-royal-tiara.png", 1, 3, (200, 160)),
]

SPA_GEMS_GRID_3X4 = [
    ("spa-potion-pink.png", 0, 0, (160, 190)),
    ("spa-potion-blue.png", 0, 1, (160, 190)),
    ("spa-potion-gold.png", 0, 2, (160, 190)),
    ("spa-brush-starlight.png", 0, 3, (180, 180)),
    ("spa-shower-cloud.png", 1, 0, (200, 190)),
    ("spa-soap-bubble.png", 1, 1, (160, 160)),
    ("acc-wing-bow.png", 1, 2, (170, 160)),
    ("spa-wand-rainbow.png", 1, 3, (180, 180)),
    ("gem-circle-ruby.png", 2, 0, (150, 150)),
    ("gem-heart-quartz.png", 2, 1, (150, 150)),
    ("gem-star-topaz.png", 2, 2, (150, 150)),
    ("gem-square-emerald.png", 2, 3, (150, 150)),
]

TEAPARTY_GRID_3X4 = [
    ("gem-triangle-sapphire.png", 0, 0, (150, 150)),
    ("tea-teapot.png", 0, 1, (210, 190)),
    ("tea-cup-saucer.png", 0, 2, (160, 140)),
    ("tea-plate-silver.png", 0, 3, (160, 160)),
    ("treat-cupcake.png", 1, 0, (130, 150)),
    ("treat-star-cookie.png", 1, 1, (130, 130)),
    ("treat-sugar-heart.png", 1, 2, (130, 130)),
    ("treat-rainbow-berry.png", 1, 3, (140, 130)),
    ("tea-bakery-stand.png", 2, 0, (210, 250)),
    ("care-velvet-blanket.png", 2, 1, (180, 160)),
    ("care-starlight-pillow.png", 2, 2, (180, 160)),
    ("care-feather-wand.png", 2, 3, (180, 180)),
]

STICKERS_1_GRID_3X4 = [
    ("stk-unicorn-prance.png", 0, 0, (210, 210)),
    ("stk-baby-pegasus-blue.png", 0, 1, (200, 200)),
    ("stk-baby-unicorn-gold.png", 0, 2, (190, 200)),
    ("stk-unicorn-sleepy.png", 0, 3, (200, 200)),
    ("stk-pegasus-rainbow.png", 1, 0, (210, 210)),
    ("stk-unicorn-carousel.png", 1, 1, (210, 210)),
    ("stk-emma-curtsy.png", 1, 2, (200, 210)),
    ("stk-emma-twirl.png", 1, 3, (210, 210)),
    ("stk-sparky-prince.png", 2, 0, (200, 210)),
    ("stk-doggie-jester.png", 2, 1, (190, 200)),
    ("stk-fairy-butterfly.png", 2, 2, (190, 190)),
    ("stk-royal-swan.png", 2, 3, (190, 190)),
]

STICKERS_2_GRID_3X4 = [
    ("stk-diamond-crown.png", 0, 0, (180, 160)),
    ("stk-crystal-slipper.png", 0, 1, (180, 180)),
    ("stk-magic-scepter.png", 0, 2, (190, 190)),
    ("stk-treasure-chest.png", 0, 3, (190, 190)),
    ("stk-heart-locket.png", 1, 0, (180, 180)),
    ("stk-birthday-cake.png", 1, 1, (190, 210)),
    ("stk-icecream-sundae.png", 1, 2, (180, 210)),
    ("stk-macaron-tower.png", 1, 3, (180, 210)),
    ("stk-candy-carriage.png", 2, 0, (210, 200)),
    ("stk-rainbow-arch.png", 2, 1, (220, 180)),
    ("stk-royal-kitten.png", 2, 2, (180, 190)),
    ("stk-hot-air-balloon.png", 2, 3, (190, 220)),
]


def load_dotenv(dotenv_path: Path) -> None:
    if not dotenv_path.exists():
        return
    for line in dotenv_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def stage_raw_files() -> None:
    HUB_RAW_PATH.parent.mkdir(parents=True, exist_ok=True)
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    SPRITES_DIR.mkdir(parents=True, exist_ok=True)
    for dest_path, staged_src in STAGED_FILES.items():
        if staged_src.exists() and not dest_path.exists():
            shutil.copy2(staged_src, dest_path)
            print(f"  [STAGED RAW] {dest_path.name}")


def is_magenta_pixel(r: int, g: int, b: int) -> bool:
    if r > 140 and b > 130 and g < 115 and (r - g) > 42 and (b - g) > 36 and abs(r - b) < 58:
        return True
    if (r + b - 2 * g) > 135 and r > 130 and b > 120 and abs(r - b) < 55:
        return True
    return False


def clear_magenta_floodfill(img, is_sticker: bool = False):
    rgba = img.convert("RGBA")
    w, h = rgba.size
    px = rgba.load()

    visited = [[False] * w for _ in range(h)]
    q = deque()

    for x in range(w):
        for y in (0, h - 1):
            r, g, b, _ = px[x, y]
            if is_magenta_pixel(r, g, b):
                visited[y][x] = True
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if not visited[y][x]:
                r, g, b, _ = px[x, y]
                if is_magenta_pixel(r, g, b):
                    visited[y][x] = True
                    q.append((x, y))

    # Seed strict interior neon magenta holes (teapot handles, bakery stand arches, carriage wheels)
    for y in range(1, h - 1):
        for x in range(1, w - 1):
            if visited[y][x]:
                continue
            r, g, b, _ = px[x, y]
            if r > 200 and g < 68 and b > 195 and abs(r - b) < 38 and (r + b - 2 * g) > 270:
                visited[y][x] = True
                q.append((x, y))

    while q:
        cx, cy = q.popleft()
        px[cx, cy] = (0, 0, 0, 0)
        for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
            if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx]:
                r, g, b, _ = px[nx, ny]
                if is_magenta_pixel(r, g, b):
                    visited[ny][nx] = True
                    q.append((nx, ny))

    # 2px perimeter de-spill pass
    for _ in range(2):
        to_clear = []
        to_whiten = []
        for y in range(1, h - 1):
            for x in range(1, w - 1):
                r, g, b, a = px[x, y]
                if a == 0:
                    continue
                has_trans = any(
                    px[nx, ny][3] == 0
                    for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1))
                )
                if not has_trans:
                    continue
                if (r + b - 2 * g) > 95 and r > 115 and b > 110 and abs(r - b) < 55:
                    if is_sticker and g >= 135:
                        to_whiten.append((x, y))
                    else:
                        to_clear.append((x, y))
        for x, y in to_clear:
            px[x, y] = (0, 0, 0, 0)
        for x, y in to_whiten:
            px[x, y] = (255, 255, 255, 255)

    bbox = rgba.getbbox()
    if not bbox:
        return rgba
    pad = 4
    crop_box = (
        max(0, bbox[0] - pad),
        max(0, bbox[1] - pad),
        min(w, bbox[2] + pad),
        min(h, bbox[3] + pad),
    )
    return rgba.crop(crop_box)


def main() -> None:
    load_dotenv(ENV_PATH)
    ps1_script = Path(__file__).resolve().parent / "build_unicorn_assets.ps1"
    subprocess.run(
        ["powershell", "-ExecutionPolicy", "Bypass", "-File", str(ps1_script)],
        check=True,
    )


if __name__ == "__main__":
    main()
