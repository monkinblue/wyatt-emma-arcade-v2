Add-Type -AssemblyName System.Drawing

$csharpCode = @"
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;

public static class StarshipHardwareSpriteBuilder
{
    private static PointF Pt(float x, float y) { return new PointF(x, y); }

    private static GraphicsPath PolyPath(params PointF[] pts)
    {
        GraphicsPath p = new GraphicsPath();
        p.AddPolygon(pts);
        return p;
    }

    private static GraphicsPath RoundedRectPath(float x, float y, float w, float h, float r)
    {
        float d = r * 2f;
        GraphicsPath p = new GraphicsPath();
        p.AddArc(x, y, d, d, 180, 90);
        p.AddArc(x + w - d, y, d, d, 270, 90);
        p.AddArc(x + w - d, y + h - d, d, d, 0, 90);
        p.AddArc(x, y + h - d, d, d, 90, 90);
        p.CloseFigure();
        return p;
    }

    private static PointF[] IsoHexagon(float cx, float cy, float rx, float ry)
    {
        PointF[] pts = new PointF[6];
        for (int i = 0; i < 6; i++)
        {
            double ang = (i * 60.0 - 30.0) * Math.PI / 180.0;
            pts[i] = new PointF(
                cx + (float)(Math.Cos(ang) * rx),
                cy + (float)(Math.Sin(ang) * ry)
            );
        }
        return pts;
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

    private static void DrawIsoPrismHex(
        Graphics g,
        float cx,
        float topY,
        float height,
        float rx,
        float ry,
        Color topLight,
        Color topDark,
        Color sideLeft,
        Color sideMid,
        Color sideRight,
        Color rimColor
    )
    {
        PointF[] topPts = IsoHexagon(cx, topY, rx, ry);
        PointF[] botPts = IsoHexagon(cx, topY + height, rx, ry);

        // Front-left, front-center, front-right side faces (indices 0->1, 1->2, 2->3)
        int[] faceIndices = new int[] { 0, 1, 2 };
        Color[] faceColors = new Color[] { sideRight, sideMid, sideLeft };

        for (int f = 0; f < 3; f++)
        {
            int i0 = faceIndices[f];
            int i1 = (i0 + 1) % 6;
            PointF[] quad = new PointF[] { topPts[i0], topPts[i1], botPts[i1], botPts[i0] };
            using (GraphicsPath qp = PolyPath(quad))
            using (SolidBrush sb = new SolidBrush(faceColors[f]))
            using (Pen rp = new Pen(rimColor, 1.6f))
            {
                g.FillPath(sb, qp);
                g.DrawPath(rp, qp);
            }
        }

        using (GraphicsPath tp = PolyPath(topPts))
        using (LinearGradientBrush tb = new LinearGradientBrush(
            new PointF(cx - rx, topY - ry),
            new PointF(cx + rx, topY + ry),
            topLight,
            topDark))
        using (Pen rp = new Pen(rimColor, 2.0f))
        {
            g.FillPath(tb, tp);
            g.DrawPath(rp, tp);
        }
    }

    // =========================================================================
    // 1. CHALLENGE SHIELD TURRETS (`768x256` -> 3 frames of `256x256`)
    // =========================================================================
    public static void BuildShieldTurretsSheet(string outPath)
    {
        Bitmap bmp = new Bitmap(768, 256, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(bmp))
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;
            g.Clear(Color.Transparent);

            Color[] primaryGlows = new Color[]
            {
                Color.FromArgb(255, 0, 245, 212),   // Alpha: Neon Cyan
                Color.FromArgb(255, 251, 191, 36),  // Beta: Golden Amber
                Color.FromArgb(255, 16, 185, 129)   // Omega: Emerald Green
            };
            Color[] coreBrights = new Color[]
            {
                Color.FromArgb(255, 165, 243, 252),
                Color.FromArgb(255, 254, 240, 138),
                Color.FromArgb(255, 167, 243, 208)
            };

            for (int idx = 0; idx < 3; idx++)
            {
                float cx = idx * 256f + 128f;
                Color glow = primaryGlows[idx];
                Color bright = coreBrights[idx];

                // Ambient base glow + shadow
                DrawGlowOrb(g, cx, 158f, 108f, glow, 115);
                using (SolidBrush sh = new SolidBrush(Color.FromArgb(185, 2, 6, 18)))
                {
                    g.FillEllipse(sh, cx - 94f, 152f, 188f, 76f);
                }

                // Heavy Isometric Hexagonal Gunmetal Pedestal Base
                DrawIsoPrismHex(
                    g, cx, 166f, 26f, 88f, 44f,
                    Color.FromArgb(255, 51, 65, 85),
                    Color.FromArgb(255, 15, 23, 42),
                    Color.FromArgb(255, 15, 23, 42),
                    Color.FromArgb(255, 30, 41, 59),
                    Color.FromArgb(255, 51, 65, 85),
                    glow
                );

                // FICSIT Amber-Collar Tier
                DrawIsoPrismHex(
                    g, cx, 142f, 20f, 68f, 34f,
                    Color.FromArgb(255, 71, 85, 105),
                    Color.FromArgb(255, 30, 41, 59),
                    Color.FromArgb(255, 180, 83, 9),
                    Color.FromArgb(255, 245, 158, 11),
                    Color.FromArgb(255, 146, 64, 14),
                    Color.FromArgb(255, 253, 224, 71)
                );

                // Left & Right Glowing Plasma Induction Coils
                for (int side = -1; side <= 1; side += 2)
                {
                    float sx = cx + side * 62f;
                    float sy = 114f;
                    DrawGlowOrb(g, sx, sy, 32f, glow, 175);
                    using (LinearGradientBrush coilB = new LinearGradientBrush(
                        new PointF(sx - 10f, sy - 24f),
                        new PointF(sx + 10f, sy + 24f),
                        bright,
                        glow))
                    using (Pen coilRim = new Pen(Color.White, 1.5f))
                    {
                        g.FillRectangle(coilB, sx - 9f, sy - 22f, 18f, 44f);
                        g.DrawRectangle(coilRim, sx - 9f, sy - 22f, 18f, 44f);
                    }
                    using (Pen ringP = new Pen(Color.FromArgb(240, 15, 23, 42), 3.5f))
                    {
                        for (int r = -2; r <= 2; r++)
                        {
                            g.DrawLine(ringP, sx - 11f, sy + r * 8f, sx + 11f, sy + r * 8f);
                        }
                    }
                }

                // Upper Hexagonal Turret Emitter Dish Housing
                DrawIsoPrismHex(
                    g, cx, 108f, 28f, 54f, 27f,
                    Color.FromArgb(255, 71, 85, 105),
                    Color.FromArgb(255, 15, 23, 42),
                    Color.FromArgb(255, 30, 41, 59),
                    Color.FromArgb(255, 51, 65, 85),
                    Color.FromArgb(255, 71, 85, 105),
                    bright
                );

                // Blazing Hexagonal Plasma Emitter Lens + Twin Barrel Emitter Prongs
                DrawGlowOrb(g, cx, 88f, 58f, glow, 220);
                PointF[] lensHex = IsoHexagon(cx, 104f, 38f, 19f);
                using (GraphicsPath lp = PolyPath(lensHex))
                using (LinearGradientBrush lb = new LinearGradientBrush(
                    new PointF(cx - 38f, 85f),
                    new PointF(cx + 38f, 123f),
                    Color.White,
                    glow))
                using (Pen lPen = new Pen(Color.White, 2.4f))
                {
                    g.FillPath(lb, lp);
                    g.DrawPath(lPen, lp);
                }

                // Twin vertical plasma projector prongs
                for (int p = -1; p <= 1; p += 2)
                {
                    float px = cx + p * 18f;
                    using (LinearGradientBrush pb = new LinearGradientBrush(
                        new PointF(px - 6f, 46f),
                        new PointF(px + 6f, 102f),
                        Color.White,
                        glow))
                    using (Pen pRim = new Pen(Color.FromArgb(255, 15, 23, 42), 2f))
                    {
                        g.FillRectangle(pb, px - 6f, 52f, 12f, 50f);
                        g.DrawRectangle(pRim, px - 6f, 52f, 12f, 50f);
                    }
                    DrawGlowOrb(g, px, 50f, 22f, bright, 240);
                }

                // Floating hexagonal holographic shield projection ring above emitter
                PointF[] holoHex = IsoHexagon(cx, 54f, 48f, 22f);
                using (GraphicsPath hp = PolyPath(holoHex))
                using (Pen hPen = new Pen(bright, 2.8f))
                {
                    g.DrawPath(hPen, hp);
                }
            }
        }
        bmp.Save(outPath, ImageFormat.Png);
        bmp.Dispose();
    }

