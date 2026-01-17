import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import topLevelAwait from 'vite-plugin-top-level-await'
import wasm from 'vite-plugin-wasm'

export default defineConfig({
  plugins: [react(), topLevelAwait(), wasm()],
  optimizeDeps: {
    exclude: ['@demox-labs/aleo-wallet-adapter-leo'],
  },
  server: {
    port: 3000,
  },
})

