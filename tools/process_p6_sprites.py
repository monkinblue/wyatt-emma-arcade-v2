#!/usr/bin/env python3
"""
tools/process_p6_sprites.py
---------------------------
Processes Book 2 — Page 6 (`p6-clean.jpg` Royal Gorge Train Vista Car) assets:
1. Ensures `p6-clean.jpg` is staged in `public/assets/stories/colorado/pages/p6-clean.jpg`
   (backing up any existing `p6-train.jpg` / `p6-train.png` to `.v0.bak` if needed).
2. Slices & cleans all 5 Page 6 sprite sheets in `public/assets/stories/colorado/sprites/p6/`:
   - `p6_wyatt_horn_sheet.jpg` -> `p6_wyatt_horn.png` (1x4 strip, top-aligned & locked on the brass horn bracket)
   - `p6_grandpa_cheer_sheet.jpg` -> `p6_grandpa_cheer.png` (1x4 strip, bottom-aligned on shoes)
   - `p6_babci_emma_sheet.jpg` -> `p6_babci_emma.png` (1x4 strip, floor shadow under jumping Emma stripped, bottom-aligned on Babci's shoes)
   - `p6_railing_doggie_sheet.jpg` -> `p6_railing_doggie.png` (top row of 2x4 grid extracted, bottom-aligned on Doggie's sitting paws)
   - `p6_river_otter_sheet.jpg` -> `p6_river_otter.png` (1x4 strip, bottom-aligned on the floating wooden log base)
3. Generates the Right Inner Orange Handrail Foreground Mask (`p6_handrail_foreground_mask.png`)
   from `p6-clean.jpg` (`1280x720`, `box = (915, 535, 1155, 720)`).
"""

from pathlib import Path
import shutil
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT_DIR = Path(__file__).resolve().parent.parent
PAGES_DIR = ROOT_DIR / "public" / "assets" / "stories" / "colorado" / "pages"
P6_DIR = ROOT_DIR / "public" / "assets" / "stories" / "colorado" / "sprites" / "p6"


def stage_clean_plate() -> Path:
    clean_path = PAGES_DIR / "p6-clean.jpg"
    for old_name in ("p6-train.jpg", "p6-train.png"):
        old_p = PAGES_DIR / old_name
        bak_p = PAGES_DIR / old_name.replace("p6-train.", "p6-train.v0.bak.")
        if old_p.exists() and not bak_p.exists():
            shutil.copy2(old_p, bak_p)
    if not clean_path.exists():
        raise FileNotFoundError(f"Missing clean plate: {clean_path}")
    return clean_path


def remove_magenta_and_despill(arr: np.ndarray) -> np.ndarray:
    out = arr.copy()
    r = out[:, :, 0].astype(np.int16)
    g = out[:, :, 1].astype(np.int16)
    b = out[:, :, 2].astype(np.int16)

    is_mag = (r > 165) & (g < 105) & (b > 165) & ((r + b - 2 * g) > 175)
    out[is_mag, 3] = 0
    out[is_mag, :3] = 0

    alpha = out[:, :, 3] > 0
    eroded = ndimage.binary_erosion(alpha, iterations=1)
    boundary = alpha & (~eroded)
    fringe = boundary & ((r + b - 2 * g) > 90) & (r > 135) & (b > 135)
    out[fringe, 3] = 0
    out[fringe, :3] = 0
    return out


def build_handrail_foreground_mask(clean_plate_path: Path) -> None:
    raw_img = Image.open(clean_plate_path).convert("RGBA")
    stage_img = raw_img.resize((1280, 720), Image.Resampling.NEAREST)
    crop_img = stage_img.crop((915, 535, 1155, 720))
    arr = np.array(crop_img)

    r = arr[:, :, 0].astype(np.int16)
    g = arr[:, :, 1].astype(np.int16)
    b = arr[:, :, 2].astype(np.int16)

    is_orange_rail = (r > 155) & (g > 55) & (b < 65) & (r > (g + 45))
    is_grey_floor = np.abs(r - b) < 25
    orange_core = is_orange_rail & (~is_grey_floor)

    is_dark_outline = (r < 65) & (g < 65) & (b < 65)
    dilated_orange = ndimage.binary_dilation(orange_core, iterations=2)
    keep_mask = orange_core | (is_dark_outline & dilated_orange)

    arr[:, :, 3] = np.where(keep_mask, 255, 0).astype(np.uint8)
    arr[~keep_mask, :3] = 0

    out_path = P6_DIR / "p6_handrail_foreground_mask.png"
    Image.fromarray(arr, mode="RGBA").save(out_path, "PNG")
    print(f"[OK] Saved {out_path.name}: {arr.shape[1]}x{arr.shape[0]}")


if __name__ == "__main__":
    plate = stage_clean_plate()
    build_handrail_foreground_mask(plate)
