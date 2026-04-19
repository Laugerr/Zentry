import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
// Set base to your GitHub repo name for GitHub Pages deployment
// e.g. if your repo is github.com/username/life-dashboard, set base: '/life-dashboard/'
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt'],
      manifest: {
        name: 'Zentry — Personal Life Dashboard',
        short_name: 'Zentry',
        description: 'Live news, jobs, language planner, CV builder, radio, football & finance — one dashboard.',
        theme_color: '#0a0a0f',
        background_color: '#0a0a0f',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        icons: [
          // Only an SVG favicon ships in /public — Chrome's install banner prefers PNGs,
          // but the SVG works for SW caching and most browsers' app shells.
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // Cache the app shell + JS/CSS aggressively; the autoUpdate registration handles refresh.
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        navigateFallback: 'index.html',
        // Some chunks (react-simple-maps + topojson atlas) are large — bump the cap so they precache cleanly.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        runtimeCaching: [
          // News proxy — short cache, falls back to network
          {
            urlPattern: ({ url }) => url.origin === 'https://api.codetabs.com',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'codetabs-proxy',
              networkTimeoutSeconds: 6,
              expiration: { maxEntries: 40, maxAgeSeconds: 10 * 60 },
            },
          },
          // Geo lookup — long cache (location rarely changes mid-session)
          {
            urlPattern: ({ url }) => url.origin === 'https://ipinfo.io',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'ipinfo',
              expiration: { maxEntries: 5, maxAgeSeconds: 24 * 60 * 60 },
            },
          },
          // Weather — moderate freshness
          {
            urlPattern: ({ url }) => url.origin === 'https://api.open-meteo.com',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'open-meteo',
              expiration: { maxEntries: 30, maxAgeSeconds: 30 * 60 },
            },
          },
          // ESPN scoreboard — short SWR
          {
            urlPattern: ({ url }) => url.origin === 'https://site.api.espn.com',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'espn',
              expiration: { maxEntries: 30, maxAgeSeconds: 5 * 60 },
            },
          },
          // CoinGecko prices — very short SWR
          {
            urlPattern: ({ url }) => url.origin === 'https://api.coingecko.com',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'coingecko',
              expiration: { maxEntries: 30, maxAgeSeconds: 2 * 60 },
            },
          },
          // Radio Browser API — long cache
          {
            urlPattern: ({ url }) => /radio-browser\.info$/.test(url.hostname),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'radio-browser',
              expiration: { maxEntries: 100, maxAgeSeconds: 24 * 60 * 60 },
            },
          },
          // RSS2JSON fallback
          {
            urlPattern: ({ url }) => url.origin === 'https://api.rss2json.com',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'rss2json',
              networkTimeoutSeconds: 6,
              expiration: { maxEntries: 40, maxAgeSeconds: 10 * 60 },
            },
          },
          // Google fonts
          {
            urlPattern: ({ url }) => /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  base: '/',
  server: {
    proxy: {
      '/api/jobs': {
        target: 'https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobs',
        changeOrigin: true,
        rewrite: () => '',
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('X-API-Key', 'jobboerse-jobsuche')
          })
        },
      },
    },
  },
})
