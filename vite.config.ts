import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// BASE_PATH permite publicar en una subcarpeta (p. ej. GitHub Pages: /Whis_Amazonia/).
// En Netlify o Vercel no hace falta: la app vive en la raíz '/'.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const base = env.BASE_PATH || '/';
  return {
    base,
    build: {
      chunkSizeWarningLimit: 900,
      rollupOptions: { output: { manualChunks: { recharts: ['recharts'], react: ['react', 'react-dom'] } } },
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['logo-whis.png', 'apple-touch-icon.png'],
        manifest: {
          name: 'Whis · FEFO térmico y liquidación B2B',
          short_name: 'Whis',
          description:
            'Gestión FEFO térmica de perecibles y liquidación relámpago B2B por WhatsApp. Funciona sin internet.',
          lang: 'es-PE',
          theme_color: '#0D0F12',
          background_color: '#0D0F12',
          display: 'standalone',
          orientation: 'portrait',
          start_url: base,
          scope: base,
          id: base,
          icons: [
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,png,webp,svg,ico}'],
          navigateFallback: `${base}index.html`,
        },
      }),
    ],
  };
});
