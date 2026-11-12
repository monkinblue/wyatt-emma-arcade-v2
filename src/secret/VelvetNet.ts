/**
 * VelvetNet.ts
 * ------------
 * Serverless WebRTC Jackbox-style networking layer built on PeerJS + Google STUN
 * (`stun:stun.l.google.com:19302` & `stun:stun1.l.google.com:19302`), plus a fallback
 * same-browser `BroadcastChannel` bridge so local multi-tab testing works instantaneously
 * even behind strict NATs while real phones connect globally over PeerJS WebRTC!
 */

import Peer, { DataConnection } from 'peerjs';
import QRCode from 'qrcode';
import {
  HostToPhoneMessage,
  PhoneToHostMessage,
  PlayerId,
  VelvetRoomState
} from './velvetTypes';

const ROOM_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excludes ambiguous 0/O/1/I
const PEER_PREFIX = 'dawson-velvet-';

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
];

export function generateVelvetRoomCode(length: number = 4): string {
  let code = '';
  const cryptoObj = typeof window !== 'undefined' ? window.crypto : undefined;
  if (cryptoObj && cryptoObj.getRandomValues) {
    const arr = new Uint32Array(length);
    cryptoObj.getRandomValues(arr);
    for (let i = 0; i < length; i++) {
      code += ROOM_CHARSET[arr[i] % ROOM_CHARSET.length];
    }
    return code;
  }
  for (let i = 0; i < length; i++) {
    code += ROOM_CHARSET[Math.floor(Math.random() * ROOM_CHARSET.length)];
  }
  return code;
}

export function getPeerIdForRoom(roomCode: string): string {
  return `${PEER_PREFIX}${roomCode.trim().toUpperCase()}`;
}

export function buildVelvetJoinUrl(roomCode: string, hostOverride?: string): string {
  const cleanCode = roomCode.trim().toUpperCase();
  if (typeof window === 'undefined') {
    return `https://learn-study.com/?velvet=${cleanCode}`;
  }

  if (hostOverride && hostOverride.trim().length > 0) {
    let raw = hostOverride.trim();
    if (!/^https?:\/\//i.test(raw)) {
      const proto = window.location.protocol || 'http:';
      raw = `${proto}//${raw}`;
    }
    try {
      const u = new URL(raw);
      u.pathname = window.location.pathname || '/';
      u.search = `?velvet=${cleanCode}`;
      return u.toString();
    } catch {
      // Fallback to default origin if malformed
    }
  }

  return `${window.location.origin}${window.location.pathname}?velvet=${cleanCode}`;
}

/**
 * Generates a high-contrast Champagne-on-Midnight QR code Data URL.
 */
export async function generateVelvetQrDataUrl(joinUrl: string): Promise<string> {
  return QRCode.toDataURL(joinUrl, {
    width: 340,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#f2d399', // Bright warm champagne gold (high contrast against obsidian)
      light: '#09060e' // Deep midnight obsidian
    }
  });
}

// ============================================================================
// TV HOST NETWORK CONTROLLER
// ============================================================================

interface ClientEndpoint {
  id: string;
  send: (msg: HostToPhoneMessage) => void;
  close: () => void;
}

export interface VelvetHostNetCallbacks {
  getState: () => VelvetRoomState;
  getLockedValueForPlayer: (player: PlayerId) => number | null;
  onPlayerPresenceChanged: (player: PlayerId, connected: boolean, isNewClaim: boolean) => void;
  onMessageFromPhone: (msg: PhoneToHostMessage, senderPlayer: PlayerId | null) => void;
  onBrokerStatusChange?: (status: 'connecting' | 'ready' | 'reconnecting' | 'error', detail?: string) => void;
}

export class VelvetHostNetwork {
  private roomCode: string;
  private peer: Peer | null = null;
  private bc: BroadcastChannel | null = null;
  private callbacks: VelvetHostNetCallbacks;
  private destroyed: boolean = false;

  private allEndpoints: Map<string, ClientEndpoint> = new Map();
  private playerEndpointId: Record<PlayerId, string | null> = {
    robert: null,
    rita: null
  };
  private endpointLastSeen: Map<string, number> = new Map();
  private reconnectTimer: number | null = null;

  constructor(roomCode: string, callbacks: VelvetHostNetCallbacks) {
    this.roomCode = roomCode.trim().toUpperCase();
    this.callbacks = callbacks;
  }

  public getRoomCode(): string {
    return this.roomCode;
  }

  public start(): void {
    this.setupBroadcastChannel();
    this.initPeer();
  }

