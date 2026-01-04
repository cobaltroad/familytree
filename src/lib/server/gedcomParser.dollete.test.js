/**
 * GEDCOM Parser - dollete.ged Integration Test
 *
 * Tests parsing of the actual dollete.ged file that the user is experiencing issues with.
 * This test will help us identify the root cause of the "Internal Server Error".
 */

import { describe, it, expect } from 'vitest'
import { promises as fs } from 'fs'
import path from 'path'
import {
  parseGedcom,
  extractStatistics,
  validateRelationshipConsistency
} from './gedcomParser.js'

describe('gedcomParser - dollete.ged integration', () => {
  it('should successfully parse dollete.ged file', async () => {
    // Read the actual dollete.ged file
    const filePath = path.join(process.cwd(), 'backups/dollete.ged')
    const content = await fs.readFile(filePath, 'utf8')

    // Parse the file
    const result = await parseGedcom(content)

    // Should succeed
    expect(result.success).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('should correctly extract individuals from dollete.ged', async () => {
    const filePath = path.join(process.cwd(), 'backups/dollete.ged')
    const content = await fs.readFile(filePath, 'utf8')
    const result = await parseGedcom(content)

    // Should have 26 individuals (I0000 through I0025)
    expect(result.individuals).toBeDefined()
    expect(result.individuals.length).toBe(26)

    // Check a few specific individuals
    const ronald = result.individuals.find(i => i.id === '@I0000@')
    expect(ronald).toBeDefined()
    expect(ronald.firstName).toBe('Ronald')
    expect(ronald.lastName).toBe('Dollete')
    expect(ronald.sex).toBe('M')
  })

  it('should correctly extract families from dollete.ged', async () => {
    const filePath = path.join(process.cwd(), 'backups/dollete.ged')
    const content = await fs.readFile(filePath, 'utf8')
    const result = await parseGedcom(content)

    // Should have 11 families (F0000 through F0010)
    expect(result.families).toBeDefined()
    expect(result.families.length).toBe(11)

    // Check a specific family
    const family = result.families.find(f => f.id === '@F0000@')
    expect(family).toBeDefined()
    expect(family.husband).toBe('@I0002@')
    expect(family.wife).toBe('@I0003@')
    expect(family.children).toContain('@I0000@')
    expect(family.children).toContain('@I0001@')
  })

  it('should extract correct statistics from dollete.ged', async () => {
    const filePath = path.join(process.cwd(), 'backups/dollete.ged')
    const content = await fs.readFile(filePath, 'utf8')
    const result = await parseGedcom(content)

    const stats = extractStatistics(result)

    expect(stats.individualsCount).toBe(26)
    expect(stats.familiesCount).toBe(11)
    expect(stats.version).toBe('5.5.1')
    expect(stats.earliestDate).toBeNull()
    expect(stats.latestDate).toBeNull()
  })

  it('should validate relationship consistency in dollete.ged', async () => {
    const filePath = path.join(process.cwd(), 'backups/dollete.ged')
    const content = await fs.readFile(filePath, 'utf8')
    const result = await parseGedcom(content)

    const issues = validateRelationshipConsistency(result)

    // Log any issues found
    if (issues.length > 0) {
      console.log('Relationship issues found:', issues)
    }

    // This test should help us identify if there are relationship problems
    // We'll just log them for now and make assertions based on what we find
    expect(Array.isArray(issues)).toBe(true)
  })

  it('should handle families with missing husband/wife references', async () => {
    const filePath = path.join(process.cwd(), 'backups/dollete.ged')
    const content = await fs.readFile(filePath, 'utf8')
    const result = await parseGedcom(content)

    // F0001 has wife but no husband
    const family = result.families.find(f => f.id === '@F0001@')
    expect(family).toBeDefined()
    expect(family.wife).toBe('@I0005@')
    expect(family.husband).toBeNull()
    expect(family.children.length).toBeGreaterThan(0)
  })

  it('should correctly parse individuals with no birth/death dates', async () => {
    const filePath = path.join(process.cwd(), 'backups/dollete.ged')
    const content = await fs.readFile(filePath, 'utf8')
    const result = await parseGedcom(content)

    // All individuals in dollete.ged have no birth/death dates
    const allIndividuals = result.individuals

    allIndividuals.forEach(individual => {
      expect(individual.birthDate).toBeNull()
      expect(individual.deathDate).toBeNull()
    })
  })
})
