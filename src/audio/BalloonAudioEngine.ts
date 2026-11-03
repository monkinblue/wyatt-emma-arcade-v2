/**
 * BalloonAudioEngine.ts
 * ---------------------
 * Mentor Note: Hybrid Audio & Phonics Engine for Balloon Letter Pop
 * ("Wyatt & Emma's Alphabet & Word Sky-Ship" — `BalloonPopScene.ts`).
 *
 * Why a hybrid engine combining Howler.js MP3 voice queues with WebAudio synthesis?
 * - Spuds Oxley's 154 pre-recorded MP3 files (`letters/letter_a..z.mp3`, `phonics/phonics_a..z.mp3`,
 *   `words/word_<word>.mp3`, `praise/<id>.mp3`) give Wyatt and Emma warm, authentic human storytelling
 *   for every single alphabet letter, phonics sound, and word!
 * - Meanwhile, physical airship interactions (pentatonic balloon pops, rubbery wrong-tap boings,
 *   parachute silk whooshes, mahogany tile snaps, and pinwheel wind gusts) fire instantaneously
 *   with zero latency via our WebAudio synthesizer!
 * - Note: This frontend engine strictly loads static offline MP3 files from `/assets/audio/balloon-pop/`
 *   and never references any API keys.
 */

import { Howl } from 'howler';
import { AudioBus } from '../core/AudioBus';

