#!/usr/bin/env python3
"""
tools/process_p4_sprites.py
---------------------------
Slices and cleans all 5 Page 4 ("Eleven Mile Canyon & South Platte River") `1x4`
horizontal sprite sheets in `public/assets/stories/colorado/sprites/p4/` and generates
`p4_canyon_foreground_mask.png` (`620x135`, cropped from `(240, 130, 860, 265)` on the
`1280x720` `p4-clean.jpg` stage) so the distant Cessna 172 flies behind the foreground
canyon cliffs and in front of the clouds and distant mountain V-notch.

STRICT GUARDRAILS:
- NEVER use pixel-cloning or inpainting on background image plates.
- NEVER overwrite existing page artwork in `public/assets/stories/colorado/pages/` without backing up.
"""

from collections import deque
from pathlib import Path
import shutil
from PIL import Image

ROOT_DIR = Path(__file__).resolve().parent.parent
PAGES_DIR = ROOT_DIR / "public" / "assets" / "stories" / "colorado" / "pages"
SPRITES_DIR = ROOT_DIR / "public" / "assets" / "stories" / "colorado" / "sprites" / "p4"


def is_magenta(r: int, g: int, b: int) -> bool:
    return r > 175 and g < 95 and b > 175 and (r + b - 2 * g) > 190


def is_border_magenta(r: int, g: int, b: int) -> bool:
    return (r > 155 and g < 110 and b > 155 and (r + b - 2 * g) > 150) or is_magenta(r, g, b)


def clean_magenta_cell(cell_img: Image.Image) -> Image.Image:
    rgba = cell_img.convert("RGBA")
    w, h = rgba.size
    px = rgba.load()

    # Shave 5px outer border artifacts along outer edges of the sheet if present
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

    # Interior enclosed magenta hole removal
    for y in range(1, h - 1):
        for x in range(1, w - 1):
            r, g, b, a = px[x, y]
            if a > 0 and is_magenta(r, g, b):
                px[x, y] = (0, 0, 0, 0)

    # 1px magenta edge de-spill
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
            elif r > 185 and b > 175 and r > g + 35 and b > g + 25:
                px[x, y] = (220, 232, 245, 135)
            elif r > g + 20 and b > g + 15:
                gray = (r + g + b) // 3
                px[x, y] = (gray, gray, min(255, gray + 8), 220)

    return rgba


def slice_1x4_sheet(sheet_name: str, out_name: str, splits: list[int], align_mode: str) -> None:
    src = Image.open(SPRITES_DIR / sheet_name).convert("RGBA")
    w, h = src.size
    # Shave 5px outer margin on top/bottom/left/right
    spx = src.load()
    for y in range(h):
        for x in range(w):
            if x < 5 or x >= w - 5 or y < 5 or y >= h - 5:
                spx[x, y] = (255, 0, 255, 255)

    cropped_frames: list[Image.Image] = []
    max_w = 0
    max_h = 0

    for i in range(4):
        cell = src.crop((splits[i], 0, splits[i + 1], h))
        cleaned = clean_magenta_cell(cell)
        bbox = cleaned.getbbox()
        if bbox is None:
            cropped = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
        else:
            cropped = cleaned.crop(bbox)
        cropped_frames.append(cropped)
        max_w = max(max_w, cropped.width)
        max_h = max(max_h, cropped.height)

    pad = 4
    frame_w = max_w + pad * 2
    frame_h = max_h + pad * 2
    strip = Image.new("RGBA", (frame_w * 4, frame_h), (0, 0, 0, 0))

    for i, c in enumerate(cropped_frames):
        ox = i * frame_w
        dx = ox + (frame_w - c.width) // 2
        if align_mode == "bottom":
            dy = frame_h - pad - c.height
        else:
            dy = (frame_h - c.height) // 2
        strip.paste(c, (dx, dy), c)

    out_path = SPRITES_DIR / out_name
    strip.save(out_path, "PNG")
    print(f"[{out_name}] strip={strip.width}x{strip.height} frame={frame_w}x{frame_h}")


def build_canyon_foreground_mask() -> None:
    p4_clean = Image.open(PAGES_DIR / "p4-clean.jpg").convert("RGBA")
    if p4_clean.size != (1280, 720):
        p4_1280 = p4_clean.resize((1280, 720), Image.Resampling.NEAREST)
    else:
        p4_1280 = p4_clean

    # Box (240, 130, 860, 265) -> 620x135
    patch = p4_1280.crop((240, 130, 860, 265))
    pw, ph = patch.size
    px = patch.load()

    for y in range(ph):
        y_global = 130 + y
        for x in range(pw):
            x_global = 240 + x
            r, g, b, _ = px[x, y]
            is_sky_or_cloud = (b > r) or (r > 200 and g > 215 and b > 225)
            is_central_valley_gap = 468 <= x_global <= 695
            if is_sky_or_cloud or is_central_valley_gap:
                px[x, y] = (0, 0, 0, 0)
            else:
                px[x, y] = (r, g, b, 255)

    out_path = SPRITES_DIR / "p4_canyon_foreground_mask.png"
    patch.save(out_path, "PNG")
    print(f"[p4_canyon_foreground_mask.png] size={pw}x{ph}")


def main() -> None:
    p4_canyon_jpg = PAGES_DIR / "p4-canyon.jpg"
    p4_canyon_bak = PAGES_DIR / "p4-canyon.v0.bak.jpg"
    if p4_canyon_jpg.exists() and not p4_canyon_bak.exists():
        shutil.copy2(p4_canyon_jpg, p4_canyon_bak)

    slice_1x4_sheet("p4_bighorn_sheet.jpg", "p4_bighorn.png", [0, 256, 512, 768, 1024], "bottom")
    slice_1x4_sheet("p4_cessna_sheet.jpg", "p4_cessna.png", [0, 256, 512, 768, 1024], "center")
    slice_1x4_sheet("p4_doggie_fisherman_sheet.jpg", "p4_doggie_fisherman.png", [0, 265, 535, 765, 1024], "bottom")
    slice_1x4_sheet("p4_dragonfly_sheet.jpg", "p4_dragonfly.png", [0, 256, 512, 735, 1024], "center")
    slice_1x4_sheet("p4_sparky_tube_sheet.jpg", "p4_sparky_tube.png", [0, 254, 526, 770, 1024], "bottom")
    build_canyon_foreground_mask()


if __name__ == "__main__":
    main()
