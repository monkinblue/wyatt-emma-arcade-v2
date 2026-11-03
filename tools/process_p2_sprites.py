#!/usr/bin/env python3
"""
tools/process_p2_sprites.py
---------------------------
Step 1: Python Sprite Slicer & Magenta Cleaner for Book 2 — Page 2
(`p2-clean.jpg` Babci & Grandpa's House).

Processes all 8 raw `#FF00FF` magenta `1x4` horizontal sprite sheets in
`public/assets/stories/colorado/sprites/p2/` into clean transparent `1x4` PNG sprite sheets:
  - Bottom-baseline aligned:
      1. `p2_grandparents_wave.png`
      2. `p2_wyatt_run.png`
      3. `p2_emma_run.png`
      4. `p2_chimney_sparky.png`
      5. `p2_bush_doggie.png`
      6. `p2_lawn_sprinkler.png`
  - Center-aligned:
      7. `p2_lavender_butterflies.png`
      8. `p2_tree_squirrel.png`
"""

from collections import deque
from pathlib import Path
import shutil
import subprocess
import sys

ROOT_DIR = Path(__file__).resolve().parent.parent
COLORADO_DIR = ROOT_DIR / "public" / "assets" / "stories" / "colorado"
PAGES_DIR = COLORADO_DIR / "pages"
SPRITES_DIR = COLORADO_DIR / "sprites"
P2_DIR = SPRITES_DIR / "p2"


def find_input_file(filename: str) -> Path:
    for folder in (P2_DIR, PAGES_DIR, SPRITES_DIR, COLORADO_DIR / "raw"):
        candidate = folder / filename
        if candidate.exists():
            return candidate
    raise FileNotFoundError(f"Could not locate {filename} in {P2_DIR} or {PAGES_DIR}")


def is_pure_magenta_seed(r: int, g: int, b: int) -> bool:
    return r > 165 and g < 95 and b > 165 and (r + b - 2 * g) > 180 and abs(r - b) < 40


def is_magenta(r: int, g: int, b: int) -> bool:
    return r > 145 and g < 105 and b > 145 and (r + b - 2 * g) > 150 and abs(r - b) < 45


def is_border_magenta(r: int, g: int, b: int) -> bool:
    return (
        (r > 155 and g < 110 and b > 155 and (r + b - 2 * g) > 150)
        or (r > 130 and g < 55 and b > 130 and abs(r - b) < 30 and (r + b - 2 * g) > 160)
        or is_magenta(r, g, b)
    )


def clean_magenta_image(img):
    """
    Removes #FF00FF magenta background and near-magenta JPEG artifacts using border flood-fill
    PLUS pure-magenta-seeded interior hole flood-fill (protecting purple clothing/flowers),
    followed by a 1px magenta edge de-spill pass.
    """
    rgba = img.convert("RGBA")
    w, h = rgba.size
    px = rgba.load()
    visited = [[False] * w for _ in range(h)]
    q = deque()

    # Shave 4px outer margin where JPEG border artifacts can occur
    margin = 4
    for y in range(h):
        for x in range(w):
            if x < margin or x >= w - margin or y < margin or y >= h - margin:
                r, g, b, _ = px[x, y]
                if is_border_magenta(r, g, b):
                    px[x, y] = (0, 0, 0, 0)
                    visited[y][x] = True
                    q.append((x, y))

    while q:
        cx, cy = q.popleft()
        px[cx, cy] = (0, 0, 0, 0)
        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            nx, ny = cx + dx, cy + dy
            if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx]:
                nr, ng, nb, _ = px[nx, ny]
                if is_border_magenta(nr, ng, nb):
                    visited[ny][nx] = True
                    q.append((nx, ny))

    # Interior enclosed magenta holes (seeded from pure #FF00FF pixels so purple dresses/lavender stay intact)
    for y in range(1, h - 1):
        for x in range(1, w - 1):
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

    # 1px magenta fringe de-spill pass
    orig = rgba.copy()
    opx = orig.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = opx[x, y]
            if a == 0:
                continue
            near_trans = False
            for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (1, -1), (-1, 1), (1, 1)):
                nx, ny = x + dx, y + dy
                if nx < 0 or nx >= w or ny < 0 or ny >= h or opx[nx, ny][3] == 0:
                    near_trans = True
                    break
            if near_trans and (r + b - 2 * g) > 140 and r > 145 and b > 145 and abs(r - b) < 45:
                px[x, y] = (0, 0, 0, 0)
            elif near_trans and r > g + 35 and b > g + 35 and abs(r - b) < 35:
                avg = int(g * 0.7 + min(r, b) * 0.3)
                px[x, y] = (avg, g, avg, min(a, 220))

    return rgba


