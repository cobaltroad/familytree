/**
 * GEDCOM Importer Module
 * Story #95: Import GEDCOM Data to User's Tree
 *
 * Provides functions to import GEDCOM data into the database,
 * handling field mapping, relationship normalization, and duplicate resolution.
 */

/**
 * Maps GEDCOM SEX field to application gender schema
 *
 * @param {string|null} sex - GEDCOM SEX value (M, F, U)
 * @returns {string} Application gender value (male, female, unspecified, other)
 */
export function mapGedcomSexToGender(sex) {
  if (!sex) {
    return 'unspecified'
  }

  const sexUpper = sex.toUpperCase()

  switch (sexUpper) {
    case 'M':
      return 'male'
    case 'F':
      return 'female'
    case 'U':
      return 'unspecified'
    default:
      return 'other'
  }
}

/**
 * Appends date modifier information to notes field
 *
 * @param {string|null} notes - Existing notes
 * @param {string|null} modifier - Date modifier (ABT, BEF, AFT, etc.)
 * @returns {string|null} Updated notes with modifier information
 */
export function appendDateModifierToNotes(notes, modifier) {
  if (!modifier) {
    return notes
  }

  const modifierText = {
    ABT: '(Date approximate)',
    BEF: '(Date before)',
    AFT: '(Date after)',
    CAL: '(Date calculated)',
    EST: '(Date estimated)',
    BET: '(Date between)'
  }[modifier] || `(Date ${modifier.toLowerCase()})`

  if (!notes || notes.trim() === '') {
    return modifierText
  }

  return `${notes}\n${modifierText}`
}

/**
 * Extracts photo URL from GEDCOM OBJE (multimedia object) tag
 *
 * @param {Object} individual - Individual with _original GEDCOM data
 * @returns {string|null} Photo URL or null if not found
 */
export function extractPhotoUrlFromObje(individual) {
  // Check for nested _original (after storePreviewData wrapping)
  const original = individual._original?._original || individual._original

  if (!original || !original.children) {
    return null
  }

  const objeRecord = original.children.find(r => r.type === 'OBJE')
  if (!objeRecord || !objeRecord.children) {
    return null
  }

  const fileRecord = objeRecord.children.find(r => r.type === 'FILE')
  if (!fileRecord) {
    return null
  }

  return fileRecord.value || null
}

/**
 * Maps a GEDCOM person to the application's Person schema
 *
 * @param {Object} gedcomPerson - Parsed GEDCOM individual
 * @param {number} userId - User ID for ownership
 * @returns {Object} Person data ready for database insertion
 */
export function mapGedcomPersonToSchema(gedcomPerson, userId) {
  const person = {
    firstName: gedcomPerson.firstName || '',
    lastName: gedcomPerson.lastName || '',
    gender: mapGedcomSexToGender(gedcomPerson.sex),
    birthDate: gedcomPerson.birthDate || null,
    deathDate: gedcomPerson.deathDate || null,
    photoUrl: extractPhotoUrlFromObje(gedcomPerson),
    userId
  }

  return person
}

/**
 * Deduplicates an array of relationships
 *
 * SQLite treats NULL values as distinct in unique indexes, so two rows with
 * (person1_id=1, person2_id=2, type='spouse', parent_role=NULL) are NOT
 * considered duplicates. This function deduplicates relationships before
 * insertion to prevent duplicate family records from creating duplicate
 * relationships.
 *
 * @param {Array} relationships - Array of relationship objects
 * @returns {Array} Array of unique relationships
 */
export function deduplicateRelationships(relationships) {
  const seen = new Set()
  const unique = []

  for (const rel of relationships) {
    // Create a unique key for this relationship
    // Handle NULL parent_role by using empty string in the key
    const key = `${rel.person1Id}:${rel.person2Id}:${rel.type}:${rel.parentRole || ''}`

    if (!seen.has(key)) {
      seen.add(key)
      unique.push(rel)
    }
  }

  return unique
}

/**
 * Builds normalized relationship records from GEDCOM families
 *
 * @param {Array} families - Array of GEDCOM family records
 * @param {Object} gedcomIdToPersonId - Mapping of GEDCOM IDs to database person IDs
 * @param {number} userId - User ID for ownership
 * @returns {Array} Array of relationship records ready for insertion (deduplicated)
 */
