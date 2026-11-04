/**
 * AudioBus.ts
 * -----------
 * Unified sound effects, background music, and narration bus built on Howler.js + Web Audio API.
 *
 * Features:
 * 1. Howler.js integration for real MP3 / M4A family voice recordings and ElevenLabs narration.
 * 2. Automatic BGM ducking (smoothly lowers background music volume whenever narration or voice plays).
 * 3. Instant procedural cartoon synthesizer (Web Audio API) so every button pop, Sparky roar,
 *    Doggie squeak-bark, vintage car horn, cuckoo clock, whistling kettle, and goose honk works
 *    immediately with zero missing file errors.
 * 4. Smart family audio asset probe (`public/assets/stories/nana/audio/`) that plays real `.m4a`/`.mp3`
 *    files when present and falls back gracefully to `window.speechSynthesis` if not yet recorded.
 */

import { Howl, Howler } from 'howler';

export type SfxName =
  | 'pop'
  | 'tab'
  | 'sparky'
  | 'doggie'
  | 'boing'
  | 'splash'
  | 'chime'
  | 'giggle'
  | 'crunch'
  | 'hoot'
  | 'ribbit'
  | 'fanfare'
  | 'page-turn'
  | 'fire-crackle'
  | 'sneeze'
  | 'zap'
  | 'horn'
  | 'cuckoo'
  | 'kettle'
  | 'honk'
  | 'purr'
  | 'clang'
  | 'split-flap'
  | 'jet-whoosh'
  | 'carousel-rumble'
  | 'airport-chime'
  | 'hug-chord'
  | 'doggie-shades'
  | 'sfx-the-end'
  | 'sfx-book-select'
  | 'sfx-book-locked';

class AudioBusManager {
  private sfxHowls: Map<string, Howl> = new Map();
  private sfxOnsetOffsets: Map<string, number> = new Map();
  private activeNarrationHowl: Howl | null = null;
  private activeVoiceClipHowl: Howl | null = null;
  private activeAmbientHowl: Howl | null = null;
  private activeNarrationTimers: number[] = [];
  private bgmHowl: Howl | null = null;
  private audioExistsCache: Map<string, string | null> = new Map();
  private isMuted: boolean = false;
  private isBgmDucked: boolean = false;
  private bgmBaseVolume: number = 0.25;
  private ambientTimer: number | null = null;
  private unlockListenersInstalled: boolean = false;

  /**
   * Installs one-time pointer/touch/keyboard unlock listeners so Howler's WebAudio context
   * unlocks immediately on the very first user tap anywhere in the app—and NEVER restarts
   * narration on subsequent hotspot clicks!
   */
  public installUnlockListeners(): void {
    if (this.unlockListenersInstalled || typeof window === 'undefined') return;
    this.unlockListenersInstalled = true;

    const unlock = () => {
      const ctx = Howler.ctx as AudioContext | undefined;
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      if (!ctx || ctx.state === 'running') {
        window.removeEventListener('pointerdown', unlock, true);
        window.removeEventListener('touchstart', unlock, true);
        window.removeEventListener('keydown', unlock, true);
      }
    };

    window.addEventListener('pointerdown', unlock, { capture: true, passive: true });
    window.addEventListener('touchstart', unlock, { capture: true, passive: true });
    window.addEventListener('keydown', unlock, { capture: true, passive: true });
  }

