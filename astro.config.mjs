import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// GitHub Pages serves this as a project site, so every link must respect `base`.
export default defineConfig({
  site: 'https://dixitrajvir20-blip.github.io',
  base: '/passion-project',
  output: 'static',
  integrations: [preact(), mdx(), sitemap({ filter: (page) => !page.includes('/account') })],
  // Prefetch on hover/tap for links that opt in with data-astro-prefetch.
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  // Content Security Policy as a <meta> tag with SHA-256 hashes of every inline script and
  // style Astro emits. GitHub Pages cannot send headers, so this is the strongest option there.
  // Rule that follows from it: no `style=""` attributes and no runtime-injected <style>.
  security: {
    csp: {
      algorithm: 'SHA-256',
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        "font-src 'self'",
        "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'none'",
        "form-action 'self'",
        'upgrade-insecure-requests',
      ],
    },
  },
  // Stylesheets stay external so the `../fonts/` URLs in tokens.css always
  // resolve from /_astro/, whatever `base` is set to.
  build: { format: 'directory', inlineStylesheets: 'never' },
});
