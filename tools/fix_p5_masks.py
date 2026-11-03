#!/usr/bin/env python3
"""
tools/fix_p5_masks.py
---------------------
Generates the crisp Steel Bridge Cables Foreground Mask
(`public/assets/stories/colorado/sprites/p5/p5_bridge_cables_mask.png`)
from `p5-clean.jpg` (`1280x720` stage coordinates, `box = (0, 180, 950, 720)`):
- Identifies the neutral grey steel bridge suspension cable, vertical suspender rods,
  and slanted pedestrian railing (`abs(R - G) <= 16` and `abs(G - B) <= 18` and
  `abs(R - B) <= 22` and `35 <= R <= 185`, plus their 1px dark outlines `R < 45, G < 45, B < 45`
  immediately touching a neutral grey steel pixel).
- Sets all non-steel pixels (red-orange canyon rock where `R > B + 22`, turquoise river water
  where `B > R + 15` or `G > R + 10`, green bushes, and blue/white sky) to transparent (`alpha = 0`),
  keeping only the steel bridge cables and railing opaque (`alpha = 255`).
"""

from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT_DIR = Path(__file__).resolve().parent.parent
CLEAN_PLATE_PATH = ROOT_DIR / "public" / "assets" / "stories" / "colorado" / "pages" / "p5-clean.jpg"
OUT_MASK_PATH = ROOT_DIR / "public" / "assets" / "stories" / "colorado" / "sprites" / "p5" / "p5_bridge_cables_mask.png"


def build_bridge_cables_mask() -> None:
    if not CLEAN_PLATE_PATH.exists():
        raise FileNotFoundError(f"Missing clean plate: {CLEAN_PLATE_PATH}")

    raw_img = Image.open(CLEAN_PLATE_PATH).convert("RGBA")
    src_w, src_h = raw_img.size

    # Sample at exact 1280x720 stage coordinates with NEAREST filtering to match Phaser
    stage_img = raw_img.resize((1280, 720), Image.Resampling.NEAREST)
    crop_img = stage_img.crop((0, 180, 950, 720))
    arr = np.array(crop_img)

    r = arr[:, :, 0].astype(np.int16)
    g = arr[:, :, 1].astype(np.int16)
    b = arr[:, :, 2].astype(np.int16)

    # Neutral grey steel pixels
    is_steel_grey = (
        (np.abs(r - g) <= 16)
        & (np.abs(g - b) <= 18)
        & (np.abs(r - b) <= 22)
        & (r >= 35)
        & (r <= 185)
    )

    # Explicit exclusions for red-orange canyon rock, turquoise river water, green bushes, and sky
    is_canyon_rock = r > (b + 22)
    is_river_or_sky = (b > (r + 15)) | (g > (r + 10))
    is_green_bush = (g > (b + 6)) & (r < 95)

    # Dilate rock and river slightly to reject anti-aliased rock-to-river or rock-to-sky transition pixels
    rock_and_water_transition = ndimage.binary_dilation(is_canyon_rock, iterations=1) & ndimage.binary_dilation(is_river_or_sky, iterations=1)

    steel_core = is_steel_grey & (~is_canyon_rock) & (~is_river_or_sky) & (~is_green_bush) & (~rock_and_water_transition)

    # Include 1px dark outlines (R < 45, G < 45, B < 45) immediately touching a neutral grey steel pixel
    is_dark_outline = (r < 45) & (g < 45) & (b < 45)
    dilated_steel = ndimage.binary_dilation(steel_core, iterations=1)
    final_mask = steel_core | (is_dark_outline & dilated_steel)

    arr[:, :, 3] = np.where(final_mask, 255, 0).astype(np.uint8)
    arr[~final_mask, :3] = 0

    OUT_MASK_PATH.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(arr, mode="RGBA").save(OUT_MASK_PATH, "PNG")
    print(f"[OK] Saved {OUT_MASK_PATH.name}: {arr.shape[1]}x{arr.shape[0]} (from {src_w}x{src_h} plate)")


if __name__ == "__main__":
    build_bridge_cables_mask()
