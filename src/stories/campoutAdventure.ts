/**
 * campoutAdventure.ts
 * -------------------
 * Playable 5-page "Living Books" interactive storybook cartridge:
 * "Sparky & Doggie's Big Campout Adventure!"
 * plus a bonus playable cartridge: "Sparky & Doggie's Beach Day!"
 *
 * Every page features:
 * - Karaoke story words at the top (each word bounces in sequence and can be tapped individually)
 * - 6 to 7 clickable comedy hotspots with custom visual props, squash-and-stretch tweens,
 *   particle bursts, synthesized sound effects, and voice lines!
 */

import { JUST_NANA_AND_US } from './justNanaAndUs';
import { StoryCartridge } from './storyTypes';

export const CAMPOUT_ADVENTURE: StoryCartridge = {
  id: 'sparky-doggie-campout',
  title: "Sparky & Doggie's Campout",
  subtitle: 'A Living Books 5-Page Comedy Adventure',
  coverEmoji: '⛺',
  accentColor: 0x10b981,
  pages: [
    // =========================================================================
    // PAGE 1: Arrival at Whispering Pines Campsite
    // =========================================================================
    {
      pageNumber: 1,
      title: 'Page 1: Welcome to Camp Whispering Pines!',
      theme: 'forest-arrival',
      words: ['Sparky', 'and', 'Doggie', 'packed', 'their', 'big', 'green', 'tent', 'for', 'a', 'silly', 'forest', 'campout!'],
      hotspots: [
        {
          id: 'p1-sparky',
          label: 'Sparky Dragon',
          x: 310,
          y: 520,
          width: 130,
          height: 130,
          propType: 'sparky',
          gagAnimation: 'sparkle-sneeze',
          sfx: 'sparky',
          popText: 'ROAR-achoo! ✨',
          speechLine: 'Hooray! Let us set up camp, Wyatt and Emma!',
          particleColors: [0x10b981, 0xfbbf24, 0xffffff]
        },
        {
          id: 'p1-doggie',
          label: 'Doggie Sidekick',
          x: 495,
          y: 545,
          width: 120,
          height: 120,
          propType: 'doggie',
          gagAnimation: 'jump-flip',
          sfx: 'doggie',
          popText: 'Arf-Squeak! 🐾',
          speechLine: 'Arf arf! Doggie did a giant backflip!',
          particleColors: [0xf472b6, 0x38bdf8, 0xffffff]
        },
        {
          id: 'p1-tent',
          label: 'Cozy Green Tent',
          x: 820,
          y: 485,
          width: 210,
          height: 160,
          propType: 'tent-zipper',
          gagAnimation: 'wobble-spin',
          sfx: 'boing',
          popText: 'Zzzip! Boing! ⛺',
          speechLine: 'Peek-a-boo! Three raccoons are playing cards in the tent!',
          particleColors: [0x34d399, 0xfde047]
        },
        {
          id: 'p1-boot-frog',
          label: 'Hiking Boot Frog',
          x: 640,
          y: 585,
          width: 100,
          height: 95,
          propType: 'frog-boot',
          gagAnimation: 'peek-a-boo',
          sfx: 'ribbit',
          popText: 'RIBBIT! 🐸',
          speechLine: 'Ribbit! There is a bouncy green frog inside that boot!',
          particleColors: [0x4ade80, 0xfacc15]
        },
        {
          id: 'p1-owl',
          label: 'Sleepy Pine Owl',
          x: 205,
          y: 285,
          width: 105,
          height: 105,
          propType: 'owl-tree',
          gagAnimation: 'wobble-spin',
          sfx: 'hoot',
          popText: 'Hoo-Hoo! 🦉',
          speechLine: 'Hoo-hoo! Who is waking up the sleepy owl?',
          particleColors: [0xfbbf24, 0xfde047]
        },
        {
          id: 'p1-squirrel',
          label: 'Acorn Squirrel',
          x: 1045,
          y: 295,
          width: 105,
          height: 105,
          propType: 'pine-squirrel',
          gagAnimation: 'jump-flip',
          sfx: 'giggle',
          popText: 'Crunch-Giggle! 🐿️',
          speechLine: 'Hehehe! The squirrel juggled three giant pinecones!',
          particleColors: [0xf97316, 0xfacc15]
        },
        {
          id: 'p1-backpack',
          label: 'Overstuffed Backpack',
          x: 155,
          y: 560,
          width: 110,
          height: 105,
          propType: 'backpack',
          gagAnimation: 'inflate-pop',
          sfx: 'pop',
          popText: 'POP! Cookies! 🍪',
          speechLine: 'Pop! Ten chocolate chip cookies flew out of the backpack!',
          particleColors: [0xfbbf24, 0xf472b6, 0x38bdf8]
        }
      ]
    },

    // =========================================================================
    // PAGE 2: Splashy Berry Lake
    // =========================================================================
    {
      pageNumber: 2,
      title: 'Page 2: Splishing and Splashing at Berry Lake!',
      theme: 'sunny-lake',
      words: ['Down', 'by', 'the', 'sparkling', 'blue', 'lake,', 'a', 'silly', 'fish', 'jumped', 'right', 'over', "Doggie's", 'nose!'],
      hotspots: [
        {
          id: 'p2-sparky',
          label: 'Captain Sparky',
          x: 265,
          y: 495,
          width: 130,
          height: 130,
          propType: 'sparky',
          gagAnimation: 'squash-pop',
          sfx: 'sparky',
          popText: ' Bubble Roar! 🫧',
          speechLine: 'Sparky blew a giant rainbow soap bubble across the water!',
          particleColors: [0x38bdf8, 0x34d399, 0xfbbf24]
        },
        {
          id: 'p2-doggie',
          label: 'Paddle Doggie',
          x: 450,
          y: 525,
          width: 120,
          height: 120,
          propType: 'doggie',
          gagAnimation: 'jump-flip',
          sfx: 'doggie',
          popText: 'Splash-Bark! 🐾',
          speechLine: 'Arf-squeak! Doggie loves doggy-paddling in the lake!',
          particleColors: [0x38bdf8, 0xffffff, 0xf472b6]
        },
        {
          id: 'p2-fish',
          label: 'Acrobat Rainbow Trout',
          x: 685,
          y: 505,
          width: 130,
          height: 105,
          propType: 'lake-fish',
          gagAnimation: 'splash-arc',
          sfx: 'splash',
          popText: 'SPLASH! 🐟',
          speechLine: 'Sploosh! Look at that rainbow fish do a somersault!',
          particleColors: [0x38bdf8, 0x60a5fa, 0xffffff]
        },
        {
          id: 'p2-turtle',
          label: 'Sunbathing Turtle',
          x: 895,
          y: 545,
          width: 120,
          height: 95,
          propType: 'turtle-rock',
          gagAnimation: 'peek-a-boo',
          sfx: 'boing',
          popText: 'Cowabunga! 🐢',
          speechLine: 'The little green turtle put on cool sunglasses!',
          particleColors: [0x4ade80, 0xfacc15]
        },
        {
          id: 'p2-lilypad',
          label: 'Singing Lily Pad',
          x: 575,
          y: 590,
          width: 115,
          height: 90,
          propType: 'lily-pad',
          gagAnimation: 'jump-flip',
          sfx: 'ribbit',
          popText: 'Ribbit-Boing! 🪷',
          speechLine: 'Ribbit-ribbit! The frog choir sang a funny song!',
          particleColors: [0xf472b6, 0x4ade80]
        },
        {
          id: 'p2-ducks',
          label: 'Mama & Baby Ducks',
          x: 1055,
          y: 485,
          width: 135,
          height: 100,
          propType: 'ducks',
          gagAnimation: 'wobble-spin',
          sfx: 'giggle',
          popText: 'Quack-Quack! 🦆',
          speechLine: 'Quack, quack, quack! Three yellow ducklings played follow the leader!',
          particleColors: [0xfacc15, 0xffffff]
        }
      ]
    },

    // =========================================================================
    // PAGE 3: The Ticklish Twilight Trail
    // =========================================================================
    {
      pageNumber: 3,
      title: 'Page 3: The Ticklish Twilight Trail!',
      theme: 'twilight-woods',
      words: ['In', 'the', 'twilight', 'woods,', 'glowing', 'fireflies', 'danced', 'around', 'a', 'musical', 'hollow', 'log!'],
      hotspots: [
        {
          id: 'p3-sparky',
          label: 'Lantern Sparky',
          x: 295,
          y: 515,
          width: 130,
          height: 130,
          propType: 'sparky',
          gagAnimation: 'sparkle-sneeze',
          sfx: 'sneeze',
          popText: 'Ah-CHOO! Glow! ✨',
          speechLine: 'Ah-choo! Sparky sneezed a shower of golden twinkles!',
          particleColors: [0xfde047, 0x34d399, 0xffffff]
        },
        {
          id: 'p3-doggie',
          label: 'Sniffing Doggie',
          x: 480,
          y: 540,
          width: 120,
          height: 120,
          propType: 'doggie',
          gagAnimation: 'wobble-spin',
          sfx: 'doggie',
          popText: 'Sniff-Squeak! 🐶',
          speechLine: 'Sniff, sniff, squeak! Doggie found a trail of blueberries!',
          particleColors: [0xf472b6, 0xc084fc]
        },
        {
          id: 'p3-skunk',
          label: 'Hollow Log Critter',
          x: 735,
          y: 545,
          width: 175,
          height: 110,
          propType: 'hollow-skunk',
          gagAnimation: 'peek-a-boo',
          sfx: 'boing',
          popText: 'Peek-a-Boo! 🦨',
          speechLine: 'Surprise! A friendly baby skunk popped out Wearing a party hat!',
          particleColors: [0xc084fc, 0xffffff, 0xfacc15]
        },
        {
          id: 'p3-mushrooms',
          label: 'Musical Bongo Mushrooms',
          x: 985,
          y: 565,
          width: 140,
          height: 105,
          propType: 'mushrooms',
          gagAnimation: 'squash-pop',
          sfx: 'chime',
          popText: 'Boop-Bop-Ding! 🍄',
          speechLine: 'Ding-dong-boing! The spotted mushrooms play music like xylophones!',
          particleColors: [0xf43f5e, 0xfde047, 0x38bdf8]
        },
        {
          id: 'p3-fireflies',
          label: 'Glowing Firefly Jar',
          x: 615,
          y: 380,
          width: 110,
          height: 115,
          propType: 'firefly-jar',
          gagAnimation: 'fly-circle',
          sfx: 'zap',
          popText: 'Twinkle-Buzz! ✨',
          speechLine: 'Wheee! The glowing fireflies zoomed around in a loop-de-loop!',
          particleColors: [0xfef08a, 0x4ade80]
        },
        {
          id: 'p3-owl-twilight',
          label: 'Disco Tree Owl',
          x: 185,
          y: 265,
          width: 110,
          height: 110,
          propType: 'owl-tree',
          gagAnimation: 'jump-flip',
          sfx: 'hoot',
          popText: 'Disco Hoo! 🦉',
          speechLine: 'Hoo-hoo! It is nighttime, so the owl is ready to dance!',
          particleColors: [0xc084fc, 0xfbbf24]
        }
      ]
    },

    // =========================================================================
    // PAGE 4: The Giant Gooey Marshmallow Roast!
    // =========================================================================
    {
      pageNumber: 4,
      title: 'Page 4: The Giant Gooey Marshmallow Roast!',
      theme: 'campfire-roast',
      words: ['Around', 'the', 'warm', 'campfire,', 'Sparky', 'toasted', 'a', 'marshmallow', 'as', 'big', 'as', 'a', 'pillow!'],
      hotspots: [
        {
          id: 'p4-campfire',
          label: 'Crackling Campfire',
          x: 640,
          y: 545,
          width: 150,
          height: 135,
          propType: 'campfire',
          gagAnimation: 'squash-pop',
          sfx: 'fire-crackle',
          popText: 'Crackle-Pop! 🔥',
          speechLine: 'Pop, crackle, whoosh! The cozy campfire danced with orange sparks!',
          particleColors: [0xf97316, 0xfacc15, 0xef4444]
        },
        {
          id: 'p4-sparky',
          label: 'Chef Sparky',
          x: 375,
          y: 505,
          width: 135,
          height: 135,
          propType: 'sparky',
          gagAnimation: 'sparkle-sneeze',
          sfx: 'sparky',
          popText: 'Toasty Puff! 🐉',
          speechLine: 'Sparky used a tiny dragon puff to toast the s-mores!',
          particleColors: [0xfbbf24, 0x10b981]
        },
        {
          id: 'p4-doggie',
          label: 'Happy Doggie',
          x: 890,
          y: 515,
          width: 125,
          height: 125,
          propType: 'doggie',
          gagAnimation: 'jump-flip',
          sfx: 'doggie',
          popText: 'Yum-Squeak! 🐾',
          speechLine: 'Arf-squeak! Doggie got fluffy marshmallow on his nose!',
          particleColors: [0xffffff, 0xf472b6]
        },
        {
          id: 'p4-marshmallow',
          label: 'Jumbo Marshmallow Stick',
          x: 520,
          y: 445,
          width: 120,
          height: 110,
          propType: 'marshmallow-log',
          gagAnimation: 'inflate-pop',
          sfx: 'crunch',
          popText: 'PUFF! Chomp!  marshmallows!',
          speechLine: 'Whoa! That marshmallow puffed up as big as a beach ball! Nom nom nom!',
          particleColors: [0xffffff, 0xfde047]
        },
        {
          id: 'p4-cricket',
          label: 'Guitar Cricket',
          x: 195,
          y: 565,
          width: 115,
          height: 105,
          propType: 'guitar-cricket',
          gagAnimation: 'wobble-spin',
          sfx: 'chime',
          popText: 'Strum-Chirp! 🎸',
          speechLine: 'Chirp-strum! The little green cricket played a campfire lullaby!',
          particleColors: [0x4ade80, 0xfbbf24]
        },
        {
          id: 'p4-shooting-star',
          label: 'Wishing Star',
          x: 1030,
          y: 230,
          width: 125,
          height: 100,
          propType: 'shooting-star',
          gagAnimation: 'fly-circle',
          sfx: 'fanfare',
          popText: 'Make a Wish! 🌠',
          speechLine: 'Zoom! Make a wish on the golden shooting star!',
          particleColors: [0xfef08a, 0x38bdf8, 0xf472b6]
        }
      ]
    },

    // =========================================================================
    // PAGE 5: Goodnight Under the Twinkling Stars
    // =========================================================================
    {
      pageNumber: 5,
      title: 'Page 5: Goodnight Under the Twinkling Stars!',
      theme: 'starry-tent',
      words: ['Snuggled', 'in', 'cozy', 'sleeping', 'bags,', 'Sparky', 'and', 'Doggie', 'waved', 'goodnight', 'to', 'the', 'smiling', 'moon!'],
      hotspots: [
        {
          id: 'p5-moon',
          label: 'Smiling Nightcap Moon',
          x: 240,
          y: 235,
          width: 135,
          height: 135,
          propType: 'moon',
          gagAnimation: 'wobble-spin',
          sfx: 'chime',
          popText: 'Sweet Dreams! 🌙',
          speechLine: 'Yaaawn! The smiling moon put on a striped purple nightcap!',
          particleColors: [0xfef08a, 0xc084fc]
        },
        {
          id: 'p5-sparky',
          label: 'Sleepy Sparky',
          x: 465,
          y: 530,
          width: 135,
          height: 130,
          propType: 'sparky',
          gagAnimation: 'squash-pop',
          sfx: 'sparky',
          popText: 'Purr-Zzzz... 🐉💤',
          speechLine: 'Purr, purr... Goodnight Wyatt! Goodnight Emma!',
          particleColors: [0x34d399, 0xfde047]
        },
        {
          id: 'p5-doggie',
          label: 'Snuggly Doggie',
          x: 685,
          y: 535,
          width: 130,
          height: 125,
          propType: 'doggie',
          gagAnimation: 'jump-flip',
          sfx: 'doggie',
          popText: 'Snuggle-Squeak! 🐶❤️',
          speechLine: 'Squeak-squeak! Doggie gave everyone a giant bedtime hug!',
          particleColors: [0xf472b6, 0xffffff]
        },
        {
          id: 'p5-constellation',
          label: 'Dragon & Puppy Stars',
          x: 890,
          y: 235,
          width: 155,
          height: 115,
          propType: 'shooting-star',
          gagAnimation: 'fly-circle',
          sfx: 'fanfare',
          popText: 'Starlight Magic! ✨',
          speechLine: 'Look! The stars connected into a glittering constellation!',
          particleColors: [0xfef08a, 0x38bdf8, 0xffffff]
        },
        {
          id: 'p5-sleeping-bag',
          label: 'Ticklish Sleeping Bag',
          x: 985,
          y: 555,
          width: 150,
          height: 110,
          propType: 'sleeping-bag',
          gagAnimation: 'inflate-pop',
          sfx: 'giggle',
          popText: 'Hehehe! Tickles! 😆',
          speechLine: 'Hehehe! A little hedgehog is wiggling inside the polkadot sleeping bag!',
          particleColors: [0xf472b6, 0x38bdf8, 0xfacc15]
        },
        {
          id: 'p5-fireflies-goodnight',
          label: 'Nightlight Fireflies',
          x: 205,
          y: 515,
          width: 115,
          height: 115,
          propType: 'firefly-jar',
          gagAnimation: 'squash-pop',
          sfx: 'chime',
          popText: 'Glow-Goodnight! 🏮',
          speechLine: 'Twinkle, twinkle, little firefly lantern!',
          particleColors: [0xfde047, 0x4ade80]
        }
      ]
    }
  ]
};

