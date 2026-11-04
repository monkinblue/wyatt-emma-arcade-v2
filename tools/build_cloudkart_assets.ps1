$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$csCode = @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class CloudKartSpriteProcessor {
    private static bool IsMagenta(byte r, byte g, byte b) {
        if (r > 140 && b > 130 && g < 118 && (r - g) > 38 && (b - g) > 32) return true;
        if ((r + b - 2 * g) > 125 && r > 125 && b > 115 && Math.Abs((int)r - (int)b) < 55) return true;
        return false;
    }

    private static bool IsInteriorMagentaHole(byte r, byte g, byte b) {
        // Clears pure & shaded magenta inside wheel spokes, archways, and trophy handles
        // while protecting crimson roadster paint (where b < 115) and pink scarf (where r - b > 45)
        if (r > 135 && g < 95 && b > 130 && Math.Abs((int)r - (int)b) < 42 && (r + b - 2 * g) > 155) {
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
        string outPath,
        double x0f,
        double y0f,
        double x1f,
        double y1f,
        int maxW,
        int maxH
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

                // 2. Seed interior enclosed magenta holes (wheel spokes, archways, trophy handles)
                for (int y = 1; y < h - 1; y++) {
                    for (int x = 1; x < w - 1; x++) {
                        int pos = y * w + x;
                        if (visited[pos]) continue;
                        int idx = y * stride + x * 4;
                        if (IsInteriorMagentaHole(buf[idx + 2], buf[idx + 1], buf[idx])) {
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

                // 4. 2px edge de-spill & purple fringe neutralization pass
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

                            if (hasTransNeighbor && (r + b - 2 * g) > 95 && r > 115 && b > 110 && Math.Abs((int)r - (int)b) < 55) {
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
}
"@

Add-Type -TypeDefinition $csCode -ReferencedAssemblies System.Drawing

$rootDir = Split-Path -Parent $PSScriptRoot
$gameDir = Join-Path $rootDir "public\assets\games\cloudkart"
$rawDir = Join-Path $gameDir "raw"
$spritesDir = Join-Path $gameDir "sprites"

New-Item -ItemType Directory -Force -Path $rawDir | Out-Null
New-Item -ItemType Directory -Force -Path $spritesDir | Out-Null

$artifactDir = "C:\Users\RobaD\.gemini\antigravity\brain\3d8a56a9-8ed2-429f-bb36-759e886c309f"
$stageSrc = Join-Path $artifactDir "cloudkart_stage_raw_1793761306022.jpg"
$kartsSrc = Join-Path $artifactDir "cloudkart_karts_raw_1793761324189.jpg"
$propsSrc = Join-Path $artifactDir "cloudkart_props_raw_1793761344202.jpg"

$stageRaw = Join-Path $rawDir "cloudkart-stage-raw.jpg"
$kartsRaw = Join-Path $rawDir "cloudkart-karts-raw.jpg"
$propsRaw = Join-Path $rawDir "cloudkart-props-raw.jpg"

if (Test-Path $stageSrc) { Copy-Item -Force $stageSrc $stageRaw }
if (Test-Path $kartsSrc) { Copy-Item -Force $kartsSrc $kartsRaw }
if (Test-Path $propsSrc) { Copy-Item -Force $propsSrc $propsRaw }

# 1. Save 1280x720 clean stage background
$stageOut = Join-Path $gameDir "cloudkart-stage-bg.png"
if (Test-Path $stageRaw) {
    [CloudKartSpriteProcessor]::SaveResizedBackground($stageRaw, $stageOut, 1280, 720)
    Write-Host "  [SAVED STAGE] cloudkart-stage-bg.png (1280x720)"
}

# 2. Slice 2x2 Karts Sheet
if (Test-Path $kartsRaw) {
    $kartsSpecs = @(
        @{ Name = "kart-wyatt.png";  X0 = 0.00; Y0 = 0.00; X1 = 0.50; Y1 = 0.49; MaxW = 280; MaxH = 240 },
        @{ Name = "kart-emma.png";   X0 = 0.50; Y0 = 0.00; X1 = 1.00; Y1 = 0.49; MaxW = 280; MaxH = 240 },
        @{ Name = "kart-sparky.png"; X0 = 0.00; Y0 = 0.50; X1 = 0.50; Y1 = 1.00; MaxW = 280; MaxH = 240 },
        @{ Name = "kart-doggie.png"; X0 = 0.50; Y0 = 0.50; X1 = 1.00; Y1 = 1.00; MaxW = 280; MaxH = 240 }
    )

    foreach ($spec in $kartsSpecs) {
        $outPath = Join-Path $spritesDir $spec.Name
        [CloudKartSpriteProcessor]::SliceSpriteCellFrac($kartsRaw, $outPath, $spec.X0, $spec.Y0, $spec.X1, $spec.Y1, $spec.MaxW, $spec.MaxH)
    }
}

# 3. Slice 3x4 Props Sheet with exact magenta gutter boundaries
if (Test-Path $propsRaw) {
    $propsSpecs = @(
        @{ Name = "spr-sky-gate.png";      X0 = 0.00; Y0 = 0.00; X1 = 0.285; Y1 = 0.355; MaxW = 320; MaxH = 320 },
        @{ Name = "spr-flag-start.png";    X0 = 0.285; Y0 = 0.00; X1 = 0.50;  Y1 = 0.355; MaxW = 150; MaxH = 190 },
        @{ Name = "spr-flag-finish.png";   X0 = 0.50;  Y0 = 0.00; X1 = 0.715; Y1 = 0.355; MaxW = 150; MaxH = 190 },
        @{ Name = "spr-boost-pad.png";     X0 = 0.715; Y0 = 0.00; X1 = 1.00;  Y1 = 0.33;  MaxW = 220; MaxH = 150 },
        @{ Name = "spr-cloud-ramp.png";    X0 = 0.00;  Y0 = 0.355; X1 = 0.29; Y1 = 0.65;  MaxW = 220; MaxH = 160 },
        @{ Name = "spr-star-coin.png";     X0 = 0.29;  Y0 = 0.355; X1 = 0.51; Y1 = 0.65;  MaxW = 110; MaxH = 110 },
        @{ Name = "spr-quill-kart.png";    X0 = 0.51;  Y0 = 0.355; X1 = 0.72; Y1 = 0.65;  MaxW = 120; MaxH = 120 },
        @{ Name = "spr-eraser-sponge.png"; X0 = 0.72;  Y0 = 0.355; X1 = 1.00; Y1 = 0.64;  MaxW = 130; MaxH = 130 },
        @{ Name = "spr-trophy-podium.png"; X0 = 0.00;  Y0 = 0.65;  X1 = 0.295; Y1 = 1.00; MaxW = 340; MaxH = 260 },
        @{ Name = "spr-golden-cup.png";    X0 = 0.295; Y0 = 0.65;  X1 = 0.50;  Y1 = 1.00; MaxW = 200; MaxH = 220 },
        @{ Name = "spr-cloud-puff.png";    X0 = 0.50;  Y0 = 0.65;  X1 = 0.715; Y1 = 1.00; MaxW = 240; MaxH = 160 },
        @{ Name = "spr-finish-arch.png";   X0 = 0.715; Y0 = 0.64;  X1 = 1.00;  Y1 = 1.00; MaxW = 340; MaxH = 290 }
    )

    foreach ($spec in $propsSpecs) {
        $outPath = Join-Path $spritesDir $spec.Name
        [CloudKartSpriteProcessor]::SliceSpriteCellFrac($propsRaw, $outPath, $spec.X0, $spec.Y0, $spec.X1, $spec.Y1, $spec.MaxW, $spec.MaxH)
    }
}
