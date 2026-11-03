#!/usr/bin/env python3
"""
tools/build_colorado_book_assets.py
-----------------------------------
Multimodal 32-Bit Hi-Bit Pixel Art Clean-Stage Generator & Magenta Chroma-Key Slicer
for Book 2: "Babci & Grandpa's Colorado Adventure"

Features:
1. Character Likeness Reference Crops (`public/assets/stories/colorado/refs/`):
   - Builds `ref_grandpa_babci.jpg` (composite crop from the right half of `COVER.jpg` showing
     Grandpa with his full sandy-brown/gray hair, round wire-frame glasses, and yellow collared
     shirt + Babci with shoulder-length blonde hair, paired with `3.jpg` Grandpa in royal blue polo,
     khaki shorts, and tan cap).
   - Builds `ref_immediate_family.jpg` (composite crop from `1.jpg` and `7-1.jpg` showing Dad,
     Mom/Rita, Wyatt with short light-brown hair, and Emma with dark brown/black hair and cute
     white hair bow — NEVER blonde curls!).
2. Clean-Stage 32-Bit Hi-Bit Pixel Art Page Backgrounds (`1280x720`):
   - Generates and resizes `p1-roadtrip-raw.jpg` .. `p9-kitchen-raw.jpg` to exact `1280x720` PNGs
     in `public/assets/stories/colorado/pages/p1-roadtrip.png` .. `p9-kitchen.png`, omitting moving
     sprite actors from the static background plates so there are zero duplicate sticker overlays!
3. True Moving Sprite Slicer:
   - Removes border-connected and interior-hole `#FF00FF` magenta pixels with a 2px edge de-spill
     pass and 4px tight bounding-box crop.
   - Slices the 4x4 sprite sheets plus the 2x2 high-resolution `colorado-actors-clean-raw.jpg`
     (`spr-grandpa-babci-wave.png`, `spr-wagon-ride.png`, `spr-thule-box.png`, `spr-train-horn.png`).
"""

import argparse
import base64
from collections import deque
import json
import os
from pathlib import Path
import subprocess
import urllib.request

ROOT_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = ROOT_DIR / ".env"
STORY_DIR = ROOT_DIR / "public" / "assets" / "stories" / "colorado"
REFS_DIR = STORY_DIR / "refs"
RAW_DIR = STORY_DIR / "raw"
PAGES_DIR = STORY_DIR / "pages"
SPRITES_DIR = STORY_DIR / "sprites"
HUB_SPRITES_DIR = ROOT_DIR / "public" / "assets" / "hub" / "sprites"

