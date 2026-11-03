$ErrorActionPreference = "Stop"

Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;

public class P3SpriteProcessor {
    private static bool IsPureMagentaSeed(int r, int g, int b) {
        return r > 175 && g < 90 && b > 175 && (r + b - 2 * g) > 195 && Math.Abs(r - b) < 38;
    }

    private static bool IsMagenta(int r, int g, int b) {
        return r > 150 && g < 102 && b > 150 && (r + b - 2 * g) > 165 && Math.Abs(r - b) < 45;
    }

    private static bool IsBorderMagenta(int r, int g, int b) {
        return (r > 165 && g < 105 && b > 165 && (r + b - 2 * g) > 170) ||
               (r > 135 && g < 55 && b > 135 && Math.Abs(r - b) < 30 && (r + b - 2 * g) > 165) ||
               IsMagenta(r, g, b);
    }

    private static bool IsProtectedInteriorPixel(string mode, int x, int y, int w, int h) {
        if (mode == "grandparents") {
            // Protect the rainbow lollipop in Frame 2 (x: 0.59w..0.70w, y: 0.08h..0.31h)
            // and the floating pink hearts in Frame 3 (x: 0.80w..0.99w, y: 0.08h..0.25h)
            if (x >= (int)(w * 0.59) && x <= (int)(w * 0.70) && y >= (int)(h * 0.08) && y <= (int)(h * 0.31)) {
                return true;
            }
            if (x >= (int)(w * 0.80) && x <= (int)(w * 0.99) && y >= (int)(h * 0.08) && y <= (int)(h * 0.25)) {
                return true;
            }
        } else if (mode == "wheel") {
            // Protect the inner rainbow segments inside each of the 4 circular wheels (radius <= 0.086 * w)
            double cy = h * 0.50;
            double rLimit = w * 0.086;
            double[] centers = new double[] { w * 0.128, w * 0.373, w * 0.620, w * 0.868 };
            foreach (double cx in centers) {
                double dx = x - cx;
                double dy = y - cy;
                if (dx * dx + dy * dy <= rLimit * rLimit) {
                    return true;
                }
            }
        }
        return false;
    }

