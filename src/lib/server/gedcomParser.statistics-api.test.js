/**
 * GEDCOM Parser - Statistics API Contract Tests
 *
 * RED Phase: These tests define the expected API contract for statistics
 * returned by extractStatistics(). The GedcomParsingResults component expects
 * specific field names that currently don't match what extractStatistics returns.
 *
 * Bug: Component expects individualsCount/familiesCount/earliestDate/latestDate
 *      but API returns totalIndividuals/totalFamilies/dateRange.earliest/dateRange.latest
 */

import { describe, it, expect } from 'vitest'
import { promises as fs } from 'fs'
import path from 'path'
import { parseGedcom, extractStatistics } from './gedcomParser.js'

describe('extractStatistics - API Contract', () => {
  it('should return statistics with individualsCount field (not totalIndividuals)', async () => {
    const filePath = path.join(process.cwd(), 'backups/dollete.ged')
    const content = await fs.readFile(filePath, 'utf8')
    const parsed = await parseGedcom(content)

    const stats = extractStatistics(parsed)

    // The component expects 'individualsCount', not 'totalIndividuals'
    expect(stats).toHaveProperty('individualsCount')
    expect(stats.individualsCount).toBe(26)

    // Should NOT have the old field name
    expect(stats).not.toHaveProperty('totalIndividuals')
  })

  it('should return statistics with familiesCount field (not totalFamilies)', async () => {
    const filePath = path.join(process.cwd(), 'backups/dollete.ged')
    const content = await fs.readFile(filePath, 'utf8')
    const parsed = await parseGedcom(content)

    const stats = extractStatistics(parsed)

    // The component expects 'familiesCount', not 'totalFamilies'
    expect(stats).toHaveProperty('familiesCount')
    expect(stats.familiesCount).toBe(11)

    // Should NOT have the old field name
    expect(stats).not.toHaveProperty('totalFamilies')
  })

  it('should return statistics with earliestDate field (not dateRange.earliest)', async () => {
    const filePath = path.join(process.cwd(), 'src/test/fixtures/gedcom/valid-5.5.1.ged')
    const content = await fs.readFile(filePath, 'utf8')
    const parsed = await parseGedcom(content)

    const stats = extractStatistics(parsed)

    // The component expects 'earliestDate' at top level, not nested in dateRange
    expect(stats).toHaveProperty('earliestDate')

    // Should NOT have the old nested structure
    expect(stats).not.toHaveProperty('dateRange')
  })

  it('should return statistics with latestDate field (not dateRange.latest)', async () => {
    const filePath = path.join(process.cwd(), 'src/test/fixtures/gedcom/valid-5.5.1.ged')
    const content = await fs.readFile(filePath, 'utf8')
    const parsed = await parseGedcom(content)

    const stats = extractStatistics(parsed)

    // The component expects 'latestDate' at top level, not nested in dateRange
    expect(stats).toHaveProperty('latestDate')

    // Should NOT have the old nested structure
    expect(stats).not.toHaveProperty('dateRange')
  })

  it('should return null for earliestDate and latestDate when no dates exist', async () => {
    const filePath = path.join(process.cwd(), 'backups/dollete.ged')
    const content = await fs.readFile(filePath, 'utf8')
    const parsed = await parseGedcom(content)

    const stats = extractStatistics(parsed)

    // dollete.ged has no birth/death dates, so these should be null
    expect(stats.earliestDate).toBeNull()
    expect(stats.latestDate).toBeNull()
  })

  it('should maintain version field in statistics', async () => {
    const filePath = path.join(process.cwd(), 'backups/dollete.ged')
    const content = await fs.readFile(filePath, 'utf8')
    const parsed = await parseGedcom(content)

    const stats = extractStatistics(parsed)

    // Version should still be included
    expect(stats).toHaveProperty('version')
    expect(stats.version).toBe('5.5.1')
  })

  it('should return correct statistics structure for GedcomParsingResults component', async () => {
    const filePath = path.join(process.cwd(), 'backups/dollete.ged')
    const content = await fs.readFile(filePath, 'utf8')
    const parsed = await parseGedcom(content)

    const stats = extractStatistics(parsed)

    // Complete structure expected by the component
    expect(stats).toEqual({
      individualsCount: 26,
      familiesCount: 11,
      version: '5.5.1',
      earliestDate: null,
      latestDate: null
    })
  })
})
