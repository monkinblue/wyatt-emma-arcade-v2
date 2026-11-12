/**
 * VelvetTvHost.ts
 * ---------------
 * Full-screen Retina/4K HD TV Host overlay ("After Hours: Wavelength") for Robert & Rita.
 *
 * Features:
 * - Responsive 16:9 HD glassmorphic lounge layout (`#09060e` obsidian, `#2b0918` cabernet,
 *   `#e8c585` champagne gold, `#f48fb1` velvet rose)
 * - Dual-layer HTML5 Canvas:
 *   1. Ambient candlelight bokeh & celebratory Soulmate Bullseye golden ember showers
 *   2. Crisp 2x/4K DPR semicircular Wavelength spectrum gauge (`0–100`) with synchronized
 *      1.8s dual-needle tension sweep & glowing gap arc
 * - Authoritative game state machine + PeerJS WebRTC room host (`VelvetHostNetwork`)
 */

import { VelvetAudio } from './VelvetAudio';
import {
  VelvetHostNetwork,
  buildVelvetJoinUrl,
  generateVelvetQrDataUrl,
  generateVelvetRoomCode
} from './VelvetNet';
import { drawNextQuestion, evaluateRoundVerdict } from './velvetQuestions';
import { ensureVelvetFontsAndStyles } from './velvetStyles';
import {
  GameLengthOption,
  LobbySettings,
  PhoneToHostMessage,
  PlayerId,
  QuestionTier,
  RoundMode,
  RoundRecord,
  SummaryReportData,
  VelvetRoomState
} from './velvetTypes';

export interface VelvetTvHostOptions {
  onExitToArcade?: () => void;
}

interface EmberParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  maxAlpha: number;
  color: string;
  life: number;
  maxLife: number;
  isBurst: boolean;
}

