$ErrorActionPreference = "Stop"

Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;

public class P4SpriteProcessor {
    private static bool IsMagenta(int r, int g, int b) {
        return r > 175 && g < 95 && b > 175 && (r + b - 2 * g) > 190;
    }

    private static bool IsBorderMagenta(int r, int g, int b) {
        return (r > 155 && g < 110 && b > 155 && (r + b - 2 * g) > 150) || IsMagenta(r, g, b);
    }

    public static Bitmap CleanMagentaCell(Bitmap src, int x0, int x1) {
        int fullW = src.Width;
        int h = src.Height;
        int w = x1 - x0;
        Bitmap cell = new Bitmap(w, h, PixelFormat.Format32bppArgb);

        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                int sx = x0 + x;
                // Shave 5px outer sheet margin to discard any border/grid artifacts
                if (sx < 5 || sx >= fullW - 5 || y < 5 || y >= h - 5) {
                    cell.SetPixel(x, y, Color.FromArgb(255, 255, 0, 255));
                } else {
                    Color c = src.GetPixel(sx, y);
                    cell.SetPixel(x, y, Color.FromArgb(255, c.R, c.G, c.B));
                }
            }
        }

        // Pass 1: Border flood-fill
        bool[,] visited = new bool[h, w];
        Queue<Point> q = new Queue<Point>();

        for (int x = 0; x < w; x++) {
            int[] ys = new int[] { 0, h - 1 };
            foreach (int y in ys) {
                Color c = cell.GetPixel(x, y);
                if (!visited[y, x] && IsBorderMagenta(c.R, c.G, c.B)) {
                    visited[y, x] = true;
                    q.Enqueue(new Point(x, y));
                }
            }
        }
        for (int y = 0; y < h; y++) {
            int[] xs = new int[] { 0, w - 1 };
            foreach (int x in xs) {
                Color c = cell.GetPixel(x, y);
                if (!visited[y, x] && IsBorderMagenta(c.R, c.G, c.B)) {
                    visited[y, x] = true;
                    q.Enqueue(new Point(x, y));
                }
            }
        }

        int[] dx = new int[] { -1, 1, 0, 0 };
        int[] dy = new int[] { 0, 0, -1, 1 };

        while (q.Count > 0) {
            Point p = q.Dequeue();
            cell.SetPixel(p.X, p.Y, Color.FromArgb(0, 0, 0, 0));
            for (int d = 0; d < 4; d++) {
                int nx = p.X + dx[d];
                int ny = p.Y + dy[d];
                if (nx >= 0 && nx < w && ny >= 0 && ny < h && !visited[ny, nx]) {
                    Color nc = cell.GetPixel(nx, ny);
                    if (IsBorderMagenta(nc.R, nc.G, nc.B)) {
                        visited[ny, nx] = true;
                        q.Enqueue(new Point(nx, ny));
                    }
                }
            }
        }

        // Pass 2: Interior enclosed magenta hole removal
        for (int y = 1; y < h - 1; y++) {
            for (int x = 1; x < w - 1; x++) {
                Color c = cell.GetPixel(x, y);
                if (c.A > 0 && IsMagenta(c.R, c.G, c.B)) {
                    cell.SetPixel(x, y, Color.FromArgb(0, 0, 0, 0));
                }
            }
        }

        // Pass 3: 1px magenta edge de-spill
        Bitmap copy = new Bitmap(cell);
        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                Color c = copy.GetPixel(x, y);
                if (c.A == 0) continue;
                bool nearTrans = false;
                for (int oy = -1; oy <= 1 && !nearTrans; oy++) {
                    for (int ox = -1; ox <= 1; ox++) {
                        if (ox == 0 && oy == 0) continue;
                        int nx = x + ox;
                        int ny = y + oy;
                        if (nx < 0 || nx >= w || ny < 0 || ny >= h || copy.GetPixel(nx, ny).A == 0) {
                            nearTrans = true;
                            break;
                        }
                    }
                }
                if (nearTrans) {
                    if ((c.R + c.B - 2 * c.G) > 130 && c.R > 135 && c.B > 135) {
                        cell.SetPixel(x, y, Color.FromArgb(0, 0, 0, 0));
                    } else if (c.R > c.G + 25 && c.B > c.G + 25) {
                        int avg = Math.Min(255, (int)(c.G * 0.7 + Math.Min(c.R, c.B) * 0.3));
                        cell.SetPixel(x, y, Color.FromArgb(Math.Min((int)c.A, 220), avg, c.G, avg));
                    }
                } else if (c.R > 185 && c.B > 175 && c.R > c.G + 35 && c.B > c.G + 25) {
                    // Convert any semi-transparent magenta-tinted motion blur (e.g. Cessna spinning propeller disk)
                    // into a clean silver-sky motion blur
                    cell.SetPixel(x, y, Color.FromArgb(135, 220, 232, 245));
                } else if (c.R > c.G + 20 && c.B > c.G + 15) {
                    // Neutralize any dark mauve-tinted propeller blade pixels
                    int gray = (c.R + c.G + c.B) / 3;
                    cell.SetPixel(x, y, Color.FromArgb(220, gray, gray, Math.Min(255, gray + 8)));
                }
            }
        }
        copy.Dispose();
        return cell;
    }

    public static Rectangle GetBBox(Bitmap bmp) {
        int minX = bmp.Width, minY = bmp.Height, maxX = -1, maxY = -1;
        for (int y = 0; y < bmp.Height; y++) {
            for (int x = 0; x < bmp.Width; x++) {
                if (bmp.GetPixel(x, y).A > 10) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }
        if (maxX < minX) return new Rectangle(0, 0, 16, 16);
        return new Rectangle(minX, minY, maxX - minX + 1, maxY - minY + 1);
    }

    public static void ProcessSheet(string inPath, string outPath, int[] splits, string alignMode) {
        Bitmap src = new Bitmap(inPath);
        List<Bitmap> cropped = new List<Bitmap>();
        int maxW = 0;
        int maxH = 0;

        for (int i = 0; i < 4; i++) {
            Bitmap cleaned = CleanMagentaCell(src, splits[i], splits[i + 1]);
            Rectangle bbox = GetBBox(cleaned);
            Bitmap crop = new Bitmap(bbox.Width, bbox.Height, PixelFormat.Format32bppArgb);
            using (Graphics g = Graphics.FromImage(crop)) {
                g.DrawImage(cleaned, new Rectangle(0, 0, bbox.Width, bbox.Height), bbox, GraphicsUnit.Pixel);
            }
            cleaned.Dispose();
            cropped.Add(crop);
            if (bbox.Width > maxW) maxW = bbox.Width;
            if (bbox.Height > maxH) maxH = bbox.Height;
        }
        src.Dispose();

        int pad = 4;
        int frameW = maxW + pad * 2;
        int frameH = maxH + pad * 2;

        Bitmap strip = new Bitmap(frameW * 4, frameH, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(strip)) {
            g.Clear(Color.FromArgb(0, 0, 0, 0));
            for (int i = 0; i < 4; i++) {
                Bitmap c = cropped[i];
                int ox = i * frameW;
                int dx = ox + (frameW - c.Width) / 2;
                int dy = (frameH - c.Height) / 2;
                if (alignMode == "bottom") {
                    dy = frameH - pad - c.Height;
                }
                g.DrawImage(c, new Rectangle(dx, dy, c.Width, c.Height));
                c.Dispose();
            }
        }
        strip.Save(outPath, ImageFormat.Png);
        Console.WriteLine(string.Format("[{0}] strip={1}x{2} frame={3}x{4}",
            Path.GetFileName(outPath), strip.Width, strip.Height, frameW, frameH));
        strip.Dispose();
    }

    public static void BuildCanyonForegroundMask(string bgPath, string outPath) {
        Bitmap src = new Bitmap(bgPath);
        int pw = 620; // 860 - 240
        int ph = 135; // 265 - 130
        Bitmap patch = new Bitmap(pw, ph, PixelFormat.Format32bppArgb);

        // Sample using exact WebGL NEAREST texel mapping at 1280x720 logical coordinates (240..860, 130..265)
        for (int y = 0; y < ph; y++) {
            int yGlobal = 130 + y;
            int sy = Math.Min(src.Height - 1, (yGlobal * src.Height) / 720);
            for (int x = 0; x < pw; x++) {
                int xGlobal = 240 + x;
                int sx = Math.Min(src.Width - 1, (xGlobal * src.Width) / 1280);
                Color c = src.GetPixel(sx, sy);
                // On the left side (xGlobal < 468), only bright blue sky / white cloud (B > 170) is transparent,
                // keeping all darker green pine trees and cliff shadows 100% solid opaque!
                bool isSkyOrCloud = (xGlobal < 468)
                    ? ((c.B > c.R && c.B > 170) || (c.R > 210 && c.G > 225 && c.B > 230))
                    : ((c.B > c.R) || (c.R > 200 && c.G > 215 && c.B > 225));
                bool isCentralValleyGap = (xGlobal >= 468 && xGlobal <= 695);
                if (isSkyOrCloud || isCentralValleyGap) {
                    patch.SetPixel(x, y, Color.FromArgb(0, 0, 0, 0));
                } else {
                    patch.SetPixel(x, y, Color.FromArgb(255, c.R, c.G, c.B));
                }
            }
        }
        src.Dispose();

        // Keep ONLY pixels connected to the left foreground cliff edge (x = 0) or right foreground cliff edge (x = pw - 1)
        // so disconnected distant-mountain tan ridges in xGlobal 695..795 are removed cleanly and solid cliff interiors have zero holes!
        bool[,] keep = new bool[ph, pw];
        Queue<Point> q = new Queue<Point>();
        for (int y = 0; y < ph; y++) {
            if (patch.GetPixel(0, y).A > 0) {
                keep[y, 0] = true;
                q.Enqueue(new Point(0, y));
            }
            if (patch.GetPixel(pw - 1, y).A > 0) {
                keep[y, pw - 1] = true;
                q.Enqueue(new Point(pw - 1, y));
            }
        }
        int[] dx = new int[] { -1, 1, 0, 0 };
        int[] dy = new int[] { 0, 0, -1, 1 };
        while (q.Count > 0) {
            Point p = q.Dequeue();
            for (int d = 0; d < 4; d++) {
                int nx = p.X + dx[d];
                int ny = p.Y + dy[d];
                if (nx >= 0 && nx < pw && ny >= 0 && ny < ph && !keep[ny, nx]) {
                    if (patch.GetPixel(nx, ny).A > 0) {
                        keep[ny, nx] = true;
                        q.Enqueue(new Point(nx, ny));
                    }
                }
            }
        }
        for (int y = 0; y < ph; y++) {
            for (int x = 0; x < pw; x++) {
                if (!keep[y, x]) {
                    patch.SetPixel(x, y, Color.FromArgb(0, 0, 0, 0));
                }
            }
        }

        patch.Save(outPath, ImageFormat.Png);
        Console.WriteLine(string.Format("[{0}] size={1}x{2}", Path.GetFileName(outPath), pw, ph));
        patch.Dispose();
    }
}
"@

