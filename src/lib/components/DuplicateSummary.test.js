/**
 * Tests for DuplicateSummary Component
 * Story #103: GEDCOM Parsing Results Display
 *
 * Test coverage:
 * - Duplicate list display (top 3)
 * - Confidence percentage display
 * - Empty state handling
 * - Accessibility
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/svelte'
import DuplicateSummary from './DuplicateSummary.svelte'

describe('DuplicateSummary', () => {
  describe('Duplicate Display', () => {
    it('should display top 3 duplicates', () => {
      const duplicates = [
        {
          gedcomPerson: { id: '@I1@', name: 'John Smith', birthDate: '1950-01-01' },
          existingPerson: { id: 1, first_name: 'John', last_name: 'Smith', birth_date: '1950-01-01' },
          confidence: 95
        },
        {
          gedcomPerson: { id: '@I2@', name: 'Jane Doe', birthDate: '1955-05-15' },
          existingPerson: { id: 2, first_name: 'Jane', last_name: 'Doe', birth_date: '1955-05-15' },
          confidence: 87
        },
        {
          gedcomPerson: { id: '@I3@', name: 'Bob Johnson', birthDate: '1960-03-20' },
          existingPerson: { id: 3, first_name: 'Robert', last_name: 'Johnson', birth_date: '1960-03-20' },
          confidence: 72
        },
        {
          gedcomPerson: { id: '@I4@', name: 'Alice Brown', birthDate: '1965-12-10' },
          existingPerson: { id: 4, first_name: 'Alice', last_name: 'Brown', birth_date: '1965-12-10' },
          confidence: 68
        }
      ]

      render(DuplicateSummary, { props: { duplicates } })

      // Should show only top 3
      expect(screen.getByText(/John Smith/)).toBeInTheDocument()
      expect(screen.getByText(/Jane Doe/)).toBeInTheDocument()
      expect(screen.getByText(/Bob Johnson/)).toBeInTheDocument()
      expect(screen.queryByText(/Alice Brown/)).not.toBeInTheDocument()
    })

    it('should display confidence percentages', () => {
      const duplicates = [
        {
          gedcomPerson: { id: '@I1@', name: 'John Smith', birthDate: '1950-01-01' },
          existingPerson: { id: 1, first_name: 'John', last_name: 'Smith', birth_date: '1950-01-01' },
          confidence: 95
        }
      ]

      render(DuplicateSummary, { props: { duplicates } })

      expect(screen.getByText(/95%/)).toBeInTheDocument()
    })

    it('should display both GEDCOM and existing person names', () => {
      const duplicates = [
        {
          gedcomPerson: { id: '@I1@', name: 'John Smith', birthDate: '1950-01-01' },
          existingPerson: { id: 1, first_name: 'John', last_name: 'Smith', birth_date: '1950-01-01' },
          confidence: 95
        }
      ]

      render(DuplicateSummary, { props: { duplicates } })

      expect(screen.getByText(/John Smith/)).toBeInTheDocument()
    })

    it('should display birth dates when available', () => {
      const duplicates = [
        {
          gedcomPerson: { id: '@I1@', name: 'John Smith', birthDate: '1950-01-01' },
          existingPerson: { id: 1, first_name: 'John', last_name: 'Smith', birth_date: '1950-01-01' },
          confidence: 95
        }
      ]

      render(DuplicateSummary, { props: { duplicates } })

      expect(screen.getByText(/1950-01-01/)).toBeInTheDocument()
    })

    it('should handle fewer than 3 duplicates', () => {
      const duplicates = [
        {
          gedcomPerson: { id: '@I1@', name: 'John Smith', birthDate: '1950-01-01' },
          existingPerson: { id: 1, first_name: 'John', last_name: 'Smith', birth_date: '1950-01-01' },
          confidence: 95
        }
      ]

      render(DuplicateSummary, { props: { duplicates } })

      expect(screen.getByText(/John Smith/)).toBeInTheDocument()
      expect(screen.getByText(/95%/)).toBeInTheDocument()
    })
  })

  describe('Total Count Display', () => {
    it('should display total duplicate count', () => {
      const duplicates = [
        {
          gedcomPerson: { id: '@I1@', name: 'John Smith', birthDate: '1950-01-01' },
          existingPerson: { id: 1, first_name: 'John', last_name: 'Smith', birth_date: '1950-01-01' },
          confidence: 95
        },
        {
          gedcomPerson: { id: '@I2@', name: 'Jane Doe', birthDate: '1955-05-15' },
          existingPerson: { id: 2, first_name: 'Jane', last_name: 'Doe', birth_date: '1955-05-15' },
          confidence: 87
        }
      ]

      render(DuplicateSummary, { props: { duplicates } })

      expect(screen.getByText(/2 potential duplicates/i)).toBeInTheDocument()
    })

    it('should use singular form for one duplicate', () => {
      const duplicates = [
        {
          gedcomPerson: { id: '@I1@', name: 'John Smith', birthDate: '1950-01-01' },
          existingPerson: { id: 1, first_name: 'John', last_name: 'Smith', birth_date: '1950-01-01' },
          confidence: 95
        }
      ]

      render(DuplicateSummary, { props: { duplicates } })

      expect(screen.getByText(/1 potential duplicate/i)).toBeInTheDocument()
    })

    it('should show "View all X duplicates" link when more than 3', () => {
      const duplicates = [
        {
          gedcomPerson: { id: '@I1@', name: 'John Smith', birthDate: '1950-01-01' },
          existingPerson: { id: 1, first_name: 'John', last_name: 'Smith', birth_date: '1950-01-01' },
          confidence: 95
        },
        {
          gedcomPerson: { id: '@I2@', name: 'Jane Doe', birthDate: '1955-05-15' },
          existingPerson: { id: 2, first_name: 'Jane', last_name: 'Doe', birth_date: '1955-05-15' },
          confidence: 87
        },
        {
          gedcomPerson: { id: '@I3@', name: 'Bob Johnson', birthDate: '1960-03-20' },
          existingPerson: { id: 3, first_name: 'Robert', last_name: 'Johnson', birth_date: '1960-03-20' },
          confidence: 72
        },
        {
          gedcomPerson: { id: '@I4@', name: 'Alice Brown', birthDate: '1965-12-10' },
          existingPerson: { id: 4, first_name: 'Alice', last_name: 'Brown', birth_date: '1965-12-10' },
          confidence: 68
        },
        {
          gedcomPerson: { id: '@I5@', name: 'Charlie Davis', birthDate: '1970-08-05' },
          existingPerson: { id: 5, first_name: 'Charles', last_name: 'Davis', birth_date: '1970-08-05' },
          confidence: 65
        }
      ]

      render(DuplicateSummary, { props: { duplicates } })

      expect(screen.getByText(/view all 5 duplicates/i)).toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('should display no duplicates message when empty', () => {
      render(DuplicateSummary, { props: { duplicates: [] } })

      expect(screen.getByText(/no duplicates/i)).toBeInTheDocument()
    })

    it('should not display duplicate list when empty', () => {
      const { container } = render(DuplicateSummary, { props: { duplicates: [] } })

      expect(container.querySelector('.duplicate-item')).not.toBeInTheDocument()
    })
  })

  describe('Confidence Level Styling', () => {
    it('should apply high confidence styling for >80%', () => {
      const duplicates = [
        {
          gedcomPerson: { id: '@I1@', name: 'John Smith', birthDate: '1950-01-01' },
          existingPerson: { id: 1, first_name: 'John', last_name: 'Smith', birth_date: '1950-01-01' },
          confidence: 95
        }
      ]

      const { container } = render(DuplicateSummary, { props: { duplicates } })

      const confidenceBadge = container.querySelector('.confidence-high')
      expect(confidenceBadge).toBeInTheDocument()
    })

    it('should apply medium confidence styling for 60-80%', () => {
      const duplicates = [
        {
          gedcomPerson: { id: '@I1@', name: 'John Smith', birthDate: '1950-01-01' },
          existingPerson: { id: 1, first_name: 'John', last_name: 'Smith', birth_date: '1950-01-01' },
          confidence: 70
        }
      ]

      const { container } = render(DuplicateSummary, { props: { duplicates } })

      const confidenceBadge = container.querySelector('.confidence-medium')
      expect(confidenceBadge).toBeInTheDocument()
    })

    it('should apply low confidence styling for <60%', () => {
      const duplicates = [
        {
          gedcomPerson: { id: '@I1@', name: 'John Smith', birthDate: '1950-01-01' },
          existingPerson: { id: 1, first_name: 'John', last_name: 'Smith', birth_date: '1950-01-01' },
          confidence: 50
        }
      ]

      const { container } = render(DuplicateSummary, { props: { duplicates } })

      const confidenceBadge = container.querySelector('.confidence-low')
      expect(confidenceBadge).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have semantic HTML structure', () => {
      const duplicates = [
        {
          gedcomPerson: { id: '@I1@', name: 'John Smith', birthDate: '1950-01-01' },
          existingPerson: { id: 1, first_name: 'John', last_name: 'Smith', birth_date: '1950-01-01' },
          confidence: 95
        }
      ]

      const { container } = render(DuplicateSummary, { props: { duplicates } })

      expect(container.querySelector('.duplicate-summary')).toBeInTheDocument()
    })

    it('should have descriptive heading', () => {
      const duplicates = [
        {
          gedcomPerson: { id: '@I1@', name: 'John Smith', birthDate: '1950-01-01' },
          existingPerson: { id: 1, first_name: 'John', last_name: 'Smith', birth_date: '1950-01-01' },
          confidence: 95
        }
      ]

      render(DuplicateSummary, { props: { duplicates } })

      expect(screen.getByText(/potential duplicates/i)).toBeInTheDocument()
    })
  })

  describe('Missing Data Handling', () => {
    it('should handle missing birth dates', () => {
      const duplicates = [
        {
          gedcomPerson: { id: '@I1@', name: 'John Smith', birthDate: null },
          existingPerson: { id: 1, first_name: 'John', last_name: 'Smith', birth_date: null },
          confidence: 95
        }
      ]

      render(DuplicateSummary, { props: { duplicates } })

      expect(screen.getByText(/John Smith/)).toBeInTheDocument()
      expect(screen.getByText(/95%/)).toBeInTheDocument()
    })

    it('should handle missing names gracefully', () => {
      const duplicates = [
        {
          gedcomPerson: { id: '@I1@', name: '', birthDate: '1950-01-01' },
          existingPerson: { id: 1, first_name: '', last_name: '', birth_date: '1950-01-01' },
          confidence: 95
        }
      ]

      render(DuplicateSummary, { props: { duplicates } })

      expect(screen.getByText(/unknown/i)).toBeInTheDocument()
    })
  })
})
