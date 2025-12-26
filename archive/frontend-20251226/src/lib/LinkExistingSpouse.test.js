/**
 * Acceptance tests for LinkExistingSpouse.svelte component.
 *
 * Tests follow BDD acceptance criteria from issue #47:
 * - Display "Link Existing Person" button in Spouses section
 * - Show button even when spouses already exist (multiple spouses allowed)
 * - Autocomplete filtering and selection
 * - Create bidirectional spouse relationships (A→B and B→A atomically)
 * - Successful relationship creation with optimistic updates
 * - Error handling and rollback (both relationships or neither)
 * - Smart filtering (exclude ancestors, descendants, existing spouses, self)
 * - Keyboard navigation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, waitFor } from '@testing-library/svelte'
import { get } from 'svelte/store'
import LinkExistingSpouse from './LinkExistingSpouse.svelte'
import { people, relationships } from '../stores/familyStore.js'
import { relationshipsByPerson } from '../stores/derivedStores.js'

describe('LinkExistingSpouse', () => {
  const mockPerson = {
    id: 1,
    firstName: 'Alice',
    lastName: 'Smith',
    birthDate: '1970-01-01'
  }

  const mockPeople = [
    mockPerson,
    { id: 2, firstName: 'Bob', lastName: 'Johnson', birthDate: '1972-01-01' },
    { id: 3, firstName: 'Charlie', lastName: 'Williams', birthDate: '1995-01-01' }, // Child
    { id: 4, firstName: 'Diana', lastName: 'Brown', birthDate: '1950-01-01' }, // Mother
    { id: 5, firstName: 'Eve', lastName: 'Davis', birthDate: '1975-01-01' }, // Existing spouse
    { id: 6, firstName: 'Frank', lastName: 'Miller', birthDate: '1974-01-01' } // Valid candidate
  ]

  const mockRelationships = [
    { id: 101, person1Id: 4, person2Id: 1, type: 'parentOf', parentRole: 'mother' },
    { id: 102, person1Id: 1, person2Id: 3, type: 'parentOf', parentRole: 'mother' },
    { id: 103, person1Id: 1, person2Id: 5, type: 'spouse' }, // Alice → Eve
    { id: 104, person1Id: 5, person2Id: 1, type: 'spouse' }  // Eve → Alice (bidirectional)
  ]

  let mockApi

  beforeEach(() => {
    // Reset stores
    people.set(mockPeople)
    relationships.set(mockRelationships)

    // Create mock API
    mockApi = {
      createRelationship: vi.fn()
    }
  })

  describe('Component Rendering', () => {
    it('should render with heading and autocomplete', () => {
      const { getAllByText, getByRole } = render(LinkExistingSpouse, {
        props: {
          person: mockPerson,
          api: mockApi
        }
      })

      const headings = getAllByText('Link Existing Person as Spouse')
      expect(headings.length).toBeGreaterThan(0)
      expect(getByRole('combobox')).toBeTruthy()
    })

    it('should render help text explaining the feature', () => {
      const { getByText } = render(LinkExistingSpouse, {
        props: {
          person: mockPerson,
          api: mockApi
        }
      })

      expect(getByText(/Search and select a person to link as/)).toBeTruthy()
      expect(getByText(/spouse/)).toBeTruthy()
    })

    it('should show placeholder text in autocomplete', () => {
      const { getByRole } = render(LinkExistingSpouse, {
        props: {
          person: mockPerson,
          api: mockApi
        }
      })

      const input = getByRole('combobox')
      expect(input.placeholder).toContain('spouse')
    })
  })

  describe('Smart Filtering', () => {
    it('should exclude the person themselves from autocomplete', async () => {
      const { getByRole, queryByText } = render(LinkExistingSpouse, {
        props: {
          person: mockPerson,
          api: mockApi
        }
      })

      const input = getByRole('combobox')
      await fireEvent.focus(input)

      // Alice should not appear
      expect(queryByText('Alice Smith')).toBeFalsy()
    })

    it('should exclude existing spouses from autocomplete', async () => {
      const { getByRole, queryByText } = render(LinkExistingSpouse, {
        props: {
          person: mockPerson,
          api: mockApi
        }
      })

      const input = getByRole('combobox')
      await fireEvent.focus(input)

      // Eve (existing spouse) should not appear
      expect(queryByText(/Eve Davis/)).toBeFalsy()
    })

    it('should exclude descendants from autocomplete', async () => {
      const { getByRole, queryByText } = render(LinkExistingSpouse, {
        props: {
          person: mockPerson,
          api: mockApi
        }
      })

      const input = getByRole('combobox')
      await fireEvent.focus(input)

      // Charlie (child) should not appear
      expect(queryByText(/Charlie Williams/)).toBeFalsy()
    })

    it('should exclude ancestors from autocomplete', async () => {
      const { getByRole, queryByText } = render(LinkExistingSpouse, {
        props: {
          person: mockPerson,
          api: mockApi
        }
      })

      const input = getByRole('combobox')
      await fireEvent.focus(input)

      // Diana (mother) should not appear
      expect(queryByText(/Diana Brown/)).toBeFalsy()
    })

    it('should show valid candidates in autocomplete', async () => {
      const { getByRole, getByText } = render(LinkExistingSpouse, {
        props: {
          person: mockPerson,
          api: mockApi
        }
      })

      const input = getByRole('combobox')
      await fireEvent.focus(input)

      // Bob and Frank should appear (valid candidates)
      expect(getByText(/Bob Johnson/)).toBeTruthy()
      expect(getByText(/Frank Miller/)).toBeTruthy()
    })
  })

  describe('Bidirectional Relationship Creation', () => {
    it('should create two relationships when person is selected (A→B and B→A)', async () => {
      mockApi.createRelationship
        .mockResolvedValueOnce({ id: 201, person1Id: 1, person2Id: 2, type: 'spouse' })
        .mockResolvedValueOnce({ id: 202, person1Id: 2, person2Id: 1, type: 'spouse' })

      const { getByRole, getByText } = render(LinkExistingSpouse, {
        props: {
          person: mockPerson,
          api: mockApi
        }
      })

      const input = getByRole('combobox')
      await fireEvent.focus(input)

      // Select Bob
      const bobOption = getByText(/Bob Johnson/)
      await fireEvent.click(bobOption)

      await waitFor(() => {
        expect(mockApi.createRelationship).toHaveBeenCalledTimes(2)
      })

      // Verify first relationship (Alice → Bob)
      expect(mockApi.createRelationship).toHaveBeenCalledWith({
        person1Id: 1,
        person2Id: 2,
        type: 'spouse'
      })

      // Verify second relationship (Bob → Alice)
      expect(mockApi.createRelationship).toHaveBeenCalledWith({
        person1Id: 2,
        person2Id: 1,
        type: 'spouse'
      })
    })

    it('should add both relationships to store after successful API calls', async () => {
      const rel1 = { id: 201, person1Id: 1, person2Id: 2, type: 'spouse' }
      const rel2 = { id: 202, person1Id: 2, person2Id: 1, type: 'spouse' }

      mockApi.createRelationship
        .mockResolvedValueOnce(rel1)
        .mockResolvedValueOnce(rel2)

      const { getByRole, getByText } = render(LinkExistingSpouse, {
        props: {
          person: mockPerson,
          api: mockApi
        }
      })

      const initialRelCount = get(relationships).length

      const input = getByRole('combobox')
      await fireEvent.focus(input)

      const bobOption = getByText(/Bob Johnson/)
      await fireEvent.click(bobOption)

      await waitFor(() => {
        const currentRels = get(relationships)
        expect(currentRels.length).toBe(initialRelCount + 2)
      })

      const currentRels = get(relationships)
      expect(currentRels.some(r => r.id === 201 || r.id === 'temp-201')).toBeTruthy()
      expect(currentRels.some(r => r.id === 202 || r.id === 'temp-202')).toBeTruthy()
    })

    it('should dispatch success event with both relationships', async () => {
      const rel1 = { id: 201, person1Id: 1, person2Id: 2, type: 'spouse' }
      const rel2 = { id: 202, person1Id: 2, person2Id: 1, type: 'spouse' }

      mockApi.createRelationship
        .mockResolvedValueOnce(rel1)
        .mockResolvedValueOnce(rel2)

      const successHandler = vi.fn()

      const { getByRole, getByText, component } = render(LinkExistingSpouse, {
        props: {
          person: mockPerson,
          api: mockApi
        }
      })

      component.$on('success', successHandler)

      const input = getByRole('combobox')
      await fireEvent.focus(input)

      const bobOption = getByText(/Bob Johnson/)
      await fireEvent.click(bobOption)

      await waitFor(() => {
        expect(successHandler).toHaveBeenCalled()
      })

      const eventData = successHandler.mock.calls[0][0].detail
      expect(eventData.person1).toEqual(mockPerson)
      expect(eventData.person2.id).toBe(2)
      expect(eventData.relationships).toHaveLength(2)
    })
  })

  describe('Error Handling and Rollback', () => {
    it('should rollback both relationships if first API call fails', async () => {
      mockApi.createRelationship.mockRejectedValueOnce(new Error('Network error'))

      const { getByRole, getByText } = render(LinkExistingSpouse, {
        props: {
          person: mockPerson,
          api: mockApi
        }
      })

      const initialRels = get(relationships)

      const input = getByRole('combobox')
      await fireEvent.focus(input)

      const bobOption = getByText(/Bob Johnson/)
      await fireEvent.click(bobOption)

      await waitFor(() => {
        expect(mockApi.createRelationship).toHaveBeenCalled()
      })

      // Wait for error handling
      await new Promise(resolve => setTimeout(resolve, 100))

      // Relationships should be rolled back
      const currentRels = get(relationships)
      expect(currentRels).toEqual(initialRels)
    })

    it('should rollback both relationships if second API call fails', async () => {
      mockApi.createRelationship
        .mockResolvedValueOnce({ id: 201, person1Id: 1, person2Id: 2, type: 'spouse' })
        .mockRejectedValueOnce(new Error('Network error'))

      const { getByRole, getByText } = render(LinkExistingSpouse, {
        props: {
          person: mockPerson,
          api: mockApi
        }
      })

      const initialRels = get(relationships)

      const input = getByRole('combobox')
      await fireEvent.focus(input)

      const bobOption = getByText(/Bob Johnson/)
      await fireEvent.click(bobOption)

      await waitFor(() => {
        expect(mockApi.createRelationship).toHaveBeenCalledTimes(2)
      })

      // Wait for error handling
      await new Promise(resolve => setTimeout(resolve, 100))

      // Both relationships should be rolled back
      const currentRels = get(relationships)
      expect(currentRels).toEqual(initialRels)
    })

    it('should dispatch error event when relationship creation fails', async () => {
      mockApi.createRelationship.mockRejectedValueOnce(new Error('Network error'))

      const errorHandler = vi.fn()

      const { getByRole, getByText, component } = render(LinkExistingSpouse, {
        props: {
          person: mockPerson,
          api: mockApi
        }
      })

      component.$on('error', errorHandler)

      const input = getByRole('combobox')
      await fireEvent.focus(input)

      const bobOption = getByText(/Bob Johnson/)
      await fireEvent.click(bobOption)

      await waitFor(() => {
        expect(errorHandler).toHaveBeenCalled()
      })

      const eventData = errorHandler.mock.calls[0][0].detail
      expect(eventData.message).toContain('Network error')
    })
  })

  describe('Multiple Spouses Support', () => {
    it('should allow linking additional spouse when one already exists', async () => {
      // Alice already has Eve as spouse
      // Should be able to link Frank as second spouse

      mockApi.createRelationship
        .mockResolvedValueOnce({ id: 301, person1Id: 1, person2Id: 6, type: 'spouse' })
        .mockResolvedValueOnce({ id: 302, person1Id: 6, person2Id: 1, type: 'spouse' })

      const { getByRole, getByText } = render(LinkExistingSpouse, {
        props: {
          person: mockPerson,
          api: mockApi
        }
      })

      const input = getByRole('combobox')
      await fireEvent.focus(input)

      // Frank should appear as valid candidate
      const frankOption = getByText(/Frank Miller/)
      expect(frankOption).toBeTruthy()

      await fireEvent.click(frankOption)

      await waitFor(() => {
        expect(mockApi.createRelationship).toHaveBeenCalledTimes(2)
      })

      // Verify relationships for Frank
      expect(mockApi.createRelationship).toHaveBeenCalledWith({
        person1Id: 1,
        person2Id: 6,
        type: 'spouse'
      })
    })
  })

  describe('Keyboard Navigation', () => {
    it('should support keyboard navigation in autocomplete', async () => {
      const { getByRole } = render(LinkExistingSpouse, {
        props: {
          person: mockPerson,
          api: mockApi
        }
      })

      const input = getByRole('combobox')
      await fireEvent.focus(input)

      // Arrow down should open and navigate
      await fireEvent.keyDown(input, { key: 'ArrowDown' })
      expect(input.getAttribute('aria-expanded')).toBe('true')
    })

    it('should allow selection via Enter key', async () => {
      mockApi.createRelationship
        .mockResolvedValueOnce({ id: 201, person1Id: 1, person2Id: 2, type: 'spouse' })
        .mockResolvedValueOnce({ id: 202, person1Id: 2, person2Id: 1, type: 'spouse' })

      const { getByRole } = render(LinkExistingSpouse, {
        props: {
          person: mockPerson,
          api: mockApi
        }
      })

      const input = getByRole('combobox')
      await fireEvent.focus(input)

      // Navigate with arrow down
      await fireEvent.keyDown(input, { key: 'ArrowDown' })

      // Select with Enter
      await fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => {
        expect(mockApi.createRelationship).toHaveBeenCalled()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      const { getByRole } = render(LinkExistingSpouse, {
        props: {
          person: mockPerson,
          api: mockApi
        }
      })

      const input = getByRole('combobox')
      expect(input.getAttribute('aria-label')).toBeTruthy()
      expect(input.getAttribute('aria-autocomplete')).toBe('list')
    })

    it('should have screen reader live region', () => {
      const { container } = render(LinkExistingSpouse, {
        props: {
          person: mockPerson,
          api: mockApi
        }
      })

      const liveRegion = container.querySelector('[role="status"]')
      expect(liveRegion).toBeTruthy()
      expect(liveRegion.getAttribute('aria-live')).toBe('polite')
    })
  })
})
