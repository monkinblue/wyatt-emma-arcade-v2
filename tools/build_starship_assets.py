#!/usr/bin/env python3
"""
tools/build_starship_assets.py
------------------------------
Mentor Note: Offline Next-Gen Sci-Fi Photorealistic Asset Pipeline for
"STARSHIP UNICORN: ORBITAL TRIVIA" (`StarshipUnicornScene.ts`) and the 4-Tab Hub Shelf (`HubScene.ts`).

STRICT GUARDRAILS:
  - Reads `GEMINI_API_KEY` strictly from `.env` (never imported or referenced in `src/`).
  - Preserves 3 family reference photos in `tools/reference_photos/` and 8 face reference crops
    in `tools/reference_photos/crops/ref_<id>.jpg`.
  - Uses `gemini-2.5-flash-image` multimodal image-to-image reference at full 1024x1024 resolution
    with smooth `LINEAR` filtering (ZERO pixel art) to generate all 9 SpaceX / FICSIT Astronaut
    Exosuit portraits (`ROBERT`, `RITA`, `WYATT`, `EMMA`, `PAPA`, `NANA`, `GRANDPA`, `BABCI`, `GUEST`),
    frames each inside a hexagonal brushed-titanium avatar card (`card_<id>.png`) and circular
    3D-shaded board token (`token_<id>.png`), builds the 2560x1440 Cosmic Nebula & Cyber-Unicorn
    Citadel backdrop (`starship-board-bg.jpg`), and chroma-keys `hub-toy-starship-unicorn.png`
    and `mode-tv.png`.
"""

import base64
import json
import os
import subprocess
import sys
import urllib.request
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = ROOT_DIR / ".env"
CROPS_DIR = Path(__file__).resolve().parent / "reference_photos" / "crops"
RAW_DIR = ROOT_DIR / "public" / "assets" / "games" / "starship-unicorn" / "raw"
HUB_RAW_DIR = ROOT_DIR / "public" / "assets" / "hub" / "raw"

SHARED_STYLE_RULES = (
    "Photorealistic Next-Gen 4K Unreal Engine 5 cinematic sci-fi portrait photography, razor-sharp 85mm f/1.4 prime lens, "
    "smooth high-resolution anti-aliased rendering, ZERO pixel art, ZERO cartoon outlining. "
    "Subject is framed head-and-shoulders chest-up centered in the square frame, looking directly at the camera with a warm joyful expression. "
    "Wearing an authentic, ultra-detailed SpaceX Crew Dragon & Satisfactory FICSIT industrial orbital exosuit with a retracted/open clear glass "
    "bubble helmet ring around the collar (NO visor covering the face, completely unobstructed clear view of the face and hair!), "
    "soft cyan and safety-amber interior HUD rim-lighting illuminating their cheekbones, heavy anodized titanium neck ring, "
    "carbon-fiber shoulder pauldrons, and a glowing LED telemetry chest core. Background is a deep dark SpaceX Starbase orbital command bridge "
    "with subtle out-of-focus bioluminescent cyan and magenta nebula starlight bokeh. NO text or watermarks in the image."
)