$rootDir = Split-Path -Parent $PSScriptRoot
$pagesDir = Join-Path $rootDir "public\assets\stories\colorado\pages"
$spritesDir = Join-Path $rootDir "public\assets\stories\colorado\sprites\p4"

$p4Canyon = Join-Path $pagesDir "p4-canyon.jpg"
$p4Bak = Join-Path $pagesDir "p4-canyon.v0.bak.jpg"
if ((Test-Path $p4Canyon) -and -not (Test-Path $p4Bak)) {
    Copy-Item $p4Canyon $p4Bak -Force
}

[P4SpriteProcessor]::ProcessSheet(
    (Join-Path $spritesDir "p4_bighorn_sheet.jpg"),
    (Join-Path $spritesDir "p4_bighorn.png"),
    @(0, 256, 512, 768, 1024),
    "bottom"
)
[P4SpriteProcessor]::ProcessSheet(
    (Join-Path $spritesDir "p4_cessna_sheet.jpg"),
    (Join-Path $spritesDir "p4_cessna.png"),
    @(0, 256, 512, 768, 1024),
    "center"
)
[P4SpriteProcessor]::ProcessSheet(
    (Join-Path $spritesDir "p4_doggie_fisherman_sheet.jpg"),
    (Join-Path $spritesDir "p4_doggie_fisherman.png"),
    @(0, 265, 535, 765, 1024),
    "bottom"
)
[P4SpriteProcessor]::ProcessSheet(
    (Join-Path $spritesDir "p4_dragonfly_sheet.jpg"),
    (Join-Path $spritesDir "p4_dragonfly.png"),
    @(0, 256, 512, 735, 1024),
    "center"
)
[P4SpriteProcessor]::ProcessSheet(
    (Join-Path $spritesDir "p4_sparky_tube_sheet.jpg"),
    (Join-Path $spritesDir "p4_sparky_tube.png"),
    @(0, 254, 526, 770, 1024),
    "bottom"
)
[P4SpriteProcessor]::BuildCanyonForegroundMask(
    (Join-Path $pagesDir "p4-clean.jpg"),
    (Join-Path $spritesDir "p4_canyon_foreground_mask.png")
)
