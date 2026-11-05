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

public static class ISpyAssetProcessor {
    private static bool IsMagenta(byte r, byte g, byte b) {
        if (r > 140 && b > 130 && g < 115 && (r - g) > 42 && (b - g) > 36 && Math.Abs((int)r - (int)b) < 58) return true;
        if ((r + b - 2 * g) > 135 && r > 130 && b > 120 && Math.Abs((int)r - (int)b) < 55) return true;
        return false;
    }

    private static bool IsInteriorMagentaHole(byte r, byte g, byte b) {
        // Strict neon magenta check for interior holes (key bows, button holes, gear spokes, teacup handle, ring band)
        // Protects red dice, red racecars, strawberry erasers, ruby rings, and purple amethyst crystals
        if (r > 205 && g < 62 && b > 198 && Math.Abs((int)r - (int)b) < 36 && (r + b - 2 * g) > 280) {
            return true;
        }
        return false;
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
        bool isHubToy
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

                // 2. Seed interior enclosed neon magenta holes
                for (int y = 1; y < h - 1; y++) {
                    for (int x = 1; x < w - 1; x++) {
                        int pos = y * w + x;
                        if (visited[pos]) continue;
                        int idx = y * stride + x * 4;
                        byte b = buf[idx];
                        byte gCol = buf[idx + 1];
                        byte r = buf[idx + 2];
                        if (isHubToy) {
                            // Clear strict neon magenta between the brass arm & drawer
                            if (r > 220 && gCol < 45 && b > 215 && Math.Abs((int)r - (int)b) < 28) {
                                visited[pos] = true;
                                q.Enqueue(pos);
                            }
                        } else if (IsInteriorMagentaHole(r, gCol, b)) {
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
                                byte nb = buf[nIdx];
                                byte ng = buf[nIdx + 1];
                                byte nr = buf[nIdx + 2];
                                if (isHubToy) {
                                    // Do not flood into the pink-tinted glass lens inside the brass rim
                                    if (nr > 210 && ng < 55 && nb > 205 && Math.Abs((int)nr - (int)nb) < 35) {
                                        visited[nPos] = true;
                                        q.Enqueue(nPos);
                                    }
                                } else if (IsMagenta(nr, ng, nb)) {
                                    visited[nPos] = true;
                                    q.Enqueue(nPos);
                                }
                            }
                        }
                    }
                }

                // For hub-toy-ispy, convert any pink-magenta tint inside the magnifying glass lens to warm crystal glass
                if (isHubToy) {
                    for (int y = 1; y < (int)(h * 0.55); y++) {
                        for (int x = 1; x < w - 1; x++) {
                            int idx = y * stride + x * 4;
                            if (buf[idx + 3] == 0) continue;
                            byte b = buf[idx];
                            byte gCol = buf[idx + 1];
                            byte r = buf[idx + 2];
                            if (r > 175 && b > 175 && (r + b - 2 * gCol) > 95) {
                                // Warm sky-crystal magnifying lens glass highlight
                                buf[idx] = 248;     // B
                                buf[idx + 1] = 232; // G
                                buf[idx + 2] = 185; // R
                                buf[idx + 3] = 185; // Alpha
                            }
                        }
                    }
                }

                // 4. 2px perimeter de-spill pass
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

                            if (!hasTransNeighbor) continue;

