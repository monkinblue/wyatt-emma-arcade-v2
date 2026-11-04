$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$csCode = @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class ShutTheBoxSpriteProcessor {
    private static bool IsMagenta(byte r, byte g, byte b) {
        if (r > 150 && b > 140 && g < 120 && (r - g) > 45 && (b - g) > 35) return true;
        if ((r + b - 2 * g) > 130 && r > 125 && b > 115) return true;
        return false;
    }

    public static void SaveResizedBackground(string rawPath, string outPath, int targetW, int targetH) {
        using (Bitmap src = new Bitmap(rawPath)) {
            using (Bitmap dst = new Bitmap(targetW, targetH, PixelFormat.Format32bppArgb)) {
                using (Graphics g = Graphics.FromImage(dst)) {
                    g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                    g.SmoothingMode = SmoothingMode.HighQuality;
                    g.PixelOffsetMode = PixelOffsetMode.HighQuality;
                    g.DrawImage(src, new Rectangle(0, 0, targetW, targetH));
                }
                dst.Save(outPath, ImageFormat.Png);
            }
        }
    }

    public static void SliceSpriteCell(
        string rawPath,
        string outPath,
        int cellX,
        int cellY,
        int cellW,
        int cellH,
        int maxW,
        int maxH,
        bool clearInteriorHoles
    ) {
        using (Bitmap sheet = new Bitmap(rawPath)) {
            Rectangle cropRect = new Rectangle(cellX, cellY, cellW, cellH);
            using (Bitmap bmp = new Bitmap(cropRect.Width, cropRect.Height, PixelFormat.Format32bppArgb)) {
                using (Graphics g = Graphics.FromImage(bmp)) {
                    g.DrawImage(sheet, new Rectangle(0, 0, cropRect.Width, cropRect.Height), cropRect, GraphicsUnit.Pixel);
                }

                int w = bmp.Width;
                int h = bmp.Height;
                BitmapData data = bmp.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
                int stride = data.Stride;
                byte[] buf = new byte[stride * h];
                Marshal.Copy(data.Scan0, buf, 0, buf.Length);

                // 1. Outer border flood-fill BFS
                bool[] visited = new bool[w * h];
                Queue<int> q = new Queue<int>();

                for (int x = 0; x < w; x++) {
                    int idxTop = x * 4;
                    if (IsMagenta(buf[idxTop + 2], buf[idxTop + 1], buf[idxTop])) {
                        visited[x] = true;
                        q.Enqueue(x);
                    }
                    int yBot = h - 1;
                    int idxBot = yBot * stride + x * 4;
                    int posBot = yBot * w + x;
                    if (!visited[posBot] && IsMagenta(buf[idxBot + 2], buf[idxBot + 1], buf[idxBot])) {
                        visited[posBot] = true;
                        q.Enqueue(posBot);
                    }
                }
                for (int y = 0; y < h; y++) {
                    int idxLeft = y * stride;
                    int posLeft = y * w;
                    if (!visited[posLeft] && IsMagenta(buf[idxLeft + 2], buf[idxLeft + 1], buf[idxLeft])) {
                        visited[posLeft] = true;
                        q.Enqueue(posLeft);
                    }
                    int xRight = w - 1;
                    int idxRight = y * stride + xRight * 4;
                    int posRight = y * w + xRight;
                    if (!visited[posRight] && IsMagenta(buf[idxRight + 2], buf[idxRight + 1], buf[idxRight])) {
                        visited[posRight] = true;
                        q.Enqueue(posRight);
                    }
                }

                int[] dx = new int[] { -1, 1, 0, 0 };
                int[] dy = new int[] { 0, 0, -1, 1 };

                while (q.Count > 0) {
                    int pos = q.Dequeue();
                    int cx = pos % w;
                    int cy = pos / w;
                    int bIdx = cy * stride + cx * 4;
                    buf[bIdx] = 0;
                    buf[bIdx + 1] = 0;
                    buf[bIdx + 2] = 0;
                    buf[bIdx + 3] = 0;

                    for (int d = 0; d < 4; d++) {
                        int nx = cx + dx[d];
                        int ny = cy + dy[d];
                        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                            int nPos = ny * w + nx;
                            if (!visited[nPos]) {
                                int nIdx = ny * stride + nx * 4;
                                if (IsMagenta(buf[nIdx + 2], buf[nIdx + 1], buf[nIdx])) {
                                    visited[nPos] = true;
                                    q.Enqueue(nPos);
                                }
                            }
                        }
                    }
                }

                // 2. Interior enclosed magenta hole pass
                for (int y = 1; y < h - 1; y++) {
                    for (int x = 1; x < w - 1; x++) {
                        int idx = y * stride + x * 4;
                        if (buf[idx + 3] == 0) continue;
                        byte b = buf[idx];
                        byte g = buf[idx + 1];
                        byte r = buf[idx + 2];
                        if (clearInteriorHoles) {
                            if (r > 175 && g < 85 && b > 165 && (r + b - 2 * g) > 210) {
                                buf[idx] = 0;
                                buf[idx + 1] = 0;
                                buf[idx + 2] = 0;
                                buf[idx + 3] = 0;
                            }
                        } else {
                            // Strict pure neon magenta only (protects red gems, crimson scarves, red dice pips)
                            if (r > 215 && g < 50 && b > 210 && (r + b - 2 * g) > 315) {
                                buf[idx] = 0;
                                buf[idx + 1] = 0;
                                buf[idx + 2] = 0;
                                buf[idx + 3] = 0;
                            } else if (outPath.Contains("hourglass-") && r > 155 && b > 165 && g < 135 && Math.Abs((int)r - (int)b) < 55 && (r + b - 2 * g) > 135) {
                                // Convert semi-transparent magenta glass-bulb interior into translucent crystal glass
                                buf[idx] = 225;     // B
                                buf[idx + 1] = 195; // G
                                buf[idx + 2] = 135; // R
                                buf[idx + 3] = 95;  // Semi-transparent crystal glass
                            }
                        }
                    }
                }

                // 3. 2px edge de-spill pass
                for (int pass = 0; pass < 2; pass++) {
                    List<int> toClear = new List<int>();
                    for (int y = 1; y < h - 1; y++) {
                        for (int x = 1; x < w - 1; x++) {
                            int idx = y * stride + x * 4;
                            if (buf[idx + 3] == 0) continue;
                            byte b = buf[idx];
                            byte g = buf[idx + 1];
                            byte r = buf[idx + 2];

                            bool hasTransNeighbor =
                                buf[idx - 4 + 3] == 0 ||
                                buf[idx + 4 + 3] == 0 ||
                                buf[idx - stride + 3] == 0 ||
                                buf[idx + stride + 3] == 0;

                            if (hasTransNeighbor && (r + b - 2 * g) > 105 && r > 120 && b > 110) {
                                toClear.Add(idx);
                            }
                        }
                    }
                    foreach (int idx in toClear) {
                        buf[idx] = 0;
                        buf[idx + 1] = 0;
                        buf[idx + 2] = 0;
                        buf[idx + 3] = 0;
                    }
                }

                // 4. Find non-transparent bounding box
                int minX = w, minY = h, maxX = -1, maxY = -1;
                for (int y = 0; y < h; y++) {
                    for (int x = 0; x < w; x++) {
                        int idx = y * stride + x * 4;
                        if (buf[idx + 3] > 16) {
                            if (x < minX) minX = x;
                            if (x > maxX) maxX = x;
                            if (y < minY) minY = y;
                            if (y > maxY) maxY = y;
                        }
                    }
                }

                Marshal.Copy(buf, 0, data.Scan0, buf.Length);
                bmp.UnlockBits(data);

                if (maxX < minX || maxY < minY) {
                    bmp.Save(outPath, ImageFormat.Png);
                    return;
                }

                int pad = 4;
                int bx = Math.Max(0, minX - pad);
                int by = Math.Max(0, minY - pad);
                int bw = Math.Min(w - bx, (maxX - minX + 1) + pad * 2);
                int bh = Math.Min(h - by, (maxY - minY + 1) + pad * 2);

                double scale = Math.Min(1.0, Math.Min((double)maxW / bw, (double)maxH / bh));
                int outW = Math.Max(1, (int)Math.Round(bw * scale));
                int outH = Math.Max(1, (int)Math.Round(bh * scale));

                using (Bitmap outBmp = new Bitmap(outW, outH, PixelFormat.Format32bppArgb)) {
                    using (Graphics gOut = Graphics.FromImage(outBmp)) {
                        gOut.InterpolationMode = InterpolationMode.NearestNeighbor;
                        gOut.PixelOffsetMode = PixelOffsetMode.Half;
                        gOut.SmoothingMode = SmoothingMode.None;
                        gOut.DrawImage(bmp, new Rectangle(0, 0, outW, outH), new Rectangle(bx, by, bw, bh), GraphicsUnit.Pixel);
                    }
                    outBmp.Save(outPath, ImageFormat.Png);
                    Console.WriteLine(string.Format("  [SAVED SPRITE] {0} ({1}x{2})", System.IO.Path.GetFileName(outPath), outW, outH));
                }
            }
        }
    }

    private static bool InRoundedSquare(double x, double y, double left, double top, double right, double bottom, double r) {
        if (x < left || x > right || y < top || y > bottom) return false;
        double cx = x < left + r ? left + r : (x > right - r ? right - r : x);
        double cy = y < top + r ? top + r : (y > bottom - r ? bottom - r : y);
        double dx = x - cx;
        double dy = y - cy;
        return (dx * dx + dy * dy) <= (r * r);
    }

    public static void GenerateTopDownPixelDie(int faceValue, string outPathFace, string outPathAlias) {
        int lw = 64;
        int lh = 68;
        using (Bitmap lowBmp = new Bitmap(lw, lh, PixelFormat.Format32bppArgb)) {
            // Clear transparent
            for (int y = 0; y < lh; y++) {
                for (int x = 0; x < lw; x++) {
                    lowBmp.SetPixel(x, y, Color.FromArgb(0, 0, 0, 0));
                }
            }

            // 1. Soft tabletop drop shadow (y: 10..65)
            for (int y = 10; y < lh; y++) {
                for (int x = 4; x < lw - 4; x++) {
                    if (InRoundedSquare(x, y, 5, 11, 58, 65, 9.0)) {
                        lowBmp.SetPixel(x, y, Color.FromArgb(115, 12, 6, 2));
                    }
                }
            }

            // 2. Chunky 2.5D bottom walnut/oak bevel edge (y: 8..61) so die has tactile depth with ZERO side pips
            for (int y = 8; y <= 61; y++) {
                for (int x = 4; x <= 59; x++) {
                    if (InRoundedSquare(x, y, 5, 8, 58, 61, 8.5)) {
                        bool isBorder = !InRoundedSquare(x, y, 6.8, 9.8, 56.2, 59.2, 7.0);
                        if (isBorder) {
                            lowBmp.SetPixel(x, y, Color.FromArgb(255, 42, 18, 6));
                        } else if (y >= 57) {
                            lowBmp.SetPixel(x, y, Color.FromArgb(255, 104, 56, 22));
                        } else {
                            lowBmp.SetPixel(x, y, Color.FromArgb(255, 138, 78, 32));
                        }
                    }
                }
            }

            // 3. Straight Top-Down Square Face (x: 5..58, y: 3..56)
            for (int y = 3; y <= 56; y++) {
                for (int x = 5; x <= 58; x++) {
                    if (!InRoundedSquare(x, y, 5, 3, 58, 56, 8.5)) continue;

                    bool inOuterOutline = !InRoundedSquare(x, y, 6.8, 4.8, 56.2, 54.2, 7.0);
                    bool inOakBevel = !InRoundedSquare(x, y, 9.2, 7.2, 53.8, 51.8, 5.2);
                    bool inInnerCrease = !InRoundedSquare(x, y, 10.4, 8.4, 52.6, 50.6, 4.5);

                    if (inOuterOutline) {
                        lowBmp.SetPixel(x, y, Color.FromArgb(255, 42, 18, 6));
                    } else if (inOakBevel) {
                        // Warm golden-oak bevel rim
                        if (y < 10 || x < 11) {
                            lowBmp.SetPixel(x, y, Color.FromArgb(255, 234, 186, 108));
                        } else if (y > 49 || x > 51) {
                            lowBmp.SetPixel(x, y, Color.FromArgb(255, 168, 108, 44));
                        } else {
                            lowBmp.SetPixel(x, y, Color.FromArgb(255, 206, 144, 70));
                        }
                    } else if (inInnerCrease) {
                        lowBmp.SetPixel(x, y, Color.FromArgb(255, 224, 198, 152));
                    } else {
                        // Warm cream-ivory top face with subtle pixel-art shading
                        if (y < 13 || x < 14) {
                            lowBmp.SetPixel(x, y, Color.FromArgb(255, 255, 252, 242));
                        } else if (y > 45 || x > 48) {
                            lowBmp.SetPixel(x, y, Color.FromArgb(255, 241, 224, 188));
                        } else {
                            lowBmp.SetPixel(x, y, Color.FromArgb(255, 252, 244, 223));
                        }
                    }
                }
            }

            // 4. Standard Domino/Dice Pip Coordinates on Top Face (center = 31.5, 29.5)
            double[,] pipCoords;
            double pipRadius = 4.7;
            if (faceValue == 1) {
                pipCoords = new double[,] { { 31.5, 29.5 } };
                pipRadius = 5.4;
            } else if (faceValue == 2) {
                pipCoords = new double[,] { { 18.5, 16.5 }, { 44.5, 42.5 } };
            } else if (faceValue == 3) {
                pipCoords = new double[,] { { 18.0, 16.0 }, { 31.5, 29.5 }, { 45.0, 43.0 } };
            } else if (faceValue == 4) {
                pipCoords = new double[,] {
                    { 18.5, 16.5 }, { 44.5, 16.5 },
                    { 18.5, 42.5 }, { 44.5, 42.5 }
                };
            } else if (faceValue == 5) {
                pipCoords = new double[,] {
                    { 18.0, 16.0 }, { 45.0, 16.0 },
                    { 31.5, 29.5 },
                    { 18.0, 43.0 }, { 45.0, 43.0 }
                };
            } else {
                // 6: Two vertical columns of three pips (left and right)
                pipCoords = new double[,] {
                    { 19.0, 15.0 }, { 44.0, 15.0 },
                    { 19.0, 29.5 }, { 44.0, 29.5 },
                    { 19.0, 44.0 }, { 44.0, 44.0 }
                };
                pipRadius = 4.3;
            }

            int numPips = pipCoords.GetLength(0);
            for (int p = 0; p < numPips; p++) {
                double px = pipCoords[p, 0];
                double py = pipCoords[p, 1];

                for (int y = (int)(py - pipRadius - 2); y <= (int)(py + pipRadius + 2); y++) {
                    for (int x = (int)(px - pipRadius - 2); x <= (int)(px + pipRadius + 2); x++) {
                        if (x < 8 || x > 55 || y < 6 || y > 53) continue;
                        double dx = x - px;
                        double dy = y - py;
                        double dist = Math.Sqrt(dx * dx + dy * dy);

                        if (dist <= pipRadius + 0.9 && dist > pipRadius - 0.2) {
                            // Recessed socket rim
                            if (dy < 0) {
                                lowBmp.SetPixel(x, y, Color.FromArgb(255, 178, 138, 86));
                            } else {
                                lowBmp.SetPixel(x, y, Color.FromArgb(255, 255, 250, 236));
                            }
                        } else if (dist <= pipRadius - 0.2) {
                            // Dark espresso/charcoal recessed pip
                            if (dx >= -2.2 && dx <= -0.7 && dy >= -2.2 && dy <= -0.7) {
                                // Tiny specular pixel highlight
                                lowBmp.SetPixel(x, y, Color.FromArgb(255, 132, 88, 56));
                            } else if (dist > pipRadius - 1.2) {
                                lowBmp.SetPixel(x, y, Color.FromArgb(255, 24, 10, 4));
                            } else {
                                lowBmp.SetPixel(x, y, Color.FromArgb(255, 42, 20, 9));
                            }
                        }
                    }
                }
            }

            // Upscale 2x with crisp NearestNeighbor pixel art filtering (128x136)
            int outW = lw * 2;
            int outH = lh * 2;
            using (Bitmap outBmp = new Bitmap(outW, outH, PixelFormat.Format32bppArgb)) {
                using (Graphics g = Graphics.FromImage(outBmp)) {
                    g.InterpolationMode = InterpolationMode.NearestNeighbor;
                    g.PixelOffsetMode = PixelOffsetMode.Half;
                    g.SmoothingMode = SmoothingMode.None;
                    g.DrawImage(lowBmp, new Rectangle(0, 0, outW, outH), new Rectangle(0, 0, lw, lh), GraphicsUnit.Pixel);
                }
                outBmp.Save(outPathFace, ImageFormat.Png);
                outBmp.Save(outPathAlias, ImageFormat.Png);
                Console.WriteLine(string.Format("  [GENERATED TOP-DOWN DIE] {0} & {1} ({2}x{3}, {4} pips)",
                    System.IO.Path.GetFileName(outPathFace),
                    System.IO.Path.GetFileName(outPathAlias),
                    outW, outH, faceValue));
            }
        }
    }
}
"@

