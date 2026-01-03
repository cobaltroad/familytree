/**
 * Tests for ParseErrorList Component
 * Story #103: GEDCOM Parsing Results Display
 *
 * Test coverage:
 * - Error grouping by severity
 * - Expandable/collapsible accordion
 * - Error details display (line number, type, message)
 * - Accessibility
 */

import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/svelte'
import ParseErrorList from './ParseErrorList.svelte'

describe('ParseErrorList', () => {
  describe('Error Display', () => {
    it('should display error count', () => {
      const errors = [
        { line: 42, severity: 'error', type: 'INVALID_DATE', message: 'Invalid date format' },
        { line: 108, severity: 'warning', type: 'MISSING_NAME', message: 'Missing name' }
      ]

      render(ParseErrorList, { props: { errors } })

      expect(screen.getByText(/2 issues found/i)).toBeInTheDocument()
    })

    it('should display error details when expanded', async () => {
      const errors = [
        { line: 42, severity: 'error', type: 'INVALID_DATE', message: 'Invalid date format' }
      ]

      render(ParseErrorList, { props: { errors } })

      // Click to expand
      const expandButton = screen.getByRole('button', { name: /view errors/i })
      await fireEvent.click(expandButton)

      expect(screen.getByText('Line 42')).toBeInTheDocument()
      expect(screen.getByText(/Invalid date format/)).toBeInTheDocument()
      expect(screen.getByText('INVALID_DATE')).toBeInTheDocument()
    })

    it('should be initially collapsed', () => {
      const errors = [
        { line: 42, severity: 'error', type: 'INVALID_DATE', message: 'Invalid date format' }
      ]

      render(ParseErrorList, { props: { errors } })

      expect(screen.queryByText('Line 42')).not.toBeInTheDocument()
    })

    it('should toggle between expanded and collapsed', async () => {
      const errors = [
        { line: 42, severity: 'error', type: 'INVALID_DATE', message: 'Invalid date format' }
      ]

      render(ParseErrorList, { props: { errors } })

      const expandButton = screen.getByRole('button')

      // Initially collapsed
      expect(screen.queryByText('Line 42')).not.toBeInTheDocument()

      // Click to expand
      await fireEvent.click(expandButton)
      expect(screen.getByText('Line 42')).toBeInTheDocument()

      // Click to collapse
      await fireEvent.click(expandButton)
      expect(screen.queryByText('Line 42')).not.toBeInTheDocument()
    })
  })

  describe('Error Grouping', () => {
    it('should group errors by severity', async () => {
      const errors = [
        { line: 1, severity: 'error', type: 'PARSE_ERROR', message: 'Parse error' },
        { line: 2, severity: 'error', type: 'INVALID_TAG', message: 'Invalid tag' },
        { line: 3, severity: 'warning', type: 'MISSING_DATA', message: 'Missing data' },
        { line: 4, severity: 'warning', type: 'OPTIONAL_FIELD', message: 'Optional field missing' }
      ]

      render(ParseErrorList, { props: { errors } })

      const expandButton = screen.getByRole('button')
      await fireEvent.click(expandButton)

      expect(screen.getByText(/2 errors/i)).toBeInTheDocument()
      expect(screen.getByText(/2 warnings/i)).toBeInTheDocument()
    })

    it('should display errors before warnings', async () => {
      const errors = [
        { line: 3, severity: 'warning', type: 'MISSING_DATA', message: 'Missing data' },
        { line: 1, severity: 'error', type: 'PARSE_ERROR', message: 'Parse error' },
        { line: 4, severity: 'warning', type: 'OPTIONAL_FIELD', message: 'Optional field missing' },
        { line: 2, severity: 'error', type: 'INVALID_TAG', message: 'Invalid tag' }
      ]

      render(ParseErrorList, { props: { errors } })

      const expandButton = screen.getByRole('button')
      await fireEvent.click(expandButton)

      const errorElements = screen.getAllByText(/Line \d+/)
      expect(errorElements[0]).toHaveTextContent('Line 1') // Error first
      expect(errorElements[1]).toHaveTextContent('Line 2') // Error second
      expect(errorElements[2]).toHaveTextContent('Line 3') // Warning third
      expect(errorElements[3]).toHaveTextContent('Line 4') // Warning fourth
    })
  })

  describe('Empty State', () => {
    it('should display no errors message when empty', () => {
      render(ParseErrorList, { props: { errors: [] } })

      expect(screen.getByText(/no errors/i)).toBeInTheDocument()
    })

    it('should not show expand button when no errors', () => {
      render(ParseErrorList, { props: { errors: [] } })

      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for accordion', async () => {
      const errors = [
        { line: 42, severity: 'error', type: 'INVALID_DATE', message: 'Invalid date format' }
      ]

      render(ParseErrorList, { props: { errors } })

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-expanded', 'false')

      await fireEvent.click(button)
      expect(button).toHaveAttribute('aria-expanded', 'true')
    })

    it('should have accessible button text', () => {
      const errors = [
        { line: 42, severity: 'error', type: 'INVALID_DATE', message: 'Invalid date format' }
      ]

      render(ParseErrorList, { props: { errors } })

      expect(screen.getByRole('button', { name: /view errors/i })).toBeInTheDocument()
    })

    it('should support keyboard navigation', async () => {
      const errors = [
        { line: 42, severity: 'error', type: 'INVALID_DATE', message: 'Invalid date format' }
      ]

      render(ParseErrorList, { props: { errors } })

      const button = screen.getByRole('button')
      button.focus()
      expect(document.activeElement).toBe(button)

      // Simulate Enter key
      await fireEvent.keyDown(button, { key: 'Enter' })
      expect(screen.getByText('Line 42')).toBeInTheDocument()
    })
  })

  describe('Error Severity Styling', () => {
    it('should apply different styles for errors and warnings', async () => {
      const errors = [
        { line: 1, severity: 'error', type: 'PARSE_ERROR', message: 'Parse error' },
        { line: 2, severity: 'warning', type: 'MISSING_DATA', message: 'Missing data' }
      ]

      const { container } = render(ParseErrorList, { props: { errors } })

      const expandButton = screen.getByRole('button')
      await fireEvent.click(expandButton)

      const errorItems = container.querySelectorAll('.error-item')
      expect(errorItems.length).toBe(2)
    })
  })

  describe('Line Number Display', () => {
    it('should display line numbers for each error', async () => {
      const errors = [
        { line: 42, severity: 'error', type: 'INVALID_DATE', message: 'Invalid date format' },
        { line: 108, severity: 'warning', type: 'MISSING_NAME', message: 'Missing name' },
        { line: 256, severity: 'error', type: 'PARSE_ERROR', message: 'Parse error' }
      ]

      render(ParseErrorList, { props: { errors } })

      const expandButton = screen.getByRole('button')
      await fireEvent.click(expandButton)

      expect(screen.getByText('Line 42')).toBeInTheDocument()
      expect(screen.getByText('Line 108')).toBeInTheDocument()
      expect(screen.getByText('Line 256')).toBeInTheDocument()
    })
  })

  describe('Error Type Display', () => {
    it('should display error type codes', async () => {
      const errors = [
        { line: 42, severity: 'error', type: 'INVALID_DATE', message: 'Invalid date format' },
        { line: 108, severity: 'warning', type: 'MISSING_NAME', message: 'Missing name' }
      ]

      render(ParseErrorList, { props: { errors } })

      const expandButton = screen.getByRole('button')
      await fireEvent.click(expandButton)

      expect(screen.getByText('INVALID_DATE')).toBeInTheDocument()
      expect(screen.getByText('MISSING_NAME')).toBeInTheDocument()
    })
  })
})
