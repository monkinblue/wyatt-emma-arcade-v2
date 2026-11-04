#!/usr/bin/env python3
"""
Wyatt & Emma Arcade v2.0 — Tinker Workshop v2.0 Asset Pipeline (`tools/build_tinker_assets.py`)
==============================================================================================
Generates (via `GEMINI_API_KEY` from `.env` or staged Gemini raw plates) and slices crisp
32-bit Hi-Bit Pixel Art assets for `TinkerWorkshopScene.ts`:

  1. `public/assets/games/tinker-workshop/tinker-bg-v2.png` (1280x720)
     — Wide-open Heirloom Walnut & Brass Workshop Wall where the open building arena fills
       ~85% of the screen (`x: 40..1240, y: 30..585`) with ZERO peg-grid holes, overhead brass
       gantry rail (`y: 44..58`), bottom minecart railroad track (`y: 572..588`), and a sleek,
       compact bottom brass-and-wood parts dock (`x: 24..1256, y: 595..710`).

  2. `public/assets/games/tinker-workshop/sprites/*.png` (8 Contraptions + 4 Marbles + Actors):
     - `part-ramp.png` (Hardwood Straight Ramp, rotatable to any angle, smooth brass end-caps)
     - `part-bowl.png` (Curved Wooden Chute / Half-Pipe Bowl)
     - `part-drum-bumper.png` (Spring-Loaded Brass Drum Bumper)
     - `part-paddle-wheel.png` (Spinning Brass Paddle Wheel)
     - `part-chime-bar.png` (Musical Pentatonic Chime Bar)
     - `part-funnel.png` (Copper Funnel & Tube Drop)
     - `part-bellows.png` (Wind Bellows / Updraft Fan)
     - `part-seesaw.png` (Tipping Seesaw Bridge)
     - `marble-cobalt.png` (Cobalt Glass Swirl Marble)
     - `marble-comet.png` (Golden Comet Marble)
     - `marble-steel.png` (Heavy Steel Marble)
     - `marble-emerald.png` (Super-Bounce Emerald Marble)
     - `sparky-hopper-1.png` .. `sparky-hopper-3.png` (Sparky in top sliding brass marble hopper)
     - `doggie-cart-1.png` .. `doggie-cart-3.png` (Doggie in bottom rolling minecart catcher)
     - `prop-star.png` (Glowing Golden Compass Star)

Strictly offline build tool — `GEMINI_API_KEY` lives only in `.env` and is NEVER imported
or referenced inside `src/` frontend code.
"""

import base64
import json
import os
import shutil
import subprocess
import urllib.request
from collections import deque
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = ROOT_DIR / ".env"

GAME_DIR = ROOT_DIR / "public" / "assets" / "games" / "tinker-workshop"
RAW_DIR = GAME_DIR / "raw"
SPRITES_DIR = GAME_DIR / "sprites"

STAGED_ARTIFACT_DIR = Path(r"C:\Users\RobaD\.gemini\antigravity\brain\d731b024-1448-420e-8f0e-2343b446ea87")
STAGED_FILES = {
    "tinker-bg-v2-raw.jpg": STAGED_ARTIFACT_DIR / "tinker_bg_v2_raw_1793762992833.jpg",
    "tinker-contraptions-v2-raw.jpg": STAGED_ARTIFACT_DIR / "tinker_contraptions_v2_raw_1793763009620.jpg",
    "tinker-actors-marbles-v2-raw.jpg": STAGED_ARTIFACT_DIR / "tinker_actors_marbles_v2_raw_notext_1793763047440.jpg",
    "tinker-cannon-trash-raw.jpg": STAGED_ARTIFACT_DIR / "tinker_cannon_trash_raw_1793766135319.jpg",
}

