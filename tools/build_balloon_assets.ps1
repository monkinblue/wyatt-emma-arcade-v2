Add-Type -AssemblyName System.Drawing

$csharpCode = @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;

public static class BalloonAssetBuilder
{
    private static bool IsBorderMagenta(int r, int g, int b)
    {
        return r > 165 && g < 115 && b > 165 && ((r - g) + (b - g)) > 150;
    }

    private static bool IsInteriorMagentaHole(int r, int g, int b)
    {
        return r > 195 && g < 75 && b > 195 && (r + b - 2 * g) > 250;
    }

    public static Bitmap ClearMagentaAndDespill(Bitmap src, bool clearInteriorHoles)
    {
        int w = src.Width;
        int h = src.Height;
        Bitmap bmp = new Bitmap(w, h, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(bmp))
        {
            g.DrawImage(src, 0, 0, w, h);
        }

        Rectangle rect = new Rectangle(0, 0, w, h);
        BitmapData data = bmp.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
        int stride = data.Stride;
        byte[] bytes = new byte[stride * h];
        Marshal.Copy(data.Scan0, bytes, 0, bytes.Length);

        bool[] visited = new bool[w * h];
        Queue<int> q = new Queue<int>();

        // 1. Seed outer borders
        for (int x = 0; x < w; x++)
        {
            int[] ys = new int[] { 0, h - 1 };
            foreach (int y in ys)
            {
                int idx = y * w + x;
                int off = y * stride + x * 4;
                if (!visited[idx] && IsBorderMagenta(bytes[off + 2], bytes[off + 1], bytes[off]))
                {
                    visited[idx] = true;
                    q.Enqueue(idx);
                }
            }
        }
        for (int y = 0; y < h; y++)
        {
            int[] xs = new int[] { 0, w - 1 };
            foreach (int x in xs)
            {
                int idx = y * w + x;
                int off = y * stride + x * 4;
                if (!visited[idx] && IsBorderMagenta(bytes[off + 2], bytes[off + 1], bytes[off]))
                {
                    visited[idx] = true;
                    q.Enqueue(idx);
                }
            }
        }

        // 2. Seed interior enclosed pure-magenta holes (balloon string loops, Sparky's pump handle/hose, Doggie's basket ropes)
        if (clearInteriorHoles)
        {
            for (int y = 0; y < h; y++)
            {
                int rowOff = y * stride;
                int rowIdx = y * w;
                for (int x = 0; x < w; x++)
                {
                    int idx = rowIdx + x;
                    if (!visited[idx])
                    {
                        int off = rowOff + x * 4;
                        int b = bytes[off];
                        int g = bytes[off + 1];
                        int r = bytes[off + 2];
                        if (IsInteriorMagentaHole(r, g, b))
                        {
                            visited[idx] = true;
                            q.Enqueue(idx);
                        }
                    }
                }
            }
        }

        // 3. BFS flood-fill
        while (q.Count > 0)
        {
            int curr = q.Dequeue();
            int cx = curr % w;
            int cy = curr / w;
            int off = cy * stride + cx * 4;
            bytes[off] = 0;
            bytes[off + 1] = 0;
            bytes[off + 2] = 0;
            bytes[off + 3] = 0;

            int[] nxArr = new int[] { cx - 1, cx + 1, cx, cx };
            int[] nyArr = new int[] { cy, cy, cy - 1, cy + 1 };
            for (int i = 0; i < 4; i++)
            {
                int nx = nxArr[i];
                int ny = nyArr[i];
                if (nx >= 0 && nx < w && ny >= 0 && ny < h)
                {
                    int nidx = ny * w + nx;
                    if (!visited[nidx])
                    {
                        int noff = ny * stride + nx * 4;
                        if (IsBorderMagenta(bytes[noff + 2], bytes[noff + 1], bytes[noff]))
                        {
                            visited[nidx] = true;
                            q.Enqueue(nidx);
                        }
                    }
                }
            }
        }

        // 4. Soft glow unmixing (around balloon-star, sparky-pump, doggie-catch)
        if (clearInteriorHoles)
        {
            for (int y = 0; y < h; y++)
            {
                int rowOff = y * stride;
                for (int x = 0; x < w; x++)
                {
                    int off = rowOff + x * 4;
                    if (bytes[off + 3] == 0) continue;
                    int b = bytes[off];
                    int g = bytes[off + 1];
                    int r = bytes[off + 2];
                    if (r > 180 && b > 125 && r > g + 35 && b > g + 12)
                    {
                        if (g < 92)
                        {
                            bytes[off] = 0;
                            bytes[off + 1] = 0;
                            bytes[off + 2] = 0;
                            bytes[off + 3] = 0;
                        }
                        else
                        {
                            int newG = Math.Min(245, Math.Max(195, g + 55));
                            int newB = Math.Min(90, g / 3);
                            int newA = Math.Min(240, Math.Max(60, (g - 85) * 2));
                            bytes[off] = (byte)newB;
                            bytes[off + 1] = (byte)newG;
                            bytes[off + 2] = 255;
                            bytes[off + 3] = (byte)newA;
                        }
                    }
                }
            }
        }

        // 5. 2px edge feathering & magenta spill suppression
        byte[] alphaSnap = new byte[w * h];
        for (int y = 0; y < h; y++)
        {
            int rowOff = y * stride;
            int rowIdx = y * w;
            for (int x = 0; x < w; x++)
            {
                alphaSnap[rowIdx + x] = bytes[rowOff + x * 4 + 3];
            }
        }

        for (int y = 0; y < h; y++)
        {
            int rowOff = y * stride;
            int rowIdx = y * w;
            for (int x = 0; x < w; x++)
            {
                if (alphaSnap[rowIdx + x] == 0) continue;

                bool nearTrans2 = false;
                bool nearTrans1 = false;
                for (int dy = -2; dy <= 2; dy++)
                {
                    int ny = y + dy;
                    for (int dx = -2; dx <= 2; dx++)
                    {
                        int nx = x + dx;
                        if (nx < 0 || nx >= w || ny < 0 || ny >= h || alphaSnap[ny * w + nx] == 0)
                        {
                            nearTrans2 = true;
                            if (Math.Abs(dx) <= 1 && Math.Abs(dy) <= 1) nearTrans1 = true;
                        }
                    }
                }

                if (nearTrans2)
                {
                    int off = rowOff + x * 4;
                    int b = bytes[off];
                    int g = bytes[off + 1];
                    int r = bytes[off + 2];
                    int a = bytes[off + 3];

                    if (r > 200 && g > 90 && b > g + 20)
                    {
                        bytes[off] = 80;
                        bytes[off + 1] = 200;
                        bytes[off + 2] = 255;
                    }
                    else if ((r - g) + (b - g) > 65)
                    {
                        int newB = Math.Min(b, g);
                        int newR = Math.Min(r, Math.Max(g + 40, r - 45));
                        int newA = nearTrans1 ? (int)(a * 0.85) : a;
                        bytes[off] = (byte)newB;
                        bytes[off + 1] = (byte)g;
                        bytes[off + 2] = (byte)newR;
                        bytes[off + 3] = (byte)newA;
                    }
                }
            }
        }

        Marshal.Copy(bytes, 0, data.Scan0, bytes.Length);
        bmp.UnlockBits(data);
        return bmp;
    }

