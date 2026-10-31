import { defineConfig } from 'astro/config';
import contentAssets from './scripts/content-assets.mjs';

export default defineConfig({
  site: process.env.ATLAS_SITE_URL || 'http://localhost:4321',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [contentAssets()],
  devToolbar: { enabled: false },
});
