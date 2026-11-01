$ErrorActionPreference = "Stop"

Add-Type -TypeDefinition @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;

public class P8BuilderV2 {
    private static bool IsMagenta(Color c, bool protectLightPink) {
        if (protectLightPink) {
            // Protect Emma's lavender shirt (G > 100, B > R + 12) and Nana's pink steam/hearts (R > B + 22 or G > 88)
            if (c.G > 92 && c.B > c.R + 10) return false;
            if (c.R > c.B + 22 && c.G > 55) return false;
            return (c.R > 145 && c.G < 88 && c.B > 135 && Math.Abs(c.R - c.B) < 42 && (c.R + c.B > c.G * 3 + 45));
        }
        return (c.R > 140 && c.G < 95 && c.B > 130 && (c.R + c.B > c.G * 3)) ||
               (c.R > 190 && c.G < 115 && c.B > 180 && (c.R + c.B > c.G * 3));
    }

    public static void BuildLowerRailingOccluder(string cleanBgPath, string outOccluderPath) {
        // Extract lower wooden porch railing box in front of sliding glass door: x=592..688, y=473..575 (w=96, h=102, center=640, 524)
        // Punch out the pale glass-door panes between the vertical wooden balusters (y=483..544) so Nana's jeans show through between the balusters!
        using (Bitmap srcOrig = new Bitmap(cleanBgPath))
        using (Bitmap bg = new Bitmap(1280, 720, PixelFormat.Format32bppArgb)) {
            bg.SetResolution(96, 96);
            using (Graphics g = Graphics.FromImage(bg)) {
                g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
                g.DrawImage(srcOrig, 0, 0, 1280, 720);
            }

            int x0 = 592, y0 = 473, w = 96, h = 102;
            using (Bitmap patch = new Bitmap(w, h, PixelFormat.Format32bppArgb)) {
                patch.SetResolution(96, 96);
                for (int y = 0; y < h; y++) {
                    int gy = y0 + y;
                    for (int x = 0; x < w; x++) {
                        int gx = x0 + x;
                        Color c = bg.GetPixel(gx, gy);
                        // Between top rail (gy >= 483) and bottom rail/deck (gy <= 544), check if pixel is the pale glass door between balusters
                        if (gy >= 483 && gy <= 544 && gx >= 604 && gx <= 676) {
                            bool isGlassPane = (c.G > 110 && c.B > 98 && (c.R - c.B) < 30);
                            if (isGlassPane) {
                                patch.SetPixel(x, y, Color.FromArgb(0, 0, 0, 0));
                                continue;
                            }
                        }
                        patch.SetPixel(x, y, c);
                    }
                }
                Directory.CreateDirectory(Path.GetDirectoryName(outOccluderPath));
                patch.Save(outOccluderPath, ImageFormat.Png);
            }
            Console.WriteLine("Built p8-lower-railing-occluder.png with transparent baluster gaps (96x102, center at x=640, y=524)");
        }
    }

