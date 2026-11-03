#!/usr/bin/env python3
"""
Builds all visual assets for the Heirloom Tinker Workshop (`TinkerWorkshopScene.ts`):
1. Composites `public/assets/games/tinker-workshop/tinker-frame-bg.jpg` (1280x720)
   by placing the cropped pegboard wall, upper lantern gantry & lower railroad track
   (`tinker-wall-bg.jpg`) into `(172, 28)` (`936x560`) of `studio-frame-bg.jpg`.
2. Chroma-keys (Outer-Border BFS + Interior `#FF00FF` Hole Clearing + Charcoal/Gold De-Spill)
   and slices all 27 custom sprites into `public/assets/games/tinker-workshop/sprites/`:
   - `tinker-parts-raw.jpg` -> 6 contraption parts + 5 interactive props (11 sprites)
   - `tinker-characters-raw.jpg` -> 3 Sparky hopper frames + 3 Doggie minecart frames with
     consistent right-side catcher basket composited onto Frame 3 (6 sprites)
   - `tinker-ui-raw.jpg` -> 5 puzzle medallions + 5 mode/action switches (10 sprites)
"""

import os
from collections import deque
from PIL import Image


def is_magenta(r: int, g: int, b: int) -> bool:
    return r > 165 and g < 85 and b > 165 and (r + b) > (g * 3.2)


def is_interior_magenta_hole(r: int, g: int, b: int) -> bool:
    return r > 215 and g < 50 and b > 215


def clear_magenta_and_despill(img: Image.Image, clear_interior_holes: bool = True) -> Image.Image:
    rgba = img.convert("RGBA")
    w, h = rgba.size
    px = rgba.load()

    visited = [[False] * w for _ in range(h)]
    q = deque()

    # 1. Seed outer borders
    for x in range(w):
        for y in (0, h - 1):
            r, g, b, a = px[x, y]
            if not visited[y][x] and is_magenta(r, g, b):
                visited[y][x] = True
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            r, g, b, a = px[x, y]
            if not visited[y][x] and is_magenta(r, g, b):
                visited[y][x] = True
                q.append((x, y))

    # 2. Seed enclosed interior #FF00FF holes (peg holes, gear centers, spring gaps, basket slats, trophy handles)
    if clear_interior_holes:
        for y in range(h):
            for x in range(w):
                if not visited[y][x]:
                    r, g, b, a = px[x, y]
                    if is_interior_magenta_hole(r, g, b):
                        visited[y][x] = True
                        q.append((x, y))

    # 3. BFS flood-fill
    while q:
        cx, cy = q.popleft()
        px[cx, cy] = (0, 0, 0, 0)
        for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
            if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx]:
                r, g, b, a = px[nx, ny]
                if is_magenta(r, g, b):
                    visited[ny][nx] = True
                    q.append((nx, ny))

    # 4. 2px perimeter de-spill (neutral charcoal for dark outlines; warm gold for sparkles)
    alpha_snap = [[px[x, y][3] for x in range(w)] for y in range(h)]
    for y in range(h):
        for x in range(w):
            if alpha_snap[y][x] == 0:
                continue
            near_trans = False
            for dy in range(-2, 3):
                for dx in range(-2, 3):
                    nx, ny = x + dx, y + dy
                    if nx < 0 or nx >= w or ny < 0 or ny >= h or alpha_snap[ny][nx] == 0:
                        near_trans = True
                        break
                if near_trans:
                    break
            if near_trans:
                r, g, b, a = px[x, y]
                if r > 200 and g > 90 and b > g + 20:
                    px[x, y] = (255, 200, 80, a)
                elif g < 85 and r > g + 25:
                    px[x, y] = (g, g, g, a)
                elif r > g + 40 and b > g + 40:
                    px[x, y] = (g, g, g, a)

    return rgba


def keep_largest_connected_component(img: Image.Image) -> Image.Image:
    rgba = img.copy()
    w, h = rgba.size
    px = rgba.load()
    visited = [[False] * w for _ in range(h)]
    best_comp = []

    for y in range(h):
        for x in range(w):
            if not visited[y][x] and px[x, y][3] > 15:
                comp = []
                q = deque([(x, y)])
                visited[y][x] = True
                while q:
                    cx, cy = q.popleft()
                    comp.append((cx, cy))
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            if dx == 0 and dy == 0:
                                continue
                            nx, ny = cx + dx, cy + dy
                            if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx] and px[nx, ny][3] > 15:
                                visited[ny][nx] = True
                                q.append((nx, ny))
                if len(comp) > len(best_comp):
                    best_comp = comp

    keep_set = set(best_comp)
    for y in range(h):
        for x in range(w):
            if (x, y) not in keep_set:
                px[x, y] = (0, 0, 0, 0)
    return rgba


