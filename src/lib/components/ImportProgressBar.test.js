/**
 * ImportProgressBar Component Tests
 * Story #107: GEDCOM Import Progress and Confirmation
 *
 * Tests for progress bar component with percentage and status display
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/svelte'
import ImportProgressBar from './ImportProgressBar.svelte'

describe('ImportProgressBar', () => {
  it('should render progress bar with 0% by default', () => {
    render(ImportProgressBar)

    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toBeDefined()
    expect(progressBar.getAttribute('aria-valuenow')).toBe('0')
    expect(progressBar.getAttribute('aria-valuemin')).toBe('0')
    expect(progressBar.getAttribute('aria-valuemax')).toBe('100')
  })

  it('should display percentage text', () => {
    render(ImportProgressBar, { percentage: 45 })

    expect(screen.getByText('45%')).toBeDefined()
  })

  it('should set progress bar width based on percentage', () => {
    const { container } = render(ImportProgressBar, { percentage: 60 })

    const progressFill = container.querySelector('.progress-fill')
    expect(progressFill.style.width).toBe('60%')
  })

  it('should display status text when provided', () => {
    render(ImportProgressBar, {
      percentage: 30,
      status: 'Importing individuals...'
    })

    expect(screen.getByText('Importing individuals...')).toBeDefined()
  })

  it('should display indeterminate state when percentage is null', () => {
    const { container } = render(ImportProgressBar, {
      percentage: null,
      status: 'Starting import...'
    })

    const progressBar = container.querySelector('.progress-bar')
    expect(progressBar.classList.contains('indeterminate')).toBe(true)
  })

  it('should handle 100% completion', () => {
    const { container } = render(ImportProgressBar, { percentage: 100 })

    expect(screen.getByText('100%')).toBeDefined()
    const progressFill = container.querySelector('.progress-fill')
    expect(progressFill.style.width).toBe('100%')
  })

  it('should clamp percentage to 0-100 range', async () => {
    const { container, component } = render(ImportProgressBar, { percentage: 150 })

    const progressFill = container.querySelector('.progress-fill')
    expect(progressFill.style.width).toBe('100%')

    await component.$set({ percentage: -10 })
    expect(progressFill.style.width).toBe('0%')
  })

  it('should update aria-valuenow when percentage changes', async () => {
    const { component } = render(ImportProgressBar, { percentage: 25 })

    const progressBar = screen.getByRole('progressbar')
    expect(progressBar.getAttribute('aria-valuenow')).toBe('25')

    await component.$set({ percentage: 75 })
    expect(progressBar.getAttribute('aria-valuenow')).toBe('75')
  })

  it('should apply success styling at 100%', () => {
    const { container } = render(ImportProgressBar, { percentage: 100 })

    const progressFill = container.querySelector('.progress-fill')
    expect(progressFill.classList.contains('complete')).toBe(true)
  })

  it('should display estimated time remaining when provided', () => {
    render(ImportProgressBar, {
      percentage: 40,
      estimatedTimeRemaining: '2 minutes remaining'
    })

    expect(screen.getByText('2 minutes remaining')).toBeDefined()
  })

  it('should handle multiple status updates', async () => {
    const { component } = render(ImportProgressBar, {
      percentage: 20,
      status: 'Processing individuals...'
    })

    expect(screen.getByText('Processing individuals...')).toBeDefined()

    await component.$set({
      percentage: 70,
      status: 'Creating relationships...'
    })

    expect(screen.queryByText('Processing individuals...')).toBeNull()
    expect(screen.getByText('Creating relationships...')).toBeDefined()
  })

  it('should be accessible with proper ARIA labels', () => {
    render(ImportProgressBar, {
      percentage: 50,
      status: 'Importing data...'
    })

    const progressBar = screen.getByRole('progressbar')
    expect(progressBar.getAttribute('aria-label')).toContain('Import progress')
  })
})
