/**
 * velvetQuestions.ts
 * ------------------
 * Curated 105-question adult compatibility deck for "After Hours: Wavelength"
 * (35 Deep & Romantic, 35 Flirty & Spicy, 35 Unfiltered NSFW).
 *
 * Persists seen question IDs in `localStorage` (`velvet_seen_q_v1`) so repeat date nights
 * always deal fresh questions first before gracefully cycling.
 */

import {
  HeatProgressionMode,
  LobbySettings,
  PlayerId,
  QuestionTier,
  RoundMode,
  VelvetQuestion
} from './velvetTypes';

export const VELVET_SEEN_STORAGE_KEY = 'velvet_seen_q_v1';

export const VELVET_QUESTIONS: VelvetQuestion[] = [
  // ============================================================================
  // TIER 1: 🍷 DEEP & ROMANTIC (35 Questions)
  // ============================================================================
  {
    id: 'rom_01',
    tier: 'romantic',
    prompt:
      'If someone handed us a surprise kid-free 48 hours starting right this second, what does your soul crave more?',
    leftLabel: 'Do-not-disturb hotel coma, room service & zero plans',
    rightLabel: 'Dressed up, late-night cocktails, music & exploring a city',
    allowSpotlight: true
  },
  {
    id: 'rom_02',
    tier: 'romantic',
    prompt:
      'When life feels overwhelming and your battery hits 5%, how do you secretly wish your partner would step in?',
    leftLabel: 'Hold me quietly and listen — do not try to fix it',
    rightLabel: 'Take command, clear my plate & handle the logistics',
    allowSpotlight: true
  },
  {
    id: 'rom_03',
    tier: 'romantic',
    prompt:
      'How honest are you about asking for emotional reassurance vs. hoping the other person just notices?',
    leftLabel: 'Cryptic signals — I secretly hope you read my mind',
    rightLabel: 'Wide-open book — I say exactly what I need out loud',
    allowSpotlight: true
  },
  {
    id: 'rom_04',
    tier: 'romantic',
    prompt:
      'Looking back at the earliest days we were falling for each other, what pulled you in harder?',
    leftLabel: 'How safe, easy, and like "home" being together felt',
    rightLabel: 'Electric chemistry, butterflies, and nervous excitement',
    allowSpotlight: true
  },
  {
    id: 'rom_05',
    tier: 'romantic',
    prompt:
      'In this exact chapter of marriage and parenting, how well are we protecting "Robert & Rita" vs. just running the household?',
    leftLabel: 'Honestly running on co-manager autopilot lately',
    rightLabel: 'Still deeply prioritizing us as lovers & best friends',
    allowSpotlight: false
  },
  {
    id: 'rom_06',
    tier: 'romantic',
    prompt:
      'Which everyday, unglamorous moment makes you feel a sudden wave of deep love for your partner?',
    leftLabel: 'Watching how gentle and devoted they are with our kids',
    rightLabel: 'Catching them laugh or lock eyes with me across a chaotic room',
    allowSpotlight: true
  },
  {
    id: 'rom_07',
    tier: 'romantic',
    prompt:
      'When the two of us disagree or get prickly with each other, what is your natural instinct?',
    leftLabel: 'Cool off in my own corner first before talking it out',
    rightLabel: 'Clear the air immediately — I hate going to bed with tension',
    allowSpotlight: true
  },
  {
    id: 'rom_08',
    tier: 'romantic',
    prompt:
      'Ten years from now, when the house is quieter and the kids are older, how adventurous should our next chapter be?',
    leftLabel: 'Deep roots, cozy rituals, porch nights & familiar comfort',
    rightLabel: 'Wildly spontaneous — big trips, new hobbies & bold leaps',
    allowSpotlight: true
  },
  {
    id: 'rom_09',
    tier: 'romantic',
    prompt:
      'What makes you feel more genuinely cherished on an ordinary Tuesday?',
    leftLabel: 'Thoughtful words — a sincere compliment or long text',
    rightLabel: 'Quiet acts of service — handling something I was dreading',
    allowSpotlight: true
  },
  {
    id: 'rom_10',
    tier: 'romantic',
    prompt:
      'How sentimental are you really behind closed doors?',
    leftLabel: 'Pragmatic — memories live in the present, not keepsakes',
    rightLabel: 'Total softie — old notes, photos & songs wreck me',
    allowSpotlight: true
  },
  {
    id: 'rom_11',
    tier: 'romantic',
    prompt:
      'If we booked a dream anniversary trip just for the two of us, which vibe wins?',
    leftLabel: 'Secluded mountain cabin, fireplace, wine & mountain air',
    rightLabel: 'Turquoise ocean resort, warm nights & zero clothes required',
    allowSpotlight: true
  },
  {
    id: 'rom_12',
    tier: 'romantic',
    prompt:
      'How easy is it for you to receive a genuine compliment from your spouse without deflecting or joking it away?',
    leftLabel: 'Awkward — I immediately brush it off or crack a joke',
    rightLabel: 'I soak every word right in and replay it all week',
    allowSpotlight: true
  },
  {
    id: 'rom_13',
    tier: 'romantic',
    prompt:
      'When it comes to money and treating ourselves as a couple, where does your heart lean?',
    leftLabel: 'Save responsibly — peace of mind is the ultimate luxury',
    rightLabel: 'Splurge on unforgettable nights — we only get this life once',
    allowSpotlight: true
  },
  {
    id: 'rom_14',
    tier: 'romantic',
    prompt:
      'How much alone time do you genuinely need each week to feel like your best self in our marriage?',
    leftLabel: 'Almost none — being around you recharges me',
    rightLabel: 'A solid pocket of solo quiet time keeps me sane',
    allowSpotlight: true
  },
  {
    id: 'rom_15',
    tier: 'romantic',
    prompt:
      'If we stayed up until 2:00 AM talking tonight with phones away, what topic pulls you in deeper?',
    leftLabel: 'Nostalgia — reliving our favorite memories & inside jokes',
    rightLabel: 'Future dreaming — scheming wild plans for the next 5 years',
    allowSpotlight: true
  },
  {
    id: 'rom_16',
    tier: 'romantic',
    prompt:
      'How much do little domestic habits (dishes, clutter, punctuality) actually affect your romantic mood?',
    leftLabel: 'Zero — I can tune out a messy house in two seconds',
    rightLabel: 'Hugely — a calm, tidy space unlocks my whole brain',
    allowSpotlight: true
  },
  {
    id: 'rom_17',
    tier: 'romantic',
    prompt:
      'When you picture growing old together in our 70s, who are we?',
    leftLabel: 'Porch-swing soulmates sipping coffee in blissful peace',
    rightLabel: 'Still flirting, traveling & embarrassing our grown kids',
    allowSpotlight: true
  },
  {
    id: 'rom_18',
    tier: 'romantic',
    prompt:
      'How often do you catch yourself admiring your partner when they have no idea you are looking?',
    leftLabel: 'Occasionally when something specific catches my eye',
    rightLabel: 'Constantly — way more often than I ever say out loud',
    allowSpotlight: true
  },
  {
    id: 'rom_19',
    tier: 'romantic',
    prompt:
      'When one of us is having a rough confidence week, what helps more?',
    leftLabel: 'Gentle space and normalcy without making a big deal of it',
    rightLabel: 'Fierce hype, reassurance, and reminding me who I am',
    allowSpotlight: true
  },
  {
    id: 'rom_20',
    tier: 'romantic',
    prompt:
      'On a Friday night after the kids are finally asleep, what sounds more restorative?',
    leftLabel: 'Curled up watching a great show without having to talk much',
    rightLabel: 'Music on, pouring a drink & catching up face-to-face',
    allowSpotlight: true
  },
  {
    id: 'rom_21',
    tier: 'romantic',
    prompt:
      'How comfortable are you being completely vulnerable about your fears with your partner?',
    leftLabel: 'I still carry a lot quietly so I do not burden you',
    rightLabel: 'You are the one person on earth who gets 100% of my truth',
    allowSpotlight: true
  },
  {
    id: 'rom_22',
    tier: 'romantic',
    prompt:
      'If we impulsively played hooky on a random weekday while the kids were cared for, what are we doing?',
    leftLabel: 'Long lazy brunch, bookstore stroll & an afternoon nap',
    rightLabel: 'Day-drinking patio, spontaneous adventure & acting like we are 25',
    allowSpotlight: true
  },
  {
    id: 'rom_23',
    tier: 'romantic',
    prompt:
      'In social settings or family gatherings, what do you want from your partner across the room?',
    leftLabel: 'Go mingle independently and swap stories in the car later',
    rightLabel: 'Stay in my orbit — secret glances, touch & team energy',
    allowSpotlight: true
  },
  {
    id: 'rom_24',
    tier: 'romantic',
    prompt:
      'How well do you think your partner truly knows the version of you that exists today (not five years ago)?',
    leftLabel: 'There are new layers of me we have not fully unpacked yet',
    rightLabel: 'You know my heart better than I know it myself',
    allowSpotlight: true
  },
  {
    id: 'rom_25',
    tier: 'romantic',
    prompt:
      'When it comes to surprises and gifts between us:',
    leftLabel: 'Let us pick together so nobody guesses wrong',
    rightLabel: 'Surprise me — the thought and secrecy mean everything',
    allowSpotlight: true
  },
  {
    id: 'rom_26',
    tier: 'romantic',
    prompt:
      'What has marriage taught you more powerfully so far?',
    leftLabel: 'Patience, grace, and choosing each other on ordinary days',
    rightLabel: 'How much deeper passion gets when someone truly knows you',
    allowSpotlight: false
  },
  {
    id: 'rom_27',
    tier: 'romantic',
    prompt:
      'When you replay our Louisiana / early-relationship memories, how vivid do they still feel?',
    leftLabel: 'Like a warm, hazy movie from another lifetime',
    rightLabel: 'Like yesterday — I can still feel the air and exact details',
    allowSpotlight: true
  },
  {
    id: 'rom_28',
    tier: 'romantic',
    prompt:
      'How quick are you to genuinely forgive and let go of small everyday annoyances?',
    leftLabel: 'I stew silently for a few hours before it melts',
    rightLabel: 'Gone in five minutes — life is way too short',
    allowSpotlight: true
  },
  {
    id: 'rom_29',
    tier: 'romantic',
    prompt:
      'Which compliment hits deeper in your chest right now?',
    leftLabel: '"I am so proud of who you are and how hard you carry us"',
    rightLabel: '"I am still wildly, obsessively attracted to you"',
    allowSpotlight: true
  },
  {
    id: 'rom_30',
    tier: 'romantic',
    prompt:
      'How spontaneous vs. planned do you want our romantic life to be?',
    leftLabel: 'Put it on the calendar so I can look forward to it all week',
    rightLabel: 'Sweep me off guard at 9 PM on a Wednesday',
    allowSpotlight: true
  },
  {
    id: 'rom_31',
    tier: 'romantic',
    prompt:
      'When you see your partner completely in their element — confident and competent — how does it hit you?',
    leftLabel: 'Warm admiration and deep partnership pride',
    rightLabel: 'Immediate, undeniable attraction',
    allowSpotlight: true
  },
  {
    id: 'rom_32',
    tier: 'romantic',
    prompt:
      'How much non-sexual physical affection (long hugs, neck rubs, hand-holding, couch tangles) do you crave daily?',
    leftLabel: 'A few sweet touches here and there is plenty',
    rightLabel: 'Constant skin-to-skin contact — I can never get enough',
    allowSpotlight: true
  },
  {
    id: 'rom_33',
    tier: 'romantic',
    prompt:
      'If we wrote down three secret wishes for our marriage this year, how aligned do you think our lists would be?',
    leftLabel: 'Surprisingly different priorities right now',
    rightLabel: 'Practically identical word-for-word',
    allowSpotlight: false
  },
  {
    id: 'rom_34',
    tier: 'romantic',
    prompt:
      'What makes a late-night conversation feel truly unforgettable?',
    leftLabel: 'Laughing so hard together we have to muffle it',
    rightLabel: 'Admitting truths we have been too busy or shy to say',
    allowSpotlight: true
  },
  {
    id: 'rom_35',
    tier: 'romantic',
    prompt:
      'Right this minute, sitting across from or beside each other, how connected do you feel?',
    leftLabel: 'Warming up — shaking off a busy week and arriving',
    rightLabel: 'Completely locked in — nowhere else on earth I would rather be',
    allowSpotlight: true
  },

  // ============================================================================
  // TIER 2: 🔥 FLIRTY & SPICY (35 Questions)
  // ============================================================================
  {
    id: 'spi_01',
    tier: 'spicy',
    prompt:
      'Getting a shamelessly suggestive text from your spouse at 2:00 PM in the middle of a normal day:',
    leftLabel: 'Keep it subtle — I cannot blush in the middle of my afternoon',
    rightLabel: 'Ruin my focus completely — best kind of all-day foreplay',
    allowSpotlight: true
  },
  {
    id: 'spi_02',
    tier: 'spicy',
    prompt:
      'On a proper date night out, what builds hotter tension before we even get home?',
    leftLabel: 'Getting dressed to kill and watching everyone notice us',
    rightLabel: 'Whispered comments in my ear & hidden hands under the table',
    allowSpotlight: true
  },
  {
    id: 'spi_03',
    tier: 'spicy',
    prompt:
      'What visual hits harder when you walk into our bedroom?',
    leftLabel: 'Dressed up intentionally — lingering fabric, lace, or tailored fit',
    rightLabel: 'Fresh out of the shower in just a towel (or nothing at all)',
    allowSpotlight: true
  },
  {
    id: 'spi_04',
    tier: 'spicy',
    prompt:
      'Making out just to make out — with zero rush to move past kissing:',
    leftLabel: 'Fun warm-up, then take me straight to the main event',
    rightLabel: 'Severely underrated — slow, deep kissing drives me crazy',
    allowSpotlight: true
  },
  {
    id: 'spi_05',
    tier: 'spicy',
    prompt:
      'When your partner comes up behind you in the kitchen, wraps their arms around your waist, and kisses your neck:',
    leftLabel: 'Sweet & romantic — makes me smile and melt',
    rightLabel: 'Instant switch-flip — my brain immediately leaves the kitchen',
    allowSpotlight: true
  },
  {
    id: 'spi_06',
    tier: 'spicy',
    prompt:
      'How do you prefer to know tonight is definitely going to happen?',
    leftLabel: 'Unspoken tension that happens organically once lights go low',
    rightLabel: 'Call your shot early in the evening so anticipation builds for hours',
    allowSpotlight: true
  },
  {
    id: 'spi_07',
    tier: 'spicy',
    prompt:
      'Undressing yourself vs. letting your partner slowly undress you:',
    leftLabel: 'I would rather peel things off quickly myself',
    rightLabel: 'Take every piece off me slowly — hands on skin the whole time',
    allowSpotlight: true
  },
  {
    id: 'spi_08',
    tier: 'spicy',
    prompt:
      'Lighting preference when things start heating up:',
    leftLabel: 'Pitch dark — pure touch, sound, and zero self-consciousness',
    rightLabel: 'Warm candlelight or dim lamp — I want to see every reaction',
    allowSpotlight: true
  },
  {
    id: 'spi_09',
    tier: 'spicy',
    prompt:
      'Where on your body is the most criminally under-appreciated spot to be kissed or traced slowly?',
    leftLabel: 'Neck, jaw, ears & collarbones',
    rightLabel: 'Lower back, hips & inner thighs',
    allowSpotlight: true
  },
  {
    id: 'spi_10',
    tier: 'spicy',
    prompt:
      'Playful teasing & denial (pulling back right when things get heated just to make the other wait):',
    leftLabel: 'Cruel and unusual punishment — do not make me wait',
    rightLabel: 'Unbelievably hot — drives my anticipation through the roof',
    allowSpotlight: true
  },
  {
    id: 'spi_11',
    tier: 'spicy',
    prompt:
      'Hearing exactly what your partner finds irresistible about your body right now:',
    leftLabel: 'Makes me a tiny bit shy even after all these years',
    rightLabel: 'Pour it on — specific praise makes me feel unstoppable',
    allowSpotlight: true
  },
  {
    id: 'spi_12',
    tier: 'spicy',
    prompt:
      'A slow, oil-warmed full-body massage in bed:',
    leftLabel: 'Pure relaxation — 90% chance I melt happily into sleep',
    rightLabel: 'Guaranteed foreplay — zero chance that stays innocent',
    allowSpotlight: true
  },
  {
    id: 'spi_13',
    tier: 'spicy',
    prompt:
      'Stealing a heated makeout in a semi-risky spot (elevator, dark hallway, parked car, empty corner):',
    leftLabel: 'Too nerve-wracking — wait until we are behind closed doors',
    rightLabel: 'Major rush — makes us feel like reckless teenagers again',
    allowSpotlight: true
  },
  {
    id: 'spi_14',
    tier: 'spicy',
    prompt:
      'Music playing softly in the background when we hook up:',
    leftLabel: 'No music — I only want to hear us',
    rightLabel: 'Moody, slow R&B / lounge playlist sets an elite vibe',
    allowSpotlight: true
  },
  {
    id: 'spi_15',
    tier: 'spicy',
    prompt:
      'Eye contact when kissing and getting close:',
    leftLabel: 'Eyes closed, lost completely in physical sensation',
    rightLabel: 'Hold my gaze — intense eye contact makes my pulse race',
    allowSpotlight: true
  },
  {
    id: 'spi_16',
    tier: 'spicy',
    prompt:
      'Having one glass of wine or a good cocktail before heading upstairs:',
    leftLabel: 'Makes me sleepy faster than it makes me frisky',
    rightLabel: 'Drops my inhibitions into the exact right pocket',
    allowSpotlight: true
  },
  {
    id: 'spi_17',
    tier: 'spicy',
    prompt:
      'How bold are you at initiating when you are in the mood?',
    leftLabel: 'Subtle hints & proximity — hoping you make the first real move',
    rightLabel: 'Unmistakable — hands on you, zero guesswork required',
    allowSpotlight: true
  },
  {
    id: 'spi_18',
    tier: 'spicy',
    prompt:
      'Showering together:',
    leftLabel: 'Logistical puzzle — somebody is always freezing outside the water',
    rightLabel: 'Underrated — soap, warm water, and wet skin are elite',
    allowSpotlight: true
  },
  {
    id: 'spi_19',
    tier: 'spicy',
    prompt:
      'Sleeping naked next to each other:',
    leftLabel: 'Cozy t-shirt / pajamas sleeper for comfort',
    rightLabel: 'Nothing between us — skin-on-skin all night',
    allowSpotlight: true
  },
  {
    id: 'spi_20',
    tier: 'spicy',
    prompt:
      'What kind of touch turns your brain off faster?',
    leftLabel: 'Feather-light fingertips, slow tracing & soft breaths',
    rightLabel: 'Firm grip — pulling me close by the waist, hips, or neck',
    allowSpotlight: true
  },
  {
    id: 'spi_21',
    tier: 'spicy',
    prompt:
      'Hotel sex vs. home bedroom sex:',
    leftLabel: 'Nothing beats the comfort of our own bed and pillows',
    rightLabel: 'Crisp hotel sheets + zero chores = 10x more uninhibited',
    allowSpotlight: true
  },
  {
    id: 'spi_22',
    tier: 'spicy',
    prompt:
      'Whispering what you want to do later while you are still in public or around other adults:',
    leftLabel: 'Play it cool until we are in the car',
    rightLabel: 'Whisper it right in my ear and watch me try to keep a straight face',
    allowSpotlight: true
  },
  {
    id: 'spi_23',
    tier: 'spicy',
    prompt:
      'How much does scent (cologne, perfume, warm skin right after a shower) trigger attraction for you?',
    leftLabel: 'Nice bonus, mostly visual and touch-driven',
    rightLabel: 'Primal shortcut — the right scent on your neck wrecks me',
    allowSpotlight: true
  },
  {
    id: 'spi_24',
    tier: 'spicy',
    prompt:
      'Sending or receiving a spicy private photo when one of us is away:',
    leftLabel: 'Too paranoid about cameras/cloud to ever relax into it',
    rightLabel: 'Huge turn-on — private eyes-only heat is electric',
    allowSpotlight: true
  },
  {
    id: 'spi_25',
    tier: 'spicy',
    prompt:
      'Kissing style preference when tension spikes:',
    leftLabel: 'Slow, soft, lingering & sensual',
    rightLabel: 'Hungry, breathless, lip-biting & urgent',
    allowSpotlight: true
  },
  {
    id: 'spi_26',
    tier: 'spicy',
    prompt:
      'Watching your partner get dressed / undressed across the bedroom:',
    leftLabel: 'Everyday routine — barely register it unless we are flirting',
    rightLabel: 'Still stop what I am doing to watch every single time',
    allowSpotlight: true
  },
  {
    id: 'spi_27',
    tier: 'spicy',
    prompt:
      'If your partner wakes you up in the middle of the night reaching for you:',
    leftLabel: 'Let me sleep — catch me in the morning',
    rightLabel: 'Half-asleep midnight tangles are ridiculously hot',
    allowSpotlight: true
  },
  {
    id: 'spi_28',
    tier: 'spicy',
    prompt:
      'Wearing something secretly sexy underneath normal daytime/dinner clothes and telling only your spouse:',
    leftLabel: 'Comfort wins most nights',
    rightLabel: 'Obsessed with the secret — instant main-character tension',
    allowSpotlight: true
  },
  {
    id: 'spi_29',
    tier: 'spicy',
    prompt:
      'How much mental warmup do you need to switch from "daytime parent/work brain" into "bedroom brain"?',
    leftLabel: 'Zero — I can go from 0 to 100 in thirty seconds flat',
    rightLabel: 'Give me 30 minutes of decompression, flirting & warmth first',
    allowSpotlight: true
  },
  {
    id: 'spi_30',
    tier: 'spicy',
    prompt:
      'Playful wrestling, pinning hands, or testing strength while making out:',
    leftLabel: 'Keep it tender, gentle, and smooth',
    rightLabel: 'Major turn-on — playful physicality sparks instant heat',
    allowSpotlight: true
  },
  {
    id: 'spi_31',
    tier: 'spicy',
    prompt:
      'Talking openly over drinks about what turned us on most last time we hooked up:',
    leftLabel: 'Slightly blush-inducing outside the bedroom',
    rightLabel: 'Incredibly sexy — guarantees round two happens tonight',
    allowSpotlight: true
  },
  {
    id: 'spi_32',
    tier: 'spicy',
    prompt:
      'Afternoon delight (daylight, locked door, middle of the day) vs. classic nighttime:',
    leftLabel: 'Nighttime creature — darkness and evening mood win',
    rightLabel: 'Daylight energy — awake, rested, and deliciously sneaky',
    allowSpotlight: true
  },
  {
    id: 'spi_33',
    tier: 'spicy',
    prompt:
      'Being pinned gently against a wall or closet door before even reaching the bed:',
    leftLabel: 'Take me straight to the mattress where it is comfortable',
    rightLabel: '10/10 cinematic — do not even make it to the bed first',
    allowSpotlight: true
  },
  {
    id: 'spi_34',
    tier: 'spicy',
    prompt:
      'Right now, how high is the unspoken flirtation meter in this room?',
    leftLabel: 'Cozy, relaxed lounge warmth',
    rightLabel: 'Counting the minutes until we put these phones down',
    allowSpotlight: true
  },
  {
    id: 'spi_35',
    tier: 'spicy',
    prompt:
      'After great intimacy, what is your ideal immediate aftermath?',
    leftLabel: 'Tangled limbs, heartbeats slowing down, quiet sleepy bliss',
    rightLabel: 'Playful Pillow Talk, laughing, water break & maybe round two',
    allowSpotlight: true
  },

  // ============================================================================
  // TIER 3: 💋 UNFILTERED NSFW (35 Questions — Full Adult Authenticity)
  // ============================================================================
  {
    id: 'nsfw_01',
    tier: 'nsfw',
    prompt:
      'In bed tonight, if neither of us held back an inch, where do you want to sit on the control spectrum?',
    leftLabel: 'Take complete control of me — guide my hands & tell me what to do',
    rightLabel: 'Put me in full command — let me pin, pace, and run the show',
    allowSpotlight: true
  },
  {
    id: 'nsfw_02',
    tier: 'nsfw',
    prompt:
      'Ideal pacing when we are both seriously turned on:',
    leftLabel: 'Slow, deep, drawn-out marathon where we edge for an hour',
    rightLabel: 'Fast, urgent, breathless quickie where neither of us can wait',
    allowSpotlight: true
  },
  {
    id: 'nsfw_03',
    tier: 'nsfw',
    prompt:
      'How unfiltered do you want the audio & dirty talk in bed?',
    leftLabel: 'Breathless sighs, eye contact, and occasional whispered praise',
    rightLabel: 'Filthy, explicit talk — tell me exactly what you are doing to me',
    allowSpotlight: true
  },
  {
    id: 'nsfw_04',
    tier: 'nsfw',
    prompt:
      'Morning sex before getting out of bed vs. late-night sex:',
    leftLabel: 'Warm, lazy morning sex wins every single time',
    rightLabel: 'Late-night, wide-awake, zero-restraint energy wins',
    allowSpotlight: true
  },
  {
    id: 'nsfw_05',
    tier: 'nsfw',
    prompt:
      'Bringing a vibrator or bedroom toy into sex together (not solo — as a team):',
    leftLabel: 'Prefer pure skin, hands, and mouths only',
    rightLabel: 'Huge fan — using toys on/with each other is insanely hot',
    allowSpotlight: true
  },
  {
    id: 'nsfw_06',
    tier: 'nsfw',
    prompt:
      'Putting on a silk blindfold so you cannot see where the next touch, kiss, or tongue is landing:',
    leftLabel: 'I want my eyes open seeing everything',
    rightLabel: 'Blindfold me tonight — heightened touch drives me wild',
    allowSpotlight: true
  },
  {
    id: 'nsfw_07',
    tier: 'nsfw',
    prompt:
      'Oral sex — giving vs. receiving when you are completely in the mood:',
    leftLabel: 'Melt back into the pillows and let you focus entirely on me',
    rightLabel: 'Obsessed with giving — watching & feeling you lose control',
    allowSpotlight: true
  },
  {
    id: 'nsfw_08',
    tier: 'nsfw',
    prompt:
      'Having sex somewhere in our house OTHER than the bed (couch, shower, kitchen counter, floor, chair):',
    leftLabel: 'King mattress loyalty — ergonomic perfection',
    rightLabel: 'Break in every room — change of scenery is an instant spark',
    allowSpotlight: true
  },
  {
    id: 'nsfw_09',
    tier: 'nsfw',
    prompt:
      'Hair-pulling, firm spanking, or leaving a hidden mark where clothes cover it tomorrow:',
    leftLabel: 'Keep touch passionate but gentle',
    rightLabel: 'Rougher edge & primal intensity turn me on massively',
    allowSpotlight: true
  },
  {
    id: 'nsfw_10',
    tier: 'nsfw',
    prompt:
      'In an ideal, stress-free week where sleep and schedules cooperated, what is your true dream frequency?',
    leftLabel: '1–2 intentional, lingering, unforgettable nights a week',
    rightLabel: '4–7+ times a week — quickies, mornings, nights, all of it',
    allowSpotlight: true
  },
  {
    id: 'nsfw_11',
    tier: 'nsfw',
    prompt:
      'Watching your partner touch themselves — or touching yourself right in front of them — as foreplay:',
    leftLabel: 'Makes me feel too watched / self-conscious',
    rightLabel: 'Ridiculously hot visual — major fantasy fuel',
    allowSpotlight: true
  },
  {
    id: 'nsfw_12',
    tier: 'nsfw',
    prompt:
      'Having your wrists held down above your head (or tied softly with a silk tie/scarf):',
    leftLabel: 'I need my hands free to grab and touch you back',
    rightLabel: 'Helplessly pinned & completely at your mercy = 100/100',
    allowSpotlight: true
  },
  {
    id: 'nsfw_13',
    tier: 'nsfw',
    prompt:
      'When it comes to positions during sex:',
    leftLabel: 'Give me our 2–3 undefeated signature positions that hit every time',
    rightLabel: 'Flip me, switch angles & try positions we rarely use',
    allowSpotlight: true
  },
  {
    id: 'nsfw_14',
    tier: 'nsfw',
    prompt:
      'Face-to-face intimacy (eye contact, kissing, bodies pressed flush) vs. from behind:',
    leftLabel: 'Deep face-to-face connection, chest-to-chest & kissing',
    rightLabel: 'From behind — deeper angle, hands on hips, primal heat',
    allowSpotlight: true
  },
  {
    id: 'nsfw_15',
    tier: 'nsfw',
    prompt:
      'Having to stay dead silent so nobody in the house (or next hotel room) hears a sound:',
    leftLabel: 'Frustrating — holding back ruins half the release',
    rightLabel: 'Weirdly electric — hand over mouth trying not to moan is hot',
    allowSpotlight: true
  },
  {
    id: 'nsfw_16',
    tier: 'nsfw',
    prompt:
      'How many secret bedroom curiosities or fantasies have you NEVER actually said out loud to me yet?',
    leftLabel: 'Zero — you already know every corner of my mind',
    rightLabel: 'More than you think — ask me nicely tonight and find out',
    allowSpotlight: true
  },
  {
    id: 'nsfw_17',
    tier: 'nsfw',
    prompt:
      'Positioning in front of a mirror (or hotel floor-to-ceiling reflection) where we can see ourselves:',
    leftLabel: 'Too distracting — I would rather focus on feeling than looking',
    rightLabel: 'Unbelievably sexy — watching us together hits different',
    allowSpotlight: true
  },
  {
    id: 'nsfw_18',
    tier: 'nsfw',
    prompt:
      'Praise kink ("You feel incredible / Look how good you take me") vs. teasing/bossy dirty talk:',
    leftLabel: 'Melt me with warm, obsessive praise and worship',
    rightLabel: 'Give me commanding, shameless, slightly bossy talk',
    allowSpotlight: true
  },
  {
    id: 'nsfw_19',
    tier: 'nsfw',
    prompt:
      'Spontaneous 5-minute sneak-away quickie when we barely have a window of privacy:',
    leftLabel: 'Wait until tonight when we actually have time to finish properly',
    rightLabel: 'Lock the bathroom/closet door right now — thrill of the steal',
    allowSpotlight: true
  },
  {
    id: 'nsfw_20',
    tier: 'nsfw',
    prompt:
      'Roleplay or adopting a playful "strangers at a hotel bar" persona on a getaway night:',
    leftLabel: 'I would burst out laughing in ten seconds flat',
    rightLabel: 'Secretly down to commit — pretending to pick each other up is hot',
    allowSpotlight: true
  },
  {
    id: 'nsfw_21',
    tier: 'nsfw',
    prompt:
      'Using ice cubes, warm massage oil, or temperature play during foreplay:',
    leftLabel: 'Skip the props — warm hands and mouth are unbeatable',
    rightLabel: 'Bring it to bed — sensory surprises wake up every nerve',
    allowSpotlight: true
  },
  {
    id: 'nsfw_22',
    tier: 'nsfw',
    prompt:
      'A night dedicated 100% to one person receiving (zero reciprocation allowed until tomorrow):',
    leftLabel: 'I prefer mutual give-and-take every time',
    rightLabel: 'Elite idea — taking turns spoiling one person senseless',
    allowSpotlight: true
  },
  {
    id: 'nsfw_23',
    tier: 'nsfw',
    prompt:
      'Lingerie / bedroom attire:',
    leftLabel: 'Honestly stays on for 12 seconds — naked skin wins anyway',
    rightLabel: 'Leave it half-on during the act — huge visual turn-on',
    allowSpotlight: true
  },
  {
    id: 'nsfw_24',
    tier: 'nsfw',
    prompt:
      'Edging — stopping right on the brink of finishing, twice, before finally letting go:',
    leftLabel: 'Do NOT stop when I am right there — let me finish!',
    rightLabel: 'Do it — makes the final release 10x more intense',
    allowSpotlight: true
  },
  {
    id: 'nsfw_25',
    tier: 'nsfw',
    prompt:
      'Vacation balcony / private hot tub / secluded outdoor spot after dark:',
    leftLabel: 'Strictly indoors behind heavy curtains',
    rightLabel: 'Bucket-list turn-on — night air + risk = unforgettable',
    allowSpotlight: true
  },
  {
    id: 'nsfw_26',
    tier: 'nsfw',
    prompt:
      'Sending explicit instructions earlier in the day ("Tonight at 9:30, be in bed wearing..."):',
    leftLabel: 'Prefer deciding together in the moment',
    rightLabel: 'Instant goosebumps — bossy pre-game texts work on me 100%',
    allowSpotlight: true
  },
  {
    id: 'nsfw_27',
    tier: 'nsfw',
    prompt:
      'Going for Round Two on the same night after catching our breath:',
    leftLabel: 'One incredible round and I am blissfully cooked',
    rightLabel: 'Give me 20 minutes and a sip of water — let us go again',
    allowSpotlight: true
  },
  {
    id: 'nsfw_28',
    tier: 'nsfw',
    prompt:
      'Watching something spicy/adult together to spark new ideas or build fast heat:',
    leftLabel: 'Not my vibe — prefer keeping the focus purely on us',
    rightLabel: 'Down to try it together — playful, bold, and zero shame',
    allowSpotlight: true
  },
  {
    id: 'nsfw_29',
    tier: 'nsfw',
    prompt:
      'How adventurous do you think our bedroom chemistry could still get compared to our boldest night ever?',
    leftLabel: 'We already know our sweet spot and hit it great',
    rightLabel: 'We have barely scratched 60% of what we could try together',
    allowSpotlight: true
  },
  {
    id: 'nsfw_30',
    tier: 'nsfw',
    prompt:
      'Waking up to oral or slow intimate touch before you are even fully awake (consensual pre-agreed free-use morning):',
    leftLabel: 'Let me brush my teeth and wake up first',
    rightLabel: 'Top-3 fantasy — best possible way to wake up on earth',
    allowSpotlight: true
  },
  {
    id: 'nsfw_31',
    tier: 'nsfw',
    prompt:
      'Who ends up on top when neither of us is overthinking:',
    leftLabel: 'Put me underneath — pin me into the pillows',
    rightLabel: 'Let me ride / stay on top and set the exact rhythm and depth',
    allowSpotlight: true
  },
  {
    id: 'nsfw_32',
    tier: 'nsfw',
    prompt:
      'Direct physical guidance in the moment ("Right there / Harder / Slower / Don\'t move"):',
    leftLabel: 'Sometimes hold back so I do not interrupt the flow',
    rightLabel: 'Direct, shameless real-time coaching makes sex 100x better',
    allowSpotlight: true
  },
  {
    id: 'nsfw_33',
    tier: 'nsfw',
    prompt:
      'Teasing under a blanket on the couch before we even turn off the TV:',
    leftLabel: 'Let us pause the movie and go properly to the bedroom',
    rightLabel: 'Start right there on the couch — movie is forgotten anyway',
    allowSpotlight: true
  },
  {
    id: 'nsfw_34',
    tier: 'nsfw',
    prompt:
      'Making a private high-stakes bet during date night where the winner gets whatever bedroom request they name:',
    leftLabel: 'No bets needed — just ask for what you want',
    rightLabel: 'Competitive stakes make the payoff way hotter',
    allowSpotlight: true
  },
  {
    id: 'nsfw_35',
    tier: 'nsfw',
    prompt:
      'Be completely honest: right now, what are the odds clothes come off as soon as this game wraps?',
    leftLabel: '50/50 — cozy cuddles & deep talk might win tonight',
    rightLabel: '100% — finish this round and lock the bedroom door',
    allowSpotlight: true
  }
];