    public static Bitmap CropWithPadding(Bitmap src, int pad)
    {
        int w = src.Width;
        int h = src.Height;
        BitmapData data = src.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
        int stride = data.Stride;
        byte[] bytes = new byte[stride * h];
        Marshal.Copy(data.Scan0, bytes, 0, bytes.Length);
        src.UnlockBits(data);

        int minX = w, minY = h, maxX = 0, maxY = 0;
        bool found = false;
        for (int y = 0; y < h; y++)
        {
            int rowOff = y * stride;
            for (int x = 0; x < w; x++)
            {
                if (bytes[rowOff + x * 4 + 3] > 10)
                {
                    found = true;
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }

        if (!found) return new Bitmap(src);

        int cw = (maxX - minX) + 1;
        int ch = (maxY - minY) + 1;
        Bitmap dst = new Bitmap(cw + pad * 2, ch + pad * 2, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(dst))
        {
            g.DrawImage(src, new Rectangle(pad, pad, cw, ch), new Rectangle(minX, minY, cw, ch), GraphicsUnit.Pixel);
        }
        return dst;
    }

    public static Bitmap CropRegion(Bitmap src, Rectangle rect)
    {
        Bitmap dst = new Bitmap(rect.Width, rect.Height, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(dst))
        {
            g.DrawImage(src, new Rectangle(0, 0, rect.Width, rect.Height), rect, GraphicsUnit.Pixel);
        }
        return dst;
    }

    private static void RgbToHsv(int r, int g, int b, out double h, out double s, out double v)
    {
        double rf = r / 255.0;
        double gf = g / 255.0;
        double bf = b / 255.0;
        double max = Math.Max(rf, Math.Max(gf, bf));
        double min = Math.Min(rf, Math.Min(gf, bf));
        double d = max - min;
        v = max;
        s = max == 0 ? 0 : d / max;
        if (max == min)
        {
            h = 0;
        }
        else
        {
            if (max == rf) h = (gf - bf) / d + (gf < bf ? 6.0 : 0.0);
            else if (max == gf) h = (bf - rf) / d + 2.0;
            else h = (rf - gf) / d + 4.0;
            h /= 6.0;
        }
    }

    private static void HsvToRgb(double h, double s, double v, out int r, out int g, out int b)
    {
        int i = (int)Math.Floor(h * 6.0);
        double f = h * 6.0 - i;
        double p = v * (1.0 - s);
        double q = v * (1.0 - f * s);
        double t = v * (1.0 - (1.0 - f) * s);
        double rf = 0, gf = 0, bf = 0;
        switch (i % 6)
        {
            case 0: rf = v; gf = t; bf = p; break;
            case 1: rf = q; gf = v; bf = p; break;
            case 2: rf = p; gf = v; bf = t; break;
            case 3: rf = p; gf = q; bf = v; break;
            case 4: rf = t; gf = p; bf = v; break;
            case 5: rf = v; gf = p; bf = q; break;
        }
        r = Math.Min(255, Math.Max(0, (int)Math.Round(rf * 255.0)));
        g = Math.Min(255, Math.Max(0, (int)Math.Round(gf * 255.0)));
        b = Math.Min(255, Math.Max(0, (int)Math.Round(bf * 255.0)));
    }

    public static Bitmap BuildPurpleFromRed(Bitmap redBmp)
    {
        int w = redBmp.Width;
        int h = redBmp.Height;
        Bitmap dst = new Bitmap(w, h, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(dst))
        {
            g.DrawImage(redBmp, 0, 0, w, h);
        }

        int limitY = (int)(h * 0.80);
        int knotY0 = (int)(h * 0.81), knotY1 = (int)(h * 0.89);
        int knotX0 = (int)(w * 0.36), knotX1 = (int)(w * 0.59);
        BitmapData data = dst.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
        int stride = data.Stride;
        byte[] bytes = new byte[stride * h];
        Marshal.Copy(data.Scan0, bytes, 0, bytes.Length);

        for (int y = 0; y < h; y++)
        {
            bool inBody = y < limitY;
            bool inKnot = y >= knotY0 && y < knotY1;
            if (!inBody && !inKnot) continue;

            int rowOff = y * stride;
            for (int x = 0; x < w; x++)
            {
                if (inKnot && (x < knotX0 || x >= knotX1)) continue;
                int off = rowOff + x * 4;
                int a = bytes[off + 3];
                if (a == 0) continue;
                int b = bytes[off];
                int g = bytes[off + 1];
                int r = bytes[off + 2];

                double hue, sat, val;
                RgbToHsv(r, g, b, out hue, out sat, out val);
                if (sat > 0.25 && (inBody || hue < 0.06 || hue > 0.92))
                {
                    int nr, ng, nb;
                    HsvToRgb(0.764, sat, val, out nr, out ng, out nb);
                    bytes[off] = (byte)nb;
                    bytes[off + 1] = (byte)ng;
                    bytes[off + 2] = (byte)nr;
                }
            }
        }

        Marshal.Copy(bytes, 0, data.Scan0, bytes.Length);
        dst.UnlockBits(data);
        return dst;
    }
}
"@

Add-Type -TypeDefinition $csharpCode -ReferencedAssemblies System.Drawing

$rootDir = "c:\projects\Wyatt and Emma Arcade v2"
$rawDir = Join-Path $rootDir "public\assets\games\balloon-pop\raw"
$spritesDir = Join-Path $rootDir "public\assets\games\balloon-pop\sprites"
New-Item -ItemType Directory -Force -Path $spritesDir | Out-Null

# 1. Resize balloon-stage-raw.jpg to 1280x720 -> balloon-stage.jpg
$stageRawPath = Join-Path $rawDir "balloon-stage-raw.jpg"
$stageOutPath = Join-Path $rootDir "public\assets\games\balloon-pop\balloon-stage.jpg"
$stageRawBmp = New-Object System.Drawing.Bitmap($stageRawPath)
$stage1280 = New-Object System.Drawing.Bitmap(1280, 720, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$gStage = [System.Drawing.Graphics]::FromImage($stage1280)
$gStage.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gStage.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$gStage.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$gStage.DrawImage($stageRawBmp, (New-Object System.Drawing.Rectangle(0, 0, 1280, 720)), (New-Object System.Drawing.Rectangle(0, 0, $stageRawBmp.Width, $stageRawBmp.Height)), [System.Drawing.GraphicsUnit]::Pixel)
$gStage.Dispose()
$stageRawBmp.Dispose()

$jpgCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$encParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 95L)
$stage1280.Save($stageOutPath, $jpgCodec, $encParams)
$stage1280.Dispose()
Write-Host "Saved balloon-stage.jpg (1280x720)"

function Slice-Sheet {
    param(
        [string]$RawFile,
        [int]$Rows,
        [int]$Cols,
        [string[][]]$Names,
        [bool]$ClearHoles
    )
    $rawPath = Join-Path $rawDir $RawFile
    $rawBmp = New-Object System.Drawing.Bitmap($rawPath)
    $w = $rawBmp.Width
    $h = $rawBmp.Height

    for ($r = 0; $r -lt $Rows; $r++) {
        $y0 = [int][Math]::Round($r * $h / [double]$Rows)
        $y1 = [int][Math]::Round(($r + 1) * $h / [double]$Rows)
        for ($c = 0; $c -lt $Cols; $c++) {
            $x0 = [int][Math]::Round($c * $w / [double]$Cols)
            $x1 = [int][Math]::Round(($c + 1) * $w / [double]$Cols)
            $rect = New-Object System.Drawing.Rectangle($x0, $y0, ($x1 - $x0), ($y1 - $y0))
            $cellBmp = [BalloonAssetBuilder]::CropRegion($rawBmp, $rect)
            $cleanBmp = [BalloonAssetBuilder]::ClearMagentaAndDespill($cellBmp, $ClearHoles)
            $cellBmp.Dispose()
            $finalBmp = [BalloonAssetBuilder]::CropWithPadding($cleanBmp, 4)
            $cleanBmp.Dispose()

            $outName = $Names[$r][$c]
            $outPath = Join-Path $spritesDir $outName
            $finalBmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
            Write-Host "Saved $outName ($($finalBmp.Width)x$($finalBmp.Height))"
            $finalBmp.Dispose()
        }
    }
    $rawBmp.Dispose()
}

# 2. Slice balloon-items-raw.jpg (3 rows x 4 cols -> 12 sprites)
Slice-Sheet -RawFile "balloon-items-raw.jpg" -Rows 3 -Cols 4 -ClearHoles $true -Names @(
    @("balloon-red.png", "balloon-blue.png", "balloon-green.png", "balloon-gold.png"),
    @("balloon-purple.png", "balloon-coral.png", "balloon-star.png", "balloon-rainbow.png"),
    @("prop-tile.png", "prop-parachute.png", "prop-crate.png", "prop-pinwheel.png")
)

# Rebuild balloon-purple.png from balloon-red.png with Royal Amethyst Purple hue shift (hue ~ 275 deg / 0.764)
$redBalloonPath = Join-Path $spritesDir "balloon-red.png"
$purpleBalloonPath = Join-Path $spritesDir "balloon-purple.png"
$redBmp = New-Object System.Drawing.Bitmap($redBalloonPath)
$purpleBmp = [BalloonAssetBuilder]::BuildPurpleFromRed($redBmp)
$redBmp.Dispose()
$purpleBmp.Save($purpleBalloonPath, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Saved balloon-purple.png ($($purpleBmp.Width)x$($purpleBmp.Height)) [hue-shifted from balloon-red.png]"
$purpleBmp.Dispose()

# 3. Slice balloon-chars-raw.jpg (2 rows x 3 cols -> 6 sprites)
Slice-Sheet -RawFile "balloon-chars-raw.jpg" -Rows 2 -Cols 3 -ClearHoles $true -Names @(
    @("sparky-idle.png", "sparky-pump.png", "sparky-cheer.png"),
    @("doggie-idle.png", "doggie-catch.png", "doggie-cheer.png")
)

# 4. Slice balloon-ui-raw.jpg (2 rows x 4 cols -> 8 sprites)
Slice-Sheet -RawFile "balloon-ui-raw.jpg" -Rows 2 -Cols 4 -ClearHoles $false -Names @(
    @("ui-back.png", "ui-mode-phonics.png", "ui-mode-words.png", "ui-mode-cargo.png"),
    @("ui-theme.png", "ui-speak.png", "ui-wind.png", "ui-album.png")
)
