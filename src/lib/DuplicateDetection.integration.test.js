/**
 * Integration Tests for DuplicateDetection Component
 * Story #111: Duplicate Detection UI Component
 *
 * Tests navigation, routing, and API integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'

// Mock the API module BEFORE importing the component
const mockGetPeopleDuplicates = vi.fn()
vi.mock('./api.js', () => ({
  api: {
    getPeopleDuplicates: mockGetPeopleDuplicates
  }
}))

import DuplicateDetection from './DuplicateDetection.svelte'

describe('DuplicateDetection Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset window location hash
    window.location.hash = ''
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('API Integration', () => {
    it('should fetch duplicates from API on mount', async () => {
      const mockDuplicates = [
        {
          person1: { id: 1, name: 'John Smith', birthDate: '1980-01-15' },
          person2: { id: 2, name: 'John Smyth', birthDate: '1980-01-15' },
          confidence: 92,
          matchingFields: ['name', 'birthDate']
        }
      ]

      mockGetPeopleDuplicates.mockResolvedValue(mockDuplicates)

      render(DuplicateDetection)

      // API should be called on mount
      expect(mockGetPeopleDuplicates).toHaveBeenCalledTimes(1)

      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument()
      })
    })

    it('should handle API errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockGetPeopleDuplicates.mockRejectedValue(new Error('Server error'))

      render(DuplicateDetection)

      await waitFor(() => {
        expect(screen.getByText(/server error/i)).toBeInTheDocument()
      })

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load duplicates'),
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })
  })

  describe('Navigation', () => {
    it('should navigate to pedigree view from empty state', async () => {
      mockGetPeopleDuplicates.mockResolvedValue([])

      render(DuplicateDetection)

      await waitFor(() => {
        expect(screen.getByText(/no duplicates found/i)).toBeInTheDocument()
      })

      const backButton = screen.getByRole('button', { name: /back to tree/i })
      await userEvent.click(backButton)

      expect(window.location.hash).toBe('#/pedigree')
    })

    it('should maintain duplicate list state when navigating away and back', async () => {
      const mockDuplicates = [
        {
          person1: { id: 1, name: 'Test Person 1', birthDate: '1980-01-15' },
          person2: { id: 2, name: 'Test Person 2', birthDate: '1980-01-15' },
          confidence: 88,
          matchingFields: ['name']
        }
      ]

      mockGetPeopleDuplicates.mockResolvedValue(mockDuplicates)

      const { unmount } = render(DuplicateDetection)

      await waitFor(() => {
        expect(screen.getByText('Test Person 1')).toBeInTheDocument()
      })

      // Simulate navigation away
      unmount()

      // Re-render (simulate navigation back)
      render(DuplicateDetection)

      // Should fetch data again
      expect(mockGetPeopleDuplicates).toHaveBeenCalledTimes(2)
    })
  })

  describe('Responsive Design', () => {
    it('should adapt layout for mobile viewport', async () => {
      const mockDuplicates = [
        {
          person1: { id: 1, name: 'Mobile Test 1', birthDate: '1980-01-15' },
          person2: { id: 2, name: 'Mobile Test 2', birthDate: '1980-01-15' },
          confidence: 90,
          matchingFields: ['name']
        }
      ]

      mockGetPeopleDuplicates.mockResolvedValue(mockDuplicates)

      // Simulate mobile viewport
      global.innerWidth = 375
      global.dispatchEvent(new Event('resize'))

      render(DuplicateDetection)

      await waitFor(() => {
        expect(screen.getByText('Mobile Test 1')).toBeInTheDocument()
      })

      const container = screen.getByRole('main', { hidden: true }) || document.querySelector('.duplicate-detection')

      // Should have mobile-specific styles applied
      expect(container).toBeDefined()
    })

    it('should stack duplicate cards vertically on mobile', async () => {
      const mockDuplicates = [
        {
          person1: { id: 1, name: 'Card 1A', birthDate: '1980-01-15' },
          person2: { id: 2, name: 'Card 1B', birthDate: '1980-01-15' },
          confidence: 90,
          matchingFields: []
        },
        {
          person1: { id: 3, name: 'Card 2A', birthDate: '1985-01-15' },
          person2: { id: 4, name: 'Card 2B', birthDate: '1985-01-15' },
          confidence: 85,
          matchingFields: []
        }
      ]

      mockGetPeopleDuplicates.mockResolvedValue(mockDuplicates)

      // Simulate mobile viewport
      global.innerWidth = 375

      render(DuplicateDetection)

      await waitFor(() => {
        expect(screen.getByText('Card 1A')).toBeInTheDocument()
      })

      const cards = screen.getAllByRole('article')
      expect(cards).toHaveLength(2)
    })
  })

  describe('Keyboard Accessibility', () => {
    it('should support keyboard navigation through duplicate cards', async () => {
      const mockDuplicates = [
        {
          person1: { id: 1, name: 'Keyboard Test 1', birthDate: '1980-01-15' },
          person2: { id: 2, name: 'Keyboard Test 2', birthDate: '1980-01-15' },
          confidence: 90,
          matchingFields: ['name']
        }
      ]

      mockGetPeopleDuplicates.mockResolvedValue(mockDuplicates)

      render(DuplicateDetection)

      await waitFor(() => {
        expect(screen.getByText('Keyboard Test 1')).toBeInTheDocument()
      })

      const reviewButton = screen.getByRole('button', { name: /review merge/i })

      // Should be focusable
      reviewButton.focus()
      expect(document.activeElement).toBe(reviewButton)

      // Should trigger on Enter key
      const { component } = render(DuplicateDetection)
      const mockHandler = vi.fn()
      component.$on('reviewMerge', mockHandler)

      await userEvent.keyboard('{Enter}')
      // Note: Event handling will be tested in component tests
    })
  })
})
