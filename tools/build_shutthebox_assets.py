#!/usr/bin/env python3
"""
Wyatt & Emma Arcade v2.0 — Great Hall Box of Ten ("Shut the Box") Asset Pipeline
================================================================================
Generates (via GEMINI_API_KEY in .env) and slices 32-bit Hi-Bit Pixel Art assets
for `ShutTheBoxScene.ts` and the `PLAY ARCADE` heirloom toy shelf in `HubScene.ts`:
  1. `public/assets/hub/arcade/hub-toy-shutthebox.png` (and `public/assets/hub/sprites/hub-toy-shutthebox.png`)
     — Ornate wooden-and-brass emerald felt Shut the Box heirloom arcade toy with
       miniature 1-10 wooden tiles, two ivory dice, and a starry wizard hat.
  2. `public/assets/games/shutthebox/shutthebox-stage.png` (1280x720)
     — Candlelit Hogwarts-style Great Hall oak banquet table with an EMPTY
       emerald-green baize felt Shut the Box frame in the center (zero baked numbers
       or dice — Clean Stage Rule).
  3. `public/assets/games/shutthebox/sprites/*.png` (24 sliced sprites)
     — Blank hinged maple/walnut wooden tiles (upright, flipped, golden-highlighted),
       leather-and-brass dice cup, ivory dice faces 1–6 + 2 rolling tumble frames,
       parchment math scroll, crystal answer orb, ruby & emerald House gems,
       Professor Sparky (idle, rolling, cheering), Doggie mage (cheering, idle),
       Player & Sparky Great Hall House Point Hourglasses, and House Cup trophy.

Strictly offline build tool — API keys live only in `.env` and are NEVER imported
into `src/` frontend code.
"""

import os
import sys
import subprocess
from collections import deque
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = ROOT_DIR / ".env"

HUB_RAW_PATH = ROOT_DIR / "public" / "assets" / "hub" / "raw" / "hub-toy-shutthebox-raw.jpg"
HUB_ARCADE_OUT = ROOT_DIR / "public" / "assets" / "hub" / "arcade" / "hub-toy-shutthebox.png"
HUB_SPRITE_OUT = ROOT_DIR / "public" / "assets" / "hub" / "sprites" / "hub-toy-shutthebox.png"

GAME_DIR = ROOT_DIR / "public" / "assets" / "games" / "shutthebox"
RAW_DIR = GAME_DIR / "raw"
SPRITES_DIR = GAME_DIR / "sprites"

BOARD_PROPS_GRID = [
    # Row 0: Hinged wooden tiles + leather dice shaker cup
    ("tile-wood-up.png", 0, 0, (120, 180)),
    ("tile-wood-down.png", 0, 1, (120, 180)),
    ("tile-wood-gold.png", 0, 2, (120, 180)),
    ("prop-dice-cup.png", 0, 3, (170, 190)),
    # Row 3: Math scroll, crystal choice orb, ruby & emerald gems
    # (Top-down 2.5D beveled pixel-art dice die-1..6 / die-face-1..6 are generated deterministically)
    ("prop-math-scroll.png", 3, 0, (240, 180)),
    ("orb-choice.png", 3, 1, (150, 150)),
    ("gem-ruby.png", 3, 2, (110, 110)),
    ("gem-emerald.png", 3, 3, (110, 110)),
]

CHARS_GRID = [
    # Row 0: Professor Sparky (3 poses) + Doggie cheering
    ("prof-sparky-idle.png", 0, 0, (280, 280)),
    ("prof-sparky-roll.png", 0, 1, (280, 280)),
    ("prof-sparky-cheer.png", 0, 2, (280, 280)),
    ("doggie-mage-cheer.png", 0, 3, (250, 250)),
    # Row 1: Doggie idle + 2 House Point Hourglasses + Golden House Cup Trophy
    ("doggie-mage-idle.png", 1, 0, (250, 250)),
    ("hourglass-player.png", 1, 1, (220, 300)),
    ("hourglass-sparky.png", 1, 2, (220, 300)),
    ("prop-wizard-trophy.png", 1, 3, (260, 280)),
]

