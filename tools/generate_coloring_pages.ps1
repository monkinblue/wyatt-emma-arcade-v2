Add-Type -AssemblyName System.Drawing

$code = @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Drawing.Drawing2D;
using System.Runtime.InteropServices;

public static class ColoringGenerator {
    public static Bitmap ExtractInkLineArt(Bitmap src, bool isCutout, float threshold, float gain) {
        int W = src.Width;
        int H = src.Height;
        Bitmap argb = new Bitmap(W, H, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(argb)) {
            g.DrawImage(src, 0, 0, W, H);
        }

        Rectangle rect = new Rectangle(0, 0, W, H);
        BitmapData data = argb.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
        int stride = data.Stride;
        byte[] bytes = new byte[stride * H];
        Marshal.Copy(data.Scan0, bytes, 0, bytes.Length);

        float[] lum = new float[W * H];
        float[] alphaArr = new float[W * H];

        for (int y = 0; y < H; y++) {
            for (int x = 0; x < W; x++) {
                int idx = y * W + x;
                int off = idx * 4;
                float b = bytes[off];
                float g = bytes[off + 1];
                float r = bytes[off + 2];
                float a = bytes[off + 3];
                alphaArr[idx] = a;
                float l = 0.299f * r + 0.587f * g + 0.114f * b;
                if (isCutout) {
                    float an = a / 255.0f;
                    l = l * an + 255.0f * (1.0f - an);
                }
                lum[idx] = l;
            }
        }

        // 3x3 Gaussian blur (smooth) and 5x5 wide blur for Difference-of-Gaussians
        float[] smooth = new float[W * H];
        for (int y = 1; y < H - 1; y++) {
            for (int x = 1; x < W - 1; x++) {
                int idx = y * W + x;
                float sum =
                    lum[idx - W - 1] * 1f + lum[idx - W] * 2f + lum[idx - W + 1] * 1f +
                    lum[idx - 1]     * 2f + lum[idx]     * 4f + lum[idx + 1]     * 2f +
                    lum[idx + W - 1] * 1f + lum[idx + W] * 2f + lum[idx + W + 1] * 1f;
                smooth[idx] = sum / 16.0f;
            }
        }

        float[] wide = new float[W * H];
        for (int y = 2; y < H - 2; y++) {
            for (int x = 2; x < W - 2; x++) {
                float s = 0f;
                for (int dy = -2; dy <= 2; dy++) {
                    for (int dx = -2; dx <= 2; dx++) {
                        s += lum[(y + dy) * W + (x + dx)];
                    }
                }
                wide[y * W + x] = s / 25.0f;
            }
        }

        float[] edge = new float[W * H];
        for (int y = 2; y < H - 2; y++) {
            for (int x = 2; x < W - 2; x++) {
                int idx = y * W + x;
                float gx = (
                    (smooth[idx - W + 1] - smooth[idx - W - 1]) +
                    2f * (smooth[idx + 1] - smooth[idx - 1]) +
                    (smooth[idx + W + 1] - smooth[idx + W - 1])
                ) / 4.0f;
                float gy = (
                    (smooth[idx + W - 1] - smooth[idx - W - 1]) +
                    2f * (smooth[idx + W] - smooth[idx - W]) +
                    (smooth[idx + W + 1] - smooth[idx - W + 1])
                ) / 4.0f;
                float grad = (float)Math.Sqrt(gx * gx + gy * gy);
                float dog = Math.Max(0f, wide[idx] - smooth[idx]) * 2.2f;
                float e = Math.Max(grad * 1.25f, dog);

                if (isCutout) {
                    float aMax = 0f;
                    float aMin = 255f;
                    for (int dy = -2; dy <= 2; dy++) {
                        for (int dx = -2; dx <= 2; dx++) {
                            float av = alphaArr[(y + dy) * W + (x + dx)];
                            if (av > aMax) aMax = av;
                            if (Math.Abs(dx) <= 1 && Math.Abs(dy) <= 1 && av < aMin) aMin = av;
                        }
                    }
                    float sil = (aMax - aMin) * 0.75f;
                    if (aMax <= 25f) {
                        e = 0f;
                    } else {
                        e = Math.Max(e, sil);
                    }
                }

                float clean = (e - threshold) * gain;
                if (clean < 38f) clean = 0f;
                if (clean > 255f) clean = 255f;
                edge[idx] = clean;
            }
        }

        // Slight 3x3 dilation for bold kid-friendly coloring lines
        for (int y = 0; y < H; y++) {
            for (int x = 0; x < W; x++) {
                int idx = y * W + x;
                float maxN = edge[idx];
                if (x > 0 && x < W - 1 && y > 0 && y < H - 1) {
                    for (int dy = -1; dy <= 1; dy++) {
                        for (int dx = -1; dx <= 1; dx++) {
                            float v = edge[(y + dy) * W + (x + dx)];
                            if (v > maxN) maxN = v;
                        }
                    }
                }
                float finalA = edge[idx] * 0.65f + maxN * 0.55f;
                if (finalA < 34f) finalA = 0f;
                if (finalA > 255f) finalA = 255f;

                int off = idx * 4;
                // Dark charcoal ink: R=35, G=25, B=20
                bytes[off]     = 20;
                bytes[off + 1] = 25;
                bytes[off + 2] = 35;
                bytes[off + 3] = (byte)finalA;
            }
        }

        Marshal.Copy(bytes, 0, data.Scan0, bytes.Length);
        argb.UnlockBits(data);
        return argb;
    }

