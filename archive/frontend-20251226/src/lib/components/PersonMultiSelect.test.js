/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, screen, waitFor } from '@testing-library/svelte'
import PersonMultiSelect from './PersonMultiSelect.svelte'

describe('PersonMultiSelect', () => {
  const mockPeople = [
    { id: 1, firstName: 'John', lastName: 'Doe', birthDate: '1950-01-01' },
    { id: 2, firstName: 'Jane', lastName: 'Smith', birthDate: '1955-01-01' },
    { id: 3, firstName: 'Bob', lastName: 'Johnson', birthDate: '1980-01-01' },
    { id: 4, firstName: 'Alice', lastName: 'Williams', birthDate: '2005-01-01' },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render search input', () => {
      const { container } = render(PersonMultiSelect, { props: { people: mockPeople } })
      const input = container.querySelector('input[type="text"]')
      expect(input).toBeTruthy()
    })

    it('should display label when provided', () => {
      render(PersonMultiSelect, { props: { people: mockPeople, label: 'Select Children' } })
      expect(screen.getByText('Select Children')).toBeTruthy()
    })

    it('should display custom placeholder', () => {
      const { container } = render(PersonMultiSelect, {
        props: { people: mockPeople, placeholder: 'Search for children...' }
      })
      const input = container.querySelector('input[type="text"]')
      expect(input.placeholder).toBe('Search for children...')
    })

    it('should show selected count badge when selections exist', async () => {
      const { component, container } = render(PersonMultiSelect, { props: { people: mockPeople } })

      // Open dropdown
      const input = container.querySelector('input[type="text"]')
      await fireEvent.focus(input)

      // Select first person
      const firstOption = container.querySelector('[role="option"]')
      await fireEvent.click(firstOption)

      // Check for badge
      expect(screen.getByText('1 selected')).toBeTruthy()
    })

    it('should not show badge when no selections', () => {
      render(PersonMultiSelect, { props: { people: mockPeople } })
      expect(screen.queryByText('0 selected')).toBeFalsy()
    })
  })

  describe('Search and Filter', () => {
    it('should filter people based on search query', async () => {
      const { container } = render(PersonMultiSelect, { props: { people: mockPeople } })
      const input = container.querySelector('input[type="text"]')

      await fireEvent.input(input, { target: { value: 'John Doe' } })

      const options = container.querySelectorAll('[role="option"]')
      expect(options.length).toBe(1)
      expect(options[0].textContent).toContain('John Doe')
    })

    it('should apply custom filter function', async () => {
      const filterFunction = (person) => person.id > 2
      const { container } = render(PersonMultiSelect, {
        props: { people: mockPeople, filterFunction }
      })

      const input = container.querySelector('input[type="text"]')
      await fireEvent.focus(input)

      const options = container.querySelectorAll('[role="option"]')
      expect(options.length).toBe(2) // Only Bob and Alice (ids 3 and 4)
    })

    it('should show "No people found" when search has no results', async () => {
      const { container } = render(PersonMultiSelect, { props: { people: mockPeople } })
      const input = container.querySelector('input[type="text"]')

      await fireEvent.input(input, { target: { value: 'XYZ' } })

      expect(screen.getByText('No people found')).toBeTruthy()
    })
  })

  describe('Selection', () => {
    it('should select person when option is clicked', async () => {
      const { component, container } = render(PersonMultiSelect, { props: { people: mockPeople } })

      const selectionSpy = vi.fn()
      component.$on('selectionChange', selectionSpy)

      const input = container.querySelector('input[type="text"]')
      await fireEvent.focus(input)

      const firstOption = container.querySelector('[role="option"]')
      await fireEvent.click(firstOption)

      await waitFor(() => {
        expect(selectionSpy).toHaveBeenCalledTimes(1)
        expect(selectionSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            detail: expect.arrayContaining([mockPeople[0]])
          })
        )
      })
    })

    it('should support selecting multiple people', async () => {
      const { component, container } = render(PersonMultiSelect, { props: { people: mockPeople } })

      const selectionSpy = vi.fn()
      component.$on('selectionChange', selectionSpy)

      const input = container.querySelector('input[type="text"]')
      await fireEvent.focus(input)

      const options = container.querySelectorAll('[role="option"]')
      await fireEvent.click(options[0])
      await fireEvent.click(options[1])

      await waitFor(() => {
        expect(selectionSpy).toHaveBeenCalledTimes(2)
        const lastCall = selectionSpy.mock.calls[1][0]
        expect(lastCall.detail.length).toBe(2)
      })
    })

    it('should deselect person when clicking selected option', async () => {
      const { component, container } = render(PersonMultiSelect, { props: { people: mockPeople } })

      const selectionSpy = vi.fn()
      component.$on('selectionChange', selectionSpy)

      const input = container.querySelector('input[type="text"]')
      await fireEvent.focus(input)

      const firstOption = container.querySelector('[role="option"]')
      await fireEvent.click(firstOption) // Select
      await fireEvent.click(firstOption) // Deselect

      await waitFor(() => {
        expect(selectionSpy).toHaveBeenCalledTimes(2)
        const lastCall = selectionSpy.mock.calls[1][0]
        expect(lastCall.detail.length).toBe(0)
      })
    })

    it('should show visual indication of selected options', async () => {
      const { container } = render(PersonMultiSelect, { props: { people: mockPeople } })

      const input = container.querySelector('input[type="text"]')
      await fireEvent.focus(input)

      const options = container.querySelectorAll('[role="option"]')
      await fireEvent.click(options[0])

      // Verify selection through chip display
      await waitFor(() => {
        const chip = container.querySelector('.chip')
        expect(chip).toBeTruthy()
        expect(chip.textContent).toContain('John Doe')
      })

      // Verify badge shows count
      const badge = container.querySelector('.selection-badge')
      expect(badge).toBeTruthy()
      expect(badge.textContent).toContain('1 selected')
    })

    it('should display selected people as chips/tags', async () => {
      const { container } = render(PersonMultiSelect, { props: { people: mockPeople } })

      const input = container.querySelector('input[type="text"]')
      await fireEvent.focus(input)

      const firstOption = container.querySelector('[role="option"]')
      await fireEvent.click(firstOption)

      // Check for chip/tag display in the chips area
      const chip = container.querySelector('.chip')
      expect(chip).toBeTruthy()
      expect(chip.textContent).toContain('John Doe')
    })

    it('should remove person when clicking remove button on chip', async () => {
      const { component, container } = render(PersonMultiSelect, { props: { people: mockPeople } })

      const selectionSpy = vi.fn()
      component.$on('selectionChange', selectionSpy)

      const input = container.querySelector('input[type="text"]')
      await fireEvent.focus(input)

      const firstOption = container.querySelector('[role="option"]')
      await fireEvent.click(firstOption)

      // Find and click remove button on chip
      const removeButton = container.querySelector('.chip-remove')
      await fireEvent.click(removeButton)

      await waitFor(() => {
        const lastCall = selectionSpy.mock.calls[selectionSpy.mock.calls.length - 1][0]
        expect(lastCall.detail.length).toBe(0)
      })
    })
  })

  describe('Keyboard Navigation', () => {
    it('should navigate options with arrow keys', async () => {
      const { container } = render(PersonMultiSelect, { props: { people: mockPeople } })

      const input = container.querySelector('input[type="text"]')
      await fireEvent.focus(input)
      await fireEvent.keyDown(input, { key: 'ArrowDown' })

      const highlightedOption = container.querySelector('[role="option"].highlighted')
      expect(highlightedOption).toBeTruthy()
    })

    it('should select highlighted option with Enter key', async () => {
      const { component, container } = render(PersonMultiSelect, { props: { people: mockPeople } })

      const selectionSpy = vi.fn()
      component.$on('selectionChange', selectionSpy)

      const input = container.querySelector('input[type="text"]')
      await fireEvent.focus(input)
      await fireEvent.keyDown(input, { key: 'ArrowDown' })
      await fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => {
        expect(selectionSpy).toHaveBeenCalledTimes(1)
      })
    })

    it('should close dropdown with Escape key', async () => {
      const { container } = render(PersonMultiSelect, { props: { people: mockPeople } })

      const input = container.querySelector('input[type="text"]')
      await fireEvent.focus(input)

      expect(container.querySelector('[role="listbox"]')).toBeTruthy()

      await fireEvent.keyDown(input, { key: 'Escape' })

      expect(container.querySelector('[role="listbox"]')).toBeFalsy()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      const { container } = render(PersonMultiSelect, { props: { people: mockPeople } })

      const input = container.querySelector('input[type="text"]')
      expect(input.getAttribute('role')).toBe('combobox')
      expect(input.getAttribute('aria-autocomplete')).toBe('list')
      expect(input.getAttribute('aria-haspopup')).toBe('listbox')
    })

    it('should announce selection count to screen readers', async () => {
      const { container } = render(PersonMultiSelect, { props: { people: mockPeople } })

      const input = container.querySelector('input[type="text"]')
      await fireEvent.focus(input)

      const firstOption = container.querySelector('[role="option"]')
      await fireEvent.click(firstOption)

      const liveRegion = container.querySelector('[role="status"][aria-live="polite"]')
      expect(liveRegion).toBeTruthy()
    })

    it('should have unique IDs for each option', async () => {
      const { container } = render(PersonMultiSelect, { props: { people: mockPeople } })

      const input = container.querySelector('input[type="text"]')
      await fireEvent.focus(input)

      const options = container.querySelectorAll('[role="option"]')
      const ids = Array.from(options).map(opt => opt.id)
      const uniqueIds = new Set(ids)

      expect(ids.length).toBe(uniqueIds.size)
    })
  })

  describe('Clear Functionality', () => {
    it('should provide a clear all selections button when selections exist', async () => {
      const { container } = render(PersonMultiSelect, { props: { people: mockPeople } })

      const input = container.querySelector('input[type="text"]')
      await fireEvent.focus(input)

      const firstOption = container.querySelector('[role="option"]')
      await fireEvent.click(firstOption)

      expect(screen.getByText(/Clear all/i)).toBeTruthy()
    })

    it('should clear all selections when clear button is clicked', async () => {
      const { component, container } = render(PersonMultiSelect, { props: { people: mockPeople } })

      const selectionSpy = vi.fn()
      component.$on('selectionChange', selectionSpy)

      const input = container.querySelector('input[type="text"]')
      await fireEvent.focus(input)

      const firstOption = container.querySelector('[role="option"]')
      await fireEvent.click(firstOption)

      const clearButton = screen.getByText(/Clear all/i)
      await fireEvent.click(clearButton)

      await waitFor(() => {
        const lastCall = selectionSpy.mock.calls[selectionSpy.mock.calls.length - 1][0]
        expect(lastCall.detail.length).toBe(0)
      })
    })
  })
})