Add-Type -TypeDefinition $csCode -ReferencedAssemblies System.Drawing

$rootDir = Split-Path -Parent $PSScriptRoot
$hubRawPath = Join-Path $rootDir "public\assets\hub\raw\hub-toy-shutthebox-raw.jpg"
$hubArcadeOut = Join-Path $rootDir "public\assets\hub\arcade\hub-toy-shutthebox.png"
$hubSpriteOut = Join-Path $rootDir "public\assets\hub\sprites\hub-toy-shutthebox.png"

$gameDir = Join-Path $rootDir "public\assets\games\shutthebox"
$rawDir = Join-Path $gameDir "raw"
$spritesDir = Join-Path $gameDir "sprites"

New-Item -ItemType Directory -Force -Path (Split-Path $hubArcadeOut), (Split-Path $hubSpriteOut), $spritesDir | Out-Null

$diceOnly = $args -contains "--dice-only"

# 1. Slice Hub Toy Icon (`hub-toy-shutthebox.png`)
if ((-not $diceOnly) -and (Test-Path $hubRawPath)) {
    $toyImg = [System.Drawing.Bitmap]::new($hubRawPath)
    $tw = $toyImg.Width
    $th = $toyImg.Height
    $toyImg.Dispose()
    $m = [int]([Math]::Round($tw * 0.02))
    [ShutTheBoxSpriteProcessor]::SliceSpriteCell(
        $hubRawPath,
        $hubArcadeOut,
        $m,
        $m,
        $tw - 2 * $m,
        $th - 2 * $m,
        380,
        400,
        $true
    )
    Copy-Item $hubArcadeOut $hubSpriteOut -Force
    Write-Host "  [COPIED HUB TOY] hub-toy-shutthebox.png -> public/assets/hub/sprites/hub-toy-shutthebox.png"
}

