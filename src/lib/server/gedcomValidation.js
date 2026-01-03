/**
 * GEDCOM File Validation Module
 * Story #92: Basic GEDCOM File Upload
 *
 * Provides validation functions for GEDCOM file uploads:
 * - File type validation (.ged extension only)
 * - File size validation (10MB max)
 * - File name sanitization (security)
 */

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB in bytes
const MAX_FILENAME_LENGTH = 255

/**
 * Validates file type based on extension
 *
 * @param {string} fileName - Name of the file to validate
 * @returns {boolean} True if file has .ged extension (case-insensitive), false otherwise
 */
export function validateFileType(fileName) {
  // Handle null, undefined, or empty string
  if (!fileName || typeof fileName !== 'string') {
    return false
  }

  // Extract file extension
  const extension = fileName.split('.').pop()

  // Only accept .ged extension (case-insensitive)
  return extension?.toLowerCase() === 'ged'
}

/**
 * Validates file size against 10MB limit
 *
 * @param {number} fileSize - Size of file in bytes
 * @returns {boolean} True if file size is valid (1 byte to 10MB), false otherwise
 */
export function validateFileSize(fileSize) {
  // Must be a valid number
  if (typeof fileSize !== 'number' || isNaN(fileSize)) {
    return false
  }

  // Must be at least 1 byte
  if (fileSize < 1) {
    return false
  }

  // Must not exceed 10MB
  if (fileSize > MAX_FILE_SIZE) {
    return false
  }

  return true
}

/**
 * Sanitizes file name to prevent path traversal attacks
 *
 * Removes dangerous characters and patterns:
 * - Directory separators (/, \)
 * - Parent directory references (..)
 * - Null bytes
 *
 * @param {string} fileName - Original file name
 * @returns {string} Sanitized file name safe for storage
 */
export function sanitizeFileName(fileName) {
  // Handle null, undefined, or empty string
  if (!fileName || typeof fileName !== 'string') {
    return 'upload.ged'
  }

  let sanitized = fileName

  // Remove null bytes
  sanitized = sanitized.replace(/\x00/g, '')

  // Remove directory separators and parent directory references
  sanitized = sanitized.replace(/[\/\\]/g, '')
  sanitized = sanitized.replace(/\.\./g, '')

  // Trim whitespace
  sanitized = sanitized.trim()

  // If filename is empty after sanitization, use default
  if (!sanitized || sanitized.length === 0) {
    return 'upload.ged'
  }

  // Truncate to maximum filename length while preserving extension
  if (sanitized.length > MAX_FILENAME_LENGTH) {
    const extension = sanitized.split('.').pop()
    const nameWithoutExt = sanitized.substring(0, sanitized.lastIndexOf('.'))
    const maxNameLength = MAX_FILENAME_LENGTH - extension.length - 1 // -1 for the dot
    sanitized = nameWithoutExt.substring(0, maxNameLength) + '.' + extension
  }

  return sanitized
}

/**
 * Gets the maximum allowed file size in bytes
 *
 * @returns {number} Maximum file size (10MB)
 */
export function getMaxFileSize() {
  return MAX_FILE_SIZE
}
