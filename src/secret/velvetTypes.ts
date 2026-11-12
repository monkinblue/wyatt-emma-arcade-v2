/**
 * velvetTypes.ts
 * --------------
 * Shared TypeScript types and wire protocol definitions for "After Hours: Wavelength"
 * (Robert & Rita's hidden TV + dual-phone compatibility lounge).
 */

export type PlayerId = 'robert' | 'rita';

export type QuestionTier = 'romantic' | 'spicy' | 'nsfw';

export type RoundMode = 'shared' | 'spotlight';

export type HeatProgressionMode = 'progressive' | 'shuffle';

export type GameLengthOption = 10 | 20 | 'endless';

export type VelvetPhase = 'lobby' | 'round_active' | 'revealing' | 'discussion' | 'summary';

export interface VelvetQuestion {
  id: string;
  tier: QuestionTier;
  prompt: string;
  leftLabel: string;
  rightLabel: string;
  allowSpotlight: boolean;
}

export interface LobbySettings {
  tiers: {
    romantic: boolean;
    spicy: boolean;
    nsfw: boolean;
  };
  heatMode: HeatProgressionMode;
  gameLength: GameLengthOption;
}

export interface RoundRecord {
  roundNumber: number;
  question: VelvetQuestion;
  mode: RoundMode;
  spotlightTarget: PlayerId | null;
  robertValue: number;
  ritaValue: number;
  gap: number;
  roundSync: number;
  predictorBonus: {
    predictor: PlayerId;
    accuracy: number;
    wonBonus: boolean;
  } | null;
}

export interface RevealedRoundData {
  robert: number;
  rita: number;
  gap: number;
  roundSync: number;
  verdictKey: 'bullseye' | 'sync' | 'intriguing' | 'wild';
  verdictBanner: string;
  discussionSubPrompt: string;
  predictorBonusText: string | null;
}

export interface SpotlightScoreState {
  /** Cumulative accuracy points earned by Robert when predicting Rita */
  robertPoints: number;
  /** Number of spotlight rounds where Robert predicted Rita */
  robertPredictions: number;
  /** Cumulative accuracy points earned by Rita when predicting Robert */
  ritaPoints: number;
  /** Number of spotlight rounds where Rita predicted Robert */
  ritaPredictions: number;
}

export interface SummaryReportData {
  overallCompatibility: number;
  totalRoundsPlayed: number;
  closestMoment: RoundRecord | null;
  biggestPlotTwist: RoundRecord | null;
  spotlightWinner: 'robert' | 'rita' | 'tie' | 'none';
  robertAvgPrediction: number | null;
  ritaAvgPrediction: number | null;
  bullseyeCount: number;
  history: RoundRecord[];
}

export interface VelvetRoomState {
  roomCode: string;
  phase: VelvetPhase;
  connected: {
    robert: boolean;
    rita: boolean;
  };
  settings: LobbySettings;
  roundNumber: number;
  totalPlannedRounds: number | null;
  currentQuestion: VelvetQuestion | null;
  roundMode: RoundMode;
  spotlightTarget: PlayerId | null;
  lockedIn: {
    robert: boolean;
    rita: boolean;
  };
  revealed: RevealedRoundData | null;
  overallCompatibility: number | null;
  completedRoundsCount: number;
  spotlightScore: SpotlightScoreState;
  summary: SummaryReportData | null;
}

export type PhoneToHostMessage =
  | { type: 'HELLO' }
  | { type: 'CLAIM_PLAYER'; player: PlayerId; forceReclaim?: boolean }
  | { type: 'RELEASE_PLAYER'; player: PlayerId }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<LobbySettings> }
  | { type: 'START_GAME' }
  | { type: 'LOCK_ANSWER'; player: PlayerId; value: number }
  | { type: 'UNLOCK_ANSWER'; player: PlayerId }
  | { type: 'NEXT_QUESTION' }
  | { type: 'REDRAW_QUESTION' }
  | { type: 'FINISH_GAME' }
  | { type: 'PLAY_AGAIN' }
  | { type: 'PING'; ts: number };

export type HostToPhoneMessage =
  | { type: 'ROOM_STATE'; state: VelvetRoomState }
  | {
      type: 'CLAIM_RESULT';
      success: boolean;
      player: PlayerId;
      reason?: string;
      lockedValue?: number | null;
    }
  | { type: 'PONG'; ts: number };
