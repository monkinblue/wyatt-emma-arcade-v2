# Wyatt & Emma Arcade v2.0 — Master Architecture & Agent Rules

## 0. Flagship TV Centerpiece Rule (`StarshipUnicornScene.ts` & `StarshipAudioEngine.ts`)
- **HD 3D Isometric Pre-Rendered World + Additive Holographic Shaders + Space-Industrial Audio:**
  - `StarshipUnicornScene.ts` renders over a high-definition 16:9 pre-rendered 3D isometric alien factory plateau (`public/assets/starship/board-isometric-factory.png`) with `Phaser.Textures.FilterMode.LINEAR` (strictly NO pixel art), flush 30° isometric conveyor-belt deck segments, additive holographic shaders/particles (`Phaser.BlendModes.ADD` / `SCREEN`), and a motorized sliding telemetry drawer (`y = 0` during `TRIVIA`, `y = +250` off-screen during `ROLL` & `MOVE`).
  - **Strictly Space-Industrial Acoustics (ZERO 90s Arcade Boops):** Every UI hover, button press, drawer slide, dice tumble, RCS thruster hop, and special-pad trigger in `StarshipUnicornScene.ts` is synthesized in `StarshipAudioEngine.ts` using multi-layered industrial acoustics: **Sub-Bass Mechanical Mass (45–90Hz punch) + Metallic FM Solenoid/Bolt Clatter + Bandpass/Highpass Filtered White-Noise Pneumatic Steam/Hydraulic Hiss**.

## 1. Mission & Audience
We are building **Arcade v2.0** (`learn-study.com`), a Nintendo-polished, offline-first 2D landscape tablet app for **Wyatt (age 4)** and **Emma (age 3)**.
- **Recurring Companions:**
  - **Sparky:** Wyatt's friendly emerald-and-gold cloud dragon.
  - **Doggie:** Emma's fluffy white stuffed dog sidekick (squeak-bark & bouncy animations).
- **UX Golden Rules (Ages 3–4):**
  - Landscape tablet first (`1280x720` logical resolution, `touch-action: none`, minimum `64x64px` hit areas).
  - Zero reading required to navigate: tactile icon buttons, squash-and-stretch feedback, and warm audio cues.
  - Mentor Mode: Whenever introducing a new architectural file or Phaser/Vite concept, explain briefly in plain English *what* it does and *why* we use it so the developer learns organically.

## 2. Strictly 2D Tech Stack (NO 3D)
- **Build & Dev Server:** Vite + TypeScript (`npm run dev` for instant HMR preview, `npm run build` for static deployment).
- **2D Game Engine:** Phaser (strictly 2D WebGL — ZERO 3D, Three.js, or Blender).
  - Use **Phaser Tweens & Containers** for *Living Books* / paper-doll squash-and-stretch animations.
  - Use **Matter.js / Arcade Physics** for physics mini-games.
  - Use **Phaser Lights / Masks / Particles** for flashlights, sparkles, and weather.
- **Audio Engine:** Howler.js (`AudioBus.ts`) for instant, overlapping SFX, BGM ducking, family `.m4a` recordings, and ElevenLabs MP3 voice narration. Only use `window.speechSynthesis` as a temporary placeholder before real audio files are dropped in.
- **Offline PWA:** `vite-plugin-pwa` (Workbox `generateSW`) so all code, atlases, and audio cache automatically without manual Service Worker version bumps.

## 3. Core Directory Structure
```text
wyatt-arcade-v2/
├── public/
│   └── assets/
│       ├── hub/            # Console icons, UI frames, companion avatars
│       ├── stories/        # Living Books page backgrounds, sprite cutouts & narration audio
│       ├── games/          # Per-game sprite atlases & SFX
│       └── audio/          # Shared UI pops, fanfare, Wyatt/Emma voice clips
├── src/
│   ├── core/
│   │   ├── ArcadeState.ts  # Active kid ('wyatt' | 'emma'), tabs ('play' | 'read' | 'create'), save data
│   │   ├── AudioBus.ts     # Howler.js sound/narration manager with BGM ducking
│   │   └── Juice.ts        # Reusable squash-stretch tweens, star bursts, screen shake
│   ├── scenes/
│   │   ├── BootScene.ts    # Preloader & Kid Profile Selector
│   │   ├── HubScene.ts     # Main Arcade Home Screen (Play / Read / Create tabs + Game Grid)
│   │   └── StoryEngineScene.ts # Reusable "Just Grandma and Me" Living Books engine!
│   ├── stories/
│   │   └── grandma-beach/  # Declarative story data (pages, karaoke timings, hotspot gags)
│   └── main.ts             # Phaser 1280x720 Scale.FIT configuration
└── tools/                  # Python/Node helper scripts (sprite cropping, background removal, audio prep)
```
