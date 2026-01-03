/**
 * Tests for ParseStatisticsCard Component
 * Story #103: GEDCOM Parsing Results Display
 *
 * Test coverage:
 * - Statistic display (icon, label, value)
 * - Responsive layout
 * - Accessibility
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/svelte'
import ParseStatisticsCard from './ParseStatisticsCard.svelte'

describe('ParseStatisticsCard', () => {
  describe('Content Display', () => {
    it('should display icon, label, and value', () => {
      render(ParseStatisticsCard, {
        props: {
          icon: '👥',
          label: 'Individuals',
          value: '150'
        }
      })

      expect(screen.getByText('👥')).toBeInTheDocument()
      expect(screen.getByText('Individuals')).toBeInTheDocument()
      expect(screen.getByText('150')).toBeInTheDocument()
    })

    it('should display numeric values', () => {
      render(ParseStatisticsCard, {
        props: {
          icon: '👨‍👩‍👧‍👦',
          label: 'Families',
          value: 45
        }
      })

      expect(screen.getByText('45')).toBeInTheDocument()
    })

    it('should display string values', () => {
      render(ParseStatisticsCard, {
        props: {
          icon: '📅',
          label: 'Date Range',
          value: '1850 - 2023'
        }
      })

      expect(screen.getByText('1850 - 2023')).toBeInTheDocument()
    })

    it('should handle zero values', () => {
      render(ParseStatisticsCard, {
        props: {
          icon: '⚠️',
          label: 'Errors',
          value: 0
        }
      })

      expect(screen.getByText('0')).toBeInTheDocument()
    })

    it('should handle missing value gracefully', () => {
      render(ParseStatisticsCard, {
        props: {
          icon: '📋',
          label: 'Version',
          value: null
        }
      })

      expect(screen.getByText('N/A')).toBeInTheDocument()
    })
  })

  describe('Styling', () => {
    it('should apply card styling', () => {
      const { container } = render(ParseStatisticsCard, {
        props: {
          icon: '👥',
          label: 'Individuals',
          value: '150'
        }
      })

      const card = container.querySelector('.stat-card')
      expect(card).toBeInTheDocument()
    })

    it('should apply responsive grid class', () => {
      const { container } = render(ParseStatisticsCard, {
        props: {
          icon: '👥',
          label: 'Individuals',
          value: '150'
        }
      })

      const card = container.querySelector('.stat-card')
      expect(card).toHaveClass('stat-card')
    })
  })

  describe('Accessibility', () => {
    it('should have semantic HTML structure', () => {
      const { container } = render(ParseStatisticsCard, {
        props: {
          icon: '👥',
          label: 'Individuals',
          value: '150'
        }
      })

      expect(container.querySelector('.stat-card')).toBeInTheDocument()
    })

    it('should have proper text hierarchy', () => {
      render(ParseStatisticsCard, {
        props: {
          icon: '👥',
          label: 'Individuals',
          value: '150'
        }
      })

      const label = screen.getByText('Individuals')
      const value = screen.getByText('150')

      expect(label).toBeInTheDocument()
      expect(value).toBeInTheDocument()
    })
  })

  describe('Icon Display', () => {
    it('should display emoji icons', () => {
      render(ParseStatisticsCard, {
        props: {
          icon: '🎉',
          label: 'Success',
          value: 'Yes'
        }
      })

      expect(screen.getByText('🎉')).toBeInTheDocument()
    })

    it('should display multi-character emoji', () => {
      render(ParseStatisticsCard, {
        props: {
          icon: '👨‍👩‍👧‍👦',
          label: 'Families',
          value: '30'
        }
      })

      expect(screen.getByText('👨‍👩‍👧‍👦')).toBeInTheDocument()
    })
  })
})
