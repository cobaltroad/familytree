/**
 * GEDCOM Importer Unit Tests
 * Story #95: Import GEDCOM Data to User's Tree
 *
 * Tests for field mapping, relationship normalization, duplicate resolution,
 * and transaction-based import logic.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  mapGedcomPersonToSchema,
  mapGedcomSexToGender,
  extractPhotoUrlFromObje,
  buildRelationshipsFromFamilies,
  applyDuplicateResolutions,
  prepareImportData,
  appendDateModifierToNotes,
  buildRelationshipsAfterInsertion,
  deduplicateRelationships
} from './gedcomImporter.js'

describe('gedcomImporter - Field Mapping', () => {
  describe('mapGedcomSexToGender', () => {
    it('should map "M" to "male"', () => {
      expect(mapGedcomSexToGender('M')).toBe('male')
    })

    it('should map "F" to "female"', () => {
      expect(mapGedcomSexToGender('F')).toBe('female')
    })

    it('should map "U" to "unspecified"', () => {
      expect(mapGedcomSexToGender('U')).toBe('unspecified')
    })

    it('should map null to "unspecified"', () => {
      expect(mapGedcomSexToGender(null)).toBe('unspecified')
    })

    it('should map undefined to "unspecified"', () => {
      expect(mapGedcomSexToGender(undefined)).toBe('unspecified')
    })

    it('should map unknown values to "other"', () => {
      expect(mapGedcomSexToGender('X')).toBe('other')
    })
  })

  describe('appendDateModifierToNotes', () => {
    it('should append modifier to notes when present', () => {
      const result = appendDateModifierToNotes('Some notes', 'ABT')
      expect(result).toBe('Some notes\n(Date approximate)')
    })

    it('should create notes from modifier when notes is null', () => {
      const result = appendDateModifierToNotes(null, 'BEF')
      expect(result).toBe('(Date before)')
    })

    it('should create notes from modifier when notes is empty', () => {
      const result = appendDateModifierToNotes('', 'AFT')
      expect(result).toBe('(Date after)')
    })

    it('should return notes unchanged when no modifier', () => {
      const result = appendDateModifierToNotes('Some notes', null)
      expect(result).toBe('Some notes')
    })

    it('should return null when both notes and modifier are null', () => {
      const result = appendDateModifierToNotes(null, null)
      expect(result).toBeNull()
    })

    it('should handle CAL modifier', () => {
      const result = appendDateModifierToNotes(null, 'CAL')
      expect(result).toBe('(Date calculated)')
    })

    it('should handle EST modifier', () => {
      const result = appendDateModifierToNotes(null, 'EST')
      expect(result).toBe('(Date estimated)')
    })
  })

  describe('extractPhotoUrlFromObje', () => {
    it('should extract photo URL from OBJE with FILE tag', () => {
      const individual = {
        id: 'I001',
        _original: {
          children: [
            {
              type: 'OBJE',
              children: [
                { type: 'FILE', value: 'https://example.com/photo.jpg' }
              ]
            }
          ]
        }
      }

      expect(extractPhotoUrlFromObje(individual)).toBe('https://example.com/photo.jpg')
    })

    it('should return null when no OBJE tag present', () => {
      const individual = {
        id: 'I001',
        _original: {
          children: []
        }
      }

      expect(extractPhotoUrlFromObje(individual)).toBeNull()
    })

    it('should return null when OBJE has no FILE tag', () => {
      const individual = {
        id: 'I001',
        _original: {
          children: [
            {
              type: 'OBJE',
              children: []
            }
          ]
        }
      }

      expect(extractPhotoUrlFromObje(individual)).toBeNull()
    })

    it('should return null when _original is missing', () => {
      const individual = {
        id: 'I001'
      }

      expect(extractPhotoUrlFromObje(individual)).toBeNull()
    })

    it('should handle multiple OBJE tags (return first)', () => {
      const individual = {
        id: 'I001',
        _original: {
          children: [
            {
              type: 'OBJE',
              children: [
                { type: 'FILE', value: 'https://example.com/photo1.jpg' }
              ]
            },
            {
              type: 'OBJE',
              children: [
                { type: 'FILE', value: 'https://example.com/photo2.jpg' }
              ]
            }
          ]
        }
      }

      expect(extractPhotoUrlFromObje(individual)).toBe('https://example.com/photo1.jpg')
    })
  })

  describe('mapGedcomPersonToSchema', () => {
    it('should map complete GEDCOM person to schema', () => {
      const gedcomPerson = {
        gedcomId: 'I001',
        firstName: 'John Robert',
        lastName: 'Smith',
        sex: 'M',
        birthDate: '1950-01-15',
        birthPlace: 'Chicago, Illinois, USA',
        deathDate: '2020-03-10',
        deathPlace: 'Miami, Florida, USA',
        _original: {
          children: [
            {
              type: 'NOTE',
              value: 'World War II veteran'
            },
            {
              type: 'OBJE',
              children: [
                { type: 'FILE', value: 'https://example.com/john.jpg' }
              ]
            }
          ]
        }
      }

      const userId = 42

      const result = mapGedcomPersonToSchema(gedcomPerson, userId)

      expect(result).toEqual({
        firstName: 'John Robert',
        lastName: 'Smith',
        gender: 'male',
        birthDate: '1950-01-15',
        deathDate: '2020-03-10',
        photoUrl: 'https://example.com/john.jpg',
        userId: 42
      })
    })

    it('should handle person with partial date and modifier', () => {
      const gedcomPerson = {
        gedcomId: 'I002',
        firstName: 'Jane',
        lastName: 'Doe',
        sex: 'F',
        birthDate: '1950',
        _original: {
          children: [
            {
              type: 'BIRT',
              children: [
                { type: 'DATE', value: 'ABT 1950' }
              ]
            }
          ]
        }
      }

      const result = mapGedcomPersonToSchema(gedcomPerson, 1)

      expect(result.birthDate).toBe('1950')
      expect(result.gender).toBe('female')
    })

    it('should handle person with minimal data', () => {
      const gedcomPerson = {
        gedcomId: 'I003',
        firstName: 'Unknown',
        lastName: '',
        sex: null
      }

      const result = mapGedcomPersonToSchema(gedcomPerson, 1)

      expect(result).toEqual({
        firstName: 'Unknown',
        lastName: '',
        gender: 'unspecified',
        birthDate: null,
        deathDate: null,
        photoUrl: null,
        userId: 1
      })
    })

    it('should handle person with only first name', () => {
      const gedcomPerson = {
        gedcomId: 'I004',
        firstName: 'Madonna',
        lastName: null,
        sex: 'F'
      }

      const result = mapGedcomPersonToSchema(gedcomPerson, 1)

      expect(result.firstName).toBe('Madonna')
      expect(result.lastName).toBe('')
      expect(result.gender).toBe('female')
    })

    it('should default empty last name to empty string', () => {
      const gedcomPerson = {
        gedcomId: 'I005',
        firstName: 'Prince',
        lastName: null,
        sex: 'M'
      }

      const result = mapGedcomPersonToSchema(gedcomPerson, 1)

      expect(result.lastName).toBe('')
    })
  })
})

describe('gedcomImporter - Relationship Normalization', () => {
  describe('deduplicateRelationships', () => {
    it('should remove exact duplicate relationships', () => {
      const relationships = [
        { person1Id: 1, person2Id: 2, type: 'spouse', parentRole: null, userId: 1 },
        { person1Id: 1, person2Id: 2, type: 'spouse', parentRole: null, userId: 1 }, // Duplicate
        { person1Id: 2, person2Id: 1, type: 'spouse', parentRole: null, userId: 1 }
      ]

      const deduplicated = deduplicateRelationships(relationships)

      expect(deduplicated).toHaveLength(2)
      expect(deduplicated).toContainEqual({
        person1Id: 1,
        person2Id: 2,
        type: 'spouse',
        parentRole: null,
        userId: 1
      })
      expect(deduplicated).toContainEqual({
        person1Id: 2,
        person2Id: 1,
        type: 'spouse',
        parentRole: null,
        userId: 1
      })
    })

    it('should handle NULL and non-NULL parent_role as distinct', () => {
      const relationships = [
        { person1Id: 1, person2Id: 2, type: 'parentOf', parentRole: null, userId: 1 },
        { person1Id: 1, person2Id: 2, type: 'parentOf', parentRole: 'father', userId: 1 },
        { person1Id: 1, person2Id: 2, type: 'parentOf', parentRole: 'mother', userId: 1 }
      ]

      const deduplicated = deduplicateRelationships(relationships)

      // All should be kept (different parent_role values)
      expect(deduplicated).toHaveLength(3)
    })

    it('should handle parent-child relationship duplicates', () => {
      const relationships = [
        { person1Id: 10, person2Id: 20, type: 'parentOf', parentRole: 'father', userId: 1 },
        { person1Id: 10, person2Id: 20, type: 'parentOf', parentRole: 'father', userId: 1 }, // Duplicate
        { person1Id: 10, person2Id: 20, type: 'parentOf', parentRole: 'father', userId: 1 }, // Duplicate
        { person1Id: 11, person2Id: 20, type: 'parentOf', parentRole: 'mother', userId: 1 }
      ]

      const deduplicated = deduplicateRelationships(relationships)

      expect(deduplicated).toHaveLength(2)
      expect(deduplicated).toContainEqual({
        person1Id: 10,
        person2Id: 20,
        type: 'parentOf',
        parentRole: 'father',
        userId: 1
      })
      expect(deduplicated).toContainEqual({
        person1Id: 11,
        person2Id: 20,
        type: 'parentOf',
        parentRole: 'mother',
        userId: 1
      })
    })

    it('should handle empty array', () => {
      const deduplicated = deduplicateRelationships([])
      expect(deduplicated).toHaveLength(0)
    })

    it('should preserve order of first occurrence', () => {
      const relationships = [
        { person1Id: 1, person2Id: 2, type: 'spouse', parentRole: null, userId: 1 },
        { person1Id: 2, person2Id: 3, type: 'spouse', parentRole: null, userId: 1 },
        { person1Id: 1, person2Id: 2, type: 'spouse', parentRole: null, userId: 1 }, // Duplicate
        { person1Id: 3, person2Id: 4, type: 'spouse', parentRole: null, userId: 1 }
      ]

      const deduplicated = deduplicateRelationships(relationships)

      expect(deduplicated).toHaveLength(3)
      // First occurrence should be preserved
      expect(deduplicated[0]).toEqual({
        person1Id: 1,
        person2Id: 2,
        type: 'spouse',
        parentRole: null,
        userId: 1
      })
    })

    it('should handle multiple duplicate sets', () => {
      const relationships = [
        { person1Id: 1, person2Id: 2, type: 'spouse', parentRole: null, userId: 1 },
        { person1Id: 1, person2Id: 2, type: 'spouse', parentRole: null, userId: 1 }, // Dup
        { person1Id: 3, person2Id: 4, type: 'spouse', parentRole: null, userId: 1 },
        { person1Id: 3, person2Id: 4, type: 'spouse', parentRole: null, userId: 1 }, // Dup
        { person1Id: 5, person2Id: 6, type: 'parentOf', parentRole: 'father', userId: 1 },
        { person1Id: 5, person2Id: 6, type: 'parentOf', parentRole: 'father', userId: 1 } // Dup
      ]

      const deduplicated = deduplicateRelationships(relationships)

      expect(deduplicated).toHaveLength(3)
    })
  })

  describe('buildRelationshipsFromFamilies', () => {
    it('should create normalized parent-child relationships', () => {
      const families = [
        {
          id: 'F001',
          husband: 'I001',
          wife: 'I002',
          children: ['I003', 'I004']
        }
      ]

      const gedcomIdToPersonId = {
        I001: 101,
        I002: 102,
        I003: 103,
        I004: 104
      }

      const userId = 1

      const relationships = buildRelationshipsFromFamilies(families, gedcomIdToPersonId, userId)

      // Should have 4 parent-child relationships + 2 spouse relationships = 6 total
      expect(relationships).toHaveLength(6)

      // Father to child 1
      expect(relationships).toContainEqual({
        person1Id: 101,
        person2Id: 103,
        type: 'parentOf',
        parentRole: 'father',
        userId: 1
      })

      // Father to child 2
      expect(relationships).toContainEqual({
        person1Id: 101,
        person2Id: 104,
        type: 'parentOf',
        parentRole: 'father',
        userId: 1
      })

      // Mother to child 1
      expect(relationships).toContainEqual({
        person1Id: 102,
        person2Id: 103,
        type: 'parentOf',
        parentRole: 'mother',
        userId: 1
      })

      // Mother to child 2
      expect(relationships).toContainEqual({
        person1Id: 102,
        person2Id: 104,
        type: 'parentOf',
        parentRole: 'mother',
        userId: 1
      })

      // Bidirectional spouse relationships
      expect(relationships).toContainEqual({
        person1Id: 101,
        person2Id: 102,
        type: 'spouse',
        parentRole: null,
        userId: 1
      })

      expect(relationships).toContainEqual({
        person1Id: 102,
        person2Id: 101,
        type: 'spouse',
        parentRole: null,
        userId: 1
      })
    })

    it('should handle family with only husband and children', () => {
      const families = [
        {
          id: 'F002',
          husband: 'I001',
          wife: null,
          children: ['I003']
        }
      ]

      const gedcomIdToPersonId = {
        I001: 101,
        I003: 103
      }

      const relationships = buildRelationshipsFromFamilies(families, gedcomIdToPersonId, 1)

      // Should only have father-child relationship (no spouse, no mother)
      expect(relationships).toHaveLength(1)
      expect(relationships[0]).toEqual({
        person1Id: 101,
        person2Id: 103,
        type: 'parentOf',
        parentRole: 'father',
        userId: 1
      })
    })

    it('should handle family with only wife and children', () => {
      const families = [
        {
          id: 'F003',
          husband: null,
          wife: 'I002',
          children: ['I003']
        }
      ]

      const gedcomIdToPersonId = {
        I002: 102,
        I003: 103
      }

      const relationships = buildRelationshipsFromFamilies(families, gedcomIdToPersonId, 1)

      expect(relationships).toHaveLength(1)
      expect(relationships[0]).toEqual({
        person1Id: 102,
        person2Id: 103,
        type: 'parentOf',
        parentRole: 'mother',
        userId: 1
      })
    })

    it('should handle couple with no children', () => {
      const families = [
        {
          id: 'F004',
          husband: 'I001',
          wife: 'I002',
          children: []
        }
      ]

      const gedcomIdToPersonId = {
        I001: 101,
        I002: 102
      }

      const relationships = buildRelationshipsFromFamilies(families, gedcomIdToPersonId, 1)

      // Should only have bidirectional spouse relationships
      expect(relationships).toHaveLength(2)
      expect(relationships).toContainEqual({
        person1Id: 101,
        person2Id: 102,
        type: 'spouse',
        parentRole: null,
        userId: 1
      })
      expect(relationships).toContainEqual({
        person1Id: 102,
        person2Id: 101,
        type: 'spouse',
        parentRole: null,
        userId: 1
      })
    })

    it('should skip relationships if person not in mapping', () => {
      const families = [
        {
          id: 'F005',
          husband: 'I001',
          wife: 'I999', // Not imported (skipped)
          children: ['I003']
        }
      ]

      const gedcomIdToPersonId = {
        I001: 101,
        I003: 103
        // I999 not in mapping
      }

      const relationships = buildRelationshipsFromFamilies(families, gedcomIdToPersonId, 1)

      // Should only have father-child relationship (spouse skipped)
      expect(relationships).toHaveLength(1)
      expect(relationships[0]).toEqual({
        person1Id: 101,
        person2Id: 103,
        type: 'parentOf',
        parentRole: 'father',
        userId: 1
      })
    })

    it('should handle multiple families', () => {
      const families = [
        {
          id: 'F001',
          husband: 'I001',
          wife: 'I002',
          children: ['I003']
        },
        {
          id: 'F002',
          husband: 'I001',
          wife: 'I004',
          children: ['I005']
        }
      ]

      const gedcomIdToPersonId = {
        I001: 101,
        I002: 102,
        I003: 103,
        I004: 104,
        I005: 105
      }

      const relationships = buildRelationshipsFromFamilies(families, gedcomIdToPersonId, 1)

      // Family 1: 1 father-child + 1 mother-child + 2 spouse = 4
      // Family 2: 1 father-child + 1 mother-child + 2 spouse = 4
      // Total = 8
      expect(relationships).toHaveLength(8)
    })

    it('should not create relationships with undefined person IDs', () => {
      // This test reproduces the foreign key constraint error
      // When a family references individuals not in the mapping,
      // undefined values should not be used in relationships
      const families = [
        {
          id: 'F001',
          husband: 'I999', // Not in mapping - will be undefined
          wife: 'I998',     // Not in mapping - will be undefined
          children: ['I003']
        }
      ]

      const gedcomIdToPersonId = {
        I003: 103
        // I999 and I998 are not in the mapping
      }

      const relationships = buildRelationshipsFromFamilies(families, gedcomIdToPersonId, 1)

      // Should only have relationships with valid person IDs
      // No spouse relationships should be created (both spouses undefined)
      // No parent-child relationships should be created (both parents undefined)
      expect(relationships).toHaveLength(0)

      // Verify no relationship has undefined person IDs
      for (const rel of relationships) {
        expect(rel.person1Id).not.toBeUndefined()
        expect(rel.person2Id).not.toBeUndefined()
        expect(rel.person1Id).not.toBeNull()
        expect(rel.person2Id).not.toBeNull()
      }
    })

    it('should handle mix of defined and undefined person IDs in families', () => {
      // Test edge case: husband defined, wife undefined
      const families = [
        {
          id: 'F001',
          husband: 'I001',  // Defined
          wife: 'I998',      // Undefined
          children: ['I003']
        }
      ]

      const gedcomIdToPersonId = {
        I001: 101,
        I003: 103
        // I998 not in mapping
      }

      const relationships = buildRelationshipsFromFamilies(families, gedcomIdToPersonId, 1)

      // Should only have father-child relationship
      // No spouse relationship (wife undefined)
      // No mother-child relationship (wife undefined)
      expect(relationships).toHaveLength(1)
      expect(relationships[0]).toEqual({
        person1Id: 101,
        person2Id: 103,
        type: 'parentOf',
        parentRole: 'father',
        userId: 1
      })

      // Verify all relationships have valid person IDs
      for (const rel of relationships) {
        expect(rel.person1Id).toBeDefined()
        expect(rel.person2Id).toBeDefined()
        expect(rel.person1Id).not.toBeNull()
        expect(rel.person2Id).not.toBeNull()
      }
    })
  })
})

describe('gedcomImporter - Duplicate Resolution', () => {
  describe('applyDuplicateResolutions', () => {
    it('should filter individuals based on resolution decisions', () => {
      const individuals = [
        { gedcomId: 'I001', firstName: 'John', lastName: 'Smith' },
        { gedcomId: 'I002', firstName: 'Jane', lastName: 'Doe' },
        { gedcomId: 'I003', firstName: 'Bob', lastName: 'Johnson' }
      ]

      const resolutionDecisions = [
        { gedcomId: 'I002', resolution: 'skip', existingPersonId: 42 }
      ]

      const result = applyDuplicateResolutions(individuals, resolutionDecisions)

      // I002 should be excluded
      expect(result.individualsToImport).toHaveLength(2)
      expect(result.individualsToImport.map(i => i.gedcomId)).toEqual(['I001', 'I003'])

      // I002 should be in merge map pointing to existing person
      expect(result.gedcomIdToPersonId).toEqual({
        I002: 42
      })
    })

    it('should handle "merge" resolution', () => {
      const individuals = [
        { gedcomId: 'I001', firstName: 'John', lastName: 'Smith' },
        { gedcomId: 'I002', firstName: 'Jane', lastName: 'Doe' }
      ]

      const resolutionDecisions = [
        { gedcomId: 'I001', resolution: 'merge', existingPersonId: 100 }
      ]

      const result = applyDuplicateResolutions(individuals, resolutionDecisions)

      // I001 should be excluded from import
      expect(result.individualsToImport).toHaveLength(1)
      expect(result.individualsToImport[0].gedcomId).toBe('I002')

      // I001 should map to existing person 100
      expect(result.gedcomIdToPersonId.I001).toBe(100)

      // I001 should be in merge list for updating
      expect(result.individualsToMerge).toHaveLength(1)
      expect(result.individualsToMerge[0].gedcomId).toBe('I001')
      expect(result.individualsToMerge[0].existingPersonId).toBe(100)
      expect(result.individualsToMerge[0].individual.firstName).toBe('John')
    })

    it('should handle "import_as_new" resolution', () => {
      const individuals = [
        { gedcomId: 'I001', firstName: 'John', lastName: 'Smith' },
        { gedcomId: 'I002', firstName: 'Jane', lastName: 'Doe' }
      ]

      const resolutionDecisions = [
        { gedcomId: 'I001', resolution: 'import_as_new', existingPersonId: 100 }
      ]

      const result = applyDuplicateResolutions(individuals, resolutionDecisions)

      // I001 should still be imported (despite duplicate)
      expect(result.individualsToImport).toHaveLength(2)
      expect(result.individualsToImport.map(i => i.gedcomId)).toEqual(['I001', 'I002'])

      // No mapping for I001 (it will get new ID)
      expect(result.gedcomIdToPersonId.I001).toBeUndefined()

      // No merges
      expect(result.individualsToMerge).toHaveLength(0)
    })

    it('should handle mixed resolution decisions', () => {
      const individuals = [
        { gedcomId: 'I001', firstName: 'John', lastName: 'Smith' },
        { gedcomId: 'I002', firstName: 'Jane', lastName: 'Doe' },
        { gedcomId: 'I003', firstName: 'Bob', lastName: 'Johnson' },
        { gedcomId: 'I004', firstName: 'Alice', lastName: 'Williams' }
      ]

      const resolutionDecisions = [
        { gedcomId: 'I001', resolution: 'merge', existingPersonId: 100 },
        { gedcomId: 'I002', resolution: 'skip', existingPersonId: 200 },
        { gedcomId: 'I003', resolution: 'import_as_new', existingPersonId: 300 }
        // I004 has no decision (import as new by default)
      ]

      const result = applyDuplicateResolutions(individuals, resolutionDecisions)

      // I001 merged, I002 skipped, I003 and I004 imported
      expect(result.individualsToImport).toHaveLength(2)
      expect(result.individualsToImport.map(i => i.gedcomId)).toEqual(['I003', 'I004'])

      // Mappings for merged/skipped
      expect(result.gedcomIdToPersonId).toEqual({
        I001: 100,
        I002: 200
      })

      // I001 should be in merge list
      expect(result.individualsToMerge).toHaveLength(1)
      expect(result.individualsToMerge[0].gedcomId).toBe('I001')
      expect(result.individualsToMerge[0].existingPersonId).toBe(100)
    })

    it('should handle empty resolution decisions', () => {
      const individuals = [
        { gedcomId: 'I001', firstName: 'John', lastName: 'Smith' }
      ]

      const result = applyDuplicateResolutions(individuals, [])

      expect(result.individualsToImport).toHaveLength(1)
      expect(result.gedcomIdToPersonId).toEqual({})
      expect(result.individualsToMerge).toHaveLength(0)
    })
  })
})

describe('gedcomImporter - prepareImportData', () => {
  it('should prepare complete import data with all components', () => {
    const previewData = {
      individuals: [
        {
          gedcomId: 'I001',
          firstName: 'John',
          lastName: 'Smith',
          sex: 'M',
          birthDate: '1950-01-15',
          _original: { children: [] }
        },
        {
          gedcomId: 'I002',
          firstName: 'Jane',
          lastName: 'Smith',
          sex: 'F',
          birthDate: '1952-03-20',
          _original: { children: [] }
        },
        {
          gedcomId: 'I003',
          firstName: 'Bob',
          lastName: 'Smith',
          sex: 'M',
          birthDate: '1975-06-10',
          _original: { children: [] }
        }
      ],
      families: [
        {
          id: 'F001',
          husband: 'I001',
          wife: 'I002',
          children: ['I003']
        }
      ]
    }

    const resolutionDecisions = []
    const userId = 1

    const result = prepareImportData(previewData, resolutionDecisions, userId)

    expect(result.personsToInsert).toHaveLength(3)
    expect(result.personsToUpdate).toHaveLength(0)
    expect(result.families).toHaveLength(1)
    expect(result.gedcomIdMapping).toBeDefined()
  })

  it('should handle duplicate resolutions in import data', () => {
    const previewData = {
      individuals: [
        {
          gedcomId: 'I001',
          firstName: 'John',
          lastName: 'Smith',
          sex: 'M',
          _original: { children: [] }
        },
        {
          gedcomId: 'I002',
          firstName: 'Jane',
          lastName: 'Doe',
          sex: 'F',
          _original: { children: [] }
        }
      ],
      families: [
        {
          id: 'F001',
          husband: 'I001',
          wife: 'I002',
          children: []
        }
      ]
    }

    const resolutionDecisions = [
      { gedcomId: 'I001', resolution: 'merge', existingPersonId: 100 }
    ]

    const userId = 1

    const result = prepareImportData(previewData, resolutionDecisions, userId)

    // Only I002 should be inserted
    expect(result.personsToInsert).toHaveLength(1)
    expect(result.personsToInsert[0].firstName).toBe('Jane')

    // I001 should be updated
    expect(result.personsToUpdate).toHaveLength(1)
    expect(result.personsToUpdate[0].personId).toBe(100)

    // Families preserved for later relationship building
    expect(result.families).toHaveLength(1)
    expect(result.gedcomIdMapping.I001).toBe(100)
  })
})

describe('gedcomImporter - buildRelationshipsAfterInsertion', () => {
  it('should build relationships after persons are inserted', () => {
    const importData = {
      gedcomIdMapping: {},
      families: [
        {
          id: 'F001',
          husband: 'I001',
          wife: 'I002',
          children: ['I003']
        }
      ]
    }

    const insertedPersons = [
      { gedcomId: 'I001', personId: 101 },
      { gedcomId: 'I002', personId: 102 },
      { gedcomId: 'I003', personId: 103 }
    ]

    const userId = 1

    const relationships = buildRelationshipsAfterInsertion(importData, insertedPersons, userId)

    // Should have 4 relationships: 2 parent-child + 2 spouse
    expect(relationships).toHaveLength(4)

    // Check for parent-child relationships
    expect(relationships).toContainEqual({
      person1Id: 101,
      person2Id: 103,
      type: 'parentOf',
      parentRole: 'father',
      userId: 1
    })

    expect(relationships).toContainEqual({
      person1Id: 102,
      person2Id: 103,
      type: 'parentOf',
      parentRole: 'mother',
      userId: 1
    })

    // Check for spouse relationships
    expect(relationships).toContainEqual({
      person1Id: 101,
      person2Id: 102,
      type: 'spouse',
      parentRole: null,
      userId: 1
    })
  })

  it('should handle merged persons in relationship building', () => {
    const importData = {
      gedcomIdMapping: {
        I001: 100 // I001 was merged with existing person 100
      },
      families: [
        {
          id: 'F001',
          husband: 'I001',
          wife: 'I002',
          children: []
        }
      ]
    }

    const insertedPersons = [
      { gedcomId: 'I002', personId: 102 }
    ]

    const userId = 1

    const relationships = buildRelationshipsAfterInsertion(importData, insertedPersons, userId)

    // Should have 2 spouse relationships using the merged person ID
    expect(relationships).toHaveLength(2)
    expect(relationships).toContainEqual({
      person1Id: 100,
      person2Id: 102,
      type: 'spouse',
      parentRole: null,
      userId: 1
    })
  })
})
