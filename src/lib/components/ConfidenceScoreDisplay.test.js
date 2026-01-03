/**
 * ConfidenceScoreDisplay Component Tests
 * Story #106: GEDCOM Duplicate Resolution UI
 *
 * Tests the confidence score display with tooltip showing matching criteria
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/svelte'
import ConfidenceScoreDisplay from './ConfidenceScoreDisplay.svelte'

describe('ConfidenceScoreDisplay', () => {
  it('displays confidence score as percentage', () => {
    // Arrange & Act
    render(ConfidenceScoreDisplay, { confidence: 95, matchDetails: {} })

    // Assert
    expect(screen.getByText('95%')).toBeInTheDocument()
  })

  it('displays match details in tooltip', () => {
    // Arrange
    const matchDetails = {
      name: 100,
      birthDate: 100,
      parents: 50
    }

    // Act
    render(ConfidenceScoreDisplay, { confidence: 95, matchDetails })

    // Assert
    expect(screen.getByText('Match Breakdown:')).toBeInTheDocument()
    expect(screen.getByText('Name:')).toBeInTheDocument()
    expect(screen.getByText('Birth Date:')).toBeInTheDocument()
    expect(screen.getByText('Parents:')).toBeInTheDocument()

    // Check for percentage values (these are in separate spans)
    const percentages = screen.getAllByText(/100%|50%/)
    expect(percentages.length).toBeGreaterThanOrEqual(2)
  })

  it('applies high confidence color for scores >= 90', () => {
    // Arrange & Act
    const { container } = render(ConfidenceScoreDisplay, { confidence: 95, matchDetails: {} })

    // Assert
    const scoreElement = container.querySelector('.confidence-score')
    expect(scoreElement).toHaveClass('high')
  })

  it('applies medium confidence color for scores 70-89', () => {
    // Arrange & Act
    const { container } = render(ConfidenceScoreDisplay, { confidence: 80, matchDetails: {} })

    // Assert
    const scoreElement = container.querySelector('.confidence-score')
    expect(scoreElement).toHaveClass('medium')
  })

  it('applies low confidence color for scores < 70', () => {
    // Arrange & Act
    const { container } = render(ConfidenceScoreDisplay, { confidence: 60, matchDetails: {} })

    // Assert
    const scoreElement = container.querySelector('.confidence-score')
    expect(scoreElement).toHaveClass('low')
  })

  it('handles zero confidence score', () => {
    // Arrange & Act
    render(ConfidenceScoreDisplay, { confidence: 0, matchDetails: {} })

    // Assert
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('handles 100% confidence score', () => {
    // Arrange & Act
    render(ConfidenceScoreDisplay, { confidence: 100, matchDetails: {} })

    // Assert
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('formats match detail keys with proper labels', () => {
    // Arrange
    const matchDetails = {
      name: 100,
      birthDate: 95,
      birthPlace: 80,
      parents: 50
    }

    // Act
    render(ConfidenceScoreDisplay, { confidence: 95, matchDetails })

    // Assert
    expect(screen.getByText(/Name/)).toBeInTheDocument()
    expect(screen.getByText(/Birth Date/)).toBeInTheDocument()
    expect(screen.getByText(/Birth Place/)).toBeInTheDocument()
    expect(screen.getByText(/Parents/)).toBeInTheDocument()
  })

  it('handles empty match details', () => {
    // Arrange & Act
    render(ConfidenceScoreDisplay, { confidence: 75, matchDetails: {} })

    // Assert
    expect(screen.getByText('Match Breakdown:')).toBeInTheDocument()
    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('rounds fractional confidence scores', () => {
    // Arrange & Act
    render(ConfidenceScoreDisplay, { confidence: 87.5, matchDetails: {} })

    // Assert
    expect(screen.getByText('88%')).toBeInTheDocument()
  })
})
