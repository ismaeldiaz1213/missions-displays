import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const SITE = 'https://misiones.iblibertad.org'
const CONFERENCE_POSTER = '/conferencia/poster-2026-sm.jpg'

/** Pages people share. Link previews (WhatsApp, Facebook…) don't run JavaScript, so each one
 *  gets its own copy of index.html with its own title, description and picture. */
const SHARE_PAGES: { path: string; title: string; description: string; image?: string }[] = [
  { path: 'region-selection', title: 'Mapa de nuestros misioneros · Misiones IBL', description: 'Toque un continente o la foto de un misionero para conocerlos y orar por ellos.' },
  ...([
    ['norte-america', 'Norte América'], ['centro-america', 'Centro América'], ['sur-america', 'Sur América'],
    ['europa', 'Europa'], ['africa', 'África'], ['asia', 'Asia'], ['oceania', 'Oceanía'],
  ] as const).map(([path, name]) => ({
    path, title: `Misioneros en ${name} · Misiones IBL`, description: `Conozca a los misioneros que sirven en ${name} y ore por ellos.`,
  })),
  {
    path: 'conferencia', title: 'Conferencia y Escuela de Misiones 2026 · Iglesia Bautista Libertad',
    description: '2 – 5 de noviembre de 2026 · Houston, Texas. Horario, video de invitación y registro.', image: CONFERENCE_POSTER,
  },
  {
    path: 'conferencia/registro', title: 'Registro · Conferencia y Escuela de Misiones 2026',
    description: 'Regístrese para la conferencia del 2 al 5 de noviembre de 2026 en la Iglesia Bautista Libertad.', image: CONFERENCE_POSTER,
  },
  {
    path: 'misioneros/solicitud', title: 'Solicitud de página misionera · Misiones IBL',
    description: '¿Es usted misionero? Envíenos su información y fotos para crear su página en nuestro mapa.',
  },
]

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

const sharePages = (): Plugin => ({
  name: 'share-pages',
  apply: 'build',
  enforce: 'post',
  generateBundle(_, bundle) {
    const index = bundle['index.html']
    if (!index || index.type !== 'asset') return
    const html = String(index.source)
    for (const page of SHARE_PAGES) {
      const title = escapeHtml(page.title)
      const description = escapeHtml(page.description)
      const out = html
        .replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
        .replace(/(<meta (?:property="og:title"|name="description"|property="og:description"|property="og:url"|property="og:image(?::width|:height)?") content=")[^"]*/g, (match, start: string) => {
          if (start.includes('og:title')) return start + title
          if (start.includes('description')) return start + description
          if (start.includes('og:url')) return `${start}${SITE}/${page.path}`
          if (!page.image) return match
          if (start.includes('og:image"')) return `${start}${SITE}${page.image}`
          return start + (start.includes('width') ? '1200' : '600')
        })
      this.emitFile({ type: 'asset', fileName: `${page.path}/index.html`, source: out })
    }
  },
})

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    sharePages(),
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
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