# Sprites containing rich interior reds/golds/scarves/rubies that must only
# clear strict neon magenta (#FF00FF) on interior holes:
STRICT_INTERIOR_SPRITES = {
    "tile-wood-up.png",
    "tile-wood-down.png",
    "tile-wood-gold.png",
    "prop-dice-cup.png",
    "die-face-1.png",
    "die-face-2.png",
    "die-face-3.png",
    "die-face-4.png",
    "die-face-5.png",
    "die-face-6.png",
    "die-tumble-1.png",
    "die-tumble-2.png",
    "prop-math-scroll.png",
    "orb-choice.png",
    "gem-ruby.png",
    "gem-emerald.png",
    "doggie-mage-cheer.png",
    "doggie-mage-idle.png",
    "hourglass-player.png",
    "hourglass-sparky.png",
    "prop-wizard-trophy.png",
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


def is_magenta_pixel(r: int, g: int, b: int) -> bool:
    if r > 150 and b > 140 and g < 120 and (r - g) > 45 and (b - g) > 35:
        return True
    if (r + b - 2 * g) > 130 and r > 125 and b > 115:
        return True
    return False


def clear_magenta_floodfill(img, clear_interior_holes: bool = True):
    """
    1. Outer border BFS flood-fill for #FF00FF magenta background.
    2. Interior enclosed magenta hole removal (strict neon magenta check).
    3. 2px perimeter de-spill pass.
    4. Auto-crop to non-transparent bounding box with 4px safety margin.
    """
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

    while q:
        cx, cy = q.popleft()
        px[cx, cy] = (0, 0, 0, 0)
        for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
            if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx]:
                r, g, b, _ = px[nx, ny]
                if is_magenta_pixel(r, g, b):
                    visited[ny][nx] = True
                    q.append((nx, ny))

    # Interior hole pass (strict neon magenta)
    for y in range(1, h - 1):
        for x in range(1, w - 1):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if clear_interior_holes:
                if r > 175 and g < 85 and b > 165 and (r + b - 2 * g) > 210:
                    px[x, y] = (0, 0, 0, 0)
            else:
                if r > 215 and g < 50 and b > 210 and (r + b - 2 * g) > 315:
                    px[x, y] = (0, 0, 0, 0)
                elif r > 155 and b > 165 and g < 135 and abs(r - b) < 55 and (r + b - 2 * g) > 135:
                    px[x, y] = (135, 195, 225, 95)

    # 2px edge de-spill
    for _ in range(2):
        to_clear = []
        for y in range(1, h - 1):
            for x in range(1, w - 1):
                r, g, b, a = px[x, y]
                if a == 0:
                    continue
                has_trans = any(
                    px[nx, ny][3] == 0
                    for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1))
                )
                if has_trans and (r + b - 2 * g) > 105 and r > 120 and b > 110:
                    to_clear.append((x, y))
        for x, y in to_clear:
            px[x, y] = (0, 0, 0, 0)

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


def run_pil_pipeline() -> None:
    from PIL import Image

    HUB_ARCADE_OUT.parent.mkdir(parents=True, exist_ok=True)
    HUB_SPRITE_OUT.parent.mkdir(parents=True, exist_ok=True)
    SPRITES_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Slice Hub Toy Icon
    if HUB_RAW_PATH.exists():
        raw_toy = Image.open(HUB_RAW_PATH)
        w, h = raw_toy.size
        margin = int(w * 0.02)
        cropped = raw_toy.crop((margin, margin, w - margin, h - margin))
        cleaned = clear_magenta_floodfill(cropped, clear_interior_holes=True)
        cleaned.thumbnail((380, 400), Image.Resampling.NEAREST)
        cleaned.save(HUB_ARCADE_OUT, "PNG")
        cleaned.save(HUB_SPRITE_OUT, "PNG")
        print(f"  [SAVED HUB TOY] {HUB_ARCADE_OUT.name} ({cleaned.size[0]}x{cleaned.size[1]})")

    # 2. Resize Clean Stage Background (1280x720)
    stage_raw = RAW_DIR / "shutthebox-stage-raw.jpg"
    stage_out = GAME_DIR / "shutthebox-stage.png"
    if stage_raw.exists():
        img = Image.open(stage_raw).convert("RGBA")
        resized = img.resize((1280, 720), Image.Resampling.LANCZOS)
        resized.save(stage_out, "PNG")
        print(f"  [SAVED STAGE] {stage_out.name} (1280x720)")

    # 3. Slice 4x4 Board & Props Sheet
    props_raw = RAW_DIR / "shutthebox-board-props-raw.jpg"
    if props_raw.exists():
        sheet = Image.open(props_raw)
        sw, sh = sheet.size
        cw, ch = sw // 4, sh // 4
        for out_name, r_idx, c_idx, max_dim in BOARD_PROPS_GRID:
            cell = sheet.crop((c_idx * cw + 6, r_idx * ch + 6, (c_idx + 1) * cw - 6, (r_idx + 1) * ch - 6))
            cleaned = clear_magenta_floodfill(cell, clear_interior_holes=(out_name not in STRICT_INTERIOR_SPRITES))
            cleaned.thumbnail(max_dim, Image.Resampling.NEAREST)
            out_path = SPRITES_DIR / out_name
            cleaned.save(out_path, "PNG")
            print(f"  [SAVED SPRITE] {out_name} ({cleaned.size[0]}x{cleaned.size[1]})")

    # 4. Slice 2x4 Characters & Hourglasses Sheet
    chars_raw = RAW_DIR / "shutthebox-chars-raw.jpg"
    if chars_raw.exists():
        sheet = Image.open(chars_raw)
        sw, sh = sheet.size
        cw, ch = sw // 4, sh // 2
        for out_name, r_idx, c_idx, max_dim in CHARS_GRID:
            cell = sheet.crop((c_idx * cw + 8, r_idx * ch + 8, (c_idx + 1) * cw - 8, (r_idx + 1) * ch - 8))
            cleaned = clear_magenta_floodfill(cell, clear_interior_holes=(out_name not in STRICT_INTERIOR_SPRITES))
            cleaned.thumbnail(max_dim, Image.Resampling.NEAREST)
            out_path = SPRITES_DIR / out_name
            cleaned.save(out_path, "PNG")
            print(f"  [SAVED SPRITE] {out_name} ({cleaned.size[0]}x{cleaned.size[1]})")


def main() -> None:
    load_dotenv(ENV_PATH)
    try:
        import PIL  # noqa: F401
        run_pil_pipeline()
    except ImportError:
        ps1_script = Path(__file__).resolve().parent / "build_shutthebox_assets.ps1"
        subprocess.run(
            ["powershell", "-ExecutionPolicy", "Bypass", "-File", str(ps1_script)],
            check=True,
        )


if __name__ == "__main__":
    main()
