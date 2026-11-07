#!/usr/bin/env node
/**
 * scripts/generate_conveyor_world_bg.mjs
 * --------------------------------------
 * Generates `public/assets/starship/board-isometric-conveyor-world.png` (1280x720 16:9 PNG).
 * Calls Gemini Image Generation API (`GEMINI_API_KEY` from `.env`) with the exact prompt for a
 * high-angle 3D isometric sci-fi board game table set on a bioluminescent alien plateau with a
 * single continuous, wide, winding 3D metallic conveyor-belt highway with 90-degree banked
 * isometric turns and glowing side plasma pipes built flat onto the ground plane.
 * Also includes a precision 1280x720 C# GDI+ compositor/upscaler that guarantees exact 1280x720
 * resolution and crisp ground-plane isometric conveyor rollers if the API is quota-limited.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT_DIR, 'public', 'assets', 'starship');
const FINAL_OUT = path.join(OUT_DIR, 'board-isometric-conveyor-world.png');
const RAW_API_OUT = path.join(OUT_DIR, 'board-isometric-conveyor-world-raw.png');
const SKY_REF = path.join(ROOT_DIR, 'public', 'assets', 'games', 'starship-unicorn', 'starship-board-bg.jpg');

function loadEnv(rootDir) {
  const env = {};
  const envPath = path.join(rootDir, '.env');
  if (fs.existsSync(envPath)) {
    for (const rawLine of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#') || !line.includes('=')) continue;
      const idx = line.indexOf('=');
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
      env[k] = v;
    }
  }
  return env;
}

const PROMPT =
  'High-angle 3D isometric sci-fi board game table set on a bioluminescent alien plateau under a twin-moon nebula sky, ' +
  'Unreal Engine 5 pre-rendered 4K isometric diorama, razor-sharp 16:9 widescreen game environment background. ' +
  'Built flat onto the isometric ground plane is a single continuous, wide, winding 3D metallic FICSIT conveyor-belt highway ' +
  'with visible steel conveyor rollers, 30-degree isometric straightaways, 90-degree banked isometric turns, brushed-titanium guardrails, ' +
  'and glowing cyan and amber side plasma pipes running parallel along the ground. ' +
  'The ground-level isometric conveyor highway snakes continuously from a bottom-left SpaceX vertical white rocket launchpad (Pad 0), ' +
  'up past a top-left multi-stack industrial smelter factory with glowing furnaces, down and up through a central glass-domed industrial rover depot, ' +
  'past a mid-right secondary rocket booster gantry, and up to a gleaming top-right iridescent Unicorn Citadel docking bay. ' +
  'Strictly NO UI boxes, NO cards, NO floating 2D ribbons, NO text labels, NO numbers, NO watermarks in the image.';

async function tryGeminiImageGeneration(apiKey) {
  const models = [
    'gemini-2.5-flash-image',
    'gemini-2.0-flash-exp-image-generation'
  ];

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload = {
        contents: [{ parts: [{ text: PROMPT }] }],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE']
        }
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const txt = await res.text();
        console.log(`[Info] ${model} HTTP ${res.status}: ${txt.slice(0, 140)}`);
        continue;
      }

      const data = await res.json();
      for (const cand of data.candidates ?? []) {
        for (const part of cand.content?.parts ?? []) {
          const inline = part.inlineData || part.inline_data;
          if (inline && inline.data) {
            const buf = Buffer.from(inline.data, 'base64');
            fs.mkdirSync(OUT_DIR, { recursive: true });
            fs.writeFileSync(RAW_API_OUT, buf);
            console.log(`[GEMINI API GENERATED] ${RAW_API_OUT} (${buf.length.toLocaleString()} bytes)`);
            return true;
          }
        }
      }
    } catch (err) {
      console.log(`[Info] ${model} error: ${err.message}`);
    }
  }

  // Try Imagen 3
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;
    const payload = {
      instances: [{ prompt: PROMPT }],
      parameters: { sampleCount: 1, aspectRatio: '16:9' }
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      const data = await res.json();
      const b64 = data?.predictions?.[0]?.bytesBase64Encoded;
      if (b64) {
        const buf = Buffer.from(b64, 'base64');
        fs.mkdirSync(OUT_DIR, { recursive: true });
        fs.writeFileSync(RAW_API_OUT, buf);
        console.log(`[IMAGEN 3 GENERATED] ${RAW_API_OUT} (${buf.length.toLocaleString()} bytes)`);
        return true;
      }
    } else {
      console.log(`[Info] imagen-3.0 HTTP ${res.status}`);
    }
  } catch (err) {
    console.log(`[Info] imagen-3.0 error: ${err.message}`);
  }

  return false;
}

function buildPrecisionIsometricConveyorWorldPng() {
  const ps1Path = path.join(ROOT_DIR, 'tools', 'build_conveyor_world_bg.ps1');
  const ps1Content = `
Add-Type -AssemblyName System.Drawing

$csharpCode = @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;

public static class IsoConveyorWorldBuilder
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
        PointF[] shadowPoly = new PointF[n];
        for (int i = 0; i < n; i++)
        {
            shadowPoly[i] = new PointF(topPoly[i].X + 8f, topPoly[i].Y + cliffDepth + 18f);
        }
        using (GraphicsPath sp = PolyPath(shadowPoly))
        using (SolidBrush sb = new SolidBrush(Color.FromArgb(150, 2, 6, 18)))
        {
            g.FillPath(sb, sp);
        }

        for (int i = 0; i < n; i++)
        {
            PointF a = topPoly[i];
            PointF b = topPoly[(i + 1) % n];
            PointF[] quad = new PointF[]
            {
                a, b,
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
                wallTop, wallBot))
            {
                g.FillPath(wb, wp);
                using (Pen strataPen = new Pen(Color.FromArgb(55, 56, 189, 248), 1f))
                {
                    g.DrawLine(strataPen, a.X, a.Y + cliffDepth * 0.38f, b.X, b.Y + cliffDepth * 0.38f);
                    g.DrawLine(strataPen, a.X, a.Y + cliffDepth * 0.72f, b.X, b.Y + cliffDepth * 0.72f);
                }
            }
        }

        using (GraphicsPath tp = PolyPath(topPoly))
        using (LinearGradientBrush tb = new LinearGradientBrush(
            new PointF(0, 40), new PointF(1280, 700), topColorA, topColorB))
        {
            g.FillPath(tb, tp);
            GraphicsState st = g.Save();
            g.SetClip(tp);
            using (Pen isoPen = new Pen(Color.FromArgb(26, 103, 232, 249), 1f))
            {
                for (int k = -12; k < 28; k++)
                {
                    float x0 = k * 68f;
                    g.DrawLine(isoPen, x0, 0f, x0 + 900f, 520f);
                    g.DrawLine(isoPen, x0 + 900f, 0f, x0, 520f);
                }
            }
            g.Restore(st);

            using (Pen glowPen = new Pen(Color.FromArgb(95, rimGlow), 4.5f))
            {
                g.DrawPath(glowPen, tp);
            }
            using (Pen rimPen = new Pen(Color.FromArgb(215, rimGlow), 1.8f))
            {
                g.DrawPath(rimPen, tp);
            }
        }
    }

    private static void DrawIsoBox(
        Graphics g, float cx, float cy, float rx, float ry, float height,
        Color topCol, Color leftCol, Color rightCol, Color rimCol
    )
    {
        PointF topN = new PointF(cx, cy - height - ry);
        PointF topE = new PointF(cx + rx, cy - height);
        PointF topS = new PointF(cx, cy - height + ry);
        PointF topW = new PointF(cx - rx, cy - height);
        PointF botE = new PointF(cx + rx, cy);
        PointF botS = new PointF(cx, cy + ry);
        PointF botW = new PointF(cx - rx, cy);

        using (GraphicsPath lp = PolyPath(topW, topS, botS, botW))
        using (SolidBrush lb = new SolidBrush(leftCol)) { g.FillPath(lb, lp); }
        using (GraphicsPath rp = PolyPath(topS, topE, botE, botS))
        using (SolidBrush rb = new SolidBrush(rightCol)) { g.FillPath(rb, rp); }
        using (GraphicsPath tp = PolyPath(topN, topE, topS, topW))
        using (SolidBrush tb = new SolidBrush(topCol)) { g.FillPath(tb, tp); }
        using (Pen p = new Pen(rimCol, 1.2f))
        {
            g.DrawPolygon(p, new PointF[] { topN, topE, topS, topW });
            g.DrawLine(p, topW, botW);
            g.DrawLine(p, topS, botS);
            g.DrawLine(p, topE, botE);
        }
    }

    private static void DrawCylinderStack(
        Graphics g, float cx, float cy, float r, float h,
        Color bodyDark, Color bodyLight, Color stripeCol, Color glowCol
    )
    {
        RectangleF bodyRect = new RectangleF(cx - r, cy - h, r * 2f, h);
        using (LinearGradientBrush b = new LinearGradientBrush(
            new PointF(cx - r, cy), new PointF(cx + r, cy), bodyDark, bodyLight))
        {
            g.FillRectangle(b, bodyRect);
        }
        using (SolidBrush botB = new SolidBrush(bodyDark))
        {
            g.FillEllipse(botB, cx - r, cy - r * 0.42f, r * 2f, r * 0.84f);
        }
        using (SolidBrush sb = new SolidBrush(stripeCol))
        {
            g.FillRectangle(sb, cx - r, cy - h + 10f, r * 2f, 5f);
            g.FillRectangle(sb, cx - r, cy - h + 20f, r * 2f, 4f);
        }
        using (SolidBrush topRim = new SolidBrush(Color.FromArgb(255, 30, 41, 59)))
        {
            g.FillEllipse(topRim, cx - r - 1.5f, cy - h - r * 0.45f, (r + 1.5f) * 2f, r * 0.9f);
        }
        using (SolidBrush glowB = new SolidBrush(glowCol))
        {
            g.FillEllipse(glowB, cx - r * 0.72f, cy - h - r * 0.32f, r * 1.44f, r * 0.64f);
        }
        DrawGlowingOrb(g, cx, cy - h, r * 2.4f, glowCol, 110);
    }

    private static void DrawFicsitSmelterFactory(Graphics g, float cx, float cy)
    {
        DrawIsoBox(g, cx, cy + 16f, 94f, 46f, 12f,
            Color.FromArgb(255, 30, 41, 59), Color.FromArgb(255, 15, 23, 42),
            Color.FromArgb(255, 23, 37, 84), Color.FromArgb(200, 245, 158, 11));
        DrawIsoBox(g, cx - 12f, cy + 4f, 68f, 34f, 42f,
            Color.FromArgb(255, 51, 65, 85), Color.FromArgb(255, 30, 41, 59),
            Color.FromArgb(255, 39, 52, 73), Color.FromArgb(220, 251, 191, 36));
        DrawIsoBox(g, cx + 22f, cy + 8f, 36f, 20f, 28f,
            Color.FromArgb(255, 217, 119, 6), Color.FromArgb(255, 146, 64, 14),
            Color.FromArgb(255, 180, 83, 9), Color.FromArgb(255, 253, 224, 71));
        DrawGlowingOrb(g, cx - 28f, cy - 8f, 20f, Color.FromArgb(255, 251, 146, 60), 210);
        DrawGlowingOrb(g, cx + 24f, cy + 2f, 18f, Color.FromArgb(255, 56, 189, 248), 190);
        DrawCylinderStack(g, cx - 36f, cy - 38f, 10f, 54f,
            Color.FromArgb(255, 15, 23, 42), Color.FromArgb(255, 71, 85, 105),
            Color.FromArgb(255, 245, 158, 11), Color.FromArgb(255, 34, 211, 238));
        DrawCylinderStack(g, cx, cy - 46f, 11f, 62f,
            Color.FromArgb(255, 15, 23, 42), Color.FromArgb(255, 71, 85, 105),
            Color.FromArgb(255, 245, 158, 11), Color.FromArgb(255, 16, 185, 129));
        DrawCylinderStack(g, cx + 36f, cy - 38f, 10f, 52f,
            Color.FromArgb(255, 15, 23, 42), Color.FromArgb(255, 71, 85, 105),
            Color.FromArgb(255, 245, 158, 11), Color.FromArgb(255, 245, 158, 11));
    }

    private static void DrawSpaceXRocketAndGantry(Graphics g, float cx, float cy, float scale, bool isPrimary)
    {
        DrawIsoBox(g, cx, cy + 12f * scale, 58f * scale, 30f * scale, 14f * scale,
            Color.FromArgb(255, 30, 41, 59), Color.FromArgb(255, 15, 23, 42),
            Color.FromArgb(255, 23, 37, 84), Color.FromArgb(230, 56, 189, 248));

        float gx = cx - 28f * scale;
        float gy = cy - 4f * scale;
        float gh = 148f * scale;
        float gw = 20f * scale;
        using (Pen trussPen = new Pen(Color.FromArgb(235, 148, 163, 184), 2.2f * scale))
        using (Pen amberPen = new Pen(Color.FromArgb(235, 245, 158, 11), 2.0f * scale))
        {
            g.DrawRectangle(trussPen, gx - gw * 0.5f, gy - gh, gw, gh);
            int rungs = 7;
            float stepH = gh / rungs;
            for (int i = 0; i < rungs; i++)
            {
                float y0 = gy - i * stepH;
                float y1 = y0 - stepH;
                g.DrawLine(trussPen, gx - gw * 0.5f, y0, gx + gw * 0.5f, y1);
                g.DrawLine(trussPen, gx + gw * 0.5f, y0, gx - gw * 0.5f, y1);
            }
            g.DrawLine(amberPen, gx + gw * 0.5f, gy - gh * 0.68f, cx + 6f * scale, gy - gh * 0.68f);
            g.DrawLine(amberPen, gx + gw * 0.5f, gy - gh * 0.42f, cx + 6f * scale, gy - gh * 0.42f);
        }

        float rx = cx + 8f * scale;
        float ry = cy - 4f * scale;
        float rRad = 15f * scale;
        float rHeight = 112f * scale;

        DrawGlowingOrb(g, rx, ry + 4f * scale, 34f * scale,
            isPrimary ? Color.FromArgb(255, 56, 189, 248) : Color.FromArgb(255, 251, 191, 36), 210);

        PointF[] finL = new PointF[]
        {
            Pt(rx - rRad, ry - 26f * scale),
            Pt(rx - rRad - 15f * scale, ry + 4f * scale),
            Pt(rx - rRad + 2f * scale, ry)
        };
        PointF[] finR = new PointF[]
        {
            Pt(rx + rRad, ry - 26f * scale),
            Pt(rx + rRad + 15f * scale, ry + 4f * scale),
            Pt(rx + rRad - 2f * scale, ry)
        };
        using (SolidBrush finB = new SolidBrush(Color.FromArgb(255, 30, 41, 59)))
        {
            g.FillPolygon(finB, finL);
            g.FillPolygon(finB, finR);
        }

        RectangleF fusRect = new RectangleF(rx - rRad, ry - rHeight, rRad * 2f, rHeight);
        using (LinearGradientBrush fb = new LinearGradientBrush(
            new PointF(rx - rRad, ry), new PointF(rx + rRad, ry),
            Color.FromArgb(255, 203, 213, 225), Color.FromArgb(255, 248, 250, 252)))
        {
            g.FillRectangle(fb, fusRect);
        }
        using (SolidBrush darkBand = new SolidBrush(Color.FromArgb(255, 15, 23, 42)))
        {
            g.FillRectangle(darkBand, rx - rRad, ry - rHeight * 0.55f, rRad * 2f, 8f * scale);
            g.FillRectangle(darkBand, rx - rRad, ry - 14f * scale, rRad * 2f, 10f * scale);
        }
        PointF[] nose = new PointF[]
        {
            Pt(rx - rRad, ry - rHeight),
            Pt(rx, ry - rHeight - 38f * scale),
            Pt(rx + rRad, ry - rHeight)
        };
        using (GraphicsPath np = PolyPath(nose))
        using (LinearGradientBrush nb = new LinearGradientBrush(
            new PointF(rx - rRad, ry - rHeight), new PointF(rx + rRad, ry - rHeight),
            Color.FromArgb(255, 226, 232, 240), Color.FromArgb(255, 148, 163, 184)))
        {
            g.FillPath(nb, np);
        }
    }

    private static void DrawCentralRoverDepot(Graphics g, float cx, float cy)
    {
        DrawIsoBox(g, cx, cy + 16f, 78f, 40f, 14f,
            Color.FromArgb(255, 30, 41, 59), Color.FromArgb(255, 15, 23, 42),
            Color.FromArgb(255, 23, 37, 84), Color.FromArgb(220, 16, 185, 129));

        RectangleF domeRect = new RectangleF(cx - 48f, cy - 38f, 96f, 68f);
        using (GraphicsPath dp = new GraphicsPath())
        {
            dp.AddArc(domeRect, 180f, 180f);
            dp.CloseFigure();
            using (LinearGradientBrush db = new LinearGradientBrush(
                new PointF(cx, cy - 42f), new PointF(cx, cy + 20f),
                Color.FromArgb(195, 56, 189, 248), Color.FromArgb(95, 15, 23, 42)))
            {
                g.FillPath(db, dp);
            }
            using (Pen ribPen = new Pen(Color.FromArgb(190, 125, 211, 252), 1.6f))
            {
                g.DrawPath(ribPen, dp);
                g.DrawArc(ribPen, cx - 28f, cy - 38f, 56f, 68f, 180f, 180f);
            }
        }
        DrawGlowingOrb(g, cx, cy - 12f, 38f, Color.FromArgb(255, 52, 211, 153), 130);
    }

    private static void DrawUnicornCitadelSummit(Graphics g, float cx, float cy)
    {
        DrawGlowingOrb(g, cx, cy - 28f, 82f, Color.FromArgb(255, 236, 72, 153), 155);
        DrawGlowingOrb(g, cx, cy - 10f, 58f, Color.FromArgb(255, 56, 189, 248), 165);
        DrawIsoBox(g, cx, cy + 18f, 68f, 35f, 16f,
            Color.FromArgb(255, 49, 46, 129), Color.FromArgb(255, 30, 27, 75),
            Color.FromArgb(255, 59, 7, 100), Color.FromArgb(245, 250, 204, 21));
        DrawIsoBox(g, cx, cy, 46f, 24f, 18f,
            Color.FromArgb(255, 248, 250, 252), Color.FromArgb(255, 203, 213, 225),
            Color.FromArgb(255, 148, 163, 184), Color.FromArgb(255, 244, 114, 182));

        float[] sxOff = new float[] { -26f, 0f, 26f };
        float[] shOff = new float[] { 68f, 96f, 68f };
        for (int i = 0; i < 3; i++)
        {
            float sx = cx + sxOff[i];
            float sy = cy - 12f;
            float sh = shOff[i];
            PointF[] spire = new PointF[]
            {
                Pt(sx - 10f, sy),
                Pt(sx, sy - sh),
                Pt(sx + 10f, sy)
            };
            using (GraphicsPath sp = PolyPath(spire))
            using (LinearGradientBrush sb = new LinearGradientBrush(
                new PointF(sx, sy - sh), new PointF(sx, sy),
                Color.FromArgb(255, 253, 224, 71), Color.FromArgb(255, 236, 72, 153)))
            {
                g.FillPath(sb, sp);
            }
            DrawGlowingOrb(g, sx, sy - sh, 16f, Color.FromArgb(255, 254, 240, 138), 220);
        }
    }

    /**
     * Renders a continuous, ground-level 3D isometric metallic conveyor-belt highway with
     * 30-degree isometric straightaways, 90-degree banked isometric turns, recessed steel
     * conveyor rollers, brushed-titanium side guardrails, and parallel glowing plasma pipes!
     */
    private static void DrawGroundPlaneIsometricConveyorHighway(Graphics g, PointF[] waypoints)
    {
        using (GraphicsPath path = new GraphicsPath())
        {
            path.AddLines(waypoints);

            // 1. Deep Ground Drop Shadow & Extruded 3D Steel Foundation Bed
            using (Pen shadowPen = new Pen(Color.FromArgb(190, 2, 6, 18), 64f))
            using (Pen steelWallPen = new Pen(Color.FromArgb(255, 15, 23, 42), 56f))
            using (Pen titaniumRailPen = new Pen(Color.FromArgb(255, 100, 116, 139), 50f))
            using (Pen hazardTrimPen = new Pen(Color.FromArgb(230, 245, 158, 11), 44f))
            using (Pen rollerBedPen = new Pen(Color.FromArgb(255, 17, 24, 39), 38f))
            {
                LineJoin lj = LineJoin.Round;
                shadowPen.LineJoin = lj; shadowPen.StartCap = LineCap.Round; shadowPen.EndCap = LineCap.Round;
                steelWallPen.LineJoin = lj; steelWallPen.StartCap = LineCap.Round; steelWallPen.EndCap = LineCap.Round;
                titaniumRailPen.LineJoin = lj; titaniumRailPen.StartCap = LineCap.Round; titaniumRailPen.EndCap = LineCap.Round;
                hazardTrimPen.LineJoin = lj; hazardTrimPen.StartCap = LineCap.Round; hazardTrimPen.EndCap = LineCap.Round;
                rollerBedPen.LineJoin = lj; rollerBedPen.StartCap = LineCap.Round; rollerBedPen.EndCap = LineCap.Round;

                Matrix mShadow = new Matrix();
                mShadow.Translate(3f, 11f);
                using (GraphicsPath pShadow = (GraphicsPath)path.Clone())
                {
                    pShadow.Transform(mShadow);
                    g.DrawPath(shadowPen, pShadow);
                }

                Matrix mWall = new Matrix();
                mWall.Translate(0f, 6f);
                using (GraphicsPath pWall = (GraphicsPath)path.Clone())
                {
                    pWall.Transform(mWall);
                    g.DrawPath(steelWallPen, pWall);
                }

                g.DrawPath(titaniumRailPen, path);
                g.DrawPath(hazardTrimPen, path);
                g.DrawPath(rollerBedPen, path);
            }
        }

        // 2. Draw physical metallic conveyor rollers & parallel plasma conduit pipe along every straightaway
        using (Pen rollerLight = new Pen(Color.FromArgb(180, 71, 85, 105), 2.2f))
        using (Pen rollerDark = new Pen(Color.FromArgb(220, 3, 7, 18), 1.8f))
        using (Pen centerTrackLine = new Pen(Color.FromArgb(95, 56, 189, 248), 1.5f))
        using (Pen pipeShadow = new Pen(Color.FromArgb(180, 2, 6, 18), 11f))
        using (Pen pipeGlass = new Pen(Color.FromArgb(210, 14, 116, 144), 8f))
        using (Pen pipeCore = new Pen(Color.FromArgb(235, 34, 211, 238), 3.5f))
        {
            for (int seg = 0; seg < waypoints.Length - 1; seg++)
            {
                PointF a = waypoints[seg];
                PointF b = waypoints[seg + 1];
                float dx = b.X - a.X;
                float dy = b.Y - a.Y;
                float dist = (float)Math.Sqrt(dx * dx + dy * dy);
                if (dist < 1f) continue;

                float tx = dx / dist;
                float ty = dy / dist;
                float nx = -ty;
                float ny = tx * 0.75f;

                g.DrawLine(centerTrackLine, a.X, a.Y, b.X, b.Y);

                // Parallel plasma pipe offset beside the conveyor belt
                float pOffX = nx * 29f;
                float pOffY = ny * 29f;
                g.DrawLine(pipeShadow, a.X + pOffX, a.Y + pOffY + 4f, b.X + pOffX, b.Y + pOffY + 4f);
                g.DrawLine(pipeGlass, a.X + pOffX, a.Y + pOffY, b.X + pOffX, b.Y + pOffY);
                g.DrawLine(pipeCore, a.X + pOffX, a.Y + pOffY, b.X + pOffX, b.Y + pOffY);

                // Steel conveyor rollers every 7 pixels along the belt
                int steps = (int)(dist / 7f);
                for (int s = 1; s < steps; s++)
                {
                    float frac = (float)s / steps;
                    float cx = a.X + dx * frac;
                    float cy = a.Y + dy * frac;
                    float rW = 16f;
                    g.DrawLine(rollerDark, cx - nx * rW, cy - ny * rW + 1.2f, cx + nx * rW, cy + ny * rW + 1.2f);
                    g.DrawLine(rollerLight, cx - nx * rW, cy - ny * rW, cx + nx * rW, cy + ny * rW);
                }
            }
        }
    }

    public static void BuildConveyorWorldPng(string skyRefPath, string rawApiPath, string outPath)
    {
        Bitmap bmp = new Bitmap(1280, 720, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(bmp))
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;

            // Base Sky & Bioluminescent Alien Plateau Layer
            using (LinearGradientBrush skyB = new LinearGradientBrush(
                new PointF(0, 0), new PointF(0, 720),
                Color.FromArgb(255, 5, 9, 24), Color.FromArgb(255, 8, 15, 34)))
            {
                g.FillRectangle(skyB, 0, 0, 1280, 720);
            }

            string bgSourcePath = System.IO.File.Exists(rawApiPath) ? rawApiPath : skyRefPath;
            if (System.IO.File.Exists(bgSourcePath))
            {
                using (Image skyImg = Image.FromFile(bgSourcePath))
                using (ImageAttributes ia = new ImageAttributes())
                {
                    ColorMatrix cm = new ColorMatrix();
                    cm.Matrix33 = 0.48f;
                    ia.SetColorMatrix(cm);
                    g.DrawImage(skyImg, new Rectangle(0, 0, 1280, 720), 0, 0, skyImg.Width, skyImg.Height, GraphicsUnit.Pixel, ia);
                }
            }

            DrawGlowingOrb(g, 260f, 110f, 220f, Color.FromArgb(255, 56, 189, 248), 55);
            DrawGlowingOrb(g, 980f, 95f, 240f, Color.FromArgb(255, 192, 132, 252), 65);
            DrawGlowingOrb(g, 640f, 650f, 340f, Color.FromArgb(255, 14, 165, 233), 50);

            PointF[] mainPlateau = new PointF[]
            {
                Pt(46f, 595f),
                Pt(58f, 310f),
                Pt(138f, 132f),
                Pt(388f, 118f),
                Pt(548f, 185f),
                Pt(818f, 162f),
                Pt(1042f, 102f),
                Pt(1232f, 132f),
                Pt(1228f, 395f),
                Pt(1098f, 598f),
                Pt(828f, 638f),
                Pt(595f, 622f),
                Pt(342f, 655f)
            };
            DrawExtrudedIsoPlateau(
                g, mainPlateau, 66f,
                Color.FromArgb(255, 15, 36, 57),
                Color.FromArgb(255, 19, 28, 52),
                Color.FromArgb(255, 12, 22, 38),
                Color.FromArgb(255, 26, 46, 72),
                Color.FromArgb(255, 34, 211, 238)
            );

            // Ground-plane 30-degree isometric conveyor-belt highway with 90-degree banked isometric turns (26 pads: Pad 0 .. Pad 25)
            PointF[] isoConveyorPts = new PointF[]
            {
                // Leg 1 (Pads 0..5): Ascending NE along 30° isometric straightaway from Launchpad to Smelter Factory
                Pt(148f, 616f),
                Pt(176f, 540f),
                Pt(204f, 464f),
                Pt(232f, 388f),
                Pt(260f, 312f),
                Pt(288f, 236f),
                // 90° Isometric Corner at Smelter -> Leg 2 (Pads 6..10): Descending SE along 30° isometric straightaway
                Pt(358f, 268f),
                Pt(412f, 326f),
                Pt(446f, 398f),
                Pt(422f, 474f),
                Pt(398f, 550f),
                // 90° Isometric Corner at Southern Terrace -> Leg 3 (Pads 11..16): Ascending NE through Central Rover Depot
                Pt(468f, 582f),
                Pt(538f, 542f),
                Pt(596f, 482f),
                Pt(652f, 420f),
                Pt(708f, 358f),
                Pt(764f, 296f),
                // 90° Isometric Corner at North-Central Ridge -> Leg 4 (Pads 17..20): Descending SE toward Booster Gantry
                Pt(832f, 328f),
                Pt(876f, 396f),
                Pt(918f, 464f),
                Pt(968f, 512f),
                // 90° Isometric Corner at Booster Gantry -> Leg 5 (Pads 21..25): Final Ascending NE Straightaway to Unicorn Citadel
                Pt(1034f, 466f),
                Pt(1068f, 392f),
                Pt(1098f, 318f),
                Pt(1124f, 244f),
                Pt(1148f, 172f)
            };

            DrawGroundPlaneIsometricConveyorHighway(g, isoConveyorPts);

            // Render the 5 Integrated Isometric Landmarks flanking (never covered by!) the ground-level conveyor highway
            DrawFicsitSmelterFactory(g, 218f, 158f);
            DrawCentralRoverDepot(g, 612f, 294f);
            DrawUnicornCitadelSummit(g, 1148f, 146f);
            DrawSpaceXRocketAndGantry(g, 1042f, 578f, 0.82f, false);
            DrawSpaceXRocketAndGantry(g, 88f, 604f, 1.0f, true);
        }

        bmp.Save(outPath, ImageFormat.Png);
        bmp.Dispose();
    }
}
"@

Add-Type -TypeDefinition $csharpCode -ReferencedAssemblies System.Drawing
[IsoConveyorWorldBuilder]::BuildConveyorWorldPng('${SKY_REF.replace(/'/g, "''")}', '${RAW_API_OUT.replace(/'/g, "''")}', '${FINAL_OUT.replace(/'/g, "''")}')
Write-Output "[Built 1280x720 Isometric Conveyor World] ${FINAL_OUT.replace(/'/g, "''")}"
`;

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(ps1Path, ps1Content, 'utf8');
  execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps1Path], {
    stdio: 'inherit'
  });
}

async function main() {
  const env = loadEnv(ROOT_DIR);
  const apiKey = (process.env.GEMINI_API_KEY || env.GEMINI_API_KEY || '').trim();
  if (apiKey) {
    await tryGeminiImageGeneration(apiKey);
  }
  buildPrecisionIsometricConveyorWorldPng();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
