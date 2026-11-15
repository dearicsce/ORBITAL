import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  plugins: [react(), tailwindcss()],
  build: {
    minify: 'esbuild',
    outDir: 'dist',
    cssCodeSplit: false,
    lib: {
      entry: './main.tsx',
      formats: ['es'],
      fileName: () => 'orbital-ui.js',
      cssFileName: 'orbital-ui',
    },
  },
});
