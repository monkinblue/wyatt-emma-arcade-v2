/**
 * MatchAudioEngine.ts
 * -------------------
 * Mentor Note: Discreet, Heirloom Audio & Acoustic SFX Engine for Animal Match Safari (`MemoryMatchScene.ts`).
 *
 * Why this architecture?
 * 1. Zero-Credit Word Sharing: Automatically reuses overlapping noun MP3s from `/assets/audio/balloon-pop/words/`
 *    (`lion`, `bear`, `frog`, `duck`, `whale`, `crab`, `star`, `train`, `rocket`, `boat`, `crown`, `cake`, `apple`,
 *    `dog`, `cat`, `owl`, `fox`, `tractor`, `egg`) alongside `/assets/audio/memory-match/words/word_<w>.mp3`.
 * 2. Strict Audio Discretion: Flipping cards plays ONLY the crisp tactile `card_flip` wooden-tile-on-felt click
 *    (ZERO voice chatter on card flips!). Josh speaks calmly (volume 0.82) ONLY when a pair is matched, when the
 *    Golden Key / Mystery Treasure Chest is unlocked, or when a child taps a sticker inside the Sanctuary Album.
 * 3. Hybrid SFX + WebAudio Fallbacks: Plays `/assets/audio/memory-match/sfx/*.mp3` with instant WebAudio synthesis
 *    layers so every flip, chime, firefly twinkle, and spyglass lens click responds in 0ms.
 * 4. Strictly Offline Frontend: Never imports or references any API keys.
 */

import { Howl } from 'howler';
import { AudioBus } from '../core/AudioBus';

export type MatchWhisperId = 'key_found' | 'chest_open' | 'mama_baby' | 'board_clear';
export type MatchSfxId =
  | 'card_flip'
  | 'match_chime'
  | 'chest_unlock'
  | 'firefly_twinkle'
  | 'spyglass_peek'
  | 'mismatch_thud';

const BALLOON_POP_SHARED_WORDS = new Set<string>([
  'lion',
  'bear',
  'frog',
  'duck',
  'whale',
  'crab',
  'star',
  'train',
  'rocket',
  'boat',
  'crown',
  'cake',
  'apple',
  'dog',
  'cat',
  'fish',
  'egg'
]);

