/**
 * main.ts
 * -------
 * Entry point for Wyatt & Emma Arcade v2.0.
 *
 * Fast-Path Route:
 * - If `?velvet=<ROOM_CODE>` is present, skips Phaser & Heirloom boot splash completely,
 *   unlocks mobile touch responsiveness, and lazy-loads `VelvetPhoneController` inside `#app`.
 * - Otherwise boots the normal 1280x720 Phaser Heirloom Arcade with zero secret modules loaded.
 */

const velvetRoomParam =
  typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('velvet')
    : null;

if (velvetRoomParam && velvetRoomParam.trim().length > 0) {
  const splash = document.getElementById('heirloom-boot-splash');
  if (splash) {
    splash.remove();
  }
  document.documentElement.classList.add('velvet-direct-boot');
  document.documentElement.style.touchAction = 'manipulation';
  document.body.style.touchAction = 'manipulation';
  document.body.style.background = '#09060e';

  void import('./secret/VelvetPhoneController').then(({ mountVelvetPhoneController }) => {
    mountVelvetPhoneController(velvetRoomParam);
  });
} else {
  void import('./arcadeBoot').then(({ bootHeirloomArcade }) => {
    bootHeirloomArcade();
  });
}

export {};
