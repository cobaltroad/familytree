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
  console.log('[GEDCOM Upload API] POST request received')
  let uploadId = null

  try {
    // Require authentication
    console.log('[GEDCOM Upload API] Checking authentication')
    const session = await requireAuth({ locals, ...event })
    const userId = session.user.id
    console.log('[GEDCOM Upload API] User authenticated, userId:', userId)

    // Parse multipart form data
    let formData
    try {
      console.log('[GEDCOM Upload API] Parsing form data')
      formData = await request.formData()
      console.log('[GEDCOM Upload API] Form data parsed successfully')
    } catch (error) {
      console.error('[GEDCOM Upload API] Failed to parse form data:', error)
      return new Response('Invalid form data', { status: 400 })
    }

    // Get uploaded file
    console.log('[GEDCOM Upload API] Extracting file from form data')
    const file = formData.get('file')
    console.log('[GEDCOM Upload API] File extracted:', file ? {
      name: file.name,
      size: file.size,
      type: file.type
    } : 'null')

    // Check if file exists and has File-like properties (name, size, arrayBuffer)
    if (!file || !file.name || typeof file.size !== 'number' || typeof file.arrayBuffer !== 'function') {
      console.error('[GEDCOM Upload API] Invalid file object:', {
        fileExists: !!file,
        hasName: file ? !!file.name : false,
        hasSizeNumber: file ? typeof file.size === 'number' : false,
        hasArrayBuffer: file ? typeof file.arrayBuffer === 'function' : false
      })
      return new Response('No file provided', { status: 400 })
    }

    // Validate file type
    console.log('[GEDCOM Upload API] Validating file type:', file.name)
    if (!validateFileType(file.name)) {
      console.error('[GEDCOM Upload API] File type validation failed:', file.name)
      return new Response('Only .ged files are supported', { status: 400 })
    }
    console.log('[GEDCOM Upload API] File type validation passed')

    // Validate file size
    console.log('[GEDCOM Upload API] Validating file size:', file.size)
    if (file.size === 0) {
      console.error('[GEDCOM Upload API] File is empty')
      return new Response('File is empty', { status: 400 })
    }

    if (!validateFileSize(file.size)) {
      console.error('[GEDCOM Upload API] File size exceeds limit:', file.size)
      return new Response('File size exceeds 10MB limit', { status: 413 })
    }
    console.log('[GEDCOM Upload API] File size validation passed')

    // Generate unique upload ID
    console.log('[GEDCOM Upload API] Generating upload ID for user:', userId)
    uploadId = generateUploadId(userId)
    console.log('[GEDCOM Upload API] Upload ID generated:', uploadId)

    // Read file data
    console.log('[GEDCOM Upload API] Reading file data into buffer')
    const fileData = Buffer.from(await file.arrayBuffer())
    console.log('[GEDCOM Upload API] File data read, buffer size:', fileData.length)

    // Save file to temporary storage
    console.log('[GEDCOM Upload API] Saving file to temporary storage')
    const saveResult = await saveUploadedFile(uploadId, file.name, fileData)
    console.log('[GEDCOM Upload API] Save result:', saveResult)

    if (!saveResult.success) {
      console.error('[GEDCOM Upload API] Failed to save file')
      // Clean up on error
      await cleanupTempFile(uploadId)
      return new Response('Failed to save file', { status: 500 })
    }

    // Return success response with upload metadata
    console.log('[GEDCOM Upload API] File saved successfully, returning response')
    const response = {
      uploadId: saveResult.uploadId,
      fileName: saveResult.fileName,
      fileSize: saveResult.fileSize
    }
    console.log('[GEDCOM Upload API] Success response:', response)
    return json(response)
  } catch (error) {
    console.error('[GEDCOM Upload API] Error caught in main try-catch:', error)
    console.error('[GEDCOM Upload API] Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    })

    // Clean up temp file on error
    if (uploadId) {
      console.log('[GEDCOM Upload API] Cleaning up temp file for uploadId:', uploadId)
      await cleanupTempFile(uploadId)
    }

    // Handle authentication errors
    if (error.name === 'AuthenticationError') {
      console.error('[GEDCOM Upload API] Authentication error:', error.message)
      return new Response(error.message, { status: error.status })
    }

    console.error('[GEDCOM Upload API] Returning 500 Internal Server Error')
    return new Response('Internal Server Error', { status: 500 })
  }
}