    public static Bitmap CleanMagentaSheet(Bitmap src, bool allowInteriorHoles, string specialMode) {
        int w = src.Width;
        int h = src.Height;
        Bitmap bmp = new Bitmap(w, h, PixelFormat.Format32bppArgb);
        int borderMargin = 6;

        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                if (x < borderMargin || x >= w - borderMargin || y < borderMargin || y >= h - borderMargin) {
                    bmp.SetPixel(x, y, Color.FromArgb(0, 0, 0, 0));
                } else {
                    Color c = src.GetPixel(x, y);
                    bmp.SetPixel(x, y, Color.FromArgb(255, c.R, c.G, c.B));
                }
            }
        }

        bool[,] visited = new bool[h, w];
        Queue<Point> q = new Queue<Point>();

        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                Color c = bmp.GetPixel(x, y);
                if (c.A == 0) {
                    visited[y, x] = true;
                    q.Enqueue(new Point(x, y));
                } else if (x <= borderMargin + 1 || x >= w - borderMargin - 2 || y <= borderMargin + 1 || y >= h - borderMargin - 2) {
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
                    if (nc.A == 0 || IsBorderMagenta(nc.R, nc.G, nc.B)) {
                        visited[ny, nx] = true;
                        q.Enqueue(new Point(nx, ny));
                    }
                }
            }
        }

        // Interior enclosed magenta holes
        if (allowInteriorHoles) {
            for (int y = borderMargin; y < h - borderMargin; y++) {
                for (int x = borderMargin; x < w - borderMargin; x++) {
                    if (!visited[y, x] && !IsProtectedInteriorPixel(specialMode, x, y, w, h)) {
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
                                    if (nx >= 0 && nx < w && ny >= borderMargin && ny < h - borderMargin && !visited[ny, nx]) {
                                        if (!IsProtectedInteriorPixel(specialMode, nx, ny, w, h)) {
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
                if (nearTrans && !IsProtectedInteriorPixel(specialMode, x, y, w, h)) {
                    if ((c.R + c.B - 2 * c.G) > 145 && c.R > 150 && c.B > 150 && Math.Abs(c.R - c.B) < 45) {
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
            int lo = (int)(w * (targets[t] - 0.08));
            int hi = (int)(w * (targets[t] + 0.08));
            int bestX = center;
            long bestScore = long.MaxValue;
            for (int x = lo; x <= hi; x++) {
                long winSum = 0;
                for (int k = Math.Max(0, x - 2); k <= Math.Min(w - 1, x + 2); k++) {
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

    private static Bitmap ExtractCellBitmap(Bitmap cleaned, int frameIdx, int[] splits, string specialMode) {
        int w = cleaned.Width;
        int h = cleaned.Height;

        if (specialMode == "grandparents") {
            int split01 = splits[1];
            Bitmap cell = new Bitmap(w, h, PixelFormat.Format32bppArgb);
            int minX = w, minY = h, maxX = -1, maxY = -1;
            for (int y = 0; y < h; y++) {
                // Contour between Frame 1 (Babci's left hand/sleeve at y: 0.36h..0.56h) and Frame 2 (Grandpa's right sleeve)
                int boundary12 = (y >= (int)(h * 0.36) && y <= (int)(h * 0.56)) ? (int)(w * 0.511) : (int)(w * 0.502);
                // 3-step contour between Frame 2 (lollipop / Babci's hair / Babci's elbow) and Frame 3 (Grandpa's raised fist / sleeve / hip)
                int boundary23;
                if (y < (int)(h * 0.215)) {
                    boundary23 = (int)(w * 0.700);
                } else if (y < (int)(h * 0.395)) {
                    boundary23 = (int)(w * 0.734);
                } else {
                    boundary23 = (int)(w * 0.756);
                }

                int rowStart = 0;
                int rowEnd = w;
                if (frameIdx == 0) { rowStart = 0; rowEnd = split01; }
                else if (frameIdx == 1) { rowStart = split01; rowEnd = boundary12; }
                else if (frameIdx == 2) { rowStart = boundary12; rowEnd = boundary23; }
                else { rowStart = boundary23; rowEnd = w; }

                for (int x = rowStart; x < rowEnd; x++) {
                    Color c = cleaned.GetPixel(x, y);
                    if (c.A > 16) {
                        cell.SetPixel(x, y, c);
                    }
                }
            }

            // Remove any tiny disconnected boundary sliver (< 60 pixels) that touches the left/right split boundary in y >= 0.22h
            bool[,] vis = new bool[h, w];
            int[] cdx = new int[] { -1, 1, 0, 0 };
            int[] cdy = new int[] { 0, 0, -1, 1 };
            for (int y = (int)(h * 0.22); y < h; y++) {
                for (int x = 0; x < w; x++) {
                    if (!vis[y, x] && cell.GetPixel(x, y).A > 16) {
                        List<Point> comp = new List<Point>();
                        Queue<Point> cq = new Queue<Point>();
                        vis[y, x] = true;
                        cq.Enqueue(new Point(x, y));
                        while (cq.Count > 0) {
                            Point pt = cq.Dequeue();
                            comp.Add(pt);
                            for (int d = 0; d < 4; d++) {
                                int nx = pt.X + cdx[d];
                                int ny = pt.Y + cdy[d];
                                if (nx >= 0 && nx < w && ny >= 0 && ny < h && !vis[ny, nx] && cell.GetPixel(nx, ny).A > 16) {
                                    vis[ny, nx] = true;
                                    cq.Enqueue(new Point(nx, ny));
                                }
                            }
                        }
                        if (comp.Count < 85 && x < (int)(w * 0.92)) {
                            foreach (Point pt in comp) {
                                cell.SetPixel(pt.X, pt.Y, Color.FromArgb(0, 0, 0, 0));
                            }
                        }
                    }
                }
            }

            for (int y = 0; y < h; y++) {
                for (int x = 0; x < w; x++) {
                    if (cell.GetPixel(x, y).A > 16) {
                        if (x < minX) minX = x;
                        if (x > maxX) maxX = x;
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                    }
                }
            }
            if (maxX < minX) {
                cell.Dispose();
                return new Bitmap(1, 1, PixelFormat.Format32bppArgb);
            }
            Rectangle cropRect = new Rectangle(minX, minY, maxX - minX + 1, maxY - minY + 1);
            Bitmap cropped = cell.Clone(cropRect, PixelFormat.Format32bppArgb);
            cell.Dispose();
            return cropped;
        }

        int sx0 = splits[frameIdx];
        int sx1 = splits[frameIdx + 1];
        int bMinX = sx1, bMinY = h, bMaxX = sx0 - 1, bMaxY = -1;
        for (int y = 0; y < h; y++) {
            for (int x = sx0; x < sx1; x++) {
                if (cleaned.GetPixel(x, y).A > 16) {
                    if (x < bMinX) bMinX = x;
                    if (x > bMaxX) bMaxX = x;
                    if (y < bMinY) bMinY = y;
                    if (y > bMaxY) bMaxY = y;
                }
            }
        }
        if (bMaxX < bMinX) {
            return new Bitmap(1, 1, PixelFormat.Format32bppArgb);
        }
        Rectangle rect = new Rectangle(bMinX, bMinY, bMaxX - bMinX + 1, bMaxY - bMinY + 1);
        return cleaned.Clone(rect, PixelFormat.Format32bppArgb);
    }

    public static void ProcessSheetToStrip(
        string inPath,
        string outPath,
        string alignMode,
        bool allowInteriorHoles,
        string specialMode,
        int pad
    ) {
        Bitmap raw = new Bitmap(inPath);
        Bitmap cleaned = CleanMagentaSheet(raw, allowInteriorHoles, specialMode);
        raw.Dispose();

        int[] splits = FindFourFrameSplits(cleaned);

        List<Bitmap> cropped = new List<Bitmap>();
        int maxW = 1, maxH = 1;
        for (int i = 0; i < 4; i++) {
            Bitmap c = ExtractCellBitmap(cleaned, i, splits, specialMode);
            cropped.Add(c);
            if (c.Width > maxW) maxW = c.Width;
            if (c.Height > maxH) maxH = c.Height;
        }
        cleaned.Dispose();

        int topPad = (alignMode == "top_center") ? 0 : pad;
        int frameW = maxW + pad * 2;
        int frameH = maxH + pad + topPad;
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
                } else if (alignMode == "top_center") {
                    dy = 0;
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
$p3Dir = Join-Path $rootDir "public\assets\stories\colorado\sprites\p3"

$specs = @(
    @("p3_wyatt_skeeball_sheet.jpg",     "p3_wyatt_skeeball.png",     "bottom_center", $true,  "normal"),
    @("p3_emma_tickets_sheet.jpg",       "p3_emma_tickets.png",       "bottom_center", $true,  "normal"),
    @("p3_grandparents_cheer_sheet.jpg", "p3_grandparents_cheer.png", "bottom_center", $true,  "grandparents"),
    @("p3_pony_doggie_sheet.jpg",        "p3_pony_doggie.png",        "bottom_center", $true,  "normal"),
    @("p3_claw_sparky_sheet.jpg",        "p3_claw_sparky.png",        "top_center",    $true,  "normal"),
    @("p3_fortuneteller_sheet.jpg",      "p3_fortuneteller.png",      "bottom_center", $false, "normal"),
    @("p3_bigfoot_wheel_sheet.jpg",      "p3_bigfoot_wheel.png",      "center",        $true,  "wheel")
)

foreach ($s in $specs) {
    $inFile = Join-Path $p3Dir $s[0]
    $outFile = Join-Path $p3Dir $s[1]
    [P3SpriteProcessor]::ProcessSheetToStrip($inFile, $outFile, $s[2], $s[3], $s[4], 4)
}
