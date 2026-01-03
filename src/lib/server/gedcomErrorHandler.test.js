/**
 * Tests for GEDCOM Error Handler Module
 * Story #97: GEDCOM Import Error Handling and Recovery
 *
 * Tests comprehensive error handling including:
 * - Actionable error messages with context
 * - Error log CSV generation
 * - Malformed date handling
 * - Orphaned relationship detection
 * - Database constraint error formatting
 */

import { describe, it, expect } from 'vitest'
import {
  createImportError,
  createValidationWarning,
  formatErrorMessage,
  generateErrorLogCSV,
  ErrorCodes,
  ErrorSeverity
} from './gedcomErrorHandler.js'

describe('GEDCOM Error Handler', () => {
  describe('createImportError', () => {
    it('should create error with all required fields', () => {
      const error = createImportError({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Invalid date format',
        line: 234,
        gedcomId: '@I045@',
        individualName: 'John Smith',
        field: 'birthDate',
        suggestedFix: 'Use format YYYY-MM-DD or GEDCOM date format'
      })

      expect(error).toMatchObject({
        severity: ErrorSeverity.ERROR,
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Invalid date format',
        line: 234,
        gedcomId: '@I045@',
        individualName: 'John Smith',
        field: 'birthDate',
        suggestedFix: 'Use format YYYY-MM-DD or GEDCOM date format',
        timestamp: expect.any(Date)
      })
    })

    it('should create error with minimal fields (line and gedcomId optional)', () => {
      const error = createImportError({
        code: ErrorCodes.CONSTRAINT_VIOLATION,
        message: 'Person cannot have multiple mothers',
        suggestedFix: 'Review family relationships'
      })

      expect(error.severity).toBe(ErrorSeverity.ERROR)
      expect(error.code).toBe(ErrorCodes.CONSTRAINT_VIOLATION)
      expect(error.line).toBeNull()
      expect(error.gedcomId).toBeNull()
    })

    it('should default to UNKNOWN_ERROR code if not provided', () => {
      const error = createImportError({
        message: 'Something went wrong'
      })

      expect(error.code).toBe(ErrorCodes.UNKNOWN_ERROR)
    })
  })

  describe('createValidationWarning', () => {
    it('should create warning with WARNING severity', () => {
      const warning = createValidationWarning({
        message: 'Partial date (year only)',
        line: 567,
        gedcomId: '@I078@',
        individualName: 'Jane Doe',
        field: 'birthDate',
        suggestedFix: 'Date imported as 1950-00-00'
      })

      expect(warning.severity).toBe(ErrorSeverity.WARNING)
      expect(warning.code).toBe(ErrorCodes.VALIDATION_WARNING)
      expect(warning.message).toBe('Partial date (year only)')
    })
  })

  describe('formatErrorMessage', () => {
    it('should format detailed error message with all context', () => {
      const error = createImportError({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Invalid date format',
        line: 234,
        gedcomId: '@I045@',
        individualName: 'John Smith',
        field: 'birthDate',
        suggestedFix: 'Use YYYY-MM-DD format'
      })

      const formatted = formatErrorMessage(error)

      expect(formatted).toContain('Import failed at individual #45')
      expect(formatted).toContain('Line 234 in GEDCOM file')
      expect(formatted).toContain('Individual: John Smith (@I045@)')
      expect(formatted).toContain('Field: birthDate')
      expect(formatted).toContain('Error: Invalid date format')
      expect(formatted).toContain('Suggested fix: Use YYYY-MM-DD format')
    })

    it('should format error without optional fields', () => {
      const error = createImportError({
        code: ErrorCodes.PARSE_ERROR,
        message: 'Unexpected end of file'
      })

      const formatted = formatErrorMessage(error)

      expect(formatted).toContain('Error: Unexpected end of file')
      expect(formatted).not.toContain('Line')
      expect(formatted).not.toContain('Individual')
    })

    it('should format constraint violation errors clearly', () => {
      const error = createImportError({
        code: ErrorCodes.CONSTRAINT_VIOLATION,
        message: 'Person cannot have multiple mothers',
        gedcomId: '@I045@',
        individualName: 'John Smith',
        suggestedFix: 'Review family relationships in GEDCOM file'
      })

      const formatted = formatErrorMessage(error)

      expect(formatted).toContain('Database constraint violation')
      expect(formatted).toContain('Person cannot have multiple mothers')
      expect(formatted).toContain('Review family relationships')
    })
  })

  describe('generateErrorLogCSV', () => {
    it('should generate CSV with correct headers', () => {
      const errors = []
      const csv = generateErrorLogCSV(errors)

      expect(csv).toContain('Severity,Line,GEDCOM ID,Name,Field,Error,Suggested Fix')
    })

    it('should generate CSV rows for errors and warnings', () => {
      const errors = [
        createImportError({
          code: ErrorCodes.VALIDATION_ERROR,
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
      const lines = csv.split('\n')

      expect(lines.length).toBe(3) // Header + 2 data rows
      expect(lines[1]).toContain('Error,234,@I045@,John Smith,birthDate,Invalid date format,Use YYYY-MM-DD format')
      expect(lines[2]).toContain('Warning,567,@I078@,Jane Doe,birthDate,Partial date (year only),Date imported as 1950')
    })

    it('should escape commas and quotes in CSV fields', () => {
      const errors = [
        createImportError({
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'Invalid date format, please fix',
          individualName: 'Smith, John "Jack"',
          suggestedFix: 'Use format: YYYY-MM-DD'
        })
      ]

      const csv = generateErrorLogCSV(errors)

      expect(csv).toContain('"Invalid date format, please fix"')
      expect(csv).toContain('"Smith, John ""Jack"""')
      expect(csv).toContain('"Use format: YYYY-MM-DD"')
    })

    it('should handle empty fields gracefully', () => {
      const errors = [
        createImportError({
          code: ErrorCodes.PARSE_ERROR,
          message: 'Unexpected end of file'
        })
      ]

      const csv = generateErrorLogCSV(errors)
      const lines = csv.split('\n')

      expect(lines[1]).toContain('Error,,,,,Unexpected end of file,')
    })

    it('should generate CSV for 100+ errors efficiently', () => {
      const errors = []
      for (let i = 0; i < 150; i++) {
        errors.push(
          createImportError({
            code: ErrorCodes.VALIDATION_ERROR,
            message: `Error ${i}`,
            line: i * 10,
            gedcomId: `@I${String(i).padStart(3, '0')}@`
          })
        )
      }

      const csv = generateErrorLogCSV(errors)
      const lines = csv.split('\n')

      expect(lines.length).toBe(151) // Header + 150 rows
    })
  })

  describe('Error Codes', () => {
    it('should export all required error codes', () => {
      expect(ErrorCodes.UNSUPPORTED_VERSION).toBe('UNSUPPORTED_VERSION')
      expect(ErrorCodes.PARSE_ERROR).toBe('PARSE_ERROR')
      expect(ErrorCodes.VALIDATION_ERROR).toBe('VALIDATION_ERROR')
      expect(ErrorCodes.VALIDATION_WARNING).toBe('VALIDATION_WARNING')
      expect(ErrorCodes.CONSTRAINT_VIOLATION).toBe('CONSTRAINT_VIOLATION')
      expect(ErrorCodes.TIMEOUT_ERROR).toBe('TIMEOUT_ERROR')
      expect(ErrorCodes.NETWORK_ERROR).toBe('NETWORK_ERROR')
      expect(ErrorCodes.UNKNOWN_ERROR).toBe('UNKNOWN_ERROR')
    })
  })

  describe('Error Severity', () => {
    it('should export severity levels', () => {
      expect(ErrorSeverity.ERROR).toBe('Error')
      expect(ErrorSeverity.WARNING).toBe('Warning')
    })
  })
})
