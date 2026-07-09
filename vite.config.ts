import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // GitHub Pages serves from /Suchitra-arts/; unset for dev and custom domains
  base: process.env.GITHUB_PAGES ? '/Suchitra-arts/' : '/',
  plugins: [react(), tailwindcss()],
})
