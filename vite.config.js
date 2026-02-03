import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/MDIC/',     // MUST match the repo name exactly (MDIC)
  build: {
    outDir: 'docs',   // Build output for GitHub Pages
  },
})
