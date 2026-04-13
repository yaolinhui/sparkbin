import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // 支持前端路由 history 模式，刷新页面不返回 404
    historyApiFallback: true,
  },
})
