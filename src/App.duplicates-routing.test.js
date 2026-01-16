/**
 * TDD Test Suite: Duplicates Route
 *
 * RED PHASE: This test will fail initially because:
 * - The /duplicates route is not handled in +page.svelte
 * - The route should render DuplicateDetection component
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/svelte'
import App from './routes/+page.svelte'
import { people, relationships } from './stores/familyStore.js'

describe('App.svelte - Duplicates Route (TDD)', () => {
  beforeEach(() => {
    // Reset stores
    people.set([])
    relationships.set([])

    // Reset window.location.hash
    window.location.hash = ''
  })

  afterEach(() => {
    people.set([])
    relationships.set([])
  })

  describe('Duplicates Route', () => {
    it('should render DuplicateDetection component for #/duplicates hash', () => {
      window.location.hash = '#/duplicates'

      const { container } = render(App)

      // Should render duplicate detection view
      const duplicateContainer = container.querySelector('.duplicate-detection')
      expect(duplicateContainer).toBeTruthy()

      // Should NOT render pedigree view
      const pedigreeContainer = container.querySelector('.pedigree-container')
      expect(pedigreeContainer).toBeFalsy()
    })

    it('should not render DuplicateDetection for other routes', () => {
      window.location.hash = '#/pedigree'

      const { container } = render(App)

      // Should NOT render duplicate detection view
      const duplicateContainer = container.querySelector('.duplicate-detection')
      expect(duplicateContainer).toBeFalsy()

      // Should render pedigree view instead
      const pedigreeContainer = container.querySelector('.pedigree-container')
      expect(pedigreeContainer).toBeTruthy()
    })

    it('should show loading state when DuplicateDetection is mounted', () => {
      window.location.hash = '#/duplicates'

      const { container } = render(App)

      // Should show loading state initially
      const loadingState = container.querySelector('.loading-state')
      expect(loadingState).toBeTruthy()

      // Should have loading text
      const loadingText = container.textContent
      expect(loadingText).toContain('Scanning for duplicates')
    })
  })

  describe('ViewSwitcher Integration', () => {
    it('should highlight Duplicates tab when on duplicates route', () => {
      window.location.hash = '#/duplicates'

      const { container } = render(App)

      // Find the ViewSwitcher duplicates tab
      const viewSwitcher = container.querySelector('.view-switcher')
      expect(viewSwitcher).toBeTruthy()

      // Find all tabs
      const tabs = viewSwitcher.querySelectorAll('.view-tab')

      // Find the Duplicates tab (should have 🔍 icon)
      let duplicatesTab = null
      tabs.forEach(tab => {
        if (tab.textContent.includes('🔍') || tab.textContent.includes('Duplicates')) {
          duplicatesTab = tab
        }
      })

      expect(duplicatesTab).toBeTruthy()
      expect(duplicatesTab.classList.contains('active')).toBe(true)
    })

    it('should have correct href for Duplicates tab', () => {
      window.location.hash = '#/pedigree'

      const { container } = render(App)

      // Find the Duplicates tab
      const viewSwitcher = container.querySelector('.view-switcher')
      const tabs = viewSwitcher.querySelectorAll('.view-tab')

      let duplicatesTab = null
      tabs.forEach(tab => {
        if (tab.textContent.includes('🔍') || tab.textContent.includes('Duplicates')) {
          duplicatesTab = tab
        }
      })

      expect(duplicatesTab).toBeTruthy()

      // Tab should have correct href attribute
      expect(duplicatesTab.getAttribute('href')).toBe('#/duplicates')
    })
  })
})
