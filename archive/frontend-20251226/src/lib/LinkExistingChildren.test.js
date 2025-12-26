/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, screen, waitFor } from '@testing-library/svelte'
import { get } from 'svelte/store'
import LinkExistingChildren from './LinkExistingChildren.svelte'
import { people, relationships } from '../stores/familyStore.js'

describe('LinkExistingChildren', () => {
  const mockParent = {
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    birthDate: '1970-01-01',
    gender: 'male'
  }

  const mockPeople = [
    mockParent,
    { id: 2, firstName: 'Jane', lastName: 'Doe', birthDate: '1972-01-01', gender: 'female' },
    { id: 3, firstName: 'Alice', lastName: 'Doe', birthDate: '2000-01-01', gender: 'female' }, // Valid child
    { id: 4, firstName: 'Bob', lastName: 'Doe', birthDate: '2005-01-01', gender: 'male' }, // Valid child
    { id: 5, firstName: 'Charlie', lastName: 'Doe', birthDate: '1965-01-01', gender: 'male' }, // Too old
  ]

  const mockRelationships = []

  const mockApi = {
    createRelationship: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    people.set(mockPeople)
    relationships.set(mockRelationships)
    mockApi.createRelationship.mockResolvedValue({ id: 100, person1Id: 1, person2Id: 3, type: 'parentOf', parentRole: 'father' })
  })

  describe('Rendering', () => {
    it('should render component with heading', () => {
      render(LinkExistingChildren, { props: { parent: mockParent } })
      expect(screen.getByText(/Link Existing Person\(s\) as Children/i)).toBeTruthy()
    })

    it('should render parent role selector', () => {
      render(LinkExistingChildren, { props: { parent: mockParent } })
      expect(screen.getByLabelText(/Mother/i)).toBeTruthy()
      expect(screen.getByLabelText(/Father/i)).toBeTruthy()
    })

    it('should pre-select parent role based on gender (male)', () => {
      const { container } = render(LinkExistingChildren, { props: { parent: mockParent } })
      const fatherRadio = container.querySelector('input[value="father"]')
      expect(fatherRadio.checked).toBe(true)
    })

    it('should pre-select parent role based on gender (female)', () => {
      const femaleParent = { ...mockParent, gender: 'female' }
      const { container } = render(LinkExistingChildren, { props: { parent: femaleParent } })
      const motherRadio = container.querySelector('input[value="mother"]')
      expect(motherRadio.checked).toBe(true)
    })

    it('should not pre-select role for non-binary gender', () => {
      const nonBinaryParent = { ...mockParent, gender: 'other' }
      const { container } = render(LinkExistingChildren, { props: { parent: nonBinaryParent } })
      const motherRadio = container.querySelector('input[value="mother"]')
      const fatherRadio = container.querySelector('input[value="father"]')
      expect(motherRadio.checked).toBe(false)
      expect(fatherRadio.checked).toBe(false)
    })

    it('should render PersonMultiSelect component', () => {
      const { container } = render(LinkExistingChildren, { props: { parent: mockParent } })
      const multiSelect = container.querySelector('.person-multi-select')
      expect(multiSelect).toBeTruthy()
    })

    it('should render disabled Link button when no children selected', () => {
      render(LinkExistingChildren, { props: { parent: mockParent } })
      const linkButton = screen.getByText(/Link Selected Children/i)
      expect(linkButton).toBeTruthy()
      expect(linkButton.disabled).toBe(true)
    })

    it('should render help text', () => {
      render(LinkExistingChildren, { props: { parent: mockParent } })
      expect(screen.getByText(/Search and select one or more people/i)).toBeTruthy()
    })
  })

  describe('Parent Role Selection', () => {
    it('should allow changing parent role from father to mother', async () => {
      const { container } = render(LinkExistingChildren, { props: { parent: mockParent } })
      const motherRadio = container.querySelector('input[value="mother"]')

      await fireEvent.click(motherRadio)

      expect(motherRadio.checked).toBe(true)
    })

    it('should require parent role selection before linking', async () => {
      const nonBinaryParent = { ...mockParent, gender: 'other' }
      render(LinkExistingChildren, { props: { parent: nonBinaryParent, api: mockApi } })

      // Try to link without selecting role (button should be disabled)
      const linkButton = screen.getByText(/Link Selected Children/i)
      expect(linkButton.disabled).toBe(true)
    })
  })

  describe('Child Selection', () => {
    it('should enable Link button when children are selected and role is chosen', async () => {
      const { container } = render(LinkExistingChildren, { props: { parent: mockParent, api: mockApi } })

      // Open dropdown and select a child
      const input = container.querySelector('input[type="text"]')
      await fireEvent.focus(input)
      const options = container.querySelectorAll('[role="option"]')

      // Click first valid option
      await fireEvent.click(options[0])

      // Link button should now be enabled
      await waitFor(() => {
        const linkButton = screen.getByText(/Link Selected Children/i)
        expect(linkButton.disabled).toBe(false)
      })
    })

    it('should filter out invalid children', async () => {
      const { container } = render(LinkExistingChildren, { props: { parent: mockParent } })

      // Open dropdown
      const input = container.querySelector('input[type="text"]')
      await fireEvent.focus(input)

      // Should NOT include parent themselves (John Doe)
      expect(screen.queryByText(/John Doe/)).toBeFalsy()

      // Should NOT include people too old to be children (Charlie)
      expect(screen.queryByText(/Charlie Doe/)).toBeFalsy()

      // Should include valid children
      expect(screen.getByText(/Alice Doe/)).toBeTruthy()
      expect(screen.getByText(/Bob Doe/)).toBeTruthy()
    })
  })

  describe('Linking Children', () => {
    it('should create relationships for all selected children', async () => {
      mockApi.createRelationship
        .mockResolvedValueOnce({ id: 101, person1Id: 1, person2Id: 3, type: 'parentOf', parentRole: 'father' })
        .mockResolvedValueOnce({ id: 102, person1Id: 1, person2Id: 4, type: 'parentOf', parentRole: 'father' })

      const { container } = render(LinkExistingChildren, { props: { parent: mockParent, api: mockApi } })

      // Open dropdown and select multiple children
      const input = container.querySelector('input[type="text"]')
      await fireEvent.focus(input)
      const options = container.querySelectorAll('[role="option"]')

      await fireEvent.click(options[0]) // Alice
      await fireEvent.click(options[1]) // Bob

      // Click Link button
      const linkButton = screen.getByText(/Link Selected Children/i)
      await fireEvent.click(linkButton)

      // Should call API for each child
      await waitFor(() => {
        expect(mockApi.createRelationship).toHaveBeenCalledTimes(2)
        expect(mockApi.createRelationship).toHaveBeenCalledWith({
          person1Id: 1,
          person2Id: 3,
          type: 'father'
        })
        expect(mockApi.createRelationship).toHaveBeenCalledWith({
          person1Id: 1,
          person2Id: 4,
          type: 'father'
        })
      })
    })

    it('should use mother role when selected', async () => {
      mockApi.createRelationship.mockResolvedValue({ id: 101, person1Id: 1, person2Id: 3, type: 'parentOf', parentRole: 'mother' })

      const { container } = render(LinkExistingChildren, { props: { parent: mockParent, api: mockApi } })

      // Select mother role
      const motherRadio = container.querySelector('input[value="mother"]')
      await fireEvent.click(motherRadio)

      // Select a child
      const input = container.querySelector('input[type="text"]')
      await fireEvent.focus(input)
      const options = container.querySelectorAll('[role="option"]')
      await fireEvent.click(options[0])

      // Click Link button
      const linkButton = screen.getByText(/Link Selected Children/i)
      await fireEvent.click(linkButton)

      await waitFor(() => {
        expect(mockApi.createRelationship).toHaveBeenCalledWith({
          person1Id: 1,
          person2Id: 3,
          type: 'mother'
        })
      })
    })

    it('should update stores with new relationships on success', async () => {
      mockApi.createRelationship.mockResolvedValue({ id: 101, person1Id: 1, person2Id: 3, type: 'parentOf', parentRole: 'father' })

      const { container } = render(LinkExistingChildren, { props: { parent: mockParent, api: mockApi } })

      const input = container.querySelector('input[type="text"]')
      await fireEvent.focus(input)
      const options = container.querySelectorAll('[role="option"]')
      await fireEvent.click(options[0])

      const linkButton = screen.getByText(/Link Selected Children/i)
      await fireEvent.click(linkButton)

      await waitFor(() => {
        const currentRelationships = get(relationships)
        expect(currentRelationships.length).toBe(1)
        expect(currentRelationships[0].person1Id).toBe(1)
        expect(currentRelationships[0].person2Id).toBe(3)
      })
    })

    it('should clear selections after successful linking', async () => {
      mockApi.createRelationship.mockResolvedValue({ id: 101, person1Id: 1, person2Id: 3, type: 'parentOf', parentRole: 'father' })

      const { container } = render(LinkExistingChildren, { props: { parent: mockParent, api: mockApi } })

      const input = container.querySelector('input[type="text"]')
      await fireEvent.focus(input)
      const options = container.querySelectorAll('[role="option"]')
      await fireEvent.click(options[0])

      const linkButton = screen.getByText(/Link Selected Children/i)
      await fireEvent.click(linkButton)

      await waitFor(() => {
        // Button should be disabled again (no selections)
        expect(linkButton.disabled).toBe(true)
        // Badge should not show
        const badge = container.querySelector('.selection-badge')
        expect(badge).toBeFalsy()
      })
    })
  })

  describe('Error Handling - Partial Failures', () => {
    it('should handle partial success (some children link, others fail)', async () => {
      mockApi.createRelationship
        .mockResolvedValueOnce({ id: 101, person1Id: 1, person2Id: 3, type: 'parentOf', parentRole: 'father' })
        .mockRejectedValueOnce(new Error('Failed to create relationship'))

      const { container } = render(LinkExistingChildren, { props: { parent: mockParent, api: mockApi } })

      const input = container.querySelector('input[type="text"]')
      await fireEvent.focus(input)
      const options = container.querySelectorAll('[role="option"]')
      await fireEvent.click(options[0]) // Alice - will succeed
      await fireEvent.click(options[1]) // Bob - will fail

      const linkButton = screen.getByText(/Link Selected Children/i)
      await fireEvent.click(linkButton)

      await waitFor(() => {
        // Should have called API twice
        expect(mockApi.createRelationship).toHaveBeenCalledTimes(2)

        // Should have one successful relationship in store
        const currentRelationships = get(relationships)
        expect(currentRelationships.length).toBe(1)
        expect(currentRelationships[0].person2Id).toBe(3) // Alice succeeded
      })
    })

    it('should dispatch success event with count', async () => {
      mockApi.createRelationship
        .mockResolvedValueOnce({ id: 101, person1Id: 1, person2Id: 3, type: 'parentOf', parentRole: 'father' })
        .mockResolvedValueOnce({ id: 102, person1Id: 1, person2Id: 4, type: 'parentOf', parentRole: 'father' })

      const { component, container } = render(LinkExistingChildren, { props: { parent: mockParent, api: mockApi } })

      const successSpy = vi.fn()
      component.$on('success', successSpy)

      const input = container.querySelector('input[type="text"]')
      await fireEvent.focus(input)
      const options = container.querySelectorAll('[role="option"]')
      await fireEvent.click(options[0])
      await fireEvent.click(options[1])

      const linkButton = screen.getByText(/Link Selected Children/i)
      await fireEvent.click(linkButton)

      await waitFor(() => {
        expect(successSpy).toHaveBeenCalledTimes(1)
        expect(successSpy.mock.calls[0][0].detail).toEqual({
          successCount: 2,
          failureCount: 0,
          total: 2
        })
      })
    })

    it('should dispatch error event with count on failures', async () => {
      mockApi.createRelationship
        .mockResolvedValueOnce({ id: 101, person1Id: 1, person2Id: 3, type: 'parentOf', parentRole: 'father' })
        .mockRejectedValueOnce(new Error('Failed'))

      const { component, container } = render(LinkExistingChildren, { props: { parent: mockParent, api: mockApi } })

      const errorSpy = vi.fn()
      component.$on('error', errorSpy)

      const input = container.querySelector('input[type="text"]')
      await fireEvent.focus(input)
      const options = container.querySelectorAll('[role="option"]')
      await fireEvent.click(options[0])
      await fireEvent.click(options[1])

      const linkButton = screen.getByText(/Link Selected Children/i)
      await fireEvent.click(linkButton)

      await waitFor(() => {
        expect(errorSpy).toHaveBeenCalledTimes(1)
        expect(errorSpy.mock.calls[0][0].detail).toEqual({
          successCount: 1,
          failureCount: 1,
          total: 2
        })
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      const { container } = render(LinkExistingChildren, { props: { parent: mockParent } })

      const radioGroup = container.querySelector('[role="radiogroup"]')
      expect(radioGroup).toBeTruthy()
      expect(radioGroup.getAttribute('aria-label')).toContain('Parent role')
    })

    it('should have screen reader live region', () => {
      const { container } = render(LinkExistingChildren, { props: { parent: mockParent } })
      const liveRegion = container.querySelector('[role="status"][aria-live="polite"]')
      expect(liveRegion).toBeTruthy()
    })
  })
})