PROMPTS = {
    "tinker-bg-v2-raw.jpg": (
        "16:9 widescreen (1280x720) 32-bit Hi-Bit Pixel Art (Sea of Stars / Owlboy masterpiece aesthetic) "
        "wide-open Heirloom Walnut & Brass Workshop Wall background for a 2D marble-run physics game. "
        "Open Building Arena fills ~85% of the screen (x: 40..1240, y: 30..585): a wide-open, warmly lit "
        "vertical heirloom walnut wood slat wall with soft golden lantern lighting from above, ZERO pegs, "
        "overhead brass gantry rail at top, miniature brass railroad track at y=575, and a sleek compact "
        "bottom brass-and-wood parts dock at y: 595..710."
    ),
    "tinker-contraptions-v2-raw.jpg": (
        "16:9 widescreen 32-bit Hi-Bit Pixel Art sprite sheet arranged in a strict 2 rows by 4 columns grid "
        "(8 isolated contraption sprites) on a pure flat solid neon magenta (#FF00FF) background: "
        "Row 1: Hardwood Straight Ramp, Curved Wooden Chute Bowl, Spring-Loaded Brass Drum Bumper, "
        "Spinning Brass Paddle Wheel. Row 2: Musical Pentatonic Chime Bar, Copper Funnel & Tube Drop, "
        "Wind Bellows Updraft Fan, Tipping Seesaw Bridge."
    ),
    "tinker-actors-marbles-v2-raw.jpg": (
        "16:9 widescreen 32-bit Hi-Bit Pixel Art sprite sheet arranged in a strict 2 rows by 4 columns grid "
        "(8 isolated sprites) on a pure flat solid neon magenta (#FF00FF) background with zero text: "
        "Row 1: Cobalt Glass Swirl Marble, Golden Comet Marble, Heavy Steel Marble, Super-Bounce Emerald Marble. "
        "Row 2: Sparky in Brass Marble Hopper, Doggie in Minecart Catcher Idle, Doggie in Minecart Catcher Cheering, "
        "Golden Compass Star."
    ),
}

CONTRAPTIONS_GRID_2X4 = [
    ("part-ramp.png", 0, 0, True, ["part-chute.png"]),
    ("part-bowl.png", 0, 1, True, []),
    ("part-drum-bumper.png", 0, 2, True, ["part-trampoline.png", "prop-bumper.png"]),
    ("part-paddle-wheel.png", 0, 3, True, ["part-gear.png"]),
    ("part-chime-bar.png", 1, 0, True, []),
    ("part-funnel.png", 1, 1, True, []),
    ("part-bellows.png", 1, 2, True, []),
    ("part-seesaw.png", 1, 3, True, []),
]

ACTORS_MARBLES_GRID_2X4 = [
    ("marble-cobalt.png", 0, 0, False, ["prop-marble.png"]),
    ("marble-comet.png", 0, 1, False, []),
    ("marble-steel.png", 0, 2, False, []),
    ("marble-emerald.png", 0, 3, False, ["prop-acorn.png"]),
    ("sparky-hopper-1.png", 1, 0, True, ["sparky-hopper-2.png", "sparky-hopper-3.png", "tinker-sparky-0.png", "tinker-sparky-1.png", "tinker-sparky-2.png"]),
    ("doggie-cart-1.png", 1, 1, True, ["tinker-doggie-0.png"]),
    ("doggie-cart-2.png", 1, 2, True, ["doggie-cart-3.png", "tinker-doggie-1.png", "tinker-doggie-2.png"]),
    ("prop-star.png", 1, 3, False, []),
]


