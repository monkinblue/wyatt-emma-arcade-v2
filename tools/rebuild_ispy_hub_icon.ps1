Add-Type -AssemblyName System.Drawing

$csharpCode = @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;

public static class ISpyHubIconProcessor
{
    private static bool IsInsideInnerGlassLens(int x, int y, int w, int h)
    {
        double cx = w * 0.495;
        double cy = h * 0.198;
        double rx = w * 0.182;
        double ry = h * 0.084;
        double dx = (x - cx) / rx;
        double dy = (y - cy) / ry;
        return (dx * dx + dy * dy) <= 1.0;
    }

    private static bool IsInsideMarblesZone(int x, int y, int w, int h)
    {
        return x >= (int)(w * 0.18) && x <= (int)(w * 0.42) && y >= (int)(h * 0.35) && y <= (int)(h * 0.58);
    }

    private static bool IsMagentaPixel(int r, int g, int b, int x, int y, int w, int h)
    {
        if (IsInsideInnerGlassLens(x, y, w, h))
        {
            return false;
        }
        // Pure or bright magenta
        if (r > 135 && g < 118 && b > 115 && (r - g) + (b - g) > 110 && b > g + 28 && b > (int)(r * 0.52))
        {
            return true;
        }
        // Darker JPEG/anti-aliased magenta-purple fringe on mahogany edges
        if (r > 85 && g < 75 && b > 78 && b > g + 26 && r > g + 30 && b > (int)(r * 0.58))
        {
            return true;
        }
        return false;
    }

    private static bool IsInteriorHoleSeed(int r, int g, int b, int x, int y, int w, int h)
    {
        if (IsInsideInnerGlassLens(x, y, w, h))
        {
            return false;
        }
        if (r > 175 && g < 95 && b > 165 && (r + b - 2 * g) > 210)
        {
            return true;
        }
        if (r > 140 && g < 95 && b > 125 && b > g + 36 && (r - g) + (b - g) > 125 && b > (int)(r * 0.58))
        {
            return true;
        }
        return false;
    }

    private static bool HasPurpleCast(int r, int g, int b)
    {
        if (b > g + 4 && r > g + 10 && b > (int)(r * 0.36))
        {
            return true;
        }
        return false;
    }

