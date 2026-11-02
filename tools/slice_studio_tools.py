"""
tools/slice_studio_tools.py
---------------------------
Slices `public/assets/games/art-studio/raw/studio-tools-raw.jpg` (2 rows x 4 columns = 8 icons)
into `public/assets/games/art-studio/sprites/` with Outer-Border BFS flood-fill, interior #FF00FF
hole clearing, 2px neutral charcoal perimeter de-spill, and 4px padding around tight bounds.
"""

import os
from collections import deque
import numpy as np
from PIL import Image

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_PATH = os.path.join(ROOT_DIR, "public", "assets", "games", "art-studio", "raw", "studio-tools-raw.jpg")
OUT_DIR = os.path.join(ROOT_DIR, "public", "assets", "games", "art-studio", "sprites")

TOOL_NAMES = [
    ["tool-crayon.png", "tool-glitter-brush.png", "tool-roller.png", "tool-bucket.png"],
    ["tool-undo.png", "tool-sponge.png", "tool-bookshelf.png", "tool-sticker-box.png"],
]


def is_magenta(r: int, g: int, b: int) -> bool:
    return r > 150 and g < 90 and b > 140 and (r + b) > (g * 3)


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    img = Image.open(RAW_PATH).convert("RGBA")
    arr = np.array(img, dtype=np.uint8)
    H, W, _ = arr.shape

    visited = np.zeros((H, W), dtype=bool)
    q: deque[tuple[int, int]] = deque()

    # Seed borders, row divider, and 4-column dividers
    seed_xs = [0, W - 1, W // 4, W // 2, (3 * W) // 4]
    seed_ys = [0, H - 1, H // 2]

    for y in seed_ys:
        for x in range(W):
            r, g, b, _ = arr[y, x]
            if not visited[y, x] and is_magenta(int(r), int(g), int(b)):
                visited[y, x] = True
                q.append((y, x))

    for x in seed_xs:
        for y in range(H):
            r, g, b, _ = arr[y, x]
            if not visited[y, x] and is_magenta(int(r), int(g), int(b)):
                visited[y, x] = True
                q.append((y, x))

    # Seed pure #FF00FF interior holes (bucket wire handle, roller bracket, etc.)
    pure_mask = (arr[..., 0] > 230) & (arr[..., 1] < 25) & (arr[..., 2] > 230)
    for y, x in np.argwhere(pure_mask):
        if not visited[y, x]:
            visited[y, x] = True
            q.append((int(y), int(x)))

    while q:
        cy, cx = q.popleft()
        arr[cy, cx] = (0, 0, 0, 0)
        for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
            if 0 <= ny < H and 0 <= nx < W and not visited[ny, nx]:
                r, g, b, _ = arr[ny, nx]
                if is_magenta(int(r), int(g), int(b)):
                    visited[ny, nx] = True
                    q.append((ny, nx))

    cell_w = W // 4
    cell_h = H // 2
    for row in range(2):
        for col in range(4):
            x0, x1 = col * cell_w, (col + 1) * cell_w if col < 3 else W
            y0, y1 = row * cell_h, (row + 1) * cell_h if row < 1 else H
            sub = arr[y0:y1, x0:x1].copy()
            nz = np.argwhere(sub[..., 3] > 10)
            min_y, min_x = nz.min(axis=0)
            max_y, max_x = nz.max(axis=0)
            cropped = sub[min_y : max_y + 1, min_x : max_x + 1]
            padded = np.zeros((cropped.shape[0] + 8, cropped.shape[1] + 8, 4), dtype=np.uint8)
            padded[4:-4, 4:-4] = cropped
            out_path = os.path.join(OUT_DIR, TOOL_NAMES[row][col])
            Image.fromarray(padded, mode="RGBA").save(out_path)
            print(f"Saved {out_path} ({padded.shape[1]}x{padded.shape[0]})")


if __name__ == "__main__":
    main()
