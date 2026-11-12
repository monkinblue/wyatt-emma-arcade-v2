/**
 * velvetStyles.ts
 * ---------------
 * Lazy-loaded Google Fonts (`Playfair Display` + `Plus Jakarta Sans`) and
 * Retina/4K HD luxury stylesheet ("Velvet Lounge meets Wavelength") for `src/secret/*`.
 *
 * Completely isolated from the kids' arcade CSS until invoked.
 */

const FONT_LINK_ID = 'velvet-google-fonts';
const STYLE_TAG_ID = 'velvet-luxury-stylesheet';

export function ensureVelvetFontsAndStyles(): void {
  if (typeof document === 'undefined') return;

  // 1. Inject Playfair Display & Plus Jakarta Sans cleanly
  if (!document.getElementById(FONT_LINK_ID)) {
    const link = document.createElement('link');
    link.id = FONT_LINK_ID;
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;600;700&display=swap';
    document.head.appendChild(link);
  }

  // 2. Inject Velvet Lounge CSS variables & component classes
  if (!document.getElementById(STYLE_TAG_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_TAG_ID;
    style.textContent = `
      :root {
        --vl-obsidian: #09060e;
        --vl-obsidian-deep: #050308;
        --vl-cabernet: #2b0918;
        --vl-cabernet-soft: rgba(43, 9, 24, 0.72);
        --vl-gold: #e8c585;
        --vl-gold-bright: #f7dfb0;
        --vl-gold-dim: rgba(232, 197, 133, 0.32);
        --vl-rose: #f48fb1;
        --vl-rose-bright: #ffb2cc;
        --vl-rose-dim: rgba(244, 143, 177, 0.32);
        --vl-cream: #f8f1e7;
        --vl-muted: rgba(248, 241, 231, 0.66);
        --vl-glass-bg: linear-gradient(145deg, rgba(28, 12, 24, 0.76) 0%, rgba(11, 7, 17, 0.86) 100%);
        --vl-glass-border: rgba(232, 197, 133, 0.24);
        --vl-serif: 'Playfair Display', Georgia, 'Times New Roman', serif;
        --vl-sans: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      /* Full-screen TV Host Root */
      .vl-tv-root {
        position: fixed;
        inset: 0;
        z-index: 25000;
        width: 100vw;
        height: 100vh;
        overflow: hidden;
        background:
          radial-gradient(ellipse 80% 65% at 50% 18%, rgba(74, 15, 38, 0.58) 0%, transparent 70%),
          radial-gradient(ellipse 65% 55% at 18% 85%, rgba(43, 9, 24, 0.65) 0%, transparent 68%),
          radial-gradient(ellipse 65% 55% at 82% 85%, rgba(62, 28, 18, 0.35) 0%, transparent 68%),
          linear-gradient(180deg, #0d0714 0%, #09060e 56%, #050308 100%);
        color: var(--vl-cream);
        font-family: var(--vl-sans);
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        user-select: none;
      }

      .vl-ambient-canvas {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1;
      }

      .vl-tv-stage {
        position: relative;
        z-index: 2;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: clamp(18px, 2.5vh, 36px) clamp(24px, 3.6vw, 64px);
      }

      /* Glassmorphic Card */
      .vl-glass-card {
        background: var(--vl-glass-bg);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid var(--vl-glass-border);
        border-radius: 24px;
        box-shadow:
          0 24px 64px rgba(0, 0, 0, 0.68),
          inset 0 1px 0 rgba(255, 255, 255, 0.08),
          0 0 40px rgba(43, 9, 24, 0.35);
      }

      /* Top TV Header Bar */
      .vl-tv-topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        width: 100%;
      }

      .vl-brand-lockup {
        display: flex;
        align-items: baseline;
        gap: 12px;
      }

      .vl-brand-kicker {
        font-family: var(--vl-sans);
        font-size: clamp(11px, 0.9vw, 14px);
        font-weight: 700;
        letter-spacing: 0.24em;
        text-transform: uppercase;
        color: var(--vl-gold);
      }

      .vl-brand-divider {
        color: rgba(232, 197, 133, 0.38);
      }

      .vl-brand-sub {
        font-family: var(--vl-serif);
        font-style: italic;
        font-size: clamp(14px, 1.15vw, 18px);
        color: var(--vl-muted);
      }

      .vl-topbar-metrics {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .vl-metric-pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        border-radius: 999px;
        background: rgba(14, 9, 22, 0.78);
        border: 1px solid rgba(232, 197, 133, 0.28);
        backdrop-filter: blur(12px);
        font-size: clamp(12px, 0.95vw, 15px);
        font-weight: 600;
        color: var(--vl-cream);
      }

      .vl-metric-pill strong {
        color: var(--vl-gold-bright);
        font-weight: 700;
      }

      .vl-icon-btn,
      .vl-exit-btn {
        appearance: none;
        border: 1px solid rgba(232, 197, 133, 0.28);
        background: rgba(16, 10, 24, 0.78);
        color: var(--vl-cream);
        font-family: var(--vl-sans);
        font-size: clamp(11px, 0.85vw, 13px);
        font-weight: 600;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        padding: 9px 16px;
        border-radius: 999px;
        cursor: pointer;
        backdrop-filter: blur(12px);
        transition: all 0.2s ease;
      }

      .vl-icon-btn:hover,
      .vl-exit-btn:hover {
        border-color: var(--vl-gold);
        background: rgba(43, 9, 24, 0.88);
        color: var(--vl-gold-bright);
        transform: translateY(-1px);
      }

      /* Luxury Buttons */
      .vl-primary-btn {
        appearance: none;
        width: 100%;
        border: 1px solid rgba(247, 223, 176, 0.65);
        background: linear-gradient(135deg, #e8c585 0%, #c99a52 52%, #dfb474 100%);
        color: #160912;
        font-family: var(--vl-sans);
        font-size: 15px;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        padding: 16px 24px;
        border-radius: 16px;
        cursor: pointer;
        box-shadow:
          0 10px 28px rgba(232, 197, 133, 0.25),
          inset 0 1px 0 rgba(255, 255, 255, 0.55);
        transition: transform 0.16s ease, box-shadow 0.16s ease, opacity 0.16s ease;
      }

      .vl-primary-btn:active {
        transform: scale(0.98);
      }

      .vl-primary-btn:disabled {
        opacity: 0.42;
        cursor: not-allowed;
        transform: none;
      }

      .vl-secondary-btn {
        appearance: none;
        width: 100%;
        border: 1px solid rgba(232, 197, 133, 0.32);
        background: rgba(25, 12, 24, 0.72);
        color: var(--vl-cream);
        font-family: var(--vl-sans);
        font-size: 13.5px;
        font-weight: 600;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        padding: 14px 18px;
        border-radius: 14px;
        cursor: pointer;
        backdrop-filter: blur(12px);
        transition: all 0.16s ease;
      }

      .vl-secondary-btn:hover {
        border-color: var(--vl-gold);
        color: var(--vl-gold-bright);
      }

      .vl-secondary-btn:active {
        transform: scale(0.98);
      }

      /* Full-screen Mobile Controller Root */
      .vl-phone-root {
        position: fixed;
        inset: 0;
        width: 100%;
        height: 100dvh;
        overflow-y: auto;
        overflow-x: hidden;
        -webkit-overflow-scrolling: touch;
        touch-action: pan-y;
        background:
          radial-gradient(ellipse 110% 55% at 50% 0%, rgba(74, 15, 38, 0.68) 0%, transparent 68%),
          radial-gradient(ellipse 90% 45% at 50% 100%, rgba(43, 9, 24, 0.55) 0%, transparent 70%),
          linear-gradient(180deg, #0c0713 0%, #09060e 60%, #050308 100%);
        color: var(--vl-cream);
        font-family: var(--vl-sans);
        -webkit-font-smoothing: antialiased;
        padding: max(16px, env(safe-area-inset-top)) 18px max(24px, env(safe-area-inset-bottom));
        display: flex;
        flex-direction: column;
      }

      .vl-phone-shell {
        width: 100%;
        max-width: 480px;
        margin: 0 auto;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      /* Tier Badges */
      .vl-tier-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 5px 12px;
        border-radius: 999px;
        font-size: 11.5px;
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }

      .vl-tier-romantic {
        background: rgba(136, 29, 64, 0.34);
        border: 1px solid rgba(244, 143, 177, 0.45);
        color: #ffc1d6;
      }

      .vl-tier-spicy {
        background: rgba(168, 68, 24, 0.34);
        border: 1px solid rgba(232, 197, 133, 0.55);
        color: #f7dfb0;
      }

      .vl-tier-nsfw {
        background: rgba(145, 18, 56, 0.48);
        border: 1px solid rgba(255, 117, 159, 0.68);
        color: #ff9ebb;
        box-shadow: 0 0 18px rgba(244, 143, 177, 0.22);
      }

      /* Custom Tactile Wide-Thumb Slider for Phones */
      .vl-slider-stage {
        position: relative;
        padding: 18px 8px 10px;
        touch-action: none;
        user-select: none;
      }

      .vl-slider-track {
        position: relative;
        width: 100%;
        height: 22px;
        border-radius: 999px;
        background: linear-gradient(90deg, rgba(43, 9, 24, 0.95) 0%, rgba(78, 22, 46, 0.9) 50%, rgba(112, 68, 30, 0.95) 100%);
        border: 1px solid rgba(232, 197, 133, 0.36);
        box-shadow: inset 0 3px 8px rgba(0, 0, 0, 0.72);
        cursor: pointer;
        touch-action: none;
      }

      .vl-slider-fill {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        border-radius: 999px;
        pointer-events: none;
      }

      .vl-slider-ticks {
        position: absolute;
        inset: 0 14px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        pointer-events: none;
      }

      .vl-slider-tick {
        width: 2px;
        height: 6px;
        border-radius: 1px;
        background: rgba(248, 241, 231, 0.22);
      }

      .vl-slider-thumb {
        position: absolute;
        top: 50%;
        width: 56px;
        height: 38px;
        transform: translate(-50%, -50%);
        border-radius: 999px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: var(--vl-sans);
        font-weight: 700;
        font-size: 13px;
        box-shadow:
          0 8px 22px rgba(0, 0, 0, 0.65),
          0 0 20px rgba(232, 197, 133, 0.38),
          inset 0 1px 1px rgba(255, 255, 255, 0.65);
        cursor: grab;
        touch-action: none;
        transition: box-shadow 0.15s ease;
      }

      .vl-slider-thumb:active {
        cursor: grabbing;
      }

      @keyframes vlSoftPulse {
        0%, 100% { opacity: 0.62; transform: scale(0.99); }
        50% { opacity: 1; transform: scale(1.01); }
      }

      @keyframes vlFadeRise {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .vl-animate-in {
        animation: vlFadeRise 0.42s cubic-bezier(0.22, 1, 0.36, 1) forwards;
      }

      .vl-tv-root input,
      .vl-phone-root input {
        user-select: text;
        -webkit-user-select: text;
      }
    `;
    document.head.appendChild(style);
  }
}
