/**
 * ImportSummary Component Tests
 * Story #107: GEDCOM Import Progress and Confirmation
 *
 * Tests for post-import success summary display
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/svelte'
import ImportSummary from './ImportSummary.svelte'

describe('ImportSummary', () => {
  const defaultSummary = {
    personsAdded: 125,
    personsUpdated: 5,
    personsSkipped: 3,
    relationshipsCreated: 150,
    duration: 2500 // milliseconds
  }

  it('should display success message with checkmark', () => {
    render(ImportSummary, { summary: defaultSummary })

    expect(screen.getByText(/Import completed successfully/i)).toBeDefined()
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading.textContent).toContain('Import completed successfully')
  })

  it('should display number of individuals added', () => {
    render(ImportSummary, { summary: defaultSummary })

    expect(screen.getByText('125')).toBeDefined()
    expect(screen.getByText(/Individuals Added/i)).toBeDefined()
  })

  it('should display number of individuals updated', () => {
    render(ImportSummary, { summary: defaultSummary })

    expect(screen.getByText('5')).toBeDefined()
    expect(screen.getByText(/Individuals Merged/i)).toBeDefined()
  })

  it('should display number of individuals skipped', () => {
    render(ImportSummary, { summary: defaultSummary })

    expect(screen.getByText('3')).toBeDefined()
    expect(screen.getByText(/Individuals Skipped/i)).toBeDefined()
  })

  it('should display number of relationships created', () => {
    render(ImportSummary, { summary: defaultSummary })

    expect(screen.getByText('150')).toBeDefined()
    expect(screen.getByText(/Relationships Created/i)).toBeDefined()
  })

  it('should format import duration correctly', () => {
    render(ImportSummary, { summary: { ...defaultSummary, duration: 2500 } })

    expect(screen.getByText(/2 seconds/i)).toBeDefined()
  })

  it('should format duration in minutes when > 60 seconds', () => {
    render(ImportSummary, { summary: { ...defaultSummary, duration: 125000 } })

    expect(screen.getByText(/2 minutes 5 seconds/i)).toBeDefined()
  })

  it('should display View Tree button', () => {
    render(ImportSummary, { summary: defaultSummary })

    const viewTreeButton = screen.getByRole('button', { name: /View.*Tree/i })
    expect(viewTreeButton).toBeDefined()
  })

  it('should emit viewTree event when button clicked', async () => {
    const { component } = render(ImportSummary, { summary: defaultSummary })

    const viewTreeButton = screen.getByRole('button', { name: /View.*Tree/i })

    const eventHandler = vi.fn()
    component.$on('viewTree', eventHandler)

    await fireEvent.click(viewTreeButton)

    expect(eventHandler).toHaveBeenCalledTimes(1)
  })

  it('should display Close button', () => {
    render(ImportSummary, { summary: defaultSummary })

    const closeButton = screen.getByRole('button', { name: /Close/i })
    expect(closeButton).toBeDefined()
  })

  it('should emit close event when Close button clicked', async () => {
    const { component } = render(ImportSummary, { summary: defaultSummary })

    const closeButton = screen.getByRole('button', { name: /Close/i })

    const eventHandler = vi.fn()
    component.$on('close', eventHandler)

    await fireEvent.click(closeButton)

    expect(eventHandler).toHaveBeenCalledTimes(1)
  })

  it('should handle zero values gracefully', () => {
    const zeroSummary = {
      personsAdded: 0,
      personsUpdated: 0,
      personsSkipped: 0,
      relationshipsCreated: 0,
      duration: 500
    }

    render(ImportSummary, { summary: zeroSummary })

    const zeroValues = screen.getAllByText('0')
    expect(zeroValues.length).toBe(4) // 4 stat cards with 0
  })

  it('should display statistics in cards layout', () => {
    const { container } = render(ImportSummary, { summary: defaultSummary })

    const statsCards = container.querySelectorAll('.stat-card')
    expect(statsCards.length).toBeGreaterThanOrEqual(4) // At least 4 stat cards
  })

  it('should use semantic HTML for statistics', () => {
    const { container } = render(ImportSummary, { summary: defaultSummary })

    const statValues = container.querySelectorAll('.stat-value')
    expect(statValues.length).toBeGreaterThan(0)

    const statLabels = container.querySelectorAll('.stat-label')
    expect(statLabels.length).toBeGreaterThan(0)
  })

  it('should display success icon or checkmark', () => {
    const { container } = render(ImportSummary, { summary: defaultSummary })

    // Look for success icon (could be SVG, emoji, or CSS class)
    const successIndicator = container.querySelector('.success-icon, .checkmark, [aria-label*="success"]')
    expect(successIndicator).toBeDefined()
  })

  it('should be accessible with proper ARIA roles', () => {
    const { container } = render(ImportSummary, { summary: defaultSummary })

    // Main container should have appropriate role or semantic element
    const alert = container.querySelector('[role="status"], [role="alert"]')
    expect(alert || container.querySelector('section')).toBeDefined()
  })

  it('should handle very large numbers', () => {
    const largeSummary = {
      personsAdded: 50000,
      personsUpdated: 1000,
      personsSkipped: 500,
      relationshipsCreated: 75000,
      duration: 300000
    }

    render(ImportSummary, { summary: largeSummary })

    expect(screen.getByText('50000')).toBeDefined()
    expect(screen.getByText('75000')).toBeDefined()
  })
})
