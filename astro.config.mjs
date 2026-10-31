import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import { unified } from '@astrojs/markdown-remark';
import rehypeCjkSpacing from './src/lib/rehype-cjk-spacing.mjs';

export default defineConfig({
  site: process.env.ATLAS_SITE_URL || 'http://localhost:4321',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [mdx()],
  markdown: {
    processor: unified({ rehypePlugins: [rehypeCjkSpacing], smartypants: false }),
  },
  devToolbar: { enabled: false },
});
