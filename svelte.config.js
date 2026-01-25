import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// Determine base path for GitHub Pages deployment
// GitHub Pages serves repositories at /<repo-name>/ subpath
const isGitHubPages = process.env.GITHUB_PAGES === 'true';
const basePath = isGitHubPages ? '/familytree' : '';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),

  kit: {
    adapter: adapter({
      // Build output to 'build' directory
      pages: 'build',
      assets: 'build',
      // Fallback for client-side routing
      fallback: 'index.html',
      // Precompress files for better performance
      precompress: false,
      // Allow strict mode to be disabled for mixed prerendering
      strict: false
    }),

    // Configure base path for GitHub Pages
    paths: {
      base: basePath
    },

    // Configure alias for $lib to maintain existing imports
    alias: {
      $lib: './src/lib'
    }
  }
};

export default config;