export class MatchAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private howlCache: Map<string, Howl> = new Map();
  private activeVoiceHowl: Howl | null = null;
  private voiceQueueTimers: number[] = [];
  private sequenceToken = 0;

  constructor() {
    this.ensureContext();
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;

      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.85;
      this.masterGain.connect(this.ctx.destination);
      this.noiseBuffer = this.createWhiteNoiseBuffer(this.ctx, 0.5);
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  private createWhiteNoiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * durationSec);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private getOrCreateHowl(url: string, volume = 0.82): Howl {
    let howl = this.howlCache.get(url);
    if (!howl) {
      howl = new Howl({
        src: [url],
        volume,
        preload: true
      });
      this.howlCache.set(url, howl);
    } else {
      howl.volume(volume);
    }
    return howl;
  }

  /**
   * Resolves the static MP3 path for any creature/treasure word key, automatically sharing
   * existing MP3s from `/assets/audio/balloon-pop/words/` when applicable.
   */
  public resolveWordUrl(wordKey: string): string {
    const clean = wordKey.trim().toLowerCase();
    if (BALLOON_POP_SHARED_WORDS.has(clean)) {
      return `/assets/audio/balloon-pop/words/word_${clean}.mp3`;
    }
    return `/assets/audio/memory-match/words/word_${clean}.mp3`;
  }

  /**
   * Preloads the 6 SFX files, 4 whispers, and active deck words so playback is instantaneous.
   */
  public preloadDeckAudio(wordKeys: string[] = []): void {
    const sfxIds: MatchSfxId[] = [
      'card_flip',
      'match_chime',
      'chest_unlock',
      'firefly_twinkle',
      'spyglass_peek',
      'mismatch_thud'
    ];
    for (const id of sfxIds) {
      this.getOrCreateHowl(`/assets/audio/memory-match/sfx/${id}.mp3`, 0.72);
    }

    const whispers: MatchWhisperId[] = ['key_found', 'chest_open', 'mama_baby', 'board_clear'];
    for (const w of whispers) {
      this.getOrCreateHowl(`/assets/audio/memory-match/whispers/${w}.mp3`, 0.82);
    }

    for (const key of wordKeys) {
      this.getOrCreateHowl(this.resolveWordUrl(key), 0.82);
    }
  }

  public stopVoiceQueue(): void {
    this.sequenceToken++;
    for (const tid of this.voiceQueueTimers) {
      window.clearTimeout(tid);
    }
    this.voiceQueueTimers = [];

    if (this.activeVoiceHowl) {
      this.activeVoiceHowl.off('end');
      this.activeVoiceHowl.stop();
      this.activeVoiceHowl = null;
    }
  }

  private playSingleVoiceUrl(url: string, token: number, onDone?: () => void): void {
    if (AudioBus.getMuted() || token !== this.sequenceToken) {
      onDone?.();
      return;
    }

    if (this.activeVoiceHowl) {
      this.activeVoiceHowl.off('end');
      this.activeVoiceHowl.stop();
      this.activeVoiceHowl = null;
    }

    const howl = this.getOrCreateHowl(url, 0.82);
    this.activeVoiceHowl = howl;
    howl.off('end');
    howl.off('loaderror');
    howl.off('playerror');

    let finished = false;
    const finishOnce = () => {
      if (finished) return;
      finished = true;
      if (this.activeVoiceHowl === howl) {
        this.activeVoiceHowl = null;
      }
      if (token === this.sequenceToken && onDone) {
        onDone();
      }
    };

    const safetyTimer = window.setTimeout(finishOnce, 2800);
    this.voiceQueueTimers.push(safetyTimer);

    howl.once('end', finishOnce);
    howl.once('loaderror', finishOnce);
    howl.once('playerror', () => {
      howl.once('unlock', () => {
        if (token === this.sequenceToken) {
          howl.play();
        } else {
          finishOnce();
        }
      });
    });

    howl.stop();
    howl.play();
  }

  /**
   * Speaks a single creature/treasure noun calmly at volume 0.82.
   */
  public playWord(wordKey: string, onComplete?: () => void): Promise<void> {
    const clean = wordKey.trim().toLowerCase();
    if (!clean || AudioBus.getMuted()) {
      onComplete?.();
      return Promise.resolve();
    }
    this.stopVoiceQueue();
    const token = this.sequenceToken;
    const url = this.resolveWordUrl(clean);

    return new Promise<void>((resolve) => {
      this.playSingleVoiceUrl(url, token, () => {
        onComplete?.();
        resolve();
      });
    });
  }

  /**
   * Speaks a letter name (`a`..`z`) from `/assets/audio/balloon-pop/letters/letter_<ch>.mp3`
   * followed by the matched creature's word when in LETTERS & PICTURES mode!
   */
  public playLetterThenWord(letter: string, wordKey: string, onComplete?: () => void): Promise<void> {
    const ch = letter.trim().toLowerCase().charAt(0);
    const cleanWord = wordKey.trim().toLowerCase();
    if (AudioBus.getMuted() || !cleanWord) {
      onComplete?.();
      return Promise.resolve();
    }
    this.stopVoiceQueue();
    const token = this.sequenceToken;

    return new Promise<void>((resolve) => {
      const done = () => {
        onComplete?.();
        resolve();
      };
      this.playSingleVoiceUrl(`/assets/audio/balloon-pop/letters/letter_${ch}.mp3`, token, () => {
        if (token !== this.sequenceToken) {
          done();
          return;
        }
        const tid = window.setTimeout(() => {
          this.playSingleVoiceUrl(this.resolveWordUrl(cleanWord), token, done);
        }, 140);
        this.voiceQueueTimers.push(tid);
      });
    });
  }

  /**
   * Speaks a calm event whisper (`key_found`, `chest_open`, `mama_baby`, `board_clear`).
   */
  public playWhisper(id: MatchWhisperId, onComplete?: () => void): Promise<void> {
    if (AudioBus.getMuted()) {
      onComplete?.();
      return Promise.resolve();
    }
    this.stopVoiceQueue();
    const token = this.sequenceToken;

    return new Promise<void>((resolve) => {
      this.playSingleVoiceUrl(`/assets/audio/memory-match/whispers/${id}.mp3`, token, () => {
        onComplete?.();
        resolve();
      });
    });
  }

  /**
   * Speaks a matched pair calmly:
   * - In Classic Twins: speaks the matched word (`"lion."`).
   * - In Mama & Baby: speaks the adult & baby (`"lion."` -> `"cub."`, or followed occasionally by `mama_baby.mp3`).
   * - In Letters & Pictures: speaks the starting letter (`"L."`) -> word (`"lion."`).
   */
  public playMatchAnnouncement(
    mode: 'twins' | 'mama-baby' | 'letters',
    primaryWordKey: string,
    secondaryWordKey?: string,
    startingLetter?: string,
    onComplete?: () => void
  ): Promise<void> {
    if (AudioBus.getMuted()) {
      onComplete?.();
      return Promise.resolve();
    }

    if (mode === 'letters' && startingLetter) {
      return this.playLetterThenWord(startingLetter, primaryWordKey, onComplete);
    }

    if (mode === 'mama-baby' && secondaryWordKey && secondaryWordKey !== primaryWordKey) {
      this.stopVoiceQueue();
      const token = this.sequenceToken;
      return new Promise<void>((resolve) => {
        const done = () => {
          onComplete?.();
          resolve();
        };
        this.playSingleVoiceUrl(this.resolveWordUrl(primaryWordKey), token, () => {
          if (token !== this.sequenceToken) {
            done();
            return;
          }
          const tid = window.setTimeout(() => {
            this.playSingleVoiceUrl(this.resolveWordUrl(secondaryWordKey), token, done);
          }, 140);
          this.voiceQueueTimers.push(tid);
        });
      });
    }

    return this.playWord(primaryWordKey, onComplete);
  }

  // ---------------------------------------------------------------------------
  // TACTILE ACOUSTIC SOUND EFFECTS (WITH INSTANT WEBAUDIO SYNTH LAYERS)
  // ---------------------------------------------------------------------------

  private tryPlaySfxHowl(id: MatchSfxId, volume = 0.65): boolean {
    if (AudioBus.getMuted()) return false;
    const url = `/assets/audio/memory-match/sfx/${id}.mp3`;
    const howl = this.getOrCreateHowl(url, volume);
    if (howl.state() === 'loaded') {
      howl.play();
      return true;
    }
    return false;
  }

  /**
   * 1. `playCardFlip()`:
   * STRICTLY NO VOICE! Plays a crisp tactile wooden-tile-on-felt click when flipping a card.
   */
  public playCardFlip(): void {
    if (AudioBus.getMuted()) return;
    this.tryPlaySfxHowl('card_flip', 0.55);

    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;

    // Warm mahogany wood click + baize felt brush
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(115, now + 0.045);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.28, now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  /**
   * 2. `playMatchChime(comboIndex = 0)`:
   * Warm magical antique brass music-box chime chord when two cards match.
   */
  public playMatchChime(comboIndex = 0): void {
    if (AudioBus.getMuted()) return;
    this.tryPlaySfxHowl('match_chime', 0.58);

    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;

    const baseScale = [523.25, 587.33, 659.25, 783.99];
    const root = baseScale[comboIndex % baseScale.length];
    const notes = [root, root * 1.25, root * 1.5];

    notes.forEach((freq, idx) => {
      if (!this.masterGain) return;
      const t = now + idx * 0.055;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.20, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.42);

      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.44);
    });
  }

  /**
   * 3. `playMismatchThud()`:
   * Soft, gentle, zero-penalty wooden tap when two non-matching cards turn back face-down.
   */
  public playMismatchThud(): void {
    if (AudioBus.getMuted()) return;
    this.tryPlaySfxHowl('mismatch_thud', 0.48);

    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(165, now);
    osc.frequency.exponentialRampToValueAtTime(92, now + 0.09);

    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.22, now + 0.006);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  /**
   * 4. `playChestUnlock()`:
   * Ornate brass treasure chest lock click and magical sparkle fanfare.
   */
  public playChestUnlock(): void {
    if (AudioBus.getMuted()) return;
    this.tryPlaySfxHowl('chest_unlock', 0.72);

    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;

    const sparkleNotes = [587.33, 739.99, 880.0, 1174.66, 1479.98];
    sparkleNotes.forEach((freq, idx) => {
      if (!this.masterGain) return;
      const t = now + idx * 0.05;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.22, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.48);

      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.50);
    });
  }

  /**
   * 5. `playFireflyTwinkle()`:
   * Soft magical fairy firefly bell shimmer when Doggie's Firefly Hint hovers over a pair.
   */
  public playFireflyTwinkle(): void {
    if (AudioBus.getMuted()) return;
    this.tryPlaySfxHowl('firefly_twinkle', 0.62);

    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;

    const notes = [1046.5, 1318.5, 1567.98, 2093.0];
    notes.forEach((freq, idx) => {
      if (!this.masterGain) return;
      const t = now + idx * 0.045;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.15, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.30);

      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.32);
    });
  }

  /**
   * 6. `playSpyglassPeek()`:
   * Gentle brass telescope lens click and warm magical hum when Sparky's Spyglass activates.
   */
  public playSpyglassPeek(): void {
    if (AudioBus.getMuted()) return;
    this.tryPlaySfxHowl('spyglass_peek', 0.65);

    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.22);

    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.18, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.40);
  }
}
