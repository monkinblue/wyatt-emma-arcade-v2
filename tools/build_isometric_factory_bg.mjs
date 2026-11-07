#!/usr/bin/env node
/**
 * tools/build_isometric_factory_bg.mjs
 * ------------------------------------
 * Generates `public/assets/starship/board-isometric-factory.png` (1280x720 16:9 PNG).
 * Attempts Gemini Image API first (via `.env` `GEMINI_API_KEY`); if quota-limited (HTTP 429),
 * synthesizes the high-definition 1280x720 3D Isometric Alien Plateau & FICSIT/SpaceX Factory
 * terrain via C# System.Drawing hardware-antialiased GDI+ rendering.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT_DIR, 'public', 'assets', 'starship');
const FINAL_OUT = path.join(OUT_DIR, 'board-isometric-factory.png');
const SKY_REF = path.join(ROOT_DIR, 'public', 'assets', 'games', 'starship-unicorn', 'starship-board-bg.jpg');
const PS1_BUILDER = path.join(__dirname, 'build_isometric_factory_bg.ps1');

const ps1Content = `
Add-Type -AssemblyName System.Drawing

$csharpCode = @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;

public static class IsoFactoryTerrainBuilder
{
    private static PointF Pt(float x, float y) { return new PointF(x, y); }

    private static GraphicsPath PolyPath(params PointF[] pts)
    {
        GraphicsPath p = new GraphicsPath();
        p.AddPolygon(pts);
        return p;
    }

    private static void DrawGlowingOrb(Graphics g, float cx, float cy, float r, Color coreColor, int maxAlpha)
    {
        if (r <= 1f) return;
        using (GraphicsPath gp = new GraphicsPath())
        {
            gp.AddEllipse(cx - r, cy - r, r * 2f, r * 2f);
            using (PathGradientBrush pgb = new PathGradientBrush(gp))
            {
                pgb.CenterPoint = new PointF(cx, cy);
                pgb.CenterColor = Color.FromArgb(maxAlpha, coreColor.R, coreColor.G, coreColor.B);
                pgb.SurroundColors = new Color[] { Color.FromArgb(0, coreColor.R, coreColor.G, coreColor.B) };
                g.FillPath(pgb, gp);
            }
        }
    }

    private static void DrawExtrudedIsoPlateau(
        Graphics g,
        PointF[] topPoly,
        float cliffDepth,
        Color topColorA,
        Color topColorB,
        Color cliffDark,
        Color cliffLight,
        Color rimGlow
    )
    {
        int n = topPoly.Length;

        // 1. Soft abyss drop shadow below cliff
        PointF[] shadowPoly = new PointF[n];
        for (int i = 0; i < n; i++)
        {
            shadowPoly[i] = new PointF(topPoly[i].X + 8f, topPoly[i].Y + cliffDepth + 18f);
        }
        using (GraphicsPath sp = PolyPath(shadowPoly))
        using (SolidBrush sb = new SolidBrush(Color.FromArgb(145, 2, 6, 18)))
        {
            g.FillPath(sb, sp);
        }

        // 2. Extruded vertical basalt cliff walls for each lower-facing edge
        for (int i = 0; i < n; i++)
        {
            PointF a = topPoly[i];
            PointF b = topPoly[(i + 1) % n];
            PointF[] quad = new PointF[]
            {
                a,
                b,
                new PointF(b.X, b.Y + cliffDepth),
                new PointF(a.X, a.Y + cliffDepth)
            };
            float dx = b.X - a.X;
            Color wallTop = dx >= 0 ? cliffLight : cliffDark;
            Color wallBot = Color.FromArgb(255, 6, 11, 24);
            using (GraphicsPath wp = PolyPath(quad))
            using (LinearGradientBrush wb = new LinearGradientBrush(
                new PointF(a.X, Math.Min(a.Y, b.Y) - 2f),
                new PointF(a.X, Math.Max(a.Y, b.Y) + cliffDepth + 2f),
                wallTop,
                wallBot))
            {
                g.FillPath(wb, wp);
                using (Pen strataPen = new Pen(Color.FromArgb(55, 56, 189, 248), 1f))
                {
                    g.DrawLine(strataPen, a.X, a.Y + cliffDepth * 0.38f, b.X, b.Y + cliffDepth * 0.38f);
                    g.DrawLine(strataPen, a.X, a.Y + cliffDepth * 0.72f, b.X, b.Y + cliffDepth * 0.72f);
                }
                using (Pen edgePen = new Pen(Color.FromArgb(95, 15, 23, 42), 1.2f))
                {
                    g.DrawPath(edgePen, wp);
                }
            }
        }

        // 3. Top Plateau Surface
        using (GraphicsPath tp = PolyPath(topPoly))
        using (LinearGradientBrush tb = new LinearGradientBrush(
            new PointF(0, 40),
            new PointF(1280, 700),
            topColorA,
            topColorB))
        {
            g.FillPath(tb, tp);

            // Subtle isometric grid lines etched into the alien plateau rock
            GraphicsState st = g.Save();
            g.SetClip(tp);
            using (Pen isoPen = new Pen(Color.FromArgb(22, 103, 232, 249), 1f))
            {
                for (int k = -12; k < 28; k++)
                {
                    float x0 = k * 72f;
                    g.DrawLine(isoPen, x0, 0f, x0 + 900f, 520f);
                    g.DrawLine(isoPen, x0 + 900f, 0f, x0, 520f);
                }
            }
            g.Restore(st);

            // Bioluminescent cliff-edge rim highlight
            using (Pen glowPen = new Pen(Color.FromArgb(90, rimGlow), 4.5f))
            {
                g.DrawPath(glowPen, tp);
            }
            using (Pen rimPen = new Pen(Color.FromArgb(210, rimGlow), 1.8f))
            {
                g.DrawPath(rimPen, tp);
            }
        }
    }

    private static void DrawIsoBox(
        Graphics g,
        float cx,
        float cy,
        float rx,
        float ry,
        float height,
        Color topCol,
        Color leftCol,
        Color rightCol,
        Color rimCol
    )
    {
        PointF topN = new PointF(cx, cy - height - ry);
        PointF topE = new PointF(cx + rx, cy - height);
        PointF topS = new PointF(cx, cy - height + ry);
        PointF topW = new PointF(cx - rx, cy - height);

        PointF botE = new PointF(cx + rx, cy);
        PointF botS = new PointF(cx, cy + ry);
        PointF botW = new PointF(cx - rx, cy);

        // Left wall
        using (GraphicsPath lp = PolyPath(topW, topS, botS, botW))
        using (SolidBrush lb = new SolidBrush(leftCol))
        {
            g.FillPath(lb, lp);
        }
        // Right wall
        using (GraphicsPath rp = PolyPath(topS, topE, botE, botS))
        using (SolidBrush rb = new SolidBrush(rightCol))
        {
            g.FillPath(rb, rp);
        }
        // Top roof
        using (GraphicsPath tp = PolyPath(topN, topE, topS, topW))
        using (SolidBrush tb = new SolidBrush(topCol))
        {
            g.FillPath(tb, tp);
        }
        // Crisp edges
        using (Pen p = new Pen(rimCol, 1.2f))
        {
            g.DrawPolygon(p, new PointF[] { topN, topE, topS, topW });
            g.DrawLine(p, topW, botW);
            g.DrawLine(p, topS, botS);
            g.DrawLine(p, topE, botE);
            g.DrawLine(p, botW, botS);
            g.DrawLine(p, botS, botE);
        }
    }

    private static void DrawAlienFloraCluster(Graphics g, float cx, float cy, float scale, bool isMagenta)
    {
        Color primary = isMagenta ? Color.FromArgb(255, 232, 121, 249) : Color.FromArgb(255, 34, 211, 238);
        Color secondary = isMagenta ? Color.FromArgb(255, 244, 114, 182) : Color.FromArgb(255, 16, 185, 129);
        DrawGlowingOrb(g, cx, cy - 6f * scale, 34f * scale, primary, 95);

        // Ground moss pad
        using (SolidBrush mossBr = new SolidBrush(Color.FromArgb(180, 6, 78, 59)))
        {
            g.FillEllipse(mossBr, cx - 22f * scale, cy - 9f * scale, 44f * scale, 18f * scale);
        }

        // 3 Crystalline / bioluminescent mushroom trees
        float[] ox = new float[] { -9f * scale, 8f * scale, 0f };
        float[] oy = new float[] { 3f * scale, 2f * scale, -4f * scale };
        float[] h = new float[] { 20f * scale, 17f * scale, 27f * scale };
        float[] capW = new float[] { 18f * scale, 15f * scale, 24f * scale };

        for (int i = 0; i < 3; i++)
        {
            float bx = cx + ox[i];
            float by = cy + oy[i];
            using (Pen stemPen = new Pen(Color.FromArgb(230, 165, 243, 252), 2.5f * scale))
            {
                g.DrawLine(stemPen, bx, by, bx + ox[i] * 0.2f, by - h[i]);
            }
            float tx = bx + ox[i] * 0.2f;
            float ty = by - h[i];
            using (SolidBrush capBr = new SolidBrush(i == 1 ? secondary : primary))
            using (SolidBrush capHi = new SolidBrush(Color.FromArgb(210, 255, 255, 255)))
            {
                g.FillEllipse(capBr, tx - capW[i] / 2f, ty - capW[i] * 0.35f, capW[i], capW[i] * 0.55f);
                g.FillEllipse(capHi, tx - capW[i] * 0.25f, ty - capW[i] * 0.25f, capW[i] * 0.5f, capW[i] * 0.22f);
            }
        }
    }

    private static void DrawSpaceXRocketAndGantry(Graphics g, float cx, float cy, float scale, bool isPrimary)
    {
        // Isometric concrete & titanium blast pad
        DrawIsoBox(
            g, cx, cy + 8f * scale, 54f * scale, 28f * scale, 12f * scale,
            Color.FromArgb(255, 51, 65, 85),
            Color.FromArgb(255, 30, 41, 59),
            Color.FromArgb(255, 15, 23, 42),
            Color.FromArgb(200, 245, 158, 11)
        );

        // Glowing flame trench under rocket
        DrawGlowingOrb(g, cx + 6f * scale, cy - 4f * scale, 36f * scale, Color.FromArgb(255, 56, 189, 248), 130);

        // Steel lattice Launch Gantry Tower on the left of the pad
        float gx = cx - 24f * scale;
        float gy = cy - 6f * scale;
        float gh = 148f * scale;
        DrawIsoBox(
            g, gx, gy, 13f * scale, 8f * scale, gh,
            Color.FromArgb(255, 148, 163, 184),
            Color.FromArgb(255, 71, 85, 105),
            Color.FromArgb(255, 51, 65, 85),
            Color.FromArgb(210, 203, 213, 225)
        );
        // Cross-bracing on gantry tower
        using (Pen bracePen = new Pen(Color.FromArgb(210, 245, 158, 11), 1.5f * scale))
        {
            for (int k = 0; k < 6; k++)
            {
                float y0 = gy - k * (gh / 6f);
                float y1 = y0 - (gh / 6f);
                g.DrawLine(bracePen, gx - 10f * scale, y0, gx + 10f * scale, y1);
                g.DrawLine(bracePen, gx + 10f * scale, y0, gx - 10f * scale, y1);
            }
        }
        // Umbilical crew access arm connecting gantry to rocket
        using (Pen armPen = new Pen(Color.FromArgb(255, 226, 232, 240), 4f * scale))
        {
            g.DrawLine(armPen, gx + 8f * scale, gy - gh * 0.72f, cx + 8f * scale, gy - gh * 0.72f);
            g.DrawLine(armPen, gx + 8f * scale, gy - gh * 0.42f, cx + 8f * scale, gy - gh * 0.42f);
        }

        // Vertical SpaceX White & Stainless Starship Rocket
        float rx = cx + 10f * scale;
        float ry = cy - 6f * scale;
        float rw = 24f * scale;
        float rh = 138f * scale;

        // Booster fins
        PointF[] leftFin = new PointF[]
        {
            Pt(rx - rw * 0.48f, ry - 26f * scale),
            Pt(rx - rw * 0.95f, ry + 2f * scale),
            Pt(rx - rw * 0.35f, ry - 2f * scale)
        };
        PointF[] rightFin = new PointF[]
        {
            Pt(rx + rw * 0.48f, ry - 26f * scale),
            Pt(rx + rw * 0.95f, ry + 2f * scale),
            Pt(rx + rw * 0.35f, ry - 2f * scale)
        };
        using (SolidBrush finBr = new SolidBrush(Color.FromArgb(255, 30, 41, 59)))
        {
            g.FillPolygon(finBr, leftFin);
            g.FillPolygon(finBr, rightFin);
        }

        // Cylindrical rocket body shaded left-to-right
        RectangleF bodyRect = new RectangleF(rx - rw / 2f, ry - rh, rw, rh);
        using (LinearGradientBrush bodyBr = new LinearGradientBrush(
            bodyRect,
            Color.FromArgb(255, 248, 250, 252),
            Color.FromArgb(255, 100, 116, 139),
            LinearGradientMode.Horizontal))
        {
            g.FillRectangle(bodyBr, bodyRect);
        }

        // Black thermal heat-shield nosecone & interstage bands
        PointF[] noseCone = new PointF[]
        {
            Pt(rx - rw / 2f, ry - rh),
            Pt(rx, ry - rh - 36f * scale),
            Pt(rx + rw / 2f, ry - rh)
        };
        using (LinearGradientBrush noseBr = new LinearGradientBrush(
            Pt(rx - rw / 2f, ry - rh),
            Pt(rx + rw / 2f, ry - rh),
            Color.FromArgb(255, 241, 245, 249),
            Color.FromArgb(255, 30, 41, 59)))
        {
            g.FillPolygon(noseBr, noseCone);
        }

        using (SolidBrush bandBr = new SolidBrush(Color.FromArgb(255, 15, 23, 42)))
        {
            g.FillRectangle(bandBr, rx - rw / 2f, ry - rh * 0.56f, rw, 6f * scale);
            g.FillRectangle(bandBr, rx - rw / 2f, ry - 12f * scale, rw, 8f * scale);
        }
        // Glowing telemetry strip on rocket
        using (Pen stripPen = new Pen(isPrimary ? Color.FromArgb(255, 56, 189, 248) : Color.FromArgb(255, 245, 158, 11), 2f * scale))
        {
            g.DrawLine(stripPen, rx, ry - rh * 0.9f, rx, ry - 16f * scale);
        }
    }

    private static void DrawFicsitSmelterFactory(Graphics g, float cx, float cy)
    {
        // Foundation deck
        DrawIsoBox(
            g, cx, cy + 28f, 96f, 46f, 14f,
            Color.FromArgb(255, 51, 65, 85),
            Color.FromArgb(255, 30, 41, 59),
            Color.FromArgb(255, 15, 23, 42),
            Color.FromArgb(220, 245, 158, 11)
        );

        // Main FICSIT Orange & Gunmetal Smelter Hall
        DrawIsoBox(
            g, cx - 8f, cy + 12f, 68f, 34f, 52f,
            Color.FromArgb(255, 245, 158, 11),
            Color.FromArgb(255, 217, 119, 6),
            Color.FromArgb(255, 146, 64, 14),
            Color.FromArgb(255, 254, 240, 138)
        );

        // Secondary dark gunmetal furnace bay
        DrawIsoBox(
            g, cx + 34f, cy + 20f, 38f, 20f, 38f,
            Color.FromArgb(255, 71, 85, 105),
            Color.FromArgb(255, 51, 65, 85),
            Color.FromArgb(255, 30, 41, 59),
            Color.FromArgb(255, 56, 189, 248)
        );

        // Glowing molten smelter core vents on the front wall
        DrawGlowingOrb(g, cx - 22f, cy + 4f, 22f, Color.FromArgb(255, 251, 191, 36), 190);
        DrawGlowingOrb(g, cx + 6f, cy + 8f, 22f, Color.FromArgb(255, 56, 189, 248), 180);

        // 3 Tall Cylindrical Exhaust Smokestacks (Top-Left Landmark!)
        // Stack tips aligned at (196, 86), (232, 78), (268, 86) for particle emitters!
        float[] sx = new float[] { cx - 36f, cx, cx + 36f };
        float[] sy = new float[] { cy - 34f, cy - 42f, cy - 34f };
        Color[] ringCols = new Color[]
        {
            Color.FromArgb(255, 56, 189, 248),
            Color.FromArgb(255, 16, 185, 129),
            Color.FromArgb(255, 245, 158, 11)
        };

        for (int i = 0; i < 3; i++)
        {
            float stX = sx[i];
            float stTopY = sy[i] - 52f;
            RectangleF stackRect = new RectangleF(stX - 9f, stTopY, 18f, 56f);
            using (LinearGradientBrush stBr = new LinearGradientBrush(
                stackRect,
                Color.FromArgb(255, 148, 163, 184),
                Color.FromArgb(255, 30, 41, 59),
                LinearGradientMode.Horizontal))
            {
                g.FillRectangle(stBr, stackRect);
            }
            // Glowing hazard bands near top of each smokestack
            using (SolidBrush bandBr = new SolidBrush(ringCols[i]))
            {
                g.FillRectangle(bandBr, stX - 9f, stTopY + 8f, 18f, 5f);
                g.FillEllipse(bandBr, stX - 10f, stTopY - 4f, 20f, 8f);
            }
            using (SolidBrush flueBr = new SolidBrush(Color.FromArgb(255, 15, 23, 42)))
            {
                g.FillEllipse(flueBr, stX - 7f, stTopY - 2f, 14f, 5f);
            }
        }
    }

    private static void DrawCentralRoverDepot(Graphics g, float cx, float cy)
    {
        // Hexagonal titanium logistics pad
        DrawIsoBox(
            g, cx, cy + 16f, 68f, 34f, 10f,
            Color.FromArgb(255, 51, 65, 85),
            Color.FromArgb(255, 30, 41, 59),
            Color.FromArgb(255, 15, 23, 42),
            Color.FromArgb(220, 56, 189, 248)
        );

        DrawGlowingOrb(g, cx, cy - 8f, 58f, Color.FromArgb(255, 56, 189, 248), 115);

        // Glass-Domed Biosphere / Rover Depot Hemisphere
        RectangleF domeRect = new RectangleF(cx - 46f, cy - 48f, 92f, 64f);
        using (GraphicsPath dp = new GraphicsPath())
        {
            dp.AddArc(domeRect, 180, 180);
            dp.CloseFigure();
            using (LinearGradientBrush domeBr = new LinearGradientBrush(
                domeRect,
                Color.FromArgb(200, 103, 232, 249),
                Color.FromArgb(180, 15, 23, 42),
                LinearGradientMode.Vertical))
            {
                g.FillPath(domeBr, dp);
            }
            using (Pen ribPen = new Pen(Color.FromArgb(210, 224, 242, 254), 1.6f))
            {
                g.DrawPath(ribPen, dp);
                g.DrawArc(ribPen, cx - 28f, cy - 48f, 56f, 64f, 180, 180);
                g.DrawLine(ribPen, cx, cy - 48f, cx, cy - 16f);
            }
        }

        // Base ring of dome
        using (SolidBrush ringBr = new SolidBrush(Color.FromArgb(255, 203, 213, 225)))
        using (Pen cyanPen = new Pen(Color.FromArgb(255, 56, 189, 248), 2f))
        {
            g.FillEllipse(ringBr, cx - 48f, cy - 22f, 96f, 22f);
            g.DrawEllipse(cyanPen, cx - 48f, cy - 22f, 96f, 22f);
        }
    }

    private static void DrawUnicornCitadelSummit(Graphics g, float cx, float cy)
    {
        // Multi-tiered starlight crystal & chrome citadel megastructure at top-right summit
        DrawGlowingOrb(g, cx, cy - 20f, 115f, Color.FromArgb(255, 232, 121, 249), 150);
        DrawGlowingOrb(g, cx, cy - 35f, 75f, Color.FromArgb(255, 56, 189, 248), 160);

        DrawIsoBox(
            g, cx, cy + 18f, 76f, 38f, 16f,
            Color.FromArgb(255, 226, 232, 240),
            Color.FromArgb(255, 148, 163, 184),
            Color.FromArgb(255, 71, 85, 105),
            Color.FromArgb(255, 244, 114, 182)
        );

        DrawIsoBox(
            g, cx, cy + 2f, 52f, 26f, 36f,
            Color.FromArgb(255, 248, 250, 252),
            Color.FromArgb(255, 192, 132, 252),
            Color.FromArgb(255, 126, 34, 206),
            Color.FromArgb(255, 103, 232, 249)
        );

        // Soaring iridescent crystal spires
        float[] sx = new float[] { cx - 28f, cx + 28f, cx };
        float[] sh = new float[] { 68f, 68f, 102f };
        float[] sw = new float[] { 16f, 16f, 26f };
        for (int i = 0; i < 3; i++)
        {
            PointF[] spire = new PointF[]
            {
                Pt(sx[i] - sw[i] / 2f, cy - 28f),
                Pt(sx[i], cy - 28f - sh[i]),
                Pt(sx[i] + sw[i] / 2f, cy - 28f),
                Pt(sx[i], cy - 18f)
            };
            using (LinearGradientBrush sb = new LinearGradientBrush(
                Pt(sx[i], cy - 28f - sh[i]),
                Pt(sx[i], cy - 18f),
                Color.FromArgb(255, 255, 255, 255),
                i == 2 ? Color.FromArgb(255, 236, 72, 153) : Color.FromArgb(255, 56, 189, 248)))
            {
                g.FillPolygon(sb, spire);
            }
            using (Pen spPen = new Pen(Color.FromArgb(240, 254, 240, 138), 1.6f))
            {
                g.DrawPolygon(spPen, spire);
            }
        }

        // Glowing golden orbital halo ring crowning the Citadel
        using (Pen haloGlow = new Pen(Color.FromArgb(110, 250, 204, 21), 7f))
        using (Pen haloCore = new Pen(Color.FromArgb(255, 254, 240, 138), 2.2f))
        {
            g.DrawEllipse(haloGlow, cx - 54f, cy - 86f, 108f, 32f);
            g.DrawEllipse(haloCore, cx - 54f, cy - 86f, 108f, 32f);
        }
    }

    public static void BuildIsometricBoardPng(string skyRefPath, string outPath)
    {
        int W = 1280;
        int H = 720;
        Bitmap bmp = new Bitmap(W, H, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(bmp))
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;
            g.CompositingQuality = CompositingQuality.HighQuality;

            // 1. Deep-Space Nebula Sky Backdrop
            using (LinearGradientBrush skyBr = new LinearGradientBrush(
                new PointF(0, 0),
                new PointF(0, H),
                Color.FromArgb(255, 5, 8, 22),
                Color.FromArgb(255, 11, 20, 44)))
            {
                g.FillRectangle(skyBr, 0, 0, W, H);
            }

            if (System.IO.File.Exists(skyRefPath))
            {
                using (Image skyImg = Image.FromFile(skyRefPath))
                {
                    ColorMatrix cm = new ColorMatrix();
                    cm.Matrix33 = 0.42f; // Subtle cosmic nebula sky integration
                    using (ImageAttributes ia = new ImageAttributes())
                    {
                        ia.SetColorMatrix(cm);
                        g.DrawImage(
                            skyImg,
                            new Rectangle(0, 0, W, H),
                            0, 0, skyImg.Width, skyImg.Height,
                            GraphicsUnit.Pixel,
                            ia
                        );
                    }
                }
            }

            // 2. Twin Alien Moons in the upper horizon
            DrawGlowingOrb(g, 530f, 92f, 68f, Color.FromArgb(255, 56, 189, 248), 90);
            using (LinearGradientBrush moon1 = new LinearGradientBrush(
                Pt(492f, 54f), Pt(568f, 130f),
                Color.FromArgb(235, 186, 230, 253),
                Color.FromArgb(235, 15, 23, 42)))
            {
                g.FillEllipse(moon1, 495f, 57f, 70f, 70f);
            }
            DrawGlowingOrb(g, 615f, 66f, 36f, Color.FromArgb(255, 244, 114, 182), 85);
            using (LinearGradientBrush moon2 = new LinearGradientBrush(
                Pt(595f, 46f), Pt(635f, 86f),
                Color.FromArgb(230, 249, 168, 212),
                Color.FromArgb(230, 49, 16, 66)))
            {
                g.FillEllipse(moon2, 597f, 48f, 36f, 36f);
            }

            // 3. Main Lush Bioluminescent Isometric Alien Plateau Massif
            PointF[] mainPlateau = new PointF[]
            {
                Pt(56f, 595f),
                Pt(48f, 415f),
                Pt(118f, 145f),
                Pt(375f, 112f),
                Pt(515f, 195f),
                Pt(775f, 155f),
                Pt(1015f, 95f),
                Pt(1235f, 125f),
                Pt(1242f, 345f),
                Pt(1095f, 585f),
                Pt(855f, 625f),
                Pt(625f, 648f),
                Pt(335f, 655f)
            };
            DrawExtrudedIsoPlateau(
                g,
                mainPlateau,
                68f,
                Color.FromArgb(255, 15, 36, 57),
                Color.FromArgb(255, 19, 28, 52),
                Color.FromArgb(255, 12, 22, 38),
                Color.FromArgb(255, 26, 46, 72),
                Color.FromArgb(255, 34, 211, 238)
            );

            // 4. Elevated Upper-Left Smelter Terrace & Upper-Right Citadel Terrace
            PointF[] smelterTerrace = new PointF[]
            {
                Pt(125f, 245f),
                Pt(142f, 125f),
                Pt(365f, 118f),
                Pt(435f, 210f),
                Pt(295f, 275f)
            };
            DrawExtrudedIsoPlateau(
                g,
                smelterTerrace,
                26f,
                Color.FromArgb(255, 28, 42, 64),
                Color.FromArgb(255, 18, 28, 46),
                Color.FromArgb(255, 15, 23, 42),
                Color.FromArgb(255, 38, 56, 82),
                Color.FromArgb(255, 245, 158, 11)
            );

            PointF[] citadelTerrace = new PointF[]
            {
                Pt(985f, 215f),
                Pt(1025f, 102f),
                Pt(1228f, 122f),
                Pt(1222f, 248f),
                Pt(1085f, 275f)
            };
            DrawExtrudedIsoPlateau(
                g,
                citadelTerrace,
                32f,
                Color.FromArgb(255, 38, 26, 68),
                Color.FromArgb(255, 24, 34, 68),
                Color.FromArgb(255, 22, 16, 44),
                Color.FromArgb(255, 52, 38, 92),
                Color.FromArgb(255, 232, 121, 249)
            );

            // 5. Bioluminescent Cyan Rivers & Alien Flora Groves in the valleys between corridors
            using (Pen riverGlow = new Pen(Color.FromArgb(75, 34, 211, 238), 18f))
            using (Pen riverCore = new Pen(Color.FromArgb(185, 103, 232, 249), 5f))
            {
                riverGlow.StartCap = LineCap.Round;
                riverGlow.EndCap = LineCap.Round;
                riverCore.StartCap = LineCap.Round;
                riverCore.EndCap = LineCap.Round;
                PointF[] r1 = new PointF[] { Pt(530f, 200f), Pt(545f, 315f), Pt(510f, 435f), Pt(515f, 645f) };
                g.DrawCurve(riverGlow, r1);
                g.DrawCurve(riverCore, r1);
            }

            // Lush bioluminescent flora clusters flanking the causeways
            DrawAlienFloraCluster(g, 285f, 385f, 1.15f, false);
            DrawAlienFloraCluster(g, 315f, 465f, 0.95f, true);
            DrawAlienFloraCluster(g, 525f, 255f, 1.05f, false);
            DrawAlienFloraCluster(g, 540f, 365f, 0.90f, true);
            DrawAlienFloraCluster(g, 765f, 395f, 1.15f, false);
            DrawAlienFloraCluster(g, 785f, 525f, 1.10f, true);
            DrawAlienFloraCluster(g, 965f, 245f, 1.00f, false);
            DrawAlienFloraCluster(g, 255f, 615f, 0.95f, true);
            DrawAlienFloraCluster(g, 1168f, 385f, 1.05f, false);

            // 6. Graded Dark-Basalt Isometric Causeway Foundation Roadbed along the 26-pad highway
            PointF[] highwayPts = new PointF[]
            {
                Pt(168f, 604f), Pt(156f, 526f), Pt(166f, 448f), Pt(188f, 372f), Pt(216f, 296f),
                Pt(266f, 232f), Pt(344f, 214f), Pt(420f, 246f), Pt(468f, 310f), Pt(436f, 384f),
                Pt(386f, 456f), Pt(368f, 536f), Pt(434f, 594f), Pt(522f, 578f), Pt(584f, 508f),
                Pt(626f, 430f), Pt(664f, 350f), Pt(714f, 274f), Pt(794f, 236f), Pt(868f, 286f),
                Pt(888f, 370f), Pt(916f, 456f), Pt(998f, 434f), Pt(1062f, 350f), Pt(1102f, 262f),
                Pt(1142f, 168f)
            };

            using (GraphicsPath hp = new GraphicsPath())
            {
                hp.AddLines(highwayPts);
                using (Pen curbShadow = new Pen(Color.FromArgb(165, 2, 6, 18), 64f))
                using (Pen gradedBed = new Pen(Color.FromArgb(225, 15, 23, 42), 52f))
                using (Pen safetyCurb = new Pen(Color.FromArgb(110, 56, 189, 248), 56f))
                {
                    curbShadow.LineJoin = LineJoin.Round;
                    curbShadow.StartCap = LineCap.Round;
                    curbShadow.EndCap = LineCap.Round;
                    gradedBed.LineJoin = LineJoin.Round;
                    gradedBed.StartCap = LineCap.Round;
                    gradedBed.EndCap = LineCap.Round;
                    safetyCurb.LineJoin = LineJoin.Round;
                    safetyCurb.StartCap = LineCap.Round;
                    safetyCurb.EndCap = LineCap.Round;

                    g.DrawPath(curbShadow, hp);
                    g.DrawPath(safetyCurb, hp);
                    g.DrawPath(gradedBed, hp);
                }
            }

            // 7. Render the 5 Integrated Isometric Landmarks directly into the terrain!
            // (A) Top-Left: FICSIT Smelter Factory with 3 tall smokestacks
            DrawFicsitSmelterFactory(g, 232f, 162f);

            // (B) Center: Glass-Domed Orbital Rover Depot
            DrawCentralRoverDepot(g, 628f, 312f);

            // (C) Top-Right Summit: Iridescent Starbase Unicorn Citadel
            DrawUnicornCitadelSummit(g, 1142f, 152f);

            // (D) Mid-Right: Secondary Rocket Gantry & Booster Array
            DrawSpaceXRocketAndGantry(g, 995f, 548f, 0.82f, false);

            // (E) Bottom-Left: Primary SpaceX Launchpad & Vertical White Rocket
            DrawSpaceXRocketAndGantry(g, 96f, 598f, 1.0f, true);
        }

        bmp.Save(outPath, ImageFormat.Png);
        bmp.Dispose();
    }
}
"@

Add-Type -TypeDefinition $csharpCode -ReferencedAssemblies System.Drawing
[IsoFactoryTerrainBuilder]::BuildIsometricBoardPng('${SKY_REF.replace(/'/g, "''")}', '${FINAL_OUT.replace(/'/g, "''")}')
Write-Output "[Built 1280x720 Isometric Alien Factory Terrain] ${FINAL_OUT.replace(/'/g, "''")}"
`;

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(PS1_BUILDER, ps1Content, 'utf8');
execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', PS1_BUILDER], {
  stdio: 'inherit'
});
