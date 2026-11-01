$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$csharpCode = @'
using System;
using System.Collections.Generic;
using System.IO;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public class P6Pipeline {
    public static void SliceP6Sprite(
        string spriteName,
        string rawPath,
        string outPath,
        double shadowYMinRatio,
        bool clearAllInteriorMagenta,
        int centerHubMode,
        bool bottomAnchor,
        int minIslandPixels,
        double shearSlope
    ) {
        using (Bitmap srcBmp = new Bitmap(rawPath)) {
            srcBmp.SetResolution(96, 96);
            int w = srcBmp.Width;
            int h = srcBmp.Height;
            Bitmap rgbaBmp = new Bitmap(w, h, PixelFormat.Format32bppArgb);
            rgbaBmp.SetResolution(96, 96);
            using (Graphics g = Graphics.FromImage(rgbaBmp)) {
                g.DrawImage(srcBmp, new Rectangle(0, 0, w, h), new Rectangle(0, 0, w, h), GraphicsUnit.Pixel);
            }

            BitmapData bd = rgbaBmp.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
            int stride = bd.Stride;
            byte[] buf = new byte[stride * h];
            Marshal.Copy(bd.Scan0, buf, 0, buf.Length);

            bool[] isShadow = new bool[w * h];
            if (shadowYMinRatio > 0.0) {
                int shadowYMin = (int)(h * shadowYMinRatio);
                for (int y = shadowYMin; y < h - 8; y++) {
                    int row = y * stride;
                    for (int x = 10; x < w - 10; x++) {
                        int idx = row + x * 4;
                        int b = buf[idx];
                        int g = buf[idx + 1];
                        int r = buf[idx + 2];
                        if (r >= 105 && r <= 214 && g <= 64 && b >= 115 && b <= 222 && (r + b) > g * 4) {
                            isShadow[y * w + x] = true;
                        }
                    }
                }
            }

            bool[] isBg = new bool[w * h];
            Queue<int> q = new Queue<int>();

            // Seed outer borders
            for (int x = 0; x < w; x++) {
                isBg[x] = true; q.Enqueue(x);
                int bot = (h - 1) * w + x;
                isBg[bot] = true; q.Enqueue(bot);
            }
            for (int y = 0; y < h; y++) {
                int left = y * w;
                int right = y * w + (w - 1);
                if (!isBg[left]) { isBg[left] = true; q.Enqueue(left); }
                if (!isBg[right]) { isBg[right] = true; q.Enqueue(right); }
            }

            // Seed interior #FF00FF pockets
            for (int y = 0; y < h; y++) {
                int row = y * stride;
                for (int x = 0; x < w; x++) {
                    int pIdx = y * w + x;
                    if (isBg[pIdx] || isShadow[pIdx]) continue;
                    int idx = row + x * 4;
                    int b = buf[idx];
                    int g = buf[idx + 1];
                    int r = buf[idx + 2];

                    bool seedPocket = false;
                    if (r > 204 && g < 48 && b > 198 && Math.Abs(r - b) < 35) {
                        seedPocket = true;
                    } else if (spriteName == "p6-family" && y < (int)(h * 0.62) && r > 180 && g < 65 && b > 170 && (r + b) > g * 4) {
                        seedPocket = true;
                    } else if (spriteName == "p6-window-cat" && y > (int)(h * 0.45) && r > 165 && g < 75 && b > 155 && Math.Abs(r - b) < 35) {
                        seedPocket = true;
                    } else if ((spriteName == "p6-chimney-stork" || spriteName == "p6-dutch-door" || spriteName == "p6-clogs-doggie") &&
                               r > 155 && g < 85 && b > 145 && (r + b) > g * 3) {
                        seedPocket = true;
                    } else if (clearAllInteriorMagenta) {
                        if (r > g + 22 && b > g + 20 && g < 145 && (r + b) > g * 2 + 55) {
                            seedPocket = true;
                        }
                    }

                    if (seedPocket) {
                        isBg[pIdx] = true;
                        q.Enqueue(pIdx);
                    }
                }
            }

            int[] dx4 = new int[] { -1, 1, 0, 0 };
            int[] dy4 = new int[] { 0, 0, -1, 1 };

            while (q.Count > 0) {
                int cur = q.Dequeue();
                int cx = cur % w;
                int cy = cur / w;

                for (int k = 0; k < 4; k++) {
                    int nx = cx + dx4[k];
                    int ny = cy + dy4[k];
                    if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
                    int nPos = ny * w + nx;
                    if (isBg[nPos] || isShadow[nPos]) continue;

                    int idx = ny * stride + nx * 4;
                    int b = buf[idx];
                    int g = buf[idx + 1];
                    int r = buf[idx + 2];

                    bool matchBg = (r > 150 && g < 90 && b > 140 && (r + b) > g * 3);
                    if (!matchBg && clearAllInteriorMagenta) {
                        matchBg = (r > g + 20 && b > g + 18 && g < 150 && (r + b) > g * 2 + 45);
                    }
                    if (matchBg) {
                        isBg[nPos] = true;
                        q.Enqueue(nPos);
                    }
                }
            }

            // Apply background alpha=0 and soft dark ground shadow (R=30, G=25, B=35, alpha=110)
            for (int y = 0; y < h; y++) {
                int row = y * stride;
                for (int x = 0; x < w; x++) {
                    int pIdx = y * w + x;
                    int idx = row + x * 4;
                    if (isBg[pIdx]) {
                        buf[idx] = buf[idx + 1] = buf[idx + 2] = buf[idx + 3] = 0;
                    } else if (isShadow[pIdx]) {
                        buf[idx] = 35;      // B
                        buf[idx + 1] = 25;  // G
                        buf[idx + 2] = 30;  // R
                        buf[idx + 3] = 110; // Alpha
                    }
                }
            }

            // For p6-chimney-stork: remove the redundant stepped brick pyramid below the twig nest (y >= 0.695 * h)
            if (spriteName == "p6-chimney-stork") {
                int brickCutY = (int)(h * 0.695);
                for (int y = brickCutY; y < h; y++) {
                    int row = y * stride;
                    for (int x = 0; x < w; x++) {
                        int idx = row + x * 4;
                        if (buf[idx + 3] == 0) continue;
                        int b = buf[idx];
                        int g = buf[idx + 1];
                        int r = buf[idx + 2];
                        bool isGreenLeaf = (g > r - 8 && g > b + 12 && y < (int)(h * 0.785));
                        if (!isGreenLeaf && y >= (int)(h * 0.708)) {
                            buf[idx] = buf[idx + 1] = buf[idx + 2] = buf[idx + 3] = 0;
                        } else if (!isGreenLeaf && r > 125 && r > g + 28) {
                            buf[idx] = buf[idx + 1] = buf[idx + 2] = buf[idx + 3] = 0;
                        }
                    }
                }
            }

            // De-spill on the 2px perimeter touching alpha == 0
            for (int pass = 0; pass < 2; pass++) {
                bool[] touchesZero = new bool[w * h];
                for (int y = 0; y < h; y++) {
                    int row = y * stride;
                    for (int x = 0; x < w; x++) {
                        if (buf[row + x * 4 + 3] == 0 || isShadow[y * w + x]) continue;
                        for (int k = 0; k < 4; k++) {
                            int nx = x + dx4[k];
                            int ny = y + dy4[k];
                            if (nx < 0 || nx >= w || ny < 0 || ny >= h || buf[ny * stride + nx * 4 + 3] == 0) {
                                touchesZero[y * w + x] = true;
                                break;
                            }
                        }
                    }
                }

                for (int y = 0; y < h; y++) {
                    int row = y * stride;
                    for (int x = 0; x < w; x++) {
                        if (!touchesZero[y * w + x]) continue;
                        int idx = row + x * 4;
                        int b = buf[idx];
                        int g = buf[idx + 1];
                        int r = buf[idx + 2];

                        if (g < 80 && (r > g + 30 || b > g + 30)) {
                            if ((r + b) > 150 && g < 55 && r > g + 35 && b > g + 30) {
                                buf[idx] = buf[idx + 1] = buf[idx + 2] = buf[idx + 3] = 0;
                            } else {
                                buf[idx] = (byte)g;
                                buf[idx + 2] = (byte)g;
                            }
                        } else if (b > g + 16 && r > g + 16) {
                            if (g > 110) {
                                byte neutral = (byte)Math.Min(255, Math.Max(g + 35, (r + g + b) / 3));
                                buf[idx] = neutral;
                                buf[idx + 1] = neutral;
                                buf[idx + 2] = neutral;
                            } else {
                                buf[idx] = (byte)g;
                                buf[idx + 2] = (byte)g;
                            }
                        }
                    }
                }
            }

            if (clearAllInteriorMagenta) {
                for (int y = 0; y < h; y++) {
                    int row = y * stride;
                    for (int x = 0; x < w; x++) {
                        int idx = row + x * 4;
                        if (buf[idx + 3] == 0) continue;
                        int b = buf[idx];
                        int g = buf[idx + 1];
                        int r = buf[idx + 2];
                        if (r > g + 14 && b > g + 14) {
                            byte neutral = (byte)Math.Min(255, (r + g + b) / 3);
                            buf[idx] = neutral;
                            buf[idx + 1] = neutral;
                            buf[idx + 2] = neutral;
                        }
                    }
                }
            }

            int numFrames = 3;
            int target1 = w / 3;
            int target2 = (2 * w) / 3;
            int split1 = target1;
            int bestCost1 = int.MaxValue;
            for (int x = (int)(w * 0.28); x <= (int)(w * 0.39); x++) {
                int fgCount = 0;
                for (int y = 4; y < h - 4; y++) {
                    if (buf[y * stride + x * 4 + 3] > 20) fgCount++;
                }
                int cost = fgCount * 1000 + Math.Abs(x - target1);
                if (cost < bestCost1) { bestCost1 = cost; split1 = x; }
            }

            int split2 = target2;
            int bestCost2 = int.MaxValue;
            for (int x = (int)(w * 0.61); x <= (int)(w * 0.72); x++) {
                int fgCount = 0;
                for (int y = 4; y < h - 4; y++) {
                    if (buf[y * stride + x * 4 + 3] > 20) fgCount++;
                }
                int cost = fgCount * 1000 + Math.Abs(x - target2);
                if (cost < bestCost2) { bestCost2 = cost; split2 = x; }
            }

            int[] colStarts = new int[] { 0, split1, split2 };
            int[] colEnds = new int[] { split1, split2, w };

            Rectangle[] boxes = new Rectangle[numFrames];
            PointF[] hubs = new PointF[numFrames];
            int maxFw = 16;
            int maxFh = 16;
            int[] compId = new int[w * h];
            Dictionary<int, int> compSize = new Dictionary<int, int>();

            for (int f = 0; f < numFrames; f++) {
                int x0 = colStarts[f] + 2;
                int x1 = colEnds[f] - 2;
                int y0 = 4;
                int y1 = h - 4;

                int curLabel = f * 100000 + 1;
                Queue<int> cq = new Queue<int>();

                for (int y = y0; y < y1; y++) {
                    for (int x = x0; x < x1; x++) {
                        int pos = y * w + x;
                        if (compId[pos] != 0 || buf[y * stride + x * 4 + 3] <= 20) continue;

                        int label = curLabel++;
                        int count = 0;
                        compId[pos] = label;
                        cq.Enqueue(pos);

                        while (cq.Count > 0) {
                            int cur = cq.Dequeue();
                            count++;
                            int cx = cur % w;
                            int cy = cur / w;
                            for (int dy = -1; dy <= 1; dy++) {
                                int ny = cy + dy;
                                if (ny < y0 || ny >= y1) continue;
                                for (int dx = -1; dx <= 1; dx++) {
                                    int nx = cx + dx;
                                    if (nx < x0 || nx >= x1) continue;
                                    int nPos = ny * w + nx;
                                    if (compId[nPos] == 0 && buf[ny * stride + nx * 4 + 3] > 20) {
                                        compId[nPos] = label;
                                        cq.Enqueue(nPos);
                                    }
                                }
                            }
                        }
                        compSize[label] = count;
                    }
                }

                int minX = x1, maxX = x0, minY = y1, maxY = y0;
                bool found = false;

                for (int y = y0; y < y1; y++) {
                    int row = y * stride;
                    for (int x = x0; x < x1; x++) {
                        int pos = y * w + x;
                        int idx = row + x * 4;
                        int lbl = compId[pos];
                        if (lbl != 0 && compSize.ContainsKey(lbl) && compSize[lbl] >= minIslandPixels) {
                            found = true;
                            if (x < minX) minX = x;
                            if (x > maxX) maxX = x;
                            if (y < minY) minY = y;
                            if (y > maxY) maxY = y;
                        } else {
                            buf[idx] = buf[idx + 1] = buf[idx + 2] = buf[idx + 3] = 0;
                        }
                    }
                }

                if (found) {
                    int fw = maxX - minX + 1;
                    int fh = maxY - minY + 1;
                    boxes[f] = new Rectangle(minX, minY, fw, fh);
                    if (fw > maxFw) maxFw = fw;
                    if (fh > maxFh) maxFh = fh;

                    if (centerHubMode == 1) {
                        double sumX = 0, sumY = 0; int cnt = 0;
                        int midX = (minX + maxX) / 2;
                        int midY = (minY + maxY) / 2;
                        for (int y = midY - 35; y <= midY + 35; y++) {
                            if (y < minY || y > maxY) continue;
                            for (int x = midX - 35; x <= midX + 35; x++) {
                                if (x < minX || x > maxX) continue;
                                int idx = y * stride + x * 4;
                                if (buf[idx + 3] > 200 && buf[idx] < 140 && buf[idx + 1] < 140 && buf[idx + 2] < 140) {
                                    sumX += x; sumY += y; cnt++;
                                }
                            }
                        }
                        hubs[f] = (cnt > 10) ? new PointF((float)(sumX / cnt), (float)(sumY / cnt)) : new PointF(midX, midY);
                    } else if (centerHubMode == 2) {
                        hubs[f] = new PointF((minX + maxX) / 2.0f, maxY - (boxes[0].Height / 2.0f));
                    } else {
                        hubs[f] = new PointF(minX + fw / 2.0f, minY + fh / 2.0f);
                    }
                } else {
                    boxes[f] = new Rectangle(x0, y0, x1 - x0, h - 8);
                    hubs[f] = new PointF((x0 + x1) / 2.0f, h / 2.0f);
                }
            }

            Marshal.Copy(buf, 0, bd.Scan0, buf.Length);
            rgbaBmp.UnlockBits(bd);

            int shearPadY = (int)Math.Ceiling(Math.Abs(shearSlope) * (maxFw / 2.0)) + 4;
            int padX = 8;
            int padY = 8 + shearPadY;
            int cellW = maxFw + padX * 2;
            int cellH = maxFh + padY * 2;
            if (centerHubMode > 0) {
                cellW += 16;
                cellH += 16;
            }
            if (cellW % 2 == 1) cellW++;
            if (cellH % 2 == 1) cellH++;

            using (Bitmap sheet = new Bitmap(cellW * numFrames, cellH, PixelFormat.Format32bppArgb)) {
                sheet.SetResolution(96, 96);
                using (Graphics gs = Graphics.FromImage(sheet)) {
                    gs.Clear(Color.FromArgb(0, 0, 0, 0));
                    for (int f = 0; f < numFrames; f++) {
                        Rectangle b = boxes[f];
                        int dstX, dstY;
                        if (centerHubMode > 0) {
                            float relHubX = hubs[f].X - b.X;
                            float relHubY = hubs[f].Y - b.Y;
                            dstX = f * cellW + (int)Math.Round(cellW / 2.0f - relHubX);
                            dstY = (int)Math.Round(cellH / 2.0f - relHubY);
                        } else if (spriteName == "p6-dutch-door") {
                            dstX = f * cellW + padX;
                            dstY = bottomAnchor ? (cellH - padY - b.Height) : ((cellH - b.Height) / 2);
                        } else {
                            dstX = f * cellW + (cellW - b.Width) / 2;
                            dstY = bottomAnchor ? (cellH - padY - b.Height) : ((cellH - b.Height) / 2);
                        }

                        if (Math.Abs(shearSlope) < 0.001) {
                            gs.DrawImage(rgbaBmp, new Rectangle(dstX, dstY, b.Width, b.Height), b, GraphicsUnit.Pixel);
                        } else {
                            using (Bitmap frameBmp = new Bitmap(b.Width, b.Height, PixelFormat.Format32bppArgb)) {
                                frameBmp.SetResolution(96, 96);
                                using (Graphics gf = Graphics.FromImage(frameBmp)) {
                                    gf.DrawImage(rgbaBmp, new Rectangle(0, 0, b.Width, b.Height), b, GraphicsUnit.Pixel);
                                }
                                double halfW = b.Width / 2.0;
                                for (int col = 0; col < b.Width; col++) {
                                    int dy = (int)Math.Round(shearSlope * (col - halfW));
                                    gs.DrawImage(
                                        frameBmp,
                                        new Rectangle(dstX + col, dstY + dy, 1, b.Height),
                                        new Rectangle(col, 0, 1, b.Height),
                                        GraphicsUnit.Pixel
                                    );
                                }
                            }
                        }
                    }
                }
                sheet.Save(outPath, ImageFormat.Png);
            }
            rgbaBmp.Dispose();
            Console.WriteLine(string.Format("  [sprite] {0} -> frameWidth: {1}, frameHeight: {2}, sheet: {3}x{4}",
                Path.GetFileName(outPath), cellW, cellH, cellW * numFrames, cellH));
        }
    }

    public static void RenderCompositePreview(string bgCleanPath, string outPreviewPath) {
        using (Bitmap rawBg = new Bitmap(bgCleanPath))
        using (Bitmap canvas = new Bitmap(1280, 720, PixelFormat.Format32bppArgb)) {
            rawBg.SetResolution(96, 96);
            canvas.SetResolution(96, 96);
            using (Graphics g = Graphics.FromImage(canvas)) {
                g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.NearestNeighbor;
                g.PixelOffsetMode = System.Drawing.Drawing2D.PixelOffsetMode.Half;
                g.DrawImage(rawBg, new Rectangle(0, 0, 1280, 720), new Rectangle(0, 0, rawBg.Width, rawBg.Height), GraphicsUnit.Pixel);

                Action<string, double, double, double, double> drawSpriteXY = (path, cx, cy, scaleX, scaleY) => {
                    using (Bitmap sheet = new Bitmap(path)) {
                        sheet.SetResolution(96, 96);
                        int fw = sheet.Width / 3;
                        int fh = sheet.Height;
                        int dw = (int)Math.Round(fw * scaleX);
                        int dh = (int)Math.Round(fh * scaleY);
                        int dx = (int)Math.Round(cx - dw / 2.0);
                        int dy = (int)Math.Round(cy - dh / 2.0);
                        g.DrawImage(sheet, new Rectangle(dx, dy, dw, dh), new Rectangle(0, 0, fw, fh), GraphicsUnit.Pixel);
                    }
                };

                // 3. p6-ferris-wheel (depth 6): centered on distant blue A-frame legs (~55x55px) at (526, 368)
                drawSpriteXY("public/assets/stories/nana/sprites/p6-ferris-wheel.png", 526, 368, 0.155, 0.155);

                // 2. p6-windmill-sails (depth 8): hub centered on left windmill tower at (335, 319)
                drawSpriteXY("public/assets/stories/nana/sprites/p6-windmill-sails.png", 335, 319, 0.25, 0.25);

                // 6. p6-chimney-stork (depth 10): perched atop 1613 stepped brick gable peak at (989, 62)
                drawSpriteXY("public/assets/stories/nana/sprites/p6-chimney-stork.png", 989, 62, 0.24, 0.24);

                // 5. p6-dutch-door (depth 12): aligned over recessed blue door under 1613 at (980, 402)
                drawSpriteXY("public/assets/stories/nana/sprites/p6-dutch-door.png", 980, 402, 0.20, 0.37);

                // 9. p6-window-cat (depth 14): seated inside open right cottage window at (1128, 390)
                drawSpriteXY("public/assets/stories/nana/sprites/p6-window-cat.png", 1128, 390, 0.20, 0.20);

                // 7. p6-sparky-planter (depth 18): tucked into right brick flower planter at (885, 485)
                drawSpriteXY("public/assets/stories/nana/sprites/p6-sparky-planter.png", 885, 485, 0.24, 0.24);

                // 8. p6-butterflies (depth 20): hovering over left flowerbeds at (225, 435)
                drawSpriteXY("public/assets/stories/nana/sprites/p6-butterflies.png", 225, 435, 0.30, 0.30);

                // 4. p6-clogs-doggie (depth 22): on right sidewalk near planter at (935, 575)
                drawSpriteXY("public/assets/stories/nana/sprites/p6-clogs-doggie.png", 935, 575, 0.28, 0.28);

                // 1. p6-family (depth 25): brick lane at (545, 555)
                drawSpriteXY("public/assets/stories/nana/sprites/p6-family.png", 545, 555, 0.85, 0.85);
            }
            canvas.Save(outPreviewPath, ImageFormat.Jpeg);
        }
    }
}
'@

