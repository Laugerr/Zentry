import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// Set base to your GitHub repo name for GitHub Pages deployment
// e.g. if your repo is github.com/username/life-dashboard, set base: '/life-dashboard/'
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/',
})