export function getSeenQuestionIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(VELVET_SEEN_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return new Set(parsed.filter((item): item is string => typeof item === 'string'));
    }
  } catch {
    // Ignore localStorage parse errors
  }
  return new Set();
}

export function markQuestionSeen(questionId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const seen = getSeenQuestionIds();
    seen.add(questionId);
    window.localStorage.setItem(VELVET_SEEN_STORAGE_KEY, JSON.stringify(Array.from(seen)));
  } catch {
    // Ignore storage quota errors
  }
}

function clearSeenIdsForTier(tier: QuestionTier): Set<string> {
  const seen = getSeenQuestionIds();
  for (const q of VELVET_QUESTIONS) {
    if (q.tier === tier) {
      seen.delete(q.id);
    }
  }
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(VELVET_SEEN_STORAGE_KEY, JSON.stringify(Array.from(seen)));
    } catch {
      // Ignore
    }
  }
  return seen;
}

/**
 * Selects the target tier for a round based on active decks and whether
 * Progressive Heat vs. Pure Shuffle is enabled.
 */
export function pickTargetTierForRound(
  settings: LobbySettings,
  roundNumber: number
): QuestionTier {
  const orderedEnabled: QuestionTier[] = (['romantic', 'spicy', 'nsfw'] as QuestionTier[]).filter(
    (t) => settings.tiers[t]
  );

  if (orderedEnabled.length === 0) {
    return 'romantic';
  }
  if (orderedEnabled.length === 1) {
    return orderedEnabled[0];
  }

  const heatMode: HeatProgressionMode = settings.heatMode;
  if (heatMode === 'shuffle') {
    const idx = Math.floor(Math.random() * orderedEnabled.length);
    return orderedEnabled[idx];
  }

  // Progressive Heat: smoothly climb from mildest enabled tier -> hottest enabled tier!
  const totalSpan =
    settings.gameLength === 10
      ? 10
      : settings.gameLength === 20
      ? 20
      : 12; // In Endless Lounge, ramp across rounds 1..12 then stay warm/hot!

  if (settings.gameLength === 'endless' && roundNumber > 12) {
    // After ramping up in Endless Lounge, favor the top 2 hottest enabled tiers (70% hottest, 30% second-hottest)
    const hottest = orderedEnabled[orderedEnabled.length - 1];
    const runnerUp = orderedEnabled[Math.max(0, orderedEnabled.length - 2)];
    return Math.random() < 0.7 ? hottest : runnerUp;
  }

  const progress = Math.min(0.999, Math.max(0, (roundNumber - 1) / totalSpan));
  const tierIdx = Math.min(
    orderedEnabled.length - 1,
    Math.floor(progress * orderedEnabled.length)
  );
  return orderedEnabled[tierIdx];
}

