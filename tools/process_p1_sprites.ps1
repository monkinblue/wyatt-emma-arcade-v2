$ErrorActionPreference = "Stop"

Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;

public class P1SpriteProcessor {
    private static bool IsMagenta(int r, int g, int b) {
        return r > 175 && g < 95 && b > 175 && (r + b - 2 * g) > 190;
    }

    private static bool IsBorderMagenta(int r, int g, int b) {
        return (r > 155 && g < 110 && b > 155 && (r + b - 2 * g) > 150) || IsMagenta(r, g, b);
    }

    public static Bitmap CleanMagentaCell(Bitmap src, Rectangle rect, int maskMode) {
        int w = rect.Width;
        int h = rect.Height;
        Bitmap cell = new Bitmap(w, h, PixelFormat.Format32bppArgb);
        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                int sx = rect.X + x;
                int sy = rect.Y + y;
                if (maskMode == 1 && sx >= 525 && sy >= 220) {
                    cell.SetPixel(x, y, Color.FromArgb(255, 255, 0, 255));
                } else if (maskMode == 2 && sx <= 562 && sy < 220) {
                    cell.SetPixel(x, y, Color.FromArgb(255, 255, 0, 255));
                } else {
                    Color c = src.GetPixel(sx, sy);
                    cell.SetPixel(x, y, Color.FromArgb(255, c.R, c.G, c.B));
                }
            }
        }

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

        // Remove interior enclosed magenta holes
        for (int y = 1; y < h - 1; y++) {
            for (int x = 1; x < w - 1; x++) {
                Color c = cell.GetPixel(x, y);
                if (c.A > 0 && IsMagenta(c.R, c.G, c.B)) {
                    cell.SetPixel(x, y, Color.FromArgb(0, 0, 0, 0));
                }
            }
        }

        // 1px magenta fringe de-spill pass
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

    private static Rectangle GetBBox(Bitmap bmp) {
        int minX = bmp.Width, minY = bmp.Height, maxX = -1, maxY = -1;
        for (int y = 0; y < bmp.Height; y++) {
            for (int x = 0; x < bmp.Width; x++) {
                if (bmp.GetPixel(x, y).A > 16) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }
        if (maxX < minX) return new Rectangle(0, 0, bmp.Width, bmp.Height);
        return new Rectangle(minX, minY, maxX - minX + 1, maxY - minY + 1);
    }

    private static double GetBaseCenterX(Bitmap bmp, Rectangle bbox, double bottomRatio) {
        int yStart = Math.Max(bbox.Top, (int)Math.Round(bbox.Bottom - bbox.Height * bottomRatio));
        int minX = bbox.Right, maxX = bbox.Left - 1;
        for (int y = yStart; y < bbox.Bottom; y++) {
            for (int x = bbox.Left; x < bbox.Right; x++) {
                if (bmp.GetPixel(x, y).A > 32) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                }
            }
        }
        if (maxX < minX) return bbox.Width / 2.0;
        return ((minX - bbox.Left) + (maxX - bbox.Left)) / 2.0;
    }

    public static void BuildAndSaveStrip(List<Bitmap> frames, string outPath, string alignMode, int pad) {
        List<Bitmap> cropped = new List<Bitmap>();
        List<double> baseCxList = new List<double>();
        int maxW = 1, maxH = 1;

        foreach (Bitmap f in frames) {
            Rectangle bbox = GetBBox(f);
            double baseCx = GetBaseCenterX(f, bbox, 0.28);
            Bitmap c = f.Clone(bbox, PixelFormat.Format32bppArgb);
            cropped.Add(c);
            baseCxList.Add(baseCx);
            if (c.Width > maxW) maxW = c.Width;
            if (c.Height > maxH) maxH = c.Height;
        }

        int frameW = maxW + pad * 2;
        if (alignMode == "bottom_base") {
            int maxLeft = 0, maxRight = 0;
            for (int i = 0; i < cropped.Count; i++) {
                int l = (int)Math.Round(baseCxList[i]);
                int r = (int)Math.Round(cropped[i].Width - baseCxList[i]);
                if (l > maxLeft) maxLeft = l;
                if (r > maxRight) maxRight = r;
            }
            frameW = Math.Max(maxW, maxLeft + maxRight) + pad * 2;
        }
        int frameH = maxH + pad * 2;

        Bitmap strip = new Bitmap(frameW * cropped.Count, frameH, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(strip)) {
            g.Clear(Color.FromArgb(0, 0, 0, 0));
            for (int i = 0; i < cropped.Count; i++) {
                Bitmap c = cropped[i];
                int ox = i * frameW;
                int dx = ox + (frameW - c.Width) / 2;
                int dy = (frameH - c.Height) / 2;
                if (alignMode == "bottom_base") {
                    int targetCx = frameW / 2;
                    dx = ox + Math.Max(pad, Math.Min(frameW - c.Width - pad, (int)Math.Round(targetCx - baseCxList[i])));
                    dy = frameH - pad - c.Height;
                } else if (alignMode == "bottom_center") {
                    dx = ox + (frameW - c.Width) / 2;
                    dy = frameH - pad - c.Height;
                }
                g.DrawImage(c, new Rectangle(dx, dy, c.Width, c.Height));
                c.Dispose();
            }
        }
        strip.Save(outPath, ImageFormat.Png);
        Console.WriteLine(string.Format("[{0}] strip={1}x{2} frame={3}x{4} frames={5}",
            Path.GetFileName(outPath), strip.Width, strip.Height, frameW, frameH, cropped.Count));
        strip.Dispose();
        foreach (Bitmap f in frames) f.Dispose();
    }

    private static bool IsSkyPixel(int r, int g, int b) {
        return (b > 165 && r > 140 && g > 155 && (Math.Abs(r - g) < 30 || (b >= g && g >= r))) ||
               (b > 170 && g > 160 && r > 125 && b > r + 15);
    }

    private static bool IsRightBgPixel(int cxCanvas, int cyCanvas, int r, int g, int b) {
        if (cyCanvas >= 272) return false;
        if (cyCanvas >= 248 && cxCanvas < 682) return false;
        if (r < 68 && g < 62 && b < 65) return false;
        if (cxCanvas >= 535 && cxCanvas <= 575 && cyCanvas >= 224 && Math.Abs(r - b) < 20 && r < 115) return false;
        return true;
    }

    public static void BuildHeadsForegroundMask(string bgPath, string outPath) {
        Bitmap src = new Bitmap(bgPath);
        int pw = 330; // 715 - 385
        int ph = 150; // 315 - 165
        Bitmap patch = new Bitmap(pw, ph, PixelFormat.Format32bppArgb);

        // Sample using exact WebGL NEAREST texel mapping at 1280x720 logical coordinates (385..715, 165..315)
        for (int y = 0; y < ph; y++) {
            int canvasY = 165 + y;
            int sy = Math.Min(src.Height - 1, (canvasY * src.Height) / 720);
            for (int x = 0; x < pw; x++) {
                int canvasX = 385 + x;
                int sx = Math.Min(src.Width - 1, (canvasX * src.Width) / 1280);
                Color c = src.GetPixel(sx, sy);
                patch.SetPixel(x, y, Color.FromArgb(255, c.R, c.G, c.B));
            }
        }
        src.Dispose();

        // Left side (x < 150, i.e., canvasX < 535): exact existing sky/cloud transparency mask for Dad's & Wyatt's heads
        int leftW = 150;
        bool[,] visited = new bool[ph, leftW];
        Queue<Point> q = new Queue<Point>();

        for (int x = 0; x < leftW; x++) {
            Color c = patch.GetPixel(x, 0);
            if (IsSkyPixel(c.R, c.G, c.B)) {
                visited[0, x] = true;
                q.Enqueue(new Point(x, 0));
            }
        }
        for (int y = 0; y < ph; y++) {
            int[] xs = new int[] { 0, leftW - 1 };
            foreach (int x in xs) {
                if (!visited[y, x]) {
                    Color c = patch.GetPixel(x, y);
                    if (IsSkyPixel(c.R, c.G, c.B)) {
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
            patch.SetPixel(p.X, p.Y, Color.FromArgb(0, 0, 0, 0));
            for (int d = 0; d < 4; d++) {
                int nx = p.X + dx[d];
                int ny = p.Y + dy[d];
                if (nx >= 0 && nx < leftW && ny >= 0 && ny < ph && !visited[ny, nx]) {
                    Color nc = patch.GetPixel(nx, ny);
                    if (IsSkyPixel(nc.R, nc.G, nc.B)) {
                        visited[ny, nx] = true;
                        q.Enqueue(new Point(nx, ny));
                    }
                }
            }
        }

        // Clear any enclosed sky gap between Wyatt's head and Dad's chin above y=88 (canvas y < 253)
        for (int y = 0; y < Math.Min(ph, 88); y++) {
            for (int x = 0; x < leftW; x++) {
                Color c = patch.GetPixel(x, y);
                if (c.A > 0 && IsSkyPixel(c.R, c.G, c.B)) {
                    patch.SetPixel(x, y, Color.FromArgb(0, 0, 0, 0));
                }
            }
        }

        // Right side (x >= 150, i.e., canvasX >= 535):
        // Flood-fill from top border (y=0) and upper-right border (x=pw-1, canvasY < 270) through sky/clouds
        // and background orange-brown autumn trees, stopping at Rita's dark hair outline, the open car door frame,
        // and the car roofline so Rita's forehead, face, and Emma's head remain 100% opaque!
        bool[,] visitedR = new bool[ph, pw];
        Queue<Point> qr = new Queue<Point>();
        for (int x = leftW; x < pw; x++) {
            visitedR[0, x] = true;
            qr.Enqueue(new Point(x, 0));
        }
        for (int y = 0; y < ph; y++) {
            int cyCanvas = 165 + y;
            if (cyCanvas < 270 && !visitedR[y, pw - 1]) {
                Color c = patch.GetPixel(pw - 1, y);
                if (IsRightBgPixel(385 + pw - 1, cyCanvas, c.R, c.G, c.B)) {
                    visitedR[y, pw - 1] = true;
                    qr.Enqueue(new Point(pw - 1, y));
                }
            }
        }

        while (qr.Count > 0) {
            Point p = qr.Dequeue();
            patch.SetPixel(p.X, p.Y, Color.FromArgb(0, 0, 0, 0));
            for (int d = 0; d < 4; d++) {
                int nx = p.X + dx[d];
                int ny = p.Y + dy[d];
                if (nx >= leftW && nx < pw && ny >= 0 && ny < ph && !visitedR[ny, nx]) {
                    Color nc = patch.GetPixel(nx, ny);
                    if (IsRightBgPixel(385 + nx, 165 + ny, nc.R, nc.G, nc.B)) {
                        visitedR[ny, nx] = true;
                        qr.Enqueue(new Point(nx, ny));
                    }
                }
            }
        }

        patch.Save(outPath, ImageFormat.Png);
        Console.WriteLine(string.Format("[{0}] size={1}x{2} saved for (385, 165)",
            Path.GetFileName(outPath), patch.Width, patch.Height));
        patch.Dispose();
    }
}
"@

$rootDir = (Resolve-Path ".").Path
$spritesDir = Join-Path $rootDir "public\assets\stories\colorado\sprites"
$pagesDir = Join-Path $rootDir "public\assets\stories\colorado\pages"
$outP1Dir = Join-Path $spritesDir "p1"
New-Item -ItemType Directory -Force -Path $outP1Dir | Out-Null

function Resolve-ColoradoInput([string]$name) {
    foreach ($dir in @($outP1Dir, $spritesDir, $pagesDir)) {
        $cand = Join-Path $dir $name
        if (Test-Path $cand) { return (Resolve-Path $cand).Path }
    }
    throw "Could not find input asset: $name"
}

$p1CleanPath = Resolve-ColoradoInput "p1-clean.jpg"
$p1CleanTarget = Join-Path $pagesDir "p1-clean.jpg"
if ($p1CleanPath -ne $p1CleanTarget) {
    Copy-Item -Force $p1CleanPath $p1CleanTarget
}

# 1. p1_thule_sparky.png (2x2 grid, shave 6px border & cell split lines, bottom_base aligned)
$thuleBmp = New-Object System.Drawing.Bitmap((Resolve-ColoradoInput "p1_thule_sparky_sheet.jpg"))
$tw = $thuleBmp.Width; $th = $thuleBmp.Height; $m = 6
$thuleFrames = New-Object 'System.Collections.Generic.List[System.Drawing.Bitmap]'
$thuleFrames.Add([P1SpriteProcessor]::CleanMagentaCell($thuleBmp, (New-Object System.Drawing.Rectangle($m, $m, ($tw / 2 - 2 * $m), ($th / 2 - 2 * $m))), 0))
$thuleFrames.Add([P1SpriteProcessor]::CleanMagentaCell($thuleBmp, (New-Object System.Drawing.Rectangle(($tw / 2 + $m), $m, ($tw / 2 - 2 * $m), ($th / 2 - 2 * $m))), 0))
$thuleFrames.Add([P1SpriteProcessor]::CleanMagentaCell($thuleBmp, (New-Object System.Drawing.Rectangle($m, ($th / 2 + $m), ($tw / 2 - 2 * $m), ($th / 2 - 2 * $m))), 0))
$thuleFrames.Add([P1SpriteProcessor]::CleanMagentaCell($thuleBmp, (New-Object System.Drawing.Rectangle(($tw / 2 + $m), ($th / 2 + $m), ($tw / 2 - 2 * $m), ($th / 2 - 2 * $m))), 0))
$thuleBmp.Dispose()
[P1SpriteProcessor]::BuildAndSaveStrip($thuleFrames, (Join-Path $outP1Dir "p1_thule_sparky.png"), "bottom_base", 4)

# 2. p1_doggie_suitcase.png (2x4 grid, top row 4 frames, bottom_base aligned)
$doggieBmp = New-Object System.Drawing.Bitmap((Resolve-ColoradoInput "p1_doggie_suitcase_sheet.jpg"))
$dw = $doggieBmp.Width; $dh = $doggieBmp.Height
$doggieFrames = New-Object 'System.Collections.Generic.List[System.Drawing.Bitmap]'
for ($i = 0; $i -lt 4; $i++) {
    $x0 = [int]($i * $dw / 4) + $m
    $cw = [int]($dw / 4) - 2 * $m
    $ch = [int]($dh / 2) - 2 * $m
    $doggieFrames.Add([P1SpriteProcessor]::CleanMagentaCell($doggieBmp, (New-Object System.Drawing.Rectangle($x0, $m, $cw, $ch)), 0))
}
$doggieBmp.Dispose()
[P1SpriteProcessor]::BuildAndSaveStrip($doggieFrames, (Join-Path $outP1Dir "p1_doggie_suitcase.png"), "bottom_base", 4)

# 3. p1_exhaust_smoke.png (1x4 horizontal strip)
$smokeBmp = New-Object System.Drawing.Bitmap((Resolve-ColoradoInput "p1_exhaust_smoke_sheet.jpg"))
$sh = $smokeBmp.Height - 12
$smokeFrames = New-Object 'System.Collections.Generic.List[System.Drawing.Bitmap]'
foreach ($pair in @(@(6, 262), @(262, 511), @(511, 783), @(783, 1018))) {
    $smokeFrames.Add([P1SpriteProcessor]::CleanMagentaCell($smokeBmp, (New-Object System.Drawing.Rectangle($pair[0], 6, ($pair[1] - $pair[0]), $sh)), 0))
}
$smokeBmp.Dispose()
[P1SpriteProcessor]::BuildAndSaveStrip($smokeFrames, (Join-Path $outP1Dir "p1_exhaust_smoke.png"), "center", 4)

# 4. p1_bluebird.png (1x4 horizontal strip)
$birdBmp = New-Object System.Drawing.Bitmap((Resolve-ColoradoInput "p1_bluebird_sheet.jpg"))
$bh = $birdBmp.Height - 12
$birdFrames = New-Object 'System.Collections.Generic.List[System.Drawing.Bitmap]'
foreach ($pair in @(@(6, 255), @(255, 533), @(533, 750), @(750, 1018))) {
    $birdFrames.Add([P1SpriteProcessor]::CleanMagentaCell($birdBmp, (New-Object System.Drawing.Rectangle($pair[0], 6, ($pair[1] - $pair[0]), $bh)), 0))
}
$birdBmp.Dispose()
[P1SpriteProcessor]::BuildAndSaveStrip($birdFrames, (Join-Path $outP1Dir "p1_bluebird.png"), "bottom_center", 4)

# 5. p1_chipmunk.png (1x4 horizontal strip, bottom_base aligned on gray rock)
$chipBmp = New-Object System.Drawing.Bitmap((Resolve-ColoradoInput "p1_chipmunk_sheet.jpg"))
$ch = $chipBmp.Height - 12
$chipFrames = New-Object 'System.Collections.Generic.List[System.Drawing.Bitmap]'
foreach ($pair in @(@(6, 257), @(257, 536), @(536, 752), @(752, 1018))) {
    $chipFrames.Add([P1SpriteProcessor]::CleanMagentaCell($chipBmp, (New-Object System.Drawing.Rectangle($pair[0], 6, ($pair[1] - $pair[0]), $ch)), 0))
}
$chipBmp.Dispose()
[P1SpriteProcessor]::BuildAndSaveStrip($chipFrames, (Join-Path $outP1Dir "p1_chipmunk.png"), "bottom_base", 4)

# 6. p1_eagle_soar.png (1x4 horizontal strip with wingtip/tail separation between frames 1 & 2)
$eagleBmp = New-Object System.Drawing.Bitmap((Resolve-ColoradoInput "p1_eagle_soar_sheet.jpg"))
$eh = $eagleBmp.Height - 12
$eagleFrames = New-Object 'System.Collections.Generic.List[System.Drawing.Bitmap]'
$eagleFrames.Add([P1SpriteProcessor]::CleanMagentaCell($eagleBmp, (New-Object System.Drawing.Rectangle(6, 6, 239, $eh)), 0))
$eagleFrames.Add([P1SpriteProcessor]::CleanMagentaCell($eagleBmp, (New-Object System.Drawing.Rectangle(246, 6, 316, $eh)), 1))
$eagleFrames.Add([P1SpriteProcessor]::CleanMagentaCell($eagleBmp, (New-Object System.Drawing.Rectangle(525, 6, 228, $eh)), 2))
$eagleFrames.Add([P1SpriteProcessor]::CleanMagentaCell($eagleBmp, (New-Object System.Drawing.Rectangle(753, 6, 265, $eh)), 0))
$eagleBmp.Dispose()
[P1SpriteProcessor]::BuildAndSaveStrip($eagleFrames, (Join-Path $outP1Dir "p1_eagle_soar.png"), "center", 4)

# 7. p1_camping_cooler.png (1x4 horizontal strip, bottom_base aligned on red cooler)
$coolerBmp = New-Object System.Drawing.Bitmap((Resolve-ColoradoInput "p1_camping_cooler_sheet.jpg"))
$clh = $coolerBmp.Height - 12
$coolerFrames = New-Object 'System.Collections.Generic.List[System.Drawing.Bitmap]'
foreach ($pair in @(@(6, 260), @(260, 521), @(521, 761), @(761, 1018))) {
    $coolerFrames.Add([P1SpriteProcessor]::CleanMagentaCell($coolerBmp, (New-Object System.Drawing.Rectangle($pair[0], 6, ($pair[1] - $pair[0]), $clh)), 0))
}
$coolerBmp.Dispose()
[P1SpriteProcessor]::BuildAndSaveStrip($coolerFrames, (Join-Path $outP1Dir "p1_camping_cooler.png"), "bottom_base", 4)

# 8. p1_autumn_leaves.png (3 frames) + p1_pine_freshener.png (single sprite from frame 3)
$leavesBmp = New-Object System.Drawing.Bitmap((Resolve-ColoradoInput "p1_autumn_leaves_sheet.jpg"))
$lh = $leavesBmp.Height - 12
$leafFrames = New-Object 'System.Collections.Generic.List[System.Drawing.Bitmap]'
foreach ($pair in @(@(6, 247), @(247, 556), @(556, 770))) {
    $leafFrames.Add([P1SpriteProcessor]::CleanMagentaCell($leavesBmp, (New-Object System.Drawing.Rectangle($pair[0], 6, ($pair[1] - $pair[0]), $lh)), 0))
}
[P1SpriteProcessor]::BuildAndSaveStrip($leafFrames, (Join-Path $outP1Dir "p1_autumn_leaves.png"), "center", 4)

$pineFrames = New-Object 'System.Collections.Generic.List[System.Drawing.Bitmap]'
$pineFrames.Add([P1SpriteProcessor]::CleanMagentaCell($leavesBmp, (New-Object System.Drawing.Rectangle(770, 6, 248, $lh)), 0))
$leavesBmp.Dispose()
[P1SpriteProcessor]::BuildAndSaveStrip($pineFrames, (Join-Path $outP1Dir "p1_pine_freshener.png"), "center", 4)

# 9. p1_heads_foreground_mask.png (150x115 at (385, 165) from 1280x720 p1-clean.jpg)
[P1SpriteProcessor]::BuildHeadsForegroundMask($p1CleanTarget, (Join-Path $outP1Dir "p1_heads_foreground_mask.png"))
