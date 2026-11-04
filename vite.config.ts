import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'assets/**/*'],
      manifest: {
        name: 'Wyatt & Emma Arcade v2.0',
        short_name: 'W&E Arcade',
        description: 'Nintendo-polished 2D tablet stories and arcade games for Wyatt & Emma!',
        theme_color: '#1a1635',
        background_color: '#0f0c24',
        display: 'standalone',
        orientation: 'landscape',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,json,mp3,m4a,ogg,wav}'],
        globIgnores: ['**/raw/**', '**/refs/**'],
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024
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
