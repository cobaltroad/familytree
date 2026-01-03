/**
 * GEDCOM Error Handler Module
 * Story #97: GEDCOM Import Error Handling and Recovery
 *
 * Provides comprehensive error handling for GEDCOM imports including:
 * - Actionable error messages with context (line, individual, field)
 * - Error log CSV generation
 * - Error categorization by severity and code
 */

/**
 * Error codes for different types of import failures
 */
export const ErrorCodes = {
  UNSUPPORTED_VERSION: 'UNSUPPORTED_VERSION',
  PARSE_ERROR: 'PARSE_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  VALIDATION_WARNING: 'VALIDATION_WARNING',
  CONSTRAINT_VIOLATION: 'CONSTRAINT_VIOLATION',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
}

/**
 * Error severity levels
 */
export const ErrorSeverity = {
  ERROR: 'Error',
  WARNING: 'Warning'
}

/**
 * Creates a structured import error object
 *
 * @param {Object} params - Error parameters
 * @param {string} params.code - Error code from ErrorCodes
 * @param {string} params.message - Human-readable error message
 * @param {number} [params.line] - Line number in GEDCOM file
 * @param {string} [params.gedcomId] - GEDCOM ID (e.g., "@I045@")
 * @param {string} [params.individualName] - Individual's name
 * @param {string} [params.field] - Field that caused the error
 * @param {string} [params.suggestedFix] - Suggested fix for the error
 * @returns {Object} Structured error object
 */
export function createImportError({
  code = ErrorCodes.UNKNOWN_ERROR,
  message,
  line = null,
  gedcomId = null,
  individualName = null,
  field = null,
  suggestedFix = null
}) {
  return {
    severity: ErrorSeverity.ERROR,
    code,
    message,
    line,
    gedcomId,
    individualName,
    field,
    suggestedFix,
    timestamp: new Date()
  }
}

/**
 * Creates a validation warning (non-fatal error)
 *
 * @param {Object} params - Warning parameters
 * @param {string} params.message - Warning message
 * @param {number} [params.line] - Line number in GEDCOM file
 * @param {string} [params.gedcomId] - GEDCOM ID
 * @param {string} [params.individualName] - Individual's name
 * @param {string} [params.field] - Field that caused the warning
 * @param {string} [params.suggestedFix] - Suggested fix
 * @returns {Object} Structured warning object
 */
export function createValidationWarning({
  message,
  line = null,
  gedcomId = null,
  individualName = null,
  field = null,
  suggestedFix = null
}) {
  return {
    severity: ErrorSeverity.WARNING,
    code: ErrorCodes.VALIDATION_WARNING,
    message,
    line,
    gedcomId,
    individualName,
    field,
    suggestedFix,
    timestamp: new Date()
  }
}

/**
 * Formats an error object into a user-friendly message
 *
 * @param {Object} error - Error object from createImportError
 * @returns {string} Formatted error message
 */
export function formatErrorMessage(error) {
  const parts = []

  // Add context about where the error occurred
  if (error.gedcomId) {
    // Extract number and remove leading zeros
    const individualNum = error.gedcomId.replace(/[@I]/g, '').replace(/^0+/, '')
    parts.push(`Import failed at individual #${individualNum}`)
  }

  if (error.line) {
    parts.push(`Line ${error.line} in GEDCOM file`)
  }

  if (error.individualName && error.gedcomId) {
    parts.push(`Individual: ${error.individualName} (${error.gedcomId})`)
  } else if (error.individualName) {
    parts.push(`Individual: ${error.individualName}`)
  } else if (error.gedcomId) {
    parts.push(`GEDCOM ID: ${error.gedcomId}`)
  }

  if (error.field) {
    parts.push(`Field: ${error.field}`)
  }

  // Add the main error message
  if (error.code === ErrorCodes.CONSTRAINT_VIOLATION) {
    parts.push(`Database constraint violation: ${error.message}`)
  } else {
    parts.push(`Error: ${error.message}`)
  }

  // Add suggested fix if available
  if (error.suggestedFix) {
    parts.push(`Suggested fix: ${error.suggestedFix}`)
  }

  return parts.join('\n')
}

/**
 * Generates a CSV file content from an array of errors/warnings
 *
 * CSV Format:
 * Severity,Line,GEDCOM ID,Name,Field,Error,Suggested Fix
 *
 * @param {Array<Object>} errors - Array of error/warning objects
 * @returns {string} CSV file content
 */
export function generateErrorLogCSV(errors) {
  const headers = ['Severity', 'Line', 'GEDCOM ID', 'Name', 'Field', 'Error', 'Suggested Fix']
  const rows = [headers]

  for (const error of errors) {
    const row = [
      error.severity || '',
      error.line !== null ? String(error.line) : '',
      error.gedcomId || '',
      error.individualName || '',
      error.field || '',
      error.message || '',
      error.suggestedFix || ''
    ]

    // Escape CSV fields (handle commas and quotes)
    const escapedRow = row.map(field => escapeCSVField(field))
    rows.push(escapedRow)
  }

  return rows.map(row => row.join(',')).join('\n')
}

/**
 * Escapes a CSV field (handles commas and quotes)
 *
 * @private
 * @param {string} field - Field to escape
 * @returns {string} Escaped field
 */
function escapeCSVField(field) {
  if (!field) {
    return ''
  }

  const stringField = String(field)

  // If field contains comma, quote, newline, or colon, wrap in quotes
  if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n') || stringField.includes(':')) {
    // Escape quotes by doubling them
    const escaped = stringField.replace(/"/g, '""')
    return `"${escaped}"`
  }

  return stringField
}