def find_four_frame_splits(rgba):
    w, h = rgba.size
    px = rgba.load()
    col_counts = [0] * w
    for x in range(w):
        cnt = 0
        for y in range(h):
            if px[x, y][3] > 16:
                cnt += 1
        col_counts[x] = cnt

    splits = [0]
    for target_frac in (0.25, 0.50, 0.75):
        lo = int(w * (target_frac - 0.09))
        hi = int(w * (target_frac + 0.09))
        best_x = int(w * target_frac)
        best_score = 10**9
        for x in range(lo, hi + 1):
            # Prefer zero-count columns furthest from non-zero neighbors
            window_sum = sum(col_counts[max(0, x - 3) : min(w, x + 4)])
            dist_penalty = abs(x - int(w * target_frac))
            score = col_counts[x] * 10000 + window_sum * 100 + dist_penalty
            if score < best_score:
                best_score = score
                best_x = x
        splits.append(best_x)
    splits.append(w)
    return splits


def build_p2_strip(rgba, align_mode: str = "bottom_center", pad: int = 4):
    from PIL import Image

    splits = find_four_frame_splits(rgba)
    raw_cells = [rgba.crop((splits[i], 0, splits[i + 1], rgba.height)) for i in range(4)]

    # Compute global vertical bounds across all 4 cells
    bboxes = [c.getbbox() or (0, 0, c.width, c.height) for c in raw_cells]
    global_min_y = min(b[1] for b in bboxes)
    global_max_y = max(b[3] for b in bboxes)

    cropped_frames = []
    for c, b in zip(raw_cells, bboxes):
        if align_mode == "center_shared_y":
            # Keep vertical Y locked across all 4 frames while trimming horizontal X per frame
            cropped_frames.append(c.crop((b[0], global_min_y, b[2], global_max_y)))
        else:
            cropped_frames.append(c.crop(b))

    max_w = max(f.width for f in cropped_frames)
    max_h = max(f.height for f in cropped_frames)
    frame_w = max_w + pad * 2
    frame_h = max_h + pad * 2

    strip = Image.new("RGBA", (frame_w * 4, frame_h), (0, 0, 0, 0))
    for i, f in enumerate(cropped_frames):
        ox = i * frame_w
        dx = ox + (frame_w - f.width) // 2
        if align_mode == "bottom_center":
            dy = frame_h - pad - f.height
        else:
            dy = (frame_h - f.height) // 2
        strip.paste(f, (dx, dy), f)

    return strip, frame_w, frame_h


def process_with_pil() -> bool:
    try:
        from PIL import Image  # noqa: F401
    except ImportError:
        return False

    P2_DIR.mkdir(parents=True, exist_ok=True)
    PAGES_DIR.mkdir(parents=True, exist_ok=True)

    p2_clean_src = find_input_file("p2-clean.jpg")
    p2_clean_dst = PAGES_DIR / "p2-clean.jpg"
    if p2_clean_src.resolve() != p2_clean_dst.resolve():
        shutil.copy2(p2_clean_src, p2_clean_dst)

    p2_house_jpg = PAGES_DIR / "p2-house.jpg"
    p2_house_bak = PAGES_DIR / "p2-house.v0.bak.jpg"
    if p2_house_jpg.exists() and not p2_house_bak.exists():
        shutil.copy2(p2_house_jpg, p2_house_bak)
    shutil.copy2(p2_clean_dst, p2_house_jpg)

    specs = [
        ("p2_grandparents_wave_sheet.jpg", "p2_grandparents_wave.png", "bottom_center"),
        ("p2_wyatt_run_sheet.jpg", "p2_wyatt_run.png", "bottom_center"),
        ("p2_emma_run_sheet.jpg", "p2_emma_run.png", "bottom_center"),
        ("p2_chimney_sparky_sheet.jpg", "p2_chimney_sparky.png", "bottom_center"),
        ("p2_bush_doggie_sheet.jpg", "p2_bush_doggie.png", "bottom_center"),
        ("p2_lavender_butterflies_sheet.jpg", "p2_lavender_butterflies.png", "center"),
        ("p2_lawn_sprinkler_sheet.jpg", "p2_lawn_sprinkler.png", "bottom_center"),
        ("p2_tree_squirrel_sheet.jpg", "p2_tree_squirrel.png", "center_shared_y"),
    ]

    from PIL import Image

    for src_name, out_name, mode in specs:
        src_img = Image.open(find_input_file(src_name)).convert("RGB")
        cleaned = clean_magenta_image(src_img)
        strip, fw, fh = build_p2_strip(cleaned, align_mode=mode, pad=4)
        out_path = P2_DIR / out_name
        strip.save(out_path, "PNG")
        print(f"[{out_name}] strip={strip.size} frame={fw}x{fh} mode={mode}")

    return True


def main() -> None:
    if not process_with_pil():
        ps1_path = ROOT_DIR / "tools" / "process_p2_sprites.ps1"
        if ps1_path.exists():
            subprocess.run(
                ["powershell", "-ExecutionPolicy", "Bypass", "-File", str(ps1_path)],
                check=True,
            )
        else:
            sys.exit("Neither PIL nor tools/process_p2_sprites.ps1 available.")


if __name__ == "__main__":
    main()