# 2. Resize Clean Stage Background (1280x720)
$stageRaw = Join-Path $rawDir "shutthebox-stage-raw.jpg"
$stageOut = Join-Path $gameDir "shutthebox-stage.png"
if ((-not $diceOnly) -and (Test-Path $stageRaw)) {
    [ShutTheBoxSpriteProcessor]::SaveResizedBackground($stageRaw, $stageOut, 1280, 720)
    Write-Host "  [SAVED STAGE] shutthebox-stage.png (1280x720)"
}

# 2b. Generate Top-Down 2.5D Beveled Storybook Ivory/Maple Dice (`die-face-1..6.png` & `die-1..6.png`)
for ($face = 1; $face -le 6; $face++) {
    $outFace = Join-Path $spritesDir ("die-face-{0}.png" -f $face)
    $outAlias = Join-Path $spritesDir ("die-{0}.png" -f $face)
    [ShutTheBoxSpriteProcessor]::GenerateTopDownPixelDie($face, $outFace, $outAlias)
}
Copy-Item (Join-Path $spritesDir "die-face-3.png") (Join-Path $spritesDir "die-tumble-1.png") -Force
Copy-Item (Join-Path $spritesDir "die-face-5.png") (Join-Path $spritesDir "die-tumble-2.png") -Force

