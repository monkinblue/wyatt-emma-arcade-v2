"""
tools/generate_coloring_pages.py
--------------------------------
Generates 12 crisp black-ink-on-transparent-background PNG coloring templates (720x480)
in `public/assets/games/art-studio/templates/` from our existing Book 1 illustrations and sprites.
"""

import os
import numpy as np
from PIL import Image, ImageFilter, ImageOps

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NANA_DIR = os.path.join(ROOT_DIR, "public", "assets", "stories", "nana")
SPRITES_DIR = os.path.join(NANA_DIR, "sprites")
OUT_DIR = os.path.join(ROOT_DIR, "public", "assets", "games", "art-studio", "templates")

CANVAS_W = 936
CANVAS_H = 560
INK_RGB = (35, 25, 20)


def extract_first_frame(sprite_path: str, num_frames: int = 3) -> Image.Image:
    """Loads a multi-frame horizontal sprite strip and crops out Frame 0 (trimmed to non-transparent bounds)."""
    img = Image.open(sprite_path).convert("RGBA")
    fw = img.width // num_frames
    frame0 = img.crop((0, 0, fw, img.height))
    bbox = frame0.getbbox()
    if bbox:
        frame0 = frame0.crop(bbox)
    return frame0


def image_to_ink_rgba(img: Image.Image, is_cutout: bool = False, threshold: float = 26.0, gain: float = 2.6) -> Image.Image:
    """
    Converts an RGB/RGBA image into crisp dark charcoal coloring-book line art (R=35, G=25, B=20)
    with a 100% transparent background (alpha = 0 on all non-line areas).
    """
    rgba = img.convert("RGBA")
    arr = np.array(rgba, dtype=np.float32)
    r, g, b, a = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]

    # Perceived luminance
    lum = 0.299 * r + 0.587 * g + 0.114 * b

    # For transparent cutouts, treat transparent background as white so silhouette border produces a bold outer contour
    if is_cutout:
        alpha_norm = a / 255.0
        lum = lum * alpha_norm + 255.0 * (1.0 - alpha_norm)

    lum_img = Image.fromarray(np.clip(lum, 0, 255).astype(np.uint8), mode="L")
    # Slight median/gaussian denoise to suppress fine wood/paper grain while keeping bold illustration contours
    smooth = lum_img.filter(ImageFilter.GaussianBlur(radius=0.9))
    s_arr = np.array(smooth, dtype=np.float32)

    # Sobel gradients
    gx = np.zeros_like(s_arr)
    gy = np.zeros_like(s_arr)
    gx[:, 1:-1] = (
        (s_arr[:, 2:] - s_arr[:, :-2]) * 2.0
        + (np.roll(s_arr, -1, axis=0)[:, 2:] - np.roll(s_arr, -1, axis=0)[:, :-2])
        + (np.roll(s_arr, 1, axis=0)[:, 2:] - np.roll(s_arr, 1, axis=0)[:, :-2])
    ) / 8.0
    gy[1:-1, :] = (
        (s_arr[2:, :] - s_arr[:-2, :]) * 2.0
        + (np.roll(s_arr, -1, axis=1)[2:, :] - np.roll(s_arr, -1, axis=1)[:-2, :])
        + (np.roll(s_arr, 1, axis=1)[2:, :] - np.roll(s_arr, 1, axis=1)[:-2, :])
    ) / 8.0
    grad = np.hypot(gx, gy)

    # Difference of Gaussians (DoG) for crisp comic/pixel-art dark ink lines
    blur_wide = np.array(lum_img.filter(ImageFilter.GaussianBlur(radius=2.6)), dtype=np.float32)
    dog = np.maximum(0.0, blur_wide - s_arr) * 2.2

    edge = np.maximum(grad * 1.35, dog)

    # If cutout, also add bold outer alpha contour so characters have unmistakable coloring outlines
    if is_cutout:
        a_img = Image.fromarray(a.astype(np.uint8), mode="L")
        a_max = np.array(a_img.filter(ImageFilter.MaxFilter(5)), dtype=np.float32)
        a_min = np.array(a_img.filter(ImageFilter.MinFilter(3)), dtype=np.float32)
        silhouette_edge = (a_max - a_min) * 0.75
        # Mask out anything outside dilated alpha
        inside_mask = (a_max > 25).astype(np.float32)
        edge = np.maximum(edge * inside_mask, silhouette_edge)

    # Threshold & contrast stretch so flat areas are 100% alpha=0 and ink lines are bold
    edge_clean = np.clip((edge - threshold) * gain, 0.0, 255.0)
    # Zero out weak speckles
    edge_clean[edge_clean < 38.0] = 0.0

    # Slight dilation for kid-friendly bold coloring lines
    alpha_img = Image.fromarray(edge_clean.astype(np.uint8), mode="L")
    alpha_bold = np.array(alpha_img, dtype=np.float32)
    alpha_dilated = np.array(alpha_img.filter(ImageFilter.MaxFilter(3)), dtype=np.float32)
    final_alpha = np.clip(alpha_bold * 0.65 + alpha_dilated * 0.55, 0.0, 255.0).astype(np.uint8)
    final_alpha[final_alpha < 32] = 0

    out = np.zeros((rgba.height, rgba.width, 4), dtype=np.uint8)
    out[..., 0] = INK_RGB[0]
    out[..., 1] = INK_RGB[1]
    out[..., 2] = INK_RGB[2]
    out[..., 3] = final_alpha
    return Image.fromarray(out, mode="RGBA")


