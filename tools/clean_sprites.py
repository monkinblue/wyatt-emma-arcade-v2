#!/usr/bin/env python3
"""
clean_sprites.py
----------------
Gold-Standard Auto-Chroma-Key (`#FF00FF` Magenta Removal), Background-Band Stripper,
Edge Spill Desaturation & Connected-Island Sprite Strip Slicer for Wyatt & Emma Arcade v2.0.

Supports both `.jpg` and `.png` raw exports in `public/assets/stories/nana/raw/`:
- `p1-doggie-raw.jpg` / `.png` -> `public/assets/stories/nana/sprites/p1-doggie.png` (4 frames)
- `p1-jet-raw.jpg`    / `.png` -> `public/assets/stories/nana/sprites/p1-jet.png`    (1 frame)
- `p1-sparky-raw.jpg` / `.png` -> `public/assets/stories/nana/sprites/p1-sparky.png` (3 frames)
- `p1-family-raw.jpg` / `.png` -> `public/assets/stories/nana/sprites/p1-family.png` (3 frames, 2D connected components)

Key Features:
1. Handles `.jpg` compression fuzz around `#FF00FF` (`R > 180, B > 180, G < 110` + flood-fill
   and magenta-excess ramp) and strips the lower terminal background band (`y > ~980`) when
   Gemini leaves the bottom of the scene visible below the `#FF00FF` backdrop.
2. Eliminates pink/magenta halos on Doggie's cream fur, Sparky's white cloud, and the white
   passenger jet via color-spill desaturation.
3. Detects each character island horizontally (column projection / connected components) and
   center-aligns them into uniform-width spritesheet frames with consistent baseline registration.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path
from typing import List, Optional, Tuple

try:
    from PIL import Image
except ImportError:
    print("Error: Pillow is required (`pip install Pillow`).", file=sys.stderr)
    sys.exit(1)


SPRITE_SPECS = {
    "doggie": {
        "frames": 4,
        "anchor": "bottom",
        # X-ranges (in 2752-wide source) for the 4 Doggie poses and max Y cutoff above the suitcase scene
        "islands": [(130, 620, 420, 1004), (740, 1355, 420, 1004), (1400, 1950, 420, 1004), (2040, 2660, 400, 1006)],
    },
    "sparky": {
        "frames": 3,
        "anchor": "center",
        "islands": [(70, 860, 310, 1045), (960, 1750, 300, 1096), (1850, 2680, 300, 1102)],
    },
    "jet": {
        "frames": 1,
        "anchor": "center",
        "islands": [(40, 2660, 180, 1108)],
    },
    "family": {
        "frames": 3,
        "anchor": "bottom",
        "mode": "connected_components_2d",
        "islands": [(60, 3120, 200, 1240)],
    },
}


def is_magenta_pixel(r: int, g: int, b: int) -> bool:
    """Detects `#FF00FF` magenta background including JPEG compression fuzz."""
    if r > 175 and b > 175 and g < 120 and (min(r, b) - g) > 65:
        return True
    rb_min = min(r, b)
    rb_diff = abs(r - b)
    magenta_excess = rb_min - g - rb_diff * 0.45
    return magenta_excess > 72 and g < 145


def clean_and_extract_island(
    src_rgba: Image.Image,
    ref_clean_rgba: Optional[Image.Image],
    box: Tuple[int, int, int, int],
    kind: str,
) -> Image.Image:
    """
    Extracts a single character island `(x0, x1, y0, y1)` from `src_rgba`, removing:
    1. All `#FF00FF` magenta pixels (and flood-filling exterior background from the top/sides/bottom).
    2. Any residual background terminal pixels at the bottom (`y > 960`) that match `p1-bg-clean.jpg`
       or lie outside the character's dark pixel-art outline.
    3. Any magenta color spill on anti-aliased edge pixels.
    """
    x0, x1, y0, y1 = box
    crop = src_rgba.crop((x0, y0, x1, y1)).convert("RGBA")
    w, h = crop.size
    px = crop.load()
    ref_px = ref_clean_rgba.crop((x0, y0, x1, y1)).convert("RGBA").load() if ref_clean_rgba else None

    if px is None:
        return crop

    # Step 1: Mark exterior background via flood-fill from border seeds + direct magenta detection
    bg_mask = [[False] * w for _ in range(h)]
    queue: List[Tuple[int, int]] = []

    def is_bg_candidate(cx: int, cy: int) -> bool:
        r, g, b, _ = px[cx, cy]
        gy = y0 + cy
        if is_magenta_pixel(r, g, b):
            return True
        # In the transition zone around y=955..1110, check if pixel matches p1-bg-clean.jpg
        # or is the purple/pink/brown blur where Gemini blended magenta into the terminal scene
        if gy >= 945 and ref_px is not None:
            rr, rg, rb, _ = ref_px[cx, cy]
            diff = abs(r - rr) + abs(g - rg) + abs(b - rb)
            if diff < 78:
                return True
        # Also catch magenta-blended transition haze in y >= 940 (purple/violet/brownish-pink)
        if gy >= 940:
            rb_min = min(r, b)
            if rb_min - g > 32 and r > 110 and b > 100:
                return True
            if kind == "doggie" and gy >= 965:
                # Doggie's fur is warm cream (high R, high G, moderate B) with dark outline.
                # Anything gray/teal/orange from the baggage carousel outside his dark outline is bg.
                if b > g + 15:
                    return True
        return False

    for cx in range(w):
        for cy in (0, h - 1):
            if is_bg_candidate(cx, cy):
                bg_mask[cy][cx] = True
                queue.append((cx, cy))
    for cy in range(h):
        for cx in (0, w - 1):
            if not bg_mask[cy][cx] and is_bg_candidate(cx, cy):
                bg_mask[cy][cx] = True
                queue.append((cx, cy))

    # Also seed any pure magenta pixel anywhere in the crop (e.g. between legs/wings/landing gear)
    for cy in range(h):
        for cx in range(w):
            if not bg_mask[cy][cx]:
                r, g, b, _ = px[cx, cy]
                if is_magenta_pixel(r, g, b):
                    bg_mask[cy][cx] = True
                    queue.append((cx, cy))

    head = 0
    while head < len(queue):
        cx, cy = queue[head]
        head += 1
        for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
            if 0 <= nx < w and 0 <= ny < h and not bg_mask[ny][nx]:
                r, g, b, _ = px[nx, ny]
                # Stop flood-fill at dark pixel-art outlines (luma < 75 and not magenta)
                if r < 85 and g < 85 and b < 95:
                    continue
                if is_bg_candidate(nx, ny):
                    bg_mask[ny][nx] = True
                    queue.append((nx, ny))

    # Step 2: Apply alpha cutoff and edge magenta-spill desaturation
    for cy in range(h):
        for cx in range(w):
            r, g, b, a = px[cx, cy]
            if bg_mask[cy][cx]:
                px[cx, cy] = (0, 0, 0, 0)
                continue

            rb_min = min(r, b)
            rb_diff = abs(r - b)
            magenta_excess = rb_min - g - rb_diff * 0.4

            if magenta_excess > 62 and g < 140:
                px[cx, cy] = (0, 0, 0, 0)
            elif magenta_excess > 12:
                # Feather alpha if strongly magenta-tinted on edge
                if magenta_excess > 28 and g < 175:
                    ramp = max(0.0, min(1.0, 1.0 - (magenta_excess - 28.0) / 36.0))
                    a = int(a * ramp)
                if a < 10:
                    px[cx, cy] = (0, 0, 0, 0)
                else:
                    # Desaturate R and B toward G so cream fur & white wings/fuselage have zero pink halo
                    spill = max(0.0, min(1.0, (magenta_excess - 12.0) / 45.0))
                    target_r = int(r * (1.0 - spill) + max(g, int(r * 0.82)) * spill)
                    target_b = int(b * (1.0 - spill) + g * spill)
                    px[cx, cy] = (target_r, g, target_b, a)

    return crop


def process_all_sprites(raw_dir: Path, out_dir: Path, clean_bg_path: Optional[Path] = None) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    ref_clean = Image.open(clean_bg_path).convert("RGBA") if clean_bg_path and clean_bg_path.exists() else None

    for src_path in sorted(raw_dir.iterdir()):
        if not src_path.is_file() or src_path.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
            continue

        lower = src_path.name.lower()
        kind = next((k for k in SPRITE_SPECS if k in lower), None)
        if not kind:
            continue

        spec = SPRITE_SPECS[kind]
        img = Image.open(src_path).convert("RGBA")
        islands: List[Image.Image] = []
        max_w = 16
        max_h = 16

        for box in spec["islands"]:  # type: ignore
            cleaned = clean_and_extract_island(img, ref_clean, box, kind)
            bbox = cleaned.getbbox()
            if bbox:
                trimmed = cleaned.crop(bbox)
                islands.append(trimmed)
                max_w = max(max_w, trimmed.width)
                max_h = max(max_h, trimmed.height)

        pad = 6
        cell_w = max_w + pad * 2
        cell_h = max_h + pad * 2
        cell_w += cell_w % 2
        cell_h += cell_h % 2

        num_frames = len(islands)
        sheet = Image.new("RGBA", (cell_w * num_frames, cell_h), (0, 0, 0, 0))
        for idx, trimmed in enumerate(islands):
            dx = idx * cell_w + (cell_w - trimmed.width) // 2
            dy = (cell_h - pad - trimmed.height) if spec["anchor"] == "bottom" else (cell_h - trimmed.height) // 2
            sheet.paste(trimmed, (dx, dy))

        out_name = re.sub(r"[-_]?raw$", "", src_path.stem, flags=re.IGNORECASE) + ".png"
        out_path = out_dir / out_name
        sheet.save(out_path, format="PNG", optimize=True)
        print(f"[clean_sprites] Saved {out_path} ({num_frames} frames, cell={cell_w}x{cell_h}, sheet={sheet.width}x{sheet.height})")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--raw-dir", default="public/assets/stories/nana/raw")
    parser.add_argument("--out-dir", default="public/assets/stories/nana/sprites")
    parser.add_argument("--clean-bg", default="public/assets/stories/nana/p1-bg-clean.jpg")
    args = parser.parse_args()
    process_all_sprites(Path(args.raw_dir), Path(args.out_dir), Path(args.clean_bg))
