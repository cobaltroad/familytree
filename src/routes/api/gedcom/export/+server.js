/**
 * GEDCOM Export API Endpoint
 *
 * GET /api/gedcom/export?format=5.5.1 or format=7.0
 *
 * Exports the authenticated user's family tree as a GEDCOM file.
 *
 * Story #96: Export Family Tree as GEDCOM
 */

import { requireAuth } from '$lib/server/session.js'
import { people, relationships } from '$lib/db/schema.js'
import { eq } from 'drizzle-orm'
import { buildGedcomFile } from '$lib/server/gedcomExporter.js'

/**
 * GET /api/gedcom/export
 *
 * Exports user's family tree as GEDCOM file
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
    // Require authentication
    const { user } = await requireAuth(event)

    // Get format parameter (default to 5.5.1)
    const format = event.url.searchParams.get('format') || '5.5.1'

    // Validate format
    if (format !== '5.5.1' && format !== '7.0') {
      return new Response('Invalid format parameter. Must be "5.5.1" or "7.0"', {
        status: 400
      })
    }

    // Fetch user's people
    const userPeople = await event.locals.db
      .select()
      .from(people)
      .where(eq(people.userId, user.id))

    // Fetch user's relationships
    const userRelationships = await event.locals.db
      .select()
      .from(relationships)
      .where(eq(relationships.userId, user.id))

    // Generate GEDCOM file
    const exportDate = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const gedcomContent = buildGedcomFile(userPeople, userRelationships, {
      version: format,
      userName: user.name || 'Unknown',
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
    if (error.name === 'AuthenticationError') {
      return new Response(error.message, { status: error.status })
    }

    console.error('GET /api/gedcom/export error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
