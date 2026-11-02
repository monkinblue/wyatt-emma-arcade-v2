#!/usr/bin/env python3
"""
Builds all visual assets for the Heirloom Melody Maker (`MelodyMakerScene.ts`):
1. Composites `public/assets/games/melody-maker/melody-frame-bg.jpg` (1280x720)
   by placing the cropped puppet theater & walnut soundboard (`melody-stage-bg.jpg`)
   into the 936x560 center window `(172, 28)` of `studio-frame-bg.jpg`.
2. Chroma-keys and slices all custom sprites from:
   - `melody-keys-raw.jpg` -> `key-0.png`..`key-7.png` (y: 0..64.5%) + 4 stage props:
     - `prop-mallet-left.png` cropped from `y: 64.5%..98%, x: 4%..30%` + Largest Connected Component + 2px padding
     - `prop-mallet-right.png` created by horizontally flipping `prop-mallet-left.png` (`Image.FLIP_LEFT_RIGHT`)
     - `prop-firefly.png` cropped from `y: 60%..99%, x: 51%..74%` + Largest Connected Component
     - `prop-star-burst.png` cropped from `y: 58%..99%, x: 74%..100%`
   - `melody-band-raw.jpg` -> 3 rows x 3 bottom-aligned frames (`band-sparky-*`, `band-doggie-*`, `band-choir-*`)
   - `melody-ui-raw.jpg`   -> 3 rows x 5 columns (5 voices, 5 songs, 5 modes/rhythms)
"""

import os
from collections import deque
from PIL import Image


def is_magenta(r: int, g: int, b: int) -> bool:
    return r > 150 and g < 95 and b > 140 and (r + b) > (g * 3)


def is_interior_magenta_hole(r: int, g: int, b: int) -> bool:
    return r > 165 and g < 85 and b > 150 and (r + b) > (g * 3.2) and abs(r - b) < 65


def clear_magenta_and_despill(img: Image.Image) -> Image.Image:
    rgba = img.convert("RGBA")
    w, h = rgba.size
    px = rgba.load()

    visited = [[False] * w for _ in range(h)]
    q = deque()

    # 1. Seed outer borders
    for x in range(w):
        for y in (0, h - 1):
            r, g, b, a = px[x, y]
            if not visited[y][x] and is_magenta(r, g, b):
                visited[y][x] = True
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            r, g, b, a = px[x, y]
            if not visited[y][x] and is_magenta(r, g, b):
                visited[y][x] = True
                q.append((x, y))

    # 2. Seed interior pure #FF00FF holes (rivet holes, harp strings, clockwork gears, legs)
    for y in range(h):
        for x in range(w):
            if not visited[y][x]:
                r, g, b, a = px[x, y]
                if is_interior_magenta_hole(r, g, b):
                    visited[y][x] = True
                    q.append((x, y))

    # 3. BFS flood-fill
    while q:
        cx, cy = q.popleft()
        px[cx, cy] = (0, 0, 0, 0)
        for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
            if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx]:
                r, g, b, a = px[nx, ny]
                if is_magenta(r, g, b):
                    visited[ny][nx] = True
                    q.append((nx, ny))

    # 4. 2px neutral charcoal perimeter de-spill (R = G, B = G where G < 85 and R > G + 25)
    alpha_snapshot = [[px[x, y][3] for x in range(w)] for y in range(h)]
    for y in range(h):
        for x in range(w):
            if alpha_snapshot[y][x] == 0:
                continue
            near_trans = False
            for dy in range(-2, 3):
                for dx in range(-2, 3):
                    nx, ny = x + dx, y + dy
                    if nx < 0 or nx >= w or ny < 0 or ny >= h or alpha_snapshot[ny][nx] == 0:
                        near_trans = True
                        break
                if near_trans:
                    break
            if near_trans:
                r, g, b, a = px[x, y]
                if g < 85 and r > g + 25:
                    px[x, y] = (g, g, g, a)
                elif r > g + 40 and b > g + 40:
                    px[x, y] = (g, g, g, a)

    return rgba


def keep_largest_connected_component(img: Image.Image) -> Image.Image:
    rgba = img.copy()
    w, h = rgba.size
    px = rgba.load()
    visited = [[False] * w for _ in range(h)]
    best_comp = []

    for y in range(h):
        for x in range(w):
            if not visited[y][x] and px[x, y][3] > 15:
                comp = []
                q = deque([(x, y)])
                visited[y][x] = True
                while q:
                    cx, cy = q.popleft()
                    comp.append((cx, cy))
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            if dx == 0 and dy == 0:
                                continue
                            nx, ny = cx + dx, cy + dy
                            if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx] and px[nx, ny][3] > 15:
                                visited[ny][nx] = True
                                q.append((nx, ny))
                if len(comp) > len(best_comp):
                    best_comp = comp

    keep_set = set(best_comp)
    for y in range(h):
        for x in range(w):
            if (x, y) not in keep_set:
                px[x, y] = (0, 0, 0, 0)
    return rgba