    public static void SliceSheet(
        string rawPath,
        string outPngPath,
        bool isKidsRunning,
        bool isNanaPorch,
        bool isSparkyChimney,
        bool isWindChimes,
        bool isCanadaGeese
    ) {
        using (Bitmap src = new Bitmap(rawPath)) {
            src.SetResolution(96, 96);
            int W = src.Width;
            int H = src.Height;

            Color[,] px = new Color[W, H];
            bool[,] visited = new bool[W, H];
            for (int y = 0; y < H; y++) {
                for (int x = 0; x < W; x++) {
                    px[x, y] = src.GetPixel(x, y);
                }
            }

            bool protectPink = isKidsRunning || isNanaPorch || isSparkyChimney;

            Queue<Point> q = new Queue<Point>();
            for (int x = 0; x < W; x++) {
                if (IsMagenta(px[x, 0], protectPink)) { visited[x, 0] = true; q.Enqueue(new Point(x, 0)); }
                if (IsMagenta(px[x, H - 1], protectPink)) { visited[x, H - 1] = true; q.Enqueue(new Point(x, H - 1)); }
            }
            for (int y = 0; y < H; y++) {
                if (IsMagenta(px[0, y], protectPink) && !visited[0, y]) { visited[0, y] = true; q.Enqueue(new Point(0, y)); }
                if (IsMagenta(px[W - 1, y], protectPink) && !visited[W - 1, y]) { visited[W - 1, y] = true; q.Enqueue(new Point(W - 1, y)); }
            }

            int[] dx = new int[] { -1, 1, 0, 0, -1, 1, -1, 1 };
            int[] dy = new int[] { 0, 0, -1, 1, -1, -1, 1, 1 };
            while (q.Count > 0) {
                Point pt = q.Dequeue();
                px[pt.X, pt.Y] = Color.FromArgb(0, 0, 0, 0);
                for (int d = 0; d < 8; d++) {
                    int nx = pt.X + dx[d];
                    int ny = pt.Y + dy[d];
                    if (nx >= 0 && nx < W && ny >= 0 && ny < H && !visited[nx, ny] && IsMagenta(px[nx, ny], protectPink)) {
                        visited[nx, ny] = true;
                        q.Enqueue(new Point(nx, ny));
                    }
                }
            }

            // Clear interior enclosed magenta pockets safely per sprite type
            int thirdW = W / 3;
            for (int y = 1; y < H - 1; y++) {
                for (int x = 1; x < W - 1; x++) {
                    if (visited[x, y]) continue;
                    Color c = px[x, y];
                    int xInThird = x % thirdW;

                    bool seedInterior = false;
                    if (isKidsRunning) {
                        // Emma is in the right half of each frame (xInThird > 0.52 * thirdW); Wyatt is in the left half (xInThird < 0.50 * thirdW).
                        // In Wyatt's half, clear any interior magenta (e.g. inside his bent arm in Frame 2).
                        // In Emma's half, only clear pure #FF00FF (G < 35) so her lavender shirt (G > 100) stays 100% untouched!
                        if (xInThird < (int)(thirdW * 0.50)) {
                            seedInterior = IsMagenta(c, false);
                        } else {
                            seedInterior = (c.R > 225 && c.G < 35 && c.B > 220 && Math.Abs(c.R - c.B) < 28);
                        }
                    } else if (isNanaPorch) {
                        // Clear any magenta around her hair/neck/arms, while protecting pink steam/hearts
                        seedInterior = (c.R > 165 && c.G < 68 && c.B > 155 && Math.Abs(c.R - c.B) < 32);
                    } else if (isSparkyChimney) {
                        // Clear pure #FF00FF inside the heart smoke ring and heart flame
                        seedInterior = (c.R > 215 && c.G < 48 && c.B > 210 && Math.Abs(c.R - c.B) < 32);
                    } else {
                        // Deer, geese, wind chimes, doggie, bluejay: have no magenta body parts (only musical notes at top y < 0.28*H)
                        if (y > (int)(H * 0.22) || isWindChimes) {
                            seedInterior = (c.R > 145 && c.G < 82 && c.B > 140 && Math.Abs(c.R - c.B) < 38 && (c.R + c.B > c.G * 3 + 40));
                        } else {
                            seedInterior = (c.R > 215 && c.G < 45 && c.B > 210 && Math.Abs(c.R - c.B) < 30);
                        }
                    }

                    if (seedInterior) {
                        visited[x, y] = true;
                        q.Enqueue(new Point(x, y));
                    }
                }
            }

            while (q.Count > 0) {
                Point pt = q.Dequeue();
                px[pt.X, pt.Y] = Color.FromArgb(0, 0, 0, 0);
                for (int d = 0; d < 8; d++) {
                    int nx = pt.X + dx[d];
                    int ny = pt.Y + dy[d];
                    if (nx >= 0 && nx < W && ny >= 0 && ny < H && !visited[nx, ny]) {
                        int nxInThird = nx % thirdW;
                        bool allowExpand = isKidsRunning && nxInThird >= (int)(thirdW * 0.50)
                            ? (px[nx, ny].R > 210 && px[nx, ny].G < 45 && px[nx, ny].B > 205)
                            : IsMagenta(px[nx, ny], protectPink);
                        if (allowExpand) {
                            visited[nx, ny] = true;
                            q.Enqueue(new Point(nx, ny));
                        }
                    }
                }
            }

            int[] colCount = new int[W];
            for (int x = 0; x < W; x++) {
                int cnt = 0;
                for (int y = 0; y < H; y++) {
                    if (px[x, y].A > 0) cnt++;
                }
                colCount[x] = cnt;
            }

            int bestGap1 = W / 3;
            int minCnt1 = int.MaxValue;
            for (int x = (int)(W * 0.25); x <= (int)(W * 0.42); x++) {
                if (colCount[x] < minCnt1) {
                    minCnt1 = colCount[x];
                    bestGap1 = x;
                }
            }

            int bestGap2 = (W * 2) / 3;
            int minCnt2 = int.MaxValue;
            for (int x = (int)(W * 0.58); x <= (int)(W * 0.75); x++) {
                if (colCount[x] < minCnt2) {
                    minCnt2 = colCount[x];
                    bestGap2 = x;
                }
            }

            // In p8-canada-geese, Frame 0's right goose tail tip extends slightly right of bestGap1 at y > 0.60*H, while Frame 1's left wing is at y < 0.55*H.
            // Cleanly erase the tiny 4px tail tip bleed in Frame 1 near bestGap1 at y > 0.62*H!
            if (isCanadaGeese) {
                for (int y = (int)(H * 0.60); y < H; y++) {
                    for (int x = bestGap1; x < bestGap1 + 14; x++) {
                        px[x, y] = Color.FromArgb(0, 0, 0, 0);
                    }
                }
            }

            int[] xStarts = new int[] { 0, bestGap1, bestGap2 };
            int[] xEnds = new int[] { bestGap1 - 1, bestGap2 - 1, W - 1 };

            // Remove tiny isolated noise specks (<= 3px, or magenta-tinted <= 12px)
            bool[,] visitedComp = new bool[W, H];
            for (int y = 0; y < H; y++) {
                for (int x = 0; x < W; x++) {
                    if (px[x, y].A > 0 && !visitedComp[x, y]) {
                        List<Point> comp = new List<Point>();
                        Queue<Point> cq = new Queue<Point>();
                        visitedComp[x, y] = true;
                        cq.Enqueue(new Point(x, y));
                        int rSum = 0, gSum = 0, bSum = 0;
                        while (cq.Count > 0) {
                            Point pt = cq.Dequeue();
                            comp.Add(pt);
                            Color cc = px[pt.X, pt.Y];
                            rSum += cc.R; gSum += cc.G; bSum += cc.B;
                            for (int d = 0; d < 8; d++) {
                                int nx = pt.X + dx[d];
                                int ny = pt.Y + dy[d];
                                if (nx >= 0 && nx < W && ny >= 0 && ny < H && !visitedComp[nx, ny] && px[nx, ny].A > 0) {
                                    visitedComp[nx, ny] = true;
                                    cq.Enqueue(new Point(nx, ny));
                                }
                            }
                        }
                        int n = comp.Count;
                        bool isMagentaSpeck = (n <= 14) && ((rSum / n) > 150 && (gSum / n) < 95 && (bSum / n) > 140 && Math.Abs((rSum / n) - (bSum / n)) < 40);
                        if (n <= 3 || isMagentaSpeck) {
                            foreach (Point pt in comp) {
                                px[pt.X, pt.Y] = Color.FromArgb(0, 0, 0, 0);
                            }
                        }
                    }
                }
            }

            // 2px perimeter de-spill + convert purple ground shadows to soft woodland shadows (R=35, G=30, B=25, alpha=105)
            for (int pass = 0; pass < 2; pass++) {
                Color[,] nextPx = (Color[,])px.Clone();
                for (int y = 0; y < H; y++) {
                    for (int x = 0; x < W; x++) {
                        Color c = px[x, y];
                        if (c.A == 0) continue;

                        if (y > (int)(H * 0.68) && c.R > 110 && c.B > 110 && c.G < 70 && Math.Abs(c.R - c.B) < 35) {
                            nextPx[x, y] = Color.FromArgb(105, 35, 30, 25);
                            continue;
                        }

                        bool touchesAlpha0 = false;
                        for (int d = 0; d < 8; d++) {
                            int nx = x + dx[d];
                            int ny = y + dy[d];
                            if (nx < 0 || nx >= W || ny < 0 || ny >= H || px[nx, ny].A == 0) {
                                touchesAlpha0 = true;
                                break;
                            }
                        }
                        if (touchesAlpha0) {
                            if (c.G < 85 && (c.R > c.G + 28 && c.B > c.G + 28) && Math.Abs(c.R - c.B) < 42) {
                                if (c.R > 135 && c.B > 125) {
                                    nextPx[x, y] = Color.FromArgb(0, 0, 0, 0);
                                } else {
                                    int gVal = Math.Min(65, (int)c.G);
                                    nextPx[x, y] = Color.FromArgb(255, gVal, gVal, gVal);
                                }
                            } else if ((c.R + c.B) > c.G * 2 + 70 && c.R > 120 && c.B > 115 && Math.Abs(c.R - c.B) < 42) {
                                nextPx[x, y] = Color.FromArgb(0, 0, 0, 0);
                            }
                        }
                    }
                }
                px = nextPx;
            }

            Rectangle[] boxes = new Rectangle[3];
            int[] hookTopX = new int[3];
            int maxFw = 0;
            int maxFh = 0;

            for (int f = 0; f < 3; f++) {
                int minX = xEnds[f], maxX = xStarts[f], minY = H - 1, maxY = 0;
                bool found = false;
                for (int y = 0; y < H; y++) {
                    for (int x = xStarts[f]; x <= xEnds[f]; x++) {
                        Color c = px[x, y];
                        if (c.A > 0) {
                            if (x < minX) minX = x;
                            if (x > maxX) maxX = x;
                            if (y < minY) minY = y;
                            if (y > maxY) maxY = y;
                            found = true;
                        }
                    }
                }
                if (!found) {
                    boxes[f] = new Rectangle(xStarts[f], 0, 64, 64);
                    hookTopX[f] = xStarts[f] + 32;
                } else {
                    boxes[f] = new Rectangle(minX, minY, maxX - minX + 1, maxY - minY + 1);
                    int hMinX = maxX, hMaxX = minX;
                    for (int y = minY; y <= Math.Min(maxY, minY + 12); y++) {
                        for (int x = minX; x <= maxX; x++) {
                            if (px[x, y].A > 0) {
                                if (x < hMinX) hMinX = x;
                                if (x > hMaxX) hMaxX = x;
                            }
                        }
                    }
                    hookTopX[f] = (hMinX + hMaxX) / 2;
                }
                if (boxes[f].Width > maxFw) maxFw = boxes[f].Width;
                if (boxes[f].Height > maxFh) maxFh = boxes[f].Height;
            }

            int fw = maxFw + 12;
            if (fw % 2 != 0) fw++;
            int fh = maxFh + 12;
            if (fh % 2 != 0) fh++;

            if (isWindChimes) {
                int maxLeft = 0, maxRight = 0;
                for (int f = 0; f < 3; f++) {
                    int left = hookTopX[f] - boxes[f].X;
                    int right = (boxes[f].X + boxes[f].Width - 1) - hookTopX[f];
                    if (left > maxLeft) maxLeft = left;
                    if (right > maxRight) maxRight = right;
                }
                fw = Math.Max(maxLeft, maxRight) * 2 + 12;
                if (fw % 2 != 0) fw++;
            }

            using (Bitmap outBmp = new Bitmap(fw * 3, fh, PixelFormat.Format32bppArgb)) {
                outBmp.SetResolution(96, 96);
                for (int f = 0; f < 3; f++) {
                    Rectangle b = boxes[f];
                    int dstStartX = isWindChimes
                        ? (f * fw + (fw / 2) - (hookTopX[f] - b.X))
                        : (f * fw + (fw - b.Width) / 2);
                    int dstStartY = isWindChimes
                        ? 4
                        : (fh - 6 - b.Height);

                    for (int sy = 0; sy < b.Height; sy++) {
                        for (int sx = 0; sx < b.Width; sx++) {
                            Color c = px[b.X + sx, b.Y + sy];
                            if (c.A > 0) {
                                int dxOut = dstStartX + sx;
                                int dyOut = dstStartY + sy;
                                if (dxOut >= f * fw && dxOut < (f + 1) * fw && dyOut >= 0 && dyOut < fh) {
                                    outBmp.SetPixel(dxOut, dyOut, c);
                                }
                            }
                        }
                    }
                }
                Directory.CreateDirectory(Path.GetDirectoryName(outPngPath));
                outBmp.Save(outPngPath, ImageFormat.Png);
            }
            Console.WriteLine(string.Format("Sliced {0} -> frameWidth: {1}, frameHeight: {2} (total {3}x{4})",
                Path.GetFileName(outPngPath), fw, fh, fw * 3, fh));
        }
    }

