import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Detecta automaticamente o ambiente:
// - GitHub Pages: usa /controle-operacional/
// - Vercel / local: usa /
const base = process.env.VITE_BASE_URL ?? '/controle-operacional/'

export default defineConfig({
  plugins: [react()],
  base,
})