  private setupBroadcastChannel(): void {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return;
    try {
      this.bc = new BroadcastChannel(`velvet_bc_${this.roomCode}`);
      this.bc.onmessage = (ev: MessageEvent) => {
        if (this.destroyed || !ev.data) return;
        const packet = ev.data as {
          dir?: string;
          clientId?: string;
          payload?: PhoneToHostMessage;
        };
        if (packet.dir !== 'phone_to_host' || !packet.clientId || !packet.payload) return;

        const epId = `bc:${packet.clientId}`;
        if (!this.allEndpoints.has(epId)) {
          this.allEndpoints.set(epId, {
            id: epId,
            send: (msg: HostToPhoneMessage) => {
              this.bc?.postMessage({
                dir: 'host_to_phone',
                targetClientId: packet.clientId,
                payload: msg
              });
            },
            close: () => {
              // No-op for broadcast channel virtual endpoint
            }
          });
        }
        this.endpointLastSeen.set(epId, Date.now());
        this.handleIncomingPayload(epId, packet.payload);
      };
    } catch {
      // Ignore BroadcastChannel errors
    }
  }

  private initPeer(): void {
    if (this.destroyed) return;
    this.callbacks.onBrokerStatusChange?.('connecting');

    try {
      const peer = new Peer(getPeerIdForRoom(this.roomCode), {
        config: {
          iceServers: ICE_SERVERS
        }
      });
      this.peer = peer;

      peer.on('open', () => {
        if (this.destroyed) return;
        this.callbacks.onBrokerStatusChange?.('ready');
      });

      peer.on('connection', (conn: DataConnection) => {
        if (this.destroyed) {
          conn.close();
          return;
        }
        this.registerPeerConnection(conn);
      });

      peer.on('disconnected', () => {
        if (this.destroyed) return;
        this.callbacks.onBrokerStatusChange?.('reconnecting');
        if (this.reconnectTimer === null) {
          this.reconnectTimer = window.setTimeout(() => {
            this.reconnectTimer = null;
            if (!this.destroyed && this.peer && !this.peer.destroyed) {
              try {
                this.peer.reconnect();
              } catch {
                // ignore
              }
            }
          }, 1500);
        }
      });

      peer.on('error', (err: Error & { type?: string }) => {
        if (this.destroyed) return;
        if (err.type === 'unavailable-id') {
          // Extremely rare 4-letter collision on public PeerJS broker: rotate code cleanly
          this.roomCode = generateVelvetRoomCode(4);
          try {
            peer.destroy();
          } catch {
            // ignore
          }
          this.setupBroadcastChannel();
          this.initPeer();
          return;
        }
        this.callbacks.onBrokerStatusChange?.('error', err.message);
      });
    } catch (e) {
      this.callbacks.onBrokerStatusChange?.(
        'error',
        e instanceof Error ? e.message : 'WebRTC initialization error'
      );
    }
  }

  private registerPeerConnection(conn: DataConnection): void {
    const epId = `rtc:${conn.connectionId || Math.random().toString(36).slice(2)}`;

    const endpoint: ClientEndpoint = {
      id: epId,
      send: (msg: HostToPhoneMessage) => {
        if (conn.open) {
          try {
            conn.send(msg);
          } catch {
            // ignore transient send error
          }
        }
      },
      close: () => {
        try {
          conn.close();
        } catch {
          // ignore
        }
      }
    };

    conn.on('open', () => {
      if (this.destroyed) return;
      this.allEndpoints.set(epId, endpoint);
      this.endpointLastSeen.set(epId, Date.now());
      // Immediately send authoritative room state so the phone sees who is claimed
      endpoint.send({ type: 'ROOM_STATE', state: this.callbacks.getState() });
    });

    conn.on('data', (raw: unknown) => {
      if (this.destroyed || !raw || typeof raw !== 'object') return;
      this.allEndpoints.set(epId, endpoint);
      this.endpointLastSeen.set(epId, Date.now());
      this.handleIncomingPayload(epId, raw as PhoneToHostMessage);
    });

    const handleDisconnect = () => {
      this.allEndpoints.delete(epId);
      this.endpointLastSeen.delete(epId);

      (['robert', 'rita'] as PlayerId[]).forEach((p) => {
        if (this.playerEndpointId[p] === epId) {
          this.playerEndpointId[p] = null;
          this.callbacks.onPlayerPresenceChanged(p, false, false);
        }
      });
      this.broadcastState();
    };

    conn.on('close', handleDisconnect);
    conn.on('error', handleDisconnect);
  }

