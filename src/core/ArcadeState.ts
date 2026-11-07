/**
 * ArcadeState.ts
 * --------------
 * Central state manager for Wyatt & Emma Arcade v2.0.
 * Tracks the currently active kid profile ('wyatt' | 'emma'), active Hub category tab,
 * collected stars, discovered story hotspots, and persists everything safely in localStorage.
 */

export type KidId = 'wyatt' | 'emma';
export type HubTabId = 'read' | 'play' | 'create' | 'tv';
export type StoryMode = 'read-to-me' | 'let-me-play';

export interface KidProfile {
  id: KidId;
  name: string;
  age: number;
  companionName: string;
  companionTitle: string;
  primaryColor: number;
  primaryHex: string;
  accentColor: number;
  accentHex: string;
  stars: number;
}

export interface SaveState {
  activeKid: KidId;
  activeTab: HubTabId;
  storyMode: StoryMode;
  starsByKid: Record<KidId, number>;
  discoveredHotspots: string[];
  pagesCompleted: number;
}

const STORAGE_KEY = 'wyatt_emma_arcade_v2_save';

export const KID_PROFILES: Record<KidId, KidProfile> = {
  wyatt: {
    id: 'wyatt',
    name: 'Wyatt',
    age: 4,
    companionName: 'Sparky',
    companionTitle: 'Sparky the Cloud Dragon',
    primaryColor: 0x10b981, // Emerald Green
    primaryHex: '#10b981',
    accentColor: 0xfbbf24,  // Golden Sun
    accentHex: '#fbbf24',
    stars: 12
  },
  emma: {
    id: 'emma',
    name: 'Emma',
    age: 3,
    companionName: 'Doggie',
    companionTitle: 'Doggie the Fluffy Pup',
    primaryColor: 0xf472b6, // Warm Berry Pink
    primaryHex: '#f472b6',
    accentColor: 0x38bdf8,  // Sky Blue
    accentHex: '#38bdf8',
    stars: 12
  }
};

type StateListener = (state: SaveState) => void;

class ArcadeStateManager {
  private state: SaveState;
  private listeners: Set<StateListener> = new Set();

  constructor() {
    this.state = this.loadState();
  }

  private getDefaultState(): SaveState {
    return {
      activeKid: 'wyatt',
      activeTab: 'read',
      storyMode: 'let-me-play',
      starsByKid: {
        wyatt: 15,
        emma: 15
      },
      discoveredHotspots: [],
      pagesCompleted: 0
    };
  }

  private loadState(): SaveState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return this.getDefaultState();
      const parsed = JSON.parse(raw) as Partial<SaveState>;
      const defaults = this.getDefaultState();
      return {
        activeKid: parsed.activeKid === 'emma' ? 'emma' : 'wyatt',
        activeTab:
          parsed.activeTab === 'play' ||
          parsed.activeTab === 'create' ||
          parsed.activeTab === 'tv'
            ? parsed.activeTab
            : 'read',
        storyMode: parsed.storyMode === 'read-to-me' ? 'read-to-me' : 'let-me-play',
        starsByKid: {
          wyatt: typeof parsed.starsByKid?.wyatt === 'number' ? parsed.starsByKid.wyatt : defaults.starsByKid.wyatt,
          emma: typeof parsed.starsByKid?.emma === 'number' ? parsed.starsByKid.emma : defaults.starsByKid.emma
        },
        discoveredHotspots: Array.isArray(parsed.discoveredHotspots) ? parsed.discoveredHotspots : [],
        pagesCompleted: typeof parsed.pagesCompleted === 'number' ? parsed.pagesCompleted : 0
      };
    } catch {
      return this.getDefaultState();
    }
  }

  private saveState(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // Ignore storage quota errors in private browsing
    }
    this.listeners.forEach((fn) => fn(this.state));
  }

  public getState(): SaveState {
    return this.state;
  }

  public getActiveKid(): KidProfile {
    const profile = KID_PROFILES[this.state.activeKid];
    return {
      ...profile,
      stars: this.state.starsByKid[this.state.activeKid]
    };
  }

  public setActiveKid(kid: KidId): void {
    if (this.state.activeKid === kid) return;
    this.state.activeKid = kid;
    this.saveState();
  }

  public getActiveTab(): HubTabId {
    return this.state.activeTab;
  }

  public setActiveTab(tab: HubTabId): void {
    if (this.state.activeTab === tab) return;
    this.state.activeTab = tab;
    this.saveState();
  }

  public getStoryMode(): StoryMode {
    return this.state.storyMode;
  }

  public setStoryMode(mode: StoryMode): void {
    this.state.storyMode = mode;
    this.saveState();
  }

  public addStars(amount: number = 1, kid?: KidId): number {
    const targetKid = kid ?? this.state.activeKid;
    this.state.starsByKid[targetKid] = (this.state.starsByKid[targetKid] || 0) + amount;
    this.saveState();
    return this.state.starsByKid[targetKid];
  }

  public markHotspotDiscovered(hotspotKey: string): boolean {
    if (!this.state.discoveredHotspots.includes(hotspotKey)) {
      this.state.discoveredHotspots.push(hotspotKey);
      this.addStars(1);
      return true;
    }
    return false;
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const ArcadeState = new ArcadeStateManager();