    // =========================================================================
    // 2. CHALLENGE CARGO CRATES (`768x256` -> 3 frames of `256x256`)
    // =========================================================================
    public static void BuildCargoCratesSheet(string outPath)
    {
        Bitmap bmp = new Bitmap(768, 256, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(bmp))
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;
            g.Clear(Color.Transparent);

            Color[] seamColors = new Color[]
            {
                Color.FromArgb(255, 56, 189, 248),  // Cyan
                Color.FromArgb(255, 251, 191, 36),  // Amber
                Color.FromArgb(255, 244, 114, 182)  // Magenta
            };
            Color[] seamBrights = new Color[]
            {
                Color.FromArgb(255, 186, 230, 253),
                Color.FromArgb(255, 254, 240, 138),
                Color.FromArgb(255, 251, 207, 232)
            };

            for (int idx = 0; idx < 3; idx++)
            {
                float cx = idx * 256f + 128f;
                Color seam = seamColors[idx];
                Color bright = seamBrights[idx];

                DrawGlowOrb(g, cx, 138f, 112f, seam, 125);
                using (SolidBrush sh = new SolidBrush(Color.FromArgb(190, 2, 6, 18)))
                {
                    g.FillEllipse(sh, cx - 96f, 158f, 192f, 74f);
                }

                // 3D Isometric Cube Faces for Heavy Armored Drop-Pod Crate
                PointF pTop = Pt(cx, 44f);
                PointF pRight = Pt(cx + 86f, 88f);
                PointF pMid = Pt(cx, 132f);
                PointF pLeft = Pt(cx - 86f, 88f);
                PointF pBotLeft = Pt(cx - 86f, 178f);
                PointF pBotMid = Pt(cx, 222f);
                PointF pBotRight = Pt(cx + 86f, 178f);

                PointF[] topFace = new PointF[] { pTop, pRight, pMid, pLeft };
                PointF[] leftFace = new PointF[] { pLeft, pMid, pBotMid, pBotLeft };
                PointF[] rightFace = new PointF[] { pMid, pRight, pBotRight, pBotMid };

                // Left armor face
                using (GraphicsPath lp = PolyPath(leftFace))
                using (LinearGradientBrush lb = new LinearGradientBrush(pLeft, pBotMid,
                    Color.FromArgb(255, 51, 65, 85), Color.FromArgb(255, 15, 23, 42)))
                {
                    g.FillPath(lb, lp);
                }

                // Right armor face
                using (GraphicsPath rp = PolyPath(rightFace))
                using (LinearGradientBrush rb = new LinearGradientBrush(pMid, pBotRight,
                    Color.FromArgb(255, 30, 41, 59), Color.FromArgb(255, 9, 14, 28)))
                {
                    g.FillPath(rb, rp);
                }

                // Top armor lid face
                using (GraphicsPath tp = PolyPath(topFace))
                using (LinearGradientBrush tb = new LinearGradientBrush(pTop, pMid,
                    Color.FromArgb(255, 100, 116, 139), Color.FromArgb(255, 30, 41, 59)))
                {
                    g.FillPath(tb, tp);
                }

                // Glowing Plasma Core Seams along the isometric edges and center split
                using (Pen glowWide = new Pen(Color.FromArgb(145, seam.R, seam.G, seam.B), 8f))
                using (Pen glowCore = new Pen(bright, 3.0f))
                {
                    glowWide.LineJoin = LineJoin.Round;
                    glowCore.LineJoin = LineJoin.Round;

                    // Outer & inner plasma seams
                    g.DrawPolygon(glowWide, topFace);
                    g.DrawLine(glowWide, pMid, pBotMid);
                    g.DrawLine(glowWide, Pt(cx - 43f, 66f), Pt(cx + 43f, 110f));
                    g.DrawLine(glowWide, Pt(cx + 43f, 66f), Pt(cx - 43f, 110f));

                    g.DrawPolygon(glowCore, topFace);
                    g.DrawPolygon(glowCore, leftFace);
                    g.DrawPolygon(glowCore, rightFace);
                    g.DrawLine(glowCore, Pt(cx - 43f, 66f), Pt(cx + 43f, 110f));
                    g.DrawLine(glowCore, Pt(cx + 43f, 66f), Pt(cx - 43f, 110f));
                }

                // Heavy FICSIT Amber Hydraulic Locking Clamps on the corners & sides
                PointF[] clampCenters = new PointF[]
                {
                    pLeft, pRight, pMid,
                    Pt(cx - 43f, 155f), Pt(cx + 43f, 155f)
                };
                foreach (PointF cc in clampCenters)
                {
                    using (SolidBrush cb = new SolidBrush(Color.FromArgb(255, 245, 158, 11)))
                    using (Pen cRim = new Pen(Color.FromArgb(255, 15, 23, 42), 2f))
                    {
                        g.FillRectangle(cb, cc.X - 11f, cc.Y - 8f, 22f, 16f);
                        g.DrawRectangle(cRim, cc.X - 11f, cc.Y - 8f, 22f, 16f);
                    }
                }

                // Center Glowing Loot Core Emblem on the Top Lid
                DrawGlowOrb(g, cx, 88f, 36f, seam, 235);
                using (SolidBrush coreB = new SolidBrush(Color.White))
                using (Pen coreRim = new Pen(seam, 3.2f))
                {
                    g.FillEllipse(coreB, cx - 16f, 88f - 9f, 32f, 18f);
                    g.DrawEllipse(coreRim, cx - 16f, 88f - 9f, 32f, 18f);
                }
            }
        }
        bmp.Save(outPath, ImageFormat.Png);
        bmp.Dispose();
    }

    // =========================================================================
    // 3. CHALLENGE WARP CORE (`256x256`)
    // =========================================================================
    public static void BuildWarpCorePng(string outPath)
    {
        Bitmap bmp = new Bitmap(256, 256, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(bmp))
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;
            g.Clear(Color.Transparent);

            float cx = 128f;
            float cy = 122f;

            DrawGlowOrb(g, cx, cy, 118f, Color.FromArgb(255, 56, 189, 248), 140);
            DrawGlowOrb(g, cx, cy, 84f, Color.FromArgb(255, 244, 114, 182), 160);

            // Base pedestal
            DrawIsoPrismHex(
                g, cx, 178f, 24f, 86f, 40f,
                Color.FromArgb(255, 51, 65, 85),
                Color.FromArgb(255, 15, 23, 42),
                Color.FromArgb(255, 15, 23, 42),
                Color.FromArgb(255, 30, 41, 59),
                Color.FromArgb(255, 51, 65, 85),
                Color.FromArgb(255, 56, 189, 248)
            );

            // Dual Left/Right Thruster Nozzles
            for (int side = -1; side <= 1; side += 2)
            {
                float nx = cx + side * 82f;
                float ny = cy + 8f;
                DrawGlowOrb(g, nx + side * 12f, ny, 34f, Color.FromArgb(255, 0, 245, 212), 210);
                using (SolidBrush nb = new SolidBrush(Color.FromArgb(255, 30, 41, 59)))
                using (Pen np = new Pen(Color.FromArgb(255, 148, 163, 184), 2.2f))
                {
                    g.FillEllipse(nb, nx - 18f, ny - 22f, 36f, 44f);
                    g.DrawEllipse(np, nx - 18f, ny - 22f, 36f, 44f);
                }
                using (SolidBrush coreFlame = new SolidBrush(Color.FromArgb(255, 165, 243, 252)))
                {
                    g.FillEllipse(coreFlame, nx - 10f, ny - 14f, 20f, 28f);
                }
            }

            // Concentric Spinning Gyroscopic Plasma Rings
            GraphicsState st1 = g.Save();
            g.TranslateTransform(cx, cy);
            g.RotateTransform(-24f);
            using (Pen ring1 = new Pen(Color.FromArgb(245, 56, 189, 248), 7f))
            using (Pen ring1Hi = new Pen(Color.White, 2.2f))
            {
                g.DrawEllipse(ring1, -86f, -42f, 172f, 84f);
                g.DrawEllipse(ring1Hi, -86f, -42f, 172f, 84f);
            }
            g.Restore(st1);

            GraphicsState st2 = g.Save();
            g.TranslateTransform(cx, cy);
            g.RotateTransform(28f);
            using (Pen ring2 = new Pen(Color.FromArgb(245, 245, 158, 11), 6f))
            using (Pen ring2Hi = new Pen(Color.FromArgb(255, 254, 240, 138), 2f))
            {
                g.DrawEllipse(ring2, -72f, -34f, 144f, 68f);
                g.DrawEllipse(ring2Hi, -72f, -34f, 144f, 68f);
            }
            g.Restore(st2);

            // Central Blazing Singularity Sphere
            DrawGlowOrb(g, cx, cy, 54f, Color.FromArgb(255, 254, 240, 138), 255);
            using (SolidBrush centerB = new SolidBrush(Color.White))
            using (Pen centerRim = new Pen(Color.FromArgb(255, 0, 245, 212), 4f))
            {
                g.FillEllipse(centerB, cx - 26f, cy - 26f, 52f, 52f);
                g.DrawEllipse(centerRim, cx - 26f, cy - 26f, 52f, 52f);
            }
        }
        bmp.Save(outPath, ImageFormat.Png);
        bmp.Dispose();
    }

    // =========================================================================
    // 4. HUD TELEMETRY COMMS POD (`680x130`)
    // =========================================================================
    public static void BuildTelemetryCommsPodPng(string outPath)
    {
        Bitmap bmp = new Bitmap(680, 130, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(bmp))
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;
            g.Clear(Color.Transparent);

            // Outer 3D Beveled Gunmetal Frame (`x: 6..674, y: 6..124`)
            using (GraphicsPath shadowP = RoundedRectPath(6f, 10f, 668f, 114f, 18f))
            using (SolidBrush shB = new SolidBrush(Color.FromArgb(215, 2, 6, 18)))
            {
                g.FillPath(shB, shadowP);
            }

            using (GraphicsPath outerP = RoundedRectPath(6f, 6f, 668f, 114f, 18f))
            using (LinearGradientBrush metalB = new LinearGradientBrush(
                new PointF(0f, 6f),
                new PointF(0f, 120f),
                Color.FromArgb(250, 51, 65, 85),
                Color.FromArgb(250, 15, 23, 42)))
            using (Pen outerRim = new Pen(Color.FromArgb(245, 56, 189, 248), 2.5f))
            {
                g.FillPath(metalB, outerP);
                g.DrawPath(outerRim, outerP);
            }

            // Inner Dark Glassmorphic Visor Cavity (`x: 16..664, y: 14..112`)
            using (GraphicsPath innerP = RoundedRectPath(16f, 14f, 648f, 98f, 13f))
            using (LinearGradientBrush visorB = new LinearGradientBrush(
                new PointF(0f, 14f),
                new PointF(0f, 112f),
                Color.FromArgb(242, 7, 13, 27),
                Color.FromArgb(246, 2, 6, 23)))
            using (Pen innerRim = new Pen(Color.FromArgb(180, 30, 41, 59), 1.5f))
            {
                g.FillPath(visorB, innerP);
                g.DrawPath(innerRim, innerP);
            }

            // Top & Bottom FICSIT Amber Hazard-Stripe Accent Bars
            using (SolidBrush amberB = new SolidBrush(Color.FromArgb(240, 245, 158, 11)))
            using (Pen darkStripe = new Pen(Color.FromArgb(235, 15, 23, 42), 5f))
            {
                g.FillRectangle(amberB, 145f, 7f, 140f, 6f);
                g.FillRectangle(amberB, 420f, 7f, 140f, 6f);
                for (float sx = 150f; sx < 285f; sx += 12f)
                {
                    g.DrawLine(darkStripe, sx, 6f, sx - 6f, 14f);
                }
                for (float sx = 425f; sx < 560f; sx += 12f)
                {
                    g.DrawLine(darkStripe, sx, 6f, sx - 6f, 14f);
                }
            }

            // Left Hexagonal Portrait Housing (`cx = 74, cy = 63`)
            PointF[] portHexOuter = IsoHexagon(74f, 63f, 48f, 46f);
            PointF[] portHexInner = IsoHexagon(74f, 63f, 41f, 39f);
            using (GraphicsPath pho = PolyPath(portHexOuter))
            using (SolidBrush pb = new SolidBrush(Color.FromArgb(255, 15, 23, 42)))
            using (Pen pRim = new Pen(Color.FromArgb(255, 56, 189, 248), 2.8f))
            {
                g.FillPath(pb, pho);
                g.DrawPath(pRim, pho);
            }
            using (GraphicsPath phi = PolyPath(portHexInner))
            using (Pen pRimIn = new Pen(Color.FromArgb(200, 251, 191, 36), 1.6f))
            {
                g.DrawPath(pRimIn, phi);
            }

            // Right Plasma Turbine Indicator (`cx = 618, cy = 63`)
            float tx = 618f;
            float ty = 63f;
            DrawGlowOrb(g, tx, ty, 44f, Color.FromArgb(255, 0, 245, 212), 185);
            using (SolidBrush tb = new SolidBrush(Color.FromArgb(255, 15, 23, 42)))
            using (Pen tOuter = new Pen(Color.FromArgb(255, 56, 189, 248), 2.5f))
            using (Pen tInner = new Pen(Color.FromArgb(255, 251, 191, 36), 2.0f))
            {
                g.FillEllipse(tb, tx - 34f, ty - 34f, 68f, 68f);
                g.DrawEllipse(tOuter, tx - 34f, ty - 34f, 68f, 68f);
                g.DrawEllipse(tInner, tx - 22f, ty - 22f, 44f, 44f);
            }
            using (SolidBrush coreB = new SolidBrush(Color.FromArgb(255, 165, 243, 252)))
            {
                g.FillEllipse(coreB, tx - 10f, ty - 10f, 20f, 20f);
            }
        }
        bmp.Save(outPath, ImageFormat.Png);
        bmp.Dispose();
    }
}
"@

Add-Type -TypeDefinition $csharpCode -ReferencedAssemblies System.Drawing

$dir = 'C:\projects\Wyatt and Emma Arcade v2\public\assets\starship'
[StarshipHardwareSpriteBuilder]::BuildShieldTurretsSheet("$dir\challenge-shield-turrets.png")
[StarshipHardwareSpriteBuilder]::BuildCargoCratesSheet("$dir\challenge-cargo-crates.png")
[StarshipHardwareSpriteBuilder]::BuildWarpCorePng("$dir\challenge-warp-core.png")
[StarshipHardwareSpriteBuilder]::BuildTelemetryCommsPodPng("$dir\hud-telemetry-comms-pod.png")

Write-Output "[Built 4 Bespoke 3D Isometric Hardware Sprites in public/assets/starship/]"
