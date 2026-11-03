$ErrorActionPreference = "Stop"

Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;

public class P5SpriteProcessor {
    private static bool IsMagenta(int r, int g, int b) {
        return r > 175 && g < 95 && b > 175 && (r + b - 2 * g) > 190;
    }

    private static bool IsBorderMagenta(int r, int g, int b) {
        return (r > 155 && g < 110 && b > 155 && (r + b - 2 * g) > 150) || IsMagenta(r, g, b);
    }

    public static Bitmap CleanMagentaCell(Bitmap src, int x0, int x1, int y0, int y1, string specialMode) {
        int fullW = src.Width;
        int fullH = src.Height;
        int w = x1 - x0;
        int h = y1 - y0;
        Bitmap cell = new Bitmap(w, h, PixelFormat.Format32bppArgb);

        for (int y = 0; y < h; y++) {
            int sy = y0 + y;
            for (int x = 0; x < w; x++) {
                int sx = x0 + x;
                if (sx < 5 || sx >= fullW - 5 || sy < 5 || sy >= fullH - 5) {
                    cell.SetPixel(x, y, Color.FromArgb(255, 255, 0, 255));
                } else if (specialMode == "gondola" && y < (int)(0.22 * h) && (x < (int)(0.28 * w) || x > (int)(0.72 * w))) {
                    // Trim stray diagonal cable line stubs outside the grey pulley wheel carriage
                    cell.SetPixel(x, y, Color.FromArgb(255, 255, 0, 255));
                } else {
                    Color c = src.GetPixel(sx, sy);
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

        // Special Raft Isolation: Strip square turquoise wave blocks & distant white foam
        if (specialMode == "raft") {
            bool[,] warmSeed = new bool[h, w];
            for (int y = 0; y < h; y++) {
                for (int x = 0; x < w; x++) {
                    Color c = cell.GetPixel(x, y);
                    if (c.A == 0) continue;
                    if (c.R > c.G + 15 && c.R > c.B + 25 && c.R > 90) {
                        warmSeed[y, x] = true;
                    }
                }
            }

            bool[,] raftBody = new bool[h, w];
            for (int y = 0; y < h; y++) {
                for (int x = 0; x < w; x++) {
                    Color c = cell.GetPixel(x, y);
                    if (c.A == 0) continue;
                    if (warmSeed[y, x]) {
                        raftBody[y, x] = true;
                        continue;
                    }
                    bool isTurquoise = (c.B > c.R) || (c.G > c.R + 12);
                    bool isWhiteFoam = (c.R > 205 && c.G > 215 && c.B > 215);
                    if (!isTurquoise && !isWhiteFoam) {
                        bool nearWarm = false;
                        for (int oy = -4; oy <= 4 && !nearWarm; oy++) {
                            int ny = y + oy;
                            if (ny < 0 || ny >= h) continue;
                            for (int ox = -4; ox <= 4; ox++) {
                                int nx = x + ox;
                                if (nx >= 0 && nx < w && warmSeed[ny, nx]) {
                                    nearWarm = true;
                                    break;
                                }
                            }
                        }
                        if (nearWarm) {
                            raftBody[y, x] = true;
                        }
                    }
                }
            }

            bool[,] keep = new bool[h, w];
            for (int y = 0; y < h; y++) {
                for (int x = 0; x < w; x++) {
                    if (raftBody[y, x]) {
                        keep[y, x] = true;
                        continue;
                    }
                    Color c = cell.GetPixel(x, y);
                    if (c.A == 0) continue;
                    bool isTurquoise = (c.B > c.R + 15) || (c.G > c.R + 18);
                    if (!isTurquoise && c.R > 195 && c.G > 205 && c.B > 205) {
                        bool nearRaft = false;
                        for (int oy = -2; oy <= 2 && !nearRaft; oy++) {
                            int ny = y + oy;
                            if (ny < 0 || ny >= h) continue;
                            for (int ox = -2; ox <= 2; ox++) {
                                int nx = x + ox;
                                if (nx >= 0 && nx < w && raftBody[ny, nx]) {
                                    nearRaft = true;
                                    break;
                                }
                            }
                        }
                        if (nearRaft) {
                            keep[y, x] = true;
                        }
                    }
                }
            }

            for (int y = 0; y < h; y++) {
                for (int x = 0; x < w; x++) {
                    if (!keep[y, x]) {
                        cell.SetPixel(x, y, Color.FromArgb(0, 0, 0, 0));
                    }
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

    public static void ProcessSheet(string inPath, string outPath, int[] splits, bool topHalfOnly, string alignMode, string specialMode) {
        Bitmap src = new Bitmap(inPath);
        int y0 = 0;
        int y1 = topHalfOnly ? (src.Height / 2) : src.Height;
        List<Bitmap> cropped = new List<Bitmap>();
        int maxW = 0;
        int maxH = 0;

        for (int i = 0; i < 4; i++) {
            Bitmap cleaned = CleanMagentaCell(src, splits[i], splits[i + 1], y0, y1, specialMode);
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
        int topPad = (alignMode == "top") ? 0 : pad;
        int frameW = maxW + pad * 2;
        int frameH = maxH + topPad + pad;

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
                } else if (alignMode == "top") {
                    dy = 0;
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

    public static void BuildCliffForegroundMask(string bgPath, string outPath) {
        Bitmap src = new Bitmap(bgPath);
        int pw = 245; // 0..245
        int ph = 150; // 195..345
        Bitmap patch = new Bitmap(pw, ph, PixelFormat.Format32bppArgb);

        // Sample using exact WebGL NEAREST texel mapping at 1280x720 logical coordinates (0..245, 195..345)
        for (int y = 0; y < ph; y++) {
            int yGlobal = 195 + y;
            int sy = Math.Min(src.Height - 1, (yGlobal * src.Height) / 720);
            for (int x = 0; x < pw; x++) {
                int xGlobal = x;
                int sx = Math.Min(src.Width - 1, (xGlobal * src.Width) / 1280);
                Color c = src.GetPixel(sx, sy);
                patch.SetPixel(x, y, Color.FromArgb(255, c.R, c.G, c.B));
            }
        }
        src.Dispose();

        // For each column x, find the top of the warm red-orange canyon rock (R > B + 35 && R > 105)
        // and make all sky, clouds, and the twin black diagonal cables above the cliff silhouette transparent!
        for (int x = 0; x < pw; x++) {
            int cliffTopY = ph;
            for (int y = 0; y < ph; y++) {
                Color c = patch.GetPixel(x, y);
                if (c.R > c.B + 35 && c.R > 105) {
                    cliffTopY = Math.Max(0, y - 1);
                    break;
                }
            }
            for (int y = 0; y < cliffTopY; y++) {
                patch.SetPixel(x, y, Color.FromArgb(0, 0, 0, 0));
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
$spritesDir = Join-Path $rootDir "public\assets\stories\colorado\sprites\p5"

$p5Bridge = Join-Path $pagesDir "p5-bridge.jpg"
$p5Bak = Join-Path $pagesDir "p5-bridge.v0.bak.jpg"
if ((Test-Path $p5Bridge) -and -not (Test-Path $p5Bak)) {
    Copy-Item $p5Bridge $p5Bak -Force
}

[P5SpriteProcessor]::ProcessSheet(
    (Join-Path $spritesDir "p5_gondola_sparky_sheet.jpg"),
    (Join-Path $spritesDir "p5_gondola_sparky.png"),
    @(0, 256, 512, 768, 1024),
    $false,
    "top",
    "gondola"
)
[P5SpriteProcessor]::ProcessSheet(
    (Join-Path $spritesDir "p5_tower_flags_sheet.jpg"),
    (Join-Path $spritesDir "p5_tower_flags.png"),
    @(0, 256, 512, 768, 1024),
    $false,
    "center",
    "normal"
)
[P5SpriteProcessor]::ProcessSheet(
    (Join-Path $spritesDir "p5_railing_doggie_sheet.jpg"),
    (Join-Path $spritesDir "p5_railing_doggie.png"),
    @(0, 256, 512, 768, 1024),
    $true,
    "bottom",
    "normal"
)
[P5SpriteProcessor]::ProcessSheet(
    (Join-Path $spritesDir "p5_canyon_eagle_sheet.jpg"),
    (Join-Path $spritesDir "p5_canyon_eagle.png"),
    @(0, 307, 520, 758, 1024),
    $false,
    "center",
    "normal"
)
[P5SpriteProcessor]::ProcessSheet(
    (Join-Path $spritesDir "p5_tiny_raft_sheet.jpg"),
    (Join-Path $spritesDir "p5_tiny_raft.png"),
    @(0, 262, 512, 758, 1024),
    $false,
    "center",
    "raft"
)
[P5SpriteProcessor]::BuildCliffForegroundMask(
    (Join-Path $pagesDir "p5-clean.jpg"),
    (Join-Path $spritesDir "p5_cliff_foreground_mask.png")
)