def make_scene_template(bg_filename: str, threshold: float = 28.0, gain: float = 2.75) -> Image.Image:
    """Loads a 1280x720 scene background, resizes/crops to 720x480, and converts to transparent ink line-art."""
    path = os.path.join(NANA_DIR, bg_filename)
    img = Image.open(path).convert("RGB")
    # Center-crop 1280x720 (16:9) slightly horizontally to fit 720x480 (3:2) nicely
    target_ratio = CANVAS_W / CANVAS_H  # 1.5
    crop_w = int(img.height * target_ratio)  # 720 * 1.5 = 1080
    left = (img.width - crop_w) // 2
    cropped = img.crop((left, 0, left + crop_w, img.height)).resize((CANVAS_W, CANVAS_H), Image.Resampling.LANCZOS)
    return image_to_ink_rgba(cropped, is_cutout=False, threshold=threshold, gain=gain)


def paste_fit(canvas: Image.Image, sprite_img: Image.Image, center_x: int, center_y: int, max_w: int, max_h: int) -> None:
    """Scales a cutout image to fit within max_w x max_h and pastes it onto canvas at (center_x, center_y)."""
    scale = min(max_w / max(1, sprite_img.width), max_h / max(1, sprite_img.height))
    nw = max(1, int(sprite_img.width * scale))
    nh = max(1, int(sprite_img.height * scale))
    resized = sprite_img.resize((nw, nh), Image.Resampling.LANCZOS)
    px = center_x - nw // 2
    py = center_y - nh // 2
    canvas.alpha_composite(resized, (px, py))


