/**
 * src/core/PWAInstallManager.ts
 * -----------------------------
 * Mentor Note: Singleton PWA Installation & Offline Service Worker Cache Manager.
 *
 * What it does:
 * 1. Captures the browser's `beforeinstallprompt` event as early as possible so Android/Chrome
 *    tablets can trigger a native one-tap "Install App" dialog directly from a Phaser button.
 * 2. Detects whether the app is already running as an installed home-screen app (`standalone`
 *    or `fullscreen` display mode, or iOS `navigator.standalone`).
 * 3. Detects iPadOS / iOS Safari (`iPad|iPhone|iPod` or desktop-class iPad `MacIntel` with
 *    `navigator.maxTouchPoints > 1`) where installation uses Safari's Share -> Add to Home Screen.
 * 4. Tracks Workbox Service Worker activation (`navigator.serviceWorker.ready`) so the Hub can
 *    display live confirmation when 100% of images and audio are cached for Airplane Mode.
 */

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

type PWAListener = () => void;

class PWAInstallManagerImpl {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private installedStandalone = false;
  private offlineCacheReady = false;
  private listeners: Set<PWAListener> = new Set();
  private initialized = false;

  public init(): void {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;

    this.installedStandalone = this.checkStandaloneMode();

    // Listen for display-mode changes (e.g., immediately after installing)
    if (typeof window.matchMedia === 'function') {
      const standaloneMq = window.matchMedia('(display-mode: standalone)');
      const fullscreenMq = window.matchMedia('(display-mode: fullscreen)');
      const onChange = () => {
        this.installedStandalone = this.checkStandaloneMode();
        this.notify();
      };
      standaloneMq.addEventListener?.('change', onChange);
      fullscreenMq.addEventListener?.('change', onChange);
    }

    // Capture Android / Chrome WebAPK install prompt
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      this.notify();
    });

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.installedStandalone = true;
      this.notify();
    });

    // Track Service Worker readiness & offline cache completion
    this.monitorServiceWorkerCache();
  }

  private checkStandaloneMode(): boolean {
    if (typeof window === 'undefined') return false;
    const isStandaloneMq =
      typeof window.matchMedia === 'function' &&
      (window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: fullscreen)').matches);
    const isIOSStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    return isStandaloneMq || isIOSStandalone;
  }

  private monitorServiceWorkerCache(): void {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    // In DEV mode on localhost, Service Worker is unregistered intentionally;
    // in production (`learn-study.com`), `navigator.serviceWorker.ready` resolves once
    // Workbox finishes pre-caching the full asset + audio manifest.
    navigator.serviceWorker.ready
      .then((registration) => {
        if (registration.active) {
          this.offlineCacheReady = true;
          this.notify();
        }
      })
      .catch(() => {});

    navigator.serviceWorker.addEventListener?.('controllerchange', () => {
      this.offlineCacheReady = true;
      this.notify();
    });

    if (typeof caches !== 'undefined') {
      caches
        .keys()
        .then((keys) => {
          if (keys.some((k) => k.includes('workbox-precache'))) {
            this.offlineCacheReady = true;
            this.notify();
          }
        })
        .catch(() => {});
    }
  }

  /**
   * True when running from the tablet's Home Screen in standalone/fullscreen mode.
   */
  public isInstalledStandalone(): boolean {
    this.installedStandalone = this.checkStandaloneMode();
    return this.installedStandalone;
  }

  /**
   * True when the browser has provided a one-tap native install prompt (Android Chrome / Edge).
   */
  public canPromptNativeInstall(): boolean {
    return this.deferredPrompt !== null;
  }

  /**
   * True on iPadOS or iOS (including iPadOS 13+ reporting `MacIntel` with multi-touch).
   */
  public isIOSOrIPadOS(): boolean {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    const isIOSUA = /iPad|iPhone|iPod/i.test(ua);
    const isIPadOS =
      navigator.platform === 'MacIntel' && typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 1;
    return isIOSUA || isIPadOS;
  }

  /**
   * True once Workbox has activated and cached the offline assets on the device.
   */
  public isOfflineReady(): boolean {
    return this.offlineCacheReady;
  }

  /**
   * Triggers the native Android / Chrome "Add to Home Screen / Install App" prompt if available.
   * Resolves to `'accepted'`, `'dismissed'`, or `'unavailable'`.
   */
  public async triggerNativeInstallPrompt(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    if (!this.deferredPrompt) {
      return 'unavailable';
    }
    try {
      const promptEvent = this.deferredPrompt;
      this.deferredPrompt = null;
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === 'accepted') {
        this.installedStandalone = true;
      }
      this.notify();
      return choice.outcome;
    } catch {
      this.notify();
      return 'unavailable';
    }
  }

  public subscribe(listener: PWAListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export const PWAInstallManager = new PWAInstallManagerImpl();
