/**
 * GEDCOM Preview Duplicates API Endpoint
 * Story #106: GEDCOM Duplicate Resolution UI
 *
 * GET /api/gedcom/preview/:uploadId/duplicates
 *
 * Returns duplicate individuals with formatted comparison data
 */

import { json } from '@sveltejs/kit'
import { requireAuth } from '$lib/server/session.js'
import { getPreviewData } from '$lib/server/gedcomPreview.js'

/**
 * Converts GEDCOM sex value to application gender value
 * @param {string} sex - GEDCOM sex value (M, F, U, or null)
 * @returns {string|null} - Application gender value (male, female, other, or null)
 */
function convertSexToGender(sex) {
  if (!sex) return null

  const sexMap = {
    'M': 'male',
    'F': 'female',
    'U': 'other'
  }

  return sexMap[sex.toUpperCase()] || null
}

/**
 * Formats a person object for comparison display
 * @param {Object} person - Person data
 * @param {boolean} isGedcom - Whether this is GEDCOM data or existing data
 * @returns {Object} - Formatted person data
 */
function formatPersonForComparison(person, isGedcom = false) {
  const firstName = person.firstName || null
  const lastName = person.lastName || null
  const name = [firstName, lastName].filter(Boolean).join(' ') || null

  if (isGedcom) {
    return {
      gedcomId: person.id,
      firstName,
      lastName,
      name,
      birthDate: person.birthDate || null,
      birthPlace: person.birthPlace || null,
      deathDate: person.deathDate || null,
      deathPlace: person.deathPlace || null,
      gender: convertSexToGender(person.sex),
      photoUrl: person.photoUrl || null
    }
  } else {
    return {
      id: person.id,
      firstName,
      lastName,
      name,
      birthDate: person.birthDate,
      birthPlace: person.birthPlace,
      deathDate: person.deathDate,
      deathPlace: person.deathPlace,
      gender: person.gender,
      photoUrl: person.photoUrl
    }
  }
}

/**
 * Compares two person objects and returns matching fields
 * @param {Object} gedcomPerson - GEDCOM person data
 * @param {Object} existingPerson - Existing person data
 * @param {Object} providedMatchingFields - Matching fields from duplicate detection
 * @returns {Object} - Complete matching fields object
 */
function buildMatchingFields(gedcomPerson, existingPerson, providedMatchingFields = {}) {
  // Start with provided matching fields, then add comparisons for all fields
  return {
    ...providedMatchingFields,
    name: providedMatchingFields.name !== undefined
      ? providedMatchingFields.name
      : gedcomPerson.name === existingPerson.name,
    birthDate: providedMatchingFields.birthDate !== undefined
      ? providedMatchingFields.birthDate
      : gedcomPerson.birthDate === existingPerson.birthDate,
    birthPlace: providedMatchingFields.birthPlace !== undefined
      ? providedMatchingFields.birthPlace
      : gedcomPerson.birthPlace === existingPerson.birthPlace,
    deathDate: (gedcomPerson.deathDate && existingPerson.deathDate)
      ? gedcomPerson.deathDate === existingPerson.deathDate
      : false,
    deathPlace: (gedcomPerson.deathPlace && existingPerson.deathPlace)
      ? gedcomPerson.deathPlace === existingPerson.deathPlace
      : false,
    gender: gedcomPerson.gender === existingPerson.gender
  }
}

/**
 * GET /api/gedcom/preview/:uploadId/duplicates
 * Get duplicate individuals with comparison data
 *
 * Authentication: Required
 *
 * @param {Object} locals - SvelteKit locals (contains session)
 * @param {Object} params - Route parameters (uploadId)
 * @returns {Response} JSON with duplicates array or error
 */
export async function GET({ locals, params, ...event }) {
  try {
    // Require authentication
    const session = await requireAuth({ locals, ...event })
    const userId = session.user.id

    const { uploadId } = params

    // Get preview data
    const previewData = await getPreviewData(uploadId, userId)

    if (!previewData) {
      return new Response('Preview data not found', { status: 404 })
    }

    // Format duplicates for comparison display
    const formattedDuplicates = (previewData.duplicates || []).map(duplicate => {
      const gedcomPerson = formatPersonForComparison(duplicate.gedcomPerson, true)
      const existingPerson = formatPersonForComparison(duplicate.existingPerson, false)
      const matchingFields = buildMatchingFields(
        gedcomPerson,
        existingPerson,
        duplicate.matchingFields || {}
      )

      return {
        gedcomPerson,
        existingPerson,
        confidence: duplicate.confidence,
        matchingFields
      }
    })

    return json({ duplicates: formattedDuplicates })
  } catch (error) {
    // Handle authentication errors
    if (error.name === 'AuthenticationError') {
      return new Response(error.message, { status: error.status })
    }

    console.error('Error fetching duplicates:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
