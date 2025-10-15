import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-manifest',
      generateBundle() {
        const manifestPath = path.resolve(__dirname, 'src/manifest.json');
        const manifest = fs.readFileSync(manifestPath, 'utf-8');
        this.emitFile({
          type: 'asset',
          fileName: 'manifest.json',
          source: manifest,
        });
      },
    },
  ],
  
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    
    rollupOptions: {
      input: {
        popup: path.resolve(__dirname, 'src/popup.html'),
        background: path.resolve(__dirname, 'src/background.js'),
        offscreen: path.resolve(__dirname, 'src/offscreen.html'),
        content: path.resolve(__dirname, 'src/content.js'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },

  server: {
    port: 3000,
    strictPort: false,
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  define: {
    'process.env': {},
  },
});