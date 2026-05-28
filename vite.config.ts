import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const minimaxApiKey = env.MINIMAX_API_KEY?.trim();
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api/minimax': {
            target: 'https://api.minimax.io',
            changeOrigin: true,
            secure: true,
            headers: minimaxApiKey
              ? {
                  Authorization: `Bearer ${minimaxApiKey}`,
                }
              : undefined,
            rewrite: (requestPath) => requestPath.replace(/^\/api\/minimax/, ''),
          },
        },
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
