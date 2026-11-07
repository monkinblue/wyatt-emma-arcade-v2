Add-Type -AssemblyName System.Drawing

$csharpCode = @"
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;

public static class StarTrekLcarsAndPodBuilder
{
    private static PointF Pt(float x, float y) { return new PointF(x, y); }

    private static GraphicsPath RoundedRectPath(float x, float y, float w, float h, float r)
    {
        float d = Math.Min(Math.Min(w, h), r * 2f);
        GraphicsPath p = new GraphicsPath();
        p.AddArc(x, y, d, d, 180, 90);
        p.AddArc(x + w - d, y, d, d, 270, 90);
        p.AddArc(x + w - d, y + h - d, d, d, 0, 90);
        p.AddArc(x, y + h - d, d, d, 90, 90);
        p.CloseFigure();
        return p;
    }

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

    // =========================================================================
    // 1. `ui-startrek-command-deck.png` (`960x540`)
    // Star Trek Strange New Worlds / Picard LCARS-style Starship Bridge Command Screen Frame
    // =========================================================================
    public static void BuildLcarsCommandDeck(string outPath)
    {
        Bitmap bmp = new Bitmap(960, 540, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(bmp))
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;
            g.Clear(Color.Transparent);

            // Outer drop shadow & ambient bridge holo-glow
            DrawGlowOrb(g, 480f, 270f, 460f, Color.FromArgb(255, 0, 245, 212), 55);
            using (GraphicsPath shP = RoundedRectPath(10f, 12f, 940f, 520f, 34f))
            using (SolidBrush shB = new SolidBrush(Color.FromArgb(225, 2, 6, 18)))
            {
                g.FillPath(shB, shP);
            }

            // Brushed Titanium Outer Starship Bulkhead Bezel (`x: 8..952, y: 8..532`)
            using (GraphicsPath outerP = RoundedRectPath(8f, 8f, 944f, 524f, 32f))
            using (LinearGradientBrush titaniumB = new LinearGradientBrush(
                new PointF(0f, 8f),
                new PointF(0f, 532f),
                Color.FromArgb(252, 30, 41, 59),
                Color.FromArgb(252, 9, 14, 28)))
            using (Pen outerRim = new Pen(Color.FromArgb(230, 56, 189, 248), 2.5f))
            {
                g.FillPath(titaniumB, outerP);
                g.DrawPath(outerRim, outerP);
            }

            // Clean Dark Translucent Central Tactical Viewport (`x: 56..904, y: 46..494`)
            using (GraphicsPath vpP = RoundedRectPath(56f, 46f, 848f, 448f, 20f))
            using (LinearGradientBrush vpB = new LinearGradientBrush(
                new PointF(0f, 46f),
                new PointF(0f, 494f),
                Color.FromArgb(242, 4, 9, 22),
                Color.FromArgb(246, 2, 6, 16)))
            using (Pen vpRim = new Pen(Color.FromArgb(190, 0, 245, 212), 1.8f))
            {
                g.FillPath(vpB, vpP);
                g.DrawPath(vpRim, vpP);
            }

            // Subtle Star Trek Bridge Tactical Sensor Grid inside the viewport
            using (Pen gridPen = new Pen(Color.FromArgb(18, 56, 189, 248), 1f))
            {
                for (float gx = 120f; gx < 880f; gx += 64f)
                {
                    g.DrawLine(gridPen, gx, 52f, gx, 488f);
                }
                for (float gy = 96f; gy < 480f; gy += 56f)
                {
                    g.DrawLine(gridPen, 62f, gy, 898f, gy);
                }
            }

            // Swept-Back Glowing Amber, Cyan, and Coral LCARS Curved Elbow Borders!
            // Top-Left LCARS Elbow (Golden Amber `#fbbf24`)
            using (GraphicsPath tlElbow = new GraphicsPath())
            {
                tlElbow.AddArc(18f, 18f, 56f, 56f, 180, 90);
                tlElbow.AddLine(46f, 18f, 310f, 18f);
                tlElbow.AddArc(302f, 18f, 18f, 18f, 270, 180);
                tlElbow.AddLine(310f, 36f, 64f, 36f);
                tlElbow.AddArc(46f, 36f, 24f, 24f, 270, -90);
                tlElbow.AddLine(46f, 48f, 46f, 175f);
                tlElbow.AddLine(18f, 175f, 18f, 46f);
                tlElbow.CloseFigure();

                using (LinearGradientBrush lcarsAmber = new LinearGradientBrush(
                    new PointF(18f, 18f), new PointF(320f, 180f),
                    Color.FromArgb(255, 251, 191, 36), Color.FromArgb(255, 217, 119, 6)))
                {
                    g.FillPath(lcarsAmber, tlElbow);
                }
            }

            // Top-Right LCARS Elbow (Neon Cyan `#38bdf8`)
            using (GraphicsPath trElbow = new GraphicsPath())
            {
                trElbow.AddArc(942f - 56f, 18f, 56f, 56f, 270, 90);
                trElbow.AddLine(942f, 46f, 942f, 175f);
                trElbow.AddLine(914f, 175f, 914f, 48f);
                trElbow.AddArc(914f - 24f, 36f, 24f, 24f, 0, -90);
                trElbow.AddLine(902f, 36f, 650f, 36f);
                trElbow.AddArc(640f, 18f, 18f, 18f, 90, 180);
                trElbow.AddLine(650f, 18f, 914f, 18f);
                trElbow.CloseFigure();

                using (LinearGradientBrush lcarsCyan = new LinearGradientBrush(
                    new PointF(640f, 18f), new PointF(942f, 180f),
                    Color.FromArgb(255, 56, 189, 248), Color.FromArgb(255, 0, 245, 212)))
                {
                    g.FillPath(lcarsCyan, trElbow);
                }
            }

            // Bottom-Left LCARS Elbow (Neon Cyan `#00f5d4`)
            using (GraphicsPath blElbow = new GraphicsPath())
            {
                blElbow.AddArc(18f, 522f - 56f, 56f, 56f, 90, 90);
                blElbow.AddLine(18f, 494f, 18f, 365f);
                blElbow.AddLine(46f, 365f, 46f, 492f);
                blElbow.AddArc(46f, 504f - 24f, 24f, 24f, 180, -90);
                blElbow.AddLine(58f, 504f, 290f, 504f);
                blElbow.AddArc(282f, 504f, 18f, 18f, 270, 180);
                blElbow.AddLine(290f, 522f, 46f, 522f);
                blElbow.CloseFigure();

                using (LinearGradientBrush lcarsTeal = new LinearGradientBrush(
                    new PointF(18f, 365f), new PointF(300f, 522f),
                    Color.FromArgb(255, 0, 245, 212), Color.FromArgb(255, 14, 165, 233)))
                {
                    g.FillPath(lcarsTeal, blElbow);
                }
            }

            // Bottom-Right LCARS Elbow (Golden Amber `#f59e0b`)
            using (GraphicsPath brElbow = new GraphicsPath())
            {
                brElbow.AddArc(942f - 56f, 522f - 56f, 56f, 56f, 0, 90);
                brElbow.AddLine(914f, 522f, 670f, 522f);
                brElbow.AddArc(660f, 504f, 18f, 18f, 90, 180);
                brElbow.AddLine(670f, 504f, 902f, 504f);
                brElbow.AddArc(914f - 24f, 504f - 24f, 24f, 24f, 90, -90);
                brElbow.AddLine(914f, 492f, 914f, 365f);
                brElbow.AddLine(942f, 365f, 942f, 494f);
                brElbow.CloseFigure();

                using (LinearGradientBrush lcarsGold = new LinearGradientBrush(
                    new PointF(660f, 365f), new PointF(942f, 522f),
                    Color.FromArgb(255, 245, 158, 11), Color.FromArgb(255, 251, 191, 36)))
                {
                    g.FillPath(lcarsGold, brElbow);
                }
            }

            // Side-Rail Segmented LCARS Micro-Telemetry Readout Bars (`y: 184..356`)
            Color[] railPalette = new Color[]
            {
                Color.FromArgb(255, 56, 189, 248),
                Color.FromArgb(255, 251, 191, 36),
                Color.FromArgb(255, 244, 114, 182),
                Color.FromArgb(255, 0, 245, 212),
                Color.FromArgb(255, 148, 163, 184)
            };
            for (int i = 0; i < 5; i++)
            {
                float ry = 185f + i * 35f;
                using (SolidBrush sb = new SolidBrush(railPalette[i]))
                {
                    g.FillRectangle(sb, 18f, ry, 28f, 27f);
                    g.FillRectangle(sb, 914f, ry, 28f, 27f);
                }
            }

            // Top & Bottom Center LCARS Bridge Accent Pills
            using (GraphicsPath topCenterPill = RoundedRectPath(332f, 18f, 296f, 16f, 8f))
            using (SolidBrush tcB = new SolidBrush(Color.FromArgb(235, 30, 41, 59)))
            using (Pen tcP = new Pen(Color.FromArgb(240, 56, 189, 248), 1.5f))
            {
                g.FillPath(tcB, topCenterPill);
                g.DrawPath(tcP, topCenterPill);
            }
            using (GraphicsPath botCenterPill = RoundedRectPath(312f, 506f, 336f, 16f, 8f))
            using (SolidBrush bcB = new SolidBrush(Color.FromArgb(235, 30, 41, 59)))
            using (Pen bcP = new Pen(Color.FromArgb(240, 251, 191, 36), 1.5f))
            {
                g.FillPath(bcB, botCenterPill);
                g.DrawPath(bcP, botCenterPill);
            }
        }
        bmp.Save(outPath, ImageFormat.Png);
        bmp.Dispose();
    }

    // =========================================================================
    // 2. `ui-startrek-top-pill.png` (`260x56`)
    // Sleek horizontal Star Trek LCARS crew telemetry badge frame with curved left portrait bay
    // =========================================================================
    public static void BuildLcarsTopPill(string outPath)
    {
        Bitmap bmp = new Bitmap(260, 56, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(bmp))
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;
            g.Clear(Color.Transparent);

            using (GraphicsPath outerP = RoundedRectPath(3f, 3f, 254f, 50f, 24f))
            using (LinearGradientBrush bgB = new LinearGradientBrush(
                new PointF(0f, 3f), new PointF(0f, 53f),
                Color.FromArgb(245, 15, 23, 42), Color.FromArgb(248, 4, 9, 22)))
            using (Pen rimP = new Pen(Color.FromArgb(230, 56, 189, 248), 2.2f))
            {
                g.FillPath(bgB, outerP);
                g.DrawPath(rimP, outerP);
            }

            // Left LCARS Amber End-Cap Sweep + Portrait Bay Ring (`cx = 30, cy = 28`)
            using (GraphicsPath leftCap = new GraphicsPath())
            {
                leftCap.AddArc(5f, 5f, 46f, 46f, 90, 180);
                leftCap.AddLine(28f, 5f, 58f, 5f);
                leftCap.AddLine(52f, 12f, 28f, 12f);
                leftCap.AddArc(12f, 12f, 32f, 32f, 270, -180);
                leftCap.CloseFigure();
                using (SolidBrush ab = new SolidBrush(Color.FromArgb(255, 251, 191, 36)))
                {
                    g.FillPath(ab, leftCap);
                }
            }

            // Top-Right Glowing Cyan LCARS Accent Bar
            using (GraphicsPath topBar = RoundedRectPath(66f, 6f, 166f, 5f, 2.5f))
            using (SolidBrush cb = new SolidBrush(Color.FromArgb(235, 0, 245, 212)))
            {
                g.FillPath(cb, topBar);
            }

            // Right LCARS Micro-Cap
            using (GraphicsPath rightCap = RoundedRectPath(238f, 12f, 12f, 32f, 5f))
            using (SolidBrush rb = new SolidBrush(Color.FromArgb(240, 245, 158, 11)))
            {
                g.FillPath(rb, rightCap);
            }
        }
        bmp.Save(outPath, ImageFormat.Png);
        bmp.Dispose();
    }

    // =========================================================================
    // 3. `sprite-3d-supply-pods.png` (`768x256` -> 3 frames of `256x256`)
    // 3 Photorealistic Armored FICSIT Orbital Supply Drop Pods (Brushed Titanium Hex-Pods
    // with Glowing Cyan, Golden-Amber, and Magenta Plasma Core Seams, Hydraulic Clamps, & Thrusters)
    // =========================================================================
    public static void BuildSupplyPodsSheet(string outPath)
    {
        Bitmap bmp = new Bitmap(768, 256, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(bmp))
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;
            g.Clear(Color.Transparent);

            Color[] plasmaColors = new Color[]
            {
                Color.FromArgb(255, 0, 245, 212),   // Pod 0: Neon Cyan
                Color.FromArgb(255, 251, 191, 36),  // Pod 1: Golden Amber
                Color.FromArgb(255, 244, 114, 182)  // Pod 2: Nebula Magenta
            };
            Color[] brightCores = new Color[]
            {
                Color.FromArgb(255, 165, 243, 252),
                Color.FromArgb(255, 254, 240, 138),
                Color.FromArgb(255, 251, 207, 232)
            };

            for (int idx = 0; idx < 3; idx++)
            {
                float cx = idx * 256f + 128f;
                Color plasma = plasmaColors[idx];
                Color bright = brightCores[idx];

                // 0. Retro-Thruster Exhaust Plumes underneath the Supply Pod (`y: 185..242`)
                DrawGlowOrb(g, cx, 196f, 88f, plasma, 155);
                float[] nozzleOffsets = new float[] { -48f, 0f, 48f };
                foreach (float nx in nozzleOffsets)
                {
                    float tx = cx + nx;
                    float ty = 192f;
                    DrawGlowOrb(g, tx, ty + 18f, 28f, Color.FromArgb(255, 251, 191, 36), 210);
                    PointF[] flameCone = new PointF[]
                    {
                        Pt(tx - 12f, ty),
                        Pt(tx + 12f, ty),
                        Pt(tx, ty + 44f)
                    };
                    using (GraphicsPath fp = PolyPath(flameCone))
                    using (LinearGradientBrush fb = new LinearGradientBrush(
                        Pt(tx, ty), Pt(tx, ty + 44f),
                        Color.White, Color.FromArgb(0, plasma.R, plasma.G, plasma.B)))
                    {
                        g.FillPath(fb, fp);
                    }
                    // Gunmetal thruster bell nozzle
                    using (SolidBrush nb = new SolidBrush(Color.FromArgb(255, 30, 41, 59)))
                    using (Pen np = new Pen(Color.FromArgb(255, 148, 163, 184), 2f))
                    {
                        g.FillEllipse(nb, tx - 14f, ty - 8f, 28f, 16f);
                        g.DrawEllipse(np, tx - 14f, ty - 8f, 28f, 16f);
                    }
                }

                // 1. Lower Heavy Heat-Shield Base Collar (`y: 162..196`)
                using (GraphicsPath baseP = RoundedRectPath(cx - 78f, 156f, 156f, 38f, 16f))
                using (LinearGradientBrush baseB = new LinearGradientBrush(
                    Pt(cx - 78f, 156f), Pt(cx + 78f, 156f),
                    Color.FromArgb(255, 15, 23, 42), Color.FromArgb(255, 51, 65, 85)))
                using (Pen baseRim = new Pen(plasma, 2.2f))
                {
                    ColorBlend cb = new ColorBlend(3);
                    cb.Colors = new Color[]
                    {
                        Color.FromArgb(255, 15, 23, 42),
                        Color.FromArgb(255, 71, 85, 105),
                        Color.FromArgb(255, 15, 23, 42)
                    };
                    cb.Positions = new float[] { 0f, 0.45f, 1f };
                    baseB.InterpolationColors = cb;
                    g.FillPath(baseB, baseP);
                    g.DrawPath(baseRim, baseP);
                }

                // 2. Main 3D Cylindrical / Hex-Armored Drop-Pod Hull (`y: 58..174`)
                using (GraphicsPath hullP = RoundedRectPath(cx - 72f, 58f, 144f, 116f, 26f))
                using (LinearGradientBrush hullB = new LinearGradientBrush(
                    Pt(cx - 72f, 58f), Pt(cx + 72f, 58f),
                    Color.FromArgb(255, 30, 41, 59), Color.FromArgb(255, 15, 23, 42)))
                {
                    ColorBlend cb = new ColorBlend(4);
                    cb.Colors = new Color[]
                    {
                        Color.FromArgb(255, 30, 41, 59),
                        Color.FromArgb(255, 148, 163, 184),
                        Color.FromArgb(255, 51, 65, 85),
                        Color.FromArgb(255, 15, 23, 42)
                    };
                    cb.Positions = new float[] { 0f, 0.34f, 0.72f, 1f };
                    hullB.InterpolationColors = cb;
                    g.FillPath(hullB, hullP);

                    using (Pen hullRim = new Pen(Color.FromArgb(255, 203, 213, 225), 2.4f))
                    {
                        g.DrawPath(hullRim, hullP);
                    }
                }

                // 3. Recessed Glowing Plasma Core Seams (Vertical + Horizontal Energy Channels)
                DrawGlowOrb(g, cx, 116f, 64f, plasma, 175);
                using (Pen seamGlow = new Pen(Color.FromArgb(160, plasma.R, plasma.G, plasma.B), 9f))
                using (Pen seamCore = new Pen(bright, 3.2f))
                {
                    seamGlow.StartCap = LineCap.Round; seamGlow.EndCap = LineCap.Round;
                    seamCore.StartCap = LineCap.Round; seamCore.EndCap = LineCap.Round;

                    // Vertical plasma channels
                    g.DrawLine(seamGlow, cx - 34f, 70f, cx - 34f, 162f);
                    g.DrawLine(seamGlow, cx + 34f, 70f, cx + 34f, 162f);
                    g.DrawLine(seamCore, cx - 34f, 70f, cx - 34f, 162f);
                    g.DrawLine(seamCore, cx + 34f, 70f, cx + 34f, 162f);

                    // Horizontal equator plasma ring
                    g.DrawArc(seamGlow, cx - 70f, 102f, 140f, 28f, 0, 180);
                    g.DrawArc(seamCore, cx - 70f, 102f, 140f, 28f, 0, 180);
                }

                // 4. Heavy FICSIT Golden-Amber Hydraulic Locking Clamps on Left, Right, and Center
                float[] clampXs = new float[] { cx - 74f, cx + 56f };
                foreach (float clx in clampXs)
                {
                    using (GraphicsPath clP = RoundedRectPath(clx, 96f, 18f, 40f, 5f))
                    using (LinearGradientBrush clB = new LinearGradientBrush(
                        Pt(clx, 96f), Pt(clx, 136f),
                        Color.FromArgb(255, 251, 191, 36), Color.FromArgb(255, 180, 83, 9)))
                    using (Pen clRim = new Pen(Color.FromArgb(255, 15, 23, 42), 2f))
                    {
                        g.FillPath(clB, clP);
                        g.DrawPath(clRim, clP);
                    }
                }

                // 5. Upper Armored Dome Cap + Specular Highlight + Parachute/Orbital Beacon Ring (`y: 26..72`)
                using (GraphicsPath domeP = RoundedRectPath(cx - 58f, 38f, 116f, 34f, 16f))
                using (LinearGradientBrush domeB = new LinearGradientBrush(
                    Pt(cx - 58f, 38f), Pt(cx + 58f, 72f),
                    Color.FromArgb(255, 226, 232, 240), Color.FromArgb(255, 51, 65, 85)))
                using (Pen domeRim = new Pen(bright, 2.2f))
                {
                    g.FillPath(domeB, domeP);
                    g.DrawPath(domeRim, domeP);
                }

                // Central Glowing Orbital Loot Window on the Pod Chest (`cx, 116`)
                DrawGlowOrb(g, cx, 116f, 34f, bright, 250);
                using (SolidBrush winB = new SolidBrush(Color.White))
                using (Pen winRim = new Pen(plasma, 4f))
                {
                    g.FillEllipse(winB, cx - 20f, 116f - 20f, 40f, 40f);
                    g.DrawEllipse(winRim, cx - 20f, 116f - 20f, 40f, 40f);
                }
            }
        }
        bmp.Save(outPath, ImageFormat.Png);
        bmp.Dispose();
    }
}
"@

Add-Type -TypeDefinition $csharpCode -ReferencedAssemblies System.Drawing

$dir = 'C:\projects\Wyatt and Emma Arcade v2\public\assets\starship'
[StarTrekLcarsAndPodBuilder]::BuildLcarsCommandDeck("$dir\ui-startrek-command-deck.png")
[StarTrekLcarsAndPodBuilder]::BuildLcarsTopPill("$dir\ui-startrek-top-pill.png")
[StarTrekLcarsAndPodBuilder]::BuildSupplyPodsSheet("$dir\sprite-3d-supply-pods.png")

Write-Output "[Built ui-startrek-command-deck.png, ui-startrek-top-pill.png, and sprite-3d-supply-pods.png]"
