/**
 * GEDCOM File Storage Module
 * Story #92: Basic GEDCOM File Upload
 *
 * Handles temporary storage of uploaded GEDCOM files:
 * - Generates unique upload IDs
 * - Stores files in temporary directory
 * - Provides file cleanup functionality
 * - Associates uploads with user sessions
 */

import { promises as fs } from 'fs'
import path from 'path'
import crypto from 'crypto'
import { sanitizeFileName } from './gedcomValidation.js'

// Base directory for temporary GEDCOM uploads
const TEMP_BASE_DIR = '/tmp/gedcom-uploads'

/**
 * Generates a unique upload ID for a file upload
 *
 * Format: {userId}_{timestamp}_{randomHash}
 *
 * @param {number|string} userId - ID of the authenticated user
 * @returns {string} Unique upload ID
 */
export function generateUploadId(userId) {
  const timestamp = Date.now()
  const randomHash = crypto.randomBytes(8).toString('hex')
  return `${userId}_${timestamp}_${randomHash}`
}

/**
 * Generates the file path for a temporary upload
 *
 * Files are stored in: /tmp/gedcom-uploads/{uploadId}/{sanitizedFileName}
 *
 * @param {string} uploadId - Unique upload ID
 * @param {string} fileName - Original file name (will be sanitized)
 * @returns {string} Full file path for storage
 */
export function generateTempFilePath(uploadId, fileName) {
  const sanitized = sanitizeFileName(fileName)
  return path.join(TEMP_BASE_DIR, uploadId, sanitized)
}

/**
 * Saves an uploaded file to temporary storage
 *
 * Creates necessary directories and writes file to disk.
 * Returns metadata about the saved file.
 *
 * @param {string} uploadId - Unique upload ID
 * @param {string} fileName - Original file name
 * @param {Buffer} fileData - File content as Buffer
 * @returns {Promise<Object>} Result object with success status and metadata
 */
export async function saveUploadedFile(uploadId, fileName, fileData) {
  try {
    // Generate file path
    const filePath = generateTempFilePath(uploadId, fileName)
    const uploadDir = path.dirname(filePath)

    // Create directory if it doesn't exist
    await fs.mkdir(uploadDir, { recursive: true })

    // Write file to disk
    await fs.writeFile(filePath, fileData)

    // Get file stats
    const stats = await fs.stat(filePath)

    return {
      success: true,
      uploadId,
      fileName: sanitizeFileName(fileName),
      fileSize: stats.size,
      filePath
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Cleans up temporary upload directory and file
 *
 * Removes the entire upload directory for a given uploadId.
 * Safe to call even if directory doesn't exist.
 *
 * @param {string} uploadId - Upload ID to clean up
 * @returns {Promise<Object>} Result object with success status
 */
export async function cleanupTempFile(uploadId) {
  try {
    const uploadDir = path.join(TEMP_BASE_DIR, uploadId)

    // Remove directory and all contents
    await fs.rm(uploadDir, { recursive: true, force: true })

    return {
      success: true,
      uploadId
    }
  } catch (error) {
    // Even if removal fails, consider it handled
    // (directory may not exist, which is fine)
    return {
      success: true,
      uploadId,
      note: 'Directory may not have existed'
    }
  }
}

/**
 * Gets information about a temporary upload
 *
 * Retrieves metadata about an uploaded file if it exists.
 *
 * @param {string} uploadId - Upload ID to query
 * @returns {Promise<Object>} File information object
 */
export async function getTempFileInfo(uploadId) {
  try {
    const uploadDir = path.join(TEMP_BASE_DIR, uploadId)

    // Check if directory exists
    await fs.access(uploadDir)

    // Read directory contents
    const files = await fs.readdir(uploadDir)

    if (files.length === 0) {
      return {
        exists: false,
        uploadId
      }
    }

    // Get first file (should only be one)
    const fileName = files[0]
    const filePath = path.join(uploadDir, fileName)

    // Get file stats
    const stats = await fs.stat(filePath)

    return {
      exists: true,
      uploadId,
      fileName,
      fileSize: stats.size,
      filePath,
      createdAt: stats.birthtime
    }
  } catch (error) {
    return {
      exists: false,
      uploadId
    }
  }
}
