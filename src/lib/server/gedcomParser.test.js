/**
 * GEDCOM Parser Module - Unit Tests
 * Story #93: GEDCOM File Parsing and Validation
 *
 * RED phase: Writing failing tests to define expected behavior
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { promises as fs } from 'fs'
import path from 'path'
import {
  parseGedcom,
  detectGedcomVersion,
  extractStatistics,
  validateGedcomVersion,
  normalizeDate,
  validateRelationshipConsistency
} from './gedcomParser.js'

const FIXTURES_DIR = path.join(process.cwd(), 'src/test/fixtures/gedcom')

describe('gedcomParser - detectGedcomVersion', () => {
  it('should detect GEDCOM 5.5.1 version', async () => {
    const filePath = path.join(FIXTURES_DIR, 'valid-5.5.1.ged')
    const content = await fs.readFile(filePath, 'utf8')

    const version = detectGedcomVersion(content)

    expect(version).toBe('5.5.1')
  })

  it('should detect GEDCOM 7.0 version', async () => {
    const filePath = path.join(FIXTURES_DIR, 'valid-7.0.ged')
    const content = await fs.readFile(filePath, 'utf8')

    const version = detectGedcomVersion(content)

    expect(version).toBe('7.0')
  })

  it('should detect GEDCOM 4.0 version', async () => {
    const filePath = path.join(FIXTURES_DIR, 'invalid-version.ged')
    const content = await fs.readFile(filePath, 'utf8')

    const version = detectGedcomVersion(content)

    expect(version).toBe('4.0')
  })

  it('should return null for missing version', () => {
    const content = '0 HEAD\n0 TRLR'

    const version = detectGedcomVersion(content)

    expect(version).toBeNull()
  })
})

describe('gedcomParser - validateGedcomVersion', () => {
  it('should accept GEDCOM 5.5.1', () => {
    const result = validateGedcomVersion('5.5.1')

    expect(result.valid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('should accept GEDCOM 7.0', () => {
    const result = validateGedcomVersion('7.0')

    expect(result.valid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('should reject GEDCOM 4.0', () => {
    const result = validateGedcomVersion('4.0')

    expect(result.valid).toBe(false)
    expect(result.error).toBe('GEDCOM version 4.0 is not supported. Please use version 5.5.1 or 7.0')
  })

  it('should reject missing version', () => {
    const result = validateGedcomVersion(null)

    expect(result.valid).toBe(false)
    expect(result.error).toContain('GEDCOM version not found')
  })
})

describe('gedcomParser - normalizeDate', () => {
  it('should normalize standard date format (DD MMM YYYY)', () => {
    const result = normalizeDate('15 JAN 1950')

    expect(result.normalized).toBe('1950-01-15')
    expect(result.original).toBe('15 JAN 1950')
    expect(result.valid).toBe(true)
  })

  it('should normalize month-year format (MMM YYYY)', () => {
    const result = normalizeDate('JAN 1952')

    expect(result.normalized).toBe('1952-01')
    expect(result.original).toBe('JAN 1952')
    expect(result.valid).toBe(true)
    expect(result.partial).toBe(true)
  })

  it('should normalize year-only format (YYYY)', () => {
    const result = normalizeDate('1975')

    expect(result.normalized).toBe('1975')
    expect(result.original).toBe('1975')
    expect(result.valid).toBe(true)
    expect(result.partial).toBe(true)
  })

  it('should handle ABT (about) modifier', () => {
    const result = normalizeDate('ABT 1980')

    expect(result.normalized).toBe('1980')
    expect(result.original).toBe('ABT 1980')
    expect(result.valid).toBe(true)
    expect(result.modifier).toBe('ABT')
  })

  it('should handle BEF (before) modifier', () => {
    const result = normalizeDate('BEF 1990')

    expect(result.normalized).toBe('1990')
    expect(result.modifier).toBe('BEF')
  })

  it('should handle AFT (after) modifier', () => {
    const result = normalizeDate('AFT 2000')

    expect(result.normalized).toBe('2000')
    expect(result.modifier).toBe('AFT')
  })

  it('should mark invalid date as invalid', () => {
    const result = normalizeDate('99 ZZZ 9999')

    expect(result.valid).toBe(false)
    expect(result.normalized).toBeNull()
    expect(result.error).toBeDefined()
  })

  it('should handle GEDCOM 7.0 ISO format (YYYY-MM-DD)', () => {
    const result = normalizeDate('1950-01-15')

    expect(result.normalized).toBe('1950-01-15')
    expect(result.valid).toBe(true)
  })
})

describe('gedcomParser - parseGedcom', () => {
  it('should parse valid GEDCOM 5.5.1 file successfully', async () => {
    const filePath = path.join(FIXTURES_DIR, 'valid-5.5.1.ged')
    const content = await fs.readFile(filePath, 'utf8')

    const result = await parseGedcom(content)

    if (!result.success) {
      console.log('Parse failed with error:', result.error)
    }

    expect(result.success).toBe(true)
    expect(result.version).toBe('5.5.1')
    expect(result.individuals).toHaveLength(3)
    expect(result.families).toHaveLength(1)
    expect(result.errors).toHaveLength(0)
  })

  it('should parse valid GEDCOM 7.0 file successfully', async () => {
    const filePath = path.join(FIXTURES_DIR, 'valid-7.0.ged')
    const content = await fs.readFile(filePath, 'utf8')

    const result = await parseGedcom(content)

    expect(result.success).toBe(true)
    expect(result.version).toBe('7.0')
    expect(result.individuals).toHaveLength(1)
  })

  it('should reject unsupported GEDCOM version', async () => {
    const filePath = path.join(FIXTURES_DIR, 'invalid-version.ged')
    const content = await fs.readFile(filePath, 'utf8')

    const result = await parseGedcom(content)

    expect(result.success).toBe(false)
    expect(result.error).toContain('GEDCOM version 4.0 is not supported')
  })

  it('should detect and report date parsing errors', async () => {
    const filePath = path.join(FIXTURES_DIR, 'syntax-errors.ged')
    const content = await fs.readFile(filePath, 'utf8')

    const result = await parseGedcom(content)

    expect(result.success).toBe(true) // Should still parse, but with warnings
    expect(result.errors.length).toBeGreaterThan(0)

    const dateError = result.errors.find(e => e.message.includes('Invalid date'))
    expect(dateError).toBeDefined()
    expect(dateError.line).toBeDefined()
    expect(dateError.severity).toBe('warning')
  })

  it('should parse individuals with normalized dates', async () => {
    const filePath = path.join(FIXTURES_DIR, 'partial-dates.ged')
    const content = await fs.readFile(filePath, 'utf8')

    const result = await parseGedcom(content)

    expect(result.success).toBe(true)
    expect(result.individuals).toHaveLength(4)

    // Standard date
    expect(result.individuals[0].birthDate).toBe('1950-01-15')

    // Month-year
    expect(result.individuals[1].birthDate).toBe('1952-01')

    // Year only
    expect(result.individuals[2].birthDate).toBe('1975')

    // Approximate (ABT modifier removed from normalized date)
    expect(result.individuals[3].birthDate).toBe('1980')
  })
})

describe('gedcomParser - extractStatistics', () => {
  it('should extract correct statistics from parsed data', async () => {
    const filePath = path.join(FIXTURES_DIR, 'valid-5.5.1.ged')
    const content = await fs.readFile(filePath, 'utf8')
    const parsed = await parseGedcom(content)

    const stats = extractStatistics(parsed)

    expect(stats.individualsCount).toBe(3)
    expect(stats.familiesCount).toBe(1)
    expect(stats.earliestDate).toBe('1950-01-15')
    expect(stats.latestDate).toBe('2020-12-20')
    expect(stats.version).toBe('5.5.1')
  })

  it('should handle files with no dates', () => {
    const parsed = {
      success: true,
      version: '5.5.1',
      individuals: [
        { id: '@I1@', name: 'John Smith' }
      ],
      families: []
    }

    const stats = extractStatistics(parsed)

    expect(stats.individualsCount).toBe(1)
    expect(stats.familiesCount).toBe(0)
    expect(stats.earliestDate).toBeNull()
    expect(stats.latestDate).toBeNull()
  })
})

describe('gedcomParser - validateRelationshipConsistency', () => {
  it('should detect child-family reference mismatches', async () => {
    const parsed = {
      individuals: [
        { id: '@I1@', name: 'John Doe', childOfFamily: '@F1@' }
      ],
      families: [
        { id: '@F1@', children: ['@I2@', '@I3@'] } // Missing @I1@
      ]
    }

    const issues = validateRelationshipConsistency(parsed)

    expect(issues).toHaveLength(1)
    expect(issues[0].type).toBe('child-family-mismatch')
    expect(issues[0].description).toContain('John Doe')
    expect(issues[0].description).toContain('references family @F1@ but is not listed as a child')
    expect(issues[0].affectedIds).toContain('@I1@')
  })

  it('should detect parent-family reference mismatches', async () => {
    const parsed = {
      individuals: [
        { id: '@I1@', name: 'John Smith', spouseFamilies: ['@F1@'] }
      ],
      families: [
        { id: '@F1@', husband: '@I99@', wife: '@I2@' } // Wrong husband
      ]
    }

    const issues = validateRelationshipConsistency(parsed)

    expect(issues.length).toBeGreaterThan(0)
    expect(issues.some(i => i.type.includes('family'))).toBe(true)
  })

  it('should return empty array for consistent relationships', () => {
    const parsed = {
      individuals: [
        { id: '@I1@', name: 'John', childOfFamily: '@F1@' },
        { id: '@I2@', name: 'Jane', childOfFamily: '@F1@' }
      ],
      families: [
        { id: '@F1@', children: ['@I1@', '@I2@'] }
      ]
    }

    const issues = validateRelationshipConsistency(parsed)

    expect(issues).toHaveLength(0)
  })
})
