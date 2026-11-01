$ErrorActionPreference = "Stop"

Add-Type -TypeDefinition @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;

public class P7BuilderV4 {
    private static bool IsMagenta(Color c) {
        return (c.R > 150 && c.G < 90 && c.B > 140 && (c.R + c.B > c.G * 3)) ||
               (c.R > 195 && c.G < 115 && c.B > 185 && (c.R + c.B > c.G * 3));
    }

    private static bool IsPureInteriorMagenta(Color c) {
        return c.R > 215 && c.G < 55 && c.B > 210 && Math.Abs(c.R - c.B) < 35;
    }

    public static void BuildChairCoverPatch(string cleanBgPath, string outPatchPath) {
        // Extracts x: 985..1235, y: 325..565 from p7-bg-clean.jpg (scaled to 1280x720)
        // and replaces the empty chair pixels inside that box with the surrounding clean sand, shadow oval, and umbrella pole
        using (Bitmap srcOrig = new Bitmap(cleanBgPath))
        using (Bitmap bg = new Bitmap(1280, 720, PixelFormat.Format32bppArgb)) {
            bg.SetResolution(96, 96);
            using (Graphics g = Graphics.FromImage(bg)) {
                g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.NearestNeighbor;
                g.DrawImage(srcOrig, 0, 0, 1280, 720);
            }

            int x0 = 985, y0 = 325, w = 250, h = 240;
            Color exactSand = bg.GetPixel(980, 400);
            Color exactShadow = bg.GetPixel(990, 495);
            using (Bitmap patch = new Bitmap(w, h, PixelFormat.Format32bppArgb)) {
                patch.SetResolution(96, 96);
                for (int y = 0; y < h; y++) {
                    int gy = y0 + y;
                    for (int x = 0; x < w; x++) {
                        int gx = x0 + x;
                        Color c = bg.GetPixel(gx, gy);

                        // Keep the right stone fire-pit (gx >= 1160 && gy <= 378) and the bottom-right striped beach towel
                        bool isFirePit = (gx >= 1160 && gy <= 378);
                        bool isTowel = (gy >= 520 && gx >= 1120 && (gx - 1120) + (gy - 520) * 2 > 35);
                        if (isFirePit || isTowel) {
                            continue;
                        }

                        // Check if this pixel is already natural sand or natural oval shadow on p7-bg-clean.jpg
                        bool isNaturalSand = (Math.Abs(c.R - exactSand.R) < 14 && Math.Abs(c.G - exactSand.G) < 14 && Math.Abs(c.B - exactSand.B) < 18);
                        bool isNaturalShadow = (Math.Abs(c.R - exactShadow.R) < 16 && Math.Abs(c.G - exactShadow.G) < 16 && Math.Abs(c.B - exactShadow.B) < 18);
                        if (isNaturalSand || isNaturalShadow) {
                            continue;
                        }

                        // Otherwise it is part of the empty chair on p7-bg-clean.jpg -> replace with exactSand or exactShadow!
                        double dx = (gx - 1135.0) / 155.0;
                        double dy = (gy - 495.0) / 58.0;
                        bool inShadow = (gy >= 442) && ((dx * dx + dy * dy) <= 1.0);
                        patch.SetPixel(x, y, inShadow ? exactShadow : exactSand);
                    }
                }
                Directory.CreateDirectory(Path.GetDirectoryName(outPatchPath));
                patch.Save(outPatchPath, ImageFormat.Png);
            }
            Console.WriteLine("Built p7-chair-cover.png (250x240 at x=985, y=325)");
        }
    }