def tight_bbox(img: Image.Image, x0: int, y0: int, x1: int, y1: int):
    px = img.load()
    min_x, min_y = x1, y1
    max_x, max_y = x0, y0
    found = False
    for y in range(y0, y1):
        for x in range(x0, x1):
            if px[x, y][3] > 10:
                found = True
                if x < min_x:
                    min_x = x
                if x > max_x:
                    max_x = x
                if y < min_y:
                    min_y = y
                if y > max_y:
                    max_y = y
    if not found:
        return x0, y0, x1, y1
    return min_x, min_y, max_x + 1, max_y + 1


def pad_rgba(img: Image.Image, pad: int = 2) -> Image.Image:
    w, h = img.size
    out = Image.new("RGBA", (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    out.paste(img, (pad, pad))
    return out


def build_stage_frame(root_dir: str):
    frame_path = os.path.join(root_dir, "public", "assets", "games", "art-studio", "studio-frame-bg.jpg")
    stage_raw_path = os.path.join(root_dir, "public", "assets", "games", "melody-maker", "raw", "melody-stage-bg.jpg")
    if not os.path.exists(stage_raw_path):
        stage_raw_path = os.path.join(root_dir, "public", "assets", "games", "melody-maker", "melody-stage-bg.jpg")

    out_path = os.path.join(root_dir, "public", "assets", "games", "melody-maker", "melody-frame-bg.jpg")
    frame_img = Image.open(frame_path).convert("RGB")
    stage_img = Image.open(stage_raw_path).convert("RGB")
    if stage_img.size != (1280, 720):
        stage_img = stage_img.resize((1280, 720), Image.LANCZOS)

    cropped = stage_img.crop((92, 16, 1188, 704)).resize((936, 560), Image.LANCZOS)
    frame_img.paste(cropped, (172, 28))
    frame_img.save(out_path, quality=95)
    print(f"Saved {out_path} (1280x720)")


def slice_keys_and_props(root_dir: str, sprites_dir: str):
    raw_path = os.path.join(root_dir, "public", "assets", "games", "melody-maker", "raw", "melody-keys-raw.jpg")
    raw_img = Image.open(raw_path)
    w, h = raw_img.size
    row1_end_y = int(round(h * 0.645))

    # Row 1: 8 graduated chime bars (extending down to y = 64.5% so bottom brass caps are 100% intact)
    row1 = clear_magenta_and_despill(raw_img.crop((0, 0, w, row1_end_y)))
    r1_px = row1.load()
    col_has_pixels = [any(r1_px[x, y][3] > 15 for y in range(int(h * 0.55))) for x in range(w)]
    segments = []
    in_seg = False
    seg_start = 0
    for x, active in enumerate(col_has_pixels):
        if active and not in_seg:
            in_seg = True
            seg_start = x
        elif not active and in_seg:
            in_seg = False
            if x - seg_start > 15:
                segments.append((seg_start, x))
    if in_seg and w - seg_start > 15:
        segments.append((seg_start, w))

    for idx, (sx, ex) in enumerate(segments[:8]):
        cell = keep_largest_connected_component(row1.crop((sx, 0, ex, row1_end_y)))
        bx0, by0, bx1, by1 = tight_bbox(cell, 0, 0, cell.size[0], cell.size[1])
        bar_img = cell.crop((bx0, by0, bx1, by1))
        out_file = os.path.join(sprites_dir, f"key-{idx}.png")
        bar_img.save(out_file)
        print(f"Saved {out_file} ({bar_img.size[0]}x{bar_img.size[1]})")

    # Row 2, Prop 1 & 2: Left Mallet cropped strictly from y: 64.5%..98%, x: 4%..30% + Largest Connected Component + 2px padding
    mx0, my0 = int(round(w * 0.04)), int(round(h * 0.645))
    mx1, my1 = int(round(w * 0.30)), int(round(h * 0.98))
    mallet_raw = clear_magenta_and_despill(raw_img.crop((mx0, my0, mx1, my1)))
    mallet_clean = keep_largest_connected_component(mallet_raw)
    bx0, by0, bx1, by1 = tight_bbox(mallet_clean, 0, 0, mallet_clean.size[0], mallet_clean.size[1])
    mallet_left = pad_rgba(mallet_clean.crop((bx0, by0, bx1, by1)), 2)

    left_path = os.path.join(sprites_dir, "prop-mallet-left.png")
    mallet_left.save(left_path)
    print(f"Saved {left_path} ({mallet_left.size[0]}x{mallet_left.size[1]})")

    # Right Mallet: horizontal flip of prop-mallet-left.png (handle at bottom-right, ball head at top-left)
    mallet_right = mallet_left.transpose(Image.FLIP_LEFT_RIGHT)
    right_path = os.path.join(sprites_dir, "prop-mallet-right.png")
    mallet_right.save(right_path)
    print(f"Saved {right_path} ({mallet_right.size[0]}x{mallet_right.size[1]})")

    # Prop 3: Firefly (y: 60%..99%, x: 51%..74%) + Largest Connected Component
    fx0, fy0 = int(round(w * 0.51)), int(round(h * 0.60))
    fx1, fy1 = int(round(w * 0.74)), int(round(h * 0.99))
    firefly_raw = clear_magenta_and_despill(raw_img.crop((fx0, fy0, fx1, fy1)))
    firefly_clean = keep_largest_connected_component(firefly_raw)
    bx0, by0, bx1, by1 = tight_bbox(firefly_clean, 0, 0, firefly_clean.size[0], firefly_clean.size[1])
    firefly_img = firefly_clean.crop((bx0, by0, bx1, by1))
    ff_path = os.path.join(sprites_dir, "prop-firefly.png")
    firefly_img.save(ff_path)
    print(f"Saved {ff_path} ({firefly_img.size[0]}x{firefly_img.size[1]})")

    # Prop 4: Star Burst (y: 58%..99%, x: 74%..100%)
    sx0, sy0 = int(round(w * 0.74)), int(round(h * 0.58))
    sx1, sy1 = w, int(round(h * 0.99))
    star_raw = clear_magenta_and_despill(raw_img.crop((sx0, sy0, sx1, sy1)))
    bx0, by0, bx1, by1 = tight_bbox(star_raw, 0, 0, star_raw.size[0], star_raw.size[1])
    star_img = star_raw.crop((bx0, by0, bx1, by1))
    star_path = os.path.join(sprites_dir, "prop-star-burst.png")
    star_img.save(star_path)
    print(f"Saved {star_path} ({star_img.size[0]}x{star_img.size[1]})")


def slice_band(root_dir: str, sprites_dir: str):
    raw_path = os.path.join(root_dir, "public", "assets", "games", "melody-maker", "raw", "melody-band-raw.jpg")
    cleaned = clear_magenta_and_despill(Image.open(raw_path))
    w, h = cleaned.size

    row_names = ["band-sparky", "band-doggie", "band-choir"]
    row_bounds = [(0, 196), (196, 382), (382, h)]
    for r_idx, prefix in enumerate(row_names):
        y0, y1 = row_bounds[r_idx]
        frames = []
        max_fw = 0
        max_fh = 0
        for c_idx in range(3):
            x0 = int(round(c_idx * w / 3.0))
            x1 = int(round((c_idx + 1) * w / 3.0))
            bx0, by0, bx1, by1 = tight_bbox(cleaned, x0, y0, x1, y1)
            cropped = cleaned.crop((bx0, by0, bx1, by1))
            fw, fh = cropped.size
            max_fw = max(max_fw, fw)
            max_fh = max(max_fh, fh)
            frames.append(cropped)

        for c_idx, cropped in enumerate(frames):
            canvas = Image.new("RGBA", (max_fw, max_fh), (0, 0, 0, 0))
            fw, fh = cropped.size
            dx = (max_fw - fw) // 2
            dy = max_fh - fh
            canvas.paste(cropped, (dx, dy))
            out_file = os.path.join(sprites_dir, f"{prefix}-{c_idx}.png")
            canvas.save(out_file)
            print(f"Saved {out_file} ({max_fw}x{max_fh})")


def slice_ui(root_dir: str, sprites_dir: str):
    raw_path = os.path.join(root_dir, "public", "assets", "games", "melody-maker", "raw", "melody-ui-raw.jpg")
    cleaned = clear_magenta_and_despill(Image.open(raw_path))
    w, h = cleaned.size

    grid_names = [
        ["voice-glockenspiel.png", "voice-marimba.png", "voice-piano.png", "voice-doggie.png", "voice-sparky.png"],
        ["song-twinkle.png", "song-mary.png", "song-macdonald.png", "song-rowboat.png", "song-roadster.png"],
        ["mode-autoplay.png", "mode-firefly.png", "mode-maestro.png", "rhythm-campfire.png", "rhythm-parade.png"],
    ]

    for r_idx in range(3):
        y0 = int(round(r_idx * h / 3.0))
        y1 = int(round((r_idx + 1) * h / 3.0))
        for c_idx in range(5):
            x0 = int(round(c_idx * w / 5.0))
            x1 = int(round((c_idx + 1) * w / 5.0))
            bx0, by0, bx1, by1 = tight_bbox(cleaned, x0, y0, x1, y1)
            cropped = cleaned.crop((bx0, by0, bx1, by1))
            out_file = os.path.join(sprites_dir, grid_names[r_idx][c_idx])
            cropped.save(out_file)
            print(f"Saved {out_file} ({cropped.size[0]}x{cropped.size[1]})")


def main():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    sprites_dir = os.path.join(root_dir, "public", "assets", "games", "melody-maker", "sprites")
    os.makedirs(sprites_dir, exist_ok=True)

    build_stage_frame(root_dir)
    slice_keys_and_props(root_dir, sprites_dir)
    slice_band(root_dir, sprites_dir)
    slice_ui(root_dir, sprites_dir)


if __name__ == "__main__":
    main()
