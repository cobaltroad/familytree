import { describe, it, expect } from 'vitest'
import { validateFileType, validateFileSize, sanitizeFileName } from './gedcomValidation.js'

/**
 * Test suite for GEDCOM File Validation
 * Story #92: Basic GEDCOM File Upload
 *
 * Tests validation of GEDCOM files for upload:
 * - File type validation (.ged extension)
 * - File size validation (10MB limit)
 * - File name sanitization (prevent path traversal)
 */

describe('validateFileType', () => {
  describe('accepts valid .ged files', () => {
    it('should accept .ged extension (lowercase)', () => {
      expect(validateFileType('family.ged')).toBe(true)
      expect(validateFileType('my-tree.ged')).toBe(true)
      expect(validateFileType('export_2024.ged')).toBe(true)
    })

    it('should accept .GED extension (uppercase)', () => {
      expect(validateFileType('FAMILY.GED')).toBe(true)
      expect(validateFileType('MY-TREE.GED')).toBe(true)
    })

    it('should accept .Ged extension (mixed case)', () => {
      expect(validateFileType('family.Ged')).toBe(true)
      expect(validateFileType('tree.GeD')).toBe(true)
    })
  })

  describe('rejects invalid file types', () => {
    it('should reject .txt files', () => {
      expect(validateFileType('file.txt')).toBe(false)
    })

    it('should reject .csv files', () => {
      expect(validateFileType('data.csv')).toBe(false)
    })

    it('should reject .json files', () => {
      expect(validateFileType('export.json')).toBe(false)
    })

    it('should reject .xml files', () => {
      expect(validateFileType('tree.xml')).toBe(false)
    })

    it('should reject files without extension', () => {
      expect(validateFileType('noextension')).toBe(false)
    })

    it('should reject empty filename', () => {
      expect(validateFileType('')).toBe(false)
    })

    it('should reject null or undefined', () => {
      expect(validateFileType(null)).toBe(false)
      expect(validateFileType(undefined)).toBe(false)
    })

    it('should reject double extensions like .ged.txt', () => {
      expect(validateFileType('file.ged.txt')).toBe(false)
    })

    it('should reject .gedcom files (only .ged allowed)', () => {
      expect(validateFileType('tree.gedcom')).toBe(false)
    })
  })
})

describe('validateFileSize', () => {
  const TEN_MB = 10 * 1024 * 1024 // 10MB in bytes

  describe('accepts files within size limit', () => {
    it('should accept 1 byte file', () => {
      expect(validateFileSize(1)).toBe(true)
    })

    it('should accept 1MB file', () => {
      const oneMB = 1 * 1024 * 1024
      expect(validateFileSize(oneMB)).toBe(true)
    })

    it('should accept 5MB file', () => {
      const fiveMB = 5 * 1024 * 1024
      expect(validateFileSize(fiveMB)).toBe(true)
    })

    it('should accept exactly 10MB file', () => {
      expect(validateFileSize(TEN_MB)).toBe(true)
    })

    it('should accept file just under 10MB', () => {
      expect(validateFileSize(TEN_MB - 1)).toBe(true)
    })
  })

  describe('rejects files exceeding size limit', () => {
    it('should reject 10MB + 1 byte file', () => {
      expect(validateFileSize(TEN_MB + 1)).toBe(false)
    })

    it('should reject 15MB file', () => {
      const fifteenMB = 15 * 1024 * 1024
      expect(validateFileSize(fifteenMB)).toBe(false)
    })

    it('should reject 100MB file', () => {
      const hundredMB = 100 * 1024 * 1024
      expect(validateFileSize(hundredMB)).toBe(false)
    })
  })

  describe('handles edge cases', () => {
    it('should reject zero-size file', () => {
      expect(validateFileSize(0)).toBe(false)
    })

    it('should reject negative size', () => {
      expect(validateFileSize(-1)).toBe(false)
      expect(validateFileSize(-1000)).toBe(false)
    })

    it('should reject null or undefined', () => {
      expect(validateFileSize(null)).toBe(false)
      expect(validateFileSize(undefined)).toBe(false)
    })

    it('should reject non-numeric values', () => {
      expect(validateFileSize('10MB')).toBe(false)
      expect(validateFileSize('large')).toBe(false)
    })
  })
})

describe('sanitizeFileName', () => {
  describe('handles normal filenames', () => {
    it('should preserve simple filename', () => {
      expect(sanitizeFileName('family.ged')).toBe('family.ged')
    })

    it('should preserve filename with hyphens', () => {
      expect(sanitizeFileName('my-family-tree.ged')).toBe('my-family-tree.ged')
    })

    it('should preserve filename with underscores', () => {
      expect(sanitizeFileName('export_2024_01_15.ged')).toBe('export_2024_01_15.ged')
    })

    it('should preserve filename with numbers', () => {
      expect(sanitizeFileName('tree123.ged')).toBe('tree123.ged')
    })
  })

  describe('prevents path traversal attacks', () => {
    it('should remove ../ sequences', () => {
      expect(sanitizeFileName('../../../etc/passwd')).toBe('etcpasswd')
    })

    it('should remove leading slashes', () => {
      expect(sanitizeFileName('/etc/passwd')).toBe('etcpasswd')
    })

    it('should remove backslashes (Windows paths)', () => {
      expect(sanitizeFileName('..\\..\\windows\\system32')).toBe('windowssystem32')
    })

    it('should remove directory separators from middle of filename', () => {
      expect(sanitizeFileName('path/to/file.ged')).toBe('pathtofile.ged')
    })

    it('should handle mixed attack patterns', () => {
      expect(sanitizeFileName('../path\\to/../file.ged')).toBe('pathtofile.ged')
    })
  })

  describe('handles special characters', () => {
    it('should preserve spaces', () => {
      expect(sanitizeFileName('my family tree.ged')).toBe('my family tree.ged')
    })

    it('should preserve parentheses', () => {
      expect(sanitizeFileName('tree (backup).ged')).toBe('tree (backup).ged')
    })

    it('should preserve brackets', () => {
      expect(sanitizeFileName('tree[2024].ged')).toBe('tree[2024].ged')
    })

    it('should remove null bytes', () => {
      expect(sanitizeFileName('file\x00.ged')).toBe('file.ged')
    })
  })

  describe('handles edge cases', () => {
    it('should handle empty string', () => {
      expect(sanitizeFileName('')).toBe('upload.ged')
    })

    it('should handle filename that becomes empty after sanitization', () => {
      expect(sanitizeFileName('../../../')).toBe('upload.ged')
      expect(sanitizeFileName('///')).toBe('upload.ged')
    })

    it('should handle very long filenames (truncate to 255 chars)', () => {
      const longName = 'a'.repeat(300) + '.ged'
      const sanitized = sanitizeFileName(longName)
      expect(sanitized.length).toBeLessThanOrEqual(255)
      expect(sanitized.endsWith('.ged')).toBe(true)
    })

    it('should handle null or undefined', () => {
      expect(sanitizeFileName(null)).toBe('upload.ged')
      expect(sanitizeFileName(undefined)).toBe('upload.ged')
    })
  })
})