    public static Bitmap CleanAndPolishIcon(Bitmap src, int targetHeight)
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
            int[] ys = new int[] { 0, 1, h - 2, h - 1 };
            foreach (int y in ys)
            {
                if (y < 0 || y >= h) continue;
                int idx = y * w + x;
                int off = y * stride + x * 4;
                if (!visited[idx] && IsMagentaPixel(bytes[off + 2], bytes[off + 1], bytes[off], x, y, w, h))
                {
                    visited[idx] = true;
                    q.Enqueue(idx);
                }
            }
        }
        for (int y = 0; y < h; y++)
        {
            int[] xs = new int[] { 0, 1, w - 2, w - 1 };
            foreach (int x in xs)
            {
                if (x < 0 || x >= w) continue;
                int idx = y * w + x;
                int off = y * stride + x * 4;
                if (!visited[idx] && IsMagentaPixel(bytes[off + 2], bytes[off + 1], bytes[off], x, y, w, h))
                {
                    visited[idx] = true;
                    q.Enqueue(idx);
                }
            }
        }

        // 2. Seed interior enclosed holes (gooseneck loop, under lens rim)
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
                    if (IsInteriorHoleSeed(r, g, b, x, y, w, h))
                    {
                        visited[idx] = true;
                        q.Enqueue(idx);
                    }
                }
            }
        }

        // 3. 8-connected BFS flood-fill so diagonal 1px magenta corners are never stranded
        int[] dx8 = new int[] { -1, 0, 1, -1, 1, -1, 0, 1 };
        int[] dy8 = new int[] { -1, -1, -1, 0, 0, 1, 1, 1 };

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

            for (int i = 0; i < 8; i++)
            {
                int nx = cx + dx8[i];
                int ny = cy + dy8[i];
                if (nx >= 0 && nx < w && ny >= 0 && ny < h)
                {
                    int nidx = ny * w + nx;
                    if (!visited[nidx])
                    {
                        int noff = ny * stride + nx * 4;
                        int nb = bytes[noff];
                        int ng = bytes[noff + 1];
                        int nr = bytes[noff + 2];
                        if (IsMagentaPixel(nr, ng, nb, nx, ny, w, h))
                        {
                            visited[nidx] = true;
                            q.Enqueue(nidx);
                        }
                    }
                }
            }
        }

        // 3.5. Replace any pink/magenta chroma reflection inside the enclosed magnifying glass lens with crystal-clear optical glass
        for (int y = 0; y < h; y++)
        {
            int rowOff = y * stride;
            for (int x = 0; x < w; x++)
            {
                int off = rowOff + x * 4;
                if (bytes[off + 3] == 0) continue;
                if (!IsInsideInnerGlassLens(x, y, w, h)) continue;

                int b = bytes[off];
                int g = bytes[off + 1];
                int r = bytes[off + 2];

                // Protect golden brass bezel & star sparkles where R >= G > B + 10
                if (r >= g && g > b + 10) continue;

                if (r > g - 4 && b > g + 2)
                {
                    double pinkness = Math.Min(1.0, Math.Max(0.0, ((r - g) + (b - g)) / 135.0));
                    int lum = (int)Math.Round(0.32 * r + 0.48 * g + 0.20 * b);
                    int targetR = Math.Min(255, (int)Math.Round(lum * 0.88 + 36));
                    int targetG = Math.Min(255, (int)Math.Round(lum * 1.02 + 52));
                    int targetB = Math.Min(255, (int)Math.Round(lum * 1.08 + 66));

                    bytes[off] = (byte)Math.Round(b * (1.0 - pinkness) + targetB * pinkness);
                    bytes[off + 1] = (byte)Math.Round(g * (1.0 - pinkness) + targetG * pinkness);
                    bytes[off + 2] = (byte)Math.Round(r * (1.0 - pinkness) + targetR * pinkness);
                }
            }
        }

        // 4. Remove tiny isolated 1-4px floating specks outside the main silhouette
        for (int pass = 0; pass < 2; pass++)
        {
            byte[] aSnap = new byte[w * h];
            for (int i = 0; i < w * h; i++) aSnap[i] = bytes[(i / w) * stride + (i % w) * 4 + 3];

            for (int y = 1; y < h - 1; y++)
            {
                int rowOff = y * stride;
                for (int x = 1; x < w - 1; x++)
                {
                    if (aSnap[y * w + x] == 0) continue;
                    int opaqueNeighbors = 0;
                    for (int i = 0; i < 8; i++)
                    {
                        if (aSnap[(y + dy8[i]) * w + (x + dx8[i])] > 0) opaqueNeighbors++;
                    }
                    if (opaqueNeighbors <= 1)
                    {
                        int off = rowOff + x * 4;
                        bytes[off] = 0;
                        bytes[off + 1] = 0;
                        bytes[off + 2] = 0;
                        bytes[off + 3] = 0;
                    }
                }
            }
        }

        // 5. Comprehensive 3px Magenta De-Spill + Global Mahogany Bounce-Light Neutralization
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
            for (int x = 0; x < w; x++)
            {
                if (alphaSnap[y * w + x] == 0) continue;

                int off = rowOff + x * 4;
                int b = bytes[off];
                int g = bytes[off + 1];
                int r = bytes[off + 2];
                int a = bytes[off + 3];

                if (!IsInsideInnerGlassLens(x, y, w, h) && !IsInsideMarblesZone(x, y, w, h))
                {
                    if (r > g + 14 && b > g + 5)
                    {
                        b = Math.Max(0, (int)Math.Round(g * 0.90));
                        bytes[off] = (byte)b;
                    }
                }

                int minTransDistSq = 999;
                for (int dy = -3; dy <= 3; dy++)
                {
                    int ny = y + dy;
                    if (ny < 0 || ny >= h) continue;
                    for (int dx = -3; dx <= 3; dx++)
                    {
                        int nx = x + dx;
                        if (nx < 0 || nx >= w) continue;
                        if (alphaSnap[ny * w + nx] == 0)
                        {
                            int d2 = dx * dx + dy * dy;
                            if (d2 < minTransDistSq) minTransDistSq = d2;
                        }
                    }
                }

                if (minTransDistSq <= 10)
                {
                    if (HasPurpleCast(r, g, b))
                    {
                        int bestDist = 999;
                        int cleanR = -1, cleanG = -1, cleanB = -1;
                        for (int dy = -5; dy <= 5; dy++)
                        {
                            int ny = y + dy;
                            if (ny < 0 || ny >= h) continue;
                            for (int dx = -5; dx <= 5; dx++)
                            {
                                int nx = x + dx;
                                if (nx < 0 || nx >= w) continue;
                                if (alphaSnap[ny * w + nx] < 220) continue;
                                int noff = ny * stride + nx * 4;
                                int nb = bytes[noff];
                                int ng = bytes[noff + 1];
                                int nr = bytes[noff + 2];
                                if (!HasPurpleCast(nr, ng, nb))
                                {
                                    int d2 = dx * dx + dy * dy;
                                    if (d2 < bestDist)
                                    {
                                        bestDist = d2;
                                        cleanR = nr;
                                        cleanG = ng;
                                        cleanB = nb;
                                    }
                                }
                            }
                        }

                        int spillStrength = (r - g) + (b - g);
                        if (cleanR >= 0)
                        {
                            bytes[off] = (byte)cleanB;
                            bytes[off + 1] = (byte)cleanG;
                            bytes[off + 2] = (byte)cleanR;
                        }
                        else
                        {
                            int newB = Math.Min(b, (int)(g * 0.82));
                            int newR = Math.Min(r, Math.Max(g + 28, r - 60));
                            bytes[off] = (byte)Math.Max(0, newB);
                            bytes[off + 1] = (byte)g;
                            bytes[off + 2] = (byte)Math.Max(0, newR);
                        }

                        if (minTransDistSq <= 2)
                        {
                            if (spillStrength > 140)
                            {
                                bytes[off + 3] = (byte)(a * 0.30);
                            }
                            else
                            {
                                bytes[off + 3] = (byte)(a * 0.78);
                            }
                        }
                    }
                }
            }
        }

        Marshal.Copy(bytes, 0, data.Scan0, bytes.Length);
        bmp.UnlockBits(data);

        // 6. Tight auto-crop with 6px padding + HighQualityBicubic resize to crisp high-res targetHeight (512px)
        Bitmap cropped = AutoCropWithPadding(bmp, 6);
        bmp.Dispose();

        if (targetHeight <= 0 || cropped.Height == targetHeight)
        {
            return cropped;
        }

        double scale = (double)targetHeight / (double)cropped.Height;
        int outW = Math.Max(1, (int)Math.Round(cropped.Width * scale));
        int outH = targetHeight;

        Bitmap resized = new Bitmap(outW, outH, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(resized))
        {
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            g.SmoothingMode = SmoothingMode.HighQuality;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;
            g.CompositingQuality = CompositingQuality.HighQuality;
            g.DrawImage(cropped, new Rectangle(0, 0, outW, outH));
        }
        cropped.Dispose();
        return resized;
    }

    public static Bitmap AutoCropWithPadding(Bitmap src, int pad)
    {
        int w = src.Width;
        int h = src.Height;
        Rectangle rect = new Rectangle(0, 0, w, h);
        BitmapData data = src.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
        int stride = data.Stride;
        byte[] bytes = new byte[stride * h];
        Marshal.Copy(data.Scan0, bytes, 0, bytes.Length);
        src.UnlockBits(data);

        int minX = w, minY = h, maxX = -1, maxY = -1;
        for (int y = 0; y < h; y++)
        {
            int rowOff = y * stride;
            for (int x = 0; x < w; x++)
            {
                if (bytes[rowOff + x * 4 + 3] > 12)
                {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }

        if (maxX < minX || maxY < minY)
        {
            return (Bitmap)src.Clone();
        }

        int cw = maxX - minX + 1;
        int ch = maxY - minY + 1;
        Bitmap outBmp = new Bitmap(cw + pad * 2, ch + pad * 2, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(outBmp))
        {
            g.DrawImage(src, new Rectangle(pad, pad, cw, ch), new Rectangle(minX, minY, cw, ch), GraphicsUnit.Pixel);
        }
        return outBmp;
    }
}
"@

Add-Type -TypeDefinition $csharpCode -ReferencedAssemblies System.Drawing

$rootDir = Split-Path -Parent $PSScriptRoot
$rawPath = Join-Path $rootDir "public\assets\hub\raw\hub-toy-ispy-raw.jpg"

if (-not (Test-Path $rawPath)) {
    throw "Missing raw input: $rawPath"
}

$rawBmp = [System.Drawing.Bitmap]::FromFile($rawPath)
$finalBmp = [ISpyHubIconProcessor]::CleanAndPolishIcon($rawBmp, 512)
$rawBmp.Dispose()

$outPaths = @(
    (Join-Path $rootDir "public\assets\hub\arcade\hub-toy-ispy.png"),
    (Join-Path $rootDir "public\assets\hub\sprites\hub-toy-ispy.png"),
    (Join-Path $rootDir "public\assets\hub\hub-toy-ispy.png")
)

foreach ($p in $outPaths) {
    $dir = Split-Path -Parent $p
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
    }
    $finalBmp.Save($p, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Output "[Saved HD Icon] $p ($($finalBmp.Width)x$($finalBmp.Height))"
}

$finalBmp.Dispose()
