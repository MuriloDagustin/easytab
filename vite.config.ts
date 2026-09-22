/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon.svg'],
      manifest: {
        name: 'Tab Fácil',
        short_name: 'Tab Fácil',
        description: 'Aprenda a ler tablaturas de guitarra nota por nota.',
        lang: 'pt-BR',
        start_url: '/',
        display: 'standalone',
        background_color: '#0f1115',
        theme_color: '#0f1115',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Tesseract worker/core chunks are grandes; o modelo de idioma vem do CDN e não é cacheado.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        // Amostras de guitarra (~1 MB por instrumento) entram no cache só quando usadas.
        runtimeCaching: [
          {
            urlPattern: /\/samples\/.*\.mp3$/,
            handler: 'CacheFirst',
            options: { cacheName: 'guitar-samples', expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
})