    public static Rectangle GetTrimBounds(Bitmap bmp, int xStart, int xEnd) {
        int W = bmp.Width;
        int H = bmp.Height;
        BitmapData data = bmp.LockBits(new Rectangle(0, 0, W, H), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
        byte[] bytes = new byte[data.Stride * H];
        Marshal.Copy(data.Scan0, bytes, 0, bytes.Length);
        bmp.UnlockBits(data);

        int minX = xEnd, maxX = xStart, minY = H - 1, maxY = 0;
        for (int y = 0; y < H; y++) {
            for (int x = xStart; x <= xEnd; x++) {
                byte a = bytes[(y * W + x) * 4 + 3];
                if (a > 20) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }
        if (maxX < minX || maxY < minY) return new Rectangle(xStart, 0, Math.Max(1, xEnd - xStart), H);
        return new Rectangle(minX, minY, maxX - minX + 1, maxY - minY + 1);
    }
}
"@

Add-Type -TypeDefinition $code -ReferencedAssemblies System.Drawing

$rootDir = "c:\projects\Wyatt and Emma Arcade v2"
$nanaDir = Join-Path $rootDir "public\assets\stories\nana"
$spritesDir = Join-Path $nanaDir "sprites"
$outDir = Join-Path $rootDir "public\assets\games\art-studio\templates"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$CW = 936
$CH = 560

function Paste-FirstFrame([System.Drawing.Graphics]$g, [string]$spriteFile, [int]$numFrames, [int]$cx, [int]$cy, [int]$maxW, [int]$maxH) {
    $path = Join-Path $spritesDir $spriteFile
    $src = New-Object System.Drawing.Bitmap($path)
    $argb = New-Object System.Drawing.Bitmap($src.Width, $src.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $gTmp = [System.Drawing.Graphics]::FromImage($argb)
    $gTmp.DrawImage($src, 0, 0, $src.Width, $src.Height)
    $gTmp.Dispose()
    $src.Dispose()

    $fw = [int]($argb.Width / $numFrames)
    $bounds = [ColoringGenerator]::GetTrimBounds($argb, 0, $fw - 1)
    $scale = [Math]::Min($maxW / [double]$bounds.Width, $maxH / [double]$bounds.Height)
    $dw = [Math]::Max(1, [int]($bounds.Width * $scale))
    $dh = [Math]::Max(1, [int]($bounds.Height * $scale))
    $dx = [int]($cx - $dw / 2)
    $dy = [int]($cy - $dh / 2)

    $destRect = New-Object System.Drawing.Rectangle($dx, $dy, $dw, $dh)
    $g.DrawImage($argb, $destRect, $bounds, [System.Drawing.GraphicsUnit]::Pixel)
    $argb.Dispose()
}

function Save-SceneTemplate([string]$bgFile, [string]$outFile, [float]$thresh = 28.0, [float]$gain = 2.65) {
    $path = Join-Path $nanaDir $bgFile
    $src = New-Object System.Drawing.Bitmap($path)
    $resized = New-Object System.Drawing.Bitmap($CW, $CH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($resized)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $cropW = [int]($src.Height * ($CW / [double]$CH))
    if ($cropW -gt $src.Width) { $cropW = $src.Width }
    $left = [int](($src.Width - $cropW) / 2)
    $srcRect = New-Object System.Drawing.Rectangle($left, 0, $cropW, $src.Height)
    $destRect = New-Object System.Drawing.Rectangle(0, 0, $CW, $CH)
    $g.DrawImage($src, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()
    $src.Dispose()

    $ink = [ColoringGenerator]::ExtractInkLineArt($resized, $false, $thresh, $gain)
    $resized.Dispose()
    $outPath = Join-Path $outDir $outFile
    $ink.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $ink.Dispose()
    Write-Host "Saved $outFile (${CW}x${CH})"
}

# 1. tpl-01-blank.png
$blank = New-Object System.Drawing.Bitmap($CW, $CH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gBlank = [System.Drawing.Graphics]::FromImage($blank)
$gBlank.Clear([System.Drawing.Color]::Transparent)
$gBlank.Dispose()
$blank.Save((Join-Path $outDir "tpl-01-blank.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$blank.Dispose()
Write-Host "Saved tpl-01-blank.png (${CW}x${CH})"

# 2. tpl-02-sparky-doggie.png
$comp2 = New-Object System.Drawing.Bitmap($CW, $CH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g2 = [System.Drawing.Graphics]::FromImage($comp2)
$g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g2.Clear([System.Drawing.Color]::Transparent)
Paste-FirstFrame $g2 "p1-sparky.png" 3 300 280 390 430
Paste-FirstFrame $g2 "p1-doggie.png" 4 655 300 350 395
$g2.Dispose()
$ink2 = [ColoringGenerator]::ExtractInkLineArt($comp2, $true, 20.0, 2.8)
$comp2.Dispose()
$ink2.Save((Join-Path $outDir "tpl-02-sparky-doggie.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$ink2.Dispose()
Write-Host "Saved tpl-02-sparky-doggie.png (${CW}x${CH})"

# 3. tpl-03-roadster.png
$comp3 = New-Object System.Drawing.Bitmap($CW, $CH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g3 = [System.Drawing.Graphics]::FromImage($comp3)
$g3.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g3.Clear([System.Drawing.Color]::Transparent)
Paste-FirstFrame $g3 "p4-car-doggie.png" 3 468 355 780 390
Paste-FirstFrame $g3 "p4-sparky-cabinet.png" 3 230 125 255 195
Paste-FirstFrame $g3 "p4-wreath.png" 3 705 120 225 185
$g3.Dispose()
$ink3 = [ColoringGenerator]::ExtractInkLineArt($comp3, $true, 20.0, 2.8)
$comp3.Dispose()
$ink3.Save((Join-Path $outDir "tpl-03-roadster.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$ink3.Dispose()
Write-Host "Saved tpl-03-roadster.png (${CW}x${CH})"

# 4. tpl-04-tugboat.png
$comp4 = New-Object System.Drawing.Bitmap($CW, $CH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g4 = [System.Drawing.Graphics]::FromImage($comp4)
$g4.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g4.Clear([System.Drawing.Color]::Transparent)
Paste-FirstFrame $g4 "p7-sailboat-horizon.png" 3 295 190 375 290
Paste-FirstFrame $g4 "p7-seagulls-bucket.png" 3 675 190 330 265
Paste-FirstFrame $g4 "p7-kids-sandcastle.png" 3 330 420 395 245
Paste-FirstFrame $g4 "p7-beach-ball.png" 3 705 420 255 230
$g4.Dispose()
$ink4 = [ColoringGenerator]::ExtractInkLineArt($comp4, $true, 20.0, 2.8)
$comp4.Dispose()
$ink4.Save((Join-Path $outDir "tpl-04-tugboat.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$ink4.Dispose()
Write-Host "Saved tpl-04-tugboat.png (${CW}x${CH})"

# 5..10 & 12: Scene Templates
Save-SceneTemplate "p6-bg.jpg" "tpl-05-windmill.png" 29.0 2.65
Save-SceneTemplate "p1-bg.jpg" "tpl-06-airport.png" 28.0 2.65
Save-SceneTemplate "p2-bg.jpg" "tpl-07-nanas-house.png" 29.0 2.65
Save-SceneTemplate "p4-bg.jpg" "tpl-08-garage.png" 29.0 2.65
Save-SceneTemplate "p7-bg.jpg" "tpl-09-beach.png" 28.0 2.65
Save-SceneTemplate "p8-bg.jpg" "tpl-10-cabin.png" 29.0 2.65

# 11. tpl-11-critters.png
$comp11 = New-Object System.Drawing.Bitmap($CW, $CH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g11 = [System.Drawing.Graphics]::FromImage($comp11)
$g11.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g11.Clear([System.Drawing.Color]::Transparent)
Paste-FirstFrame $g11 "p8-bluejay-porch.png" 3 255 165 320 245
Paste-FirstFrame $g11 "p2-squirrel.png" 3 680 165 335 245
Paste-FirstFrame $g11 "p8-forest-deer.png" 3 265 415 345 255
Paste-FirstFrame $g11 "p6-chimney-stork.png" 3 680 415 335 255
$g11.Dispose()
$ink11 = [ColoringGenerator]::ExtractInkLineArt($comp11, $true, 20.0, 2.8)
$comp11.Dispose()
$ink11.Save((Join-Path $outDir "tpl-11-critters.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$ink11.Dispose()
Write-Host "Saved tpl-11-critters.png (${CW}x${CH})"

# 12. tpl-12-bedtime.png
Save-SceneTemplate "p9-bg.jpg" "tpl-12-bedtime.png" 27.0 2.7
