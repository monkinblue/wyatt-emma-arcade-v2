#!/usr/bin/env python3
"""
tools/process_p5_sprites.py
---------------------------
Processes `p5-clean.jpg` and the 5 sprite sheets in `public/assets/stories/colorado/sprites/p5/`:
- `p5_gondola_sparky.png` (1x4 strip, stray diagonal cable stubs trimmed, top-aligned)
- `p5_tower_flags.png` (1x4 strip, center-aligned)
- `p5_railing_doggie.png` (top row of 2x4 grid, bottom-aligned)
- `p5_canyon_eagle.png` (1x4 strip, center-aligned)
- `p5_tiny_raft.png` (1x4 strip, square turquoise wave blocks stripped, center-aligned)
- `p5_cliff_foreground_mask.png` (`245x150`, cropped from `(0, 195, 245, 345)` on `1280x720` `p5-clean.jpg`)
"""

from collections import deque
from pathlib import Path
import shutil
from PIL import Image

ROOT_DIR = Path(__file__).resolve().parent.parent
PAGES_DIR = ROOT_DIR / "public" / "assets" / "stories" / "colorado" / "pages"
SPRITES_DIR = ROOT_DIR / "public" / "assets" / "stories" / "colorado" / "sprites" / "p5"


def is_magenta(r: int, g: int, b: int) -> bool:
    return r > 175 and g < 95 and b > 175 and (r + b - 2 * g) > 190


def is_border_magenta(r: int, g: int, b: int) -> bool:
    return (r > 155 and g < 110 and b > 155 and (r + b - 2 * g) > 150) or is_magenta(r, g, b)


def clean_magenta_cell(cell_img: Image.Image) -> Image.Image:
    rgba = cell_img.convert("RGBA")
    w, h = rgba.size
    px = rgba.load()

    visited = [[False] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()

    for x in range(w):
        for y in (0, h - 1):
            r, g, b, _ = px[x, y]
            if not visited[y][x] and is_border_magenta(r, g, b):
                visited[y][x] = True
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            r, g, b, _ = px[x, y]
            if not visited[y][x] and is_border_magenta(r, g, b):
                visited[y][x] = True
                q.append((x, y))

    while q:
        cx, cy = q.popleft()
        px[cx, cy] = (0, 0, 0, 0)
        for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
            if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx]:
                nr, ng, nb, na = px[nx, ny]
                if na > 0 and is_border_magenta(nr, ng, nb):
                    visited[ny][nx] = True
                    q.append((nx, ny))

    for y in range(1, h - 1):
        for x in range(1, w - 1):
            r, g, b, a = px[x, y]
            if a > 0 and is_magenta(r, g, b):
                px[x, y] = (0, 0, 0, 0)

    snap = rgba.copy()
    spx = snap.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = spx[x, y]
            if a == 0:
                continue
            near_trans = False
            for oy in (-1, 0, 1):
                for ox in (-1, 0, 1):
                    if ox == 0 and oy == 0:
                        continue
                    nx, ny = x + ox, y + oy
                    if nx < 0 or nx >= w or ny < 0 or ny >= h or spx[nx, ny][3] == 0:
                        near_trans = True
                        break
                if near_trans:
                    break
            if near_trans:
                if (r + b - 2 * g) > 130 and r > 135 and b > 135:
                    px[x, y] = (0, 0, 0, 0)
                elif r > g + 25 and b > g + 25:
                    avg = min(255, int(g * 0.7 + min(r, b) * 0.3))
                    px[x, y] = (avg, g, avg, min(a, 220))

    return rgba


def isolate_raft_only(cell_img: Image.Image) -> Image.Image:
    rgba = clean_magenta_cell(cell_img)
    w, h = rgba.size
    px = rgba.load()

    # 1. Identify warm yellow/orange/brown/red raft, rafter, and paddle seed pixels
    warm_seed = [[False] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if r > g + 15 and r > b + 25 and r > 90:
                warm_seed[y][x] = True

    # 2. Include dark outline/shadow/helmet pixels within 4px of warm raft seeds (excluding cyan/turquoise water)
    raft_body = [[False] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if warm_seed[y][x]:
                raft_body[y][x] = True
                continue
            is_turquoise = (b > r) or (g > r + 12)
            is_white_foam = r > 205 and g > 215 and b > 215
            if not is_turquoise and not is_white_foam:
                near_warm = False
                for oy in range(-4, 5):
                    ny = y + oy
                    if ny < 0 or ny >= h:
                        continue
                    for ox in range(-4, 5):
                        nx = x + ox
                        if 0 <= nx < w and warm_seed[ny][nx]:
                            near_warm = True
                            break
                    if near_warm:
                        break
                if near_warm:
                    raft_body[y][x] = True

    # 3. Include tight 2px white water-foam rim around raft_body
    keep = [[False] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            if raft_body[y][x]:
                keep[y][x] = True
                continue
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            is_turquoise = (b > r + 15) or (g > r + 18)
            if not is_turquoise and r > 195 and g > 205 and b > 205:
                near_raft = False
                for oy in range(-2, 3):
                    ny = y + oy
                    if ny < 0 or ny >= h:
                        continue
                    for ox in range(-2, 3):
                        nx = x + ox
                        if 0 <= nx < w and raft_body[ny][nx]:
                            near_raft = True
                            break
                    if near_raft:
                        break
                if near_raft:
                    keep[y][x] = True

    for y in range(h):
        for x in range(w):
            if not keep[y][x]:
                px[x, y] = (0, 0, 0, 0)

    return rgba


def build_cliff_foreground_mask() -> None:
    p5_clean = Image.open(PAGES_DIR / "p5-clean.jpg").convert("RGBA")
    p5_1280 = p5_clean.resize((1280, 720), Image.Resampling.NEAREST)
    patch = p5_1280.crop((0, 195, 245, 345))
    pw, ph = patch.size
    px = patch.load()

    for x in range(pw):
        cliff_top = ph
        for y in range(ph):
            r, g, b, _ = px[x, y]
            if r > b + 35 and r > 105:
                cliff_top = max(0, y - 1)
                break
        for y in range(ph):
            if y < cliff_top:
                px[x, y] = (0, 0, 0, 0)
            else:
                r, g, b, _ = px[x, y]
                px[x, y] = (r, g, b, 255)

    patch.save(SPRITES_DIR / "p5_cliff_foreground_mask.png", "PNG")


if __name__ == "__main__":
    p5_bridge = PAGES_DIR / "p5-bridge.jpg"
    p5_bak = PAGES_DIR / "p5-bridge.v0.bak.jpg"
    if p5_bridge.exists() and not p5_bak.exists():
        shutil.copy2(p5_bridge, p5_bak)
    build_cliff_foreground_mask()
