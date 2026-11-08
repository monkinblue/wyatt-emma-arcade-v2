/**
 * src/data/starshipQuestionBank.ts
 * --------------------------------
 * Mentor Note:
 * Dedicated question bank and persistent Fisher-Yates non-repeating deck manager for
 * **STARSHIP UNICORN: ORBITAL TRIVIA**.
 *
 * Strict Design & Formatting Guarantees:
 * 1. **Uniform Option Structure**: Within every question, all options share the same format,
 *    approximate word length, and emoji style so the correct answer never stands out visually.
 * 2. **Strictly Numerical Digits**: All numbers in questions and answers use numerical digits
 *    (`1, 2, 3, 4, 8, 10, 100` — never spelled out as words).
 * 3. **Commander Pool (`COMMANDER_QUESTIONS`)**: 160 distinct 4-option trivia questions across
 *    Space/Sci-Fi, World Geography, Movies/Music/Pop Culture, Culinary/Drinks, History/Engineering,
 *    Sports/Olympics, and Nature/Oceans.
 * 4. **2-Option Kid Pool (`KID_QUESTIONS`)**: 36 distinct 2-option questions (`kid_01`..`kid_36`)
 *    for Wyatt (age 4) and Emma (age 3) with synchronized Emily E. TTS audio metadata (`_q`, `_a`, `_b`).
 * 5. **Persistent Non-Repeating Deck Manager (`localStorage`)**: Tracks seen question IDs in
 *    `'starship_seen_commander_q_v2'` and `'starship_seen_kid_q_v2'` and Fisher-Yates shuffles both
 *    the unseen question deck and the option order on every draw.
 */

export type QuestionTierType = 'ADULT' | 'WYATT_4YO' | 'EMMA_3YO';

export interface CommanderQuestionSpec {
  id: string;
  category: string;
  prompt: string;
  /** Stored canonically as `[correctOption, wrong1, wrong2, wrong3]`; shuffled on draw! */
  options: [string, string, string, string];
}

export interface KidQuestionSpec {
  id: string;
  category: string;
  questionText: string;
  /** Canonical correct option (with leading emoji) — corresponds to `kid_XX_a.mp3` */
  optionA: string;
  /** Canonical wrong option (with leading emoji) — corresponds to `kid_XX_b.mp3` */
  optionB: string;
  /** Clean spoken question text for `kid_XX_q.mp3` */
  ttsQuestion: string;
  /** Clean spoken text for Option A (`kid_XX_a.mp3`, no emoji) */
  ttsOptionA: string;
  /** Clean spoken text for Option B (`kid_XX_b.mp3`, no emoji) */
  ttsOptionB: string;
}

export interface ActiveTriviaQuestion {
  id: string;
  tier: QuestionTierType;
  category: string;
  prompt: string;
  /** 2 shuffled options for Kids (`[Left, Right]`), or 4 shuffled options for Commanders */
  options: string[];
  correctIndex: number;
  isKidQuestion: boolean;
  questionAudioUrl?: string;
  optionAudioUrls?: [string, string];
}

const SEEN_COMMANDER_STORAGE_KEY = 'starship_seen_commander_q_v2';
const SEEN_KID_STORAGE_KEY = 'starship_seen_kid_q_v2';

// ============================================================================
// 36 CURATED 2-OPTION KID QUESTIONS (`kid_01` .. `kid_36`)
// ============================================================================