MULTIMODAL_PAGE_SPECS = [
    {
        "raw_name": "p0-cover-raw.jpg",
        "out_name": "p0-cover.png",
        "refs": ["public/assets/stories/nana/cover-bg.jpg", "COVER.jpg"],
        "prompt": (
            "Create a 16:9 widescreen (1280x720) 32-bit Hi-Bit Pixel Art heirloom storybook cover resting flat "
            "on the exact same warm candlelit wooden desk as the first reference image (with the glowing candle "
            "on the upper-left wood desk, warm brass lamp glow on the upper-right, and ornate gold-embossed "
            "leather cover frame with pine cones, columbine flowers, and bluebirds). In the top embossed title "
            "plaque, letter in crisp warm cream-gold storybook serif text: 'To Babci and Grandpa's House We Go!' "
            "with the golden banner ribbon underneath reading 'A Colorado Adventure'. Inside the large central "
            "arched illustration window, recreate the full family portrait from the second reference photo "
            "(COVER.jpg) in masterwork 32-bit Hi-Bit Pixel Art: Grandpa (with his round wire-frame glasses, full "
            "sandy-brown/gray hair, and yellow collared shirt), Babci (with her shoulder-length blonde hair and "
            "floral blouse holding little Wyatt on the right), Dad, Mom (Rita smiling in the center behind baby "
            "Emma in her pink-and-white celebratory hanbok hat and gown), and the whole family gathered warmly "
            "behind the wooden table with the two pineapples, bananas, rice cakes, and 'Happy 100 Days' cake, "
            "plus tiny emerald dragon Sparky and white puppy Doggie (in aviator sunglasses) tucked in the lower "
            "corner, with golden sunlit Colorado Rocky Mountain peaks and pine trees in the background."
        ),
    },
    {
        "raw_name": "book-cover-colorado-raw.jpg",
        "out_name": "book-cover-colorado.png",
        "refs": ["COVER.jpg", "ref_grandpa_babci.jpg", "ref_immediate_family.jpg"],
        "is_cutout_book": True,
        "prompt": (
            "32-bit Hi-Bit Pixel Art (Sea of Stars / Owlboy masterpiece pixel art aesthetic) standing "
            "3/4-angle heirloom leather-and-brass storybook on a solid flat #FF00FF magenta background, "
            "featuring a vibrant pixel-art family portrait adapted from COVER.jpg framed against golden "
            "Rocky Mountain peaks. Zero text, zero cast shadows on the #FF00FF background."
        ),
    },
    {
        "raw_name": "p1-roadtrip-raw.jpg",
        "out_name": "p1-roadtrip.png",
        "refs": ["1.jpg", "ref_immediate_family.jpg"],
        "prompt": (
            "16:9 widescreen (1280x720) 32-bit Hi-Bit Pixel Art clean-stage scene based on 1.jpg: dark "
            "metallic gray Subaru Forester Wilderness with black wheels and red side trim at an autumn "
            "mountain highway overlook (MENA ARK green highway sign on left). Dad holding Wyatt in blue "
            "pajamas and Mom/Rita holding dark-haired baby Emma in colorful floral romper beside the open "
            "doors. Leave the top roof rails of the Subaru 100% EMPTY (do NOT paint the black Thule box "
            "or hawk into the background plate). Zero UI text."
        ),
    },
    {
        "raw_name": "p2-house-raw.jpg",
        "out_name": "p2-house.png",
        "refs": ["2.jpg", "ref_immediate_family.jpg"],
        "prompt": (
            "16:9 widescreen (1280x720) 32-bit Hi-Bit Pixel Art clean-stage scene recreating 2.jpg: "
            "3040 red-brick and tan ranch house, arched white garage door on right, round green bush in "
            "center, purple lavender timber planter boxes on left, and Dad, Mom/Rita, Wyatt, and "
            "dark-haired Emma (with cute white bow) walking up the front lawn. Leave the front brick "
            "porch and doorway alcove 100% EMPTY/UNOCCUPIED (do NOT paint Grandpa, Babci, Doggie, or "
            "butterflies into the background plate). Zero UI text."
        ),
    },
    {
        "raw_name": "p3-arcade-raw.jpg",
        "out_name": "p3-arcade.png",
        "refs": ["ref_grandpa_babci.jpg", "ref_immediate_family.jpg"],
        "prompt": (
            "16:9 widescreen (1280x720) 32-bit Hi-Bit Pixel Art clean-stage scene at the Manitou Springs "
            "Penny Arcade: Grandpa (with full head of sandy-brown/gray hair, round wire-frame glasses, "
            "and yellow collared shirt — NOT bald!), Babci (blonde hair), Wyatt, and dark-haired Emma "
            "(pink dress and white bow) cheering in the center. Leave the left Skee-Ball lane ramp EMPTY "
            "of balls, leave the upper interior of the right claw machine EMPTY of the metal grabber claw, "
            "and leave an open wooden floor spot on the right in front of the claw machine for the riding "
            "pony sprite. Zero readable text."
        ),
    },
    {
        "raw_name": "p4-canyon-raw.jpg",
        "out_name": "p4-canyon.png",
        "refs": ["3.jpg", "ref_grandpa_babci.jpg", "ref_immediate_family.jpg"],
        "prompt": (
            "16:9 widescreen (1280x720) 32-bit Hi-Bit Pixel Art clean-stage scene adapted from 3.jpg: "
            "Eleven Mile Canyon with Grandpa (royal blue polo, khaki shorts, glasses, tan cap) holding "
            "Wyatt (striped tank top, blue water shoes) and Babci with dark-haired Emma (pink dress, "
            "white hair bow) sitting on the riverbank stone. Keep sparkling river water in center/right "
            "FREE of fish and leave an empty flat river boulder on the right (do NOT bake a trout or "
            "chipmunk into the background plate). Zero UI text."
        ),
    },
    {
        "raw_name": "p5-bridge-raw.jpg",
        "out_name": "p5-bridge.png",
        "refs": ["ref_grandpa_babci.jpg", "ref_immediate_family.jpg"],
        "prompt": (
            "16:9 widescreen (1280x720) 32-bit Hi-Bit Pixel Art clean-stage scene at the Royal Gorge "
            "Bridge: Dad, Mom holding dark-haired Emma, Wyatt, Grandpa (tan cap and glasses), and Babci "
            "on the wooden bridge deck, with ONLY the bare steel suspension and aerial tramway cables "
            "stretching across the canyon sky (do NOT paint any red gondola, eagle, or brass telescope "
            "into the background plate). Zero UI text."
        ),
    },
    {
        "raw_name": "p6-train-raw.jpg",
        "out_name": "p6-train.png",
        "refs": ["5.jpg", "ref_grandpa_babci.jpg", "ref_immediate_family.jpg"],
        "prompt": (
            "16:9 widescreen (1280x720) 32-bit Hi-Bit Pixel Art clean-stage scene based on 5.jpg: riding "
            "the orange-and-silver Royal Gorge Route Railroad open observation car deep in the red canyon "
            "beside the river with Dad, Mom, dark-haired Emma (white hair bow), Babci, and Grandpa "
            "(full hair, glasses, yellow shirt) lifting Wyatt up with Wyatt reaching his hand upward. "
            "Keep the river water free of kayaks/steam rings and leave the upper orange doorway frame "
            "above Wyatt's raised hand 100% EMPTY for the brass train horn sprite. Zero UI text."
        ),
    },
    {
        "raw_name": "p7-gods-raw.jpg",
        "out_name": "p7-gods.png",
        "refs": ["ref_grandpa_babci.jpg", "ref_immediate_family.jpg"],
        "prompt": (
            "16:9 widescreen (1280x720) 32-bit Hi-Bit Pixel Art clean-stage scene at Garden of the Gods: "
            "towering red sandstone formations with snowy Pikes Peak in the distance. Paint Grandpa "
            "(blue polo, tan cap, glasses), Babci (blonde hair), Wyatt, and dark-haired Emma (white bow) "
            "walking along the red dirt trail on the left, leaving the flat red sandstone boulder ledge "
            "on the right and the red cliff face clean (no dragon, bunny, or climber baked in). Zero UI text."
        ),
    },
    {
        "raw_name": "p8-backyard-raw.jpg",
        "out_name": "p8-backyard.png",
        "refs": ["7-2.jpg"],
        "prompt": (
            "16:9 widescreen (1280x720) 32-bit Hi-Bit Pixel Art clean-stage scene recreating Babci's "
            "backyard from 7-2.jpg: herringbone red-brick patio in foreground left, timber retaining "
            "walls, curved brick pathway leading to back steps on right, two-hole turf putting green with "
            "red flags in upper left, and lush green grass lawn in center — 100% EMPTY of people or "
            "wagons so the animated wagon sprite can physically roll across the grass. Zero UI text."
        ),
    },
    {
        "raw_name": "p9-kitchen-raw.jpg",
        "out_name": "p9-kitchen.png",
        "refs": ["8.jpg", "ref_grandpa_babci.jpg", "ref_immediate_family.jpg"],
        "prompt": (
            "16:9 widescreen (1280x720) 32-bit Hi-Bit Pixel Art clean-stage scene of Babci's vaulted "
            "cream-cabinet kitchen from 8.jpg: Mom (Rita) on the left holding a platter, Babci (blonde "
            "hair, gray apron), Wyatt, and dark-haired Emma (white bow, both in tiny chef aprons) behind "
            "the granite center island with bowls of mashed potatoes, cheddar cheese, and pinched raw "
            "pierogis. Leave the center cutting board free of miniature people, leave the front-right "
            "gas stove burner grate EMPTY (no skillet baked on the front burner), and leave the "
            "bottom-right kitchen floor by the oven open for Doggie. Zero UI text."
        ),
    },
]