if ($diceOnly) {
    Write-Host "  [DONE] Top-down beveled pixel-art dice generated (existing stage, hourglasses, Sparky & Doggie untouched)."
    exit 0
}

$strictInterior = @{
    "tile-wood-up.png" = $true
    "tile-wood-down.png" = $true
    "tile-wood-gold.png" = $true
    "prop-dice-cup.png" = $true
    "die-face-1.png" = $true
    "die-face-2.png" = $true
    "die-face-3.png" = $true
    "die-face-4.png" = $true
    "die-face-5.png" = $true
    "die-face-6.png" = $true
    "die-tumble-1.png" = $true
    "die-tumble-2.png" = $true
    "prop-math-scroll.png" = $true
    "orb-choice.png" = $true
    "gem-ruby.png" = $true
    "gem-emerald.png" = $true
    "doggie-mage-cheer.png" = $true
    "doggie-mage-idle.png" = $true
    "hourglass-player.png" = $true
    "hourglass-sparky.png" = $true
    "prop-wizard-trophy.png" = $true
}

# 3. Slice 4x4 Board & Props Sheet
$propsRaw = Join-Path $rawDir "shutthebox-board-props-raw.jpg"
if (Test-Path $propsRaw) {
    $img = [System.Drawing.Bitmap]::new($propsRaw)
    $sw = $img.Width
    $sh = $img.Height
    $img.Dispose()
    $cw = [int]($sw / 4)
    $ch = [int]($sh / 4)

    $propsGrid = @(
        @("tile-wood-up.png", 0, 0, 120, 180),
        @("tile-wood-down.png", 0, 1, 120, 180),
        @("tile-wood-gold.png", 0, 2, 120, 180),
        @("prop-dice-cup.png", 0, 3, 170, 190),
        @("prop-math-scroll.png", 3, 0, 240, 180),
        @("orb-choice.png", 3, 1, 150, 150),
        @("gem-ruby.png", 3, 2, 110, 110),
        @("gem-emerald.png", 3, 3, 110, 110)
    )

    foreach ($spec in $propsGrid) {
        $name = $spec[0]
        $r = $spec[1]
        $c = $spec[2]
        $maxW = $spec[3]
        $maxH = $spec[4]
        $outPath = Join-Path $spritesDir $name
        $clearHoles = -not $strictInterior.ContainsKey($name)
        [ShutTheBoxSpriteProcessor]::SliceSpriteCell(
            $propsRaw,
            $outPath,
            $c * $cw + 6,
            $r * $ch + 6,
            $cw - 12,
            $ch - 12,
            $maxW,
            $maxH,
            $clearHoles
        )
    }
}