  private getClaimedPlayerByEndpoint(epId: string): PlayerId | null {
    if (this.playerEndpointId.robert === epId) return 'robert';
    if (this.playerEndpointId.rita === epId) return 'rita';
    return null;
  }

  private handleIncomingPayload(epId: string, msg: PhoneToHostMessage): void {
    const endpoint = this.allEndpoints.get(epId);
    if (!endpoint) return;

    if (msg.type === 'PING') {
      endpoint.send({ type: 'PONG', ts: msg.ts });
      return;
    }

    if (msg.type === 'HELLO') {
      endpoint.send({ type: 'ROOM_STATE', state: this.callbacks.getState() });
      return;
    }

    if (msg.type === 'CLAIM_PLAYER') {
      const target = msg.player;
      if (target !== 'robert' && target !== 'rita') return;

      const currentOwnerEp = this.playerEndpointId[target];
      const isAlreadyOccupiedByOther =
        currentOwnerEp !== null &&
        currentOwnerEp !== epId &&
        this.allEndpoints.has(currentOwnerEp);

      // Allow seamless wake-up / sleep-recovery reclaim (`forceReclaim`) OR normal claim if unoccupied!
      if (isAlreadyOccupiedByOther && !msg.forceReclaim) {
        endpoint.send({
          type: 'CLAIM_RESULT',
          success: false,
          player: target,
          reason: `${target === 'robert' ? 'Robert' : 'Rita'} is already connected on another phone.`
        });
        endpoint.send({ type: 'ROOM_STATE', state: this.callbacks.getState() });
        return;
      }

      // If this endpoint previously held the OTHER identity, release it first
      const other: PlayerId = target === 'robert' ? 'rita' : 'robert';
      if (this.playerEndpointId[other] === epId) {
        this.playerEndpointId[other] = null;
        this.callbacks.onPlayerPresenceChanged(other, false, false);
      }

      // If superseding a stale half-open socket on sleep recovery, close the old socket cleanly
      const wasPreviouslyDisconnected = currentOwnerEp === null;
      if (currentOwnerEp && currentOwnerEp !== epId) {
        const staleEp = this.allEndpoints.get(currentOwnerEp);
        this.allEndpoints.delete(currentOwnerEp);
        staleEp?.close();
      }

      this.playerEndpointId[target] = epId;
      this.callbacks.onPlayerPresenceChanged(target, true, wasPreviouslyDisconnected);

      endpoint.send({
        type: 'CLAIM_RESULT',
        success: true,
        player: target,
        lockedValue: this.callbacks.getLockedValueForPlayer(target)
      });
      this.broadcastState();
      return;
    }

    if (msg.type === 'RELEASE_PLAYER') {
      const target = msg.player;
      if (this.playerEndpointId[target] === epId) {
        this.playerEndpointId[target] = null;
        this.callbacks.onPlayerPresenceChanged(target, false, false);
        this.broadcastState();
      }
      return;
    }

    const sender = this.getClaimedPlayerByEndpoint(epId);
    this.callbacks.onMessageFromPhone(msg, sender);
  }

  public broadcastState(): void {
    const state = this.callbacks.getState();
    const packet: HostToPhoneMessage = { type: 'ROOM_STATE', state };
    this.allEndpoints.forEach((ep) => {
      ep.send(packet);
    });
  }

  public destroy(): void {
    this.destroyed = true;
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.allEndpoints.forEach((ep) => ep.close());
    this.allEndpoints.clear();
    if (this.bc) {
      try {
        this.bc.close();
      } catch {
        // ignore
      }
      this.bc = null;
    }
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {
        // ignore
      }
      this.peer = null;
    }
  }
}

// ============================================================================
// PHONE CLIENT NETWORK CONTROLLER (WITH WAKE-LOCK & AUTO-RESYNC)
// ============================================================================

export type PhoneConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'offline';

export interface VelvetPhoneNetCallbacks {
  onStatusChange: (status: PhoneConnectionStatus) => void;
  onRoomState: (state: VelvetRoomState) => void;
  onClaimResult: (
    success: boolean,
    player: PlayerId,
    reason?: string,
    lockedValue?: number | null
  ) => void;
}

interface WakeLockSentinelLike {
  released?: boolean;
  release: () => Promise<void>;
}

export class VelvetPhoneNetwork {
  private roomCode: string;
  private callbacks: VelvetPhoneNetCallbacks;
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private bc: BroadcastChannel | null = null;
  private bcConnected: boolean = false;
  private clientId: string;
  private destroyed: boolean = false;

  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private lastPongAt: number = 0;
  private wakeLock: WakeLockSentinelLike | null = null;

