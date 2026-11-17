import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react' // (zostaw swoje dotychczasowe importy i pluginy)

export default defineConfig({
  plugins: [react()],
  base: '/JudoAPp/', // <-- DODAJ TĘ LINIJKĘ
})