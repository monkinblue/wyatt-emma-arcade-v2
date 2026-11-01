$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$csharpCode = @"
using System;
using System.Collections.Generic;
using System.IO;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public class P3PipelineV4 {
    public static void CleanSeatCushionToe(string srcArtifactPath, string cleanPath) {
        using (Bitmap bmp = new Bitmap(srcArtifactPath)) {
            int w = bmp.Width;
            int h = bmp.Height;
            // Region around (545, 610) in 1280x720 -> x: 525..575, y: 595..632
            // Sample reference color from x=620 (flat grey seat cushion to the right, NOT x=495 which is the dark armrest towel!)
            int x0 = (int)Math.Round(525.0 * w / 1280.0);
            int x1 = (int)Math.Round(575.0 * w / 1280.0);
            int y0 = (int)Math.Round(595.0 * h / 720.0);
            int y1 = (int)Math.Round(632.0 * h / 720.0);
            int refX = (int)Math.Round(620.0 * w / 1280.0);

            for (int y = y0; y <= y1; y++) {
                Color refCol = bmp.GetPixel(refX, y);
                for (int x = x0; x <= x1; x++) {
                    Color c = bmp.GetPixel(x, y);
                    // Only replace pixels on the grey cushion (brightness > 105) that deviate from the flat grey cushion row color
                    if ((c.R + c.G + c.B) > 315 && (Math.Abs(c.R - refCol.R) > 8 || Math.Abs(c.G - refCol.G) > 8 || Math.Abs(c.B - refCol.B) > 8)) {
                        bmp.SetPixel(x, y, refCol);
                    }
                }
            }

            ImageCodecInfo jpgEncoder = null;
            foreach (ImageCodecInfo codec in ImageCodecInfo.GetImageEncoders()) {
                if (codec.FormatID == ImageFormat.Jpeg.Guid) { jpgEncoder = codec; break; }
            }
            EncoderParameters ep = new EncoderParameters(1);
            ep.Param[0] = new EncoderParameter(Encoder.Quality, 96L);
            bmp.Save(cleanPath, jpgEncoder, ep);
        }
        Console.WriteLine("  [clean] Restored clean plate and seamlessly healed toe smudge at (545, 610) using grey cushion refX=620 on " + cleanPath);
    }

    public static void ExtractLampshadeOccluder(string bgPath, string outPath) {
        using (Bitmap rawBg = new Bitmap(bgPath)) {
            using (Bitmap bg1280 = new Bitmap(1280, 720, PixelFormat.Format32bppArgb)) {
                using (Graphics g = Graphics.FromImage(bg1280)) {
                    g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.NearestNeighbor;
                    g.PixelOffsetMode = System.Drawing.Drawing2D.PixelOffsetMode.Half;
                    g.DrawImage(rawBg, new Rectangle(0, 0, 1280, 720), new Rectangle(0, 0, rawBg.Width, rawBg.Height), GraphicsUnit.Pixel);
                }

                int cropX = 1170;
                int cropY = 215;
                int cropW = 110; // 1170..1280
                int cropH = 145; // 215..360

                using (Bitmap occ = new Bitmap(cropW, cropH, PixelFormat.Format32bppArgb)) {
                    for (int y = 0; y < cropH; y++) {
                        int sy = cropY + y;
                        // Scan from right to left (x = 1279 down to 1170) to find the lampshade silhouette on each row:
                        // The lampshade is at the right edge of the screen; its top border is a dark outline around y=236..242
                        // and its left edge slants down-left from (1196, 238) to (1180, 344).
                        for (int x = 0; x < cropW; x++) {
                            int sx = cropX + x;
                            Color c = bg1280.GetPixel(sx, sy);
                            occ.SetPixel(x, y, c);
                        }
                    }

                    // Flood-fill transparency from the top-left / top / left border through non-lampshade pixels
                    // (green wall, brown wooden photo frame, etc.) stopping at the dark charcoal outline of the lampshade!
                    bool[,] ext = new bool[cropW, cropH];
                    Queue<Point> q = new Queue<Point>();

                    // Seed top row (y=0) and left column (x=0) and bottom-left below lampshade
                    for (int x = 0; x < cropW; x++) {
                        ext[x, 0] = true;
                        q.Enqueue(new Point(x, 0));
                    }
                    for (int y = 0; y < cropH; y++) {
                        ext[0, y] = true;
                        q.Enqueue(new Point(0, y));
                    }

                    int[] dx = new int[] { -1, 1, 0, 0 };
                    int[] dy = new int[] { 0, 0, -1, 1 };

                    while (q.Count > 0) {
                        Point p = q.Dequeue();
                        for (int k = 0; k < 4; k++) {
                            int nx = p.X + dx[k];
                            int ny = p.Y + dy[k];
                            if (nx < 0 || nx >= cropW || ny < 0 || ny >= cropH) continue;
                            if (ext[nx, ny]) continue;

                            Color c = occ.GetPixel(nx, ny);
                            // Lampshade body is bright warm cream/white (R > 185, G > 175, B > 155)
                            // and its outer border is a dark charcoal outline (R < 65, G < 60, B < 65) at x >= 10 (sx >= 1180) and y >= 18 (sy >= 233).
                            bool isLampshadeBorder = (nx >= 8 && ny >= 18 && ny <= 135 && c.R < 70 && c.G < 65 && c.B < 70);
                            bool isLampshadeBody = (nx >= 9 && ny >= 19 && ny <= 135 && c.R > 175 && c.G > 165 && c.B > 145);

                            if (!isLampshadeBorder && !isLampshadeBody) {
                                ext[nx, ny] = true;
                                q.Enqueue(new Point(nx, ny));
                            }
                        }
                    }

                    for (int y = 0; y < cropH; y++) {
                        for (int x = 0; x < cropW; x++) {
                            if (ext[x, y]) {
                                occ.SetPixel(x, y, Color.FromArgb(0, 0, 0, 0));
                            }
                        }
                    }

                    occ.Save(outPath, ImageFormat.Png);
                }
            }
        }
        Console.WriteLine("  [occluder] Extracted p3-lampshade-occluder.png (110x145 at 1170, 215)");
    }

    public static void SliceSpriteBfs(string rawPath, string outPath, bool bottomAnchor, double maxYRatio, double shearSlope) {
        using (Bitmap srcBmp = new Bitmap(rawPath)) {
            int w = srcBmp.Width;
            int h = (int)Math.Round(srcBmp.Height * maxYRatio);
            Bitmap rgbaBmp = new Bitmap(w, h, PixelFormat.Format32bppArgb);
            using (Graphics g = Graphics.FromImage(rgbaBmp)) {
                g.DrawImage(srcBmp, new Rectangle(0, 0, w, h), new Rectangle(0, 0, w, h), GraphicsUnit.Pixel);
            }

            BitmapData bd = rgbaBmp.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
            int stride = bd.Stride;
            byte[] buf = new byte[stride * h];
            Marshal.Copy(bd.Scan0, buf, 0, buf.Length);

            int numFrames = 3;
            int colW = w / numFrames;
            bool[] isBg = new bool[w * h];
            Queue<int> q = new Queue<int>();

            for (int f = 0; f < numFrames; f++) {
                int xStart = f * colW;
                int xEnd = (f == numFrames - 1) ? (w - 1) : ((f + 1) * colW - 1);

                for (int x = xStart; x <= xEnd; x++) {
                    int topIdx = x;
                    int botIdx = (h - 1) * w + x;
                    if (!isBg[topIdx]) { isBg[topIdx] = true; q.Enqueue(topIdx); }
                    if (!isBg[botIdx]) { isBg[botIdx] = true; q.Enqueue(botIdx); }
                }
                for (int y = 0; y < h; y++) {
                    int leftIdx = y * w + xStart;
                    int rightIdx = y * w + xEnd;
                    if (!isBg[leftIdx]) { isBg[leftIdx] = true; q.Enqueue(leftIdx); }
                    if (!isBg[rightIdx]) { isBg[rightIdx] = true; q.Enqueue(rightIdx); }
                }
            }

            // Seed interior magenta holes (e.g. between Grammy's ankles or by Wyatt's ear: R > 175, G < 65, B > 175, R-G > 120, B-G > 120)
            // Note: Emma's lavender shirt and pacifier have G >= 95, so G < 65 never touches them!
            for (int y = 0; y < h; y++) {
                int row = y * stride;
                for (int x = 0; x < w; x++) {
                    int pIdx = y * w + x;
                    if (isBg[pIdx]) continue;
                    int idx = row + x * 4;
                    int b = buf[idx];
                    int g = buf[idx + 1];
                    int r = buf[idx + 2];
                    if (r > 175 && g < 65 && b > 175 && (r - g) > 120 && (b - g) > 120) {
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

                    if (r > 145 && g < 92 && b > 145 && (r - g) > 75 && (b - g) > 75) {
                        isBg[nPos] = true;
                        q.Enqueue(nPos);
                    }
                }
            }

            // Clear flood-filled background
            for (int y = 0; y < h; y++) {
                int row = y * stride;
                for (int x = 0; x < w; x++) {
                    if (isBg[y * w + x]) {
                        int idx = row + x * 4;
                        buf[idx] = 0;
                        buf[idx + 1] = 0;
                        buf[idx + 2] = 0;
                        buf[idx + 3] = 0;
                    }
                }
            }

            // 2-Pass Morphological Border Cleanup ONLY on the outer 2-pixel perimeter touching alpha == 0
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

                        // Check for magenta/maroon fringe on the 2px outer border
                        if (g < 85 && (r > g + 28 || b > g + 28)) {
                            if ((r + b) > 150 && g < 55 && r > g + 40 && b > g + 30) {
                                // Outer bright magenta/purple anti-aliased fringe -> transparent
                                buf[idx] = 0;
                                buf[idx + 1] = 0;
                                buf[idx + 2] = 0;
                                buf[idx + 3] = 0;
                            } else {
                                // Dark maroon/magenta outline pixel -> clean neutral dark charcoal outline (R = G, B = G)
                                buf[idx] = (byte)g;
                                buf[idx + 2] = (byte)g;
                            }
                        } else if (b > g + 22 && r > g + 22) {
                            // Lighter magenta spill right on the 1-2px outer border -> clamp both R and B toward G
                            buf[idx] = (byte)g;
                            buf[idx + 2] = (byte)g;
                        }
                    }
                }
            }

            // Keep ONLY the largest connected component in each frame (erases Wyatt's stray foot crossing from Frame 1 into Frame 0!)
            Rectangle[] boxes = new Rectangle[numFrames];
            int maxFw = 16;
            int maxFh = 16;
            int[] compId = new int[w * h];

            for (int f = 0; f < numFrames; f++) {
                int x0 = f * colW + 4;
                int x1 = (f == numFrames - 1 ? w : (f + 1) * colW) - 4;
                int y0 = 4;
                int y1 = h - (maxYRatio < 1.0 ? 1 : 4);

                // Zero out the 4px column seam margin first so components cannot bridge across frames
                for (int y = 0; y < h; y++) {
                    for (int x = f * colW; x < x0; x++) {
                        int idx = y * stride + x * 4;
                        buf[idx] = buf[idx + 1] = buf[idx + 2] = buf[idx + 3] = 0;
                    }
                    int colEnd = (f == numFrames - 1 ? w : (f + 1) * colW);
                    for (int x = x1; x < colEnd; x++) {
                        int idx = y * stride + x * 4;
                        buf[idx] = buf[idx + 1] = buf[idx + 2] = buf[idx + 3] = 0;
                    }
                }

                int bestLabel = -1;
                int bestCount = 0;
                int curLabel = f * 10000 + 1;
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

                        if (count > bestCount) {
                            bestCount = count;
                            bestLabel = label;
                        }
                    }
                }

                int minX = x1, maxX = x0, minY = y1, maxY = y0;
                bool found = false;

                for (int y = y0; y < y1; y++) {
                    int row = y * stride;
                    for (int x = x0; x < x1; x++) {
                        int pos = y * w + x;
                        int idx = row + x * 4;
                        if (compId[pos] == bestLabel && bestLabel != -1) {
                            found = true;
                            if (x < minX) minX = x;
                            if (x > maxX) maxX = x;
                            if (y < minY) minY = y;
                            if (y > maxY) maxY = y;
                        } else {
                            // Erase any disconnected floating island (such as the stray foot on Frame 0's right edge!)
                            buf[idx] = 0;
                            buf[idx + 1] = 0;
                            buf[idx + 2] = 0;
                            buf[idx + 3] = 0;
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
                    boxes[f] = new Rectangle(x0, y0, colW - 8, h - 8);
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
                        int dstX = f * cellW + (cellW - b.Width) / 2;
                        int baseDstY = bottomAnchor ? (cellH - padY - b.Height) : ((cellH - b.Height) / 2);

                        if (Math.Abs(shearSlope) < 0.001) {
                            gs.DrawImage(rgbaBmp, new Rectangle(dstX, baseDstY, b.Width, b.Height), b, GraphicsUnit.Pixel);
                        } else {
                            double halfW = b.Width / 2.0;
                            for (int col = 0; col < b.Width; col++) {
                                int dy = (int)Math.Round(shearSlope * (col - halfW));
                                gs.DrawImage(
                                    rgbaBmp,
                                    new Rectangle(dstX + col, baseDstY + dy, 1, b.Height),
                                    new Rectangle(b.X + col, b.Y, 1, b.Height),
                                    GraphicsUnit.Pixel
                                );
                            }
                        }
                    }
                }
                sheet.Save(outPath, ImageFormat.Png);
            }
            rgbaBmp.Dispose();
            Console.WriteLine(string.Format("  [sprite] {0} -> frameWidth: {1}, frameHeight: {2}, sheet: {3}x{4} (shear={5})",
                Path.GetFileName(outPath), cellW, cellH, cellW * numFrames, cellH, shearSlope));
        }
    }
}
"@

