/**
 * Tests for DuplicateDetection Component
 * Story #111: Duplicate Detection UI Component
 *
 * RED Phase: Writing failing tests first
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'
import DuplicateDetection from './DuplicateDetection.svelte'
import { api } from './api.js'

// Mock the api module
vi.mock('./api.js', () => ({
  api: {
    getPeopleDuplicates: vi.fn()
  }
}))

describe('DuplicateDetection Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Loading State', () => {
    it('should display loading state initially', () => {
      // Mock API to never resolve (simulating loading)
      api.getPeopleDuplicates.mockReturnValue(new Promise(() => {}))

      render(DuplicateDetection)

      expect(screen.getByText(/scanning for duplicates/i)).toBeInTheDocument()
      expect(screen.queryByRole('list')).not.toBeInTheDocument()
    })
  })

  describe('Duplicate List Display', () => {
    it('should render duplicate list when data is loaded', async () => {
      const mockDuplicates = [
        {
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
        },
        {
          person1: {
            id: 3,
            name: 'Mary Johnson',
            birthDate: '1975-03-20'
          },
          person2: {
            id: 4,
            name: 'Marie Johnson',
            birthDate: '1975-03-20'
          },
          confidence: 85,
          matchingFields: ['birthDate']
        }
      ]

      api.getPeopleDuplicates.mockResolvedValue(mockDuplicates)

      render(DuplicateDetection)

      await waitFor(() => {
        expect(screen.queryByText(/scanning for duplicates/i)).not.toBeInTheDocument()
      })

      // Should display both duplicate pairs
      expect(screen.getByText('John Smith')).toBeInTheDocument()
      expect(screen.getByText('John Smyth')).toBeInTheDocument()
      expect(screen.getByText('Mary Johnson')).toBeInTheDocument()
      expect(screen.getByText('Marie Johnson')).toBeInTheDocument()
    })

    it('should sort duplicates by confidence (highest first)', async () => {
      const mockDuplicates = [
        {
          person1: { id: 1, name: 'Low Confidence', birthDate: '1980-01-01' },
          person2: { id: 2, name: 'Low Confidence 2', birthDate: '1980-01-01' },
          confidence: 75,
          matchingFields: []
        },
        {
          person1: { id: 3, name: 'High Confidence', birthDate: '1990-01-01' },
          person2: { id: 4, name: 'High Confidence 2', birthDate: '1990-01-01' },
          confidence: 95,
          matchingFields: ['name', 'birthDate']
        }
      ]

      api.getPeopleDuplicates.mockResolvedValue(mockDuplicates)

      render(DuplicateDetection)

      await waitFor(() => {
        expect(screen.queryByText(/scanning for duplicates/i)).not.toBeInTheDocument()
      })

      const duplicateCards = screen.getAllByRole('article')

      // First card should be the highest confidence (95%)
      expect(duplicateCards[0]).toHaveTextContent('High Confidence')
      // Second card should be lower confidence (75%)
      expect(duplicateCards[1]).toHaveTextContent('Low Confidence')
    })

    it('should display confidence score with correct color coding', async () => {
      const mockDuplicates = [
        {
          person1: { id: 1, name: 'High Score', birthDate: '1980-01-01' },
          person2: { id: 2, name: 'High Score 2', birthDate: '1980-01-01' },
          confidence: 95,
          matchingFields: []
        },
        {
          person1: { id: 3, name: 'Medium Score', birthDate: '1980-01-01' },
          person2: { id: 4, name: 'Medium Score 2', birthDate: '1980-01-01' },
          confidence: 82,
          matchingFields: []
        },
        {
          person1: { id: 5, name: 'Low Score', birthDate: '1980-01-01' },
          person2: { id: 6, name: 'Low Score 2', birthDate: '1980-01-01' },
          confidence: 72,
          matchingFields: []
        }
      ]

      api.getPeopleDuplicates.mockResolvedValue(mockDuplicates)

      render(DuplicateDetection)

      await waitFor(() => {
        expect(screen.getByText('95%')).toBeInTheDocument()
      })

      const highConfidenceBadge = screen.getByText('95%').closest('.confidence-badge')
      const mediumConfidenceBadge = screen.getByText('82%').closest('.confidence-badge')
      const lowConfidenceBadge = screen.getByText('72%').closest('.confidence-badge')

      // Green for 90%+
      expect(highConfidenceBadge).toHaveClass('confidence-high')
      // Yellow/Orange for 75-89%
      expect(mediumConfidenceBadge).toHaveClass('confidence-medium')
      // Orange/Red for <75%
      expect(lowConfidenceBadge).toHaveClass('confidence-low')
    })
  })

  describe('Empty State', () => {
    it('should display empty state when no duplicates found', async () => {
      api.getPeopleDuplicates.mockResolvedValue([])

      render(DuplicateDetection)

      await waitFor(() => {
        expect(screen.getByText(/no duplicates found/i)).toBeInTheDocument()
      })

      expect(screen.getByRole('button', { name: /back to tree/i })).toBeInTheDocument()
      expect(screen.queryByRole('list')).not.toBeInTheDocument()
    })

    it('should navigate to pedigree view when clicking Back to Tree button', async () => {
      api.getPeopleDuplicates.mockResolvedValue([])

      render(DuplicateDetection)

      await waitFor(() => {
        expect(screen.getByText(/no duplicates found/i)).toBeInTheDocument()
      })

      const backButton = screen.getByRole('button', { name: /back to tree/i })
      await userEvent.click(backButton)

      // Should navigate to #/pedigree
      expect(window.location.hash).toBe('#/pedigree')
    })
  })

  describe('Error State', () => {
    it('should display error message when API call fails', async () => {
      api.getPeopleDuplicates.mockRejectedValue(new Error('Failed to fetch duplicates'))

      render(DuplicateDetection)

      await waitFor(() => {
        expect(screen.getByText(/failed to fetch duplicates/i)).toBeInTheDocument()
      })

      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
      expect(screen.queryByRole('list')).not.toBeInTheDocument()
    })

    it('should retry fetching duplicates when clicking Try Again button', async () => {
      // First call fails
      api.getPeopleDuplicates.mockRejectedValueOnce(new Error('Network error'))

      render(DuplicateDetection)

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument()
      })

      // Second call succeeds
      api.getPeopleDuplicates.mockResolvedValue([])

      const tryAgainButton = screen.getByRole('button', { name: /try again/i })
      await userEvent.click(tryAgainButton)

      await waitFor(() => {
        expect(screen.getByText(/no duplicates found/i)).toBeInTheDocument()
      })

      expect(api.getPeopleDuplicates).toHaveBeenCalledTimes(2)
    })
  })

  describe('Review Merge Button', () => {
    it('should dispatch reviewMerge event when clicking Review Merge button', async () => {
      const mockDuplicates = [
        {
          person1: { id: 1, name: 'John Smith', birthDate: '1980-01-15' },
          person2: { id: 2, name: 'John Smyth', birthDate: '1980-01-15' },
          confidence: 92,
          matchingFields: ['name', 'birthDate']
        }
      ]

      api.getPeopleDuplicates.mockResolvedValue(mockDuplicates)

      const { component } = render(DuplicateDetection)

      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument()
      })

      // Mock event listener
      const mockHandler = vi.fn()
      component.$on('reviewMerge', mockHandler)

      const reviewButton = screen.getByRole('button', { name: /review merge/i })
      await userEvent.click(reviewButton)

      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            person1: expect.objectContaining({ id: 1 }),
            person2: expect.objectContaining({ id: 2 })
          })
        })
      )
    })
  })
})