def tight_bbox(img: Image.Image, x0: int, y0: int, x1: int, y1: int):
    px = img.load()
    min_x, min_y = x1, y1
    max_x, max_y = x0, y0
    found = False
    for y in range(y0, y1):
        for x in range(x0, x1):
            if px[x, y][3] > 10:
                found = True
                if x < min_x:
                    min_x = x
                if x > max_x:
                    max_x = x
                if y < min_y:
                    min_y = y
                if y > max_y:
                    max_y = y
    if not found:
        return x0, y0, x1, y1
    return min_x, min_y, max_x + 1, max_y + 1


def build_tinker_frame(root_dir: str):
    frame_path = os.path.join(root_dir, "public", "assets", "games", "art-studio", "studio-frame-bg.jpg")
    wall_raw_path = os.path.join(root_dir, "public", "assets", "games", "tinker-workshop", "raw", "tinker-wall-bg.jpg")
    if not os.path.exists(wall_raw_path):
        wall_raw_path = os.path.join(root_dir, "public", "assets", "games", "tinker-workshop", "tinker-wall-bg.jpg")

    out_path = os.path.join(root_dir, "public", "assets", "games", "tinker-workshop", "tinker-frame-bg.jpg")
    frame_img = Image.open(frame_path).convert("RGB")
    wall_img = Image.open(wall_raw_path).convert("RGB")
    if wall_img.size != (1280, 720):
        wall_img = wall_img.resize((1280, 720), Image.LANCZOS)

    cropped = wall_img.crop((68, 12, 1212, 708)).resize((936, 560), Image.LANCZOS)
    frame_img.paste(cropped, (172, 28))

    # Blend out the 2 outer wall-edge peg columns (x=251 and x=1027) using adjacent walnut wood grain
    # so the wall displays an exact 8 columns x 5 rows = 40 brass mounting pegs:
    px = frame_img.load()
    peg_cols_x = [337, 422, 509, 596, 684, 770, 856, 943]
    peg_rows_y = [193, 264, 336, 407, 478]
    for py in peg_rows_y:
        for dy in range(-18, 23):
            y = py + dy
            for dx in range(-18, 19):
                px[251 + dx, y] = px[251 + dx + 34, y]
                px[1027 + dx, y] = px[1027 + dx - 34, y]

    frame_img.save(out_path, quality=95)
    print(f"Saved {out_path} (1280x720)")
    print(f"8x5 Peg Grid X: {peg_cols_x}")
    print(f"8x5 Peg Grid Y: {peg_rows_y}")