def load_dotenv(dotenv_path: Path) -> None:
    if not dotenv_path.exists():
        return
    for line in dotenv_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def generate_with_gemini(api_key: str, prompt: str, out_path: Path) -> bool:
    models = [
        "gemini-2.5-flash-image-preview",
        "gemini-2.5-flash-image",
        "gemini-2.0-flash-exp-image-generation",
    ]
    for model in models:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"responseModalities": ["TEXT", "IMAGE"]},
            }
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=90) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                for cand in data.get("candidates", []):
                    for part in cand.get("content", {}).get("parts", []):
                        inline = part.get("inlineData") or part.get("inline_data")
                        if inline and inline.get("data"):
                            out_path.write_bytes(base64.b64decode(inline["data"]))
                            print(f"  [GEMINI GENERATED] {out_path.name} via {model}")
                            return True
        except Exception as exc:
            print(f"  [WARN] {model}: {exc}")
    return False


def ensure_raw_files() -> None:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    SPRITES_DIR.mkdir(parents=True, exist_ok=True)
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    for target_name, staged_src in STAGED_FILES.items():
        dest = RAW_DIR / target_name
        if staged_src.exists() and not dest.exists():
            shutil.copy2(staged_src, dest)
            print(f"  [STAGED RAW] {target_name}")
        elif not dest.exists() and api_key:
            generate_with_gemini(api_key, PROMPTS[target_name], dest)


def is_border_magenta(r: int, g: int, b: int) -> bool:
    if r > 155 and b > 145 and g < 110 and (r - g) > 50 and (b - g) > 45:
        return True
    if (r + b - 2 * g) > 145 and r > 140 and b > 130:
        return True
    return False


def is_strict_interior_magenta(r: int, g: int, b: int, protect_purple: bool = False) -> bool:
    if protect_purple:
        return r > 210 and g < 60 and b > 205 and abs(r - b) < 40 and (r + b - 2 * g) > 310
    return r > 135 and g < 88 and b > 130 and abs(r - b) < 42 and (r + b - 2 * g) > 155


def clear_magenta_and_despill(img, clear_interior_holes: bool = True, protect_purple: bool = False):
    rgba = img.convert("RGBA")
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

    if clear_interior_holes:
        for y in range(1, h - 1):
            for x in range(1, w - 1):
                if not visited[y][x]:
                    r, g, b, _ = px[x, y]
                    if is_strict_interior_magenta(r, g, b, protect_purple):
                        visited[y][x] = True
                        q.append((x, y))

    while q:
        cx, cy = q.popleft()
        px[cx, cy] = (0, 0, 0, 0)
        for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
            if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx]:
                r, g, b, _ = px[nx, ny]
                if is_border_magenta(r, g, b):
                    visited[ny][nx] = True
                    q.append((nx, ny))

    # 2px perimeter de-spill
    for _ in range(2):
        to_clear = []
        to_darken = []
        for y in range(1, h - 1):
            for x in range(1, w - 1):
                r, g, b, a = px[x, y]
                if a == 0:
                    continue
                has_trans = any(
                    px[nx, ny][3] == 0
                    for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1))
                )
                if has_trans:
                    if (r + b - 2 * g) > 130 and r > 145 and b > 135:
                        to_clear.append((x, y))
                    elif (r + b - 2 * g) > 75 and r > g + 25 and b > g + 20:
                        to_darken.append((x, y, g, a))
        for x, y in to_clear:
            px[x, y] = (0, 0, 0, 0)
        for x, y, g, a in to_darken:
            px[x, y] = (g, g, g, a)

    bbox = rgba.getbbox()
    if not bbox:
        return rgba
    pad = 4
    crop_box = (
        max(0, bbox[0] - pad),
        max(0, bbox[1] - pad),
        min(w, bbox[2] + pad),
        min(h, bbox[3] + pad),
    )
    return rgba.crop(crop_box)


