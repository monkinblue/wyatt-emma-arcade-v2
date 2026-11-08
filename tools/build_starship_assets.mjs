#!/usr/bin/env node
/**
 * tools/build_starship_assets.mjs
 * -------------------------------
 * Node.js generator companion for `tools/build_starship_assets.py`.
 * Uses `GEMINI_API_KEY` from `.env` (strictly offline in `tools/`, never in `src/`)
 * with `gemini-2.5-flash-image` (multimodal image-to-image reference passing the cropped
 * face from `tools/reference_photos/crops/ref_<id>.jpg`) to generate:
 *   1. 9 Photorealistic SpaceX Crew Dragon / FICSIT Exosuit Astronaut Portraits (1024x1024):
 *      - `robert`, `rita`, `wyatt`, `emma`, `papa`, `nana`, `grandpa`, `babci`, `guest`
 *   2. Ultra-HD Cosmic Starbase & Iridescent Cyber-Unicorn Citadel Backdrop (`starship-board-bg-raw.jpg`)
 *   3. Hub Shelf Toy Icon (`hub-toy-starship-unicorn-raw.jpg`)
 *   4. Hub 4th Tab Mode Icon (`mode-tv-raw.jpg`)
 * Then invokes `tools/build_starship_assets.ps1` to frame each portrait inside a high-res
 * hexagonal brushed-titanium FICSIT/SpaceX avatar card (`card_<id>.png`) and circular board
 * token (`token_<id>.png`), upscale the backdrop to 2560x1440 (`starship-board-bg.jpg`),
 * and chroma-key `hub-toy-starship-unicorn.png` and `mode-tv.png`.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT_DIR, '.env');

const CROPS_DIR = path.join(__dirname, 'reference_photos', 'crops');
const RAW_DIR = path.join(ROOT_DIR, 'public', 'assets', 'games', 'starship-unicorn', 'raw');
const HUB_RAW_DIR = path.join(ROOT_DIR, 'public', 'assets', 'hub', 'raw');
const STAGED_ARTIFACT_DIR = 'C:\\Users\\RobaD\\.gemini\\antigravity\\brain\\1e356e54-d2c1-4e52-9038-6d7164e20360';

const STAGED_FILES = {
  [path.join(RAW_DIR, 'astro_robert_raw.png')]: path.join(STAGED_ARTIFACT_DIR, 'astro_robert_raw_notext_1794019042238.jpg'),
  [path.join(RAW_DIR, 'astro_rita_raw.png')]: path.join(STAGED_ARTIFACT_DIR, 'astro_rita_raw_1794018970448.jpg'),
  [path.join(RAW_DIR, 'astro_wyatt_raw.png')]: path.join(STAGED_ARTIFACT_DIR, 'astro_wyatt_raw_1794018987653.jpg'),
  [path.join(RAW_DIR, 'astro_emma_raw.png')]: path.join(STAGED_ARTIFACT_DIR, 'astro_emma_raw_notext_1794019066628.jpg'),
  [path.join(RAW_DIR, 'astro_papa_raw.png')]: path.join(STAGED_ARTIFACT_DIR, 'astro_papa_raw_1794018945644.jpg'),
  [path.join(RAW_DIR, 'astro_nana_raw.png')]: path.join(STAGED_ARTIFACT_DIR, 'astro_nana_raw_1794018961401.jpg'),
  [path.join(RAW_DIR, 'astro_grandpa_raw.png')]: path.join(STAGED_ARTIFACT_DIR, 'astro_grandpa_raw_1794018976702.jpg'),
  [path.join(RAW_DIR, 'astro_babci_raw.png')]: path.join(STAGED_ARTIFACT_DIR, 'astro_babci_raw_1794018990607.jpg'),
  [path.join(RAW_DIR, 'astro_guest_raw.png')]: path.join(STAGED_ARTIFACT_DIR, 'astro_guest_raw_1794019009065.jpg'),
  [path.join(RAW_DIR, 'astro_dreadbot_raw.png')]: path.join(STAGED_ARTIFACT_DIR, 'dread_bot_x99_robot_clean_1794109960571.jpg'),
  [path.join(RAW_DIR, 'starship-board-bg-raw.png')]: path.join(STAGED_ARTIFACT_DIR, 'starship_board_bg_raw_1794018947121.jpg'),
  [path.join(HUB_RAW_DIR, 'hub-toy-starship-unicorn-raw.png')]: path.join(STAGED_ARTIFACT_DIR, 'hub_toy_starship_unicorn_raw_1794018971293.jpg'),
  [path.join(HUB_RAW_DIR, 'mode-tv-raw.png')]: path.join(STAGED_ARTIFACT_DIR, 'mode_tv_raw_1794018984972.jpg')
};

function loadEnv() {
  const env = {};
  if (fs.existsSync(ENV_PATH)) {
    const lines = fs.readFileSync(ENV_PATH, 'utf8').split(/\r?\n/);
    for (const rawLine of lines) {
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

const SHARED_STYLE_RULES =
  'Photorealistic Next-Gen 4K Unreal Engine 5 cinematic sci-fi portrait photography, razor-sharp 85mm f/1.4 prime lens, ' +
  'smooth high-resolution anti-aliased rendering, ZERO pixel art, ZERO cartoon outlining. ' +
  'Subject is framed head-and-shoulders chest-up centered in the square frame, looking directly at the camera with a warm joyful expression. ' +
  'Wearing an authentic, ultra-detailed SpaceX Crew Dragon & Satisfactory FICSIT industrial orbital exosuit with a retracted/open clear glass ' +
  'bubble helmet ring around the collar (NO visor covering the face, completely unobstructed clear view of the face and hair!), ' +
  'soft cyan and safety-amber interior HUD rim-lighting illuminating their cheekbones, heavy anodized titanium neck ring, ' +
  'carbon-fiber shoulder pauldrons, and a glowing LED telemetry chest core. Background is a deep dark SpaceX Starbase orbital command bridge ' +
  'with subtle out-of-focus bioluminescent cyan and magenta nebula starlight bokeh. NO text or watermarks in the image.';

const CHARACTER_SPECS = [
  {
    id: 'robert',
    refCrop: 'ref_robert.jpg',
    prompt:
      'Use the attached reference photo to preserve the exact photorealistic facial likeness, eye shape, nose, warm smile, short light-brown/ash-blonde hair, and clear rectangular eyeglasses of this athletic 37-year-old Caucasian man (Robert). ' +
      'Render him as Mission Commander Robert wearing a gleaming Commander-class SpaceX-white & brushed-titanium orbital exosuit with glowing FICSIT safety-amber chest telemetry core, dark gunmetal carbon-fiber shoulder pauldrons, and heavy anodized metallic collar ring. ' +
      SHARED_STYLE_RULES
  },
  {
    id: 'rita',
    refCrop: 'ref_rita.jpg',
    prompt:
      'Use the attached reference photo to preserve the exact photorealistic facial likeness, radiant warm smile, eyes, cheekbones, and long straight dark-brown hair of this 35-year-old East Asian woman (Rita). ' +
      'Render her as Flight Director Rita wearing a sleek SpaceX-white & mirror-chrome Flight Director orbital spacesuit with glowing cyan neon collar rings, a cyan telemetry chest core, and classic tortoiseshell/silver aviator sunglasses clipped to the upper open helmet bezel above her forehead. ' +
      SHARED_STYLE_RULES
  },
  {
    id: 'wyatt',
    refCrop: 'ref_wyatt.jpg',
    prompt:
      'Use the attached reference photo to preserve the exact photorealistic facial likeness, bright mischievous grin, warm eyes, and short straight dark-brown hair with bangs of this cute 4-year-old biracial boy (Wyatt). ' +
      'Render him as Astro-Ranger Wyatt wearing a custom kid-sized Emerald-Green, White & Brushed-Titanium SpaceX Astro-Ranger exosuit featuring two high-tech glowing neon holographic bunny-ear telemetry antennae (one electric blue/green, one glowing orange-red, inspired by his craft bunny ears!) mounted on top of his open space helmet ring, and a glowing emerald dragon-star chest emblem. ' +
      SHARED_STYLE_RULES
  },
  {
    id: 'emma',
    refCrop: 'ref_emma.jpg',
    prompt:
      'Use the attached reference photo to preserve the exact photorealistic facial likeness, big happy toddler grin, joyful eyes, rosy cheeks, and dark-brown hair styled in cute twin side pigtails of this adorable 3-year-old biracial toddler girl (Emma), facing forward toward the camera. ' +
      'Render her as Space Princess Emma wearing an iridescent Rose-Pink, Lavender & Starlight Chrome SpaceX Space-Princess astronaut suit with a glowing holographic crystal unicorn horn crest mounted at the top center of her open helmet bezel and a glowing starlight unicorn emblem on her chest plate. ' +
      SHARED_STYLE_RULES
  },
  {
    id: 'papa',
    refCrop: 'ref_papa.jpg',
    prompt:
      'Use the attached reference photo to preserve the exact photorealistic facial likeness, salt-and-pepper wavy dark hair, signature thick dark mustache, warm crinkled smiling eyes, and big friendly grandfather smile of this cheerful older Caucasian man (Papa). ' +
      'Render him as Chief Engineer Papa wearing a heavy-duty Cobalt-Blue & Brushed-Titanium FICSIT Deep-Space Chief Engineer exosuit with polished brass/gold mission patches, heavy mechanical collar clamps, and a warm amber-gold power core on his chest plate. ' +
      SHARED_STYLE_RULES
  },
  {
    id: 'nana',
    refCrop: 'ref_nana.jpg',
    prompt:
      'Use the attached reference photo to preserve the exact photorealistic facial likeness, shoulder-length layered blonde hair with bangs, warm smiling eyes, and bright megawatt grandmother smile of this warm older Caucasian woman (Nana). ' +
      'Render her as Science Officer Nana wearing a sleek Sapphire-Blue & Pearl-White Starbase Science Officer SpaceX spacesuit with glowing sky-blue telemetry piping along the titanium collar and a crystal-blue orbital science emblem on her chest core. ' +
      SHARED_STYLE_RULES
  },
  {
    id: 'grandpa',
    refCrop: 'ref_grandpa.jpg',
    prompt:
      'Use the attached reference photo to preserve the exact photorealistic facial likeness, neatly combed short silver-gray hair, thin round wire-rimmed eyeglasses, kind eyes, and gentle warm grandfather smile of this distinguished older Caucasian man (Grandpa). ' +
      'Render him as Fleet Admiral Grandpa wearing an Admiral-grade White, Brushed-Silver & Navy Fleet Commander SpaceX orbital exosuit with classic blue-and-white striped mission insignia on the chest armor and glowing silver-cyan HUD telemetry accents. ' +
      SHARED_STYLE_RULES
  },
  {
    id: 'babci',
    refCrop: 'ref_babci.jpg',
    prompt:
      'Use the attached reference photo to preserve the exact photorealistic facial likeness, shoulder-length wavy medium-brown hair with golden-blonde highlights, warm eyes, and bright welcoming grandmother smile of this attractive older Caucasian woman (Babci). ' +
      'Render her as Orbital Navigator Babci wearing an elegant Midnight-Navy, Brushed-Silver & Rose-Gold SpaceX Orbital Navigator spacesuit with a glowing sapphire star-pendant telemetry core on the upper chest plate and rose-gold collar trim. ' +
      SHARED_STYLE_RULES
  },
  {
    id: 'guest',
    refCrop: null,
    prompt:
      'Photorealistic Next-Gen 4K Unreal Engine 5 cinematic sci-fi portrait of a mysterious VIP Mission Specialist astronaut wearing a gleaming Mirror-Chrome, Matte-White & 24k-Gold SpaceX Crew Dragon / FICSIT EVA spacesuit with a closed full-face dome visor made of reflective rainbow-iridescentdichroic glass that vividly reflects a glowing cosmic Cyber-Unicorn and bioluminescent nebula starlight. ' +
      'Heavy anodized titanium neck ring, carbon-fiber shoulder pauldrons, glowing golden chest telemetry core, head-and-shoulders centered square portrait, razor-sharp 85mm studio lighting, ZERO text.'
  },
  {
    id: 'dreadbot',
    refCrop: null,
    prompt:
      'Cinematic photorealistic close-up portrait of a menacing yet kid-friendly futuristic rogue sci-fi robot commander wearing a sleek dark obsidian and titanium astronaut exosuit collar, glowing crimson-red optical visor and LED telemetry nodes, dark starship command bridge background with subtle red neon rim lighting, front-facing head-and-shoulders framing matching an astronaut crew badge portrait, ultra-detailed 3D CGI movie render quality, no text'
  }
];

const BOARD_BG_PROMPT =
  'Ultra-high-definition 4K Unreal Engine 5 photorealistic sci-fi wide landscape environment concept art (16:9 widescreen, NO pixel art, razor-sharp cinematic rendering, zero text): ' +
  'An orbital SpaceX & Satisfactory FICSIT Starbase suspended inside a breathtaking, vibrant bioluminescent Rainbow & Cyan-Magenta Nebula in deep space. ' +
  'In the lower-left foreground: a sleek brushed-titanium and carbon-fiber SpaceX orbital launchpad platform with safety-amber FICSIT telemetry light strips and docked starship boosters. ' +
  'In the upper-right summit: a jaw-dropping, monumental iridescent Chrome, Starlight-Crystal & Titanium Cyber-Unicorn Citadel Megastructure glowing with aurora energy beams and docking rings! ' +
  'Across the middle expanse: deep cosmic starfields, volumetric nebula clouds, distant ringed exoplanets, and floating holographic orbital relay rings, leaving a clean visual composition for a winding orbital board game pathway connecting the bottom-left Starbase Launchpad to the top-right Space Unicorn Citadel.';

const HUB_ICON_PROMPT =
  'Ultra-crisp, high-resolution photorealistic studio tabletop collectible icon (smooth anti-aliased edges, NO pixel art) on a solid flat pure #FF00FF magenta chroma-key background (RGB 255, 0, 255, generous #FF00FF margin around the entire object, no floor shadow outside the base, zero text): ' +
  '3/4 front-facing tabletop view of a carved dark mahogany heirloom pedestal base topped with a gleaming SpaceX-white and brushed-titanium orbital launchpad. ' +
  'Rising from the center of the launchpad is a sleek iridescent Chrome-and-Starlight Cyber-Unicorn Starship poised for liftoff with glowing cyan and magenta plasma thrusters. ' +
  'Floating beside the starship are two gleaming 3D titanium-and-neon-blue orbital dice, and mounted along the front rim of the mahogany pedestal are 4 glowing colored glassmorphic trivia controller pads (Red, Blue, Amber, and Emerald Green).';

const MODE_TV_PROMPT =
  '32-bit Hi-Bit Heirloom Pixel Art & Polished Brass tabletop object on a solid flat pure #FF00FF magenta chroma-key background (RGB 255, 0, 255, generous #FF00FF margin around the entire object, zero text): ' +
  'Front-facing tabletop view of an ornate carved dark walnut and polished brass widescreen living-room television console cabinet. ' +
  'The glowing glass screen displays a vibrant cosmic purple-and-cyan space nebula with a tiny golden starship and twinkling stars. ' +
  'Resting on the wooden ledge in front of the TV are two sleek brass-and-mahogany family party game controllers with 4 glowing colored buttons (red, blue, amber, emerald) and a pair of golden dice.';

async function generateWithGemini(apiKey, prompt, outPath, refImagePath = null, aspectRatio = '1:1') {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const parts = [];
  if (refImagePath && fs.existsSync(refImagePath)) {
    const imgBytes = fs.readFileSync(refImagePath);
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: imgBytes.toString('base64')
      }
    });
  }
  parts.push({ text: prompt });

  const models = [
    'gemini-3.1-flash-image',
    'gemini-3.1-flash-lite-image',
    'gemini-3-pro-image',
    'gemini-3.1-flash-image-preview',
    'gemini-3-pro-image-preview',
    'gemini-2.5-flash-image'
  ];
  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload = {
        contents: [{ parts }],
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
        const errTxt = await res.text();
        console.warn(`  [Warn] ${model} HTTP ${res.status}: ${errTxt.slice(0, 200)}`);
        continue;
      }

      const data = await res.json();
      for (const cand of data.candidates ?? []) {
        for (const part of cand.content?.parts ?? []) {
          const inline = part.inlineData || part.inline_data;
          if (inline && inline.data) {
            const buf = Buffer.from(inline.data, 'base64');
            fs.writeFileSync(outPath, buf);
            console.log(`  [GENERATED] ${path.basename(outPath)} via ${model} (${buf.length.toLocaleString()} bytes)`);
            return true;
          }
        }
      }
    } catch (err) {
      console.warn(`  [Warn] ${model} error: ${err.message}`);
    }
  }

  // Fallback to imagen-3.0-generate-002 if text-only
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;
    const payload = {
      instances: [{ prompt }],
      parameters: { sampleCount: 1, aspectRatio }
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
        fs.writeFileSync(outPath, buf);
        console.log(`  [GENERATED] ${path.basename(outPath)} via imagen-3.0 (${buf.length.toLocaleString()} bytes)`);
        return true;
      }
    }
  } catch (err) {
    console.warn(`  [Warn] imagen-3.0 error: ${err.message}`);
  }

  return false;
}

async function main() {
  const force = process.argv.includes('--force');
  const env = loadEnv();
  const apiKey = (env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    console.error('ERROR: GEMINI_API_KEY not found in .env');
    process.exit(1);
  }

  fs.mkdirSync(RAW_DIR, { recursive: true });
  fs.mkdirSync(HUB_RAW_DIR, { recursive: true });

  // 0. Stage pre-generated raw files if present in artifact directory
  for (const [destPath, stagedSrc] of Object.entries(STAGED_FILES)) {
    if (!force && !fs.existsSync(destPath) && fs.existsSync(stagedSrc)) {
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.copyFileSync(stagedSrc, destPath);
      console.log(`  [STAGED RAW] ${path.basename(destPath)}`);
    }
  }

  // 1. Generate 9 Photorealistic Astronaut Portraits using reference face crops
  for (const spec of CHARACTER_SPECS) {
    const rawOut = path.join(RAW_DIR, `astro_${spec.id}_raw.png`);
    if (!force && fs.existsSync(rawOut) && fs.statSync(rawOut).size > 10000) {
      console.log(`  [CACHE HIT] ${path.basename(rawOut)}`);
      continue;
    }
    const refPath = spec.refCrop ? path.join(CROPS_DIR, spec.refCrop) : null;
    await generateWithGemini(apiKey, spec.prompt, rawOut, refPath, '1:1');
  }

  // 2. Generate Cosmic Board Backdrop
  const bgRawOut = path.join(RAW_DIR, 'starship-board-bg-raw.png');
  if (force || !fs.existsSync(bgRawOut) || fs.statSync(bgRawOut).size < 10000) {
    await generateWithGemini(apiKey, BOARD_BG_PROMPT, bgRawOut, null, '16:9');
  } else {
    console.log(`  [CACHE HIT] ${path.basename(bgRawOut)}`);
  }

  // 3. Generate Hub Shelf Toy Icon (`hub-toy-starship-unicorn-raw.png`)
  const hubIconRawOut = path.join(HUB_RAW_DIR, 'hub-toy-starship-unicorn-raw.png');
  if (force || !fs.existsSync(hubIconRawOut) || fs.statSync(hubIconRawOut).size < 10000) {
    await generateWithGemini(apiKey, HUB_ICON_PROMPT, hubIconRawOut, null, '1:1');
  } else {
    console.log(`  [CACHE HIT] ${path.basename(hubIconRawOut)}`);
  }

  // 4. Generate Hub 4th Tab Mode Icon (`mode-tv-raw.png`)
  const modeTvRawOut = path.join(HUB_RAW_DIR, 'mode-tv-raw.png');
  if (force || !fs.existsSync(modeTvRawOut) || fs.statSync(modeTvRawOut).size < 10000) {
    await generateWithGemini(apiKey, MODE_TV_PROMPT, modeTvRawOut, null, '1:1');
  } else {
    console.log(`  [CACHE HIT] ${path.basename(modeTvRawOut)}`);
  }

  // 5. Run PowerShell HD Card Framer, Token Builder, Backdrop Upscaler & Chroma-Keyer
  if (process.argv.includes('--api-only')) {
    return;
  }
  const ps1Path = path.join(__dirname, 'build_starship_assets.ps1');
  if (fs.existsSync(ps1Path)) {
    console.log('Running build_starship_assets.ps1 for HD framing & chroma-keying...');
    execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps1Path], {
      stdio: 'inherit'
    });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
