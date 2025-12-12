import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks: {
              // Separar React e React DOM
              'react-vendor': ['react', 'react-dom'],
              // Separar Firebase (muito pesado)
              'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
              // Separar Google GenAI
              'gemini-vendor': ['@google/genai'],
              // Separar Radix UI
              'radix-vendor': [
                '@radix-ui/react-dialog',
                '@radix-ui/react-dropdown-menu',
                '@radix-ui/react-select',
                '@radix-ui/react-switch',
                '@radix-ui/react-tabs'
              ],
              // Utilitários
              'utils-vendor': ['clsx', 'tailwind-merge', 'class-variance-authority'],
            }
          }
        },
        chunkSizeWarningLimit: 1000,
        target: 'esnext',
        minify: 'esbuild',
      },
      optimizeDeps: {
        include: ['react', 'react-dom'],
        exclude: ['@google/genai']
      }
    };
});
