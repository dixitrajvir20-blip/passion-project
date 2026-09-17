import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// GitHub Pages serves this as a project site, so every link must respect `base`.
export default defineConfig({
  site: 'https://dixitrajvir20-blip.github.io',
  base: '/passion-project',
  output: 'static',
  integrations: [preact(), mdx(), sitemap()],
  // Stylesheets stay external so the `../fonts/` URLs in tokens.css always
  // resolve from /_astro/, whatever `base` is set to.
  build: { format: 'directory', inlineStylesheets: 'never' },
});
