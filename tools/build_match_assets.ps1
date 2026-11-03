Add-Type -AssemblyName System.Drawing

$csharpCode = @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;

public static class MatchAssetBuilderV4
{
    private static readonly HashSet<string> NoInteriorHoleSprites = new HashSet<string>
    {
        "card-back.png",
        "card-front.png",
        "chest-closed.png",
        "chest-open.png",
        "ui-grid.png",
        "ui-mode.png",
        "ui-hint.png",
        "ui-sanctuary.png",
        "ocean-starfish.png",
        "dino-egg.png",
        "tr-crystal.png",
        "tr-cupcake.png",
        "tr-crown.png",
        "tr-map.png",
        "tr-strawberry.png"
    };

    private static readonly HashSet<string> HaloOuterStripSprites = new HashSet<string>
    {
        "chest-open.png",
        "char-doggie-lantern.png",
        "prop-firefly.png",
        "dino-egg.png",
        "tr-crystal.png"
    };

    private static bool IsBorderMagenta(int r, int g, int b, string filename)
    {
        if (filename == "ocean-starfish.png" || filename == "tr-cupcake.png")
        {
            return r > 205 && g < 75 && b > 195 && (r + b - 2 * g) > 290;
        }
        if (HaloOuterStripSprites.Contains(filename))
        {
            if (r > 205 && b > 155 && (r - g) > 20)
            {
                return true;
            }
        }
        if (filename == "arcade-toy-match.png")
        {
            if (r > 135 && g < 110 && b > 120 && ((r - g) + (b - g)) > 115 && b > g + 30)
            {
                return true;
            }
            return false;
        }
        return r > 140 && g < 118 && b > 125 && ((r - g) + (b - g)) > 115 && b > g + 30;
    }

    private static bool IsInteriorMagentaHole(int r, int g, int b, int x, int y, int w, int h, string filename)
    {
        if (filename == "arcade-toy-match.png")
        {
            // 1. Top brass gallery rail slits
            if (y >= (int)(h * 0.18) && y <= (int)(h * 0.26))
            {
                return r > 150 && g < 100 && b > 135 && b > g + 35;
            }
            // 2. Central open spindle niche
            if (y >= (int)(h * 0.47) && y <= (int)(h * 0.58) && x >= (int)(w * 0.36) && x <= (int)(w * 0.64))
            {
                return r > 70 && g < 38 && b > 55 && r > g + 38 && b > g + 25;
            }
            // 3. Under-arch between the two carved claw feet at the bottom
            if (y >= (int)(h * 0.87) && x >= (int)(w * 0.25) && x <= (int)(w * 0.75))
            {
                return r > 38 && g < 24 && b > 30 && r > g + 22 && b > g + 16;
            }
            return false;
        }
        if (r > 185 && g < 90 && b > 180 && (r + b - 2 * g) > 225)
        {
            return true;
        }
        return r > 138 && g < 108 && b > 125 && b > g + 32 && ((r - g) + (b - g)) > 110;
    }

