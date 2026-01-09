/**
 * Duplicate Detection Module
 * Story #93: GEDCOM File Parsing and Validation
 *
 * Provides functions to detect duplicate individuals between GEDCOM data and existing database
 */

const CONFIDENCE_THRESHOLD = 70
const NAME_WEIGHT = 0.5 // 50% of total score
const DATE_WEIGHT = 0.3 // 30% of total score
const PARENT_WEIGHT = 0.2 // 20% of total score

/**
 * Compares two names and returns similarity score (0-100)
 *
 * Uses Levenshtein distance algorithm for fuzzy matching
 *
 * @param {string} name1 - First name to compare
 * @param {string} name2 - Second name to compare
 * @returns {number} Similarity score (0-100)
 */
export function compareNames(name1, name2) {
  if (!name1 || !name2) {
    return 0
  }

  // Normalize names (lowercase, trim)
  const n1 = name1.toLowerCase().trim()
  const n2 = name2.toLowerCase().trim()

  // Exact match
  if (n1 === n2) {
    return 100
  }

  // Calculate Levenshtein distance
  const distance = levenshteinDistance(n1, n2)
  const maxLength = Math.max(n1.length, n2.length)

  if (maxLength === 0) {
    return 0
  }

  // Convert distance to similarity percentage
  const similarity = (1 - distance / maxLength) * 100

  return Math.max(0, Math.min(100, similarity))
}

/**
 * Calculates Levenshtein distance between two strings
 *
 * @private
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Edit distance
 */
function levenshteinDistance(str1, str2) {
  const matrix = []

  // Initialize matrix
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }

  // Fill matrix
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        )
      }
    }
  }

  return matrix[str2.length][str1.length]
}

/**
 * Compares two dates and returns similarity score (0-100)
 *
 * - Exact match: 100%
 * - Year match only: 50%
 * - No match: 0%
 *
 * @param {string} date1 - First date (ISO format or partial)
 * @param {string} date2 - Second date (ISO format or partial)
 * @returns {number} Similarity score (0-100)
 */
export function compareDates(date1, date2) {
  if (!date1 || !date2) {
    return 0
  }

  const d1 = date1.trim()
  const d2 = date2.trim()

  // Exact match
  if (d1 === d2) {
    return 100
  }

  // Extract parts
  const parts1 = d1.split('-')
  const parts2 = d2.split('-')

  const year1 = parts1[0]
  const year2 = parts2[0]

  // Years don't match
  if (year1 !== year2) {
    return 0
  }

  // Year matches - now check if we should compare at a more granular level
  const month1 = parts1[1]
  const month2 = parts2[1]

  // If either date is year-only, consider it a full match (100%)
  if (!month1 || !month2) {
    return 100
  }

  // Both have months - check month match
  if (month1 === month2) {
    // Year and month match - if either is month-year only, consider full match
    const day1 = parts1[2]
    const day2 = parts2[2]

    if (!day1 || !day2) {
      return 100
    }

    // Both have full dates but days don't match
    return 75
  }

  // Year matches but months differ
  return 50
}

/**
 * Compares parent families and returns similarity score (0-100)
 *
 * Returns 100% if any parent families match (same family ID means same parents)
 *
 * @param {Array} parents1 - Family IDs for first person
 * @param {Array} parents2 - Family IDs for second person
 * @returns {number} Similarity score (0-100)
 */
export function compareParents(parents1, parents2) {
  if (!parents1 || !parents2 || parents1.length === 0 || parents2.length === 0) {
    return 0
  }

  const set1 = new Set(parents1)
  const set2 = new Set(parents2)

  // Check if any parent family matches
  for (const parent of set1) {
    if (set2.has(parent)) {
      // Same family ID means same parents - full match
      return 100
    }
  }

  return 0
}

/**
 * Calculates match confidence between GEDCOM person and existing person
 *
 * Weighted scoring:
 * - Name: 50%
 * - Birth date: 30%
 * - Parents: 20%
 *
 * @param {Object} gedcomPerson - Person from GEDCOM file
 * @param {Object} existingPerson - Person from database
 * @returns {Object} Match result with confidence and matching fields
 */
export function calculateMatchConfidence(gedcomPerson, existingPerson) {
  const matchingFields = []
  let totalScore = 0

  // Compare names
  const gedcomName = gedcomPerson.name || `${gedcomPerson.firstName || ''} ${gedcomPerson.lastName || ''}`.trim()
  const existingName = `${existingPerson.firstName || ''} ${existingPerson.lastName || ''}`.trim()

  const nameScore = compareNames(gedcomName, existingName)
  totalScore += nameScore * NAME_WEIGHT

  if (nameScore > 70) {
    matchingFields.push('name')
  }

  // Compare birth dates
  const dateScore = compareDates(gedcomPerson.birthDate, existingPerson.birthDate)
  totalScore += dateScore * DATE_WEIGHT

  if (dateScore > 70) {
    matchingFields.push('birthDate')
  }

  // Compare parents
  const gedcomParents = gedcomPerson.childOfFamily ? [gedcomPerson.childOfFamily] : []
  const existingParents = existingPerson.parentFamilies || []

  const parentScore = compareParents(gedcomParents, existingParents)
  totalScore += parentScore * PARENT_WEIGHT

  if (parentScore > 0) {
    matchingFields.push('parents')
  }

  return {
    confidence: Math.round(totalScore),
    matchingFields
  }
}

