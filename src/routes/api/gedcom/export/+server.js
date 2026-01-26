/**
 * GEDCOM Export API Endpoint
 *
 * GET /api/gedcom/export?format=5.5.1 or format=7.0
 *
 * Exports the family tree as a GEDCOM file.
 *
 * Story #96: Export Family Tree as GEDCOM
 */

import { people, relationships } from '$lib/db/schema.js'
import { buildGedcomFile } from '$lib/server/gedcomExporter.js'
import { db } from '$lib/db/client.js'

/**
 * GET /api/gedcom/export
 *
 * Exports family tree as GEDCOM file
 *
 * Query parameters:
 * - format: "5.5.1" or "7.0" (default: "5.5.1")
 *
 * Response: GEDCOM file download
 * Content-Type: text/x-gedcom
 * Content-Disposition: attachment; filename="familytree_YYYYMMDD.ged"
 */
export async function GET(event) {
  try {
    // Use locals.db if provided (for testing), otherwise use singleton db
    const database = event.locals?.db || db

    // Get format parameter (default to 5.5.1)
    const format = event.url.searchParams.get('format') || '5.5.1'

    // Validate format
    if (format !== '5.5.1' && format !== '7.0') {
      return new Response('Invalid format parameter. Must be "5.5.1" or "7.0"', {
        status: 400
      })
    }

    // Fetch all people
    const allPeople = await database
      .select()
      .from(people)

    // Fetch all relationships
    const allRelationships = await database
      .select()
      .from(relationships)

    // Generate GEDCOM file
    const exportDate = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const gedcomContent = buildGedcomFile(allPeople, allRelationships, {
      version: format,
      userName: 'FamilyTree App',
      exportDate
    })

    // Generate filename with date
    const dateString = exportDate.replace(/-/g, '') // YYYYMMDD
    const filename = `familytree_${dateString}.ged`

    // Return GEDCOM file
    return new Response(gedcomContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/x-gedcom',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })
  } catch (error) {
    console.error('GET /api/gedcom/export error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
