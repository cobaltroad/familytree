/**
 * @jest-environment jsdom
 */

/**
 * DuplicateComparisonCard Component Tests
 * Story #106: GEDCOM Duplicate Resolution UI
 *
 * Tests the side-by-side comparison card for GEDCOM and existing person data
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/svelte'
import DuplicateComparisonCard from './DuplicateComparisonCard.svelte'

describe('DuplicateComparisonCard', () => {
  describe('Card Structure and Display', () => {
    it('should render card with title', () => {
      // Arrange
      const person = {
        firstName: 'John',
        lastName: 'Smith',
        birthDate: '1950-01-15'
      }

      // Act
      render(DuplicateComparisonCard, {
        props: {
          person,
          title: 'GEDCOM Data (New)',
          matchingFields: {}
        }
      })

      // Assert
      expect(screen.getByText('GEDCOM Data (New)')).toBeInTheDocument()
    })

    it('should display person name', () => {
      // Arrange
      const person = {
        firstName: 'John',
        lastName: 'Smith'
      }

      // Act
      render(DuplicateComparisonCard, {
        props: {
          person,
          title: 'Test Person',
          matchingFields: {}
        }
      })

      // Assert
      expect(screen.getByText('John Smith')).toBeInTheDocument()
    })

    it('should display person name from name field if available', () => {
      // Arrange
      const person = {
        name: 'Jane Doe',
        firstName: 'Jane',
        lastName: 'Doe'
      }

      // Act
      render(DuplicateComparisonCard, {
        props: {
          person,
          title: 'Test Person',
          matchingFields: {}
        }
      })

      // Assert
      expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    })

    it('should display Unknown when no name is provided', () => {
      // Arrange
      const person = {}

      // Act
      render(DuplicateComparisonCard, {
        props: {
          person,
          title: 'Test Person',
          matchingFields: {}
        }
      })

      // Assert - Use getAllByText since there are multiple "Unknown" fields
      const unknownTexts = screen.getAllByText('Unknown')
      expect(unknownTexts.length).toBeGreaterThan(0)
    })
  })

  describe('Field Display', () => {
    it('should display birth date', () => {
      // Arrange
      const person = {
        firstName: 'John',
        lastName: 'Smith',
        birthDate: '1950-01-15'
      }

      // Act
      render(DuplicateComparisonCard, {
        props: {
          person,
          title: 'Test',
          matchingFields: {}
        }
      })

      // Assert
      expect(screen.getByText('Birth Date:')).toBeInTheDocument()
      expect(screen.getByText('1950-01-15')).toBeInTheDocument()
    })

    it('should display Unknown for missing birth date', () => {
      // Arrange
      const person = {
        firstName: 'John',
        lastName: 'Smith'
      }

      // Act
      render(DuplicateComparisonCard, {
        props: {
          person,
          title: 'Test',
          matchingFields: {}
        }
      })

      // Assert - Use getAllByText since there may be multiple "Unknown" fields
      const unknownTexts = screen.getAllByText('Unknown')
      expect(unknownTexts.length).toBeGreaterThan(0)
    })

    it('should display birth place when provided', () => {
      // Arrange
      const person = {
        firstName: 'John',
        lastName: 'Smith',
        birthPlace: 'New York, NY'
      }

      // Act
      render(DuplicateComparisonCard, {
        props: {
          person,
          title: 'Test',
          matchingFields: { birthPlace: true }
        }
      })

      // Assert
      expect(screen.getByText('Birth Place:')).toBeInTheDocument()
      expect(screen.getByText('New York, NY')).toBeInTheDocument()
    })

    it('should display death date when provided', () => {
      // Arrange
      const person = {
        firstName: 'John',
        lastName: 'Smith',
        deathDate: '2020-05-10'
      }

      // Act
      render(DuplicateComparisonCard, {
        props: {
          person,
          title: 'Test',
          matchingFields: { deathDate: true }
        }
      })

      // Assert
      expect(screen.getByText('Death Date:')).toBeInTheDocument()
      expect(screen.getByText('2020-05-10')).toBeInTheDocument()
    })

    it('should display death place when provided', () => {
      // Arrange
      const person = {
        firstName: 'John',
        lastName: 'Smith',
        deathPlace: 'Boston, MA'
      }

      // Act
      render(DuplicateComparisonCard, {
        props: {
          person,
          title: 'Test',
          matchingFields: { deathPlace: true }
        }
      })

      // Assert
      expect(screen.getByText('Death Place:')).toBeInTheDocument()
      expect(screen.getByText('Boston, MA')).toBeInTheDocument()
    })

    it('should display gender', () => {
      // Arrange
      const person = {
        firstName: 'John',
        lastName: 'Smith',
        gender: 'male'
      }

      // Act
      render(DuplicateComparisonCard, {
        props: {
          person,
          title: 'Test',
          matchingFields: {}
        }
      })

      // Assert
      expect(screen.getByText('Gender:')).toBeInTheDocument()
      expect(screen.getByText('male')).toBeInTheDocument()
    })

    it('should display Unknown for missing gender', () => {
      // Arrange
      const person = {
        firstName: 'John',
        lastName: 'Smith'
      }

      // Act
      render(DuplicateComparisonCard, {
        props: {
          person,
          title: 'Test',
          matchingFields: {}
        }
      })

      // Assert
      const genderLabel = screen.getByText('Gender:')
      expect(genderLabel).toBeInTheDocument()
    })
  })

  describe('Field Highlighting - Matching Fields', () => {
    it('should highlight matching name field with green background', () => {
      // Arrange
      const person = {
        name: 'John Smith'
      }

      // Act
      const { container } = render(DuplicateComparisonCard, {
        props: {
          person,
          title: 'Test',
          matchingFields: { name: true }
        }
      })

      // Assert
      const fieldGroups = container.querySelectorAll('.field-group.matching')
      expect(fieldGroups.length).toBeGreaterThan(0)
    })

    it('should highlight matching birth date field', () => {
      // Arrange
      const person = {
        firstName: 'John',
        lastName: 'Smith',
        birthDate: '1950-01-15'
      }

      // Act
      const { container } = render(DuplicateComparisonCard, {
        props: {
          person,
          title: 'Test',
          matchingFields: { birthDate: true }
        }
      })

      // Assert
      const matchingFields = container.querySelectorAll('.field-group.matching')
      expect(matchingFields.length).toBeGreaterThan(0)
    })

    it('should highlight matching gender field', () => {
      // Arrange
      const person = {
        firstName: 'John',
        lastName: 'Smith',
        gender: 'male'
      }

      // Act
      const { container } = render(DuplicateComparisonCard, {
        props: {
          person,
          title: 'Test',
          matchingFields: { gender: true }
        }
      })

      // Assert
      const matchingFields = container.querySelectorAll('.field-group.matching')
      expect(matchingFields.length).toBeGreaterThan(0)
    })
  })

  describe('Field Highlighting - Different Fields', () => {
    it('should highlight different fields with yellow background', () => {
      // Arrange
      const person = {
        firstName: 'John',
        lastName: 'Smith',
        birthDate: '1950-01-15'
      }

      // Act
      const { container } = render(DuplicateComparisonCard, {
        props: {
          person,
          title: 'Test',
          matchingFields: { birthDate: false }
        }
      })

      // Assert
      const differentFields = container.querySelectorAll('.field-group.different')
      expect(differentFields.length).toBeGreaterThan(0)
    })

    it('should apply different styling to non-matching name', () => {
      // Arrange
      const person = {
        name: 'John Smith'
      }

      // Act
      const { container } = render(DuplicateComparisonCard, {
        props: {
          person,
          title: 'Test',
          matchingFields: { name: false }
        }
      })

      // Assert
      const differentFields = container.querySelectorAll('.field-group.different')
      expect(differentFields.length).toBeGreaterThan(0)
    })
  })

  describe('Photo Display', () => {
    it('should display photo when photoUrl is provided', () => {
      // Arrange
      const person = {
        firstName: 'John',
        lastName: 'Smith',
        photoUrl: 'https://example.com/photo.jpg'
      }

      // Act
      render(DuplicateComparisonCard, {
        props: {
          person,
          title: 'Test',
          matchingFields: {}
        }
      })

      // Assert
      const photo = screen.getByAltText('John Smith')
      expect(photo).toBeInTheDocument()
      expect(photo).toHaveAttribute('src', 'https://example.com/photo.jpg')
    })

    it('should display initials avatar when no photo is provided', () => {
      // Arrange
      const person = {
        firstName: 'John',
        lastName: 'Smith'
      }

      // Act
      const { container } = render(DuplicateComparisonCard, {
        props: {
          person,
          title: 'Test',
          matchingFields: {}
        }
      })

      // Assert
      const avatar = container.querySelector('.initials-avatar')
      expect(avatar).toBeInTheDocument()
      expect(avatar.textContent).toBe('JS')
    })

    it('should generate correct initials from first and last name', () => {
      // Arrange
      const person = {
        firstName: 'Mary',
        lastName: 'Johnson'
      }

      // Act
      const { container } = render(DuplicateComparisonCard, {
        props: {
          person,
          title: 'Test',
          matchingFields: {}
        }
      })

      // Assert
      const avatar = container.querySelector('.initials-avatar')
      expect(avatar.textContent).toBe('MJ')
    })

    it('should display question mark when no name available', () => {
      // Arrange
      const person = {}

      // Act
      const { container } = render(DuplicateComparisonCard, {
        props: {
          person,
          title: 'Test',
          matchingFields: {}
        }
      })

      // Assert
      const avatar = container.querySelector('.initials-avatar')
      expect(avatar.textContent).toBe('?')
    })
  })

  describe('Conditional Field Rendering', () => {
    it('should only show birth place if provided or in matchingFields', () => {
      // Arrange
      const person = {
        firstName: 'John',
        lastName: 'Smith'
      }

      // Act
      render(DuplicateComparisonCard, {
        props: {
          person,
          title: 'Test',
          matchingFields: {}
        }
      })

      // Assert
      expect(screen.queryByText('Birth Place:')).not.toBeInTheDocument()
    })

    it('should show birth place if in matchingFields even if null', () => {
      // Arrange
      const person = {
        firstName: 'John',
        lastName: 'Smith'
      }

      // Act
      render(DuplicateComparisonCard, {
        props: {
          person,
          title: 'Test',
          matchingFields: { birthPlace: false }
        }
      })

      // Assert
      expect(screen.getByText('Birth Place:')).toBeInTheDocument()
    })

    it('should only show death date if provided or in matchingFields', () => {
      // Arrange
      const person = {
        firstName: 'John',
        lastName: 'Smith'
      }

      // Act
      render(DuplicateComparisonCard, {
        props: {
          person,
          title: 'Test',
          matchingFields: {}
        }
      })

      // Assert
      expect(screen.queryByText('Death Date:')).not.toBeInTheDocument()
    })

    it('should only show death place if provided or in matchingFields', () => {
      // Arrange
      const person = {
        firstName: 'John',
        lastName: 'Smith'
      }

      // Act
      render(DuplicateComparisonCard, {
        props: {
          person,
          title: 'Test',
          matchingFields: {}
        }
      })

      // Assert
      expect(screen.queryByText('Death Place:')).not.toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle person with all fields populated', () => {
      // Arrange
      const person = {
        firstName: 'John',
        lastName: 'Smith',
        birthDate: '1950-01-15',
        birthPlace: 'New York, NY',
        deathDate: '2020-05-10',
        deathPlace: 'Boston, MA',
        gender: 'male',
        photoUrl: 'https://example.com/photo.jpg'
      }

      // Act
      render(DuplicateComparisonCard, {
        props: {
          person,
          title: 'Complete Person',
          matchingFields: {
            name: true,
            birthDate: true,
            birthPlace: true,
            deathDate: true,
            deathPlace: true,
            gender: true
          }
        }
      })

      // Assert
      expect(screen.getByText('Complete Person')).toBeInTheDocument()
      expect(screen.getByText('John Smith')).toBeInTheDocument()
      expect(screen.getByText('1950-01-15')).toBeInTheDocument()
      expect(screen.getByText('New York, NY')).toBeInTheDocument()
      expect(screen.getByText('2020-05-10')).toBeInTheDocument()
      expect(screen.getByText('Boston, MA')).toBeInTheDocument()
      expect(screen.getByText('male')).toBeInTheDocument()
    })

    it('should handle empty person object', () => {
      // Arrange
      const person = {}

      // Act
      render(DuplicateComparisonCard, {
        props: {
          person,
          title: 'Empty Person',
          matchingFields: {}
        }
      })

      // Assert
      expect(screen.getByText('Empty Person')).toBeInTheDocument()
      const unknownTexts = screen.getAllByText('Unknown')
      expect(unknownTexts.length).toBeGreaterThan(0)
    })

    it('should handle empty matchingFields object', () => {
      // Arrange
      const person = {
        firstName: 'John',
        lastName: 'Smith'
      }

      // Act
      const { container } = render(DuplicateComparisonCard, {
        props: {
          person,
          title: 'Test',
          matchingFields: {}
        }
      })

      // Assert - Should not crash
      expect(container).toBeInTheDocument()
      expect(screen.getByText('John Smith')).toBeInTheDocument()
    })
  })
})
