#!/usr/bin/env python3
"""
Builds all visual assets for Balloon Letter Pop (`BalloonPopScene.ts`):
1. Resizes `public/assets/games/balloon-pop/raw/balloon-stage-raw.jpg` to `1280x720`
   and saves as `public/assets/games/balloon-pop/balloon-stage.jpg`.
2. Chroma-keys (Outer-Border BFS + Interior `#FF00FF` Hole Clearing + Soft Glow Unmixing & De-Spill),
   auto-crops to tight non-transparent bounding box with `4px` padding, and slices all 26 sprites
   into `public/assets/games/balloon-pop/sprites/`:
   - `balloon-items-raw.jpg` (3 rows x 4 cols -> 12 sprites)
   - `balloon-chars-raw.jpg` (2 rows x 3 cols -> 6 sprites)
   - `balloon-ui-raw.jpg` (2 rows x 4 cols -> 8 sprites)
"""

import colorsys
import os
from collections import deque
import numpy as np
from PIL import Image


def is_border_magenta(r: int, g: int, b: int) -> bool:
    return r > 165 and g < 115 and b > 165 and ((r - g) + (b - g)) > 150


def is_interior_magenta_hole(r: int, g: int, b: int) -> bool:
    return r > 195 and g < 75 and b > 195 and (r + b - 2 * g) > 250


