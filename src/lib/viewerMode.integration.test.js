/**
 * Integration tests for Viewer Mode
 *
 * These tests verify that the entire viewer mode system works correctly
 * across multiple components when VITE_VIEWER_MODE is enabled.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/svelte'
import { get } from 'svelte/store'
import { people, relationships } from '../stores/familyStore.js'
import { modal } from '../stores/modalStore.js'
import * as viewerModeStore from '../stores/viewerModeStore.js'

describe('Viewer Mode Integration', () => {
  const mockPeople = [
    { id: 1, firstName: 'John', lastName: 'Doe', gender: 'male', birthDate: '1950-01-15', deathDate: null },
    { id: 2, firstName: 'Jane', lastName: 'Smith', gender: 'female', birthDate: '1975-06-10', deathDate: null }
  ]

  const mockRelationships = [
    { id: 1, person1Id: 1, person2Id: 2, type: 'father', parentRole: 'father' }
  ]

  beforeEach(() => {
    people.set(mockPeople)
    relationships.set(mockRelationships)
    modal.close()
  })

  describe('ViewSwitcher in Viewer Mode', () => {
    it('should only display viewer-compatible tabs', async () => {
      // Mock viewer mode as enabled
      vi.spyOn(viewerModeStore, 'isViewerMode', 'get').mockReturnValue({ subscribe: (fn) => {
        fn(true)
        return () => {}
      }})

      const ViewSwitcher = (await import('./ViewSwitcher.svelte')).default

      render(ViewSwitcher, { props: { currentPath: '/tree' } })

      // Tree tab should be visible
      expect(screen.getByText('Tree')).toBeTruthy()

      // Edit-dependent tabs should be hidden
      expect(screen.queryByText('Admin')).toBeNull()
      expect(screen.queryByText('Import')).toBeNull()
      expect(screen.queryByText('Duplicates')).toBeNull()

      // Add Person button should be hidden
      expect(screen.queryByText(/add person/i)).toBeNull()
    })
  })

  describe('PersonModal in Viewer Mode', () => {
    it('should not render modal when opened in viewer mode', async () => {
      // Mock viewer mode as enabled
      vi.spyOn(viewerModeStore, 'isViewerMode', 'get').mockReturnValue({ subscribe: (fn) => {
        fn(true)
        return () => {}
      }})

      // Mock $app/stores for PersonModal
      vi.mock('$app/stores', () => ({
        page: {
          subscribe: (fn) => {
            fn({ data: { session: null } })
            return () => {}
          }
        }
      }))

      const PersonModal = (await import('./PersonModal.svelte')).default

      // Try to open modal
      modal.open(1, 'edit')

      const { container } = render(PersonModal)

      // Modal should not be rendered
      const modalBackdrop = container.querySelector('.modal-backdrop')
      expect(modalBackdrop).toBeNull()
    })
  })

  describe('Viewer Mode Store', () => {
    it('should provide consistent state across components', async () => {
      // Mock viewer mode as enabled
      vi.stubEnv('VITE_VIEWER_MODE', 'true')

      const { isViewerMode } = await import('../stores/viewerModeStore.js')

      // Store should return true
      expect(get(isViewerMode)).toBe(true)

      // Multiple subscriptions should get the same value
      let value1 = null
      let value2 = null

      const unsubscribe1 = isViewerMode.subscribe(v => { value1 = v })
      const unsubscribe2 = isViewerMode.subscribe(v => { value2 = v })

      expect(value1).toBe(true)
      expect(value2).toBe(true)

      unsubscribe1()
      unsubscribe2()
    })
  })

  describe('Complete Viewer Mode Workflow', () => {
    it('should prevent all editing operations when viewer mode is enabled', async () => {
      // Mock viewer mode as enabled
      vi.spyOn(viewerModeStore, 'isViewerMode', 'get').mockReturnValue({ subscribe: (fn) => {
        fn(true)
        return () => {}
      }})

      // 1. ViewSwitcher should hide edit controls
      const ViewSwitcher = (await import('./ViewSwitcher.svelte')).default
      const viewSwitcherContainer = render(ViewSwitcher, { props: { currentPath: '/tree' } }).container

      expect(viewSwitcherContainer.querySelector('button[aria-label*="Add"]')).toBeNull()

      // 2. PersonModal should not render
      vi.mock('$app/stores', () => ({
        page: {
          subscribe: (fn) => {
            fn({ data: { session: null } })
            return () => {}
          }
        }
      }))

      const PersonModal = (await import('./PersonModal.svelte')).default
      modal.open(1, 'edit')

      const personModalContainer = render(PersonModal).container
      expect(personModalContainer.querySelector('.modal-backdrop')).toBeNull()

      // 3. Modal store state should still work (just prevented from rendering)
      expect(get(modal).isOpen).toBe(true)
      expect(get(modal).personId).toBe(1)
    })
  })

  describe('Viewer Mode Feature Flags', () => {
    it('should enable all features when viewer mode is disabled', async () => {
      // Mock viewer mode as disabled
      vi.spyOn(viewerModeStore, 'isViewerMode', 'get').mockReturnValue({ subscribe: (fn) => {
        fn(false)
        return () => {}
      }})

      const ViewSwitcher = (await import('./ViewSwitcher.svelte')).default

      render(ViewSwitcher, { props: { currentPath: '/tree' } })

      // All tabs should be visible
      expect(screen.getByText('Tree')).toBeTruthy()
      expect(screen.getByText('Admin')).toBeTruthy()
      expect(screen.getByText('Import')).toBeTruthy()
      expect(screen.getByText('Duplicates')).toBeTruthy()

      // Add Person button should be visible
      expect(screen.getByText(/add person/i)).toBeTruthy()
    })
  })
})
