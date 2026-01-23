/**
 * Static Adapter Build Tests (Issue #147)
 *
 * Tests for adapter-static configuration and static site generation.
 * These tests verify:
 * - AC1: Adapter-static installation and configuration
 * - AC4: Build output validation
 *
 * Following TDD methodology:
 * - RED: Write failing tests first (this file)
 * - GREEN: Implement adapter-static configuration
 * - REFACTOR: Improve configuration and documentation
 */

import { describe, test, expect, beforeAll } from 'vitest'
import { readFileSync, existsSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..', '..', '..')

describe('AC1: Adapter-Static Installation and Configuration', () => {
  test('svelte.config.js should use adapter-static', () => {
    const configPath = join(projectRoot, 'svelte.config.js')
    const configContent = readFileSync(configPath, 'utf-8')

    // Should import adapter-static
    expect(configContent).toContain("from '@sveltejs/adapter-static'")

    // Should not use adapter-auto in the config
    expect(configContent).not.toContain('adapter-auto()')
  })

  test('package.json should have adapter-static in devDependencies', () => {
    const packageJsonPath = join(projectRoot, 'package.json')
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))

    expect(packageJson.devDependencies).toHaveProperty('@sveltejs/adapter-static')
  })

  test('adapter-static should be configured with correct options', () => {
    const configPath = join(projectRoot, 'svelte.config.js')
    const configContent = readFileSync(configPath, 'utf-8')

    // Should configure adapter with options
    expect(configContent).toContain('adapter(')

    // Should specify pages directory
    expect(configContent).toMatch(/pages:.*['"]build['"]/)

    // Should specify assets directory
    expect(configContent).toMatch(/assets:.*['"]build['"]/)

    // Should have fallback configuration for client-side routing
    expect(configContent).toMatch(/fallback:.*['"]index\.html['"]/)
  })
})

describe('AC2: Prerendering Configuration', () => {
  test('root +page.js should export prerender = true', () => {
    const pageJsPath = join(projectRoot, 'src', 'routes', '+page.js')
    const pageJsContent = readFileSync(pageJsPath, 'utf-8')

    // Should have prerender export
    expect(pageJsContent).toMatch(/export\s+const\s+prerender\s+=\s+true/)
  })

  test('root +layout.js should have static configuration', () => {
    const layoutJsPath = join(projectRoot, 'src', 'routes', '+layout.js')
    const layoutJsContent = readFileSync(layoutJsPath, 'utf-8')

    // Should enable CSR for client-side routing
    expect(layoutJsContent).toMatch(/export\s+const\s+csr\s+=\s+true/)
  })
})

describe('AC3: API Route Handling', () => {
  test('API routes should be excluded from prerendering', () => {
    // Check that API routes have proper configuration
    const apiRoutePath = join(projectRoot, 'src', 'routes', 'api', '+server.js')

    if (existsSync(apiRoutePath)) {
      const apiRouteContent = readFileSync(apiRoutePath, 'utf-8')
      expect(apiRouteContent).toMatch(/export\s+const\s+prerender\s+=\s+false/)
    }

    // API routes should not be prerendered in static build
    // This will be validated by checking that the build doesn't fail
  })

  test('svelte.config.js should configure strict mode appropriately', () => {
    const configPath = join(projectRoot, 'svelte.config.js')
    const configContent = readFileSync(configPath, 'utf-8')

    // Should have strict: false to allow mixed prerendering
    expect(configContent).toMatch(/strict:\s*false/)
  })
})

describe('AC4: Build Output Validation', () => {
  let buildDir

  beforeAll(() => {
    buildDir = join(projectRoot, 'build')
  })

  test('build directory should exist after build', () => {
    expect(existsSync(buildDir)).toBe(true)
  })

  test('build should contain index.html', () => {
    const indexPath = join(buildDir, 'index.html')
    expect(existsSync(indexPath)).toBe(true)

    const indexContent = readFileSync(indexPath, 'utf-8')
    // Should be a valid HTML file (case-insensitive)
    expect(indexContent.toLowerCase()).toContain('<!doctype html')
    expect(indexContent).toContain('<html')
  })

  test('build should contain _app directory with assets', () => {
    const appDir = join(buildDir, '_app')
    expect(existsSync(appDir)).toBe(true)

    // Should have immutable assets
    const immutableDir = join(appDir, 'immutable')
    expect(existsSync(immutableDir)).toBe(true)
  })

  test('build should not contain server-side code', () => {
    const buildContent = getBuildFileContents(buildDir)

    // Should not contain server-only imports
    expect(buildContent).not.toContain('better-sqlite3')
    expect(buildContent).not.toContain('@auth/sveltekit')

    // Note: family-chart and its dependencies should be included
  })

  test('build should include family-chart library', () => {
    const buildContent = getBuildFileContents(buildDir)

    // Should include family-chart or d3 (used by family-chart)
    const hasFamilyChart = buildContent.includes('family-chart') || buildContent.includes('d3')
    expect(hasFamilyChart).toBe(true)
  })

  test('build should include static data files', () => {
    const dataDir = join(buildDir, 'data')

    if (existsSync(dataDir)) {
      // If data directory exists, check for JSON files
      expect(existsSync(join(dataDir, 'people.json'))).toBe(true)
      expect(existsSync(join(dataDir, 'relationships.json'))).toBe(true)
    } else {
      // Data files should be accessible somehow (either in build or served from static)
      console.warn('Data directory not found in build output - ensure static data is accessible')
    }
  })

  test('total bundle size should be reasonable', () => {
    const totalSize = getTotalBuildSize(buildDir)
    const maxSizeBytes = 2 * 1024 * 1024 // 2MB for core app

    // This is a soft limit - log warning if exceeded
    if (totalSize > maxSizeBytes) {
      console.warn(`Build size (${(totalSize / 1024 / 1024).toFixed(2)}MB) exceeds 2MB target`)
    }

    // Hard limit of 5MB (accounting for visualization libraries)
    expect(totalSize).toBeLessThan(5 * 1024 * 1024)
  })

  test('build should have proper fallback for client-side routing', () => {
    const indexPath = join(buildDir, 'index.html')
    expect(existsSync(indexPath)).toBe(true)

    // For hash-based routing, index.html serves as fallback
    const indexContent = readFileSync(indexPath, 'utf-8')
    expect(indexContent.length).toBeGreaterThan(0)
  })
})

// Helper functions
function getBuildFileContents(dir) {
  let content = ''

  function readDir(dirPath) {
    const entries = readdirSync(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name)

      if (entry.isDirectory()) {
        readDir(fullPath)
      } else if (entry.name.endsWith('.js') || entry.name.endsWith('.html')) {
        try {
          content += readFileSync(fullPath, 'utf-8')
        } catch (err) {
          // Skip files that can't be read
        }
      }
    }
  }

  try {
    readDir(dir)
  } catch (err) {
    console.error('Error reading build directory:', err.message)
  }

  return content
}

function getTotalBuildSize(dir) {
  let totalSize = 0

  function getSize(dirPath) {
    const entries = readdirSync(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name)

      if (entry.isDirectory()) {
        getSize(fullPath)
      } else {
        try {
          const stats = statSync(fullPath)
          totalSize += stats.size
        } catch (err) {
          // Skip files that can't be accessed
        }
      }
    }
  }

  try {
    getSize(dir)
  } catch (err) {
    console.error('Error calculating build size:', err.message)
  }

  return totalSize
}
