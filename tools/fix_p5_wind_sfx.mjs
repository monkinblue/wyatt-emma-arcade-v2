/**
 * tools/fix_p5_wind_sfx.mjs
 * -------------------------
 * Node.js companion runner for `tools/fix_p5_wind_sfx.py`.
 * Also generates the 4 supplementary Page 6 single-concept SFX files if invoked with `--with-p6`.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT_DIR, '.env');
const SFX_DIR = path.join(ROOT_DIR, 'public', 'assets', 'audio', 'colorado', 'sfx');

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

async function generateOne(apiKey, filename, prompt, durationSeconds, promptInfluence = 0.75, force = false) {
  const outPath = path.join(SFX_DIR, filename);
  if (fs.existsSync(outPath) && fs.statSync(outPath).size > 1024 && !force) {
    console.log(`  [CACHE HIT] sfx/${filename} (${fs.statSync(outPath).size.toLocaleString()} bytes)`);
    return;
  }
  const res = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg'
    },
    body: JSON.stringify({
      text: prompt,
      duration_seconds: durationSeconds,
      prompt_influence: promptInfluence
    })
  });
  if (!res.ok) {
    const errTxt = await res.text();
    throw new Error(`SFX failed for ${filename}: ${res.status} ${errTxt}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outPath, buf);
  console.log(`  [GENERATED] sfx/${filename} (${buf.length.toLocaleString()} bytes) — '${prompt}'`);
}

async function main() {
  const env = loadEnv();
  const apiKey = env.ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY not found in .env');
  }
  fs.mkdirSync(SFX_DIR, { recursive: true });

  await generateOne(
    apiKey,
    'p5_gusting_canyon_wind.mp3',
    'Strong rushing high-altitude mountain wind gusting and whistling clearly through a deep rocky canyon',
    10.0,
    0.75,
    true
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
