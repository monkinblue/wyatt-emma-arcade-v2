#!/usr/bin/env node
/**
 * scripts/generate_starship_sfx.mjs
 * ---------------------------------
 * Calls the ElevenLabs Sound Generation API (`POST https://api.elevenlabs.io/v1/sound-generation`)
 * using `ELEVENLABS_API_KEY` from `.env` to generate and save the studio-grade `.mp3` sound effects
 * into `public/assets/sfx/starship/`.
 * Force-regenerates (overwrites) the 4 smooth futuristic spaceship acoustic SFX:
 *   1. `sfx_jetpack_hop.mp3` (0.7s)
 *   2. `sfx_switchgear_slam.mp3` (1.0s)
 *   3. `sfx_overclock_correct.mp3` (1.8s)
 *   4. `sfx_shield_deflect.mp3` (1.0s)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT_DIR, 'public', 'assets', 'sfx', 'starship');

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

const SFX_SPECS = [
  {
    file: 'sfx_lobby_latch.mp3',
    duration: 1.0,
    forceOverwrite: false,
    prompt:
      'Heavy industrial metal hydraulic lever latch clunk and short compressed air release, sci-fi factory switchgear'
  },
  {
    file: 'sfx_space_elevator_launch.mp3',
    duration: 3.0,
    forceOverwrite: false,
    prompt:
      'Three massive metallic orbital locking clamps releasing in sequence followed by deep sub-bass rocket thruster ignition rumble and steam vent'
  },
  {
    file: 'sfx_drawer_servo.mp3',
    duration: 1.0,
    forceOverwrite: false,
    prompt:
      'Motorized heavy metal cockpit console sliding on hydraulic rails and locking into place with a pneumatic thud'
  },
  {
    file: 'sfx_thruster_standard.mp3',
    duration: 1.2,
    forceOverwrite: false,
    prompt:
      'Heavy pneumatic pressure valve release hiss and mechanical auxiliary piston lock'
  },
  {
    file: 'sfx_dice_plunger.mp3',
    duration: 1.5,
    forceOverwrite: false,
    prompt:
      'Heavy spring-loaded steel blast plunger slam followed by metallic titanium dice clattering on a thick steel deck plate'
  },
  // 4 Smooth Futuristic Spaceship Acoustics:
  {
    file: 'sfx_jetpack_hop.mp3',
    duration: 0.7,
    forceOverwrite: false,
    prompt:
      'Smooth futuristic pneumatic air piston whoosh with a soft robotic hydraulic servo glide, warm and pleasing sci-fi motion, no harsh clanking'
  },
  {
    file: 'sfx_switchgear_slam.mp3',
    duration: 1.0,
    forceOverwrite: false,
    prompt:
      'Smooth futuristic spaceship cockpit button press, soft hydraulic airlock cushion seal and warm low-frequency magnetic lock hum'
  },
  {
    file: 'sfx_overclock_correct.mp3',
    duration: 0.9,
    forceOverwrite: true,
    prompt:
      'Crisp futuristic sci-fi computer terminal password accepted two-tone positive confirmation chime, clean high-tech access granted UI sound, warm and modern, no rising pitch squeak'
  },
  {
    file: 'sfx_shield_deflect.mp3',
    duration: 1.0,
    forceOverwrite: false,
    prompt:
      'Sleek futuristic spacecraft energy shield activation, smooth magnetic plasma bubble whoosh and deep bass pulse, warm and clean'
  },
  // 10 Event Cutscenes, Special Pads, Mini-Challenges & Red Alert Klaxon SFX:
  {
    file: 'sfx_hypertube_warp.mp3',
    duration: 1.8,
    forceOverwrite: false,
    prompt:
      'Futuristic magnetic hyperloop vacuum tube suction whoosh followed by a deep sci-fi wormhole relativistic Doppler pass-by, smooth and cinematic'
  },
  {
    file: 'sfx_turbocoil_boost.mp3',
    duration: 1.5,
    forceOverwrite: false,
    prompt:
      'Futuristic spacecraft plasma capacitor supercharger spin-up with warm magnetic hum and clean energy surge release'
  },
  {
    file: 'sfx_cryovent_freeze.mp3',
    duration: 1.5,
    forceOverwrite: false,
    prompt:
      'Pressurized cryogenic liquid nitrogen gas vent burst with crystalline ice frosting crackle and deep hull depressurization sigh'
  },
  {
    file: 'sfx_prism_catapult.mp3',
    duration: 1.8,
    forceOverwrite: false,
    prompt:
      'Futuristic electromagnetic orbital mass-driver catapult launch whoosh with shimmering harmonic plasma trail'
  },
  {
    file: 'sfx_colorsync_warp.mp3',
    duration: 1.6,
    forceOverwrite: false,
    prompt:
      'Sleek sci-fi starship thruster sync lock followed by a smooth high-speed ion drive plasma streak whoosh'
  },
  {
    file: 'sfx_meteor_shatter.mp3',
    duration: 1.4,
    forceOverwrite: false,
    prompt:
      'Futuristic twin plasma turret laser blast followed by a deep satisfying crystalline meteor disintegration boom in space'
  },
  {
    file: 'sfx_crate_open.mp3',
    duration: 1.4,
    forceOverwrite: false,
    prompt:
      'Heavy sci-fi metallic cargo drop-pod hydraulic clamps unlatching with pressurized air hiss and warm golden loot core hum'
  },
  {
    file: 'sfx_slingshot_boost.mp3',
    duration: 1.5,
    forceOverwrite: false,
    prompt:
      'Deep futuristic gravity wave pulse and smooth magnetic propulsion thruster launch'
  },
  {
    file: 'sfx_red_alert_klaxon.mp3',
    duration: 1.0,
    forceOverwrite: false,
    prompt:
      'Classic Star Trek style futuristic starship bridge Red Alert klaxon pulse, deep resonant low-mid electronic warning siren swell, smooth and cinematic, not ear-piercing'
  },
  {
    file: 'sfx_timer_expired.mp3',
    duration: 1.2,
    forceOverwrite: false,
    prompt:
      'Futuristic spaceship reactor power-down hydraulic vent sigh with a soft magnetic lock click'
  },
  {
    file: 'sfx_answer_correct_fanfare.mp3',
    duration: 0.9,
    forceOverwrite: true,
    prompt:
      'Crisp futuristic sci-fi computer terminal password accepted two-tone positive confirmation chime, clean high-tech access granted UI sound, warm and modern, no rising pitch squeak'
  },
  {
    file: 'sfx_answer_wrong_buzzer.mp3',
    duration: 1.4,
    forceOverwrite: false,
    prompt:
      'Unmistakable futuristic starship bridge double-tone error alert buzzer followed by a soft deflector power-down sigh'
  }
];

async function generateSoundEffect(apiKey, spec, outPath) {
  const url = 'https://api.elevenlabs.io/v1/sound-generation';
  const payload = {
    text: spec.prompt,
    duration_seconds: spec.duration,
    prompt_influence: 0.55
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
    const errText = await res.text();
    throw new Error(`HTTP ${res.status}: ${errText}`);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, buf);
  return buf.length;
}

async function main() {
  const envVars = loadEnvFile(ROOT_DIR);
  const apiKey = (process.env.ELEVENLABS_API_KEY || envVars.ELEVENLABS_API_KEY || '').trim();
  if (!apiKey) {
    console.error('ERROR: ELEVENLABS_API_KEY not found in environment or .env');
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const spec of SFX_SPECS) {
    const outPath = path.join(OUT_DIR, spec.file);
    if (!spec.forceOverwrite && fs.existsSync(outPath) && fs.statSync(outPath).size > 5120) {
      console.log(`[SKIP EXISTING >5KB] ${spec.file} (${fs.statSync(outPath).size.toLocaleString()} bytes)`);
      continue;
    }

    console.log(`[GENERATING] ${spec.file} (${spec.duration}s) -> "${spec.prompt}"`);
    const bytes = await generateSoundEffect(apiKey, spec, outPath);
    console.log(`[SAVED] ${spec.file} (${bytes.toLocaleString()} bytes)`);
    await new Promise((r) => setTimeout(r, 150));
  }

  console.log('All ElevenLabs Space-Industrial & Smooth Futuristic SFX MP3s are ready in public/assets/sfx/starship/!');
}

main().catch((err) => {
  console.error('Error generating ElevenLabs SFX:', err);
  process.exit(1);
});