/**
 * Finds duplicate individuals between GEDCOM data and existing database records
 *
 * @param {Array} gedcomPeople - Array of individuals from GEDCOM file
 * @param {Array} existingPeople - Array of people from database
 * @returns {Array} Array of duplicate matches above confidence threshold
 */
export function findDuplicates(gedcomPeople, existingPeople) {
  if (!gedcomPeople || !existingPeople || existingPeople.length === 0) {
    return []
  }

  const duplicates = []

  for (const gedcomPerson of gedcomPeople) {
    for (const existingPerson of existingPeople) {
      const match = calculateMatchConfidence(gedcomPerson, existingPerson)

      if (match.confidence >= CONFIDENCE_THRESHOLD) {
        duplicates.push({
          gedcomPerson: {
            id: gedcomPerson.id,
            name: gedcomPerson.name || `${gedcomPerson.firstName || ''} ${gedcomPerson.lastName || ''}`.trim(),
            birthDate: gedcomPerson.birthDate
          },
          existingPerson: {
            id: existingPerson.id,
            name: `${existingPerson.firstName || ''} ${existingPerson.lastName || ''}`.trim(),
            birthDate: existingPerson.birthDate
          },
          confidence: match.confidence,
          matchingFields: match.matchingFields
        })
      }
    }
  }

  // Sort by confidence (highest first)
  duplicates.sort((a, b) => b.confidence - a.confidence)

  return duplicates
}

/**
 * Finds all duplicate pairs within a single array of people
 * Story #108: Duplicate Detection Service (Foundation)
 *
 * Compares each person against all other people in the array to find potential duplicates.
 * Only reports each pair once (avoids reporting both A->B and B->A).
 *
 * @param {Array} people - Array of people from database
 * @param {number} threshold - Confidence threshold (default: 70)
 * @returns {Array} Array of duplicate pairs with confidence scores
 */
export function findAllDuplicates(people, threshold = CONFIDENCE_THRESHOLD) {
  if (!people || people.length <= 1) {
    return []
  }

  const duplicates = []

  // Compare each person with every other person (avoiding duplicates)
  for (let i = 0; i < people.length; i++) {
    for (let j = i + 1; j < people.length; j++) {
      const person1 = people[i]
      const person2 = people[j]

      // Calculate match confidence between the two database persons
      // We need to adapt the format to work with calculateMatchConfidence
      const match = calculateMatchConfidence(
        {
          firstName: person1.firstName,
          lastName: person1.lastName,
          birthDate: person1.birthDate
        },
        person2
      )

      if (match.confidence >= threshold) {
        duplicates.push({
          person1: {
            id: person1.id,
            name: `${person1.firstName || ''} ${person1.lastName || ''}`.trim(),
            birthDate: person1.birthDate
          },
          person2: {
            id: person2.id,
            name: `${person2.firstName || ''} ${person2.lastName || ''}`.trim(),
            birthDate: person2.birthDate
          },
          confidence: match.confidence,
          matchingFields: match.matchingFields
        })
      }
    }
  }

  // Sort by confidence (highest first)
  duplicates.sort((a, b) => b.confidence - a.confidence)

  return duplicates
}

/**
 * Finds duplicate candidates for a specific person
 * Story #108: Duplicate Detection Service (Foundation)
 *
 * Compares the target person against all other people in the array.
 * Excludes the target person itself from results.
 *
 * @param {Object} targetPerson - The person to find duplicates for
 * @param {Array} allPeople - Array of all people from database
 * @param {number} threshold - Confidence threshold (default: 70)
 * @returns {Array} Array of potential duplicate persons with confidence scores
 */
export function findDuplicatesForPerson(targetPerson, allPeople, threshold = CONFIDENCE_THRESHOLD) {
  if (!targetPerson || !allPeople || allPeople.length <= 1) {
    return []
  }

  const duplicates = []

  for (const person of allPeople) {
    // Skip the target person itself
    if (person.id === targetPerson.id) {
      continue
    }

    // Calculate match confidence
    const match = calculateMatchConfidence(
      {
        firstName: targetPerson.firstName,
        lastName: targetPerson.lastName,
        birthDate: targetPerson.birthDate
      },
      person
    )

    if (match.confidence >= threshold) {
      duplicates.push({
        person: {
          id: person.id,
          name: `${person.firstName || ''} ${person.lastName || ''}`.trim(),
          birthDate: person.birthDate
        },
        confidence: match.confidence,
        matchingFields: match.matchingFields
      })
    }
  }

  // Sort by confidence (highest first)
  duplicates.sort((a, b) => b.confidence - a.confidence)

  return duplicates
}
