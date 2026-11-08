Add-Type -AssemblyName System.Drawing

$csharpCode = @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Drawing.Text;
using System.IO;
using System.Runtime.InteropServices;

public static class StarshipAssetBuilder
{
    private static bool IsInsideDiceFace(int x, int y, int w, int h)
    {
        // Protect the two floating 3D titanium dice on the left of the rocket
        double nx = (double)x / w;
        double ny = (double)y / h;
        // Upper die center ~(0.338, 0.294), Lower die center ~(0.258, 0.398)
        double d1 = Math.Sqrt(Math.Pow((nx - 0.338) / 0.052, 2) + Math.Pow((ny - 0.294) / 0.048, 2));
        double d2 = Math.Sqrt(Math.Pow((nx - 0.258) / 0.052, 2) + Math.Pow((ny - 0.398) / 0.048, 2));
        return (d1 <= 1.0 || d2 <= 1.0);
    }

    private static bool IsMagentaPixel(int r, int g, int b, int x, int y, int w, int h)
    {
        if (IsInsideDiceFace(x, y, w, h))
        {
            return (r > 215 && g < 30 && b > 205);
        }
        // Dark magenta floor shadow below the mahogany base
        if (y > (int)(h * 0.85) && r > 65 && g < 45 && b > 65 && (r - g) + (b - g) > 65 && b > g + 20)
        {
            return true;
        }
        if (r > 165 && g < 85 && b > 155 && (r - g) + (b - g) > 210 && b > g + 60)
        {
            return true;
        }
        if (r > 125 && g < 55 && b > 115 && (r - g) + (b - g) > 160 && b > g + 50)
        {
            return true;
        }
        return false;
    }

    private static bool IsTrueInteriorMagenta(int r, int g, int b, int x, int y, int w, int h)
    {
        if (IsInsideDiceFace(x, y, w, h)) return false;
        return (r > 225 && g < 32 && b > 215 && (r + b - 2 * g) > 390);
    }

    private static bool HasPurpleCast(int r, int g, int b)
    {
        return (b > g + 6 && r > g + 12 && b > (int)(r * 0.40));
    }

