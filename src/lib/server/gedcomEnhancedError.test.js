/**
 * Tests for Enhanced GEDCOM Error Handling
 * Story #97: GEDCOM Import Error Handling and Recovery
 *
 * Tests for:
 * - Orphaned relationship detection
 * - Detailed error collection during parsing
 * - Malformed date handling with warnings
 * - Version rejection workflows
 */

import { describe, it, expect } from 'vitest'
import {
  validateOrphanedReferences,
  collectParsingErrors
} from './gedcomParser.js'
import { ErrorCodes } from './gedcomErrorHandler.js'

describe('GEDCOM Enhanced Error Handling', () => {
  describe('validateOrphanedReferences', () => {
    it('should detect orphaned child reference in family', () => {
      const parsed = {
        individuals: [
          { id: '@I001@', name: 'John Smith' },
          { id: '@I002@', name: 'Jane Smith' }
        ],
        families: [
          {
            id: '@F001@',
            husband: '@I001@',
            wife: '@I002@',
            children: ['@I003@', '@I999@'] // @I999@ does not exist
          }
        ]
      }

      const result = validateOrphanedReferences(parsed)

      expect(result.hasOrphans).toBe(true)
      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0]).toMatchObject({
        severity: 'Warning',
        code: ErrorCodes.VALIDATION_WARNING,
        message: expect.stringContaining('Orphaned child reference'),
        gedcomId: '@F001@',
        field: 'children'
      })
      expect(result.warnings[0].message).toContain('@I999@')
    })

    it('should detect orphaned husband reference', () => {
      const parsed = {
        individuals: [
          { id: '@I001@', name: 'Jane Smith' }
        ],
        families: [
          {
            id: '@F001@',
            husband: '@I999@', // Does not exist
            wife: '@I001@',
            children: []
          }
        ]
      }

      const result = validateOrphanedReferences(parsed)

      expect(result.hasOrphans).toBe(true)
      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0].message).toContain('Orphaned husband reference')
      expect(result.warnings[0].message).toContain('@I999@')
    })

    it('should detect orphaned wife reference', () => {
      const parsed = {
        individuals: [
          { id: '@I001@', name: 'John Smith' }
        ],
        families: [
          {
            id: '@F001@',
            husband: '@I001@',
            wife: '@I999@', // Does not exist
            children: []
          }
        ]
      }

      const result = validateOrphanedReferences(parsed)

      expect(result.hasOrphans).toBe(true)
      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0].message).toContain('Orphaned wife reference')
    })

    it('should detect multiple orphaned references', () => {
      const parsed = {
        individuals: [
          { id: '@I001@', name: 'John Smith' }
        ],
        families: [
          {
            id: '@F001@',
            husband: '@I001@',
            wife: '@I999@',
            children: ['@I998@', '@I997@']
          }
        ]
      }

      const result = validateOrphanedReferences(parsed)

      expect(result.hasOrphans).toBe(true)
      expect(result.warnings.length).toBeGreaterThanOrEqual(2) // Wife + children
    })

    it('should return no warnings for valid references', () => {
      const parsed = {
        individuals: [
          { id: '@I001@', name: 'John Smith' },
          { id: '@I002@', name: 'Jane Smith' },
          { id: '@I003@', name: 'Child Smith' }
        ],
        families: [
          {
            id: '@F001@',
            husband: '@I001@',
            wife: '@I002@',
            children: ['@I003@']
          }
        ]
      }

      const result = validateOrphanedReferences(parsed)

      expect(result.hasOrphans).toBe(false)
      expect(result.warnings).toHaveLength(0)
    })

    it('should return cleaned families with orphaned references removed', () => {
      const parsed = {
        individuals: [
          { id: '@I001@', name: 'John Smith' },
          { id: '@I002@', name: 'Jane Smith' },
          { id: '@I003@', name: 'Valid Child' }
        ],
        families: [
          {
            id: '@F001@',
            husband: '@I001@',
            wife: '@I002@',
            children: ['@I003@', '@I999@', '@I998@'] // Two orphans
          }
        ]
      }

      const result = validateOrphanedReferences(parsed)

      expect(result.cleanedFamilies).toHaveLength(1)
      expect(result.cleanedFamilies[0].children).toEqual(['@I003@'])
    })

    it('should remove orphaned husband/wife references', () => {
      const parsed = {
        individuals: [
          { id: '@I001@', name: 'Jane Smith' }
        ],
        families: [
          {
            id: '@F001@',
            husband: '@I999@', // Orphan
            wife: '@I001@',
            children: []
          }
        ]
      }

      const result = validateOrphanedReferences(parsed)

      expect(result.cleanedFamilies[0].husband).toBeNull()
      expect(result.cleanedFamilies[0].wife).toBe('@I001@')
    })
  })

  describe('collectParsingErrors', () => {
    it('should collect errors from date parsing failures', () => {
      const individual = {
        id: '@I045@',
        name: 'John /Smith/',
        firstName: 'John',
        lastName: 'Smith',
        birthDate: null,
        _dateErrors: [
          {
            field: 'birthDate',
            original: '99 ZZZ 9999',
            error: 'Invalid date format'
          }
        ]
      }

      const errors = collectParsingErrors([individual], [])

      expect(errors).toHaveLength(1)
      expect(errors[0]).toMatchObject({
        severity: 'Warning',
        code: ErrorCodes.VALIDATION_WARNING,
        message: expect.stringContaining('Invalid date format'),
        gedcomId: '@I045@',
        individualName: 'John Smith',
        field: 'birthDate',
        suggestedFix: expect.stringContaining('YYYY-MM-DD')
      })
    })

    it('should collect multiple errors from single individual', () => {
      const individual = {
        id: '@I045@',
        name: 'John /Smith/',
        firstName: 'John',
        lastName: 'Smith',
        birthDate: null,
        deathDate: null,
        _dateErrors: [
          {
            field: 'birthDate',
            original: 'invalid',
            error: 'Invalid date format'
          },
          {
            field: 'deathDate',
            original: 'circa 1990',
            error: 'Invalid date format'
          }
        ]
      }

      const errors = collectParsingErrors([individual], [])

      expect(errors).toHaveLength(2)
      expect(errors[0].field).toBe('birthDate')
      expect(errors[1].field).toBe('deathDate')
    })

    it('should return empty array when no errors', () => {
      const individual = {
        id: '@I001@',
        name: 'John /Smith/',
        birthDate: '1950-01-15'
      }

      const errors = collectParsingErrors([individual], [])

      expect(errors).toHaveLength(0)
    })
  })
})
