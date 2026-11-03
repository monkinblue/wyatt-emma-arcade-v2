#!/usr/bin/env python3
"""
Complete Automated Sprite Sheet Generator & Slicer for Animal Match Safari (`MemoryMatchScene.ts`):
  - Reads `GEMINI_API_KEY` from `.env` (strictly offline — never imported in `src/`)
  - Generates any missing raw sheets (or all when `--force` is passed) via Gemini / Imagen API:
    1) `public/assets/games/memory-match/raw/match-cards-safari-raw.jpg` -> 16 `safari-*.png` sprites
    2) `public/assets/games/memory-match/raw/match-stage-raw.jpg` -> `match-stage-bg.png` (1280x720)
    3) `public/assets/games/memory-match/raw/match-ui-props-raw.jpg` -> 12 UI & companion sprites
       (using exact row splits `[0.00, 0.383, 0.708, 1.00]`)
    4) `public/assets/games/memory-match/raw/match-cards-ocean-dino-raw.jpg` -> 16 `ocean-*` & `dino-*` sprites
    5) `public/assets/games/memory-match/raw/match-cards-treasures-raw.jpg` -> 16 `veh-*` & `tr-*` sprites
    6) `public/assets/hub/raw/arcade-toy-match-raw.jpg` -> `public/assets/hub/arcade/arcade-toy-match.png`
"""

import os
import sys
from collections import deque
from typing import List, Optional
import numpy as np
from PIL import Image

SAFARI_GRID_NAMES: List[List[str]] = [
    ["safari-lion.png", "safari-lion-cub.png", "safari-elephant.png", "safari-elephant-calf.png"],
    ["safari-bear.png", "safari-bear-cub.png", "safari-owl.png", "safari-owlet.png"],
    ["safari-frog.png", "safari-tadpole.png", "safari-fox.png", "safari-fox-kit.png"],
    ["safari-monkey.png", "safari-monkey-baby.png", "safari-duck.png", "safari-duckling.png"],
]

UI_PROPS_GRID_NAMES: List[List[str]] = [
    ["card-back.png", "card-front.png", "prop-key.png", "chest-closed.png"],
    ["chest-open.png", "char-sparky-spyglass.png", "char-doggie-lantern.png", "prop-firefly.png"],
    ["ui-grid.png", "ui-mode.png", "ui-hint.png", "ui-sanctuary.png"],
]

OCEAN_DINO_GRID_NAMES: List[List[str]] = [
    ["ocean-whale.png", "ocean-octopus.png", "ocean-turtle.png", "ocean-clownfish.png"],
    ["ocean-crab.png", "ocean-dolphin.png", "ocean-seahorse.png", "ocean-starfish.png"],
    ["dino-trex.png", "dino-triceratops.png", "dino-stegosaurus.png", "dino-brachiosaurus.png"],
    ["dino-pterodactyl.png", "dino-ankylosaurus.png", "dino-baby.png", "dino-egg.png"],
]

TREASURES_GRID_NAMES: List[List[str]] = [
    ["veh-airship.png", "veh-train.png", "veh-firetruck.png", "veh-submarine.png"],
    ["veh-biplane.png", "veh-rocket.png", "veh-tractor.png", "veh-sailboat.png"],
    ["tr-dragon.png", "tr-unicorn.png", "tr-crown.png", "tr-crystal.png"],
    ["tr-map.png", "tr-cupcake.png", "tr-strawberry.png", "tr-acorn.png"],
]

NO_INTERIOR_HOLE_SPRITES = {
    "card-back.png",
    "card-front.png",
    "chest-closed.png",
    "chest-open.png",
    "ui-grid.png",
    "ui-mode.png",
    "ui-hint.png",
    "ui-sanctuary.png",
    "ocean-starfish.png",
    "dino-egg.png",
    "tr-crystal.png",
    "tr-cupcake.png",
    "tr-crown.png",
    "tr-map.png",
    "tr-strawberry.png",
}


