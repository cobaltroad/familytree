/**
 * TDD Test Suite: Remove TreeView and Make PedigreeView Default
 *
 * RED PHASE: These tests will fail initially because:
 * - TreeView is still present in the app
 * - Default route still points to TreeView
 * - ViewSwitcher still shows Tree tab
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/svelte'
import { get } from 'svelte/store'
import App from './routes/+page.svelte'
import { people, relationships } from './stores/familyStore.js'

describe('App.svelte - Pedigree as Default View (TDD)', () => {
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

  describe('Default Route - Pedigree View', () => {
    it('should render PedigreeView by default (empty hash)', () => {
      window.location.hash = ''

      const { container } = render(App)

      // Should render pedigree view (has pedigree-container class)
      const pedigreeContainer = container.querySelector('.pedigree-container')
      expect(pedigreeContainer).toBeTruthy()

      // Should NOT render tree view
      const treeContainer = container.querySelector('.tree-container')
      expect(treeContainer).toBeFalsy()
    })

    it('should render PedigreeView for #/ hash', () => {
      window.location.hash = '#/'

      const { container } = render(App)

      // Should render pedigree view
      const pedigreeContainer = container.querySelector('.pedigree-container')
      expect(pedigreeContainer).toBeTruthy()

      // Should NOT render tree view
      const treeContainer = container.querySelector('.tree-container')
      expect(treeContainer).toBeFalsy()
    })

    it('should normalize "/" path to pedigree view', () => {
      window.location.hash = ''

      const { container } = render(App)

      // Normalized path should be '/pedigree'
      const pedigreeContainer = container.querySelector('.pedigree-container')
      expect(pedigreeContainer).toBeTruthy()
    })
  })

  describe('Tree View (Story #140)', () => {
    it('should render TreeView for #/tree hash', () => {
      window.location.hash = '#/tree'

      const { container } = render(App)

      // Should render tree view (Story #140 - TreeView re-added)
      const treeContainer = container.querySelector('.tree-container')
      expect(treeContainer).toBeTruthy()

      // Should NOT render pedigree view
      const pedigreeContainer = container.querySelector('.pedigree-container')
      expect(pedigreeContainer).toBeFalsy()
    })

    it('should import TreeView component', () => {
      // This test verifies that TreeView is imported in App.svelte
      window.location.hash = '#/tree'

      const { container } = render(App)

      // Tree container should exist
      const treeContainer = container.querySelector('.tree-container')
      expect(treeContainer).toBeTruthy()
    })
  })

  describe('Pedigree Route Mapping', () => {
    it('should render PedigreeView for #/pedigree', () => {
      window.location.hash = '#/pedigree'

      const { container } = render(App)

      const pedigreeContainer = container.querySelector('.pedigree-container')
      expect(pedigreeContainer).toBeTruthy()
    })

    it('should map "/" to pedigree view', () => {
      // Test "/" mapping
      window.location.hash = ''
      let { container } = render(App)
      let pedigreeContainer = container.querySelector('.pedigree-container')
      expect(pedigreeContainer).toBeTruthy()
    })

    it('should map "/tree" to tree view (Story #140)', () => {
      // Test "/tree" mapping (no longer redirects to pedigree)
      window.location.hash = '#/tree'
      const { container } = render(App)
      const treeContainer = container.querySelector('.tree-container')
      expect(treeContainer).toBeTruthy()
    })
  })

  describe('Removed Views Redirect to Pedigree', () => {
    it('should redirect #/timeline to PedigreeView (TimelineView removed)', () => {
      window.location.hash = '#/timeline'

      const { container } = render(App)

      // Should redirect to pedigree view
      const pedigreeContainer = container.querySelector('.pedigree-container')
      expect(pedigreeContainer).toBeTruthy()

      // Should NOT render timeline view
      const timelineContainer = container.querySelector('.timeline-container')
      expect(timelineContainer).toBeFalsy()
    })

    it('should redirect #/radial to PedigreeView (RadialView removed)', () => {
      window.location.hash = '#/radial'

      const { container } = render(App)

      // Should redirect to pedigree view
      const pedigreeContainer = container.querySelector('.pedigree-container')
      expect(pedigreeContainer).toBeTruthy()

      // Should NOT render radial view
      const radialContainer = container.querySelector('.radial-container')
      expect(radialContainer).toBeFalsy()
    })

    it('should redirect #/list to PedigreeView (ListView removed)', () => {
      window.location.hash = '#/list'

      const { container } = render(App)

      // Should redirect to pedigree view
      const pedigreeContainer = container.querySelector('.pedigree-container')
      expect(pedigreeContainer).toBeTruthy()

      // Should NOT render list view
      const listContainer = container.querySelector('.list-container')
      expect(listContainer).toBeFalsy()
    })
  })

  describe('Unknown Routes', () => {
    it('should render PedigreeView for unknown routes', () => {
      window.location.hash = '#/unknown'

      const { container } = render(App)

      // Should fallback to pedigree view
      const pedigreeContainer = container.querySelector('.pedigree-container')
      expect(pedigreeContainer).toBeTruthy()

      // Should NOT render tree view
      const treeContainer = container.querySelector('.tree-container')
      expect(treeContainer).toBeFalsy()
    })
  })

  describe('Hash Change Handling', () => {
    it('should handle hash change event listener correctly', () => {
      // Verify that the app sets up hash change handling
      const { component } = render(App)

      // This test just verifies the component renders without errors
      // Hash change behavior is tested by the other route tests
      expect(component).toBeTruthy()
    })
  })
})
