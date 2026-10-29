import { defineConfig } from 'vite';

export default defineConfig({
  // BASE_PATH is set by the Pages workflow; '/' works for localhost and custom domains.
  base: process.env.BASE_PATH || '/',
  build: { target: 'es2022', assetsInlineLimit: 4096 },
  server: { host: '0.0.0.0' }
});