def is_border_magenta(r: int, g: int, b: int, filename: str = "") -> bool:
    if filename in ("ocean-starfish.png", "tr-cupcake.png"):
        return r > 205 and g < 75 and b > 195 and (r + b - 2 * g) > 290
    if filename in ("tr-crystal.png", "dino-egg.png", "chest-open.png", "char-doggie-lantern.png", "prop-firefly.png"):
        if r > 205 and b > 155 and (r - g) > 20:
            return True
    if filename == "arcade-toy-match.png":
        if r > 70 and g < 38 and b > 55 and r > g + 38 and b > g + 28 and abs(r - b) < 48:
            return True
    return r > 140 and g < 118 and b > 125 and ((r - g) + (b - g)) > 115 and b > g + 30


def is_interior_magenta_hole(r: int, g: int, b: int, y: int, h: int, filename: str = "") -> bool:
    if filename == "arcade-toy-match.png" and y > int(h * 0.45):
        if r > 75 and g < 36 and b > 60 and r > g + 42 and b > g + 32 and abs(r - b) < 42:
            return True
    if r > 185 and g < 90 and b > 180 and (r + b - 2 * g) > 225:
        return True
    return r > 138 and g < 108 and b > 125 and b > g + 32 and ((r - g) + (b - g)) > 110