Add-Type -TypeDefinition $csharpCode -ReferencedAssemblies System.Drawing

[P6Pipeline]::SliceP6Sprite("p6-dutch-door", "public/assets/stories/nana/raw/p6-dutch-door-raw.jpg", "public/assets/stories/nana/sprites/p6-dutch-door.png", 0.0, $false, 0, $true, 2, 0.14)
[P6Pipeline]::RenderCompositePreview("public/assets/stories/nana/p6-bg-clean.jpg", "C:\Users\RobaD\.gemini/antigravity/brain/c157efef-ad7b-472f-a591-d3f1aea5976b/p6_comp_preview3.jpg")

$audioCode = @'
using System;
using System.Collections.Generic;
using System.IO;

public class P6AudioSync {
    private static readonly int[] BITRATES_V1_L3 = { 0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0 };
    private static readonly int[] BITRATES_V2_L3 = { 0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0 };
    private static readonly int[] SAMPLERATES_V1 = { 44100, 48000, 32000, 0 };
    private static readonly int[] SAMPLERATES_V2 = { 22050, 24000, 16000, 0 };
    private static readonly int[] SAMPLERATES_V25 = { 11025, 12000, 8000, 0 };

    private static int ReadBits(byte[] buf, int bitOffset, int numBits) {
        int val = 0;
        for (int i = 0; i < numBits; i++) {
            int byteIdx = (bitOffset + i) >> 3;
            int bitIdx = 7 - ((bitOffset + i) & 7);
            if (byteIdx < buf.Length) {
                val = (val << 1) | ((buf[byteIdx] >> bitIdx) & 1);
            }
        }
        return val;
    }

