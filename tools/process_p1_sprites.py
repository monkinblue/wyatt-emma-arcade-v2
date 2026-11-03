#!/usr/bin/env python3
"""
tools/process_p1_sprites.py
---------------------------
Step 1: Python Sprite Slicer, Magenta Cleaner & Head-Occlusion Mask Generator
for Book 2 — Page 1 (`p1-clean.jpg` Road Trip to Colorado).

Processes all 8 raw `#FF00FF` magenta sprite sheets into clean transparent `1x4` (and `1x3` / `1x1`)
horizontal PNG sprite strips in `public/assets/stories/colorado/sprites/p1/`, and generates the
pixel-registered `p1_heads_foreground_mask.png` (`150x115` at `(385, 165)`) from `p1-clean.jpg`.
"""

from collections import deque
from pathlib import Path
import subprocess
import sys

ROOT_DIR = Path(__file__).resolve().parent.parent
COLORADO_DIR = ROOT_DIR / "public" / "assets" / "stories" / "colorado"
PAGES_DIR = COLORADO_DIR / "pages"
SPRITES_DIR = COLORADO_DIR / "sprites"
OUT_P1_DIR = SPRITES_DIR / "p1"


def find_input_file(filename: str) -> Path:
    for folder in (OUT_P1_DIR, SPRITES_DIR, PAGES_DIR, COLORADO_DIR / "raw"):
        candidate = folder / filename
        if candidate.exists():
            return candidate
    raise FileNotFoundError(f"Could not locate {filename} in {SPRITES_DIR} or {PAGES_DIR}")


def is_magenta(r: int, g: int, b: int) -> bool:
    return r > 175 and g < 95 and b > 175 and (r + b - 2 * g) > 190


def is_border_magenta(r: int, g: int, b: int) -> bool:
    return (r > 155 and g < 110 and b > 155 and (r + b - 2 * g) > 150) or is_magenta(r, g, b)


def clean_magenta_cell(cell_img):
    """
    Removes #FF00FF magenta background (and JPEG compression artifacts near magenta)
    using border flood-fill + interior enclosed magenta hole removal + 1px fringe de-spill.
    """
    rgba = cell_img.convert("RGBA")
    w, h = rgba.size
    px = rgba.load()
    visited = [[False] * w for _ in range(h)]
    q = deque()

    for x in range(w):
        for y in (0, h - 1):
            r, g, b, _ = px[x, y]
            if is_border_magenta(r, g, b):
                visited[y][x] = True
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if not visited[y][x]:
                r, g, b, _ = px[x, y]
                if is_border_magenta(r, g, b):
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

    # Interior enclosed magenta holes
    for y in range(1, h - 1):
        for x in range(1, w - 1):
            r, g, b, a = px[x, y]
            if a > 0 and is_magenta(r, g, b):
                px[x, y] = (0, 0, 0, 0)

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
            if near_trans and (r + b - 2 * g) > 130 and r > 135 and b > 135:
                px[x, y] = (0, 0, 0, 0)
            elif near_trans and r > g + 25 and b > g + 25:
                avg = int(g * 0.7 + min(r, b) * 0.3)
                px[x, y] = (avg, g, avg, min(a, 220))

    return rgba


def get_base_center_x(rgba, bbox, bottom_ratio: float = 0.28) -> float:
    x0, y0, x1, y1 = bbox
    h_box = max(1, y1 - y0)
    y_start = max(y0, int(y1 - h_box * bottom_ratio))
    px = rgba.load()
    xs = []
    for y in range(y_start, y1):
        for x in range(x0, x1):
            if px[x, y][3] > 32:
                xs.append(x)
    if not xs:
        return (x0 + x1) / 2.0
    return (min(xs) + max(xs)) / 2.0


def build_strip(frames, align_mode: str = "center", pad: int = 4):
    from PIL import Image

    cropped = []
    for f in frames:
        bbox = f.getbbox()
        if not bbox:
            cropped.append((f, (0, 0, f.width, f.height), f.width / 2.0))
        else:
            base_cx = get_base_center_x(f, bbox) - bbox[0]
            c = f.crop(bbox)
            cropped.append((c, bbox, base_cx))

    max_w = max(c.width for c, _, _ in cropped)
    max_h = max(c.height for c, _, _ in cropped)

    if align_mode in ("bottom_base", "bottom_center"):
        # Compute required left/right extent from base_cx so no frame clips horizontally
        max_left = max(int(round(base_cx)) for _, _, base_cx in cropped)
        max_right = max(int(round(c.width - base_cx)) for c, _, base_cx in cropped)
        frame_w = max(max_w, max_left + max_right) + pad * 2
    else:
        frame_w = max_w + pad * 2

    frame_h = max_h + pad * 2
    strip = Image.new("RGBA", (frame_w * len(cropped), frame_h), (0, 0, 0, 0))

    for idx, (c, _, base_cx) in enumerate(cropped):
        ox = idx * frame_w
        if align_mode == "bottom_base":
            target_cx = frame_w // 2
            dx = ox + max(pad, min(frame_w - c.width - pad, int(round(target_cx - base_cx))))
            dy = frame_h - pad - c.height
        elif align_mode == "bottom_center":
            dx = ox + (frame_w - c.width) // 2
            dy = frame_h - pad - c.height
        else:
            dx = ox + (frame_w - c.width) // 2
            dy = (frame_h - c.height) // 2
        strip.paste(c, (dx, dy), c)

    return strip, frame_w, frame_h


