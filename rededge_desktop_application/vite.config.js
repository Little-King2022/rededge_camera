import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import { fileURLToPath, URL } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'

const pkgPath = fileURLToPath(new URL('./package.json', import.meta.url))
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
const buildTime = new Date().toString()

export default defineConfig({
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
    'import.meta.env.VITE_BUILD_TIME': JSON.stringify(buildTime)
  },
  plugins: [
    vue(),
    electron([
      {
        entry: 'electron/main.js',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['better-sqlite3']
            }
          }
        }
      },
      {
        entry: 'electron/preload.cjs',
        onstart(options) {
          options.reload()
        },
        vite: {
          build: {
            outDir: 'dist-electron'
          }
        }
      }
    ]),
    renderer()
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('ant-design-vue')) return 'vendor-antd'
          if (id.includes('@ant-design/icons-vue')) return 'vendor-antd-icons'
          if (id.includes('three')) return 'vendor-three'
          if (id.includes('utif')) return 'vendor-utif'
          if (id.includes('vue')) return 'vendor-vue'
          return 'vendor'
        }
      }
    }
  },
  server: {
    port: 5173
  }
})
