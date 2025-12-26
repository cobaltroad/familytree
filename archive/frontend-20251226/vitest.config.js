import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte({ hot: !process.env.VITEST })],
  test: {
    environment: 'jsdom', // Use jsdom for component tests
    globals: true,
    setupFiles: ['./src/test/setup.js'], // Mock SvelteKit modules
  },
  resolve: {
    alias: {
      $lib: '/src/lib',
      $app: '/node_modules/@sveltejs/kit/src/runtime/app'
    }
  }
})
