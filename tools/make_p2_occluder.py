#!/usr/bin/env python3
"""
tools/make_p2_occluder.py
-------------------------
Generates Page 2 bush occluders from `public/assets/stories/nana/p2-bg-clean.jpg`
so Doggie (`p2-doggie-bush` at ~355, 380) and Sparky (`p2-sparky-bush` at ~765, 355)
can peek and pop out from BEHIND the front-yard bushes!

Outputs:
- `public/assets/stories/nana/sprites/p2-bush-left-occluder.png`
- `public/assets/stories/nana/sprites/p2-bush-right-occluder.png`
- `public/assets/stories/nana/sprites/p2-bush-occluder.png` (full 2752x1536 overlay)
"""

from pathlib import Path
from PIL import Image


def is_bush_or_foreground(r: int, g: int, b: int, y: int) -> bool:
    # Green foliage of the bushes or dark leaf outlines or lower stone ring / grass
    if y >= 835:
        return True
    # Green/olive bush leaves have g >= r - 8 and g > b + 6
    if g >= r - 8 and g > b + 6 and g >= 35:
        return True
    # Dark leaf interior/outline inside bush canopy
    if y >= 745 and r < 68 and g < 75 and b < 68:
        return True
    return False


def build_p2_occluders(src_path: Path, sprites_dir: Path) -> None:
    img = Image.open(src_path).convert("RGBA")
    w, h = img.size
    src_px = img.load()

    full_occ = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    full_px = full_occ.load()

    # Left bush region aroundstage (355, 380) -> raw (635..900, 725..925)
    lx0, ly0, lx1, ly1 = 635, 725, 900, 925
    left_occ = Image.new("RGBA", (lx1 - lx0, ly1 - ly0), (0, 0, 0, 0))
    left_px = left_occ.load()

    for y in range(ly0, ly1):
        for x in range(lx0, lx1):
            r, g, b, _ = src_px[x, y]
            if is_bush_or_foreground(r, g, b, y):
                left_px[x - lx0, y - ly0] = (r, g, b, 255)
                full_px[x, y] = (r, g, b, 255)

    # Right weeping bush & stone ring around stage (765, 355) -> raw (1470..1830, 680..935)
    rx0, ry0, rx1, ry1 = 1470, 680, 1830, 935
    right_occ = Image.new("RGBA", (rx1 - rx0, ry1 - ry0), (0, 0, 0, 0))
    right_px = right_occ.load()

    for y in range(ry0, ry1):
        for x in range(rx0, rx1):
            r, g, b, _ = src_px[x, y]
            if is_bush_or_foreground(r, g, b, y):
                right_px[x - rx0, y - ry0] = (r, g, b, 255)
                full_px[x, y] = (r, g, b, 255)

    sprites_dir.mkdir(parents=True, exist_ok=True)
    left_path = sprites_dir / "p2-bush-left-occluder.png"
    right_path = sprites_dir / "p2-bush-right-occluder.png"
    full_path = sprites_dir / "p2-bush-occluder.png"

    left_occ.save(left_path, "PNG")
    right_occ.save(right_path, "PNG")
    full_occ.save(full_path, "PNG")
    print(f"Saved {left_path.name} ({left_occ.size[0]}x{left_occ.size[1]})")
    print(f"Saved {right_path.name} ({right_occ.size[0]}x{right_occ.size[1]})")
    print(f"Saved {full_path.name} ({full_occ.size[0]}x{full_occ.size[1]})")


if __name__ == "__main__":
    root = Path(__file__).resolve().parent.parent
    build_p2_occluders(
        root / "public/assets/stories/nana/p2-bg-clean.jpg",
        root / "public/assets/stories/nana/sprites",
    )
