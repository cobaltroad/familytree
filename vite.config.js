import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Load env file based on mode (development, production, etc.)
  const env = loadEnv(mode, process.cwd(), '');

  // Inject environment variables into process.env for server-side code
  process.env = { ...process.env, ...env };

  // Determine base path for GitHub Pages deployment
  const isGitHubPages = process.env.GITHUB_PAGES === 'true';
  const basePath = isGitHubPages ? '/familytree' : '';

  return {
    plugins: [sveltekit()],
    define: {
      // Make base path available at runtime via import.meta.env.VITE_BASE_PATH
      'import.meta.env.VITE_BASE_PATH': JSON.stringify(basePath)
    },
    server: {
      port: 5173,
      fs: {
        allow: ['..']
      }
    },
    test: {
      globals: true,
      environment: 'jsdom',
      include: ['src/**/*.{test,spec}.{js,ts}']
    }
  };
});