CHARACTER_SPECS = [
    {
        "id": "robert",
        "ref_crop": "ref_robert.jpg",
        "prompt": (
            "Use the attached reference photo to preserve the exact photorealistic facial likeness, eye shape, nose, warm smile, "
            "short light-brown/ash-blonde hair, and clear rectangular eyeglasses of this athletic 37-year-old Caucasian man (Robert). "
            "Render him as Mission Commander Robert wearing a gleaming Commander-class SpaceX-white & brushed-titanium orbital exosuit "
            "with glowing FICSIT safety-amber chest telemetry core, dark gunmetal carbon-fiber shoulder pauldrons, and heavy anodized metallic collar ring. "
            + SHARED_STYLE_RULES
        ),
    },
    {
        "id": "rita",
        "ref_crop": "ref_rita.jpg",
        "prompt": (
            "Use the attached reference photo to preserve the exact photorealistic facial likeness, radiant warm smile, eyes, cheekbones, "
            "and long straight dark-brown hair of this 35-year-old East Asian woman (Rita). "
            "Render her as Flight Director Rita wearing a sleek SpaceX-white & mirror-chrome Flight Director orbital spacesuit with glowing cyan neon collar rings, "
            "a cyan telemetry chest core, and classic tortoiseshell/silver aviator sunglasses clipped to the upper open helmet bezel above her forehead. "
            + SHARED_STYLE_RULES
        ),
    },
    {
        "id": "wyatt",
        "ref_crop": "ref_wyatt.jpg",
        "prompt": (
            "Use the attached reference photo to preserve the exact photorealistic facial likeness, bright mischievous grin, warm eyes, "
            "and short straight dark-brown hair with bangs of this cute 4-year-old biracial boy (Wyatt). "
            "Render him as Astro-Ranger Wyatt wearing a custom kid-sized Emerald-Green, White & Brushed-Titanium SpaceX Astro-Ranger exosuit "
            "featuring two high-tech glowing neon holographic bunny-ear telemetry antennae (one electric blue/green, one glowing orange-red, inspired by his craft bunny ears!) "
            "mounted on top of his open space helmet ring, and a glowing emerald dragon-star chest emblem. "
            + SHARED_STYLE_RULES
        ),
    },
    {
        "id": "emma",
        "ref_crop": "ref_emma.jpg",
        "prompt": (
            "Use the attached reference photo to preserve the exact photorealistic facial likeness, big happy toddler grin, joyful eyes, rosy cheeks, "
            "and dark-brown hair styled in cute twin side pigtails of this adorable 3-year-old biracial toddler girl (Emma), facing forward toward the camera. "
            "Render her as Space Princess Emma wearing an iridescent Rose-Pink, Lavender & Starlight Chrome SpaceX Space-Princess astronaut suit "
            "with a glowing holographic crystal unicorn horn crest mounted at the top center of her open helmet bezel and a glowing starlight unicorn emblem on her chest plate. "
            + SHARED_STYLE_RULES
        ),
    },
    {
        "id": "papa",
        "ref_crop": "ref_papa.jpg",
        "prompt": (
            "Use the attached reference photo to preserve the exact photorealistic facial likeness, salt-and-pepper wavy dark hair, "
            "signature thick dark mustache, warm crinkled smiling eyes, and big friendly grandfather smile of this cheerful older Caucasian man (Papa). "
            "Render him as Chief Engineer Papa wearing a heavy-duty Cobalt-Blue & Brushed-Titanium FICSIT Deep-Space Chief Engineer exosuit "
            "with polished brass/gold mission patches, heavy mechanical collar clamps, and a warm amber-gold power core on his chest plate. "
            + SHARED_STYLE_RULES
        ),
    },
    {
        "id": "nana",
        "ref_crop": "ref_nana.jpg",
        "prompt": (
            "Use the attached reference photo to preserve the exact photorealistic facial likeness, shoulder-length layered blonde hair with bangs, "
            "warm smiling eyes, and bright megawatt grandmother smile of this warm older Caucasian woman (Nana). "
            "Render her as Science Officer Nana wearing a sleek Sapphire-Blue & Pearl-White Starbase Science Officer SpaceX spacesuit "
            "with glowing sky-blue telemetry piping along the titanium collar and a crystal-blue orbital science emblem on her chest core. "
            + SHARED_STYLE_RULES
        ),
    },
    {
        "id": "grandpa",
        "ref_crop": "ref_grandpa.jpg",
        "prompt": (
            "Use the attached reference photo to preserve the exact photorealistic facial likeness, neatly combed short silver-gray hair, "
            "thin round wire-rimmed eyeglasses, kind eyes, and gentle warm grandfather smile of this distinguished older Caucasian man (Grandpa). "
            "Render him as Fleet Admiral Grandpa wearing an Admiral-grade White, Brushed-Silver & Navy Fleet Commander SpaceX orbital exosuit "
            "with classic blue-and-white striped mission insignia on the chest armor and glowing silver-cyan HUD telemetry accents. "
            + SHARED_STYLE_RULES
        ),
    },
    {
        "id": "babci",
        "ref_crop": "ref_babci.jpg",
        "prompt": (
            "Use the attached reference photo to preserve the exact photorealistic facial likeness, shoulder-length wavy medium-brown hair "
            "with golden-blonde highlights, warm eyes, and bright welcoming grandmother smile of this attractive older Caucasian woman (Babci). "
            "Render her as Orbital Navigator Babci wearing an elegant Midnight-Navy, Brushed-Silver & Rose-Gold SpaceX Orbital Navigator spacesuit "
            "with a glowing sapphire star-pendant telemetry core on the upper chest plate and rose-gold collar trim. "
            + SHARED_STYLE_RULES
        ),
    },
    {
        "id": "guest",
        "ref_crop": None,
        "prompt": (
            "Photorealistic Next-Gen 4K Unreal Engine 5 cinematic sci-fi portrait of a mysterious VIP Mission Specialist astronaut wearing "
            "a gleaming Mirror-Chrome, Matte-White & 24k-Gold SpaceX Crew Dragon / FICSIT EVA spacesuit with a closed full-face dome visor "
            "made of reflective rainbow-iridescent dichroic glass that vividly reflects a glowing cosmic Cyber-Unicorn and bioluminescent nebula starlight. "
            "Heavy anodized titanium neck ring, carbon-fiber shoulder pauldrons, glowing golden chest telemetry core, head-and-shoulders centered square portrait, "
            "razor-sharp 85mm studio lighting, ZERO text."
        ),
    },
]