# 4. Slice 2x4 Characters & Hourglasses Sheet
$charsRaw = Join-Path $rawDir "shutthebox-chars-raw.jpg"
if (Test-Path $charsRaw) {
    $img = [System.Drawing.Bitmap]::new($charsRaw)
    $sw = $img.Width
    $sh = $img.Height
    $img.Dispose()
    $cw = [int]($sw / 4)
    $ch = [int]($sh / 2)

    $charsGrid = @(
        @("prof-sparky-idle.png", 0, 0, 280, 280),
        @("prof-sparky-roll.png", 0, 1, 280, 280),
        @("prof-sparky-cheer.png", 0, 2, 280, 280),
        @("doggie-mage-cheer.png", 0, 3, 250, 250),
        @("doggie-mage-idle.png", 1, 0, 250, 250),
        @("hourglass-player.png", 1, 1, 220, 300),
        @("hourglass-sparky.png", 1, 2, 220, 300),
        @("prop-wizard-trophy.png", 1, 3, 260, 280)
    )

    foreach ($spec in $charsGrid) {
        $name = $spec[0]
        $r = $spec[1]
        $c = $spec[2]
        $maxW = $spec[3]
        $maxH = $spec[4]
        $outPath = Join-Path $spritesDir $name
        $clearHoles = -not $strictInterior.ContainsKey($name)
        [ShutTheBoxSpriteProcessor]::SliceSpriteCell(
            $charsRaw,
            $outPath,
            $c * $cw + 8,
            $r * $ch + 8,
            $cw - 16,
            $ch - 16,
            $maxW,
            $maxH,
            $clearHoles
        )
    }
}
