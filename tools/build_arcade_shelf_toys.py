#!/usr/bin/env python3
"""
Slices the 3 painted Heirloom Arcade Shelf Toys from `public/assets/hub/raw/arcade-shelf-toys-raw.jpg`
(1 row x 3 columns) into `public/assets/hub/arcade/`:
  - Col 1: `arcade-toy-balloon.png` (Victorian hot-air balloon carousel toy)
  - Col 2: `arcade-toy-bounce.png` (Wooden clockwork trampoline & cloud bone launcher toy)
  - Col 3: `arcade-toy-kart.png` (Winged vintage clockwork roadster toy car on mahogany base)

Chroma-Key & Interior Hole Clearing Rules:
  1) Clear all border-connected `#FF00FF` magenta background pixels
     (`R > 165, G < 115, B > 165 and (R - G) + (B - G) > 150`).
  2) Clear all interior enclosed pure-magenta & JPEG-subsampled magenta holes
     (`R > 190, G < 85, B > 190 and R + B - 2*G > 240`, plus narrow rigging/spring/spoke slits
     `R > 145, G < 105, B > 120, B > G + 35`) while protecting the ruby-red hot-air balloon dome
     and roadster body!
  3) Run a 2px magenta edge de-spill pass and auto-crop each sprite to its tight non-transparent
     bounding box with 4px padding.
"""

import os
from collections import deque
import numpy as np
from PIL import Image


def is_border_magenta(r: int, g: int, b: int) -> bool:
    return r > 150 and g < 115 and b > 130 and ((r - g) + (b - g)) > 135 and b > g + 35


def is_interior_magenta_hole(r: int, g: int, b: int, x: int, y: int, w: int, h: int, is_balloon_toy: bool) -> bool:
    # Protect the ruby-red hot-air balloon dome on the upper-left of Col 1
    if is_balloon_toy and x < int(w * 0.40) and y < int(h * 0.43):
        return r > 210 and g < 70 and b > 200 and (r + b - 2 * g) > 280
    # Standard pure magenta hole or narrow JPEG-subsampled slit (rigging cords, coil springs, wheel spokes, wind-up keys)
    if r > 190 and g < 85 and b > 190 and (r + b - 2 * g) > 240:
        return True
    return r > 148 and g < 102 and b > 125 and b > g + 38 and ((r - g) + (b - g)) > 130


def clear_magenta_and_despill(img: Image.Image, is_balloon_toy: bool = False) -> Image.Image:
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

    # 2. Seed interior enclosed magenta holes
    for y in range(h):
        for x in range(w):
            if not visited[y, x]:
                r, g, b, _ = arr[y, x]
                if is_interior_magenta_hole(int(r), int(g), int(b), x, y, w, h, is_balloon_toy):
                    visited[y, x] = True
                    q.append((x, y))

    # 3. BFS flood-fill
    while q:
        cx, cy = q.popleft()
        arr[cy, cx] = (0, 0, 0, 0)
        for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
            if 0 <= nx < w and 0 <= ny < h and not visited[ny, nx]:
                if is_balloon_toy and nx < int(w * 0.40) and ny < int(h * 0.43):
                    continue
                r, g, b, _ = arr[ny, nx]
                if is_border_magenta(int(r), int(g), int(b)):
                    visited[ny, nx] = True
                    q.append((nx, ny))

    # 4. 2px magenta edge de-spill pass
    alpha_snap = arr[:, :, 3].copy()
    for y in range(h):
        for x in range(w):
            if alpha_snap[y, x] == 0:
                continue
            y0, y1 = max(0, y - 2), min(h, y + 3)
            x0, x1 = max(0, x - 2), min(w, x + 3)
            if np.any(alpha_snap[y0:y1, x0:x1] == 0):
                r, g, b, a = [int(v) for v in arr[y, x]]
                if (r - g) + (b - g) > 55 and b > g + 16:
                    new_b = min(b, g)
                    new_r = min(r, max(g + 35, r - 50))
                    new_a = (
                        int(a * 0.82)
                        if np.any(alpha_snap[max(0, y - 1):min(h, y + 2), max(0, x - 1):min(w, x + 2)] == 0)
                        else a
                    )
                    arr[y, x] = (new_r, g, new_b, new_a)

    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA")


def autocrop_with_padding(img: Image.Image, pad: int = 4) -> Image.Image:
    arr = np.array(img)
    alpha = arr[:, :, 3]
    ys, xs = np.where(alpha > 10)
    if len(xs) == 0 or len(ys) == 0:
        return img
    x0, x1 = int(xs.min()), int(xs.max()) + 1
    y0, y1 = int(ys.min()), int(ys.max()) + 1
    cropped = img.crop((x0, y0, x1, y1))
    cw, ch = cropped.size
    out = Image.new("RGBA", (cw + pad * 2, ch + pad * 2), (0, 0, 0, 0))
    out.paste(cropped, (pad, pad))
    return out


def main() -> None:
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    raw_path = os.path.join(root_dir, "public", "assets", "hub", "raw", "arcade-shelf-toys-raw.jpg")
    out_dir = os.path.join(root_dir, "public", "assets", "hub", "arcade")
    os.makedirs(out_dir, exist_ok=True)

    sheet = Image.open(raw_path).convert("RGBA")
    sw, sh = sheet.size

    specs = [
        ("arcade-toy-balloon.png", 0.00, 0.00, 0.335, 1.00, True),
        ("arcade-toy-bounce.png", 0.335, 0.00, 0.655, 1.00, False),
        ("arcade-toy-kart.png", 0.655, 0.00, 1.00, 1.00, False),
    ]

    for filename, x0f, y0f, x1f, y1f, is_balloon in specs:
        box = (int(round(sw * x0f)), int(round(sh * y0f)), int(round(sw * x1f)), int(round(sh * y1f)))
        cell = sheet.crop(box)
        cleaned = clear_magenta_and_despill(cell, is_balloon_toy=is_balloon)
        final_img = autocrop_with_padding(cleaned, pad=4)
        out_path = os.path.join(out_dir, filename)
        final_img.save(out_path, "PNG")
        print(f"[Saved] public/assets/hub/arcade/{filename} ({final_img.width}x{final_img.height})")


if __name__ == "__main__":
    main()