SPRITE_SHEETS_4X4 = {
    "colorado-sprites-1-raw.jpg": [
        "spr-thule-box.png",
        "spr-subaru-wheel.png",
        "spr-hawk.png",
        "spr-wyatt-emma-wave.png",
        "spr-grandpa-babci-wave.png",
        "spr-front-door.png",
        "spr-butterflies.png",
        "spr-doggie-bush.png",
        "spr-claw-plush.png",
        "spr-skeeball.png",
        "spr-arcade-pony.png",
        "spr-neon-star.png",
        "spr-trout.png",
        "spr-water-splash.png",
        "spr-emma-splash.png",
        "spr-chipmunk.png",
    ],
    "colorado-sprites-2-raw.jpg": [
        "spr-gondola.png",
        "spr-eagle.png",
        "spr-co-flag.png",
        "spr-train-horn.png",
        "spr-steam-puff.png",
        "spr-conductor-hat.png",
        "spr-kayak.png",
        "spr-climber.png",
        "spr-camels-glow.png",
        "spr-bunny.png",
        "spr-sparky-rock.png",
        "spr-wagon-ride.png",
        "spr-golf-ball.png",
        "spr-golf-flag.png",
        "spr-pierogi-pan.png",
        "spr-flour-puff.png",
    ],
    "colorado-sprites-3-raw.jpg": [
        "spr-pierogi-plate.png",
        "spr-babci-hug.png",
        "spr-doggie-chef.png",
        "spr-sparky-chef.png",
        "spr-compass.png",
        "spr-lavender-box.png",
        "spr-ticket-burst.png",
        "spr-creel-basket.png",
        "spr-binoculars.png",
        "spr-rail-lantern.png",
        "spr-bluebird.png",
        "spr-columbine-pot.png",
        "spr-potato-cheese-bowl.png",
        "spr-arrow-left.png",
        "spr-arrow-right.png",
        "spr-mountain-crest.png",
    ],
}

