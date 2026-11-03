/**
 * tools/build_colorado_book_audio.mjs
 * -----------------------------------
 * Node.js companion runner for `tools/build_colorado_book_audio.py`:
 * Generates Book 2 ("To Babci and Grandpa's House We Go! / A Colorado Adventure") narration
 * strictly using the exact Michigan Book narrator voice (`Spuds Oxley - Grandpa`, ID `NOpBlnGInO9m6vDvFkFC`)
 * with `"Babci"` -> `"Bob-chee"` (and `"Babci's"` -> `"Bob-chee's"`) pronunciation replacement!
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT_DIR, '.env');
const NARRATION_DIR = path.join(ROOT_DIR, 'public', 'assets', 'audio', 'colorado', 'narration');
const SFX_DIR = path.join(ROOT_DIR, 'public', 'assets', 'audio', 'colorado', 'sfx');

// Exact Michigan Book (Book 1) Grandpa Narrator Voice (extracted from tools/sync_audio.py):
const MICHIGAN_BOOK_VOICE_NAME = 'Spuds Oxley - Grandpa';
const MICHIGAN_BOOK_VOICE_ID = 'NOpBlnGInO9m6vDvFkFC';
const MICHIGAN_BOOK_VOICE_SETTINGS = {
  stability: 0.68,
  similarity_boost: 0.82,
  style: 0.15,
  use_speaker_boost: true
};

const NARRATION_SCRIPTS = {
  title: "To Babci and Grandpa's House We Go. A Colorado Adventure.",
  page_1:
    'We packed up our gray Subaru and our big rooftop box for a family road trip to Colorado. Dad held Wyatt in his cozy blue pajamas and Mom held baby Emma as we looked out over the golden autumn mountains.',
  page_2:
    "Hooray, we made it to Babci and Grandpa's sunny house in Colorado. Grandpa and Babci waved from the front porch by the purple lavender flowers and gave Wyatt and Emma the warmest hugs.",
  page_3:
    'Next we visited the magical Manitou Springs Penny Arcade. Wyatt and Emma rolled wooden Skee-Balls, rode the bouncy pony, and won long strings of golden tickets while Grandpa and Babci cheered.',
  page_4:
    'In sunny Eleven Mile Canyon, Grandpa held Wyatt on the riverbank so he could dip his blue water shoes into the sparkling stream. Little sister Emma sat on a smooth river stone and splashed her hands in the cool water.',
  page_5:
    'Way up high across the Royal Gorge Bridge, we walked together over the deep red canyon. Wyatt and Emma waved at the bright red gondola gliding through the blue Colorado sky.',
  page_6:
    'All aboard the orange Royal Gorge train chugging right beside the rushing river. Grandpa lifted Wyatt up to pull the shiny brass cord, and the big train horn blasted a giant choo-choo through the canyon.',
  page_7:
    'At Garden of the Gods, giant glowing red rocks reached all the way up toward snowy Pikes Peak. Wyatt, Emma, Babci, and Grandpa explored the sunny trail with friendly bluebirds and a little bunny.',
  page_8:
    "Back in Babci's sunny backyard, barefoot Mom pulled Wyatt and laughing Emma across the green grass in their red Radio Flyer wagon. Right beside the brick patio, we tapped golf balls into the two-hole putting green.",
  page_9:
    "Inside Babci's cozy kitchen, we rolled out soft dough and pinched delicious homemade potato and cheese pierogis together. Wyatt and Emma got silly puffs of white flour on their noses while golden pierogis sizzled in butter on the stove."
};

const SFX_PROMPTS = [
  ['sfx_car_horn.mp3', 'Friendly cheerful family SUV double road trip horn beep', 2.0],
  ['sfx_door_welcome.mp3', 'Warm wooden front door opening with cheerful doorbell chime', 2.2],
  ['sfx_penny_arcade.mp3', 'Retro mechanical penny arcade skee-ball roll, bells ringing, and tickets dispensing', 2.5],
  ['sfx_river_splash.mp3', 'Playful mountain river water splash and bubbling stream with child giggle', 2.2],
  ['sfx_trout_jump.mp3', 'Fish leaping out of river water with crisp splash', 1.8],
  ['sfx_gondola_bell.mp3', 'High mountain aerial cable car bell ding and gentle wind breeze', 2.2],
  [
    'sfx_train_horn.mp3',
    'Big powerful vintage Colorado canyon diesel-steam train horn blast echoing through canyon walls, choo choo',
    2.8
  ],
  ['sfx_train_chug.mp3', 'Rhythmic railroad train wheels clacking on tracks along a river', 2.5],
  ['sfx_red_rocks_birds.mp3', 'Peaceful canyon hawk cry and mountain songbirds', 2.4],
  ['sfx_wagon_roll.mp3', 'Red toy wagon rolling over grass with happy toddler laughter', 2.4],
  ['sfx_golf_putt.mp3', 'Golf club putt tap and ball dropping into metal golf cup', 2.0],
  ['sfx_pierogi_sizzle.mp3', 'Butter sizzling in a warm kitchen pan with happy wooden rolling pin taps', 2.4]
];

function loadEnv() {
  const env = {};
  if (fs.existsSync(ENV_PATH)) {
    const lines = fs.readFileSync(ENV_PATH, 'utf8').split(/\r?\n/);
    for (const raw of lines) {
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

function applyBabciPronunciation(text) {
  return text
    .replace(/Babci's/g, "Bob-chee's")
    .replace(/Babci/g, 'Bob-chee')
    .replace(/Bahb-chee's/g, "Bob-chee's")
    .replace(/Bahb-chee/g, 'Bob-chee');
}

async function checkCredits(apiKey, label) {
  try {
    const res = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
      headers: { 'xi-api-key': apiKey }
    });
    if (res.ok) {
      const sub = await res.json();
      const used = sub.character_count ?? 0;
      const limit = sub.character_limit ?? 0;
      console.log(
        `[ElevenLabs ${label}] Tier: ${sub.tier} | Used: ${used.toLocaleString()} / ${limit.toLocaleString()} | Remaining: ${(limit - used).toLocaleString()} chars`
      );
    }
  } catch (err) {
    console.log(`[ElevenLabs ${label}] Could not read subscription info:`, err.message);
  }
}

async function resolveMichiganNarratorVoice(apiKey) {
  try {
    const res = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': apiKey }
    });
    if (res.ok) {
      const data = await res.json();
      const match = (data.voices || []).find(
        (v) => v.voice_id === MICHIGAN_BOOK_VOICE_ID || (v.name || '').toLowerCase().includes('spuds')
      );
      if (match) {
        console.log(`[Michigan Book Narrator Voice] ${match.name} (${match.voice_id})`);
        return match.voice_id;
      }
    }
  } catch {
    // ignore
  }
  console.log(`[Michigan Book Narrator Voice] Using ID ${MICHIGAN_BOOK_VOICE_ID} (Spuds Oxley - Grandpa)`);
  return MICHIGAN_BOOK_VOICE_ID;
}

async function main() {
  const forceSfx = process.argv.includes('--force-sfx');
  const env = loadEnv();
  const apiKey = env.ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY missing in .env');
  }

  fs.mkdirSync(NARRATION_DIR, { recursive: true });
  fs.mkdirSync(SFX_DIR, { recursive: true });

  await checkCredits(apiKey, 'Before Colorado Audio Build');
  const voiceId = await resolveMichiganNarratorVoice(apiKey);
  console.log(`[Narrator Voice Locked] ${MICHIGAN_BOOK_VOICE_NAME} (voice_id=${voiceId})`);

  for (const [key, script] of Object.entries(NARRATION_SCRIPTS)) {
    const outPath = path.join(NARRATION_DIR, `${key}.mp3`);
    const ttsText = applyBabciPronunciation(script);
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg'
        },
        body: JSON.stringify({
          text: ttsText,
          model_id: 'eleven_multilingual_v2',
          voice_settings: MICHIGAN_BOOK_VOICE_SETTINGS
        })
      }
    );
    if (!res.ok) {
      const errTxt = await res.text();
      throw new Error(`TTS failed for ${key}: ${res.status} ${errTxt}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(outPath, buf);
    console.log(
      `  [GENERATED NARRATION] narration/${key}.mp3 (${buf.length.toLocaleString()} bytes) | TTS: ${JSON.stringify(ttsText)}`
    );
  }

  for (const [filename, prompt, durationSeconds] of SFX_PROMPTS) {
    const outPath = path.join(SFX_DIR, filename);
    if (fs.existsSync(outPath) && fs.statSync(outPath).size > 1024 && !forceSfx) {
      console.log(`  [CACHE HIT] sfx/${filename}`);
      continue;
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
    console.log(`  [GENERATED SFX] sfx/${filename} (${buf.length.toLocaleString()} bytes) — '${prompt}'`);
  }

  await checkCredits(apiKey, 'After Colorado Audio Build');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
