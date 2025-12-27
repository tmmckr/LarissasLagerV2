import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // WICHTIG: Muss exakt dein Repo-Name sein, in Schrägstrichen
  base: "/LarissasLagerV2/", 
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: "Larissas Lager",
        short_name: "Lager",
        description: "Mein Vorratsschrank und Einkaufsliste",
        theme_color: "#ffffff",
        background_color: "#F2F2F7",
        display: "standalone", // Das entfernt die Browser-Leiste!
        orientation: "portrait",
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})