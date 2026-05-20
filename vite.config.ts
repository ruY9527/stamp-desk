import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import electronRenderer from 'vite-plugin-electron-renderer'
import path from 'path'

/**
 * Vite 配置文件
 * 集成 Electron 和 React 开发环境
 */
export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        // Electron 主进程入口
        entry: '../main/index.ts',
        vite: {
          build: {
            outDir: '../../dist-electron/main',
            rollupOptions: {
              external: ['electron', 'pdf-lib'],
            },
          },
        },
      },
      {
        // Preload 脚本入口
        entry: '../preload/index.ts',
        onstart(args) {
          args.reload()
        },
        vite: {
          build: {
            outDir: '../../dist-electron/preload',
            rollupOptions: {
              external: ['electron'],
            },
          },
        },
      },
    ]),
    electronRenderer(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer/src'),
    },
  },
  root: 'src/renderer',
  build: {
    outDir: '../../dist',
    emptyOutDir: true,
  },
})
