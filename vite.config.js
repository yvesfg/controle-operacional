import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // IMPORTANTE: Troque 'controle-operacional' pelo nome EXATO do seu repositório no GitHub
  // Se o repo se chama 'meu-app', coloque '/meu-app/'
  // Se for o repo principal (usuario.github.io), deixe '/'
  base: '/controle-operacional/',
})