export const BEACH_DAY_ADVENTURE: StoryCartridge = {
  id: 'sparky-doggie-beach',
  title: "Sparky & Doggie's Beach Day",
  subtitle: 'Inspired by Just Grandma and Me!',
  coverEmoji: '🏖️',
  accentColor: 0x38bdf8,
  pages: [
    {
      pageNumber: 1,
      title: 'Page 1: Sunny Seashell Shore!',
      theme: 'sunny-beach',
      words: ['Sparky', 'and', 'Doggie', 'built', 'a', 'giant', 'golden', 'sandcastle', 'right', 'by', 'the', 'ticklish', 'waves!'],
      hotspots: [
        {
          id: 'b1-sparky',
          label: 'Beach Sparky',
          x: 295,
          y: 520,
          width: 130,
          height: 130,
          propType: 'sparky',
          gagAnimation: 'jump-flip',
          sfx: 'sparky',
          popText: 'Surf Roar! 🐉🌊',
          speechLine: 'Cowabunga! Sparky is wearing cool beach sunglasses!',
          particleColors: [0x10b981, 0xfbbf24]
        },
        {
          id: 'b1-doggie',
          label: 'Digging Doggie',
          x: 485,
          y: 545,
          width: 120,
          height: 120,
          propType: 'doggie',
          gagAnimation: 'wobble-spin',
          sfx: 'doggie',
          popText: 'Dig-Dig-Squeak! 🐾',
          speechLine: 'Arf-squeak! Doggie dug up a shiny pink seashell!',
          particleColors: [0xf472b6, 0xfde047]
        },
        {
          id: 'b1-crab',
          label: 'Sandcastle King Crab',
          x: 735,
          y: 535,
          width: 155,
          height: 135,
          propType: 'sandcastle-crab',
          gagAnimation: 'peek-a-boo',
          sfx: 'boing',
          popText: 'Snip-Snap! 🦀👑',
          speechLine: 'Pinchy-pinch! A silly red crab popped out of the sandcastle tower!',
          particleColors: [0xef4444, 0xfacc15]
        },
        {
          id: 'b1-umbrella',
          label: 'Spinning Beach Umbrella',
          x: 990,
          y: 445,
          width: 165,
          height: 165,
          propType: 'beach-umbrella',
          gagAnimation: 'wobble-spin',
          sfx: 'pop',
          popText: 'Wheee-Spin! ⛱️',
          speechLine: 'Wheee! The striped beach umbrella spun around like a pinwheel!',
          particleColors: [0xf43f5e, 0x38bdf8, 0xfde047]
        },
        {
          id: 'b1-whale',
          label: 'Spouting Friendly Whale',
          x: 590,
          y: 345,
          width: 145,
          height: 105,
          propType: 'ocean-whale',
          gagAnimation: 'splash-arc',
          sfx: 'splash',
          popText: 'WHOOSH! 🐳💦',
          speechLine: 'Sploosh! The friendly blue whale sprayed a giant water fountain!',
          particleColors: [0x38bdf8, 0xffffff]
        },
        {
          id: 'b1-seagull',
          label: 'Silly Seagull',
          x: 215,
          y: 255,
          width: 115,
          height: 100,
          propType: 'seagull-hat',
          gagAnimation: 'fly-circle',
          sfx: 'giggle',
          popText: 'Squawk-Hehe! 🐦',
          speechLine: 'Squawk! That seagull tried on Sparky’s sun hat!',
          particleColors: [0xffffff, 0xfacc15]
        }
      ]
    }
  ]
};

export const STORY_CARTRIDGES: Record<string, StoryCartridge> = {
  [JUST_NANA_AND_US.id]: JUST_NANA_AND_US,
  [CAMPOUT_ADVENTURE.id]: CAMPOUT_ADVENTURE,
  [BEACH_DAY_ADVENTURE.id]: BEACH_DAY_ADVENTURE
};