    public static Bitmap ClearMagentaAndDespill(Bitmap src, string filename)
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
                if (!visited[idx] && IsBorderMagenta(bytes[off + 2], bytes[off + 1], bytes[off], filename))
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
                if (!visited[idx] && IsBorderMagenta(bytes[off + 2], bytes[off + 1], bytes[off], filename))
                {
                    visited[idx] = true;
                    q.Enqueue(idx);
                }
            }
        }

        // 2. Seed interior enclosed pure-magenta holes unless protected
        if (!NoInteriorHoleSprites.Contains(filename))
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
                        if (IsInteriorMagentaHole(r, g, b, x, y, w, h, filename))
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
                        int nb = bytes[noff];
                        int ng = bytes[noff + 1];
                        int nr = bytes[noff + 2];
                        if (IsBorderMagenta(nr, ng, nb, filename) || (filename == "arcade-toy-match.png" && IsInteriorMagentaHole(nr, ng, nb, nx, ny, w, h, filename)))
                        {
                            visited[nidx] = true;
                            q.Enqueue(nidx);
                        }
                    }
                }
            }
        }

        // 4. Soft golden glow unmixing for prop-firefly only
        if (filename == "prop-firefly.png")
        {
            for (int y = 0; y < h; y++)
            {
                int rowOff = y * stride;
                for (int x = 0; x < w; x++)
                {
                    int off = rowOff + x * 4;
                    int a = bytes[off + 3];
                    if (a == 0) continue;
                    int b = bytes[off];
                    int g = bytes[off + 1];
                    int r = bytes[off + 2];
                    if (r > 185 && b > 125 && r > g + 35 && b > g + 15)
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

        // 5. 2px magenta edge de-spill pass
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

                    if ((r - g) + (b - g) > 50 && b > g + 14)
                    {
                        int newB = Math.Min(b, g);
                        int newR = Math.Min(r, Math.Max(g + 30, r - 55));
                        int newA = nearTrans1 ? (int)(a * 0.80) : a;
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

    public static void SliceSingleToy(string rawPath, string outPath, string filename)
    {
        using (Bitmap src = (Bitmap)Bitmap.FromFile(rawPath))
        using (Bitmap cleaned = ClearMagentaAndDespill(src, filename))
        using (Bitmap finalBmp = AutoCropWithPadding(cleaned, 4))
        {
            finalBmp.Save(outPath, ImageFormat.Png);
            Console.WriteLine(string.Format("[Saved] public/assets/hub/arcade/{0} ({1}x{2})", filename, finalBmp.Width, finalBmp.Height));
        }
    }

    public static void SliceGridWithSplits(string rawPath, string outDir, string[][] gridNames, double[] ySplits)
    {
        using (Bitmap sheet = (Bitmap)Bitmap.FromFile(rawPath))
        {
            int sw = sheet.Width;
            int sh = sheet.Height;
            int rows = gridNames.Length;
            for (int r = 0; r < rows; r++)
            {
                int cols = gridNames[r].Length;
                int y0 = (ySplits != null) ? (int)Math.Round(sh * ySplits[r]) : (int)Math.Round(r * sh / (double)rows);
                int y1 = (ySplits != null) ? (int)Math.Round(sh * ySplits[r + 1]) : (int)Math.Round((r + 1) * sh / (double)rows);
                for (int c = 0; c < cols; c++)
                {
                    int x0 = (int)Math.Round(c * sw / (double)cols);
                    int x1 = (int)Math.Round((c + 1) * sw / (double)cols);
                    int cw = Math.Max(1, x1 - x0);
                    int ch = Math.Max(1, y1 - y0);
                    string filename = gridNames[r][c];

                    using (Bitmap cell = new Bitmap(cw, ch, PixelFormat.Format32bppArgb))
                    {
                        using (Graphics g = Graphics.FromImage(cell))
                        {
                            g.DrawImage(sheet, new Rectangle(0, 0, cw, ch), new Rectangle(x0, y0, cw, ch), GraphicsUnit.Pixel);
                        }
                        using (Bitmap cleaned = ClearMagentaAndDespill(cell, filename))
                        using (Bitmap finalBmp = AutoCropWithPadding(cleaned, 4))
                        {
                            string outPath = Path.Combine(outDir, filename);
                            finalBmp.Save(outPath, ImageFormat.Png);
                            Console.WriteLine(string.Format("[Saved] public/assets/games/memory-match/sprites/{0} ({1}x{2})", filename, finalBmp.Width, finalBmp.Height));
                        }
                    }
                }
            }
        }
    }
}
"@

Add-Type -TypeDefinition $csharpCode -ReferencedAssemblies System.Drawing

$rootDir = Split-Path -Parent $PSScriptRoot
$rawDir = Join-Path $rootDir "public\assets\games\memory-match\raw"
$outDir = Join-Path $rootDir "public\assets\games\memory-match\sprites"
$hubRawDir = Join-Path $rootDir "public\assets\hub\raw"
$hubOutDir = Join-Path $rootDir "public\assets\hub\arcade"

$uiGrid = @(
    @("card-back.png", "card-front.png", "prop-key.png", "chest-closed.png"),
    @("chest-open.png", "char-sparky-spyglass.png", "char-doggie-lantern.png", "prop-firefly.png"),
    @("ui-grid.png", "ui-mode.png", "ui-hint.png", "ui-sanctuary.png")
)
[MatchAssetBuilderV4]::SliceGridWithSplits((Join-Path $rawDir "match-ui-props-raw.jpg"), $outDir, $uiGrid, @(0.00, 0.383, 0.708, 1.00))

$oceanDinoGrid = @(
    @("ocean-whale.png", "ocean-octopus.png", "ocean-turtle.png", "ocean-clownfish.png"),
    @("ocean-crab.png", "ocean-dolphin.png", "ocean-seahorse.png", "ocean-starfish.png"),
    @("dino-trex.png", "dino-triceratops.png", "dino-stegosaurus.png", "dino-brachiosaurus.png"),
    @("dino-pterodactyl.png", "dino-ankylosaurus.png", "dino-baby.png", "dino-egg.png")
)
[MatchAssetBuilderV4]::SliceGridWithSplits((Join-Path $rawDir "match-cards-ocean-dino-raw.jpg"), $outDir, $oceanDinoGrid, $null)

$treasuresGrid = @(
    @("veh-airship.png", "veh-train.png", "veh-firetruck.png", "veh-submarine.png"),
    @("veh-biplane.png", "veh-rocket.png", "veh-tractor.png", "veh-sailboat.png"),
    @("tr-dragon.png", "tr-unicorn.png", "tr-crown.png", "tr-crystal.png"),
    @("tr-map.png", "tr-cupcake.png", "tr-strawberry.png", "tr-acorn.png")
)
[MatchAssetBuilderV4]::SliceGridWithSplits((Join-Path $rawDir "match-cards-treasures-raw.jpg"), $outDir, $treasuresGrid, $null)

[MatchAssetBuilderV4]::SliceSingleToy((Join-Path $hubRawDir "arcade-toy-match-raw.jpg"), (Join-Path $hubOutDir "arcade-toy-match.png"), "arcade-toy-match.png")
