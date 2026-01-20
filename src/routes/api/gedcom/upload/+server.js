/**
 * GEDCOM Upload API Endpoint
 * Story #92: Basic GEDCOM File Upload
 *
 * POST /api/gedcom/upload
 *
 * Handles file upload for GEDCOM files:
 * - Validates file type (.ged only)
 * - Validates file size (10MB max)
 * - Requires authentication
 * - Stores file temporarily for processing
 * - Returns upload metadata
 */

import { json } from '@sveltejs/kit'
import { requireAuth } from '$lib/server/session.js'
import { validateFileType, validateFileSize, sanitizeFileName } from '$lib/server/gedcomValidation.js'
import {
  generateUploadId,
  saveUploadedFile,
  cleanupTempFile
} from '$lib/server/gedcomStorage.js'

/**
 * POST /api/gedcom/upload
 * Upload a GEDCOM file for processing
 *
 * Authentication: Required
 *
 * @param {Request} request - HTTP request with multipart/form-data
 * @returns {Response} JSON with uploadId, fileName, fileSize or error
 */
export async function POST({ request, locals, ...event }) {
  let uploadId = null

  try {
    // Require authentication
    const session = await requireAuth({ locals, ...event })
    const userId = session.user.id

    // Parse multipart form data
    let formData
    try {
      formData = await request.formData()
    } catch (error) {
      return new Response('Invalid form data', { status: 400 })
    }

    // Get uploaded file
    const file = formData.get('file')

    // Check if file exists and has File-like properties (name, size, arrayBuffer)
    if (!file || !file.name || typeof file.size !== 'number' || typeof file.arrayBuffer !== 'function') {
      return new Response('No file provided', { status: 400 })
    }

    // Validate file type
    if (!validateFileType(file.name)) {
      return new Response('Only .ged files are supported', { status: 400 })
    }

    // Validate file size
    if (file.size === 0) {
      return new Response('File is empty', { status: 400 })
    }

    if (!validateFileSize(file.size)) {
      return new Response('File size exceeds 10MB limit', { status: 413 })
    }

    // Generate unique upload ID
    uploadId = generateUploadId(userId)

    // Read file data
    const fileData = Buffer.from(await file.arrayBuffer())

    // Save file to temporary storage
    const saveResult = await saveUploadedFile(uploadId, file.name, fileData)

    if (!saveResult.success) {
      // Clean up on error
      await cleanupTempFile(uploadId)
      return new Response('Failed to save file', { status: 500 })
    }

    // Return success response with upload metadata
    const response = {
      uploadId: saveResult.uploadId,
      fileName: saveResult.fileName,
      fileSize: saveResult.fileSize
    }
    return json(response)
  } catch (error) {
    // Clean up temp file on error
    if (uploadId) {
      await cleanupTempFile(uploadId)
    }

    // Handle authentication errors
    if (error.name === 'AuthenticationError') {
      return new Response(error.message, { status: error.status })
    }

    return new Response('Internal Server Error', { status: 500 })
  }
}
