#!/usr/bin/env node
/**
 * scripts/generate_kid_question_audio.mjs
 * ---------------------------------------
 * Resolves the ElevenLabs voice "Emily E.- Operator & Public Announcement"
 * and generates all 108 synchronized Kid Question & Option audio clips
 * (`36 questions x 3 clips = 108 .mp3 files`) into `public/assets/sfx/starship/kids/`:
 *   - `kid_XX_q.mp3`: Spoken question text
 *   - `kid_XX_a.mp3`: Spoken text for Option A (emoji stripped)
 *   - `kid_XX_b.mp3`: Spoken text for Option B (emoji stripped)
 *
 * Uses concurrency = 4 and incremental skip-if-exists caching so runs complete
 * quickly and reliably within ElevenLabs API rate limits.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT_DIR, 'public', 'assets', 'sfx', 'starship', 'kids');

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

const KID_AUDIO_SPECS = [
  {
    id: 'kid_01',
    q: 'If your friend drops their ice cream cone and starts crying, what is the kind thing to do?',
    a: 'Share a bite of yours.',
    b: 'Point and laugh at them.'
  },
  {
    id: 'kid_02',
    q: "If you accidentally knock over your sister's block tower, what should you do?",
    a: 'Say sorry and help rebuild.',
    b: 'Run away and hide fast.'
  },
  {
    id: 'kid_03',
    q: 'When 2 kids both want to play with the same toy truck, what is the best choice?',
    a: 'Take turns sharing it.',
    b: 'Grab it away and yell.'
  },
  {
    id: 'kid_04',
    q: 'If you see a new kid sitting all alone at the playground, what is a friendly thing to do?',
    a: 'Wave and ask to play.',
    b: 'Ignore them completely.'
  },
  {
    id: 'kid_05',
    q: 'When someone gives you a birthday present, what are the magic words to say?',
    a: 'Thank you so much.',
    b: 'Give me another one.'
  },
  {
    id: 'kid_06',
    q: 'When you finish playing with your crayons and puzzles, what should you do next?',
    a: 'Put them in the toy bin.',
    b: 'Leave them on the floor.'
  },
  {
    id: 'kid_07',
    q: 'If your puppy or kitty is sleeping peacefully on their bed, how should you treat them?',
    a: 'Let them rest gently.',
    b: 'Pull their tail and shout.'
  },
  {
    id: 'kid_08',
    q: 'When Mom or Dad is carrying heavy grocery bags to the door, how can you be a helper?',
    a: 'Hold the door open wide.',
    b: 'Block the doorway and jump.'
  },
  {
    id: 'kid_09',
    q: 'If a friend falls down on the grass and scrapes their knee, what should you do?',
    a: 'Check on them and get help.',
    b: 'Keep running and tease them.'
  },
  {
    id: 'kid_10',
    q: 'When you want a yummy cookie from the kitchen counter, how do you ask politely?',
    a: 'May I please have 1 cookie?',
    b: 'Give me a cookie right now!'
  },
  {
    id: 'kid_11',
    q: 'Before you cross a busy street with cars, what should you always do first?',
    a: "Hold a grown-up's hand.",
    b: 'Run across without looking.'
  },
  {
    id: 'kid_12',
    q: 'When you ride your bicycle or scooter outside, what keeps your head safe?',
    a: 'A buckled bike helmet.',
    b: 'A floppy party hat.'
  },
  {
    id: 'kid_13',
    q: "If you find something on the counter and don't know what it is, what should you do?",
    a: 'Ask Mom or Dad first.',
    b: 'Put it in your mouth.'
  },
  {
    id: 'kid_14',
    q: 'Every night before you climb into bed to go to sleep, how do you keep your teeth shiny?',
    a: 'Brush your teeth for 2 minutes.',
    b: 'Eat 5 sticky gummy candies.'
  },
  {
    id: 'kid_15',
    q: 'When you ride in the family car, what keeps you safe in your car seat?',
    a: 'Keep your seat belt buckled.',
    b: 'Unbuckle and climb around.'
  },
  {
    id: 'kid_16',
    q: 'After you use the bathroom or play in the mud outside, what should you do with your hands?',
    a: 'Wash with soap and water.',
    b: 'Wipe them on the couch.'
  },
  {
    id: 'kid_17',
    q: 'If you see a hot stove or oven in the kitchen, what is the safe rule to follow?',
    a: 'Stay back and do not touch.',
    b: 'Reach up and grab the pan.'
  },
  {
    id: 'kid_18',
    q: 'When you feel super frustrated or angry, what is a healthy way to calm your body down?',
    a: 'Take 3 deep belly breaths.',
    b: 'Throw your toys at the wall.'
  },
  {
    id: 'kid_19',
    q: 'If you feel scared during a loud thunderstorm at night, what is a good thing to do?',
    a: 'Ask for a big cozy hug.',
    b: 'Run outside in the rain.'
  },
  {
    id: 'kid_20',
    q: 'When a puzzle is tricky and a piece does not fit right away, what should you try?',
    a: 'Turn the piece and try again.',
    b: 'Smash the puzzle on the floor.'
  },
  {
    id: 'kid_21',
    q: 'When someone is reading a bedtime story to you, what is the best way to listen?',
    a: 'Use quiet ears and look.',
    b: 'Bang on a loud drum set.'
  },
  {
    id: 'kid_22',
    q: 'How many wheels does a regular bicycle have?',
    a: '2 round wheels.',
    b: '9 round wheels.'
  },
  {
    id: 'kid_23',
    q: 'How many wiggly arms does an ocean octopus have?',
    a: '8 wiggly arms.',
    b: '2 wiggly arms.'
  },
  {
    id: 'kid_24',
    q: 'Which thing flies high up in outer space among the twinkling stars?',
    a: 'A shiny rocket ship.',
    b: 'A muddy farm tractor.'
  },
  {
    id: 'kid_25',
    q: 'How many fingers do you have on 1 hand?',
    a: '5 wiggly fingers.',
    b: '10 wiggly fingers.'
  },
  {
    id: 'kid_26',
    q: 'How many magical horns does a fairytale unicorn have on its forehead?',
    a: '1 sparkly horn.',
    b: '6 sparkly horns.'
  },
  {
    id: 'kid_27',
    q: 'How many legs does a friendly golden puppy dog walk on?',
    a: '4 furry legs.',
    b: '8 furry legs.'
  },
  {
    id: 'kid_28',
    q: 'How many sides and corners does a triangle shape have?',
    a: '3 pointed corners.',
    b: '7 pointed corners.'
  },
  {
    id: 'kid_29',
    q: 'If you have 2 red apples and Mom gives you 1 more apple, how many apples do you have?',
    a: '3 crunchy apples.',
    b: '8 crunchy apples.'
  },
  {
    id: 'kid_30',
    q: 'What does an astronaut wear in outer space to breathe and stay safe?',
    a: 'A space suit and helmet.',
    b: 'Swim trunks and flip-flops.'
  },
  {
    id: 'kid_31',
    q: 'Which animal builds a sticky web to catch bugs and has 8 legs?',
    a: 'A little climbing spider.',
    b: 'A waddling ice penguin.'
  },
  {
    id: 'kid_32',
    q: 'When it is snowing and freezing cold outside, what should you wear to stay warm?',
    a: 'A warm winter coat and mittens.',
    b: 'A summer bathing suit.'
  },
  {
    id: 'kid_33',
    q: 'Which busy insect flies from flower to flower and makes sweet golden honey?',
    a: 'A buzzing bumblebee.',
    b: 'A slow green turtle.'
  },
  {
    id: 'kid_34',
    q: 'What shines bright in the daytime sky to warm the Earth and help plants grow?',
    a: 'The bright yellow Sun.',
    b: 'A cold snowy snowman.'
  },
  {
    id: 'kid_35',
    q: 'If you have 4 toy cars and you put 1 more car in the line, how many cars are there?',
    a: '5 racing toy cars.',
    b: '2 racing toy cars.'
  },
  {
    id: 'kid_36',
    q: 'Which ocean animal is the biggest animal on Earth and spouts water from a blowhole?',
    a: 'A giant blue whale.',
    b: 'A tiny sandy crab.'
  },
  {
    id: 'kid_37',
    q: 'If you find a super cool toy on the playground that does not belong to you, what should you do?',
    a: 'Give it to a grown-up to find the owner.',
    b: 'Put it in your pocket to keep.'
  },
  {
    id: 'kid_38',
    q: 'Mom says you may have 1 cookie and then turns around so she is not looking. What should you do?',
    a: 'Take just 1 cookie like you promised.',
    b: 'Sneak 2 cookies really fast.'
  },
  {
    id: 'kid_39',
    q: 'Your little sister wants to add a block to your giant Lego tower. What is a kind brother choice?',
    a: 'Show her a safe spot to add her block.',
    b: 'Push her hand away.'
  },
  {
    id: 'kid_40',
    q: 'Your friend wants to play dinosaurs, and you want to play rockets. How can you both have fun?',
    a: 'Play dinosaurs first, then rockets next.',
    b: "Say you won't play at all."
  },
  {
    id: 'kid_41',
    q: 'If you accidentally spill your cup of water on the floor and nobody saw you, what should you do?',
    a: 'Grab a towel and tell Mom or Dad.',
    b: "Walk away and pretend it wasn't you."
  },
  {
    id: 'kid_42',
    q: 'When you win a game and your friend loses and feels sad, what is a good sport thing to do?',
    a: 'Say good game and high-five.',
    b: 'Brag that you are the best.'
  },
  {
    id: 'kid_43',
    q: "If you borrow a friend's crayon and it accidentally snaps and breaks, what is the honest choice?",
    a: 'Tell them sorry and offer yours.',
    b: 'Hide the broken pieces.'
  },
  {
    id: 'kid_44',
    q: 'When there is a long line of kids waiting to go down the big playground slide, what should you do?',
    a: 'Wait patiently behind the next kid.',
    b: 'Squeeze past to the front.'
  },
  {
    id: 'kid_45',
    q: 'If you have 2 apples in your basket and pick 2 more apples from the tree, how many apples is 2 plus 2?',
    a: '4 apples.',
    b: '3 apples.'
  },
  {
    id: 'kid_46',
    q: 'You have 5 sweet strawberries on your plate and you eat 2 of them. How many strawberries are left?',
    a: '3 strawberries.',
    b: '4 strawberries.'
  },
  {
    id: 'kid_47',
    q: 'If you park 3 toy cars in the garage and drive 1 more toy car inside, how many toy cars is 3 plus 1?',
    a: '4 toy cars.',
    b: '5 toy cars.'
  },
  {
    id: 'kid_48',
    q: 'When you mix yellow paint and blue paint together with your paintbrush, what new color do they make?',
    a: 'Green paint.',
    b: 'Purple paint.'
  },
  {
    id: 'kid_49',
    q: 'When you mix bright red paint and sunny yellow paint together, what new color do they make?',
    a: 'Orange paint.',
    b: 'Green paint.'
  },
  {
    id: 'kid_50',
    q: 'When you mix red paint and blue paint together on your art paper, what new color do they make?',
    a: 'Purple paint.',
    b: 'Yellow paint.'
  },
  {
    id: 'kid_51',
    q: 'Which of these objects sinks straight down to the bottom of a bathtub full of water?',
    a: 'A heavy metal spoon.',
    b: 'A hollow plastic duck.'
  },
  {
    id: 'kid_52',
    q: 'Which of these objects floats right on top of the water in a pond or bathtub?',
    a: 'A wooden toy boat.',
    b: 'A heavy gray rock.'
  },
  {
    id: 'kid_53',
    q: 'Why does a cold frozen ice cube melt and turn into water when you leave it outside in the sun?',
    a: 'The warm sun heats it up.',
    b: 'The wind blows it away.'
  },
  {
    id: 'kid_54',
    q: 'Which of these baby animals hatches out of a hard-shelled egg?',
    a: 'A sea turtle.',
    b: 'A golden puppy.'
  },
  {
    id: 'kid_55',
    q: 'Which giant planet in our solar system is famous for having bright icy rings all around it?',
    a: 'Saturn.',
    b: 'Mars.'
  },
  {
    id: 'kid_56',
    q: 'What invisible force pulls a ball back down to the ground when you throw it up in the air?',
    a: "Earth's gravity pulling down.",
    b: 'The clouds pushing it down.'
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
      return match.voice_id;
    }
  }

  throw new Error('Could not resolve "Emily E.- Operator & Public Announcement" voice_id.');
}

async function synthesizeClipWithRetry(apiKey, voiceId, text, outPath, maxRetries = 6) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
  const payload = {
    text,
    model_id: 'eleven_multilingual_v2',
    voice_settings: {
      stability: 0.65,
      similarity_boost: 0.85,
      style: 0.15
    }
  };

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
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
    } catch (err) {
      if (attempt === maxRetries) throw err;
      await new Promise((r) => setTimeout(r, 900 * attempt));
    }
  }
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

  // Build flat list of 108 tasks (36 questions x 3 clips: _q, _a, _b)
  const tasks = [];
  for (const item of KID_AUDIO_SPECS) {
    tasks.push({ file: `${item.id}_q.mp3`, text: item.q });
    tasks.push({ file: `${item.id}_a.mp3`, text: item.a });
    tasks.push({ file: `${item.id}_b.mp3`, text: item.b });
  }

  const concurrency = 2;
  let nextIdx = 0;
  let generatedCount = 0;
  let skippedCount = 0;

  async function worker() {
    while (nextIdx < tasks.length) {
      const idx = nextIdx++;
      const task = tasks[idx];
      const outPath = path.join(OUT_DIR, task.file);

      if (fs.existsSync(outPath) && fs.statSync(outPath).size > 2000) {
        skippedCount++;
        console.log(`[SKIP ${idx + 1}/${tasks.length}] ${task.file} already exists`);
        continue;
      }

      console.log(`[SYNTH ${idx + 1}/${tasks.length}] ${task.file} -> "${task.text}"`);
      const bytes = await synthesizeClipWithRetry(apiKey, voiceId, task.text, outPath);
      generatedCount++;
      console.log(`[SAVED ${idx + 1}/${tasks.length}] ${task.file} (${bytes.toLocaleString()} bytes)`);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  console.log(
    `Done! ${generatedCount} generated, ${skippedCount} cached (${tasks.length} total clips in public/assets/sfx/starship/kids/).`
  );
}

main().catch((err) => {
  console.error('Error generating Kid Question audio clips:', err);
  process.exit(1);
});
