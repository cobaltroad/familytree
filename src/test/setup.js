import { vi } from 'vitest';
import { expect } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
import { testConfig } from '../lib/d3Helpers.js';
import { config as loadEnv } from 'dotenv';

// Load environment variables from .env file for testing
loadEnv();

// Extend Vitest's expect with @testing-library/jest-dom matchers
expect.extend(matchers);

// Enable D3 test mode globally to disable transitions in JSDOM
// This prevents "Cannot read properties of undefined (reading 'baseVal')" errors
testConfig.enabled = true;

// Mock SvelteKit modules for testing
vi.mock('$app/environment', () => ({
  browser: true,
  dev: true,
  building: false,
  version: 'test'
}));

vi.mock('$app/navigation', () => ({
  goto: vi.fn(),
  invalidate: vi.fn(),
  invalidateAll: vi.fn(),
  preloadData: vi.fn(),
  preloadCode: vi.fn(),
  beforeNavigate: vi.fn(),
  afterNavigate: vi.fn()
}));

vi.mock('$app/stores', () => ({
  page: {
    subscribe: vi.fn((callback) => {
      // Call callback with default page data
      callback({
        url: new URL('http://localhost:5173'),
        params: {},
        route: { id: '/' },
        status: 200,
        error: null,
        data: {
          session: {
            user: {
              id: 1,
              email: 'test@example.com',
              name: 'Test User'
            }
          }
        },
        form: null
      })
      // Return unsubscribe function
      return () => {}
    })
  },
  navigating: {
    subscribe: vi.fn((callback) => {
      callback(null)
      return () => {}
    })
  },
  updated: {
    subscribe: vi.fn((callback) => {
      callback(false)
      return () => {}
    })
  }
}));