    public static void SliceSheet(
        string rawPath,
        string outPngPath,
        bool allowPureInteriorHoles,
        bool isKidsSandcastle,
        bool isDoggieTowel,
        bool stripSailboatWaterBox,
        bool featherSandPuddle,
        bool rightAlignFrames
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

            if (stripSailboatWaterBox) {
                for (int y = (int)(H * 0.44); y < H; y++) {
                    for (int x = 0; x < W; x++) {
                        Color c = px[x, y];
                        if (IsMagenta(c)) continue;
                        bool isBoatHullOrMast = (y < (int)(H * 0.63)) && (
                            (c.R > 110 && c.B < 140) ||
                            (c.R < 90 && c.G < 90 && c.B < 110)
                        );
                        bool isWhiteSailOrRipple = (c.R > 180 && c.G > 205 && c.B > 220);
                        if (!isBoatHullOrMast && !isWhiteSailOrRipple && (c.B > c.R + 25 || y > (int)(H * 0.69))) {
                            px[x, y] = Color.FromArgb(255, 255, 0, 255);
                        }
                    }
                }
            }

            Queue<Point> q = new Queue<Point>();
            for (int x = 0; x < W; x++) {
                if (IsMagenta(px[x, 0])) { visited[x, 0] = true; q.Enqueue(new Point(x, 0)); }
                if (IsMagenta(px[x, H - 1])) { visited[x, H - 1] = true; q.Enqueue(new Point(x, H - 1)); }
            }
            for (int y = 0; y < H; y++) {
                if (IsMagenta(px[0, y]) && !visited[0, y]) { visited[0, y] = true; q.Enqueue(new Point(0, y)); }
                if (IsMagenta(px[W - 1, y]) && !visited[W - 1, y]) { visited[W - 1, y] = true; q.Enqueue(new Point(W - 1, y)); }
            }

            int[] dx = new int[] { -1, 1, 0, 0, -1, 1, -1, 1 };
            int[] dy = new int[] { 0, 0, -1, 1, -1, -1, 1, 1 };
            while (q.Count > 0) {
                Point pt = q.Dequeue();
                px[pt.X, pt.Y] = Color.FromArgb(0, 0, 0, 0);
                for (int d = 0; d < 8; d++) {
                    int nx = pt.X + dx[d];
                    int ny = pt.Y + dy[d];
                    if (nx >= 0 && nx < W && ny >= 0 && ny < H && !visited[nx, ny] && IsMagenta(px[nx, ny])) {
                        visited[nx, ny] = true;
                        q.Enqueue(new Point(nx, ny));
                    }
                }
            }

            if (allowPureInteriorHoles) {
                for (int y = 1; y < H - 1; y++) {
                    for (int x = 1; x < W - 1; x++) {
                        if (!visited[x, y] && IsPureInteriorMagenta(px[x, y])) {
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
                        if (nx >= 0 && nx < W && ny >= 0 && ny < H && !visited[nx, ny] && IsMagenta(px[nx, ny])) {
                            visited[nx, ny] = true;
                            q.Enqueue(new Point(nx, ny));
                        }
                    }
                }
            }

            // For p7-kids-sandcastle: ONLY check the central region between Emma's chest and Wyatt's chest (xInThird > 0.30 * thirdW)
            // so Emma's pink rashguard (xInThird <= 0.30 * thirdW) is 100% untouched in all 3 frames!
            if (isKidsSandcastle) {
                int thirdW = W / 3;
                for (int y = (int)(H * 0.42); y < (int)(H * 0.72); y++) {
                    for (int x = 1; x < W - 1; x++) {
                        int xInThird = x % thirdW;
                        if (xInThird < (int)(thirdW * 0.30) || xInThird > (int)(thirdW * 0.78)) continue;
                        Color c = px[x, y];
                        if (!visited[x, y] && c.R > 175 && c.G < 75 && c.B > 170 && Math.Abs(c.R - c.B) < 32) {
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
                        int nxInThird = nx % thirdW;
                        if (nx >= 0 && nx < W && ny >= 0 && ny < H && !visited[nx, ny] && nxInThird >= (int)(thirdW * 0.29)) {
                            Color nc = px[nx, ny];
                            if (nc.R > 165 && nc.G < 80 && nc.B > 160 && Math.Abs(nc.R - nc.B) < 35) {
                                visited[nx, ny] = true;
                                q.Enqueue(new Point(nx, ny));
                            }
                        }
                    }
                }
            }

            if (isDoggieTowel) {
                for (int y = (int)(H * 0.62); y < H - 1; y++) {
                    for (int x = 1; x < W - 1; x++) {
                        if (!visited[x, y] && IsPureInteriorMagenta(px[x, y])) {
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
                        if (nx >= 0 && nx < W && ny >= (int)(H * 0.60) && ny < H && !visited[nx, ny] && IsMagenta(px[nx, ny])) {
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

            int[] xStarts = new int[] { 0, bestGap1, bestGap2 };
            int[] xEnds = new int[] { bestGap1 - 1, bestGap2 - 1, W - 1 };

            bool[,] visitedComp = new bool[W, H];
            for (int y = 0; y < H; y++) {
                for (int x = 0; x < W; x++) {
                    if (px[x, y].A > 0 && !visitedComp[x, y]) {
                        List<Point> comp = new List<Point>();
                        Queue<Point> cq = new Queue<Point>();
                        visitedComp[x, y] = true;
                        cq.Enqueue(new Point(x, y));
                        while (cq.Count > 0) {
                            Point pt = cq.Dequeue();
                            comp.Add(pt);
                            for (int d = 0; d < 8; d++) {
                                int nx = pt.X + dx[d];
                                int ny = pt.Y + dy[d];
                                if (nx >= 0 && nx < W && ny >= 0 && ny < H && !visitedComp[nx, ny] && px[nx, ny].A > 0) {
                                    visitedComp[nx, ny] = true;
                                    cq.Enqueue(new Point(nx, ny));
                                }
                            }
                        }
                        if (comp.Count < 16) {
                            foreach (Point pt in comp) {
                                px[pt.X, pt.Y] = Color.FromArgb(0, 0, 0, 0);
                            }
                        }
                    }
                }
            }

            // 3-pass perimeter de-spill + sand puddle pink-edge removal
            for (int pass = 0; pass < 3; pass++) {
                Color[,] nextPx = (Color[,])px.Clone();
                for (int y = 0; y < H; y++) {
                    for (int x = 0; x < W; x++) {
                        Color c = px[x, y];
                        if (c.A == 0) continue;
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
                            // On the bottom sand puddle perimeter (y > 0.65*H), any pixel where B > G - 25 is a JPEG magenta-to-sand blend
                            if (featherSandPuddle && y > (int)(H * 0.65) && c.B > c.G - 25) {
                                nextPx[x, y] = Color.FromArgb(0, 0, 0, 0);
                                continue;
                            }
                            if (c.G < 85 && (c.R > c.G + 28 || c.B > c.G + 28)) {
                                if (c.R > 135 && c.B > 125) {
                                    nextPx[x, y] = Color.FromArgb(0, 0, 0, 0);
                                } else {
                                    int gVal = Math.Min(70, (int)c.G);
                                    nextPx[x, y] = Color.FromArgb(255, gVal, gVal, gVal);
                                }
                            } else if ((c.R + c.B) > c.G * 2 + 65 && c.R > 110 && c.B > 105) {
                                nextPx[x, y] = Color.FromArgb(0, 0, 0, 0);
                            }
                        }
                        if (y > (int)(H * 0.65) && c.R > 90 && c.B > 90 && c.G < 75 && Math.Abs(c.R - c.B) < 45) {
                            nextPx[x, y] = Color.FromArgb(105, 45, 35, 25);
                        }
                    }
                }
                px = nextPx;
            }

            Rectangle[] boxes = new Rectangle[3];
            int[] stoneBottomY = new int[3];
            int[] stoneCenterX = new int[3];
            int maxFw = 0;
            int maxFh = 0;
            bool isSparkyGrill = outPngPath.Contains("sparky-grill");

            for (int f = 0; f < 3; f++) {
                int minX = xEnds[f], maxX = xStarts[f], minY = H - 1, maxY = 0;
                int sMinX = xEnds[f], sMaxX = xStarts[f], sMaxY = 0;
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

                            if (isSparkyGrill && y > (int)(H * 0.40) && c.R < 125 && c.G < 125 && c.B < 135 && Math.Abs(c.R - c.B) < 25) {
                                if (x < sMinX) sMinX = x;
                                if (x > sMaxX) sMaxX = x;
                                if (y > sMaxY) sMaxY = y;
                            }
                        }
                    }
                }
                if (!found) {
                    boxes[f] = new Rectangle(xStarts[f], 0, 64, 64);
                } else {
                    boxes[f] = new Rectangle(minX, minY, maxX - minX + 1, maxY - minY + 1);
                }
                stoneBottomY[f] = sMaxY > 0 ? sMaxY : maxY;
                stoneCenterX[f] = sMaxX > sMinX ? (sMinX + sMaxX) / 2 : (minX + maxX) / 2;
                if (boxes[f].Width > maxFw) maxFw = boxes[f].Width;
                if (boxes[f].Height > maxFh) maxFh = boxes[f].Height;
                if (isSparkyGrill) {
                    Console.WriteLine(string.Format("  [sparky-grill f={0}] box=({1},{2} {3}x{4}) bottomY={5} stoneBottomY={6} stoneCenterX={7}",
                        f, minX, minY, boxes[f].Width, boxes[f].Height, maxY, stoneBottomY[f], stoneCenterX[f]));
                }
            }

            int fw = maxFw + 12;
            if (fw % 2 != 0) fw++;
            int fh = maxFh + 12;
            if (fh % 2 != 0) fh++;

            if (isSparkyGrill) {
                int maxAbove = 0, maxBelow = 0, maxLeft = 0, maxRight = 0;
                for (int f = 0; f < 3; f++) {
                    int above = stoneBottomY[f] - boxes[f].Y;
                    int below = (boxes[f].Y + boxes[f].Height - 1) - stoneBottomY[f];
                    int left = stoneCenterX[f] - boxes[f].X;
                    int right = (boxes[f].X + boxes[f].Width - 1) - stoneCenterX[f];
                    if (above > maxAbove) maxAbove = above;
                    if (below > maxBelow) maxBelow = below;
                    if (left > maxLeft) maxLeft = left;
                    if (right > maxRight) maxRight = right;
                }
                fw = Math.Max(maxLeft, maxRight) * 2 + 12;
                if (fw % 2 != 0) fw++;
                fh = maxAbove + maxBelow + 12;
                if (fh % 2 != 0) fh++;

                int targetStoneCenterX = fw / 2;
                int targetStoneBottomY = fh - 6 - maxBelow;

                using (Bitmap outBmp = new Bitmap(fw * 3, fh, PixelFormat.Format32bppArgb)) {
                    outBmp.SetResolution(96, 96);
                    for (int f = 0; f < 3; f++) {
                        Rectangle b = boxes[f];
                        int shiftX = (f * fw + targetStoneCenterX) - stoneCenterX[f];
                        int shiftY = targetStoneBottomY - stoneBottomY[f];
                        for (int sy = b.Y; sy < b.Y + b.Height; sy++) {
                            for (int sx = b.X; sx < b.X + b.Width; sx++) {
                                Color c = px[sx, sy];
                                if (c.A > 0) {
                                    int dxOut = sx + shiftX;
                                    int dyOut = sy + shiftY;
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
                return;
            }

            using (Bitmap outBmp = new Bitmap(fw * 3, fh, PixelFormat.Format32bppArgb)) {
                outBmp.SetResolution(96, 96);
                for (int f = 0; f < 3; f++) {
                    Rectangle b = boxes[f];
                    int dstStartX = rightAlignFrames
                        ? (f * fw + fw - 6 - b.Width)
                        : (f * fw + (fw - b.Width) / 2);
                    int dstStartY = fh - 6 - b.Height;

                    for (int sy = 0; sy < b.Height; sy++) {
                        for (int sx = 0; sx < b.Width; sx++) {
                            Color c = px[b.X + sx, b.Y + sy];
                            if (c.A > 0) {
                                outBmp.SetPixel(dstStartX + sx, dstStartY + sy, c);
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

    public static void DrawFrame0(Graphics g, string pngPath, int fw, int fh, float stageX, float stageY, float scaleX, float scaleY) {
        using (Bitmap sheet = new Bitmap(pngPath)) {
            sheet.SetResolution(96, 96);
            float drawW = fw * scaleX;
            float drawH = fh * scaleY;
            RectangleF dst = new RectangleF(stageX - drawW / 2f, stageY - drawH / 2f, drawW, drawH);
            RectangleF src = new RectangleF(0, 0, fw, fh);
            g.DrawImage(sheet, dst, src, GraphicsUnit.Pixel);
        }
    }

    public static void RenderComposite(string bgPath, string outPath) {
        using (Bitmap bg = new Bitmap(bgPath))
        using (Bitmap chairCover = new Bitmap("public\\assets\\stories\\nana\\sprites\\p7-chair-cover.png"))
        using (Bitmap comp = new Bitmap(1280, 720, PixelFormat.Format32bppArgb)) {
            comp.SetResolution(96, 96);
            chairCover.SetResolution(96, 96);
            using (Graphics g = Graphics.FromImage(comp)) {
                g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.NearestNeighbor;
                g.PixelOffsetMode = System.Drawing.Drawing2D.PixelOffsetMode.Half;
                g.DrawImage(bg, 0, 0, 1280, 720);

                // 6: p7-sailboat-horizon (165, 215)
                DrawFrame0(g, "public\\assets\\stories\\nana\\sprites\\p7-sailboat-horizon.png", 282, 302, 165f, 185f, 0.38f, 0.38f);
                // 12: p7-sparky-grill (1005, 285)
                DrawFrame0(g, "public\\assets\\stories\\nana\\sprites\\p7-sparky-grill.png", 322, 276, 1005f, 265f, 0.42f, 0.42f);
                // 14: p7-seagulls-bucket (775, 375)
                DrawFrame0(g, "public\\assets\\stories\\nana\\sprites\\p7-seagulls-bucket.png", 296, 298, 775f, 365f, 0.52f, 0.52f);
                // 18: p7-papa-skipping (315, 395)
                DrawFrame0(g, "public\\assets\\stories\\nana\\sprites\\p7-papa-skipping.png", 324, 268, 292f, 340f, 1.18f, 1.18f);
                // 19: p7-chair-cover static clean-sand patch over the empty chair on p7-bg-clean.jpg
                g.DrawImage(chairCover, 985, 325, 250, 240);
                // 20: p7-nana-chair (1105, 445)
                DrawFrame0(g, "public\\assets\\stories\\nana\\sprites\\p7-nana-chair.png", 288, 390, 1105f, 395f, 0.94f, 0.94f);
                // 22: p7-beach-ball (520, 585)
                DrawFrame0(g, "public\\assets\\stories\\nana\\sprites\\p7-beach-ball.png", 318, 418, 520f, 555f, 0.30f, 0.30f);
                // 24: p7-doggie-towel (1185, 555)
                DrawFrame0(g, "public\\assets\\stories\\nana\\sprites\\p7-doggie-towel.png", 308, 278, 1185f, 545f, 0.40f, 0.40f);
                // 25: p7-kids-sandcastle (745, 555)
                DrawFrame0(g, "public\\assets\\stories\\nana\\sprites\\p7-kids-sandcastle.png", 344, 300, 755f, 520f, 1.18f, 1.18f);
            }
            comp.Save(outPath, ImageFormat.Jpeg);
        }
    }
}
"@ -ReferencedAssemblies System.Drawing

[P7BuilderV4]::BuildChairCoverPatch("public\assets\stories\nana\p7-bg-clean.jpg", "public\assets\stories\nana\sprites\p7-chair-cover.png")
[P7BuilderV4]::SliceSheet("public\assets\stories\nana\raw\p7-papa-skipping-raw.jpg", "public\assets\stories\nana\sprites\p7-papa-skipping.png", $true, $false, $false, $false, $false, $true)
[P7BuilderV4]::SliceSheet("public\assets\stories\nana\raw\p7-kids-sandcastle-raw.jpg", "public\assets\stories\nana\sprites\p7-kids-sandcastle.png", $false, $true, $false, $false, $true, $false)
[P7BuilderV4]::SliceSheet("public\assets\stories\nana\raw\p7-nana-chair-raw.jpg", "public\assets\stories\nana\sprites\p7-nana-chair.png", $true, $false, $false, $false, $false, $false)
[P7BuilderV4]::SliceSheet("public\assets\stories\nana\raw\p7-doggie-towel-raw.jpg", "public\assets\stories\nana\sprites\p7-doggie-towel.png", $false, $false, $true, $false, $true, $false)
[P7BuilderV4]::SliceSheet("public\assets\stories\nana\raw\p7-seagulls-bucket-raw.jpg", "public\assets\stories\nana\sprites\p7-seagulls-bucket.png", $true, $false, $false, $false, $true, $false)
[P7BuilderV4]::SliceSheet("public\assets\stories\nana\raw\p7-sparky-grill-raw.jpg", "public\assets\stories\nana\sprites\p7-sparky-grill.png", $true, $false, $false, $false, $true, $false)
[P7BuilderV4]::SliceSheet("public\assets\stories\nana\raw\p7-sailboat-horizon-raw.jpg", "public\assets\stories\nana\sprites\p7-sailboat-horizon.png", $true, $false, $false, $true, $false, $false)
[P7BuilderV4]::SliceSheet("public\assets\stories\nana\raw\p7-umbrella-top-raw.jpg", "public\assets\stories\nana\sprites\p7-beach-ball.png", $true, $false, $false, $false, $true, $false)
Copy-Item "public\assets\stories\nana\sprites\p7-beach-ball.png" "public\assets\stories\nana\sprites\p7-umbrella-top.png" -Force

$artDir = "C:\Users\RobaD\.gemini\antigravity\brain\c157efef-ad7b-472f-a591-d3f1aea5976b"
[P7BuilderV4]::RenderComposite("public\assets\stories\nana\p7-bg-clean.jpg", "$artDir\p7_comp_preview3.jpg")

# Create placeholder MP3s in public/assets/stories/nana/audio/ ONLY if they do not already exist
$p7AudioFiles = @(
    "p7-narration.mp3",
    "sfx-papa-stoneskip.mp3",
    "sfx-kids-sandcastle.mp3",
    "sfx-nana-cheer.mp3",
    "sfx-doggie-dig.mp3",
    "sfx-seagulls-squawk.mp3",
    "sfx-sparky-smores.mp3",
    "sfx-sailboat-splash.mp3",
    "sfx-beach-ball.mp3",
    "sfx-umbrella-breeze.mp3"
)

# Valid minimal MPEG-1 Layer III 44.1kHz 128kbps silent MP3 frames (417 bytes per frame x 15 frames)
$frameBytes = New-Object byte[] (417 * 15)
for ($f = 0; $f -lt 15; $f++) {
    $off = $f * 417
    $frameBytes[$off + 0] = 0xFF
    $frameBytes[$off + 1] = 0xFB
    $frameBytes[$off + 2] = 0x90
    $frameBytes[$off + 3] = 0x64
}

foreach ($af in $p7AudioFiles) {
    $targetPath = Join-Path "public\assets\stories\nana\audio" $af
    if (-not (Test-Path $targetPath)) {
        [System.IO.File]::WriteAllBytes($targetPath, $frameBytes)
        Write-Host "Created placeholder MP3: $targetPath"
    } else {
        Write-Host "Preserved existing MP3: $targetPath"
    }
}
