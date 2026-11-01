$ErrorActionPreference = "Stop"

Add-Type -TypeDefinition @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Text;

public class P9BuilderV3 {
    private static bool IsMagenta(Color c, bool strictRule) {
        if (strictRule) {
            return (c.R > 150 && c.G < 90 && c.B > 140 && (c.R + c.B > c.G * 3));
        }
        return (c.R > 140 && c.G < 95 && c.B > 130 && (c.R + c.B > c.G * 3)) ||
               (c.R > 190 && c.G < 115 && c.B > 180 && (c.R + c.B > c.G * 3));
    }

    public static void BuildStoveFrameOccluder(string cleanBgPath, string outOccluderPath) {
        using (Bitmap srcOrig = new Bitmap(cleanBgPath))
        using (Bitmap bg = new Bitmap(1280, 720, PixelFormat.Format32bppArgb)) {
            bg.SetResolution(96, 96);
            using (Graphics g = Graphics.FromImage(bg)) {
                g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
                g.DrawImage(srcOrig, 0, 0, 1280, 720);
            }

            int x0 = 550, y0 = 420, w = 178, h = 122;
            using (Bitmap patch = new Bitmap(w, h, PixelFormat.Format32bppArgb)) {
                patch.SetResolution(96, 96);
                for (int y = 0; y < h; y++) {
                    int gy = y0 + y;
                    for (int x = 0; x < w; x++) {
                        int gx = x0 + x;
                        bool inInnerWindow = (gx >= 574 && gx <= 703 && gy >= 442 && gy <= 520);
                        if (inInnerWindow) {
                            int dxCorner = Math.Min(gx - 574, 703 - gx);
                            int dyCorner = Math.Min(gy - 442, 520 - gy);
                            if (dxCorner + dyCorner < 3) {
                                inInnerWindow = false;
                            }
                        }
                        if (inInnerWindow) {
                            patch.SetPixel(x, y, Color.FromArgb(0, 0, 0, 0));
                        } else {
                            patch.SetPixel(x, y, bg.GetPixel(gx, gy));
                        }
                    }
                }
                Directory.CreateDirectory(Path.GetDirectoryName(outOccluderPath));
                patch.Save(outOccluderPath, ImageFormat.Png);
            }
            Console.WriteLine("Built p9-stove-frame-occluder.png (178x122 at x=550, y=420)");
        }
    }