export class BalloonAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private howlCache: Map<string, Howl> = new Map();
  private activeVoiceHowl: Howl | null = null;
  private voiceQueueTimers: number[] = [];
  private sequenceToken = 0;
  private activeVoicePromise: Promise<void> = Promise.resolve();
  private activeVoiceResolve: (() => void) | null = null;

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
      this.masterGain.gain.value = 0.88;
      this.masterGain.connect(this.ctx.destination);

      this.noiseBuffer = this.createWhiteNoiseBuffer(this.ctx, 0.7);
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
   * Preloads the letters, phonics, praise clips, and active theme words so they play instantaneously.
   */
  public preloadCoreClips(themeWords: string[] = []): void {
    const urls: string[] = [];
    for (const ch of 'abcdefghijklmnopqrstuvwxyz') {
      urls.push(`/assets/audio/balloon-pop/letters/letter_${ch}.mp3`);
      urls.push(`/assets/audio/balloon-pop/phonics/phonics_${ch}.mp3`);
    }
    const praises = [
      'praise_wyatt',
      'praise_emma',
      'praise_frenzy',
      'praise_star',
      'praise_complete',
      'prompt_phonics',
      'prompt_spell'
    ];
    for (const p of praises) {
      urls.push(`/assets/audio/balloon-pop/praise/${p}.mp3`);
    }
    for (const w of themeWords) {
      urls.push(`/assets/audio/balloon-pop/words/word_${w.toLowerCase()}.mp3`);
    }
    urls.forEach((u) => this.getOrCreateHowl(u, 0.82));
  }

  /**
   * Cancels any currently playing or queued voice clips so voice lines never overlap awkwardly.
   */
  public stopVoiceQueue(): void {
    this.sequenceToken++;
    for (const timerId of this.voiceQueueTimers) {
      window.clearTimeout(timerId);
    }
    this.voiceQueueTimers = [];

    if (this.activeVoiceHowl) {
      this.activeVoiceHowl.off('end');
      this.activeVoiceHowl.stop();
      this.activeVoiceHowl = null;
    }

    if (this.activeVoiceResolve) {
      const resolve = this.activeVoiceResolve;
      this.activeVoiceResolve = null;
      resolve();
    }
  }

  /**
   * Resolves once any currently playing voice sequence finishes (with a safe timeout fallback).
   */
  public waitForActiveVoiceToFinish(timeoutMs = 3500): Promise<void> {
    if (AudioBus.getMuted() || (!this.activeVoiceHowl && this.voiceQueueTimers.length === 0)) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      const tid = window.setTimeout(done, timeoutMs);
      void this.activeVoicePromise.then(() => {
        window.clearTimeout(tid);
        done();
      });
    });
  }

  /**
   * Plays a single voice clip URL and invokes `onDone` when finished.
   */
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

    // Safety timeout in case a browser tab backgrounding or audio unlock delays 'end'
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
   * Speaks the uppercase/lowercase letter name (`letters/letter_<ch>.mp3`) and returns a Promise
   * that resolves when playback finishes.
   */
  public playLetter(ch: string, onComplete?: () => void): Promise<void> {
    const clean = ch.trim().toLowerCase().charAt(0);
    if (!clean || clean < 'a' || clean > 'z' || AudioBus.getMuted()) {
      onComplete?.();
      return Promise.resolve();
    }
    this.stopVoiceQueue();
    const token = this.sequenceToken;

    const promise = new Promise<void>((resolve) => {
      this.activeVoiceResolve = resolve;
      this.playSingleVoiceUrl(`/assets/audio/balloon-pop/letters/letter_${clean}.mp3`, token, () => {
        if (this.activeVoiceResolve === resolve) {
          this.activeVoiceResolve = null;
        }
        onComplete?.();
        resolve();
      });
    });
    this.activeVoicePromise = promise;
    return promise;
  }

  /**
   * Speaks the phonetic sound and example (`phonics/phonics_<ch>.mp3`, e.g. "buh, as in bear.").
   */
  public playPhonics(ch: string, onComplete?: () => void): Promise<void> {
    const clean = ch.trim().toLowerCase().charAt(0);
    if (!clean || clean < 'a' || clean > 'z' || AudioBus.getMuted()) {
      onComplete?.();
      return Promise.resolve();
    }
    this.stopVoiceQueue();
    const token = this.sequenceToken;

    const promise = new Promise<void>((resolve) => {
      this.activeVoiceResolve = resolve;
      this.playSingleVoiceUrl(`/assets/audio/balloon-pop/phonics/phonics_${clean}.mp3`, token, () => {
        if (this.activeVoiceResolve === resolve) {
          this.activeVoiceResolve = null;
        }
        onComplete?.();
        resolve();
      });
    });
    this.activeVoicePromise = promise;
    return promise;
  }

  /**
   * Speaks a vocabulary word (`words/word_<word>.mp3`).
   */
  public playWord(word: string, onComplete?: () => void): Promise<void> {
    const clean = word.trim().toLowerCase();
    if (!clean || AudioBus.getMuted()) {
      onComplete?.();
      return Promise.resolve();
    }
    this.stopVoiceQueue();
    const token = this.sequenceToken;

    const promise = new Promise<void>((resolve) => {
      this.activeVoiceResolve = resolve;
      this.playSingleVoiceUrl(`/assets/audio/balloon-pop/words/word_${clean}.mp3`, token, () => {
        if (this.activeVoiceResolve === resolve) {
          this.activeVoiceResolve = null;
        }
        onComplete?.();
        resolve();
      });
    });
    this.activeVoicePromise = promise;
    return promise;
  }

  /**
   * Speaks a warm storyteller praise or mode prompt clip (`praise/<id>.mp3`).
   */
  public playPraise(id: string, onComplete?: () => void): Promise<void> {
    const clean = id.trim().toLowerCase();
    if (!clean || AudioBus.getMuted()) {
      onComplete?.();
      return Promise.resolve();
    }
    this.stopVoiceQueue();
    const token = this.sequenceToken;

    const promise = new Promise<void>((resolve) => {
      this.activeVoiceResolve = resolve;
      this.playSingleVoiceUrl(`/assets/audio/balloon-pop/praise/${clean}.mp3`, token, () => {
        if (this.activeVoiceResolve === resolve) {
          this.activeVoiceResolve = null;
        }
        onComplete?.();
        resolve();
      });
    });
    this.activeVoicePromise = promise;
    return promise;
  }

  /**
   * Plays `letters/letter_<ch>.mp3` followed `150ms` after completion by `phonics/phonics_<ch>.mp3`.
   * Returns a Promise that resolves ONLY after BOTH clips have completely finished playing
   * (with a safe timeout fallback so gameplay can never hang).
   */
  public playLetterThenPhonics(ch: string, onComplete?: () => void): Promise<void> {
    const clean = ch.trim().toLowerCase().charAt(0);
    if (!clean || clean < 'a' || clean > 'z' || AudioBus.getMuted()) {
      onComplete?.();
      return Promise.resolve();
    }
    this.stopVoiceQueue();
    const token = this.sequenceToken;

    const promise = new Promise<void>((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        if (this.activeVoiceResolve === done) {
          this.activeVoiceResolve = null;
        }
        onComplete?.();
        resolve();
      };
      this.activeVoiceResolve = done;

      // Safe overall timeout fallback (4.2s) so gameplay can never hang
      const fallbackTimer = window.setTimeout(done, 4200);
      this.voiceQueueTimers.push(fallbackTimer);

      this.playSingleVoiceUrl(`/assets/audio/balloon-pop/letters/letter_${clean}.mp3`, token, () => {
        if (token !== this.sequenceToken) {
          done();
          return;
        }
        const timerId = window.setTimeout(() => {
          if (token !== this.sequenceToken) {
            done();
            return;
          }
          this.playSingleVoiceUrl(`/assets/audio/balloon-pop/phonics/phonics_${clean}.mp3`, token, () => {
            window.clearTimeout(fallbackTimer);
            done();
          });
        }, 150);
        this.voiceQueueTimers.push(timerId);
      });
    });

    this.activeVoicePromise = promise;
    return promise;
  }

  /**
   * Plays a bright triumphant brass fanfare chord, speaks `words/word_<word>.mp3`,
   * and optionally follows with a warm praise clip (`praise_wyatt.mp3`, `praise_emma.mp3`, or `praise_complete.mp3`).
   */
  public playWordCelebration(word: string, praiseId?: string, onComplete?: () => void): void {
    const cleanWord = word.trim().toLowerCase();
    this.stopVoiceQueue();
    const token = this.sequenceToken;

    // 1. Bright triumphant brass & glockenspiel fanfare chord
    this.playTriumphantFanfareChord();

    // 2. Speak the completed word after a brief 180ms fanfare lead-in
    const leadTimer = window.setTimeout(() => {
      if (token !== this.sequenceToken) return;
      this.playSingleVoiceUrl(`/assets/audio/balloon-pop/words/word_${cleanWord}.mp3`, token, () => {
        if (token !== this.sequenceToken) return;
        if (!praiseId) {
          onComplete?.();
          return;
        }
        const praiseTimer = window.setTimeout(() => {
          if (token !== this.sequenceToken) return;
          this.playSingleVoiceUrl(`/assets/audio/balloon-pop/praise/${praiseId}.mp3`, token, onComplete);
        }, 180);
        this.voiceQueueTimers.push(praiseTimer);
      });
    }, 180);
    this.voiceQueueTimers.push(leadTimer);
  }

  /**
   * Synthesizes a bright C-Major triumphant airship brass & glockenspiel chord.
   */
  public playTriumphantFanfareChord(): void {
    if (AudioBus.getMuted()) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;

    const notes = [
      { freq: 523.25, delay: 0.0, dur: 0.35, gain: 0.20 },  // C5
      { freq: 659.25, delay: 0.06, dur: 0.35, gain: 0.20 }, // E5
      { freq: 783.99, delay: 0.12, dur: 0.40, gain: 0.22 }, // G5
      { freq: 1046.5, delay: 0.18, dur: 0.65, gain: 0.25 }  // C6
    ];

    for (const n of notes) {
      const t = now + n.delay;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(n.freq, t);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(n.freq * 2, t);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2800, t);
      filter.frequency.exponentialRampToValueAtTime(1200, t + n.dur);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(n.gain, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, t + n.dur);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + n.dur + 0.02);
      osc2.stop(t + n.dur + 0.02);
    }
  }

  /**
   * 1. `playBalloonPop(comboIndex = 0)`:
   * Crisp, bubbly balloon pop transient + ascending pentatonic sparkle chime (`C5, D5, E5, G5, A5, C6`).
   */
  public playBalloonPop(comboIndex = 0): void {
    if (AudioBus.getMuted()) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;

    // Layer 1: Crisp rubber-bubble pop transient (rapid pitch drop + noise snap)
    const popOsc = ctx.createOscillator();
    const popGain = ctx.createGain();
    popOsc.type = 'sine';
    popOsc.frequency.setValueAtTime(520, now);
    popOsc.frequency.exponentialRampToValueAtTime(110, now + 0.055);

    popGain.gain.setValueAtTime(0.001, now);
    popGain.gain.linearRampToValueAtTime(0.45, now + 0.004);
    popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

    popOsc.connect(popGain);
    popGain.connect(this.masterGain);
    popOsc.start(now);
    popOsc.stop(now + 0.07);

    if (this.noiseBuffer) {
      const nSrc = ctx.createBufferSource();
      nSrc.buffer = this.noiseBuffer;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(1850, now);
      bp.Q.setValueAtTime(2.2, now);

      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.32, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      nSrc.connect(bp);
      bp.connect(nGain);
      nGain.connect(this.masterGain);
      nSrc.start(now);
      nSrc.stop(now + 0.04);
    }

    // Layer 2: Ascending C-major pentatonic sparkle chime (C5, D5, E5, G5, A5, C6)
    const pentatonic = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
    const baseFreq = pentatonic[Math.max(0, comboIndex) % pentatonic.length];

    const chimeOsc = ctx.createOscillator();
    const chimeOvertone = ctx.createOscillator();
    const chimeGain = ctx.createGain();

    chimeOsc.type = 'sine';
    chimeOsc.frequency.setValueAtTime(baseFreq, now + 0.02);
    chimeOvertone.type = 'triangle';
    chimeOvertone.frequency.setValueAtTime(baseFreq * 2, now + 0.02);

    chimeGain.gain.setValueAtTime(0.001, now + 0.02);
    chimeGain.gain.linearRampToValueAtTime(0.24, now + 0.03);
    chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);

    chimeOsc.connect(chimeGain);
    chimeOvertone.connect(chimeGain);
    chimeGain.connect(this.masterGain);

    chimeOsc.start(now + 0.02);
    chimeOvertone.start(now + 0.02);
    chimeOsc.stop(now + 0.38);
    chimeOvertone.stop(now + 0.38);
  }

  /**
   * 2. `playRubberBoing()`:
   * Silly, zero-frustration rubbery balloon bounce when a non-target balloon is tapped.
   */
  public playRubberBoing(): void {
    if (AudioBus.getMuted()) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(165, now);
    osc.frequency.exponentialRampToValueAtTime(340, now + 0.09);
    osc.frequency.exponentialRampToValueAtTime(195, now + 0.26);

    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(24, now);
    lfoGain.gain.setValueAtTime(38, now);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.34, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(this.masterGain);

    lfo.start(now);
    osc.start(now);
    lfo.stop(now + 0.29);
    osc.stop(now + 0.29);
  }

  /**
   * 3. `playParachuteWhoosh()`:
   * Soft silk parachute deployment whoosh when a wooden letter tile floats down toward Doggie.
   */
  public playParachuteWhoosh(): void {
    if (AudioBus.getMuted()) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || !this.noiseBuffer) return;
    const now = ctx.currentTime;

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(420, now);
    bp.frequency.exponentialRampToValueAtTime(1150, now + 0.12);
    bp.frequency.exponentialRampToValueAtTime(520, now + 0.28);
    bp.Q.setValueAtTime(2.0, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.26, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.30);

    src.connect(bp);
    bp.connect(gain);
    gain.connect(this.masterGain);
    src.start(now);
    src.stop(now + 0.32);
  }

  /**
   * 4. `playTileSnap()`:
   * Chunky mahogany-and-brass wooden tile *clack-chime* when a letter tile locks into the top word board.
   */
  public playTileSnap(): void {
    if (AudioBus.getMuted()) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;

    // Mahogany wood clack
    const woodOsc = ctx.createOscillator();
    const woodGain = ctx.createGain();
    woodOsc.type = 'triangle';
    woodOsc.frequency.setValueAtTime(210, now);
    woodOsc.frequency.exponentialRampToValueAtTime(98, now + 0.06);

    woodGain.gain.setValueAtTime(0.001, now);
    woodGain.gain.linearRampToValueAtTime(0.42, now + 0.004);
    woodGain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

    woodOsc.connect(woodGain);
    woodGain.connect(this.masterGain);
    woodOsc.start(now);
    woodOsc.stop(now + 0.08);

    // Brass slot lock chime
    const bellOsc = ctx.createOscillator();
    const bellGain = ctx.createGain();
    bellOsc.type = 'sine';
    bellOsc.frequency.setValueAtTime(880, now + 0.015);
    bellOsc.frequency.exponentialRampToValueAtTime(1318.5, now + 0.08);

    bellGain.gain.setValueAtTime(0.001, now + 0.015);
    bellGain.gain.linearRampToValueAtTime(0.24, now + 0.025);
    bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    bellOsc.connect(bellGain);
    bellGain.connect(this.masterGain);
    bellOsc.start(now + 0.015);
    bellOsc.stop(now + 0.25);
  }

  /**
   * 5. `playWindGust()`:
   * Breezy pinwheel wind swirl sound when the player taps the Wind Gust button or Sparky's inflator pump.
   */
  public playWindGust(): void {
    if (AudioBus.getMuted()) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;

    if (this.noiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(280, now);
      bp.frequency.exponentialRampToValueAtTime(1350, now + 0.18);
      bp.frequency.exponentialRampToValueAtTime(380, now + 0.45);
      bp.Q.setValueAtTime(1.8, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.35, now + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);

      src.connect(bp);
      bp.connect(gain);
      gain.connect(this.masterGain);
      src.start(now);
      src.stop(now + 0.50);
    }

    // Pinwheel musical breeze trill
    const trillNotes = [587.33, 783.99, 987.77, 1174.66];
    trillNotes.forEach((freq, idx) => {
      if (!this.masterGain) return;
      const t = now + idx * 0.045;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.14, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.26);
    });
  }
}