export const KID_QUESTIONS: KidQuestionSpec[] = [
  // --- KINDNESS, EMPATHY & RIGHT VS. WRONG (MORAL SCENARIOS) ---
  {
    id: 'kid_01',
    category: 'Kindness & Empathy',
    questionText: 'If your friend drops their ice cream cone and starts crying, what is the kind thing to do?',
    optionA: '🍦 Share a bite of yours',
    optionB: '😂 Point and laugh at them',
    ttsQuestion: 'If your friend drops their ice cream cone and starts crying, what is the kind thing to do?',
    ttsOptionA: 'Share a bite of yours.',
    ttsOptionB: 'Point and laugh at them.'
  },
  {
    id: 'kid_02',
    category: 'Kindness & Empathy',
    questionText: "If you accidentally knock over your sister's block tower, what should you do?",
    optionA: '🤝 Say sorry and help rebuild',
    optionB: '🏃 Run away and hide fast',
    ttsQuestion: "If you accidentally knock over your sister's block tower, what should you do?",
    ttsOptionA: 'Say sorry and help rebuild.',
    ttsOptionB: 'Run away and hide fast.'
  },
  {
    id: 'kid_03',
    category: 'Kindness & Empathy',
    questionText: 'When 2 kids both want to play with the same toy truck, what is the best choice?',
    optionA: '⏱️ Take turns sharing it',
    optionB: '😠 Grab it away and yell',
    ttsQuestion: 'When 2 kids both want to play with the same toy truck, what is the best choice?',
    ttsOptionA: 'Take turns sharing it.',
    ttsOptionB: 'Grab it away and yell.'
  },
  {
    id: 'kid_04',
    category: 'Kindness & Empathy',
    questionText: 'If you see a new kid sitting all alone at the playground, what is a friendly thing to do?',
    optionA: '👋 Wave and ask to play',
    optionB: '🙈 Ignore them completely',
    ttsQuestion: 'If you see a new kid sitting all alone at the playground, what is a friendly thing to do?',
    ttsOptionA: 'Wave and ask to play.',
    ttsOptionB: 'Ignore them completely.'
  },
  {
    id: 'kid_05',
    category: 'Kindness & Empathy',
    questionText: 'When someone gives you a birthday present, what are the magic words to say?',
    optionA: '💝 Thank you so much',
    optionB: '🎁 Give me another one',
    ttsQuestion: 'When someone gives you a birthday present, what are the magic words to say?',
    ttsOptionA: 'Thank you so much.',
    ttsOptionB: 'Give me another one.'
  },
  {
    id: 'kid_06',
    category: 'Kindness & Empathy',
    questionText: 'When you finish playing with your crayons and puzzles, what should you do next?',
    optionA: '🧺 Put them in the toy bin',
    optionB: '🦶 Leave them on the floor',
    ttsQuestion: 'When you finish playing with your crayons and puzzles, what should you do next?',
    ttsOptionA: 'Put them in the toy bin.',
    ttsOptionB: 'Leave them on the floor.'
  },
  {
    id: 'kid_07',
    category: 'Kindness & Empathy',
    questionText: 'If your puppy or kitty is sleeping peacefully on their bed, how should you treat them?',
    optionA: '🐾 Let them rest gently',
    optionB: '📢 Pull their tail and shout',
    ttsQuestion: 'If your puppy or kitty is sleeping peacefully on their bed, how should you treat them?',
    ttsOptionA: 'Let them rest gently.',
    ttsOptionB: 'Pull their tail and shout.'
  },
  {
    id: 'kid_08',
    category: 'Kindness & Empathy',
    questionText: 'When Mom or Dad is Carrying heavy grocery bags to the door, how can you be a helper?',
    optionA: '🚪 Hold the door open wide',
    optionB: '🛑 Block the doorway and jump',
    ttsQuestion: 'When Mom or Dad is carrying heavy grocery bags to the door, how can you be a helper?',
    ttsOptionA: 'Hold the door open wide.',
    ttsOptionB: 'Block the doorway and jump.'
  },
  {
    id: 'kid_09',
    category: 'Kindness & Empathy',
    questionText: 'If a friend falls down on the grass and scrapes their knee, what should you do?',
    optionA: '🩹 Check on them and get help',
    optionB: '😜 Keep running and tease them',
    ttsQuestion: 'If a friend falls down on the grass and scrapes their knee, what should you do?',
    ttsOptionA: 'Check on them and get help.',
    ttsOptionB: 'Keep running and tease them.'
  },
  {
    id: 'kid_10',
    category: 'Kindness & Empathy',
    questionText: 'When you want a yummy cookie from the kitchen counter, how do you ask politely?',
    optionA: '🍪 May I please have 1 cookie?',
    optionB: '😤 Give me a cookie right now!',
    ttsQuestion: 'When you want a yummy cookie from the kitchen counter, how do you ask politely?',
    ttsOptionA: 'May I please have 1 cookie?',
    ttsOptionB: 'Give me a cookie right now!'
  },

  // --- SAFETY & EVERYDAY SMART HABITS ---
  {
    id: 'kid_11',
    category: 'Safety & Smart Habits',
    questionText: 'Before you cross a busy street with cars, what should you always do first?',
    optionA: "👀 Hold a grown-up's hand",
    optionB: '🏃 Run across without looking',
    ttsQuestion: 'Before you cross a busy street with cars, what should you always do first?',
    ttsOptionA: "Hold a grown-up's hand.",
    ttsOptionB: 'Run across without looking.'
  },
  {
    id: 'kid_12',
    category: 'Safety & Smart Habits',
    questionText: 'When you ride your bicycle or scooter outside, what keeps your head safe?',
    optionA: '🪖 A buckled bike helmet',
    optionB: '🎩 A floppy party hat',
    ttsQuestion: 'When you ride your bicycle or scooter outside, what keeps your head safe?',
    ttsOptionA: 'A buckled bike helmet.',
    ttsOptionB: 'A floppy party hat.'
  },
  {
    id: 'kid_13',
    category: 'Safety & Smart Habits',
    questionText: "If you find something on the counter and don't know what it is, what should you do?",
    optionA: '🗣️ Ask Mom or Dad first',
    optionB: '👄 Put it in your mouth',
    ttsQuestion: "If you find something on the counter and don't know what it is, what should you do?",
    ttsOptionA: 'Ask Mom or Dad first.',
    ttsOptionB: 'Put it in your mouth.'
  },
  {
    id: 'kid_14',
    category: 'Safety & Smart Habits',
    questionText: 'Every night before you climb into bed to go to sleep, how do you keep your teeth shiny?',
    optionA: '🪥 Brush your teeth for 2 minutes',
    optionB: '🍬 Eat 5 sticky gummy candies',
    ttsQuestion: 'Every night before you climb into bed to go to sleep, how do you keep your teeth shiny?',
    ttsOptionA: 'Brush your teeth for 2 minutes.',
    ttsOptionB: 'Eat 5 sticky gummy candies.'
  },
  {
    id: 'kid_15',
    category: 'Safety & Smart Habits',
    questionText: 'When you ride in the family car, what keeps you safe in your car seat?',
    optionA: '🔒 Keep your seat belt buckled',
    optionB: '🔓 Unbuckle and climb around',
    ttsQuestion: 'When you ride in the family car, what keeps you safe in your car seat?',
    ttsOptionA: 'Keep your seat belt buckled.',
    ttsOptionB: 'Unbuckle and climb around.'
  },
  {
    id: 'kid_16',
    category: 'Safety & Smart Habits',
    questionText: 'After you use the bathroom or play in the mud outside, what should you do with your hands?',
    optionA: '🧼 Wash with soap and water',
    optionB: '🛋️ Wipe them on the couch',
    ttsQuestion: 'After you use the bathroom or play in the mud outside, what should you do with your hands?',
    ttsOptionA: 'Wash with soap and water.',
    ttsOptionB: 'Wipe them on the couch.'
  },
  {
    id: 'kid_17',
    category: 'Safety & Smart Habits',
    questionText: 'If you see a hot stove or oven in the kitchen, what is the safe rule to follow?',
    optionA: '✋ Stay back and do not touch',
    optionB: '🔥 Reach up and grab the pan',
    ttsQuestion: 'If you see a hot stove or oven in the kitchen, what is the safe rule to follow?',
    ttsOptionA: 'Stay back and do not touch.',
    ttsOptionB: 'Reach up and grab the pan.'
  },

  // --- FEELINGS & EMOTIONAL INTELLIGENCE ---
  {
    id: 'kid_18',
    category: 'Feelings & Calm Body',
    questionText: 'When you feel super frustrated or angry, what is a healthy way to calm your body down?',
    optionA: '🌬️ Take 3 deep belly breaths',
    optionB: '🧱 Throw your toys at the wall',
    ttsQuestion: 'When you feel super frustrated or angry, what is a healthy way to calm your body down?',
    ttsOptionA: 'Take 3 deep belly breaths.',
    ttsOptionB: 'Throw your toys at the wall.'
  },
  {
    id: 'kid_19',
    category: 'Feelings & Calm Body',
    questionText: 'If you feel scared during a loud thunderstorm at night, what is a good thing to do?',
    optionA: '🤗 Ask for a big cozy hug',
    optionB: '🚪 Run outside in the rain',
    ttsQuestion: 'If you feel scared during a loud thunderstorm at night, what is a good thing to do?',
    ttsOptionA: 'Ask for a big cozy hug.',
    ttsOptionB: 'Run outside in the rain.'
  },
  {
    id: 'kid_20',
    category: 'Feelings & Calm Body',
    questionText: 'When a puzzle is tricky and a piece does not fit right away, what should you try?',
    optionA: '🧩 Turn the piece and try again',
    optionB: '😡 Smash the puzzle on the floor',
    ttsQuestion: 'When a puzzle is tricky and a piece does not fit right away, what should you try?',
    ttsOptionA: 'Turn the piece and try again.',
    ttsOptionB: 'Smash the puzzle on the floor.'
  },
  {
    id: 'kid_21',
    category: 'Feelings & Calm Body',
    questionText: 'When someone is reading a bedtime story to you, what is the best way to listen?',
    optionA: '👂 Use quiet ears and look',
    optionB: '🥁 Bang on a loud drum set',
    ttsQuestion: 'When someone is reading a bedtime story to you, what is the best way to listen?',
    ttsOptionA: 'Use quiet ears and look.',
    ttsOptionB: 'Bang on a loud drum set.'
  },

  // --- CLEVER LOGIC, SPACE, ANIMALS & NUMERICAL COUNTING (DIGITS 1–10 ONLY) ---
  {
    id: 'kid_22',
    category: 'Space, Animals & Counting',
    questionText: 'How many wheels does a regular bicycle have?',
    optionA: '🚲 2 round wheels',
    optionB: '🚲 9 round wheels',
    ttsQuestion: 'How many wheels does a regular bicycle have?',
    ttsOptionA: '2 round wheels.',
    ttsOptionB: '9 round wheels.'
  },
  {
    id: 'kid_23',
    category: 'Space, Animals & Counting',
    questionText: 'How many wiggly arms does an ocean octopus have?',
    optionA: '🐙 8 wiggly arms',
    optionB: '🐙 2 wiggly arms',
    ttsQuestion: 'How many wiggly arms does an ocean octopus have?',
    ttsOptionA: '8 wiggly arms.',
    ttsOptionB: '2 wiggly arms.'
  },
  {
    id: 'kid_24',
    category: 'Space, Animals & Counting',
    questionText: 'Which thing flies high up in outer space among the twinkling stars?',
    optionA: '🚀 A shiny rocket ship',
    optionB: '🚜 A muddy farm tractor',
    ttsQuestion: 'Which thing flies high up in outer space among the twinkling stars?',
    ttsOptionA: 'A shiny rocket ship.',
    ttsOptionB: 'A muddy farm tractor.'
  },
  {
    id: 'kid_25',
    category: 'Space, Animals & Counting',
    questionText: 'How many fingers do you have on 1 hand?',
    optionA: '🖐️ 5 wiggly fingers',
    optionB: '🖐️ 10 wiggly fingers',
    ttsQuestion: 'How many fingers do you have on 1 hand?',
    ttsOptionA: '5 wiggly fingers.',
    ttsOptionB: '10 wiggly fingers.'
  },
  {
    id: 'kid_26',
    category: 'Space, Animals & Counting',
    questionText: 'How many magical horns does a fairytale unicorn have on its forehead?',
    optionA: '🦄 1 sparkly horn',
    optionB: '🦄 6 sparkly horns',
    ttsQuestion: 'How many magical horns does a fairytale unicorn have on its forehead?',
    ttsOptionA: '1 sparkly horn.',
    ttsOptionB: '6 sparkly horns.'
  },
  {
    id: 'kid_27',
    category: 'Space, Animals & Counting',
    questionText: 'How many legs does a friendly golden puppy dog walk on?',
    optionA: '🐶 4 furry legs',
    optionB: '🐶 8 furry legs',
    ttsQuestion: 'How many legs does a friendly golden puppy dog walk on?',
    ttsOptionA: '4 furry legs.',
    ttsOptionB: '8 furry legs.'
  },
  {
    id: 'kid_28',
    category: 'Space, Animals & Counting',
    questionText: 'How many sides and corners does a triangle shape have?',
    optionA: '🔺 3 pointed corners',
    optionB: '🔺 7 pointed corners',
    ttsQuestion: 'How many sides and corners does a triangle shape have?',
    ttsOptionA: '3 pointed corners.',
    ttsOptionB: '7 pointed corners.'
  },
  {
    id: 'kid_29',
    category: 'Space, Animals & Counting',
    questionText: 'If you have 2 red apples and Mom gives you 1 more apple, how many apples do you have?',
    optionA: '🍎 3 crunchy apples',
    optionB: '🍎 8 crunchy apples',
    ttsQuestion: 'If you have 2 red apples and Mom gives you 1 more apple, how many apples do you have?',
    ttsOptionA: '3 crunchy apples.',
    ttsOptionB: '8 crunchy apples.'
  },
  {
    id: 'kid_30',
    category: 'Space, Animals & Counting',
    questionText: 'What does an astronaut wear in outer space to breathe and stay safe?',
    optionA: '🧑‍🚀 A space suit and helmet',
    optionB: '🩳 Swim trunks and flip-flops',
    ttsQuestion: 'What does an astronaut wear in outer space to breathe and stay safe?',
    ttsOptionA: 'A space suit and helmet.',
    ttsOptionB: 'Swim trunks and flip-flops.'
  },
  {
    id: 'kid_31',
    category: 'Space, Animals & Counting',
    questionText: 'Which animal builds a sticky web to catch bugs and has 8 legs?',
    optionA: '🕷️ A little climbing spider',
    optionB: '🐧 A waddling ice penguin',
    ttsQuestion: 'Which animal builds a sticky web to catch bugs and has 8 legs?',
    ttsOptionA: 'A little climbing spider.',
    ttsOptionB: 'A waddling ice penguin.'
  },
  {
    id: 'kid_32',
    category: 'Space, Animals & Counting',
    questionText: 'When it is snowing and freezing cold outside, what should you wear to stay warm?',
    optionA: '🧥 A warm winter coat and mittens',
    optionB: '🩱 A summer bathing suit',
    ttsQuestion: 'When it is snowing and freezing cold outside, what should you wear to stay warm?',
    ttsOptionA: 'A warm winter coat and mittens.',
    ttsOptionB: 'A summer bathing suit.'
  },
  {
    id: 'kid_33',
    category: 'Space, Animals & Counting',
    questionText: 'Which busy insect flies from flower to flower and makes sweet golden honey?',
    optionA: '🐝 A buzzing bumblebee',
    optionB: '🐢 A slow green turtle',
    ttsQuestion: 'Which busy insect flies from flower to flower and makes sweet golden honey?',
    ttsOptionA: 'A buzzing bumblebee.',
    ttsOptionB: 'A slow green turtle.'
  },
  {
    id: 'kid_34',
    category: 'Space, Animals & Counting',
    questionText: 'What shines bright in the daytime sky to warm the Earth and help plants grow?',
    optionA: '☀️ The bright yellow Sun',
    optionB: '⛄ A cold snowy snowman',
    ttsQuestion: 'What shines bright in the daytime sky to warm the Earth and help plants grow?',
    ttsOptionA: 'The bright yellow Sun.',
    ttsOptionB: 'A cold snowy snowman.'
  },
  {
    id: 'kid_35',
    category: 'Space, Animals & Counting',
    questionText: 'If you have 4 toy cars and you put 1 more car in the line, how many cars are there?',
    optionA: '🚗 5 racing toy cars',
    optionB: '🚗 2 racing toy cars',
    ttsQuestion: 'If you have 4 toy cars and you put 1 more car in the line, how many cars are there?',
    ttsOptionA: '5 racing toy cars.',
    ttsOptionB: '2 racing toy cars.'
  },
  {
    id: 'kid_36',
    category: 'Space, Animals & Counting',
    questionText: 'Which ocean animal is the biggest animal on Earth and spouts water from a blowhole?',
    optionA: '🐋 A giant blue whale',
    optionB: '🦀 A tiny sandy crab',
    ttsQuestion: 'Which ocean animal is the biggest animal on Earth and spouts water from a blowhole?',
    ttsOptionA: 'A giant blue whale.',
    ttsOptionB: 'A tiny sandy crab.'
  },

  // --- NUANCED "TRICKY TEMPTATION" MORAL DILEMMAS (kid_37 .. kid_44) ---
  {
    id: 'kid_37',
    category: 'Kindness & Empathy',
    questionText: 'If you find a super cool toy on the playground that does not belong to you, what should you do?',
    optionA: '🙋 Give it to a grown-up to find the owner',
    optionB: '🎒 Put it in your pocket to keep',
    ttsQuestion: 'If you find a super cool toy on the playground that does not belong to you, what should you do?',
    ttsOptionA: 'Give it to a grown-up to find the owner.',
    ttsOptionB: 'Put it in your pocket to keep.'
  },
  {
    id: 'kid_38',
    category: 'Kindness & Empathy',
    questionText: 'Mom says you may have 1 cookie and then turns around so she is not looking. What should you do?',
    optionA: '🍪 Take just 1 cookie like you promised',
    optionB: '🍪 Sneak 2 cookies really fast',
    ttsQuestion: 'Mom says you may have 1 cookie and then turns around so she is not looking. What should you do?',
    ttsOptionA: 'Take just 1 cookie like you promised.',
    ttsOptionB: 'Sneak 2 cookies really fast.'
  },
  {
    id: 'kid_39',
    category: 'Kindness & Empathy',
    questionText: 'Your little sister wants to add a block to your giant Lego tower. What is a kind brother choice?',
    optionA: '🧱 Show her a safe spot to add her block',
    optionB: '✋ Push her hand away',
    ttsQuestion: 'Your little sister wants to add a block to your giant Lego tower. What is a kind brother choice?',
    ttsOptionA: 'Show her a safe spot to add her block.',
    ttsOptionB: 'Push her hand away.'
  },
  {
    id: 'kid_40',
    category: 'Kindness & Empathy',
    questionText: 'Your friend wants to play dinosaurs, and you want to play rockets. How can you both have fun?',
    optionA: '🚀 Play dinosaurs first, then rockets next',
    optionB: "😤 Say you won't play at all",
    ttsQuestion: 'Your friend wants to play dinosaurs, and you want to play rockets. How can you both have fun?',
    ttsOptionA: 'Play dinosaurs first, then rockets next.',
    ttsOptionB: "Say you won't play at all."
  },
  {
    id: 'kid_41',
    category: 'Kindness & Empathy',
    questionText: 'If you accidentally spill your cup of water on the floor and nobody saw you, what should you do?',
    optionA: '🧻 Grab a towel and tell Mom or Dad',
    optionB: "🚶 Walk away and pretend it wasn't you",
    ttsQuestion: 'If you accidentally spill your cup of water on the floor and nobody saw you, what should you do?',
    ttsOptionA: 'Grab a towel and tell Mom or Dad.',
    ttsOptionB: "Walk away and pretend it wasn't you."
  },
  {
    id: 'kid_42',
    category: 'Kindness & Empathy',
    questionText: 'When you win a game and your friend loses and feels sad, what is a good sport thing to do?',
    optionA: '🤝 Say good game and high-five',
    optionB: '🏆 Brag that you are the best',
    ttsQuestion: 'When you win a game and your friend loses and feels sad, what is a good sport thing to do?',
    ttsOptionA: 'Say good game and high-five.',
    ttsOptionB: 'Brag that you are the best.'
  },
  {
    id: 'kid_43',
    category: 'Kindness & Empathy',
    questionText: "If you borrow a friend's crayon and it accidentally snaps and breaks, what is the honest choice?",
    optionA: '🖍️ Tell them sorry and offer yours',
    optionB: '🙈 Hide the broken pieces',
    ttsQuestion: "If you borrow a friend's crayon and it accidentally snaps and breaks, what is the honest choice?",
    ttsOptionA: 'Tell them sorry and offer yours.',
    ttsOptionB: 'Hide the broken pieces.'
  },
  {
    id: 'kid_44',
    category: 'Kindness & Empathy',
    questionText: 'When there is a long line of kids waiting to go down the big playground slide, what should you do?',
    optionA: '⏳ Wait patiently behind the next kid',
    optionB: '🏃 Squeeze past to the front',
    ttsQuestion: 'When there is a long line of kids waiting to go down the big playground slide, what should you do?',
    ttsOptionA: 'Wait patiently behind the next kid.',
    ttsOptionB: 'Squeeze past to the front.'
  },

  // --- PRESCHOOL BRAIN-TEASERS: MATH, COLOR MIXING, SINK/FLOAT & SPACE SCIENCE (kid_45 .. kid_56) ---
  {
    id: 'kid_45',
    category: 'Brain-Stretcher Math & Science',
    questionText: 'If you have 2 apples in your basket and pick 2 more apples from the tree, how many apples is 2 + 2?',
    optionA: '🍎 4 apples',
    optionB: '🍎 3 apples',
    ttsQuestion: 'If you have 2 apples in your basket and pick 2 more apples from the tree, how many apples is 2 plus 2?',
    ttsOptionA: '4 apples.',
    ttsOptionB: '3 apples.'
  },
  {
    id: 'kid_46',
    category: 'Brain-Stretcher Math & Science',
    questionText: 'You have 5 sweet strawberries on your plate and you eat 2 of them. How many strawberries are left?',
    optionA: '🍓 3 strawberries',
    optionB: '🍓 4 strawberries',
    ttsQuestion: 'You have 5 sweet strawberries on your plate and you eat 2 of them. How many strawberries are left?',
    ttsOptionA: '3 strawberries.',
    ttsOptionB: '4 strawberries.'
  },
  {
    id: 'kid_47',
    category: 'Brain-Stretcher Math & Science',
    questionText: 'If you park 3 toy cars in the garage and drive 1 more toy car inside, how many toy cars is 3 + 1?',
    optionA: '🚗 4 toy cars',
    optionB: '🚗 5 toy cars',
    ttsQuestion: 'If you park 3 toy cars in the garage and drive 1 more toy car inside, how many toy cars is 3 plus 1?',
    ttsOptionA: '4 toy cars.',
    ttsOptionB: '5 toy cars.'
  },
  {
    id: 'kid_48',
    category: 'Brain-Stretcher Math & Science',
    questionText: 'When you mix YELLOW paint and BLUE paint together with your paintbrush, what new color do they make?',
    optionA: '🟢 Green paint',
    optionB: '🟣 Purple paint',
    ttsQuestion: 'When you mix yellow paint and blue paint together with your paintbrush, what new color do they make?',
    ttsOptionA: 'Green paint.',
    ttsOptionB: 'Purple paint.'
  },
  {
    id: 'kid_49',
    category: 'Brain-Stretcher Math & Science',
    questionText: 'When you mix bright RED paint and sunny YELLOW paint together, what new color do they make?',
    optionA: '🟠 Orange paint',
    optionB: '🟢 Green paint',
    ttsQuestion: 'When you mix bright red paint and sunny yellow paint together, what new color do they make?',
    ttsOptionA: 'Orange paint.',
    ttsOptionB: 'Green paint.'
  },
  {
    id: 'kid_50',
    category: 'Brain-Stretcher Math & Science',
    questionText: 'When you mix RED paint and BLUE paint together on your art paper, what new color do they make?',
    optionA: '🟣 Purple paint',
    optionB: '🟡 Yellow paint',
    ttsQuestion: 'When you mix red paint and blue paint together on your art paper, what new color do they make?',
    ttsOptionA: 'Purple paint.',
    ttsOptionB: 'Yellow paint.'
  },
  {
    id: 'kid_51',
    category: 'Brain-Stretcher Math & Science',
    questionText: 'Which of these objects SINKS straight down to the bottom of a bathtub full of water?',
    optionA: '🥄 A heavy metal spoon',
    optionB: '🦆 A hollow plastic duck',
    ttsQuestion: 'Which of these objects sinks straight down to the bottom of a bathtub full of water?',
    ttsOptionA: 'A heavy metal spoon.',
    ttsOptionB: 'A hollow plastic duck.'
  },
  {
    id: 'kid_52',
    category: 'Brain-Stretcher Math & Science',
    questionText: 'Which of these objects FLOATS right on top of the water in a pond or bathtub?',
    optionA: '🚤 A wooden toy boat',
    optionB: '🪨 A heavy gray rock',
    ttsQuestion: 'Which of these objects floats right on top of the water in a pond or bathtub?',
    ttsOptionA: 'A wooden toy boat.',
    ttsOptionB: 'A heavy gray rock.'
  },
  {
    id: 'kid_53',
    category: 'Brain-Stretcher Math & Science',
    questionText: 'Why does a cold frozen ice cube melt and turn into water when you leave it outside in the sun?',
    optionA: '☀️ The warm sun heats it up',
    optionB: '🌬️ The wind blows it away',
    ttsQuestion: 'Why does a cold frozen ice cube melt and turn into water when you leave it outside in the sun?',
    ttsOptionA: 'The warm sun heats it up.',
    ttsOptionB: 'The wind blows it away.'
  },
  {
    id: 'kid_54',
    category: 'Brain-Stretcher Math & Science',
    questionText: 'Which of these baby animals hatches out of a hard-shelled egg?',
    optionA: '🐢 A sea turtle',
    optionB: '🐕 A golden puppy',
    ttsQuestion: 'Which of these baby animals hatches out of a hard-shelled egg?',
    ttsOptionA: 'A sea turtle.',
    ttsOptionB: 'A golden puppy.'
  },
  {
    id: 'kid_55',
    category: 'Brain-Stretcher Math & Science',
    questionText: 'Which giant planet in our solar system is famous for having bright icy rings all around it?',
    optionA: '🪐 Saturn',
    optionB: '🔴 Mars',
    ttsQuestion: 'Which giant planet in our solar system is famous for having bright icy rings all around it?',
    ttsOptionA: 'Saturn.',
    ttsOptionB: 'Mars.'
  },
  {
    id: 'kid_56',
    category: 'Brain-Stretcher Math & Science',
    questionText: 'What invisible force pulls a ball back down to the ground when you throw it up in the air?',
    optionA: "🌍 Earth's gravity pulling down",
    optionB: '☁️ The clouds pushing it down',
    ttsQuestion: 'What invisible force pulls a ball back down to the ground when you throw it up in the air?',
    ttsOptionA: "Earth's gravity pulling down.",
    ttsOptionB: 'The clouds pushing it down.'
  }
];

