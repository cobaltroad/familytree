const API_BASE = '/api'

export const api = {
  async getAllPeople() {
    const response = await fetch(`${API_BASE}/people`)
    if (!response.ok) throw new Error('Failed to fetch people')
    return response.json()
  },

  async getPerson(id) {
    const response = await fetch(`${API_BASE}/people/${id}`)
    if (!response.ok) throw new Error('Failed to fetch person')
    return response.json()
  },

  async createPerson(person) {
    const response = await fetch(`${API_BASE}/people`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(person)
    })
    if (!response.ok) throw new Error('Failed to create person')
    return response.json()
  },

  async updatePerson(id, person) {
    const response = await fetch(`${API_BASE}/people/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(person)
    })
    if (!response.ok) throw new Error('Failed to update person')
    return response.json()
  },

  async deletePerson(id) {
    const response = await fetch(`${API_BASE}/people/${id}`, {
      method: 'DELETE'
    })
    if (!response.ok) throw new Error('Failed to delete person')
  },

  async getAllRelationships() {
    const response = await fetch(`${API_BASE}/relationships`)
    if (!response.ok) throw new Error('Failed to fetch relationships')
    return response.json()
  },

  async createRelationship(relationship) {
    const response = await fetch(`${API_BASE}/relationships`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(relationship)
    })
    if (!response.ok) throw new Error('Failed to create relationship')
    return response.json()
  },

  async deleteRelationship(id) {
    const response = await fetch(`${API_BASE}/relationships/${id}`, {
      method: 'DELETE'
    })
    if (!response.ok) throw new Error('Failed to delete relationship')
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
  }
}
