#!/usr/bin/env node
/**
 * scripts/generate_starship_voices.mjs
 * ------------------------------------
 * Resolves the ElevenLabs voice "Emily E.- Operator & Public Announcement"
 * (checking /v1/voices first, or searching /v1/shared-voices and adding it to library)
 * and generates all 18 Starbase PA Operator voice lines (`public/assets/sfx/starship/vo_*.mp3`)
 * via `POST https://api.elevenlabs.io/v1/text-to-speech/:voice_id`.
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

const VOICE_LINES = [
  {
    file: 'vo_mission_launch.mp3',
    text: 'Orbital telemetry online. Deploying crew to Launchpad Bay Zero.'
  },
  {
    file: 'vo_turn_wyatt.mp3',
    text: 'Astro-Ranger Wyatt.'
  },
  {
    file: 'vo_turn_emma.mp3',
    text: 'Space Princess Emma.'
  },
  {
    file: 'vo_turn_robert.mp3',
    text: 'Commander Robert.'
  },
  {
    file: 'vo_turn_rita.mp3',
    text: 'Commander Rita.'
  },
  {
    file: 'vo_turn_papa.mp3',
    text: 'Commander Papa.'
  },
  {
    file: 'vo_turn_nana.mp3',
    text: "Ship's Counselor Nana."
  },
  {
    file: 'vo_turn_grandpa.mp3',
    text: 'Commander Grandpa.'
  },
  {
    file: 'vo_turn_babci.mp3',
    text: 'Commander Bahp-shee.'
  },
  {
    file: 'vo_turn_guest.mp3',
    text: 'Mission Specialist.'
  },
  {
    file: 'vo_turn_dreadbot.mp3',
    text: 'Warning: Rogue A.I. Dread-Bot.',
    force: true
  },
  {
    file: 'vo_verdict_correct.mp3',
    text: 'Telemetry verified. Primary thruster online.'
  },
  {
    file: 'vo_verdict_wrong.mp3',
    text: 'Telemetry mismatch. Thrusters offline this turn.'
  },
  {
    file: 'vo_red_alert.mp3',
    text: 'Red Alert. Five seconds remaining.'
  },
  {
    file: 'vo_hypertube.mp3',
    text: 'Hyper-Tube wormhole engaged. Advancing five pads.'
  },
  {
    file: 'vo_turbocoil.mp3',
    text: 'Turbo Coil overdrive active. Advancing three pads.'
  },
  {
    file: 'vo_cryovent.mp3',
    text: 'Warning: Cryo-vent hazard. Drifting back two pads.'
  },
  {
    file: 'vo_airdrop_incoming.mp3',
    text: 'Attention crew: Orbital challenge engaged.'
  },
  {
    file: 'vo_victory.mp3',
    text: 'Unicorn Citadel reached. Mission accomplished, crew!'
  }
];

function isEmilyOperatorMatch(name = '') {
  const n = name.toLowerCase();
  return (
    n.includes('emily e.') ||
    n.includes('emily e -') ||
    n.includes('emily e.-') ||
    n.includes('operator & public announcement') ||
    (n.includes('emily') && n.includes('operator'))
  );
}

async function resolveEmilyVoiceId(apiKey) {
  console.log('[1/2] Checking My Voices (GET https://api.elevenlabs.io/v1/voices)...');
  const myRes = await fetch('https://api.elevenlabs.io/v1/voices', {
    headers: { 'xi-api-key': apiKey }
  });
  if (myRes.ok) {
    const myData = await myRes.json();
    const voices = myData.voices || [];
    const found = voices.find((v) => isEmilyOperatorMatch(v.name));
    if (found) {
      console.log(`[FOUND IN MY VOICES] "${found.name}" -> voice_id: ${found.voice_id}`);
      return found.voice_id;
    }
  } else {
    console.warn(`Warning checking /v1/voices: HTTP ${myRes.status}`);
  }

  console.log('[2/2] Searching Shared Voice Library (GET https://api.elevenlabs.io/v1/shared-voices)...');
  const searchQueries = [
    'Emily E.',
    'Operator & Public Announcement',
    'Emily E.- Operator & Public Announcement'
  ];

  for (const query of searchQueries) {
    const url = `https://api.elevenlabs.io/v1/shared-voices?search=${encodeURIComponent(query)}&page_size=30`;
    const sharedRes = await fetch(url, {
      headers: { 'xi-api-key': apiKey }
    });
    if (!sharedRes.ok) continue;

    const sharedData = await sharedRes.json();
    const sharedVoices = sharedData.voices || [];
    const match =
      sharedVoices.find((v) => isEmilyOperatorMatch(v.name)) ||
      sharedVoices[0];

    if (match && match.voice_id) {
      console.log(
        `[FOUND IN SHARED VOICES] "${match.name}" (public_owner_id: ${match.public_owner_id}, voice_id: ${match.voice_id})`
      );
      if (match.public_owner_id) {
        const addUrl = `https://api.elevenlabs.io/v1/voices/add/${match.public_owner_id}/${match.voice_id}`;
        console.log(`[ADDING TO MY VOICES] POST ${addUrl}`);
        const addRes = await fetch(addUrl, {
          method: 'POST',
          headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            new_name: match.name || 'Emily E.- Operator & Public Announcement'
          })
        });
        if (addRes.ok) {
          const addJson = await addRes.json();
          const finalId = addJson.voice_id || match.voice_id;
          console.log(`[ADDED VOICE] voice_id: ${finalId}`);
          return finalId;
        } else {
          const errTxt = await addRes.text();
          console.log(`[ADD INFO] Status ${addRes.status} (${errTxt}) — using shared voice_id: ${match.voice_id}`);
        }
      }
      return match.voice_id;
    }
  }

  throw new Error('Could not resolve "Emily E.- Operator & Public Announcement" voice_id.');
}

async function synthesizeLine(apiKey, voiceId, spec, outPath) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
  const payload = {
    text: spec.text,
    model_id: 'eleven_multilingual_v2',
    voice_settings: {
      stability: 0.65,
      similarity_boost: 0.85,
      style: 0.15
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

  const voiceId = await resolveEmilyVoiceId(apiKey);
  console.log(`Using ElevenLabs voice_id: ${voiceId}`);

  for (const spec of VOICE_LINES) {
    const outPath = path.join(OUT_DIR, spec.file);
    if (!spec.force && fs.existsSync(outPath) && fs.statSync(outPath).size > 5000) {
      console.log(`[SKIP] ${spec.file} already exists (>5KB)`);
      continue;
    }
    console.log(`[SYNTHESIZING] ${spec.file} -> "${spec.text}"`);
    const bytes = await synthesizeLine(apiKey, voiceId, spec, outPath);
    console.log(`[SAVED] ${spec.file} (${bytes.toLocaleString()} bytes)`);
    await new Promise((r) => setTimeout(r, 150));
  }

  console.log('All 18 Emily E. Starbase PA Operator voice lines generated in public/assets/sfx/starship/!');
}

main().catch((err) => {
  console.error('Error generating ElevenLabs PA voices:', err);
  process.exit(1);
});