    public static Bitmap ChromaKeyAndCrop(Bitmap src, int targetHeight, int pad)
    {
        int w = src.Width;
        int h = src.Height;
        Bitmap bmp = new Bitmap(w, h, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(bmp))
        {
            g.DrawImage(src, 0, 0, w, h);
        }

        Rectangle rect = new Rectangle(0, 0, w, h);
        BitmapData data = bmp.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
        int stride = data.Stride;
        byte[] bytes = new byte[stride * h];
        Marshal.Copy(data.Scan0, bytes, 0, bytes.Length);

        bool[] visited = new bool[w * h];
        Queue<int> q = new Queue<int>();

        for (int x = 0; x < w; x++)
        {
            int[] ys = new int[] { 0, 1, h - 2, h - 1 };
            foreach (int y in ys)
            {
                if (y < 0 || y >= h) continue;
                int idx = y * w + x;
                int off = y * stride + x * 4;
                if (!visited[idx] && IsMagentaPixel(bytes[off + 2], bytes[off + 1], bytes[off], x, y, w, h))
                {
                    visited[idx] = true;
                    q.Enqueue(idx);
                }
            }
        }

        for (int y = 0; y < h; y++)
        {
            int[] xs = new int[] { 0, 1, w - 2, w - 1 };
            foreach (int x in xs)
            {
                if (x < 0 || x >= w) continue;
                int idx = y * w + x;
                int off = y * stride + x * 4;
                if (!visited[idx] && IsMagentaPixel(bytes[off + 2], bytes[off + 1], bytes[off], x, y, w, h))
                {
                    visited[idx] = true;
                    q.Enqueue(idx);
                }
            }
        }

        for (int y = 0; y < h; y++)
        {
            int rowOff = y * stride;
            int rowIdx = y * w;
            for (int x = 0; x < w; x++)
            {
                int idx = rowIdx + x;
                if (!visited[idx])
                {
                    int off = rowOff + x * 4;
                    if (IsTrueInteriorMagenta(bytes[off + 2], bytes[off + 1], bytes[off], x, y, w, h))
                    {
                        visited[idx] = true;
                        q.Enqueue(idx);
                    }
                }
            }
        }

        int[] dx8 = new int[] { -1, 0, 1, -1, 1, -1, 0, 1 };
        int[] dy8 = new int[] { -1, -1, -1, 0, 0, 1, 1, 1 };

        while (q.Count > 0)
        {
            int curr = q.Dequeue();
            int cx = curr % w;
            int cy = curr / w;
            int off = cy * stride + cx * 4;
            bytes[off] = 0;
            bytes[off + 1] = 0;
            bytes[off + 2] = 0;
            bytes[off + 3] = 0;

            for (int i = 0; i < 8; i++)
            {
                int nx = cx + dx8[i];
                int ny = cy + dy8[i];
                if (nx >= 0 && nx < w && ny >= 0 && ny < h)
                {
                    int nidx = ny * w + nx;
                    if (!visited[nidx])
                    {
                        int noff = ny * stride + nx * 4;
                        if (IsMagentaPixel(bytes[noff + 2], bytes[noff + 1], bytes[noff], nx, ny, w, h))
                        {
                            visited[nidx] = true;
                            q.Enqueue(nidx);
                        }
                    }
                }
            }
        }

        // Remove isolated 1-2px specks
        byte[] aSnap = new byte[w * h];
        for (int i = 0; i < w * h; i++) aSnap[i] = bytes[(i / w) * stride + (i % w) * 4 + 3];
        for (int y = 1; y < h - 1; y++)
        {
            int rowOff = y * stride;
            for (int x = 1; x < w - 1; x++)
            {
                if (aSnap[y * w + x] == 0) continue;
                int neighbors = 0;
                for (int i = 0; i < 8; i++)
                {
                    if (aSnap[(y + dy8[i]) * w + (x + dx8[i])] > 0) neighbors++;
                }
                if (neighbors <= 1)
                {
                    int off = rowOff + x * 4;
                    bytes[off] = 0;
                    bytes[off + 1] = 0;
                    bytes[off + 2] = 0;
                    bytes[off + 3] = 0;
                }
            }
        }

        // 3px perimeter de-spill
        for (int i = 0; i < w * h; i++) aSnap[i] = bytes[(i / w) * stride + (i % w) * 4 + 3];
        for (int y = 0; y < h; y++)
        {
            int rowOff = y * stride;
            for (int x = 0; x < w; x++)
            {
                if (aSnap[y * w + x] == 0) continue;
                int minDistSq = 999;
                for (int dy = -3; dy <= 3; dy++)
                {
                    int ny = y + dy;
                    if (ny < 0 || ny >= h) continue;
                    for (int dx = -3; dx <= 3; dx++)
                    {
                        int nx = x + dx;
                        if (nx < 0 || nx >= w) continue;
                        if (aSnap[ny * w + nx] == 0)
                        {
                            int d2 = dx * dx + dy * dy;
                            if (d2 < minDistSq) minDistSq = d2;
                        }
                    }
                }
                if (minDistSq <= 9)
                {
                    int off = rowOff + x * 4;
                    int b = bytes[off];
                    int g = bytes[off + 1];
                    int r = bytes[off + 2];
                    int a = bytes[off + 3];
                    if (HasPurpleCast(r, g, b))
                    {
                        int avg = (r + g + b) / 3;
                        bytes[off] = (byte)Math.Min(b, avg);
                        bytes[off + 1] = (byte)Math.Max(g, (int)(avg * 0.92));
                        bytes[off + 2] = (byte)Math.Min(r, (int)(avg * 1.05));
                        if (minDistSq <= 2)
                        {
                            bytes[off + 3] = (byte)(a * 0.65);
                        }
                    }
                }
            }
        }

        Marshal.Copy(bytes, 0, data.Scan0, bytes.Length);
        bmp.UnlockBits(data);

        Bitmap cropped = AutoCrop(bmp, pad);
        bmp.Dispose();

        if (targetHeight <= 0 || cropped.Height == targetHeight)
        {
            return cropped;
        }

        double scale = (double)targetHeight / (double)cropped.Height;
        int outW = Math.Max(1, (int)Math.Round(cropped.Width * scale));
        int outH = targetHeight;

        Bitmap resized = new Bitmap(outW, outH, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(resized))
        {
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            g.SmoothingMode = SmoothingMode.HighQuality;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;
            g.CompositingQuality = CompositingQuality.HighQuality;
            g.DrawImage(cropped, new Rectangle(0, 0, outW, outH));
        }
        cropped.Dispose();
        return resized;
    }

