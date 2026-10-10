import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Precache every built asset — JS (incl. the .mjs PDF worker), CSS, HTML, fonts, images bundled by Vite
        globPatterns: ['**/*.{js,mjs,css,html,ico,png,svg,webp,woff,woff2,ttf}'],
        // Admin-only export libraries (Excel/PDF) load on demand — don't precache them for every visitor
        globIgnores: [
          '**/exportRegistrations-*.js', '**/exceljs*.js', '**/jspdf*.js',
          '**/html2canvas*.js', '**/purify.es-*.js', '**/index.es-*.js',
        ],
        runtimeCaching: [
          {
            // Missionary photos in Firebase Storage
            urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/[^/]+\/o\/images%2F/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'missionary-images',
              expiration: { maxEntries: 300, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Video poster frames written by the transcodeVideo function
            urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/[^/]+\/o\/videos%2Fposters%2F/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'video-posters',
              expiration: { maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Prayer letter PDFs in Firebase Storage
            urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/[^/]+\/o\/pdfs%2F/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'prayer-letters',
              expiration: { maxEntries: 50, maxAgeSeconds: 7 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        name: 'Misiones IBL Libertad',
        short_name: 'Misiones IBL',
        description: 'Misioneros de la Iglesia Bautista Libertad',
        theme_color: '#1E3A8A',
        background_color: '#F1F7FF',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/ibl_logo.png', sizes: '192x192', type: 'image/png' },
          { src: '/ibl_logo.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
})