def slice_parts_and_props(root_dir: str, sprites_dir: str):
    raw_path = os.path.join(root_dir, "public", "assets", "games", "tinker-workshop", "raw", "tinker-parts-raw.jpg")
    raw_img = Image.open(raw_path)
    w, h = raw_img.size

    specs = [
        # Row 1: 3 Contraption Parts
        ("part-chute.png", 0.0, 0.38, 0.0, 0.30, True),
        ("part-gear.png", 0.38, 0.62, 0.0, 0.30, True),
        ("part-seesaw.png", 0.62, 1.0, 0.0, 0.27, True),
        # Row 2: 3 Contraption Parts
        ("part-flipper.png", 0.0, 0.33, 0.27, 0.58, True),
        ("part-trampoline.png", 0.36, 0.66, 0.30, 0.59, True),
        ("part-bellows.png", 0.68, 1.0, 0.26, 0.56, True),
        # Row 3: 5 Interactive Props
        ("prop-marble.png", 0.0, 0.20, 0.58, 1.0, True),
        ("prop-acorn.png", 0.20, 0.40, 0.58, 1.0, True),
        ("prop-bumper.png", 0.40, 0.61, 0.58, 1.0, True),
        ("prop-star.png", 0.61, 0.83, 0.58, 1.0, False),
        ("prop-chain.png", 0.83, 1.0, 0.54, 1.0, True),
    ]

    for name, x0p, x1p, y0p, y1p, use_lcc in specs:
        sx, ex = int(round(w * x0p)), int(round(w * x1p))
        sy, ey = int(round(h * y0p)), int(round(h * y1p))
        sub = clear_magenta_and_despill(raw_img.crop((sx, sy, ex, ey)), True)
        if use_lcc:
            sub = keep_largest_connected_component(sub)
        bx0, by0, bx1, by1 = tight_bbox(sub, 0, 0, sub.size[0], sub.size[1])
        cropped = sub.crop((bx0, by0, bx1, by1))

        # Rotate part-seesaw.png +14 deg clockwise (-14 deg in PIL) so the wooden plank is
        # HORIZONTAL (0 deg) in its neutral sprite image with the circular peg-hole centered at (0.5, 0.5)
        if name == "part-seesaw.png":
            rot_seesaw = cropped.rotate(-14.0, resample=Image.BICUBIC, expand=True)
            rx0, ry0, rx1, ry1 = tight_bbox(rot_seesaw, 0, 0, rot_seesaw.size[0], rot_seesaw.size[1])
            s_tight = rot_seesaw.crop((rx0, ry0, rx1, ry1))
            sw, sh = s_tight.size
            s_px = s_tight.load()
            sum_hx, sum_hy, cnt_h = 0.0, 0.0, 0
            for y in range(int(sh * 0.30), int(sh * 0.80)):
                for x in range(int(sw * 0.38), int(sw * 0.62)):
                    if s_px[x, y][3] < 30:
                        # Check if enclosed by opaque pixels above & below or left & right
                        has_l = any(s_px[lx, y][3] > 80 for lx in range(max(0, x - 28), x))
                        has_r = any(s_px[rx, y][3] > 80 for rx in range(x + 1, min(sw, x + 29)))
                        has_u = any(s_px[x, uy][3] > 80 for uy in range(max(0, y - 28), y))
                        has_d = any(s_px[x, dy][3] > 80 for dy in range(y + 1, min(sh, y + 29)))
                        if has_l and has_r and has_u and has_d:
                            sum_hx += x
                            sum_hy += y
                            cnt_h += 1
            hole_cx = (sum_hx / cnt_h) if cnt_h > 0 else (sw * 0.495)
            hole_cy = (sum_hy / cnt_h) if cnt_h > 0 else (sh * 0.56)
            half_w = int(round(max(hole_cx, sw - hole_cx))) + 2
            half_h = int(round(max(hole_cy, sh - hole_cy))) + 2
            s_canvas = Image.new("RGBA", (half_w * 2, half_h * 2), (0, 0, 0, 0))
            s_canvas.paste(s_tight, (int(round(half_w - hole_cx)), int(round(half_h - hole_cy))))
            cropped = s_canvas

        out_file = os.path.join(sprites_dir, name)
        cropped.save(out_file)
        print(f"Saved {out_file} ({cropped.size[0]}x{cropped.size[1]})")