  private readonly sessionKey: string;

  constructor(roomCode: string, callbacks: VelvetPhoneNetCallbacks) {
    this.roomCode = roomCode.trim().toUpperCase();
    this.callbacks = callbacks;
    this.sessionKey = `velvet_claimed_player_${this.roomCode}`;
    this.clientId = `ph_${Math.random().toString(36).slice(2, 10)}`;
  }

  public getSavedIdentity(): PlayerId | null {
    if (typeof window === 'undefined') return null;
    try {
      const val = window.sessionStorage.getItem(this.sessionKey);
      if (val === 'robert' || val === 'rita') return val;
    } catch {
      // ignore
    }
    return null;
  }

  public saveIdentity(player: PlayerId | null): void {
    if (typeof window === 'undefined') return;
    try {
      if (player) {
        window.sessionStorage.setItem(this.sessionKey, player);
      } else {
        window.sessionStorage.removeItem(this.sessionKey);
      }
    } catch {
      // ignore
    }
  }

  /**
   * Requests screen WakeLock on user tap and re-acquires it automatically on visibilitychange.
   */
  public async requestWakeLock(): Promise<void> {
    if (typeof navigator === 'undefined') return;
    const navWithWake = navigator as Navigator & {
      wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
    };
    if (!navWithWake.wakeLock) return;
    try {
      if (this.wakeLock && !this.wakeLock.released) return;
      this.wakeLock = await navWithWake.wakeLock.request('screen');
    } catch {
      // Ignore if battery saver or OS policy declines WakeLock
    }
  }

  public start(): void {
    this.callbacks.onStatusChange('connecting');
    this.setupBroadcastFallback();
    this.connectWebRTC();
    this.installLifecycleListeners();
    this.startHeartbeat();
  }

  private setupBroadcastFallback(): void {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return;
    try {
      this.bc = new BroadcastChannel(`velvet_bc_${this.roomCode}`);
      this.bc.onmessage = (ev: MessageEvent) => {
        if (this.destroyed || !ev.data) return;
        const packet = ev.data as {
          dir?: string;
          targetClientId?: string;
          payload?: HostToPhoneMessage;
        };
        if (packet.dir !== 'host_to_phone') return;
        if (packet.targetClientId && packet.targetClientId !== this.clientId) return;
        if (!packet.payload) return;

        this.lastPongAt = Date.now();
        if (!this.bcConnected && (!this.conn || !this.conn.open)) {
          this.bcConnected = true;
          this.callbacks.onStatusChange('connected');
          this.autoReclaimIfSaved();
        }
        this.handleHostMessage(packet.payload);
      };

      // Probe immediately in case TV Host is open in another local browser tab!
      this.bc.postMessage({
        dir: 'phone_to_host',
        clientId: this.clientId,
        payload: { type: 'HELLO' } satisfies PhoneToHostMessage
      });
    } catch {
      // ignore
    }
  }

  private connectWebRTC(): void {
    if (this.destroyed) return;

    this.cleanupPeerOnly();

    try {
      const peer = new Peer({
        config: {
          iceServers: ICE_SERVERS
        }
      });
      this.peer = peer;

      peer.on('open', () => {
        if (this.destroyed) return;
        const conn = peer.connect(getPeerIdForRoom(this.roomCode), {
          reliable: true
        });
        this.conn = conn;

        conn.on('open', () => {
          if (this.destroyed) return;
          this.lastPongAt = Date.now();
          this.callbacks.onStatusChange('connected');
          this.send({ type: 'HELLO' });
          this.autoReclaimIfSaved();
        });

        conn.on('data', (raw: unknown) => {
          if (this.destroyed || !raw || typeof raw !== 'object') return;
          this.lastPongAt = Date.now();
          this.handleHostMessage(raw as HostToPhoneMessage);
        });

        conn.on('close', () => {
          if (this.destroyed) return;
          if (!this.bcConnected) {
            this.callbacks.onStatusChange('reconnecting');
          }
          this.scheduleReconnect(1100);
        });

        conn.on('error', () => {
          if (this.destroyed) return;
          if (!this.bcConnected) {
            this.callbacks.onStatusChange('reconnecting');
          }
          this.scheduleReconnect(1400);
        });
      });

      peer.on('error', () => {
        if (this.destroyed) return;
        if (!this.bcConnected) {
          this.callbacks.onStatusChange('reconnecting');
        }
        this.scheduleReconnect(1800);
      });

      peer.on('disconnected', () => {
        if (this.destroyed) return;
        try {
          peer.reconnect();
        } catch {
          this.scheduleReconnect(1500);
        }
      });
    } catch {
      this.scheduleReconnect(2000);
    }
  }

