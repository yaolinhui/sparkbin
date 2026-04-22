import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return;
          }

          if (id.includes('react-force-graph')) {
            return 'graph';
          }

          if (id.includes('reactflow')) {
            return 'reactflow';
          }

          if (id.includes('@tiptap')) {
            return 'tiptap';
          }

          if (id.includes('@dnd-kit')) {
            return 'dnd-kit';
          }

          if (
            id.includes('react-router') ||
            id.includes('zustand') ||
            id.includes('\\react\\') ||
            id.includes('\\react-dom\\')
          ) {
            return 'vendor';
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    // 支持前端路由 history 模式，刷新页面不返回 404
    historyApiFallback: true,
  },
})