    public static Bitmap AutoCrop(Bitmap src, int pad)
    {
        int w = src.Width;
        int h = src.Height;
        Rectangle rect = new Rectangle(0, 0, w, h);
        BitmapData data = src.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
        int stride = data.Stride;
        byte[] bytes = new byte[stride * h];
        Marshal.Copy(data.Scan0, bytes, 0, bytes.Length);
        src.UnlockBits(data);

        int minX = w, minY = h, maxX = -1, maxY = -1;
        for (int y = 0; y < h; y++)
        {
            int rowOff = y * stride;
            for (int x = 0; x < w; x++)
            {
                if (bytes[rowOff + x * 4 + 3] > 12)
                {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }

        if (maxX < minX || maxY < minY)
        {
            return (Bitmap)src.Clone();
        }

        int cw = maxX - minX + 1;
        int ch = maxY - minY + 1;
        Bitmap outBmp = new Bitmap(cw + pad * 2, ch + pad * 2, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(outBmp))
        {
            g.DrawImage(src, new Rectangle(pad, pad, cw, ch), new Rectangle(minX, minY, cw, ch), GraphicsUnit.Pixel);
        }
        return outBmp;
    }

    private static GraphicsPath CreateHexPath(float cx, float cy, float radius)
    {
        PointF[] pts = new PointF[6];
        for (int i = 0; i < 6; i++)
        {
            double angle = (Math.PI / 180.0) * (60.0 * i - 90.0);
            pts[i] = new PointF(
                cx + (float)(radius * Math.Cos(angle)),
                cy + (float)(radius * Math.Sin(angle))
            );
        }
        GraphicsPath path = new GraphicsPath();
        path.AddPolygon(pts);
        return path;
    }

    private static GraphicsPath CreateRoundedRectPath(float x, float y, float w, float h, float r)
    {
        float d = r * 2f;
        GraphicsPath path = new GraphicsPath();
        path.AddArc(x, y, d, d, 180, 90);
        path.AddArc(x + w - d, y, d, d, 270, 90);
        path.AddArc(x + w - d, y + h - d, d, d, 0, 90);
        path.AddArc(x, y + h - d, d, d, 90, 90);
        path.CloseFigure();
        return path;
    }

    public static Bitmap BuildHexAvatarCard(
        Bitmap portrait,
        string nameLabel,
        string roleSubtitle,
        Color accentColor
    )
    {
        int W = 380;
        int H = 430;
        Bitmap card = new Bitmap(W, H, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(card))
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;
            g.TextRenderingHint = TextRenderingHint.AntiAliasGridFit;

            float cx = W / 2f;
            float cy = 186f;
            float outerR = 166f;
            float midR = 154f;
            float innerR = 144f;

            // 1. Soft outer drop shadow & neon aura glow
            using (GraphicsPath glowPath = CreateHexPath(cx, cy + 4f, outerR + 8f))
            using (SolidBrush shadowBr = new SolidBrush(Color.FromArgb(145, 4, 8, 18)))
            {
                g.FillPath(shadowBr, glowPath);
            }

            // 2. Outer Brushed-Titanium Hexagonal Armor Bezel
            using (GraphicsPath outerHex = CreateHexPath(cx, cy, outerR))
            using (LinearGradientBrush tiBrush = new LinearGradientBrush(
                new PointF(0, 10),
                new PointF(W, H - 80),
                Color.FromArgb(255, 212, 222, 235),
                Color.FromArgb(255, 58, 70, 88)))
            {
                ColorBlend cb = new ColorBlend(5);
                cb.Colors = new Color[] {
                    Color.FromArgb(255, 226, 232, 240),
                    Color.FromArgb(255, 100, 116, 139),
                    Color.FromArgb(255, 186, 198, 214),
                    Color.FromArgb(255, 51, 65, 85),
                    Color.FromArgb(255, 148, 163, 184)
                };
                cb.Positions = new float[] { 0f, 0.28f, 0.52f, 0.78f, 1f };
                tiBrush.InterpolationColors = cb;
                g.FillPath(tiBrush, outerHex);

                using (Pen edgePen = new Pen(Color.FromArgb(230, 241, 245, 249), 2.5f))
                {
                    g.DrawPath(edgePen, outerHex);
                }
            }

            // 3. Dark Carbon-Fiber Recessed Channel + Neon Telemetry Accent Ring
            using (GraphicsPath midHex = CreateHexPath(cx, cy, midR))
            using (SolidBrush carbonBr = new SolidBrush(Color.FromArgb(255, 15, 23, 42)))
            {
                g.FillPath(carbonBr, midHex);
                using (Pen neonGlowPen = new Pen(Color.FromArgb(115, accentColor), 7f))
                {
                    g.DrawPath(neonGlowPen, midHex);
                }
                using (Pen neonCorePen = new Pen(accentColor, 2.8f))
                {
                    g.DrawPath(neonCorePen, midHex);
                }
            }

            // 4. Clipped Photorealistic Astronaut Portrait inside Inner Hexagon
            using (GraphicsPath innerHex = CreateHexPath(cx, cy, innerR))
            {
                GraphicsState state = g.Save();
                g.SetClip(innerHex);
                float imgSize = innerR * 2.04f;
                g.DrawImage(
                    portrait,
                    new RectangleF(cx - imgSize / 2f, cy - imgSize / 2f, imgSize, imgSize),
                    new RectangleF(0, 0, portrait.Width, portrait.Height),
                    GraphicsUnit.Pixel
                );

                // Subtle top-left glass specular sheen
                using (LinearGradientBrush glassSheen = new LinearGradientBrush(
                    new PointF(cx - innerR, cy - innerR),
                    new PointF(cx + innerR * 0.4f, cy + innerR * 0.4f),
                    Color.FromArgb(48, 255, 255, 255),
                    Color.FromArgb(0, 255, 255, 255)))
                {
                    g.FillRectangle(glassSheen, cx - innerR, cy - innerR, innerR * 2f, innerR * 2f);
                }
                g.Restore(state);

                using (Pen innerRimPen = new Pen(Color.FromArgb(210, 255, 255, 255), 1.8f))
                {
                    g.DrawPath(innerRimPen, innerHex);
                }
            }

            // 5. Six Anodized FICSIT Hex Bolts on the 6 vertices of the Titanium Frame
            for (int i = 0; i < 6; i++)
            {
                double angle = (Math.PI / 180.0) * (60.0 * i - 90.0);
                float bx = cx + (float)((outerR - 6.5f) * Math.Cos(angle));
                float by = cy + (float)((outerR - 6.5f) * Math.Sin(angle));
                using (SolidBrush boltBg = new SolidBrush(Color.FromArgb(255, 30, 41, 59)))
                using (Pen boltRim = new Pen(accentColor, 1.5f))
                {
                    g.FillEllipse(boltBg, bx - 4.5f, by - 4.5f, 9f, 9f);
                    g.DrawEllipse(boltRim, bx - 4.5f, by - 4.5f, 9f, 9f);
                }
            }

            // 6. Illuminated Brushed-Titanium & FICSIT Nameplate Banner Underneath
            float bannerW = 316f;
            float bannerH = 68f;
            float bannerX = cx - bannerW / 2f;
            float bannerY = 336f;

            using (GraphicsPath shadowBanner = CreateRoundedRectPath(bannerX + 2f, bannerY + 4f, bannerW, bannerH, 14f))
            using (SolidBrush bShadow = new SolidBrush(Color.FromArgb(180, 2, 6, 14)))
            {
                g.FillPath(bShadow, shadowBanner);
            }

            using (GraphicsPath bannerPath = CreateRoundedRectPath(bannerX, bannerY, bannerW, bannerH, 14f))
            using (LinearGradientBrush bannerFill = new LinearGradientBrush(
                new PointF(bannerX, bannerY),
                new PointF(bannerX, bannerY + bannerH),
                Color.FromArgb(250, 15, 23, 42),
                Color.FromArgb(252, 7, 11, 22)))
            {
                g.FillPath(bannerFill, bannerPath);

                // Top FICSIT telemetry light bar inside banner
                using (GraphicsPath topStrip = CreateRoundedRectPath(bannerX + 18f, bannerY + 3f, bannerW - 36f, 4f, 2f))
                using (SolidBrush stripBr = new SolidBrush(accentColor))
                {
                    g.FillPath(stripBr, topStrip);
                }

                using (Pen outerBorder = new Pen(Color.FromArgb(240, 203, 213, 225), 2.6f))
                {
                    g.DrawPath(outerBorder, bannerPath);
                }
            }

            using (GraphicsPath innerBannerPath = CreateRoundedRectPath(bannerX + 4f, bannerY + 4f, bannerW - 8f, bannerH - 8f, 11f))
            using (Pen accentBorder = new Pen(Color.FromArgb(190, accentColor), 1.5f))
            {
                g.DrawPath(accentBorder, innerBannerPath);
            }

            // Name & Role Subtitle Typography
            StringFormat sf = new StringFormat();
            sf.Alignment = StringAlignment.Center;
            sf.LineAlignment = StringAlignment.Center;

            using (Font nameFont = new Font("Segoe UI", 21f, FontStyle.Bold, GraphicsUnit.Pixel))
            using (Font roleFont = new Font("Segoe UI", 12.5f, FontStyle.Bold, GraphicsUnit.Pixel))
            using (SolidBrush glowTxtBr = new SolidBrush(Color.FromArgb(120, accentColor)))
            using (SolidBrush whiteBr = new SolidBrush(Color.FromArgb(255, 248, 250, 252)))
            using (SolidBrush subBr = new SolidBrush(accentColor))
            {
                RectangleF nameRectGlow = new RectangleF(bannerX, bannerY + 9f, bannerW, 30f);
                RectangleF nameRect = new RectangleF(bannerX, bannerY + 8f, bannerW, 30f);
                g.DrawString(nameLabel, nameFont, glowTxtBr, nameRectGlow, sf);
                g.DrawString(nameLabel, nameFont, whiteBr, nameRect, sf);

                RectangleF subRect = new RectangleF(bannerX, bannerY + 38f, bannerW, 22f);
                g.DrawString(roleSubtitle, roleFont, subBr, subRect, sf);
            }
        }
        return card;
    }

    public static Bitmap BuildBoardToken(Bitmap portrait, Color accentColor)
    {
        int S = 256;
        Bitmap token = new Bitmap(S, S, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(token))
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;

            float cx = S / 2f;
            float cy = S / 2f;
            float outerR = 118f;
            float ringR = 106f;
            float innerR = 96f;

            // Drop shadow
            using (SolidBrush sh = new SolidBrush(Color.FromArgb(140, 0, 0, 0)))
            {
                g.FillEllipse(sh, cx - outerR + 3f, cy - outerR + 5f, outerR * 2f, outerR * 2f);
            }

            // Brushed Titanium Outer Ring
            using (LinearGradientBrush ti = new LinearGradientBrush(
                new PointF(0, 0),
                new PointF(S, S),
                Color.FromArgb(255, 241, 245, 249),
                Color.FromArgb(255, 51, 65, 85)))
            {
                g.FillEllipse(ti, cx - outerR, cy - outerR, outerR * 2f, outerR * 2f);
            }

            // Glowing Accent Ring
            using (SolidBrush darkTrack = new SolidBrush(Color.FromArgb(255, 15, 23, 42)))
            using (Pen accentPen = new Pen(accentColor, 6f))
            {
                g.FillEllipse(darkTrack, cx - ringR, cy - ringR, ringR * 2f, ringR * 2f);
                g.DrawEllipse(accentPen, cx - ringR + 3f, cy - ringR + 3f, (ringR - 3f) * 2f, (ringR - 3f) * 2f);
            }

            // Clipped Circular Portrait
            using (GraphicsPath circleClip = new GraphicsPath())
            {
                circleClip.AddEllipse(cx - innerR, cy - innerR, innerR * 2f, innerR * 2f);
                GraphicsState st = g.Save();
                g.SetClip(circleClip);
                g.DrawImage(
                    portrait,
                    new RectangleF(cx - innerR, cy - innerR, innerR * 2f, innerR * 2f),
                    new RectangleF(0, 0, portrait.Width, portrait.Height),
                    GraphicsUnit.Pixel
                );

                // Specular glass arc (top-left diagonal sheen, zero wrap line)
                using (LinearGradientBrush sheen = new LinearGradientBrush(
                    new PointF(cx - innerR, cy - innerR),
                    new PointF(cx + innerR, cy + innerR),
                    Color.FromArgb(42, 255, 255, 255),
                    Color.FromArgb(0, 255, 255, 255)))
                {
                    g.FillRectangle(sheen, cx - innerR, cy - innerR, innerR * 2f, innerR * 2f);
                }
                g.Restore(st);

                using (Pen innerRim = new Pen(Color.FromArgb(220, 255, 255, 255), 2.2f))
                {
                    g.DrawPath(innerRim, circleClip);
                }
            }
        }
        return token;
    }

