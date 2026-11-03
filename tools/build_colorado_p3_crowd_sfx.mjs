/**
 * tools/build_colorado_p3_crowd_sfx.mjs
 * -------------------------------------
 * Node.js companion runner for `tools/build_colorado_p3_crowd_sfx.py`:
 * Generates the 14.0-second Page 3 ("Manitou Springs Penny Arcade") additional
 * looping crowd/kids laughing track at `public/assets/audio/colorado/sfx/p3_ambient_crowd_chatter.mp3`
 * using `ELEVENLABS_API_KEY` from `.env`.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT_DIR, '.env');
const SFX_DIR = path.join(ROOT_DIR, 'public', 'assets', 'audio', 'colorado', 'sfx');

const CROWD_SFX_SPEC = [
  'p3_ambient_crowd_chatter.mp3',
  'Happy children laughing and giggling with warm lively indoor family crowd chatter and cheerful voices',
  14.0
];

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

async function main() {
  const force = process.argv.includes('--force');
  const env = loadEnv();
  const apiKey = env.ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY not found in .env');
  }

  fs.mkdirSync(SFX_DIR, { recursive: true });

  const [filename, prompt, durationSeconds] = CROWD_SFX_SPEC;
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
      prompt_influence: 0.45
    })
  });
  if (!res.ok) {
    const errTxt = await res.text();
    throw new Error(`SFX failed for ${filename}: ${res.status} ${errTxt}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outPath, buf);
  console.log(`  [GENERATED P3 CROWD SFX] sfx/${filename} (${buf.length.toLocaleString()} bytes) — '${prompt}'`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