// ============================================================================
// 160 COMMANDER (ADULT) 4-OPTION TRIVIA QUESTIONS (`cmd_001` .. `cmd_160`)
// Note: `options[0]` is the canonical correct answer; options are Fisher-Yates
// shuffled on every draw so the correct index (`0..3`) is 100% random!
// ============================================================================

export const COMMANDER_QUESTIONS: CommanderQuestionSpec[] = [
  // --- 1. SPACE, ASTRONOMY & SCI-FI (cmd_001 .. cmd_028) ---
  {
    id: 'cmd_001',
    category: 'Space & Sci-Fi',
    prompt: 'What are the giant mechanical catching arms on the SpaceX Starbase launch tower nicknamed?',
    options: ['Mechazilla Chopsticks', 'Star Catcher Gantry', 'Titan Claw Grappling', 'Raptor Sky Hook']
  },
  {
    id: 'cmd_002',
    category: 'Space & Sci-Fi',
    prompt: 'In Star Trek: The Next Generation, what is the hull registry number of Captain Picard’s USS Enterprise-D?',
    options: ['NCC-1701-D', 'NCC-74656-D', 'NX-2000-D', 'NCC-1864-D']
  },
  {
    id: 'cmd_003',
    category: 'Space & Sci-Fi',
    prompt: 'Which planet in our solar system rotates on its side with an axial tilt of approximately 98 degrees?',
    options: ['Uranus', 'Neptune', 'Saturn', 'Jupiter']
  },
  {
    id: 'cmd_004',
    category: 'Space & Sci-Fi',
    prompt: 'What propellant combination powers SpaceX’s full-flow staged-combustion Raptor engines on Starship?',
    options: ['Liquid Methane & Liquid Oxygen', 'RP-1 Kerosene & Liquid Oxygen', 'Liquid Hydrogen & Liquid Oxygen', 'Hydrazine & Nitrogen Tetroxide']
  },
  {
    id: 'cmd_005',
    category: 'Space & Sci-Fi',
    prompt: 'Which moon of Saturn features a thick golden nitrogen atmosphere and liquid hydrocarbon lakes on its surface?',
    options: ['Titan', 'Enceladus', 'Mimas', 'Iapetus']
  },
  {
    id: 'cmd_006',
    category: 'Space & Sci-Fi',
    prompt: 'At which Lagrange point, roughly 1.5 million km from Earth, does the James Webb Space Telescope orbit?',
    options: ['Sun-Earth L2 Point', 'Sun-Earth L1 Point', 'Earth-Moon L4 Point', 'Sun-Earth L3 Point']
  },
  {
    id: 'cmd_007',
    category: 'Space & Sci-Fi',
    prompt: 'In Star Trek lore, what fictional faster-than-light crystal regulates the matter-antimatter reaction in a warp core?',
    options: ['Dilithium Crystal', 'Kyber Crystal', 'Tiberium Crystal', 'Naquadah Crystal']
  },
  {
    id: 'cmd_008',
    category: 'Space & Sci-Fi',
    prompt: 'What is the name of the tallest known volcano and mountain in our solar system, located on Mars?',
    options: ['Olympus Mons', 'Ascraeus Mons', 'Maxwell Montes', 'Pavonis Mons']
  },
  {
    id: 'cmd_009',
    category: 'Space & Sci-Fi',
    prompt: 'Approximately how many minutes does it take sunlight to travel 1 AU from the Sun to Earth?',
    options: ['8 minutes 20 seconds', '4 minutes 10 seconds', '14 minutes 30 seconds', '22 minutes 15 seconds']
  },
  {
    id: 'cmd_010',
    category: 'Space & Sci-Fi',
    prompt: 'In Star Wars, what is the model designation of Han Solo’s modified Corellian light freighter, the Millennium Falcon?',
    options: ['YT-1300 Freighter', 'YT-2400 Freighter', 'VCX-100 Freighter', 'GZ-600 Freighter']
  },
  {
    id: 'cmd_011',
    category: 'Space & Sci-Fi',
    prompt: 'Who was the Command Module Pilot on Apollo 11 who orbited the Moon solo while Armstrong and Aldrin walked on the surface?',
    options: ['Michael Collins', 'Jim Lovell', 'Ken Mattingly', 'Fred Haise']
  },
  {
    id: 'cmd_012',
    category: 'Space & Sci-Fi',
    prompt: 'Which spacecraft, launched in 1977, became the 1st human-made object to enter interstellar space in 2012?',
    options: ['Voyager 1', 'Pioneer 10', 'New Horizons', 'Cassini-Huygens']
  },
  {
    id: 'cmd_013',
    category: 'Space & Sci-Fi',
    prompt: 'In the 2014 film Interstellar, what is the name of the supermassive black hole orbited by Miller’s water world?',
    options: ['Gargantua', 'Leviathan', 'Cygnus X-1', 'Tesseract']
  },
  {
    id: 'cmd_014',
    category: 'Space & Sci-Fi',
    prompt: 'What is the closest star system to our Sun, located roughly 4.24 light-years away?',
    options: ['Alpha Centauri (Proxima)', 'Barnard’s Star System', 'Sirius Binary System', 'Tau Ceti System']
  },
  {
    id: 'cmd_015',
    category: 'Space & Sci-Fi',
    prompt: 'In Star Trek, what does the acronym LCARS stand for on Starfleet bridge computer displays?',
    options: ['Library Computer Access & Retrieval System', 'Light-speed Command & Automated Relay System', 'Logistics Control & Astrometrics Radar Suite', 'Linear Core Auxiliary Reactor Subroutines']
  },
  {
    id: 'cmd_016',
    category: 'Space & Sci-Fi',
    prompt: 'Which Galilean moon of Jupiter is the most volcanically active body in the solar system due to tidal heating?',
    options: ['Io', 'Europa', 'Ganymede', 'Callisto']
  },
  {
    id: 'cmd_017',
    category: 'Space & Sci-Fi',
    prompt: 'What was the name of the NASA helicopter that achieved the 1st powered, controlled flight on Mars in 2021?',
    options: ['Ingenuity', 'Perseverance', 'Sojourner', 'Dragonfly']
  },
  {
    id: 'cmd_018',
    category: 'Space & Sci-Fi',
    prompt: 'In Frank Herbert’s Dune, what is the native Fremen name for the giant sandworms of Arrakis?',
    options: ['Shai-Hulud', 'Muad’Dib', 'Kwisatz Haderach', 'Gom Jabbar']
  },
  {
    id: 'cmd_019',
    category: 'Space & Sci-Fi',
    prompt: 'What boundary around a black hole marks the point of no return where escape velocity exceeds the speed of light?',
    options: ['Event Horizon', 'Roche Limit', 'Kármán Line', 'Kuiper Belt']
  },
  {
    id: 'cmd_020',
    category: 'Space & Sci-Fi',
    prompt: 'At what altitude above sea level is the internationally recognized Kármán line marking the boundary of space?',
    options: ['100 kilometers (62 miles)', '50 kilometers (31 miles)', '250 kilometers (155 miles)', '400 kilometers (248 miles)']
  },
  {
    id: 'cmd_021',
    category: 'Space & Sci-Fi',
    prompt: 'In The Expanse, what salvaged Martian corvette-class light frigate serves as James Holden’s crew ship?',
    options: ['Rocinante', 'Canterbury', 'Donnager', 'Nauvoo']
  },
  {
    id: 'cmd_022',
    category: 'Space & Sci-Fi',
    prompt: 'Which planet in our solar system has the hottest surface temperature (around 465°C) due to a runaway greenhouse effect?',
    options: ['Venus', 'Mercury', 'Mars', 'Jupiter']
  },
  {
    id: 'cmd_023',
    category: 'Space & Sci-Fi',
    prompt: 'In Ridley Scott’s 1979 film Alien, what is the name of the commercial towing starship crewed by Ellen Ripley?',
    options: ['USCSS Nostromo', 'USS Sulaco', 'USCSS Prometheus', 'USG Ishimura']
  },
  {
    id: 'cmd_024',
    category: 'Space & Sci-Fi',
    prompt: 'How many Raptor engines are mounted on the bottom of SpaceX’s Super Heavy booster stage?',
    options: ['33 Raptor Engines', '9 Merlin Engines', '27 Merlin Engines', '50 Raptor Engines']
  },
  {
    id: 'cmd_025',
    category: 'Space & Sci-Fi',
    prompt: 'Which dwarf planet is the largest object in the main asteroid belt between Mars and Jupiter?',
    options: ['Ceres', 'Pluto', 'Eris', 'Haumea']
  },
  {
    id: 'cmd_026',
    category: 'Space & Sci-Fi',
    prompt: 'In Star Trek II: The Wrath of Khan, what is the name of the no-win Starfleet Academy command simulation?',
    options: ['Kobayashi Maru', 'Corbomite Maneuver', 'Picard Maneuver', 'Pegasus Protocol']
  },
  {
    id: 'cmd_027',
    category: 'Space & Sci-Fi',
    prompt: 'Which constellation contains the famous stellar nursery inside the "Belt" and "Sword" near Betelgeuse and Rigel?',
    options: ['Orion', 'Cassiopeia', 'Andromeda', 'Scorpius']
  },
  {
    id: 'cmd_028',
    category: 'Space & Sci-Fi',
    prompt: 'What did NASA’s DART mission successfully impact in September 2022 to test planetary asteroid defense?',
    options: ['Dimorphos', 'Bennu', 'Apophis', 'Ryugu']
  },

  // --- 2. WORLD GEOGRAPHY, LANDMARKS & CAPITALS (cmd_029 .. cmd_052) ---
  {
    id: 'cmd_029',
    category: 'World Geography',
    prompt: 'What is the capital city of Australia, purposefully built between Sydney and Melbourne?',
    options: ['Canberra', 'Sydney', 'Melbourne', 'Brisbane']
  },
  {
    id: 'cmd_030',
    category: 'World Geography',
    prompt: 'Which South American country is home to the ancient Incan citadel of Machu Picchu in the Andes?',
    options: ['Peru', 'Chile', 'Bolivia', 'Colombia']
  },
  {
    id: 'cmd_031',
    category: 'World Geography',
    prompt: 'Which narrow strait separates Europe from Africa at the western entrance to the Mediterranean Sea?',
    options: ['Strait of Gibraltar', 'Strait of Hormuz', 'Strait of Malacca', 'Bering Strait']
  },
  {
    id: 'cmd_032',
    category: 'World Geography',
    prompt: 'What is the longest continental mountain range on Earth, stretching roughly 7,000 km along South America?',
    options: ['The Andes', 'The Himalayas', 'The Rocky Mountains', 'The European Alps']
  },
  {
    id: 'cmd_033',
    category: 'World Geography',
    prompt: 'Which European capital city is divided into "Buda" and "Pest" by the Danube River?',
    options: ['Budapest', 'Vienna', 'Bratislava', 'Belgrade']
  },
  {
    id: 'cmd_034',
    category: 'World Geography',
    prompt: 'In which country would you find the ancient rose-red rock-carved city of Petra?',
    options: ['Jordan', 'Egypt', 'Morocco', 'Oman']
  },
  {
    id: 'cmd_035',
    category: 'World Geography',
    prompt: 'Which African country has 3 official capital cities: Pretoria, Cape Town, and Bloemfontein?',
    options: ['South Africa', 'Nigeria', 'Kenya', 'Tanzania']
  },
  {
    id: 'cmd_036',
    category: 'World Geography',
    prompt: 'What is the deepest freshwater lake in the world, located in southern Siberia, Russia?',
    options: ['Lake Baikal', 'Lake Tanganyika', 'Lake Superior', 'Lake Victoria']
  },
  {
    id: 'cmd_037',
    category: 'World Geography',
    prompt: 'Which U.S. state has the longest total coastline, measuring over 6,600 miles along the Pacific and Arctic?',
    options: ['Alaska', 'Florida', 'California', 'Hawaii']
  },
  {
    id: 'cmd_038',
    category: 'World Geography',
    prompt: 'Which island nation in the North Atlantic sits directly on the Mid-Atlantic Ridge between 2 tectonic plates?',
    options: ['Iceland', 'Ireland', 'Madagascar', 'Sri Lanka']
  },
  {
    id: 'cmd_039',
    category: 'World Geography',
    prompt: 'What is the capital city of Canada, located in the province of Ontario across from Gatineau?',
    options: ['Ottawa', 'Toronto', 'Montreal', 'Vancouver']
  },
  {
    id: 'cmd_040',
    category: 'World Geography',
    prompt: 'Which desert in northern Chile is considered the driest non-polar desert on Earth?',
    options: ['Atacama Desert', 'Mojave Desert', 'Gobi Desert', 'Kalahari Desert']
  },
  {
    id: 'cmd_041',
    category: 'World Geography',
    prompt: 'Which famous canal connects the Mediterranean Sea directly to the Red Sea across Egypt?',
    options: ['Suez Canal', 'Panama Canal', 'Kiel Canal', 'Corinth Canal']
  },
  {
    id: 'cmd_042',
    category: 'World Geography',
    prompt: 'On which Japanese island are the cities of Tokyo, Yokohama, Kyoto, and Osaka all located?',
    options: ['Honshu', 'Hokkaido', 'Kyushu', 'Shikoku']
  },
  {
    id: 'cmd_043',
    category: 'World Geography',
    prompt: 'Which river flows through the Grand Canyon in Arizona on its way toward the Gulf of California?',
    options: ['Colorado River', 'Rio Grande River', 'Columbia River', 'Snake River']
  },
  {
    id: 'cmd_044',
    category: 'World Geography',
    prompt: 'Which country has the largest number of natural lakes in the world, containing over 60% of Earth’s lakes?',
    options: ['Canada', 'Finland', 'Sweden', 'Brazil']
  },
  {
    id: 'cmd_045',
    category: 'World Geography',
    prompt: 'What is the highest mountain peak in North America, rising to 20,310 feet in Alaska?',
    options: ['Denali', 'Mount Logan', 'Mount Rainier', 'Mount Whitney']
  },
  {
    id: 'cmd_046',
    category: 'World Geography',
    prompt: 'Which sovereign city-state is completely surrounded by the city of Rome, Italy?',
    options: ['Vatican City', 'San Marino', 'Monaco', 'Andorra']
  },
  {
    id: 'cmd_047',
    category: 'World Geography',
    prompt: 'What is the capital city of Turkey, located in the central Anatolian plateau?',
    options: ['Ankara', 'Istanbul', 'Izmir', 'Antalya']
  },
  {
    id: 'cmd_048',
    category: 'World Geography',
    prompt: 'Which magnificent waterfall lies on the border between Zambia and Zimbabwe along the Zambezi River?',
    options: ['Victoria Falls', 'Angel Falls', 'Iguazu Falls', 'Niagara Falls']
  },
  {
    id: 'cmd_049',
    category: 'World Geography',
    prompt: 'Which sea without any oceanic outlets borders Jordan, Israel, and the West Bank at 430 meters below sea level?',
    options: ['Dead Sea', 'Red Sea', 'Black Sea', 'Adriatic Sea']
  },
  {
    id: 'cmd_050',
    category: 'World Geography',
    prompt: 'In which country is the massive temple complex of Angkor Wat depicted on the national flag?',
    options: ['Cambodia', 'Thailand', 'Vietnam', 'Laos']
  },
  {
    id: 'cmd_051',
    category: 'World Geography',
    prompt: 'Which European country is divided into 26 administrative cantons and uses 4 national languages?',
    options: ['Switzerland', 'Belgium', 'Austria', 'Luxembourg']
  },
  {
    id: 'cmd_052',
    category: 'World Geography',
    prompt: 'What is the southernmost capital city in the world, located at the tip of New Zealand’s North Island?',
    options: ['Wellington', 'Auckland', 'Christchurch', 'Queenstown']
  },

  // --- 3. MOVIES, TV, MUSIC & POP CULTURE (cmd_053 .. cmd_080) ---
  {
    id: 'cmd_053',
    category: 'Movies & Pop Culture',
    prompt: 'In Back to the Future (1985), what speed must Doc Brown’s DeLorean reach to activate the flux capacitor?',
    options: ['88 miles per hour', '77 miles per hour', '99 miles per hour', '120 miles per hour']
  },
  {
    id: 'cmd_054',
    category: 'Movies & Pop Culture',
    prompt: 'How many gigawatts of electrical power are required to send the DeLorean time machine through time?',
    options: ['1.21 gigawatts', '2.45 gigawatts', '5.00 gigawatts', '9.81 gigawatts']
  },
  {
    id: 'cmd_055',
    category: 'Movies & Pop Culture',
    prompt: 'In Jurassic Park (1993), what fossilized tree resin traps the mosquito containing dinosaur DNA?',
    options: ['Prehistoric Amber', 'Volcanic Obsidian', 'Crystalline Quartz', 'Petriite Opal']
  },
  {
    id: 'cmd_056',
    category: 'Movies & Pop Culture',
    prompt: 'Which 1994 movie features Tim Robbins as banker Andy Dufresne and Morgan Freeman as Ellis "Red" Redding?',
    options: ['The Shawshank Redemption', 'The Green Mile', 'Pulp Fiction', 'Forrest Gump']
  },
  {
    id: 'cmd_057',
    category: 'Movies & Pop Culture',
    prompt: 'Who composed the iconic film scores for Star Wars, Jaws, Indiana Jones, and Jurassic Park?',
    options: ['John Williams', 'Hans Zimmer', 'Danny Elfman', 'Alan Silvestri']
  },
  {
    id: 'cmd_058',
    category: 'Movies & Pop Culture',
    prompt: 'In The Matrix (1999), what color pill does Neo take from Morpheus to wake up in the real world?',
    options: ['The Red Pill', 'The Blue Pill', 'The Gold Pill', 'The Green Pill']
  },
  {
    id: 'cmd_059',
    category: 'Movies & Pop Culture',
    prompt: 'Which rock band recorded the 1975 6-minute epic "Bohemian Rhapsody" on their album A Night at the Opera?',
    options: ['Queen', 'Led Zeppelin', 'Pink Floyd', 'Fleetwood Mac']
  },
  {
    id: 'cmd_060',
    category: 'Movies & Pop Culture',
    prompt: 'In Pixar’s Toy Story (1995), what is the name of the next-door neighbor boy who destroys toys for fun?',
    options: ['Sid Phillips', 'Al McWhiggin', 'Andy Davis', 'Stinky Pete']
  },
  {
    id: 'cmd_061',
    category: 'Movies & Pop Culture',
    prompt: 'In The Lord of the Rings, how many members make up the original Fellowship of the Ring leaving Rivendell?',
    options: ['9 Companions', '7 Companions', '12 Companions', '14 Companions']
  },
  {
    id: 'cmd_062',
    category: 'Movies & Pop Culture',
    prompt: 'Which 1982 Michael Jackson album remains the best-selling studio album in music history?',
    options: ['Thriller', 'Bad', 'Off the Wall', 'Dangerous']
  },
  {
    id: 'cmd_063',
    category: 'Movies & Pop Culture',
    prompt: 'In Top Gun (1986), what is the callsign of Pete Mitchell’s Radar Intercept Officer, Nick Bradshaw?',
    options: ['Goose', 'Iceman', 'Viper', 'Jester']
  },
  {
    id: 'cmd_064',
    category: 'Movies & Pop Culture',
    prompt: 'Which fictional paper company in Scranton, Pennsylvania is the workplace setting of The Office (US)?',
    options: ['Dunder Mifflin', 'Vance Refrigeration', 'Sabre International', 'Initech Corporation']
  },
  {
    id: 'cmd_065',
    category: 'Movies & Pop Culture',
    prompt: 'In Ghostbusters (1984), what giant food mascot is accidentally summoned by Ray Stantz in New York City?',
    options: ['Stay Puft Marshmallow Man', 'Pillsbury Doughboy', 'Michelin Tire Man', 'Kool-Aid Pitcher Man']
  },
  {
    id: 'cmd_066',
    category: 'Movies & Pop Culture',
    prompt: 'Which Studio Ghibli animated film directed by Hayao Miyazaki won the Academy Award for Best Animated Feature in 2003?',
    options: ['Spirited Away', 'My Neighbor Totoro', 'Princess Mononoke', 'Howl’s Moving Castle']
  },
  {
    id: 'cmd_067',
    category: 'Movies & Pop Culture',
    prompt: 'In Raiders of the Lost Ark (1981), what kind of animal is Indiana Jones famously terrified of?',
    options: ['Venomous Snakes', 'Giant Spiders', 'Sewer Rats', 'Flying Bats']
  },
  {
    id: 'cmd_068',
    category: 'Movies & Pop Culture',
    prompt: 'What is the name of the fictional African nation rich in Vibranium ruled by T’Challa in Black Panther?',
    options: ['Wakanda', 'Zamunda', 'Genovia', 'Latveria']
  },
  {
    id: 'cmd_069',
    category: 'Movies & Pop Culture',
    prompt: 'In The Princess Bride (1987), what 3-word phrase does Westley say whenever Buttercup gives him a chore?',
    options: ['As you wish', 'At your command', 'By my honor', 'Always and forever']
  },
  {
    id: 'cmd_070',
    category: 'Movies & Pop Culture',
    prompt: 'Which Beatles album features the 4 band members walking across a zebra crosswalk in London in 1969?',
    options: ['Abbey Road', 'Sgt. Pepper’s', 'Revolver', 'Rubber Soul']
  },
  {
    id: 'cmd_071',
    category: 'Movies & Pop Culture',
    prompt: 'In Christopher Nolan’s Inception (2010), what personal totem object does Cobb spin to check if he is dreaming?',
    options: ['A Pewter Spinning Top', 'A Weighted Red Die', 'A Gold Chess Bishop', 'A Brass Pocket Watch']
  },
  {
    id: 'cmd_072',
    category: 'Movies & Pop Culture',
    prompt: 'In Stranger Things, what classic tabletop role-playing game do the kids play in Mike’s basement?',
    options: ['Dungeons & Dragons', 'Warhammer 40,000', 'Magic: The Gathering', 'Settlers of Catan']
  },
  {
    id: 'cmd_073',
    category: 'Movies & Pop Culture',
    prompt: 'Which 1991 Disney animated movie was the 1st animated film ever nominated for the Best Picture Oscar?',
    options: ['Beauty and the Beast', 'The Little Mermaid', 'The Lion King', 'Aladdin']
  },
  {
    id: 'cmd_074',
    category: 'Movies & Pop Culture',
    prompt: 'In Breaking Bad, what alias derived from a famous German physicist does Walter White adopt?',
    options: ['Heisenberg', 'Oppenheimer', 'Schrödinger', 'Rutherford']
  },
  {
    id: 'cmd_075',
    category: 'Movies & Pop Culture',
    prompt: 'In Die Hard (1988), what is the name of the Los Angeles skyscraper where John McClane battles Hans Gruber?',
    options: ['Nakatomi Plaza', 'Tyrell Pyramid', 'Cyberdyne Tower', 'Wayne Enterprises']
  },
  {
    id: 'cmd_076',
    category: 'Movies & Pop Culture',
    prompt: 'Which French electronic duo wore robot helmets and released the 2013 album Random Access Memories?',
    options: ['Daft Punk', 'Justice', 'Air', 'Cassius']
  },
  {
    id: 'cmd_077',
    category: 'Movies & Pop Culture',
    prompt: 'In The Mandalorian, what is the real name of the Force-sensitive child affectionately called "Baby Yoda"?',
    options: ['Grogu', 'Yaddle', 'Kuiil', 'Babu Frik']
  },
  {
    id: 'cmd_078',
    category: 'Movies & Pop Culture',
    prompt: 'In Seinfeld, what December holiday featuring an unadorned aluminum pole was invented by Frank Costanza?',
    options: ['Festivus', 'Chrismukkah', 'Friendsgiving', 'Galentine’s Day']
  },
  {
    id: 'cmd_079',
    category: 'Movies & Pop Culture',
    prompt: 'Which 2022 film starring Michelle Yeoh swept 7 Academy Awards including Best Picture?',
    options: ['Everything Everywhere All at Once', 'Top Gun: Maverick', 'The Banshees of Inisherin', 'Avatar: The Way of Water']
  },
  {
    id: 'cmd_080',
    category: 'Movies & Pop Culture',
    prompt: 'In Pixar’s Finding Nemo, what is the street address on P. Sherman’s scuba mask in Sydney, Australia?',
    options: ['42 Wallaby Way', '24 Kangaroo Court', '88 Koala Crescent', '16 Boomerang Boulevard']
  },

  // --- 4. FOOD, CULINARY ARTS, GRILLING & DRINKS (cmd_081 .. cmd_104) ---
  {
    id: 'cmd_081',
    category: 'Culinary & Drinks',
    prompt: 'In Texas-style low-and-slow barbecue, around what internal temperature (°F) is a beef brisket typically tender and ready?',
    options: ['203°F (195°F–205°F)', '145°F (140°F–150°F)', '165°F (160°F–170°F)', '250°F (245°F–255°F)']
  },
  {
    id: 'cmd_082',
    category: 'Culinary & Drinks',
    prompt: 'What chemical reaction between amino acids and reducing sugars gives seared steak and toasted bread their brown crust?',
    options: ['Maillard Reaction', 'Pasteurization Process', 'Emulsification Reaction', 'Fermentation Process']
  },
  {
    id: 'cmd_083',
    category: 'Culinary & Drinks',
    prompt: 'What are the 3 traditional ingredients of a classic Italian Pasta Carbonara sauce (alongside black pepper and pasta water)?',
    options: ['Guanciale, Egg Yolks & Pecorino', 'Heavy Cream, Bacon & Parmesan', 'Pancetta, Butter & Mozzarella', 'Prosciutto, Garlic & Ricotta']
  },
  {
    id: 'cmd_084',
    category: 'Culinary & Drinks',
    prompt: 'Which expensive spice is harvested by hand from the crimson stigmas of the Crocus sativus flower?',
    options: ['Saffron', 'Cardamom', 'Turmeric', 'Sumac']
  },
  {
    id: 'cmd_085',
    category: 'Culinary & Drinks',
    prompt: 'By U.S. federal regulations, Bourbon whiskey must be made from a grain mash containing at least 51% of what grain?',
    options: ['Corn (Maize)', 'Malted Barley', 'Winter Rye', 'Red Wheat']
  },
  {
    id: 'cmd_086',
    category: 'Culinary & Drinks',
    prompt: 'On the Scoville heat scale, what chemical compound in chili peppers creates the sensation of fiery heat?',
    options: ['Capsaicin', 'Piperine', 'Allicin', 'Menthol']
  },
  {
    id: 'cmd_087',
    category: 'Culinary & Drinks',
    prompt: 'Which classic French "mother sauce" is whisked from clarified butter, egg yolks, and lemon juice for Eggs Benedict?',
    options: ['Hollandaise Sauce', 'Béchamel Sauce', 'Velouté Sauce', 'Espagnole Sauce']
  },
  {
    id: 'cmd_088',
    category: 'Culinary & Drinks',
    prompt: 'What traditional Japanese fermented soybean paste is the primary base for Japan’s classic breakfast soup?',
    options: ['Miso Paste', 'Tahini Paste', 'Harissa Paste', 'Tamarind Paste']
  },
  {
    id: 'cmd_089',
    category: 'Culinary & Drinks',
    prompt: 'In an authentic Italian Negroni cocktail, which 3 spirits are stirred together in equal 1:1:1 parts?',
    options: ['Gin, Campari & Sweet Vermouth', 'Vodka, Aperol & Dry Vermouth', 'Bourbon, Amaro & Orange Bitters', 'Rum, Cointreau & Lime Juice']
  },
  {
    id: 'cmd_090',
    category: 'Culinary & Drinks',
    prompt: 'Which soft, creamy Italian cheese—whose name means "rewritten/recooked"—is made from leftover whey?',
    options: ['Ricotta', 'Burrata', 'Gorgonzola', 'Asiago']
  },
  {
    id: 'cmd_091',
    category: 'Culinary & Drinks',
    prompt: 'In Japanese sushi terminology, what does the word "Sashimi" specifically refer to?',
    options: ['Thinly sliced raw fish without rice', 'Vinegared rice rolled in nori seaweed', 'Hand-pressed rice topped with roe', 'Battered and deep-fried seafood']
  },
  {
    id: 'cmd_092',
    category: 'Culinary & Drinks',
    prompt: 'What primary botanical gives Gin its signature piney, aromatic flavor profile?',
    options: ['Juniper Berries', 'Coriander Seeds', 'Star Anise Pods', 'Elderflower Blossoms']
  },
  {
    id: 'cmd_093',
    category: 'Culinary & Drinks',
    prompt: 'Which region of France is the only place legally permitted to label its sparkling wine "Champagne" under EU law?',
    options: ['Champagne Region', 'Bordeaux Region', 'Burgundy Region', 'Provence Region']
  },
  {
    id: 'cmd_094',
    category: 'Culinary & Drinks',
    prompt: 'What type of laminated pastry dough, folded repeatedly with cold butter, is used to bake flaky croissants?',
    options: ['Viennoiserie Puff Dough', 'Choux Pastry Dough', 'Shortcrust Tart Dough', 'Brioche Enriched Dough']
  },
  {
    id: 'cmd_095',
    category: 'Culinary & Drinks',
    prompt: 'What Mexican plant species is harvested, roasted, and fermented to produce authentic 100% Tequila?',
    options: ['Blue Weber Agave', 'Prickly Pear Cactus', 'Yucca Root Plant', 'Sugarcane Stalk']
  },
  {
    id: 'cmd_096',
    category: 'Culinary & Drinks',
    prompt: 'In coffee brewing, roughly how many bars of atmospheric water pressure does a standard espresso machine use?',
    options: ['9 bars of pressure', '2 bars of pressure', '25 bars of pressure', '50 bars of pressure']
  },
  {
    id: 'cmd_097',
    category: 'Culinary & Drinks',
    prompt: 'Which aromatic underground fungus is hunted in Italy and France using specially trained dogs?',
    options: ['White & Black Truffles', 'Chanterelle Mushrooms', 'Morel Sponge Caps', 'Porcini King Boletes']
  },
  {
    id: 'cmd_098',
    category: 'Culinary & Drinks',
    prompt: 'What does the Italian culinary term "Al Dente" literally translate to when testing cooked pasta?',
    options: ['To the tooth', 'In the pot', 'With the sauce', 'From the fire']
  },
  {
    id: 'cmd_099',
    category: 'Culinary & Drinks',
    prompt: 'Which fruit is the primary base ingredient of traditional Mexican Guacamole?',
    options: ['Hass Avocado', 'Green Tomatillo', 'Plantain Banana', 'Chayote Squash']
  },
  {
    id: 'cmd_100',
    category: 'Culinary & Drinks',
    prompt: 'In steakhouse cuts, a Porterhouse steak consists of a strip loin on 1 side of the T-bone and what cut on the other?',
    options: ['Filet Mignon (Tenderloin)', 'Ribeye Cap (Spinalis)', 'Flat Iron Chuck', 'Flank Bavette']
  },
  {
    id: 'cmd_101',
    category: 'Culinary & Drinks',
    prompt: 'Which Spanish rice dish originating in Valencia is traditionally cooked in a wide, shallow pan over an open fire?',
    options: ['Paella Valenciana', 'Risotto Milanese', 'Jambalaya Creole', 'Arroz con Pollo']
  },
  {
    id: 'cmd_102',
    category: 'Culinary & Drinks',
    prompt: 'What gives Earl Grey black tea its distinctive citrusy floral aroma and flavor?',
    options: ['Oil of Bergamot', 'Extract of Jasmine', 'Crushed Lemongrass', 'Blossom of Hibiscus']
  },
  {
    id: 'cmd_103',
    category: 'Culinary & Drinks',
    prompt: 'At sea level, what is the exact boiling point of pure water on the Celsius scale?',
    options: ['100°C (212°F)', '80°C (176°F)', '120°C (248°F)', '90°C (194°F)']
  },
  {
    id: 'cmd_104',
    category: 'Culinary & Drinks',
    prompt: 'Which pungent Southeast Asian fruit is famous for its spiky shell, custard texture, and ban on Singapore subways?',
    options: ['Durian Fruit', 'Dragon Fruit', 'Rambutan Fruit', 'Mangosteen Fruit']
  },

  // --- 5. HISTORY, INVENTIONS & ENGINEERING (cmd_105 .. cmd_126) ---
  {
    id: 'cmd_105',
    category: 'History & Engineering',
    prompt: 'In what year did the Wright brothers achieve their 1st powered, heavier-than-air airplane flight at Kitty Hawk?',
    options: ['1903', '1889', '1914', '1927']
  },
  {
    id: 'cmd_106',
    category: 'History & Engineering',
    prompt: 'Which British scientist discovered Penicillin in 1928 after noticing mold inhibiting bacteria on a petri dish?',
    options: ['Alexander Fleming', 'Louis Pasteur', 'Jonas Salk', 'Joseph Lister']
  },
  {
    id: 'cmd_107',
    category: 'History & Engineering',
    prompt: 'What 3-language artifact discovered in 1799 allowed scholars to finally decipher ancient Egyptian hieroglyphs?',
    options: ['The Rosetta Stone', 'The Dead Sea Scrolls', 'The Code of Hammurabi', 'The Cyrus Cylinder']
  },
  {
    id: 'cmd_108',
    category: 'History & Engineering',
    prompt: 'Which pioneer of electrical engineering championed Alternating Current (AC) and designed the AC induction motor?',
    options: ['Nikola Tesla', 'Thomas Edison', 'Guglielmo Marconi', 'Alexander Graham Bell']
  },
  {
    id: 'cmd_109',
    category: 'History & Engineering',
    prompt: 'In what year did the Berlin Wall fall, symbolizing the end of the Cold War division of Germany?',
    options: ['1989', '1979', '1991', '1984']
  },
  {
    id: 'cmd_110',
    category: 'History & Engineering',
    prompt: 'Which English mathematician and World War 2 codebreaker at Bletchley Park helped crack the German Enigma machine?',
    options: ['Alan Turing', 'Charles Babbage', 'John von Neumann', 'Tim Berners-Lee']
  },
  {
    id: 'cmd_111',
    category: 'History & Engineering',
    prompt: 'Around 1440 in Mainz, Germany, who invented the movable-type mechanical printing press in Europe?',
    options: ['Johannes Gutenberg', 'Martin Luther', 'Leonardo da Vinci', 'Galileo Galilei']
  },
  {
    id: 'cmd_112',
    category: 'History & Engineering',
    prompt: 'Which physicist won 2 Nobel Prizes in 2 different scientific fields (Physics in 1903 and Chemistry in 1911)?',
    options: ['Marie Curie', 'Albert Einstein', 'Niels Bohr', 'Richard Feynman']
  },
  {
    id: 'cmd_113',
    category: 'History & Engineering',
    prompt: 'Which ancient Roman concrete amphitheater, completed in 80 AD under Emperor Titus, could seat 50,000 spectators?',
    options: ['The Colosseum', 'The Pantheon', 'Circus Maximus', 'Forum Romanum']
  },
  {
    id: 'cmd_114',
    category: 'History & Engineering',
    prompt: 'On July 20, 1969, in which lunar maria ("sea") did Apollo 11’s Eagle lunar module touch down?',
    options: ['Sea of Tranquility', 'Ocean of Storms', 'Sea of Serenity', 'Sea of Crisium']
  },
  {
    id: 'cmd_115',
    category: 'History & Engineering',
    prompt: 'What is the chemical symbol for Gold on the Periodic Table of Elements, derived from the Latin word "Aurum"?',
    options: ['Au (Atomic Number 79)', 'Ag (Atomic Number 47)', 'Gd (Atomic Number 64)', 'Fe (Atomic Number 26)']
  },
  {
    id: 'cmd_116',
    category: 'History & Engineering',
    prompt: 'Which supersonic passenger airliner flew across the Atlantic from London to New York in under 3.5 hours?',
    options: ['Aérospatiale/BAC Concorde', 'Boeing 747 Dreamliner', 'Lockheed SR-71 Blackbird', 'Airbus A380 Superjumbo']
  },
  {
    id: 'cmd_117',
    category: 'History & Engineering',
    prompt: 'Who painted the ceiling of the Sistine Chapel in the Vatican between 1508 and 1512?',
    options: ['Michelangelo Buonarroti', 'Leonardo da Vinci', 'Raphael Sanzio', 'Sandro Botticelli']
  },
  {
    id: 'cmd_118',
    category: 'History & Engineering',
    prompt: 'Which metal remains a liquid at standard room temperature (20°C) and was historically used in thermometers?',
    options: ['Mercury (Hg)', 'Gallium (Ga)', 'Bismuth (Bi)', 'Tungsten (W)']
  },
  {
    id: 'cmd_119',
    category: 'History & Engineering',
    prompt: 'What 1215 English charter sealed by King John at Runnymede established that the monarch is subject to the rule of law?',
    options: ['Magna Carta', 'Domesday Book', 'Treaty of Westphalia', 'Bill of Rights 1689']
  },
  {
    id: 'cmd_120',
    category: 'History & Engineering',
    prompt: 'In computer architecture, how many bits make up 1 standard byte of digital data?',
    options: ['8 bits', '4 bits', '16 bits', '32 bits']
  },
  {
    id: 'cmd_121',
    category: 'History & Engineering',
    prompt: 'Which French gift to the United States, designed by Frédéric Auguste Bartholdi with an internal frame by Gustave Eiffel, was dedicated in 1886?',
    options: ['Statue of Liberty', 'Washington Monument', 'Lincoln Memorial', 'Gateway Arch']
  },
  {
    id: 'cmd_122',
    category: 'History & Engineering',
    prompt: 'What is the approximate speed of light in a vacuum in kilometers per second?',
    options: ['300,000 km/s', '150,000 km/s', '34,300 km/s', '1,000,000 km/s']
  },
  {
    id: 'cmd_123',
    category: 'History & Engineering',
    prompt: 'Which Italian volcano erupted in 79 AD, burying the Roman cities of Pompeii and Herculaneum in volcanic ash?',
    options: ['Mount Vesuvius', 'Mount Etna', 'Stromboli Volcano', 'Mount Krakatoa']
  },
  {
    id: 'cmd_124',
    category: 'History & Engineering',
    prompt: 'Who invented the World Wide Web (HTTP and HTML) in 1989 while working at CERN in Switzerland?',
    options: ['Tim Berners-Lee', 'Vint Cerf', 'Linus Torvalds', 'Dennis Ritchie']
  },
  {
    id: 'cmd_125',
    category: 'History & Engineering',
    prompt: 'Which element has Atomic Number 1 and makes up roughly 75% of all normal baryonic mass in the universe?',
    options: ['Hydrogen (H)', 'Helium (He)', 'Carbon (C)', 'Oxygen (O)']
  },
  {
    id: 'cmd_126',
    category: 'History & Engineering',
    prompt: 'What is the hardest naturally occurring mineral on the Mohs scale of mineral hardness (rated 10 out of 10)?',
    options: ['Crystalline Diamond', 'Sapphire Corundum', 'Quartz Silica', 'Topaz Silicate']
  },

  // --- 6. SPORTS, OLYMPICS & GAMES (cmd_127 .. cmd_143) ---
  {
    id: 'cmd_127',
    category: 'Sports & Games',
    prompt: 'What is the exact official distance of a modern Olympic Marathon race in miles?',
    options: ['26.2 miles (42.195 km)', '24.0 miles (38.624 km)', '30.0 miles (48.280 km)', '20.5 miles (32.991 km)']
  },
  {
    id: 'cmd_128',
    category: 'Sports & Games',
    prompt: 'In golf, which prestigious major tournament awards the champion a signature Green Jacket at Augusta National?',
    options: ['The Masters Tournament', 'The U.S. Open', 'The Open Championship', 'The PGA Championship']
  },
  {
    id: 'cmd_129',
    category: 'Sports & Games',
    prompt: 'How many total squares (alternating light and dark) are on a standard 8x8 chessboard?',
    options: ['64 squares', '49 squares', '81 squares', '100 squares']
  },
  {
    id: 'cmd_130',
    category: 'Sports & Games',
    prompt: 'In tennis, what are the 4 Grand Slam tournaments played across the calendar year?',
    options: ['Australian, French, Wimbledon & US Open', 'Indian Wells, Miami, Madrid & Rome Open', 'Davis Cup, Laver Cup, ATP & WTA Finals', 'Monte Carlo, Halle, Queen’s & Cincinnati']
  },
  {
    id: 'cmd_131',
    category: 'Sports & Games',
    prompt: 'Which Jamaican sprinter holds the men’s 100-meter world record of 9.58 seconds, set in Berlin in 2009?',
    options: ['Usain Bolt', 'Yohan Blake', 'Asafa Powell', 'Carl Lewis']
  },
  {
    id: 'cmd_132',
    category: 'Sports & Games',
    prompt: 'In Major League Baseball, how many feet apart are the bases on the infield diamond?',
    options: ['90 feet apart', '60 feet apart', '100 feet apart', '120 feet apart']
  },
  {
    id: 'cmd_133',
    category: 'Sports & Games',
    prompt: 'Which American swimmer won a record 23 Olympic Gold Medals (and 28 total medals) across his career?',
    options: ['Michael Phelps', 'Mark Spitz', 'Caeleb Dressel', 'Ryan Lochte']
  },
  {
    id: 'cmd_134',
    category: 'Sports & Games',
    prompt: 'In bowling, what is the maximum possible score in a single game achieved by rolling 12 consecutive strikes?',
    options: ['300 points', '250 points', '360 points', '400 points']
  },
  {
    id: 'cmd_135',
    category: 'Sports & Games',
    prompt: 'In the Tour de France cycling race, what color jersey is worn by the overall general classification leader?',
    options: ['Yellow Jersey (Maillot Jaune)', 'Green Sprinter Jersey', 'Polka-Dot Climber Jersey', 'White Young Rider Jersey']
  },
  {
    id: 'cmd_136',
    category: 'Sports & Games',
    prompt: 'How many rings are interlocked on the official Olympic flag, representing the 5 inhabited continents?',
    options: ['5 Interlocking Rings', '6 Interlocking Rings', '7 Interlocking Rings', '4 Interlocking Rings']
  },
  {
    id: 'cmd_137',
    category: 'Sports & Games',
    prompt: 'In the board game Monopoly, how much money does a player collect each time they pass the "GO" square?',
    options: ['$200 Monopoly Dollars', '$100 Monopoly Dollars', '$500 Monopoly Dollars', '$50 Monopoly Dollars']
  },
  {
    id: 'cmd_138',
    category: 'Sports & Games',
    prompt: 'In NHL ice hockey, what is the name of the oldest championship trophy in North American professional sports?',
    options: ['The Stanley Cup', 'The Vince Lombardi Trophy', 'The Larry O’Brien Trophy', 'The Commissioner’s Trophy']
  },
  {
    id: 'cmd_139',
    category: 'Sports & Games',
    prompt: 'In basketball, how high above the court floor is a regulation NBA or NCAA hoop rim mounted?',
    options: ['10 feet high', '9 feet high', '11 feet high', '12 feet high']
  },
  {
    id: 'cmd_140',
    category: 'Sports & Games',
    prompt: 'Which national men’s soccer team has won the FIFA World Cup a record 5 times (1958, 1962, 1970, 1994, 2002)?',
    options: ['Brazil', 'Germany', 'Italy', 'Argentina']
  },
  {
    id: 'cmd_141',
    category: 'Sports & Games',
    prompt: 'In Formula 1 racing, which historic street circuit winds through Monte Carlo, including the Fairmont Hairpin and harbor tunnel?',
    options: ['Circuit de Monaco', 'Monza Autodromo', 'Silverstone Circuit', 'Spa-Francorchamps']
  },
  {
    id: 'cmd_142',
    category: 'Sports & Games',
    prompt: 'In American football (NFL), how many points is a safety worth when the offense is tackled in its own end zone?',
    options: ['2 points', '1 point', '3 points', '6 points']
  },
  {
    id: 'cmd_143',
    category: 'Sports & Games',
    prompt: 'In standard 8-ball pool, what number is printed on the solid black ball sunk at the very end of the game?',
    options: ['The 8 Ball', 'The 9 Ball', 'The 1 Ball', 'The 15 Ball']
  },

  // --- 7. NATURE, OCEANS & EXTREME ANIMALS (cmd_144 .. cmd_160) ---
  {
    id: 'cmd_144',
    category: 'Nature & Oceans',
    prompt: 'How many hearts does a giant Pacific octopus have to pump blue copper-based blood through its body?',
    options: ['3 separate hearts', '1 single heart', '2 paired hearts', '8 tentacle hearts']
  },
  {
    id: 'cmd_145',
    category: 'Nature & Oceans',
    prompt: 'Which bird is the fastest animal on Earth when executing a high-speed hunting stoop dive (exceeding 240 mph)?',
    options: ['Peregrine Falcon', 'Golden Eagle', 'Wandering Albatross', 'Ruby-Throated Hummingbird']
  },
  {
    id: 'cmd_146',
    category: 'Nature & Oceans',
    prompt: 'What is the deepest known point in Earth’s oceans, descending nearly 11,000 meters in the Mariana Trench?',
    options: ['Challenger Deep', 'Tonga Trench', 'Puerto Rico Trench', 'Java Abyssal Plain']
  },
  {
    id: 'cmd_147',
    category: 'Nature & Oceans',
    prompt: 'Which semi-aquatic Australian mammal lays eggs, has a duck-like bill, and senses electric fields underwater?',
    options: ['Duck-Billed Platypus', 'Tasmanian Devil', 'Short-Beaked Wombat', 'Sugar Glider Possum']
  },
  {
    id: 'cmd_148',
    category: 'Nature & Oceans',
    prompt: 'Which tree species in California holds the record as the largest living single-stem tree on Earth by trunk volume?',
    options: ['Giant Sequoia (General Sherman)', 'Bristlecone Pine (Methuselah)', 'Weeping Willow Canopy', 'Baobab Savanna Tree']
  },
  {
    id: 'cmd_149',
    category: 'Nature & Oceans',
    prompt: 'What microscopic 8-legged "water bear" can survive the vacuum of outer space, extreme radiation, and boiling temperatures?',
    options: ['Tardigrade', 'Rotifer', 'Paramecium', 'Amoeba']
  },
  {
    id: 'cmd_150',
    category: 'Nature & Oceans',
    prompt: 'Which marine crustacean punches its prey at 50 mph with clubbed appendages that create cavitation shockwaves?',
    options: ['Peacock Mantis Shrimp', 'Alaskan King Crab', 'Maine Clawed Lobster', 'Pistol Snapping Crab']
  },
  {
    id: 'cmd_151',
    category: 'Nature & Oceans',
    prompt: 'Which family of birds is the only bird group capable of flying steadily backward and hovering in mid-air?',
    options: ['Hummingbirds', 'Kingfishers', 'Swallows', 'Barn Owls']
  },
  {
    id: 'cmd_152',
    category: 'Nature & Oceans',
    prompt: 'What is the collective noun used by biologists for a flamboyant group of wild flamingos?',
    options: ['A Flamboyance', 'A Parliament', 'A Murder', 'A Pod']
  },
  {
    id: 'cmd_153',
    category: 'Nature & Oceans',
    prompt: 'In a honeybee colony, what geometric shape do worker bees construct out of wax to store honey with maximum efficiency?',
    options: ['6-Sided Hexagons', '8-Sided Octagons', '5-Sided Pentagons', '4-Sided Squares']
  },
  {
    id: 'cmd_154',
    category: 'Nature & Oceans',
    prompt: 'Which large toothed whale has the largest brain of any animal on Earth and dives 2,000 meters to hunt giant squid?',
    options: ['Sperm Whale', 'Humpback Whale', 'Beluga Whale', 'Minke Whale']
  },
  {
    id: 'cmd_155',
    category: 'Nature & Oceans',
    prompt: 'What is the only mammal capable of true, sustained powered flight (rather than gliding)?',
    options: ['Bats (Chiroptera)', 'Flying Squirrels', 'Sugar Gliders', 'Colugo Lemurs']
  },
  {
    id: 'cmd_156',
    category: 'Nature & Oceans',
    prompt: 'Roughly how many months is the gestation period of an African Bush Elephant—the longest of any land mammal?',
    options: ['22 months', '9 months', '12 months', '36 months']
  },
  {
    id: 'cmd_157',
    category: 'Nature & Oceans',
    prompt: 'Which Mexican salamander is famous in regenerative medicine for regrowing entire limbs and retaining its feathery gills?',
    options: ['Axolotl', 'Gila Monster', 'Komodo Dragon', 'Marine Iguana']
  },
  {
    id: 'cmd_158',
    category: 'Nature & Oceans',
    prompt: 'What is the largest living coral reef system on Earth, stretching over 2,300 kilometers off Queensland, Australia?',
    options: ['Great Barrier Reef', 'Belize Barrier Reef', 'Red Sea Coral Reef', 'New Caledonia Reef']
  },
  {
    id: 'cmd_159',
    category: 'Nature & Oceans',
    prompt: 'Which black-and-white bear native to central China subsists on a diet that is 99% bamboo shoots and leaves?',
    options: ['Giant Panda', 'Spectacled Bear', 'Sun Bear', 'Kodiak Bear']
  },
  {
    id: 'cmd_160',
    category: 'Nature & Oceans',
    prompt: 'How many cervical (neck) vertebrae does a long-necked giraffe have—the exact same number as a human?',
    options: ['7 neck vertebrae', '18 neck vertebrae', '24 neck vertebrae', '32 neck vertebrae']
  }
];