    public static void SliceSheet(string rawPath, string outPngPath, bool isStoveFire) {
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

            bool strict = !isStoveFire;
            Queue<Point> q = new Queue<Point>();
            for (int x = 0; x < W; x++) {
                if (IsMagenta(px[x, 0], strict)) { visited[x, 0] = true; q.Enqueue(new Point(x, 0)); }
                if (IsMagenta(px[x, H - 1], strict)) { visited[x, H - 1] = true; q.Enqueue(new Point(x, H - 1)); }
            }
            for (int y = 0; y < H; y++) {
                if (IsMagenta(px[0, y], strict) && !visited[0, y]) { visited[0, y] = true; q.Enqueue(new Point(0, y)); }
                if (IsMagenta(px[W - 1, y], strict) && !visited[W - 1, y]) { visited[W - 1, y] = true; q.Enqueue(new Point(W - 1, y)); }
            }

            int[] dx = new int[] { -1, 1, 0, 0, -1, 1, -1, 1 };
            int[] dy = new int[] { 0, 0, -1, 1, -1, -1, 1, 1 };
            while (q.Count > 0) {
                Point pt = q.Dequeue();
                px[pt.X, pt.Y] = Color.FromArgb(0, 0, 0, 0);
                for (int d = 0; d < 8; d++) {
                    int nx = pt.X + dx[d];
                    int ny = pt.Y + dy[d];
                    if (nx >= 0 && nx < W && ny >= 0 && ny < H && !visited[nx, ny] && IsMagenta(px[nx, ny], strict)) {
                        visited[nx, ny] = true;
                        q.Enqueue(new Point(nx, ny));
                    }
                }
            }

            if (isStoveFire) {
                for (int y = 1; y < H - 1; y++) {
                    for (int x = 1; x < W - 1; x++) {
                        if (!visited[x, y] && px[x, y].R > 215 && px[x, y].G < 45 && px[x, y].B > 210 && Math.Abs(px[x, y].R - px[x, y].B) < 30) {
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
                        if (nx >= 0 && nx < W && ny >= 0 && ny < H && !visited[nx, ny] && IsMagenta(px[nx, ny], strict)) {
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
                        // For Doggie, keep only the main Doggie body component (>= 1000px); for stove fire, keep >= 4px so ember sparks stay
                        if (comp.Count < (isStoveFire ? 4 : 1000)) {
                            foreach (Point pt in comp) {
                                px[pt.X, pt.Y] = Color.FromArgb(0, 0, 0, 0);
                            }
                        }
                    }
                }
            }

            // 2px perimeter de-spill + convert any bottom purple shadow on Doggie to soft floor shadow (R=30, G=22, B=18, alpha=115)
            for (int pass = 0; pass < 2; pass++) {
                Color[,] nextPx = (Color[,])px.Clone();
                for (int y = 0; y < H; y++) {
                    for (int x = 0; x < W; x++) {
                        Color c = px[x, y];
                        if (c.A == 0) continue;

                        if (!isStoveFire && y > (int)(H * 0.65) && c.R > 105 && c.B > 105 && c.G < 75 && Math.Abs(c.R - c.B) < 40) {
                            nextPx[x, y] = Color.FromArgb(115, 30, 22, 18);
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
                            if (isStoveFire) {
                                if (c.B > c.G + 18 && c.R > 120) {
                                    nextPx[x, y] = Color.FromArgb(0, 0, 0, 0);
                                }
                            } else {
                                if (c.G < 85 && (c.R > c.G + 28 && c.B > c.G + 28) && Math.Abs(c.R - c.B) < 42) {
                                    if (c.R > 135 && c.B > 125) {
                                        nextPx[x, y] = Color.FromArgb(0, 0, 0, 0);
                                    } else {
                                        int gVal = Math.Min(65, (int)c.G);
                                        nextPx[x, y] = Color.FromArgb(255, gVal, gVal, gVal);
                                    }
                                } else if ((c.R + c.B) > c.G * 2 + 65 && c.R > 120 && c.B > 115 && Math.Abs(c.R - c.B) < 42) {
                                    nextPx[x, y] = Color.FromArgb(0, 0, 0, 0);
                                }
                            }
                        }
                    }
                }
                px = nextPx;
            }

            Rectangle[] boxes = new Rectangle[3];
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
                } else {
                    boxes[f] = new Rectangle(minX, minY, maxX - minX + 1, maxY - minY + 1);
                }
                if (boxes[f].Width > maxFw) maxFw = boxes[f].Width;
                if (boxes[f].Height > maxFh) maxFh = boxes[f].Height;
            }

            int fw = maxFw + 12;
            if (fw % 2 != 0) fw++;
            int fh = maxFh + 12;
            if (fh % 2 != 0) fh++;

            using (Bitmap outBmp = new Bitmap(fw * 3, fh, PixelFormat.Format32bppArgb)) {
                outBmp.SetResolution(96, 96);
                for (int f = 0; f < 3; f++) {
                    Rectangle b = boxes[f];
                    int dstStartX = f * fw + (fw - b.Width) / 2;
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

    public static void DrawFrame0(Graphics g, string pngPath, float stageX, float stageY, float scaleX, float scaleY) {
        using (Bitmap sheet = new Bitmap(pngPath)) {
            sheet.SetResolution(96, 96);
            int fw = sheet.Width / 3;
            int fh = sheet.Height;
            float drawW = fw * scaleX;
            float drawH = fh * scaleY;
            RectangleF dst = new RectangleF(stageX - drawW * 0.5f, stageY - drawH * 0.5f, drawW, drawH);
            RectangleF src = new RectangleF(0, 0, fw, fh);
            g.DrawImage(sheet, dst, src, GraphicsUnit.Pixel);
        }
    }

    public static void RenderComposite(string bgPath, string outPath) {
        using (Bitmap bg = new Bitmap(bgPath))
        using (Bitmap stoveFrame = new Bitmap("public\\assets\\stories\\nana\\sprites\\p9-stove-frame-occluder.png"))
        using (Bitmap comp = new Bitmap(1280, 720, PixelFormat.Format32bppArgb)) {
            comp.SetResolution(96, 96);
            stoveFrame.SetResolution(96, 96);
            using (Graphics g = Graphics.FromImage(comp)) {
                g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
                g.DrawImage(bg, 0, 0, 1280, 720);

                using (Brush fireBg = new SolidBrush(Color.FromArgb(220, 234, 88, 12))) {
                    g.FillRectangle(fireBg, 573, 441, 131, 80);
                }

                g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.NearestNeighbor;
                g.PixelOffsetMode = System.Drawing.Drawing2D.PixelOffsetMode.Half;

                // 1. p9-stove-fire (depth 12)
                DrawFrame0(g, "public\\assets\\stories\\nana\\sprites\\p9-stove-fire.png", 639f, 472f, 0.50f, 0.50f);
                // 2. p9-stove-frame-occluder (depth 14)
                g.DrawImage(stoveFrame, 550, 420, 178, 122);
                // 3. p9-doggie-sleeping (depth 18)
                DrawFrame0(g, "public\\assets\\stories\\nana\\sprites\\p9-doggie-sleeping.png", 832f, 638f, 0.44f, 0.44f);
            }
            comp.Save(outPath, ImageFormat.Jpeg);
        }
    }
}
"@ -ReferencedAssemblies System.Drawing

[P9BuilderV3]::BuildStoveFrameOccluder("public\assets\stories\nana\p9-bg-clean.jpg", "public\assets\stories\nana\sprites\p9-stove-frame-occluder.png")
[P9BuilderV3]::SliceSheet("public\assets\stories\nana\raw\p9-stove-fire-raw.jpg", "public\assets\stories\nana\sprites\p9-stove-fire.png", $true)
[P9BuilderV3]::SliceSheet("public\assets\stories\nana\raw\p9-doggie-sleeping-raw.jpg", "public\assets\stories\nana\sprites\p9-doggie-sleeping.png", $false)

$artDir = "C:\Users\RobaD\.gemini\antigravity\brain\c157efef-ad7b-472f-a591-d3f1aea5976b"
[P9BuilderV3]::RenderComposite("public\assets\stories\nana\p9-bg-clean.jpg", "$artDir\p9_comp_preview3.jpg")
