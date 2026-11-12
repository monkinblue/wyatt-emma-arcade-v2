/**
 * VelvetPhoneController.ts
 * ------------------------
 * Full-screen mobile controller for "After Hours: Wavelength" (`?velvet=XXXX`).
 *
 * Designed for Robert & Rita's phones:
 * - Zero Phaser boot overhead (fast-path mounted directly inside `#app`)
 * - WakeLock + `sessionStorage` + `visibilitychange` auto-reclaim if screen locks mid-talk
 * - Silky 60/120fps wide-thumb tactile `0–100` slider that never janks when partner state updates
 */

import { PhoneConnectionStatus, VelvetPhoneNetwork } from './VelvetNet';
import { ensureVelvetFontsAndStyles } from './velvetStyles';
import {
  GameLengthOption,
  HeatProgressionMode,
  PlayerId,
  QuestionTier,
  VelvetRoomState
} from './velvetTypes';

const TIER_META: Record<
  QuestionTier,
  { icon: string; label: string; desc: string; badgeClass: string }
> = {
  romantic: {
    icon: '🍷',
    label: 'Deep & Romantic',
    desc: 'Nostalgia, love languages, marriage quirks & dreams',
    badgeClass: 'vl-tier-romantic'
  },
  spicy: {
    icon: '🔥',
    label: 'Flirty & Spicy',
    desc: 'Attraction, date-night tension, turn-ons & teasing',
    badgeClass: 'vl-tier-spicy'
  },
  nsfw: {
    icon: '💋',
    label: 'Unfiltered NSFW',
    desc: 'Explicit bedroom desires, fantasies, pacing & boldness',
    badgeClass: 'vl-tier-nsfw'
  }
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function mountVelvetPhoneController(rawRoomCode: string): () => void {
  const roomCode = rawRoomCode.trim().toUpperCase();

  // 1. Immediately strip Kids' Arcade splash & unlock mobile touch viewport
  const splash = document.getElementById('heirloom-boot-splash');
  if (splash) {
    splash.remove();
  }
  document.title = `After Hours • Room ${roomCode}`;
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', '#09060e');
  }

  document.documentElement.style.overflow = 'auto';
  document.documentElement.style.touchAction = 'manipulation';
  document.body.style.overflow = 'auto';
  document.body.style.touchAction = 'manipulation';
  document.body.style.background = '#09060e';

  const appEl = document.getElementById('app') ?? document.body;
  appEl.style.position = 'fixed';
  appEl.style.inset = '0';
  appEl.style.overflow = 'hidden';
  appEl.style.touchAction = 'pan-y';

  ensureVelvetFontsAndStyles();

  // Controller UI State
  let connStatus: PhoneConnectionStatus = 'connecting';
  let myPlayer: PlayerId | null = null;
  let claimError: string | null = null;
  let roomState: VelvetRoomState | null = null;

  // Draft slider state preserved across partner updates & sleep recovery
  const draftKey = `velvet_draft_${roomCode}`;
  let currentQuestionId: string | null = null;
  let sliderValue: number = 50;
  let isDraggingSlider: boolean = false;
  let lastRenderSignature: string = '';

  const loadSavedDraft = (qId: string): number => {
    try {
      const raw = window.sessionStorage.getItem(draftKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { qId?: string; val?: number };
        if (parsed.qId === qId && typeof parsed.val === 'number') {
          return Math.max(0, Math.min(100, Math.round(parsed.val)));
        }
      }
    } catch {
      // ignore
    }
    return 50;
  };

  const saveDraft = (qId: string | null, val: number): void => {
    if (!qId) return;
    try {
      window.sessionStorage.setItem(draftKey, JSON.stringify({ qId, val }));
    } catch {
      // ignore
    }
  };

  const root = document.createElement('div');
  root.className = 'vl-phone-root';
  const shell = document.createElement('div');
  shell.className = 'vl-phone-shell';
  root.appendChild(shell);
  appEl.innerHTML = '';
  appEl.appendChild(root);

  // Initialize Phone Network
  const net = new VelvetPhoneNetwork(roomCode, {
    onStatusChange: (status) => {
      connStatus = status;
      updateConnectionPillInPlace();
      if (!roomState || !myPlayer) {
        render(true);
      }
    },
    onClaimResult: (success, player, reason, lockedVal) => {
      if (success) {
        myPlayer = player;
        claimError = null;
        if (typeof lockedVal === 'number') {
          sliderValue = Math.round(Math.max(0, Math.min(100, lockedVal)));
          if (roomState?.currentQuestion?.id) {
            saveDraft(roomState.currentQuestion.id, sliderValue);
          }
        }
      } else {
        claimError = reason ?? 'Unable to claim seat.';
      }
      render(true);
    },
    onRoomState: (incomingState) => {
      const prevQId = currentQuestionId;
      const nextQId = incomingState.currentQuestion?.id ?? null;
      roomState = incomingState;

      if (nextQId && nextQId !== prevQId) {
        currentQuestionId = nextQId;
        sliderValue = loadSavedDraft(nextQId);
      }

      // If user is actively dragging the slider in round_active, ONLY update partner status text
      // without touching the slider DOM!
      if (
        isDraggingSlider &&
        myPlayer &&
        incomingState.phase === 'round_active' &&
        !incomingState.lockedIn[myPlayer] &&
        prevQId === nextQId
      ) {
        updatePartnerWaitStatusInPlace();
        return;
      }

      render(false);
    }
  });

  // Pre-populate remembered identity if resuming from sleep
  myPlayer = net.getSavedIdentity();
  net.start();

  // Wake-lock on any touch inside the controller
  root.addEventListener(
    'pointerdown',
    () => {
      void net.requestWakeLock();
    },
    { passive: true }
  );

  // ============================================================================
  // SURGICAL IN-PLACE UPDATES (ZERO SLIDER JANK)
  // ============================================================================

  function getStatusLabel(): { text: string; dotColor: string } {
    if (connStatus === 'connected') {
      return { text: `Room ${roomCode} • Live`, dotColor: '#86efac' };
    }
    if (connStatus === 'reconnecting') {
      return { text: `Reconnecting to ${roomCode}...`, dotColor: '#fde68a' };
    }
    if (connStatus === 'connecting') {
      return { text: `Connecting to ${roomCode}...`, dotColor: '#fde68a' };
    }
    return { text: 'Offline', dotColor: '#fda4af' };
  }

  function updateConnectionPillInPlace(): void {
    const dotEl = document.getElementById('vl-ph-conn-dot');
    const txtEl = document.getElementById('vl-ph-conn-txt');
    const info = getStatusLabel();
    if (dotEl) dotEl.style.background = info.dotColor;
    if (txtEl) txtEl.textContent = info.text;
  }

  function updatePartnerWaitStatusInPlace(): void {
    if (!roomState || !myPlayer) return;
    const partner: PlayerId = myPlayer === 'robert' ? 'rita' : 'robert';
    const partnerName = partner === 'robert' ? 'Robert' : 'Rita';
    const partnerLocked = roomState.lockedIn[partner];
    const el = document.getElementById('vl-ph-partner-hint');
    if (el) {
      el.textContent = partnerLocked
        ? `✓ ${partnerName} has locked in!`
        : `${partnerName} is still deciding...`;
      el.style.color = partnerLocked ? 'var(--vl-gold-bright)' : 'var(--vl-muted)';
    }
  }

  function computeRenderSignature(): string {
    if (!myPlayer) {
      return [
        'login',
        connStatus,
        claimError ?? '',
        roomState?.connected.robert ? '1' : '0',
        roomState?.connected.rita ? '1' : '0'
      ].join('|');
    }
    if (!roomState) {
      return ['waiting_host', myPlayer, connStatus].join('|');
    }
    const myLocked = roomState.lockedIn[myPlayer];
    const partner: PlayerId = myPlayer === 'robert' ? 'rita' : 'robert';
    const partnerLocked = roomState.lockedIn[partner];

    if (roomState.phase === 'round_active' && !myLocked) {
      // Notice we intentionally exclude `partnerLocked` from full-DOM rebuild signature while unlocked,
      // updating `#vl-ph-partner-hint` smoothly in place instead!
      return [
        'round_unlocked',
        myPlayer,
        roomState.roundNumber,
        roomState.currentQuestion?.id ?? '',
        roomState.roundMode,
        roomState.spotlightTarget ?? ''
      ].join('|');
    }

    return [
      roomState.phase,
      myPlayer,
      roomState.roundNumber,
      roomState.currentQuestion?.id ?? '',
      myLocked ? 'L' : 'U',
      partnerLocked ? 'PL' : 'PU',
      roomState.connected.robert ? 'R1' : 'R0',
      roomState.connected.rita ? 'Ri1' : 'Ri0',
      JSON.stringify(roomState.settings),
      roomState.revealed ? `${roomState.revealed.robert}-${roomState.revealed.rita}` : '',
      roomState.overallCompatibility ?? ''
    ].join('|');
  }

  // ============================================================================
  // VIEW RENDERERS
  // ============================================================================

  function renderHeader(): string {
    const status = getStatusLabel();
    const accent = myPlayer === 'robert' ? 'var(--vl-gold)' : 'var(--vl-rose)';
    const playerName = myPlayer === 'robert' ? 'Robert' : myPlayer === 'rita' ? 'Rita' : null;

    return `
      <div style="
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 4px 2px;
      ">
        <div style="display:flex;align-items:center;gap:8px;">
          <span id="vl-ph-conn-dot" style="width:8px;height:8px;border-radius:50%;background:${status.dotColor};display:inline-block;"></span>
          <span id="vl-ph-conn-txt" style="font-size:12px;font-weight:600;color:var(--vl-muted);">${escapeHtml(status.text)}</span>
        </div>

        ${
          playerName
            ? `
              <button type="button" id="vl-ph-switch-role" style="
                appearance: none;
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(232,197,133,0.25);
                border-radius: 999px;
                padding: 4px 11px;
                color: ${accent};
                font-family: var(--vl-sans);
                font-size: 11.5px;
                font-weight: 700;
                letter-spacing: 0.06em;
                cursor: pointer;
              ">${playerName} ⇄</button>
            `
            : ''
        }
      </div>
    `;
  }

  function renderLoginView(): string {
    const robConnected = Boolean(roomState?.connected.robert);
    const ritaConnected = Boolean(roomState?.connected.rita);

    // Highlight the unclaimed seat automatically if the other seat is already connected!
    const highlightRobert = !robConnected && ritaConnected;
    const highlightRita = !ritaConnected && robConnected;

    const renderIdentityCard = (
      player: PlayerId,
      isConnected: boolean,
      isHighlighted: boolean
    ) => {
      const isRob = player === 'robert';
      const name = isRob ? 'ROBERT' : 'RITA';
      const accent = isRob ? '#e8c585' : '#f48fb1';
      const border = isHighlighted
        ? accent
        : isConnected
        ? 'rgba(255,255,255,0.14)'
        : 'rgba(232, 197, 133, 0.34)';

      return `
        <div class="vl-glass-card" style="
          padding: 20px;
          border: ${isHighlighted ? '2px' : '1px'} solid ${border};
          opacity: ${isConnected ? '0.78' : '1'};
          box-shadow: ${
            isHighlighted
              ? `0 16px 40px rgba(0,0,0,0.65), 0 0 28px ${
                  isRob ? 'rgba(232,197,133,0.28)' : 'rgba(244,143,177,0.28)'
                }`
              : '0 14px 36px rgba(0,0,0,0.55)'
          };
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          text-align: center;
        ">
          <div style="
            width: 62px;
            height: 62px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: var(--vl-serif);
            font-size: 28px;
            font-weight: 700;
            color: ${accent};
            border: 1.5px solid ${accent};
            background: rgba(12, 7, 18, 0.85);
          ">${name[0]}</div>

          ${
            isConnected
              ? `
                <div style="font-size:13px;font-weight:700;color:#86efac;letter-spacing:0.06em;">
                  ${name} • Connected ✓
                </div>
                <button type="button" class="vl-secondary-btn" data-reclaim="${player}" style="padding:10px 14px;font-size:11.5px;">
                  Reclaim ${name} on This Phone
                </button>
              `
              : `
                <button type="button" class="vl-primary-btn" data-claim="${player}" style="
                  background: ${
                    isRob
                      ? 'linear-gradient(135deg, #e8c585 0%, #c99a52 100%)'
                      : 'linear-gradient(135deg, #f48fb1 0%, #d4668c 100%)'
                  };
                ">
                  Join as ${name}
                </button>
              `
          }
        </div>
      `;
    };

    return `
      ${renderHeader()}
      <div class="vl-animate-in" style="
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 18px;
        padding: 8px 0 20px;
      ">
        <div style="text-align:center;">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;color:var(--vl-gold);margin-bottom:6px;">
            Private Lounge Controller
          </div>
          <h1 style="font-family:var(--vl-serif);font-size:34px;font-weight:700;color:var(--vl-cream);line-height:1.1;">
            After <span style="font-style:italic;font-weight:500;color:var(--vl-gold-bright);">Hours</span>
          </h1>
          <p style="font-size:13.5px;color:var(--vl-muted);margin-top:6px;">
            Choose your seat to pair with the TV screen.
          </p>
        </div>

        ${
          claimError
            ? `<div style="padding:12px 14px;border-radius:12px;background:rgba(159,18,57,0.35);border:1px solid rgba(251,113,133,0.5);color:#fecdd3;font-size:13px;text-align:center;">${escapeHtml(claimError)}</div>`
            : ''
        }

        ${renderIdentityCard('robert', robConnected, highlightRobert)}
        ${renderIdentityCard('rita', ritaConnected, highlightRita)}
      </div>
    `;
  }

  function renderLobbyControlsView(): string {
    if (!roomState || !myPlayer) return '';
    const s = roomState.settings;
    const partner: PlayerId = myPlayer === 'robert' ? 'rita' : 'robert';
    const partnerName = partner === 'robert' ? 'Robert' : 'Rita';
    const bothReady = roomState.connected.robert && roomState.connected.rita;

    const renderDeckToggle = (tier: QuestionTier) => {
      const meta = TIER_META[tier];
      const active = s.tiers[tier];
      return `
        <button type="button" data-toggle-tier="${tier}" style="
          appearance: none;
          width: 100%;
          text-align: left;
          padding: 13px 15px;
          border-radius: 14px;
          background: ${active ? 'rgba(52, 16, 32, 0.82)' : 'rgba(14, 9, 22, 0.55)'};
          border: 1.5px solid ${active ? 'rgba(232, 197, 133, 0.62)' : 'rgba(255,255,255,0.1)'};
          color: var(--vl-cream);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          cursor: pointer;
        ">
          <div>
            <div style="font-size:14.5px;font-weight:700;color:${active ? '#fff8ed' : 'rgba(248,241,231,0.55)'};">
              ${meta.icon} ${meta.label}
            </div>
            <div style="font-size:11.5px;color:var(--vl-muted);margin-top:2px;">
              ${meta.desc}
            </div>
          </div>
          <div style="
            min-width: 28px;
            height: 28px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 14px;
            background: ${active ? 'var(--vl-gold)' : 'rgba(255,255,255,0.06)'};
            color: ${active ? '#160912' : 'rgba(255,255,255,0.3)'};
          ">${active ? '✓' : ''}</div>
        </button>
      `;
    };

    const renderModeChip = (mode: HeatProgressionMode, title: string, sub: string) => {
      const active = s.heatMode === mode;
      return `
        <button type="button" data-heat-mode="${mode}" style="
          flex: 1;
          appearance: none;
          padding: 11px 10px;
          border-radius: 12px;
          background: ${active ? 'rgba(232, 197, 133, 0.2)' : 'rgba(14, 9, 22, 0.6)'};
          border: 1.5px solid ${active ? 'var(--vl-gold)' : 'rgba(255,255,255,0.1)'};
          color: var(--vl-cream);
          text-align: center;
          cursor: pointer;
        ">
          <div style="font-size:13px;font-weight:700;color:${active ? 'var(--vl-gold-bright)' : 'var(--vl-cream)'};">${title}</div>
          <div style="font-size:10.5px;color:var(--vl-muted);margin-top:2px;">${sub}</div>
        </button>
      `;
    };

    const renderLengthChip = (len: GameLengthOption, label: string) => {
      const active = s.gameLength === len;
      return `
        <button type="button" data-game-len="${String(len)}" style="
          flex: 1;
          appearance: none;
          padding: 10px 8px;
          border-radius: 11px;
          background: ${active ? 'rgba(232, 197, 133, 0.22)' : 'rgba(14, 9, 22, 0.6)'};
          border: 1.5px solid ${active ? 'var(--vl-gold)' : 'rgba(255,255,255,0.1)'};
          color: ${active ? 'var(--vl-gold-bright)' : 'var(--vl-muted)'};
          font-family: var(--vl-sans);
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
        ">${label}</button>
      `;
    };

    return `
      ${renderHeader()}
      <div class="vl-animate-in" style="display:flex;flex-direction:column;gap:14px;padding-bottom:16px;">
        <div class="vl-glass-card" style="padding:14px 16px;text-align:center;">
          <div style="font-family:var(--vl-serif);font-size:22px;font-weight:700;color:var(--vl-cream);">
            Tonight’s Lounge Deck
          </div>
          <div style="font-size:12.5px;margin-top:4px;color:${bothReady ? '#86efac' : 'var(--vl-gold)'};font-weight:600;">
            ${
              bothReady
                ? '✓ Robert & Rita Both Connected!'
                : `Waiting on ${partnerName} to scan the TV QR code...`
            }
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:8px;">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:var(--vl-muted);padding-left:4px;">
            1. Select Question Decks
          </div>
          ${renderDeckToggle('romantic')}
          ${renderDeckToggle('spicy')}
          ${renderDeckToggle('nsfw')}
        </div>

        <div>
          <div style="font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:var(--vl-muted);padding-left:4px;margin-bottom:6px;">
            2. Pacing &amp; Heat Flow
          </div>
          <div style="display:flex;gap:8px;">
            ${renderModeChip('progressive', '🌡️ Progressive Heat', 'Warm up → Peak NSFW')}
            ${renderModeChip('shuffle', '🎲 Pure Shuffle', 'Any deck any round')}
          </div>
        </div>

        <div>
          <div style="font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:var(--vl-muted);padding-left:4px;margin-bottom:6px;">
            3. Game Length
          </div>
          <div style="display:flex;gap:8px;">
            ${renderLengthChip(10, '10 Rounds')}
            ${renderLengthChip(20, '20 Rounds')}
            ${renderLengthChip('endless', 'Endless')}
          </div>
        </div>

        <button type="button" class="vl-primary-btn" id="vl-ph-start-btn" style="margin-top:4px;">
          ${bothReady ? 'Start Game →' : `Start Game (${partnerName} Can Join Live)`}
        </button>
      </div>
    `;
  }

  function renderActiveSliderView(): string {
    if (!roomState || !myPlayer || !roomState.currentQuestion) return '';
    const q = roomState.currentQuestion;
    const tierInfo = TIER_META[q.tier];
    const myLocked = roomState.lockedIn[myPlayer];
    const partner: PlayerId = myPlayer === 'robert' ? 'rita' : 'robert';
    const partnerName = partner === 'robert' ? 'Robert' : 'Rita';
    const partnerLocked = roomState.lockedIn[partner];

    const isSpotlight = roomState.roundMode === 'spotlight' && roomState.spotlightTarget !== null;
    const iAmTarget = isSpotlight && roomState.spotlightTarget === myPlayer;
    const targetName = roomState.spotlightTarget === 'robert' ? 'ROBERT' : 'RITA';

    const instructionBanner = !isSpotlight
      ? 'Slide to YOUR honest answer (0–100)'
      : iAmTarget
      ? '🎯 SPOTLIGHT ON YOU — Slide to YOUR true answer (0–100)'
      : `🎯 READ THEIR MIND — Predict exact number ${targetName} will pick (0–100)!`;

    const roundTitle =
      roomState.totalPlannedRounds !== null
        ? `Round ${roomState.roundNumber} of ${roomState.totalPlannedRounds}`
        : `Round ${roomState.roundNumber} • Endless`;

    const accentHex = myPlayer === 'robert' ? '#e8c585' : '#f48fb1';

    if (myLocked) {
      return `
        ${renderHeader()}
        <div class="vl-animate-in" style="
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 16px;
          padding-bottom: 12px;
        ">
          <div class="vl-glass-card" style="padding:18px;text-align:center;">
            <div style="display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
              <span style="font-size:11.5px;font-weight:700;color:var(--vl-muted);text-transform:uppercase;letter-spacing:0.12em;">${escapeHtml(roundTitle)}</span>
              <span class="vl-tier-badge ${tierInfo.badgeClass}">${tierInfo.icon} ${tierInfo.label}</span>
            </div>
            <div style="font-family:var(--vl-serif);font-size:20px;line-height:1.32;color:var(--vl-cream);">
              ${escapeHtml(q.prompt)}
            </div>
          </div>

          <div class="vl-glass-card" style="
            padding: 28px 20px;
            text-align: center;
            border-color: ${accentHex};
          ">
            <div style="font-size:12px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:var(--vl-muted);margin-bottom:6px;">
              Your Locked Number
            </div>
            <div style="
              font-family: var(--vl-serif);
              font-size: 62px;
              font-weight: 700;
              line-height: 1;
              color: ${accentHex};
              margin-bottom: 14px;
            ">${sliderValue}</div>
            <div style="
              font-size: 14px;
              font-weight: 600;
              color: var(--vl-gold-bright);
              animation: vlSoftPulse 1.5s ease-in-out infinite;
            ">
              Locked in — waiting on ${partnerName}...
            </div>
          </div>

          <div style="display:flex;flex-direction:column;gap:10px;">
            <button type="button" class="vl-secondary-btn" id="vl-ph-unlock-btn">
              ✎ Change Answer
            </button>
          </div>
        </div>
      `;
    }

    return `
      ${renderHeader()}
      <div class="vl-animate-in" style="
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 14px;
        padding-bottom: 10px;
      ">
        <!-- Prompt Card -->
        <div class="vl-glass-card" style="padding: 16px 18px;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
            <span style="font-size:11.5px;font-weight:700;color:var(--vl-muted);text-transform:uppercase;letter-spacing:0.12em;">
              ${escapeHtml(roundTitle)}
            </span>
            <span class="vl-tier-badge ${tierInfo.badgeClass}">${tierInfo.icon} ${tierInfo.label}</span>
          </div>

          <div style="
            padding: 7px 11px;
            border-radius: 10px;
            background: ${
              isSpotlight ? 'rgba(232, 197, 133, 0.16)' : 'rgba(255, 255, 255, 0.05)'
            };
            border: 1px solid ${
              isSpotlight ? 'rgba(232, 197, 133, 0.45)' : 'rgba(255, 255, 255, 0.1)'
            };
            font-size: 12px;
            font-weight: 700;
            color: ${isSpotlight ? 'var(--vl-gold-bright)' : 'var(--vl-cream)'};
            margin-bottom: 12px;
            text-align: center;
          ">${escapeHtml(instructionBanner)}</div>

          <div style="
            font-family: var(--vl-serif);
            font-size: clamp(19px, 5.2vw, 24px);
            line-height: 1.3;
            color: var(--vl-cream);
            text-align: center;
          ">${escapeHtml(q.prompt)}</div>
        </div>

        <!-- Tactile 0-100 Slider Card -->
        <div class="vl-glass-card" style="padding: 18px 16px;">
          <!-- Giant Numeric Readout + Fine Steppers -->
          <div style="display:flex;align-items:center;justify-content:center;gap:18px;margin-bottom:6px;">
            <button type="button" id="vl-step-minus" aria-label="Decrease by 1" style="
              width: 42px;
              height: 42px;
              border-radius: 50%;
              border: 1px solid rgba(232,197,133,0.32);
              background: rgba(14,9,22,0.8);
              color: var(--vl-cream);
              font-size: 20px;
              font-weight: 600;
              cursor: pointer;
            ">−</button>

            <div style="text-align:center;min-width:96px;">
              <div id="vl-live-readout" style="
                font-family: var(--vl-serif);
                font-size: 54px;
                font-weight: 700;
                line-height: 1;
                color: ${accentHex};
                text-shadow: 0 0 24px rgba(232, 197, 133, 0.28);
              ">${sliderValue}</div>
              <div style="font-size:10.5px;letter-spacing:0.18em;text-transform:uppercase;color:var(--vl-muted);margin-top:4px;">
                0 – 100 Scale
              </div>
            </div>

            <button type="button" id="vl-step-plus" aria-label="Increase by 1" style="
              width: 42px;
              height: 42px;
              border-radius: 50%;
              border: 1px solid rgba(232,197,133,0.32);
              background: rgba(14,9,22,0.8);
              color: var(--vl-cream);
              font-size: 20px;
              font-weight: 600;
              cursor: pointer;
            ">+</button>
          </div>

          <!-- Wide-Thumb Custom Track -->
          <div class="vl-slider-stage" id="vl-slider-stage">
            <div class="vl-slider-track" id="vl-slider-track">
              <div class="vl-slider-fill" id="vl-slider-fill" style="
                width: ${sliderValue}%;
                background: linear-gradient(90deg, #f48fb1 0%, ${accentHex} 100%);
              "></div>
              <div class="vl-slider-ticks">
                <span class="vl-slider-tick"></span>
                <span class="vl-slider-tick"></span>
                <span class="vl-slider-tick"></span>
                <span class="vl-slider-tick"></span>
                <span class="vl-slider-tick"></span>
              </div>
              <div class="vl-slider-thumb" id="vl-slider-thumb" style="
                left: ${sliderValue}%;
                background: linear-gradient(135deg, #fff6e5 0%, ${accentHex} 100%);
                color: #160912;
              "><span>${sliderValue}</span></div>
            </div>
          </div>

          <!-- Left (0) & Right (100) Pole Descriptors -->
          <div style="
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid rgba(255,255,255,0.08);
          ">
            <div style="text-align:left;">
              <div style="font-size:13px;font-weight:700;color:var(--vl-rose-bright);margin-bottom:2px;">0 • Left Pole</div>
              <div style="font-size:12.5px;line-height:1.32;color:rgba(248,241,231,0.88);">${escapeHtml(q.leftLabel)}</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:13px;font-weight:700;color:var(--vl-gold-bright);margin-bottom:2px;">100 • Right Pole</div>
              <div style="font-size:12.5px;line-height:1.32;color:rgba(248,241,231,0.88);">${escapeHtml(q.rightLabel)}</div>
            </div>
          </div>
        </div>

        <!-- Lock In CTA & Partner Status -->
        <div style="display:flex;flex-direction:column;gap:8px;text-align:center;">
          <div id="vl-ph-partner-hint" style="
            font-size: 12px;
            font-weight: 600;
            color: ${partnerLocked ? 'var(--vl-gold-bright)' : 'var(--vl-muted)'};
          ">
            ${partnerLocked ? `✓ ${partnerName} has locked in!` : `${partnerName} is still deciding...`}
          </div>

          <button type="button" class="vl-primary-btn" id="vl-ph-lock-btn">
            Lock In Answer
          </button>

          <button type="button" id="vl-ph-skip-early" style="
            appearance: none;
            background: transparent;
            border: none;
            color: rgba(248,241,231,0.46);
            font-family: var(--vl-sans);
            font-size: 11.5px;
            font-weight: 600;
            padding: 6px;
            cursor: pointer;
          ">↻ Redraw / Skip This Question</button>
        </div>
      </div>
    `;
  }

  function renderRevealingView(): string {
    return `
      ${renderHeader()}
      <div class="vl-animate-in" style="
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        gap: 14px;
      ">
        <div class="vl-glass-card" style="padding:36px 24px;width:100%;">
          <div style="font-size:12px;font-weight:700;letter-spacing:0.24em;text-transform:uppercase;color:var(--vl-gold);margin-bottom:10px;">
            Eyes on the TV
          </div>
          <div style="
            font-family: var(--vl-serif);
            font-style: italic;
            font-size: 28px;
            color: var(--vl-cream);
            animation: vlSoftPulse 0.9s ease-in-out infinite;
          ">Revealing Your Wavelengths...</div>
        </div>
      </div>
    `;
  }

  function renderDiscussionView(): string {
    if (!roomState || !roomState.revealed || !roomState.currentQuestion) return '';
    const rev = roomState.revealed;
    const q = roomState.currentQuestion;
    const isFinalPlanned =
      roomState.totalPlannedRounds !== null &&
      roomState.roundNumber >= roomState.totalPlannedRounds;

    return `
      ${renderHeader()}
      <div class="vl-animate-in" style="
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 14px;
        padding-bottom: 12px;
      ">
        <div class="vl-glass-card" style="padding: 18px; text-align: center; border-color: rgba(232,197,133,0.45);">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:var(--vl-muted);margin-bottom:6px;">
            Time to Talk • Zero Rush
          </div>
          <div style="font-size:18px;font-weight:700;color:var(--vl-gold-bright);margin-bottom:12px;">
            ${escapeHtml(rev.verdictBanner)}
          </div>

          <div style="
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 8px;
            padding: 12px;
            border-radius: 14px;
            background: rgba(9, 6, 14, 0.72);
            margin-bottom: 12px;
          ">
            <div>
              <div style="font-size:11px;color:var(--vl-muted);">ROBERT</div>
              <div style="font-family:var(--vl-serif);font-size:28px;font-weight:700;color:var(--vl-gold);">${rev.robert}</div>
            </div>
            <div>
              <div style="font-size:11px;color:var(--vl-muted);">GAP</div>
              <div style="font-family:var(--vl-serif);font-size:28px;font-weight:700;color:#fff;">${rev.gap}</div>
            </div>
            <div>
              <div style="font-size:11px;color:var(--vl-muted);">RITA</div>
              <div style="font-family:var(--vl-serif);font-size:28px;font-weight:700;color:var(--vl-rose);">${rev.rita}</div>
            </div>
          </div>

          <div style="font-family:var(--vl-serif);font-style:italic;font-size:15.5px;line-height:1.38;color:var(--vl-cream);">
            ${escapeHtml(rev.discussionSubPrompt)}
          </div>
        </div>

        <div class="vl-glass-card" style="padding:13px 16px;font-size:12.5px;color:var(--vl-muted);text-align:center;">
          “${escapeHtml(q.prompt)}”
        </div>

        <div style="display:flex;flex-direction:column;gap:10px;">
          <button type="button" class="vl-primary-btn" id="vl-ph-next-btn">
            ${isFinalPlanned ? 'Finish & View Summary →' : 'Next Question →'}
          </button>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <button type="button" class="vl-secondary-btn" id="vl-ph-redraw-btn" style="padding:12px 10px;font-size:12px;">
              Redraw / Skip
            </button>
            <button type="button" class="vl-secondary-btn" id="vl-ph-finish-btn" style="padding:12px 10px;font-size:12px;">
              Finish &amp; Summary
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function renderSummaryView(): string {
    const sum = roomState?.summary;
    const overall = sum?.overallCompatibility ?? roomState?.overallCompatibility ?? 0;

    return `
      ${renderHeader()}
      <div class="vl-animate-in" style="
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 14px;
        padding-bottom: 14px;
      ">
        <div class="vl-glass-card" style="padding:24px 18px;text-align:center;border-color:rgba(232,197,133,0.5);">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:var(--vl-gold);margin-bottom:6px;">
            Tonight’s Compatibility
          </div>
          <div style="font-family:var(--vl-serif);font-size:64px;font-weight:700;line-height:1;color:var(--vl-gold-bright);margin-bottom:8px;">
            ${overall}%
          </div>
          <div style="font-size:13px;color:var(--vl-muted);">
            ${sum?.totalRoundsPlayed ?? 0} Rounds • ${sum?.bullseyeCount ?? 0} Soulmate Bullseyes
          </div>
        </div>

        ${
          sum?.closestMoment
            ? `
              <div class="vl-glass-card" style="padding:14px 16px;">
                <div style="font-size:11px;font-weight:700;color:var(--vl-gold);letter-spacing:0.14em;text-transform:uppercase;margin-bottom:4px;">
                  🔥 Closest Mind-Meld (Gap ${sum.closestMoment.gap})
                </div>
                <div style="font-family:var(--vl-serif);font-size:15px;color:var(--vl-cream);">
                  “${escapeHtml(sum.closestMoment.question.prompt)}”
                </div>
              </div>
            `
            : ''
        }

        ${
          sum?.biggestPlotTwist
            ? `
              <div class="vl-glass-card" style="padding:14px 16px;">
                <div style="font-size:11px;font-weight:700;color:var(--vl-rose);letter-spacing:0.14em;text-transform:uppercase;margin-bottom:4px;">
                  🌶️ Biggest Plot Twist (Gap ${sum.biggestPlotTwist.gap})
                </div>
                <div style="font-family:var(--vl-serif);font-size:15px;color:var(--vl-cream);">
                  “${escapeHtml(sum.biggestPlotTwist.question.prompt)}”
                </div>
              </div>
            `
            : ''
        }

        <button type="button" class="vl-primary-btn" id="vl-ph-play-again">
          Play Another Round
        </button>
      </div>
    `;
  }

  function renderWaitingForHostView(): string {
    return `
      ${renderHeader()}
      <div style="flex:1;display:flex;align-items:center;justify-content:center;text-align:center;">
        <div class="vl-glass-card" style="padding:28px 22px;width:100%;">
          <div style="font-family:var(--vl-serif);font-size:24px;color:var(--vl-gold-bright);margin-bottom:8px;">
            Syncing with TV Lounge...
          </div>
          <div style="font-size:13px;color:var(--vl-muted);">
            Room Code <strong>${escapeHtml(roomCode)}</strong> — make sure the TV screen is open.
          </div>
        </div>
      </div>
    `;
  }

  // ============================================================================
  // MAIN RENDER & INTERACTIVE EVENT BINDING
  // ============================================================================

  function render(force: boolean): void {
    const sig = computeRenderSignature();
    if (!force && sig === lastRenderSignature) {
      updateConnectionPillInPlace();
      updatePartnerWaitStatusInPlace();
      return;
    }
    lastRenderSignature = sig;

    if (!myPlayer) {
      shell.innerHTML = renderLoginView();
    } else if (!roomState) {
      shell.innerHTML = renderWaitingForHostView();
    } else if (roomState.phase === 'lobby') {
      shell.innerHTML = renderLobbyControlsView();
    } else if (roomState.phase === 'round_active') {
      shell.innerHTML = renderActiveSliderView();
    } else if (roomState.phase === 'revealing') {
      shell.innerHTML = renderRevealingView();
    } else if (roomState.phase === 'discussion') {
      shell.innerHTML = renderDiscussionView();
    } else {
      shell.innerHTML = renderSummaryView();
    }

    bindInteractiveHandlers();
  }

  function bindInteractiveHandlers(): void {
    // Switch Role
    document.getElementById('vl-ph-switch-role')?.addEventListener('click', () => {
      net.releaseIdentity();
      myPlayer = null;
      claimError = null;
      render(true);
    });

    // Claim / Reclaim Identity Buttons
    shell.querySelectorAll<HTMLButtonElement>('[data-claim]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const p = btn.getAttribute('data-claim') as PlayerId;
        claimError = null;
        net.claimIdentity(p, false);
      });
    });

    shell.querySelectorAll<HTMLButtonElement>('[data-reclaim]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const p = btn.getAttribute('data-reclaim') as PlayerId;
        claimError = null;
        net.claimIdentity(p, true);
      });
    });

    // Lobby Controls
    shell.querySelectorAll<HTMLButtonElement>('[data-toggle-tier]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!roomState) return;
        const tier = btn.getAttribute('data-toggle-tier') as QuestionTier;
        const nextTiers = {
          ...roomState.settings.tiers,
          [tier]: !roomState.settings.tiers[tier]
        };
        if (!nextTiers.romantic && !nextTiers.spicy && !nextTiers.nsfw) {
          return; // Keep at least 1 tier active
        }
        net.send({ type: 'UPDATE_SETTINGS', settings: { tiers: nextTiers } });
      });
    });

    shell.querySelectorAll<HTMLButtonElement>('[data-heat-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const heatMode = btn.getAttribute('data-heat-mode') as HeatProgressionMode;
        net.send({ type: 'UPDATE_SETTINGS', settings: { heatMode } });
      });
    });

    shell.querySelectorAll<HTMLButtonElement>('[data-game-len]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const raw = btn.getAttribute('data-game-len');
        const gameLength: GameLengthOption =
          raw === '10' ? 10 : raw === '20' ? 20 : 'endless';
        net.send({ type: 'UPDATE_SETTINGS', settings: { gameLength } });
      });
    });

    document.getElementById('vl-ph-start-btn')?.addEventListener('click', () => {
      void net.requestWakeLock();
      net.send({ type: 'START_GAME' });
    });

    // Custom Tactile 0-100 Slider Wiring
    const sliderStage = document.getElementById('vl-slider-stage');
    const sliderTrack = document.getElementById('vl-slider-track');
    const sliderFill = document.getElementById('vl-slider-fill');
    const sliderThumb = document.getElementById('vl-slider-thumb');
    const liveReadout = document.getElementById('vl-live-readout');

    const applySliderVal = (nextVal: number, vibrate: boolean) => {
      const clamped = Math.max(0, Math.min(100, Math.round(nextVal)));
      const changed = clamped !== sliderValue;
      sliderValue = clamped;
      saveDraft(currentQuestionId, sliderValue);

      if (sliderFill) sliderFill.style.width = `${sliderValue}%`;
      if (sliderThumb) {
        sliderThumb.style.left = `${sliderValue}%`;
        const span = sliderThumb.querySelector('span');
        if (span) span.textContent = String(sliderValue);
      }
      if (liveReadout) liveReadout.textContent = String(sliderValue);

      if (changed && vibrate && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(4);
        } catch {
          // ignore
        }
      }
    };

    if (sliderStage && sliderTrack) {
      const updateFromClientX = (clientX: number) => {
        const rect = sliderTrack.getBoundingClientRect();
        if (rect.width <= 0) return;
        const pct = ((clientX - rect.left) / rect.width) * 100;
        applySliderVal(pct, true);
      };

      sliderStage.addEventListener('pointerdown', (ev: PointerEvent) => {
        isDraggingSlider = true;
        try {
          sliderStage.setPointerCapture(ev.pointerId);
        } catch {
          // ignore
        }
        updateFromClientX(ev.clientX);
      });

      sliderStage.addEventListener('pointermove', (ev: PointerEvent) => {
        if (!isDraggingSlider) return;
        updateFromClientX(ev.clientX);
      });

      const endDrag = (ev: PointerEvent) => {
        if (!isDraggingSlider) return;
        isDraggingSlider = false;
        try {
          sliderStage.releasePointerCapture(ev.pointerId);
        } catch {
          // ignore
        }
      };

      sliderStage.addEventListener('pointerup', endDrag);
      sliderStage.addEventListener('pointercancel', endDrag);
    }

    document.getElementById('vl-step-minus')?.addEventListener('click', () => {
      applySliderVal(sliderValue - 1, true);
    });
    document.getElementById('vl-step-plus')?.addEventListener('click', () => {
      applySliderVal(sliderValue + 1, true);
    });

    document.getElementById('vl-ph-lock-btn')?.addEventListener('click', () => {
      if (!myPlayer) return;
      saveDraft(currentQuestionId, sliderValue);
      net.send({ type: 'LOCK_ANSWER', player: myPlayer, value: sliderValue });
    });

    document.getElementById('vl-ph-unlock-btn')?.addEventListener('click', () => {
      if (!myPlayer) return;
      net.send({ type: 'UNLOCK_ANSWER', player: myPlayer });
    });

    document.getElementById('vl-ph-skip-early')?.addEventListener('click', () => {
      net.send({ type: 'REDRAW_QUESTION' });
    });

    // Discussion ("Time to Talk") Controls
    document.getElementById('vl-ph-next-btn')?.addEventListener('click', () => {
      net.send({ type: 'NEXT_QUESTION' });
    });

    document.getElementById('vl-ph-redraw-btn')?.addEventListener('click', () => {
      net.send({ type: 'REDRAW_QUESTION' });
    });

    document.getElementById('vl-ph-finish-btn')?.addEventListener('click', () => {
      net.send({ type: 'FINISH_GAME' });
    });

    // Summary Controls
    document.getElementById('vl-ph-play-again')?.addEventListener('click', () => {
      net.send({ type: 'PLAY_AGAIN' });
    });
  }

  render(true);

  return () => {
    net.destroy();
    root.remove();
  };
}
