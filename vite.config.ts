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
        // Precache every built asset — JS, CSS, HTML, fonts, images bundled by Vite
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2,ttf}'],
        runtimeCaching: [
          {
            // S3 images — matches any Amplify bucket (sandbox or production)
            urlPattern: /^https:\/\/.*\.s3\..*\.amazonaws\.com\/images\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'missionary-images',
              expiration: { maxEntries: 300, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // S3 PDFs — matches any Amplify bucket
            urlPattern: /^https:\/\/.*\.s3\..*\.amazonaws\.com\/pdfs\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'prayer-letters',
              expiration: { maxEntries: 50, maxAgeSeconds: 7 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // API Gateway — try network first (5s timeout), fall back to cached data
            urlPattern: /^https:\/\/.*\.execute-api\.us-east-1\.amazonaws\.com\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-missionaries',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 100, maxAgeSeconds: 24 * 60 * 60 },
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
        background_color: '#0a0a0a',
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