SPRITE_SHEETS_2X2 = {
    "colorado-actors-clean-raw.jpg": [
        "spr-grandpa-babci-wave.png",
        "spr-wagon-ride.png",
        "spr-thule-box.png",
        "spr-train-horn.png",
    ],
}


def load_env(env_path: Path) -> dict:
    env = {}
    if env_path.exists():
        for raw_line in env_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def resolve_ref_path(ref_name: str) -> Path:
    direct = ROOT_DIR / ref_name
    if direct.exists():
        return direct
    return REFS_DIR / ref_name


def generate_multimodal_with_gemini(api_key: str, prompt: str, ref_names: list[str], out_path: Path) -> None:
    parts = []
    for ref_name in ref_names:
        ref_path = resolve_ref_path(ref_name)
        if ref_path.exists():
            b64_img = base64.b64encode(ref_path.read_bytes()).decode("ascii")
            parts.append(
                {
                    "inline_data": {
                        "mime_type": "image/jpeg",
                        "data": b64_img,
                    }
                }
            )
    parts.append({"text": prompt})

    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"gemini-2.5-flash-image-preview:generateContent?key={api_key}"
    )
    payload = {
        "contents": [{"parts": parts}],
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
                    out_path.write_bytes(base64.b64decode(inline["data"]))
                    print(f"[Generated Multimodal Raw] {out_path.name} (refs={ref_names})")
                    return


def is_border_magenta(r: int, g: int, b: int) -> bool:
    return r > 140 and g < 118 and b > 125 and ((r - g) + (b - g)) > 115 and b > g + 30


def is_interior_magenta(r: int, g: int, b: int) -> bool:
    return r > 165 and g < 75 and b > 160 and abs(r - b) < 42 and (r + b - 2 * g) > 210


def build_reference_crops_pil() -> bool:
    try:
        from PIL import Image
    except ImportError:
        return False

    cover_path = REFS_DIR / "COVER.jpg"
    p3_path = REFS_DIR / "3.jpg"
    if cover_path.exists() and p3_path.exists():
        cover = Image.open(cover_path).convert("RGB")
        p3 = Image.open(p3_path).convert("RGB")
        cw, ch = cover.size
        p3w, p3h = p3.size
        c_crop = cover.crop((int(cw * 0.63), int(ch * 0.05), int(cw * 0.97), int(ch * 0.73))).resize(
            (600, 700), Image.Resampling.LANCZOS
        )
        p3_crop = p3.crop((0, int(p3h * 0.05), int(p3w * 0.55), int(p3h * 0.95))).resize(
            (600, 700), Image.Resampling.LANCZOS
        )
        gb = Image.new("RGB", (1200, 700))
        gb.paste(c_crop, (0, 0))
        gb.paste(p3_crop, (600, 0))
        gb.save(REFS_DIR / "ref_grandpa_babci.jpg", "JPEG", quality=92)

    p1_path = REFS_DIR / "1.jpg"
    p7_path = REFS_DIR / "7-1.jpg"
    if p1_path.exists() and p7_path.exists():
        p1 = Image.open(p1_path).convert("RGB")
        p7 = Image.open(p7_path).convert("RGB")
        p1w, p1h = p1.size
        p7w, p7h = p7.size
        p1_crop = p1.crop((int(p1w * 0.25), int(p1h * 0.18), int(p1w * 0.63), int(p1h * 0.86))).resize(
            (600, 700), Image.Resampling.LANCZOS
        )
        p7_crop = p7.crop((int(p7w * 0.12), int(p7h * 0.10), int(p7w * 0.90), int(p7h * 0.80))).resize(
            (600, 700), Image.Resampling.LANCZOS
        )
        fam = Image.new("RGB", (1200, 700))
        fam.paste(p1_crop, (0, 0))
        fam.paste(p7_crop, (600, 0))
        fam.save(REFS_DIR / "ref_immediate_family.jpg", "JPEG", quality=92)

    return True


def slice_with_pil() -> bool:
    try:
        from PIL import Image
    except ImportError:
        return False

    build_reference_crops_pil()

    for spec in MULTIMODAL_PAGE_SPECS:
        raw_path = RAW_DIR / spec["raw_name"]
        if not raw_path.exists():
            continue
        if spec.get("is_cutout_book"):
            img = Image.open(raw_path).convert("RGBA")
            cutout = remove_magenta_pil(img)
            for out_dest in (
                PAGES_DIR / spec["out_name"],
                STORY_DIR / spec["out_name"],
                HUB_SPRITES_DIR / spec["out_name"],
            ):
                cutout.save(out_dest, "PNG")
        else:
            img = Image.open(raw_path).convert("RGB")
            resized = img.resize((1280, 720), Image.Resampling.LANCZOS)
            out_page = PAGES_DIR / spec["out_name"]
            resized.save(out_page, "PNG")

    for sheet_name, sprite_names in SPRITE_SHEETS_4X4.items():
        sheet_path = RAW_DIR / sheet_name
        if not sheet_path.exists():
            continue
        sheet = Image.open(sheet_path).convert("RGBA")
        sw, sh = sheet.size
        cw, ch = sw // 4, sh // 4
        for idx, sname in enumerate(sprite_names):
            r, c = divmod(idx, 4)
            cell = sheet.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch))
            cleaned = remove_magenta_pil(cell)
            cleaned.save(SPRITES_DIR / sname, "PNG")

    for sheet_name, sprite_names in SPRITE_SHEETS_2X2.items():
        sheet_path = RAW_DIR / sheet_name
        if not sheet_path.exists():
            continue
        sheet = Image.open(sheet_path).convert("RGBA")
        sw, sh = sheet.size
        cw, ch = sw // 2, sh // 2
        for idx, sname in enumerate(sprite_names):
            r, c = divmod(idx, 2)
            cell = sheet.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch))
            cleaned = remove_magenta_pil(cell)
            cleaned.save(SPRITES_DIR / sname, "PNG")

    return True