def slice_characters(root_dir: str, sprites_dir: str):
    raw_path = os.path.join(root_dir, "public", "assets", "games", "tinker-workshop", "raw", "tinker-characters-raw.jpg")
    cleaned = clear_magenta_and_despill(Image.open(raw_path), True)
    w, h = cleaned.size
    mid_y = h // 2

    # Row 1: Engineer Sparky at Brass Hopper (anchored to bottom-center of the brass funnel spout)
    sparky_frames = []
    max_sw, max_sh = 0, 0
    for c in range(3):
        x0, x1 = int(round(c * w / 3.0)), int(round((c + 1) * w / 3.0))
        bx0, by0, bx1, by1 = tight_bbox(cleaned, x0, 0, x1, mid_y)
        f_img = cleaned.crop((bx0, by0, bx1, by1))
        max_sw = max(max_sw, f_img.size[0])
        max_sh = max(max_sh, f_img.size[1])
        sparky_frames.append(f_img)

    for c, f_img in enumerate(sparky_frames):
        canvas = Image.new("RGBA", (max_sw, max_sh), (0, 0, 0, 0))
        dx = (max_sw - f_img.size[0]) // 2
        dy = max_sh - f_img.size[1]
        canvas.paste(f_img, (dx, dy))
        out_file = os.path.join(sprites_dir, f"tinker-sparky-{c}.png")
        canvas.save(out_file)
        print(f"Saved {out_file} ({max_sw}x{max_sh})")

    # Row 2: Catcher Doggie in Wooden Minecart (aligned by bottom-left cart wheels + right basket composited onto Frame 2)
    doggie_frames = []
    max_dw, max_dh = 0, 0
    for c in range(3):
        x0, x1 = int(round(c * w / 3.0)), int(round((c + 1) * w / 3.0))
        bx0, by0, bx1, by1 = tight_bbox(cleaned, x0, mid_y, x1, h)
        f_img = cleaned.crop((bx0, by0, bx1, by1))
        max_dw = max(max_dw, f_img.size[0])
        max_dh = max(max_dh, f_img.size[1])
        doggie_frames.append(f_img)

    aligned_doggies = []
    for c, f_img in enumerate(doggie_frames):
        canvas = Image.new("RGBA", (max_dw, max_dh), (0, 0, 0, 0))
        dy = max_dh - f_img.size[1]
        canvas.paste(f_img, (0, dy))
        aligned_doggies.append(canvas)

    # Composite the attached right-side catcher basket from Frame 0 onto Frame 2
    f0_px = aligned_doggies[0].load()
    f2_px = aligned_doggies[2].load()
    for y in range(max_dh):
        for x in range(int(max_dw * 0.56), max_dw):
            if f2_px[x, y][3] < 20 and f0_px[x, y][3] > 0:
                f2_px[x, y] = f0_px[x, y]

    for c, canvas in enumerate(aligned_doggies):
        out_file = os.path.join(sprites_dir, f"tinker-doggie-{c}.png")
        canvas.save(out_file)
        print(f"Saved {out_file} ({max_dw}x{max_dh})")


def slice_ui(root_dir: str, sprites_dir: str):
    raw_path = os.path.join(root_dir, "public", "assets", "games", "tinker-workshop", "raw", "tinker-ui-raw.jpg")
    raw_img = Image.open(raw_path)
    w, h = raw_img.size
    mid_y = h // 2

    # Row 1: 5 Circular Brass Puzzle Medallions (solid interior, no interior hole clearing)
    row1 = clear_magenta_and_despill(raw_img.crop((0, 0, w, mid_y)), False)
    for c in range(5):
        x0, x1 = int(round(c * w / 5.0)), int(round((c + 1) * w / 5.0))
        bx0, by0, bx1, by1 = tight_bbox(row1, x0, 0, x1, mid_y)
        cropped = row1.crop((bx0, by0, bx1, by1))
        out_file = os.path.join(sprites_dir, f"puzzle-{c + 1}.png")
        cropped.save(out_file)
        print(f"Saved {out_file} ({cropped.size[0]}x{cropped.size[1]})")

    # Row 2: 5 Bottom Workshop Mode & Action Icons (clear interior holes on handles)
    row2 = clear_magenta_and_despill(raw_img.crop((0, mid_y, w, h)), True)
    r2_names = [
        "tinker-mode-guide.png",
        "tinker-mode-stars.png",
        "tinker-mode-fountain.png",
        "tinker-action-drop.png",
        "tinker-action-clear.png",
    ]
    for c, name in enumerate(r2_names):
        x0, x1 = int(round(c * w / 5.0)), int(round((c + 1) * w / 5.0))
        bx0, by0, bx1, by1 = tight_bbox(row2, x0, 0, x1, h - mid_y)
        cropped = row2.crop((bx0, by0, bx1, by1))
        out_file = os.path.join(sprites_dir, name)
        cropped.save(out_file)
        print(f"Saved {out_file} ({cropped.size[0]}x{cropped.size[1]})")