def add_decorative_ground_lines(canvas: Image.Image) -> None:
    """Adds subtle kid-friendly horizon/cloud/grass coloring contours to character composite pages."""
    arr = np.array(canvas)
    # Keep as pure composite of the characters/props
    return


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)

    # 1. tpl-01-blank.png (Completely transparent 720x480)
    blank = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
    blank.save(os.path.join(OUT_DIR, "tpl-01-blank.png"))
    print("Saved tpl-01-blank.png")

    # 2. tpl-02-sparky-doggie.png (Large centered line-art of Sparky frame 0 & Doggie frame 0 side-by-side)
    comp_sd = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
    sparky_f0 = extract_first_frame(os.path.join(SPRITES_DIR, "p1-sparky.png"), 3)
    doggie_f0 = extract_first_frame(os.path.join(SPRITES_DIR, "p1-doggie.png"), 4)
    paste_fit(comp_sd, sparky_f0, 235, 245, 320, 360)
    paste_fit(comp_sd, doggie_f0, 505, 265, 290, 330)
    tpl_02 = image_to_ink_rgba(comp_sd, is_cutout=True, threshold=20.0, gain=2.8)
    tpl_02.save(os.path.join(OUT_DIR, "tpl-02-sparky-doggie.png"))
    print("Saved tpl-02-sparky-doggie.png")

    # 3. tpl-03-roadster.png (Large centered line-art of Papa's yellow convertible roadster + Sparky & Doggie)
    comp_roadster = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
    car_f0 = extract_first_frame(os.path.join(SPRITES_DIR, "p4-car-doggie.png"), 3)
    sparky_cab = extract_first_frame(os.path.join(SPRITES_DIR, "p4-sparky-cabinet.png"), 3)
    wreath_f0 = extract_first_frame(os.path.join(SPRITES_DIR, "p4-wreath.png"), 3)
    paste_fit(comp_roadster, car_f0, 365, 305, 620, 330)
    paste_fit(comp_roadster, sparky_cab, 175, 115, 210, 170)
    paste_fit(comp_roadster, wreath_f0, 545, 110, 185, 160)
    tpl_03 = image_to_ink_rgba(comp_roadster, is_cutout=True, threshold=20.0, gain=2.8)
    tpl_03.save(os.path.join(OUT_DIR, "tpl-03-roadster.png"))
    print("Saved tpl-03-roadster.png")

    # 4. tpl-04-tugboat.png (Grand Haven Boat / Sailboat + Seagulls + Sandcastle + Beach Ball)
    comp_boat = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
    sailboat_f0 = extract_first_frame(os.path.join(SPRITES_DIR, "p7-sailboat-horizon.png"), 3)
    seagulls_f0 = extract_first_frame(os.path.join(SPRITES_DIR, "p7-seagulls-bucket.png"), 3)
    sandcastle_f0 = extract_first_frame(os.path.join(SPRITES_DIR, "p7-kids-sandcastle.png"), 3)
    ball_f0 = extract_first_frame(os.path.join(SPRITES_DIR, "p7-beach-ball.png"), 3)
    paste_fit(comp_boat, sailboat_f0, 230, 175, 310, 260)
    paste_fit(comp_boat, seagulls_f0, 520, 175, 270, 230)
    paste_fit(comp_boat, sandcastle_f0, 260, 360, 310, 210)
    paste_fit(comp_boat, ball_f0, 545, 360, 210, 200)
    tpl_04 = image_to_ink_rgba(comp_boat, is_cutout=True, threshold=20.0, gain=2.8)
    tpl_04.save(os.path.join(OUT_DIR, "tpl-04-tugboat.png"))
    print("Saved tpl-04-tugboat.png")

    # 5. tpl-05-windmill.png (Dutch Village windmill & tulip garden `p6-bg.jpg`)
    tpl_05 = make_scene_template("p6-bg.jpg", threshold=29.0, gain=2.7)
    tpl_05.save(os.path.join(OUT_DIR, "tpl-05-windmill.png"))
    print("Saved tpl-05-windmill.png")

    # 6. tpl-06-airport.png (Grand Rapids Airport `p1-bg.jpg`)
    tpl_06 = make_scene_template("p1-bg.jpg", threshold=28.0, gain=2.7)
    tpl_06.save(os.path.join(OUT_DIR, "tpl-06-airport.png"))
    print("Saved tpl-06-airport.png")

    # 7. tpl-07-nanas-house.png (Nana & Papa's porch & yard `p2-bg.jpg`)
    tpl_07 = make_scene_template("p2-bg.jpg", threshold=29.0, gain=2.7)
    tpl_07.save(os.path.join(OUT_DIR, "tpl-07-nanas-house.png"))
    print("Saved tpl-07-nanas-house.png")

    # 8. tpl-08-garage.png (Papa's Garage & yellow roadster `p4-bg.jpg`)
    tpl_08 = make_scene_template("p4-bg.jpg", threshold=29.0, gain=2.7)
    tpl_08.save(os.path.join(OUT_DIR, "tpl-08-garage.png"))
    print("Saved tpl-08-garage.png")

    # 9. tpl-09-beach.png (Lake Michigan Beach & lighthouse `p7-bg.jpg`)
    tpl_09 = make_scene_template("p7-bg.jpg", threshold=28.0, gain=2.7)
    tpl_09.save(os.path.join(OUT_DIR, "tpl-09-beach.png"))
    print("Saved tpl-09-beach.png")

    # 10. tpl-10-cabin.png (Woodland Cabin, kayak & tractor `p8-bg.jpg`)
    tpl_10 = make_scene_template("p8-bg.jpg", threshold=29.0, gain=2.7)
    tpl_10.save(os.path.join(OUT_DIR, "tpl-10-cabin.png"))
    print("Saved tpl-10-cabin.png")

    # 11. tpl-11-critters.png (Composite large centered line-art of Blue Jay, Squirrel, Deer, and Seagulls/Crab)
    comp_critters = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
    bluejay_f0 = extract_first_frame(os.path.join(SPRITES_DIR, "p8-bluejay-porch.png"), 3)
    squirrel_f0 = extract_first_frame(os.path.join(SPRITES_DIR, "p2-squirrel.png"), 3)
    deer_f0 = extract_first_frame(os.path.join(SPRITES_DIR, "p8-forest-deer.png"), 3)
    stork_f0 = extract_first_frame(os.path.join(SPRITES_DIR, "p6-chimney-stork.png"), 3)
    paste_fit(comp_critters, bluejay_f0, 195, 145, 250, 210)
    paste_fit(comp_critters, squirrel_f0, 520, 145, 260, 210)
    paste_fit(comp_critters, deer_f0, 205, 355, 270, 220)
    paste_fit(comp_critters, stork_f0, 520, 355, 260, 220)
    tpl_11 = image_to_ink_rgba(comp_critters, is_cutout=True, threshold=20.0, gain=2.8)
    tpl_11.save(os.path.join(OUT_DIR, "tpl-11-critters.png"))
    print("Saved tpl-11-critters.png")

    # 12. tpl-12-bedtime.png (Spread 9 Cozy Bedtime room `p9-bg.jpg`)
    tpl_12 = make_scene_template("p9-bg.jpg", threshold=27.0, gain=2.75)
    tpl_12.save(os.path.join(OUT_DIR, "tpl-12-bedtime.png"))
    print("Saved tpl-12-bedtime.png")


if __name__ == "__main__":
    main()
