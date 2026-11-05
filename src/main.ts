/**
 * main.ts
 * -------
 * Entry point for Wyatt & Emma Arcade v2.0.
 * Locks the Phaser 2D WebGL/Canvas stage to a crisp 1280x720 landscape tablet viewport
 * using `Phaser.Scale.FIT` + `Phaser.Scale.CENTER_BOTH`.
 */

import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { HubScene } from './scenes/HubScene';
import { StoryEngineScene } from './scenes/StoryEngineScene';
import { ArtStudioScene } from './scenes/ArtStudioScene';
import { MelodyMakerScene } from './scenes/MelodyMakerScene';
import { TinkerWorkshopScene } from './scenes/TinkerWorkshopScene';
import { BalloonPopScene } from './scenes/BalloonPopScene';
import { MemoryMatchScene } from './scenes/MemoryMatchScene';
import { ShutTheBoxScene } from './scenes/ShutTheBoxScene';
import { CloudKartScene } from './scenes/CloudKartScene';
import { RocketBlastScene } from './scenes/RocketBlastScene';
import { UnicornCastleScene } from './scenes/UnicornCastleScene';
import { ColoradoStoryScene } from './scenes/ColoradoStoryScene';
import { ISpyScene } from './scenes/ISpyScene';
import { TrainTableScene } from './scenes/TrainTableScene';
import { AudioBus } from './core/AudioBus';
import { PWAInstallManager } from './core/PWAInstallManager';

// Capture `beforeinstallprompt` and monitor offline PWA Service Worker readiness immediately
PWAInstallManager.init();

// In DEV mode, immediately unregister any stale Service Workers and purge old Workbox caches
// so localhost never serves cached old artwork or 404s for newly staged sprites/audio!
if (import.meta.env.DEV && typeof window !== 'undefined') {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => {
        for (const reg of registrations) {
          void reg.unregister();
        }
      })
      .catch(() => {});
  }
  if ('caches' in window) {
    caches
      .keys()
      .then((keys) => {
        for (const key of keys) {
          void caches.delete(key);
        }
      })
      .catch(() => {});
  }
}

// Install global first-tap audio unlocker for Howler.js + WebAudio
AudioBus.installUnlockListeners();

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  width: 1280,
  height: 720,
  backgroundColor: '#0f0c24',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720
  },
  input: {
    activePointers: 3
  },
  render: {
    antialias: false,
    pixelArt: true,
    roundPixels: true
  },
  scene: [
    BootScene,
    HubScene,
    StoryEngineScene,
    ArtStudioScene,
    MelodyMakerScene,
    TinkerWorkshopScene,
    BalloonPopScene,
    MemoryMatchScene,
    ShutTheBoxScene,
    CloudKartScene,
    RocketBlastScene,
    UnicornCastleScene,
    ColoradoStoryScene,
    ISpyScene,
    TrainTableScene
  ]
};

export const game = new Phaser.Game(config);