def slice_shapes(root_dir: str, sprites_dir: str):
    raw_path = os.path.join(root_dir, "public", "assets", "games", "tinker-workshop", "raw", "tinker-shapes-raw.jpg")
    if not os.path.exists(raw_path):
        return
    raw_img = Image.open(raw_path)
    w, h = raw_img.size

    # 1. Row 1, Col 1 (x: 0..50%, y: 0..48%) -> part-bowl.png
    bowl_sub = clear_magenta_and_despill(raw_img.crop((0, 0, int(w * 0.50), int(h * 0.48))), True)
    bowl_sub = keep_largest_connected_component(bowl_sub)
    bx0, by0, bx1, by1 = tight_bbox(bowl_sub, 0, 0, bowl_sub.size[0], bowl_sub.size[1])
    bowl_crop = bowl_sub.crop((bx0, by0, bx1, by1))
    bowl_out = os.path.join(sprites_dir, "part-bowl.png")
    bowl_crop.save(bowl_out)
    print(f"Saved {bowl_out} ({bowl_crop.size[0]}x{bowl_crop.size[1]})")

    # 2. Row 1, Col 2 (x: 50..100%, y: 0..48%) -> part-wedge.png (flipped 180 deg vertically so narrow vertex points UP /\)
    wedge_sub = clear_magenta_and_despill(raw_img.crop((int(w * 0.50), 0, w, int(h * 0.48))), True)
    wedge_sub = keep_largest_connected_component(wedge_sub)
    bx0, by0, bx1, by1 = tight_bbox(wedge_sub, 0, 0, wedge_sub.size[0], wedge_sub.size[1])
    wedge_crop = wedge_sub.crop((bx0, by0, bx1, by1)).Rotate(180) if hasattr(Image.Image, "Rotate") else wedge_sub.crop((bx0, by0, bx1, by1)).rotate(180, resample=Image.BICUBIC, expand=True)
    wedge_out = os.path.join(sprites_dir, "part-wedge.png")
    wedge_crop.save(wedge_out)
    print(f"Saved {wedge_out} ({wedge_crop.size[0]}x{wedge_crop.size[1]})")

    # 3. Row 2, Col 1 (x: 0..50%, y: 44..100%) -> part-hammer.png
    # Rotate so the wooden mallet head hangs straight down vertically and the top brass peg-hole ring is at (x=50%, y=15%)
    hammer_raw_crop = raw_img.crop((0, int(h * 0.44), int(w * 0.50), h)).convert("RGBA")
    # Clear any overlap from the bottom of part-bowl in the upper-middle of this crop
    h_px = hammer_raw_crop.load()
    hw, hh = hammer_raw_crop.size
    for cy in range(int(hh * 0.14)):
        for cx in range(int(hw * 0.35), hw):
            h_px[cx, cy] = (255, 0, 255, 255)
    hammer_sub = clear_magenta_and_despill(hammer_raw_crop, True)
    hammer_sub = keep_largest_connected_component(hammer_sub)
    bx0, by0, bx1, by1 = tight_bbox(hammer_sub, 0, 0, hammer_sub.size[0], hammer_sub.size[1])
    hammer_crop = hammer_sub.crop((bx0, by0, bx1, by1))
    hammer_rot = hammer_crop.rotate(-43, resample=Image.BICUBIC, expand=True)
    rx0, ry0, rx1, ry1 = tight_bbox(hammer_rot, 0, 0, hammer_rot.size[0], hammer_rot.size[1])
    hammer_tight = hammer_rot.crop((rx0, ry0, rx1, ry1))
    tw, th = hammer_tight.size

    # Find horizontal & vertical centroid of the top brass ring (top 22% of hammer_tight)
    t_px = hammer_tight.load()
    sum_rx, sum_ry, cnt_r = 0, 0, 0
    for cy in range(int(th * 0.22)):
        for cx in range(tw):
            if t_px[cx, cy][3] > 40:
                sum_rx += cx
                sum_ry += cy
                cnt_r += 1
    ring_cx = (sum_rx / cnt_r) if cnt_r > 0 else (tw * 0.5)
    ring_cy = (sum_ry / cnt_r) if cnt_r > 0 else (th * 0.11)

    pad_w = int(max(ring_cx, tw - ring_cx) * 2 + 24)
    pad_h = int(round((th - ring_cy) / 0.85))
    hammer_canvas = Image.new("RGBA", (pad_w, pad_h), (0, 0, 0, 0))
    paste_x = int(round(pad_w * 0.50 - ring_cx))
    paste_y = int(round(pad_h * 0.15 - ring_cy))
    hammer_canvas.paste(hammer_tight, (paste_x, paste_y))
    hammer_out = os.path.join(sprites_dir, "part-hammer.png")
    hammer_canvas.save(hammer_out)
    print(f"Saved {hammer_out} ({hammer_canvas.size[0]}x{hammer_canvas.size[1]})")

    # 4. Row 2, Col 2 (x: 50..100%, y: 48..100%) -> part-funnel.png
    funnel_sub = clear_magenta_and_despill(raw_img.crop((int(w * 0.50), int(h * 0.48), w, h)), True)
    funnel_sub = keep_largest_connected_component(funnel_sub)
    bx0, by0, bx1, by1 = tight_bbox(funnel_sub, 0, 0, funnel_sub.size[0], funnel_sub.size[1])
    funnel_crop = funnel_sub.crop((bx0, by0, bx1, by1))
    funnel_out = os.path.join(sprites_dir, "part-funnel.png")
    funnel_crop.save(funnel_out)
    print(f"Saved {funnel_out} ({funnel_crop.size[0]}x{funnel_crop.size[1]})")


