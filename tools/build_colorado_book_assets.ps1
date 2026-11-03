$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$csharpCode = @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;

public class ColoradoBookAssetBuilder
{
    private static bool IsBorderMagenta(int r, int g, int b)
    {
        return r > 140 && g < 118 && b > 125 && ((r - g) + (b - g)) > 115 && b > g + 30;
    }

    private static bool IsInteriorMagentaHole(int r, int g, int b)
    {
        return r > 165 && g < 75 && b > 160 && Math.Abs(r - b) < 42 && (r + b - 2 * g) > 210;
    }

    public static void BuildCharacterReferenceCrops(string refsDir)
    {
        string coverPath = Path.Combine(refsDir, "COVER.jpg");
        string p3Path = Path.Combine(refsDir, "3.jpg");
        if (File.Exists(coverPath) && File.Exists(p3Path))
        {
            using (Bitmap cover = new Bitmap(coverPath))
            using (Bitmap p3 = new Bitmap(p3Path))
            using (Bitmap gb = new Bitmap(1200, 700, PixelFormat.Format24bppRgb))
            {
                using (Graphics g = Graphics.FromImage(gb))
                {
                    g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                    g.SmoothingMode = SmoothingMode.HighQuality;
                    Rectangle srcCover = new Rectangle(
                        (int)(cover.Width * 0.63),
                        (int)(cover.Height * 0.05),
                        (int)(cover.Width * 0.34),
                        (int)(cover.Height * 0.68)
                    );
                    Rectangle srcP3 = new Rectangle(
                        0,
                        (int)(p3.Height * 0.05),
                        (int)(p3.Width * 0.55),
                        (int)(p3.Height * 0.90)
                    );
                    g.DrawImage(cover, new Rectangle(0, 0, 600, 700), srcCover, GraphicsUnit.Pixel);
                    g.DrawImage(p3, new Rectangle(600, 0, 600, 700), srcP3, GraphicsUnit.Pixel);
                }
                string outGb = Path.Combine(refsDir, "ref_grandpa_babci.jpg");
                gb.Save(outGb, ImageFormat.Jpeg);
                Console.WriteLine("[Saved Ref Crop] " + outGb);
            }
        }

        string p1Path = Path.Combine(refsDir, "1.jpg");
        string p7Path = Path.Combine(refsDir, "7-1.jpg");
        if (File.Exists(p1Path) && File.Exists(p7Path))
        {
            using (Bitmap p1 = new Bitmap(p1Path))
            using (Bitmap p7 = new Bitmap(p7Path))
            using (Bitmap fam = new Bitmap(1200, 700, PixelFormat.Format24bppRgb))
            {
                using (Graphics g = Graphics.FromImage(fam))
                {
                    g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                    g.SmoothingMode = SmoothingMode.HighQuality;
                    Rectangle srcP1 = new Rectangle(
                        (int)(p1.Width * 0.25),
                        (int)(p1.Height * 0.18),
                        (int)(p1.Width * 0.38),
                        (int)(p1.Height * 0.68)
                    );
                    Rectangle srcP7 = new Rectangle(
                        (int)(p7.Width * 0.12),
                        (int)(p7.Height * 0.10),
                        (int)(p7.Width * 0.78),
                        (int)(p7.Height * 0.70)
                    );
                    g.DrawImage(p1, new Rectangle(0, 0, 600, 700), srcP1, GraphicsUnit.Pixel);
                    g.DrawImage(p7, new Rectangle(600, 0, 600, 700), srcP7, GraphicsUnit.Pixel);
                }
                string outFam = Path.Combine(refsDir, "ref_immediate_family.jpg");
                fam.Save(outFam, ImageFormat.Jpeg);
                Console.WriteLine("[Saved Ref Crop] " + outFam);
            }
        }
    }

    public static void SavePagePlate1280x720(string rawPath, string outPath)
    {
        if (!File.Exists(rawPath)) return;
        using (Bitmap src = new Bitmap(rawPath))
        using (Bitmap dst = new Bitmap(1280, 720, PixelFormat.Format24bppRgb))
        {
            using (Graphics g = Graphics.FromImage(dst))
            {
                g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                g.SmoothingMode = SmoothingMode.HighQuality;
                g.PixelOffsetMode = PixelOffsetMode.HighQuality;
                g.DrawImage(src, new Rectangle(0, 0, 1280, 720));
            }
            Directory.CreateDirectory(Path.GetDirectoryName(outPath));
            dst.Save(outPath, ImageFormat.Png);
            Console.WriteLine("[Saved Page 1280x720] " + outPath);
        }
    }

