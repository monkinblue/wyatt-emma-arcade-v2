#!/usr/bin/env python3
"""
Wyatt & Emma Arcade v2.0 — Rocket Number Blast ("Starlight Launchpad") Asset Pipeline
=====================================================================================
Generates (via GEMINI_API_KEY in .env or staged raw plates) and slices 32-bit Hi-Bit
Pixel Art assets for `RocketBlastScene.ts` and the `PLAY ARCADE` shelf in `HubScene.ts`:
  1. `public/assets/hub/arcade/hub-toy-rocket.png` (and `public/assets/hub/sprites/hub-toy-rocket.png`)
     — Gleaming retro crimson, ivory, and polished brass 3-stage moon rocket standing on a
       carved mahogany launch gantry with glowing starlight fuel tubes.
  2. `public/assets/games/rocket/rocket-bg.png` (1280x720)
     — Clean-stage 32-bit pixel art Starlight Launchpad & Observatory background at night
       (zero static rockets, characters, gantry arms, or text baked onto the background plate).
  3. `public/assets/games/rocket/sprites/*.png` (16 sliced sprites from 2x4 sheets):
     — `rocket-stage-100.png`, `rocket-stage-10.png`, `rocket-stage-1.png`,
       `gantry-tower.png`, `steam-valve-lever.png`, `ignition-lever.png`,
       `astro-sparky.png`, `astro-doggie.png`,
       `fuel-core-100.png`, `fuel-cluster-10.png`, `fuel-gem-1.png`,
       `bonus-satellite.png`, `planet-cheese-moon.png`, `planet-mars-saturn.png`,
       `planet-crystal-nebula.png`, `space-flag.png`

Chroma-Key Pipeline:
  - Outer border BFS flood-fill for `#FF00FF` neon magenta background.
  - Interior enclosed `#FF00FF` hole clearing (gantry trusses, astrolabe rings, valve wheels)
    while protecting crimson rocket nosecones and ruby gem facets.
  - 2px perimeter de-spill pass and 4px tight bounding-box auto-crop.

Strictly offline build tool — API keys live only in `.env` and are NEVER imported
into `src/` frontend code.
"""

import base64
from collections import deque
import json
import os
from pathlib import Path
import shutil
import subprocess
import urllib.request

ROOT_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = ROOT_DIR / ".env"

HUB_RAW_PATH = ROOT_DIR / "public" / "assets" / "hub" / "raw" / "hub-toy-rocket-raw.jpg"
HUB_ARCADE_OUT = ROOT_DIR / "public" / "assets" / "hub" / "arcade" / "hub-toy-rocket.png"
HUB_SPRITE_OUT = ROOT_DIR / "public" / "assets" / "hub" / "sprites" / "hub-toy-rocket.png"

GAME_DIR = ROOT_DIR / "public" / "assets" / "games" / "rocket"
RAW_DIR = GAME_DIR / "raw"
SPRITES_DIR = GAME_DIR / "sprites"

STAGED_ARTIFACT_DIR = Path(r"C:\Users\RobaD\.gemini\antigravity\brain\c4550e46-b322-411e-94fd-489928293314")
STAGED_FILES = {
    HUB_RAW_PATH: STAGED_ARTIFACT_DIR / "hub_toy_rocket_raw_1793764760168.jpg",
    RAW_DIR / "rocket-bg-raw.jpg": STAGED_ARTIFACT_DIR / "rocket_bg_raw_1793764775956.jpg",
    RAW_DIR / "rocket-stages-gantry-raw.jpg": STAGED_ARTIFACT_DIR / "rocket_stages_gantry_raw_1793764793137.jpg",
    RAW_DIR / "rocket-sky-planets-raw.jpg": STAGED_ARTIFACT_DIR / "rocket_sky_planets_raw_1793764808896.jpg",
}

GEMINI_PROMPTS = {
    HUB_RAW_PATH: (
        "32-bit Hi-Bit Pixel Art (Sea of Stars / Owlboy aesthetic) standing heirloom toy on a solid flat "
        "#FF00FF neon magenta background: a gleaming retro crimson-red, warm ivory, and polished antique brass "
        "3-stage moon rocket standing vertically on a carved dark mahogany pedestal base with an ornate brass "
        "launch gantry arm and glowing cyan and gold starlight fuel tubes. Zero text, zero numbers."
    ),
    RAW_DIR / "rocket-bg-raw.jpg": (
        "16:9 widescreen (1280x720) 32-bit Hi-Bit Pixel Art Cape Canaveral and Starlight Observatory Rocket "
        "Launchpad at night. Features a grand riveted brass-and-steel launchpad deck with a recessed flame trench "
        "at the bottom center, an antique copper-and-mahogany astronomical observatory dome on a cliff on the far "
        "left, coastal silhouettes and warm launchpad floodlights on the far right, and a deep indigo-and-sapphire "
        "starry night sky above. CLEAN STAGE RULE: 100% empty launchpad center — zero rockets, characters, or text."
    ),
}

