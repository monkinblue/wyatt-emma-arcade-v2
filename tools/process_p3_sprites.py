#!/usr/bin/env python3
"""
tools/process_p3_sprites.py
---------------------------
Book 2 — Page 3 ("Manitou Springs Penny Arcade") Sprite Sheet Slicer & Magenta Cleaner.

Processes `p3-clean.jpg` and the 7 raw `1x4` horizontal `#FF00FF` sprite sheets in
`public/assets/stories/colorado/sprites/p3/`:
  1. p3_wyatt_skeeball_sheet.jpg     -> p3_wyatt_skeeball.png     (bottom-aligned)
  2. p3_emma_tickets_sheet.jpg       -> p3_emma_tickets.png       (bottom-aligned)
  3. p3_grandparents_cheer_sheet.jpg -> p3_grandparents_cheer.png (bottom-aligned)
  4. p3_pony_doggie_sheet.jpg        -> p3_pony_doggie.png        (bottom-aligned)
  5. p3_claw_sparky_sheet.jpg        -> p3_claw_sparky.png        (top-aligned)
  6. p3_fortuneteller_sheet.jpg      -> p3_fortuneteller.png      (bottom-aligned)
  7. p3_bigfoot_wheel_sheet.jpg      -> p3_bigfoot_wheel.png      (center-aligned)
"""

from collections import deque
from pathlib import Path
import shutil
from PIL import Image

ROOT_DIR = Path(__file__).resolve().parent.parent
PAGES_DIR = ROOT_DIR / "public" / "assets" / "stories" / "colorado" / "pages"
P3_DIR = ROOT_DIR / "public" / "assets" / "stories" / "colorado" / "sprites" / "p3"


def is_magenta(r: int, g: int, b: int) -> bool:
    return r > 175 and g < 95 and b > 175 and (r + b - 2 * g) > 190 and abs(r - b) < 45


def is_pure_magenta_seed(r: int, g: int, b: int) -> bool:
    return r > 215 and g < 55 and b > 215 and (r + b - 2 * g) > 320 and abs(r - b) < 30


def clean_magenta_sheet(img: Image.Image, allow_interior_holes: bool = True) -> Image.Image:
    rgba = img.convert("RGBA")
    px = rgba.load()
    w, h = rgba.size

    # Shave 6px outer border margin
    border_margin = 6
    for y in range(h):
        for x in range(w):
            if x < border_margin or x >= w - border_margin or y < border_margin or y >= h - border_margin:
                px[x, y] = (0, 0, 0, 0)

    visited = [[False] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()

    for y in range(h):
        for x in range(w):
            if x <= border_margin or x >= w - border_margin - 1 or y <= border_margin or y >= h - border_margin - 1:
                r, g, b, a = px[x, y]
                if a == 0 or is_magenta(r, g, b):
                    visited[y][x] = True
                    q.append((x, y))

    while q:
        x, y = q.popleft()
        px[x, y] = (0, 0, 0, 0)
        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx]:
                nr, ng, nb, na = px[nx, ny]
                if na == 0 or is_magenta(nr, ng, nb):
                    visited[ny][nx] = True
                    q.append((nx, ny))

    if allow_interior_holes:
        for y in range(border_margin, h - border_margin):
            for x in range(border_margin, w - border_margin):
                if not visited[y][x]:
                    r, g, b, a = px[x, y]
                    if a > 0 and is_pure_magenta_seed(r, g, b):
                        visited[y][x] = True
                        q.append((x, y))
                        while q:
                            cx, cy = q.popleft()
                            px[cx, cy] = (0, 0, 0, 0)
                            for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                                nx, ny = cx + dx, cy + dy
                                if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx]:
                                    nr, ng, nb, na = px[nx, ny]
                                    if na > 0 and is_magenta(nr, ng, nb):
                                        visited[ny][nx] = True
                                        q.append((nx, ny))

    # 1px magenta edge de-spill pass
    snap = rgba.copy()
    spx = snap.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = spx[x, y]
            if a == 0:
                continue
            near_trans = False
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    if dx == 0 and dy == 0:
                        continue
                    nx, ny = x + dx, y + dy
                    if nx < 0 or nx >= w or ny < 0 or ny >= h or spx[nx, ny][3] == 0:
                        near_trans = True
                        break
                if near_trans:
                    break
            if near_trans:
                if (r + b - 2 * g) > 150 and r > 155 and b > 155 and abs(r - b) < 45:
                    px[x, y] = (0, 0, 0, 0)
                elif r > g + 35 and b > g + 35 and abs(r - b) < 35:
                    avg = min(255, int(g * 0.7 + min(r, b) * 0.3))
                    px[x, y] = (avg, g, avg, min(a, 220))

    return rgba


