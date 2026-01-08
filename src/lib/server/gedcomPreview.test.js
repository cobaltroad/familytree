/**
 * GEDCOM Preview Module Tests
 * Story #94: Preview GEDCOM Data Before Import
 *
 * Tests for preview data storage and retrieval
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  storePreviewData,
  getPreviewData,
  getPreviewIndividuals,
  getPreviewPerson,
  getPreviewTree,
  getPreviewSummary,
  saveResolutionDecisions,
  getResolutionDecisions
} from './gedcomPreview.js'

describe('gedcomPreview', () => {
  const uploadId = 'test-upload-123'
  const userId = 1

  const mockParsedData = {
    individuals: [
      {
        id: '@I001@',
        name: 'John Smith',
        firstName: 'John',
        lastName: 'Smith',
        sex: 'M',
        birthDate: '1950-01-15',
        deathDate: null,
        childOfFamily: '@F001@',
        spouseFamilies: ['@F002@']
      },
      {
        id: '@I002@',
        name: 'Mary Johnson',
        firstName: 'Mary',
        lastName: 'Johnson',
        sex: 'F',
        birthDate: '1952-03-20',
        deathDate: '2020-05-10',
        childOfFamily: null,
        spouseFamilies: ['@F002@']
      },
      {
        id: '@I003@',
        name: 'Alice Smith',
        firstName: 'Alice',
        lastName: 'Smith',
        sex: 'F',
        birthDate: '1975-07-08',
        deathDate: null,
        childOfFamily: '@F002@',
        spouseFamilies: []
      }
    ],
    families: [
      {
        id: '@F001@',
        husband: '@I004@',
        wife: '@I005@',
        children: ['@I001@']
      },
      {
        id: '@F002@',
        husband: '@I001@',
        wife: '@I002@',
        children: ['@I003@']
      }
    ]
  }

  const mockDuplicates = [
    {
      gedcomPerson: {
        id: '@I001@',
        name: 'John Smith',
        birthDate: '1950-01-15'
      },
      existingPerson: {
        id: 42,
        name: 'John Smith',
        birthDate: '1950-01-15'
      },
      confidence: 95,
      matchingFields: ['name', 'birthDate']
    }
  ]

  beforeEach(() => {
    // Clear any stored data before each test
    // This will be handled by the implementation
  })

  describe('storePreviewData', () => {
    it('should store parsed GEDCOM data with upload ID and user ID', async () => {
      const result = await storePreviewData(uploadId, userId, mockParsedData, mockDuplicates)

      expect(result.success).toBe(true)
      expect(result.uploadId).toBe(uploadId)
    })

    it('should calculate status for each individual (new/duplicate/existing)', async () => {
      const result = await storePreviewData(uploadId, userId, mockParsedData, mockDuplicates)

      expect(result.success).toBe(true)

      // Retrieve stored data to verify status calculation
      const previewData = await getPreviewData(uploadId, userId)
      expect(previewData).toBeDefined()
      expect(previewData.individuals).toHaveLength(3)

      // First individual should be marked as duplicate
      const johnSmith = previewData.individuals.find(p => p.gedcomId === '@I001@')
      expect(johnSmith.status).toBe('duplicate')
      expect(johnSmith.duplicateMatch).toBeDefined()
      expect(johnSmith.duplicateMatch.existingPersonId).toBe(42)
      expect(johnSmith.duplicateMatch.confidence).toBe(95)

      // Other individuals should be new
      const mary = previewData.individuals.find(p => p.gedcomId === '@I002@')
      expect(mary.status).toBe('new')
      expect(mary.duplicateMatch).toBeUndefined()
    })

    it('should generate summary statistics', async () => {
      const result = await storePreviewData(uploadId, userId, mockParsedData, mockDuplicates)

      const previewData = await getPreviewData(uploadId, userId)
      expect(previewData.summary).toBeDefined()
      expect(previewData.summary.totalIndividuals).toBe(3)
      expect(previewData.summary.newCount).toBe(2)
      expect(previewData.summary.duplicateCount).toBe(1)
      expect(previewData.summary.existingCount).toBe(0)
    })
  })

  describe('getPreviewData', () => {
    it('should return null if preview data does not exist', async () => {
      const result = await getPreviewData('non-existent-upload', userId)
      expect(result).toBeNull()
    })

    it('should return stored preview data', async () => {
      await storePreviewData(uploadId, userId, mockParsedData, mockDuplicates)

      const result = await getPreviewData(uploadId, userId)
      expect(result).toBeDefined()
      expect(result.uploadId).toBe(uploadId)
      expect(result.individuals).toHaveLength(3)
      expect(result.families).toHaveLength(2)
      expect(result.duplicates).toHaveLength(1)
    })

    it('should not allow access to another user\'s preview data', async () => {
      await storePreviewData(uploadId, userId, mockParsedData, mockDuplicates)

      const result = await getPreviewData(uploadId, userId + 1)
      expect(result).toBeNull()
    })
  })

  describe('getPreviewIndividuals', () => {
    beforeEach(async () => {
      await storePreviewData(uploadId, userId, mockParsedData, mockDuplicates)
    })

    it('should return paginated individuals (default page 1, limit 50)', async () => {
      const result = await getPreviewIndividuals(uploadId, userId, {})

      expect(result).toBeDefined()
      expect(result.individuals).toHaveLength(3)
      expect(result.pagination.page).toBe(1)
      expect(result.pagination.limit).toBe(50)
      expect(result.pagination.total).toBe(3)
      expect(result.pagination.totalPages).toBe(1)
    })

    it('should paginate with custom page and limit', async () => {
      // Create more individuals to test pagination
      const manyIndividuals = Array.from({ length: 100 }, (_, i) => ({
        id: `@I${String(i + 1).padStart(3, '0')}@`,
        name: `Person ${i + 1}`,
        firstName: `Person`,
        lastName: `${i + 1}`,
        sex: i % 2 === 0 ? 'M' : 'F',
        birthDate: `${1950 + i}-01-01`,
        deathDate: null,
        childOfFamily: null,
        spouseFamilies: []
      }))

      await storePreviewData(uploadId + '-many', userId, { individuals: manyIndividuals, families: [] }, [])

      const result = await getPreviewIndividuals(uploadId + '-many', userId, { page: 2, limit: 25 })

      expect(result.individuals).toHaveLength(25)
      expect(result.pagination.page).toBe(2)
      expect(result.pagination.limit).toBe(25)
      expect(result.pagination.total).toBe(100)
      expect(result.pagination.totalPages).toBe(4)
    })

    it('should sort by name (ascending)', async () => {
      const result = await getPreviewIndividuals(uploadId, userId, { sortBy: 'name', sortOrder: 'asc' })

      expect(result.individuals[0].name).toBe('Alice Smith')
      expect(result.individuals[1].name).toBe('John Smith')
      expect(result.individuals[2].name).toBe('Mary Johnson')
    })

    it('should sort by name (descending)', async () => {
      const result = await getPreviewIndividuals(uploadId, userId, { sortBy: 'name', sortOrder: 'desc' })

      expect(result.individuals[0].name).toBe('Mary Johnson')
      expect(result.individuals[1].name).toBe('John Smith')
      expect(result.individuals[2].name).toBe('Alice Smith')
    })

    it('should sort by birthDate (ascending)', async () => {
      const result = await getPreviewIndividuals(uploadId, userId, { sortBy: 'birthDate', sortOrder: 'asc' })

      expect(result.individuals[0].birthDate).toBe('1950-01-15')
      expect(result.individuals[1].birthDate).toBe('1952-03-20')
      expect(result.individuals[2].birthDate).toBe('1975-07-08')
    })

    it('should sort by birthDate (descending)', async () => {
      const result = await getPreviewIndividuals(uploadId, userId, { sortBy: 'birthDate', sortOrder: 'desc' })

      expect(result.individuals[0].birthDate).toBe('1975-07-08')
      expect(result.individuals[1].birthDate).toBe('1952-03-20')
      expect(result.individuals[2].birthDate).toBe('1950-01-15')
    })

    it('should filter by name (case-insensitive)', async () => {
      const result = await getPreviewIndividuals(uploadId, userId, { search: 'smith' })

      expect(result.individuals).toHaveLength(2)
      expect(result.individuals.some(p => p.name.includes('Smith'))).toBe(true)
    })

    it('should filter by first name', async () => {
      const result = await getPreviewIndividuals(uploadId, userId, { search: 'alice' })

      expect(result.individuals).toHaveLength(1)
      expect(result.individuals[0].firstName).toBe('Alice')
    })

    it('should filter by last name', async () => {
      const result = await getPreviewIndividuals(uploadId, userId, { search: 'johnson' })

      expect(result.individuals).toHaveLength(1)
      expect(result.individuals[0].lastName).toBe('Johnson')
    })
  })

  describe('getPreviewPerson', () => {
    beforeEach(async () => {
      await storePreviewData(uploadId, userId, mockParsedData, mockDuplicates)
    })

    it('should return person details with relationships', async () => {
      const result = await getPreviewPerson(uploadId, userId, '@I001@')

      expect(result).toBeDefined()
      expect(result.person.gedcomId).toBe('@I001@')
      expect(result.person.name).toBe('John Smith')
      expect(result.person.birthDate).toBe('1950-01-15')
      expect(result.relationships).toBeDefined()
    })

    it('should include parents from family references', async () => {
      const result = await getPreviewPerson(uploadId, userId, '@I003@')

      expect(result.relationships.parents).toBeDefined()
      expect(result.relationships.parents).toHaveLength(2)

      const parentIds = result.relationships.parents.map(p => p.gedcomId)
      expect(parentIds).toContain('@I001@')
      expect(parentIds).toContain('@I002@')
    })

    it('should include spouses from family references', async () => {
      const result = await getPreviewPerson(uploadId, userId, '@I001@')

      expect(result.relationships.spouses).toBeDefined()
      expect(result.relationships.spouses).toHaveLength(1)
      expect(result.relationships.spouses[0].gedcomId).toBe('@I002@')
    })

    it('should include children from family references', async () => {
      const result = await getPreviewPerson(uploadId, userId, '@I001@')

      expect(result.relationships.children).toBeDefined()
      expect(result.relationships.children).toHaveLength(1)
      expect(result.relationships.children[0].gedcomId).toBe('@I003@')
    })

    it('should return null if person does not exist', async () => {
      const result = await getPreviewPerson(uploadId, userId, '@I999@')
      expect(result).toBeNull()
    })
  })

  describe('getPreviewTree', () => {
    beforeEach(async () => {
      await storePreviewData(uploadId, userId, mockParsedData, mockDuplicates)
    })

    it('should return tree structure from GEDCOM data', async () => {
      const result = await getPreviewTree(uploadId, userId)

      expect(result).toBeDefined()
      expect(result.individuals).toHaveLength(3)
      expect(result.relationships).toBeDefined()
      expect(Array.isArray(result.relationships)).toBe(true)
    })

    it('should convert family structures to parent-child relationships', async () => {
      const result = await getPreviewTree(uploadId, userId)

      // Should have parent-child relationships
      const parentChildRels = result.relationships.filter(r => r.type === 'parent')
      expect(parentChildRels.length).toBeGreaterThan(0)

      // Verify specific relationships
      const aliceParents = parentChildRels.filter(r => r.child === '@I003@')
      expect(aliceParents).toHaveLength(2) // Mother and father
    })

    it('should convert family structures to spouse relationships', async () => {
      const result = await getPreviewTree(uploadId, userId)

      // Should have spouse relationships
      const spouseRels = result.relationships.filter(r => r.type === 'spouse')
      expect(spouseRels.length).toBeGreaterThan(0)

      // Verify specific relationships
      const johnMarySpouse = spouseRels.find(
        r => (r.person1 === '@I001@' && r.person2 === '@I002@') ||
             (r.person1 === '@I002@' && r.person2 === '@I001@')
      )
      expect(johnMarySpouse).toBeDefined()
    })
  })

  describe('getPreviewSummary', () => {
    beforeEach(async () => {
      await storePreviewData(uploadId, userId, mockParsedData, mockDuplicates)
    })

    it('should return summary with counts', async () => {
      const result = await getPreviewSummary(uploadId, userId)

      expect(result).toBeDefined()
      expect(result.totalIndividuals).toBe(3)
      expect(result.newCount).toBe(2)
      expect(result.duplicateCount).toBe(1)
      expect(result.existingCount).toBe(0)
    })
  })

  describe('saveResolutionDecisions', () => {
    beforeEach(async () => {
      await storePreviewData(uploadId, userId, mockParsedData, mockDuplicates)
    })

    it('should save resolution decisions for duplicates', async () => {
      const decisions = [
        {
          gedcomId: '@I001@',
          resolution: 'merge'
        }
      ]

      const result = await saveResolutionDecisions(uploadId, userId, decisions)

      expect(result.success).toBe(true)
      expect(result.saved).toBe(1)
    })

    it('should validate resolution options (merge, import_as_new, skip)', async () => {
      const validDecisions = [
        { gedcomId: '@I001@', resolution: 'merge' },
        { gedcomId: '@I002@', resolution: 'import_as_new' },
        { gedcomId: '@I003@', resolution: 'skip' }
      ]

      const result = await saveResolutionDecisions(uploadId, userId, validDecisions)
      expect(result.success).toBe(true)

      const invalidDecisions = [
        { gedcomId: '@I001@', resolution: 'invalid_option' }
      ]

      await expect(saveResolutionDecisions(uploadId, userId, invalidDecisions))
        .rejects.toThrow(/Invalid resolution/)
    })

    it('should not save decisions for another user\'s preview data', async () => {
      const decisions = [
        { gedcomId: '@I001@', resolution: 'merge' }
      ]

      await expect(saveResolutionDecisions(uploadId, userId + 1, decisions))
        .rejects.toThrow(/not found/)
    })
  })

  describe('getResolutionDecisions', () => {
    beforeEach(async () => {
      await storePreviewData(uploadId, userId, mockParsedData, mockDuplicates)
    })

    it('should return empty array if no decisions saved', async () => {
      const result = await getResolutionDecisions(uploadId, userId)
      expect(result).toEqual([])
    })

    it('should return saved resolution decisions', async () => {
      const decisions = [
        { gedcomId: '@I001@', resolution: 'merge' }
      ]

      await saveResolutionDecisions(uploadId, userId, decisions)

      const result = await getResolutionDecisions(uploadId, userId)
      expect(result).toHaveLength(1)
      expect(result[0].gedcomId).toBe('@I001@')
      expect(result[0].resolution).toBe('merge')
    })
  })

  describe('getPreviewIndividuals - statistics field', () => {
    beforeEach(async () => {
      await storePreviewData(uploadId, userId, mockParsedData, mockDuplicates)
    })

    it('should include statistics object in response', async () => {
      const result = await getPreviewIndividuals(uploadId, userId)

      expect(result).toBeDefined()
      expect(result.statistics).toBeDefined()
      expect(typeof result.statistics).toBe('object')
    })

    it('should include totalIndividuals count in statistics', async () => {
      const result = await getPreviewIndividuals(uploadId, userId)

      expect(result.statistics.totalIndividuals).toBeDefined()
      expect(result.statistics.totalIndividuals).toBe(3)
    })

    it('should include newIndividuals count in statistics', async () => {
      const result = await getPreviewIndividuals(uploadId, userId)

      expect(result.statistics.newIndividuals).toBeDefined()
      expect(result.statistics.newIndividuals).toBe(2) // 3 total - 1 duplicate
    })

    it('should include duplicateIndividuals count in statistics', async () => {
      const result = await getPreviewIndividuals(uploadId, userId)

      expect(result.statistics.duplicateIndividuals).toBeDefined()
      expect(result.statistics.duplicateIndividuals).toBe(1)
    })

    it('should include existingIndividuals count in statistics', async () => {
      const result = await getPreviewIndividuals(uploadId, userId)

      expect(result.statistics.existingIndividuals).toBeDefined()
      expect(result.statistics.existingIndividuals).toBe(0) // Initially 0, updated after resolution
    })

    it('should return correct statistics structure for GedcomPreview component', async () => {
      const result = await getPreviewIndividuals(uploadId, userId)

      expect(result.statistics).toEqual({
        totalIndividuals: 3,
        newIndividuals: 2,
        duplicateIndividuals: 1,
        existingIndividuals: 0
      })
    })

    it('should handle undefined statistics gracefully', async () => {
      // Test that component can handle missing statistics
      const result = await getPreviewIndividuals('non-existent', userId)

      expect(result).toBeNull()
    })
  })
})
