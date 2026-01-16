/**
 * Tests for DuplicateCard Component
 * Story #111: Duplicate Detection UI Component
 *
 * RED Phase: Writing failing tests first
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'
import DuplicateCard from './DuplicateCard.svelte'

describe('DuplicateCard Component', () => {
  const mockDuplicate = {
    person1: {
      id: 1,
      name: 'John Smith',
      birthDate: '1980-01-15'
    },
    person2: {
      id: 2,
      name: 'John Smyth',
      birthDate: '1980-01-15'
    },
    confidence: 92,
    matchingFields: ['name', 'birthDate']
  }

  describe('Person Information Display', () => {
    it('should render both persons information', () => {
      render(DuplicateCard, { duplicate: mockDuplicate })

      expect(screen.getByText('John Smith')).toBeInTheDocument()
      expect(screen.getByText('John Smyth')).toBeInTheDocument()
      // Both persons have the same birth date, so we should get all instances
      const dates = screen.getAllByText('1980-01-15')
      expect(dates).toHaveLength(2)
    })

    it('should display person without birth date', () => {
      const duplicateWithoutDate = {
        person1: {
          id: 1,
          name: 'Jane Doe',
          birthDate: null
        },
        person2: {
          id: 2,
          name: 'Jane Do',
          birthDate: '1990-05-20'
        },
        confidence: 80,
        matchingFields: ['name']
      }

      render(DuplicateCard, { duplicate: duplicateWithoutDate })

      expect(screen.getByText('Jane Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Do')).toBeInTheDocument()
      expect(screen.getByText('1990-05-20')).toBeInTheDocument()
    })
  })

  describe('Confidence Score Display', () => {
    it('should display confidence score badge', () => {
      render(DuplicateCard, { duplicate: mockDuplicate })

      expect(screen.getByText('92%')).toBeInTheDocument()
    })

    it('should apply high confidence color class for 90%+', () => {
      const highConfidenceDuplicate = {
        ...mockDuplicate,
        confidence: 95
      }

      render(DuplicateCard, { duplicate: highConfidenceDuplicate })

      const badge = screen.getByText('95%').closest('.confidence-badge')
      expect(badge).toHaveClass('confidence-high')
    })

    it('should apply medium confidence color class for 75-89%', () => {
      const mediumConfidenceDuplicate = {
        ...mockDuplicate,
        confidence: 82
      }

      render(DuplicateCard, { duplicate: mediumConfidenceDuplicate })

      const badge = screen.getByText('82%').closest('.confidence-badge')
      expect(badge).toHaveClass('confidence-medium')
    })

    it('should apply low confidence color class for <75%', () => {
      const lowConfidenceDuplicate = {
        ...mockDuplicate,
        confidence: 72
      }

      render(DuplicateCard, { duplicate: lowConfidenceDuplicate })

      const badge = screen.getByText('72%').closest('.confidence-badge')
      expect(badge).toHaveClass('confidence-low')
    })
  })

  describe('Matching Fields Display', () => {
    it('should display matching fields as badges', () => {
      render(DuplicateCard, { duplicate: mockDuplicate })

      expect(screen.getByText('name')).toBeInTheDocument()
      expect(screen.getByText('birthDate')).toBeInTheDocument()
    })

    it('should handle single matching field', () => {
      const singleFieldDuplicate = {
        ...mockDuplicate,
        matchingFields: ['name']
      }

      render(DuplicateCard, { duplicate: singleFieldDuplicate })

      expect(screen.getByText('name')).toBeInTheDocument()
      expect(screen.queryByText('birthDate')).not.toBeInTheDocument()
    })

    it('should handle no matching fields', () => {
      const noFieldsDuplicate = {
        ...mockDuplicate,
        matchingFields: []
      }

      render(DuplicateCard, { duplicate: noFieldsDuplicate })

      expect(screen.queryByText('name')).not.toBeInTheDocument()
      expect(screen.queryByText('birthDate')).not.toBeInTheDocument()
    })
  })

  describe('Review Merge Button', () => {
    it('should render Review Merge button', () => {
      render(DuplicateCard, { duplicate: mockDuplicate })

      expect(screen.getByRole('button', { name: /review merge/i })).toBeInTheDocument()
    })

    it('should dispatch reviewMerge event when button is clicked', async () => {
      const { component } = render(DuplicateCard, { duplicate: mockDuplicate })

      const mockHandler = vi.fn()
      component.$on('reviewMerge', mockHandler)

      const button = screen.getByRole('button', { name: /review merge/i })
      await userEvent.click(button)

      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            person1: mockDuplicate.person1,
            person2: mockDuplicate.person2
          })
        })
      )
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(DuplicateCard, { duplicate: mockDuplicate })

      const article = screen.getByRole('article')
      expect(article).toHaveAttribute('aria-label', expect.stringContaining('duplicate'))
    })

    it('should support keyboard navigation for Review Merge button', async () => {
      const { component } = render(DuplicateCard, { duplicate: mockDuplicate })

      const mockHandler = vi.fn()
      component.$on('reviewMerge', mockHandler)

      const button = screen.getByRole('button', { name: /review merge/i })
      button.focus()

      await userEvent.keyboard('{Enter}')

      expect(mockHandler).toHaveBeenCalled()
    })
  })
})
