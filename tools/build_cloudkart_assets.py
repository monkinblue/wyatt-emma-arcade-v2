#!/usr/bin/env python3
"""
Wyatt & Emma Arcade v2.0 — Zoomy Cloud Kart ("Rainbow Hill Racer") Asset Pipeline
=================================================================================
Generates (via GEMINI_API_KEY in .env or staged raw plates) and slices 32-bit Hi-Bit
Pixel Art assets for `CloudKartScene.ts`:
  1. `public/assets/games/cloudkart/cloudkart-stage-bg.png` (1280x720)
     — Clean-stage 32-bit pixel art Rainbow Hill & Cloud Skyway racing highway
       (zero static karts, characters, or text baked onto the background plate).
  2. `public/assets/games/cloudkart/sprites/kart-*.png` (4 karts from 2x2 grid)
     — `kart-wyatt.png`, `kart-emma.png`, `kart-sparky.png`, `kart-doggie.png`
  3. `public/assets/games/cloudkart/sprites/spr-*.png` (12 props from 3x4 grid)
     — `spr-sky-gate.png`, `spr-flag-start.png`, `spr-flag-finish.png`,
       `spr-boost-pad.png`, `spr-cloud-ramp.png`, `spr-star-coin.png`,
       `spr-quill-kart.png`, `spr-eraser-sponge.png`, `spr-trophy-podium.png`,
       `spr-golden-cup.png`, `spr-cloud-puff.png`, `spr-finish-arch.png`

Chroma-Key Pipeline:
  - Outer border BFS flood-fill for `#FF00FF` neon magenta background.
  - Interior enclosed `#FF00FF` hole clearing (wheel spokes, archway openings, trophy handles)
    while protecting crimson roadster paint and rainbow bands.
  - 2px perimeter de-spill pass and 4px tight bounding-box auto-crop.
"""

import os
import shutil
import subprocess
from collections import deque
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = ROOT_DIR / ".env"

GAME_DIR = ROOT_DIR / "public" / "assets" / "games" / "cloudkart"
RAW_DIR = GAME_DIR / "raw"
SPRITES_DIR = GAME_DIR / "sprites"

STAGED_ARTIFACT_DIR = Path(r"C:\Users\RobaD\.gemini\antigravity\brain\3d8a56a9-8ed2-429f-bb36-759e886c309f")
STAGED_FILES = {
    "cloudkart-stage-raw.jpg": STAGED_ARTIFACT_DIR / "cloudkart_stage_raw_1793761306022.jpg",
    "cloudkart-karts-raw.jpg": STAGED_ARTIFACT_DIR / "cloudkart_karts_raw_1793761324189.jpg",
    "cloudkart-props-raw.jpg": STAGED_ARTIFACT_DIR / "cloudkart_props_raw_1793761344202.jpg",
}

KARTS_GRID_2X2 = [
    ("kart-wyatt.png", 0, 0, (280, 240)),
    ("kart-emma.png", 0, 1, (280, 240)),
    ("kart-sparky.png", 1, 0, (280, 240)),
    ("kart-doggie.png", 1, 1, (280, 240)),
]

PROPS_GRID_3X4 = [
    ("spr-sky-gate.png", 0, 0, (320, 320)),
    ("spr-flag-start.png", 0, 1, (160, 200)),
    ("spr-flag-finish.png", 0, 2, (160, 200)),
    ("spr-boost-pad.png", 0, 3, (220, 160)),
    ("spr-cloud-ramp.png", 1, 0, (220, 170)),
    ("spr-star-coin.png", 1, 1, (120, 120)),
    ("spr-quill-kart.png", 1, 2, (130, 130)),
    ("spr-eraser-sponge.png", 1, 3, (140, 140)),
    ("spr-trophy-podium.png", 2, 0, (340, 260)),
    ("spr-golden-cup.png", 2, 1, (200, 220)),
    ("spr-cloud-puff.png", 2, 2, (240, 160)),
    ("spr-finish-arch.png", 2, 3, (340, 300)),
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
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    SPRITES_DIR.mkdir(parents=True, exist_ok=True)
    for target_name, staged_src in STAGED_FILES.items():
        dest = RAW_DIR / target_name
        if staged_src.exists() and not dest.exists():
            shutil.copy2(staged_src, dest)
            print(f"  [STAGED RAW] {target_name}")


def is_magenta_pixel(r: int, g: int, b: int) -> bool:
    if r > 155 and b > 145 and g < 115 and (r - g) > 45 and (b - g) > 40:
        return True
    if (r + b - 2 * g) > 140 and r > 135 and b > 125:
        return True
    return False


def clear_magenta_floodfill(img):
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

    # Interior hole pass (strict neon magenta so crimson roadster paint is 100% preserved)
    for y in range(1, h - 1):
        for x in range(1, w - 1):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if r > 195 and g < 75 and b > 185 and abs(r - b) < 48 and (r + b - 2 * g) > 250:
                px[x, y] = (0, 0, 0, 0)

    # 2px perimeter de-spill
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
                if has_trans and (r + b - 2 * g) > 115 and r > 135 and b > 125:
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

    stage_raw_files()

    stage_raw = RAW_DIR / "cloudkart-stage-raw.jpg"
    stage_out = GAME_DIR / "cloudkart-stage-bg.png"
    if stage_raw.exists():
        img = Image.open(stage_raw).convert("RGBA")
        resized = img.resize((1280, 720), Image.Resampling.LANCZOS)
        resized.save(stage_out, "PNG")
        print(f"  [SAVED STAGE] {stage_out.name} (1280x720)")

    karts_raw = RAW_DIR / "cloudkart-karts-raw.jpg"
    if karts_raw.exists():
        sheet = Image.open(karts_raw)
        sw, sh = sheet.size
        cw, ch = sw // 2, sh // 2
        for out_name, r_idx, c_idx, max_dim in KARTS_GRID_2X2:
            cell = sheet.crop((c_idx * cw + 6, r_idx * ch + 6, (c_idx + 1) * cw - 6, (r_idx + 1) * ch - 6))
            cleaned = clear_magenta_floodfill(cell)
            cleaned.thumbnail(max_dim, Image.Resampling.NEAREST)
            cleaned.save(SPRITES_DIR / out_name, "PNG")
            print(f"  [SAVED KART] {out_name} ({cleaned.size[0]}x{cleaned.size[1]})")

    props_raw = RAW_DIR / "cloudkart-props-raw.jpg"
    if props_raw.exists():
        sheet = Image.open(props_raw)
        sw, sh = sheet.size
        cw, ch = sw // 4, sh // 3
        for out_name, r_idx, c_idx, max_dim in PROPS_GRID_3X4:
            cell = sheet.crop((c_idx * cw + 6, r_idx * ch + 6, (c_idx + 1) * cw - 6, (r_idx + 1) * ch - 6))
            cleaned = clear_magenta_floodfill(cell)
            cleaned.thumbnail(max_dim, Image.Resampling.NEAREST)
            cleaned.save(SPRITES_DIR / out_name, "PNG")
            print(f"  [SAVED PROP] {out_name} ({cleaned.size[0]}x{cleaned.size[1]})")


def main() -> None:
    load_dotenv(ENV_PATH)
    try:
        import PIL  # noqa: F401
        run_pil_pipeline()
    except ImportError:
        ps1_script = Path(__file__).resolve().parent / "build_cloudkart_assets.ps1"
        subprocess.run(
            ["powershell", "-ExecutionPolicy", "Bypass", "-File", str(ps1_script)],
            check=True,
        )


if __name__ == "__main__":
    main()
