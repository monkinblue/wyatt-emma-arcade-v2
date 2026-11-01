"""
tools/build_p3_sprites.py
-------------------------
One-pass hue-aware chroma-key & 3-frame spritesheet slicer for Story Page 3 ("Cozy Kitchen & Living Room"):
- Reads raw 3-frame strips from `public/assets/stories/nana/raw/p3-*-raw.png` (or `.jpg`)
- Applies hue-aware magenta removal so red tulips, burgundy hoodies, and red kettles stay 100% intact
  while ZERO pink/magenta halos remain:
  * Removes pixels where `B > 95 and (B - G) > 35 and R > 100`
  * Desaturates fringe pixels where `B > G + 20 and B > R * 0.55` by clamping `B = G`
- Slices into 3 equal non-overlapping columns, aligns frames consistently, and writes uniform 3-frame
  transparent PNG spritesheets to `public/assets/stories/nana/sprites/p3-*.png`.
- Prints exact per-frame `(frameWidth, frameHeight)` for `BootScene.ts`.
"""

import os
from PIL import Image
import numpy as np

RAW_DIR = os.path.join("public", "assets", "stories", "nana", "raw")
OUT_DIR = os.path.join("public", "assets", "stories", "nana", "sprites")

SPECS = [
    ("p3-clock-raw", "p3-clock.png", "center"),
    ("p3-doggie-raw", "p3-doggie.png", "bottom"),
    ("p3-nana-emma-raw", "p3-nana-emma.png", "bottom"),
    ("p3-papa-wyatt-raw", "p3-papa-wyatt.png", "bottom"),
    ("p3-sparky-jar-raw", "p3-sparky-jar.png", "bottom"),
    ("p3-kettle-raw", "p3-kettle.png", "bottom"),
    ("p3-tulips-raw", "p3-tulips.png", "bottom"),
]


def find_raw_path(stem: str) -> str:
    for ext in (".png", ".jpg", ".jpeg", ".webp"):
        candidate = os.path.join(RAW_DIR, stem + ext)
        if os.path.exists(candidate):
            return candidate
    raise FileNotFoundError(f"Missing raw sprite strip for {stem} in {RAW_DIR}")


def hue_aware_clean_and_slice(raw_path: str, out_path: str, anchor: str = "bottom", num_frames: int = 3):
    img = Image.open(raw_path).convert("RGBA")
    arr = np.array(img, dtype=np.int32)

    r = arr[:, :, 0]
    g = arr[:, :, 1]
    b = arr[:, :, 2]
    a = arr[:, :, 3]

    # 1. Hue-aware magenta chroma key:
    # Remove pixels where B > 95 and (B - G) > 35 and R > 100
    # (Also catch bright pure/near-magenta background where R > 150, B > 140, B - G > 50)
    magenta_mask = (b > 95) & ((b - g) > 35) & (r > 100)
    a = np.where(magenta_mask, 0, a)

    # 2. Desaturate purple/magenta fringe pixels where B > G + 20 and B > R * 0.55 by clamping B = G
    fringe_mask = (a > 0) & (b > (g + 20)) & (b > (r * 0.55))
    b = np.where(fringe_mask, g, b)

    arr[:, :, 0] = np.clip(r, 0, 255)
    arr[:, :, 1] = np.clip(g, 0, 255)
    arr[:, :, 2] = np.clip(b, 0, 255)
    arr[:, :, 3] = np.clip(a, 0, 255)

    cleaned = Image.fromarray(arr.astype(np.uint8), "RGBA")
    w, h = cleaned.size
    col_w = w // num_frames

    # Extract bounding boxes in each of the 3 columns, filtering out tiny isolated border specks
    frames_cropped = []
    max_fw = 16
    max_fh = 16

    for i in range(num_frames):
        x0 = i * col_w
        x1 = (i + 1) * col_w if i < num_frames - 1 else w
        col_arr = arr[:, x0:x1, :].copy()

        # Clear 2px outer border of each cell to avoid edge artifacts
        col_arr[:2, :, 3] = 0
        col_arr[-2:, :, 3] = 0
        col_arr[:, :2, 3] = 0
        col_arr[:, -2:, 3] = 0

        alpha = col_arr[:, :, 3]
        ys, xs = np.where(alpha > 16)
        if len(xs) == 0:
            frames_cropped.append(None)
            continue

        min_x, max_x = int(xs.min()), int(xs.max())
        min_y, max_y = int(ys.min()), int(ys.max())
        fw = max_x - min_x + 1
        fh = max_y - min_y + 1
        if fw > max_fw:
            max_fw = fw
        if fh > max_fh:
            max_fh = fh

        crop_img = Image.fromarray(col_arr[min_y : max_y + 1, min_x : max_x + 1].astype(np.uint8), "RGBA")
        frames_cropped.append(crop_img)

    pad = 8
    frame_w = max_fw + pad * 2
    frame_h = max_fh + pad * 2
    if frame_w % 2 != 0:
        frame_w += 1
    if frame_h % 2 != 0:
        frame_h += 1

    sheet = Image.new("RGBA", (frame_w * num_frames, frame_h), (0, 0, 0, 0))
    for i, crop_img in enumerate(frames_cropped):
        if crop_img is None:
            continue
        cw, ch = crop_img.size
        dx = i * frame_w + (frame_w - cw) // 2
        if anchor == "bottom":
            dy = frame_h - pad - ch
        else:
            dy = (frame_h - ch) // 2
        sheet.paste(crop_img, (dx, dy))

    os.makedirs(OUT_DIR, exist_ok=True)
    sheet.save(out_path, "PNG")
    return frame_w, frame_h, sheet.size


def main():
    print("=== Building Page 3 Spritesheets (One-Pass Hue-Aware Chroma Key) ===")
    for raw_stem, out_name, anchor in SPECS:
        raw_path = find_raw_path(raw_stem)
        out_path = os.path.join(OUT_DIR, out_name)
        fw, fh, (total_w, total_h) = hue_aware_clean_and_slice(raw_path, out_path, anchor=anchor)
        print(f"  {out_name}: total={total_w}x{total_h} -> 3 frames of frameWidth={fw}, frameHeight={fh}")


if __name__ == "__main__":
    main()