  /**
   * Preloads all verified Page 1 & Page 2 `.mp3` narration and hotspot SFX files in
   * `/assets/stories/nana/audio/` directly into Howler.js on boot so they play with
   * zero network/probe latency!
   */
  public preloadPage1Audio(): void {
    const verifiedStoryMp3s = [
      // Page 1
      '/assets/stories/nana/audio/p1-narration.mp3',
      '/assets/stories/nana/audio/sfx-airport-chime.mp3',
      '/assets/stories/nana/audio/sfx-carousel.mp3',
      '/assets/stories/nana/audio/sfx-doggie-bark.mp3',
      '/assets/stories/nana/audio/sfx-family-hug.mp3',
      '/assets/stories/nana/audio/sfx-flap-board.mp3',
      '/assets/stories/nana/audio/sfx-jet-takeoff.mp3',
      '/assets/stories/nana/audio/sfx-sparky-wings.mp3',
      '/assets/stories/nana/audio/sfx-wyatt-iloveyou.m4a',
      // Page 2
      '/assets/stories/nana/audio/p2-narration.mp3',
      '/assets/stories/nana/audio/sfx-porch-wave.mp3',
      '/assets/stories/nana/audio/sfx-kids-run.mp3',
      '/assets/stories/nana/audio/kids-were-here.m4a',
      '/assets/stories/nana/audio/sfx-mailbox-birds.mp3',
      '/assets/stories/nana/audio/sfx-squirrels.mp3',
      '/assets/stories/nana/audio/sfx-tree-rustle.mp3',
      '/assets/stories/nana/audio/sfx-maple-leaves.mp3',
      // Page 3
      '/assets/stories/nana/audio/p3-narration.mp3',
      '/assets/stories/nana/audio/sfx-doggie-clock-pull.mp3',
      '/assets/stories/nana/audio/sfx-cuckoo-clock.mp3',
      '/assets/stories/nana/audio/sfx-grammy-giggle.mp3',
      '/assets/stories/nana/audio/sfx-tea-cookies.mp3',
      '/assets/stories/nana/audio/sfx-lamp-click.mp3',
      '/assets/stories/nana/audio/sfx-photo-chime.mp3',
      '/assets/stories/nana/audio/sfx-painting-boing.mp3',
      '/assets/stories/nana/audio/sfx-cookie-dragon.mp3',
      // Page 4
      '/assets/stories/nana/audio/p4-narration.mp3',
      '/assets/stories/nana/audio/sfx-car-horn-rev.mp3',
      '/assets/stories/nana/audio/sfx-box-mouse.mp3',
      '/assets/stories/nana/audio/sfx-leaf-blower.mp3',
      '/assets/stories/nana/audio/sfx-sparky-wrench.mp3',
      '/assets/stories/nana/audio/sfx-wall-oven-ding.mp3',
      '/assets/stories/nana/audio/sfx-air-compressor.mp3',
      '/assets/stories/nana/audio/sfx-wreath-bird.mp3',
      '/assets/stories/nana/audio/sfx-hutch-xylophone.mp3',
      '/assets/stories/nana/audio/sfx-garage-light.mp3',
      // Page 6 (Dutch Village)
      '/assets/stories/nana/audio/p6-narration.mp3',
      '/assets/stories/nana/audio/sfx-family-skip.mp3',
      '/assets/stories/nana/audio/sfx-clogs-klomp.mp3',
      '/assets/stories/nana/audio/sfx-windmill-whoosh.mp3',
      '/assets/stories/nana/audio/sfx-ferris-carnival.mp3',
      '/assets/stories/nana/audio/sfx-dutch-door-cuckoo.mp3',
      '/assets/stories/nana/audio/sfx-chimney-stork.mp3',
      '/assets/stories/nana/audio/sfx-sparky-tulip.mp3',
      '/assets/stories/nana/audio/sfx-butterflies-magic.mp3',
      '/assets/stories/nana/audio/sfx-window-cat-meow.mp3',
      // Page 7 (Lake Michigan Beach)
      '/assets/stories/nana/audio/p7-narration.mp3',
      '/assets/stories/nana/audio/sfx-papa-stoneskip.mp3',
      '/assets/stories/nana/audio/sfx-kids-sandcastle.mp3',
      '/assets/stories/nana/audio/sfx-nana-cheer.mp3',
      '/assets/stories/nana/audio/sfx-doggie-dig.mp3',
      '/assets/stories/nana/audio/sfx-seagulls-squawk.mp3',
      '/assets/stories/nana/audio/sfx-sparky-smores.mp3',
      '/assets/stories/nana/audio/sfx-sailboat-splash.mp3',
      '/assets/stories/nana/audio/sfx-beach-ball.mp3',
      '/assets/stories/nana/audio/sfx-umbrella-breeze.mp3',
      // Page 8 (Woodland Cabin)
      '/assets/stories/nana/audio/p8-narration.mp3',
      '/assets/stories/nana/audio/sfx-kids-cabin-laugh.mp3',
      '/assets/stories/nana/audio/sfx-nana-cocoa.mp3',
      '/assets/stories/nana/audio/sfx-sparky-chimney.mp3',
      '/assets/stories/nana/audio/sfx-forest-deer.mp3',
      '/assets/stories/nana/audio/sfx-geese-honk.mp3',
      '/assets/stories/nana/audio/sfx-wind-chimes.mp3',
      '/assets/stories/nana/audio/sfx-doggie-squirrel.mp3',
      '/assets/stories/nana/audio/sfx-bluejay-whistle.mp3',
      // Page 9 (Cozy Cabin Bedtime)
      '/assets/stories/nana/audio/p9-narration.mp3',
      '/assets/stories/nana/audio/sfx-fireplace-ambient.mp3',
      '/assets/stories/nana/audio/sfx-the-end.mp3',
      // Hub Heirloom Bookshelf
      '/assets/hub/audio/sfx-book-select.mp3',
      '/assets/hub/audio/sfx-book-locked.mp3'
    ];

    verifiedStoryMp3s.forEach((url) => {
      this.audioExistsCache.set(url, url);
      if (!this.sfxHowls.has(url)) {
        const howl = new Howl({
          src: [url],
          volume:
            url.includes('narration') ||
            url.includes('iloveyou') ||
            url.includes('kids-were-here') ||
            url.includes('sfx-squirrels')
              ? 1.0
              : url.includes('sfx-tree-rustle')
              ? 0.7
              : url.includes('sfx-kids-run')
              ? 0.6
              : 0.92,
          preload: true
        });
        this.sfxHowls.set(url, howl);
      }
    });

    // Register the stem alias for Wyatt & Emma's real "Love you Nana Papa!" recording (`sfx-wyatt-iloveyou.m4a`)
    this.audioExistsCache.set(
      '/assets/stories/nana/audio/sfx-wyatt-iloveyou',
      '/assets/stories/nana/audio/sfx-wyatt-iloveyou.m4a'
    );

    // Also probe optional cover narration (`cover-narration.mp3`) and future real family voice clips
    // in the background so if they are present or dropped into `/assets/stories/nana/audio/` later,
    // they are preloaded into Howler with zero console errors!
    [
      '/assets/stories/nana/audio/cover-narration.mp3',
      '/assets/stories/nana/audio/sfx-wyatt-iloveyou',
      '/assets/stories/nana/audio/sfx-emma-iloveyou'
    ].forEach((stem) => {
      void this.resolveRealAudioUrl(stem).then((realUrl) => {
        if (realUrl && !this.sfxHowls.has(realUrl)) {
          this.sfxHowls.set(
            realUrl,
            new Howl({
              src: [realUrl],
              volume: 1.0,
              preload: true
            })
          );
        }
      });
    });
  }

