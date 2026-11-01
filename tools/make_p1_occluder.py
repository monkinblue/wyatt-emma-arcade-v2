#!/usr/bin/env python3
"""
tools/make_p1_occluder.py
-------------------------
Generates `public/assets/stories/nana/sprites/p1-window-occluder.png` from
`public/assets/stories/nana/p1-bg-clean.jpg` using per-pixel flood-filling and
row-profile color matching inside the 5 terminal window glass bays.

Why we use a Pixel-Contour Occluder instead of a Phaser GeometryMask:
- A rectangular GeometryMask clips moving exterior sprites (the Runway Jet and Sparky)
  against coarse rectangular boxes around characters and window frames.
- By setting ONLY the exterior sky gradient, horizon tree haze, green grass strip, and
  grey tarmac pixels inside the 5 window bays to `alpha = 0` right up to the exact
  pixel outlines of Wyatt, Nana, Papa, the exterior jetbridge, the dark pedestrian
  silhouettes, the `ARRIVALS` sign, and the 4 vertical window mullions, the taking-off
  airplane and Sparky pass seamlessly behind the actual curved heads, hair, shoulders,
  and window mullions with 100% authentic 1992 Living Books layering!
- Also cleans out the baked-in cream `ARRIVALS` letters inside the 8 dark charcoal
  split-flap slots so the live Phaser split-flap tiles can flip without any static
  letters peeking through from behind.
"""

from collections import deque
from pathlib import Path
from PIL import Image


def build_p1_window_occluder(src_path: Path, out_path: Path) -> None:
    img = Image.open(src_path).convert("RGBA")
    w, h = img.size
    px = img.load()

    # 1. Sample clean exterior row profile (sky -> horizon -> grass -> tarmac) at x = 1190..1230
    ref_r = [0] * h
    ref_g = [0] * h
    ref_b = [0] * h
    for y in range(312, 959):
        sr = sg = sb = cnt = 0
        for x in range(1190, 1231, 2):
            r, g, b, _ = px[x, y]
            sr += r
            sg += g
            sb += b
            cnt += 1
        ref_r[y] = sr // cnt
        ref_g[y] = sg // cnt
        ref_b[y] = sb // cnt

    # 5 window glass bays in 2752x1536 coordinates (preserving the 4 vertical mullions)
    bays = [
        (275, 693),
        (716, 1124),
        (1146, 1543),
        (1560, 1943),
        (1960, 2312),
    ]

    def can_be_exterior(x: int, y: int) -> bool:
        if y < 314 or y > 955:
            return False
        # Exclude ARRIVALS sign housing (x=408..1026, y=258..415)
        if 408 <= x <= 1026 and y <= 415:
            return False
        # Exclude white carousel rim at bottom of Bay 1
        if x <= 693 and y >= 929:
            return False

        r, g, b, _ = px[x, y]

        # In the exterior jetbridge region (x>=1902, y=575..818), allow sky above roof and left of bellows
        if x >= 1902 and 575 <= y <= 818:
            in_exhaust_stacks = (2122 <= x <= 2154 and 575 <= y <= 630) or (
                2168 <= x <= 2200 and 575 <= y <= 630
            )
            if not in_exhaust_stacks and y <= 655 and g >= 205 and b >= 215 and r <= 205:
                return True
            if x <= 1986 and 655 <= y <= 765 and g >= 205 and b >= 208 and r >= 170:
                return True
            return False

        # Never cross dark pixel outlines or dark pedestrian silhouettes
        if r < 120 and g < 130 and b < 140:
            return False

        dr = r - ref_r[y]
        dg = g - ref_g[y]
        db = b - ref_b[y]
        if dr * dr + dg * dg + db * db <= 32 * 32:
            return True

        # Sky gradient band
        if y <= 825 and 130 <= r <= 220 and g >= 190 and b >= 210 and b >= r:
            return True
        # Distant horizon tree haze band
        if 775 <= y <= 838 and 132 <= r <= 185 and 162 <= g <= 212 and 145 <= b <= 205:
            return True
        # Green runway grass strip
        if 824 <= y <= 854 and 142 <= r <= 195 and 162 <= g <= 216 and 118 <= b <= 168 and g > b:
            return True
        # Grey concrete tarmac
        if (
            846 <= y <= 955
            and 142 <= r <= 216
            and 148 <= g <= 208
            and 146 <= b <= 198
            and abs(r - g) <= 22
            and abs(g - b) <= 24
        ):
            return True
        # Yellow runway taxi line
        if 850 <= y <= 955 and 970 <= x <= 1124 and r >= 190 and g >= 160 and b >= 95 and r > b + 18:
            return True

        return False

    seeds = [
        (285, 650), (350, 450), (600, 450), (500, 815), (500, 840), (500, 880), (320, 880),
        (850, 450), (1050, 450), (900, 815), (900, 840), (900, 880), (1050, 920),
        (1220, 350), (1450, 350), (1200, 880), (1345, 880), (1345, 935), (1425, 880), (1520, 835),
        (1620, 350), (1850, 350), (1620, 815), (1620, 840), (1660, 860),
        (1925, 840), (1925, 865), (1970, 840), (1970, 865),
        (2020, 350), (2250, 350), (2280, 840), (2280, 880), (2280, 920),
    ]

    is_glass = [[False] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()

    for sx, sy in seeds:
        if can_be_exterior(sx, sy) and not is_glass[sy][sx]:
            is_glass[sy][sx] = True
            q.append((sx, sy))

    while q:
        cx, cy = q.popleft()
        bay_bounds = None
        for bmin, bmax in bays:
            if bmin <= cx <= bmax:
                bay_bounds = (bmin, bmax)
                break
        if not bay_bounds:
            continue
        bmin, bmax = bay_bounds

        for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
            if bmin <= nx <= bmax and 314 <= ny <= 955 and not is_glass[ny][nx]:
                if can_be_exterior(nx, ny):
                    is_glass[ny][nx] = True
                    q.append((nx, ny))

    for y in range(314, 956):
        for x in range(275, 2313):
            r, g, b, a = px[x, y]
            if is_glass[y][x]:
                px[x, y] = (r, g, b, 0)
            else:
                neighbors = (
                    int(is_glass[y][x - 1])
                    + int(is_glass[y][x + 1])
                    + int(is_glass[y - 1][x])
                    + int(is_glass[y + 1][x])
                )
                if neighbors >= 2:
                    px[x, y] = (r, g, b, 180)

    # 2. Clean out baked ARRIVALS letters inside the 8 dark charcoal split-flap slots
    cells = [
        (441, 500),
        (511, 571),
        (583, 642),
        (654, 714),
        (726, 785),
        (797, 855),
        (867, 926),
        (938, 996),
    ]
    for x0, x1 in cells:
        for y in range(292, 379):
            for x in range(x0, x1 + 1):
                if 334 <= y <= 336:
                    px[x, y] = (5, 4, 12, 255)
                elif y < 334:
                    px[x, y] = (50, 39, 56, 255)
                else:
                    px[x, y] = (58, 46, 64, 255)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(out_path, "PNG")
    print(f"Saved {out_path} ({w}x{h})")


if __name__ == "__main__":
    root = Path(__file__).resolve().parent.parent
    build_p1_window_occluder(
        root / "public/assets/stories/nana/p1-bg-clean.jpg",
        root / "public/assets/stories/nana/sprites/p1-window-occluder.png",
    )