def process_with_pil() -> bool:
    try:
        from PIL import Image
    except ImportError:
        return False

    OUT_P1_DIR.mkdir(parents=True, exist_ok=True)
    PAGES_DIR.mkdir(parents=True, exist_ok=True)

    p1_clean_src = find_input_file("p1-clean.jpg")
    p1_clean_dst = PAGES_DIR / "p1-clean.jpg"
    if p1_clean_src.resolve() != p1_clean_dst.resolve():
        p1_clean_dst.write_bytes(p1_clean_src.read_bytes())

    # 1. p1_thule_sparky_sheet.jpg (2x2 grid -> 1x4 bottom_base aligned)
    thule_img = Image.open(find_input_file("p1_thule_sparky_sheet.jpg")).convert("RGB")
    tw, th = thule_img.size
    m = 6
    thule_cells = [
        thule_img.crop((m, m, tw // 2 - m, th // 2 - m)),
        thule_img.crop((tw // 2 + m, m, tw - m, th // 2 - m)),
        thule_img.crop((m, th // 2 + m, tw // 2 - m, th - m)),
        thule_img.crop((tw // 2 + m, th // 2 + m, tw - m, th - m)),
    ]
    thule_frames = [clean_magenta_cell(c) for c in thule_cells]
    thule_strip, fw, fh = build_strip(thule_frames, align_mode="bottom_base")
    thule_strip.save(OUT_P1_DIR / "p1_thule_sparky.png", "PNG")
    print(f"[p1_thule_sparky.png] strip={thule_strip.size} frame={fw}x{fh}")

    # 2. p1_doggie_suitcase_sheet.jpg (2x4 grid, top row 4 frames -> 1x4 bottom_base aligned)
    doggie_img = Image.open(find_input_file("p1_doggie_suitcase_sheet.jpg")).convert("RGB")
    dw, dh = doggie_img.size
    doggie_cells = [
        doggie_img.crop((i * dw // 4 + m, m, (i + 1) * dw // 4 - m, dh // 2 - m))
        for i in range(4)
    ]
    doggie_frames = [clean_magenta_cell(c) for c in doggie_cells]
    doggie_strip, fw, fh = build_strip(doggie_frames, align_mode="bottom_base")
    doggie_strip.save(OUT_P1_DIR / "p1_doggie_suitcase.png", "PNG")
    print(f"[p1_doggie_suitcase.png] strip={doggie_strip.size} frame={fw}x{fh}")

    # 3. p1_exhaust_smoke_sheet.jpg (1x4 strip)
    smoke_img = Image.open(find_input_file("p1_exhaust_smoke_sheet.jpg")).convert("RGB")
    sh = smoke_img.height
    smoke_splits = [(6, 262), (262, 511), (511, 783), (783, smoke_img.width - 6)]
    smoke_frames = [clean_magenta_cell(smoke_img.crop((x0, 6, x1, sh - 6))) for x0, x1 in smoke_splits]
    smoke_strip, fw, fh = build_strip(smoke_frames, align_mode="center")
    smoke_strip.save(OUT_P1_DIR / "p1_exhaust_smoke.png", "PNG")
    print(f"[p1_exhaust_smoke.png] strip={smoke_strip.size} frame={fw}x{fh}")

    # 4. p1_bluebird_sheet.jpg (1x4 strip)
    bird_img = Image.open(find_input_file("p1_bluebird_sheet.jpg")).convert("RGB")
    bh = bird_img.height
    bird_splits = [(6, 255), (255, 533), (533, 750), (750, bird_img.width - 6)]
    bird_frames = [clean_magenta_cell(bird_img.crop((x0, 6, x1, bh - 6))) for x0, x1 in bird_splits]
    bird_strip, fw, fh = build_strip(bird_frames, align_mode="bottom_center")
    bird_strip.save(OUT_P1_DIR / "p1_bluebird.png", "PNG")
    print(f"[p1_bluebird.png] strip={bird_strip.size} frame={fw}x{fh}")

    # 5. p1_chipmunk_sheet.jpg (1x4 strip -> bottom_base aligned on gray rock)
    chip_img = Image.open(find_input_file("p1_chipmunk_sheet.jpg")).convert("RGB")
    ch = chip_img.height
    chip_splits = [(6, 257), (257, 536), (536, 752), (752, chip_img.width - 6)]
    chip_frames = [clean_magenta_cell(chip_img.crop((x0, 6, x1, ch - 6))) for x0, x1 in chip_splits]
    chip_strip, fw, fh = build_strip(chip_frames, align_mode="bottom_base")
    chip_strip.save(OUT_P1_DIR / "p1_chipmunk.png", "PNG")
    print(f"[p1_chipmunk.png] strip={chip_strip.size} frame={fw}x{fh}")

    # 6. p1_eagle_soar_sheet.jpg (1x4 strip with wingtip/tail separation between frames 1 & 2)
    eagle_img = Image.open(find_input_file("p1_eagle_soar_sheet.jpg")).convert("RGB")
    eh = eagle_img.height
    f0 = clean_magenta_cell(eagle_img.crop((6, 6, 245, eh - 6)))
    c1 = eagle_img.crop((246, 6, 562, eh - 6)).convert("RGBA")
    c1_px = c1.load()
    for y in range(c1.height):
        for x in range(c1.width):
            if (x + 246) >= 525 and (y + 6) >= 220:
                c1_px[x, y] = (255, 0, 255, 255)
    f1 = clean_magenta_cell(c1)

    c2 = eagle_img.crop((525, 6, 753, eh - 6)).convert("RGBA")
    c2_px = c2.load()
    for y in range(c2.height):
        for x in range(c2.width):
            if (x + 525) <= 562 and (y + 6) < 220:
                c2_px[x, y] = (255, 0, 255, 255)
    f2 = clean_magenta_cell(c2)
    f3 = clean_magenta_cell(eagle_img.crop((753, 6, eagle_img.width - 6, eh - 6)))
    eagle_strip, fw, fh = build_strip([f0, f1, f2, f3], align_mode="center")
    eagle_strip.save(OUT_P1_DIR / "p1_eagle_soar.png", "PNG")
    print(f"[p1_eagle_soar.png] strip={eagle_strip.size} frame={fw}x{fh}")

    # 7. p1_camping_cooler_sheet.jpg (1x4 strip -> bottom_base aligned on red cooler)
    cooler_img = Image.open(find_input_file("p1_camping_cooler_sheet.jpg")).convert("RGB")
    clh = cooler_img.height
    cooler_splits = [(6, 260), (260, 521), (521, 761), (761, cooler_img.width - 6)]
    cooler_frames = [clean_magenta_cell(cooler_img.crop((x0, 6, x1, clh - 6))) for x0, x1 in cooler_splits]
    cooler_strip, fw, fh = build_strip(cooler_frames, align_mode="bottom_base")
    cooler_strip.save(OUT_P1_DIR / "p1_camping_cooler.png", "PNG")
    print(f"[p1_camping_cooler.png] strip={cooler_strip.size} frame={fw}x{fh}")

    # 8. p1_autumn_leaves_sheet.jpg -> p1_autumn_leaves.png (3 frames) + p1_pine_freshener.png (frame 3)
    leaves_img = Image.open(find_input_file("p1_autumn_leaves_sheet.jpg")).convert("RGB")
    lh = leaves_img.height
    leaf_splits = [(6, 247), (247, 556), (556, 770)]
    leaf_frames = [clean_magenta_cell(leaves_img.crop((x0, 6, x1, lh - 6))) for x0, x1 in leaf_splits]
    leaves_strip, fw, fh = build_strip(leaf_frames, align_mode="center")
    leaves_strip.save(OUT_P1_DIR / "p1_autumn_leaves.png", "PNG")
    print(f"[p1_autumn_leaves.png] strip={leaves_strip.size} frame={fw}x{fh}")

    pine_raw = clean_magenta_cell(leaves_img.crop((770, 6, leaves_img.width - 6, lh - 6)))
    p_bbox = pine_raw.getbbox()
    pine_cropped = pine_raw.crop(p_bbox) if p_bbox else pine_raw
    pine_out = Image.new("RGBA", (pine_cropped.width + 8, pine_cropped.height + 8), (0, 0, 0, 0))
    pine_out.paste(pine_cropped, (4, 4), pine_cropped)
    pine_out.save(OUT_P1_DIR / "p1_pine_freshener.png", "PNG")
    print(f"[p1_pine_freshener.png] size={pine_out.size}")

    # 9. Generate p1_heads_foreground_mask.png from 1280x720 p1-clean.jpg at box = (385, 165, 715, 315)
    bg_1280 = Image.open(p1_clean_dst).convert("RGBA").resize((1280, 720), Image.Resampling.NEAREST)
    patch = bg_1280.crop((385, 165, 715, 315))
    pw, ph = patch.size  # 330x150
    ppx = patch.load()

    def is_sky_pixel(r: int, g: int, b: int) -> bool:
        return (b > 165 and r > 140 and g > 155 and (abs(r - g) < 30 or b >= g >= r)) or (
            b > 170 and g > 160 and r > 125 and b > r + 15
        )

    # Left side (x < 150, i.e., canvasX < 535): exact existing sky/cloud transparency mask for Dad's & Wyatt's heads
    left_w = 150  # 535 - 385
    visited = [[False] * left_w for _ in range(ph)]
    q = deque()

    for x in range(left_w):
        r, g, b, _ = ppx[x, 0]
        if is_sky_pixel(r, g, b):
            visited[0][x] = True
            q.append((x, 0))
    for y in range(ph):
        for x in (0, left_w - 1):
            if not visited[y][x]:
                r, g, b, _ = ppx[x, y]
                if is_sky_pixel(r, g, b):
                    visited[y][x] = True
                    q.append((x, y))

    while q:
        cx, cy = q.popleft()
        ppx[cx, cy] = (0, 0, 0, 0)
        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            nx, ny = cx + dx, cy + dy
            if 0 <= nx < left_w and 0 <= ny < ph and not visited[ny][nx]:
                nr, ng, nb, _ = ppx[nx, ny]
                if is_sky_pixel(nr, ng, nb):
                    visited[ny][nx] = True
                    q.append((nx, ny))

    # Clear any enclosed sky pocket between Wyatt's head and Dad's chin above y=90 (canvasY < 255)
    for y in range(min(ph, 90)):
        for x in range(left_w):
            r, g, b, a = ppx[x, y]
            if a > 0 and is_sky_pixel(r, g, b):
                ppx[x, y] = (0, 0, 0, 0)

    # Right side (x >= 150, i.e., canvasX >= 535):
    # Flood-fill from top border (y=0) and upper-right border (x=pw-1, canvasY < 270) through sky/clouds
    # and background orange-brown autumn trees, stopping at Rita's dark hair outline, the open car door frame,
    # and the car roofline so Rita's forehead, face, and Emma's head remain 100% opaque!
    def is_right_bg_pixel(cx_canvas: int, cy_canvas: int, r: int, g: int, b: int) -> bool:
        if cy_canvas >= 272:
            return False
        if cy_canvas >= 248 and cx_canvas < 682:
            return False
        # Stop at dark silhouette outlines (Rita's dark hair, car roof rail, and dark door frame)
        if r < 68 and g < 62 and b < 65:
            return False
        # Stop at cool dark-gray open car door frame (canvasX: 535..575, canvasY: 224..248)
        if 535 <= cx_canvas <= 575 and cy_canvas >= 224 and abs(r - b) < 20 and r < 115:
            return False
        return True

    visited_r = [[False] * pw for _ in range(ph)]
    qr = deque()
    for x in range(left_w, pw):
        visited_r[0][x] = True
        qr.append((x, 0))
    for y in range(ph):
        if 165 + y < 270 and not visited_r[y][pw - 1]:
            r, g, b, _ = ppx[pw - 1, y]
            if is_right_bg_pixel(385 + pw - 1, 165 + y, r, g, b):
                visited_r[y][pw - 1] = True
                qr.append((pw - 1, y))

    while qr:
        cx, cy = qr.popleft()
        ppx[cx, cy] = (0, 0, 0, 0)
        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            nx, ny = cx + dx, cy + dy
            if left_w <= nx < pw and 0 <= ny < ph and not visited_r[ny][nx]:
                nr, ng, nb, _ = ppx[nx, ny]
                if is_right_bg_pixel(385 + nx, 165 + ny, nr, ng, nb):
                    visited_r[ny][nx] = True
                    qr.append((nx, ny))

    patch.save(OUT_P1_DIR / "p1_heads_foreground_mask.png", "PNG")
    print(f"[p1_heads_foreground_mask.png] size={patch.size} saved at (385, 165)")
    return True


def main() -> None:
    if not process_with_pil():
        ps1_path = ROOT_DIR / "tools" / "process_p1_sprites.ps1"
        if ps1_path.exists():
            subprocess.run(
                ["powershell", "-ExecutionPolicy", "Bypass", "-File", str(ps1_path)],
                check=True,
            )
        else:
            sys.exit("Neither PIL nor tools/process_p1_sprites.ps1 available.")


if __name__ == "__main__":
    main()
