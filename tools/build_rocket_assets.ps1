$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$csCode = @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class RocketSpriteProcessor {
    private static bool IsMagenta(byte r, byte g, byte b) {
        if (r > 135 && b > 125 && g < 118 && (r - g) > 38 && (b - g) > 32 && Math.Abs((int)r - (int)b) < 60) return true;
        if ((r + b - 2 * g) > 120 && r > 120 && b > 115 && Math.Abs((int)r - (int)b) < 58) return true;
        return false;
    }

    private static bool IsInteriorMagentaHole(byte r, byte g, byte b, bool isDoggieHelmet, int y, int h) {
        if (isDoggieHelmet && y < (int)(h * 0.62)) {
            // Inside Doggie's glass helmet, only clear strict pure neon magenta
            return r > 220 && g < 45 && b > 215 && Math.Abs((int)r - (int)b) < 30;
        }
        // Clears pure & shaded magenta inside gantry trusses, astrolabe rings, valve wheels, and tubes
        // while protecting crimson rocket paint & ruby gem facets (where b < 110 or r - b > 48)
        if (r > 135 && g < 92 && b > 130 && Math.Abs((int)r - (int)b) < 44 && (r + b - 2 * g) > 155) {
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
        bool unmixGoldGlow,
        bool isDoggieHelmet
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

                // 2. Seed interior enclosed magenta holes
                for (int y = 1; y < h - 1; y++) {
                    for (int x = 1; x < w - 1; x++) {
                        int pos = y * w + x;
                        if (visited[pos]) continue;
                        int idx = y * stride + x * 4;
                        if (IsInteriorMagentaHole(buf[idx + 2], buf[idx + 1], buf[idx], isDoggieHelmet, y, h)) {
                            visited[pos] = true;
                            q.Enqueue(pos);
                        }
                    }
                }

                int[] dx = new int[] { -1, 1, 0, 0 };
                int[] dy = new int[] { 0, 0, -1, 1 };

                // 3. BFS flood-fill
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

                // 3b. Soft glow unmixing for golden constellation cluster & Doggie glass helmet tinting
                for (int y = 0; y < h; y++) {
                    for (int x = 0; x < w; x++) {
                        int idx = y * stride + x * 4;
                        if (buf[idx + 3] == 0) continue;
                        int b = buf[idx];
                        int gCol = buf[idx + 1];
                        int r = buf[idx + 2];

                        if (unmixGoldGlow && r > 175 && r > gCol + 20) {
                            if (gCol < 125 && b > 55) {
                                buf[idx] = 0;
                                buf[idx + 1] = 0;
                                buf[idx + 2] = 0;
                                buf[idx + 3] = 0;
                            } else if (b > 70) {
                                int newG = Math.Min(245, Math.Max(200, gCol + 55));
                                int newB = Math.Min(70, gCol / 4);
                                int newA = Math.Min(240, Math.Max(90, (gCol - 95) * 2));
                                buf[idx] = (byte)newB;
                                buf[idx + 1] = (byte)newG;
                                buf[idx + 2] = 255;
                                buf[idx + 3] = (byte)newA;
                            }
                        } else if (!isDoggieHelmet && b > 205 && r > 115 && gCol < 140 && (b - gCol) > 85 && (r - gCol) > 30) {
                            // Unmix cyan-on-magenta glow inside fuel-core-100 astrolabe ring
                            if (gCol < 65 && r > 145) {
                                buf[idx] = 0;
                                buf[idx + 1] = 0;
                                buf[idx + 2] = 0;
                                buf[idx + 3] = 0;
                            } else {
                                buf[idx] = 255;
                                buf[idx + 1] = (byte)Math.Min(245, Math.Max(180, gCol + 95));
                                buf[idx + 2] = (byte)Math.Min(90, gCol / 2);
                                buf[idx + 3] = (byte)Math.Min(230, Math.Max(90, gCol * 2));
                            }
                        } else if (isDoggieHelmet && y < (int)(h * 0.62)) {
                            // Convert pink-magenta glass reflection inside Doggie's helmet to soft icy-cyan glass
                            if (r > 165 && b > 165 && gCol < 185 && (r + b - 2 * gCol) > 90) {
                                buf[idx] = 250;       // Blue
                                buf[idx + 1] = 225;   // Green
                                buf[idx + 2] = 175;   // Red
                                buf[idx + 3] = 135;   // Translucent glass alpha
                            }
                        }
                    }
                }

                // 4. 2px edge de-spill & purple fringe neutralization pass
                for (int pass = 0; pass < 2; pass++) {
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

                            if (hasTransNeighbor && (r + b - 2 * gCol) > 90 && r > 110 && b > 105 && Math.Abs((int)r - (int)b) < 58) {
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
                    Console.WriteLine(string.Format("  [SAVED SPRITE] {0} ({1}x{2})", System.IO.Path.GetFileName(outPaths[0]), outW, outH));
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

$gameDir = Join-Path $rootDir "public\assets\games\rocket"
$rawDir = Join-Path $gameDir "raw"
$spritesDir = Join-Path $gameDir "sprites"

New-Item -ItemType Directory -Force -Path $hubRawDir | Out-Null
New-Item -ItemType Directory -Force -Path $hubArcadeDir | Out-Null
New-Item -ItemType Directory -Force -Path $hubSpritesDir | Out-Null
New-Item -ItemType Directory -Force -Path $rawDir | Out-Null
New-Item -ItemType Directory -Force -Path $spritesDir | Out-Null

$artifactDir = "C:\Users\RobaD\.gemini\antigravity\brain\c4550e46-b322-411e-94fd-489928293314"
$hubToySrc = Join-Path $artifactDir "hub_toy_rocket_raw_1793764760168.jpg"
$stageSrc = Join-Path $artifactDir "rocket_bg_raw_1793764775956.jpg"
$stagesGantrySrc = Join-Path $artifactDir "rocket_stages_gantry_raw_1793764793137.jpg"
$skyPlanetsSrc = Join-Path $artifactDir "rocket_sky_planets_raw_1793764808896.jpg"

$hubToyRaw = Join-Path $hubRawDir "hub-toy-rocket-raw.jpg"
$stageRaw = Join-Path $rawDir "rocket-bg-raw.jpg"
$stagesGantryRaw = Join-Path $rawDir "rocket-stages-gantry-raw.jpg"
$skyPlanetsRaw = Join-Path $rawDir "rocket-sky-planets-raw.jpg"

if (Test-Path $hubToySrc) { Copy-Item -Force $hubToySrc $hubToyRaw }
if (Test-Path $stageSrc) { Copy-Item -Force $stageSrc $stageRaw }
if (Test-Path $stagesGantrySrc) { Copy-Item -Force $stagesGantrySrc $stagesGantryRaw }
if (Test-Path $skyPlanetsSrc) { Copy-Item -Force $skyPlanetsSrc $skyPlanetsRaw }

# 1. Slice Hub Shelf Toy (`hub-toy-rocket.png`)
if (Test-Path $hubToyRaw) {
    $out1 = Join-Path $hubArcadeDir "hub-toy-rocket.png"
    $out2 = Join-Path $hubSpritesDir "hub-toy-rocket.png"
    [RocketSpriteProcessor]::SliceSpriteCellFrac($hubToyRaw, @($out1, $out2), 0.02, 0.02, 0.98, 0.98, 380, 420, $false, $false)
}

# 2. Save 1280x720 clean stage background (`rocket-bg.png`)
$stageOut = Join-Path $gameDir "rocket-bg.png"
if (Test-Path $stageRaw) {
    [RocketSpriteProcessor]::SaveResizedBackground($stageRaw, $stageOut, 1280, 720)
    Write-Host "  [SAVED STAGE] rocket-bg.png (1280x720)"
}

# 3. Slice 2x4 Rocket Stages, Gantry, Valves & Astronaut Companions Sheet
if (Test-Path $stagesGantryRaw) {
    $sheet1Specs = @(
        @{ Name = "rocket-stage-100.png"; X0 = 0.012; Y0 = 0.018; X1 = 0.242; Y1 = 0.482; MaxW = 240; MaxH = 250; Gold = $false; Doggie = $false },
        @{ Name = "rocket-stage-10.png";  X0 = 0.258; Y0 = 0.018; X1 = 0.492; Y1 = 0.482; MaxW = 200; MaxH = 220; Gold = $false; Doggie = $false },
        @{ Name = "rocket-stage-1.png";   X0 = 0.508; Y0 = 0.018; X1 = 0.742; Y1 = 0.482; MaxW = 200; MaxH = 240; Gold = $false; Doggie = $false },
        @{ Name = "gantry-tower.png";     X0 = 0.758; Y0 = 0.018; X1 = 0.988; Y1 = 0.482; MaxW = 280; MaxH = 280; Gold = $false; Doggie = $false },
        @{ Name = "steam-valve-lever.png";X0 = 0.012; Y0 = 0.518; X1 = 0.242; Y1 = 0.982; MaxW = 200; MaxH = 220; Gold = $false; Doggie = $false },
        @{ Name = "ignition-lever.png";   X0 = 0.258; Y0 = 0.518; X1 = 0.492; Y1 = 0.982; MaxW = 240; MaxH = 220; Gold = $false; Doggie = $false },
        @{ Name = "astro-sparky.png";     X0 = 0.508; Y0 = 0.518; X1 = 0.742; Y1 = 0.982; MaxW = 260; MaxH = 260; Gold = $false; Doggie = $false },
        @{ Name = "astro-doggie.png";     X0 = 0.758; Y0 = 0.518; X1 = 0.988; Y1 = 0.922; MaxW = 240; MaxH = 240; Gold = $false; Doggie = $true  }
    )

    foreach ($spec in $sheet1Specs) {
        $outPath = Join-Path $spritesDir $spec.Name
        [RocketSpriteProcessor]::SliceSpriteCellFrac($stagesGantryRaw, @($outPath), $spec.X0, $spec.Y0, $spec.X1, $spec.Y1, $spec.MaxW, $spec.MaxH, $spec.Gold, $spec.Doggie)
    }
}

# 4. Slice 2x4 Sky Fuel Stars, Satellites & Planetary Landing Platforms Sheet
if (Test-Path $skyPlanetsRaw) {
    $sheet2Specs = @(
        @{ Name = "fuel-core-100.png";         X0 = 0.010; Y0 = 0.015; X1 = 0.245; Y1 = 0.485; MaxW = 180; MaxH = 180; Gold = $false },
        @{ Name = "fuel-cluster-10.png";       X0 = 0.255; Y0 = 0.015; X1 = 0.495; Y1 = 0.485; MaxW = 180; MaxH = 180; Gold = $true  },
        @{ Name = "fuel-gem-1.png";            X0 = 0.505; Y0 = 0.015; X1 = 0.745; Y1 = 0.485; MaxW = 140; MaxH = 160; Gold = $false },
        @{ Name = "bonus-satellite.png";       X0 = 0.755; Y0 = 0.015; X1 = 0.990; Y1 = 0.485; MaxW = 180; MaxH = 180; Gold = $false },
        @{ Name = "planet-cheese-moon.png";    X0 = 0.010; Y0 = 0.515; X1 = 0.245; Y1 = 0.985; MaxW = 360; MaxH = 260; Gold = $false },
        @{ Name = "planet-mars-saturn.png";    X0 = 0.255; Y0 = 0.515; X1 = 0.495; Y1 = 0.985; MaxW = 360; MaxH = 260; Gold = $false },
        @{ Name = "planet-crystal-nebula.png"; X0 = 0.505; Y0 = 0.515; X1 = 0.745; Y1 = 0.985; MaxW = 360; MaxH = 260; Gold = $false },
        @{ Name = "space-flag.png";            X0 = 0.755; Y0 = 0.515; X1 = 0.990; Y1 = 0.985; MaxW = 260; MaxH = 280; Gold = $false }
    )

    foreach ($spec in $sheet2Specs) {
        $outPath = Join-Path $spritesDir $spec.Name
        [RocketSpriteProcessor]::SliceSpriteCellFrac($skyPlanetsRaw, @($outPath), $spec.X0, $spec.Y0, $spec.X1, $spec.Y1, $spec.MaxW, $spec.MaxH, $spec.Gold, $false)
    }
}
