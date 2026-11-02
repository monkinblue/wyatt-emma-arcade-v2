"""
tools/expand_studio_frame.py
----------------------------
Backs up `public/assets/games/art-studio/studio-frame-bg.jpg` to
`public/assets/games/art-studio/raw/studio-frame-bg-orig.jpg` (if not already backed up)
and performs a 9-slice/column-and-row composite into a full edge-to-edge 1280x720
`studio-frame-bg.jpg` with an expanded 936x560 interior cream drawing canvas (x: 172..1108, y: 28..588).
"""

import os
import shutil
import numpy as np
from PIL import Image

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STUDIO_DIR = os.path.join(ROOT_DIR, "public", "assets", "games", "art-studio")
ORIG_PATH = os.path.join(STUDIO_DIR, "raw", "studio-frame-bg-orig.jpg")
TARGET_PATH = os.path.join(STUDIO_DIR, "studio-frame-bg.jpg")


def map_piecewise(val: float, knots_in: list[float], knots_out: list[float]) -> float:
    for i in range(len(knots_in) - 1):
        x0, x1 = knots_in[i], knots_in[i + 1]
        if val <= x1 or i == len(knots_in) - 2:
            t = 0.0 if x1 == x0 else (val - x0) / (x1 - x0)
            t = max(0.0, min(1.0, t))
            return knots_out[i] + t * (knots_out[i + 1] - knots_out[i])
    return knots_out[-1]


def main() -> None:
    os.makedirs(os.path.dirname(ORIG_PATH), exist_ok=True)
    if not os.path.exists(ORIG_PATH):
        shutil.copyfile(TARGET_PATH, ORIG_PATH)
        print(f"Backed up original frame to {ORIG_PATH}")

    src_img = Image.open(ORIG_PATH).convert("RGB").resize((1280, 720), Image.Resampling.LANCZOS)
    src = np.array(src_img, dtype=np.float32)
    out = np.zeros((720, 1280, 3), dtype=np.uint8)

    dx_knots = [0.0, 162.0, 172.0, 1108.0, 1118.0, 1279.0]
    sx_knots = [20.0, 212.0, 254.0, 1000.0, 1026.0, 1259.0]

    dy_center_knots = [0.0, 28.0, 588.0, 602.0, 719.0]
    sy_center_knots = [18.0, 84.0, 564.0, 602.0, 719.0]

    dy_side_knots = [0.0, 602.0, 719.0]
    sy_side_knots = [16.0, 618.0, 719.0]

    for x in range(1280):
        sx = map_piecewise(float(x), dx_knots, sx_knots)
        ix = min(1279, max(0, int(round(sx))))
        is_center = 162 <= x < 1118
        for y in range(720):
            if is_center:
                sy = map_piecewise(float(y), dy_center_knots, sy_center_knots)
            else:
                sy = map_piecewise(float(y), dy_side_knots, sy_side_knots)
            iy = min(719, max(0, int(round(sy))))
            out[y, x] = src[iy, ix].astype(np.uint8)

    Image.fromarray(out, mode="RGB").save(TARGET_PATH, quality=95)
    print(f"Saved expanded 1280x720 studio frame (936x560 canvas) to {TARGET_PATH}")


if __name__ == "__main__":
    main()
