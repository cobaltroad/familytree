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
import App from './App.svelte'
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

  describe('Tree View Removal', () => {
    it('should NOT render TreeView for #/tree hash', () => {
      window.location.hash = '#/tree'

      const { container } = render(App)

      // Should NOT render tree view
      const treeContainer = container.querySelector('.tree-container')
      expect(treeContainer).toBeFalsy()

      // Should redirect to pedigree view
      const pedigreeContainer = container.querySelector('.pedigree-container')
      expect(pedigreeContainer).toBeTruthy()
    })

    it('should NOT import TreeView component', () => {
      // This test verifies that TreeView is not imported in App.svelte
      // We'll check this by ensuring the component doesn't exist
      window.location.hash = '#/tree'

      const { container } = render(App)

      // Tree container should not exist
      const treeContainer = container.querySelector('.tree-container')
      expect(treeContainer).toBeFalsy()
    })
  })

  describe('Pedigree Route Mapping', () => {
    it('should render PedigreeView for #/pedigree', () => {
      window.location.hash = '#/pedigree'

      const { container } = render(App)

      const pedigreeContainer = container.querySelector('.pedigree-container')
      expect(pedigreeContainer).toBeTruthy()
    })

    it('should map "/" and "/tree" to pedigree view', () => {
      // Test "/" mapping
      window.location.hash = ''
      let { container } = render(App)
      let pedigreeContainer = container.querySelector('.pedigree-container')
      expect(pedigreeContainer).toBeTruthy()

      // Test "/tree" mapping (should redirect to pedigree)
      window.location.hash = '#/tree'
      const result2 = render(App)
      pedigreeContainer = result2.container.querySelector('.pedigree-container')
      expect(pedigreeContainer).toBeTruthy()
    })
  })

  describe('Other Routes Still Work', () => {
    it('should render TimelineView for #/timeline', () => {
      window.location.hash = '#/timeline'

      const { container } = render(App)

      const timelineContainer = container.querySelector('.timeline-container')
      expect(timelineContainer).toBeTruthy()

      // Should NOT render pedigree
      const pedigreeContainer = container.querySelector('.pedigree-container')
      expect(pedigreeContainer).toBeFalsy()
    })

    it('should render RadialView for #/radial', () => {
      window.location.hash = '#/radial'

      const { container } = render(App)

      const radialContainer = container.querySelector('.radial-container')
      expect(radialContainer).toBeTruthy()

      // Should NOT render pedigree
      const pedigreeContainer = container.querySelector('.pedigree-container')
      expect(pedigreeContainer).toBeFalsy()
    })

    it('should render ListView for #/list', () => {
      window.location.hash = '#/list'

      const { container } = render(App)

      // List view has different structure, check for form elements
      const listContainer = container.querySelector('.list-container') ||
                           container.querySelector('form')
      expect(listContainer).toBeTruthy()

      // Should NOT render pedigree
      const pedigreeContainer = container.querySelector('.pedigree-container')
      expect(pedigreeContainer).toBeFalsy()
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