    public static void DrawFrame0(Graphics g, string pngPath, float stageX, float stageY, float scale, float originX = 0.5f, float originY = 0.5f) {
        using (Bitmap sheet = new Bitmap(pngPath)) {
            sheet.SetResolution(96, 96);
            int fw = sheet.Width / 3;
            int fh = sheet.Height;
            float drawW = fw * scale;
            float drawH = fh * scale;
            RectangleF dst = new RectangleF(stageX - drawW * originX, stageY - drawH * originY, drawW, drawH);
            RectangleF src = new RectangleF(0, 0, fw, fh);
            g.DrawImage(sheet, dst, src, GraphicsUnit.Pixel);
        }
    }

    public static void RenderComposite(string bgPath, string outPath) {
        using (Bitmap bg = new Bitmap(bgPath))
        using (Bitmap railing = new Bitmap("public\\assets\\stories\\nana\\sprites\\p8-lower-railing-occluder.png"))
        using (Bitmap comp = new Bitmap(1280, 720, PixelFormat.Format32bppArgb)) {
            comp.SetResolution(96, 96);
            railing.SetResolution(96, 96);
            using (Graphics g = Graphics.FromImage(comp)) {
                g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
                g.DrawImage(bg, 0, 0, 1280, 720);

                g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.NearestNeighbor;
                g.PixelOffsetMode = System.Drawing.Drawing2D.PixelOffsetMode.Half;

                // 1. p8-forest-deer (depth 12)
                DrawFrame0(g, "public\\assets\\stories\\nana\\sprites\\p8-forest-deer.png", 86f, 480f, 0.36f);
                // 2. p8-sparky-chimney (depth 15)
                DrawFrame0(g, "public\\assets\\stories\\nana\\sprites\\p8-sparky-chimney.png", 955f, 125f, 0.36f);
                // 3. p8-wind-chimes (depth 16, origin 0.5, 0.0 at x=436, y=370)
                DrawFrame0(g, "public\\assets\\stories\\nana\\sprites\\p8-wind-chimes.png", 436f, 370f, 0.22f, 0.5f, 0.0f);
                // 4. p8-bluejay-porch (depth 17)
                DrawFrame0(g, "public\\assets\\stories\\nana\\sprites\\p8-bluejay-porch.png", 982f, 452f, 0.16f);
                // 5. p8-nana-porch (depth 18, y=462 so her jeans sit right behind the balusters and end inside the bottom deck rim)
                DrawFrame0(g, "public\\assets\\stories\\nana\\sprites\\p8-nana-porch.png", 640f, 462f, 0.34f);
                // 6. p8-doggie-cellar (depth 19)
                DrawFrame0(g, "public\\assets\\stories\\nana\\sprites\\p8-doggie-cellar.png", 345f, 555f, 0.30f);
                // 7. p8-canada-geese (depth 20)
                DrawFrame0(g, "public\\assets\\stories\\nana\\sprites\\p8-canada-geese.png", 172f, 595f, 0.56f);
                // 8. p8-lower-railing-occluder (depth 22, centered at 640, 524 -> top-left 592, 473)
                g.DrawImage(railing, 592, 473, 96, 102);
                // 9. p8-kids-running (depth 25)
                DrawFrame0(g, "public\\assets\\stories\\nana\\sprites\\p8-kids-running.png", 1012f, 606f, 0.62f);
            }
            comp.Save(outPath, ImageFormat.Jpeg);
        }
    }
}
"@ -ReferencedAssemblies System.Drawing

