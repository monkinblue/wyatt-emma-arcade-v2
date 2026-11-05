$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$csCode = @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;

public static class TrainAssetProcessor {
    private static bool IsOuterMagenta(byte r, byte g, byte b, bool protectPastelPinkAndCrystal) {
        if (protectPastelPinkAndCrystal) {
            // Strict neon magenta for sprites with pastel pink staves or violet crystals
            if (r > 165 && b > 160 && g < 98 && Math.Abs((int)r - (int)b) < 42 && ((int)r + (int)b - 2 * (int)g) > 175) {
                return true;
            }
            return false;
        }
        if (r > 125 && b > 118 && g < 110 && (r - g) > 36 && (b - g) > 30 && Math.Abs((int)r - (int)b) < 52) return true;
        if (((int)r + (int)b - 2 * (int)g) > 125 && r > 120 && b > 115 && g < 108 && Math.Abs((int)r - (int)b) < 52) return true;
        return false;
    }

    private static bool IsInteriorMagentaHole(byte r, byte g, byte b, bool protectPastelPinkAndCrystal) {
        if (protectPastelPinkAndCrystal) {
            if (r > 205 && g < 65 && b > 200 && Math.Abs((int)r - (int)b) < 35 && ((int)r + (int)b - 2 * (int)g) > 290) {
                return true;
            }
            return false;
        }
        // Clears both bright #FF00FF and shaded magenta inside tiny 2-3px gaps:
        // (windmill lattice squares, locomotive cowcatcher/wheel spokes, gold car railing spindles, whistle loop)
        // Protects crimson locomotive paint (where b < 92 and r - b > 65) and wood/gold (where g > 85 or r - b > 55)
        if (r > 125 && g < 88 && b > 115 && Math.Abs((int)r - (int)b) < 46 && ((int)r + (int)b - 2 * (int)g) > 135) {
            return true;
        }
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

    public static void SliceSpriteCellFrac(
        string rawPath,
        string[] outPaths,
        double x0f,
        double y0f,
        double x1f,
        double y1f,
        int maxW,
        int maxH,
        bool protectPastelPinkAndCrystal,
        bool unmixSteamGlow
    ) {
        using (Bitmap sheet = new Bitmap(rawPath)) {
            int sw = sheet.Width;
            int sh = sheet.Height;
            int cellX = Math.Max(0, (int)Math.Round(sw * x0f));
            int cellY = Math.Max(0, (int)Math.Round(sh * y0f));
            int cellW = Math.Min(sw - cellX, (int)Math.Round(sw * (x1f - x0f)));
            int cellH = Math.Min(sh - cellY, (int)Math.Round(sh * (y1f - y0f)));

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

                bool[] visited = new bool[w * h];
                Queue<int> q = new Queue<int>();

                // 1. Seed outer borders
                for (int x = 0; x < w; x++) {
                    int idxTop = x * 4;
                    if (IsOuterMagenta(buf[idxTop + 2], buf[idxTop + 1], buf[idxTop], protectPastelPinkAndCrystal)) {
                        visited[x] = true;
                        q.Enqueue(x);
                    }
                    int yBot = h - 1;
                    int idxBot = yBot * stride + x * 4;
                    int posBot = yBot * w + x;
                    if (!visited[posBot] && IsOuterMagenta(buf[idxBot + 2], buf[idxBot + 1], buf[idxBot], protectPastelPinkAndCrystal)) {
                        visited[posBot] = true;
                        q.Enqueue(posBot);
                    }
                }
                for (int y = 0; y < h; y++) {
                    int idxLeft = y * stride;
                    int posLeft = y * w;
                    if (!visited[posLeft] && IsOuterMagenta(buf[idxLeft + 2], buf[idxLeft + 1], buf[idxLeft], protectPastelPinkAndCrystal)) {
                        visited[posLeft] = true;
                        q.Enqueue(posLeft);
                    }
                    int xRight = w - 1;
                    int idxRight = y * stride + xRight * 4;
                    int posRight = y * w + xRight;
                    if (!visited[posRight] && IsOuterMagenta(buf[idxRight + 2], buf[idxRight + 1], buf[idxRight], protectPastelPinkAndCrystal)) {
                        visited[posRight] = true;
                        q.Enqueue(posRight);
                    }
                }

                // 2. Seed interior enclosed neon magenta holes
                for (int y = 1; y < h - 1; y++) {
                    for (int x = 1; x < w - 1; x++) {
                        int pos = y * w + x;
                        if (visited[pos]) continue;
                        int idx = y * stride + x * 4;
                        if (IsInteriorMagentaHole(buf[idx + 2], buf[idx + 1], buf[idx], protectPastelPinkAndCrystal)) {
                            visited[pos] = true;
                            q.Enqueue(pos);
                        }
                    }
                }

                // 2b. Also clear pink-magenta lantern glow halo on crossing gate & shaded magenta specks
                if (!protectPastelPinkAndCrystal) {
                    for (int y = 1; y < h - 1; y++) {
                        for (int x = 1; x < w - 1; x++) {
                            int pos = y * w + x;
                            if (visited[pos]) continue;
                            int idx = y * stride + x * 4;
                            byte b = buf[idx];
                            byte gCol = buf[idx + 1];
                            byte r = buf[idx + 2];
                            if (r > 205 && gCol < 65 && b > 135 && ((int)r + (int)b - 2 * (int)gCol) > 250) {
                                visited[pos] = true;
                                q.Enqueue(pos);
                            }
                        }
                    }
                }

                // 8-connected BFS flood-fill so diagonal magenta corners inside trusses/sails clear cleanly
                int[] dx = new int[] { -1, 0, 1, -1, 1, -1, 0, 1 };
                int[] dy = new int[] { -1, -1, -1, 0, 0, 1, 1, 1 };

                while (q.Count > 0) {
                    int pos = q.Dequeue();
                    int cx = pos % w;
                    int cy = pos / w;
                    int bIdx = cy * stride + cx * 4;
                    buf[bIdx] = 0;
                    buf[bIdx + 1] = 0;
                    buf[bIdx + 2] = 0;
                    buf[bIdx + 3] = 0;

                    for (int d = 0; d < 8; d++) {
                        int nx = cx + dx[d];
                        int ny = cy + dy[d];
                        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                            int nPos = ny * w + nx;
                            if (!visited[nPos]) {
                                int nIdx = ny * stride + nx * 4;
                                if (IsOuterMagenta(buf[nIdx + 2], buf[nIdx + 1], buf[nIdx], protectPastelPinkAndCrystal)) {
                                    visited[nPos] = true;
                                    q.Enqueue(nPos);
                                }
                            }
                        }
                    }
                }

                // 3b. Unmix golden starlight steam & headlight glow on hub-toy-train
                if (unmixSteamGlow) {
                    for (int y = 0; y < (int)(h * 0.42); y++) {
                        for (int x = 0; x < w; x++) {
                            int idx = y * stride + x * 4;
                            if (buf[idx + 3] == 0) continue;
                            int b = buf[idx];
                            int gCol = buf[idx + 1];
                            int r = buf[idx + 2];
                            // Soft pink-magenta mixed into golden steam sparkles
                            if (r > 180 && b > 110 && (r - gCol) > 35 && (b - gCol) > -10) {
                                if (gCol < 95 && b > 140) {
                                    buf[idx] = 0;
                                    buf[idx + 1] = 0;
                                    buf[idx + 2] = 0;
                                    buf[idx + 3] = 0;
                                } else {
                                    int newG = Math.Min(250, Math.Max(205, gCol + 55));
                                    int newB = Math.Min(110, gCol / 2);
                                    int newA = Math.Min(245, Math.Max(85, (gCol - 70) * 2));
                                    buf[idx] = (byte)newB;
                                    buf[idx + 1] = (byte)newG;
                                    buf[idx + 2] = 255;
                                    buf[idx + 3] = (byte)newA;
                                }
                            }
                        }
                    }
                }

                // 4. 3px perimeter de-spill & purple fringe removal pass
                for (int pass = 0; pass < 3; pass++) {
                    List<int> toClear = new List<int>();
                    for (int y = 1; y < h - 1; y++) {
                        for (int x = 1; x < w - 1; x++) {
                            int idx = y * stride + x * 4;
                            if (buf[idx + 3] == 0) continue;
                            byte b = buf[idx];
                            byte gCol = buf[idx + 1];
                            byte r = buf[idx + 2];

                            bool hasTransNeighbor =
                                buf[idx - 4 + 3] == 0 ||
                                buf[idx + 4 + 3] == 0 ||
                                buf[idx - stride + 3] == 0 ||
                                buf[idx + stride + 3] == 0;

                            if (!hasTransNeighbor) continue;

                            int magExcess = (int)r + (int)b - 2 * (int)gCol;
                            int rbDiff = Math.Abs((int)r - (int)b);
                            if (protectPastelPinkAndCrystal) {
                                if (magExcess > 95 && rbDiff < 48 && r > 115 && b > 110 && gCol < 105) {
                                    toClear.Add(idx);
                                }
                            } else {
                                if (magExcess > 70 && rbDiff < 62 && r > 95 && b > 90 && gCol < 115) {
                                    toClear.Add(idx);
                                }
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

                // Neutralize any remaining subtle purple cast anywhere in non-protected sprites
                for (int y = 1; y < h - 1; y++) {
                    for (int x = 1; x < w - 1; x++) {
                        int idx = y * stride + x * 4;
                        if (buf[idx + 3] == 0) continue;
                        int b = buf[idx];
                        int gCol = buf[idx + 1];
                        int r = buf[idx + 2];
                        if (!protectPastelPinkAndCrystal && r > gCol + 35 && b > gCol + 30 && Math.Abs(r - b) < 42 && gCol < 95) {
                            buf[idx] = 0;
                            buf[idx + 1] = 0;
                            buf[idx + 2] = 0;
                            buf[idx + 3] = 0;
                        }
                    }
                }

                // 5. Find tight non-transparent bounding box
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
                    foreach (string p in outPaths) {
                        bmp.Save(p, ImageFormat.Png);
                    }
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
                    foreach (string p in outPaths) {
                        outBmp.Save(p, ImageFormat.Png);
                    }
                    Console.WriteLine(string.Format("  [SAVED SPRITE] {0} ({1}x{2})", Path.GetFileName(outPaths[0]), outW, outH));
                }
            }
        }
    }
}
"@

Add-Type -TypeDefinition $csCode -ReferencedAssemblies System.Drawing

$rootDir = Split-Path -Parent $PSScriptRoot
$hubRawDir = Join-Path $rootDir "public\assets\hub\raw"
$hubArcadeDir = Join-Path $rootDir "public\assets\hub\arcade"
$hubSpritesDir = Join-Path $rootDir "public\assets\hub\sprites"

$gameDir = Join-Path $rootDir "public\assets\games\train"
$rawDir = Join-Path $gameDir "raw"
$spritesDir = Join-Path $gameDir "sprites"

New-Item -ItemType Directory -Force -Path $hubRawDir | Out-Null
New-Item -ItemType Directory -Force -Path $hubArcadeDir | Out-Null
New-Item -ItemType Directory -Force -Path $hubSpritesDir | Out-Null
New-Item -ItemType Directory -Force -Path $rawDir | Out-Null
New-Item -ItemType Directory -Force -Path $spritesDir | Out-Null

$artifactDir = "C:\Users\RobaD\.gemini\antigravity\brain\40abd95d-41c1-4ab2-b279-5395c5b64d9d"

$hubToySrc = Join-Path $artifactDir "hub_toy_train_raw_1793845369290.jpg"
$stageSrc = Join-Path $artifactDir "train_table_bg_raw_1793845388230.jpg"
$sheet1Src = Join-Path $artifactDir "train_sheet_1_raw_v2_1793845402968.jpg"
$sheet2Src = Join-Path $artifactDir "train_sheet_2_raw_1793845376217.jpg"
$sheet3Src = Join-Path $artifactDir "train_sheet_3_raw_1793845373730.jpg"

$hubToyRaw = Join-Path $hubRawDir "hub-toy-train-raw.jpg"
$stageRaw = Join-Path $rawDir "train-table-bg-raw.jpg"
$sheet1Raw = Join-Path $rawDir "train-sheet-1-raw.jpg"
$sheet2Raw = Join-Path $rawDir "train-sheet-2-raw.jpg"
$sheet3Raw = Join-Path $rawDir "train-sheet-3-raw.jpg"

if (Test-Path $hubToySrc) { Copy-Item -Force $hubToySrc $hubToyRaw }
if (Test-Path $stageSrc) { Copy-Item -Force $stageSrc $stageRaw }
if (Test-Path $sheet1Src) { Copy-Item -Force $sheet1Src $sheet1Raw }
if (Test-Path $sheet2Src) { Copy-Item -Force $sheet2Src $sheet2Raw }
if (Test-Path $sheet3Src) { Copy-Item -Force $sheet3Src $sheet3Raw }

# 1. Slice Hub Shelf Toy (`hub-toy-train.png`)
if (Test-Path $hubToyRaw) {
    $out1 = Join-Path $hubArcadeDir "hub-toy-train.png"
    $out2 = Join-Path $hubSpritesDir "hub-toy-train.png"
    [TrainAssetProcessor]::SliceSpriteCellFrac($hubToyRaw, @($out1, $out2), 0.02, 0.02, 0.98, 0.98, 380, 420, $false, $true)
}

# 2. Save 1280x720 clean stage background (`train-table-bg.png`)
$stageOut = Join-Path $gameDir "train-table-bg.png"
if (Test-Path $stageRaw) {
    [TrainAssetProcessor]::SaveResizedBackground($stageRaw, $stageOut, 1280, 720)
    Write-Host "  [SAVED STAGE] train-table-bg.png (1280x720)"
}

# 3. Slice 2x4 Sheet 1: Train Consist & Engineer Portraits
if (Test-Path $sheet1Raw) {
    $sheet1Specs = @(
        @{ Name = "train-locomotive.png"; X0 = 0.005; Y0 = 0.015; X1 = 0.250; Y1 = 0.485; MaxW = 240; MaxH = 220; Protect = $false },
        @{ Name = "train-car-red.png";    X0 = 0.255; Y0 = 0.015; X1 = 0.495; Y1 = 0.485; MaxW = 210; MaxH = 190; Protect = $false },
        @{ Name = "train-car-blue.png";   X0 = 0.505; Y0 = 0.015; X1 = 0.745; Y1 = 0.485; MaxW = 210; MaxH = 190; Protect = $false },
        @{ Name = "train-car-gold.png";   X0 = 0.750; Y0 = 0.015; X1 = 0.995; Y1 = 0.485; MaxW = 220; MaxH = 200; Protect = $false },
        @{ Name = "char-grandpa.png";     X0 = 0.005; Y0 = 0.515; X1 = 0.245; Y1 = 0.985; MaxW = 160; MaxH = 160; Protect = $false },
        @{ Name = "char-wyatt.png";       X0 = 0.255; Y0 = 0.515; X1 = 0.495; Y1 = 0.985; MaxW = 160; MaxH = 160; Protect = $false },
        @{ Name = "char-emma.png";        X0 = 0.505; Y0 = 0.515; X1 = 0.745; Y1 = 0.985; MaxW = 160; MaxH = 160; Protect = $true  },
        @{ Name = "char-doggie.png";      X0 = 0.755; Y0 = 0.515; X1 = 0.995; Y1 = 0.985; MaxW = 160; MaxH = 160; Protect = $false }
    )
    foreach ($s in $sheet1Specs) {
        $outP = Join-Path $spritesDir $s.Name
        [TrainAssetProcessor]::SliceSpriteCellFrac($sheet1Raw, @($outP), $s.X0, $s.Y0, $s.X1, $s.Y1, $s.MaxW, $s.MaxH, $s.Protect, $false)
    }
}

# 4. Slice 2x4 Sheet 2: Special Track Modules, Depot & Scenery Toys
if (Test-Path $sheet2Raw) {
    $sheet2Specs = @(
        @{ Name = "mod-royal-bridge.png";     X0 = 0.005; Y0 = 0.015; X1 = 0.250; Y1 = 0.485; MaxW = 280; MaxH = 240; Protect = $false },
        @{ Name = "mod-stone-tunnel.png";     X0 = 0.252; Y0 = 0.015; X1 = 0.495; Y1 = 0.485; MaxW = 260; MaxH = 240; Protect = $false },
        @{ Name = "mod-xylophone-track.png";  X0 = 0.500; Y0 = 0.015; X1 = 0.752; Y1 = 0.485; MaxW = 240; MaxH = 200; Protect = $true  },
        @{ Name = "mod-crossing-gate.png";    X0 = 0.758; Y0 = 0.015; X1 = 0.995; Y1 = 0.485; MaxW = 220; MaxH = 220; Protect = $false },
        @{ Name = "prop-station-depot.png";   X0 = 0.005; Y0 = 0.510; X1 = 0.250; Y1 = 0.985; MaxW = 280; MaxH = 260; Protect = $false },
        @{ Name = "prop-trex.png";            X0 = 0.255; Y0 = 0.510; X1 = 0.495; Y1 = 0.985; MaxW = 220; MaxH = 220; Protect = $false },
        @{ Name = "prop-unicorn-pasture.png"; X0 = 0.505; Y0 = 0.510; X1 = 0.748; Y1 = 0.985; MaxW = 220; MaxH = 220; Protect = $true  },
        @{ Name = "prop-windmill.png";        X0 = 0.755; Y0 = 0.505; X1 = 0.995; Y1 = 0.985; MaxW = 220; MaxH = 240; Protect = $false }
    )
    foreach ($s in $sheet2Specs) {
        $outP = Join-Path $spritesDir $s.Name
        [TrainAssetProcessor]::SliceSpriteCellFrac($sheet2Raw, @($outP), $s.X0, $s.Y0, $s.X1, $s.Y1, $s.MaxW, $s.MaxH, $s.Protect, $false)
    }
}

# 5. Slice 2x4 Sheet 3: Pine Trees, Water Tower, Sparky, Cargo Items & Brass Whistle
if (Test-Path $sheet3Raw) {
    $sheet3Specs = @(
        @{ Name = "prop-pine-forest.png";    X0 = 0.005; Y0 = 0.010; X1 = 0.245; Y1 = 0.485; MaxW = 210; MaxH = 220; Protect = $false },
        @{ Name = "prop-water-tower.png";    X0 = 0.255; Y0 = 0.010; X1 = 0.490; Y1 = 0.490; MaxW = 200; MaxH = 230; Protect = $false },
        @{ Name = "char-sparky.png";         X0 = 0.500; Y0 = 0.010; X1 = 0.745; Y1 = 0.485; MaxW = 160; MaxH = 160; Protect = $false },
        @{ Name = "cargo-golden-log.png";    X0 = 0.750; Y0 = 0.010; X1 = 0.995; Y1 = 0.485; MaxW = 150; MaxH = 140; Protect = $false },
        @{ Name = "cargo-milk-barrel.png";   X0 = 0.005; Y0 = 0.510; X1 = 0.245; Y1 = 0.985; MaxW = 140; MaxH = 150; Protect = $true  },
        @{ Name = "cargo-treasure-chest.png";X0 = 0.255; Y0 = 0.510; X1 = 0.495; Y1 = 0.985; MaxW = 150; MaxH = 150; Protect = $true  },
        @{ Name = "cargo-star-crate.png";    X0 = 0.505; Y0 = 0.510; X1 = 0.745; Y1 = 0.985; MaxW = 150; MaxH = 150; Protect = $true  },
        @{ Name = "prop-whistle-cord.png";   X0 = 0.750; Y0 = 0.510; X1 = 0.995; Y1 = 0.985; MaxW = 170; MaxH = 170; Protect = $false }
    )
    foreach ($s in $sheet3Specs) {
        $outP = Join-Path $spritesDir $s.Name
        [TrainAssetProcessor]::SliceSpriteCellFrac($sheet3Raw, @($outP), $s.X0, $s.Y0, $s.X1, $s.Y1, $s.MaxW, $s.MaxH, $s.Protect, $false)
    }
}
