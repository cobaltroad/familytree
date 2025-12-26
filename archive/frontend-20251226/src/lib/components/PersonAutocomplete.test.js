import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, waitFor } from '@testing-library/svelte'
import PersonAutocomplete from './PersonAutocomplete.svelte'

/**
 * Unit Tests for PersonAutocomplete Component (Issue #45)
 *
 * Tests the reusable autocomplete component for selecting existing people
 * with fuzzy search, keyboard navigation, and accessibility support.
 */

describe('PersonAutocomplete Component', () => {
  const mockPeople = [
    { id: 1, firstName: 'John', lastName: 'Smith', birthDate: '1950-01-15', gender: 'male' },
    { id: 2, firstName: 'Jane', lastName: 'Smith', birthDate: '1952-03-20', gender: 'female' },
    { id: 3, firstName: 'Alice', lastName: 'Johnson', birthDate: '1975-06-10', gender: 'female' },
    { id: 4, firstName: 'Bob', lastName: 'Williams', birthDate: '1980-12-05', gender: 'male' },
    { id: 5, firstName: 'Jane', lastName: 'Doe', birthDate: '1960-07-22', gender: 'female' }
  ]

  describe('Basic Rendering', () => {
    it('should render input field with placeholder', () => {
      const { container } = render(PersonAutocomplete, {
        props: {
          people: mockPeople,
          placeholder: 'Search for a person...'
        }
      })

      const input = container.querySelector('input[type="text"]')
      expect(input).toBeTruthy()
      expect(input.placeholder).toBe('Search for a person...')
    })

    it('should have proper ARIA attributes for accessibility', () => {
      const { container } = render(PersonAutocomplete, {
        props: {
          people: mockPeople,
          label: 'Select Person'
        }
      })

      const input = container.querySelector('input[type="text"]')
      expect(input.getAttribute('role')).toBe('combobox')
      expect(input.getAttribute('aria-autocomplete')).toBe('list')
      expect(input.getAttribute('aria-expanded')).toBe('false')
      expect(input.getAttribute('aria-label')).toBeTruthy()
    })

    it('should render with custom label', () => {
      const { getByText } = render(PersonAutocomplete, {
        props: {
          people: mockPeople,
          label: 'Select Mother'
        }
      })

      expect(getByText('Select Mother')).toBeTruthy()
    })

    it('should not show dropdown initially', () => {
      const { container } = render(PersonAutocomplete, {
        props: {
          people: mockPeople
        }
      })

      const dropdown = container.querySelector('[role="listbox"]')
      expect(dropdown).toBeFalsy()
    })
  })

  describe('Search and Filtering', () => {
    it('should show all people when input is focused with empty value', async () => {
      const { container } = render(PersonAutocomplete, {
        props: {
          people: mockPeople
        }
      })

      const input = container.querySelector('input[type="text"]')
      await fireEvent.focus(input)

      await waitFor(() => {
        const dropdown = container.querySelector('[role="listbox"]')
        expect(dropdown).toBeTruthy()
        const options = container.querySelectorAll('[role="option"]')
        expect(options.length).toBe(5)
      })
    })

    it('should filter by first name', async () => {
      const { container } = render(PersonAutocomplete, {
        props: {
          people: mockPeople
        }
      })

      const input = container.querySelector('input[type="text"]')
      await fireEvent.input(input, { target: { value: 'Jane' } })

      await waitFor(() => {
        const options = container.querySelectorAll('[role="option"]')
        expect(options.length).toBe(2) // Jane Smith and Jane Doe
      })
    })

    it('should filter by last name', async () => {
      const { container } = render(PersonAutocomplete, {
        props: {
          people: mockPeople
        }
      })

      const input = container.querySelector('input[type="text"]')
      await fireEvent.input(input, { target: { value: 'Smith' } })

      await waitFor(() => {
        const options = container.querySelectorAll('[role="option"]')
        expect(options.length).toBe(2) // John Smith and Jane Smith
      })
    })

    it('should filter case-insensitively', async () => {
      const { container } = render(PersonAutocomplete, {
        props: {
          people: mockPeople
        }
      })

      const input = container.querySelector('input[type="text"]')
      await fireEvent.input(input, { target: { value: 'ALICE' } })

      await waitFor(() => {
        const options = container.querySelectorAll('[role="option"]')
        expect(options.length).toBe(1)
        expect(options[0].textContent).toContain('Alice Johnson')
      })
    })

    it('should filter by partial match', async () => {
      const { container } = render(PersonAutocomplete, {
        props: {
          people: mockPeople
        }
      })

      const input = container.querySelector('input[type="text"]')
      await fireEvent.input(input, { target: { value: 'Jo' } })

      await waitFor(() => {
        const options = container.querySelectorAll('[role="option"]')
        // Should match John and Johnson
        expect(options.length).toBeGreaterThanOrEqual(2)
      })
    })

    it('should show no results message when no matches found', async () => {
      const { container } = render(PersonAutocomplete, {
        props: {
          people: mockPeople
        }
      })

      const input = container.querySelector('input[type="text"]')
      await fireEvent.input(input, { target: { value: 'xyz123' } })

      await waitFor(() => {
        const noResults = container.querySelector('.no-results')
        expect(noResults).toBeTruthy()
        expect(noResults.textContent).toContain('No people found')
      })
    })

    it('should apply custom filter function when provided', async () => {
      const filterFn = vi.fn((person) => person.gender === 'female')

      const { container } = render(PersonAutocomplete, {
        props: {
          people: mockPeople,
          filterFunction: filterFn
        }
      })

      const input = container.querySelector('input[type="text"]')
      await fireEvent.focus(input)

      await waitFor(() => {
        const options = container.querySelectorAll('[role="option"]')
        expect(options.length).toBe(3) // Only female persons
        expect(filterFn).toHaveBeenCalled()
      })
    })
  })

  describe('Person Selection', () => {
    it('should emit select event when person is clicked', async () => {
      const handleSelect = vi.fn()

      const { container, component } = render(PersonAutocomplete, {
        props: {
          people: mockPeople
        }
      })

      component.$on('select', handleSelect)

      const input = container.querySelector('input[type="text"]')
      await fireEvent.focus(input)

      await waitFor(() => {
        const options = container.querySelectorAll('[role="option"]')
        expect(options.length).toBeGreaterThan(0)
      })

      const firstOption = container.querySelector('[role="option"]')
      await fireEvent.click(firstOption)

      expect(handleSelect).toHaveBeenCalled()
      const selectedPerson = handleSelect.mock.calls[0][0].detail
      expect(selectedPerson).toBeTruthy()
      expect(selectedPerson.id).toBeTruthy()
    })

    it('should close dropdown after selection', async () => {
      const { container } = render(PersonAutocomplete, {
        props: {
          people: mockPeople
        }
      })

      const input = container.querySelector('input[type="text"]')
      await fireEvent.focus(input)

      await waitFor(() => {
        const dropdown = container.querySelector('[role="listbox"]')
        expect(dropdown).toBeTruthy()
      })

      const firstOption = container.querySelector('[role="option"]')
      await fireEvent.click(firstOption)

      await waitFor(() => {
        const dropdown = container.querySelector('[role="listbox"]')
        expect(dropdown).toBeFalsy()
      })
    })

    it('should clear input after selection', async () => {
      const { container } = render(PersonAutocomplete, {
        props: {
          people: mockPeople
        }
      })

      const input = container.querySelector('input[type="text"]')
      await fireEvent.input(input, { target: { value: 'Jane' } })

      await waitFor(() => {
        const firstOption = container.querySelector('[role="option"]')
        expect(firstOption).toBeTruthy()
      })

      const firstOption = container.querySelector('[role="option"]')
      await fireEvent.click(firstOption)

      await waitFor(() => {
        expect(input.value).toBe('')
      })
    })
  })

  describe('Keyboard Navigation', () => {
    it('should highlight first option on ArrowDown', async () => {
      const { container } = render(PersonAutocomplete, {
        props: {
          people: mockPeople
        }
      })

      const input = container.querySelector('input[type="text"]')
      await fireEvent.focus(input)

      await waitFor(() => {
        const dropdown = container.querySelector('[role="listbox"]')
        expect(dropdown).toBeTruthy()
      })

      await fireEvent.keyDown(input, { key: 'ArrowDown' })

      await waitFor(() => {
        const highlightedOption = container.querySelector('[aria-selected="true"]')
        expect(highlightedOption).toBeTruthy()
      })
    })

    it('should navigate down through options with ArrowDown', async () => {
      const { container } = render(PersonAutocomplete, {
        props: {
          people: mockPeople.slice(0, 3)
        }
      })

      const input = container.querySelector('input[type="text"]')
      await fireEvent.focus(input)

      await waitFor(() => {
        const options = container.querySelectorAll('[role="option"]')
        expect(options.length).toBe(3)
      })

      // First ArrowDown
      await fireEvent.keyDown(input, { key: 'ArrowDown' })
      await waitFor(() => {
        const options = container.querySelectorAll('[role="option"]')
        expect(options[0].getAttribute('aria-selected')).toBe('true')
      })

      // Second ArrowDown
      await fireEvent.keyDown(input, { key: 'ArrowDown' })
      await waitFor(() => {
        const options = container.querySelectorAll('[role="option"]')
        expect(options[1].getAttribute('aria-selected')).toBe('true')
      })
    })

    it('should navigate up through options with ArrowUp', async () => {
      const { container } = render(PersonAutocomplete, {
        props: {
          people: mockPeople.slice(0, 3)
        }
      })

      const input = container.querySelector('input[type="text"]')
      await fireEvent.focus(input)

      await waitFor(() => {
        const options = container.querySelectorAll('[role="option"]')
        expect(options.length).toBe(3)
      })

      // Navigate to second item
      await fireEvent.keyDown(input, { key: 'ArrowDown' })
      await fireEvent.keyDown(input, { key: 'ArrowDown' })

      await waitFor(() => {
        const options = container.querySelectorAll('[role="option"]')
        expect(options[1].getAttribute('aria-selected')).toBe('true')
      })

      // Navigate back up
      await fireEvent.keyDown(input, { key: 'ArrowUp' })

      await waitFor(() => {
        const options = container.querySelectorAll('[role="option"]')
        expect(options[0].getAttribute('aria-selected')).toBe('true')
      })
    })

    it('should select highlighted option on Enter', async () => {
      const handleSelect = vi.fn()

      const { container, component } = render(PersonAutocomplete, {
        props: {
          people: mockPeople.slice(0, 2)
        }
      })

      component.$on('select', handleSelect)

      const input = container.querySelector('input[type="text"]')
      await fireEvent.focus(input)

      await waitFor(() => {
        const options = container.querySelectorAll('[role="option"]')
        expect(options.length).toBe(2)
      })

      // Navigate to first option
      await fireEvent.keyDown(input, { key: 'ArrowDown' })

      // Select with Enter
      await fireEvent.keyDown(input, { key: 'Enter' })

      expect(handleSelect).toHaveBeenCalled()
    })

    it('should close dropdown on Escape', async () => {
      const { container } = render(PersonAutocomplete, {
        props: {
          people: mockPeople
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

    it('should wrap to last option when ArrowUp from first', async () => {
      const { container } = render(PersonAutocomplete, {
        props: {
          people: mockPeople.slice(0, 3)
        }
      })

      const input = container.querySelector('input[type="text"]')
      await fireEvent.focus(input)

      await waitFor(() => {
        const options = container.querySelectorAll('[role="option"]')
        expect(options.length).toBe(3)
      })

      // Highlight first option
      await fireEvent.keyDown(input, { key: 'ArrowDown' })

      // Press ArrowUp to wrap to last
      await fireEvent.keyDown(input, { key: 'ArrowUp' })

      await waitFor(() => {
        const options = container.querySelectorAll('[role="option"]')
        expect(options[2].getAttribute('aria-selected')).toBe('true')
      })
    })

    it('should wrap to first option when ArrowDown from last', async () => {
      const { container } = render(PersonAutocomplete, {
        props: {
          people: mockPeople.slice(0, 3)
        }
      })

      const input = container.querySelector('input[type="text"]')
      await fireEvent.focus(input)

      await waitFor(() => {
        const options = container.querySelectorAll('[role="option"]')
        expect(options.length).toBe(3)
      })

      // Navigate to last option
      await fireEvent.keyDown(input, { key: 'ArrowDown' })
      await fireEvent.keyDown(input, { key: 'ArrowDown' })
      await fireEvent.keyDown(input, { key: 'ArrowDown' })

      // Press ArrowDown to wrap to first
      await fireEvent.keyDown(input, { key: 'ArrowDown' })

      await waitFor(() => {
        const options = container.querySelectorAll('[role="option"]')
        expect(options[0].getAttribute('aria-selected')).toBe('true')
      })
    })
  })

  describe('Display Format', () => {
    it('should display person name and birth year', async () => {
      const { container } = render(PersonAutocomplete, {
        props: {
          people: mockPeople.slice(0, 1)
        }
      })

      const input = container.querySelector('input[type="text"]')
      await fireEvent.focus(input)

      await waitFor(() => {
        const option = container.querySelector('[role="option"]')
        expect(option.textContent).toContain('John Smith')
        expect(option.textContent).toContain('1950')
      })
    })

    it('should handle people without birth dates gracefully', async () => {
      const peopleNoBirthDate = [
        { id: 10, firstName: 'Unknown', lastName: 'Person', birthDate: null, gender: 'male' }
      ]

      const { container } = render(PersonAutocomplete, {
        props: {
          people: peopleNoBirthDate
        }
      })

      const input = container.querySelector('input[type="text"]')
      await fireEvent.focus(input)

      await waitFor(() => {
        const option = container.querySelector('[role="option"]')
        expect(option.textContent).toContain('Unknown Person')
      })
    })
  })

  describe('Focus Management', () => {
    it('should close dropdown when focus leaves component', async () => {
      const { container } = render(PersonAutocomplete, {
        props: {
          people: mockPeople
        }
      })

      const input = container.querySelector('input[type="text"]')
      await fireEvent.focus(input)

      await waitFor(() => {
        const dropdown = container.querySelector('[role="listbox"]')
        expect(dropdown).toBeTruthy()
      })

      await fireEvent.blur(input)

      await waitFor(() => {
        const dropdown = container.querySelector('[role="listbox"]')
        expect(dropdown).toBeFalsy()
      }, { timeout: 500 })
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty people array', () => {
      const { container } = render(PersonAutocomplete, {
        props: {
          people: []
        }
      })

      const input = container.querySelector('input[type="text"]')
      expect(input).toBeTruthy()
    })

    it('should show no results when people array is empty', async () => {
      const { container } = render(PersonAutocomplete, {
        props: {
          people: []
        }
      })

      const input = container.querySelector('input[type="text"]')
      await fireEvent.focus(input)

      await waitFor(() => {
        const noResults = container.querySelector('.no-results')
        expect(noResults).toBeTruthy()
      })
    })

    it('should handle rapid typing without errors', async () => {
      const { container } = render(PersonAutocomplete, {
        props: {
          people: mockPeople
        }
      })

      const input = container.querySelector('input[type="text"]')

      // Rapid typing simulation
      await fireEvent.input(input, { target: { value: 'J' } })
      await fireEvent.input(input, { target: { value: 'Jo' } })
      await fireEvent.input(input, { target: { value: 'Joh' } })
      await fireEvent.input(input, { target: { value: 'John' } })

      await waitFor(() => {
        const options = container.querySelectorAll('[role="option"]')
        expect(options.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Accessibility - ARIA States', () => {
    it('should update aria-expanded when dropdown opens', async () => {
      const { container } = render(PersonAutocomplete, {
        props: {
          people: mockPeople
        }
      })

      const input = container.querySelector('input[type="text"]')
      expect(input.getAttribute('aria-expanded')).toBe('false')

      await fireEvent.focus(input)

      await waitFor(() => {
        expect(input.getAttribute('aria-expanded')).toBe('true')
      })
    })

    it('should update aria-activedescendant when navigating', async () => {
      const { container } = render(PersonAutocomplete, {
        props: {
          people: mockPeople.slice(0, 2)
        }
      })

      const input = container.querySelector('input[type="text"]')
      await fireEvent.focus(input)

      await waitFor(() => {
        const options = container.querySelectorAll('[role="option"]')
        expect(options.length).toBe(2)
      })

      await fireEvent.keyDown(input, { key: 'ArrowDown' })

      await waitFor(() => {
        const activeDescendant = input.getAttribute('aria-activedescendant')
        expect(activeDescendant).toBeTruthy()
      })
    })

    it('should have unique IDs for each option', async () => {
      const { container } = render(PersonAutocomplete, {
        props: {
          people: mockPeople
        }
      })

      const input = container.querySelector('input[type="text"]')
      await fireEvent.focus(input)

      await waitFor(() => {
        const options = container.querySelectorAll('[role="option"]')
        const ids = Array.from(options).map(opt => opt.id)
        const uniqueIds = new Set(ids)
        expect(uniqueIds.size).toBe(ids.length)
      })
    })
  })
})
