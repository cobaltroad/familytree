/**
 * TDD Test Suite: Remove ListView Component
 *
 * RED PHASE: These tests will fail initially because:
 * - ListView is still imported in App.svelte
 * - ListView route is still handled
 * - ListView.svelte file still exists
 *
 * GREEN PHASE: Tests will pass after:
 * - Removing ListView.svelte file
 * - Removing ListView import from App.svelte
 * - Removing ListView route handling
 * - Redirecting #/list to #/pedigree
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render } from '@testing-library/svelte'
import App from './routes/+page.svelte'
import { people, relationships } from './stores/familyStore.js'
import { api } from './lib/api'

// Mock API calls to avoid network requests
vi.mock('./lib/api', () => ({
  api: {
    getAllPeople: vi.fn(() => Promise.resolve([])),
    getAllRelationships: vi.fn(() => Promise.resolve([]))
  }
}))

describe('ListView Removal (TDD)', () => {
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

  describe('RED Phase - Verify ListView Is Removed', () => {
    it('should NOT render ListView component for #/list route', () => {
      window.location.hash = '#/list'

      const { container } = render(App)

      // ListView should not exist (it has .list-container or form elements)
      const listContainer = container.querySelector('.list-container')
      expect(listContainer).toBeFalsy()

      // Instead, should redirect to Pedigree view
      const pedigreeContainer = container.querySelector('.pedigree-container')
      expect(pedigreeContainer).toBeTruthy()
    })

    it('should redirect #/list to default Pedigree view', () => {
      window.location.hash = '#/list'

      const { container } = render(App)

      // Should show pedigree view instead
      const pedigreeContainer = container.querySelector('.pedigree-container')
      expect(pedigreeContainer).toBeTruthy()

      // Should NOT show list view forms
      const forms = container.querySelectorAll('form')
      // Pedigree view doesn't have forms, so this should be 0 or minimal
      expect(forms.length).toBeLessThan(2) // Allow for potential single form in modal
    })

    it('should show ViewSwitcher for #/list route (since it redirects to pedigree)', () => {
      window.location.hash = '#/list'

      const { container } = render(App)

      // ViewSwitcher should be visible (since we're showing pedigree now)
      const viewSwitcher = container.querySelector('.view-switcher')
      expect(viewSwitcher).toBeTruthy()
    })

    it('should handle navigation to #/list gracefully (renders as pedigree)', () => {
      // Navigate directly to #/list
      window.location.hash = '#/list'
      const { container } = render(App)

      // Should show pedigree view (redirected from /list)
      const pedigreeContainer = container.querySelector('.pedigree-container')
      expect(pedigreeContainer).toBeTruthy()

      // Should NOT show timeline or other views
      const timelineContainer = container.querySelector('.timeline-container')
      expect(timelineContainer).toBeFalsy()

      const radialContainer = container.querySelector('.radial-container')
      expect(radialContainer).toBeFalsy()
    })
  })

  describe('Existing Routes Still Work', () => {
    it('should render PedigreeView for #/pedigree', () => {
      window.location.hash = '#/pedigree'

      const { container } = render(App)

      const pedigreeContainer = container.querySelector('.pedigree-container')
      expect(pedigreeContainer).toBeTruthy()
    })

    it('should render TimelineView for #/timeline', () => {
      window.location.hash = '#/timeline'

      const { container } = render(App)

      const timelineContainer = container.querySelector('.timeline-container')
      expect(timelineContainer).toBeTruthy()
    })

    it('should render RadialView for #/radial', () => {
      window.location.hash = '#/radial'

      const { container } = render(App)

      const radialContainer = container.querySelector('.radial-container')
      expect(radialContainer).toBeTruthy()
    })

    it('should render PedigreeView by default (empty hash)', () => {
      window.location.hash = ''

      const { container } = render(App)

      const pedigreeContainer = container.querySelector('.pedigree-container')
      expect(pedigreeContainer).toBeTruthy()
    })
  })

  describe('ViewSwitcher Behavior', () => {
    it('should show ViewSwitcher on Pedigree view', () => {
      window.location.hash = '#/pedigree'

      const { container } = render(App)

      const viewSwitcher = container.querySelector('.view-switcher')
      expect(viewSwitcher).toBeTruthy()
    })

    it('should show ViewSwitcher on Timeline view', () => {
      window.location.hash = '#/timeline'

      const { container } = render(App)

      const viewSwitcher = container.querySelector('.view-switcher')
      expect(viewSwitcher).toBeTruthy()
    })

    it('should show ViewSwitcher on Radial view', () => {
      window.location.hash = '#/radial'

      const { container } = render(App)

      const viewSwitcher = container.querySelector('.view-switcher')
      expect(viewSwitcher).toBeTruthy()
    })

    it('should NOT have a ListView tab in ViewSwitcher', () => {
      window.location.hash = '#/pedigree'

      const { container } = render(App)

      const viewSwitcher = container.querySelector('.view-switcher')
      expect(viewSwitcher).toBeTruthy()

      // Check that there's no link to #/list
      const listLink = container.querySelector('a[href="#/list"]')
      expect(listLink).toBeFalsy()

      // Verify expected tabs exist: Pedigree, Tree, Timeline, Radial, Network, Duplicates, Import, Admin (Add Person is a button)
      const tabs = container.querySelectorAll('.view-tab')
      expect(tabs.length).toBe(8) // Pedigree, Tree, Timeline, Radial, Network, Duplicates, Import, Admin (Story #140)

      // Verify tab labels
      const tabLabels = Array.from(tabs).map(tab =>
        tab.querySelector('.label')?.textContent || ''
      )
      expect(tabLabels).toContain('Pedigree')
      expect(tabLabels).toContain('Tree') // Story #140 - TreeView re-added
      expect(tabLabels).toContain('Timeline')
      expect(tabLabels).toContain('Radial')
      expect(tabLabels).toContain('Network')
      expect(tabLabels).toContain('Duplicates')
      expect(tabLabels).toContain('Import')
      expect(tabLabels).toContain('Admin')
      expect(tabLabels).not.toContain('List')
    })
  })

  describe('No Broken Imports', () => {
    it('should render App without errors when navigating between views', async () => {
      // Test multiple route changes to ensure no import errors
      const routes = ['#/pedigree', '#/timeline', '#/radial', '#/list', '#/']

      for (const route of routes) {
        window.location.hash = route
        const { container } = render(App)

        // Should render without throwing errors
        expect(container).toBeTruthy()

        // Should have main element
        const main = container.querySelector('main')
        expect(main).toBeTruthy()

        // Should have h1 with "Family Tree"
        const h1 = main.querySelector('h1')
        expect(h1?.textContent).toBe('Family Tree')
      }
    })

    it('should not have any console errors about missing ListView component', () => {
      // This test verifies that the app doesn't try to import ListView
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      window.location.hash = '#/list'
      render(App)

      // Should not have any errors about ListView not being found
      const listViewErrors = consoleErrorSpy.mock.calls.filter(call =>
        call.some(arg => String(arg).toLowerCase().includes('listview'))
      )
      expect(listViewErrors.length).toBe(0)

      consoleErrorSpy.mockRestore()
    })
  })
})