Add-Type -TypeDefinition $csharpCode -ReferencedAssemblies System.Drawing

Write-Host "=== 1. Restoring & Cleaning Seat Cushion on p3-bg-clean.jpg ==="
[P3PipelineV4]::CleanSeatCushionToe("C:\Users\RobaD\.gemini\antigravity\brain\c157efef-ad7b-472f-a591-d3f1aea5976b\p3_bg_clean_empty_recliner_1793151178798.jpg", "public/assets/stories/nana/p3-bg-clean.jpg")

Write-Host "=== 2. Extracting Foreground Lampshade Occluder from p3-bg-clean.jpg ==="
[P3PipelineV4]::ExtractLampshadeOccluder("public/assets/stories/nana/p3-bg-clean.jpg", "public/assets/stories/nana/sprites/p3-lampshade-occluder.png")

Write-Host "=== 3. Re-Slicing Page 3 Sprites with Largest-Component Filter & 2px Charcoal Border Cleanup ==="
[P3PipelineV4]::SliceSpriteBfs("public/assets/stories/nana/raw/p3-grammy-kids-raw.png", "public/assets/stories/nana/sprites/p3-grammy-kids.png", $true, 0.80, 0.0)
[P3PipelineV4]::SliceSpriteBfs("public/assets/stories/nana/raw/p3-painting-1-raw.png", "public/assets/stories/nana/sprites/p3-painting-1.png", $false, 1.0, 0.08)
[P3PipelineV4]::SliceSpriteBfs("public/assets/stories/nana/raw/p3-painting-2-raw.png", "public/assets/stories/nana/sprites/p3-painting-2.png", $false, 1.0, 0.08)
[P3PipelineV4]::SliceSpriteBfs("public/assets/stories/nana/raw/p3-painting-3-raw.png", "public/assets/stories/nana/sprites/p3-painting-3.png", $false, 1.0, 0.08)
[P3PipelineV4]::SliceSpriteBfs("public/assets/stories/nana/raw/p3-photo-1-raw.png", "public/assets/stories/nana/sprites/p3-photo-1.png", $false, 1.0, -0.105)
[P3PipelineV4]::SliceSpriteBfs("public/assets/stories/nana/raw/p3-photo-2-raw.png", "public/assets/stories/nana/sprites/p3-photo-2.png", $false, 1.0, -0.105)
[P3PipelineV4]::SliceSpriteBfs("public/assets/stories/nana/raw/p3-photo-3-raw.png", "public/assets/stories/nana/sprites/p3-photo-3.png", $false, 1.0, -0.105)
[P3PipelineV4]::SliceSpriteBfs("public/assets/stories/nana/raw/p3-photo-4-raw.png", "public/assets/stories/nana/sprites/p3-photo-4.png", $false, 1.0, -0.105)
