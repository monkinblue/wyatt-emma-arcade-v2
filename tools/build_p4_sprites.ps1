$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$csharpCode = @'
using System;
using System.Collections.Generic;
using System.IO;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public class P4FinalPipeline {
    // 1. Extract Car Cockpit Foreground Occluder (sprites/p4-car-occluder.png) from p4-bg-clean.jpg (scaled to 1280x720)
    // and sprites/p4-shovel-occluder.png (tall right cream cabinet + snow shovel) so Sparky tucks behind the cabinet edge!
    // NOTE: Never modifies or overwrites p4-bg-clean.jpg or any files in raw/.
    public static void ExtractOccludersAndRuler(string bgCleanPath, string carOccPath, string shovelOccPath, string rulerOutPath) {
        using (Bitmap rawBg = new Bitmap(bgCleanPath)) {
            int rw = rawBg.Width;
            int rh = rawBg.Height;

            using (Bitmap bg1280 = new Bitmap(1280, 720, PixelFormat.Format32bppArgb)) {
                using (Graphics g = Graphics.FromImage(bg1280)) {
                    g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.NearestNeighbor;
                    g.PixelOffsetMode = System.Drawing.Drawing2D.PixelOffsetMode.Half;
                    g.DrawImage(rawBg, new Rectangle(0, 0, 1280, 720), new Rectangle(0, 0, rw, rh), GraphicsUnit.Pixel);
                }

                // Save a 1280x720 ruler image of the new p4-bg-clean.jpg to verify exact pixel coordinates
                using (Bitmap rulerBmp = new Bitmap(bg1280))
                using (Graphics gr = Graphics.FromImage(rulerBmp)) {
                    Pen p50 = new Pen(Color.FromArgb(140, 0, 255, 255), 1);
                    Pen p100 = new Pen(Color.FromArgb(210, 255, 255, 0), 1);
                    Font fnt = new Font("Consolas", 9, FontStyle.Bold);
                    for (int x = 0; x <= 1280; x += 50) {
                        gr.DrawLine((x % 100 == 0) ? p100 : p50, x, 0, x, 720);
                        if (x % 100 == 0 && x < 1280) {
                            gr.DrawString(x.ToString(), fnt, Brushes.Yellow, x + 2, 2);
                            gr.DrawString(x.ToString(), fnt, Brushes.Yellow, x + 2, 702);
                        }
                    }
                    for (int y = 0; y <= 720; y += 50) {
                        gr.DrawLine((y % 100 == 0) ? p100 : p50, 0, y, 1280, y);
                        if (y % 100 == 0 && y < 720) {
                            gr.DrawString(y.ToString(), fnt, Brushes.Yellow, 2, y + 2);
                        }
                    }
                    rulerBmp.Save(rulerOutPath, ImageFormat.Jpeg);
                }

                // Extract Car Cockpit Foreground Occluder (45..660, 370..600):
                // Cream MGB side door panel, rear quarter panel, left driver headrest, and windshield post below the cockpit opening
                // (`alpha = 255` on car body, `alpha = 0` inside cockpit/above door line).
                int cropX = 45;
                int cropY = 370;
                int cropW = 615;
                int cropH = 230;

                using (Bitmap occ = new Bitmap(cropW, cropH, PixelFormat.Format32bppArgb)) {
                    for (int y = 0; y < cropH; y++) {
                        int sy = cropY + y;
                        for (int x = 0; x < cropW; x++) {
                            int sx = cropX + x;
                            Color c = bg1280.GetPixel(sx, sy);

                            double carTopY;
                            if (sx < 130) {
                                carTopY = 485.0 - (sx - 45.0) * (40.0 / 85.0);
                            } else if (sx < 255) {
                                carTopY = 445.0 - (sx - 130.0) * (3.0 / 125.0);
                            } else if (sx <= 445) {
                                // Strictly the lower black leather cockpit door rim & cream car body below the headrests (zero headrest pixels!)
                                carTopY = 442.0 + (sx - 255.0) * (16.0 / 190.0);
                            } else if (sx <= 535) {
                                carTopY = 458.0 - (sx - 445.0) * (20.0 / 90.0);
                            } else {
                                carTopY = 438.0;
                            }

                            bool isBrownWallOrTable = (sx < 260 && sy < 462 && c.R < 170 && c.G < 135 && c.B < 105 && c.R > c.B + 15);

                            bool isWindshieldPillar = false;
                            if (sy >= 380 && sy <= 442 && sx >= 502 && sx <= 565) {
                                double pillarCenterX = 508.0 + (sy - 380.0) * (36.0 / 60.0);
                                if (Math.Abs(sx - pillarCenterX) <= 10.0) {
                                    if ((c.R > 150 && c.G > 155 && c.B > 155) || (c.R < 55 && c.G < 55 && c.B < 60)) {
                                        isWindshieldPillar = true;
                                    }
                                }
                            }

                            if ((!isBrownWallOrTable && sy >= (int)Math.Round(carTopY)) || isWindshieldPillar) {
                                occ.SetPixel(x, y, Color.FromArgb(255, c.R, c.G, c.B));
                            } else {
                                occ.SetPixel(x, y, Color.FromArgb(0, 0, 0, 0));
                            }
                        }
                    }
                    occ.Save(carOccPath, ImageFormat.Png);
                }

                // Extract Right Cream Cabinet Foreground Occluder (1022..1245, 298..665)
                // so Sparky (`p4-sparky-cabinet` at depth 11) tucks behind the left vertical edge of the tall right cream cabinet (x: ~1025)!
                int sx0 = 1022, sy0 = 298, sw = 223, sh = 367;
                using (Bitmap socc = new Bitmap(sw, sh, PixelFormat.Format32bppArgb)) {
                    for (int y = 0; y < sh; y++) {
                        int sy = sy0 + y;
                        for (int x = 0; x < sw; x++) {
                            int sx = sx0 + x;
                            Color c = bg1280.GetPixel(sx, sy);
                            double cabTopY = (sx <= 1105)
                                ? (316.0 - (sx - 1022.0) * (16.0 / 83.0))
                                : (300.0 + (sx - 1105.0) * (10.0 / 135.0));
                            if (sy >= (int)Math.Round(cabTopY)) {
                                socc.SetPixel(x, y, Color.FromArgb(255, c.R, c.G, c.B));
                            } else {
                                socc.SetPixel(x, y, Color.FromArgb(0, 0, 0, 0));
                            }
                        }
                    }
                    socc.Save(shovelOccPath, ImageFormat.Png);
                }
            }
        }
        Console.WriteLine("  [occluder] Extracted p4-car-occluder.png & p4-shovel-occluder.png");
    }

    public static void RenderCompositePreview(string bgCleanPath, string outPreviewPath) {
        using (Bitmap rawBg = new Bitmap(bgCleanPath))
        using (Bitmap canvas = new Bitmap(1280, 720, PixelFormat.Format32bppArgb))
        using (Graphics g = Graphics.FromImage(canvas)) {
            g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.NearestNeighbor;
            g.PixelOffsetMode = System.Drawing.Drawing2D.PixelOffsetMode.Half;
            g.DrawImage(rawBg, new Rectangle(0, 0, 1280, 720), new Rectangle(0, 0, rawBg.Width, rawBg.Height), GraphicsUnit.Pixel);

            // Helper to draw Frame 0 of a 3-frame spritesheet centered at (cx, cy) with scale
            Action<string, double, double, double> drawSprite = (path, cx, cy, scale) => {
                using (Bitmap sheet = new Bitmap(path)) {
                    int fw = sheet.Width / 3;
                    int fh = sheet.Height;
                    int dw = (int)Math.Round(fw * scale);
                    int dh = (int)Math.Round(fh * scale);
                    int dx = (int)Math.Round(cx - dw / 2.0);
                    int dy = (int)Math.Round(cy - dh / 2.0);
                    g.DrawImage(sheet, new Rectangle(dx, dy, dw, dh), new Rectangle(0, 0, fw, fh), GraphicsUnit.Pixel);
                }
            };

            // Depth 8: p4-wreath (405, 235)
            drawSprite("public/assets/stories/nana/sprites/p4-wreath.png", 405, 235, 0.205);
            // Depth 10: p4-wall-oven (225 - 4 = 221, 315 - 65 = 250)
            drawSprite("public/assets/stories/nana/sprites/p4-wall-oven.png", 221, 250, 0.296);
            // Depth 10: p4-hutch-items (605 + 11 = 616, 255 - 11 = 244)
            drawSprite("public/assets/stories/nana/sprites/p4-hutch-items.png", 616, 244, 0.132);
            // Depth 11: p4-sparky-cabinet (1015 - 2 = 1013, 420 - 45 = 375)
            drawSprite("public/assets/stories/nana/sprites/p4-sparky-cabinet.png", 1013, 375, 0.24);
            // Depth 12: p4-cardboard-box (hotspot 89, 391 + offset 0, -10 -> 89, 381)
            drawSprite("public/assets/stories/nana/sprites/p4-cardboard-box.png", 89, 381, 0.126);
            // Depth 15: p4-car-doggie (68% of 0.205 = 0.14, positioned at 426, 434 so steering wheel sits at 450, 425 below windshield frame!)
            drawSprite("public/assets/stories/nana/sprites/p4-car-doggie.png", 426, 434, 0.14);
            // Depth 16: p4-shovel-occluder at (1022, 298)
            using (Bitmap socc = new Bitmap("public/assets/stories/nana/sprites/p4-shovel-occluder.png")) {
                g.DrawImage(socc, new Rectangle(1022, 298, socc.Width, socc.Height));
            }
            // Depth 18: p4-compressor (815 + 12 = 827, 545 - 32 = 513)
            drawSprite("public/assets/stories/nana/sprites/p4-compressor.png", 827, 513, 0.35);
            // Depth 20: p4-car-occluder at (45, 370)
            using (Bitmap cocc = new Bitmap("public/assets/stories/nana/sprites/p4-car-occluder.png")) {
                g.DrawImage(cocc, new Rectangle(45, 370, cocc.Width, cocc.Height));
            }
            // Depth 25: p4-leaf-blower (980 - 12 = 968, 615 - 36 = 579)
            drawSprite("public/assets/stories/nana/sprites/p4-leaf-blower.png", 968, 579, 0.60);

            canvas.Save(outPreviewPath, ImageFormat.Jpeg);
        }
        Console.WriteLine("  [preview] Saved composite preview to " + outPreviewPath);
    }

    // 2. Exact Slicer for `p4-car-doggie-raw.png`:
    // Uses `p4-bg.jpg` (the exact underlying garage image) + magenta halo detection ONLY from the outer boundary
    // so the interior of Doggie and the steering wheel are 100% preserved!
    // Specifically:
    // - A pixel is candidate background (`canBeBg`) if it is either:
    //   a) Identical to the underlying garage background (`diff < 46` against `p4-bg.jpg`), OR
    //   b) Part of the magenta/pink airbrushed glow (`B > G + 18` and `R > G + 24`).
    // - We flood-fill `isBg` starting ONLY from the outer border of each frame (and the centers of the 3 steering wheel cutouts)
    //   through `canBeBg` pixels! Because `isBg` only spreads through `canBeBg` from the outside, any interior pixel of Doggie
    //   that happens to have `diff < 46` is NEVER reached because Doggie's black outline (`diff > 150`) blocks the flood-fill!
    public static void SliceCarDoggie(string rawPath, string refBgPath, string outPath, bool flipEachFrame) {
        using (Bitmap srcBmp = new Bitmap(rawPath))
        using (Bitmap refBmp = new Bitmap(refBgPath)) {
            int w = srcBmp.Width;
            int h = srcBmp.Height;
            Bitmap rgbaBmp = new Bitmap(w, h, PixelFormat.Format32bppArgb);
            using (Graphics g = Graphics.FromImage(rgbaBmp)) {
                g.DrawImage(srcBmp, new Rectangle(0, 0, w, h), new Rectangle(0, 0, w, h), GraphicsUnit.Pixel);
            }
            Bitmap refScaled = new Bitmap(w, h, PixelFormat.Format32bppArgb);
            using (Graphics g = Graphics.FromImage(refScaled)) {
                g.DrawImage(refBmp, new Rectangle(0, 0, w, h), new Rectangle(0, 0, refBmp.Width, refBmp.Height), GraphicsUnit.Pixel);
            }

            BitmapData bd = rgbaBmp.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
            BitmapData rbd = refScaled.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
            int stride = bd.Stride;
            byte[] buf = new byte[stride * h];
            byte[] rbuf = new byte[stride * h];
            Marshal.Copy(bd.Scan0, buf, 0, buf.Length);
            Marshal.Copy(rbd.Scan0, rbuf, 0, rbuf.Length);
            refScaled.UnlockBits(rbd);
            refScaled.Dispose();

            int yMinValid = (int)(h * 0.255);
            int yMaxValid = (int)(h * 0.738);

            bool[] canBeBg = new bool[w * h];
            bool[] isBg = new bool[w * h];
            Queue<int> q = new Queue<int>();

            for (int y = 0; y < h; y++) {
                int row = y * stride;
                for (int x = 0; x < w; x++) {
                    int pIdx = y * w + x;
                    int idx = row + x * 4;
                    int b = buf[idx];
                    int g = buf[idx + 1];
                    int r = buf[idx + 2];

                    int rb = rbuf[idx];
                    int rg = rbuf[idx + 1];
                    int rr = rbuf[idx + 2];

                    // Minimum error against p4-bg.jpg blended with #FF00FF magenta airbrush at alpha a in [0..1]
                    int minBlendErr = 9999;
                    for (int ai = 0; ai <= 20; ai++) {
                        double a = ai * 0.05;
                        int pr = (int)((1.0 - a) * rr + a * 250.0);
                        int pg = (int)((1.0 - a) * rg);
                        int pb = (int)((1.0 - a) * rb + a * 240.0);
                        int err = Math.Abs(r - pr) + Math.Abs(g - pg) + Math.Abs(b - pb);
                        if (err < minBlendErr) minBlendErr = err;
                    }

                    bool isMagentaOrPink = (r > 145 && g < 95 && b > 135 && (r + b) > g * 3) ||
                                           (b > g + 14 && r > g + 18) ||
                                           (r > 155 && b > 125 && g < 115 && (r + b) > g * 2 + 60);

                    // Protect steering wheel dark neutral grey/black in the wheel regions of Frames 0, 1, 2
                    bool inWheelZone = (y >= (int)(h * 0.265) && y <= (int)(h * 0.59)) &&
                                       ((x >= (int)(w * 0.175) && x <= (int)(w * 0.342)) ||
                                        (x >= (int)(w * 0.502) && x <= (int)(w * 0.668)) ||
                                        (x >= (int)(w * 0.822) && x <= (int)(w * 0.982)));
                    bool isWheelNeutral = inWheelZone && !isMagentaOrPink &&
                                          (r < 165 && g < 165 && b < 172 && Math.Abs(r - g) <= 18 && Math.Abs(g - b) <= 22 && b <= g + 14);

                    // Explicit background pockets where paper towels/green bag (Frame 0), hutch (Frame 1), or shovel (Frame 2) sit above Doggie
                    bool inPaperTowelsBox = (x >= (int)(w * 0.125) && x <= (int)(w * 0.196) && y < (int)(h * 0.345) && !(x < (int)(w * 0.165) && y >= (int)(h * 0.312))) ||
                                            (x >= (int)(w * 0.304) && x <= (int)(w * 0.335) && y >= (int)(h * 0.32) && y <= (int)(h * 0.39));
                    bool inHutchGap = (x >= (int)(w * 0.425) && x <= (int)(w * 0.485) && y < (int)(h * 0.258)) ||
                                      (x >= (int)(w * 0.485) && x <= (int)(w * 0.512) && y < (int)(h * 0.278)) ||
                                      (x >= (int)(w * 0.512) && x <= (int)(w * 0.535) && y < (int)(h * 0.335)) ||
                                      (x >= (int)(w * 0.512) && x <= (int)(w * 0.562) && y >= (int)(h * 0.335) && y <= (int)(h * 0.380) && g > r) ||
                                      (x >= (int)(w * 0.365) && x <= (int)(w * 0.415) && y >= (int)(h * 0.355) && y <= (int)(h * 0.445));
                    bool inShovelTop = (x >= (int)(w * 0.70) && x <= (int)(w * 0.83) && y < (int)(h * 0.298));

                    if (!isWheelNeutral && (minBlendErr < 50 || isMagentaOrPink || inPaperTowelsBox || inHutchGap || inShovelTop)) {
                        canBeBg[pIdx] = true;
                    }

                    // Seed outer borders, outside vertical band, background pockets, or pure #FF00FF magenta
                    if (y < yMinValid || y > yMaxValid || x < 18 || x >= w - 18 ||
                        inPaperTowelsBox || inHutchGap || inShovelTop ||
                        (r > 165 && g < 75 && b > 155 && (r - g) > 90 && (b - g) > 80)) {
                        isBg[pIdx] = true;
                        q.Enqueue(pIdx);
                    }
                }
            }

            // Also seed the vertical split gutters between Frame 0|1 (x = 0.348w) and Frame 1|2 (x = 0.675w),
            // AND the interior cutout holes of the 3 steering wheels!
            int[] seedCols = new int[] { (int)(w * 0.348), (int)(w * 0.675) };
            foreach (int sc in seedCols) {
                for (int y = yMinValid; y <= yMaxValid; y++) {
                    int pIdx = y * w + sc;
                    if (canBeBg[pIdx] && !isBg[pIdx]) {
                        isBg[pIdx] = true;
                        q.Enqueue(pIdx);
                    }
                }
            }
            // Steering wheel cutout holes (top, left, bottom, right quadrants inside each wheel rim)
            double[] wheelRelX = new double[] { 0.215, 0.255, 0.275, 0.555, 0.595, 0.610, 0.865, 0.900, 0.915 };
            double[] wheelRelY = new double[] { 0.34, 0.40, 0.48, 0.52 };
            foreach (double rx in wheelRelX) {
                foreach (double ry in wheelRelY) {
                    int wx = (int)(w * rx);
                    int wy = (int)(h * ry);
                    int pIdx = wy * w + wx;
                    if (canBeBg[pIdx] && !isBg[pIdx]) {
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
                    if (isBg[nPos] || !canBeBg[nPos]) continue;

                    isBg[nPos] = true;
                    q.Enqueue(nPos);
                }
            }

            for (int y = 0; y < h; y++) {
                int row = y * stride;
                for (int x = 0; x < w; x++) {
                    if (isBg[y * w + x]) {
                        int idx = row + x * 4;
                        buf[idx] = buf[idx + 1] = buf[idx + 2] = buf[idx + 3] = 0;
                    }
                }
            }

            // Now fill any tiny internal holes inside Doggie or the Steering Wheel that might have been seeded,
            // and keep ONLY the single largest connected component (Doggie + Steering Wheel) in each frame
            // (plus the green musical note in Frame 2)!
            int[] splitCols = new int[] { 0, (int)(w * 0.348), (int)(w * 0.675), w };
            int[] compId = new int[w * h];
            Dictionary<int, int> compSize = new Dictionary<int, int>();

            for (int f = 0; f < 3; f++) {
                int x0 = splitCols[f];
                int x1 = splitCols[f + 1];
                int curLabel = (f + 1) * 100000;
                int bestLabel = -1;
                int bestCount = 0;
                Queue<int> cq = new Queue<int>();

                for (int y = 0; y < h; y++) {
                    for (int x = x0; x < x1; x++) {
                        int pos = y * w + x;
                        if (compId[pos] != 0 || buf[y * stride + x * 4 + 3] == 0) continue;
                        int label = ++curLabel;
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
                                if (ny < 0 || ny >= h) continue;
                                for (int dx = -1; dx <= 1; dx++) {
                                    int nx = cx + dx;
                                    if (nx < x0 || nx >= x1) continue;
                                    int nPos = ny * w + nx;
                                    if (compId[nPos] == 0 && buf[ny * stride + nx * 4 + 3] > 0) {
                                        compId[nPos] = label;
                                        cq.Enqueue(nPos);
                                    }
                                }
                            }
                        }
                        compSize[label] = count;
                        if (count > bestCount) {
                            bestCount = count;
                            bestLabel = label;
                        }
                    }
                }

                for (int y = 0; y < h; y++) {
                    int row = y * stride;
                    for (int x = x0; x < x1; x++) {
                        int lbl = compId[y * w + x];
                        bool keep = (lbl == bestLabel);
                        if (!keep && f == 2 && lbl != 0 && compSize.ContainsKey(lbl) && compSize[lbl] >= 450 && y < (int)(h * 0.38) && x > (int)(w * 0.84)) {
                            int idx2 = row + x * 4;
                            if (buf[idx2 + 1] > 175) keep = true;
                        }
                        if (!keep) {
                            int idx = row + x * 4;
                            buf[idx] = buf[idx + 1] = buf[idx + 2] = buf[idx + 3] = 0;
                        }
                    }
                }
            }

            CleanupBorderAndSlice(rgbaBmp, bd, buf, w, h, stride, outPath, true, false, flipEachFrame, 0.0, 25);
        }
    }

    // 3. Standard Outer-Border BFS Flood-Fill Slicer for the 7 #FF00FF Sprite Strips
    public static void SliceSpriteBfs(string rawPath, string outPath, bool bottomAnchor, bool rightAnchor, bool flipEachFrame, double shearSlope) {
        using (Bitmap srcBmp = new Bitmap(rawPath)) {
            int w = srcBmp.Width;
            int h = srcBmp.Height;
            Bitmap rgbaBmp = new Bitmap(w, h, PixelFormat.Format32bppArgb);
            using (Graphics g = Graphics.FromImage(rgbaBmp)) {
                g.DrawImage(srcBmp, new Rectangle(0, 0, w, h), new Rectangle(0, 0, w, h), GraphicsUnit.Pixel);
            }

            BitmapData bd = rgbaBmp.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
            int stride = bd.Stride;
            byte[] buf = new byte[stride * h];
            Marshal.Copy(bd.Scan0, buf, 0, buf.Length);

            bool[] isBg = new bool[w * h];
            Queue<int> q = new Queue<int>();

            // Seed outer borders of the entire image
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

            // Seed pure #FF00FF interior holes (wreath center hole, jug handle hole, compressor handle hole)
            // without ever seeding pink flowers (which have G >= 25 or B <= 220)!
            for (int y = 0; y < h; y++) {
                int row = y * stride;
                for (int x = 0; x < w; x++) {
                    int pIdx = y * w + x;
                    if (isBg[pIdx]) continue;
                    int idx = row + x * 4;
                    int b = buf[idx];
                    int g = buf[idx + 1];
                    int r = buf[idx + 2];
                    if (r > 240 && g < 18 && b > 240) {
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
                    if (isBg[nPos]) continue;

                    int idx = ny * stride + nx * 4;
                    int b = buf[idx];
                    int g = buf[idx + 1];
                    int r = buf[idx + 2];

                    // Exact chroma-key rule: R > 150, G < 90, B > 140 and R + B > G * 3 -> alpha = 0
                    if (r > 150 && g < 90 && b > 140 && (r + b) > g * 3) {
                        isBg[nPos] = true;
                        q.Enqueue(nPos);
                    }
                }
            }

            for (int y = 0; y < h; y++) {
                int row = y * stride;
                for (int x = 0; x < w; x++) {
                    if (isBg[y * w + x]) {
                        int idx = row + x * 4;
                        buf[idx] = buf[idx + 1] = buf[idx + 2] = buf[idx + 3] = 0;
                    }
                }
            }

            CleanupBorderAndSlice(rgbaBmp, bd, buf, w, h, stride, outPath, bottomAnchor, rightAnchor, flipEachFrame, shearSlope, 25);
        }
    }

    private static void CleanupBorderAndSlice(Bitmap rgbaBmp, BitmapData bd, byte[] buf, int w, int h, int stride, string outPath, bool bottomAnchor, bool rightAnchor, bool flipEachFrame, double shearSlope, int minIslandPixels) {
        int[] dx4 = new int[] { -1, 1, 0, 0 };
        int[] dy4 = new int[] { 0, 0, -1, 1 };

        // On the 2px perimeter touching alpha == 0, clamp dark magenta/maroon fringe
        // (G < 80 and (R > G + 30 or B > G + 30)) to neutral charcoal (R = G, B = G) or alpha = 0.
        for (int pass = 0; pass < 2; pass++) {
            bool[] touchesZero = new bool[w * h];
            for (int y = 0; y < h; y++) {
                int row = y * stride;
                for (int x = 0; x < w; x++) {
                    if (buf[row + x * 4 + 3] == 0) continue;
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
                    } else if (b > g + 22 && r > g + 22) {
                        buf[idx] = (byte)g;
                        buf[idx + 2] = (byte)g;
                    }
                }
            }
        }

        int numFrames = 3;
        int target1 = w / 3;
        int target2 = (2 * w) / 3;
        int split1 = target1;
        int bestCost1 = int.MaxValue;
        for (int x = (int)(w * 0.25); x <= (int)(w * 0.42); x++) {
            int fgCount = 0;
            for (int y = 4; y < h - 4; y++) {
                if (buf[y * stride + x * 4 + 3] > 20) fgCount++;
            }
            int cost = fgCount * 1000 + Math.Abs(x - target1);
            if (cost < bestCost1) { bestCost1 = cost; split1 = x; }
        }

        int split2 = target2;
        int bestCost2 = int.MaxValue;
        for (int x = (int)(w * 0.58); x <= (int)(w * 0.75); x++) {
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
            } else {
                boxes[f] = new Rectangle(x0, y0, x1 - x0, h - 8);
            }
        }

        Marshal.Copy(buf, 0, bd.Scan0, buf.Length);
        rgbaBmp.UnlockBits(bd);

        int shearPadY = (int)Math.Ceiling(Math.Abs(shearSlope) * (maxFw / 2.0)) + 4;
        int padX = 6;
        int padY = 6 + shearPadY;
        int cellW = maxFw + padX * 2;
        int cellH = maxFh + padY * 2;
        if (cellW % 2 == 1) cellW++;
        if (cellH % 2 == 1) cellH++;

        using (Bitmap sheet = new Bitmap(cellW * numFrames, cellH, PixelFormat.Format32bppArgb)) {
            using (Graphics gs = Graphics.FromImage(sheet)) {
                gs.Clear(Color.FromArgb(0, 0, 0, 0));
                for (int f = 0; f < numFrames; f++) {
                    Rectangle b = boxes[f];
                    using (Bitmap frameBmp = new Bitmap(b.Width, b.Height, PixelFormat.Format32bppArgb)) {
                        using (Graphics gf = Graphics.FromImage(frameBmp)) {
                            gf.DrawImage(rgbaBmp, new Rectangle(0, 0, b.Width, b.Height), b, GraphicsUnit.Pixel);
                        }
                        if (flipEachFrame) {
                            frameBmp.RotateFlip(RotateFlipType.RotateNoneFlipX);
                        }

                        int dstX = rightAnchor
                            ? (f * cellW + (cellW - padX - b.Width))
                            : (f * cellW + (cellW - b.Width) / 2);
                        int dstY = bottomAnchor
                            ? (cellH - padY - b.Height)
                            : ((cellH - b.Height) / 2);

                        if (Math.Abs(shearSlope) < 0.001) {
                            gs.DrawImage(frameBmp, new Rectangle(dstX, dstY, b.Width, b.Height), new Rectangle(0, 0, b.Width, b.Height), GraphicsUnit.Pixel);
                        } else {
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
'@

Add-Type -TypeDefinition $csharpCode -ReferencedAssemblies System.Drawing

New-Item -ItemType Directory -Force -Path "public/assets/stories/nana/sprites" | Out-Null

Write-Host "=== STEP 1: Slicing All 8 Page 4 Sprite Sheets from raw/ into sprites/ ==="
# 1. p4-car-doggie-raw.png -> sprites/p4-car-doggie.png (Doggie is already on the left facing RIGHT toward the steering wheel on the right!)
[P4FinalPipeline]::SliceCarDoggie("public/assets/stories/nana/raw/p4-car-doggie-raw.png", "public/assets/stories/nana/p4-bg.jpg", "public/assets/stories/nana/sprites/p4-car-doggie.png", $false)
# 2. p4-hutch-items-raw.png -> sprites/p4-hutch-items.png (with -5 deg vertical perspective shear: tan(-5 deg) = -0.0875)
[P4FinalPipeline]::SliceSpriteBfs("public/assets/stories/nana/raw/p4-hutch-items-raw.png", "public/assets/stories/nana/sprites/p4-hutch-items.png", $true, $false, $false, -0.0875)
# 3. p4-cardboard-box-raw.png -> sprites/p4-cardboard-box.png
[P4FinalPipeline]::SliceSpriteBfs("public/assets/stories/nana/raw/p4-cardboard-box-raw.png", "public/assets/stories/nana/sprites/p4-cardboard-box.png", $true, $false, $false, 0.0)
# 4. p4-wall-oven-raw.png -> sprites/p4-wall-oven.png
[P4FinalPipeline]::SliceSpriteBfs("public/assets/stories/nana/raw/p4-wall-oven-raw.png", "public/assets/stories/nana/sprites/p4-wall-oven.png", $true, $false, $false, 0.0)
# 5. p4-wreath-raw.png -> sprites/p4-wreath.png
[P4FinalPipeline]::SliceSpriteBfs("public/assets/stories/nana/raw/p4-wreath-raw.png", "public/assets/stories/nana/sprites/p4-wreath.png", $true, $false, $false, 0.0)
# 6. p4-compressor-raw.png -> sprites/p4-compressor.png
[P4FinalPipeline]::SliceSpriteBfs("public/assets/stories/nana/raw/p4-compressor-raw.png", "public/assets/stories/nana/sprites/p4-compressor.png", $true, $false, $false, 0.0)
# 7. p4-leaf-blower-raw.png -> sprites/p4-leaf-blower.png
[P4FinalPipeline]::SliceSpriteBfs("public/assets/stories/nana/raw/p4-leaf-blower-raw.png", "public/assets/stories/nana/sprites/p4-leaf-blower.png", $true, $true, $false, 0.0)
# 8. p4-sparky-cabinet-raw.png -> sprites/p4-sparky-cabinet.png (flipped horizontally so Sparky peeks out to the LEFT of the right cabinet!)
[P4FinalPipeline]::SliceSpriteBfs("public/assets/stories/nana/raw/p4-sparky-cabinet-raw.png", "public/assets/stories/nana/sprites/p4-sparky-cabinet.png", $true, $false, $true, 0.0)

Write-Host "=== STEP 2: Extracting Car Cockpit & Cabinet Occluders from p4-bg-clean.jpg ==="
[P4FinalPipeline]::ExtractOccludersAndRuler(
    "public/assets/stories/nana/p4-bg-clean.jpg",
    "public/assets/stories/nana/sprites/p4-car-occluder.png",
    "public/assets/stories/nana/sprites/p4-shovel-occluder.png",
    "C:\Users\RobaD\.gemini/antigravity/brain/c157efef-ad7b-472f-a591-d3f1aea5976b/p4_new_clean_ruler.jpg"
)
[P4FinalPipeline]::RenderCompositePreview(
    "public/assets/stories/nana/p4-bg-clean.jpg",
    "C:\Users\RobaD\.gemini/antigravity/brain/c157efef-ad7b-472f-a591-d3f1aea5976b/p4_final_composite.jpg"
)
