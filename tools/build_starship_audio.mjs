#!/usr/bin/env node
/**
 * tools/build_starship_audio.mjs
 * ------------------------------
 * Node.js Companion for `tools/build_starship_audio.py`.
 * Reads `ELEVENLABS_API_KEY` strictly from `.env` (never imported or referenced in `src/`)
 * and generates 31 SpaceX / FICSIT Mission Control Announcer Voice Clips + 6 Sci-Fi SFX MP3s:
 *   - `public/assets/audio/starship/voice/<id>.mp3`
 *   - `public/assets/audio/starship/sfx/<id>.mp3`
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const VOICE_CLIPS = {
  // Personalized Player Turn Callouts (9)
  turn_robert: 'Commander Robert, step to the launchpad.',
  turn_rita: 'Flight Director Rita, telemetry locked.',
  turn_wyatt: 'Astro-Ranger Wyatt, ready for ignition.',
  turn_emma: 'Space Princess Emma, engage starlight thrusters.',
  turn_papa: 'Chief Engineer Papa, your turn at the helm.',
  turn_nana: 'Science Officer Nana, mission control standing by.',
  turn_grandpa: 'Fleet Admiral Grandpa, orbital path clear.',
  turn_babci: 'Navigator Babci, ready for launch.',
  turn_guest: 'Guest Specialist, step up to the console.',

  // High-Impact Mission & Event Callouts (13)
  welcome_title: 'Welcome to Starship Unicorn: Orbital Trivia.',
  lobby_select: 'Select two to six astronauts and choose your orbital trajectory.',
  launch_sequence: 'Telemetry nominal. All crew locked in. Initiating orbital launch sequence.',
  overclock_engaged: 'Overclock engaged. Twin booster dice unlocked.',
  standard_thruster: 'Nice try. Standard thruster engaged.',
  color_warp_bonus: 'Color synchronization achieved. Warping to the next matching orbital pad.',
  tile_wormhole: 'Hyperloop wormhole activated.',
  tile_overclock: 'FICSIT turbo boost.',
  tile_asteroid: 'Warning: Asteroid gravity well.',
  tile_rainbow_starship: 'Rainbow Starship warp engaged.',
  roll_prompt: 'Engage thruster roll.',
  almost_there: 'Final orbital approach to the Cyber-Unicorn Citadel.',
  victory_citadel: 'We have liftoff. A new Galactic Unicorn Champion has reached the Citadel.',

  // Personalized Champion Callouts (9)
  victory_robert: 'We have liftoff. Commander Robert has reached the Unicorn Citadel.',
  victory_rita: 'We have liftoff. Flight Director Rita has reached the Unicorn Citadel.',
  victory_wyatt: 'We have liftoff. Astro-Ranger Wyatt has reached the Unicorn Citadel.',
  victory_emma: 'We have liftoff. Space Princess Emma has reached the Unicorn Citadel.',
  victory_papa: 'We have liftoff. Chief Engineer Papa has reached the Unicorn Citadel.',
  victory_nana: 'We have liftoff. Science Officer Nana has reached the Unicorn Citadel.',
  victory_grandpa: 'We have liftoff. Fleet Admiral Grandpa has reached the Unicorn Citadel.',
  victory_babci: 'We have liftoff. Navigator Babci has reached the Unicorn Citadel.',
  victory_guest: 'We have liftoff. Guest Specialist has reached the Unicorn Citadel.'
};

const SFX_CLIPS = {
  rocket_ignition: [
    'Deep cinematic SpaceX orbital rocket booster ignition rumble and plasma thruster whoosh',
    2.0
  ],
  hyperloop_whoosh: [
    'Futuristic sci-fi magnetic hyperloop plasma tube warp whoosh with shimmering synth chime',
    1.6
  ],
  overclock_chime: [
    'High-tech FICSIT industrial power-up overclock telemetry lock chime and energetic synth chord',
    1.4
  ],
  asteroid_retro: [
    'Sci-fi spacecraft retro-thruster braking burst and gentle magnetic shield deflect',
    1.3
  ],
  dice_tumble: [
    'Futuristic metallic titanium and holographic energy dice tumbling on a glass console',
    1.2
  ],
  citadel_fanfare: [
    'Epic triumphant synthwave sci-fi orchestral fanfare with shimmering starlight arpeggios',
    3.0
  ]
};

function loadEnvFile(rootDir) {
  const envVars = {};
  const envPath = path.join(rootDir, '.env');
  if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, 'utf8');
    for (const rawLine of raw.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#') || !line.includes('=')) continue;
      const eqIdx = line.indexOf('=');
      const k = line.slice(0, eqIdx).trim();
      const v = line.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
      envVars[k] = v;
    }
  }
  return envVars;
}

async function synthesizeVoiceMp3(apiKey, voiceId, text, outPath) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`;
  const payload = {
    text,
    model_id: 'eleven_turbo_v2_5',
    previous_text: 'SpaceX Starbase Mission Control telemetry announcer speaking clearly and cinematically.',
    voice_settings: {
      stability: 0.84,
      similarity_boost: 0.78,
      style: 0.05,
      use_speaker_boost: true
    }
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg'
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, buf);
  return buf.length;
}

async function synthesizeSfxMp3(apiKey, prompt, outPath, durationSeconds = 1.5) {
  const url = 'https://api.elevenlabs.io/v1/sound-generation';
  const payload = {
    text: prompt,
    duration_seconds: durationSeconds,
    prompt_influence: 0.45
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg'
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, buf);
  return buf.length;
}

async function main() {
  const force = process.argv.includes('--force');
  const envVars = loadEnvFile(ROOT_DIR);
  const apiKey = (envVars.ELEVENLABS_API_KEY ?? '').trim();
  const voiceId = (envVars.ELEVENLABS_VOICE_ID ?? 'nzFihrBIvB34imQBuxub').trim();

  if (!apiKey) {
    console.error('ERROR: ELEVENLABS_API_KEY not found in .env!');
    process.exit(1);
  }

  const baseOutDir = path.join(ROOT_DIR, 'public', 'assets', 'audio', 'starship');
  const voiceDir = path.join(baseOutDir, 'voice');
  const sfxDir = path.join(baseOutDir, 'sfx');

  fs.mkdirSync(voiceDir, { recursive: true });
  fs.mkdirSync(sfxDir, { recursive: true });

  for (const [clipKey, text] of Object.entries(VOICE_CLIPS)) {
    const outPath = path.join(voiceDir, `${clipKey}.mp3`);
    if (!force && fs.existsSync(outPath) && fs.statSync(outPath).size > 800) {
      console.log(`  [CACHE HIT] voice/${clipKey}.mp3`);
      continue;
    }
    const sizeB = await synthesizeVoiceMp3(apiKey, voiceId, text, outPath);
    console.log(`  [GENERATED VOICE] voice/${clipKey}.mp3 (${sizeB.toLocaleString()} bytes) — "${text}"`);
    await new Promise((r) => setTimeout(r, 85));
  }

  for (const [sfxKey, [sfxPrompt, dur]] of Object.entries(SFX_CLIPS)) {
    const outPath = path.join(sfxDir, `${sfxKey}.mp3`);
    if (!force && fs.existsSync(outPath) && fs.statSync(outPath).size > 800) {
      console.log(`  [CACHE HIT] sfx/${sfxKey}.mp3`);
      continue;
    }
    try {
      const sizeB = await synthesizeSfxMp3(apiKey, sfxPrompt, outPath, dur);
      console.log(`  [GENERATED SFX] sfx/${sfxKey}.mp3 (${sizeB.toLocaleString()} bytes)`);
      await new Promise((r) => setTimeout(r, 120));
    } catch (err) {
      console.log(`  [SFX FALLBACK NOTE] sfx/${sfxKey}.mp3 (${err.message}) — WebAudio synth engine will handle.`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
