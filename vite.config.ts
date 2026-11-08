import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'apple-touch-icon.png',
        'pwa-192x192.png',
        'pwa-512x512.png'
      ],
      manifest: {
        name: "Wyatt & Emma's Heirloom Arcade",
        short_name: 'Wyatt & Emma',
        description: 'Nintendo-polished 2D tablet stories and arcade games for Wyatt & Emma!',
        theme_color: '#120c08',
        background_color: '#120c08',
        display: 'fullscreen',
        display_override: ['fullscreen', 'standalone'],
        orientation: 'landscape',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,jpg,jpeg,svg,webp,json,woff,woff2}'],
        globIgnores: ['**/raw/**', '**/refs/**', '**/pages_v1_backup/**', '**/Old/**', '**/*.mp3', '**/*.wav', '**/*.ogg'],
        maximumFileSizeToCacheInBytes: 25 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true
      }
    })
  ],
  server: {
    host: true,
    port: 5174,
    watch: {
      ignored: ['**/public/assets/**/refs/**', '**/public/assets/**/raw/**']
    }
  }
});
