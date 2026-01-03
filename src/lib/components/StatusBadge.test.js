/**
 * StatusBadge Component Tests
 * Story #104: GEDCOM Preview Interface with Individuals Table
 *
 * Tests for the StatusBadge component that displays status indicators
 * for GEDCOM import individuals (new/duplicate/existing)
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/svelte'
import StatusBadge from './StatusBadge.svelte'

describe('StatusBadge', () => {
  describe('Status: new', () => {
    it('should render new status badge with correct styling', () => {
      render(StatusBadge, { status: 'new' })

      const badge = screen.getByText('New')
      expect(badge).toBeTruthy()
      expect(badge.classList.contains('status-badge')).toBe(true)
      expect(badge.classList.contains('status-new')).toBe(true)
    })

    it('should display green color for new status', () => {
      const { container } = render(StatusBadge, { status: 'new' })
      const badge = container.querySelector('.status-new')
      expect(badge).toBeTruthy()
    })

    it('should have accessible label for new status', () => {
      render(StatusBadge, { status: 'new' })
      const badge = screen.getByRole('status')
      expect(badge.getAttribute('aria-label')).toBe('Status: New')
    })
  })

  describe('Status: duplicate', () => {
    it('should render duplicate status badge with correct styling', () => {
      render(StatusBadge, { status: 'duplicate' })

      const badge = screen.getByText('Duplicate')
      expect(badge).toBeTruthy()
      expect(badge.classList.contains('status-badge')).toBe(true)
      expect(badge.classList.contains('status-duplicate')).toBe(true)
    })

    it('should display yellow/orange color for duplicate status', () => {
      const { container } = render(StatusBadge, { status: 'duplicate' })
      const badge = container.querySelector('.status-duplicate')
      expect(badge).toBeTruthy()
    })

    it('should have accessible label for duplicate status', () => {
      render(StatusBadge, { status: 'duplicate' })
      const badge = screen.getByRole('status')
      expect(badge.getAttribute('aria-label')).toBe('Status: Duplicate')
    })
  })

  describe('Status: existing', () => {
    it('should render existing status badge with correct styling', () => {
      render(StatusBadge, { status: 'existing' })

      const badge = screen.getByText('Existing')
      expect(badge).toBeTruthy()
      expect(badge.classList.contains('status-badge')).toBe(true)
      expect(badge.classList.contains('status-existing')).toBe(true)
    })

    it('should display gray color for existing status', () => {
      const { container } = render(StatusBadge, { status: 'existing' })
      const badge = container.querySelector('.status-existing')
      expect(badge).toBeTruthy()
    })

    it('should have accessible label for existing status', () => {
      render(StatusBadge, { status: 'existing' })
      const badge = screen.getByRole('status')
      expect(badge.getAttribute('aria-label')).toBe('Status: Existing')
    })
  })

  describe('Invalid status', () => {
    it('should render unknown status with default styling', () => {
      render(StatusBadge, { status: 'invalid' })

      const badge = screen.getByText('Unknown')
      expect(badge).toBeTruthy()
      expect(badge.classList.contains('status-badge')).toBe(true)
      expect(badge.classList.contains('status-unknown')).toBe(true)
    })

    it('should handle empty status', () => {
      render(StatusBadge, { status: '' })

      const badge = screen.getByText('Unknown')
      expect(badge).toBeTruthy()
    })

    it('should handle null status', () => {
      render(StatusBadge, { status: null })

      const badge = screen.getByText('Unknown')
      expect(badge).toBeTruthy()
    })

    it('should handle undefined status', () => {
      render(StatusBadge, { status: undefined })

      const badge = screen.getByText('Unknown')
      expect(badge).toBeTruthy()
    })
  })

  describe('Accessibility', () => {
    it('should have role="status" attribute', () => {
      render(StatusBadge, { status: 'new' })
      const badge = screen.getByRole('status')
      expect(badge).toBeTruthy()
    })

    it('should have appropriate aria-label for all statuses', () => {
      const statuses = [
        { status: 'new', label: 'Status: New' },
        { status: 'duplicate', label: 'Status: Duplicate' },
        { status: 'existing', label: 'Status: Existing' },
        { status: 'invalid', label: 'Status: Unknown' }
      ]

      statuses.forEach(({ status, label }) => {
        const { container } = render(StatusBadge, { status })
        const badge = container.querySelector('[role="status"]')
        expect(badge.getAttribute('aria-label')).toBe(label)
      })
    })
  })

  describe('Visual presentation', () => {
    it('should apply correct CSS classes based on status', async () => {
      const { container, component } = render(StatusBadge, { status: 'new' })
      let badge = container.querySelector('.status-badge')
      expect(badge.classList.contains('status-new')).toBe(true)

      await component.$set({ status: 'duplicate' })
      badge = container.querySelector('.status-badge')
      expect(badge.classList.contains('status-duplicate')).toBe(true)

      await component.$set({ status: 'existing' })
      badge = container.querySelector('.status-badge')
      expect(badge.classList.contains('status-existing')).toBe(true)
    })

    it('should have consistent typography styling', () => {
      const { container } = render(StatusBadge, { status: 'new' })
      const badge = container.querySelector('.status-badge')
      expect(badge).toBeTruthy()
      // Badge should have status-badge class which applies uppercase styling
      expect(badge.classList.contains('status-badge')).toBe(true)
    })
  })
})