def remove_magenta_pil(img):
    rgba = img.copy()
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

    for y in range(1, h - 1):
        for x in range(1, w - 1):
            if not visited[y][x]:
                r, g, b, a = px[x, y]
                if a > 0 and is_interior_magenta(r, g, b):
                    px[x, y] = (0, 0, 0, 0)

    for _ in range(2):
        for y in range(h):
            for x in range(w):
                r, g, b, a = px[x, y]
                if a == 0:
                    continue
                near_trans = False
                for dy in range(-2, 3):
                    for dx in range(-2, 3):
                        nx, ny = x + dx, y + dy
                        if nx < 0 or nx >= w or ny < 0 or ny >= h or px[nx, ny][3] == 0:
                            near_trans = True
                            break
                    if near_trans:
                        break
                if near_trans and r > g + 22 and b > g + 22:
                    if r > 155 and b > 140 and (r + b - 2 * g) > 150:
                        px[x, y] = (0, 0, 0, 0)
                    else:
                        avg = min(255, int(g * 0.85 + min(r, b) * 0.15))
                        px[x, y] = (avg, g, avg, min(a, 210))

    bbox = rgba.getbbox()
    if not bbox:
        return rgba
    x0 = max(0, bbox[0] - 4)
    y0 = max(0, bbox[1] - 4)
    x1 = min(w, bbox[2] + 4)
    y1 = min(h, bbox[3] + 4)
    return rgba.crop((x0, y0, x1, y1))