  private autoReclaimIfSaved(): void {
    const saved = this.getSavedIdentity();
    if (saved) {
      this.send({
        type: 'CLAIM_PLAYER',
        player: saved,
        forceReclaim: true
      });
    }
  }

  private handleHostMessage(msg: HostToPhoneMessage): void {
    if (msg.type === 'PONG') {
      return;
    }
    if (msg.type === 'CLAIM_RESULT') {
      if (msg.success) {
        this.saveIdentity(msg.player);
      }
      this.callbacks.onClaimResult(msg.success, msg.player, msg.reason, msg.lockedValue);
      return;
    }
    if (msg.type === 'ROOM_STATE') {
      this.callbacks.onRoomState(msg.state);
    }
  }

  public send(msg: PhoneToHostMessage): void {
    let sentRtc = false;
    if (this.conn && this.conn.open) {
      try {
        this.conn.send(msg);
        sentRtc = true;
      } catch {
        // fallback below
      }
    }
    if (!sentRtc && this.bc) {
      try {
        this.bc.postMessage({
          dir: 'phone_to_host',
          clientId: this.clientId,
          payload: msg
        });
      } catch {
        // ignore
      }
    }
  }

  public claimIdentity(player: PlayerId, forceReclaim: boolean = false): void {
    void this.requestWakeLock();
    this.send({
      type: 'CLAIM_PLAYER',
      player,
      forceReclaim
    });
  }

  public releaseIdentity(): void {
    const saved = this.getSavedIdentity();
    this.saveIdentity(null);
    if (saved) {
      this.send({ type: 'RELEASE_PLAYER', player: saved });
    }
  }

  private scheduleReconnect(delayMs: number): void {
    if (this.destroyed || this.reconnectTimer !== null) return;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.destroyed) {
        this.connectWebRTC();
        this.bc?.postMessage({
          dir: 'phone_to_host',
          clientId: this.clientId,
          payload: { type: 'HELLO' } satisfies PhoneToHostMessage
        });
      }
    }, delayMs);
  }

  private startHeartbeat(): void {
    if (typeof window === 'undefined') return;
    this.heartbeatTimer = window.setInterval(() => {
      if (this.destroyed) return;
      const isRtcOpen = Boolean(this.conn && this.conn.open);
      if (isRtcOpen || this.bcConnected) {
        this.send({ type: 'PING', ts: Date.now() });
        // If no PONG/message for >8.5s after sleep, force fresh reconnect
        if (this.lastPongAt > 0 && Date.now() - this.lastPongAt > 8500) {
          this.bcConnected = false;
          this.callbacks.onStatusChange('reconnecting');
          this.connectWebRTC();
        }
      }
    }, 3000);
  }

  private onVisibilityChange = (): void => {
    if (this.destroyed) return;
    if (document.visibilityState === 'visible') {
      void this.requestWakeLock();
      const stale = !this.conn || !this.conn.open || Date.now() - this.lastPongAt > 4500;
      if (stale) {
        this.callbacks.onStatusChange('reconnecting');
        this.connectWebRTC();
      } else {
        this.send({ type: 'HELLO' });
        this.autoReclaimIfSaved();
      }
      this.bc?.postMessage({
        dir: 'phone_to_host',
        clientId: this.clientId,
        payload: { type: 'HELLO' } satisfies PhoneToHostMessage
      });
    }
  };

  private onOnline = (): void => {
    if (this.destroyed) return;
    this.callbacks.onStatusChange('reconnecting');
    this.connectWebRTC();
  };

  private installLifecycleListeners(): void {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.onVisibilityChange);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.onOnline);
    }
  }

  private cleanupPeerOnly(): void {
    if (this.conn) {
      try {
        this.conn.close();
      } catch {
        // ignore
      }
      this.conn = null;
    }
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {
        // ignore
      }
      this.peer = null;
    }
  }

  public destroy(): void {
    this.destroyed = true;
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
    }
    if (this.heartbeatTimer !== null) {
      window.clearInterval(this.heartbeatTimer);
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.onOnline);
    }
    if (this.wakeLock) {
      this.wakeLock.release().catch(() => {});
      this.wakeLock = null;
    }
    if (this.bc) {
      try {
        this.bc.close();
      } catch {
        // ignore
      }
      this.bc = null;
    }
    this.cleanupPeerOnly();
  }
}
