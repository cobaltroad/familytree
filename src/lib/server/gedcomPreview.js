/**
 * GEDCOM Preview Module
 * Story #94: Preview GEDCOM Data Before Import
 *
 * Provides functions to store, retrieve, and manage preview data for GEDCOM imports
 */

// In-memory storage for preview data (will be replaced with database in production)
// Structure: Map<uploadId, Map<userId, PreviewData>>
const previewDataStore = new Map()

/**
 * Stores preview data for a GEDCOM upload
 *
 * @param {string} uploadId - Upload ID
 * @param {number} userId - User ID
 * @param {Object} parsedData - Parsed GEDCOM data (individuals, families)
 * @param {Array} duplicates - Array of duplicate matches
 * @returns {Promise<Object>} Result with success status
 */
export async function storePreviewData(uploadId, userId, parsedData, duplicates) {
  try {
    // Create a map of gedcom IDs to duplicate information
    const duplicateMap = new Map()
    for (const dup of duplicates) {
      duplicateMap.set(dup.gedcomPerson.id, {
        existingPersonId: dup.existingPerson.id,
        confidence: dup.confidence,
        matchingFields: dup.matchingFields
      })
    }

    // Process individuals and add status
    const individualsWithStatus = parsedData.individuals.map(individual => {
      const isDuplicate = duplicateMap.has(individual.id)

      return {
        gedcomId: individual.id,
        name: individual.name || `${individual.firstName || ''} ${individual.lastName || ''}`.trim(),
        firstName: individual.firstName,
        lastName: individual.lastName,
        birthDate: individual.birthDate,
        deathDate: individual.deathDate,
        sex: individual.sex,
        status: isDuplicate ? 'duplicate' : 'new',
        duplicateMatch: isDuplicate ? duplicateMap.get(individual.id) : undefined,
        // Keep original data for relationships
        _original: individual
      }
    })

    // Calculate summary statistics
    const summary = {
      totalIndividuals: individualsWithStatus.length,
      newCount: individualsWithStatus.filter(i => i.status === 'new').length,
      duplicateCount: individualsWithStatus.filter(i => i.status === 'duplicate').length,
      existingCount: 0 // Will be updated when resolution decisions are made
    }

    // Store preview data
    const previewData = {
      uploadId,
      userId,
      individuals: individualsWithStatus,
      families: parsedData.families || [],
      duplicates,
      summary,
      resolutionDecisions: []
    }

    // Create nested map structure if needed
    if (!previewDataStore.has(uploadId)) {
      previewDataStore.set(uploadId, new Map())
    }

    previewDataStore.get(uploadId).set(userId, previewData)

    return {
      success: true,
      uploadId
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Retrieves preview data for a GEDCOM upload
 *
 * @param {string} uploadId - Upload ID
 * @param {number} userId - User ID
 * @returns {Promise<Object|null>} Preview data or null if not found
 */
export async function getPreviewData(uploadId, userId) {
  const uploadData = previewDataStore.get(uploadId)
  if (!uploadData) {
    return null
  }

  const previewData = uploadData.get(userId)
  return previewData || null
}

/**
 * Gets paginated, sorted, and filtered individuals from preview data
 *
 * @param {string} uploadId - Upload ID
 * @param {number} userId - User ID
 * @param {Object} options - Query options (page, limit, sortBy, sortOrder, search)
 * @returns {Promise<Object>} Paginated individuals with metadata
 */
export async function getPreviewIndividuals(uploadId, userId, options = {}) {
  const previewData = await getPreviewData(uploadId, userId)
  if (!previewData) {
    return null
  }

  const {
    page = 1,
    limit = 50,
    sortBy = 'name',
    sortOrder = 'asc',
    search = ''
  } = options

  let individuals = [...previewData.individuals]

  // Filter by search term
  if (search) {
    const searchLower = search.toLowerCase()
    individuals = individuals.filter(person => {
      const name = person.name?.toLowerCase() || ''
      const firstName = person.firstName?.toLowerCase() || ''
      const lastName = person.lastName?.toLowerCase() || ''

      return name.includes(searchLower) ||
             firstName.includes(searchLower) ||
             lastName.includes(searchLower)
    })
  }

  // Sort individuals
  individuals.sort((a, b) => {
    let aVal, bVal

    if (sortBy === 'name') {
      aVal = a.name || ''
      bVal = b.name || ''
    } else if (sortBy === 'birthDate') {
      aVal = a.birthDate || ''
      bVal = b.birthDate || ''
    } else if (sortBy === 'deathDate') {
      aVal = a.deathDate || ''
      bVal = b.deathDate || ''
    } else {
      aVal = a[sortBy] || ''
      bVal = b[sortBy] || ''
    }

    if (sortOrder === 'asc') {
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0
    } else {
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0
    }
  })

  // Calculate pagination
  const total = individuals.length
  const totalPages = Math.ceil(total / limit)
  const offset = (page - 1) * limit
  const paginatedIndividuals = individuals.slice(offset, offset + limit)

  return {
    individuals: paginatedIndividuals,
    pagination: {
      page,
      limit,
      total,
      totalPages
    }
  }
}

/**
 * Gets details for a specific person with relationships
 *
 * @param {string} uploadId - Upload ID
 * @param {number} userId - User ID
 * @param {string} gedcomId - GEDCOM ID of the person
 * @returns {Promise<Object|null>} Person details with relationships or null
 */
export async function getPreviewPerson(uploadId, userId, gedcomId) {
  const previewData = await getPreviewData(uploadId, userId)
  if (!previewData) {
    return null
  }

  const person = previewData.individuals.find(p => p.gedcomId === gedcomId)
  if (!person) {
    return null
  }

  // Build relationships
  const relationships = {
    parents: [],
    spouses: [],
    children: []
  }

  const originalPerson = person._original

  // Find parents from childOfFamily
  if (originalPerson.childOfFamily) {
    const parentFamily = previewData.families.find(f => f.id === originalPerson.childOfFamily)
    if (parentFamily) {
      if (parentFamily.husband) {
        const father = previewData.individuals.find(p => p.gedcomId === parentFamily.husband)
        if (father) {
          relationships.parents.push({
            gedcomId: father.gedcomId,
            name: father.name,
            birthDate: father.birthDate,
            deathDate: father.deathDate,
            relationshipType: 'father'
          })
        }
      }
      if (parentFamily.wife) {
        const mother = previewData.individuals.find(p => p.gedcomId === parentFamily.wife)
        if (mother) {
          relationships.parents.push({
            gedcomId: mother.gedcomId,
            name: mother.name,
            birthDate: mother.birthDate,
            deathDate: mother.deathDate,
            relationshipType: 'mother'
          })
        }
      }
    }
  }

  // Find spouses and children from spouseFamilies
  if (originalPerson.spouseFamilies) {
    for (const familyId of originalPerson.spouseFamilies) {
      const family = previewData.families.find(f => f.id === familyId)
      if (family) {
        // Find spouse
        const spouseId = family.husband === gedcomId ? family.wife : family.husband
        if (spouseId) {
          const spouse = previewData.individuals.find(p => p.gedcomId === spouseId)
          if (spouse) {
            relationships.spouses.push({
              gedcomId: spouse.gedcomId,
              name: spouse.name,
              birthDate: spouse.birthDate,
              deathDate: spouse.deathDate
            })
          }
        }

        // Find children
        if (family.children) {
          for (const childId of family.children) {
            const child = previewData.individuals.find(p => p.gedcomId === childId)
            if (child) {
              relationships.children.push({
                gedcomId: child.gedcomId,
                name: child.name,
                birthDate: child.birthDate,
                deathDate: child.deathDate
              })
            }
          }
        }
      }
    }
  }

  return {
    person: {
      gedcomId: person.gedcomId,
      name: person.name,
      firstName: person.firstName,
      lastName: person.lastName,
      birthDate: person.birthDate,
      deathDate: person.deathDate,
      sex: person.sex,
      status: person.status,
      duplicateMatch: person.duplicateMatch
    },
    relationships
  }
}

/**
 * Gets tree structure from preview data
 *
 * @param {string} uploadId - Upload ID
 * @param {number} userId - User ID
 * @returns {Promise<Object|null>} Tree structure with individuals and relationships
 */
export async function getPreviewTree(uploadId, userId) {
  const previewData = await getPreviewData(uploadId, userId)
  if (!previewData) {
    return null
  }

  // Convert individuals to tree format (without _original)
  const individuals = previewData.individuals.map(p => ({
    gedcomId: p.gedcomId,
    name: p.name,
    firstName: p.firstName,
    lastName: p.lastName,
    birthDate: p.birthDate,
    deathDate: p.deathDate,
    sex: p.sex,
    status: p.status
  }))

  // Convert families to relationships
  const relationships = []

  for (const family of previewData.families) {
    // Add spouse relationship
    if (family.husband && family.wife) {
      relationships.push({
        type: 'spouse',
        person1: family.husband,
        person2: family.wife
      })
    }

    // Add parent-child relationships
    if (family.children) {
      for (const childId of family.children) {
        if (family.husband) {
          relationships.push({
            type: 'parent',
            parent: family.husband,
            child: childId,
            parentRole: 'father'
          })
        }
        if (family.wife) {
          relationships.push({
            type: 'parent',
            parent: family.wife,
            child: childId,
            parentRole: 'mother'
          })
        }
      }
    }
  }

  return {
    individuals,
    relationships
  }
}

/**
 * Gets summary statistics for preview data
 *
 * @param {string} uploadId - Upload ID
 * @param {number} userId - User ID
 * @returns {Promise<Object|null>} Summary statistics or null
 */
export async function getPreviewSummary(uploadId, userId) {
  const previewData = await getPreviewData(uploadId, userId)
  if (!previewData) {
    return null
  }

  return previewData.summary
}

/**
 * Saves resolution decisions for duplicate individuals
 *
 * @param {string} uploadId - Upload ID
 * @param {number} userId - User ID
 * @param {Array} decisions - Array of resolution decisions
 * @returns {Promise<Object>} Result with success status
 */
export async function saveResolutionDecisions(uploadId, userId, decisions) {
  const previewData = await getPreviewData(uploadId, userId)
  if (!previewData) {
    throw new Error('Preview data not found')
  }

  // Validate resolution options
  const validResolutions = ['merge', 'import_as_new', 'skip']

  for (const decision of decisions) {
    if (!validResolutions.includes(decision.resolution)) {
      throw new Error(`Invalid resolution option: ${decision.resolution}`)
    }
  }

  // Store decisions
  previewData.resolutionDecisions = decisions

  // Update summary counts based on decisions
  let existingCount = 0
  for (const decision of decisions) {
    if (decision.resolution === 'skip') {
      existingCount++
    }
  }

  previewData.summary.existingCount = existingCount

  return {
    success: true,
    saved: decisions.length
  }
}

/**
 * Gets saved resolution decisions
 *
 * @param {string} uploadId - Upload ID
 * @param {number} userId - User ID
 * @returns {Promise<Array>} Array of resolution decisions
 */
export async function getResolutionDecisions(uploadId, userId) {
  const previewData = await getPreviewData(uploadId, userId)
  if (!previewData) {
    return []
  }

  return previewData.resolutionDecisions || []
}

/**
 * Clears preview data for a specific upload
 *
 * @param {string} uploadId - Upload ID
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Result with success status
 */
export async function clearPreviewData(uploadId, userId) {
  const uploadData = previewDataStore.get(uploadId)
  if (uploadData) {
    uploadData.delete(userId)

    // Clean up empty upload maps
    if (uploadData.size === 0) {
      previewDataStore.delete(uploadId)
    }
  }

  return {
    success: true
  }
}
