import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 5173,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
        // Note: Vite automatically exposes VITE_* environment variables via import.meta.env
        // No need to explicitly define them here
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
          'src': path.resolve(__dirname, 'src'),
        }
      },
      optimizeDeps: {
        exclude: ['@demox-labs/aleo-wallet-adapter-leo'],
      }
    };
});
