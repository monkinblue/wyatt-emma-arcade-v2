/**
 * tools/build_match_stage_bg.mjs
 * ------------------------------
 * Node.js companion script for `tools/build_match_assets.py`:
 * 1) Saves a backup of `match-stage-raw.jpg` -> `match-stage-raw-v1-backup.jpg`
 *    and `match-stage-bg.png` -> `match-stage-bg-v1-backup.png`
 * 2) Uses `GEMINI_API_KEY` from `.env` (strictly offline in `tools/`, never in `src/`)
 *    to generate a simpler, calmer, spacious `1280x720` 32-bit Hi-Bit Pixel Art
 *    emerald-green baize felt & mahogany-and-brass cabinet background for `MemoryMatchScene`.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT_DIR, '.env');
const RAW_DIR = path.join(ROOT_DIR, 'public', 'assets', 'games', 'memory-match', 'raw');
const SPRITES_DIR = path.join(ROOT_DIR, 'public', 'assets', 'games', 'memory-match', 'sprites');

const CLEAN_MATCH_STAGE_PROMPT =
  '16:9 widescreen (1280x720) 32-bit Hi-Bit Pixel Art (Sea of Stars / Owlboy masterpiece aesthetic) ' +
  'top-down heirloom mahogany-and-brass tabletop memory card game cabinet board for young children. ' +
  'VIBE & LAYOUT: Warm, calm, spacious, and completely uncluttered. ' +
  '1) Fill 84% of the upper canvas (x: 90..1190, y: 35..565) with a huge, wide, smooth rectangular ' +
  'emerald-green baize felt playing surface with subtle soft inner vignette and thin gold pinstripe trim. ' +
  '2) Frame the green felt with a clean, warm carved mahogany wood border and simple polished brass corner accents ' +
  '(NO Victorian room background, NO curtains, NO wall lamps, NO chairs, NO top clock alcove, and NO exposed cogs or gears). ' +
  '3) Along the bottom edge (y: 575..705), render a clean, flat, empty recessed mahogany-and-brass horizontal dock tray ' +
  'with ZERO baked-in buttons, ZERO levers, ZERO gauges, ZERO clock dials, and ZERO text plaques so interactive UI buttons can sit cleanly on top.';

function loadEnv() {
  const env = {};
  if (fs.existsSync(ENV_PATH)) {
    for (const raw of fs.readFileSync(ENV_PATH, 'utf8').split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('#') || !line.includes('=')) continue;
      const idx = line.indexOf('=');
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      env[k] = v;
    }
  }
  return env;
}

async function generateWithGemini(apiKey, rawOutPath) {
  const models = [
    'gemini-2.5-flash-image-preview',
    'gemini-2.5-flash-image',
    'gemini-2.0-flash-exp-image-generation',
    'gemini-2.0-flash-preview-image-generation'
  ];

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: CLEAN_MATCH_STAGE_PROMPT }] }],
          generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
        })
      });

      if (!res.ok) {
        const errTxt = await res.text();
        console.warn(`[Warn] ${model} HTTP ${res.status}: ${errTxt.slice(0, 180)}`);
        continue;
      }

      const data = await res.json();
      for (const cand of data.candidates || []) {
        for (const part of cand?.content?.parts || []) {
          const inline = part.inlineData || part.inline_data;
          if (inline && inline.data) {
            fs.writeFileSync(rawOutPath, Buffer.from(inline.data, 'base64'));
            console.log(`[Generated] ${rawOutPath} via ${model}`);
            return true;
          }
        }
      }
    } catch (err) {
      console.warn(`[Warn] ${model} error:`, err.message);
    }
  }

  // Fallback: check Imagen predict endpoint if generateContent image models weren't matched
  const imagenModels = ['imagen-3.0-generate-002', 'imagen-3.0-generate-001'];
  for (const model of imagenModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt: CLEAN_MATCH_STAGE_PROMPT }],
          parameters: { sampleCount: 1, aspectRatio: '16:9' }
        })
      });
      if (!res.ok) continue;
      const data = await res.json();
      const b64 = data?.predictions?.[0]?.bytesBase64Encoded;
      if (b64) {
        fs.writeFileSync(rawOutPath, Buffer.from(b64, 'base64'));
        console.log(`[Generated] ${rawOutPath} via ${model}`);
        return true;
      }
    } catch (err) {
      console.warn(`[Warn] ${model} error:`, err.message);
    }
  }

  return false;
}

async function main() {
  fs.mkdirSync(RAW_DIR, { recursive: true });
  fs.mkdirSync(SPRITES_DIR, { recursive: true });

  const stageRaw = path.join(RAW_DIR, 'match-stage-raw.jpg');
  const stageBgPng = path.join(SPRITES_DIR, 'match-stage-bg.png');
  const backupRaw = path.join(RAW_DIR, 'match-stage-raw-v1-backup.jpg');
  const backupPng = path.join(SPRITES_DIR, 'match-stage-bg-v1-backup.png');

  if (fs.existsSync(stageRaw) && !fs.existsSync(backupRaw)) {
    fs.copyFileSync(stageRaw, backupRaw);
    console.log(`[Backup] Saved ${backupRaw}`);
  }
  if (fs.existsSync(stageBgPng) && !fs.existsSync(backupPng)) {
    fs.copyFileSync(stageBgPng, backupPng);
    console.log(`[Backup] Saved ${backupPng}`);
  }

  const env = loadEnv();
  const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  const stagedArtifact =
    'C:\\Users\\RobaD\\.gemini\\antigravity\\brain\\c157efef-ad7b-472f-a591-d3f1aea5976b\\match_stage_raw_v2_1793760021773.jpg';

  if (fs.existsSync(stagedArtifact)) {
    fs.copyFileSync(stagedArtifact, stageRaw);
    console.log(`[Staged] Copied clean cabinet background to ${stageRaw}`);
  } else if (apiKey) {
    const ok = await generateWithGemini(apiKey, stageRaw);
    if (!ok) {
      throw new Error('Failed to generate clean match stage via Gemini API');
    }
  } else {
    throw new Error('GEMINI_API_KEY not found in .env');
  }

  // Resize and align felt/dock geometry to exact 1280x720 (felt: x 90..1190, y 35..565; bottom dock tray: x 225..1055, y 575..705)
  const psScript = `
    Add-Type -AssemblyName System.Drawing
    $raw = [System.Drawing.Bitmap]::new('${stageRaw.replace(/'/g, "''")}')
    $tmp = [System.Drawing.Bitmap]::new(1280, 720, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $gt = [System.Drawing.Graphics]::FromImage($tmp)
    $gt.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $gt.DrawImage($raw, 0, 0, 1280, 720)
    $gt.Dispose()
    $raw.Dispose()

    $dst = [System.Drawing.Bitmap]::new(1280, 720, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)

    function MapSeg([double]$v, [double[]]$dBreaks, [double[]]$sBreaks) {
      for ($i = 0; $i -lt ($dBreaks.Length - 1); $i++) {
        if ($v -le $dBreaks[$i + 1] -or $i -eq ($dBreaks.Length - 2)) {
          $t = ($v - $dBreaks[$i]) / [Math]::Max(0.0001, ($dBreaks[$i + 1] - $dBreaks[$i]))
          return $sBreaks[$i] + $t * ($sBreaks[$i + 1] - $sBreaks[$i])
        }
      }
      return $v
    }

    $yDstBreaks = @(0.0, 42.0, 562.0, 720.0)
    $ySrcBreaks = @(0.0, 102.0, 578.0, 720.0)

    $xTopDst = @(0.0, 90.0, 1190.0, 1280.0)
    $xTopSrc = @(0.0, 112.0, 1168.0, 1280.0)

    $xBotDst = @(0.0, 185.0, 235.0, 1045.0, 1095.0, 1280.0)
    $xBotSrc = @(0.0, 265.0, 325.0, 955.0, 1015.0, 1280.0)

    for ($y = 0; $y -lt 720; $y++) {
      $sy = [int][Math]::Round((MapSeg $y $yDstBreaks $ySrcBreaks))
      if ($sy -lt 0) { $sy = 0 }
      if ($sy -gt 719) { $sy = 719 }

      $blend = 0.0
      if ($y -ge 555 -and $y -le 585) {
        $blend = ($y - 555.0) / 30.0
      } elseif ($y -gt 585) {
        $blend = 1.0
      }

      for ($x = 0; $x -lt 1280; $x++) {
        $sxTop = MapSeg $x $xTopDst $xTopSrc
        $sxBot = MapSeg $x $xBotDst $xBotSrc
        $sx = [int][Math]::Round($sxTop * (1.0 - $blend) + $sxBot * $blend)
        if ($sx -lt 0) { $sx = 0 }
        if ($sx -gt 1279) { $sx = 1279 }
        $dst.SetPixel($x, $y, $tmp.GetPixel($sx, $sy))
      }
    }

    $tmp.Dispose()
    $dst.Save('${stageBgPng.replace(/'/g, "''")}', [System.Drawing.Imaging.ImageFormat]::Png)
    $dst.Dispose()
  `;
  execFileSync('powershell', ['-NoProfile', '-Command', psScript], { stdio: 'inherit' });
  console.log(`[Saved] ${stageBgPng} (1280x720)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
