Add-Type -AssemblyName System.Drawing

$csharpCode = @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;

public static class ArcadeShelfToySlicerV2
{
    private static bool IsBorderMagenta(int r, int g, int b)
    {
        return r > 150 && g < 115 && b > 130 && ((r - g) + (b - g)) > 135 && b > g + 35;
    }

    private static bool IsInteriorMagentaHole(int r, int g, int b, int x, int y, int w, int h, bool isBalloonToy)
    {
        if (isBalloonToy && x < (int)(w * 0.40) && y < (int)(h * 0.43))
        {
            return r > 210 && g < 70 && b > 200 && (r + b - 2 * g) > 280;
        }
        if (r > 190 && g < 85 && b > 190 && (r + b - 2 * g) > 240)
        {
            return true;
        }
        return r > 148 && g < 102 && b > 125 && b > g + 38 && ((r - g) + (b - g)) > 130;
    }

    public static Bitmap ClearMagentaAndDespill(Bitmap src, bool isBalloonToy)
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

        // 2. Seed interior enclosed pure-magenta & narrow slit holes
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
                    if (IsInteriorMagentaHole(r, g, b, x, y, w, h, isBalloonToy))
                    {
                        visited[idx] = true;
                        q.Enqueue(idx);
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
                    if (isBalloonToy && nx < (int)(w * 0.40) && ny < (int)(h * 0.43)) continue;
                    int nidx = ny * w + nx;
                    if (!visited[nidx])
                    {
                        int noff = ny * stride + nx * 4;
                        int nb = bytes[noff];
                        int ng = bytes[noff + 1];
                        int nr = bytes[noff + 2];
                        if (IsBorderMagenta(nr, ng, nb))
                        {
                            visited[nidx] = true;
                            q.Enqueue(nidx);
                        }
                    }
                }
            }
        }

        // 4. 2px magenta edge de-spill pass
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

                bool nearTrans2 = false;
                bool nearTrans1 = false;
                for (int dy = -2; dy <= 2; dy++)
                {
                    int ny = y + dy;
                    if (ny < 0 || ny >= h) continue;
                    for (int dx = -2; dx <= 2; dx++)
                    {
                        int nx = x + dx;
                        if (nx < 0 || nx >= w) continue;
                        if (alphaSnap[ny * w + nx] == 0)
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

                    if ((r - g) + (b - g) > 55 && b > g + 16)
                    {
                        int newB = Math.Min(b, g);
                        int newR = Math.Min(r, Math.Max(g + 35, r - 50));
                        int newA = nearTrans1 ? (int)(a * 0.82) : a;
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
                if (bytes[rowOff + x * 4 + 3] > 10)
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

    public static void SliceSprite(Bitmap sheet, string outPath, double x0f, double y0f, double x1f, double y1f, bool isBalloonToy)
    {
        int sw = sheet.Width;
        int sh = sheet.Height;
        int x0 = (int)Math.Round(sw * x0f);
        int y0 = (int)Math.Round(sh * y0f);
        int x1 = (int)Math.Round(sw * x1f);
        int y1 = (int)Math.Round(sh * y1f);
        int cw = Math.Max(1, x1 - x0);
        int ch = Math.Max(1, y1 - y0);

        using (Bitmap cell = new Bitmap(cw, ch, PixelFormat.Format32bppArgb))
        {
            using (Graphics g = Graphics.FromImage(cell))
            {
                g.DrawImage(sheet, new Rectangle(0, 0, cw, ch), new Rectangle(x0, y0, cw, ch), GraphicsUnit.Pixel);
            }
            using (Bitmap cleaned = ClearMagentaAndDespill(cell, isBalloonToy))
            using (Bitmap finalBmp = AutoCropWithPadding(cleaned, 4))
            {
                finalBmp.Save(outPath, ImageFormat.Png);
                Console.WriteLine(string.Format("[Saved] {0} ({1}x{2})", outPath, finalBmp.Width, finalBmp.Height));
            }
        }
    }
}
"@

Add-Type -TypeDefinition $csharpCode -ReferencedAssemblies System.Drawing

$rootDir = Split-Path -Parent $PSScriptRoot
$rawPath = Join-Path $rootDir "public\assets\hub\raw\arcade-shelf-toys-raw.jpg"
$outDir = Join-Path $rootDir "public\assets\hub\arcade"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$sheet = [System.Drawing.Bitmap]::FromFile($rawPath)
[ArcadeShelfToySlicerV2]::SliceSprite($sheet, (Join-Path $outDir "arcade-toy-balloon.png"), 0.00, 0.00, 0.335, 1.00, $true)
[ArcadeShelfToySlicerV2]::SliceSprite($sheet, (Join-Path $outDir "arcade-toy-bounce.png"), 0.335, 0.00, 0.655, 1.00, $false)
[ArcadeShelfToySlicerV2]::SliceSprite($sheet, (Join-Path $outDir "arcade-toy-kart.png"), 0.655, 0.00, 1.00, 1.00, $false)
$sheet.Dispose()
