import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/gallery': { target: 'http://localhost:3004', changeOrigin: true },
      '/api/save-outputs': { target: 'http://localhost:3004', changeOrigin: true },
      '/api/thumbnail': { target: 'http://localhost:3004', changeOrigin: true },
      '/api/config': { target: 'http://localhost:3004', changeOrigin: true },
      '/api/history': { target: 'http://localhost:3004', changeOrigin: true },
      '/api/upload-input': { target: 'http://localhost:3004', changeOrigin: true },
      '/api/balance': { target: 'http://localhost:3004', changeOrigin: true },
      '/输出': { target: 'http://localhost:3004', changeOrigin: true },
      '/%E8%BE%93%E5%87%BA': { target: 'http://localhost:3004', changeOrigin: true },
      '/api': { target: 'https://bizyair.cn', changeOrigin: true },
      '/x': { target: 'https://api.bizyair.cn', changeOrigin: true },
      '/w': { target: 'https://api.bizyair.cn', changeOrigin: true },
    },
  },
})
