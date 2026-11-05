#!/usr/bin/env python3
"""
tools/rebuild_ispy_hub_icon.py
------------------------------
Mentor Note: Targeted High-Density Heirloom Hub Icon Builder for `hub-toy-ispy.png`.

1) Uses `GEMINI_API_KEY` from `.env` (strictly offline in `tools/`, never in `src/`)
   with `gemini-2.5-flash-image` / `imagen-3.0-generate-002` at full `1024x1024` resolution
   to generate an ultra-crisp, richly detailed Walter Wick / Hi-Bit Heirloom Curio Pedestal Icon
   on a solid `#FF00FF` magenta background:
     - Carved dark mahogany watchmaker's curio drawer mounted on a turned wooden pedestal base,
       with a tiny ornate brass drawer pull on the front.
     - Inside the velvet-lined open tray: gleaming swirl glass marbles, antique brass skeleton keys,
       a pair of ruby-red dice, and a miniature yellow vintage biplane.
     - Hovering above the tray on a curved brass gooseneck arm: a gleaming, oversized polished brass
       magnifying glass with crystal-clear glass refraction, specular highlights, and golden sparkles.
2) Performs 8-connected BFS flood-fill background removal + interior hole removal (inside the curved
   brass gooseneck loop) + a 3px magenta de-spill pass + `Image.LANCZOS` resampling to `512px` height.
"""

import base64
import json
import os
import subprocess
import sys
import urllib.request
from collections import deque

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_PATH = os.path.join(ROOT_DIR, ".env")
RAW_PATH = os.path.join(ROOT_DIR, "public", "assets", "hub", "raw", "hub-toy-ispy-raw.jpg")

PROMPT = (
    "Ultra-crisp, high-resolution Walter Wick heirloom studio toy photography and hand-painted masterpiece icon "
    "(smooth anti-aliased high-resolution edges, NO coarse blocky pixel-art staircases!) of a standalone tabletop "
    "arcade shelf toy on a solid flat pure #FF00FF magenta chroma-key background (RGB 255, 0, 255, no floor shadow "
    "outside the base, generous #FF00FF margin around the entire object, zero text). "
    "Exact Composition (3/4 isometric front-facing tabletop view): "
    "1) Bottom: A carved dark mahogany turned wooden pedestal base with concentric circular tiers and fluted wood carvings. "
    "2) Middle: Mounted atop the pedestal is an angled open square dark mahogany watchmaker's curio drawer with a tiny "
    "ornate polished brass bail handle/pull on the front panel. "
    "3) Inside the velvet-lined open drawer tray: "
    "- Left side: 5 gleaming colorful swirl glass marbles (emerald green, cobalt blue, ruby, and gold glass swirls). "
    "- Center: 3 ornate antique polished brass skeleton keys with clover bows. "
    "- Front-center: A pair of glossy ruby-red casino dice with crisp white pips. "
    "- Right side: A miniature vintage yellow T-6 Texan / biplane toy airplane with silver propeller. "
    "4) Top: Rising from the back-right corner of the mahogany drawer is an ornate curved polished brass gooseneck arm "
    "that holds a gleaming, oversized circular polished brass magnifying glass hovering horizontally above the center "
    "of the tray, with realistic crystal-clear glass lens refraction, bright white specular highlight arcs on the glass, "
    "and 3 tiny golden 4-point star sparkles around the brass bezel."
)


def load_env() -> dict:
    env = {}
    if os.path.exists(ENV_PATH):
        with open(ENV_PATH, "r", encoding="utf-8") as f:
            for line in f:
                s = line.strip()
                if not s or s.startswith("#") or "=" not in s:
                    continue
                k, v = s.split("=", 1)
                env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def generate_raw_with_gemini(api_key: str, out_path: str) -> bool:
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    for model in ("gemini-2.5-flash-image", "imagen-3.0-generate-002"):
        try:
            if model.startswith("imagen"):
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:predict?key={api_key}"
                payload = {
                    "instances": [{"prompt": PROMPT}],
                    "parameters": {"sampleCount": 1, "aspectRatio": "1:1"},
                }
            else:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
                payload = {
                    "contents": [{"parts": [{"text": PROMPT}]}],
                    "generationConfig": {"responseModalities": ["TEXT", "IMAGE"]},
                }
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=60) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            if model.startswith("imagen"):
                b64 = data.get("predictions", [{}])[0].get("bytesBase64Encoded")
                if b64:
                    with open(out_path, "wb") as f:
                        f.write(base64.b64decode(b64))
                    return True
            else:
                for cand in data.get("candidates", []):
                    for part in cand.get("content", {}).get("parts", []):
                        inline = part.get("inlineData") or part.get("inline_data")
                        if inline and inline.get("data"):
                            with open(out_path, "wb") as f:
                                f.write(base64.b64decode(inline["data"]))
                            return True
        except Exception as exc:
            print(f"[Warn] {model}: {exc}")
    return False


def main() -> None:
    env = load_env()
    api_key = env.get("GEMINI_API_KEY") or os.environ.get("GEMINI_API_KEY", "")
    if not os.path.exists(RAW_PATH) and api_key:
        generate_raw_with_gemini(api_key, RAW_PATH)

    ps1_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "rebuild_ispy_hub_icon.ps1")
    subprocess.run(
        ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ps1_path],
        check=True,
    )


if __name__ == "__main__":
    main()