// ============================================================================
// PERSISTENT NON-REPEATING FISHER-YATES DECK MANAGER (`localStorage`)
// ============================================================================

function fisherYatesShuffleArray<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

function loadSeenSet(storageKey: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return new Set(parsed.filter((x): x is string => typeof x === 'string'));
    }
  } catch {
    // Ignore localStorage parse errors
  }
  return new Set();
}

function saveSeenSet(storageKey: string, seen: Set<string>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify([...seen]));
  } catch {
    // Ignore localStorage write errors
  }
}

let inMemoryUnseenCommanderDeck: CommanderQuestionSpec[] = [];
let inMemoryUnseenKidDeck: KidQuestionSpec[] = [];

/**
 * Draws the next non-repeating question for the given player tier:
 * - For `WYATT_4YO` and `EMMA_3YO`: draws from the 36-question `KID_QUESTIONS` pool,
 *   tracking seen IDs in `localStorage` (`'starship_seen_kid_q_v2'`), and Fisher-Yates
 *   shuffling the 2 options (`[Left, Right]`) along with their synchronized `_a.mp3`/`_b.mp3` audio URLs!
 * - For `ADULT` (Commanders): draws from the 160-question `COMMANDER_QUESTIONS` pool,
 *   tracking seen IDs in `localStorage` (`'starship_seen_commander_q_v2'`), and Fisher-Yates
 *   shuffling all 4 options so `correctIndex` (`0..3`) is 100% random every time!
 */