    public static void SliceCutoutBook(string rawPath, string[] outPaths)
    {
        if (!File.Exists(rawPath)) return;
        using (Bitmap src = new Bitmap(rawPath))
        using (Bitmap cropped = CleanMagentaCell(src, new Rectangle(0, 0, src.Width, src.Height), false))
        {
            foreach (string outPath in outPaths)
            {
                Directory.CreateDirectory(Path.GetDirectoryName(outPath));
                cropped.Save(outPath, ImageFormat.Png);
                Console.WriteLine(string.Format("[Saved Book Cover] {0} ({1}x{2})", outPath, cropped.Width, cropped.Height));
            }
        }
    }

    public static void SliceSheet2x2(string rawPath, string outDir, string[] names)
    {
        if (!File.Exists(rawPath)) return;
        Directory.CreateDirectory(outDir);
        using (Bitmap src = new Bitmap(rawPath))
        {
            int sw = src.Width;
            int sh = src.Height;
            int cw = sw / 2;
            int ch = sh / 2;

            for (int i = 0; i < names.Length && i < 4; i++)
            {
                int r = i / 2;
                int c = i % 2;
                Rectangle cellRect = new Rectangle(c * cw, r * ch, cw, ch);
                using (Bitmap cropped = CleanMagentaCell(src, cellRect, true))
                {
                    string outPath = Path.Combine(outDir, names[i]);
                    cropped.Save(outPath, ImageFormat.Png);
                    Console.WriteLine(string.Format("[Saved 2x2 Hi-Res Sprite] {0} ({1}x{2})", outPath, cropped.Width, cropped.Height));
                }
            }
        }
    }

    public static void SliceSheet4x4(string rawPath, string outDir, string[] names)
    {
        if (!File.Exists(rawPath)) return;
        Directory.CreateDirectory(outDir);
        using (Bitmap src = new Bitmap(rawPath))
        {
            int sw = src.Width;
            int sh = src.Height;
            int cw = sw / 4;
            int ch = sh / 4;

            for (int i = 0; i < names.Length && i < 16; i++)
            {
                int r = i / 4;
                int c = i % 4;
                Rectangle cellRect = new Rectangle(c * cw, r * ch, cw, ch);
                using (Bitmap cropped = CleanMagentaCell(src, cellRect, true))
                {
                    string outPath = Path.Combine(outDir, names[i]);
                    cropped.Save(outPath, ImageFormat.Png);
                    Console.WriteLine(string.Format("[Saved Sprite] {0} ({1}x{2})", outPath, cropped.Width, cropped.Height));
                }
            }
        }
    }

