/**
 * Tests for ImportView component
 * Verifies file upload functionality and notification integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte'
import ImportView from './ImportView.svelte'
import * as notificationStore from '../stores/notificationStore.js'

describe('ImportView - Notification Integration', () => {
  let fetchMock

  beforeEach(() => {
    // Mock fetch
    fetchMock = vi.fn()
    global.fetch = fetchMock

    // Spy on notification methods
    vi.spyOn(notificationStore, 'success')
    vi.spyOn(notificationStore, 'error')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should call success notification method after successful upload', async () => {
    // Arrange
    const mockResult = {
      uploadId: '123_456_789',
      fileName: 'test.ged',
      fileSize: 1024
    }

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Map(),
      json: async () => mockResult
    })

    render(ImportView)

    // Create a file
    const file = new File(['test content'], 'test.ged', { type: 'text/plain' })

    // Act: Select file
    const fileInput = screen.getByLabelText(/choose file/i)
    await fireEvent.change(fileInput, { target: { files: [file] } })

    // Act: Click upload button
    const uploadButton = screen.getByRole('button', { name: /upload file/i })
    await fireEvent.click(uploadButton)

    // Assert: Wait for upload to complete
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/gedcom/upload', {
        method: 'POST',
        body: expect.any(FormData)
      })
    })

    // Assert: Success notification should be called
    await waitFor(() => {
      expect(notificationStore.success).toHaveBeenCalledWith(
        `File uploaded successfully: ${mockResult.fileName}`
      )
    })
  })

  it('should call error notification method after failed upload', async () => {
    // Arrange
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: new Map(),
      text: async () => 'Internal server error'
    })

    render(ImportView)

    // Create a file
    const file = new File(['test content'], 'test.ged', { type: 'text/plain' })

    // Act: Select file
    const fileInput = screen.getByLabelText(/choose file/i)
    await fireEvent.change(fileInput, { target: { files: [file] } })

    // Act: Click upload button
    const uploadButton = screen.getByRole('button', { name: /upload file/i })
    await fireEvent.click(uploadButton)

    // Assert: Wait for upload to complete
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled()
    })

    // Assert: Error notification should be called
    await waitFor(() => {
      expect(notificationStore.error).toHaveBeenCalledWith(
        expect.stringContaining('Upload failed')
      )
    })
  })

  it('should call error notification for invalid file type', async () => {
    // Arrange
    render(ImportView)

    // Create an invalid file (not .ged)
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' })

    // Act: Select file
    const fileInput = screen.getByLabelText(/choose file/i)
    await fireEvent.change(fileInput, { target: { files: [file] } })

    // Assert: Error notification should be called immediately
    await waitFor(() => {
      expect(notificationStore.error).toHaveBeenCalledWith(
        'Only .ged files are supported'
      )
    })
  })

  it('should call error notification for file size exceeding limit', async () => {
    // Arrange
    render(ImportView)

    // Create a large file (>10MB)
    const largeContent = new Array(11 * 1024 * 1024).fill('a').join('')
    const file = new File([largeContent], 'large.ged', { type: 'text/plain' })

    // Act: Select file
    const fileInput = screen.getByLabelText(/choose file/i)
    await fireEvent.change(fileInput, { target: { files: [file] } })

    // Assert: Error notification should be called immediately
    await waitFor(() => {
      expect(notificationStore.error).toHaveBeenCalledWith(
        'File size exceeds 10MB limit'
      )
    })
  })
})