/**
 * Draws the next question prioritizing unseen prompts in `localStorage` (`velvet_seen_q_v1`),
 * avoiding any questions already played in the current session (`sessionUsedIds`),
 * and respecting `requireSpotlightCompatible` when a Spotlight ("Read My Mind") round is rolled.
 */
export function drawNextQuestion(
  settings: LobbySettings,
  roundNumber: number,
  sessionUsedIds: Set<string>,
  requireSpotlightCompatible: boolean
): VelvetQuestion {
  const targetTier = pickTargetTierForRound(settings, roundNumber);
  const enabledTiers = (['romantic', 'spicy', 'nsfw'] as QuestionTier[]).filter(
    (t) => settings.tiers[t]
  );
  const activePoolTiers: QuestionTier[] = enabledTiers.length > 0 ? enabledTiers : ['romantic'];

  let seen = getSeenQuestionIds();

  const getCandidates = (tiers: QuestionTier[], mustBeUnseen: boolean, mustSpotlight: boolean) =>
    VELVET_QUESTIONS.filter((q) => {
      if (!tiers.includes(q.tier)) return false;
      if (sessionUsedIds.has(q.id)) return false;
      if (mustSpotlight && !q.allowSpotlight) return false;
      if (mustBeUnseen && seen.has(q.id)) return false;
      return true;
    });

  // 1. Ideal match: targetTier + unseen + spotlight constraint
  let candidates = getCandidates([targetTier], true, requireSpotlightCompatible);

  // 2. If targetTier ran out of unseen questions in localStorage, reset seen status for targetTier!
  if (candidates.length === 0) {
    const anyInTargetSessionUnused = getCandidates([targetTier], false, requireSpotlightCompatible);
    if (anyInTargetSessionUnused.length > 0) {
      seen = clearSeenIdsForTier(targetTier);
      candidates = getCandidates([targetTier], true, requireSpotlightCompatible);
    }
  }

  // 3. Fallback across any enabled tier (unseen first)
  if (candidates.length === 0) {
    candidates = getCandidates(activePoolTiers, true, requireSpotlightCompatible);
  }

  // 4. Fallback ignoring seen history across enabled tiers
  if (candidates.length === 0) {
    candidates = getCandidates(activePoolTiers, false, requireSpotlightCompatible);
  }

  // 5. Fallback relaxing spotlight constraint if ever needed
  if (candidates.length === 0) {
    candidates = VELVET_QUESTIONS.filter(
      (q) => activePoolTiers.includes(q.tier) && !sessionUsedIds.has(q.id)
    );
  }

  if (candidates.length === 0) {
    candidates = VELVET_QUESTIONS.filter((q) => activePoolTiers.includes(q.tier));
  }

  const chosen = candidates[Math.floor(Math.random() * candidates.length)] ?? VELVET_QUESTIONS[0];
  markQuestionSeen(chosen.id);
  return chosen;
}

