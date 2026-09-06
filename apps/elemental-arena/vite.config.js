import { defineConfig } from 'vite';

export default defineConfig({
  base: '/theme-four-experience/elemental-arena/',
  server: {
    host: '127.0.0.1',
    port: 4175,
    open: false
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 2000
  },
  assetsInclude: ['**/*.fbx', '**/*.hdr']
});
