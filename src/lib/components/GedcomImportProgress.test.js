/**
 * GedcomImportProgress Component Tests
 * Story #107: GEDCOM Import Progress and Confirmation
 *
 * Simplified tests for main import progress page
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte'
import GedcomImportProgress from './GedcomImportProgress.svelte'
import * as api from '../api.js'

// Mock the API
vi.mock('../api.js', () => ({
  api: {
    importGedcom: vi.fn(),
    getGedcomPreviewIndividuals: vi.fn()
  }
}))

describe('GedcomImportProgress - Basic Functionality', () => {
  const mockUploadId = 'test-upload-123'

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock preview data
    api.api.getGedcomPreviewIndividuals.mockResolvedValue({
      statistics: {
        total: 125,
        duplicates: 5,
        willImport: 120
      }
    })
  })

  it('should render component and display heading', () => {
    render(GedcomImportProgress, { uploadId: mockUploadId })

    const heading = screen.getByRole('heading', { name: /GEDCOM Import/i })
    expect(heading).toBeDefined()
  })

  it('should display confirmation phase initially', async () => {
    render(GedcomImportProgress, { uploadId: mockUploadId })

    await waitFor(() => {
      const confirmHeading = screen.getByRole('heading', { name: /Confirm Import/i })
      expect(confirmHeading).toBeDefined()
    }, { timeout: 3000 })
  })

  it('should display start and cancel buttons', async () => {
    render(GedcomImportProgress, { uploadId: mockUploadId })

    await waitFor(() => {
      const startButton = screen.getByRole('button', { name: /Start Import/i })
      const cancelButton = screen.getByRole('button', { name: /Cancel/i })
      expect(startButton).toBeDefined()
      expect(cancelButton).toBeDefined()
    }, { timeout: 3000 })
  })

  it('should trigger import when start button clicked', async () => {
    api.api.importGedcom.mockResolvedValue({
      success: true,
      imported: {
        persons: 120,
        updated: 5,
        relationships: 150
      }
    })

    render(GedcomImportProgress, { uploadId: mockUploadId })

    const startButton = await waitFor(
      () => screen.getByRole('button', { name: /Start Import/i }),
      { timeout: 3000 }
    )

    await fireEvent.click(startButton)

    expect(api.api.importGedcom).toHaveBeenCalledWith(mockUploadId, { importAll: true })
  })

  it('should display success message on completion', async () => {
    api.api.importGedcom.mockResolvedValue({
      success: true,
      imported: {
        persons: 120,
        updated: 5,
        relationships: 150
      }
    })

    render(GedcomImportProgress, { uploadId: mockUploadId })

    const startButton = await waitFor(
      () => screen.getByRole('button', { name: /Start Import/i }),
      { timeout: 3000 }
    )

    await fireEvent.click(startButton)

    await waitFor(() => {
      expect(screen.getByText(/Import completed successfully/i)).toBeDefined()
    }, { timeout: 3000 })
  })

  it('should display error message on failure', async () => {
    const mockError = {
      success: false,
      error: {
        code: 'CONSTRAINT_VIOLATION',
        message: 'Database constraint violation',
        details: 'UNIQUE constraint failed',
        canRetry: true
      }
    }

    api.api.importGedcom.mockRejectedValue({
      message: mockError.error.message,
      data: mockError
    })

    render(GedcomImportProgress, { uploadId: mockUploadId })

    const startButton = await waitFor(
      () => screen.getByRole('button', { name: /Start Import/i }),
      { timeout: 3000 }
    )

    await fireEvent.click(startButton)

    await waitFor(() => {
      expect(screen.getByText(/Import Failed/i)).toBeDefined()
    }, { timeout: 3000 })
  })

  it('should display retry button on error when canRetry is true', async () => {
    const mockError = {
      success: false,
      error: {
        code: 'TIMEOUT_ERROR',
        message: 'Import timed out',
        canRetry: true
      }
    }

    api.api.importGedcom.mockRejectedValue({
      message: mockError.error.message,
      data: mockError
    })

    render(GedcomImportProgress, { uploadId: mockUploadId })

    const startButton = await waitFor(
      () => screen.getByRole('button', { name: /Start Import/i }),
      { timeout: 3000 }
    )

    await fireEvent.click(startButton)

    await waitFor(() => {
      const retryButton = screen.getByRole('button', { name: /Retry Import/i })
      expect(retryButton).toBeDefined()
    }, { timeout: 3000 })
  })
})
