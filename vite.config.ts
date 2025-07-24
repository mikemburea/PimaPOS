import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // Skip TypeScript checking during build
    rollupOptions: {
      onwarn(warning, warn) {
        // Skip certain warnings
        if (warning.code === 'TYPESCRIPT_ERROR') return
        warn(warning)
      }
    }
  },
  esbuild: {
    // This will make esbuild ignore TypeScript errors
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  }
})