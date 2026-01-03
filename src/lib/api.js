const API_BASE = '/api'

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
    const response = await fetch(`${API_BASE}/people`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(person)
    })
    if (!response.ok) throw await createApiError(response, 'Failed to create person')
    return response.json()
  },

  async updatePerson(id, person) {
    const response = await fetch(`${API_BASE}/people/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(person)
    })
    if (!response.ok) throw await createApiError(response, 'Failed to update person')
    return response.json()
  },

  async deletePerson(id) {
    const response = await fetch(`${API_BASE}/people/${id}`, {
      method: 'DELETE'
    })
    if (!response.ok) throw await createApiError(response, 'Failed to delete person')
  },

  async getAllRelationships() {
    const response = await fetch(`${API_BASE}/relationships`)
    if (!response.ok) throw await createApiError(response, 'Failed to fetch relationships')
    return response.json()
  },

  async createRelationship(relationship) {
    const response = await fetch(`${API_BASE}/relationships`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(relationship)
    })
    if (!response.ok) throw await createApiError(response, 'Failed to create relationship')
    return response.json()
  },

  async deleteRelationship(id) {
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
  }
}