STAGES_GANTRY_GRID_2X4 = [
    ("rocket-stage-100.png", 0.012, 0.018, 0.242, 0.482, (240, 250), False, False),
    ("rocket-stage-10.png", 0.258, 0.018, 0.492, 0.482, (200, 220), False, False),
    ("rocket-stage-1.png", 0.508, 0.018, 0.742, 0.482, (200, 240), False, False),
    ("gantry-tower.png", 0.758, 0.018, 0.988, 0.482, (280, 280), False, False),
    ("steam-valve-lever.png", 0.012, 0.518, 0.242, 0.982, (200, 220), False, False),
    ("ignition-lever.png", 0.258, 0.518, 0.492, 0.982, (240, 220), False, False),
    ("astro-sparky.png", 0.508, 0.518, 0.742, 0.982, (260, 260), False, False),
    ("astro-doggie.png", 0.758, 0.518, 0.988, 0.922, (240, 240), False, True),
]

SKY_PLANETS_GRID_2X4 = [
    ("fuel-core-100.png", 0.010, 0.015, 0.245, 0.485, (180, 180), False, False),
    ("fuel-cluster-10.png", 0.255, 0.015, 0.495, 0.485, (180, 180), True, False),
    ("fuel-gem-1.png", 0.505, 0.015, 0.745, 0.485, (140, 160), False, False),
    ("bonus-satellite.png", 0.755, 0.015, 0.990, 0.485, (180, 180), False, False),
    ("planet-cheese-moon.png", 0.010, 0.515, 0.245, 0.985, (360, 260), False, False),
    ("planet-mars-saturn.png", 0.255, 0.515, 0.495, 0.985, (360, 260), False, False),
    ("planet-crystal-nebula.png", 0.505, 0.515, 0.745, 0.985, (360, 260), False, False),
    ("space-flag.png", 0.755, 0.515, 0.990, 0.985, (260, 280), False, False),
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


def generate_with_gemini_if_missing(api_key: str, prompt: str, out_path: Path) -> None:
    if out_path.exists() or not api_key:
        return
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"gemini-2.5-flash-image-preview:generateContent?key={api_key}"
    )
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
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        for cand in data.get("candidates", []):
            for part in cand.get("content", {}).get("parts", []):
                inline = part.get("inlineData") or part.get("inline_data")
                if inline and inline.get("data"):
                    out_path.parent.mkdir(parents=True, exist_ok=True)
                    out_path.write_bytes(base64.b64decode(inline["data"]))
                    print(f"  [GEMINI GENERATED] {out_path.name}")
                    return


def stage_raw_files() -> None:
    HUB_RAW_PATH.parent.mkdir(parents=True, exist_ok=True)
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    SPRITES_DIR.mkdir(parents=True, exist_ok=True)
    for dest_path, staged_src in STAGED_FILES.items():
        if staged_src.exists() and not dest_path.exists():
            shutil.copy2(staged_src, dest_path)
            print(f"  [STAGED RAW] {dest_path.name}")
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    for dest_path, prompt in GEMINI_PROMPTS.items():
        if not dest_path.exists() and api_key:
            generate_with_gemini_if_missing(api_key, prompt, dest_path)


def is_magenta_pixel(r: int, g: int, b: int) -> bool:
    if r > 135 and b > 125 and g < 118 and (r - g) > 38 and (b - g) > 32 and abs(r - b) < 60:
        return True
    if (r + b - 2 * g) > 120 and r > 120 and b > 115 and abs(r - b) < 58:
        return True
    return False


