/**
 * GEDCOM Import API Endpoint
 * Story #95: Import GEDCOM Data to User's Tree
 *
 * POST /api/gedcom/import/:uploadId
 * Imports GEDCOM data to user's family tree with transaction safety
 */

import { json } from '@sveltejs/kit'
import { db } from '$lib/db/client.js'
import { people, relationships } from '$lib/db/schema.js'
import { eq } from 'drizzle-orm'
import { getPreviewData, getResolutionDecisions } from '$lib/server/gedcomPreview.js'
import {
  prepareImportData,
  buildRelationshipsAfterInsertion,
  mapGedcomPersonToSchema
} from '$lib/server/gedcomImporter.js'
import { requireAuth } from '$lib/server/session.js'

/**
 * POST /api/gedcom/import/:uploadId
 * Imports GEDCOM data into user's tree
 *
 * Request body:
 * - importAll: boolean - Import all individuals
 * - selectedIds: string[] (optional) - Specific GEDCOM IDs to import
 *
 * Response:
 * - success: boolean
 * - imported: { persons: number, relationships: number, updated: number }
 * - errors: string[] (optional)
 */
export async function POST({ request, params, locals, ...event }) {
  const { uploadId } = params

  try {
    // Require authentication (consistent with other API endpoints)
    const session = await requireAuth({ locals, ...event })
    const userId = session.user.id

    // Parse request body
    const body = await request.json()
    const { importAll } = body

    // Get preview data
    const previewData = await getPreviewData(uploadId, userId)
    if (!previewData) {
      return json(
        { error: 'Preview data not found. Please upload and parse a GEDCOM file first.' },
        { status: 404 }
      )
    }

    // Get resolution decisions
    const resolutionDecisions = await getResolutionDecisions(uploadId, userId)

    // Prepare import data
    const importData = prepareImportData(
      previewData,
      resolutionDecisions,
      userId
    )

    // Track import statistics
    let personsInserted = 0
    let personsUpdated = 0
    let relationshipsInserted = 0

    // Execute import in a transaction
    // Note: For better-sqlite3, the transaction callback must be synchronous
    const transactionResult = db.transaction(() => {
      // Step 1: Update existing persons (merges)
      for (const personUpdate of importData.personsToUpdate) {
        db
          .update(people)
          .set(personUpdate.updates)
          .where(eq(people.id, personUpdate.personId))
          .run()

        personsUpdated++
      }

      // Step 2: Insert new persons
      const insertedPersons = []

      for (let i = 0; i < importData.personsToInsert.length; i++) {
        const personData = importData.personsToInsert[i]
        const individual = importData.individualsToImport[i]
        // gedcomId can be at top level or in _original (depending on preview data structure)
        const gedcomId = individual?.gedcomId || individual?._original?.gedcomId

        const insertedPerson = db
          .insert(people)
          .values(personData)
          .returning()
          .get()

        insertedPersons.push({
          gedcomId,
          personId: insertedPerson.id
        })

        personsInserted++
      }

      // Step 3: Build relationships after persons are inserted
      const relationshipsToInsert = buildRelationshipsAfterInsertion(
        importData,
        insertedPersons,
        userId
      )

      // Step 4: Insert relationships
      if (relationshipsToInsert.length > 0) {
        for (const relationship of relationshipsToInsert) {
          db.insert(relationships).values(relationship).run()
          relationshipsInserted++
        }
      }

      return {
        personsInserted,
        personsUpdated,
        relationshipsInserted
      }
    })

    // Update counts from transaction result
    personsInserted = transactionResult.personsInserted
    personsUpdated = transactionResult.personsUpdated
    relationshipsInserted = transactionResult.relationshipsInserted

    // Return success response
    return json({
      success: true,
      imported: {
        persons: personsInserted,
        updated: personsUpdated,
        relationships: relationshipsInserted
      }
    })
  } catch (error) {
    // Handle authentication errors
    if (error.name === 'AuthenticationError') {
      return json(
        { error: error.message },
        { status: error.status }
      )
    }

    console.error('Import error:', error)

    // Story #97: Enhanced error handling with actionable messages
    let errorCode = 'UNKNOWN_ERROR'
    let statusCode = 500
    let userMessage = 'Import failed: ' + error.message

    // Detect constraint violations
    if (error.message && error.message.includes('UNIQUE constraint')) {
      errorCode = 'CONSTRAINT_VIOLATION'
      statusCode = 409
      userMessage = 'Database constraint violation: Duplicate record detected'
    } else if (error.message && error.message.includes('FOREIGN KEY constraint')) {
      errorCode = 'CONSTRAINT_VIOLATION'
      statusCode = 409
      userMessage = 'Database constraint violation: Invalid relationship reference'
    } else if (error.message && error.message.includes('timeout')) {
      errorCode = 'TIMEOUT_ERROR'
      statusCode = 504
      userMessage = 'Import timed out - please try again. Large imports may take several minutes.'
    }

    return json(
      {
        success: false,
        error: {
          code: errorCode,
          message: userMessage,
          details: error.message,
          canRetry: true,
          errorLogUrl: `/api/gedcom/import/${uploadId}/errors.csv`
        }
      },
      { status: statusCode }
    )
  }
}