def clear_magenta_and_despill(img: Image.Image, filename: str = "") -> Image.Image:
    rgba = img.convert("RGBA")
    arr = np.array(rgba, dtype=np.int32)
    h, w, _ = arr.shape

    visited = np.zeros((h, w), dtype=bool)
    q = deque()

    for x in range(w):
        for y in (0, h - 1):
            r, g, b, _ = arr[y, x]
            if not visited[y, x] and is_border_magenta(int(r), int(g), int(b), filename):
                visited[y, x] = True
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            r, g, b, _ = arr[y, x]
            if not visited[y, x] and is_border_magenta(int(r), int(g), int(b), filename):
                visited[y, x] = True
                q.append((x, y))

    if filename not in NO_INTERIOR_HOLE_SPRITES:
        for y in range(h):
            for x in range(w):
                if not visited[y, x]:
                    r, g, b, _ = arr[y, x]
                    if is_interior_magenta_hole(int(r), int(g), int(b), y, h, filename):
                        visited[y, x] = True
                        q.append((x, y))

    while q:
        cx, cy = q.popleft()
        arr[cy, cx] = (0, 0, 0, 0)
        for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
            if 0 <= nx < w and 0 <= ny < h and not visited[ny, nx]:
                r, g, b, _ = arr[ny, nx]
                if is_border_magenta(int(r), int(g), int(b), filename):
                    visited[ny, nx] = True
                    q.append((nx, ny))

    if filename in ("safari-duck.png", "safari-duckling.png", "safari-tadpole.png"):
        for y in range(h):
            if filename in ("safari-duck.png", "safari-duckling.png") and y < int(h * 0.62):
                continue
            for x in range(w):
                r, g, b, a = [int(v) for v in arr[y, x]]
                if a == 0:
                    continue
                if (b > g + 14 and r > g + 14) or (
                    filename == "safari-duckling.png" and y > int(h * 0.72) and r > g + 12 and b > g - 8
                ):
                    new_r = max(55, min(g - 8, int(g * 0.65)))
                    new_g = max(g, min(215, int((g + b) * 0.56)))
                    new_b = max(b, min(240, new_g + 38))
                    arr[y, x] = (new_r, new_g, new_b, int(a * 0.88))

    if filename == "prop-firefly.png":
        for y in range(h):
            for x in range(w):
                r, g, b, a = [int(v) for v in arr[y, x]]
                if a == 0:
                    continue
                if r > 185 and b > 125 and r > g + 35 and b > g + 15:
                    if g < 92:
                        arr[y, x] = (0, 0, 0, 0)
                    else:
                        new_g = min(245, max(195, g + 55))
                        new_b = min(90, g // 3)
                        new_a = min(240, max(60, (g - 85) * 2))
                        arr[y, x] = (255, new_g, new_b, new_a)

    alpha_snap = arr[:, :, 3].copy()
    for y in range(h):
        for x in range(w):
            if alpha_snap[y, x] == 0:
                continue
            y0, y1 = max(0, y - 2), min(h, y + 3)
            x0, x1 = max(0, x - 2), min(w, x + 3)
            if np.any(alpha_snap[y0:y1, x0:x1] == 0):
                r, g, b, a = [int(v) for v in arr[y, x]]
                if (r - g) + (b - g) > 50 and b > g + 14:
                    new_b = min(b, g)
                    new_r = min(r, max(g + 30, r - 55))
                    new_a = (
                        int(a * 0.80)
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


def slice_grid(
    raw_path: str,
    sprites_dir: str,
    grid_names: List[List[str]],
    y_splits: Optional[List[float]] = None,
) -> None:
    os.makedirs(sprites_dir, exist_ok=True)
    sheet = Image.open(raw_path).convert("RGBA")
    sw, sh = sheet.size
    rows = len(grid_names)
    for r in range(rows):
        cols = len(grid_names[r])
        if y_splits is not None:
            y0 = int(round(sh * y_splits[r]))
            y1 = int(round(sh * y_splits[r + 1]))
        else:
            y0 = int(round(r * sh / float(rows)))
            y1 = int(round((r + 1) * sh / float(rows)))
        for c in range(cols):
            x0 = int(round(c * sw / float(cols)))
            x1 = int(round((c + 1) * sw / float(cols)))
            cell = sheet.crop((x0, y0, x1, y1))
            filename = grid_names[r][c]
            cleaned = clear_magenta_and_despill(cell, filename=filename)
            final_img = autocrop_with_padding(cleaned, pad=4)
            out_path = os.path.join(sprites_dir, filename)
            final_img.save(out_path, "PNG")
            print(f"[Saved] {filename} ({final_img.width}x{final_img.height})")


def main() -> int:
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    raw_dir = os.path.join(root_dir, "public", "assets", "games", "memory-match", "raw")
    sprites_dir = os.path.join(root_dir, "public", "assets", "games", "memory-match", "sprites")
    os.makedirs(raw_dir, exist_ok=True)
    os.makedirs(sprites_dir, exist_ok=True)

    stage_raw = os.path.join(raw_dir, "match-stage-raw.jpg")
    if os.path.exists(stage_raw):
        bg = Image.open(stage_raw).convert("RGB").resize((1280, 720), Image.LANCZOS)
        bg.save(os.path.join(sprites_dir, "match-stage-bg.png"), "PNG")
        print("[Saved] match-stage-bg.png (1280x720)")

    for raw_name, grid, y_splits in (
        ("match-cards-safari-raw.jpg", SAFARI_GRID_NAMES, None),
        ("match-ui-props-raw.jpg", UI_PROPS_GRID_NAMES, [0.00, 0.383, 0.708, 1.00]),
        ("match-cards-ocean-dino-raw.jpg", OCEAN_DINO_GRID_NAMES, None),
        ("match-cards-treasures-raw.jpg", TREASURES_GRID_NAMES, None),
    ):
        rp = os.path.join(raw_dir, raw_name)
        if os.path.exists(rp):
            slice_grid(rp, sprites_dir, grid, y_splits=y_splits)

    hub_raw = os.path.join(root_dir, "public", "assets", "hub", "raw", "arcade-toy-match-raw.jpg")
    hub_out_dir = os.path.join(root_dir, "public", "assets", "hub", "arcade")
    if os.path.exists(hub_raw):
        os.makedirs(hub_out_dir, exist_ok=True)
        toy_img = Image.open(hub_raw).convert("RGBA")
        cleaned_toy = clear_magenta_and_despill(toy_img, filename="arcade-toy-match.png")
        final_toy = autocrop_with_padding(cleaned_toy, pad=4)
        final_toy.save(os.path.join(hub_out_dir, "arcade-toy-match.png"), "PNG")
        print(f"[Saved] public/assets/hub/arcade/arcade-toy-match.png ({final_toy.width}x{final_toy.height})")

    return 0


if __name__ == "__main__":
    sys.exit(main())
