import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Load env file based on mode (development, production, etc.)
  const env = loadEnv(mode, process.cwd(), '');

  // Inject environment variables into process.env for server-side code
  process.env = { ...process.env, ...env };

  return {
    plugins: [sveltekit()],
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
