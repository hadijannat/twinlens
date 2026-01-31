import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, readFileSync, writeFileSync } from 'fs';

// Plugin to copy manifest and rename HTML after build
function copyManifestPlugin(): Plugin {
  return {
    name: 'copy-manifest',
    closeBundle() {
      // Copy manifest
      copyFileSync(
        resolve(__dirname, 'manifests/manifest.chrome.json'),
        resolve(__dirname, 'dist/manifest.json')
      );
      console.log('Copied manifest.json to dist/');

      // Copy sidepanel HTML to root level with fixed paths
      try {
        let html = readFileSync(
          resolve(__dirname, 'dist/src/sidepanel/index.html'),
          'utf-8'
        );
        // Fix asset paths from ../../assets/ to ./assets/
        html = html.replace(/\.\.\/\.\.\/assets\//g, './assets/');
        writeFileSync(resolve(__dirname, 'dist/sidepanel.html'), html);
        console.log('Created sidepanel.html with fixed paths');
      } catch (err) {
        console.log('Note: Could not create sidepanel HTML:', err);
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), copyManifestPlugin()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@shared': resolve(__dirname, 'src/shared'),
      '@lib': resolve(__dirname, 'src/lib'),
    },
  },
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        sidepanel: resolve(__dirname, 'src/sidepanel/index.html'),
        'service-worker': resolve(__dirname, 'src/background/service-worker.ts'),
        'parse-worker': resolve(__dirname, 'src/workers/parse-worker.ts'),
        'extract-worker': resolve(__dirname, 'src/workers/extract-worker.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // Keep workers and service-worker at root level
          if (
            chunkInfo.name === 'service-worker' ||
            chunkInfo.name === 'parse-worker' ||
            chunkInfo.name === 'extract-worker'
          ) {
            return '[name].js';
          }
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
  publicDir: 'public',
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