  private getAudioContext(): AudioContext | null {
    const ctx = Howler.ctx as AudioContext | undefined;
    if (ctx) {
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      return ctx;
    }
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      return new AudioCtx();
    } catch {
      return null;
    }
  }

  /**
   * Pre-registers an external MP3/M4A sound effect with Howler.js.
   */
  public registerSfx(key: string, src: string[], volume: number = 0.85): void {
    const howl = new Howl({
      src,
      volume,
      preload: true
    });
    this.sfxHowls.set(key, howl);
  }

  /**
   * Probes whether a real audio file (.mp3, .m4a, .wav, .ogg) exists in `public/assets/...`.
   * Checks `.mp3` first and avoids Vite SPA HTML fallback false positives by checking Content-Type.
   */
  private async resolveRealAudioUrl(baseOrFullSrc?: string): Promise<string | null> {
    if (!baseOrFullSrc) return null;
    if (this.audioExistsCache.has(baseOrFullSrc)) {
      return this.audioExistsCache.get(baseOrFullSrc) ?? null;
    }

    const baseNoExt = baseOrFullSrc.replace(/(\.(mp3|m4a|ogg|wav))+$/i, '');
    const candidates = Array.from(
      new Set([
        baseOrFullSrc,
        `${baseNoExt}.m4a`,
        `${baseNoExt}.mp3`,
        `${baseNoExt}.m4a.m4a`,
        `${baseNoExt}.wav`,
        `${baseNoExt}.ogg`
      ])
    );

    for (const url of candidates) {
      try {
        const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
        const contentType = res.headers.get('content-type') ?? '';
        if (res.ok && !contentType.includes('text/html')) {
          this.audioExistsCache.set(baseOrFullSrc, url);
          return url;
        }
      } catch {
        // Ignore network errors offline
      }
    }

    this.audioExistsCache.set(baseOrFullSrc, null);
    return null;
  }

  /**
   * Preloads a list of hotspot SFX URLs into Howler.js so they fire with zero (<5ms) latency on tap!
   */
  public preloadHotspotSfx(urls: (string | undefined)[]): void {
    const uniqueUrls = Array.from(new Set(urls.filter((u): u is string => Boolean(u))));
    uniqueUrls.forEach((src) => {
      void this.resolveRealAudioUrl(src).then((realUrl) => {
        if (realUrl && !this.sfxHowls.has(realUrl)) {
          const howl = new Howl({
            src: [realUrl],
            volume: 0.92,
            preload: true
          });
          this.sfxHowls.set(realUrl, howl);
        }
      });
    });
  }

  /**
   * Plays a hotspot's environmental/character SFX!
   * - NEVER speaks a narrated sentence or calls `window.speechSynthesis`.
   * - Plays the real `.mp3` file from `public/assets/stories/nana/audio/` if present on disk,
   *   or falls back cleanly to our WebAudio synthesized SFX (`playSfx`) if the `.mp3` isn't dropped in yet!
   * - For the Page 1 Family Hug (`sfx-family-hug.mp3`), automatically checks and prefers
   *   `sfx-wyatt-iloveyou` / `sfx-emma-iloveyou` (`.m4a` or `.mp3`) whenever dropped in later!
   */
  public playHotspotSfx(fallbackSfx: SfxName, customSfxSrc?: string, preferKidClipOrder?: ('wyatt' | 'emma')[]): void {
    if (this.isMuted) return;

    const ctx = Howler.ctx as AudioContext | undefined;
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    if (!customSfxSrc) {
      this.playSfx(fallbackSfx);
      return;
    }

    // Automatic check/preference for future `sfx-wyatt-iloveyou` / `sfx-emma-iloveyou` (.m4a or .mp3)
    if (customSfxSrc.includes('sfx-family-hug')) {
      const order = preferKidClipOrder ?? ['wyatt', 'emma'];
      for (const kid of order) {
        const stem = `/assets/stories/nana/audio/sfx-${kid}-iloveyou`;
        const resolvedKidClip = this.audioExistsCache.get(stem);
        if (resolvedKidClip) {
          let kidHowl = this.sfxHowls.get(resolvedKidClip);
          if (!kidHowl) {
            kidHowl = new Howl({
              src: [resolvedKidClip],
              volume: 1.0,
              preload: true
            });
            this.sfxHowls.set(resolvedKidClip, kidHowl);
          }
          kidHowl.stop();
          kidHowl.play();
          return;
        }
      }
    }

    // Fast path: if already resolved & cached, fire synchronously (<5ms latency)!
    if (this.audioExistsCache.has(customSfxSrc)) {
      const cachedUrl = this.audioExistsCache.get(customSfxSrc);
      if (!cachedUrl) {
        this.playSfx(fallbackSfx);
        return;
      }
      let howl = this.sfxHowls.get(cachedUrl);
      if (!howl) {
        howl = new Howl({
          src: [cachedUrl],
          volume: 0.92,
          preload: true
        });
        this.sfxHowls.set(cachedUrl, howl);
      }
      howl.stop();
      if (cachedUrl.includes('sfx-squirrels')) {
        howl.volume(1.0);
      } else if (cachedUrl.includes('sfx-kids-run')) {
        howl.volume(0.6);
      }
      howl.play();
      // Simultaneous layered rustle for Page 2 Squirrels (`sfx-squirrels` vol 1.0 + `sfx-tree-rustle` vol 0.7)
      if (cachedUrl.includes('sfx-squirrels')) {
        this.playLayerSfx('/assets/stories/nana/audio/sfx-tree-rustle.mp3', 0.7);
      }
      // Simultaneous layered real kids' "We're here!" voice (`kids-were-here.m4a` vol 1.0 + `sfx-kids-run` vol 0.6)
      if (cachedUrl.includes('sfx-kids-run')) {
        this.playLayerSfx('/assets/stories/nana/audio/kids-were-here.m4a', 1.0);
      }
      return;
    }

    void this.resolveRealAudioUrl(customSfxSrc).then((realUrl) => {
      if (this.isMuted) return;
      if (realUrl) {
        let howl = this.sfxHowls.get(realUrl);
        if (!howl) {
          howl = new Howl({
            src: [realUrl],
            volume: realUrl.includes('sfx-squirrels')
              ? 1.0
              : realUrl.includes('sfx-kids-run')
              ? 0.6
              : 0.92,
            preload: true
          });
          this.sfxHowls.set(realUrl, howl);
        }
        howl.stop();
        howl.play();
        if (realUrl.includes('sfx-squirrels')) {
          this.playLayerSfx('/assets/stories/nana/audio/sfx-tree-rustle.mp3', 0.7);
        }
        if (realUrl.includes('sfx-kids-run')) {
          this.playLayerSfx('/assets/stories/nana/audio/kids-were-here.m4a', 1.0);
        }
      } else {
        this.playSfx(fallbackSfx);
      }
    });
  }

  /**
   * Plays an additional simultaneous SFX layer at a specific volume (e.g. `sfx-tree-rustle.mp3` at 0.7
   * layered underneath `sfx-squirrels.mp3` at 1.0, or `kids-were-here.m4a` at 1.0 over `sfx-kids-run.mp3` at 0.6).
   * Automatically detects & skips any leading silence (>15ms) in `.m4a` buffers via WebAudio sample inspection!
   */
  public playLayerSfx(customSfxSrc: string, volume: number = 0.7): void {
    if (this.isMuted) return;
    let howl = this.sfxHowls.get(customSfxSrc);
    if (!howl) {
      howl = new Howl({
        src: [customSfxSrc],
        volume,
        preload: true
      });
      this.sfxHowls.set(customSfxSrc, howl);
    } else {
      howl.volume(volume);
    }
    howl.stop();
    const soundId = howl.play();
    const offsetSec = this.getOrDetectLeadingSilenceOffset(customSfxSrc, howl);
    if (offsetSec > 0.012) {
      howl.seek(offsetSec, soundId);
    }
  }

  public stopLayerSfx(customSfxSrc: string): void {
    const howl = this.sfxHowls.get(customSfxSrc);
    if (howl) {
      howl.stop();
    }
  }

  private getOrDetectLeadingSilenceOffset(url: string, howl: Howl): number {
    if (this.sfxOnsetOffsets.has(url)) {
      return this.sfxOnsetOffsets.get(url) ?? 0;
    }
    try {
      const sounds = (howl as unknown as { _sounds?: { _node?: { buffer?: AudioBuffer } }[] })._sounds;
      const buffer = sounds?.[0]?._node?.buffer;
      if (buffer && buffer.length > 0 && buffer.numberOfChannels > 0) {
        const ch0 = buffer.getChannelData(0);
        const sr = buffer.sampleRate;
        for (let i = 0; i < ch0.length; i++) {
          if (Math.abs(ch0[i]) > 0.018) {
            const onsetSec = Math.max(0, i / sr - 0.008);
            this.sfxOnsetOffsets.set(url, onsetSec);
            return onsetSec;
          }
        }
      }
    } catch {
      // Ignore if buffer not yet decoded
    }
    return 0;
  }

  /**
   * Plays a named SFX. Uses a registered Howl if available; otherwise synthesizes
   * a warm, tactile cartoon sound effect via Web Audio API.
   */
  public playSfx(name: SfxName): void {
    if (this.isMuted) return;

    const registered = this.sfxHowls.get(name);
    if (registered && registered.state() === 'loaded') {
      registered.play();
      return;
    }

    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    switch (name) {
      case 'pop':
        this.synthTone(ctx, 'sine', 380, 740, 0.09, 0.25, now);
        break;

      case 'tab':
        this.synthTone(ctx, 'triangle', 320, 520, 0.11, 0.22, now);
        this.synthTone(ctx, 'sine', 520, 680, 0.08, 0.15, now + 0.05);
        break;

      case 'sparky':
        // Playful baby dragon trill + emerald-and-gold magic dust chime!
        [440, 554.37, 659.25, 880, 1108.73, 1318.5].forEach((freq, idx) => {
          this.synthTone(ctx, 'triangle', freq * 0.92, freq * 1.08, 0.11, 0.24, now + idx * 0.045);
        });
        this.synthTone(ctx, 'sine', 1318.5, 1760, 0.28, 0.2, now + 0.27);
        this.synthTone(ctx, 'sine', 1760, 2093, 0.24, 0.15, now + 0.34);
        break;

      case 'doggie':
      case 'doggie-shades':
        // Fluffy stuffed doggie double squeak-bark ("Arf-squeak!") + sunglasses star-pop!
        this.synthTone(ctx, 'sine', 620, 1220, 0.085, 0.28, now);
        this.synthTone(ctx, 'sine', 1220, 740, 0.065, 0.2, now + 0.075);
        this.synthTone(ctx, 'sine', 680, 1380, 0.1, 0.3, now + 0.16);
        this.synthTone(ctx, 'triangle', 987.77, 1567.98, 0.14, 0.2, now + 0.27);
        this.synthTone(ctx, 'sine', 1567.98, 2093, 0.16, 0.16, now + 0.34);
        break;

      case 'boing':
        this.synthBoing(ctx, now);
        break;

      case 'splash':
        this.synthNoiseBurst(ctx, 0.32, 850, 220, 0.28, now);
        this.synthTone(ctx, 'sine', 280, 620, 0.12, 0.16, now + 0.08);
        break;

      case 'chime':
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
          this.synthTone(ctx, 'sine', freq, freq * 1.01, 0.22, 0.18, now + idx * 0.055);
        });
        break;

      case 'fanfare':
        [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, idx) => {
          this.synthTone(ctx, 'triangle', freq, freq, 0.28, 0.22, now + idx * 0.075);
        });
        break;

      case 'giggle':
        [640, 760, 680, 860, 940].forEach((freq, idx) => {
          this.synthTone(ctx, 'sine', freq, freq * 1.12, 0.07, 0.2, now + idx * 0.065);
        });
        break;

      case 'crunch':
        this.synthNoiseBurst(ctx, 0.12, 1400, 420, 0.25, now);
        this.synthNoiseBurst(ctx, 0.12, 1200, 380, 0.22, now + 0.14);
        break;

      case 'hoot':
        this.synthTone(ctx, 'sine', 370, 340, 0.22, 0.26, now);
        this.synthTone(ctx, 'sine', 392, 330, 0.34, 0.28, now + 0.28);
        break;

      case 'ribbit':
        this.synthTone(ctx, 'sawtooth', 160, 420, 0.09, 0.16, now);
        this.synthTone(ctx, 'sawtooth', 220, 620, 0.13, 0.18, now + 0.12);
        break;

      case 'page-turn':
        // Soft, warm paper rustle + gentle storybook page breeze
        this.synthNoiseBurst(ctx, 0.24, 1600, 480, 0.12, now);
        this.synthNoiseBurst(ctx, 0.16, 1100, 320, 0.09, now + 0.08);
        break;

      case 'fire-crackle':
        this.synthNoiseBurst(ctx, 0.08, 2200, 900, 0.18, now);
        this.synthTone(ctx, 'triangle', 320, 880, 0.14, 0.18, now + 0.05);
        this.synthNoiseBurst(ctx, 0.1, 1800, 700, 0.16, now + 0.11);
        break;

      case 'sneeze':
        this.synthTone(ctx, 'sine', 360, 720, 0.15, 0.22, now);
        this.synthNoiseBurst(ctx, 0.18, 2400, 500, 0.26, now + 0.16);
        this.synthTone(ctx, 'sine', 880, 1320, 0.18, 0.16, now + 0.22);
        break;

      case 'zap':
        this.synthTone(ctx, 'sawtooth', 880, 220, 0.15, 0.16, now);
        this.synthTone(ctx, 'sine', 440, 960, 0.15, 0.18, now + 0.08);
        break;

      case 'horn':
        // Classic vintage convertible "AOOGA / Beep-Beep!" horn
        this.synthTone(ctx, 'sawtooth', 310, 440, 0.14, 0.22, now);
        this.synthTone(ctx, 'sawtooth', 440, 290, 0.26, 0.24, now + 0.14);
        break;

      case 'cuckoo':
        // Classic wooden cuckoo clock "Cuck-oo! Cuck-oo!"
        this.synthTone(ctx, 'sine', 659.25, 659.25, 0.14, 0.28, now);
        this.synthTone(ctx, 'sine', 523.25, 523.25, 0.24, 0.28, now + 0.18);
        break;

      case 'kettle':
        // Cozy whistling iron tea kettle on the cabin stove
        this.synthNoiseBurst(ctx, 0.38, 2600, 2800, 0.12, now);
        this.synthTone(ctx, 'sine', 1150, 1480, 0.36, 0.2, now + 0.02);
        break;

      case 'honk':
        // Silly yard goose "HONK-HONK!"
        this.synthTone(ctx, 'sawtooth', 280, 390, 0.13, 0.2, now);
        this.synthTone(ctx, 'sawtooth', 310, 420, 0.16, 0.22, now + 0.16);
        break;

      case 'purr':
        // Cozy kitty / cuddle purr + warm hum
        this.synthTone(ctx, 'triangle', 140, 190, 0.28, 0.2, now);
        this.synthTone(ctx, 'sine', 440, 523.25, 0.2, 0.15, now + 0.15);
        break;

      case 'clang':
        // Musical garage tools / wooden clogs rhythmic tap-clang
        this.synthTone(ctx, 'triangle', 580, 240, 0.1, 0.24, now);
        this.synthTone(ctx, 'sine', 860, 420, 0.11, 0.22, now + 0.11);
        this.synthTone(ctx, 'triangle', 720, 360, 0.12, 0.24, now + 0.22);
        break;

      case 'split-flap':
        // Crisp mechanical split-flap board clack-clack-clack + arrival bell!
        for (let i = 0; i < 8; i++) {
          const offset = i * 0.042;
          this.synthNoiseBurst(ctx, 0.026, 2600, 950, 0.24, now + offset);
          this.synthTone(ctx, 'triangle', 680 + (i % 3) * 120, 210, 0.028, 0.19, now + offset);
        }
        this.synthTone(ctx, 'sine', 1046.5, 1046.5, 0.22, 0.22, now + 0.35);
        break;

      case 'jet-whoosh':
        // Realistic runway passenger jet turbine spool-up + skyward whoosh!
        this.synthNoiseBurst(ctx, 0.56, 260, 1650, 0.26, now);
        this.synthNoiseBurst(ctx, 0.42, 1650, 480, 0.2, now + 0.18);
        this.synthTone(ctx, 'sawtooth', 95, 340, 0.48, 0.14, now);
        this.synthTone(ctx, 'triangle', 220, 660, 0.44, 0.12, now + 0.06);
        break;

      case 'carousel-rumble':
        // Baggage carousel conveyor belt rumble + bouncy suitcase hop!
        this.synthTone(ctx, 'sawtooth', 78, 118, 0.36, 0.2, now);
        this.synthTone(ctx, 'triangle', 110, 88, 0.32, 0.18, now + 0.06);
        this.synthNoiseBurst(ctx, 0.3, 420, 190, 0.2, now + 0.03);
        this.synthTone(ctx, 'sine', 240, 560, 0.13, 0.24, now + 0.2);
        this.synthTone(ctx, 'sine', 340, 680, 0.12, 0.2, now + 0.31);
        break;

      case 'airport-chime':
        // Classic 3-note Grand Rapids (GRR) airport PA ding-dong-ding chime!
        this.synthTone(ctx, 'sine', 659.25, 659.25, 0.26, 0.25, now);
        this.synthTone(ctx, 'triangle', 1318.5, 1318.5, 0.18, 0.1, now);
        this.synthTone(ctx, 'sine', 523.25, 523.25, 0.26, 0.25, now + 0.2);
        this.synthTone(ctx, 'triangle', 1046.5, 1046.5, 0.18, 0.1, now + 0.2);
        this.synthTone(ctx, 'sine', 783.99, 783.99, 0.42, 0.26, now + 0.4);
        this.synthTone(ctx, 'triangle', 1567.98, 1567.98, 0.3, 0.12, now + 0.4);
        break;

      case 'hug-chord':
        // Warm, lush major-9th family hug chord + heart-fountain shimmer!
        [261.63, 329.63, 392.0, 493.88, 587.33].forEach((freq, idx) => {
          this.synthTone(ctx, 'triangle', freq, freq * 1.005, 0.48, 0.16, now + idx * 0.035);
        });
        [783.99, 987.77, 1174.66, 1567.98].forEach((freq, idx) => {
          this.synthTone(ctx, 'sine', freq, freq * 1.02, 0.22, 0.14, now + 0.18 + idx * 0.055);
        });
        break;
    }
  }

  /**
   * Ducks background music volume while voice narration is active.
   */
  public duckBgm(duck: boolean): void {
    this.isBgmDucked = duck;
    if (this.bgmHowl) {
      const target = duck ? this.bgmBaseVolume * 0.25 : this.bgmBaseVolume;
      this.bgmHowl.fade(this.bgmHowl.volume(), target, 220);
    }
  }

  /**
   * Plays `cover-narration.mp3` cleanly if present in `public/assets/stories/nana/audio/`;
   * if not present yet, fails silently with ZERO console errors and NEVER falls back to
   * `window.speechSynthesis` on the Cover spread!
   */
  public playCoverNarrationIfPresent(audioSrc?: string, onComplete?: () => void): () => void {
    this.stopNarration();
    let cancelled = false;

    if (!audioSrc || this.isMuted) {
      return () => {
        cancelled = true;
      };
    }

    const startCoverHowl = (realUrl: string | null) => {
      if (cancelled || !realUrl || this.isMuted) return;

      const ctx = Howler.ctx as AudioContext | undefined;
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      let howl = this.sfxHowls.get(realUrl);
      if (!howl) {
        howl = new Howl({
          src: [realUrl],
          volume: 1.0,
          preload: true
        });
        this.sfxHowls.set(realUrl, howl);
      }

      this.duckBgm(true);
      this.activeNarrationHowl = howl;
      howl.stop();
      howl.off('end');
      howl.off('loaderror');
      howl.off('playerror');

      howl.once('end', () => {
        if (!cancelled) {
          if (this.activeNarrationHowl === howl) {
            this.activeNarrationHowl = null;
          }
          this.duckBgm(false);
          onComplete?.();
        }
      });
      howl.once('loaderror', () => {
        if (this.activeNarrationHowl === howl) {
          this.activeNarrationHowl = null;
        }
        this.duckBgm(false);
      });
      howl.once('playerror', () => {
        howl?.once('unlock', () => {
          if (!cancelled && !this.isMuted && this.activeNarrationHowl === howl) {
            howl?.play();
          }
        });
      });

      howl.play();
    };

    if (this.audioExistsCache.has(audioSrc)) {
      startCoverHowl(this.audioExistsCache.get(audioSrc) ?? null);
    } else {
      void this.resolveRealAudioUrl(audioSrc).then((realUrl) => {
        startCoverHowl(realUrl);
      });
    }

    return () => {
      cancelled = true;
      this.stopNarration();
    };
  }

  /**
   * Speaks a story sentence or plays a family/ElevenLabs `.m4a`/`.mp3` recording if present in
   * `public/assets/stories/nana/audio/`, with automatic BGM ducking and word-by-word
   * callbacks for karaoke text highlighting.
   * When `wordTimings` (ms offsets) are provided, synchronizes each word highlight to the exact
   * speech cadence of the `.mp3` voiceover!
   */
  public playStoryNarration(
    words: string[],
    onWordIndex: (index: number) => void,
    onComplete?: () => void,
    audioSrc?: string,
    wordTimings?: number[],
    narrationDurationMs?: number
  ): () => void {
    this.stopNarration();
    this.duckBgm(true);

    let cancelled = false;
    const timers: number[] = [];
    this.activeNarrationTimers = timers;
    let timersScheduled = false;

    const scheduleWordTimers = (playSynthTick: boolean) => {
      if (timersScheduled || cancelled) return;
      timersScheduled = true;

      let elapsedMs = 80;
      words.forEach((word, index) => {
        const startMs =
          wordTimings && typeof wordTimings[index] === 'number'
            ? wordTimings[index]
            : elapsedMs;
        const duration = Math.max(300, Math.min(620, word.length * 68 + 190));

        const timerId = window.setTimeout(() => {
          if (!cancelled) {
            onWordIndex(index);
            if (playSynthTick && !this.isMuted) {
              const ctx = this.getAudioContext();
              if (ctx) {
                this.synthTone(
                  ctx,
                  'sine',
                  460 + (index % 4) * 35,
                  510 + (index % 4) * 35,
                  0.04,
                  0.03,
                  ctx.currentTime
                );
              }
            }
          }
        }, startMs);
        timers.push(timerId);
        elapsedMs = startMs + duration;
      });

      const totalMs =
        narrationDurationMs && narrationDurationMs > 0
          ? narrationDurationMs
          : elapsedMs + 250;

      const finishTimer = window.setTimeout(() => {
        if (!cancelled) {
          this.activeNarrationHowl = null;
          onWordIndex(-1);
          this.duckBgm(false);
          onComplete?.();
        }
      }, totalMs);
      timers.push(finishTimer);
    };

    const playResolvedNarration = (realUrl: string | null) => {
      if (cancelled) return;
      if (this.isMuted) {
        scheduleWordTimers(false);
        return;
      }
      if (realUrl) {
        const ctx = Howler.ctx as AudioContext | undefined;
        if (ctx && ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }

        let howl = this.sfxHowls.get(realUrl);
        if (!howl) {
          howl = new Howl({
            src: [realUrl],
            volume: 1.0,
            preload: true
          });
          this.sfxHowls.set(realUrl, howl);
        }

        this.activeNarrationHowl = howl;
        howl.stop();
        howl.volume(1.0);
        howl.off('play');
        howl.off('end');
        howl.off('loaderror');
        howl.off('playerror');

        howl.once('play', () => {
          scheduleWordTimers(false);
        });
        howl.once('end', () => {
          if (this.activeNarrationHowl === howl) {
            this.activeNarrationHowl = null;
          }
        });
        howl.once('loaderror', () => {
          if (!cancelled) {
            scheduleWordTimers(true);
            this.speakViaWebSpeech(words.join(' '));
          }
        });
        howl.once('playerror', () => {
          if (!cancelled) {
            scheduleWordTimers(false);
            howl?.once('unlock', () => {
              if (!cancelled && !this.isMuted && this.activeNarrationHowl === howl) {
                howl?.play();
              }
            });
          }
        });

        howl.play();
        const fallbackId = window.setTimeout(() => {
          scheduleWordTimers(false);
        }, 260);
        timers.push(fallbackId);
      } else {
        scheduleWordTimers(true);
        this.speakViaWebSpeech(words.join(' '));
      }
    };

    // Fast synchronous path if audioSrc is already preloaded in cache (e.g. p1-narration.mp3)
    if (audioSrc && this.audioExistsCache.has(audioSrc)) {
      playResolvedNarration(this.audioExistsCache.get(audioSrc) ?? null);
    } else {
      void this.resolveRealAudioUrl(audioSrc).then((realUrl) => {
        playResolvedNarration(realUrl);
      });
    }

    return () => {
      cancelled = true;
      timers.forEach((id) => window.clearTimeout(id));
      this.stopNarration();
    };
  }

  /**
   * Plays an optional real family voice/giggle clip (`voiceAudioSrc`) if present on disk,
   * or speaks the line aloud via Web Speech fallback.
   */
  public speakWordOrPhrase(text: string, voiceAudioSrc?: string): void {
    if (this.isMuted) return;

    if (this.activeVoiceClipHowl) {
      this.activeVoiceClipHowl.stop();
      this.activeVoiceClipHowl = null;
    }

    if (voiceAudioSrc) {
      void this.resolveRealAudioUrl(voiceAudioSrc).then((realUrl) => {
        if (this.isMuted) return;
        if (realUrl) {
          this.duckBgm(true);
          this.activeVoiceClipHowl = new Howl({
            src: [realUrl],
            volume: 1.0,
            onend: () => this.duckBgm(false),
            onloaderror: () => {
              this.duckBgm(false);
              this.speakViaWebSpeech(text, 1.0, 1.12);
            }
          });
          this.activeVoiceClipHowl.play();
        } else {
          this.speakViaWebSpeech(text, 1.0, 1.12);
        }
      });
      return;
    }

    this.speakViaWebSpeech(text, 1.0, 1.12);
  }

  public stopNarration(): void {
    this.clearNarrationTimers();
    if (this.activeNarrationHowl) {
      this.activeNarrationHowl.stop();
      this.activeNarrationHowl = null;
    }
    if (this.activeVoiceClipHowl) {
      this.activeVoiceClipHowl.stop();
      this.activeVoiceClipHowl = null;
    }
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore speech synthesis errors
      }
    }
    this.duckBgm(false);
  }

  /**
   * Clears any pending word-highlight timers without abruptly cutting off the active Howl audio
   * (used when smoothly fading out narration/ambient audio over 2500ms on "The End").
   */
  public clearNarrationTimers(): void {
    this.activeNarrationTimers.forEach((id) => window.clearTimeout(id));
    this.activeNarrationTimers = [];
  }

  /**
   * Returns any currently active narration, voice, or ambient Howl instances so a scene can
   * smoothly tween their volume down to 0 before stopping them.
   */
  public getActiveNarrationAndAmbientHowls(): Howl[] {
    const howls: Howl[] = [];
    if (this.activeNarrationHowl && this.activeNarrationHowl.playing()) {
      howls.push(this.activeNarrationHowl);
    }
    if (this.activeVoiceClipHowl && this.activeVoiceClipHowl.playing()) {
      howls.push(this.activeVoiceClipHowl);
    }
    if (this.activeAmbientHowl && this.activeAmbientHowl.playing()) {
      howls.push(this.activeAmbientHowl);
    }
    return howls;
  }

  /**
   * Starts a soft looping ambient sound effect (e.g. `sfx-fireplace-ambient.mp3` at `volume: 0.25`
   * on Page 9) that plays continuously underneath voiceover narration and stops cleanly when
   * navigating away from the page or returning to the Hub.
   */
  public startAmbientLoop(src: string, volume: number = 0.25): void {
    this.stopAmbientLoop();
    if (this.isMuted) return;

    const ctx = Howler.ctx as AudioContext | undefined;
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    let howl = this.sfxHowls.get(src);
    if (!howl) {
      howl = new Howl({
        src: [src],
        volume,
        loop: true,
        preload: true
      });
      this.sfxHowls.set(src, howl);
    } else {
      howl.volume(volume);
      howl.loop(true);
    }

    this.activeAmbientHowl = howl;
    howl.stop();
    howl.off('playerror');
    howl.once('playerror', () => {
      howl?.once('unlock', () => {
        if (!this.isMuted && this.activeAmbientHowl === howl) {
          howl?.play();
        }
      });
    });
    howl.play();
  }

  /**
   * Stops any active looping page ambient audio (such as `sfx-fireplace-ambient.mp3`).
   */
  public stopAmbientLoop(): void {
    if (this.activeAmbientHowl) {
      this.activeAmbientHowl.stop();
      this.activeAmbientHowl.loop(false);
      this.activeAmbientHowl = null;
    }
  }

  /**
   * Starts a gentle, cozy procedural music-box melody in the background so the console
   * feels alive without overwhelming voices or SFX.
   */
  public startCozyLoop(): void {
    if (this.ambientTimer !== null) return;
    const pentatonic = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25];
    let step = 0;

    this.ambientTimer = window.setInterval(() => {
      if (this.isMuted || document.hidden) return;
      const ctx = this.getAudioContext();
      if (!ctx || ctx.state !== 'running') return;

      const note = pentatonic[step % pentatonic.length];
      step = (step + 1 + Math.floor(Math.random() * 2)) % pentatonic.length;
      const vol = this.isBgmDucked ? 0.012 : 0.035;
      this.synthTone(ctx, 'sine', note, note, 0.45, vol, ctx.currentTime);
    }, 1800);
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    Howler.mute(this.isMuted);
    if (this.isMuted) {
      this.stopNarration();
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  private speakViaWebSpeech(text: string, rate: number = 0.92, pitch: number = 1.1): void {
    if (this.isMuted || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = rate;
      utter.pitch = pitch;
      utter.volume = 0.95;
      window.speechSynthesis.speak(utter);
    } catch {
      // Ignore if browser blocks speechSynthesis
    }
  }

  private synthTone(
    ctx: AudioContext,
    type: OscillatorType,
    startFreq: number,
    endFreq: number,
    duration: number,
    volume: number,
    startTime: number
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, startTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), startTime + duration);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + Math.min(0.02, duration * 0.25));
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  private synthBoing(ctx: AudioContext, startTime: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(190, startTime);
    osc.frequency.exponentialRampToValueAtTime(580, startTime + 0.12);
    osc.frequency.exponentialRampToValueAtTime(260, startTime + 0.24);
    osc.frequency.exponentialRampToValueAtTime(520, startTime + 0.36);

    gain.gain.setValueAtTime(0.28, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.38);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + 0.4);
  }

  private synthNoiseBurst(
    ctx: AudioContext,
    duration: number,
    startFilterFreq: number,
    endFilterFreq: number,
    volume: number,
    startTime: number
  ): void {
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(startFilterFreq, startTime);
    filter.frequency.exponentialRampToValueAtTime(Math.max(60, endFilterFreq), startTime + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(startTime);
    noise.stop(startTime + duration + 0.02);
  }
}

export const AudioBus = new AudioBusManager();