    public static void SaveHighResJpeg(Bitmap src, int targetW, int targetH, string outPath)
    {
        Bitmap resized = new Bitmap(targetW, targetH, PixelFormat.Format24bppRgb);
        using (Graphics g = Graphics.FromImage(resized))
        {
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            g.SmoothingMode = SmoothingMode.HighQuality;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;
            g.CompositingQuality = CompositingQuality.HighQuality;
            g.DrawImage(src, new Rectangle(0, 0, targetW, targetH));
        }

        ImageCodecInfo jpgEncoder = null;
        foreach (ImageCodecInfo codec in ImageCodecInfo.GetImageEncoders())
        {
            if (codec.FormatID == ImageFormat.Jpeg.Guid)
            {
                jpgEncoder = codec;
                break;
            }
        }

        EncoderParameters encParams = new EncoderParameters(1);
        encParams.Param[0] = new EncoderParameter(Encoder.Quality, 92L);
        resized.Save(outPath, jpgEncoder, encParams);
        resized.Dispose();
    }
}
"@

Add-Type -TypeDefinition $csharpCode -ReferencedAssemblies System.Drawing

$rootDir = Split-Path -Parent $PSScriptRoot
$gameDir = Join-Path $rootDir "public\assets\games\starship-unicorn"
$rawDir = Join-Path $gameDir "raw"
$portraitsDir = Join-Path $gameDir "portraits"
$cardsDir = Join-Path $gameDir "cards"
$tokensDir = Join-Path $gameDir "tokens"

