/**
 * @jest-environment jsdom
 */

/**
 * DuplicateResolutionChoice Component Tests
 * Story #106: GEDCOM Duplicate Resolution UI
 *
 * Tests the radio button group for resolution choices (merge, import as new, skip)
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/svelte'
import DuplicateResolutionChoice from './DuplicateResolutionChoice.svelte'

describe('DuplicateResolutionChoice', () => {
  const mockGedcomPerson = {
    gedcomId: '@I001@',
    firstName: 'John',
    lastName: 'Smith',
    birthDate: '1950-01-15',
    birthPlace: 'New York, NY'
  }

  const mockExistingPerson = {
    id: 42,
    firstName: 'John',
    lastName: 'Smith',
    birthDate: '1950-01-20',
    birthPlace: 'Boston, MA'
  }

  describe('Rendering and Structure', () => {
    it('should render the component with heading', () => {
      // Act
      render(DuplicateResolutionChoice, {
        props: {
          selectedResolution: null,
          gedcomPerson: mockGedcomPerson,
          existingPerson: mockExistingPerson
        }
      })

      // Assert
      expect(screen.getByText('How would you like to handle this duplicate?')).toBeInTheDocument()
    })

    it('should render all three resolution options', () => {
      // Act
      render(DuplicateResolutionChoice, {
        props: {
          selectedResolution: null,
          gedcomPerson: mockGedcomPerson,
          existingPerson: mockExistingPerson
        }
      })

      // Assert
      expect(screen.getByText('Merge with Existing')).toBeInTheDocument()
      expect(screen.getByText('Import as New Person')).toBeInTheDocument()
      expect(screen.getByText('Skip This Person')).toBeInTheDocument()
    })

    it('should render all radio buttons', () => {
      // Act
      const { container } = render(DuplicateResolutionChoice, {
        props: {
          selectedResolution: null,
          gedcomPerson: mockGedcomPerson,
          existingPerson: mockExistingPerson
        }
      })

      // Assert
      const radioButtons = container.querySelectorAll('input[type="radio"]')
      expect(radioButtons.length).toBe(3)
    })

    it('should render "Recommended" badge on merge option', () => {
      // Act
      render(DuplicateResolutionChoice, {
        props: {
          selectedResolution: null,
          gedcomPerson: mockGedcomPerson,
          existingPerson: mockExistingPerson
        }
      })

      // Assert
      expect(screen.getByText('Recommended')).toBeInTheDocument()
    })
  })

  describe('Option Descriptions', () => {
    it('should display merge option description', () => {
      // Act
      render(DuplicateResolutionChoice, {
        props: {
          selectedResolution: null,
          gedcomPerson: mockGedcomPerson,
          existingPerson: mockExistingPerson
        }
      })

      // Assert
      expect(screen.getByText(/Update the existing person with new information/)).toBeInTheDocument()
    })

    it('should display import as new option description', () => {
      // Act
      render(DuplicateResolutionChoice, {
        props: {
          selectedResolution: null,
          gedcomPerson: mockGedcomPerson,
          existingPerson: mockExistingPerson
        }
      })

      // Assert
      expect(screen.getByText(/Create a new person record/)).toBeInTheDocument()
    })

    it('should display skip option description', () => {
      // Act
      render(DuplicateResolutionChoice, {
        props: {
          selectedResolution: null,
          gedcomPerson: mockGedcomPerson,
          existingPerson: mockExistingPerson
        }
      })

      // Assert
      expect(screen.getByText(/Don't import this person/)).toBeInTheDocument()
    })
  })

  describe('Selection State', () => {
    it('should check merge radio when selectedResolution is "merge"', () => {
      // Act
      const { container } = render(DuplicateResolutionChoice, {
        props: {
          selectedResolution: 'merge',
          gedcomPerson: mockGedcomPerson,
          existingPerson: mockExistingPerson
        }
      })

      // Assert
      const mergeRadio = container.querySelector('input[value="merge"]')
      expect(mergeRadio.checked).toBe(true)
    })

    it('should check import_as_new radio when selectedResolution is "import_as_new"', () => {
      // Act
      const { container } = render(DuplicateResolutionChoice, {
        props: {
          selectedResolution: 'import_as_new',
          gedcomPerson: mockGedcomPerson,
          existingPerson: mockExistingPerson
        }
      })

      // Assert
      const importRadio = container.querySelector('input[value="import_as_new"]')
      expect(importRadio.checked).toBe(true)
    })

    it('should check skip radio when selectedResolution is "skip"', () => {
      // Act
      const { container } = render(DuplicateResolutionChoice, {
        props: {
          selectedResolution: 'skip',
          gedcomPerson: mockGedcomPerson,
          existingPerson: mockExistingPerson
        }
      })

      // Assert
      const skipRadio = container.querySelector('input[value="skip"]')
      expect(skipRadio.checked).toBe(true)
    })

    it('should have no radio selected when selectedResolution is null', () => {
      // Act
      const { container } = render(DuplicateResolutionChoice, {
        props: {
          selectedResolution: null,
          gedcomPerson: mockGedcomPerson,
          existingPerson: mockExistingPerson
        }
      })

      // Assert
      const radioButtons = container.querySelectorAll('input[type="radio"]:checked')
      expect(radioButtons.length).toBe(0)
    })

    it('should apply selected class to merge option when selected', () => {
      // Act
      const { container } = render(DuplicateResolutionChoice, {
        props: {
          selectedResolution: 'merge',
          gedcomPerson: mockGedcomPerson,
          existingPerson: mockExistingPerson
        }
      })

      // Assert
      const selectedOptions = container.querySelectorAll('.resolution-option.selected')
      expect(selectedOptions.length).toBe(1)
    })
  })

  describe('Event Handling', () => {
    it('should dispatch change event when merge is selected', async () => {
      // Arrange
      const { component, container } = render(DuplicateResolutionChoice, {
        props: {
          selectedResolution: null,
          gedcomPerson: mockGedcomPerson,
          existingPerson: mockExistingPerson
        }
      })

      const changeHandler = vi.fn()
      component.$on('change', changeHandler)

      // Act
      const mergeRadio = container.querySelector('input[value="merge"]')
      await fireEvent.change(mergeRadio)

      // Assert
      expect(changeHandler).toHaveBeenCalledTimes(1)
      expect(changeHandler.mock.calls[0][0].detail).toBe('merge')
    })

    it('should dispatch change event when import_as_new is selected', async () => {
      // Arrange
      const { component, container } = render(DuplicateResolutionChoice, {
        props: {
          selectedResolution: null,
          gedcomPerson: mockGedcomPerson,
          existingPerson: mockExistingPerson
        }
      })

      const changeHandler = vi.fn()
      component.$on('change', changeHandler)

      // Act
      const importRadio = container.querySelector('input[value="import_as_new"]')
      await fireEvent.change(importRadio)

      // Assert
      expect(changeHandler).toHaveBeenCalledTimes(1)
      expect(changeHandler.mock.calls[0][0].detail).toBe('import_as_new')
    })

    it('should dispatch change event when skip is selected', async () => {
      // Arrange
      const { component, container } = render(DuplicateResolutionChoice, {
        props: {
          selectedResolution: null,
          gedcomPerson: mockGedcomPerson,
          existingPerson: mockExistingPerson
        }
      })

      const changeHandler = vi.fn()
      component.$on('change', changeHandler)

      // Act
      const skipRadio = container.querySelector('input[value="skip"]')
      await fireEvent.change(skipRadio)

      // Assert
      expect(changeHandler).toHaveBeenCalledTimes(1)
      expect(changeHandler.mock.calls[0][0].detail).toBe('skip')
    })
  })

  describe('Differing Fields Warning', () => {
    it('should show fields that will be updated when merging', () => {
      // Arrange
      const gedcomPerson = {
        ...mockGedcomPerson,
        birthDate: '1950-01-15',
        birthPlace: 'New York, NY'
      }

      const existingPerson = {
        ...mockExistingPerson,
        birthDate: '1950-01-20',
        birthPlace: 'Boston, MA'
      }

      // Act
      render(DuplicateResolutionChoice, {
        props: {
          selectedResolution: 'merge',
          gedcomPerson,
          existingPerson
        }
      })

      // Assert
      expect(screen.getByText(/Will update:/)).toBeInTheDocument()
      expect(screen.getByText(/birth date/)).toBeInTheDocument()
      expect(screen.getByText(/birth place/)).toBeInTheDocument()
    })

    it('should show death date in differing fields if different', () => {
      // Arrange
      const gedcomPerson = {
        ...mockGedcomPerson,
        deathDate: '2020-05-10'
      }

      const existingPerson = {
        ...mockExistingPerson,
        deathDate: '2020-05-15'
      }

      // Act
      render(DuplicateResolutionChoice, {
        props: {
          selectedResolution: 'merge',
          gedcomPerson,
          existingPerson
        }
      })

      // Assert
      expect(screen.getByText(/death date/)).toBeInTheDocument()
    })

    it('should show death place in differing fields if different', () => {
      // Arrange
      const gedcomPerson = {
        ...mockGedcomPerson,
        deathPlace: 'Boston, MA'
      }

      const existingPerson = {
        ...mockExistingPerson,
        deathPlace: 'New York, NY'
      }

      // Act
      render(DuplicateResolutionChoice, {
        props: {
          selectedResolution: 'merge',
          gedcomPerson,
          existingPerson
        }
      })

      // Assert
      expect(screen.getByText(/death place/)).toBeInTheDocument()
    })

    it('should not show differing fields warning when no differences', () => {
      // Arrange
      const gedcomPerson = {
        firstName: 'John',
        lastName: 'Smith',
        birthDate: '1950-01-15',
        birthPlace: 'New York, NY'
      }

      const existingPerson = {
        firstName: 'John',
        lastName: 'Smith',
        birthDate: '1950-01-15',
        birthPlace: 'New York, NY'
      }

      // Act
      render(DuplicateResolutionChoice, {
        props: {
          selectedResolution: 'merge',
          gedcomPerson,
          existingPerson
        }
      })

      // Assert
      expect(screen.queryByText(/Will update:/)).not.toBeInTheDocument()
    })
  })

  describe('Warnings', () => {
    it('should show warning for import_as_new about duplicate records', () => {
      // Act
      render(DuplicateResolutionChoice, {
        props: {
          selectedResolution: null,
          gedcomPerson: mockGedcomPerson,
          existingPerson: mockExistingPerson
        }
      })

      // Assert
      expect(screen.getByText(/This may create duplicate records/)).toBeInTheDocument()
    })

    it('should show field update warning for merge option when fields differ', () => {
      // Arrange
      const gedcomPerson = {
        ...mockGedcomPerson,
        birthDate: '1950-01-15'
      }

      const existingPerson = {
        ...mockExistingPerson,
        birthDate: '1950-01-20'
      }

      // Act
      const { container } = render(DuplicateResolutionChoice, {
        props: {
          selectedResolution: 'merge',
          gedcomPerson,
          existingPerson
        }
      })

      // Assert
      const warnings = container.querySelectorAll('.option-warning')
      expect(warnings.length).toBeGreaterThan(0)
    })
  })

  describe('Accessibility', () => {
    it('should have proper fieldset structure with legend', () => {
      // Act
      const { container } = render(DuplicateResolutionChoice, {
        props: {
          selectedResolution: null,
          gedcomPerson: mockGedcomPerson,
          existingPerson: mockExistingPerson
        }
      })

      // Assert
      expect(container.querySelector('h4')).toBeInTheDocument()
    })

    it('should have all radio buttons with same name attribute', () => {
      // Act
      const { container } = render(DuplicateResolutionChoice, {
        props: {
          selectedResolution: null,
          gedcomPerson: mockGedcomPerson,
          existingPerson: mockExistingPerson
        }
      })

      // Assert
      const radioButtons = container.querySelectorAll('input[type="radio"][name="resolution"]')
      expect(radioButtons.length).toBe(3)
    })

    it('should have labels wrapping radio buttons for better clickability', () => {
      // Act
      const { container } = render(DuplicateResolutionChoice, {
        props: {
          selectedResolution: null,
          gedcomPerson: mockGedcomPerson,
          existingPerson: mockExistingPerson
        }
      })

      // Assert
      const labels = container.querySelectorAll('label.resolution-option')
      expect(labels.length).toBe(3)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty gedcomPerson object', () => {
      // Act
      render(DuplicateResolutionChoice, {
        props: {
          selectedResolution: null,
          gedcomPerson: {},
          existingPerson: mockExistingPerson
        }
      })

      // Assert
      expect(screen.getByText('Merge with Existing')).toBeInTheDocument()
    })

    it('should handle empty existingPerson object', () => {
      // Act
      render(DuplicateResolutionChoice, {
        props: {
          selectedResolution: null,
          gedcomPerson: mockGedcomPerson,
          existingPerson: {}
        }
      })

      // Assert
      expect(screen.getByText('Merge with Existing')).toBeInTheDocument()
    })

    it('should handle null birth dates without errors', () => {
      // Arrange
      const gedcomPerson = {
        firstName: 'John',
        lastName: 'Smith',
        birthDate: null
      }

      const existingPerson = {
        firstName: 'John',
        lastName: 'Smith',
        birthDate: null
      }

      // Act
      render(DuplicateResolutionChoice, {
        props: {
          selectedResolution: 'merge',
          gedcomPerson,
          existingPerson
        }
      })

      // Assert - Should not crash
      expect(screen.getByText('Merge with Existing')).toBeInTheDocument()
    })

    it('should handle undefined death date in gedcom person', () => {
      // Arrange
      const gedcomPerson = {
        firstName: 'John',
        lastName: 'Smith'
        // No deathDate
      }

      const existingPerson = {
        firstName: 'John',
        lastName: 'Smith',
        deathDate: '2020-05-10'
      }

      // Act
      render(DuplicateResolutionChoice, {
        props: {
          selectedResolution: 'merge',
          gedcomPerson,
          existingPerson
        }
      })

      // Assert - Should not show death date in differing fields
      expect(screen.queryByText(/death date/)).not.toBeInTheDocument()
    })
  })
})