def clear_magenta_and_despill(img: Image.Image, clear_interior_holes: bool = True) -> Image.Image:
    rgba = img.convert("RGBA")
    arr = np.array(rgba, dtype=np.int32)
    h, w, _ = arr.shape

    visited = np.zeros((h, w), dtype=bool)
    q = deque()

    # 1. Seed outer borders on magenta pixels
    for x in range(w):
        for y in (0, h - 1):
            r, g, b, _ = arr[y, x]
            if not visited[y, x] and is_border_magenta(int(r), int(g), int(b)):
                visited[y, x] = True
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            r, g, b, _ = arr[y, x]
            if not visited[y, x] and is_border_magenta(int(r), int(g), int(b)):
                visited[y, x] = True
                q.append((x, y))

    # 2. Seed interior enclosed pure-magenta holes (string loops, pump handle/hose, basket ropes)
    if clear_interior_holes:
        r_ch = arr[:, :, 0]
        g_ch = arr[:, :, 1]
        b_ch = arr[:, :, 2]
        hole_mask = (r_ch > 195) & (g_ch < 75) & (b_ch > 195) & ((r_ch + b_ch - 2 * g_ch) > 250)
        ys, xs = np.where(hole_mask & (~visited))
        for y, x in zip(ys, xs):
            visited[y, x] = True
            q.append((int(x), int(y)))

    # 3. BFS flood-fill
    while q:
        cx, cy = q.popleft()
        arr[cy, cx] = (0, 0, 0, 0)
        for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
            if 0 <= nx < w and 0 <= ny < h and not visited[ny, nx]:
                r, g, b, _ = arr[ny, nx]
                if is_border_magenta(int(r), int(g), int(b)):
                    visited[ny, nx] = True
                    q.append((nx, ny))

    # 4. Soft glow unmixing (around balloon-star, sparky-pump, doggie-catch)
    if clear_interior_holes:
        for y in range(h):
            for x in range(w):
                r, g, b, a = arr[y, x]
                if a == 0:
                    continue
                if r > 180 and b > 125 and r > g + 35 and b > g + 12:
                    if g < 92:
                        arr[y, x] = (0, 0, 0, 0)
                    else:
                        new_g = min(245, max(195, int(g) + 55))
                        new_b = min(90, int(g) // 3)
                        new_a = min(240, max(60, (int(g) - 85) * 2))
                        arr[y, x] = (255, new_g, new_b, new_a)

    # 5. 2px edge feathering & magenta spill suppression (`B = min(B, G), R = min(R, max(G + 40, R - 45))`)
    alpha_snap = arr[:, :, 3].copy()
    for y in range(h):
        for x in range(w):
            if alpha_snap[y, x] == 0:
                continue
            y0, y1 = max(0, y - 2), min(h, y + 3)
            x0, x1 = max(0, x - 2), min(w, x + 3)
            if np.any(alpha_snap[y0:y1, x0:x1] == 0):
                r, g, b, a = [int(v) for v in arr[y, x]]
                if r > 200 and g > 90 and b > g + 20:
                    arr[y, x] = (255, 200, 80, a)
                elif (r - g) + (b - g) > 65:
                    new_b = min(b, g)
                    new_r = min(r, max(g + 40, r - 45))
                    new_a = int(a * 0.85) if np.any(alpha_snap[max(0, y - 1):min(h, y + 2), max(0, x - 1):min(w, x + 2)] == 0) else a
                    arr[y, x] = (new_r, g, new_b, new_a)

    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA")


def crop_with_padding(img: Image.Image, pad: int = 4) -> Image.Image:
    arr = np.array(img)
    alpha = arr[:, :, 3]
    ys, xs = np.where(alpha > 10)
    if len(xs) == 0 or len(ys) == 0:
        return img
    min_x, max_x = int(xs.min()), int(xs.max()) + 1
    min_y, max_y = int(ys.min()), int(ys.max()) + 1
    cropped = img.crop((min_x, min_y, max_x, max_y))
    cw, ch = cropped.size
    canvas = Image.new("RGBA", (cw + pad * 2, ch + pad * 2), (0, 0, 0, 0))
    canvas.paste(cropped, (pad, pad))
    return canvas


def build_stage(root_dir: str):
    raw_path = os.path.join(root_dir, "public", "assets", "games", "balloon-pop", "raw", "balloon-stage-raw.jpg")
    out_path = os.path.join(root_dir, "public", "assets", "games", "balloon-pop", "balloon-stage.jpg")
    img = Image.open(raw_path).convert("RGB")
    if img.size != (1280, 720):
        img = img.resize((1280, 720), Image.LANCZOS)
    img.save(out_path, quality=95)
    print(f"Saved {out_path} (1280x720)")


def slice_grid(raw_path: str, sprites_dir: str, rows: int, cols: int, names: list[list[str]], clear_holes: bool):
    raw_img = Image.open(raw_path)
    w, h = raw_img.size
    for r in range(rows):
        y0 = int(round(r * h / float(rows)))
        y1 = int(round((r + 1) * h / float(rows)))
        for c in range(cols):
            x0 = int(round(c * w / float(cols)))
            x1 = int(round((c + 1) * w / float(cols)))
            cell = raw_img.crop((x0, y0, x1, y1))
            cleaned = clear_magenta_and_despill(cell, clear_holes)
            final_img = crop_with_padding(cleaned, pad=4)
            out_file = os.path.join(sprites_dir, names[r][c])
            final_img.save(out_file)
            print(f"Saved {out_file} ({final_img.size[0]}x{final_img.size[1]})")


def build_purple_balloon_from_red(sprites_dir: str):
    """
    Rebuilds `balloon-purple.png` from `balloon-red.png` by shifting the red balloon body hue
    to Royal Amethyst Purple (hue ~ 275 deg / 0.764) in HSV space where saturation > 0.25 and
    not part of the warm golden brass string tie at the bottom (y < int(height * 0.80), or the
    rubber knot at y < int(height * 0.88) excluding the brass collar at y in 0.77..0.81),
    preserving 100% of the original alpha channel, white specular highlight, and dark painted outline.
    """
    red_path = os.path.join(sprites_dir, "balloon-red.png")
    purple_path = os.path.join(sprites_dir, "balloon-purple.png")
    if not os.path.exists(red_path):
        return

    red_img = Image.open(red_path).convert("RGBA")
    arr = np.array(red_img, dtype=np.uint8)
    h, w, _ = arr.shape
    limit_y = int(h * 0.80)
    knot_y0, knot_y1 = int(h * 0.81), int(h * 0.89)
    knot_x0, knot_x1 = int(w * 0.36), int(w * 0.59)

    for y in range(h):
        in_body = y < limit_y
        in_knot = knot_y0 <= y < knot_y1
        if not in_body and not in_knot:
            continue
        for x in range(w):
            if in_knot and not (knot_x0 <= x < knot_x1):
                continue
            r, g, b, a = arr[y, x]
            if a == 0:
                continue
            rf, gf, bf = r / 255.0, g / 255.0, b / 255.0
            hue, sat, val = colorsys.rgb_to_hsv(rf, gf, bf)
            if sat > 0.25 and (in_body or hue < 0.06 or hue > 0.92):
                # Shift red/warm hue cleanly to Royal Amethyst Purple (~275 deg = 0.764)
                nr, ng, nb = colorsys.hsv_to_rgb(0.764, sat, val)
                arr[y, x, 0] = int(round(nr * 255.0))
                arr[y, x, 1] = int(round(ng * 255.0))
                arr[y, x, 2] = int(round(nb * 255.0))

    purple_img = Image.fromarray(arr, "RGBA")
    purple_img.save(purple_path)
    print(f"Saved {purple_path} ({w}x{h}) [hue-shifted from balloon-red.png]")


def main():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    raw_dir = os.path.join(root_dir, "public", "assets", "games", "balloon-pop", "raw")
    sprites_dir = os.path.join(root_dir, "public", "assets", "games", "balloon-pop", "sprites")
    os.makedirs(sprites_dir, exist_ok=True)

    build_stage(root_dir)

    slice_grid(
        os.path.join(raw_dir, "balloon-items-raw.jpg"),
        sprites_dir,
        3,
        4,
        [
            ["balloon-red.png", "balloon-blue.png", "balloon-green.png", "balloon-gold.png"],
            ["balloon-purple.png", "balloon-coral.png", "balloon-star.png", "balloon-rainbow.png"],
            ["prop-tile.png", "prop-parachute.png", "prop-crate.png", "prop-pinwheel.png"],
        ],
        clear_holes=True,
    )
    build_purple_balloon_from_red(sprites_dir)

    slice_grid(
        os.path.join(raw_dir, "balloon-chars-raw.jpg"),
        sprites_dir,
        2,
        3,
        [
            ["sparky-idle.png", "sparky-pump.png", "sparky-cheer.png"],
            ["doggie-idle.png", "doggie-catch.png", "doggie-cheer.png"],
        ],
        clear_holes=True,
    )
    build_purple_balloon_from_red(sprites_dir)

    slice_grid(
        os.path.join(raw_dir, "balloon-ui-raw.jpg"),
        sprites_dir,
        2,
        4,
        [
            ["ui-back.png", "ui-mode-phonics.png", "ui-mode-words.png", "ui-mode-cargo.png"],
            ["ui-theme.png", "ui-speak.png", "ui-wind.png", "ui-album.png"],
        ],
        clear_holes=False,
    )


if __name__ == "__main__":
    main()
