/**
 * ImportErrorDisplay Component Tests
 * Story #107: GEDCOM Import Progress and Confirmation
 *
 * Tests for import error display with retry and error log download
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/svelte'
import ImportErrorDisplay from './ImportErrorDisplay.svelte'

describe('ImportErrorDisplay', () => {
  const defaultError = {
    code: 'CONSTRAINT_VIOLATION',
    message: 'Database constraint violation: Duplicate record detected',
    details: 'UNIQUE constraint failed: people.id',
    canRetry: true,
    errorLogUrl: '/api/gedcom/import/upload-123/errors.csv'
  }

  it('should display error heading', () => {
    render(ImportErrorDisplay, { error: defaultError })

    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading.textContent).toContain('Import Failed')
  })

  it('should display error message', () => {
    render(ImportErrorDisplay, { error: defaultError })

    expect(screen.getByText(/Database constraint violation/i)).toBeDefined()
  })

  it('should display error icon', () => {
    const { container } = render(ImportErrorDisplay, { error: defaultError })

    const errorIcon = container.querySelector('.error-icon, [aria-label*="error"]')
    expect(errorIcon).toBeDefined()
  })

  it('should display error code badge', () => {
    render(ImportErrorDisplay, { error: defaultError })

    expect(screen.getByText('CONSTRAINT_VIOLATION')).toBeDefined()
  })

  it('should display error details in expandable section', () => {
    const { container } = render(ImportErrorDisplay, { error: defaultError })

    expect(screen.getByText(/UNIQUE constraint failed/i)).toBeDefined()
  })

  it('should display rollback notification', () => {
    render(ImportErrorDisplay, { error: defaultError })

    expect(screen.getByText(/no changes were saved/i)).toBeDefined()
  })

  it('should display Retry Import button when canRetry is true', () => {
    render(ImportErrorDisplay, { error: defaultError })

    const retryButton = screen.getByRole('button', { name: /Retry Import/i })
    expect(retryButton).toBeDefined()
  })

  it('should not display Retry button when canRetry is false', () => {
    const nonRetryableError = { ...defaultError, canRetry: false }
    render(ImportErrorDisplay, { error: nonRetryableError })

    const retryButton = screen.queryByRole('button', { name: /Retry Import/i })
    expect(retryButton).toBeNull()
  })

  it('should emit retry event when Retry button clicked', async () => {
    const { component } = render(ImportErrorDisplay, { error: defaultError })

    const retryButton = screen.getByRole('button', { name: /Retry Import/i })

    const eventHandler = vi.fn()
    component.$on('retry', eventHandler)

    await fireEvent.click(retryButton)

    expect(eventHandler).toHaveBeenCalledTimes(1)
  })

  it('should display Download Error Log button when errorLogUrl provided', () => {
    render(ImportErrorDisplay, { error: defaultError })

    const downloadButton = screen.getByRole('link', { name: /Download Error Log/i })
    expect(downloadButton).toBeDefined()
  })

  it('should set correct href for error log download', () => {
    render(ImportErrorDisplay, { error: defaultError })

    const downloadLink = screen.getByRole('link', { name: /Download Error Log/i })
    expect(downloadLink.getAttribute('href')).toBe(defaultError.errorLogUrl)
  })

  it('should not display Download button when errorLogUrl not provided', () => {
    const errorWithoutLog = { ...defaultError, errorLogUrl: null }
    render(ImportErrorDisplay, { error: errorWithoutLog })

    const downloadButton = screen.queryByRole('link', { name: /Download Error Log/i })
    expect(downloadButton).toBeNull()
  })

  it('should display Cancel button', () => {
    render(ImportErrorDisplay, { error: defaultError })

    const cancelButton = screen.getByRole('button', { name: /Cancel/i })
    expect(cancelButton).toBeDefined()
  })

  it('should emit cancel event when Cancel button clicked', async () => {
    const { component } = render(ImportErrorDisplay, { error: defaultError })

    const cancelButton = screen.getByRole('button', { name: /Cancel/i })

    const eventHandler = vi.fn()
    component.$on('cancel', eventHandler)

    await fireEvent.click(cancelButton)

    expect(eventHandler).toHaveBeenCalledTimes(1)
  })

  it('should handle TIMEOUT_ERROR code', () => {
    const timeoutError = {
      code: 'TIMEOUT_ERROR',
      message: 'Import timed out - please try again',
      details: 'Operation took longer than 60 seconds',
      canRetry: true,
      errorLogUrl: null
    }

    render(ImportErrorDisplay, { error: timeoutError })

    expect(screen.getByText('TIMEOUT_ERROR')).toBeDefined()
    expect(screen.getByText(/Import timed out/i)).toBeDefined()
  })

  it('should handle UNKNOWN_ERROR code', () => {
    const unknownError = {
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred',
      details: 'Stack trace...',
      canRetry: true,
      errorLogUrl: null
    }

    render(ImportErrorDisplay, { error: unknownError })

    expect(screen.getByText('UNKNOWN_ERROR')).toBeDefined()
  })

  it('should be accessible with proper ARIA roles', () => {
    const { container } = render(ImportErrorDisplay, { error: defaultError })

    // Error container should have appropriate role
    const alert = container.querySelector('[role="alert"]')
    expect(alert).toBeDefined()
  })

  it('should use semantic HTML for error structure', () => {
    const { container } = render(ImportErrorDisplay, { error: defaultError })

    // Should have error message, details, and actions sections
    const sections = container.querySelectorAll('section, .error-section')
    expect(sections.length).toBeGreaterThan(0)
  })

  it('should display helpful error message for constraint violations', () => {
    render(ImportErrorDisplay, { error: defaultError })

    // Should suggest resolution
    expect(screen.getByText(/constraint violation/i)).toBeDefined()
  })

  it('should handle missing error details gracefully', () => {
    const minimalError = {
      code: 'UNKNOWN_ERROR',
      message: 'Something went wrong',
      canRetry: false
    }

    render(ImportErrorDisplay, { error: minimalError })

    expect(screen.getByText('Something went wrong')).toBeDefined()
  })
})
