$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$csCode = @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class UnicornSpriteProcessor {
    private static bool IsMagenta(byte r, byte g, byte b) {
        if (r > 140 && b > 130 && g < 115 && (r - g) > 42 && (b - g) > 36 && Math.Abs((int)r - (int)b) < 58) return true;
        if ((r + b - 2 * g) > 135 && r > 130 && b > 120 && Math.Abs((int)r - (int)b) < 55) return true;
        return false;
    }

    private static bool IsInteriorMagentaHole(byte r, byte g, byte b) {
        // Clears pure & JPEG-shaded neon magenta inside teapot handles, tiered stand arches, showerhead pipes, and carriage wheels
        // while 100% protecting coral-pink gowns, strawberry frosting, lavender ribbons, and ruby gems
        if (r > 195 && g < 72 && b > 190 && Math.Abs((int)r - (int)b) < 40 && (r + b - 2 * g) > 255) {
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
        bool isSticker
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

                // 4. 3-pass edge de-spill & purple fringe neutralization pass
                for (int pass = 0; pass < 3; pass++) {
                    List<int> toClear = new List<int>();
                    List<int> toWhiten = new List<int>();
                    List<int> toDarkOutline = new List<int>();
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

                            if (isSticker) {
                                // On die-cut stickers, clear any pink-tinted JPEG transition pixels on the outer edge
                                if (magExcess > 14 && rbDiff < 58 && r > 120 && b > 115) {
                                    if (gCol < 232) {
                                        toClear.Add(idx);
                                    } else {
                                        toWhiten.Add(idx);
                                    }
                                }
                            } else {
                                // On dark-outlined sprites, clear bright magenta edge pixels & neutralize dark purple outline spill
                                if (magExcess > 55 && rbDiff < 52) {
                                    if (r > 95 && b > 90 && gCol < 115) {
                                        toClear.Add(idx);
                                    } else if (gCol < 65 && r > 35 && b > 35) {
                                        toDarkOutline.Add(idx);
                                    }
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
                    foreach (int idx in toWhiten) {
                        buf[idx] = 255;
                        buf[idx + 1] = 255;
                        buf[idx + 2] = 255;
                        buf[idx + 3] = 255;
                    }
                    foreach (int idx in toDarkOutline) {
                        buf[idx] = 28;
                        buf[idx + 1] = 20;
                        buf[idx + 2] = 40;
                        buf[idx + 3] = 255;
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

$gameDir = Join-Path $rootDir "public\assets\games\unicorn"
$rawDir = Join-Path $gameDir "raw"
$spritesDir = Join-Path $gameDir "sprites"

New-Item -ItemType Directory -Force -Path $hubRawDir | Out-Null
New-Item -ItemType Directory -Force -Path $hubArcadeDir | Out-Null
New-Item -ItemType Directory -Force -Path $hubSpritesDir | Out-Null
New-Item -ItemType Directory -Force -Path $rawDir | Out-Null
New-Item -ItemType Directory -Force -Path $spritesDir | Out-Null

$artifactDir = "C:\Users\RobaD\.gemini\antigravity\brain\ee389a3e-a397-4319-a67d-aaf405565771"

$stagedMap = @{
    (Join-Path $hubRawDir "hub-toy-unicorn-raw.jpg")                = (Join-Path $artifactDir "hub_toy_unicorn_raw_1793766969665.jpg")
    (Join-Path $rawDir "unicorn-spa-bg-raw.jpg")                    = (Join-Path $artifactDir "unicorn_spa_bg_raw_1793766983556.jpg")
    (Join-Path $rawDir "unicorn-teaparty-bg-raw.jpg")               = (Join-Path $artifactDir "unicorn_teaparty_bg_raw_1793766997352.jpg")
    (Join-Path $rawDir "unicorn-sticker-meadow-bg-raw.jpg")         = (Join-Path $artifactDir "unicorn_sticker_meadow_bg_raw_1793766977986.jpg")
    (Join-Path $rawDir "unicorn-sticker-ballroom-bg-raw.jpg")       = (Join-Path $artifactDir "unicorn_sticker_ballroom_bg_raw_1793766998274.jpg")
    (Join-Path $rawDir "unicorn-sticker-bedroom-bg-raw.jpg")        = (Join-Path $artifactDir "unicorn_sticker_bedroom_bg_raw_1793767013212.jpg")
    (Join-Path $rawDir "unicorn-characters-raw.jpg")                = (Join-Path $artifactDir "unicorn_characters_raw_1793766984861.jpg")
    (Join-Path $rawDir "unicorn-spa-gems-raw.jpg")                  = (Join-Path $artifactDir "unicorn_spa_gems_raw_1793767002529.jpg")
    (Join-Path $rawDir "unicorn-teaparty-props-raw.jpg")            = (Join-Path $artifactDir "unicorn_teaparty_props_raw_v2_1793767034884.jpg")
    (Join-Path $rawDir "unicorn-stickers-1-raw.jpg")                = (Join-Path $artifactDir "unicorn_stickers_1_raw_1793766980313.jpg")
    (Join-Path $rawDir "unicorn-stickers-2-raw.jpg")                = (Join-Path $artifactDir "unicorn_stickers_2_raw_1793766998434.jpg")
}

foreach ($dest in $stagedMap.Keys) {
    $src = $stagedMap[$dest]
    if (Test-Path $src) {
        Copy-Item -Force $src $dest
    }
}

# 1. Slice Hub Shelf Toy (`hub-toy-unicorn.png`)
$hubToyRaw = Join-Path $hubRawDir "hub-toy-unicorn-raw.jpg"
if (Test-Path $hubToyRaw) {
    $out1 = Join-Path $hubArcadeDir "hub-toy-unicorn.png"
    $out2 = Join-Path $hubSpritesDir "hub-toy-unicorn.png"
    [UnicornSpriteProcessor]::SliceSpriteCellFrac($hubToyRaw, @($out1, $out2), 0.02, 0.02, 0.98, 0.98, 380, 420, $false)
}

# 2. Save 5 Clean-Stage 1280x720 Backgrounds
$bgSpecs = @(
    @{ Raw = "unicorn-spa-bg-raw.jpg";              Out = "unicorn-spa-bg.png" },
    @{ Raw = "unicorn-teaparty-bg-raw.jpg";         Out = "unicorn-teaparty-bg.png" },
    @{ Raw = "unicorn-sticker-meadow-bg-raw.jpg";   Out = "unicorn-sticker-meadow-bg.png" },
    @{ Raw = "unicorn-sticker-ballroom-bg-raw.jpg"; Out = "unicorn-sticker-ballroom-bg.png" },
    @{ Raw = "unicorn-sticker-bedroom-bg-raw.jpg";  Out = "unicorn-sticker-bedroom-bg.png" }
)

foreach ($bg in $bgSpecs) {
    $rPath = Join-Path $rawDir $bg.Raw
    $oPath = Join-Path $gameDir $bg.Out
    if (Test-Path $rPath) {
        [UnicornSpriteProcessor]::SaveResizedBackground($rPath, $oPath, 1280, 720)
        Write-Host ("  [SAVED STAGE] {0} (1280x720)" -f $bg.Out)
    }
}

# 3. Slice 2x4 Characters & Accessories Sheet (`unicorn-characters-raw.jpg`)
$charsRaw = Join-Path $rawDir "unicorn-characters-raw.jpg"
if (Test-Path $charsRaw) {
    $charSpecs = @(
        @{ Name = "char-emma-princess.png"; X0 = 0.01; Y0 = 0.02; X1 = 0.24; Y1 = 0.49; MaxW = 240; MaxH = 280 },
        @{ Name = "char-emma-wand.png";     X0 = 0.26; Y0 = 0.02; X1 = 0.49; Y1 = 0.49; MaxW = 250; MaxH = 280 },
        @{ Name = "char-unicorn-base.png";  X0 = 0.50; Y0 = 0.01; X1 = 0.74; Y1 = 0.49; MaxW = 320; MaxH = 300 },
        @{ Name = "char-unicorn-happy.png"; X0 = 0.75; Y0 = 0.01; X1 = 0.99; Y1 = 0.49; MaxW = 320; MaxH = 300 },
        @{ Name = "char-sparky-bowtie.png"; X0 = 0.01; Y0 = 0.51; X1 = 0.24; Y1 = 0.98; MaxW = 240; MaxH = 250 },
        @{ Name = "char-doggie-crown.png";  X0 = 0.26; Y0 = 0.51; X1 = 0.49; Y1 = 0.98; MaxW = 220; MaxH = 240 },
        @{ Name = "acc-royal-saddle.png";   X0 = 0.50; Y0 = 0.52; X1 = 0.74; Y1 = 0.98; MaxW = 220; MaxH = 200 },
        @{ Name = "acc-royal-tiara.png";    X0 = 0.75; Y0 = 0.52; X1 = 0.99; Y1 = 0.98; MaxW = 200; MaxH = 160 }
    )
    foreach ($s in $charSpecs) {
        $outP = Join-Path $spritesDir $s.Name
        [UnicornSpriteProcessor]::SliceSpriteCellFrac($charsRaw, @($outP), $s.X0, $s.Y0, $s.X1, $s.Y1, $s.MaxW, $s.MaxH, $false)
    }
}

# 4. Slice 3x4 Spa Tools, Potions & Gems Sheet (`unicorn-spa-gems-raw.jpg`)
$spaRaw = Join-Path $rawDir "unicorn-spa-gems-raw.jpg"
if (Test-Path $spaRaw) {
    $spaSpecs = @(
        @{ Name = "spa-potion-pink.png";     X0 = 0.01; Y0 = 0.01; X1 = 0.24; Y1 = 0.33; MaxW = 160; MaxH = 190 },
        @{ Name = "spa-potion-blue.png";     X0 = 0.26; Y0 = 0.01; X1 = 0.49; Y1 = 0.33; MaxW = 160; MaxH = 190 },
        @{ Name = "spa-potion-gold.png";     X0 = 0.51; Y0 = 0.01; X1 = 0.74; Y1 = 0.33; MaxW = 160; MaxH = 190 },
        @{ Name = "spa-brush-starlight.png"; X0 = 0.75; Y0 = 0.01; X1 = 0.99; Y1 = 0.33; MaxW = 180; MaxH = 180 },
        @{ Name = "spa-shower-cloud.png";    X0 = 0.01; Y0 = 0.34; X1 = 0.24; Y1 = 0.66; MaxW = 200; MaxH = 190 },
        @{ Name = "spa-soap-bubble.png";     X0 = 0.26; Y0 = 0.34; X1 = 0.49; Y1 = 0.66; MaxW = 160; MaxH = 160 },
        @{ Name = "acc-wing-bow.png";        X0 = 0.51; Y0 = 0.34; X1 = 0.74; Y1 = 0.66; MaxW = 170; MaxH = 160 },
        @{ Name = "spa-wand-rainbow.png";    X0 = 0.75; Y0 = 0.34; X1 = 0.99; Y1 = 0.66; MaxW = 180; MaxH = 180 },
        @{ Name = "gem-circle-ruby.png";     X0 = 0.01; Y0 = 0.67; X1 = 0.24; Y1 = 0.99; MaxW = 150; MaxH = 150 },
        @{ Name = "gem-heart-quartz.png";    X0 = 0.26; Y0 = 0.67; X1 = 0.49; Y1 = 0.99; MaxW = 150; MaxH = 150 },
        @{ Name = "gem-star-topaz.png";      X0 = 0.51; Y0 = 0.67; X1 = 0.74; Y1 = 0.99; MaxW = 150; MaxH = 150 },
        @{ Name = "gem-square-emerald.png";  X0 = 0.75; Y0 = 0.67; X1 = 0.99; Y1 = 0.99; MaxW = 150; MaxH = 150 }
    )
    foreach ($s in $spaSpecs) {
        $outP = Join-Path $spritesDir $s.Name
        [UnicornSpriteProcessor]::SliceSpriteCellFrac($spaRaw, @($outP), $s.X0, $s.Y0, $s.X1, $s.Y1, $s.MaxW, $s.MaxH, $false)
    }
}

# 5. Slice 3x4 Tea Party, Bakery Treats, Caretaking & Sapphire Gem Sheet (`unicorn-teaparty-props-raw.jpg`)
$teaRaw = Join-Path $rawDir "unicorn-teaparty-props-raw.jpg"
if (Test-Path $teaRaw) {
    $teaSpecs = @(
        @{ Name = "gem-triangle-sapphire.png"; X0 = 0.01; Y0 = 0.01; X1 = 0.24; Y1 = 0.33; MaxW = 150; MaxH = 150 },
        @{ Name = "tea-teapot.png";            X0 = 0.25; Y0 = 0.01; X1 = 0.50; Y1 = 0.33; MaxW = 210; MaxH = 190 },
        @{ Name = "tea-cup-saucer.png";        X0 = 0.51; Y0 = 0.01; X1 = 0.74; Y1 = 0.33; MaxW = 160; MaxH = 140 },
        @{ Name = "tea-plate-silver.png";      X0 = 0.75; Y0 = 0.01; X1 = 0.99; Y1 = 0.33; MaxW = 160; MaxH = 160 },
        @{ Name = "treat-cupcake.png";         X0 = 0.01; Y0 = 0.34; X1 = 0.24; Y1 = 0.66; MaxW = 130; MaxH = 150 },
        @{ Name = "treat-star-cookie.png";     X0 = 0.26; Y0 = 0.34; X1 = 0.49; Y1 = 0.66; MaxW = 130; MaxH = 130 },
        @{ Name = "treat-sugar-heart.png";     X0 = 0.51; Y0 = 0.34; X1 = 0.74; Y1 = 0.66; MaxW = 130; MaxH = 130 },
        @{ Name = "treat-rainbow-berry.png";   X0 = 0.75; Y0 = 0.34; X1 = 0.99; Y1 = 0.66; MaxW = 140; MaxH = 130 },
        @{ Name = "tea-bakery-stand.png";      X0 = 0.01; Y0 = 0.67; X1 = 0.24; Y1 = 0.99; MaxW = 210; MaxH = 250 },
        @{ Name = "care-velvet-blanket.png";   X0 = 0.25; Y0 = 0.67; X1 = 0.50; Y1 = 0.99; MaxW = 180; MaxH = 160 },
        @{ Name = "care-starlight-pillow.png"; X0 = 0.50; Y0 = 0.67; X1 = 0.75; Y1 = 0.99; MaxW = 180; MaxH = 160 },
        @{ Name = "care-feather-wand.png";     X0 = 0.75; Y0 = 0.67; X1 = 0.99; Y1 = 0.99; MaxW = 180; MaxH = 180 }
    )
    foreach ($s in $teaSpecs) {
        $outP = Join-Path $spritesDir $s.Name
        [UnicornSpriteProcessor]::SliceSpriteCellFrac($teaRaw, @($outP), $s.X0, $s.Y0, $s.X1, $s.Y1, $s.MaxW, $s.MaxH, $false)
    }
}

# 6. Slice 3x4 Living Stickers Sheet 1 (`unicorn-stickers-1-raw.jpg`)
$stk1Raw = Join-Path $rawDir "unicorn-stickers-1-raw.jpg"
if (Test-Path $stk1Raw) {
    $stk1Specs = @(
        @{ Name = "stk-unicorn-prance.png";    X0 = 0.01; Y0 = 0.01; X1 = 0.25; Y1 = 0.33; MaxW = 210; MaxH = 210 },
        @{ Name = "stk-baby-pegasus-blue.png"; X0 = 0.26; Y0 = 0.01; X1 = 0.50; Y1 = 0.33; MaxW = 200; MaxH = 200 },
        @{ Name = "stk-baby-unicorn-gold.png"; X0 = 0.51; Y0 = 0.01; X1 = 0.74; Y1 = 0.33; MaxW = 190; MaxH = 200 },
        @{ Name = "stk-unicorn-sleepy.png";    X0 = 0.74; Y0 = 0.01; X1 = 0.99; Y1 = 0.33; MaxW = 200; MaxH = 200 },
        @{ Name = "stk-pegasus-rainbow.png";   X0 = 0.01; Y0 = 0.34; X1 = 0.25; Y1 = 0.66; MaxW = 210; MaxH = 210 },
        @{ Name = "stk-unicorn-carousel.png";  X0 = 0.26; Y0 = 0.34; X1 = 0.50; Y1 = 0.66; MaxW = 210; MaxH = 210 },
        @{ Name = "stk-emma-curtsy.png";       X0 = 0.51; Y0 = 0.34; X1 = 0.74; Y1 = 0.66; MaxW = 200; MaxH = 210 },
        @{ Name = "stk-emma-twirl.png";        X0 = 0.74; Y0 = 0.34; X1 = 0.99; Y1 = 0.66; MaxW = 210; MaxH = 210 },
        @{ Name = "stk-sparky-prince.png";     X0 = 0.01; Y0 = 0.67; X1 = 0.25; Y1 = 0.99; MaxW = 200; MaxH = 210 },
        @{ Name = "stk-doggie-jester.png";     X0 = 0.26; Y0 = 0.67; X1 = 0.50; Y1 = 0.99; MaxW = 190; MaxH = 200 },
        @{ Name = "stk-fairy-butterfly.png";   X0 = 0.51; Y0 = 0.67; X1 = 0.74; Y1 = 0.99; MaxW = 190; MaxH = 190 },
        @{ Name = "stk-royal-swan.png";        X0 = 0.74; Y0 = 0.67; X1 = 0.99; Y1 = 0.99; MaxW = 190; MaxH = 190 }
    )
    foreach ($s in $stk1Specs) {
        $outP = Join-Path $spritesDir $s.Name
        [UnicornSpriteProcessor]::SliceSpriteCellFrac($stk1Raw, @($outP), $s.X0, $s.Y0, $s.X1, $s.Y1, $s.MaxW, $s.MaxH, $true)
    }
}

# 7. Slice 3x4 Living Stickers Sheet 2 (`unicorn-stickers-2-raw.jpg`)
$stk2Raw = Join-Path $rawDir "unicorn-stickers-2-raw.jpg"
if (Test-Path $stk2Raw) {
    $stk2Specs = @(
        @{ Name = "stk-diamond-crown.png";   X0 = 0.01; Y0 = 0.01; X1 = 0.26; Y1 = 0.33; MaxW = 180; MaxH = 160 },
        @{ Name = "stk-crystal-slipper.png"; X0 = 0.27; Y0 = 0.01; X1 = 0.50; Y1 = 0.33; MaxW = 180; MaxH = 180 },
        @{ Name = "stk-magic-scepter.png";   X0 = 0.51; Y0 = 0.01; X1 = 0.74; Y1 = 0.33; MaxW = 190; MaxH = 190 },
        @{ Name = "stk-treasure-chest.png";  X0 = 0.74; Y0 = 0.01; X1 = 0.99; Y1 = 0.33; MaxW = 190; MaxH = 190 },
        @{ Name = "stk-heart-locket.png";    X0 = 0.01; Y0 = 0.34; X1 = 0.27; Y1 = 0.66; MaxW = 180; MaxH = 180 },
        @{ Name = "stk-birthday-cake.png";   X0 = 0.28; Y0 = 0.34; X1 = 0.50; Y1 = 0.66; MaxW = 190; MaxH = 210 },
        @{ Name = "stk-icecream-sundae.png"; X0 = 0.51; Y0 = 0.34; X1 = 0.74; Y1 = 0.66; MaxW = 180; MaxH = 210 },
        @{ Name = "stk-macaron-tower.png";   X0 = 0.75; Y0 = 0.34; X1 = 0.99; Y1 = 0.66; MaxW = 180; MaxH = 210 },
        @{ Name = "stk-candy-carriage.png";  X0 = 0.01; Y0 = 0.67; X1 = 0.27; Y1 = 0.99; MaxW = 210; MaxH = 200 },
        @{ Name = "stk-rainbow-arch.png";    X0 = 0.27; Y0 = 0.67; X1 = 0.53; Y1 = 0.99; MaxW = 220; MaxH = 180 },
        @{ Name = "stk-royal-kitten.png";    X0 = 0.54; Y0 = 0.67; X1 = 0.75; Y1 = 0.99; MaxW = 180; MaxH = 190 },
        @{ Name = "stk-hot-air-balloon.png"; X0 = 0.76; Y0 = 0.67; X1 = 0.99; Y1 = 0.99; MaxW = 190; MaxH = 220 }
    )
    foreach ($s in $stk2Specs) {
        $outP = Join-Path $spritesDir $s.Name
        [UnicornSpriteProcessor]::SliceSpriteCellFrac($stk2Raw, @($outP), $s.X0, $s.Y0, $s.X1, $s.Y1, $s.MaxW, $s.MaxH, $true)
    }
}
