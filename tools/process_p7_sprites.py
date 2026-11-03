#!/usr/bin/env python3
"""
tools/process_p7_sprites.py
---------------------------
Processes Book 2 — Page 7 (`p7-clean.jpg` Garden of the Gods) assets:
1. Ensures `p7-clean.jpg` is placed at `public/assets/stories/colorado/pages/p7-clean.jpg`
   (backing up any existing `p7-gods.jpg` / `p7-gods.png` to `.v0.bak` if needed).
2. Strips 6px outer border and cell divider lines along quarter-width splits (`width // 4`,
   `width // 2`, `3 * width // 4`) before computing bounding boxes.
3. Removes `#FF00FF` magenta (`R > 175, G < 95, B > 175, R + B - 2*G > 190`) using border
   flood-fill + interior enclosed magenta hole removal + 1px magenta edge de-spill.
4. Outputs clean `1x4` horizontal PNG strips in `public/assets/stories/colorado/sprites/p7/`:
   - `p7_grandparents_emma.png` (bottom-aligned on their hiking shoes)
   - `p7_wyatt_point.png` (bottom-aligned on Wyatt's sneakers)
   - `p7_boulder_sparky.png` (bottom-aligned on Sparky's sitting paws/tail)
   - `p7_trail_doggie.png` (bottom-aligned on Doggie's sitting paws)
   - `p7_bluebirds.png` (center-aligned across all 4 frames)
"""

from pathlib import Path
import shutil
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT_DIR = Path(__file__).resolve().parent.parent
PAGES_DIR = ROOT_DIR / "public" / "assets" / "stories" / "colorado" / "pages"
P7_DIR = ROOT_DIR / "public" / "assets" / "stories" / "colorado" / "sprites" / "p7"


def stage_clean_plate() -> Path:
    clean_path = PAGES_DIR / "p7-clean.jpg"
    for old_name in ("p7-gods.jpg", "p7-gods.png"):
        old_p = PAGES_DIR / old_name
        bak_p = PAGES_DIR / old_name.replace("p7-gods.", "p7-gods.v0.bak.")
        if old_p.exists() and not bak_p.exists():
            shutil.copy2(old_p, bak_p)
    if not clean_path.exists():
        raise FileNotFoundError(f"Missing clean plate: {clean_path}")
    return clean_path


def clean_sheet_rgba(img_path: Path, splits: list[int], strip_ground_shadow: bool = False) -> np.ndarray:
    img = Image.open(img_path).convert("RGBA")
    arr = np.array(img)
    h, w, _ = arr.shape

    # 1. Shave 6px margin around outer border and along quarter-width splits
    arr[:6, :, :] = 0
    arr[h - 6 :, :, :] = 0
    arr[:, :6, :] = 0
    arr[:, w - 6 :, :] = 0
    for sp in splits[1:-1]:
        c0 = max(0, sp - 6)
        c1 = min(w, sp + 6)
        arr[:, c0:c1, :] = 0

    r = arr[:, :, 0].astype(np.int16)
    g = arr[:, :, 1].astype(np.int16)
    b = arr[:, :, 2].astype(np.int16)

    # 2. Remove #FF00FF magenta + interior magenta holes
    is_mag = (r > 175) & (g < 95) & (b > 175) & ((r + b - 2 * g) > 190)
    if strip_ground_shadow:
        # Also remove dark-magenta floor shadow oval under jumping shoes
        is_shadow = (r > 115) & (g < 65) & (b > 115) & ((r + b - 2 * g) > 135)
        is_mag = is_mag | is_shadow

    arr[is_mag, :] = 0

    # 3. 1px magenta edge de-spill
    alpha = arr[:, :, 3] > 0
    eroded = ndimage.binary_erosion(alpha, iterations=1)
    boundary = alpha & (~eroded)
    fringe = boundary & ((r + b - 2 * g) > 90) & (r > 130) & (b > 130)
    arr[fringe, :] = 0
    return arr


def slice_and_align(
    sheet_name: str,
    out_name: str,
    align_mode: str,
    splits: list[int] | None = None,
    strip_ground_shadow: bool = False,
) -> None:
    in_path = P7_DIR / sheet_name
    raw = Image.open(in_path)
    w, h = raw.size
    if splits is None:
        splits = [0, w // 4, w // 2, (3 * w) // 4, w]

    arr = clean_sheet_rgba(in_path, splits, strip_ground_shadow=strip_ground_shadow)

    frames = []
    for i in range(4):
        cell = arr[:, splits[i] : splits[i + 1], :]
        ys, xs = np.where(cell[:, :, 3] > 0)
        crop = cell[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1, :]
        frames.append(crop)

    max_w = max(f.shape[1] for f in frames) + 8
    if max_w % 2 == 1:
        max_w += 1
    max_h = max(f.shape[0] for f in frames) + 8

    out_arr = np.zeros((max_h, max_w * 4, 4), dtype=np.uint8)
    for i, f in enumerate(frames):
        fh, fw, _ = f.shape
        dx = i * max_w + (max_w - fw) // 2
        if align_mode == "center":
            dy = (max_h - fh) // 2
        else:
            dy = max_h - 4 - fh
        out_arr[dy : dy + fh, dx : dx + fw, :] = f

    out_path = P7_DIR / out_name
    Image.fromarray(out_arr, mode="RGBA").save(out_path, "PNG")
    print(f"[OK] {out_name}: strip={max_w * 4}x{max_h}, frameWidth={max_w}, frameHeight={max_h}")


if __name__ == "__main__":
    stage_clean_plate()
    slice_and_align("p7_grandparents_emma_sheet.jpg", "p7_grandparents_emma.png", "bottom", strip_ground_shadow=True)
    slice_and_align("p7_wyatt_point_sheet.jpg", "p7_wyatt_point.png", "bottom")
    slice_and_align("p7_boulder_sparky_sheet.jpg", "p7_boulder_sparky.png", "bottom")
    slice_and_align("p7_trail_doggie_sheet.jpg", "p7_trail_doggie.png", "bottom")
    slice_and_align("p7_bluebirds_sheet.jpg", "p7_bluebirds.png", "center")