[P8BuilderV2]::BuildLowerRailingOccluder("public\assets\stories\nana\p8-bg-clean.jpg", "public\assets\stories\nana\sprites\p8-lower-railing-occluder.png")
[P8BuilderV2]::SliceSheet("public\assets\stories\nana\raw\p8-kids-running-raw.jpg", "public\assets\stories\nana\sprites\p8-kids-running.png", $true, $false, $false, $false, $false)
[P8BuilderV2]::SliceSheet("public\assets\stories\nana\raw\p8-nana-porch-raw.jpg", "public\assets\stories\nana\sprites\p8-nana-porch.png", $false, $true, $false, $false, $false)
[P8BuilderV2]::SliceSheet("public\assets\stories\nana\raw\p8-sparky-chimney-raw.jpg", "public\assets\stories\nana\sprites\p8-sparky-chimney.png", $false, $false, $true, $false, $false)
[P8BuilderV2]::SliceSheet("public\assets\stories\nana\raw\p8-forest-deer-raw.jpg", "public\assets\stories\nana\sprites\p8-forest-deer.png", $false, $false, $false, $false, $false)
[P8BuilderV2]::SliceSheet("public\assets\stories\nana\raw\p8-canada-geese-raw.jpg", "public\assets\stories\nana\sprites\p8-canada-geese.png", $false, $false, $false, $false, $true)
[P8BuilderV2]::SliceSheet("public\assets\stories\nana\raw\p8-wind-chimes-raw.jpg", "public\assets\stories\nana\sprites\p8-wind-chimes.png", $false, $false, $false, $true, $false)
[P8BuilderV2]::SliceSheet("public\assets\stories\nana\raw\p8-doggie-cellar-raw.jpg", "public\assets\stories\nana\sprites\p8-doggie-cellar.png", $false, $false, $false, $false, $false)
[P8BuilderV2]::SliceSheet("public\assets\stories\nana\raw\p8-bluejay-porch-raw.jpg", "public\assets\stories\nana\sprites\p8-bluejay-porch.png", $false, $false, $false, $false, $false)

$artDir = "C:\Users\RobaD\.gemini\antigravity\brain\c157efef-ad7b-472f-a591-d3f1aea5976b"
[P8BuilderV2]::RenderComposite("public\assets\stories\nana\p8-bg-clean.jpg", "$artDir\p8_comp_preview2.jpg")