def build_vertical_wall(sprites_dir: str):
    """
    Loads `part-chute.png`, rotates it so the mahogany-and-brass beam stands 100% VERTICAL
    (`|` orientation) with its circular brass peg-mounting ring dead-center at `(0.5, 0.5)`,
    and saves `public/assets/games/tinker-workshop/sprites/part-wall.png`.
    """
    chute_path = os.path.join(sprites_dir, "part-chute.png")
    if not os.path.exists(chute_path):
        return
    chute_img = Image.open(chute_path).convert("RGBA")
    # Rotate -75.5 deg CCW (+75.5 deg CW) so the 14.5-deg sloped beam stands 100% vertical (|)
    rot_img = chute_img.rotate(-75.5, resample=Image.BICUBIC, expand=True)
    bx0, by0, bx1, by1 = tight_bbox(rot_img, 0, 0, rot_img.size[0], rot_img.size[1])
    tight = rot_img.crop((bx0, by0, bx1, by1))
    tw, th = tight.size
    t_px = tight.load()

    # Locate the transparent circular peg-hole inside the center brass mounting ring
    sum_hx, sum_hy, cnt_h = 0.0, 0.0, 0
    for y in range(int(th * 0.35), int(th * 0.65)):
        # Find opaque left and right bounds on this scanline
        left_x, right_x = -1, -1
        for x in range(tw):
            if t_px[x, y][3] > 80:
                left_x = x
                break
        for x in range(tw - 1, -1, -1):
            if t_px[x, y][3] > 80:
                right_x = x
                break
        if left_x >= 0 and right_x > left_x + 8:
            for x in range(left_x + 2, right_x - 1):
                if t_px[x, y][3] < 30:
                    sum_hx += x
                    sum_hy += y
                    cnt_h += 1

    hole_cx = (sum_hx / cnt_h) if cnt_h > 0 else (tw * 0.5)
    hole_cy = (sum_hy / cnt_h) if cnt_h > 0 else (th * 0.5)

    half_w = int(round(max(hole_cx, tw - hole_cx))) + 2
    half_h = int(round(max(hole_cy, th - hole_cy))) + 2
    canvas_w = half_w * 2
    canvas_h = half_h * 2
    wall_canvas = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    paste_x = int(round(half_w - hole_cx))
    paste_y = int(round(half_h - hole_cy))
    wall_canvas.paste(tight, (paste_x, paste_y))

    # Scale cleanly to height ~125px (width ~34px) while preserving exact (0.5, 0.5) center
    target_h = 125
    target_w = max(34, int(round(canvas_w * (target_h / float(canvas_h)))))
    wall_final = wall_canvas.resize((target_w, target_h), Image.LANCZOS)

    wall_out = os.path.join(sprites_dir, "part-wall.png")
    wall_final.save(wall_out)
    print(f"Saved {wall_out} ({wall_final.size[0]}x{wall_final.size[1]})")


def main():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    sprites_dir = os.path.join(root_dir, "public", "assets", "games", "tinker-workshop", "sprites")
    os.makedirs(sprites_dir, exist_ok=True)

    build_tinker_frame(root_dir)
    slice_parts_and_props(root_dir, sprites_dir)
    slice_characters(root_dir, sprites_dir)
    slice_ui(root_dir, sprites_dir)
    slice_shapes(root_dir, sprites_dir)
    build_vertical_wall(sprites_dir)


if __name__ == "__main__":
    main()