foreach ($d in @($portraitsDir, $cardsDir, $tokensDir)) {
    if (-not (Test-Path $d)) {
        New-Item -ItemType Directory -Force -Path $d | Out-Null
    }
}

$roster = @(
    @{ Id = "robert";   Name = "ROBERT";    Role = "MISSION COMMANDER";   R = 245; G = 158; B = 11 },
    @{ Id = "rita";     Name = "RITA";      Role = "FLIGHT DIRECTOR";     R = 56;  G = 189; B = 248 },
    @{ Id = "wyatt";    Name = "WYATT";     Role = "ASTRO-RANGER (4YO)";  R = 16;  G = 185; B = 129 },
    @{ Id = "emma";     Name = "EMMA";      Role = "SPACE PRINCESS (3YO)";R = 244; G = 114; B = 182 },
    @{ Id = "papa";     Name = "PAPA";      Role = "CHIEF ENGINEER";      R = 59;  G = 130; B = 246 },
    @{ Id = "nana";     Name = "NANA";      Role = "SHIP'S COUNSELOR";    R = 14;  G = 165; B = 233 },
    @{ Id = "grandpa";  Name = "GRANDPA";   Role = "FLEET ADMIRAL";       R = 148; G = 163; B = 184 },
    @{ Id = "babci";    Name = "BABCI";     Role = "ORBITAL NAVIGATOR";   R = 192; G = 132; B = 252 },
    @{ Id = "guest";    Name = "GUEST";     Role = "MISSION SPECIALIST";  R = 250; G = 204; B = 21 },
    @{ Id = "dreadbot"; Name = "DREAD-BOT"; Role = "ROGUE A.I. X-99";     R = 255; G = 34;  B = 85 }
)