def run_pil_pipeline() -> None:
    from PIL import Image

    ensure_raw_files()

    bg_raw = RAW_DIR / "tinker-bg-v2-raw.jpg"
    bg_out = GAME_DIR / "tinker-bg-v2.png"
    bg_legacy = GAME_DIR / "tinker-frame-bg.jpg"
    if bg_raw.exists():
        img = Image.open(bg_raw).convert("RGB").resize((1280, 720), Image.Resampling.LANCZOS)
        # Widen the bottom recessed brass-and-wood dock tray (y: 604..714) across x: 26..1254
        dock_strip = img.crop((282, 604, 998, 714)).resize((1228, 110), Image.Resampling.NEAREST)
        img.paste(dock_strip, (26, 604))
        img.save(bg_out, "PNG")
        img.save(bg_legacy, "JPEG", quality=95)
        print(f"  [SAVED BG] {bg_out.name} (1280x720)")

    c_raw = RAW_DIR / "tinker-contraptions-v2-raw.jpg"
    if c_raw.exists():
        sheet = Image.open(c_raw)
        sw, sh = sheet.size
        cw, ch = sw // 4, sh // 2
        for out_name, r_idx, c_idx, clear_holes, aliases in CONTRAPTIONS_GRID_2X4:
            cell = sheet.crop((c_idx * cw + 6, r_idx * ch + 6, (c_idx + 1) * cw - 6, (r_idx + 1) * ch - 6))
            cleaned = clear_magenta_and_despill(
                cell,
                clear_interior_holes=clear_holes,
                protect_purple=(out_name == "part-chime-bar.png"),
            )
            out_path = SPRITES_DIR / out_name
            cleaned.save(out_path, "PNG")
            for alias in aliases:
                cleaned.save(SPRITES_DIR / alias, "PNG")
            print(f"  [SAVED CONTRAPTION] {out_name} ({cleaned.size[0]}x{cleaned.size[1]})")

    a_raw = RAW_DIR / "tinker-actors-marbles-v2-raw.jpg"
    if a_raw.exists():
        sheet = Image.open(a_raw)
        sw, sh = sheet.size
        cw, ch = sw // 4, sh // 2
        for out_name, r_idx, c_idx, clear_holes, aliases in ACTORS_MARBLES_GRID_2X4:
            cell = sheet.crop((c_idx * cw + 6, r_idx * ch + 6, (c_idx + 1) * cw - 6, (r_idx + 1) * ch - 6))
            cleaned = clear_magenta_and_despill(cell, clear_interior_holes=clear_holes)
            out_path = SPRITES_DIR / out_name
            cleaned.save(out_path, "PNG")
            for alias in aliases:
                cleaned.save(SPRITES_DIR / alias, "PNG")
            print(f"  [SAVED ACTOR/MARBLE] {out_name} ({cleaned.size[0]}x{cleaned.size[1]})")

    ct_raw = RAW_DIR / "tinker-cannon-trash-raw.jpg"
    if ct_raw.exists():
        sheet = Image.open(ct_raw)
        sw, sh = sheet.size
        cw = sw // 2
        ct_specs = [
            ("part-cannon.png", 0, True, ["part-seesaw.png"]),
            ("tinker-trash-can.png", 1, True, ["tinker-action-clear.png"]),
        ]
        for out_name, c_idx, clear_holes, aliases in ct_specs:
            cell = sheet.crop((c_idx * cw + 12, 12, (c_idx + 1) * cw - 12, sh - 12))
            cleaned = clear_magenta_and_despill(cell, clear_interior_holes=clear_holes)
            out_path = SPRITES_DIR / out_name
            cleaned.save(out_path, "PNG")
            for alias in aliases:
                cleaned.save(SPRITES_DIR / alias, "PNG")
            print(f"  [SAVED CANNON/TRASH] {out_name} ({cleaned.size[0]}x{cleaned.size[1]})")


def main() -> None:
    load_dotenv(ENV_PATH)
    try:
        import PIL  # noqa: F401
        run_pil_pipeline()
    except ImportError:
        ps1_script = Path(__file__).resolve().parent / "build_tinker_assets.ps1"
        subprocess.run(
            ["powershell", "-ExecutionPolicy", "Bypass", "-File", str(ps1_script)],
            check=True,
        )


if __name__ == "__main__":
    main()