const TIER_META: Record<QuestionTier, { icon: string; label: string; badgeClass: string }> = {
  romantic: { icon: '🍷', label: 'Deep & Romantic', badgeClass: 'vl-tier-romantic' },
  spicy: { icon: '🔥', label: 'Flirty & Spicy', badgeClass: 'vl-tier-spicy' },
  nsfw: { icon: '💋', label: 'Unfiltered NSFW', badgeClass: 'vl-tier-nsfw' }
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function mountVelvetTvHost(options: VelvetTvHostOptions = {}): () => void {
  ensureVelvetFontsAndStyles();
  VelvetAudio.unlock();

  // Remove any prior instance if mounted
  const existing = document.getElementById('velvet-tv-overlay');
  if (existing) {
    existing.remove();
  }

  const initialRoomCode = generateVelvetRoomCode(4);
  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  let lanHostOverride = '';
  try {
    lanHostOverride = window.localStorage.getItem('velvet_lan_override') ?? '';
  } catch {
    // ignore
  }

  // Authoritative Host State
  const sessionUsedIds = new Set<string>();
  const history: RoundRecord[] = [];
  let lockedValues: Record<PlayerId, number | null> = { robert: null, rita: null };
  let nextSpotlightTarget: PlayerId = Math.random() < 0.5 ? 'rita' : 'robert';
  let revealTimerId: number | null = null;
  let qrDataUrl: string = '';
  let brokerStatus: 'connecting' | 'ready' | 'reconnecting' | 'error' = 'connecting';

  const state: VelvetRoomState = {
    roomCode: initialRoomCode,
    phase: 'lobby',
    connected: {
      robert: false,
      rita: false
    },
    settings: {
      tiers: {
        romantic: true,
        spicy: true,
        nsfw: true
      },
      heatMode: 'progressive',
      gameLength: 10
    },
    roundNumber: 0,
    totalPlannedRounds: 10,
    currentQuestion: null,
    roundMode: 'shared',
    spotlightTarget: null,
    lockedIn: {
      robert: false,
      rita: false
    },
    revealed: null,
    overallCompatibility: null,
    completedRoundsCount: 0,
    spotlightScore: {
      robertPoints: 0,
      robertPredictions: 0,
      ritaPoints: 0,
      ritaPredictions: 0
    },
    summary: null
  };

  // Needle animation state for smooth 60fps HTML5 Canvas gauge
  const gaugeAnim = {
    active: false,
    startTime: 0,
    duration: 1800,
    robertCurrent: 50,
    ritaCurrent: 50,
    robertTarget: 50,
    ritaTarget: 50,
    settled: false
  };

  // Build Root DOM
  const root = document.createElement('div');
  root.id = 'velvet-tv-overlay';
  root.className = 'vl-tv-root';
  root.style.opacity = '0';
  root.style.transition = 'opacity 0.55s ease';

  const ambientCanvas = document.createElement('canvas');
  ambientCanvas.className = 'vl-ambient-canvas';
  root.appendChild(ambientCanvas);

  const stage = document.createElement('div');
  stage.className = 'vl-tv-stage';
  root.appendChild(stage);

  document.body.appendChild(root);
  requestAnimationFrame(() => {
    root.style.opacity = '1';
  });

  // Ambient Candlelight Bokeh &Celebration Ember Engine
  const embers: EmberParticle[] = [];
  const initAmbientEmbers = () => {
    embers.length = 0;
    const w = window.innerWidth || 1920;
    const h = window.innerHeight || 1080;
    for (let i = 0; i < 52; i++) {
      embers.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.28,
        vy: -0.18 - Math.random() * 0.45,
        radius: 1.5 + Math.random() * 4.2,
        alpha: Math.random() * 0.45,
        maxAlpha: 0.2 + Math.random() * 0.48,
        color: i % 3 === 0 ? '244, 143, 177' : '232, 197, 133',
        life: Math.random() * 600,
        maxLife: 500 + Math.random() * 500,
        isBurst: false
      });
    }
  };
  initAmbientEmbers();

  const triggerCelebrationBurst = (intensity: 'bullseye' | 'sync') => {
    const w = window.innerWidth || 1920;
    const h = window.innerHeight || 1080;
    const originX = w * 0.5;
    const originY = h * 0.54;
    const count = intensity === 'bullseye' ? 130 : 48;

    for (let i = 0; i < count; i++) {
      const angle = -Math.PI + Math.random() * Math.PI * 2;
      const speed =
        intensity === 'bullseye' ? 2.2 + Math.random() * 8.5 : 1.4 + Math.random() * 4.5;
      embers.push({
        x: originX + (Math.random() - 0.5) * 120,
        y: originY + (Math.random() - 0.5) * 40,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (intensity === 'bullseye' ? 2.8 : 1.4),
        radius: 2 + Math.random() * (intensity === 'bullseye' ? 5.5 : 3.5),
        alpha: 1,
        maxAlpha: 1,
        color:
          i % 4 === 0
            ? '255, 240, 200'
            : i % 3 === 0
            ? '244, 143, 177'
            : '232, 197, 133',
        life: 0,
        maxLife: intensity === 'bullseye' ? 110 + Math.random() * 90 : 75 + Math.random() * 55,
        isBurst: true
      });
    }
  };

  let gaugeCanvas: HTMLCanvasElement | null = null;
  let rafId: number | null = null;
  let destroyed = false;
  let exited = false;

  // Compute summary metrics from history
  const recomputeAggregates = () => {
    state.completedRoundsCount = history.length;
    if (history.length === 0) {
      state.overallCompatibility = null;
      state.spotlightScore = {
        robertPoints: 0,
        robertPredictions: 0,
        ritaPoints: 0,
        ritaPredictions: 0
      };
      return;
    }

    const totalSync = history.reduce((acc, r) => acc + r.roundSync, 0);
    state.overallCompatibility = Math.round(totalSync / history.length);

    let robertPts = 0;
    let robertPreds = 0;
    let ritaPts = 0;
    let ritaPreds = 0;

    for (const r of history) {
      if (r.mode === 'spotlight' && r.predictorBonus) {
        if (r.predictorBonus.predictor === 'robert') {
          robertPts += r.predictorBonus.accuracy;
          robertPreds += 1;
        } else {
          ritaPts += r.predictorBonus.accuracy;
          ritaPreds += 1;
        }
      }
    }

    state.spotlightScore = {
      robertPoints: robertPts,
      robertPredictions: robertPreds,
      ritaPoints: ritaPts,
      ritaPredictions: ritaPreds
    };
  };

  const buildSummaryData = (): SummaryReportData => {
    recomputeAggregates();
    const overall = state.overallCompatibility ?? 0;

    let closest: RoundRecord | null = null;
    let biggestTwist: RoundRecord | null = null;
    let bullseyes = 0;

    for (const r of history) {
      if (r.gap <= 5) bullseyes += 1;
      if (!closest || r.gap < closest.gap) {
        closest = r;
      }
      if (!biggestTwist || r.gap > biggestTwist.gap) {
        biggestTwist = r;
      }
    }

    const { robertPoints, robertPredictions, ritaPoints, ritaPredictions } = state.spotlightScore;
    const robertAvg =
      robertPredictions > 0 ? Math.round(robertPoints / robertPredictions) : null;
    const ritaAvg = ritaPredictions > 0 ? Math.round(ritaPoints / ritaPredictions) : null;

    let spotlightWinner: 'robert' | 'rita' | 'tie' | 'none' = 'none';
    if (robertAvg !== null || ritaAvg !== null) {
      const rA = robertAvg ?? 0;
      const riA = ritaAvg ?? 0;
      if (Math.abs(rA - riA) <= 1 && robertPredictions > 0 && ritaPredictions > 0) {
        spotlightWinner = 'tie';
      } else if (rA > riA) {
        spotlightWinner = 'robert';
      } else if (riA > rA) {
        spotlightWinner = 'rita';
      } else {
        spotlightWinner = 'tie';
      }
    }

    return {
      overallCompatibility: overall,
      totalRoundsPlayed: history.length,
      closestMoment: closest,
      biggestPlotTwist: biggestTwist && biggestTwist !== closest ? biggestTwist : biggestTwist,
      spotlightWinner,
      robertAvgPrediction: robertAvg,
      ritaAvgPrediction: ritaAvg,
      bullseyeCount: bullseyes,
      history: [...history]
    };
  };

  const shouldRoundBeSpotlight = (roundNum: number, plannedTotal: number | null): boolean => {
    if (plannedTotal === 10) {
      // Rounds 3 & 7 -> 1 spotlight each for Robert & Rita (~20-25%)
      return roundNum === 3 || roundNum === 7;
    }
    if (plannedTotal === 20) {
      // Rounds 3, 7, 11, 15, 18, 20 -> 3 spotlights each for Robert & Rita (~25-30%)
      return [3, 7, 11, 15, 18, 20].includes(roundNum);
    }
    // Endless Lounge: exact 25% cadence (Rounds 3, 7, 11, 15, 19...)
    return roundNum >= 3 && roundNum % 4 === 3;
  };

  const dealRound = (roundNum: number, reuseSpotlightMode?: { mode: RoundMode; target: PlayerId | null }) => {
    if (revealTimerId !== null) {
      window.clearTimeout(revealTimerId);
      revealTimerId = null;
    }
    VelvetAudio.stopActiveSwell();

    state.roundNumber = roundNum;
    state.totalPlannedRounds =
      state.settings.gameLength === 'endless' ? null : state.settings.gameLength;

    let mode: RoundMode = 'shared';
    let target: PlayerId | null = null;

    if (reuseSpotlightMode) {
      mode = reuseSpotlightMode.mode;
      target = reuseSpotlightMode.target;
    } else if (shouldRoundBeSpotlight(roundNum, state.totalPlannedRounds)) {
      mode = 'spotlight';
      target = nextSpotlightTarget;
      nextSpotlightTarget = nextSpotlightTarget === 'rita' ? 'robert' : 'rita';
    }

    const question = drawNextQuestion(
      state.settings,
      roundNum,
      sessionUsedIds,
      mode === 'spotlight'
    );
    sessionUsedIds.add(question.id);

    // If a fallback non-spotlight question was selected, coerce cleanly to shared
    if (mode === 'spotlight' && !question.allowSpotlight) {
      mode = 'shared';
      target = null;
    }

    state.phase = 'round_active';
    state.currentQuestion = question;
    state.roundMode = mode;
    state.spotlightTarget = target;
    state.lockedIn = { robert: false, rita: false };
    state.revealed = null;
    state.summary = null;
    lockedValues = { robert: null, rita: null };

    gaugeAnim.active = false;
    gaugeAnim.settled = false;
    gaugeAnim.robertCurrent = 50;
    gaugeAnim.ritaCurrent = 50;

    renderStage();
    net.broadcastState();
  };

  const beginRevealSequence = () => {
    if (!state.currentQuestion) return;
    const robertVal = lockedValues.robert ?? 50;
    const ritaVal = lockedValues.rita ?? 50;

    const verdict = evaluateRoundVerdict(
      state.currentQuestion,
      state.roundMode,
      state.spotlightTarget,
      robertVal,
      ritaVal
    );

    state.phase = 'revealing';
    state.revealed = {
      robert: robertVal,
      rita: ritaVal,
      gap: verdict.gap,
      roundSync: verdict.roundSync,
      verdictKey: verdict.verdictKey,
      verdictBanner: verdict.verdictBanner,
      discussionSubPrompt: verdict.discussionSubPrompt,
      predictorBonusText: verdict.predictorBonusText
    };

    gaugeAnim.active = true;
    gaugeAnim.settled = false;
    gaugeAnim.startTime = performance.now();
    gaugeAnim.duration = 1800;
    gaugeAnim.robertCurrent = 50;
    gaugeAnim.ritaCurrent = 50;
    gaugeAnim.robertTarget = robertVal;
    gaugeAnim.ritaTarget = ritaVal;

    VelvetAudio.playRevealTensionSwell(1800);
    renderStage();
    net.broadcastState();

    revealTimerId = window.setTimeout(() => {
      revealTimerId = null;
      if (destroyed || state.phase !== 'revealing' || !state.currentQuestion || !state.revealed) {
        return;
      }

      gaugeAnim.active = false;
      gaugeAnim.settled = true;
      gaugeAnim.robertCurrent = robertVal;
      gaugeAnim.ritaCurrent = ritaVal;

      const predictor: PlayerId | null =
        state.roundMode === 'spotlight' && state.spotlightTarget
          ? state.spotlightTarget === 'robert'
            ? 'rita'
            : 'robert'
          : null;

      const record: RoundRecord = {
        roundNumber: state.roundNumber,
        question: state.currentQuestion,
        mode: state.roundMode,
        spotlightTarget: state.spotlightTarget,
        robertValue: robertVal,
        ritaValue: ritaVal,
        gap: state.revealed.gap,
        roundSync: state.revealed.roundSync,
        predictorBonus: predictor
          ? {
              predictor,
              accuracy: state.revealed.roundSync,
              wonBonus: state.revealed.gap <= 15
            }
          : null
      };

      history.push(record);
      recomputeAggregates();

      state.phase = 'discussion';
      VelvetAudio.playRevealVerdict(state.revealed.gap);

      if (state.revealed.gap <= 5) {
        triggerCelebrationBurst('bullseye');
      } else if (state.revealed.gap <= 15) {
        triggerCelebrationBurst('sync');
      }

      renderStage();
      net.broadcastState();
    }, 1820);
  };

  const transitionToSummary = () => {
    if (revealTimerId !== null) {
      window.clearTimeout(revealTimerId);
      revealTimerId = null;
    }
    VelvetAudio.stopActiveSwell();
    state.phase = 'summary';
    state.summary = buildSummaryData();
    VelvetAudio.playRoomLaunchPad();
    if ((state.summary.overallCompatibility ?? 0) >= 80) {
      triggerCelebrationBurst('sync');
    }
    renderStage();
    net.broadcastState();
  };

  const refreshQrCode = async () => {
    const joinUrl = buildVelvetJoinUrl(state.roomCode, lanHostOverride);
    try {
      qrDataUrl = await generateVelvetQrDataUrl(joinUrl);
      if (!destroyed && state.phase === 'lobby') {
        renderStage();
      }
    } catch {
      // ignore QR error
    }
  };

  // Initialize Host Network
  const net = new VelvetHostNetwork(initialRoomCode, {
    getState: () => state,
    getLockedValueForPlayer: (player: PlayerId) =>
      state.lockedIn[player] ? lockedValues[player] : null,
    onPlayerPresenceChanged: (player: PlayerId, isConnected: boolean, isNewClaim: boolean) => {
      state.connected[player] = isConnected;
      if (isConnected && isNewClaim) {
        VelvetAudio.playPlayerJoinChime(player);
      }
      renderStage();
    },
    onBrokerStatusChange: (status) => {
      brokerStatus = status;
      if (net.getRoomCode() !== state.roomCode) {
        state.roomCode = net.getRoomCode();
        void refreshQrCode();
      } else if (state.phase === 'lobby') {
        renderStage();
      }
    },
    onMessageFromPhone: (msg: PhoneToHostMessage, sender: PlayerId | null) => {
      switch (msg.type) {
        case 'UPDATE_SETTINGS': {
          if (state.phase !== 'lobby') return;
          if (msg.settings.tiers) {
            const merged = {
              ...state.settings.tiers,
              ...msg.settings.tiers
            };
            // Ensure at least 1 deck stays enabled
            if (!merged.romantic && !merged.spicy && !merged.nsfw) {
              merged.romantic = true;
            }
            state.settings.tiers = merged;
          }
          if (msg.settings.heatMode) {
            state.settings.heatMode = msg.settings.heatMode;
          }
          if (msg.settings.gameLength) {
            state.settings.gameLength = msg.settings.gameLength;
            state.totalPlannedRounds =
              msg.settings.gameLength === 'endless' ? null : msg.settings.gameLength;
          }
          VelvetAudio.playUiSoftTap();
          renderStage();
          net.broadcastState();
          break;
        }

        case 'START_GAME': {
          if (state.phase !== 'lobby') return;
          history.length = 0;
          sessionUsedIds.clear();
          recomputeAggregates();
          VelvetAudio.playRoomLaunchPad();
          dealRound(1);
          break;
        }

        case 'LOCK_ANSWER': {
          if (state.phase !== 'round_active') return;
          const p = msg.player;
          if (p !== 'robert' && p !== 'rita') return;
          const clamped = Math.round(Math.max(0, Math.min(100, Number(msg.value) || 0)));
          lockedValues[p] = clamped;
          state.lockedIn[p] = true;
          VelvetAudio.playPartnerLockTick(p);

          if (state.lockedIn.robert && state.lockedIn.rita) {
            beginRevealSequence();
          } else {
            renderStage();
            net.broadcastState();
          }
          break;
        }

        case 'UNLOCK_ANSWER': {
          if (state.phase !== 'round_active') return;
          const p = msg.player;
          if (p !== 'robert' && p !== 'rita') return;
          // Allowed as long as both haven't already triggered reveal
          state.lockedIn[p] = false;
          lockedValues[p] = null;
          VelvetAudio.playUiSoftTap();
          renderStage();
          net.broadcastState();
          break;
        }

        case 'NEXT_QUESTION': {
          if (state.phase !== 'discussion') return;
          if (
            state.totalPlannedRounds !== null &&
            state.roundNumber >= state.totalPlannedRounds
          ) {
            transitionToSummary();
          } else {
            VelvetAudio.playUiSoftTap();
            dealRound(state.roundNumber + 1);
          }
          break;
        }

        case 'REDRAW_QUESTION': {
          if (state.phase !== 'round_active' && state.phase !== 'discussion') return;
          const preserveMode = {
            mode: state.roundMode,
            target: state.spotlightTarget
          };
          if (
            state.phase === 'discussion' &&
            history.length > 0 &&
            history[history.length - 1].roundNumber === state.roundNumber
          ) {
            history.pop();
            recomputeAggregates();
          }
          VelvetAudio.playUiSoftTap();
          dealRound(state.roundNumber, preserveMode);
          break;
        }

        case 'FINISH_GAME': {
          if (state.phase === 'discussion' || state.phase === 'round_active') {
            transitionToSummary();
          }
          break;
        }

        case 'PLAY_AGAIN': {
          history.length = 0;
          sessionUsedIds.clear();
          recomputeAggregates();
          state.phase = 'lobby';
          state.roundNumber = 0;
          state.currentQuestion = null;
          state.revealed = null;
          state.summary = null;
          VelvetAudio.playRoomLaunchPad();
          renderStage();
          net.broadcastState();
          break;
        }

        default:
          void sender;
          break;
      }
    }
  });

  // ============================================================================
  // RENDER STAGE HTML BY PHASE
  // ============================================================================

  const renderTopBar = (): string => {
    const muteLabel = VelvetAudio.isMuted() ? '🔇 Muted' : '🔊 Lounge Audio';
    const syncText =
      state.overallCompatibility !== null ? `${state.overallCompatibility}%` : '—';

    const showRoundPill =
      state.phase === 'round_active' ||
      state.phase === 'revealing' ||
      state.phase === 'discussion';

    const roundLabel =
      state.totalPlannedRounds !== null
        ? `Round ${state.roundNumber} / ${state.totalPlannedRounds}`
        : `Round ${state.roundNumber} • Endless`;

    return `
      <header class="vl-tv-topbar">
        <div class="vl-brand-lockup">
          <span class="vl-brand-kicker">After Hours</span>
          <span class="vl-brand-divider">•</span>
          <span class="vl-brand-sub">Wavelength Lounge</span>
        </div>

        <div class="vl-topbar-metrics">
          ${
            showRoundPill
              ? `<div class="vl-metric-pill"><span>${escapeHtml(roundLabel)}</span></div>`
              : ''
          }
          ${
            state.overallCompatibility !== null
              ? `<div class="vl-metric-pill"><span>Overall Compatibility</span><strong>${syncText}</strong></div>`
              : ''
          }
          <div class="vl-metric-pill" style="opacity:0.86;">
            <span>Room</span><strong>${escapeHtml(state.roomCode)}</strong>
          </div>
          <button type="button" class="vl-icon-btn" id="vl-btn-mute">${muteLabel}</button>
          <button type="button" class="vl-exit-btn" id="vl-btn-exit">× Exit to Arcade</button>
        </div>
      </header>
    `;
  };

  const renderLobbyContent = (): string => {
    const joinUrl = buildVelvetJoinUrl(state.roomCode, lanHostOverride);
    const activeDecks = (['romantic', 'spicy', 'nsfw'] as QuestionTier[])
      .filter((t) => state.settings.tiers[t])
      .map(
        (t) =>
          `<span class="vl-tier-badge ${TIER_META[t].badgeClass}">${TIER_META[t].icon} ${TIER_META[t].label}</span>`
      )
      .join('');

    const heatLabel =
      state.settings.heatMode === 'progressive'
        ? '🌡️ Progressive Heat'
        : '🎲 Pure Shuffle';
    const lengthLabel =
      state.settings.gameLength === 'endless'
        ? '∞ Endless Lounge'
        : `${state.settings.gameLength} Rounds`;

    const brokerBadge =
      brokerStatus === 'ready'
        ? '<span style="color:#86efac;">● Live WebRTC Lounge Ready</span>'
        : brokerStatus === 'connecting'
        ? '<span style="color:#fde68a;">◌ Connecting Lounge Signal...</span>'
        : '<span style="color:#fda4af;">◌ Reconnecting Signal...</span>';

    const renderPedestal = (player: PlayerId) => {
      const isRobert = player === 'robert';
      const isConn = state.connected[player];
      const accent = isRobert ? '#e8c585' : '#f48fb1';
      const glow = isRobert ? 'rgba(232, 197, 133, 0.26)' : 'rgba(244, 143, 177, 0.26)';
      const name = isRobert ? 'ROBERT' : 'RITA';
      const subtitle = isConn ? 'Connected ✓ • Ready in Lounge' : 'Scan QR on Phone to Join';

      return `
        <div class="vl-glass-card" style="
          flex: 1;
          min-width: 240px;
          max-width: 340px;
          padding: clamp(22px, 2.8vh, 34px) 26px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          border-color: ${isConn ? accent : 'rgba(232, 197, 133, 0.18)'};
          box-shadow: ${
            isConn
              ? `0 24px 60px rgba(0,0,0,0.7), 0 0 48px ${glow}, inset 0 0 24px ${glow}`
              : '0 18px 48px rgba(0,0,0,0.55)'
          };
          transition: all 0.35s ease;
        ">
          <div style="
            width: clamp(68px, 7.5vh, 88px);
            height: clamp(68px, 7.5vh, 88px);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: var(--vl-serif);
            font-size: clamp(30px, 3.4vh, 40px);
            font-weight: 700;
            color: ${isConn ? '#120810' : accent};
            background: ${
              isConn
                ? `radial-gradient(circle at 35% 30%, #fff6e5, ${accent})`
                : 'rgba(18, 10, 24, 0.85)'
            };
            border: 2px solid ${accent};
            box-shadow: ${isConn ? `0 0 30px ${glow}` : 'none'};
            margin-bottom: 16px;
          ">${name[0]}</div>

          <div style="
            font-size: clamp(18px, 1.6vw, 24px);
            font-weight: 700;
            letter-spacing: 0.18em;
            color: ${isConn ? '#fff8ee' : 'rgba(248,241,231,0.82)'};
            margin-bottom: 8px;
          ">${name}</div>

          <div style="
            font-size: 13.5px;
            font-weight: 600;
            color: ${isConn ? accent : 'rgba(248,241,231,0.48)'};
            letter-spacing: 0.04em;
          ">${subtitle}</div>
        </div>
      `;
    };

    return `
      <div class="vl-animate-in" style="
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: clamp(18px, 2.6vh, 32px);
      ">
        <div style="text-align: center; max-width: 880px;">
          <div style="
            font-size: clamp(11px, 0.9vw, 13px);
            font-weight: 700;
            letter-spacing: 0.3em;
            text-transform: uppercase;
            color: var(--vl-gold);
            margin-bottom: 8px;
          ">Robert &amp; Rita • Private Couples Edition</div>
          <h1 style="
            font-family: var(--vl-serif);
            font-size: clamp(34px, 4.2vw, 62px);
            font-weight: 700;
            line-height: 1.08;
            color: var(--vl-cream);
            text-shadow: 0 10px 32px rgba(0, 0, 0, 0.7);
          ">
            After Hours: <span style="font-style: italic; font-weight: 500; color: var(--vl-gold-bright);">Are We Compatible?</span>
          </h1>
        </div>

        <div style="
          display: flex;
          align-items: stretch;
          justify-content: center;
          gap: clamp(20px, 2.8vw, 44px);
          width: 100%;
          max-width: 1180px;
        ">
          ${renderPedestal('robert')}

          <!-- Center QR Card -->
          <div class="vl-glass-card" style="
            padding: clamp(18px, 2.4vh, 28px) clamp(24px, 2.6vw, 36px);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            border-color: rgba(232, 197, 133, 0.42);
            min-width: 310px;
          ">
            <div style="
              padding: 12px;
              border-radius: 18px;
              background: #09060e;
              border: 1.5px solid rgba(232, 197, 133, 0.55);
              box-shadow: 0 14px 36px rgba(0, 0, 0, 0.75), 0 0 28px rgba(232, 197, 133, 0.14);
              margin-bottom: 14px;
            ">
              ${
                qrDataUrl
                  ? `<img src="${qrDataUrl}" alt="Join After Hours QR" style="width: clamp(150px, 20vh, 215px); height: clamp(150px, 20vh, 215px); display: block; border-radius: 10px;" />`
                  : `<div style="width:180px;height:180px;display:flex;align-items:center;justify-content:center;color:var(--vl-gold);">Generating QR...</div>`
              }
            </div>

            <div style="
              font-size: 12px;
              letter-spacing: 0.22em;
              text-transform: uppercase;
              color: var(--vl-muted);
              margin-bottom: 4px;
            ">Room Code</div>

            <div style="
              font-family: var(--vl-sans);
              font-size: clamp(24px, 2.2vw, 32px);
              font-weight: 700;
              letter-spacing: 0.24em;
              color: var(--vl-gold-bright);
              margin-bottom: 8px;
            ">${escapeHtml(state.roomCode)}</div>

            <a href="${escapeHtml(joinUrl)}" target="_blank" rel="noopener" style="
              font-size: 12px;
              color: rgba(248, 241, 231, 0.62);
              text-decoration: none;
              word-break: break-all;
              max-width: 280px;
              margin-bottom: 8px;
            ">${escapeHtml(joinUrl)}</a>

            <div style="font-size: 11.5px; font-weight: 600;">${brokerBadge}</div>

            ${
              isLocalhost
                ? `
                  <div style="margin-top: 10px; display:flex; gap:6px; align-items:center; width:100%;">
                    <input
                      id="vl-lan-input"
                      type="text"
                      placeholder="LAN IP (e.g. 192.168.1.50:5173)"
                      value="${escapeHtml(lanHostOverride)}"
                      style="
                        flex: 1;
                        background: rgba(9, 6, 14, 0.85);
                        border: 1px solid rgba(232, 197, 133, 0.3);
                        border-radius: 8px;
                        padding: 6px 9px;
                        color: var(--vl-cream);
                        font-size: 11.5px;
                        font-family: var(--vl-sans);
                      "
                    />
                    <button id="vl-lan-apply" type="button" class="vl-icon-btn" style="padding:6px 10px;font-size:10.5px;">Set IP</button>
                  </div>
                `
                : ''
            }
          </div>

          ${renderPedestal('rita')}
        </div>

        <!-- Live Lobby Deck Configuration Strip -->
        <div class="vl-glass-card" style="
          padding: 14px 26px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          gap: 12px;
          max-width: 1040px;
        ">
          <span style="font-size: 12px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--vl-muted);">Active Lounge Setup:</span>
          ${activeDecks}
          <span class="vl-brand-divider">|</span>
          <span style="font-size: 13px; font-weight: 600; color: var(--vl-gold-bright);">${heatLabel}</span>
          <span class="vl-brand-divider">•</span>
          <span style="font-size: 13px; font-weight: 600; color: var(--vl-cream);">${lengthLabel}</span>
          <span style="font-size: 12px; color: var(--vl-muted); margin-left: 6px;">(Customize &amp; tap Start Game on either phone)</span>
        </div>
      </div>
    `;
  };

  const renderGameplayContent = (): string => {
    const q = state.currentQuestion;
    if (!q) return '';

    const tierInfo = TIER_META[q.tier];
    const isSpotlight = state.roundMode === 'spotlight' && state.spotlightTarget !== null;
    const targetName = state.spotlightTarget === 'robert' ? 'Robert' : 'Rita';
    const predictorName = state.spotlightTarget === 'robert' ? 'Rita' : 'Robert';

    const modeBadgeHtml = isSpotlight
      ? `<span class="vl-tier-badge" style="background:rgba(232,197,133,0.18);border:1px solid var(--vl-gold);color:var(--vl-gold-bright);">🎯 Spotlight on ${targetName} (${predictorName} Predicts!)</span>`
      : `<span class="vl-tier-badge" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.18);color:var(--vl-cream);">〰️ Shared Compatibility Spectrum</span>`;

    let bottomPanelHtml = '';

    if (state.phase === 'round_active') {
      const renderLockPill = (p: PlayerId) => {
        const locked = state.lockedIn[p];
        const labelName = p === 'robert' ? 'Robert' : 'Rita';
        const accent = p === 'robert' ? 'var(--vl-gold)' : 'var(--vl-rose)';
        const roleHint =
          isSpotlight && state.spotlightTarget
            ? state.spotlightTarget === p
              ? 'Setting true answer'
              : `Predicting ${targetName}`
            : 'Sliding 0–100';

        return `
          <div style="
            flex: 1;
            max-width: 340px;
            padding: 14px 22px;
            border-radius: 16px;
            background: ${locked ? 'rgba(38, 18, 30, 0.92)' : 'rgba(14, 9, 22, 0.72)'};
            border: 1.5px solid ${locked ? accent : 'rgba(255,255,255,0.12)'};
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            box-shadow: ${locked ? `0 0 26px rgba(232, 197, 133, 0.16)` : 'none'};
          ">
            <div>
              <div style="font-weight:700;font-size:15px;letter-spacing:0.08em;text-transform:uppercase;color:${accent};">${labelName}</div>
              <div style="font-size:12px;color:var(--vl-muted);">${roleHint}</div>
            </div>
            <div style="
              font-size: 13px;
              font-weight: 700;
              padding: 6px 12px;
              border-radius: 999px;
              background: ${locked ? 'rgba(232,197,133,0.18)' : 'rgba(255,255,255,0.05)'};
              color: ${locked ? '#fff8eb' : 'rgba(248,241,231,0.52)'};
            ">
              ${locked ? 'Locked In ✓' : 'Contemplating...'}
            </div>
          </div>
        `;
      };

      bottomPanelHtml = `
        <div style="display:flex;align-items:center;justify-content:center;gap:24px;width:100%;">
          ${renderLockPill('robert')}
          ${renderLockPill('rita')}
        </div>
      `;
    } else if (state.phase === 'revealing') {
      bottomPanelHtml = `
        <div class="vl-glass-card" style="padding: 18px 36px; text-align: center; border-color: rgba(232,197,133,0.45);">
          <div style="
            font-family: var(--vl-serif);
            font-style: italic;
            font-size: clamp(20px, 2vw, 28px);
            color: var(--vl-gold-bright);
            animation: vlSoftPulse 0.9s ease-in-out infinite;
          ">Synchronizing Wavelengths...</div>
        </div>
      `;
    } else if (state.phase === 'discussion' && state.revealed) {
      const rev = state.revealed;
      const bannerBorder =
        rev.verdictKey === 'bullseye'
          ? '#f7dfb0'
          : rev.verdictKey === 'sync'
          ? '#e8c585'
          : rev.verdictKey === 'intriguing'
          ? '#f48fb1'
          : '#fb7185';

      bottomPanelHtml = `
        <div class="vl-glass-card vl-animate-in" style="
          width: 100%;
          max-width: 1120px;
          padding: clamp(14px, 2vh, 22px) clamp(22px, 2.8vw, 36px);
          border-color: ${bannerBorder};
          display: flex;
          flex-direction: column;
          gap: 8px;
          text-align: center;
        ">
          <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:14px;">
            <span style="
              font-size: clamp(16px, 1.65vw, 24px);
              font-weight: 700;
              letter-spacing: 0.08em;
              color: var(--vl-gold-bright);
            ">${escapeHtml(rev.verdictBanner)}</span>
            <span class="vl-metric-pill" style="padding:5px 14px;">
              <span>Robert</span><strong style="color:var(--vl-gold);">${rev.robert}</strong>
              <span class="vl-brand-divider">•</span>
              <span>Rita</span><strong style="color:var(--vl-rose);">${rev.rita}</strong>
              <span class="vl-brand-divider">•</span>
              <span>Gap</span><strong>${rev.gap}</strong>
              <span class="vl-brand-divider">•</span>
              <span>Round Sync</span><strong>${rev.roundSync}%</strong>
            </span>
          </div>

          ${
            rev.predictorBonusText
              ? `<div style="font-size:13px;font-weight:700;color:var(--vl-rose-bright);letter-spacing:0.04em;">🎯 ${escapeHtml(rev.predictorBonusText)}</div>`
              : ''
          }

          <div style="
            font-family: var(--vl-serif);
            font-style: italic;
            font-size: clamp(15px, 1.35vw, 20px);
            color: rgba(248, 241, 231, 0.9);
            line-height: 1.4;
          ">${escapeHtml(rev.discussionSubPrompt)}</div>

          <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-top:4px;">
            <span style="font-size:11.5px;color:var(--vl-muted);">Take all the time you want to talk — advance from either phone, or:</span>
            <button type="button" class="vl-icon-btn" id="vl-tv-next" style="padding:5px 14px;font-size:11px;">
              ${
                state.totalPlannedRounds !== null && state.roundNumber >= state.totalPlannedRounds
                  ? 'Finish & View Summary →'
                  : 'Next Question →'
              }
            </button>
          </div>
        </div>
      `;
    }

    return `
      <div style="
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
        gap: clamp(10px, 1.6vh, 18px);
        width: 100%;
        max-width: 1360px;
        margin: 0 auto;
        padding: 4px 0;
      ">
        <!-- Question Header Card -->
        <div class="vl-glass-card" style="
          width: 100%;
          max-width: 1140px;
          padding: clamp(16px, 2.2vh, 26px) clamp(24px, 3vw, 44px);
          text-align: center;
        ">
          <div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:10px;flex-wrap:wrap;">
            <span class="vl-tier-badge ${tierInfo.badgeClass}">${tierInfo.icon} ${tierInfo.label}</span>
            ${modeBadgeHtml}
          </div>
          <h2 style="
            font-family: var(--vl-serif);
            font-size: clamp(22px, 2.45vw, 38px);
            font-weight: 500;
            line-height: 1.24;
            color: var(--vl-cream);
          ">${escapeHtml(q.prompt)}</h2>
        </div>

        <!-- Center Semicircular Wavelength Gauge + 0 / 100 Pole Plaques -->
        <div style="
          display: grid;
          grid-template-columns: minmax(190px, 270px) minmax(360px, 640px) minmax(190px, 270px);
          align-items: end;
          gap: clamp(14px, 2vw, 28px);
          width: 100%;
          max-width: 1240px;
        ">
          <!-- Left Pole (0) -->
          <div class="vl-glass-card" style="
            padding: 18px 20px;
            border-left: 3px solid var(--vl-rose);
            text-align: left;
          ">
            <div style="
              font-size: 22px;
              font-weight: 700;
              color: var(--vl-rose-bright);
              margin-bottom: 6px;
              font-family: var(--vl-sans);
            ">0</div>
            <div style="
              font-size: clamp(13.5px, 1.08vw, 16.5px);
              line-height: 1.38;
              color: var(--vl-cream);
              font-weight: 600;
            ">${escapeHtml(q.leftLabel)}</div>
          </div>

          <!-- Semicircular HD Canvas Dial -->
          <div style="
            width: 100%;
            height: clamp(210px, 31vh, 320px);
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <canvas id="vl-gauge-canvas" style="width: 100%; height: 100%; display: block;"></canvas>
          </div>

          <!-- Right Pole (100) -->
          <div class="vl-glass-card" style="
            padding: 18px 20px;
            border-right: 3px solid var(--vl-gold);
            text-align: right;
          ">
            <div style="
              font-size: 22px;
              font-weight: 700;
              color: var(--vl-gold-bright);
              margin-bottom: 6px;
              font-family: var(--vl-sans);
            ">100</div>
            <div style="
              font-size: clamp(13.5px, 1.08vw, 16.5px);
              line-height: 1.38;
              color: var(--vl-cream);
              font-weight: 600;
            ">${escapeHtml(q.rightLabel)}</div>
          </div>
        </div>

        <!-- Bottom Status / Verdict & Unhurried Discussion Panel -->
        <div style="width: 100%; display: flex; justify-content: center;">
          ${bottomPanelHtml}
        </div>
      </div>
    `;
  };

  const renderSummaryContent = (): string => {
    const sum = state.summary ?? buildSummaryData();
    const overall = sum.overallCompatibility;

    const headlineVerdict =
      overall >= 88
        ? 'Telepathic Soulmates'
        : overall >= 75
        ? 'Deeply Locked Into Each Other’s Orbit'
        : overall >= 60
        ? 'Magnetic Opposites & Electric Sparks'
        : 'Opposites Attract — Plenty to Unpack Tonight!';

    const spotlightText =
      sum.spotlightWinner === 'robert'
        ? `🏆 Robert won "Read My Mind" (${sum.robertAvgPrediction ?? 0}% vs ${sum.ritaAvgPrediction ?? 0}% avg accuracy)`
        : sum.spotlightWinner === 'rita'
        ? `🏆 Rita won "Read My Mind" (${sum.ritaAvgPrediction ?? 0}% vs ${sum.robertAvgPrediction ?? 0}% avg accuracy)`
        : sum.spotlightWinner === 'tie'
        ? `✨ Dead Heat on "Read My Mind" (${sum.robertAvgPrediction ?? 0}% avg accuracy each!)`
        : 'Play 3+ rounds to unlock Mind-Reader Spotlight rankings!';

    const renderHighlightCard = (
      badge: string,
      accentColor: string,
      rec: RoundRecord | null,
      emptyLabel: string
    ) => {
      if (!rec) {
        return `
          <div class="vl-glass-card" style="flex:1;padding:22px;border-color:rgba(255,255,255,0.12);">
            <div style="font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${accentColor};margin-bottom:8px;">${badge}</div>
            <div style="color:var(--vl-muted);font-size:14px;">${emptyLabel}</div>
          </div>
        `;
      }
      return `
        <div class="vl-glass-card" style="
          flex: 1;
          padding: clamp(18px, 2.4vh, 26px);
          border-color: ${accentColor};
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 14px;
        ">
          <div>
            <div style="font-size:11.5px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${accentColor};margin-bottom:8px;">
              ${badge} • Gap of ${rec.gap} ${rec.gap === 1 ? 'pt' : 'pts'}
            </div>
            <div style="font-family:var(--vl-serif);font-size:clamp(16px, 1.45vw, 22px);line-height:1.32;color:var(--vl-cream);">
              “${escapeHtml(rec.question.prompt)}”
            </div>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;font-size:13px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.1);">
            <span>Robert: <strong style="color:var(--vl-gold);">${rec.robertValue}</strong></span>
            <span>Rita: <strong style="color:var(--vl-rose);">${rec.ritaValue}</strong></span>
            <span>Sync: <strong style="color:#fff;">${rec.roundSync}%</strong></span>
          </div>
        </div>
      `;
    };

    return `
      <div class="vl-animate-in" style="
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: clamp(18px, 2.6vh, 30px);
        max-width: 1180px;
        width: 100%;
        margin: 0 auto;
      ">
        <div style="text-align:center;">
          <div style="font-size:12px;font-weight:700;letter-spacing:0.26em;text-transform:uppercase;color:var(--vl-gold);margin-bottom:6px;">
            End-of-Night Compatibility Report • ${sum.totalRoundsPlayed} ${sum.totalRoundsPlayed === 1 ? 'Round' : 'Rounds'} Played
          </div>
          <div style="
            font-family: var(--vl-serif);
            font-size: clamp(54px, 6.2vw, 88px);
            font-weight: 700;
            line-height: 1;
            color: var(--vl-gold-bright);
            text-shadow: 0 0 42px rgba(232, 197, 133, 0.35);
            margin-bottom: 8px;
          ">${overall}%</div>
          <div style="font-family:var(--vl-serif);font-style:italic;font-size:clamp(20px, 2vw, 30px);color:var(--vl-cream);">
            ${escapeHtml(headlineVerdict)}
          </div>
        </div>

        <div style="display:flex;gap:24px;width:100%;align-items:stretch;">
          ${renderHighlightCard(
            '🔥 Closest Mind-Meld Moment',
            'rgba(232, 197, 133, 0.55)',
            sum.closestMoment,
            'No rounds recorded yet.'
          )}
          ${renderHighlightCard(
            '🌶️ Biggest Plot Twist',
            'rgba(244, 143, 177, 0.55)',
            sum.biggestPlotTwist,
            'Play at least 2 rounds to compare.'
          )}
        </div>

        <div class="vl-glass-card" style="
          width: 100%;
          padding: 18px 28px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        ">
          <div>
            <div style="font-size:11.5px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:var(--vl-muted);margin-bottom:4px;">
              Mind-Reader Spotlight &amp; Bullseyes
            </div>
            <div style="font-size:15px;font-weight:600;color:var(--vl-cream);">
              ${escapeHtml(spotlightText)} • <span style="color:var(--vl-gold-bright);">${sum.bullseyeCount} Soulmate ${sum.bullseyeCount === 1 ? 'Bullseye' : 'Bullseyes'}</span>
            </div>
          </div>

          <button type="button" class="vl-primary-btn" id="vl-tv-play-again" style="width:auto;padding:14px 28px;">
            Play Another Round
          </button>
        </div>
      </div>
    `;
  };

  const renderStage = () => {
    if (destroyed) return;

    let bodyHtml = '';
    if (state.phase === 'lobby') {
      bodyHtml = renderLobbyContent();
    } else if (state.phase === 'summary') {
      bodyHtml = renderSummaryContent();
    } else {
      bodyHtml = renderGameplayContent();
    }

    stage.innerHTML = `
      ${renderTopBar()}
      ${bodyHtml}
    `;

    // Wire stage buttons
    const muteBtn = document.getElementById('vl-btn-mute');
    muteBtn?.addEventListener('click', () => {
      const isMuted = VelvetAudio.toggleMute();
      if (muteBtn) {
        muteBtn.textContent = isMuted ? '🔇 Muted' : '🔊 Lounge Audio';
      }
    });

    const exitBtn = document.getElementById('vl-btn-exit');
    exitBtn?.addEventListener('click', () => {
      cleanupAndExit();
    });

    const lanApplyBtn = document.getElementById('vl-lan-apply');
    const lanInput = document.getElementById('vl-lan-input') as HTMLInputElement | null;
    if (lanApplyBtn && lanInput) {
      const applyIp = () => {
        lanHostOverride = lanInput.value.trim();
        try {
          window.localStorage.setItem('velvet_lan_override', lanHostOverride);
        } catch {
          // ignore
        }
        void refreshQrCode();
      };
      lanApplyBtn.addEventListener('click', applyIp);
      lanInput.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') applyIp();
      });
    }

    const tvNextBtn = document.getElementById('vl-tv-next');
    tvNextBtn?.addEventListener('click', () => {
      if (state.phase !== 'discussion') return;
      if (
        state.totalPlannedRounds !== null &&
        state.roundNumber >= state.totalPlannedRounds
      ) {
        transitionToSummary();
      } else {
        VelvetAudio.playUiSoftTap();
        dealRound(state.roundNumber + 1);
      }
    });

    const tvPlayAgainBtn = document.getElementById('vl-tv-play-again');
    tvPlayAgainBtn?.addEventListener('click', () => {
      history.length = 0;
      sessionUsedIds.clear();
      recomputeAggregates();
      state.phase = 'lobby';
      state.roundNumber = 0;
      state.currentQuestion = null;
      state.revealed = null;
      state.summary = null;
      VelvetAudio.playRoomLaunchPad();
      renderStage();
      net.broadcastState();
    });

    gaugeCanvas = document.getElementById('vl-gauge-canvas') as HTMLCanvasElement | null;
  };

  // ============================================================================
  // 60FPS RETINA / 4K CANVAS ANIMATION LOOP (BOKEH + SEMICIRCULAR SPECTRUM DIAL)
  // ============================================================================

  const valueToAngle = (val: number): number => {
    // Maps 0..100 along a sleek upper semicircular arch from PI (left) to 2*PI (right)
    const clamped = Math.max(0, Math.min(100, val));
    return Math.PI + (clamped / 100) * Math.PI;
  };

  const drawSemicircularGauge = (now: number) => {
    if (!gaugeCanvas) return;
    const rect = gaugeCanvas.getBoundingClientRect();
    if (rect.width < 20 || rect.height < 20) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const targetW = Math.round(rect.width * dpr);
    const targetH = Math.round(rect.height * dpr);
    if (gaugeCanvas.width !== targetW || gaugeCanvas.height !== targetH) {
      gaugeCanvas.width = targetW;
      gaugeCanvas.height = targetH;
    }

    const ctx = gaugeCanvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const cx = rect.width * 0.5;
    const cy = rect.height * 0.88;
    const radius = Math.min(rect.width * 0.43, rect.height * 0.74);
    const trackWidth = Math.max(16, radius * 0.11);

    // 1. Subtle radial velvet glow under the arch
    const bgGlow = ctx.createRadialGradient(cx, cy, radius * 0.15, cx, cy, radius * 1.18);
    bgGlow.addColorStop(0, 'rgba(232, 197, 133, 0.12)');
    bgGlow.addColorStop(0.55, 'rgba(74, 15, 38, 0.16)');
    bgGlow.addColorStop(1, 'rgba(9, 6, 14, 0)');
    ctx.fillStyle = bgGlow;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.18, Math.PI, Math.PI * 2);
    ctx.closePath();
    ctx.fill();

    // 2. Outer Recessed Obsidian & Cabernet Track
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, radius, Math.PI, Math.PI * 2);
    ctx.strokeStyle = 'rgba(14, 8, 20, 0.92)';
    ctx.lineWidth = trackWidth + 8;
    ctx.stroke();

    const arcGrad = ctx.createLinearGradient(cx - radius, cy, cx + radius, cy);
    arcGrad.addColorStop(0, 'rgba(244, 143, 177, 0.42)');
    arcGrad.addColorStop(0.5, 'rgba(145, 38, 76, 0.48)');
    arcGrad.addColorStop(1, 'rgba(232, 197, 133, 0.46)');

    ctx.beginPath();
    ctx.arc(cx, cy, radius, Math.PI, Math.PI * 2);
    ctx.strokeStyle = arcGrad;
    ctx.lineWidth = trackWidth;
    ctx.stroke();

    // Thin inner champagne hairline
    ctx.beginPath();
    ctx.arc(cx, cy, radius - trackWidth * 0.65, Math.PI, Math.PI * 2);
    ctx.strokeStyle = 'rgba(232, 197, 133, 0.22)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 3. Precision Degree Ticks & Scale Numbers (0, 25, 50, 75, 100)
    for (let v = 0; v <= 100; v += 5) {
      const ang = valueToAngle(v);
      const isMajor = v % 25 === 0;
      const isMid = v % 10 === 0;
      const innerR = radius + trackWidth * 0.62;
      const outerR = innerR + (isMajor ? 12 : isMid ? 8 : 4.5);

      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * innerR, cy + Math.sin(ang) * innerR);
      ctx.lineTo(cx + Math.cos(ang) * outerR, cy + Math.sin(ang) * outerR);
      ctx.strokeStyle = isMajor
        ? 'rgba(247, 223, 176, 0.85)'
        : isMid
        ? 'rgba(248, 241, 231, 0.42)'
        : 'rgba(248, 241, 231, 0.18)';
      ctx.lineWidth = isMajor ? 2 : 1.2;
      ctx.stroke();

      if (isMajor) {
        const labelR = outerR + 15;
        ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = 'rgba(248, 241, 231, 0.72)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(v), cx + Math.cos(ang) * labelR, cy + Math.sin(ang) * labelR);
      }
    }

    // 4. Update Needle Positions
    const showNeedles = state.phase === 'revealing' || state.phase === 'discussion';
    if (showNeedles) {
      if (gaugeAnim.active) {
        const elapsed = now - gaugeAnim.startTime;
        const t = Math.min(1, Math.max(0, elapsed / gaugeAnim.duration));

        // Theatrical sweep: brief sweep across spectrum before locking smoothly with cubic-out!
        const theatricalNeedle = (target: number, phaseOffset: number): number => {
          if (t < 0.36) {
            const p = t / 0.36;
            const swing = 50 + Math.sin(p * Math.PI * 1.5 + phaseOffset) * 38;
            return swing;
          }
          const p2 = (t - 0.36) / 0.64;
          const eased = 1 - Math.pow(1 - p2, 3);
          const startPos = 50 + Math.sin(Math.PI * 1.5 + phaseOffset) * 38;
          return startPos + (target - startPos) * eased;
        };

        gaugeAnim.robertCurrent = theatricalNeedle(gaugeAnim.robertTarget, 0);
        gaugeAnim.ritaCurrent = theatricalNeedle(gaugeAnim.ritaTarget, Math.PI * 0.85);
      } else if (state.revealed) {
        gaugeAnim.robertCurrent = state.revealed.robert;
        gaugeAnim.ritaCurrent = state.revealed.rita;
      }

      const robAng = valueToAngle(gaugeAnim.robertCurrent);
      const ritaAng = valueToAngle(gaugeAnim.ritaCurrent);

      // Highlighted compatibility span arc between the two needles!
      const minAng = Math.min(robAng, ritaAng);
      const maxAng = Math.max(robAng, ritaAng);
      ctx.beginPath();
      ctx.arc(cx, cy, radius, minAng, maxAng);
      const spanGap = Math.abs(gaugeAnim.robertCurrent - gaugeAnim.ritaCurrent);
      ctx.strokeStyle =
        spanGap <= 5
          ? 'rgba(255, 232, 165, 0.95)'
          : spanGap <= 15
          ? 'rgba(232, 197, 133, 0.82)'
          : 'rgba(244, 143, 177, 0.55)';
      ctx.lineWidth = trackWidth + 2;
      ctx.stroke();

      // Draw each partner's needle + glowing callout medallion
      const drawPartnerNeedle = (
        angle: number,
        val: number,
        label: string,
        strokeHex: string,
        glowRgba: string,
        badgeOffsetRadius: number
      ) => {
        ctx.save();
        ctx.shadowColor = glowRgba;
        ctx.shadowBlur = 18;

        // Needle arm from center hub to track
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * 18, cy + Math.sin(angle) * 18);
        ctx.lineTo(cx + Math.cos(angle) * (radius + 6), cy + Math.sin(angle) * (radius + 6));
        ctx.strokeStyle = strokeHex;
        ctx.lineWidth = 3.5;
        ctx.stroke();

        // Glowing jewel on the track
        const jx = cx + Math.cos(angle) * radius;
        const jy = cy + Math.sin(angle) * radius;
        ctx.beginPath();
        ctx.arc(jx, jy, 8.5, 0, Math.PI * 2);
        ctx.fillStyle = '#fff9f0';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = strokeHex;
        ctx.stroke();

        // Floating readout pill inside/along needle
        const bx = cx + Math.cos(angle) * badgeOffsetRadius;
        const by = cy + Math.sin(angle) * badgeOffsetRadius;
        const text = `${label} ${Math.round(val)}`;
        ctx.font = '700 12.5px "Plus Jakarta Sans", sans-serif';
        const tw = ctx.measureText(text).width;
        const pw = tw + 18;
        const ph = 24;

        ctx.fillStyle = 'rgba(12, 7, 18, 0.92)';
        ctx.beginPath();
        ctx.roundRect(bx - pw / 2, by - ph / 2, pw, ph, 12);
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = strokeHex;
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.fillStyle = strokeHex;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, bx, by + 0.5);
        ctx.restore();
      };

      // Stagger pill radii slightly if needles are very close so both numbers stay 100% legible!
      const closeTogether = Math.abs(gaugeAnim.robertCurrent - gaugeAnim.ritaCurrent) < 14;
      const robBadgeR = closeTogether ? radius * 0.68 : radius * 0.64;
      const ritaBadgeR = closeTogether ? radius * 0.45 : radius * 0.64;

      drawPartnerNeedle(
        robAng,
        gaugeAnim.robertCurrent,
        'ROBERT',
        '#e8c585',
        'rgba(232, 197, 133, 0.7)',
        robBadgeR
      );
      drawPartnerNeedle(
        ritaAng,
        gaugeAnim.ritaCurrent,
        'RITA',
        '#f48fb1',
        'rgba(244, 143, 177, 0.7)',
        ritaBadgeR
      );
    } else {
      // Thinking phase: subtle breathing mystery aura at crown (50)
      const pulse = 0.5 + 0.5 * Math.sin(now * 0.0025);
      const midAng = valueToAngle(50);
      ctx.save();
      ctx.beginPath();
      ctx.arc(
        cx + Math.cos(midAng) * radius,
        cy + Math.sin(midAng) * radius,
        6 + pulse * 4,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = `rgba(232, 197, 133, ${0.25 + pulse * 0.35})`;
      ctx.fill();

      ctx.font = 'italic 500 16px "Playfair Display", Georgia, serif';
      ctx.fillStyle = 'rgba(248, 241, 231, 0.55)';
      ctx.textAlign = 'center';
      ctx.fillText('Phones Secretly Sliding 0 – 100', cx, cy - radius * 0.36);
      ctx.restore();
    }

    // Center Pivot Medallion
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.fillStyle = '#140b1c';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(232, 197, 133, 0.75)';
    ctx.stroke();

    ctx.restore();
  };

  const renderLoop = (now: number) => {
    if (destroyed) return;

    // 1. Ambient Bokeh & Celebration Embers
    const w = window.innerWidth || 1920;
    const h = window.innerHeight || 1080;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (ambientCanvas.width !== Math.round(w * dpr) || ambientCanvas.height !== Math.round(h * dpr)) {
      ambientCanvas.width = Math.round(w * dpr);
      ambientCanvas.height = Math.round(h * dpr);
    }

    const actx = ambientCanvas.getContext('2d');
    if (actx) {
      actx.save();
      actx.scale(dpr, dpr);
      actx.clearRect(0, 0, w, h);

      for (let i = embers.length - 1; i >= 0; i--) {
        const p = embers[i];
        p.life += 1;
        p.x += p.vx;
        p.y += p.vy;

        if (p.isBurst) {
          p.vy += 0.065; // gentle gravity on celebratory golden sparks
          p.vx *= 0.988;
          const ratio = 1 - p.life / p.maxLife;
          if (ratio <= 0) {
            embers.splice(i, 1);
            continue;
          }
          p.alpha = ratio;
        } else {
          // Ambient drifting bokeh
          p.x += Math.sin(now * 0.0008 + i) * 0.14;
          const wave = Math.sin((p.life / p.maxLife) * Math.PI);
          p.alpha = Math.max(0.05, p.maxAlpha * wave);
          if (p.y < -20 || p.life >= p.maxLife) {
            p.y = h + 15;
            p.x = Math.random() * w;
            p.life = 0;
          }
        }

        const grad = actx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 2.4);
        grad.addColorStop(0, `rgba(${p.color}, ${p.alpha})`);
        grad.addColorStop(1, `rgba(${p.color}, 0)`);
        actx.fillStyle = grad;
        actx.beginPath();
        actx.arc(p.x, p.y, p.radius * 2.4, 0, Math.PI * 2);
        actx.fill();
      }

      actx.restore();
    }

    // 2. Semicircular Gauge if visible
    if (gaugeCanvas) {
      drawSemicircularGauge(now);
    }

    rafId = requestAnimationFrame(renderLoop);
  };

  const onKeyDown = (ev: KeyboardEvent) => {
    if (ev.key === 'Escape') {
      cleanupAndExit();
    }
  };
  window.addEventListener('keydown', onKeyDown);

  const cleanupAndExit = () => {
    if (exited) return;
    exited = true;
    destroyed = true;

    window.removeEventListener('keydown', onKeyDown);
    if (revealTimerId !== null) {
      window.clearTimeout(revealTimerId);
      revealTimerId = null;
    }
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    VelvetAudio.stopActiveSwell();
    net.destroy();

    root.style.opacity = '0';
    window.setTimeout(() => {
      root.remove();
      options.onExitToArcade?.();
    }, 360);
  };

  renderStage();
  net.start();
  VelvetAudio.playRoomLaunchPad();
  void refreshQrCode();
  rafId = requestAnimationFrame(renderLoop);

  return cleanupAndExit;
}
