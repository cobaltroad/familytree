/**
 * Tests for GEDCOM Import Error Endpoints
 * Story #97: GEDCOM Import Error Handling and Recovery
 *
 * Tests for:
 * - GET /api/gedcom/import/:uploadId/errors - Get error summary
 * - GET /api/gedcom/import/:uploadId/errors.csv - Download error log CSV
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { promises as fs } from 'fs'
import path from 'path'
import { storePreviewData, getPreviewData, clearPreviewData } from '$lib/server/gedcomPreview.js'
import {
  createImportError,
  createValidationWarning,
  generateErrorLogCSV
} from '$lib/server/gedcomErrorHandler.js'

describe('GEDCOM Error Endpoints - GET /api/gedcom/import/:uploadId/errors', () => {
  const mockUserId = 1
  const mockUploadId = 'test-upload-123'

  beforeEach(async () => {
    // Clear any existing preview data
    await clearPreviewData(mockUploadId, mockUserId)
  })

  afterEach(async () => {
    // Clean up
    await clearPreviewData(mockUploadId, mockUserId)
  })

  it('should return error summary when errors exist', async () => {
    // Store preview data with errors
    const errors = [
      createImportError({
        code: 'VALIDATION_ERROR',
        message: 'Invalid date format',
        line: 234,
        gedcomId: '@I045@',
        individualName: 'John Smith',
        field: 'birthDate',
        suggestedFix: 'Use YYYY-MM-DD format'
      }),
      createValidationWarning({
        message: 'Partial date (year only)',
        line: 567,
        gedcomId: '@I078@',
        individualName: 'Jane Doe',
        field: 'birthDate'
      })
    ]

    const parsedData = {
      individuals: [],
      families: [],
      errors
    }

    await storePreviewData(mockUploadId, mockUserId, parsedData, [])

    const previewData = await getPreviewData(mockUploadId, mockUserId)

    // Verify errors were stored
    expect(previewData.errors).toHaveLength(2)
    expect(previewData.errors[0].code).toBe('VALIDATION_ERROR')
    expect(previewData.errors[1].severity).toBe('Warning')
  })

  it('should return empty array when no errors exist', async () => {
    const parsedData = {
      individuals: [],
      families: [],
      errors: []
    }

    await storePreviewData(mockUploadId, mockUserId, parsedData, [])

    const previewData = await getPreviewData(mockUploadId, mockUserId)

    expect(previewData.errors).toHaveLength(0)
  })

  it('should categorize errors by severity', async () => {
    const errors = [
      createImportError({ code: 'VALIDATION_ERROR', message: 'Error 1' }),
      createImportError({ code: 'PARSE_ERROR', message: 'Error 2' }),
      createValidationWarning({ message: 'Warning 1' }),
      createValidationWarning({ message: 'Warning 2' }),
      createValidationWarning({ message: 'Warning 3' })
    ]

    const parsedData = {
      individuals: [],
      families: [],
      errors
    }

    await storePreviewData(mockUploadId, mockUserId, parsedData, [])

    const previewData = await getPreviewData(mockUploadId, mockUserId)

    const errorCount = previewData.errors.filter(e => e.severity === 'Error').length
    const warningCount = previewData.errors.filter(e => e.severity === 'Warning').length

    expect(errorCount).toBe(2)
    expect(warningCount).toBe(3)
  })
})

describe('GEDCOM Error Endpoints - CSV Generation', () => {
  it('should generate downloadable CSV from errors', () => {
    const errors = [
      createImportError({
        code: 'VALIDATION_ERROR',
        message: 'Invalid date format',
        line: 234,
        gedcomId: '@I045@',
        individualName: 'John Smith',
        field: 'birthDate',
        suggestedFix: 'Use YYYY-MM-DD format'
      }),
      createValidationWarning({
        message: 'Partial date (year only)',
        line: 567,
        gedcomId: '@I078@',
        individualName: 'Jane Doe',
        field: 'birthDate',
        suggestedFix: 'Date imported as 1950'
      })
    ]

    const csv = generateErrorLogCSV(errors)

    // Verify CSV format
    expect(csv).toContain('Severity,Line,GEDCOM ID,Name,Field,Error,Suggested Fix')
    expect(csv).toContain('Error,234,@I045@,John Smith,birthDate')
    expect(csv).toContain('Warning,567,@I078@,Jane Doe')
  })

  it('should generate CSV with proper filename format', () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const seconds = String(now.getSeconds()).padStart(2, '0')

    const expectedPattern = new RegExp(
      `import_errors_${year}${month}${day}_\\d{6}\\.csv`
    )

    const filename = `import_errors_${year}${month}${day}_${hours}${minutes}${seconds}.csv`

    expect(filename).toMatch(expectedPattern)
  })

  it('should escape CSV special characters correctly', () => {
    const errors = [
      createImportError({
        code: 'VALIDATION_ERROR',
        message: 'Date format error, please fix',
        individualName: 'Smith, John "Jack"',
        suggestedFix: 'Use format: YYYY-MM-DD'
      })
    ]

    const csv = generateErrorLogCSV(errors)

    // Verify commas and quotes are escaped
    expect(csv).toContain('"Date format error, please fix"')
    expect(csv).toContain('"Smith, John ""Jack"""')
    expect(csv).toContain('"Use format: YYYY-MM-DD"')
  })
})
