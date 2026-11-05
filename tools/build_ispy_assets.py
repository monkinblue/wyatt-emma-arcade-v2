#!/usr/bin/env python3
"""
Wyatt & Emma Arcade v2.0 — "I Spy Curio Cabinet" (`ISpyScene.ts`) 2-Pass Asset & Compositor Pipeline
=====================================================================================================
Generates (via GEMINI_API_KEY in .env or staged raw plates), slices 36 Walter Wick studio-lit
miniature objects + `hub-toy-ispy.png` with outer + interior-hole `#FF00FF` chroma-key & 2px de-spill,
scatters and composites 102 objects per board across four `2560x1440` studio photography tableaux
with realistic studio contact drop-shadows & ambient occlusion, and exports the deterministic
coordinate manifest (`src/data/ispyLevels.json`).

Strictly offline build tool — API keys live only in `.env` and are NEVER imported into `src/`.
"""

import base64
import json
import os
from pathlib import Path
import subprocess
import urllib.request

ROOT_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = ROOT_DIR / ".env"


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


def main() -> None:
    load_dotenv(ENV_PATH)
    ps1_script = Path(__file__).resolve().parent / "build_ispy_assets.ps1"
    subprocess.run(
        ["powershell", "-ExecutionPolicy", "Bypass", "-File", str(ps1_script)],
        check=True,
    )


if __name__ == "__main__":
    main()
