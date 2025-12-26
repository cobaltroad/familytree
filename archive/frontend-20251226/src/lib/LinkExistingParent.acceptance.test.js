import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, waitFor } from '@testing-library/svelte'
import { get } from 'svelte/store'
import LinkExistingParent from './LinkExistingParent.svelte'
import { people, relationships } from '../stores/familyStore.js'

/**
 * Acceptance Tests for LinkExistingParent Component (Issue #45)
 *
 * Tests verify the acceptance criteria defined in issue #45:
 * - Display "Link Existing Person" UI when mother doesn't exist
 * - Hide when mother already exists
 * - Autocomplete filtering and selection
 * - Successful relationship creation with optimistic updates
 * - Error handling and rollback
 * - Responsive behavior
 * - Keyboard navigation
 * - Smart filtering logic
 */

describe('LinkExistingParent - Acceptance Tests (Issue #45)', () => {
  const mockPeople = [
    { id: 1, firstName: 'Alice', lastName: 'Smith', birthDate: '1950-01-01', gender: 'female' },
    { id: 2, firstName: 'Bob', lastName: 'Smith', birthDate: '1948-01-01', gender: 'male' },
    { id: 3, firstName: 'Carol', lastName: 'Jones', birthDate: '1975-06-15', gender: 'female' },
    { id: 4, firstName: 'David', lastName: 'Jones', birthDate: '1998-03-20', gender: 'male' },
    { id: 5, firstName: 'Jane', lastName: 'Doe', birthDate: '1960-07-22', gender: 'female' }
  ]

  beforeEach(() => {
    // Reset stores before each test
    people.set([])
    relationships.set([])
  })

  describe('Scenario 1: Display Link Existing Person UI when mother does not exist', () => {
    it('should display "Link Existing Person" section when mother does not exist', () => {
      const child = mockPeople[3] // David (no mother)
      people.set(mockPeople)
      relationships.set([])

      const { container } = render(LinkExistingParent, {
        props: {
          child: child,
          parentType: 'mother'
        }
      })

      const section = container.querySelector('.link-existing-parent')
      expect(section).toBeTruthy()
    })

    it('should display autocomplete input field', () => {
      const child = mockPeople[3]
      people.set(mockPeople)

      const { container } = render(LinkExistingParent, {
        props: {
          child: child,
          parentType: 'mother'
        }
      })

      const input = container.querySelector('input[type="text"]')
      expect(input).toBeTruthy()
    })

    it('should have descriptive label for mother linking', () => {
      const child = mockPeople[3]
      people.set(mockPeople)

      const { container } = render(LinkExistingParent, {
        props: {
          child: child,
          parentType: 'mother'
        }
      })

      const heading = container.querySelector('h4')
      expect(heading.textContent).toContain('Link Existing Person as Mother')
    })

    it('should have descriptive label for father linking', () => {
      const child = mockPeople[3]
      people.set(mockPeople)

      const { container } = render(LinkExistingParent, {
        props: {
          child: child,
          parentType: 'father'
        }
      })

      const heading = container.querySelector('h4')
      expect(heading.textContent).toContain('Link Existing Person as Father')
    })
  })

  describe('Scenario 2: Smart filtering excludes invalid candidates', () => {
    it('should exclude the child themselves from autocomplete results', async () => {
      const child = mockPeople[3] // David
      people.set(mockPeople)

      const { container } = render(LinkExistingParent, {
        props: {
          child: child,
          parentType: 'mother'
        }
      })

      const input = container.querySelector('input[type="text"]')
      await fireEvent.focus(input)
      await fireEvent.input(input, { target: { value: 'David' } })

      await waitFor(() => {
        const options = container.querySelectorAll('[role="option"]')
        const davidOption = Array.from(options).find(opt => opt.textContent.includes('David Jones'))
        expect(davidOption).toBeFalsy()
      })
    })

    it('should exclude descendants from mother candidates', async () => {
      const child = mockPeople[2] // Carol (id: 3)
      people.set(mockPeople)
      relationships.set([
        { id: 1, person1Id: 3, person2Id: 4, type: 'parentOf', parentRole: 'mother' } // Carol is mother of David
      ])

      const { container } = render(LinkExistingParent, {
        props: {
          child: child,
          parentType: 'mother'
        }
      })

      const input = container.querySelector('input[type="text"]')
      await fireEvent.focus(input)

      await waitFor(() => {
        const options = container.querySelectorAll('[role="option"]')
        const davidOption = Array.from(options).find(opt => opt.textContent.includes('David'))
        expect(davidOption).toBeFalsy() // David is Carol's child, should be excluded
      })
    })

    it('should exclude people too young to be parents (less than 13 years older)', async () => {
      const youngPerson = { id: 6, firstName: 'Young', lastName: 'Person', birthDate: '1995-01-01', gender: 'female' }
      const child = mockPeople[3] // David (born 1998)

      people.set([...mockPeople, youngPerson])

      const { container } = render(LinkExistingParent, {
        props: {
          child: child,
          parentType: 'mother'
        }
      })

      const input = container.querySelector('input[type="text"]')
      await fireEvent.focus(input)

      await waitFor(() => {
        const options = container.querySelectorAll('[role="option"]')
        const youngOption = Array.from(options).find(opt => opt.textContent.includes('Young Person'))
        expect(youngOption).toBeFalsy() // Only 3 years older, should be excluded
      })
    })

    it('should include valid mother candidates', async () => {
      const child = mockPeople[3] // David (born 1998)
      people.set(mockPeople)

      const { container } = render(LinkExistingParent, {
        props: {
          child: child,
          parentType: 'mother'
        }
      })

      const input = container.querySelector('input[type="text"]')
      await fireEvent.focus(input)

      await waitFor(() => {
        const options = container.querySelectorAll('[role="option"]')
        const aliceOption = Array.from(options).find(opt => opt.textContent.includes('Alice Smith'))
        expect(aliceOption).toBeTruthy() // Alice born 1950, valid mother candidate
      })
    })

    it('should exclude ancestors from candidates', async () => {
      const child = mockPeople[3] // David (id: 4)
      people.set(mockPeople)
      relationships.set([
        { id: 1, person1Id: 1, person2Id: 3, type: 'parentOf', parentRole: 'mother' },  // Alice is mother of Carol
        { id: 2, person1Id: 3, person2Id: 4, type: 'parentOf', parentRole: 'mother' }   // Carol is mother of David
      ])

      const { container } = render(LinkExistingParent, {
        props: {
          child: child,
          parentType: 'mother'
        }
      })

      const input = container.querySelector('input[type="text"]')
      await fireEvent.focus(input)

      await waitFor(() => {
        const options = container.querySelectorAll('[role="option"]')
        const aliceOption = Array.from(options).find(opt => opt.textContent.includes('Alice'))
        expect(aliceOption).toBeFalsy() // Alice is grandmother, should be excluded
      })
    })
  })

  describe('Scenario 3: Successful relationship creation', () => {
    it('should create relationship when person is selected', async () => {
      const child = mockPeople[3] // David
      people.set(mockPeople)

      const mockApi = {
        createRelationship: vi.fn().mockResolvedValue({
          id: 100,
          person1Id: 1,
          person2Id: 4,
          type: 'parentOf',
          parentRole: 'mother'
        })
      }

      const { container } = render(LinkExistingParent, {
        props: {
          child: child,
          parentType: 'mother',
          api: mockApi
        }
      })

      const input = container.querySelector('input[type="text"]')
      await fireEvent.focus(input)

      await waitFor(() => {
        const options = container.querySelectorAll('[role="option"]')
        expect(options.length).toBeGreaterThan(0)
      })

      const aliceOption = Array.from(container.querySelectorAll('[role="option"]'))
        .find(opt => opt.textContent.includes('Alice'))

      await fireEvent.click(aliceOption)

      await waitFor(() => {
        expect(mockApi.createRelationship).toHaveBeenCalledWith({
          person1Id: 1, // Alice
          person2Id: 4, // David
          type: 'mother'
        })
      })
    })

    it('should apply optimistic update when relationship is created', async () => {
      const child = mockPeople[3] // David (id: 4)
      people.set(mockPeople)
      relationships.set([])

      const mockApi = {
        createRelationship: vi.fn().mockImplementation(() => {
          return new Promise(resolve => {
            setTimeout(() => {
              resolve({
                id: 100,
                person1Id: 1,
                person2Id: 4,
                type: 'parentOf',
                parentRole: 'mother'
              })
            }, 50)
          })
        })
      }

      const { container } = render(LinkExistingParent, {
        props: {
          child: child,
          parentType: 'mother',
          api: mockApi
        }
      })

      const input = container.querySelector('input[type="text"]')
      await fireEvent.focus(input)

      await waitFor(() => {
        const options = container.querySelectorAll('[role="option"]')
        expect(options.length).toBeGreaterThan(0)
      })

      const aliceOption = Array.from(container.querySelectorAll('[role="option"]'))
        .find(opt => opt.textContent.includes('Alice'))

      await fireEvent.click(aliceOption)

      // Check that relationship was added optimistically
      await waitFor(() => {
        const currentRelationships = get(relationships)
        expect(currentRelationships.length).toBeGreaterThan(0)
      }, { timeout: 100 })
    })

    it('should show success notification after linking', async () => {
      const child = mockPeople[3]
      people.set(mockPeople)

      const mockApi = {
        createRelationship: vi.fn().mockResolvedValue({
          id: 100,
          person1Id: 1,
          person2Id: 4,
          type: 'parentOf',
          parentRole: 'mother'
        })
      }

      const handleSuccess = vi.fn()

      const { container, component } = render(LinkExistingParent, {
        props: {
          child: child,
          parentType: 'mother',
          api: mockApi
        }
      })

      component.$on('success', handleSuccess)

      const input = container.querySelector('input[type="text"]')
      await fireEvent.focus(input)

      await waitFor(() => {
        const options = container.querySelectorAll('[role="option"]')
        expect(options.length).toBeGreaterThan(0)
      })

      const aliceOption = Array.from(container.querySelectorAll('[role="option"]'))
        .find(opt => opt.textContent.includes('Alice'))

      await fireEvent.click(aliceOption)

      await waitFor(() => {
        expect(handleSuccess).toHaveBeenCalled()
      })
    })
  })

  describe('Scenario 4: Error handling and rollback', () => {
    it('should show error notification when API call fails', async () => {
      const child = mockPeople[3]
      people.set(mockPeople)

      const mockApi = {
        createRelationship: vi.fn().mockRejectedValue(new Error('API Error'))
      }

      const handleError = vi.fn()

      const { container, component } = render(LinkExistingParent, {
        props: {
          child: child,
          parentType: 'mother',
          api: mockApi
        }
      })

      component.$on('error', handleError)

      const input = container.querySelector('input[type="text"]')
      await fireEvent.focus(input)

      await waitFor(() => {
        const options = container.querySelectorAll('[role="option"]')
        expect(options.length).toBeGreaterThan(0)
      })

      const aliceOption = Array.from(container.querySelectorAll('[role="option"]'))
        .find(opt => opt.textContent.includes('Alice'))

      await fireEvent.click(aliceOption)

      await waitFor(() => {
        expect(handleError).toHaveBeenCalled()
      })
    })

    it('should rollback optimistic update on API failure', async () => {
      const child = mockPeople[3]
      people.set(mockPeople)
      relationships.set([])

      const mockApi = {
        createRelationship: vi.fn().mockImplementation(() => {
          return new Promise((resolve, reject) => {
            setTimeout(() => {
              reject(new Error('Person already has a mother'))
            }, 50)
          })
        })
      }

      const { container } = render(LinkExistingParent, {
        props: {
          child: child,
          parentType: 'mother',
          api: mockApi
        }
      })

      const input = container.querySelector('input[type="text"]')
      await fireEvent.focus(input)

      await waitFor(() => {
        const options = container.querySelectorAll('[role="option"]')
        expect(options.length).toBeGreaterThan(0)
      })

      const aliceOption = Array.from(container.querySelectorAll('[role="option"]'))
        .find(opt => opt.textContent.includes('Alice'))

      await fireEvent.click(aliceOption)

      // Wait for API call to fail and rollback
      await waitFor(() => {
        const currentRelationships = get(relationships)
        expect(currentRelationships.length).toBe(0) // Should be rolled back
      }, { timeout: 200 })
    })

    it('should handle backend validation error (duplicate parent)', async () => {
      const child = mockPeople[3]
      people.set(mockPeople)

      const mockApi = {
        createRelationship: vi.fn().mockRejectedValue(new Error('Person already has a mother'))
      }

      const handleError = vi.fn()

      const { container, component } = render(LinkExistingParent, {
        props: {
          child: child,
          parentType: 'mother',
          api: mockApi
        }
      })

      component.$on('error', handleError)

      const input = container.querySelector('input[type="text"]')
      await fireEvent.focus(input)

      await waitFor(() => {
        const options = container.querySelectorAll('[role="option"]')
        expect(options.length).toBeGreaterThan(0)
      })

      const aliceOption = Array.from(container.querySelectorAll('[role="option"]'))
        .find(opt => opt.textContent.includes('Alice'))

      await fireEvent.click(aliceOption)

      await waitFor(() => {
        expect(handleError).toHaveBeenCalled()
        const errorDetail = handleError.mock.calls[0][0].detail
        expect(errorDetail.message).toContain('mother')
      })
    })
  })

  describe('Scenario 5: Responsive behavior', () => {
    it('should render on mobile devices', () => {
      const child = mockPeople[3]
      people.set(mockPeople)

      // Simulate mobile viewport
      global.innerWidth = 375

      const { container } = render(LinkExistingParent, {
        props: {
          child: child,
          parentType: 'mother'
        }
      })

      const section = container.querySelector('.link-existing-parent')
      expect(section).toBeTruthy()
    })

    it('should render on desktop devices', () => {
      const child = mockPeople[3]
      people.set(mockPeople)

      // Simulate desktop viewport
      global.innerWidth = 1920

      const { container } = render(LinkExistingParent, {
        props: {
          child: child,
          parentType: 'mother'
        }
      })

      const section = container.querySelector('.link-existing-parent')
      expect(section).toBeTruthy()
    })
  })

  describe('Scenario 6: Keyboard navigation', () => {
    it('should support keyboard navigation through autocomplete', async () => {
      const child = mockPeople[3]
      people.set(mockPeople)

      const { container } = render(LinkExistingParent, {
        props: {
          child: child,
          parentType: 'mother'
        }
      })

      const input = container.querySelector('input[type="text"]')
      await fireEvent.focus(input)

      await waitFor(() => {
        const options = container.querySelectorAll('[role="option"]')
        expect(options.length).toBeGreaterThan(0)
      })

      // Navigate with ArrowDown
      await fireEvent.keyDown(input, { key: 'ArrowDown' })

      await waitFor(() => {
        const highlightedOption = container.querySelector('[aria-selected="true"]')
        expect(highlightedOption).toBeTruthy()
      })
    })

    it('should support Enter key to select highlighted option', async () => {
      const child = mockPeople[3]
      people.set(mockPeople)

      const mockApi = {
        createRelationship: vi.fn().mockResolvedValue({
          id: 100,
          person1Id: 1,
          person2Id: 4,
          type: 'parentOf',
          parentRole: 'mother'
        })
      }

      const { container } = render(LinkExistingParent, {
        props: {
          child: child,
          parentType: 'mother',
          api: mockApi
        }
      })

      const input = container.querySelector('input[type="text"]')
      await fireEvent.focus(input)

      await waitFor(() => {
        const options = container.querySelectorAll('[role="option"]')
        expect(options.length).toBeGreaterThan(0)
      })

      // Navigate and select with keyboard
      await fireEvent.keyDown(input, { key: 'ArrowDown' })
      await fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => {
        expect(mockApi.createRelationship).toHaveBeenCalled()
      })
    })

    it('should support Escape key to close autocomplete', async () => {
      const child = mockPeople[3]
      people.set(mockPeople)

      const { container } = render(LinkExistingParent, {
        props: {
          child: child,
          parentType: 'mother'
        }
      })

      const input = container.querySelector('input[type="text"]')
      await fireEvent.focus(input)

      await waitFor(() => {
        const dropdown = container.querySelector('[role="listbox"]')
        expect(dropdown).toBeTruthy()
      })

      await fireEvent.keyDown(input, { key: 'Escape' })

      await waitFor(() => {
        const dropdown = container.querySelector('[role="listbox"]')
        expect(dropdown).toBeFalsy()
      })
    })
  })

  describe('Scenario 7: Accessibility', () => {
    it('should have proper ARIA labels', () => {
      const child = mockPeople[3]
      people.set(mockPeople)

      const { container } = render(LinkExistingParent, {
        props: {
          child: child,
          parentType: 'mother'
        }
      })

      const input = container.querySelector('input[type="text"]')
      expect(input.getAttribute('aria-label')).toBeTruthy()
      expect(input.getAttribute('role')).toBe('combobox')
    })

    it('should announce selection to screen readers', async () => {
      const child = mockPeople[3]
      people.set(mockPeople)

      const mockApi = {
        createRelationship: vi.fn().mockResolvedValue({
          id: 100,
          person1Id: 1,
          person2Id: 4,
          type: 'parentOf',
          parentRole: 'mother'
        })
      }

      const { container } = render(LinkExistingParent, {
        props: {
          child: child,
          parentType: 'mother',
          api: mockApi
        }
      })

      const input = container.querySelector('input[type="text"]')
      await fireEvent.focus(input)

      await waitFor(() => {
        const options = container.querySelectorAll('[role="option"]')
        expect(options.length).toBeGreaterThan(0)
      })

      const aliceOption = Array.from(container.querySelectorAll('[role="option"]'))
        .find(opt => opt.textContent.includes('Alice'))

      await fireEvent.click(aliceOption)

      // Should have live region or announcement
      await waitFor(() => {
        const liveRegion = container.querySelector('[aria-live]')
        expect(liveRegion).toBeTruthy()
      })
    })

    it('should have descriptive help text', () => {
      const child = mockPeople[3]
      people.set(mockPeople)

      const { container } = render(LinkExistingParent, {
        props: {
          child: child,
          parentType: 'mother'
        }
      })

      const helpText = container.querySelector('.help-text')
      expect(helpText).toBeTruthy()
      expect(helpText.textContent).toContain('Search')
    })
  })

  describe('Integration with parent type', () => {
    it('should correctly identify mother type throughout the flow', async () => {
      const child = mockPeople[3]
      people.set(mockPeople)

      const mockApi = {
        createRelationship: vi.fn().mockResolvedValue({
          id: 100,
          person1Id: 1,
          person2Id: 4,
          type: 'parentOf',
          parentRole: 'mother'
        })
      }

      const { container } = render(LinkExistingParent, {
        props: {
          child: child,
          parentType: 'mother',
          api: mockApi
        }
      })

      const input = container.querySelector('input[type="text"]')
      await fireEvent.focus(input)

      await waitFor(() => {
        const options = container.querySelectorAll('[role="option"]')
        expect(options.length).toBeGreaterThan(0)
      })

      const aliceOption = Array.from(container.querySelectorAll('[role="option"]'))
        .find(opt => opt.textContent.includes('Alice'))

      await fireEvent.click(aliceOption)

      await waitFor(() => {
        expect(mockApi.createRelationship).toHaveBeenCalledWith({
          person1Id: 1,
          person2Id: 4,
          type: 'mother' // Should be 'mother', not 'father'
        })
      })
    })

    it('should correctly identify father type throughout the flow', async () => {
      const child = mockPeople[3]
      people.set(mockPeople)

      const mockApi = {
        createRelationship: vi.fn().mockResolvedValue({
          id: 100,
          person1Id: 2,
          person2Id: 4,
          type: 'parentOf',
          parentRole: 'father'
        })
      }

      const { container } = render(LinkExistingParent, {
        props: {
          child: child,
          parentType: 'father',
          api: mockApi
        }
      })

      const input = container.querySelector('input[type="text"]')
      await fireEvent.focus(input)

      await waitFor(() => {
        const options = container.querySelectorAll('[role="option"]')
        expect(options.length).toBeGreaterThan(0)
      })

      const bobOption = Array.from(container.querySelectorAll('[role="option"]'))
        .find(opt => opt.textContent.includes('Bob'))

      await fireEvent.click(bobOption)

      await waitFor(() => {
        expect(mockApi.createRelationship).toHaveBeenCalledWith({
          person1Id: 2,
          person2Id: 4,
          type: 'father' // Should be 'father', not 'mother'
        })
      })
    })
  })
})
