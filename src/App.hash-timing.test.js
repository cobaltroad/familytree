/**
 * TDD Test Suite: Hash-based routing must work on initial render
 *
 * RED PHASE: This test will fail because currentPath is only initialized in onMount,
 * which happens AFTER the initial render. This means the component always renders
 * PedigreeView first (currentPath defaults to '/'), even if the hash is different.
 *
 * GREEN PHASE: Fix by reading window.location.hash at the top level of the script,
 * before the component renders, so the correct view shows immediately.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render } from '@testing-library/svelte'
import App from './routes/+page.svelte'
import { people, relationships } from './stores/familyStore.js'

// Mock API
vi.mock('./lib/api', () => ({
  api: {
    getAllPeople: vi.fn(() => Promise.resolve([])),
    getAllRelationships: vi.fn(() => Promise.resolve([]))
  }
}))

describe('Hash-based Routing Timing (TDD)', () => {
  beforeEach(() => {
    people.set([])
    relationships.set([])
    window.location.hash = ''
  })

  describe('RED Phase - Hash must be read before initial render', () => {
    it('should render TimelineView immediately when hash is #/timeline', () => {
      // Set hash BEFORE rendering
      window.location.hash = '#/timeline'

      const { container } = render(App)

      // The component should read the hash BEFORE initial render
      // and show TimelineView immediately (not PedigreeView)
      const timelineContainer = container.querySelector('.timeline-container')
      expect(timelineContainer).toBeTruthy()

      // Should NOT render pedigree view
      const pedigreeContainer = container.querySelector('.pedigree-container')
      expect(pedigreeContainer).toBeFalsy()
    })

    it('should render RadialView immediately when hash is #/radial', () => {
      // Set hash BEFORE rendering
      window.location.hash = '#/radial'

      const { container } = render(App)

      // The component should read the hash BEFORE initial render
      // and show RadialView immediately (not PedigreeView)
      const radialContainer = container.querySelector('.radial-container')
      expect(radialContainer).toBeTruthy()

      // Should NOT render pedigree view
      const pedigreeContainer = container.querySelector('.pedigree-container')
      expect(pedigreeContainer).toBeFalsy()
    })

    it('should render PedigreeView immediately when hash is #/pedigree', () => {
      // Set hash BEFORE rendering
      window.location.hash = '#/pedigree'

      const { container } = render(App)

      // Should render pedigree view
      const pedigreeContainer = container.querySelector('.pedigree-container')
      expect(pedigreeContainer).toBeTruthy()

      // Should NOT render other views
      const timelineContainer = container.querySelector('.timeline-container')
      const radialContainer = container.querySelector('.radial-container')
      expect(timelineContainer).toBeFalsy()
      expect(radialContainer).toBeFalsy()
    })

    it('should render PedigreeView by default when hash is empty', () => {
      // No hash set (empty string)
      window.location.hash = ''

      const { container } = render(App)

      // Should default to pedigree view
      const pedigreeContainer = container.querySelector('.pedigree-container')
      expect(pedigreeContainer).toBeTruthy()
    })

    it('should redirect #/list to PedigreeView immediately', () => {
      window.location.hash = '#/list'

      const { container } = render(App)

      // Should redirect to pedigree view
      const pedigreeContainer = container.querySelector('.pedigree-container')
      expect(pedigreeContainer).toBeTruthy()

      // Should NOT render list view
      const listContainer = container.querySelector('.list-container')
      expect(listContainer).toBeFalsy()
    })

    it('should render TreeView immediately when hash is #/tree', () => {
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

  describe('Technical Root Cause', () => {
    it('should NOT rely on onMount to initialize currentPath', () => {
      // This test documents the root cause:
      // If currentPath is only initialized in onMount (which runs AFTER render),
      // the component will always render the default view first, then switch.
      //
      // SOLUTION: Initialize currentPath at the top level of the script block,
      // before any rendering happens, by reading window.location.hash directly.

      window.location.hash = '#/timeline'

      const { container } = render(App)

      // If this fails, it means currentPath was initialized too late (in onMount)
      const timelineContainer = container.querySelector('.timeline-container')
      expect(timelineContainer).toBeTruthy()
    })
  })
})
