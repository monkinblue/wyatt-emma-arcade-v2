
Add-Type -AssemblyName System.Drawing

$csharpCode = @"
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;

public static class DicePlungerSpriteBuilder
{
    private static PointF Pt(float x, float y) { return new PointF(x, y); }

    private static GraphicsPath PolyPath(params PointF[] pts)
    {
        GraphicsPath p = new GraphicsPath();
        p.AddPolygon(pts);
        return p;
    }

    private static void DrawGlowOrb(Graphics g, float cx, float cy, float r, Color col, int maxAlpha)
    {
        if (r <= 1f) return;
        using (GraphicsPath gp = new GraphicsPath())
        {
            gp.AddEllipse(cx - r, cy - r, r * 2f, r * 2f);
            using (PathGradientBrush pgb = new PathGradientBrush(gp))
            {
                pgb.CenterPoint = new PointF(cx, cy);
                pgb.CenterColor = Color.FromArgb(maxAlpha, col.R, col.G, col.B);
                pgb.SurroundColors = new Color[] { Color.FromArgb(0, col.R, col.G, col.B) };
                g.FillPath(pgb, gp);
            }
        }
    }

    private static void DrawCylinderSegment(
        Graphics g,
        float cx,
        float topY,
        float botY,
        float rx,
        float ry,
        Color leftCol,
        Color midCol,
        Color rightCol,
        Color topFillA,
        Color topFillB,
        Color rimCol
    )
    {
        float h = Math.Max(2f, botY - topY);
        using (GraphicsPath bodyPath = new GraphicsPath())
        {
            bodyPath.AddArc(cx - rx, topY - ry, rx * 2f, ry * 2f, 0f, -180f);
            bodyPath.AddLine(cx - rx, topY, cx - rx, botY);
            bodyPath.AddArc(cx - rx, botY - ry, rx * 2f, ry * 2f, 180f, -180f);
            bodyPath.CloseFigure();

            using (LinearGradientBrush bodyBrush = new LinearGradientBrush(
                new PointF(cx - rx, topY),
                new PointF(cx + rx, topY),
                leftCol,
                rightCol))
            {
                ColorBlend cb = new ColorBlend(3);
                cb.Colors = new Color[] { leftCol, midCol, rightCol };
                cb.Positions = new float[] { 0f, 0.42f, 1f };
                bodyBrush.InterpolationColors = cb;
                g.FillPath(bodyBrush, bodyPath);
            }
            using (Pen rimPen = new Pen(rimCol, 1.8f))
            {
                g.DrawPath(rimPen, bodyPath);
            }
        }

        RectangleF topEll = new RectangleF(cx - rx, topY - ry, rx * 2f, ry * 2f);
        using (LinearGradientBrush tb = new LinearGradientBrush(
            new PointF(cx - rx, topY - ry),
            new PointF(cx + rx, topY + ry),
            topFillA,
            topFillB))
        {
            g.FillEllipse(tb, topEll);
        }
        using (Pen topPen = new Pen(rimCol, 1.8f))
        {
            g.DrawEllipse(topPen, topEll);
        }
    }

    private static void DrawSidePlasmaCoil(Graphics g, float cx, float cy, bool isLeft)
    {
        float dir = isLeft ? -1f : 1f;
        // Ambient cyan & amber plasma glow
        DrawGlowOrb(g, cx, cy, 34f, Color.FromArgb(255, 34, 211, 238), 165);
        DrawGlowOrb(g, cx + dir * 4f, cy - 8f, 24f, Color.FromArgb(255, 251, 191, 36), 140);

        // Brushed steel brackets connecting coil to central cylinder
        using (Pen bracketPen = new Pen(Color.FromArgb(255, 71, 85, 105), 5f))
        using (Pen bracketHi = new Pen(Color.FromArgb(255, 148, 163, 184), 2f))
        {
            g.DrawLine(bracketPen, cx, cy - 22f, cx - dir * 24f, cy - 16f);
            g.DrawLine(bracketPen, cx, cy + 22f, cx - dir * 24f, cy + 16f);
            g.DrawLine(bracketHi, cx, cy - 23f, cx - dir * 24f, cy - 17f);
            g.DrawLine(bracketHi, cx, cy + 21f, cx - dir * 24f, cy + 15f);
        }

        // Glass plasma tube core
        RectangleF tubeRect = new RectangleF(cx - 11f, cy - 26f, 22f, 52f);
        using (LinearGradientBrush glassB = new LinearGradientBrush(
            new PointF(cx - 11f, cy),
            new PointF(cx + 11f, cy),
            Color.FromArgb(230, 8, 145, 178),
            Color.FromArgb(255, 165, 243, 252)))
        {
            g.FillRectangle(glassB, tubeRect);
        }

        // Copper-amber induction coil rings wrapped around the plasma tube
        using (Pen coilShadow = new Pen(Color.FromArgb(230, 15, 23, 42), 5.5f))
        using (Pen coilAmber = new Pen(Color.FromArgb(255, 245, 158, 11), 3.6f))
        using (Pen coilCyan = new Pen(Color.FromArgb(255, 103, 232, 249), 2.2f))
        {
            coilShadow.StartCap = LineCap.Round; coilShadow.EndCap = LineCap.Round;
            coilAmber.StartCap = LineCap.Round; coilAmber.EndCap = LineCap.Round;
            coilCyan.StartCap = LineCap.Round; coilCyan.EndCap = LineCap.Round;

            for (int r = -2; r <= 2; r++)
            {
                float ry = cy + r * 9.5f;
                g.DrawLine(coilShadow, cx - 13f, ry + 1.5f, cx + 13f, ry - 1.5f);
                g.DrawLine(r % 2 == 0 ? coilAmber : coilCyan, cx - 13f, ry, cx + 13f, ry - 3f);
            }
        }

        // Top & bottom anodized caps on the side coil
        using (SolidBrush capB = new SolidBrush(Color.FromArgb(255, 30, 41, 59)))
        using (Pen capRim = new Pen(Color.FromArgb(255, 56, 189, 248), 1.6f))
        {
            g.FillEllipse(capB, cx - 13f, cy - 31f, 26f, 10f);
            g.DrawEllipse(capRim, cx - 13f, cy - 31f, 26f, 10f);
            g.FillEllipse(capB, cx - 13f, cy + 21f, 26f, 10f);
            g.DrawEllipse(capRim, cx - 13f, cy + 21f, 26f, 10f);
        }
    }