$starshipDir = Join-Path $rootDir "public\assets\starship"
if (-not (Test-Path $starshipDir)) {
    New-Item -ItemType Directory -Force -Path $starshipDir | Out-Null
}

foreach ($c in $roster) {
    $rawPath = Join-Path $rawDir "astro_$($c.Id)_raw.png"
    if (-not (Test-Path $rawPath)) {
        Write-Warning "Missing raw portrait: $rawPath"
        continue
    }

    $srcBmp = [System.Drawing.Bitmap]::FromFile($rawPath)

    # 1. Save clean 512x512 HD portrait
    $cleanPortrait = New-Object System.Drawing.Bitmap(512, 512, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $gPort = [System.Drawing.Graphics]::FromImage($cleanPortrait)
    $gPort.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $gPort.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $gPort.DrawImage($srcBmp, (New-Object System.Drawing.Rectangle(0, 0, 512, 512)))
    $gPort.Dispose()

    $portraitPath = Join-Path $portraitsDir "astro_$($c.Id).png"
    $cleanPortrait.Save($portraitPath, [System.Drawing.Imaging.ImageFormat]::Png)

    $crewStarshipPath = Join-Path $starshipDir "crew-$($c.Id).png"
    $cleanPortrait.Save($crewStarshipPath, [System.Drawing.Imaging.ImageFormat]::Png)

    # 2. Build Hexagonal Brushed-Titanium Card with Illuminated Nameplate
    $accent = [System.Drawing.Color]::FromArgb(255, $c.R, $c.G, $c.B)
    $cardBmp = [StarshipAssetBuilder]::BuildHexAvatarCard($cleanPortrait, $c.Name, $c.Role, $accent)
    $cardPath = Join-Path $cardsDir "card_$($c.Id).png"
    $cardBmp.Save($cardPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $cardBmp.Dispose()

    # 3. Build Circular 3D Titanium Board Token
    $tokenBmp = [StarshipAssetBuilder]::BuildBoardToken($cleanPortrait, $accent)
    $tokenPath = Join-Path $tokensDir "token_$($c.Id).png"
    $tokenBmp.Save($tokenPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $tokenBmp.Dispose()

    $cleanPortrait.Dispose()
    $srcBmp.Dispose()
    Write-Output "[Built HD Portrait + Hex Card + Board Token] $($c.Name) ($($c.Id))"
}

# 4. Upscale & Polish 2560x1440 Cosmic Board Backdrop
$bgRawPath = Join-Path $rawDir "starship-board-bg-raw.png"
if (Test-Path $bgRawPath) {
    $bgRawBmp = [System.Drawing.Bitmap]::FromFile($bgRawPath)
    $bgOutPath = Join-Path $gameDir "starship-board-bg.jpg"
    [StarshipAssetBuilder]::SaveHighResJpeg($bgRawBmp, 2560, 1440, $bgOutPath)
    $bgRawBmp.Dispose()
    Write-Output "[Saved 2560x1440 Cosmic Board Backdrop] $bgOutPath"
}

# 5. Chroma-Key Hub Toy Icon (`hub-toy-starship-unicorn.png`)
$hubRawPath = Join-Path $rootDir "public\assets\hub\raw\hub-toy-starship-unicorn-raw.png"
if (Test-Path $hubRawPath) {
    $hubRawBmp = [System.Drawing.Bitmap]::FromFile($hubRawPath)
    $hubCleanBmp = [StarshipAssetBuilder]::ChromaKeyAndCrop($hubRawBmp, 512, 6)
    $hubRawBmp.Dispose()

    $hubOutPaths = @(
        (Join-Path $rootDir "public\assets\hub\arcade\hub-toy-starship-unicorn.png"),
        (Join-Path $rootDir "public\assets\hub\sprites\hub-toy-starship-unicorn.png"),
        (Join-Path $rootDir "public\assets\hub\hub-toy-starship-unicorn.png")
    )
    foreach ($p in $hubOutPaths) {
        $dir = Split-Path -Parent $p
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Force -Path $dir | Out-Null
        }
        $hubCleanBmp.Save($p, [System.Drawing.Imaging.ImageFormat]::Png)
    }
    Write-Output "[Saved Hub Shelf Icon] hub-toy-starship-unicorn.png ($($hubCleanBmp.Width)x$($hubCleanBmp.Height))"
    $hubCleanBmp.Dispose()
}

# 6. Chroma-Key Hub 4th Tab Mode Icon (`mode-tv.png`)
$modeTvRawPath = Join-Path $rootDir "public\assets\hub\raw\mode-tv-raw.png"
if (Test-Path $modeTvRawPath) {
    $modeRawBmp = [System.Drawing.Bitmap]::FromFile($modeTvRawPath)
    $modeCleanBmp = [StarshipAssetBuilder]::ChromaKeyAndCrop($modeRawBmp, 380, 6)
    $modeRawBmp.Dispose()

    $modeOutPath = Join-Path $rootDir "public\assets\hub\sprites\mode-tv.png"
    $modeCleanBmp.Save($modeOutPath, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Output "[Saved Hub Upper-Shelf Mode Icon] $modeOutPath ($($modeCleanBmp.Width)x$($modeCleanBmp.Height))"
    $modeCleanBmp.Dispose()
}