    public static void AnalyzeAndTrim(string audioDir) {
        string[] p6Files = {
            "p6-narration.mp3",
            "sfx-family-skip.mp3",
            "sfx-clogs-klomp.mp3",
            "sfx-windmill-whoosh.mp3",
            "sfx-ferris-carnival.mp3",
            "sfx-dutch-door-cuckoo.mp3",
            "sfx-chimney-stork.mp3",
            "sfx-sparky-tulip.mp3",
            "sfx-butterflies-magic.mp3",
            "sfx-window-cat-meow.mp3"
        };

        foreach (string fname in p6Files) {
            string path = Path.Combine(audioDir, fname);
            if (!File.Exists(path)) {
                Console.WriteLine("  [audio] MISSING: " + fname);
                continue;
            }
            byte[] buf = File.ReadAllBytes(path);
            int offset = 0;
            if (buf.Length >= 10 && buf[0] == 'I' && buf[1] == 'D' && buf[2] == '3') {
                int size = ((buf[6] & 0x7F) << 21) | ((buf[7] & 0x7F) << 14) | ((buf[8] & 0x7F) << 7) | (buf[9] & 0x7F);
                offset = 10 + size;
            }

            List<int> frameOffsets = new List<int>();
            List<double> frameTimes = new List<double>();
            List<int> frameGains = new List<int>();
            List<int> frameMdb = new List<int>();
            double curMs = 0.0;
            double lastDur = 26.12;

            while (offset + 4 <= buf.Length) {
                if (buf[offset] != 0xFF || (buf[offset + 1] & 0xE0) != 0xE0) {
                    offset++;
                    continue;
                }
                int b1 = buf[offset + 1], b2 = buf[offset + 2], b3 = buf[offset + 3];
                int ver = (b1 >> 3) & 0x03;
                int layer = (b1 >> 1) & 0x03;
                bool crc = (b1 & 0x01) == 0;
                int brIdx = (b2 >> 4) & 0x0F;
                int srIdx = (b2 >> 2) & 0x03;
                int pad = (b2 >> 1) & 0x01;
                int chMode = (b3 >> 6) & 0x03;

                if (ver == 1 || layer != 1 || brIdx == 0 || brIdx == 15 || srIdx == 3) {
                    offset++;
                    continue;
                }
                bool isMpeg1 = (ver == 3);
                int bitrate = (isMpeg1 ? BITRATES_V1_L3[brIdx] : BITRATES_V2_L3[brIdx]) * 1000;
                int sr = (ver == 3) ? SAMPLERATES_V1[srIdx] : (ver == 2) ? SAMPLERATES_V2[srIdx] : SAMPLERATES_V25[srIdx];
                int spf = isMpeg1 ? 1152 : 576;
                int fsize = (((isMpeg1 ? 144 : 72) * bitrate) / sr) + pad;
                if (fsize < 24 || offset + fsize > buf.Length) break;

                int sideOff = offset + 4 + (crc ? 2 : 0);
                bool isMono = (chMode == 3);
                int nCh = isMono ? 1 : 2;
                int nGr = isMpeg1 ? 2 : 1;
                int mdb = ReadBits(buf, sideOff * 8, isMpeg1 ? 9 : 8);
                int bitPos = sideOff * 8 + (isMpeg1 ? (9 + (isMono ? 5 : 3) + (isMono ? 4 : 8)) : (8 + (isMono ? 1 : 2)));
                int maxGain = 0;
                for (int g = 0; g < nGr; g++) {
                    for (int c = 0; c < nCh; c++) {
                        int p23 = ReadBits(buf, bitPos, 12);
                        int gg = ReadBits(buf, bitPos + 21, 8);
                        if (p23 > 0 && gg > maxGain) maxGain = gg;
                        bitPos += isMpeg1 ? 59 : 63;
                    }
                }
                lastDur = (spf / (double)sr) * 1000.0;
                frameOffsets.Add(offset);
                frameTimes.Add(curMs);
                frameGains.Add(maxGain);
                frameMdb.Add(mdb);
                curMs += lastDur;
                offset += fsize;
            }

            if (fname.StartsWith("sfx-") && frameOffsets.Count > 2) {
                int keep = 0;
                while (keep < frameOffsets.Count - 1 && frameGains[keep] < 130 && frameMdb[keep + 1] == 0) {
                    keep++;
                }
                if (keep > 0) {
                    int startByte = frameOffsets[keep];
                    byte[] trimmed = new byte[buf.Length - startByte];
                    Buffer.BlockCopy(buf, startByte, trimmed, 0, trimmed.Length);
                    File.WriteAllBytes(path, trimmed);
                    Console.WriteLine(string.Format("  [audio] Trimmed {0} silent frames from {1} (total={2:F0}ms)", keep, fname, curMs - keep * lastDur));
                } else {
                    Console.WriteLine(string.Format("  [audio] Verified {0} (0ms start, total={1:F0}ms)", fname, curMs));
                }
            } else if (fname == "p6-narration.mp3") {
                Console.WriteLine(string.Format("  [audio] p6-narration.mp3 total duration = {0:F0}ms ({1} frames)", curMs, frameOffsets.Count));
                // Print pauses/dips (where gain < 145) to locate exact word boundaries
                for (int i = 0; i < frameOffsets.Count; i++) {
                    if (i % 6 == 0) {
                        Console.WriteLine(string.Format("    t={0,4:F0}ms : gain={1}", frameTimes[i], frameGains[i]));
                    }
                }
            }
        }
    }
}
'@
Add-Type -TypeDefinition $audioCode
[P6AudioSync]::AnalyzeAndTrim("public/assets/stories/nana/audio")
