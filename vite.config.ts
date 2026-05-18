import { defineConfig } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import vue from '@vitejs/plugin-vue';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  root: 'src',
  plugins: [vue()],
  resolve: {
    alias: {
      '/static/xiaochiPlot/minJS': resolve(__dirname, 'src/js'),
      '/static/xiaochiPlot/js': resolve(__dirname, 'src/js'),
      '/static/js': resolve(__dirname, 'src/js')
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        tanglegramTree: resolve(__dirname, 'src/js/tanglegramTree.ts'),
        normalTree: resolve(__dirname, 'src/js/normalTree.ts'),
        redTree: resolve(__dirname, 'src/js/redTree.ts'),
        circleTree: resolve(__dirname, 'src/js/circleTree.ts'),
        unrootedTree: resolve(__dirname, 'src/js/unrootedTree.ts'),
        smart_tvbot: resolve(__dirname, 'src/js/smart_tvbot.ts'),
        local_storage_handler: resolve(__dirname, 'src/js/local_storage_handler.ts')
      },
      output: {
        entryFileNames: 'js/[name].js',
        chunkFileNames: 'js/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://127.0.0.1:5000',
      '/tvbot': 'http://127.0.0.1:5000'
    }
  }
});
