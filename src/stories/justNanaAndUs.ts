/**
 * justNanaAndUs.ts
 * ----------------
 * Our flagship 9-spread heirloom Living Books interactive storybook:
 * "To Nana and Papa's House We Go! (A Michigan Adventure)"
 *
 * All hotspot coordinates are aligned to the 1280x720 logical stage of the
 * 2752x1536 Hi-Bit Pixel Art illustrations in `public/assets/stories/nana/`.
 */

import { StoryCartridge } from './storyTypes';

export const JUST_NANA_AND_US: StoryCartridge = {
  id: 'just-nana-and-us',
  title: "To Nana and Papa's House We Go!",
  subtitle: 'A Michigan Adventure',
  coverEmoji: '🏡',
  accentColor: 0xf59e0b,
  pages: [
    // =========================================================================
    // SPREAD 1 (INDEX 0): Heirloom Leather & Gold-Leaf Cover Page (cover-bg.jpg)
    // =========================================================================
    {
      pageNumber: 1,
      title: "To Nana and Papa's House We Go!",
      theme: 'nana-cover',
      backgroundSrc: '/assets/stories/nana/cover-bg.jpg',
      narrationAudioSrc: '/assets/stories/nana/audio/cover-narration.mp3',
      words: [],
      hotspots: []
    },

    // =========================================================================
    // SPREAD 2 (INDEX 1): Touchdown at the Airport (Aligned to p1-bg-clean.jpg)
    // =========================================================================
    {
      pageNumber: 2,
      title: 'Page 1: Touchdown at the Airport!',
      theme: 'nana-p1-airport',
      backgroundSrc: '/assets/stories/nana/p1-bg-clean.jpg',
      narrationAudioSrc: '/assets/stories/nana/audio/p1-narration.mp3',
      narrationDurationMs: 7200,
      words: [
        'Our',
        'big',
        'airplane',
        'landed',
        'with',
        'a',
        'zoom,',
        'and',
        'Nana',
        'and',
        'Papa',
        'gave',
        'Wyatt',
        'and',
        'Emma',
        'the',
        'biggest',
        'hug!'
      ],
      // Acoustic envelope timings (ms) extracted from Spuds Oxley's p1-narration.mp3 (7,236ms)
      wordTimings: [
        50,   // Our
        470,  // big
        655,  // airplane
        1200, // landed
        1645, // with
        1775, // a
        1855, // zoom, (followed by 390ms dramatic story pause)
        3110, // and
        3320, // Nana
        3865, // and
        4125, // Papa
        4415, // gave
        4650, // Wyatt
        5040, // and
        5225, // Emma (followed by 260ms breath pause)
        6035, // the
        6245, // biggest
        6635  // hug!
      ],
      hotspots: [
        {
          id: 'p1-baggage-doggie',
          label: 'Doggie in Sunglasses on Orange Suitcase',
          x: 245,
          y: 505,
          width: 155,
          height: 155,
          propType: 'baggage-doggie',
          gagAnimation: 'jump-flip',
          sfx: 'doggie-shades',
          popText: 'Cool Shades Doggie! 🕶️🐶',
          speechLine: 'Arf-squeak! Doggie hopped on the orange suitcase wearing his cool airport sunglasses!',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-doggie-bark.mp3',
          particleColors: [0xf97316, 0xfde047, 0x38bdf8, 0xffffff],
          variations: [
            {
              gagAnimation: 'jump-flip',
              sfx: 'doggie-shades',
              popText: 'Cool Shades Doggie! 🕶️🐶',
              speechLine: 'Arf-squeak!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-doggie-bark.mp3'
            },
            {
              gagAnimation: 'wobble-spin',
              sfx: 'doggie-shades',
              popText: 'Suitcase Wiggle Dance! 🧳✨',
              speechLine: 'Wiggle-squeak!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-doggie-bark.mp3'
            },
            {
              gagAnimation: 'peek-a-boo',
              sfx: 'doggie',
              popText: 'VIP Star Shades Pop! ⭐🐾',
              speechLine: 'Woof-squeak!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-doggie-bark.mp3'
            }
          ]
        },
        {
          id: 'p1-carousel-suitcases',
          label: 'Green & Blue Suitcases on Carousel',
          x: 455,
          y: 525,
          width: 155,
          height: 115,
          propType: 'carousel-suitcases',
          gagAnimation: 'suitcases-slide',
          sfx: 'carousel-rumble',
          popText: 'Rumble-Slide! Stickers! 🧳🏷️',
          speechLine: 'Rumble-bump-pop!',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-carousel.mp3',
          particleColors: [0x22c55e, 0x38bdf8, 0xfacc15, 0xf472b6],
          variations: [
            {
              gagAnimation: 'suitcases-slide',
              sfx: 'carousel-rumble',
              popText: 'Rumble-Slide! Stickers! 🧳🏷️',
              speechLine: 'Rumble-bump-pop!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-carousel.mp3'
            },
            {
              gagAnimation: 'conga-hop',
              sfx: 'carousel-rumble',
              popText: 'Luggage Conveyor Hop! 🏖️',
              speechLine: 'Rumble-boing!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-carousel.mp3'
            },
            {
              gagAnimation: 'squash-pop',
              sfx: 'boing',
              popText: 'Packed With Beach Toys! 🎶',
              speechLine: 'Boing-thump!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-carousel.mp3'
            }
          ]
        },
        {
          id: 'p1-nana-papa-hug',
          label: 'Nana, Papa, Wyatt & Emma Giant Airport Hug',
          x: 885,
          y: 515,
          width: 550,
          height: 410,
          propType: 'nana-papa-hug',
          gagAnimation: 'hug-hearts',
          sfx: 'hug-chord',
          popText: 'Giant Family Hug! ❤️💖',
          speechLine: 'Love you Nana Papa!',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-wyatt-iloveyou.m4a',
          particleColors: [0xf43f5e, 0xf472b6, 0xfbbf24, 0xffffff],
          variations: [
            {
              gagAnimation: 'hug-hearts',
              sfx: 'hug-chord',
              popText: 'Giant Family Hug! ❤️💖',
              speechLine: 'Love you Nana Papa!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-wyatt-iloveyou.m4a'
            },
            {
              gagAnimation: 'hug-hearts',
              sfx: 'giggle',
              popText: 'Heart Fountain Giggles! 🥰✨',
              speechLine: 'Love you Nana Papa!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-wyatt-iloveyou.m4a'
            },
            {
              gagAnimation: 'hug-hearts',
              sfx: 'hug-chord',
              popText: 'Ten Cheek Kisses! 💕🌟',
              speechLine: 'Love you Nana Papa!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-wyatt-iloveyou.m4a'
            }
          ]
        },
        {
          id: 'p1-sparky-window',
          label: 'Sparky the Cloud Dragon Outside Window',
          x: 740,
          y: 235,
          width: 210,
          height: 135,
          propType: 'sparky',
          gagAnimation: 'fly-circle',
          sfx: 'sparky',
          popText: 'Cloud Dragon Magic! 🐉✨',
          speechLine: 'Roar-twinkle!',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-sparky-wings.mp3',
          particleColors: [0x10b981, 0x34d399, 0xfbbf24, 0xfef08a],
          variations: [
            {
              gagAnimation: 'fly-circle',
              sfx: 'sparky',
              popText: 'Cloud Dragon Magic! 🐉✨',
              speechLine: 'Roar-twinkle!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-sparky-wings.mp3'
            },
            {
              gagAnimation: 'sparkle-sneeze',
              sfx: 'sparky',
              popText: 'Emerald & Gold Dust! ☁️💛',
              speechLine: 'Twinkle-puff!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-sparky-wings.mp3'
            },
            {
              gagAnimation: 'jump-flip',
              sfx: 'sparky',
              popText: 'Sky Cloud Somersault! 🌟',
              speechLine: 'Wheee!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-sparky-wings.mp3'
            }
          ]
        },
        {
          id: 'p1-runway-jet',
          label: 'White & Blue Passenger Jet on Runway',
          x: 390,
          y: 365,
          width: 420,
          height: 145,
          propType: 'runway-jet',
          gagAnimation: 'jet-nose-tilt',
          sfx: 'jet-whoosh',
          popText: 'WHOOOSH! Takeoff! ✈️💨',
          speechLine: 'Whoooooosh!',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-jet-takeoff.mp3',
          particleColors: [0x38bdf8, 0xe0f2fe, 0xffffff],
          variations: [
            {
              gagAnimation: 'jet-nose-tilt',
              sfx: 'jet-whoosh',
              popText: 'WHOOOSH! Takeoff! ✈️💨',
              speechLine: 'Whoooooosh!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-jet-takeoff.mp3'
            },
            {
              gagAnimation: 'drive-zoom',
              sfx: 'jet-whoosh',
              popText: 'Turbine Sky Climb! 👨‍✈️',
              speechLine: 'Whirrrr-whoosh!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-jet-takeoff.mp3'
            },
            {
              gagAnimation: 'jet-nose-tilt',
              sfx: 'jet-whoosh',
              popText: 'Runway Exhaust Swirl! 🌬️',
              speechLine: 'Whoooosh!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-jet-takeoff.mp3'
            }
          ]
        },
        {
          id: 'p1-flight-board',
          label: 'Retro Split-Flap ARRIVALS Sign',
          x: 335,
          y: 158,
          width: 290,
          height: 80,
          propType: 'flight-board',
          gagAnimation: 'split-flap-jitter',
          sfx: 'split-flap',
          popText: 'CLACK-CLACK! ARRIVALS! 🪧',
          speechLine: 'Clack-clack-clack!',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-flap-board.mp3',
          particleColors: [0xfacc15, 0xfef08a, 0x38bdf8],
          variations: [
            {
              gagAnimation: 'split-flap-jitter',
              sfx: 'split-flap',
              popText: '🪧 HI WYATT!',
              speechLine: 'HI WYATT!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-flap-board.mp3'
            },
            {
              gagAnimation: 'split-flap-jitter',
              sfx: 'split-flap',
              popText: '🪧 HI EMMA!',
              speechLine: 'HI EMMA!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-flap-board.mp3'
            },
            {
              gagAnimation: 'split-flap-jitter',
              sfx: 'split-flap',
              popText: '🪧 LUV NANA!',
              speechLine: 'LUV NANA!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-flap-board.mp3'
            }
          ]
        },
        {
          id: 'p1-grr-sign',
          label: 'GRR / Grand Rapids Terminal Sign',
          x: 1205,
          y: 225,
          width: 140,
          height: 115,
          propType: 'grr-terminal-sign',
          gagAnimation: 'wobble-spin',
          sfx: 'airport-chime',
          popText: 'Ding-Dong! Welcome to GRR! 🔔',
          speechLine: 'Ding-dong-ding!',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-airport-chime.mp3',
          particleColors: [0x38bdf8, 0xfbbf24, 0xffffff],
          variations: [
            {
              gagAnimation: 'wobble-spin',
              sfx: 'airport-chime',
              popText: 'Ding-Dong! Welcome to GRR! 🔔',
              speechLine: 'Ding-dong-ding!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-airport-chime.mp3'
            },
            {
              gagAnimation: 'squash-pop',
              sfx: 'airport-chime',
              popText: 'GRR Means Dragon Roar! 🐉',
              speechLine: 'Ding-dong-ding!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-airport-chime.mp3'
            },
            {
              gagAnimation: 'jump-flip',
              sfx: 'airport-chime',
              popText: 'Pure Michigan Sunshine! ☀️',
              speechLine: 'Ding-dong-ding!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-airport-chime.mp3'
            }
          ]
        }
      ]
    },

    // =========================================================================
    // SPREAD 3 (INDEX 2): Nana's House in Zeeland (Aligned to p2-bg-clean.jpg)
    // =========================================================================
    {
      pageNumber: 3,
      title: "Page 2: Nana's Cozy House in Zeeland!",
      theme: 'nana-p2-zeeland-house',
      backgroundSrc: '/assets/stories/nana/p2-bg-clean.jpg',
      narrationAudioSrc: '/assets/stories/nana/audio/p2-narration.mp3',
      narrationDurationMs: 6530,
      words: [
        'We',
        'zoomed',
        'around',
        'the',
        'horseshoe',
        'driveway',
        'to',
        "Nana's",
        'house',
        'in',
        'Zeeland,',
        'under',
        'the',
        'giant',
        'shady',
        'tree!'
      ],
      // Acoustic envelope timings (ms) extracted from Spuds Oxley's p2-narration.mp3 (6,531ms)
      wordTimings: [
        30,   // We
        210,  // zoomed
        755,  // around
        1095, // the
        1200, // horseshoe
        1695, // driveway
        2270, // to
        2480, // Nana's
        2900, // house
        3290, // in
        3420, // Zeeland, (followed by comma pause at 3814ms)
        3915, // under
        4150, // the
        4335, // giant
        4725, // shady
        5275  // tree!
      ],
      hotspots: [
        {
          id: 'p2-porch',
          label: 'Front Porch Nana & Papa Wave',
          x: 612,
          y: 392,
          width: 92,
          height: 108,
          propType: 'front-porch-papa',
          gagAnimation: 'hug-hearts',
          sfx: 'chime',
          popText: 'Welcome to Nana’s House! 👋🏡',
          speechLine: 'Come on inside, Wyatt and Emma! Nana and Papa are waving from the front porch!',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-porch-wave.mp3',
          particleColors: [0xfbbf24, 0xf43f5e, 0xffffff],
          variations: [
            {
              gagAnimation: 'hug-hearts',
              sfx: 'chime',
              popText: 'Welcome to Nana’s House! 👋🏡',
              speechLine: 'Come on inside, Wyatt and Emma!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-porch-wave.mp3'
            },
            {
              gagAnimation: 'squash-pop',
              sfx: 'fanfare',
              popText: 'Porch Bell Ring-a-Ling! 🔔',
              speechLine: 'Ding-dong!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-porch-wave.mp3'
            },
            {
              gagAnimation: 'jump-flip',
              sfx: 'giggle',
              popText: 'Double Porch Wave! 🌟',
              speechLine: 'Hooray!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-porch-wave.mp3'
            }
          ]
        },
        {
          id: 'p2-kids',
          label: 'Wyatt & Emma Running up the Horseshoe Driveway',
          x: 354,
          y: 461,
          width: 118,
          height: 116,
          propType: 'horseshoe-driveway',
          gagAnimation: 'drive-zoom',
          sfx: 'giggle',
          popText: 'Zoom up the Driveway! 🏃‍♂️🏃‍♀️',
          speechLine: "We're here!",
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-kids-run.mp3',
          particleColors: [0x38bdf8, 0xfacc15, 0xffffff],
          variations: [
            {
              gagAnimation: 'drive-zoom',
              sfx: 'giggle',
              popText: 'Zoom up the Driveway! 🏃‍♂️🏃‍♀️',
              speechLine: "We're here!",
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-kids-run.mp3'
            },
            {
              gagAnimation: 'jump-flip',
              sfx: 'boing',
              popText: 'Green Boot Super Jump! 🥾✨',
              speechLine: "We're here!",
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-kids-run.mp3'
            },
            {
              gagAnimation: 'conga-hop',
              sfx: 'fanfare',
              popText: 'Race to the Porch! 🏁',
              speechLine: "We're here!",
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-kids-run.mp3'
            }
          ]
        },
        {
          id: 'p2-mailbox',
          label: 'White Mailbox & Singing Bluebirds',
          x: 979,
          y: 501,
          width: 115,
          height: 135,
          propType: 'white-mailbox',
          gagAnimation: 'peek-a-boo',
          sfx: 'cuckoo',
          popText: 'Tweet-Tweet! Special Mail! 📬🐦',
          speechLine: 'Tweet-tweet-ding! The two little bluebirds on the white mailbox sang a welcome song!',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-mailbox-birds.mp3',
          particleColors: [0x38bdf8, 0xef4444, 0xfef08a],
          variations: [
            {
              gagAnimation: 'peek-a-boo',
              sfx: 'cuckoo',
              popText: 'Tweet-Tweet! Special Mail! 📬🐦',
              speechLine: 'Tweet-tweet-ding!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-mailbox-birds.mp3'
            },
            {
              gagAnimation: 'inflate-pop',
              sfx: 'pop',
              popText: 'Postcard from Sparky! 💌',
              speechLine: 'Pop-tweet!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-mailbox-birds.mp3'
            },
            {
              gagAnimation: 'wobble-spin',
              sfx: 'chime',
              popText: 'Bluebird Harmony Duet! 🎵',
              speechLine: 'Chirp-chirp-hooray!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-mailbox-birds.mp3'
            }
          ]
        },
        {
          id: 'p2-squirrel',
          label: 'Two Giant Shade Tree Squirrels',
          x: 665,
          y: 195,
          width: 340,
          height: 150,
          propType: 'pine-squirrel',
          gagAnimation: 'jump-flip',
          sfx: 'crunch',
          popText: 'Acorn Juggle! 🐿️🌰',
          speechLine: 'Chitter-chatter! Two fluffy Zeeland squirrels played catch with golden acorns high in the shade tree!',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-squirrels.mp3',
          particleColors: [0xf97316, 0x22c55e, 0xfde047],
          variations: [
            {
              gagAnimation: 'jump-flip',
              sfx: 'crunch',
              popText: 'Acorn Juggle! 🐿️🌰',
              speechLine: 'Chitter-chatter!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-squirrels.mp3'
            },
            {
              gagAnimation: 'peek-a-boo',
              sfx: 'boing',
              popText: 'Leaf Parachute! 🍃',
              speechLine: 'Chitter-rustle!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-squirrels.mp3'
            },
            {
              gagAnimation: 'wobble-spin',
              sfx: 'giggle',
              popText: 'Treehouse Acorn Toss! 🥁',
              speechLine: 'Rat-a-tat-tat!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-squirrels.mp3'
            }
          ]
        },
        {
          id: 'p2-sparky-bush',
          label: 'Sparky Peeking Behind Weeping Garden Shrub',
          x: 992,
          y: 382,
          width: 120,
          height: 105,
          propType: 'sparky',
          gagAnimation: 'peek-a-boo',
          sfx: 'sparky',
          popText: 'Peek-a-Boo Sparky! 🐉🌿',
          speechLine: 'Roar-twinkle! Sparky popped out from behind Nana’s weeping garden bush!',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-sparky-wings.mp3',
          particleColors: [0x10b981, 0x34d399, 0xfbbf24, 0xfef08a],
          variations: [
            {
              gagAnimation: 'peek-a-boo',
              sfx: 'sparky',
              popText: 'Peek-a-Boo Sparky! 🐉🌿',
              speechLine: 'Roar-twinkle!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-sparky-wings.mp3'
            },
            {
              gagAnimation: 'sparkle-sneeze',
              sfx: 'sparky',
              popText: 'Emerald Garden Sparkles! ✨',
              speechLine: 'Twinkle-puff!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-sparky-wings.mp3'
            },
            {
              gagAnimation: 'jump-flip',
              sfx: 'sparky',
              popText: 'Dragon Bush Pop! 🌟',
              speechLine: 'Wheee!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-sparky-wings.mp3'
            }
          ]
        },
        {
          id: 'p2-doggie-bush',
          label: 'Doggie Peeking Behind Left Driveway Bush',
          x: 458,
          y: 428,
          width: 110,
          height: 95,
          propType: 'doggie',
          gagAnimation: 'peek-a-boo',
          sfx: 'doggie',
          popText: 'Bush Peeker Doggie! 🐶🌿',
          speechLine: 'Arf-squeak! Doggie popped up from behind the green bush!',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-doggie-bark.mp3',
          particleColors: [0xffffff, 0x4ade80, 0xfacc15, 0x38bdf8],
          variations: [
            {
              gagAnimation: 'peek-a-boo',
              sfx: 'doggie',
              popText: 'Bush Peeker Doggie! 🐶🌿',
              speechLine: 'Arf-squeak!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-doggie-bark.mp3'
            },
            {
              gagAnimation: 'jump-flip',
              sfx: 'doggie',
              popText: 'Bouncy Bush Bark! 🐾',
              speechLine: 'Woof-squeak!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-doggie-bark.mp3'
            },
            {
              gagAnimation: 'wobble-spin',
              sfx: 'doggie',
              popText: 'Happy Tail Wag! ⭐',
              speechLine: 'Arf-arf!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-doggie-bark.mp3'
            }
          ]
        },
        {
          id: 'p2-maple-leaves',
          label: 'Red Maple Tree Leaf Shower & Cardinal',
          x: 98,
          y: 385,
          width: 195,
          height: 225,
          propType: 'red-maple-leaves',
          gagAnimation: 'splash-arc',
          sfx: 'splash',
          popText: 'Red Maple Leaf Shower! 🐦🍁',
          speechLine: 'Whoosh-rustle! Crimson maple leaves drifted down and a red cardinal hopped out!',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-maple-leaves.mp3',
          particleColors: [0xef4444, 0xf97316, 0xfacc15, 0xdc2626],
          variations: [
            {
              gagAnimation: 'splash-arc',
              sfx: 'splash',
              popText: 'Red Maple Leaf Shower! 🐦🍁',
              speechLine: 'Whoosh-rustle!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-maple-leaves.mp3'
            },
            {
              gagAnimation: 'wobble-spin',
              sfx: 'cuckoo',
              popText: 'Cardinal Peek-a-Boo! 🐦',
              speechLine: 'Chirp-rustle!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-maple-leaves.mp3'
            },
            {
              gagAnimation: 'fly-circle',
              sfx: 'chime',
              popText: 'Swirling Autumn Breeze! 🍂',
              speechLine: 'Swish-whoosh!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-maple-leaves.mp3'
            }
          ]
        }
      ]
    },

    // =========================================================================
    // SPREAD 4 (INDEX 3): Grammy's Big Cozy Chair (Aligned 1:1 to p3-bg.jpg)
    // =========================================================================
    {
      pageNumber: 4,
      title: "Page 3: Grammy's Big Cozy Chair!",
      theme: 'nana-p3-grammy-chair',
      backgroundSrc: '/assets/stories/nana/p3-bg-clean.jpg',
      narrationAudioSrc: '/assets/stories/nana/audio/p3-narration.mp3',
      narrationDurationMs: 5800,
      words: [
        'We',
        'snuggled',
        'into',
        "Grammy's",
        'big',
        'cozy',
        'chair',
        'for',
        'warm',
        'hugs,',
        'sweet',
        'cookies,',
        'and',
        'giggles!'
      ],
      wordTimings: [
        80,   // We
        420,  // snuggled
        860,  // into
        1280, // Grammy's
        1760, // big
        2140, // cozy
        2580, // chair
        3020, // for
        3380, // warm
        3780, // hugs,
        4260, // sweet
        4680, // cookies,
        5160, // and
        5460  // giggles!
      ],
      hotspots: [
        {
          id: 'p3-clock',
          label: 'Carved Wooden Cuckoo Clock on Left Wall',
          x: 75,
          y: 250,
          width: 125,
          height: 225,
          propType: 'cuckoo-clock',
          gagAnimation: 'peek-a-boo',
          sfx: 'cuckoo',
          popText: 'Cuck-oo! Cuck-oo! 🕰️🐦',
          speechLine: 'Tick-tock, cuck-oo!',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-cuckoo-clock.mp3',
          particleColors: [0xfbbf24, 0x38bdf8, 0xfef08a],
          variations: [
            {
              gagAnimation: 'peek-a-boo',
              sfx: 'cuckoo',
              popText: 'Cuck-oo! Cuck-oo! 🕰️🐦',
              speechLine: 'Tick-tock, cuck-oo!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-cuckoo-clock.mp3'
            },
            {
              gagAnimation: 'wobble-spin',
              sfx: 'chime',
              popText: 'Swinging Pinecones! ⏰',
              speechLine: 'Tick-tock-ding!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-cuckoo-clock.mp3'
            },
            {
              gagAnimation: 'jump-flip',
              sfx: 'cuckoo',
              popText: 'Wooden Bluebird Song! 🎵',
              speechLine: 'Cuck-oo!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-cuckoo-clock.mp3'
            }
          ]
        },
        {
          id: 'p3-doggie',
          label: 'Doggie in Sunglasses Below the Clock',
          x: 126,
          y: 605,
          width: 95,
          height: 105,
          propType: 'doggie-pillow',
          gagAnimation: 'jump-flip',
          sfx: 'doggie',
          popText: 'Clock Chain Tug! 🐶🕰️',
          speechLine: 'Arf-boing!',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-doggie-clock-pull.mp3',
          particleColors: [0xfef08a, 0x38bdf8, 0xffffff],
          variations: [
            {
              gagAnimation: 'jump-flip',
              sfx: 'doggie',
              popText: 'Clock Chain Tug! 🐶🕰️',
              speechLine: 'Arf-boing!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-doggie-clock-pull.mp3'
            },
            {
              gagAnimation: 'peek-a-boo',
              sfx: 'boing',
              popText: 'High Jump for the Pinecones! 🐾',
              speechLine: 'Woof-squeak!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-doggie-clock-pull.mp3'
            },
            {
              gagAnimation: 'squash-pop',
              sfx: 'doggie',
              popText: 'Cool Shades Tail Wag! 🕶️',
              speechLine: 'Arf-arf!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-doggie-clock-pull.mp3'
            }
          ]
        },
        {
          id: 'p3-sparky-cookies',
          label: 'Floral Teacup, Chocolate-Chip Cookies & Baby Dragon Sparky',
          x: 1148,
          y: 555,
          width: 165,
          height: 90,
          propType: 'musical-teacup',
          gagAnimation: 'wobble-spin',
          sfx: 'crunch',
          popText: 'Warm Tea & Sparky Cookie! ☕🍪🐉',
          speechLine: 'Nom-nom-squeak!',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-tea-cookies.mp3',
          particleColors: [0xf472b6, 0xfef08a, 0x10b981],
          variations: [
            {
              gagAnimation: 'wobble-spin',
              sfx: 'crunch',
              popText: 'Warm Tea & Sparky Cookie! ☕🍪🐉',
              speechLine: 'Nom-nom-squeak!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-tea-cookies.mp3'
            },
            {
              gagAnimation: 'smoke-hearts',
              sfx: 'sparky',
              popText: 'Sweet Heart Steam! 💖',
              speechLine: 'Puff-twinkle!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-tea-cookies.mp3'
            },
            {
              gagAnimation: 'jump-flip',
              sfx: 'crunch',
              popText: 'Chocolate-Chip Dragon Treat! 🍪',
              speechLine: 'Yum-yum!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-tea-cookies.mp3'
            }
          ]
        },
        {
          id: 'p3-grammy-kids',
          label: 'Grammy, Wyatt & Emma in the Cozy Recliner',
          x: 633,
          y: 495,
          width: 410,
          height: 450,
          propType: 'grammy-recliner',
          gagAnimation: 'rocking-lullaby',
          sfx: 'giggle',
          popText: 'Cozy Chair Snuggle! 🛋️💕',
          speechLine: 'Hehehe!',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-grammy-giggle.mp3',
          particleColors: [0xf472b6, 0xfde047, 0xffffff],
          variations: [
            {
              gagAnimation: 'rocking-lullaby',
              sfx: 'giggle',
              popText: 'Cozy Chair Snuggle! 🛋️💕',
              speechLine: 'Hehehe!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-grammy-giggle.mp3'
            },
            {
              gagAnimation: 'hug-hearts',
              sfx: 'purr',
              popText: 'Grammy Bear Hug! 💖',
              speechLine: 'Aww!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-grammy-giggle.mp3'
            },
            {
              gagAnimation: 'squash-pop',
              sfx: 'giggle',
              popText: 'Recliner Giggles! 🌟',
              speechLine: 'Hooray!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-grammy-giggle.mp3'
            }
          ]
        },
        {
          id: 'p3-lamp',
          label: 'Table Lamp on Right End Table',
          x: 1235,
          y: 405,
          width: 90,
          height: 240,
          propType: 'family-photo',
          gagAnimation: 'squash-pop',
          sfx: 'chime',
          popText: 'Warm Golden Lamp Glow! 💡✨',
          speechLine: 'Click-glow!',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-lamp-click.mp3',
          particleColors: [0xfef08a, 0xfbbf24, 0xffffff],
          variations: [
            {
              gagAnimation: 'squash-pop',
              sfx: 'chime',
              popText: 'Warm Golden Lamp Glow! 💡✨',
              speechLine: 'Click-glow!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-lamp-click.mp3'
            }
          ]
        },
        {
          id: 'p3-painting-1',
          label: 'Left Green Abstract Painting (Hopping Frog)',
          x: 237,
          y: 240,
          width: 112,
          height: 132,
          propType: 'family-photo',
          gagAnimation: 'conga-hop',
          sfx: 'ribbit',
          popText: 'Hopping Green Frog Painting! 🐸🎨',
          speechLine: 'Ribbit-boing!',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-painting-boing.mp3',
          particleColors: [0x22c55e, 0x86efac, 0xfde047],
          variations: [
            {
              gagAnimation: 'conga-hop',
              sfx: 'ribbit',
              popText: 'Hopping Green Frog Painting! 🐸🎨',
              speechLine: 'Ribbit-boing!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-painting-boing.mp3'
            }
          ]
        },
        {
          id: 'p3-painting-2',
          label: 'Middle Tall Teal Painting (Leaping Dolphin)',
          x: 360,
          y: 248,
          width: 96,
          height: 162,
          propType: 'family-photo',
          gagAnimation: 'conga-hop',
          sfx: 'splash',
          popText: 'Leaping Teal Dolphin Painting! 🐬🌊',
          speechLine: 'Splash-boing!',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-painting-boing.mp3',
          particleColors: [0x06b6d4, 0x38bdf8, 0xffffff],
          variations: [
            {
              gagAnimation: 'conga-hop',
              sfx: 'splash',
              popText: 'Leaping Teal Dolphin Painting! 🐬🌊',
              speechLine: 'Splash-boing!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-painting-boing.mp3'
            }
          ]
        },
        {
          id: 'p3-painting-3',
          label: 'Right Burgundy Painting (Dancing Flamingo)',
          x: 467,
          y: 255,
          width: 88,
          height: 112,
          propType: 'family-photo',
          gagAnimation: 'conga-hop',
          sfx: 'boing',
          popText: 'Dancing Flamingo Painting! 🦩🎶',
          speechLine: 'Boogie-boing!',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-painting-boing.mp3',
          particleColors: [0xe11d48, 0xf43f5e, 0xfde047],
          variations: [
            {
              gagAnimation: 'conga-hop',
              sfx: 'boing',
              popText: 'Dancing Flamingo Painting! 🦩🎶',
              speechLine: 'Boogie-boing!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-painting-boing.mp3'
            }
          ]
        },
        {
          id: 'p3-photo-1',
          label: 'Framed Portrait of Grammy & Emma',
          x: 1110,
          y: 150,
          width: 102,
          height: 128,
          propType: 'family-photo',
          gagAnimation: 'wobble-spin',
          sfx: 'chime',
          popText: 'Grammy & Emma Portrait! 🖼️💖',
          speechLine: 'Twinkle-chime!',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-photo-chime.mp3',
          particleColors: [0xf472b6, 0xfde047, 0xffffff],
          variations: [
            {
              gagAnimation: 'wobble-spin',
              sfx: 'chime',
              popText: 'Grammy & Emma Portrait! 🖼️💖',
              speechLine: 'Twinkle-chime!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-photo-chime.mp3'
            }
          ]
        },
        {
          id: 'p3-photo-2',
          label: 'Framed Portrait of Nana & Papa',
          x: 1230,
          y: 115,
          width: 106,
          height: 115,
          propType: 'family-photo',
          gagAnimation: 'wobble-spin',
          sfx: 'chime',
          popText: 'Nana & Papa Portrait! 🖼️💛',
          speechLine: 'Twinkle-chime!',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-photo-chime.mp3',
          particleColors: [0xfde047, 0xfbbf24, 0xf472b6],
          variations: [
            {
              gagAnimation: 'wobble-spin',
              sfx: 'chime',
              popText: 'Nana & Papa Portrait! 🖼️💛',
              speechLine: 'Twinkle-chime!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-photo-chime.mp3'
            }
          ]
        },
        {
          id: 'p3-photo-3',
          label: 'Framed Portrait of Wyatt & Emma',
          x: 1125,
          y: 268,
          width: 84,
          height: 68,
          propType: 'family-photo',
          gagAnimation: 'wobble-spin',
          sfx: 'chime',
          popText: 'Wyatt & Emma High-Five Portrait! 🖼️⭐',
          speechLine: 'Twinkle-chime!',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-photo-chime.mp3',
          particleColors: [0x34d399, 0xfde047, 0x38bdf8],
          variations: [
            {
              gagAnimation: 'wobble-spin',
              sfx: 'chime',
              popText: 'Wyatt & Emma High-Five Portrait! 🖼️⭐',
              speechLine: 'Twinkle-chime!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-photo-chime.mp3'
            }
          ]
        },
        {
          id: 'p3-photo-4',
          label: 'Small Framed Portrait of Toddler Emma',
          x: 1220,
          y: 222,
          width: 68,
          height: 78,
          propType: 'family-photo',
          gagAnimation: 'wobble-spin',
          sfx: 'chime',
          popText: 'Emma Peek-a-Boo Portrait! 🖼️✨',
          speechLine: 'Twinkle-chime!',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-photo-chime.mp3',
          particleColors: [0xc084fc, 0xfde047, 0xffffff],
          variations: [
            {
              gagAnimation: 'wobble-spin',
              sfx: 'chime',
              popText: 'Emma Peek-a-Boo Portrait! 🖼️✨',
              speechLine: 'Twinkle-chime!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-photo-chime.mp3'
            }
          ]
        }
      ]
    },

    // =========================================================================
    // SPREAD 5 (INDEX 4): Nana's Convertible in the Garage! (Aligned 1:1 to p4-bg-clean.jpg)
    // =========================================================================
    {
      pageNumber: 5,
      title: "Page 4: Nana's Convertible in the Garage!",
      theme: 'nana-p4-convertible',
      backgroundSrc: '/assets/stories/nana/p4-bg-clean.jpg',
      narrationAudioSrc: '/assets/stories/nana/audio/p4-narration.mp3',
      narrationDurationMs: 6350,
      words: [
        'In',
        'the',
        'garage',
        'sat',
        "Nana's",
        'shiny',
        'cream',
        'convertible—Beep!',
        'Beep!',
        'Who',
        'wants',
        'to',
        'go',
        'for',
        'a',
        'spin?'
      ],
      // Acoustic envelope timings (ms) extracted from Spuds Oxley's p4-narration.mp3 (6,348ms)
      wordTimings: [
        105,  // In
        260,  // the
        420,  // garage (followed by phrase pause at 1200ms)
        1280, // sat
        1490, // Nana's
        1855, // shiny
        2325, // cream
        2690, // convertible—Beep! (convertible at 2690ms, first Beep! at 3735ms)
        3970, // Beep! (followed by pause at 4205..4625ms)
        4650, // Who
        4805, // wants
        4965, // to
        5120, // go
        5225, // for
        5355, // a
        5540  // spin?
      ],
      hotspots: [
        {
          id: 'p4-car-doggie',
          label: 'Doggie in Sunglasses at the MGB Convertible Steering Wheel',
          x: 404,
          y: 523,
          width: 479,
          height: 308,
          propType: 'vintage-horn',
          gagAnimation: 'inflate-pop',
          sfx: 'horn',
          popText: 'Beep! Beep! Roadster Spin! 🚗🕶️',
          speechLine: 'Beep-beep!',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-car-horn-rev.mp3',
          particleColors: [0xfacc15, 0xfef08a, 0x38bdf8, 0xffffff],
          variations: [
            {
              gagAnimation: 'inflate-pop',
              sfx: 'horn',
              popText: 'Beep! Beep! Roadster Spin! 🚗🕶️',
              speechLine: 'Beep-beep!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-car-horn-rev.mp3'
            },
            {
              gagAnimation: 'squash-pop',
              sfx: 'fanfare',
              popText: 'Headlights Flash & Rev! 💡🎶',
              speechLine: 'Vroom-beep-beep!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-car-horn-rev.mp3'
            },
            {
              gagAnimation: 'jump-flip',
              sfx: 'doggie',
              popText: 'Co-Pilot Doggie Bark! 🐾',
              speechLine: 'Arf-honk!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-car-horn-rev.mp3'
            }
          ]
        },
        {
          id: 'p4-wall-oven',
          label: 'White Wall Oven & Juggling Rolls on Left Wooden Shelf',
          x: 225,
          y: 315,
          width: 125,
          height: 155,
          propType: 'workbench-tools',
          gagAnimation: 'jump-flip',
          sfx: 'chime',
          popText: 'Ding! Warm Pie & Juggling Rolls! 🥧✨',
          speechLine: 'Ding-boing!',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-wall-oven-ding.mp3',
          particleColors: [0xfef08a, 0xfbbf24, 0xffffff],
          variations: [
            {
              gagAnimation: 'jump-flip',
              sfx: 'chime',
              popText: 'Ding! Warm Pie & Juggling Rolls! 🥧✨',
              speechLine: 'Ding-boing!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-wall-oven-ding.mp3'
            }
          ]
        },
        {
          id: 'p4-cardboard-box',
          label: 'Cardboard Box & Mechanic Mouse on Left Folding Table',
          x: 89,
          y: 391,
          width: 120,
          height: 115,
          propType: 'workbench-tools',
          gagAnimation: 'peek-a-boo',
          sfx: 'boing',
          popText: 'Squeak-Rattle! Garage Mouse! 🐭🔩',
          speechLine: 'Squeak-rattle!',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-box-mouse.mp3',
          particleColors: [0xfef08a, 0x34d399, 0xfbbf24],
          variations: [
            {
              gagAnimation: 'peek-a-boo',
              sfx: 'boing',
              popText: 'Squeak-Rattle! Garage Mouse! 🐭🔩',
              speechLine: 'Squeak-rattle!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-box-mouse.mp3'
            }
          ]
        },
        {
          id: 'p4-wreath',
          label: 'Floral Garage Wall Wreath & Bluebird',
          x: 405,
          y: 235,
          width: 95,
          height: 95,
          propType: 'cuckoo-clock',
          gagAnimation: 'peek-a-boo',
          sfx: 'cuckoo',
          popText: 'Wreath Bluebird Song! 🐦🌸',
          speechLine: 'Tweet-tweet!',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-wreath-bird.mp3',
          particleColors: [0x38bdf8, 0xf472b6, 0xfacc15],
          variations: [
            {
              gagAnimation: 'peek-a-boo',
              sfx: 'cuckoo',
              popText: 'Wreath Bluebird Song! 🐦🌸',
              speechLine: 'Tweet-tweet!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-wreath-bird.mp3'
            }
          ]
        },
        {
          id: 'p4-hutch-items',
          label: 'Cream Hutch Shelves with Musical Bottles & Cans',
          x: 605,
          y: 255,
          width: 135,
          height: 140,
          propType: 'workbench-tools',
          gagAnimation: 'conga-hop',
          sfx: 'clang',
          popText: 'Bottle & Can Xylophone Boogie! 🎶🥫',
          speechLine: 'Ting-tang-bop!',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-hutch-xylophone.mp3',
          particleColors: [0x38bdf8, 0xef4444, 0xfacc15, 0x22c55e],
          variations: [
            {
              gagAnimation: 'conga-hop',
              sfx: 'clang',
              popText: 'Bottle & Can Xylophone Boogie! 🎶🥫',
              speechLine: 'Ting-tang-bop!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-hutch-xylophone.mp3'
            }
          ]
        },
        {
          id: 'p4-compressor',
          label: 'Black Wheeled Upright Air Compressor',
          x: 815,
          y: 545,
          width: 110,
          height: 175,
          propType: 'workbench-tools',
          gagAnimation: 'inflate-pop',
          sfx: 'kettle',
          popText: 'Chug-Chug-POOF! Steam Valve! 💨',
          speechLine: 'Chug-chug-poof!',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-air-compressor.mp3',
          particleColors: [0xffffff, 0xe0f2fe, 0xef4444],
          variations: [
            {
              gagAnimation: 'inflate-pop',
              sfx: 'kettle',
              popText: 'Chug-Chug-POOF! Steam Valve! 💨',
              speechLine: 'Chug-chug-poof!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-air-compressor.mp3'
            }
          ]
        },
        {
          id: 'p4-leaf-blower',
          label: 'Orange & Grey Garage Leaf Blower',
          x: 980,
          y: 615,
          width: 260,
          height: 120,
          propType: 'workbench-tools',
          gagAnimation: 'splash-arc',
          sfx: 'jet-whoosh',
          popText: 'Whoooosh! Swirling Leaves! 🍂💨',
          speechLine: 'Whoooosh!',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-leaf-blower.mp3',
          particleColors: [0xef4444, 0xf97316, 0xfacc15, 0x38bdf8],
          variations: [
            {
              gagAnimation: 'splash-arc',
              sfx: 'jet-whoosh',
              popText: 'Whoooosh! Swirling Leaves! 🍂💨',
              speechLine: 'Whoooosh!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-leaf-blower.mp3'
            }
          ]
        },
        {
          id: 'p4-sparky-cabinet',
          label: 'Mechanic Sparky Peeking Behind the Tall Cream Garage Cabinet',
          x: 1015,
          y: 420,
          width: 110,
          height: 130,
          propType: 'sparky',
          gagAnimation: 'peek-a-boo',
          sfx: 'sparky',
          popText: 'Mechanic Sparky & Wrench! 🐉🔧',
          speechLine: 'Chirp-clink!',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-sparky-wrench.mp3',
          particleColors: [0x10b981, 0xfacc15, 0xfef08a],
          variations: [
            {
              gagAnimation: 'peek-a-boo',
              sfx: 'sparky',
              popText: 'Mechanic Sparky & Wrench! 🐉🔧',
              speechLine: 'Chirp-clink!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-sparky-wrench.mp3'
            }
          ]
        },
        {
          id: 'p4-garage-opener',
          label: 'Overhead Ceiling Garage Door Opener Light',
          x: 415,
          y: 105,
          width: 90,
          height: 55,
          propType: 'winking-headlights',
          gagAnimation: 'squash-pop',
          sfx: 'zap',
          popText: 'Overhead Garage Work-Light! 💡✨',
          speechLine: 'Click-hum!',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-garage-light.mp3',
          particleColors: [0xfef08a, 0xfbbf24, 0xffffff],
          variations: [
            {
              gagAnimation: 'squash-pop',
              sfx: 'zap',
              popText: 'Overhead Garage Work-Light! 💡✨',
              speechLine: 'Click-hum!',
              voiceAudioSrc: '/assets/stories/nana/audio/sfx-garage-light.mp3'
            }
          ]
        }
      ]
    },

    // =========================================================================
    // SPREAD 6 (INDEX 5): Dutch Village Brick Lane (Aligned to p6-bg-clean.jpg)
    // =========================================================================
    {
      pageNumber: 6,
      title: 'Page 5: Strolling Down Dutch Village Brick Lane!',
      theme: 'nana-p5-dutch-village',
      backgroundSrc: 'p6-bg-clean',
      narrationAudioSrc: '/assets/stories/nana/audio/p6-narration.mp3',
      narrationDurationMs: 8281,
      words: [
        'Next',
        'stop,',
        'Dutch',
        'Village!',
        'Giant',
        'windmills',
        'spun',
        'in',
        'the',
        'breeze',
        'while',
        'wooden',
        'shoes',
        'went',
        'klomp,',
        'klomp,',
        'klomp!'
      ],
      wordTimings: [
        80,
        470,
        1070,
        1410,
        2480,
        2978,
        3448,
        3762,
        4020,
        4232,
        4980,
        5329,
        5642,
        6080,
        6550,
        7150,
        7630
      ],
      hotspots: [
        {
          id: 'p6-family',
          label: 'Nana, Papa, Wyatt & Emma Holding Hands',
          x: 545,
          y: 615,
          width: 280,
          height: 250,
          propType: 'nana-papa-hug',
          gagAnimation: 'conga-hop',
          sfx: 'giggle',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-family-skip.mp3',
          popText: 'Happy Dutch Village Stroll! 🚶‍♂️🚶‍♀️❤️',
          speechLine: 'Skip, skip, hooray! Wyatt, Nana, Papa, and Emma held hands down the sunny Dutch Village lane!',
          particleColors: [0xfbbf24, 0xf43f5e, 0x38bdf8, 0xffffff]
        },
        {
          id: 'p6-windmill-sails',
          label: 'Red Dutch Windmill Sails',
          x: 332,
          y: 325,
          width: 110,
          height: 110,
          propType: 'windmill-sparky',
          gagAnimation: 'spin-sails',
          sfx: 'fanfare',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-windmill-whoosh.mp3',
          popText: 'Little Red Windmill Spin! 🎡',
          speechLine: 'Whirrrr-ding! The red windmill sails spun in the Dutch Village breeze!',
          particleColors: [0xef4444, 0xfef08a, 0xffffff]
        },
        {
          id: 'p6-ferris-wheel',
          label: 'Distant Dutch Carnival Ferris Wheel',
          x: 530,
          y: 372,
          width: 90,
          height: 90,
          propType: 'windmill-sparky',
          gagAnimation: 'wobble-spin',
          sfx: 'chime',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-ferris-carnival.mp3',
          popText: 'Carnival Wheel Twinkle! ✨',
          speechLine: 'Ding-a-ling! Calliope music drifted from the spinning ferris wheel!',
          particleColors: [0x38bdf8, 0xfbbf24, 0xf43f5e, 0xffffff]
        },
        {
          id: 'p6-clogs-doggie',
          label: 'Doggie & Dancing Yellow Wooden Clogs',
          x: 935,
          y: 590,
          width: 120,
          height: 110,
          propType: 'wooden-clogs',
          gagAnimation: 'conga-hop',
          sfx: 'clang',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-clogs-klomp.mp3',
          popText: 'Klomp-Klomp-Tap! 👞🎶',
          speechLine: 'Klomp, klomp, tap-tap-tap! Doggie and the yellow wooden clogs danced a cheerful Dutch jig!',
          particleColors: [0xfacc15, 0xef4444, 0x38bdf8]
        },
        {
          id: 'p6-dutch-door',
          label: '1613 Bakery Dutch Door',
          x: 976,
          y: 455,
          width: 95,
          height: 175,
          propType: 'brick-bakery-1613',
          gagAnimation: 'smoke-hearts',
          sfx: 'chime',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-dutch-door-cuckoo.mp3',
          popText: 'Warm 1613 Stroopwafels! 🥨✨',
          speechLine: 'Cuckoo-chime! Warm golden cinnamon swirls floated out of the 1613 Dutch door!',
          particleColors: [0xfbbf24, 0xf97316, 0xffffff]
        },
        {
          id: 'p6-chimney-stork',
          label: 'White Stork on 1613 Stepped Brick Gable Peak',
          x: 985,
          y: 95,
          width: 110,
          height: 110,
          propType: 'brick-bakery-1613',
          gagAnimation: 'jump-flip',
          sfx: 'boing',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-chimney-stork.mp3',
          popText: 'Chimney Stork Clatter! 🦩✨',
          speechLine: 'Clack-clack-flutter! The friendly white stork flapped its wings high atop the 1613 brick gable!',
          particleColors: [0xffffff, 0xfbbf24, 0xf97316]
        },
        {
          id: 'p6-sparky-planter',
          label: 'Sparky in the Brick Tulip Planter',
          x: 885,
          y: 505,
          width: 115,
          height: 115,
          propType: 'autumn-butterflies',
          gagAnimation: 'peek-a-boo',
          sfx: 'sparky',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-sparky-tulip.mp3',
          popText: 'Sparky Tulip Peek! 🐉🌷',
          speechLine: 'Pop-giggle! Sparky peeked out from the colorful tulip planter!',
          particleColors: [0x34d399, 0xfbbf24, 0xf43f5e]
        },
        {
          id: 'p6-butterflies',
          label: 'Fluttering Butterflies Over Left Flowerbeds',
          x: 225,
          y: 435,
          width: 135,
          height: 135,
          propType: 'autumn-butterflies',
          gagAnimation: 'fly-circle',
          sfx: 'chime',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-butterflies-magic.mp3',
          popText: 'Flutter-Swirl Butterflies! 🦋🌼',
          speechLine: 'Wheee! Colorful butterflies twirled above the brick planter of autumn mums!',
          particleColors: [0xf97316, 0x38bdf8, 0xf472b6, 0xfacc15]
        },
        {
          id: 'p6-window-cat',
          label: 'Orange Cat in Open Right Cottage Window',
          x: 1128,
          y: 530,
          width: 130,
          height: 190,
          propType: 'peeking-kitty',
          gagAnimation: 'peek-a-boo',
          sfx: 'purr',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-window-cat-meow.mp3',
          popText: 'Meow-Purr Window Kitty! 🐱🪟',
          speechLine: 'Meow-purrrr! A fluffy orange kitty waved from inside the open Dutch cottage window!',
          particleColors: [0xf97316, 0xf43f5e, 0xffffff]
        }
      ]
    },

    // =========================================================================
    // =========================================================================
    // PAGE 7: Lake Michigan Beach (Aligned to p7-bg-clean.jpg)
    // =========================================================================
    {
      pageNumber: 7,
      title: 'Page 7: Sunny Sandcastles at Lake Michigan Beach!',
      theme: 'nana-p7-lake-michigan',
      backgroundSrc: 'p7-bg-clean',
      narrationAudioSrc: '/assets/stories/nana/audio/p7-narration.mp3',
      narrationDurationMs: 10527,
      words: [
        'At',
        'the',
        'big',
        'Lake',
        'Michigan',
        'beach,',
        'Wyatt',
        'and',
        'Emma',
        'built',
        'a',
        'giant',
        'sandcastle',
        'while',
        'Papa',
        'skipped',
        'stones',
        'across',
        'the',
        'waves—',
        'plip,',
        'plop,',
        'splash!'
      ],
      wordTimings: [
        78,
        287,
        522,
        836,
        1097,
        1672,
        2429,
        2847,
        3056,
        3500,
        3657,
        3944,
        4389,
        5329,
        5590,
        6087,
        6450,
        6844,
        7131,
        7288,
        8647,
        9169,
        9639
      ],
      hotspots: [
        {
          id: 'p7-papa-skipping',
          label: 'Papa Skipping Stones in the Lake Michigan Surf',
          x: 315,
          y: 395,
          width: 240,
          height: 310,
          propType: 'papa-skipping-stones',
          gagAnimation: 'splash-arc',
          sfx: 'splash',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-papa-stoneskip.mp3',
          popText: 'Plip! Plop! Splash! 🪨💦',
          speechLine: 'Plip, plop, splash! Papa skipped flat stones across the sparkling Lake Michigan waves!',
          particleColors: [0x38bdf8, 0xffffff, 0xfde047]
        },
        {
          id: 'p7-kids-sandcastle',
          label: 'Emma & Wyatt Building a Giant Sandcastle',
          x: 745,
          y: 555,
          width: 410,
          height: 290,
          propType: 'emma-sandcastle',
          gagAnimation: 'sandcastle-upgrade',
          sfx: 'pop',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-kids-sandcastle.mp3',
          popText: 'Giant Lake Michigan Sandcastle! 🏰🏖️',
          speechLine: 'Pat, pat, scoop! Emma and Wyatt built a giant sandcastle with a Michigan flag on top!',
          particleColors: [0xfde047, 0xfbbf24, 0xf43f5e, 0x38bdf8]
        },
        {
          id: 'p7-nana-chair',
          label: 'Nana Cheering in the Rainbow Beach Chair',
          x: 1105,
          y: 445,
          width: 230,
          height: 330,
          propType: 'beach-umbrella',
          gagAnimation: 'hug-hearts',
          sfx: 'giggle',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-nana-cheer.mp3',
          popText: 'Yay from Nana! ⛱️❤️',
          speechLine: 'Clap, clap, hooray! Nana cheered from her rainbow beach chair under the umbrella!',
          particleColors: [0xf43f5e, 0xf472b6, 0xfbbf24]
        },
        {
          id: 'p7-doggie-towel',
          label: 'Doggie in Sunglasses Digging in the Beach Sand',
          x: 955,
          y: 635,
          width: 135,
          height: 120,
          propType: 'beach-umbrella',
          gagAnimation: 'jump-flip',
          sfx: 'doggie',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-doggie-dig.mp3',
          popText: 'Doggie Seashell Treasure! 🐶🐚',
          speechLine: 'Dig-dig, arf! Doggie dug in the warm sand and found a shiny pink seashell!',
          particleColors: [0xfde047, 0xfbbf24, 0xf472b6, 0xffffff]
        },
        {
          id: 'p7-seagulls-bucket',
          label: 'Two Seagulls Perched on the Red Beach Bucket',
          x: 775,
          y: 375,
          width: 145,
          height: 140,
          propType: 'seagull-hat',
          gagAnimation: 'jump-flip',
          sfx: 'honk',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-seagulls-squawk.mp3',
          popText: 'Squawk-Squawk Bucket Birds! 🐦🪣',
          speechLine: 'Squawk-flap! Two silly seagulls hopped on the red bucket and spotted a little blue fish!',
          particleColors: [0xffffff, 0xef4444, 0x38bdf8]
        },
        {
          id: 'p7-sparky-grill',
          label: 'Sparky Roasting a Marshmallow in the Beach Fire Pit',
          x: 1005,
          y: 285,
          width: 135,
          height: 125,
          propType: 'silver-chimney',
          gagAnimation: 'peek-a-boo',
          sfx: 'sparky',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-sparky-smores.mp3',
          popText: 'Sparky Beach S’mores! 🐉🔥',
          speechLine: 'Puff-sizzle! Sparky popped out of the stone fire pit to toast a golden marshmallow!',
          particleColors: [0xfbbf24, 0xf97316, 0xfef08a, 0x34d399]
        },
        {
          id: 'p7-sailboat-horizon',
          label: 'Sailboat on the Lake Michigan Horizon',
          x: 165,
          y: 215,
          width: 125,
          height: 125,
          propType: 'splashing-waves',
          gagAnimation: 'splash-arc',
          sfx: 'splash',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-sailboat-splash.mp3',
          popText: 'Horizon Sailboat & Dolphin! ⛵🐬🌈',
          speechLine: 'Sploosh! A friendly dolphin leaped over the sailboat and made a sparkling rainbow!',
          particleColors: [0x38bdf8, 0xffffff, 0xfbbf24, 0xf43f5e]
        },
        {
          id: 'p7-beach-ball',
          label: 'Rainbow Beach Ball in the Sand',
          x: 520,
          y: 585,
          width: 120,
          height: 120,
          propType: 'emma-sandcastle',
          gagAnimation: 'jump-flip',
          sfx: 'boing',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-beach-ball.mp3',
          popText: 'Bouncing Rainbow Beach Ball! 🏐🌈',
          speechLine: 'Boing-whirrrr! The colorful beach ball bounced high and spun like a top in the sand!',
          particleColors: [0xef4444, 0xfacc15, 0x38bdf8, 0xffffff]
        },
        {
          id: 'p7-umbrella-canopy',
          label: 'Rainbow Beach Umbrella Canopy',
          x: 960,
          y: 55,
          width: 310,
          height: 175,
          propType: 'beach-umbrella',
          gagAnimation: 'wobble-spin',
          sfx: 'chime',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-umbrella-breeze.mp3',
          popText: 'Sunny Beach Breeze! ⛱️🌬️',
          speechLine: 'Whoooosh! A warm Lake Michigan breeze rustled the rainbow beach umbrella!',
          particleColors: [0xfef08a, 0xfbbf24, 0x38bdf8, 0xffffff]
        }
      ]
    },

    // =========================================================================
    // PAGE 8: Cabin in the Woods (Aligned 1:1 to p8-bg-clean.jpg)
    // =========================================================================
    {
      pageNumber: 8,
      title: 'Page 7: The Cozy Cabin in the Woods!',
      theme: 'nana-p8-woods-cabin',
      backgroundSrc: 'p8-bg-clean',
      narrationAudioSrc: '/assets/stories/nana/audio/p8-narration.mp3',
      narrationDurationMs: 9091,
      words: [
        'Deep',
        'in',
        'the',
        'cozy',
        'Michigan',
        'woods',
        'stood',
        'the',
        'family',
        'cabin!',
        'Geese',
        'honked',
        'hello',
        'while',
        'wind',
        'chimes',
        'danced',
        'in',
        'the',
        'pine',
        'breeze.'
      ],
      wordTimings: [
        183,  // Deep
        470,  // in
        600,  // the
        810,  // cozy
        1411, // Michigan
        1907, // woods
        2429, // stood
        2795, // the
        2990, // family
        3553, // cabin!
        4441, // Geese
        4760, // honked
        5277, // hello
        6008, // while
        6531, // wind
        6922, // chimes
        7393, // danced
        7889, // in
        8060, // the
        8281, // pine
        8640  // breeze.
      ],
      hotspots: [
        {
          id: 'p8-kids-running',
          label: 'Wyatt & Emma Running to the Cabin',
          x: 1012,
          y: 606,
          width: 195,
          height: 145,
          propType: 'horseshoe-driveway',
          gagAnimation: 'conga-hop',
          sfx: 'giggle',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-kids-cabin-laugh.mp3',
          popText: 'Cabin Adventure Race! 🏃‍♂️🏃‍♀️🌲',
          speechLine: 'Hooray! Wyatt and Emma raced across the woodland trail to the cabin steps!',
          particleColors: [0xfde047, 0xfbbf24, 0x22c55e, 0xc084fc]
        },
        {
          id: 'p8-nana-porch',
          label: 'Nana on the Cabin Porch with Warm Cocoa',
          x: 640,
          y: 445,
          width: 120,
          height: 150,
          propType: 'wind-chimes',
          gagAnimation: 'hug-hearts',
          sfx: 'fanfare',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-nana-cocoa.mp3',
          popText: 'Warm Cabin Cocoa & Hugs! ☕🩷',
          speechLine: 'Welcome to the cabin! Come warm up with sweet marshmallows and hot cocoa!',
          particleColors: [0xf472b6, 0xfb7185, 0xfef08a, 0xffffff]
        },
        {
          id: 'p8-sparky-chimney',
          label: 'Sparky Hovering by the Tall Silver Chimney',
          x: 955,
          y: 125,
          width: 130,
          height: 120,
          propType: 'silver-chimney',
          gagAnimation: 'smoke-hearts',
          sfx: 'sparky',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-sparky-chimney.mp3',
          popText: 'Heart Smoke Rings & Sparky! 🤍🐉',
          speechLine: 'Puff-roar! Sparky blew glowing heart smoke rings beside the tall silver chimney!',
          particleColors: [0xf472b6, 0xfbbf24, 0x10b981, 0xffffff]
        },
        {
          id: 'p8-wind-chimes',
          label: 'Silver Wind Chimes Under Left Roof Eave',
          x: 436,
          y: 395,
          width: 85,
          height: 105,
          propType: 'wind-chimes',
          gagAnimation: 'wobble-spin',
          sfx: 'chime',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-wind-chimes.mp3',
          popText: 'Ting-a-Ling Pine Breeze! 🎐🎵',
          speechLine: 'Ting-a-ling-sparkle! The silver wind chimes sang a forest melody in the pine breeze!',
          particleColors: [0x38bdf8, 0xfbbf24, 0x34d399, 0xf472b6]
        },
        {
          id: 'p8-forest-deer',
          label: 'Woodland Deer & Singing Bird Behind Left Pine Tree',
          x: 86,
          y: 480,
          width: 115,
          height: 145,
          propType: 'woodland-deer',
          gagAnimation: 'peek-a-boo',
          sfx: 'boing',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-forest-deer.mp3',
          popText: 'Woodland Deer & Antler Bird! 🦌🐦',
          speechLine: 'Tweet-boing! A little yellow songbird hopped onto the friendly woodland deer’s antlers!',
          particleColors: [0xfacc15, 0x4ade80, 0xfef08a]
        },
        {
          id: 'p8-canada-geese',
          label: 'Honking Canada Geese on the Left Cabin Lawn',
          x: 172,
          y: 595,
          width: 210,
          height: 155,
          propType: 'yard-geese',
          gagAnimation: 'conga-hop',
          sfx: 'honk',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-geese-honk.mp3',
          popText: 'Honk-Honk Goose Dance! 🪿🎶',
          speechLine: 'Honk, honk, cha-cha-cha! Both Canada geese flapped their wings and did a happy hop!',
          particleColors: [0xfacc15, 0x38bdf8, 0xf97316, 0xffffff]
        },
        {
          id: 'p8-doggie-cellar',
          label: 'Doggie & Acorn Squirrel by the Slanted Cellar Door',
          x: 345,
          y: 555,
          width: 110,
          height: 90,
          propType: 'doggie-pillow',
          gagAnimation: 'jump-flip',
          sfx: 'doggie',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-doggie-squirrel.mp3',
          popText: 'Doggie & Squirrel Acorn Play! 🐶🐿️',
          speechLine: 'Arf-squeak! Doggie play-bowed while a woodland squirrel tossed an acorn from a pinecone!',
          particleColors: [0xfef08a, 0xf97316, 0xf43f5e, 0x38bdf8]
        },
        {
          id: 'p8-bluejay-porch',
          label: 'Singing Bluejay on the Right Side Porch Railing',
          x: 982,
          y: 452,
          width: 80,
          height: 80,
          propType: 'wind-chimes',
          gagAnimation: 'jump-flip',
          sfx: 'cuckoo',
          voiceAudioSrc: '/assets/stories/nana/audio/sfx-bluejay-whistle.mp3',
          popText: 'Whistling Porch Bluejay! 🐦🎶',
          speechLine: 'Tweet-whistle! The bright bluejay flapped its wings and sang a merry cabin welcome!',
          particleColors: [0x38bdf8, 0x60a5fa, 0xfacc15, 0xffffff]
        }
      ]
    },

    // =========================================================================
    // PAGE 9: Cozy Cabin Bedtime (Aligned 1:1 to p9-bg-clean.jpg — Zero Hotspots, Calm Ambient Only)
    // =========================================================================
    {
      pageNumber: 9,
      title: "Page 8: By the Warm Cabin Stove & Nana's Blanket Lullaby!",
      theme: 'nana-p9-cabin-stove',
      backgroundSrc: 'p9-bg-clean',
      narrationAudioSrc: '/assets/stories/nana/audio/p9-narration.mp3',
      narrationDurationMs: 10684,
      words: [
        'By',
        'the',
        'warm',
        'cabin',
        'fire,',
        'Wyatt,',
        'Emma,',
        'and',
        'Doggie',
        'drifted',
        'fast',
        'asleep',
        'in',
        "Nana's",
        'arms.',
        'Goodnight,',
        'Michigan,',
        'sweet',
        'dreams.'
      ],
      wordTimings: [
        157,  // By
        330,  // the
        496,  // warm
        1019, // cabin
        1420, // fire,
        2717, // Wyatt,
        3396, // Emma,
        3840, // and
        4075, // Doggie
        4702, // drifted
        5068, // fast
        5560, // asleep
        6191, // in
        6390, // Nana's
        6850, // arms.
        8072, // Goodnight,
        8464, // Michigan,
        9561, // sweet
        9900  // dreams.
      ],
      hotspots: []
    }
  ]
};