def main() -> None:
    parser = argparse.ArgumentParser(description="Build Colorado Storybook Clean-Stage Assets & Sprites")
    parser.add_argument("--force", action="store_true", help="Regenerate raw plates via Gemini API")
    args = parser.parse_args()

    RAW_DIR.mkdir(parents=True, exist_ok=True)
    PAGES_DIR.mkdir(parents=True, exist_ok=True)
    SPRITES_DIR.mkdir(parents=True, exist_ok=True)
    HUB_SPRITES_DIR.mkdir(parents=True, exist_ok=True)

    build_reference_crops_pil()

    env = load_env(ENV_PATH)
    api_key = env.get("GEMINI_API_KEY") or os.environ.get("GEMINI_API_KEY")

    if api_key:
        for spec in MULTIMODAL_PAGE_SPECS:
            raw_path = RAW_DIR / spec["raw_name"]
            if not raw_path.exists() or args.force:
                try:
                    generate_multimodal_with_gemini(api_key, spec["prompt"], spec["refs"], raw_path)
                except Exception as exc:
                    print(f"[Gemini Note] {spec['raw_name']}: {exc}")

    if not slice_with_pil():
        ps1_script = ROOT_DIR / "tools" / "build_colorado_book_assets.ps1"
        if ps1_script.exists():
            subprocess.run(
                ["powershell", "-ExecutionPolicy", "Bypass", "-File", str(ps1_script)],
                check=True,
            )


if __name__ == "__main__":
    main()