    private static Bitmap CleanMagentaCell(Bitmap src, Rectangle cellRect, bool clearInteriorHoles)
    {
        int w = cellRect.Width;
        int h = cellRect.Height;
        Bitmap cell = new Bitmap(w, h, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(cell))
        {
            g.DrawImage(src, new Rectangle(0, 0, w, h), cellRect, GraphicsUnit.Pixel);
        }

        BitmapData data = cell.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
        int stride = data.Stride;
        byte[] buf = new byte[stride * h];
        Marshal.Copy(data.Scan0, buf, 0, buf.Length);

        bool[] visited = new bool[w * h];
        Queue<int> q = new Queue<int>();

        for (int x = 0; x < w; x++)
        {
            int[] ys = new int[] { 0, h - 1 };
            foreach (int y in ys)
            {
                int idx = y * w + x;
                if (!visited[idx])
                {
                    int off = y * stride + x * 4;
                    if (IsBorderMagenta(buf[off + 2], buf[off + 1], buf[off]))
                    {
                        visited[idx] = true;
                        q.Enqueue(idx);
                    }
                }
            }
        }

        for (int y = 0; y < h; y++)
        {
            int[] xs = new int[] { 0, w - 1 };
            foreach (int x in xs)
            {
                int idx = y * w + x;
                if (!visited[idx])
                {
                    int off = y * stride + x * 4;
                    if (IsBorderMagenta(buf[off + 2], buf[off + 1], buf[off]))
                    {
                        visited[idx] = true;
                        q.Enqueue(idx);
                    }
                }
            }
        }

        int[] dx4 = new int[] { -1, 1, 0, 0 };
        int[] dy4 = new int[] { 0, 0, -1, 1 };

        while (q.Count > 0)
        {
            int curr = q.Dequeue();
            int cx = curr % w;
            int cy = curr / w;
            int coff = cy * stride + cx * 4;
            buf[coff] = 0;
            buf[coff + 1] = 0;
            buf[coff + 2] = 0;
            buf[coff + 3] = 0;

            for (int d = 0; d < 4; d++)
            {
                int nx = cx + dx4[d];
                int ny = cy + dy4[d];
                if (nx >= 0 && nx < w && ny >= 0 && ny < h)
                {
                    int nidx = ny * w + nx;
                    if (!visited[nidx])
                    {
                        int noff = ny * stride + nx * 4;
                        if (IsBorderMagenta(buf[noff + 2], buf[noff + 1], buf[noff]))
                        {
                            visited[nidx] = true;
                            q.Enqueue(nidx);
                        }
                    }
                }
            }
        }

        // Clear enclosed interior magenta holes on sprite sheets
        if (clearInteriorHoles)
        {
            for (int y = 1; y < h - 1; y++)
            {
                for (int x = 1; x < w - 1; x++)
                {
                    int off = y * stride + x * 4;
                    if (buf[off + 3] == 0) continue;
                    if (IsInteriorMagentaHole(buf[off + 2], buf[off + 1], buf[off]))
                    {
                        buf[off] = 0;
                        buf[off + 1] = 0;
                        buf[off + 2] = 0;
                        buf[off + 3] = 0;
                    }
                }
            }
        }

        // 2-pass 2px perimeter de-spill
        for (int pass = 0; pass < 2; pass++)
        {
            for (int y = 0; y < h; y++)
            {
                for (int x = 0; x < w; x++)
                {
                    int off = y * stride + x * 4;
                    if (buf[off + 3] == 0) continue;

                    bool nearTrans = false;
                    for (int dy = -2; dy <= 2 && !nearTrans; dy++)
                    {
                        for (int dx = -2; dx <= 2; dx++)
                        {
                            int nx = x + dx;
                            int ny = y + dy;
                            if (nx < 0 || nx >= w || ny < 0 || ny >= h)
                            {
                                nearTrans = true;
                                break;
                            }
                            if (buf[ny * stride + nx * 4 + 3] == 0)
                            {
                                nearTrans = true;
                                break;
                            }
                        }
                    }

                    if (nearTrans)
                    {
                        int b = buf[off];
                        int g = buf[off + 1];
                        int r = buf[off + 2];
                        if (r > g + 22 && b > g + 22)
                        {
                            if (r > 155 && b > 140 && (r + b - 2 * g) > 150)
                            {
                                buf[off] = 0;
                                buf[off + 1] = 0;
                                buf[off + 2] = 0;
                                buf[off + 3] = 0;
                            }
                            else
                            {
                                byte neutral = (byte)Math.Min(255, (int)(g * 0.85 + Math.Min(r, b) * 0.15));
                                buf[off] = neutral;
                                buf[off + 2] = neutral;
                                buf[off + 3] = (byte)Math.Min((int)buf[off + 3], 210);
                            }
                        }
                    }
                }
            }
        }

        int minX = w, minY = h, maxX = -1, maxY = -1;
        // Remove tiny stray isolated specks (<= 9 opaque pixels in a 7x7 window)
        for (int y = 0; y < h; y++)
        {
            for (int x = 0; x < w; x++)
            {
                int off = y * stride + x * 4;
                if (buf[off + 3] == 0) continue;
                int opaqueNeighbors = 0;
                for (int dy = -3; dy <= 3; dy++)
                {
                    int ny = y + dy;
                    if (ny < 0 || ny >= h) continue;
                    for (int dx = -3; dx <= 3; dx++)
                    {
                        int nx = x + dx;
                        if (nx < 0 || nx >= w) continue;
                        if (buf[ny * stride + nx * 4 + 3] > 16) opaqueNeighbors++;
                    }
                }
                if (opaqueNeighbors <= 10)
                {
                    buf[off] = 0;
                    buf[off + 1] = 0;
                    buf[off + 2] = 0;
                    buf[off + 3] = 0;
                }
            }
        }

        for (int y = 0; y < h; y++)
        {
            for (int x = 0; x < w; x++)
            {
                int off = y * stride + x * 4;
                if (buf[off + 3] > 16)
                {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }

        Marshal.Copy(buf, 0, data.Scan0, buf.Length);
        cell.UnlockBits(data);

        if (maxX < minX || maxY < minY)
        {
            return cell;
        }

        int pad = 4;
        int cx0 = Math.Max(0, minX - pad);
        int cy0 = Math.Max(0, minY - pad);
        int cx1 = Math.Min(w - 1, maxX + pad);
        int cy1 = Math.Min(h - 1, maxY + pad);
        int cw2 = cx1 - cx0 + 1;
        int ch2 = cy1 - cy0 + 1;

        Bitmap cropped = new Bitmap(cw2, ch2, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(cropped))
        {
            g.DrawImage(cell, new Rectangle(0, 0, cw2, ch2), new Rectangle(cx0, cy0, cw2, ch2), GraphicsUnit.Pixel);
        }
        cell.Dispose();
        return cropped;
    }
}
"@

Add-Type -TypeDefinition $csharpCode -ReferencedAssemblies System.Drawing

$refsDir = "public/assets/stories/colorado/refs"
$rawDir = "public/assets/stories/colorado/raw"
$pagesDir = "public/assets/stories/colorado/pages"
$spritesDir = "public/assets/stories/colorado/sprites"

# 0. Build Character Likeness Reference Crops (ref_grandpa_babci.jpg & ref_immediate_family.jpg)
[ColoradoBookAssetBuilder]::BuildCharacterReferenceCrops($refsDir)

# 1. Book Cover Cutout
[ColoradoBookAssetBuilder]::SliceCutoutBook(
    "$rawDir/book-cover-colorado-raw.jpg",
    @(
        "$pagesDir/book-cover-colorado.png",
        "public/assets/stories/colorado/book-cover-colorado.png",
        "public/assets/hub/sprites/book-cover-colorado.png"
    )
)

# 2. All 10 1280x720 Page Backgrounds (p0-cover.png + p1..p9)
$pageMappings = @(
    @("p0-cover-raw.jpg", "p0-cover.png"),
    @("p1-roadtrip-raw.jpg", "p1-roadtrip.png"),
    @("p2-house-raw.jpg", "p2-house.png"),
    @("p3-arcade-raw.jpg", "p3-arcade.png"),
    @("p4-canyon-raw.jpg", "p4-canyon.png"),
    @("p5-bridge-raw.jpg", "p5-bridge.png"),
    @("p6-train-raw.jpg", "p6-train.png"),
    @("p7-gods-raw.jpg", "p7-gods.png"),
    @("p8-backyard-raw.jpg", "p8-backyard.png"),
    @("p9-kitchen-raw.jpg", "p9-kitchen.png")
)

foreach ($pair in $pageMappings) {
    [ColoradoBookAssetBuilder]::SavePagePlate1280x720("$rawDir/$($pair[0])", "$pagesDir/$($pair[1])")
}

# 3. 3x 4x4 Interactive Sprite Sheets
$sheet1Names = @(
    "spr-thule-box.png", "spr-subaru-wheel.png", "spr-hawk.png", "spr-wyatt-emma-wave.png",
    "spr-grandpa-babci-wave.png", "spr-front-door.png", "spr-butterflies.png", "spr-doggie-bush.png",
    "spr-claw-plush.png", "spr-skeeball.png", "spr-arcade-pony.png", "spr-neon-star.png",
    "spr-trout.png", "spr-water-splash.png", "spr-emma-splash.png", "spr-chipmunk.png"
)
[ColoradoBookAssetBuilder]::SliceSheet4x4("$rawDir/colorado-sprites-1-raw.jpg", $spritesDir, $sheet1Names)

$sheet2Names = @(
    "spr-gondola.png", "spr-eagle.png", "spr-co-flag.png", "spr-train-horn.png",
    "spr-steam-puff.png", "spr-conductor-hat.png", "spr-kayak.png", "spr-climber.png",
    "spr-camels-glow.png", "spr-bunny.png", "spr-sparky-rock.png", "spr-wagon-ride.png",
    "spr-golf-ball.png", "spr-golf-flag.png", "spr-pierogi-pan.png", "spr-flour-puff.png"
)
[ColoradoBookAssetBuilder]::SliceSheet4x4("$rawDir/colorado-sprites-2-raw.jpg", $spritesDir, $sheet2Names)

$sheet3Names = @(
    "spr-pierogi-plate.png", "spr-babci-hug.png", "spr-doggie-chef.png", "spr-sparky-chef.png",
    "spr-compass.png", "spr-lavender-box.png", "spr-ticket-burst.png", "spr-creel-basket.png",
    "spr-binoculars.png", "spr-rail-lantern.png", "spr-bluebird.png", "spr-columbine-pot.png",
    "spr-potato-cheese-bowl.png", "spr-arrow-left.png", "spr-arrow-right.png", "spr-mountain-crest.png"
)
[ColoradoBookAssetBuilder]::SliceSheet4x4("$rawDir/colorado-sprites-3-raw.jpg", $spritesDir, $sheet3Names)

# 4. 2x2 True-Likeness High-Resolution Moving Actors Sheet (overwrites key actors with 512x512 cell cutouts)
$actors2x2Names = @(
    "spr-grandpa-babci-wave.png",
    "spr-wagon-ride.png",
    "spr-thule-box.png",
    "spr-train-horn.png"
)
[ColoradoBookAssetBuilder]::SliceSheet2x2("$rawDir/colorado-actors-clean-raw.jpg", $spritesDir, $actors2x2Names)
