$ErrorActionPreference = "Stop"

Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;

public class P2SpriteProcessor {
    private static bool IsPureMagentaSeed(int r, int g, int b) {
        return r > 165 && g < 95 && b > 165 && (r + b - 2 * g) > 180 && Math.Abs(r - b) < 40;
    }

    private static bool IsMagenta(int r, int g, int b) {
        return r > 145 && g < 105 && b > 145 && (r + b - 2 * g) > 150 && Math.Abs(r - b) < 45;
    }

    private static bool IsBorderMagenta(int r, int g, int b) {
        return (r > 155 && g < 110 && b > 155 && (r + b - 2 * g) > 150) ||
               (r > 130 && g < 55 && b > 130 && Math.Abs(r - b) < 30 && (r + b - 2 * g) > 160) ||
               IsMagenta(r, g, b);
    }

    public static Bitmap CleanMagentaSheet(Bitmap src) {
        int w = src.Width;
        int h = src.Height;
        Bitmap bmp = new Bitmap(w, h, PixelFormat.Format32bppArgb);
        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                Color c = src.GetPixel(x, y);
                bmp.SetPixel(x, y, Color.FromArgb(255, c.R, c.G, c.B));
            }
        }

        bool[,] visited = new bool[h, w];
        Queue<Point> q = new Queue<Point>();
        int margin = 4;

        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                if (x < margin || x >= w - margin || y < margin || y >= h - margin) {
                    Color c = bmp.GetPixel(x, y);
                    if (IsBorderMagenta(c.R, c.G, c.B)) {
                        visited[y, x] = true;
                        q.Enqueue(new Point(x, y));
                    }
                }
            }
        }

        int[] dx = new int[] { -1, 1, 0, 0 };
        int[] dy = new int[] { 0, 0, -1, 1 };

        while (q.Count > 0) {
            Point p = q.Dequeue();
            bmp.SetPixel(p.X, p.Y, Color.FromArgb(0, 0, 0, 0));
            for (int d = 0; d < 4; d++) {
                int nx = p.X + dx[d];
                int ny = p.Y + dy[d];
                if (nx >= 0 && nx < w && ny >= 0 && ny < h && !visited[ny, nx]) {
                    Color nc = bmp.GetPixel(nx, ny);
                    if (IsBorderMagenta(nc.R, nc.G, nc.B)) {
                        visited[ny, nx] = true;
                        q.Enqueue(new Point(nx, ny));
                    }
                }
            }
        }

        // Interior enclosed magenta holes seeded from pure #FF00FF (so Emma's purple dress & lavender stay 100% intact)
        for (int y = 1; y < h - 1; y++) {
            for (int x = 1; x < w - 1; x++) {
                if (!visited[y, x]) {
                    Color c = bmp.GetPixel(x, y);
                    if (c.A > 0 && IsPureMagentaSeed(c.R, c.G, c.B)) {
                        visited[y, x] = true;
                        q.Enqueue(new Point(x, y));
                        while (q.Count > 0) {
                            Point p = q.Dequeue();
                            bmp.SetPixel(p.X, p.Y, Color.FromArgb(0, 0, 0, 0));
                            for (int d = 0; d < 4; d++) {
                                int nx = p.X + dx[d];
                                int ny = p.Y + dy[d];
                                if (nx >= 0 && nx < w && ny >= 0 && ny < h && !visited[ny, nx]) {
                                    Color nc = bmp.GetPixel(nx, ny);
                                    if (nc.A > 0 && IsMagenta(nc.R, nc.G, nc.B)) {
                                        visited[ny, nx] = true;
                                        q.Enqueue(new Point(nx, ny));
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // 1px magenta edge de-spill pass
        Bitmap copy = new Bitmap(bmp);
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
                    if ((c.R + c.B - 2 * c.G) > 140 && c.R > 145 && c.B > 145 && Math.Abs(c.R - c.B) < 45) {
                        bmp.SetPixel(x, y, Color.FromArgb(0, 0, 0, 0));
                    } else if (c.R > c.G + 35 && c.B > c.G + 35 && Math.Abs(c.R - c.B) < 35) {
                        int avg = Math.Min(255, (int)(c.G * 0.7 + Math.Min(c.R, c.B) * 0.3));
                        bmp.SetPixel(x, y, Color.FromArgb(Math.Min((int)c.A, 220), avg, c.G, avg));
                    }
                }
            }
        }
        copy.Dispose();
        return bmp;
    }

    private static int[] FindFourFrameSplits(Bitmap bmp) {
        int w = bmp.Width;
        int h = bmp.Height;
        int[] colCounts = new int[w];
        for (int x = 0; x < w; x++) {
            int cnt = 0;
            for (int y = 0; y < h; y++) {
                if (bmp.GetPixel(x, y).A > 16) cnt++;
            }
            colCounts[x] = cnt;
        }

        double[] targets = new double[] { 0.25, 0.50, 0.75 };
        int[] splits = new int[5];
        splits[0] = 0;
        splits[4] = w;

        for (int t = 0; t < 3; t++) {
            int center = (int)(w * targets[t]);
            int lo = (int)(w * (targets[t] - 0.09));
            int hi = (int)(w * (targets[t] + 0.09));
            int bestX = center;
            long bestScore = long.MaxValue;
            for (int x = lo; x <= hi; x++) {
                long winSum = 0;
                for (int k = Math.Max(0, x - 3); k <= Math.Min(w - 1, x + 3); k++) {
                    winSum += colCounts[k];
                }
                long dist = Math.Abs(x - center);
                long score = (long)colCounts[x] * 100000L + winSum * 100L + dist;
                if (score < bestScore) {
                    bestScore = score;
                    bestX = x;
                }
            }
            splits[t + 1] = bestX;
        }
        return splits;
    }

    private static Rectangle GetBBox(Bitmap bmp, int x0, int x1) {
        int minX = x1, minY = bmp.Height, maxX = x0 - 1, maxY = -1;
        for (int y = 0; y < bmp.Height; y++) {
            for (int x = x0; x < x1; x++) {
                if (bmp.GetPixel(x, y).A > 16) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }
        if (maxX < minX) return new Rectangle(x0, 0, Math.Max(1, x1 - x0), bmp.Height);
        return new Rectangle(minX, minY, maxX - minX + 1, maxY - minY + 1);
    }

    public static void ProcessSheetToStrip(string inPath, string outPath, string alignMode, int pad) {
        Bitmap raw = new Bitmap(inPath);
        Bitmap cleaned = CleanMagentaSheet(raw);
        raw.Dispose();

        int[] splits = FindFourFrameSplits(cleaned);
        Rectangle[] bboxes = new Rectangle[4];
        int globalMinY = cleaned.Height;
        int globalMaxY = 0;

        for (int i = 0; i < 4; i++) {
            bboxes[i] = GetBBox(cleaned, splits[i], splits[i + 1]);
            if (bboxes[i].Top < globalMinY) globalMinY = bboxes[i].Top;
            if (bboxes[i].Bottom > globalMaxY) globalMaxY = bboxes[i].Bottom;
        }

        List<Bitmap> cropped = new List<Bitmap>();
        int maxW = 1, maxH = 1;
        for (int i = 0; i < 4; i++) {
            Rectangle cropRect = bboxes[i];
            if (alignMode == "center_shared_y") {
                cropRect = new Rectangle(bboxes[i].X, globalMinY, bboxes[i].Width, Math.Max(1, globalMaxY - globalMinY));
            }
            Bitmap c = cleaned.Clone(cropRect, PixelFormat.Format32bppArgb);
            cropped.Add(c);
            if (c.Width > maxW) maxW = c.Width;
            if (c.Height > maxH) maxH = c.Height;
        }
        cleaned.Dispose();

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
                if (alignMode == "bottom_center") {
                    dy = frameH - pad - c.Height;
                }
                g.DrawImage(c, new Rectangle(dx, dy, c.Width, c.Height));
                c.Dispose();
            }
        }

        strip.Save(outPath, ImageFormat.Png);
        Console.WriteLine(string.Format("[{0}] strip={1}x{2} frame={3}x{4} splits=[{5},{6},{7}]",
            Path.GetFileName(outPath), strip.Width, strip.Height, frameW, frameH, splits[1], splits[2], splits[3]));
        strip.Dispose();
    }
}
"@

$rootDir = (Resolve-Path ".").Path
$pagesDir = Join-Path $rootDir "public\assets\stories\colorado\pages"
$p2Dir = Join-Path $rootDir "public\assets\stories\colorado\sprites\p2"
New-Item -ItemType Directory -Force -Path $p2Dir | Out-Null

$p2CleanCandidates = @(
    (Join-Path $pagesDir "p2-clean.jpg"),
    (Join-Path $p2Dir "p2-clean.jpg")
)
$p2CleanSrc = $null
foreach ($c in $p2CleanCandidates) {
    if (Test-Path $c) { $p2CleanSrc = (Resolve-Path $c).Path; break }
}
if (-not $p2CleanSrc) {
    throw "Could not find p2-clean.jpg in pages/ or sprites/p2/"
}
$p2CleanDst = Join-Path $pagesDir "p2-clean.jpg"
if ($p2CleanSrc -ne $p2CleanDst) {
    Copy-Item -Force $p2CleanSrc $p2CleanDst
}
$p2HouseJpg = Join-Path $pagesDir "p2-house.jpg"
$p2HouseBak = Join-Path $pagesDir "p2-house.v0.bak.jpg"
if ((Test-Path $p2HouseJpg) -and -not (Test-Path $p2HouseBak)) {
    Copy-Item -Force $p2HouseJpg $p2HouseBak
}
Copy-Item -Force $p2CleanDst $p2HouseJpg

$specs = @(
    @("p2_grandparents_wave_sheet.jpg", "p2_grandparents_wave.png", "bottom_center"),
    @("p2_wyatt_run_sheet.jpg", "p2_wyatt_run.png", "bottom_center"),
    @("p2_emma_run_sheet.jpg", "p2_emma_run.png", "bottom_center"),
    @("p2_chimney_sparky_sheet.jpg", "p2_chimney_sparky.png", "bottom_center"),
    @("p2_bush_doggie_sheet.jpg", "p2_bush_doggie.png", "bottom_center"),
    @("p2_lavender_butterflies_sheet.jpg", "p2_lavender_butterflies.png", "center"),
    @("p2_lawn_sprinkler_sheet.jpg", "p2_lawn_sprinkler.png", "bottom_center"),
    @("p2_tree_squirrel_sheet.jpg", "p2_tree_squirrel.png", "center_shared_y")
)

foreach ($s in $specs) {
    $inFile = Join-Path $p2Dir $s[0]
    $outFile = Join-Path $p2Dir $s[1]
    [P2SpriteProcessor]::ProcessSheetToStrip($inFile, $outFile, $s[2], 4)
}
