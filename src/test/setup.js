import { vi } from 'vitest';
import { expect } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
import { testConfig } from '../lib/d3Helpers.js';
import { config as loadEnv } from 'dotenv';
import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env file for testing
loadEnv({ quiet: true });

// Ensure database schema is up-to-date before running tests
// This fixes issue #122 where tests fail due to missing birth_surname/nickname columns
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '../../familytree.db');

try {
  const db = new Database(dbPath);

  // Check if migration is needed
  const tableInfo = db.prepare('PRAGMA table_info(people)').all();
  const hasBirthSurname = tableInfo.some(col => col.name === 'birth_surname');
  const hasNickname = tableInfo.some(col => col.name === 'nickname');

  if (!hasBirthSurname || !hasNickname) {
    console.log('[Test Setup] Applying migration 0002 to add birth_surname and nickname columns...');

    // Apply migration
    if (!hasBirthSurname) {
      try {
        db.exec('ALTER TABLE people ADD COLUMN birth_surname TEXT');
      } catch (error) {
        if (!error.message.includes('duplicate column name')) {
          throw error;
        }
      }
    }

    if (!hasNickname) {
      try {
        db.exec('ALTER TABLE people ADD COLUMN nickname TEXT');
      } catch (error) {
        if (!error.message.includes('duplicate column name')) {
          throw error;
        }
      }
    }

    console.log('[Test Setup] Migration applied successfully');
  }

  db.close();
} catch (error) {
  // Database might not exist yet, which is fine for some tests
  if (!error.message.includes('ENOENT')) {
    console.warn('[Test Setup] Could not check/apply database migrations:', error.message);
  }
}

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