/**
 * Generates verdict banner & a playful, tailored conversation sub-prompt for the TV & phones.
 */
export function evaluateRoundVerdict(
  question: VelvetQuestion,
  mode: RoundMode,
  spotlightTarget: PlayerId | null,
  robertVal: number,
  ritaVal: number
): {
  gap: number;
  roundSync: number;
  verdictKey: 'bullseye' | 'sync' | 'intriguing' | 'wild';
  verdictBanner: string;
  discussionSubPrompt: string;
  predictorBonusText: string | null;
} {
  const gap = Math.abs(robertVal - ritaVal);
  const roundSync = Math.round(Math.max(0, 100 - gap * 1.25));

  let verdictKey: 'bullseye' | 'sync' | 'intriguing' | 'wild';
  let verdictBanner: string;

  if (gap <= 5) {
    verdictKey = 'bullseye';
    verdictBanner = '🔥 SOULMATE BULLSEYE!';
  } else if (gap <= 15) {
    verdictKey = 'sync';
    verdictBanner = '✨ LOCKED IN SYNC';
  } else if (gap <= 30) {
    verdictKey = 'intriguing';
    verdictBanner = '🍷 INTRIGUING GAP — COMPARE NOTES';
  } else {
    verdictKey = 'wild';
    verdictBanner = '🌶️ WILDLY DIFFERENT WAVELENGTHS — EXPLAIN YOURSELVES!';
  }

  let predictorBonusText: string | null = null;
  let discussionSubPrompt = '';

  if (mode === 'spotlight' && spotlightTarget) {
    const targetName = spotlightTarget === 'robert' ? 'Robert' : 'Rita';
    const predictorName = spotlightTarget === 'robert' ? 'Rita' : 'Robert';
    const targetVal = spotlightTarget === 'robert' ? robertVal : ritaVal;
    const predictedVal = spotlightTarget === 'robert' ? ritaVal : robertVal;

    if (gap <= 5) {
      predictorBonusText = `${predictorName} read ${targetName}'s mind within ${gap} ${gap === 1 ? 'point' : 'points'}! (+${roundSync} Mind-Reader Pts)`;
      discussionSubPrompt = `${predictorName} knows ${targetName} frighteningly well (${predictedVal} vs ${targetVal}). ${targetName} — tell ${predictorName} what gave you away!`;
    } else if (gap <= 15) {
      predictorBonusText = `${predictorName} dialed right into ${targetName}'s wavelength! (+${roundSync} Mind-Reader Pts)`;
      discussionSubPrompt = `Almost telepathic! ${targetName}, explain why you landed at ${targetVal} instead of ${predictedVal}.`;
    } else {
      const overUnder = predictedVal > targetVal ? 'higher' : 'lower';
      predictorBonusText = `${predictorName} guessed ${Math.abs(predictedVal - targetVal)} pts ${overUnder} than ${targetName}'s true answer (+${roundSync} Pts)`;
      discussionSubPrompt = `Plot twist! ${predictorName} pegged ${targetName} at ${predictedVal}, while ${targetName} actually picked ${targetVal}. Unpack that surprise!`;
    }
  } else {
    // Shared Compatibility Spectrum
    if (gap <= 5) {
      const sideDesc =
        (robertVal + ritaVal) / 2 >= 65
          ? `leaning strongly toward "${question.rightLabel}"`
          : (robertVal + ritaVal) / 2 <= 35
          ? `leaning strongly toward "${question.leftLabel}"`
          : 'meeting right in the sweet spot';
      discussionSubPrompt = `Only ${gap} ${gap === 1 ? 'point' : 'points'} apart — both ${sideDesc}. Take a victory sip and talk about why this hits so similarly for both of you.`;
    } else if (gap <= 15) {
      discussionSubPrompt = `Robert (${robertVal}) and Rita (${ritaVal}) are right in the same pocket. What keeps that 5–15 point nuance lively between you two?`;
    } else if (gap <= 30) {
      const higherName = robertVal > ritaVal ? 'Robert' : 'Rita';
      const lowerName = robertVal > ritaVal ? 'Rita' : 'Robert';
      discussionSubPrompt = `${higherName} pulled toward 100 (${Math.max(robertVal, ritaVal)}) while ${lowerName} stayed closer to 0 (${Math.min(robertVal, ritaVal)}). Where do you two meet in the middle tonight?`;
    } else {
      const rightChampion = robertVal > ritaVal ? 'Robert' : 'Rita';
      const leftChampion = robertVal > ritaVal ? 'Rita' : 'Robert';
      discussionSubPrompt = `A ${gap}-point spread! ${leftChampion} anchored at ${Math.min(robertVal, ritaVal)} while ${rightChampion} went all the way to ${Math.max(robertVal, ritaVal)}. Floor is open — make your case!`;
    }
  }

  return {
    gap,
    roundSync,
    verdictKey,
    verdictBanner,
    discussionSubPrompt,
    predictorBonusText
  };
}
