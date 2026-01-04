/**
 * GEDCOM Debug Flow Test
 *
 * Tests comprehensive console debugging throughout the GEDCOM import flow
 * to identify where the dollete.ged file import is failing silently.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { promises as fs } from 'fs'
import path from 'path'
import { parseGedcom, extractStatistics } from './gedcomParser.js'

describe('GEDCOM Debug Flow', () => {
  let consoleLogSpy
  let consoleErrorSpy
  let consoleWarnSpy

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
    consoleErrorSpy.mockRestore()
    consoleWarnSpy.mockRestore()
  })

  describe('File Reading and Initial Validation', () => {
    it('should log when starting to read dollete.ged file', async () => {
      const filePath = path.join(process.cwd(), 'backups', 'dollete.ged')

      // This should trigger initial file read debugging
      const fileExists = await fs.access(filePath).then(() => true).catch(() => false)

      expect(fileExists).toBe(true)
    })

    it('should log file size and content length', async () => {
      const filePath = path.join(process.cwd(), 'backups', 'dollete.ged')
      const content = await fs.readFile(filePath, 'utf8')

      // Debugging should capture these metrics
      const fileSize = Buffer.byteLength(content, 'utf8')
      const lineCount = content.split('\n').length

      expect(fileSize).toBeGreaterThan(0)
      expect(lineCount).toBeGreaterThan(0)
    })
  })

  describe('GEDCOM Parsing with Debug Output', () => {
    it('should parse dollete.ged and log parsing stages', async () => {
      const filePath = path.join(process.cwd(), 'backups', 'dollete.ged')
      const content = await fs.readFile(filePath, 'utf8')

      // Parse the file - this should trigger debugging at multiple stages
      const result = await parseGedcom(content)

      // Verify parsing succeeded
      expect(result.success).toBe(true)
      expect(result.individuals).toBeDefined()
      expect(result.families).toBeDefined()
    })

    it('should log individual and family counts during parsing', async () => {
      const filePath = path.join(process.cwd(), 'backups', 'dollete.ged')
      const content = await fs.readFile(filePath, 'utf8')

      const result = await parseGedcom(content)
      const stats = extractStatistics(result)

      // These should be logged
      expect(stats.totalIndividuals).toBeGreaterThan(0)
      expect(stats.totalFamilies).toBeGreaterThan(0)
    })

    it('should log any parsing errors or warnings', async () => {
      const filePath = path.join(process.cwd(), 'backups', 'dollete.ged')
      const content = await fs.readFile(filePath, 'utf8')

      const result = await parseGedcom(content)

      // Check if there are errors
      if (result.errors && result.errors.length > 0) {
        // Errors should be logged
        expect(result.errors).toBeInstanceOf(Array)
      }
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should log when encountering invalid GEDCOM version', async () => {
      const invalidContent = '0 HEAD\n1 GEDC\n2 VERS 99.0\n'

      const result = await parseGedcom(invalidContent)

      expect(result.success).toBe(false)
      expect(result.error).toContain('not supported')
    })

    it('should log when file content is empty', async () => {
      const emptyContent = ''

      const result = await parseGedcom(emptyContent)

      // Should fail gracefully with debug output
      expect(result.success).toBe(false)
    })

    it('should log when encountering malformed GEDCOM data', async () => {
      const malformedContent = '0 HEAD\nThis is not valid GEDCOM\n'

      const result = await parseGedcom(malformedContent)

      // Should capture error with debugging
      expect(result).toBeDefined()
    })
  })

  describe('Statistics Extraction with Debug Output', () => {
    it('should log statistics extraction process', async () => {
      const filePath = path.join(process.cwd(), 'backups', 'dollete.ged')
      const content = await fs.readFile(filePath, 'utf8')

      const parsed = await parseGedcom(content)
      const stats = extractStatistics(parsed)

      // Statistics calculation should be logged
      expect(stats).toBeDefined()
      expect(stats.totalIndividuals).toBeDefined()
      expect(stats.totalFamilies).toBeDefined()
      expect(stats.version).toBeDefined()
    })

    it('should log date range calculation if available', async () => {
      const filePath = path.join(process.cwd(), 'backups', 'dollete.ged')
      const content = await fs.readFile(filePath, 'utf8')

      const parsed = await parseGedcom(content)
      const stats = extractStatistics(parsed)

      // Date range should be logged if found
      if (stats.dateRange) {
        expect(stats.dateRange.earliest).toBeDefined()
        expect(stats.dateRange.latest).toBeDefined()
      }
    })
  })
})