def clear_magenta_floodfill(img, unmix_gold: bool = False, is_doggie_helmet: bool = False):
    rgba = img.convert("RGBA")
    w, h = rgba.size
    px = rgba.load()

    visited = [[False] * w for _ in range(h)]
    q = deque()

    for x in range(w):
        for y in (0, h - 1):
            r, g, b, _ = px[x, y]
            if is_magenta_pixel(r, g, b):
                visited[y][x] = True
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if not visited[y][x]:
                r, g, b, _ = px[x, y]
                if is_magenta_pixel(r, g, b):
                    visited[y][x] = True
                    q.append((x, y))

    for y in range(1, h - 1):
        for x in range(1, w - 1):
            if visited[y][x]:
                continue
            r, g, b, _ = px[x, y]
            if is_doggie_helmet and y < int(h * 0.62):
                if r > 220 and g < 45 and b > 215 and abs(r - b) < 30:
                    visited[y][x] = True
                    q.append((x, y))
            elif r > 135 and g < 92 and b > 130 and abs(r - b) < 44 and (r + b - 2 * g) > 155:
                visited[y][x] = True
                q.append((x, y))

    while q:
        cx, cy = q.popleft()
        px[cx, cy] = (0, 0, 0, 0)
        for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
            if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx]:
                r, g, b, _ = px[nx, ny]
                if is_magenta_pixel(r, g, b):
                    visited[ny][nx] = True
                    q.append((nx, ny))

    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if unmix_gold and r > 175 and b > 95 and r > g + 25 and b > g - 15:
                if g < 75 and b > 120:
                    px[x, y] = (0, 0, 0, 0)
                else:
                    new_g = min(245, max(185, g + 60))
                    new_b = min(85, g // 3)
                    new_a = min(235, max(45, (g - 65) * 2))
                    px[x, y] = (255, new_g, new_b, new_a)
            elif is_doggie_helmet and y < int(h * 0.62):
                if r > 165 and b > 165 and g < 185 and (r + b - 2 * g) > 90:
                    px[x, y] = (175, 225, 250, 135)

    for _ in range(2):
        to_clear = []
        for y in range(1, h - 1):
            for x in range(1, w - 1):
                r, g, b, a = px[x, y]
                if a == 0:
                    continue
                has_trans = any(
                    px[nx, ny][3] == 0
                    for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1))
                )
                if has_trans and (r + b - 2 * g) > 90 and r > 110 and b > 105 and abs(r - b) < 58:
                    to_clear.append((x, y))
        for x, y in to_clear:
            px[x, y] = (0, 0, 0, 0)

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

    stage_raw_files()
    HUB_ARCADE_OUT.parent.mkdir(parents=True, exist_ok=True)
    HUB_SPRITE_OUT.parent.mkdir(parents=True, exist_ok=True)
    SPRITES_DIR.mkdir(parents=True, exist_ok=True)

    if HUB_RAW_PATH.exists():
        raw_toy = Image.open(HUB_RAW_PATH)
        w, h = raw_toy.size
        cropped = raw_toy.crop((int(w * 0.02), int(h * 0.02), int(w * 0.98), int(h * 0.98)))
        cleaned = clear_magenta_floodfill(cropped)
        cleaned.thumbnail((380, 420), Image.Resampling.NEAREST)
        cleaned.save(HUB_ARCADE_OUT, "PNG")
        cleaned.save(HUB_SPRITE_OUT, "PNG")
        print(f"  [SAVED HUB TOY] {HUB_ARCADE_OUT.name} ({cleaned.size[0]}x{cleaned.size[1]})")

    stage_raw = RAW_DIR / "rocket-bg-raw.jpg"
    stage_out = GAME_DIR / "rocket-bg.png"
    if stage_raw.exists():
        img = Image.open(stage_raw).convert("RGBA")
        resized = img.resize((1280, 720), Image.Resampling.LANCZOS)
        resized.save(stage_out, "PNG")
        print(f"  [SAVED STAGE] {stage_out.name} (1280x720)")

    for raw_name, specs in (
        ("rocket-stages-gantry-raw.jpg", STAGES_GANTRY_GRID_2X4),
        ("rocket-sky-planets-raw.jpg", SKY_PLANETS_GRID_2X4),
    ):
        raw_path = RAW_DIR / raw_name
        if not raw_path.exists():
            continue
        sheet = Image.open(raw_path)
        sw, sh = sheet.size
        for out_name, x0f, y0f, x1f, y1f, max_dim, unmix_gold, is_doggie in specs:
            cell = sheet.crop((int(sw * x0f), int(sh * y0f), int(sw * x1f), int(sh * y1f)))
            cleaned = clear_magenta_floodfill(cell, unmix_gold=unmix_gold, is_doggie_helmet=is_doggie)
            cleaned.thumbnail(max_dim, Image.Resampling.NEAREST)
            cleaned.save(SPRITES_DIR / out_name, "PNG")
            print(f"  [SAVED SPRITE] {out_name} ({cleaned.size[0]}x{cleaned.size[1]})")


def main() -> None:
    load_dotenv(ENV_PATH)
    try:
        import PIL  # noqa: F401
        run_pil_pipeline()
    except ImportError:
        ps1_script = Path(__file__).resolve().parent / "build_rocket_assets.ps1"
        subprocess.run(
            ["powershell", "-ExecutionPolicy", "Bypass", "-File", str(ps1_script)],
            check=True,
        )


if __name__ == "__main__":
    main()
