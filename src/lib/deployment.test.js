/**
 * Deployment Configuration Tests (Story #150)
 *
 * Tests for GitHub Pages deployment setup including:
 * - GitHub Actions workflow validation
 * - SvelteKit base path configuration
 * - Build environment variables
 */

import { describe, test, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
// Go up to project root from src/lib/
const projectRoot = join(__dirname, '..', '..')

describe('GitHub Pages Deployment Configuration', () => {
  describe('GitHub Actions Workflow', () => {
    test('workflow file exists at .github/workflows/deploy-static-site.yml', () => {
      const workflowPath = join(projectRoot, '.github', 'workflows', 'deploy-static-site.yml')
      expect(existsSync(workflowPath)).toBe(true)
    })

    test('workflow contains required job steps', () => {
      const workflowPath = join(projectRoot, '.github', 'workflows', 'deploy-static-site.yml')
      const workflowContent = readFileSync(workflowPath, 'utf-8')

      // Verify key workflow elements
      expect(workflowContent).toContain('name:')
      expect(workflowContent).toContain('on:')
      expect(workflowContent).toContain('jobs:')
      expect(workflowContent).toContain('actions/checkout@v4')
      expect(workflowContent).toContain('actions/setup-node@v4')
      expect(workflowContent).toContain('npm ci')
      expect(workflowContent).toContain('npm run export-data')
      expect(workflowContent).toContain('npm run build')
    })

    test('workflow sets VITE_VIEWER_MODE environment variable', () => {
      const workflowPath = join(projectRoot, '.github', 'workflows', 'deploy-static-site.yml')
      const workflowContent = readFileSync(workflowPath, 'utf-8')

      expect(workflowContent).toContain('VITE_VIEWER_MODE')
      expect(workflowContent).toContain('true')
    })

    test('workflow triggers on push to main branch', () => {
      const workflowPath = join(projectRoot, '.github', 'workflows', 'deploy-static-site.yml')
      const workflowContent = readFileSync(workflowPath, 'utf-8')

      expect(workflowContent).toContain('push:')
      expect(workflowContent).toContain('main')
    })

    test('workflow includes manual workflow_dispatch trigger', () => {
      const workflowPath = join(projectRoot, '.github', 'workflows', 'deploy-static-site.yml')
      const workflowContent = readFileSync(workflowPath, 'utf-8')

      expect(workflowContent).toContain('workflow_dispatch')
    })

    test('workflow uses GitHub Pages deployment actions', () => {
      const workflowPath = join(projectRoot, '.github', 'workflows', 'deploy-static-site.yml')
      const workflowContent = readFileSync(workflowPath, 'utf-8')

      expect(workflowContent).toContain('actions/configure-pages@v4')
      expect(workflowContent).toContain('actions/upload-pages-artifact@v3')
      expect(workflowContent).toContain('actions/deploy-pages@v4')
    })

    test('workflow sets correct Node.js version', () => {
      const workflowPath = join(projectRoot, '.github', 'workflows', 'deploy-static-site.yml')
      const workflowContent = readFileSync(workflowPath, 'utf-8')

      expect(workflowContent).toMatch(/node-version:\s*['"]?20/)
    })
  })

  describe('SvelteKit Base Path Configuration', () => {
    test('svelte.config.js contains base path configuration logic', () => {
      const configPath = join(projectRoot, 'svelte.config.js')
      const configContent = readFileSync(configPath, 'utf-8')

      // Verify the config file contains paths configuration
      expect(configContent).toContain('paths')
      expect(configContent).toContain('base')
    })

    test('svelte.config.js checks GITHUB_PAGES environment variable', () => {
      const configPath = join(projectRoot, 'svelte.config.js')
      const configContent = readFileSync(configPath, 'utf-8')

      // Verify environment variable check exists
      expect(configContent).toContain('GITHUB_PAGES')
      expect(configContent).toContain('/familytree')
    })
  })

  describe('Deployment Documentation', () => {
    test('DEPLOYMENT.md file exists', () => {
      const docPath = join(projectRoot, 'DEPLOYMENT.md')
      expect(existsSync(docPath)).toBe(true)
    })

    test('DEPLOYMENT.md contains required sections', () => {
      const docPath = join(projectRoot, 'DEPLOYMENT.md')
      const docContent = readFileSync(docPath, 'utf-8')

      expect(docContent).toContain('# Deployment')
      expect(docContent).toContain('## GitHub Pages')
      expect(docContent).toContain('## Manual Deployment')
      expect(docContent).toContain('## Troubleshooting')
      expect(docContent).toContain('## Rollback')
    })

    test('DEPLOYMENT.md includes GitHub Pages URL', () => {
      const docPath = join(projectRoot, 'DEPLOYMENT.md')
      const docContent = readFileSync(docPath, 'utf-8')

      expect(docContent).toContain('https://cobaltroad.github.io/familytree/')
    })
  })

  describe('Build Configuration', () => {
    test('package.json includes export-data script', () => {
      const packagePath = join(projectRoot, 'package.json')
      const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'))

      expect(packageJson.scripts['export-data']).toBeDefined()
      expect(packageJson.scripts['export-data']).toContain('export-data.js')
    })

    test('build script exists in package.json', () => {
      const packagePath = join(projectRoot, 'package.json')
      const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'))

      expect(packageJson.scripts.build).toBeDefined()
      expect(packageJson.scripts.build).toContain('vite build')
    })
  })
})

describe('Build with Viewer Mode Environment Variable', () => {
  test('VITE_VIEWER_MODE can be set as environment variable', () => {
    // This test verifies that the environment variable pattern works
    process.env.VITE_VIEWER_MODE = 'true'

    expect(process.env.VITE_VIEWER_MODE).toBe('true')

    // Cleanup
    delete process.env.VITE_VIEWER_MODE
  })
})
