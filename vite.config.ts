import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({
  base: './',
  plugins: [VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['icon.svg'],
    manifest: {
      name: 'Purjehdussäännöt', short_name: 'Säännöt', lang: 'fi',
      start_url: './', display: 'standalone', background_color: '#0b2a3d', theme_color: '#0b2a3d',
      icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }]
    },
    workbox: { globPatterns: ['**/*.{js,css,html,svg,json}'] }
  })]
});
