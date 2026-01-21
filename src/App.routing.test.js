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

describe('App.svelte - Tree as Default View (TDD)', () => {
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

  describe('Default Route - Tree View', () => {
    it('should render TreeView by default (empty hash)', () => {
      window.location.hash = ''

      const { container } = render(App)

      // Should render tree view (has tree-container class)
      const treeContainer = container.querySelector('.tree-container')
      expect(treeContainer).toBeTruthy()

      // Should NOT render pedigree view
      const pedigreeContainer = container.querySelector('.pedigree-container')
      expect(pedigreeContainer).toBeFalsy()
    })

    it('should render TreeView for #/ hash', () => {
      window.location.hash = '#/'

      const { container } = render(App)

      // Should render tree view (has tree-container class)
      const treeContainer = container.querySelector('.tree-container')
      expect(treeContainer).toBeTruthy()

      // Should NOT render pedigree view
      const pedigreeContainer = container.querySelector('.pedigree-container')
      expect(pedigreeContainer).toBeFalsy()
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

  })

  describe('Removed Views Redirect to Tree', () => {
    it('should redirect #/timeline to TreeView (TimelineView removed)', () => {
      window.location.hash = '#/timeline'

      const { container } = render(App)

      // Should redirect to tree view
      const treeContainer = container.querySelector('.tree-container')
      expect(treeContainer).toBeTruthy()

      // Should NOT render timeline view
      const timelineContainer = container.querySelector('.timeline-container')
      expect(timelineContainer).toBeFalsy()
    })

    it('should redirect #/radial to TreeView (RadialView removed)', () => {
      window.location.hash = '#/radial'

      const { container } = render(App)

      // Should redirect to tree view
      const treeContainer = container.querySelector('.tree-container')
      expect(treeContainer).toBeTruthy()

      // Should NOT render radial view
      const radialContainer = container.querySelector('.radial-container')
      expect(radialContainer).toBeFalsy()
    })

    it('should redirect #/list to TreeView (ListView removed)', () => {
      window.location.hash = '#/list'

      const { container } = render(App)

      // Should redirect to tree view
      const treeContainer = container.querySelector('.tree-container')
      expect(treeContainer).toBeTruthy()

      // Should NOT render list view
      const listContainer = container.querySelector('.list-container')
      expect(listContainer).toBeFalsy()
    })
  })

  describe('Unknown Routes', () => {
    it('should render TreeView for unknown routes', () => {
      window.location.hash = '#/unknown'

      const { container } = render(App)

      // Should fallback to tree view
      const treeContainer = container.querySelector('.tree-container')
      expect(treeContainer).toBeTruthy()
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
