const API_BASE = '/api'

/**
 * Checks if the application is running in viewer mode (static site)
 * Story #148: Static Data Loader
 *
 * @returns {boolean} True if viewer mode is enabled
 */
function isViewerMode() {
  return import.meta.env.VITE_VIEWER_MODE === 'true'
}

/**
 * Loads data from static JSON file
 * Story #148: Static Data Loader
 *
 * @param {string} filename - Name of JSON file (e.g., 'people.json')
 * @returns {Promise<Array>} Parsed JSON data
 * @throws {Error} If file not found, invalid JSON, or network error
 */
async function loadStaticData(filename) {
  try {
    const response = await fetch(`/data/${filename}`)

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Failed to load static data: ${filename} not found`)
      }
      throw new Error(`Failed to load static data: ${filename}`)
    }

    try {
      return await response.json()
    } catch (jsonError) {
      throw new Error(`Invalid JSON format in ${filename}`)
    }
  } catch (error) {
    // Re-throw our custom errors
    if (error.message.includes('Failed to load') || error.message.includes('Invalid JSON')) {
      throw error
    }
    // Wrap network errors with context
    throw new Error(`Failed to fetch ${filename}: ${error.message}`)
  }
}

/**
 * Creates an error object with HTTP status code attached
 * This allows the UI to handle different error types appropriately
 *
 * @param {Response} response - Fetch response object
 * @param {string} defaultMessage - Default error message
 * @returns {Promise<Error>} Error object with status property
 */
async function createApiError(response, defaultMessage) {
  let errorMessage = defaultMessage
  try {
    // Try to get error message from response body
    const text = await response.text()
    if (text) {
      errorMessage = text
    }
  } catch (e) {
    // If we can't read the response body, use default message
  }

  const error = new Error(errorMessage)
  error.status = response.status
  return error
}

export const api = {
  async getAllPeople() {
    // Story #148: Load from static JSON in viewer mode
    if (isViewerMode()) {
      return loadStaticData('people.json')
    }

    const response = await fetch(`${API_BASE}/people`)
    if (!response.ok) throw await createApiError(response, 'Failed to fetch people')
    return response.json()
  },

  async getPerson(id) {
    const response = await fetch(`${API_BASE}/people/${id}`)
    if (!response.ok) throw await createApiError(response, 'Failed to fetch person')
    return response.json()
  },

  async createPerson(person) {
    // Story #148: Block write operations in viewer mode
    if (isViewerMode()) {
      throw new Error('Cannot create person in viewer mode (read-only)')
    }

    const response = await fetch(`${API_BASE}/people`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(person)
    })
    if (!response.ok) throw await createApiError(response, 'Failed to create person')
    return response.json()
  },

  async updatePerson(id, person) {
    // Story #148: Block write operations in viewer mode
    if (isViewerMode()) {
      throw new Error('Cannot update person in viewer mode (read-only)')
    }

    const response = await fetch(`${API_BASE}/people/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(person)
    })
    if (!response.ok) throw await createApiError(response, 'Failed to update person')
    return response.json()
  },

  async deletePerson(id) {
    // Story #148: Block write operations in viewer mode
    if (isViewerMode()) {
      throw new Error('Cannot delete person in viewer mode (read-only)')
    }

    const response = await fetch(`${API_BASE}/people/${id}`, {
      method: 'DELETE'
    })
    if (!response.ok) throw await createApiError(response, 'Failed to delete person')
  },

  async getAllRelationships() {
    // Story #148: Load from static JSON in viewer mode
    if (isViewerMode()) {
      return loadStaticData('relationships.json')
    }

    const response = await fetch(`${API_BASE}/relationships`)
    if (!response.ok) throw await createApiError(response, 'Failed to fetch relationships')
    return response.json()
  },

  async createRelationship(relationship) {
    // Story #148: Block write operations in viewer mode
    if (isViewerMode()) {
      throw new Error('Cannot create relationship in viewer mode (read-only)')
    }

    const response = await fetch(`${API_BASE}/relationships`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(relationship)
    })
    if (!response.ok) throw await createApiError(response, 'Failed to create relationship')
    return response.json()
  },

  async deleteRelationship(id) {
    // Story #148: Block write operations in viewer mode
    if (isViewerMode()) {
      throw new Error('Cannot delete relationship in viewer mode (read-only)')
    }

    const response = await fetch(`${API_BASE}/relationships/${id}`, {
      method: 'DELETE'
    })
    if (!response.ok) throw await createApiError(response, 'Failed to delete relationship')
  },

  /**
   * Fetches Facebook profile data for import
   * Stories #78 and #80: Facebook Profile Picture Import and Data Pre-population
   *
   * @param {string} facebookUrl - Facebook profile URL, user ID, or username
   * @returns {Promise<Object>} Person data ready for form pre-population
   * @throws {Error} If request fails
   *
   * @example
   * const personData = await api.fetchFacebookProfile('facebook.com/zuck')
   * // Returns: { firstName, lastName, birthDate, gender, photoUrl }
   */
  async fetchFacebookProfile(facebookUrl) {
    const response = await fetch(`${API_BASE}/facebook/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ facebookUrl })
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to fetch Facebook profile')
    }
    const data = await response.json()
    return data.personData
  },

  /**
   * Updates current user's settings
   *
   * @param {Object} settings - Settings object
   * @param {boolean} settings.viewAllRecords - Feature flag to bypass data isolation
   * @returns {Promise<Object>} Updated settings
   * @throws {Error} If request fails
   *
   * @example
   * const settings = await api.updateUserSettings({ viewAllRecords: true })
   * // Returns: { viewAllRecords: true }
   */
  async updateUserSettings(settings) {
    const response = await fetch(`${API_BASE}/user/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    })
    if (!response.ok) throw await createApiError(response, 'Failed to update user settings')
    return response.json()
  },

  /**
   * Uploads a GEDCOM file for import processing
   * Story #102: GEDCOM Upload UI Component
   *
   * @param {File} file - GEDCOM file to upload
   * @param {Function} onProgress - Progress callback (receives percentage 0-100)
   * @param {AbortController} abortController - Optional abort controller for cancellation
   * @returns {Promise<Object>} Upload metadata with uploadId, fileName, fileSize
   * @throws {Error} If upload fails
   *
   * @example
   * const result = await api.uploadGedcomFile(
   *   file,
   *   (progress) => console.log(`${progress}% complete`),
   *   abortController
   * )
   * // Returns: { uploadId: 'upload-123', fileName: 'family.ged', fileSize: 1024 }
   */
  async uploadGedcomFile(file, onProgress, abortController) {
    const formData = new FormData()
    formData.append('file', file)

    // Create XMLHttpRequest for progress tracking
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const percentComplete = (event.loaded / event.total) * 100
          onProgress(Math.round(percentComplete))
        }
      })

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText)
            resolve(response)
          } catch (error) {
            reject(new Error('Invalid response from server'))
          }
        } else {
          const error = new Error(xhr.responseText || 'Upload failed')
          error.status = xhr.status
          reject(error)
        }
      })

      // Handle errors
      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'))
      })

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload cancelled'))
      })

      // Set up abort controller
      if (abortController) {
        abortController.signal.addEventListener('abort', () => {
          xhr.abort()
        })
      }

      // Send request
      xhr.open('POST', `${API_BASE}/gedcom/upload`)
      xhr.send(formData)
    })
  },

  /**
   * Parses a GEDCOM file and returns validation results
   * Story #103: GEDCOM Parsing Results Display
   *
   * @param {string} uploadId - Upload identifier from upload response
   * @returns {Promise<Object>} Parsing results with statistics, errors, duplicates
   * @throws {Error} If parsing fails
   *
   * @example
   * const results = await api.parseGedcom('upload-123')
   * // Returns: { uploadId, version, statistics, errors, duplicates, relationshipIssues }
   */
  async parseGedcom(uploadId) {
    const response = await fetch(`${API_BASE}/gedcom/parse/${uploadId}`, {
      method: 'POST'
    })
    if (!response.ok) throw await createApiError(response, 'Failed to parse GEDCOM file')
    return response.json()
  },

  /**
   * Gets the current parsing status for a GEDCOM file
   * Story #103: GEDCOM Parsing Results Display
   *
   * @param {string} uploadId - Upload identifier
   * @returns {Promise<Object>} Status object with status and progress
   * @throws {Error} If request fails
   *
   * @example
   * const status = await api.getParseStatus('upload-123')
   * // Returns: { status: 'parsing', progress: 45 } or { status: 'complete' }
   */
  async getParseStatus(uploadId) {
    const response = await fetch(`${API_BASE}/gedcom/parse/${uploadId}/status`)
    if (!response.ok) throw await createApiError(response, 'Failed to get parse status')
    return response.json()
  },

  /**
   * Gets paginated, sorted, and filtered individuals from GEDCOM preview data
   * Story #104: GEDCOM Preview Interface with Individuals Table
   *
   * @param {string} uploadId - Upload identifier
   * @param {Object} options - Query options
   * @param {number} options.page - Page number (default: 1)
   * @param {number} options.limit - Items per page (default: 50)
   * @param {string} options.sortBy - Sort field (name, birthDate, deathDate)
   * @param {string} options.sortOrder - Sort direction (asc, desc)
   * @param {string} options.search - Filter by name (case-insensitive)
   * @returns {Promise<Object>} Paginated individuals with statistics
   * @throws {Error} If request fails
   *
   * @example
   * const data = await api.getGedcomPreviewIndividuals('upload-123', {
   *   page: 1,
   *   limit: 50,
   *   sortBy: 'name',
   *   sortOrder: 'asc',
   *   search: ''
   * })
   * // Returns: { individuals: [...], pagination: {...}, statistics: {...} }
   */
  async getGedcomPreviewIndividuals(uploadId, options = {}) {
    const params = new URLSearchParams({
      page: options.page || 1,
      limit: options.limit || 50,
      sortBy: options.sortBy || 'name',
      sortOrder: options.sortOrder || 'asc',
      search: options.search || ''
    })

    const response = await fetch(`${API_BASE}/gedcom/preview/${uploadId}/individuals?${params}`)
    if (!response.ok) throw await createApiError(response, 'Failed to fetch preview individuals')
    return response.json()
  },

  /**
   * Gets detailed information about a specific person from GEDCOM preview data
   * Story #104: GEDCOM Preview Interface with Individuals Table
   *
   * @param {string} uploadId - Upload identifier
   * @param {string} gedcomId - GEDCOM identifier (e.g., @I1@)
   * @returns {Promise<Object>} Person details with relationships
   * @throws {Error} If request fails
   *
   * @example
   * const person = await api.getGedcomPreviewPerson('upload-123', '@I1@')
   * // Returns: { gedcomId, name, birthDate, deathDate, gender, photoUrl, status, relationships: {...} }
   */
  async getGedcomPreviewPerson(uploadId, gedcomId) {
    const response = await fetch(`${API_BASE}/gedcom/preview/${uploadId}/person/${gedcomId}`)
    if (!response.ok) throw await createApiError(response, 'Failed to fetch person details')
    return response.json()
  },

  /**
   * Gets duplicate individuals from GEDCOM preview data
   * Story #106: GEDCOM Duplicate Resolution UI
   *
   * @param {string} uploadId - Upload identifier
   * @returns {Promise<Object>} Duplicates array with comparison data
   * @throws {Error} If request fails
   *
   * @example
   * const data = await api.getGedcomPreviewDuplicates('upload-123')
   * // Returns: { duplicates: [{ gedcomPerson: {...}, existingPerson: {...}, confidence: 95, matchingFields: {...} }] }
   */
  async getGedcomPreviewDuplicates(uploadId) {
    const response = await fetch(`${API_BASE}/gedcom/preview/${uploadId}/duplicates`)
    if (!response.ok) throw await createApiError(response, 'Failed to fetch duplicates')
    return response.json()
  },

  /**
   * Saves resolution decisions for duplicate individuals
   * Story #106: GEDCOM Duplicate Resolution UI
   *
   * @param {string} uploadId - Upload identifier
   * @param {Array} resolutions - Array of resolution decisions
   * @returns {Promise<Object>} Result with success status
   * @throws {Error} If request fails
   *
   * @example
   * await api.saveGedcomDuplicateResolutions('upload-123', [
   *   { gedcomId: '@I001@', resolution: 'merge' },
   *   { gedcomId: '@I002@', resolution: 'import_as_new' }
   * ])
   */
  async saveGedcomDuplicateResolutions(uploadId, resolutions) {
    const response = await fetch(`${API_BASE}/gedcom/preview/${uploadId}/duplicates/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decisions: resolutions })
    })
    if (!response.ok) throw await createApiError(response, 'Failed to save resolution decisions')
    return response.json()
  },

  /**
   * Imports GEDCOM data into user's family tree
   * Story #107: GEDCOM Import Progress and Confirmation
   *
   * @param {string} uploadId - Upload identifier
   * @param {Object} options - Import options
   * @param {boolean} options.importAll - Import all individuals (default: true)
   * @param {string[]} options.selectedIds - Specific GEDCOM IDs to import (optional)
   * @returns {Promise<Object>} Import results with statistics or error
   * @throws {Error} If request fails
   *
   * @example
   * const result = await api.importGedcom('upload-123', { importAll: true })
   * // Returns: { success: true, imported: { persons: 125, updated: 5, relationships: 150 } }
   * // Or on error: { success: false, error: { code, message, details, canRetry, errorLogUrl } }
   */
  async importGedcom(uploadId, options = {}) {
    const response = await fetch(`${API_BASE}/gedcom/import/${uploadId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        importAll: options.importAll !== undefined ? options.importAll : true,
        selectedIds: options.selectedIds || []
      })
    })

    // Parse response (both success and error responses are JSON)
    const data = await response.json()

    // For error responses, throw an error with the data attached
    if (!response.ok || !data.success) {
      const error = new Error(data.error?.message || 'Import failed')
      error.status = response.status
      error.data = data
      throw error
    }

    return data
  },

  /**
   * Exports family tree as GEDCOM file
   * Story #96: Export Family Tree as GEDCOM
   *
   * @param {string} format - GEDCOM version ("5.5.1" or "7.0")
   * @returns {Promise<void>} Triggers file download in browser
   * @throws {Error} If request fails
   *
   * @example
   * await api.exportGedcom('5.5.1')
   * // Browser downloads: familytree_20260109.ged
   *
   * @example
   * await api.exportGedcom('7.0')
   * // Downloads GEDCOM 7.0 format file
   */
  async exportGedcom(format = '5.5.1') {
    const response = await fetch(`${API_BASE}/gedcom/export?format=${format}`)
    if (!response.ok) throw await createApiError(response, 'Failed to export GEDCOM file')

    // Get filename from Content-Disposition header
    const contentDisposition = response.headers.get('Content-Disposition')
    let filename = 'familytree.ged'

    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="([^"]+)"/)
      if (filenameMatch) {
        filename = filenameMatch[1]
      }
    }

    // Get GEDCOM content
    const blob = await response.blob()

    // Create download link and trigger download
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()

    // Cleanup
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  },

  /**
   * Merges two people with relationship transfer
   * Story #110: Execute Person Merge with Relationship Transfer
   *
   * @param {number} sourceId - ID of source person (will be deleted)
   * @param {number} targetId - ID of target person (will receive merged data)
   * @returns {Promise<Object>} Merge result with success status and details
   * @throws {Error} If request fails or validation fails
   *
   * @example
   * const result = await api.mergePerson(15, 27)
   * // Returns: { success: true, targetId: 27, sourceId: 15, relationshipsTransferred: 3, mergedData: {...} }
   */
  async mergePerson(sourceId, targetId) {
    const response = await fetch(`${API_BASE}/people/merge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceId, targetId })
    })
    if (!response.ok) throw await createApiError(response, 'Failed to merge people')
    return response.json()
  },

  /**
   * Detects duplicate people within user's records
   * Story #111: Duplicate Detection UI Component
   *
   * @param {Object} options - Query options
   * @param {number} options.threshold - Confidence threshold (0-100, default: 70)
   * @param {number} options.limit - Maximum number of duplicate pairs to return (optional)
   * @returns {Promise<Array>} Array of duplicate pairs with confidence scores
   * @throws {Error} If request fails
   *
   * @example
   * const duplicates = await api.getPeopleDuplicates()
   * // Returns: [{ person1: {...}, person2: {...}, confidence: 92, matchingFields: ['name', 'birthDate'] }]
   */
  async getPeopleDuplicates(options = {}) {
    const params = new URLSearchParams()

    if (options.threshold !== undefined) {
      params.append('threshold', options.threshold)
    }

    if (options.limit !== undefined) {
      params.append('limit', options.limit)
    }

    const queryString = params.toString()
    const url = queryString ? `${API_BASE}/people/duplicates?${queryString}` : `${API_BASE}/people/duplicates`

    const response = await fetch(url)
    if (!response.ok) throw await createApiError(response, 'Failed to fetch duplicates')
    return response.json()
  },
  
  /**
   * Updates the authenticated user's default person ID
   * Issue #129: Set Person as My Profile from PersonModal
   *
   * @param {number|null} personId - ID of person to set as default, or null to unset
   * @returns {Promise<Object>} Result with success status and personId
   * @throws {Error} If request fails or user is not authenticated
   *
   * @example
   * // Set person 5 as default
   * const result = await api.updateDefaultPerson(5)
   * // Returns: { success: true, personId: 5 }
   *
   * @example
   * // Unset default person
   * const result = await api.updateDefaultPerson(null)
   * // Returns: { success: true, personId: null }
   */
  async updateDefaultPerson(personId) {
    const response = await fetch(`${API_BASE}/user/default-person`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personId })
    })
    if (!response.ok) throw await createApiError(response, 'Failed to update default person')
    return response.json()
  }
}