def find_four_frame_splits(rgba: Image.Image) -> list[int]:
    w, h = rgba.size
    px = rgba.load()
    col_counts = []
    for x in range(w):
        cnt = 0
        for y in range(h):
            if px[x, y][3] > 16:
                cnt += 1
        col_counts.append(cnt)

    splits = [0]
    for target_ratio in (0.25, 0.50, 0.75):
        center = int(w * target_ratio)
        lo = int(w * (target_ratio - 0.08))
        hi = int(w * (target_ratio + 0.08))
        best_x = center
        best_score = 10**15
        for x in range(lo, hi + 1):
            win_sum = sum(col_counts[max(0, x - 2) : min(w, x + 3)])
            dist = abs(x - center)
            score = col_counts[x] * 100000 + win_sum * 100 + dist
            if score < best_score:
                best_score = score
                best_x = x
        splits.append(best_x)
    splits.append(w)
    return splits


def process_sheet(in_file: Path, out_file: Path, align_mode: str, allow_interior_holes: bool = True, pad: int = 4) -> None:
    raw = Image.open(in_file)
    cleaned = clean_magenta_sheet(raw, allow_interior_holes=allow_interior_holes)
    splits = find_four_frame_splits(cleaned)

    # Shave any thin 1-3px vertical divider lines along the splits
    px = cleaned.load()
    w, h = cleaned.size
    for split_x in splits[1:4]:
        for x in range(max(0, split_x - 3), min(w, split_x + 4)):
            # Only shave if column is a thin vertical artifact or empty
            for y in range(h):
                r, g, b, a = px[x, y]
                if a > 0 and is_magenta(r, g, b):
                    px[x, y] = (0, 0, 0, 0)

    bboxes = []
    for i in range(4):
        x0, x1 = splits[i], splits[i + 1]
        cell = cleaned.crop((x0, 0, x1, h))
        bb = cell.getbbox()
        if bb is None:
            bboxes.append((0, 0, max(1, x1 - x0), h))
        else:
            bboxes.append(bb)

    crops = []
    max_w, max_h = 1, 1
    for i in range(4):
        x0, x1 = splits[i], splits[i + 1]
        cell = cleaned.crop((x0, 0, x1, h))
        c = cell.crop(bboxes[i])
        crops.append(c)
        max_w = max(max_w, c.width)
        max_h = max(max_h, c.height)

    top_pad = 0 if align_mode == "top_center" else pad
    frame_w = max_w + pad * 2
    frame_h = max_h + pad + top_pad
    strip = Image.new("RGBA", (frame_w * 4, frame_h), (0, 0, 0, 0))

    for i, c in enumerate(crops):
        ox = i * frame_w
        dx = ox + (frame_w - c.width) // 2
        if align_mode == "bottom_center":
            dy = frame_h - pad - c.height
        elif align_mode == "top_center":
            dy = 0
        else:
            dy = (frame_h - c.height) // 2
        strip.paste(c, (dx, dy), c)

    strip.save(out_file, "PNG")
    print(f"[{out_file.name}] strip={strip.width}x{strip.height} frameWidth={frame_w} frameHeight={frame_h}")


def main() -> None:
    P3_DIR.mkdir(parents=True, exist_ok=True)
    PAGES_DIR.mkdir(parents=True, exist_ok=True)

    p3_clean_src = PAGES_DIR / "p3-clean.jpg"
    if not p3_clean_src.exists() and (P3_DIR / "p3-clean.jpg").exists():
        shutil.copy2(P3_DIR / "p3-clean.jpg", p3_clean_src)

    p3_arcade_jpg = PAGES_DIR / "p3-arcade.jpg"
    p3_arcade_bak = PAGES_DIR / "p3-arcade.v0.bak.jpg"
    if p3_arcade_jpg.exists() and not p3_arcade_bak.exists():
        shutil.copy2(p3_arcade_jpg, p3_arcade_bak)

    specs = [
        ("p3_wyatt_skeeball_sheet.jpg", "p3_wyatt_skeeball.png", "bottom_center", True),
        ("p3_emma_tickets_sheet.jpg", "p3_emma_tickets.png", "bottom_center", True),
        ("p3_grandparents_cheer_sheet.jpg", "p3_grandparents_cheer.png", "bottom_center", True),
        ("p3_pony_doggie_sheet.jpg", "p3_pony_doggie.png", "bottom_center", True),
        ("p3_claw_sparky_sheet.jpg", "p3_claw_sparky.png", "top_center", True),
        ("p3_fortuneteller_sheet.jpg", "p3_fortuneteller.png", "bottom_center", False),
        ("p3_bigfoot_wheel_sheet.jpg", "p3_bigfoot_wheel.png", "center", False),
    ]

    for in_name, out_name, align_mode, allow_holes in specs:
        process_sheet(P3_DIR / in_name, P3_DIR / out_name, align_mode, allow_holes)


if __name__ == "__main__":
    main()