                            int magExcess = (int)r + (int)b - 2 * (int)gCol;
                            int rbDiff = Math.Abs((int)r - (int)b);
                            if (magExcess > 75 && rbDiff < 55 && r > 110 && b > 105) {
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
                        gOut.InterpolationMode = isHubToy ? InterpolationMode.NearestNeighbor : InterpolationMode.HighQualityBicubic;
                        gOut.PixelOffsetMode = isHubToy ? PixelOffsetMode.Half : PixelOffsetMode.HighQuality;
                        gOut.SmoothingMode = isHubToy ? SmoothingMode.None : SmoothingMode.HighQuality;
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

    private static Bitmap CreateShadowBitmap(Bitmap src, float alphaScale) {
        int w = src.Width;
        int h = src.Height;
        Bitmap shadow = new Bitmap(w, h, PixelFormat.Format32bppArgb);
        BitmapData sData = src.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
        BitmapData dData = shadow.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
        int stride = sData.Stride;
        byte[] sBuf = new byte[stride * h];
        byte[] dBuf = new byte[stride * h];
        Marshal.Copy(sData.Scan0, sBuf, 0, sBuf.Length);

        for (int i = 0; i < sBuf.Length; i += 4) {
            byte a = sBuf[i + 3];
            if (a > 0) {
                dBuf[i] = 4;     // B
                dBuf[i + 1] = 8; // G
                dBuf[i + 2] = 16;// R (warm dark studio shadow)
                dBuf[i + 3] = (byte)Math.Min(255, (int)(a * alphaScale));
            }
        }

        Marshal.Copy(dBuf, 0, dData.Scan0, dBuf.Length);
        src.UnlockBits(sData);
        shadow.UnlockBits(dData);
        return shadow;
    }

    private static void DrawStampedSpriteWithShadow(
        Graphics g,
        Bitmap sprite,
        Bitmap softShadow,
        Bitmap contactShadow,
        float cx,
        float cy,
        float scale,
        float angleDeg
    ) {
        float drawW = sprite.Width * scale;
        float drawH = sprite.Height * scale;

        // 1. Multi-offset Gaussian-like diffused studio drop shadow (upper-left key light -> lower-right shadow)
        float[,] offsets = new float[,] {
            { 7f, 10f }, { 11f, 14f }, { 9f, 12f }, { 6f, 13f }, { 12f, 10f }
        };
        for (int k = 0; k < 5; k++) {
            GraphicsState st = g.Save();
            g.TranslateTransform(cx + offsets[k, 0], cy + offsets[k, 1]);
            g.RotateTransform(angleDeg);
            g.DrawImage(softShadow, -drawW / 2f, -drawH / 2f, drawW, drawH);
            g.Restore(st);
        }

        // 2. Tight ambient occlusion contact shadow directly beneath the object
        {
            GraphicsState st = g.Save();
            g.TranslateTransform(cx + 3.5f, cy + 5.0f);
            g.RotateTransform(angleDeg);
            g.DrawImage(contactShadow, -drawW / 2f, -drawH / 2f, drawW, drawH);
            g.Restore(st);
        }

        // 3. Crisp studio-lit miniature object
        {
            GraphicsState st = g.Save();
            g.TranslateTransform(cx, cy);
            g.RotateTransform(angleDeg);
            g.DrawImage(sprite, -drawW / 2f, -drawH / 2f, drawW, drawH);
            g.Restore(st);
        }
    }

    public static void CompositeBoard(
        string rawBasePath,
        string spritesDir,
        string outClutterBoardPath,
        string outFullBoardPath,
        string[] itemTypes,
        float[] texXs,
        float[] texYs,
        float[] scales,
        float[] angles,
        bool[] isTargetFlags
    ) {
        Dictionary<string, Bitmap> spriteCache = new Dictionary<string, Bitmap>();
        Dictionary<string, Bitmap> softShadowCache = new Dictionary<string, Bitmap>();
        Dictionary<string, Bitmap> contactShadowCache = new Dictionary<string, Bitmap>();

        try {
            foreach (string t in itemTypes) {
                if (!spriteCache.ContainsKey(t)) {
                    string spPath = Path.Combine(spritesDir, t + ".png");
                    Bitmap bmp = new Bitmap(spPath);
                    spriteCache[t] = bmp;
                    softShadowCache[t] = CreateShadowBitmap(bmp, 0.11f);
                    contactShadowCache[t] = CreateShadowBitmap(bmp, 0.34f);
                }
            }

            using (Bitmap rawSrc = new Bitmap(rawBasePath)) {
                using (Bitmap boardClutter = new Bitmap(2560, 1440, PixelFormat.Format24bppRgb)) {
                    using (Graphics g = Graphics.FromImage(boardClutter)) {
                        g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                        g.SmoothingMode = SmoothingMode.HighQuality;
                        g.PixelOffsetMode = PixelOffsetMode.HighQuality;
                        g.DrawImage(rawSrc, new Rectangle(0, 0, 2560, 1440));

                        // Pass 1: Composite all non-target clutter objects onto boardClutter
                        for (int i = 0; i < itemTypes.Length; i++) {
                            if (isTargetFlags[i]) continue;
                            string t = itemTypes[i];
                            DrawStampedSpriteWithShadow(
                                g,
                                spriteCache[t],
                                softShadowCache[t],
                                contactShadowCache[t],
                                texXs[i],
                                texYs[i],
                                scales[i],
                                angles[i]
                            );
                        }
                    }

                    // Save JPEG with quality 92
                    ImageCodecInfo jpgEncoder = null;
                    foreach (ImageCodecInfo codec in ImageCodecInfo.GetImageEncoders()) {
                        if (codec.FormatID == ImageFormat.Jpeg.Guid) {
                            jpgEncoder = codec;
                            break;
                        }
                    }
                    EncoderParameters encParams = new EncoderParameters(1);
                    encParams.Param[0] = new EncoderParameter(System.Drawing.Imaging.Encoder.Quality, 92L);

                    boardClutter.Save(outClutterBoardPath, jpgEncoder, encParams);
                    Console.WriteLine(string.Format("  [COMPOSITED 2560x1440 BOARD] {0}", Path.GetFileName(outClutterBoardPath)));

                    // Pass 2: Also save full reference board with targets composited
                    using (Bitmap boardFull = new Bitmap(boardClutter)) {
                        using (Graphics gFull = Graphics.FromImage(boardFull)) {
                            gFull.InterpolationMode = InterpolationMode.HighQualityBicubic;
                            gFull.SmoothingMode = SmoothingMode.HighQuality;
                            gFull.PixelOffsetMode = PixelOffsetMode.HighQuality;
                            for (int i = 0; i < itemTypes.Length; i++) {
                                if (!isTargetFlags[i]) continue;
                                string t = itemTypes[i];
                                DrawStampedSpriteWithShadow(
                                    gFull,
                                    spriteCache[t],
                                    softShadowCache[t],
                                    contactShadowCache[t],
                                    texXs[i],
                                    texYs[i],
                                    scales[i],
                                    angles[i]
                                );
                            }
                        }
                        boardFull.Save(outFullBoardPath, jpgEncoder, encParams);
                        Console.WriteLine(string.Format("  [COMPOSITED 2560x1440 FULL BOARD] {0}", Path.GetFileName(outFullBoardPath)));
                    }
                }
            }
        } finally {
            foreach (Bitmap b in spriteCache.Values) b.Dispose();
            foreach (Bitmap b in softShadowCache.Values) b.Dispose();
            foreach (Bitmap b in contactShadowCache.Values) b.Dispose();
        }
    }
}
"@

Add-Type -TypeDefinition $csCode -ReferencedAssemblies System.Drawing

$rootDir = Split-Path -Parent $PSScriptRoot
$hubRawDir = Join-Path $rootDir "public\assets\hub\raw"
$hubArcadeDir = Join-Path $rootDir "public\assets\hub\arcade"
$hubSpritesDir = Join-Path $rootDir "public\assets\hub\sprites"

$gameDir = Join-Path $rootDir "public\assets\games\ispy"
$rawDir = Join-Path $gameDir "raw"
$spritesDir = Join-Path $gameDir "sprites"
$boardsDir = Join-Path $gameDir "boards"
$dataDir = Join-Path $rootDir "src\data"

New-Item -ItemType Directory -Force -Path $hubRawDir | Out-Null
New-Item -ItemType Directory -Force -Path $hubArcadeDir | Out-Null
New-Item -ItemType Directory -Force -Path $hubSpritesDir | Out-Null
New-Item -ItemType Directory -Force -Path $rawDir | Out-Null
New-Item -ItemType Directory -Force -Path $spritesDir | Out-Null
New-Item -ItemType Directory -Force -Path $boardsDir | Out-Null
New-Item -ItemType Directory -Force -Path $dataDir | Out-Null

$artifactDir = "C:\Users\RobaD\.gemini\antigravity\brain\518e621f-c14d-4402-b6d0-16ff0ca8bac0"

$stagedMap = @{
    (Join-Path $hubRawDir "hub-toy-ispy-raw.jpg")            = (Join-Path $artifactDir "hub_toy_ispy_raw_1793839133055.jpg")
    (Join-Path $rawDir "board-1-watchmaker-raw.jpg")         = (Join-Path $artifactDir "ispy_board_1_watchmaker_raw_1793839147346.jpg")
    (Join-Path $rawDir "board-2-pirate-raw.jpg")             = (Join-Path $artifactDir "ispy_board_2_pirate_raw_1793839161240.jpg")
    (Join-Path $rawDir "board-3-attic-raw.jpg")              = (Join-Path $artifactDir "ispy_board_3_attic_raw_1793839172681.jpg")
    (Join-Path $rawDir "board-4-crater-raw.jpg")             = (Join-Path $artifactDir "ispy_board_4_crater_raw_1793839185591.jpg")
    (Join-Path $rawDir "ispy-objects-sheet-1-raw.jpg")       = (Join-Path $artifactDir "ispy_objects_sheet_1_raw_1793839134395.jpg")
    (Join-Path $rawDir "ispy-objects-sheet-2-raw.jpg")       = (Join-Path $artifactDir "ispy_objects_sheet_2_raw_1793839177798.jpg")
    (Join-Path $rawDir "ispy-objects-sheet-3-raw.jpg")       = (Join-Path $artifactDir "ispy_objects_sheet_3_raw_1793839163627.jpg")
}

foreach ($dest in $stagedMap.Keys) {
    $src = $stagedMap[$dest]
    if (Test-Path $src) {
        Copy-Item -Force $src $dest
    }
}

# 1. Slice Hub Shelf Toy (`hub-toy-ispy.png`)
$hubToyRaw = Join-Path $hubRawDir "hub-toy-ispy-raw.jpg"
if (Test-Path $hubToyRaw) {
    $out1 = Join-Path $hubArcadeDir "hub-toy-ispy.png"
    $out2 = Join-Path $hubSpritesDir "hub-toy-ispy.png"
    [ISpyAssetProcessor]::SliceSpriteCellFrac($hubToyRaw, @($out1, $out2), 0.02, 0.02, 0.98, 0.98, 380, 420, $true)
}

# 2. Slice 36 Walter Wick Studio-Lit Miniature Objects (3 sheets of 3x4 = 36 items)
$sheet1Specs = @(
    @{ Name = "item-brass-key.png";         X0 = 0.01; Y0 = 0.01; X1 = 0.27; Y1 = 0.32 },
    @{ Name = "item-red-die.png";           X0 = 0.28; Y0 = 0.01; X1 = 0.49; Y1 = 0.32 },
    @{ Name = "item-glass-marble.png";      X0 = 0.50; Y0 = 0.01; X1 = 0.74; Y1 = 0.32 },
    @{ Name = "item-silver-thimble.png";    X0 = 0.75; Y0 = 0.01; X1 = 0.99; Y1 = 0.32 },
    @{ Name = "item-chess-knight.png";      X0 = 0.01; Y0 = 0.33; X1 = 0.25; Y1 = 0.65 },
    @{ Name = "item-red-racecar.png";       X0 = 0.26; Y0 = 0.33; X1 = 0.51; Y1 = 0.65 },
    @{ Name = "item-golden-acorn.png";      X0 = 0.52; Y0 = 0.33; X1 = 0.73; Y1 = 0.65 },
    @{ Name = "item-green-trex.png";        X0 = 0.73; Y0 = 0.33; X1 = 0.99; Y1 = 0.65 },
    @{ Name = "item-pearl-button.png";      X0 = 0.01; Y0 = 0.66; X1 = 0.25; Y1 = 0.99 },
    @{ Name = "item-brass-compass.png";     X0 = 0.26; Y0 = 0.62; X1 = 0.50; Y1 = 0.99 },
    @{ Name = "item-strawberry-eraser.png"; X0 = 0.51; Y0 = 0.66; X1 = 0.74; Y1 = 0.99 },
    @{ Name = "item-blue-domino.png";       X0 = 0.75; Y0 = 0.66; X1 = 0.99; Y1 = 0.99 }
)

$sheet2Specs = @(
    @{ Name = "item-painted-ladybug.png";   X0 = 0.01; Y0 = 0.01; X1 = 0.24; Y1 = 0.32 },
    @{ Name = "item-t6-airplane.png";       X0 = 0.25; Y0 = 0.01; X1 = 0.50; Y1 = 0.32 },
    @{ Name = "item-red-roadster.png";      X0 = 0.51; Y0 = 0.01; X1 = 0.75; Y1 = 0.32 },
    @{ Name = "item-golden-crown.png";      X0 = 0.76; Y0 = 0.01; X1 = 0.99; Y1 = 0.32 },
    @{ Name = "item-starfish.png";          X0 = 0.01; Y0 = 0.33; X1 = 0.25; Y1 = 0.66 },
    @{ Name = "item-paperclip.png";         X0 = 0.26; Y0 = 0.33; X1 = 0.50; Y1 = 0.66 },
    @{ Name = "item-pocket-watch.png";      X0 = 0.51; Y0 = 0.31; X1 = 0.75; Y1 = 0.66 },
    @{ Name = "item-bowling-pin.png";       X0 = 0.76; Y0 = 0.33; X1 = 0.99; Y1 = 0.66 },
    @{ Name = "item-sparky-figurine.png";   X0 = 0.01; Y0 = 0.67; X1 = 0.25; Y1 = 0.99 },
    @{ Name = "item-doggie-figurine.png";   X0 = 0.26; Y0 = 0.67; X1 = 0.50; Y1 = 0.99 },
    @{ Name = "item-brass-gear.png";        X0 = 0.51; Y0 = 0.67; X1 = 0.75; Y1 = 0.99 },
    @{ Name = "item-gold-doubloon.png";     X0 = 0.76; Y0 = 0.67; X1 = 0.99; Y1 = 0.99 }
)

$sheet3Specs = @(
    @{ Name = "item-ruby-ring.png";         X0 = 0.01; Y0 = 0.01; X1 = 0.24; Y1 = 0.32 },
    @{ Name = "item-seashell.png";          X0 = 0.25; Y0 = 0.01; X1 = 0.50; Y1 = 0.32 },
    @{ Name = "item-wooden-train.png";      X0 = 0.51; Y0 = 0.01; X1 = 0.74; Y1 = 0.32 },
    @{ Name = "item-alphabet-block.png";    X0 = 0.75; Y0 = 0.01; X1 = 0.99; Y1 = 0.32 },
    @{ Name = "item-porcelain-teacup.png";  X0 = 0.01; Y0 = 0.33; X1 = 0.24; Y1 = 0.65 },
    @{ Name = "item-amethyst-crystal.png";  X0 = 0.25; Y0 = 0.33; X1 = 0.50; Y1 = 0.65 },
    @{ Name = "item-retro-rocket.png";      X0 = 0.51; Y0 = 0.33; X1 = 0.73; Y1 = 0.66 },
    @{ Name = "item-triceratops.png";       X0 = 0.73; Y0 = 0.33; X1 = 0.99; Y1 = 0.65 },
    @{ Name = "item-brass-sextant.png";     X0 = 0.01; Y0 = 0.66; X1 = 0.25; Y1 = 0.99 },
    @{ Name = "item-silver-whistle.png";    X0 = 0.26; Y0 = 0.66; X1 = 0.50; Y1 = 0.99 },
    @{ Name = "item-jade-turtle.png";       X0 = 0.51; Y0 = 0.66; X1 = 0.75; Y1 = 0.99 },
    @{ Name = "item-music-bell.png";        X0 = 0.76; Y0 = 0.66; X1 = 0.99; Y1 = 0.99 }
)

$sheet1Raw = Join-Path $rawDir "ispy-objects-sheet-1-raw.jpg"
foreach ($s in $sheet1Specs) {
    $outP = Join-Path $spritesDir $s.Name
    [ISpyAssetProcessor]::SliceSpriteCellFrac($sheet1Raw, @($outP), $s.X0, $s.Y0, $s.X1, $s.Y1, 220, 220, $false)
}

$sheet2Raw = Join-Path $rawDir "ispy-objects-sheet-2-raw.jpg"
foreach ($s in $sheet2Specs) {
    $outP = Join-Path $spritesDir $s.Name
    [ISpyAssetProcessor]::SliceSpriteCellFrac($sheet2Raw, @($outP), $s.X0, $s.Y0, $s.X1, $s.Y1, 220, 220, $false)
}

$sheet3Raw = Join-Path $rawDir "ispy-objects-sheet-3-raw.jpg"
foreach ($s in $sheet3Specs) {
    $outP = Join-Path $spritesDir $s.Name
    [ISpyAssetProcessor]::SliceSpriteCellFrac($sheet3Raw, @($outP), $s.X0, $s.Y0, $s.X1, $s.Y1, 220, 220, $false)
}

# 3. Run Node deterministic layout generator + invoke [ISpyAssetProcessor]::CompositeBoard for all 4 boards
$nodeBuilder = Join-Path $PSScriptRoot "build_ispy_manifest.mjs"
if (Test-Path $nodeBuilder) {
    & node $nodeBuilder
}

$manifestPath = Join-Path $dataDir "ispyLevels.json"
if (Test-Path $manifestPath) {
    $manifest = Get-Content -Raw -Path $manifestPath | ConvertFrom-Json
    foreach ($board in $manifest.boards) {
        $rawBoardPath = Join-Path $rawDir $board.rawFile
        $outClutterPath = Join-Path $boardsDir $board.boardFile
        $outFullPath = Join-Path $boardsDir $board.fullBoardFile

        $count = $board.placedObjects.Count
        $types = New-Object string[] $count
        $xs = New-Object float[] $count
        $ys = New-Object float[] $count
        $scales = New-Object float[] $count
        $angles = New-Object float[] $count
        $isTargets = New-Object bool[] $count

        for ($i = 0; $i -lt $count; $i++) {
            $obj = $board.placedObjects[$i]
            $types[$i] = [string]$obj.itemType
            $xs[$i] = [float]$obj.texX
            $ys[$i] = [float]$obj.texY
            $scales[$i] = [float]$obj.texScale
            $angles[$i] = [float]$obj.angle
            $isTargets[$i] = [bool]($obj.role -eq "target")
        }

        [ISpyAssetProcessor]::CompositeBoard(
            $rawBoardPath,
            $spritesDir,
            $outClutterPath,
            $outFullPath,
            $types,
            $xs,
            $ys,
            $scales,
            $angles,
            $isTargets
        )
    }
}
