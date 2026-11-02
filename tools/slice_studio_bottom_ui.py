"""
tools/slice_studio_bottom_ui.py
-------------------------------
Slices Row 1 (top half y: 0..50%) of `public/assets/games/art-studio/raw/studio-bottom-ui-raw.jpg`
into `public/assets/games/art-studio/sprites/`:
- `ui-paint-well-rim.png` & `ui-paint-well-fill.png` (Row 1, Col 1 — identical dimensions)
- `ui-brass-frame.png` (Row 1, Col 2 — outer + inner hollow square cleared)
- `ui-page-left.png` (Row 1, Col 3)
- `ui-page-right.png` (Row 1, Col 4)
"""

import os
from collections import deque
import numpy as np
from PIL import Image

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_PATH = os.path.join(ROOT_DIR, "public", "assets", "games", "art-studio", "raw", "studio-bottom-ui-raw.jpg")
OUT_DIR = os.path.join(ROOT_DIR, "public", "assets", "games", "art-studio", "sprites")


def is_magenta(r: int, g: int, b: int) -> bool:
    return r > 150 and g < 90 and b > 140 and (r + b) > (g * 3)


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    img = Image.open(RAW_PATH).convert("RGBA")
    arr = np.array(img, dtype=np.uint8)
    full_h, W, _ = arr.shape
    H = full_h // 2
    top = arr[:H, :, :].copy()

    visited = np.zeros((H, W), dtype=bool)
    q: deque[tuple[int, int]] = deque()

    seed_xs = [0, W - 1, W // 4, W // 2, (3 * W) // 4]
    seed_ys = [0, H - 1]

    for y in seed_ys:
        for x in range(W):
            r, g, b, _ = top[y, x]
            if not visited[y, x] and is_magenta(int(r), int(g), int(b)):
                visited[y, x] = True
                q.append((y, x))

    for x in seed_xs:
        for y in range(H):
            r, g, b, _ = top[y, x]
            if not visited[y, x] and is_magenta(int(r), int(g), int(b)):
                visited[y, x] = True
                q.append((y, x))

    # Also seed pure #FF00FF inside the hollow square frame in Col 2
    pure_mask = (top[..., 0] > 220) & (top[..., 1] < 35) & (top[..., 2] > 220)
    for y, x in np.argwhere(pure_mask):
        if not visited[y, x]:
            visited[y, x] = True
            q.append((int(y), int(x)))

    while q:
        cy, cx = q.popleft()
        top[cy, cx] = (0, 0, 0, 0)
        for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
            if 0 <= ny < H and 0 <= nx < W and not visited[ny, nx]:
                r, g, b, _ = top[ny, nx]
                if is_magenta(int(r), int(g), int(b)):
                    visited[ny, nx] = True
                    q.append((ny, nx))

    cell_w = W // 4
    single_names = {1: "ui-brass-frame.png", 2: "ui-page-left.png", 3: "ui-page-right.png"}

    for col in range(4):
        x0, x1 = col * cell_w, (col + 1) * cell_w if col < 3 else W
        sub = top[:, x0:x1].copy()
        nz = np.argwhere(sub[..., 3] > 10)
        min_y, min_x = nz.min(axis=0)
        max_y, max_x = nz.max(axis=0)
        cropped = sub[min_y : max_y + 1, min_x : max_x + 1]
        padded = np.zeros((cropped.shape[0] + 8, cropped.shape[1] + 8, 4), dtype=np.uint8)
        padded[4:-4, 4:-4] = cropped

        if col == 0:
            # Separate into ui-paint-well-rim.png and ui-paint-well-fill.png
            pw_h, pw_w, _ = padded.shape
            cy, cx = pw_h // 2, pw_w // 2
            pool_mask = np.zeros((pw_h, pw_w), dtype=bool)
            pq: deque[tuple[int, int]] = deque([(cy, cx)])
            pool_mask[cy, cx] = True
            while pq:
                py, px = pq.popleft()
                for ny, nx in ((py - 1, px), (py + 1, px), (py, px - 1), (py, px + 1)):
                    if 0 <= ny < pw_h and 0 <= nx < pw_w and not pool_mask[ny, nx]:
                        r, g, b, a = padded[ny, nx]
                        if a > 0 and r > 135 and g > 135 and b > 135 and (int(r) - int(b)) < 26:
                            pool_mask[ny, nx] = True
                            pq.append((ny, nx))

            rim = padded.copy()
            rim[pool_mask] = (0, 0, 0, 0)
            fill = np.zeros_like(padded)
            fill[pool_mask] = padded[pool_mask]
            Image.fromarray(rim, mode="RGBA").save(os.path.join(OUT_DIR, "ui-paint-well-rim.png"))
            Image.fromarray(fill, mode="RGBA").save(os.path.join(OUT_DIR, "ui-paint-well-fill.png"))
        else:
            Image.fromarray(padded, mode="RGBA").save(os.path.join(OUT_DIR, single_names[col]))


if __name__ == "__main__":
    main()