export function drawNextStarshipQuestion(tier: QuestionTierType): ActiveTriviaQuestion {
  if (tier === 'WYATT_4YO' || tier === 'EMMA_3YO') {
    const seenIds = loadSeenSet(SEEN_KID_STORAGE_KEY);
    inMemoryUnseenKidDeck = inMemoryUnseenKidDeck.filter((q) => !seenIds.has(q.id));

    if (inMemoryUnseenKidDeck.length === 0) {
      let unseenPool = KID_QUESTIONS.filter((q) => !seenIds.has(q.id));
      if (unseenPool.length === 0) {
        // 100% of Kid pool has been played -> reset seen list and reshuffle all 36!
        seenIds.clear();
        saveSeenSet(SEEN_KID_STORAGE_KEY, seenIds);
        unseenPool = [...KID_QUESTIONS];
      }
      inMemoryUnseenKidDeck = fisherYatesShuffleArray(unseenPool);
    }

    const chosen = inMemoryUnseenKidDeck.pop() ?? KID_QUESTIONS[0];
    seenIds.add(chosen.id);
    saveSeenSet(SEEN_KID_STORAGE_KEY, seenIds);

    // Fisher-Yates shuffle the 2 Kid options (`[Left, Right]`) and keep their audio URLs paired!
    const pairs = fisherYatesShuffleArray([
      {
        text: chosen.optionA,
        isCorrect: true,
        audioUrl: `/assets/sfx/starship/kids/${chosen.id}_a.mp3`
      },
      {
        text: chosen.optionB,
        isCorrect: false,
        audioUrl: `/assets/sfx/starship/kids/${chosen.id}_b.mp3`
      }
    ]);

    const correctIndex = pairs.findIndex((p) => p.isCorrect);

    return {
      id: chosen.id,
      tier,
      category: chosen.category,
      prompt: chosen.questionText,
      options: [pairs[0].text, pairs[1].text],
      correctIndex: correctIndex >= 0 ? correctIndex : 0,
      isKidQuestion: true,
      questionAudioUrl: `/assets/sfx/starship/kids/${chosen.id}_q.mp3`,
      optionAudioUrls: [pairs[0].audioUrl, pairs[1].audioUrl]
    };
  }

  // Commander (Adult) 4-Option Question Draw
  const seenIds = loadSeenSet(SEEN_COMMANDER_STORAGE_KEY);
  inMemoryUnseenCommanderDeck = inMemoryUnseenCommanderDeck.filter((q) => !seenIds.has(q.id));

  if (inMemoryUnseenCommanderDeck.length === 0) {
    let unseenPool = COMMANDER_QUESTIONS.filter((q) => !seenIds.has(q.id));
    if (unseenPool.length === 0) {
      // 100% of Commander pool (160 questions) has been played -> reset seen list and reshuffle!
      seenIds.clear();
      saveSeenSet(SEEN_COMMANDER_STORAGE_KEY, seenIds);
      unseenPool = [...COMMANDER_QUESTIONS];
    }
    inMemoryUnseenCommanderDeck = fisherYatesShuffleArray(unseenPool);
  }

  const chosen = inMemoryUnseenCommanderDeck.pop() ?? COMMANDER_QUESTIONS[0];
  seenIds.add(chosen.id);
  saveSeenSet(SEEN_COMMANDER_STORAGE_KEY, seenIds);

  // Fisher-Yates shuffle the 4 options (`options[0]` in the bank is the canonical correct option)
  const taggedOptions = fisherYatesShuffleArray(
    chosen.options.map((text, idx) => ({
      text,
      isCorrect: idx === 0
    }))
  );
  const correctIndex = taggedOptions.findIndex((o) => o.isCorrect);

  return {
    id: chosen.id,
    tier: 'ADULT',
    category: chosen.category,
    prompt: chosen.prompt,
    options: taggedOptions.map((o) => o.text),
    correctIndex: correctIndex >= 0 ? correctIndex : 0,
    isKidQuestion: false
  };
}
