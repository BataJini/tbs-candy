import { defineConfig } from 'vite';

// base is '/tbs-candy/' for GitHub Pages project sites, '/' for local dev
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/tbs-candy/' : '/',
  build: { chunkSizeWarningLimit: 900 },
}));