    public static void BuildPlungerPng(string outPath)
    {
        Bitmap bmp = new Bitmap(256, 256, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(bmp))
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;
            g.Clear(Color.Transparent);

            float cx = 128f;

            // 0. Soft ambient under-glow & ground shadow
            DrawGlowOrb(g, cx, 178f, 108f, Color.FromArgb(255, 34, 211, 238), 95);
            using (SolidBrush shB = new SolidBrush(Color.FromArgb(180, 2, 6, 18)))
            {
                g.FillEllipse(shB, cx - 98f, 152f, 196f, 82f);
            }

            // 1. Isometric Octagonal Brushed-Gunmetal Deck Mounting Plate
            PointF[] baseTop = new PointF[]
            {
                Pt(cx, 126f),
                Pt(cx + 92f, 168f),
                Pt(cx, 214f),
                Pt(cx - 92f, 168f)
            };
            PointF[] baseBot = new PointF[]
            {
                Pt(cx - 92f, 168f),
                Pt(cx, 214f),
                Pt(cx + 92f, 168f),
                Pt(cx + 92f, 184f),
                Pt(cx, 232f),
                Pt(cx - 92f, 184f)
            };

            using (GraphicsPath bpBot = PolyPath(baseBot))
            using (LinearGradientBrush bbB = new LinearGradientBrush(
                new PointF(cx - 92f, 168f), new PointF(cx + 92f, 232f),
                Color.FromArgb(255, 15, 23, 42), Color.FromArgb(255, 30, 41, 59)))
            {
                g.FillPath(bbB, bpBot);
                using (Pen p = new Pen(Color.FromArgb(220, 56, 189, 248), 2f))
                {
                    g.DrawPath(p, bpBot);
                }
            }

            using (GraphicsPath bpTop = PolyPath(baseTop))
            using (LinearGradientBrush btB = new LinearGradientBrush(
                new PointF(cx - 92f, 126f), new PointF(cx + 92f, 214f),
                Color.FromArgb(255, 51, 65, 85), Color.FromArgb(255, 15, 23, 42)))
            {
                g.FillPath(btB, bpTop);
                using (Pen p = new Pen(Color.FromArgb(235, 148, 163, 184), 2.2f))
                {
                    g.DrawPath(p, bpTop);
                }
            }

            // 4 Corner Hex Bolts on the Isometric Mounting Plate
            PointF[] bolts = new PointF[]
            {
                Pt(cx, 138f),
                Pt(cx + 72f, 168f),
                Pt(cx, 200f),
                Pt(cx - 72f, 168f)
            };
            foreach (PointF bPt in bolts)
            {
                using (SolidBrush bFill = new SolidBrush(Color.FromArgb(255, 148, 163, 184)))
                using (Pen bRim = new Pen(Color.FromArgb(255, 15, 23, 42), 1.5f))
                {
                    g.FillEllipse(bFill, bPt.X - 5f, bPt.Y - 3.5f, 10f, 7f);
                    g.DrawEllipse(bRim, bPt.X - 5f, bPt.Y - 3.5f, 10f, 7f);
                }
            }

            // 2. Left & Right Glowing Cyan/Amber Plasma Coils
            DrawSidePlasmaCoil(g, cx - 72f, 128f, true);
            DrawSidePlasmaCoil(g, cx + 72f, 128f, false);

            // 3. Lower Brushed-Gunmetal Cylinder Housing
            DrawCylinderSegment(
                g, cx, 124f, 168f, 58f, 24f,
                Color.FromArgb(255, 15, 23, 42),
                Color.FromArgb(255, 71, 85, 105),
                Color.FromArgb(255, 30, 41, 59),
                Color.FromArgb(255, 51, 65, 85),
                Color.FromArgb(255, 15, 23, 42),
                Color.FromArgb(255, 100, 116, 139)
            );

            // 4. Black-and-Amber FICSIT Safety-Hazard Collar Ring
            DrawCylinderSegment(
                g, cx, 102f, 126f, 52f, 21f,
                Color.FromArgb(255, 180, 83, 9),
                Color.FromArgb(255, 251, 191, 36),
                Color.FromArgb(255, 146, 64, 14),
                Color.FromArgb(255, 30, 41, 59),
                Color.FromArgb(255, 15, 23, 42),
                Color.FromArgb(255, 253, 224, 71)
            );

            // Diagonal black hazard chevrons along the amber collar
            using (GraphicsPath collarClip = new GraphicsPath())
            {
                collarClip.AddArc(cx - 52f, 102f - 21f, 104f, 42f, 0f, 180f);
                collarClip.AddLine(cx - 52f, 102f, cx - 52f, 126f);
                collarClip.AddArc(cx - 52f, 126f - 21f, 104f, 42f, 180f, -180f);
                collarClip.CloseFigure();

                GraphicsState st = g.Save();
                g.SetClip(collarClip);
                using (Pen hazPen = new Pen(Color.FromArgb(235, 15, 23, 42), 7f))
                {
                    for (float hx = cx - 64f; hx <= cx + 64f; hx += 18f)
                    {
                        g.DrawLine(hazPen, hx, 96f, hx - 14f, 148f);
                    }
                }
                g.Restore(st);
            }

            // 5. Chrome Hydraulic Plunger Piston Shaft + Glowing Cyan Energy Ring
            DrawGlowOrb(g, cx, 96f, 48f, Color.FromArgb(255, 56, 189, 248), 185);
            DrawCylinderSegment(
                g, cx, 76f, 104f, 32f, 13f,
                Color.FromArgb(255, 71, 85, 105),
                Color.FromArgb(255, 226, 232, 240),
                Color.FromArgb(255, 51, 65, 85),
                Color.FromArgb(255, 148, 163, 184),
                Color.FromArgb(255, 71, 85, 105),
                Color.FromArgb(255, 56, 189, 248)
            );

            // 6. Tactile 3D Beveled Red-Amber Blast Plunger Cap on Top!
            DrawGlowOrb(g, cx, 58f, 64f, Color.FromArgb(255, 245, 158, 11), 170);
            DrawCylinderSegment(
                g, cx, 48f, 80f, 48f, 20f,
                Color.FromArgb(255, 153, 27, 27),
                Color.FromArgb(255, 239, 68, 68),
                Color.FromArgb(255, 127, 29, 29),
                Color.FromArgb(255, 251, 146, 60),
                Color.FromArgb(255, 220, 38, 38),
                Color.FromArgb(255, 254, 240, 138)
            );

            // Inner beveled dome highlight on top of the blast cap
            RectangleF domeInner = new RectangleF(cx - 38f, 48f - 15f, 76f, 30f);
            using (LinearGradientBrush domeB = new LinearGradientBrush(
                new PointF(cx, 32f),
                new PointF(cx, 64f),
                Color.FromArgb(245, 254, 215, 170),
                Color.FromArgb(230, 185, 28, 28)))
            {
                g.FillEllipse(domeB, domeInner);
            }
            using (Pen domeRim = new Pen(Color.FromArgb(240, 254, 240, 138), 2.2f))
            {
                g.DrawEllipse(domeRim, domeInner);
            }

            // Specular gloss crescent on upper-left of blast cap
            using (SolidBrush specB = new SolidBrush(Color.FromArgb(135, 255, 255, 255)))
            {
                g.FillEllipse(specB, cx - 28f, 36f, 36f, 11f);
            }
        }

        bmp.Save(outPath, ImageFormat.Png);
        bmp.Dispose();
    }
}
"@

Add-Type -TypeDefinition $csharpCode -ReferencedAssemblies System.Drawing
[DicePlungerSpriteBuilder]::BuildPlungerPng('C:\projects\Wyatt and Emma Arcade v2\public\assets\starship\dice-plunger-console.png')
Write-Output "[Built 3D Isometric Ignition Plunger Sprite] C:\projects\Wyatt and Emma Arcade v2\public\assets\starship\dice-plunger-console.png"
