#!/usr/bin/env python3
"""
tools/slice_p4_sprites.py
-------------------------
Slices all 8 Page 4 horizontal 3-frame #FF00FF sprite strips from
`public/assets/stories/nana/raw/` into `public/assets/stories/nana/sprites/`
and extracts `sprites/p4-car-occluder.png` and `sprites/p4-shovel-occluder.png`
from `public/assets/stories/nana/p4-bg-clean.jpg` (1280x720) without modifying
`p4-bg-clean.jpg` or any files in `raw/`.

Chroma-Key Rules:
- Outer-border BFS flood-fill starting strictly from frame edges
  (`R > 150, G < 90, B > 140` and `R + B > G * 3 -> alpha = 0`) so interior colors stay 100% solid.
- On the 2px perimeter touching `alpha == 0`, clamp dark magenta/maroon fringe
  (`G < 80` and `(R > G + 30 or B > G + 30)`) to neutral charcoal (`R = G, B = G`) or `alpha = 0`.
- Drop disconnected pixel islands `< 25px`.
"""

import subprocess
import sys
from pathlib import Path


def main() -> int:
    repo_root = Path(__file__).resolve().parent.parent
    ps_script = repo_root / "tools" / "build_p4_sprites.ps1"
    res = subprocess.run(
        ["powershell", "-ExecutionPolicy", "Bypass", "-File", str(ps_script)],
        cwd=str(repo_root),
        check=False,
    )
    return res.returncode


if __name__ == "__main__":
    sys.exit(main())
