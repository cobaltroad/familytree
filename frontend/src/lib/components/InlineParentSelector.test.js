import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, fireEvent, screen } from '@testing-library/svelte'
import InlineParentSelector from './InlineParentSelector.svelte'
import { people } from '../../stores/familyStore.js'
import { get } from 'svelte/store'

describe('InlineParentSelector', () => {
  const mockPeople = [
    { id: 1, firstName: 'John', lastName: 'Doe', gender: 'male', birthDate: '1950-01-01' },
    { id: 2, firstName: 'Jane', lastName: 'Smith', gender: 'female', birthDate: '1952-02-02' },
    { id: 3, firstName: 'Bob', lastName: 'Jones', gender: 'male', birthDate: '1948-03-03' },
    { id: 4, firstName: 'Alice', lastName: 'Brown', gender: 'female', birthDate: '1980-04-04' }
  ]

  beforeEach(() => {
    people.set(mockPeople)
  })

  describe('rendering', () => {
    it('should render parent role label', () => {
      const { container } = render(InlineParentSelector, {
        props: {
          parentRole: 'mother',
          currentParentId: null,
          excludePersonId: 4
        }
      })

      expect(container.textContent.toLowerCase()).toContain('mother')
    })

    it('should render father role label', () => {
      const { container } = render(InlineParentSelector, {
        props: {
          parentRole: 'father',
          currentParentId: null,
          excludePersonId: 4
        }
      })

      expect(container.textContent.toLowerCase()).toContain('father')
    })

    it('should render dropdown select element', () => {
      const { container } = render(InlineParentSelector, {
        props: {
          parentRole: 'mother',
          currentParentId: null,
          excludePersonId: 4
        }
      })

      const select = container.querySelector('select')
      expect(select).toBeTruthy()
    })

    it('should show "No mother" option when no parent selected', () => {
      const { container } = render(InlineParentSelector, {
        props: {
          parentRole: 'mother',
          currentParentId: null,
          excludePersonId: 4
        }
      })

      const select = container.querySelector('select')
      expect(select.textContent).toContain('No mother')
    })

    it('should show "No father" option when no parent selected', () => {
      const { container } = render(InlineParentSelector, {
        props: {
          parentRole: 'father',
          currentParentId: null,
          excludePersonId: 4
        }
      })

      const select = container.querySelector('select')
      expect(select.textContent).toContain('No father')
    })

    it('should display current parent when selected', () => {
      const { container } = render(InlineParentSelector, {
        props: {
          parentRole: 'mother',
          currentParentId: 2,
          excludePersonId: 4
        }
      })

      const select = container.querySelector('select')
      expect(select.value).toBe('2')
    })

    it('should list available people in dropdown', () => {
      const { container } = render(InlineParentSelector, {
        props: {
          parentRole: 'mother',
          currentParentId: null,
          excludePersonId: 4
        }
      })

      const select = container.querySelector('select')
      const options = Array.from(select.querySelectorAll('option'))

      // Should include at least "No mother" and some people
      expect(options.length).toBeGreaterThan(1)
    })

    it('should exclude self from dropdown options', () => {
      const { container } = render(InlineParentSelector, {
        props: {
          parentRole: 'mother',
          currentParentId: null,
          excludePersonId: 4
        }
      })

      const select = container.querySelector('select')
      const options = Array.from(select.querySelectorAll('option'))
      const aliceOption = options.find(opt => opt.textContent.includes('Alice Brown'))

      expect(aliceOption).toBeFalsy()
    })
  })

  describe('interaction', () => {
    it('should emit select event when parent is chosen', async () => {
      const { container, component } = render(InlineParentSelector, {
        props: {
          parentRole: 'mother',
          currentParentId: null,
          excludePersonId: 4
        }
      })

      let emittedParentId = null
      component.$on('select', (event) => {
        emittedParentId = event.detail.parentId
      })

      const select = container.querySelector('select')
      select.value = '2'
      await fireEvent.change(select)

      expect(emittedParentId).toBe(2)
    })

    it('should emit null when "No parent" is selected', async () => {
      const { container, component } = render(InlineParentSelector, {
        props: {
          parentRole: 'mother',
          currentParentId: 2,
          excludePersonId: 4
        }
      })

      let emittedParentId = undefined
      component.$on('select', (event) => {
        emittedParentId = event.detail.parentId
      })

      const select = container.querySelector('select')
      select.value = ''
      await fireEvent.change(select)

      expect(emittedParentId).toBe(null)
    })

    it('should emit remove event when remove button is clicked', async () => {
      const { container, component } = render(InlineParentSelector, {
        props: {
          parentRole: 'mother',
          currentParentId: 2,
          excludePersonId: 4
        }
      })

      let removeEmitted = false
      component.$on('remove', () => {
        removeEmitted = true
      })

      const removeButton = container.querySelector('button, .remove-button, [aria-label*="Remove"]')
      if (removeButton) {
        await fireEvent.click(removeButton)
        expect(removeEmitted).toBe(true)
      }
    })

    it('should show remove button when parent is selected', () => {
      const { container } = render(InlineParentSelector, {
        props: {
          parentRole: 'mother',
          currentParentId: 2,
          excludePersonId: 4
        }
      })

      const removeButton = container.querySelector('button, .remove-button')
      expect(removeButton).toBeTruthy()
    })

    it('should not show remove button when no parent selected', () => {
      const { container } = render(InlineParentSelector, {
        props: {
          parentRole: 'mother',
          currentParentId: null,
          excludePersonId: 4
        }
      })

      const removeButton = container.querySelector('.remove-button, button[aria-label*="Remove"]')
      // Remove button should not exist or should be hidden
      expect(removeButton === null || removeButton.style.display === 'none' || removeButton.classList.contains('hidden')).toBeTruthy()
    })
  })

  describe('accessibility', () => {
    it('should have label for select element', () => {
      const { container } = render(InlineParentSelector, {
        props: {
          parentRole: 'mother',
          currentParentId: null,
          excludePersonId: 4
        }
      })

      const label = container.querySelector('label')
      const select = container.querySelector('select')

      expect(label).toBeTruthy()
      expect(select.getAttribute('id')).toBeTruthy()
    })

    it('should have descriptive label text', () => {
      const { container } = render(InlineParentSelector, {
        props: {
          parentRole: 'mother',
          currentParentId: null,
          excludePersonId: 4
        }
      })

      const label = container.querySelector('label')
      expect(label.textContent.toLowerCase()).toContain('mother')
    })

    it('should have aria-label on remove button', () => {
      const { container } = render(InlineParentSelector, {
        props: {
          parentRole: 'mother',
          currentParentId: 2,
          excludePersonId: 4
        }
      })

      const removeButton = container.querySelector('button')
      if (removeButton) {
        const ariaLabel = removeButton.getAttribute('aria-label')
        expect(ariaLabel).toBeTruthy()
        expect(ariaLabel.toLowerCase()).toContain('remove')
      }
    })

    it('should be keyboard accessible', () => {
      const { container } = render(InlineParentSelector, {
        props: {
          parentRole: 'mother',
          currentParentId: null,
          excludePersonId: 4
        }
      })

      const select = container.querySelector('select')
      expect(select.getAttribute('tabindex') !== '-1').toBe(true)
    })
  })

  describe('filtering logic', () => {
    it('should filter by gender for mother (female)', () => {
      const { container } = render(InlineParentSelector, {
        props: {
          parentRole: 'mother',
          currentParentId: null,
          excludePersonId: 4
        }
      })

      const select = container.querySelector('select')
      const options = Array.from(select.querySelectorAll('option'))

      // Should have Jane Smith (female) but not John Doe (male) or Bob Jones (male)
      const hasJane = options.some(opt => opt.textContent.includes('Jane Smith'))
      const hasJohn = options.some(opt => opt.textContent.includes('John Doe'))
      const hasBob = options.some(opt => opt.textContent.includes('Bob Jones'))

      expect(hasJane).toBe(true)
      expect(hasJohn).toBe(false)
      expect(hasBob).toBe(false)
    })

    it('should filter by gender for father (male)', () => {
      const { container } = render(InlineParentSelector, {
        props: {
          parentRole: 'father',
          currentParentId: null,
          excludePersonId: 4
        }
      })

      const select = container.querySelector('select')
      const options = Array.from(select.querySelectorAll('option'))

      // Should have John Doe and Bob Jones (male) but not Jane Smith (female)
      const hasJohn = options.some(opt => opt.textContent.includes('John Doe'))
      const hasBob = options.some(opt => opt.textContent.includes('Bob Jones'))
      const hasJane = options.some(opt => opt.textContent.includes('Jane Smith'))

      expect(hasJohn).toBe(true)
      expect(hasBob).toBe(true)
      expect(hasJane).toBe(false)
    })

    it('should exclude person from their own parent options', () => {
      const { container } = render(InlineParentSelector, {
        props: {
          parentRole: 'mother',
          currentParentId: null,
          excludePersonId: 2
        }
      })

      const select = container.querySelector('select')
      const options = Array.from(select.querySelectorAll('option'))

      // Jane Smith (id: 2) should not be in her own parent list
      const hasJaneSmith = options.some(opt => opt.value === '2')
      expect(hasJaneSmith).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('should handle empty people list', () => {
      people.set([])

      const { container } = render(InlineParentSelector, {
        props: {
          parentRole: 'mother',
          currentParentId: null,
          excludePersonId: 1
        }
      })

      const select = container.querySelector('select')
      expect(select).toBeTruthy()
    })

    it('should handle no matching gender available', () => {
      people.set([
        { id: 1, firstName: 'John', lastName: 'Doe', gender: 'male' }
      ])

      const { container } = render(InlineParentSelector, {
        props: {
          parentRole: 'mother',
          currentParentId: null,
          excludePersonId: 2
        }
      })

      const select = container.querySelector('select')
      const options = Array.from(select.querySelectorAll('option'))

      // Should only have "No mother" option
      expect(options.length).toBe(1)
      expect(options[0].textContent).toContain('No mother')
    })

    it('should handle invalid current parent ID gracefully', () => {
      const { container } = render(InlineParentSelector, {
        props: {
          parentRole: 'mother',
          currentParentId: 999,
          excludePersonId: 4
        }
      })

      const select = container.querySelector('select')
      expect(select).toBeTruthy()
    })

    it('should handle unspecified gender people', () => {
      people.set([
        { id: 1, firstName: 'Pat', lastName: 'Smith', gender: '' },
        { id: 2, firstName: 'Alex', lastName: 'Jones', gender: 'other' }
      ])

      const { container } = render(InlineParentSelector, {
        props: {
          parentRole: 'mother',
          currentParentId: null,
          excludePersonId: 3
        }
      })

      const select = container.querySelector('select')
      const options = Array.from(select.querySelectorAll('option'))

      // Unspecified/other gender people should not be shown for mother/father roles
      expect(options.length).toBe(1) // Only "No mother"
    })
  })

  describe('responsive behavior', () => {
    it('should render on mobile viewport', () => {
      global.innerWidth = 375
      global.innerHeight = 667

      const { container } = render(InlineParentSelector, {
        props: {
          parentRole: 'mother',
          currentParentId: null,
          excludePersonId: 4
        }
      })

      const select = container.querySelector('select')
      expect(select).toBeTruthy()
    })

    it('should render on desktop viewport', () => {
      global.innerWidth = 1920
      global.innerHeight = 1080

      const { container } = render(InlineParentSelector, {
        props: {
          parentRole: 'father',
          currentParentId: null,
          excludePersonId: 4
        }
      })

      const select = container.querySelector('select')
      expect(select).toBeTruthy()
    })
  })
})