export function buildRelationshipsFromFamilies(families, gedcomIdToPersonId, userId) {
  const relationships = []

  for (const family of families) {
    const husbandId = family.husband ? gedcomIdToPersonId[family.husband] : null
    const wifeId = family.wife ? gedcomIdToPersonId[family.wife] : null
    const children = family.children || []

    // Create bidirectional spouse relationships
    if (husbandId && wifeId) {
      relationships.push({
        person1Id: husbandId,
        person2Id: wifeId,
        type: 'spouse',
        parentRole: null,
        userId
      })

      relationships.push({
        person1Id: wifeId,
        person2Id: husbandId,
        type: 'spouse',
        parentRole: null,
        userId
      })
    }

    // Create parent-child relationships
    for (const childGedcomId of children) {
      const childId = gedcomIdToPersonId[childGedcomId]
      if (!childId) {
        // Child was skipped or not imported
        continue
      }

      // Father-child relationship
      if (husbandId) {
        relationships.push({
          person1Id: husbandId,
          person2Id: childId,
          type: 'parentOf',
          parentRole: 'father',
          userId
        })
      }

      // Mother-child relationship
      if (wifeId) {
        relationships.push({
          person1Id: wifeId,
          person2Id: childId,
          type: 'parentOf',
          parentRole: 'mother',
          userId
        })
      }
    }
  }

  // Deduplicate relationships before returning
  // This handles duplicate family records in GEDCOM files
  return deduplicateRelationships(relationships)
}

/**
 * Applies duplicate resolution decisions to filter and categorize individuals
 *
 * @param {Array} individuals - Array of GEDCOM individuals
 * @param {Array} resolutionDecisions - Array of resolution decisions
 * @returns {Object} Object with individualsToImport, gedcomIdToPersonId mapping, and individualsToMerge
 */
export function applyDuplicateResolutions(individuals, resolutionDecisions) {
  const individualsToImport = []
  const gedcomIdToPersonId = {}
  const individualsToMerge = []

  // Create a map of gedcomId -> decision for quick lookup
  const decisionMap = new Map()
  for (const decision of resolutionDecisions) {
    decisionMap.set(decision.gedcomId, decision)
  }

  for (const individual of individuals) {
    const decision = decisionMap.get(individual.gedcomId)

    if (!decision) {
      // No decision = import as new
      individualsToImport.push(individual)
      continue
    }

    switch (decision.resolution) {
      case 'merge':
        // Map GEDCOM ID to existing person ID
        gedcomIdToPersonId[individual.gedcomId] = decision.existingPersonId

        // Add to merge list for updating (keep full individual for field mapping)
        individualsToMerge.push({
          gedcomId: individual.gedcomId,
          existingPersonId: decision.existingPersonId,
          individual: individual
        })
        break

      case 'skip':
        // Map GEDCOM ID to existing person ID (for relationships)
        // but don't import or update
        gedcomIdToPersonId[individual.gedcomId] = decision.existingPersonId
        break

      case 'import_as_new':
        // Import despite duplicate
        individualsToImport.push(individual)
        break

      default:
        // Unknown resolution - import as new
        individualsToImport.push(individual)
    }
  }

  return {
    individualsToImport,
    gedcomIdToPersonId,
    individualsToMerge
  }
}

/**
 * Prepares complete import data including persons and relationships
 *
 * @param {Object} previewData - Preview data with individuals and families
 * @param {Array} resolutionDecisions - Duplicate resolution decisions
 * @param {number} userId - User ID for ownership
 * @returns {Object} Complete import data ready for transaction
 */
export function prepareImportData(previewData, resolutionDecisions, userId) {
  // Apply duplicate resolutions
  const {
    individualsToImport,
    gedcomIdToPersonId,
    individualsToMerge
  } = applyDuplicateResolutions(previewData.individuals, resolutionDecisions)

  // Map individuals to schema
  const personsToInsert = individualsToImport.map(individual =>
    mapGedcomPersonToSchema(individual, userId)
  )

  // Prepare merge updates
  const personsToUpdate = individualsToMerge.map(merge => ({
    personId: merge.existingPersonId,
    updates: mapGedcomPersonToSchema(merge.individual, userId)
  }))

  // Note: gedcomIdToPersonId will be completed after insertion with new IDs
  // For now, it only contains merged/skipped mappings

  return {
    personsToInsert,
    personsToUpdate,
    individualsToImport, // Keep for building ID mapping after insertion
    gedcomIdMapping: gedcomIdToPersonId,
    families: previewData.families || [],
    relationshipsToInsert: [] // Will be built after persons are inserted
  }
}

/**
 * Completes the import data by building relationships after person insertion
 *
 * @param {Object} importData - Import data from prepareImportData
 * @param {Array} insertedPersons - Array of inserted persons with {gedcomId, personId}
 * @param {number} userId - User ID for ownership
 * @returns {Array} Array of relationships ready for insertion
 */
export function buildRelationshipsAfterInsertion(importData, insertedPersons, userId) {
  // Complete the GEDCOM ID to Person ID mapping
  const gedcomIdToPersonId = { ...importData.gedcomIdMapping }

  for (const inserted of insertedPersons) {
    gedcomIdToPersonId[inserted.gedcomId] = inserted.personId
  }

  // Build relationships
  return buildRelationshipsFromFamilies(
    importData.families,
    gedcomIdToPersonId,
    userId
  )
}