def load_env() -> dict:
    env = {}
    if ENV_PATH.exists():
        for raw_line in ENV_PATH.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def generate_with_gemini(api_key: str, prompt: str, out_path: Path, ref_image: Path | None = None) -> bool:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    parts = []
    if ref_image and ref_image.exists():
        parts.append(
            {
                "inlineData": {
                    "mimeType": "image/jpeg",
                    "data": base64.b64encode(ref_image.read_bytes()).decode("ascii"),
                }
            }
        )
    parts.append({"text": prompt})

    for model in ("gemini-2.5-flash-image", "gemini-2.5-flash-image-preview"):
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
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
            with urllib.request.urlopen(req, timeout=90) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            for cand in data.get("candidates", []):
                for part in cand.get("content", {}).get("parts", []):
                    inline = part.get("inlineData") or part.get("inline_data")
                    if inline and inline.get("data"):
                        out_path.write_bytes(base64.b64decode(inline["data"]))
                        print(f"  [GENERATED] {out_path.name} via {model}")
                        return True
        except Exception as exc:
            print(f"  [Warn] {model}: {exc}")
    return False


def main() -> int:
    mjs_script = Path(__file__).resolve().parent / "build_starship_assets.mjs"
    if mjs_script.exists():
        return subprocess.call(["node", str(mjs_script)] + sys.argv[1:])

    env = load_env()
    api_key = env.get("GEMINI_API_KEY") or os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        print("ERROR: GEMINI_API_KEY not found in .env", file=sys.stderr)
        return 1

    for spec in CHARACTER_SPECS:
        out_file = RAW_DIR / f"astro_{spec['id']}_raw.png"
        if not out_file.exists():
            ref_path = (CROPS_DIR / spec["ref_crop"]) if spec["ref_crop"] else None
            generate_with_gemini(api_key, spec["prompt"], out_file, ref_path)

    ps1_script = Path(__file__).resolve().parent / "build_starship_assets.ps1"
    subprocess.run(
        ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(ps1_script)],
        check=True,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
