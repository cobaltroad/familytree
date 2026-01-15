/**
 * Merge Preview and Validation Module
 * Story #109: Merge Preview and Validation
 *
 * Provides functions to preview and validate merging two people
 */

/**
 * Selects the best value between source and target values
 *
 * Strategy:
 * 1. Non-null wins over null
 * 2. More specific date wins (1950-03-15 > 1950)
 * 3. Longer string wins (assumes more complete)
 * 4. Default to target (existing record preserved)
 *
 * @param {*} sourceValue - Value from source person
 * @param {*} targetValue - Value from target person
 * @returns {*} The best value
 */
export function selectBestValue(sourceValue, targetValue) {
  // Handle null and empty string edge cases
  if (sourceValue === null && targetValue === null) return null
  if (sourceValue === '' && targetValue === '') return ''
  if (sourceValue === '' && targetValue === null) return null
  if (sourceValue === null && targetValue === '') return ''

  // Non-null wins over null
  if (sourceValue && !targetValue) return sourceValue
  if (!sourceValue && targetValue) return targetValue

  // Both are truthy - need to determine which is better
  const sourceStr = String(sourceValue)
  const targetStr = String(targetValue)

  // Check if they're dates (contain hyphens and start with 4 digits)
  const isSourceDate = /^\d{4}(-\d{2})?(-\d{2})?$/.test(sourceStr)
  const isTargetDate = /^\d{4}(-\d{2})?(-\d{2})?$/.test(targetStr)

  if (isSourceDate && isTargetDate) {
    // More specific date wins (longer = more specific)
    if (sourceStr.length > targetStr.length) return sourceValue
    if (targetStr.length > sourceStr.length) return targetValue
  }

  // Longer string wins (assumes more complete)
  if (sourceStr.length > targetStr.length) return sourceValue
  if (targetStr.length > sourceStr.length) return targetValue

  // Default to target (existing record preserved)
  return targetValue
}

/**
 * Validates whether two people can be merged
 *
 * Validation rules:
 * 1. Same user_id required
 * 2. Gender must match or one must be "unspecified" or null
 * 3. Cannot merge if source is user's defaultPersonId
 * 4. Cannot merge if target is user's defaultPersonId
 *
 * @param {Object} source - Source person
 * @param {Object} target - Target person
 * @param {Object} user - Current user with defaultPersonId
 * @returns {Object} Validation result { canMerge, errors }
 */
export function validateMerge(source, target, user) {
  const errors = []

  // Check user_id match
  if (source.userId !== target.userId) {
    errors.push('Cannot merge records across different users')
  }

  // Check gender compatibility
  const sourceGender = source.gender
  const targetGender = target.gender

  // Genders must match, or one must be unspecified/null
  if (sourceGender && targetGender &&
      sourceGender !== 'unspecified' &&
      targetGender !== 'unspecified' &&
      sourceGender !== targetGender) {
    errors.push(`Gender mismatch: Cannot merge ${sourceGender} into ${targetGender}`)
  }

  // Check default person restrictions
  if (user.defaultPersonId === source.id) {
    errors.push('Cannot merge your profile person into another person')
  }

  if (user.defaultPersonId === target.id) {
    errors.push('Cannot merge into your profile person')
  }

  return {
    canMerge: errors.length === 0,
    errors
  }
}

/**
 * Detects relationship conflicts between source and target
 *
 * A conflict exists when both people have different parents (mother or father).
 * Returns an array of conflict types: ['mother', 'father']
 *
 * @param {number} sourceId - Source person ID
 * @param {number} targetId - Target person ID
 * @param {Array} sourceRelationships - Relationships for source person
 * @param {Array} targetRelationships - Relationships for target person
 * @returns {Array} Array of conflict field names
 */
export function detectRelationshipConflicts(sourceId, targetId, sourceRelationships, targetRelationships) {
  const conflicts = []

  // Find mother and father for source
  const sourceMother = sourceRelationships.find(
    rel => rel.person2Id === sourceId && rel.type === 'parentOf' && rel.parentRole === 'mother'
  )
  const sourceFather = sourceRelationships.find(
    rel => rel.person2Id === sourceId && rel.type === 'parentOf' && rel.parentRole === 'father'
  )

  // Find mother and father for target
  const targetMother = targetRelationships.find(
    rel => rel.person2Id === targetId && rel.type === 'parentOf' && rel.parentRole === 'mother'
  )
  const targetFather = targetRelationships.find(
    rel => rel.person2Id === targetId && rel.type === 'parentOf' && rel.parentRole === 'father'
  )

  // Check for mother conflict (both have different mothers)
  if (sourceMother && targetMother && sourceMother.person1Id !== targetMother.person1Id) {
    conflicts.push('mother')
  }

  // Check for father conflict (both have different fathers)
  if (sourceFather && targetFather && sourceFather.person1Id !== targetFather.person1Id) {
    conflicts.push('father')
  }

  return conflicts
}

/**
 * Generates a merge preview showing what will happen when merging two people
 *
 * @param {Object} source - Source person (will be deleted)
 * @param {Object} target - Target person (will receive merged data)
 * @param {Object} user - Current user with defaultPersonId
 * @param {Array} sourceRelationships - All relationships for source person
 * @param {Array} targetRelationships - All relationships for target person
 * @returns {Object} Merge preview with validation, merged data, and relationship info
 */
export function generateMergePreview(source, target, user, sourceRelationships, targetRelationships) {
  // Validate the merge
  const validation = validateMerge(source, target, user)

  // Detect relationship conflicts
  const conflictFields = detectRelationshipConflicts(source.id, target.id, sourceRelationships, targetRelationships)
  const warnings = []

  if (conflictFields.includes('mother')) {
    warnings.push('Both people have different mothers - merge will overwrite')
  }

  if (conflictFields.includes('father')) {
    warnings.push('Both people have different fathers - merge will overwrite')
  }

  validation.warnings = warnings
  validation.conflictFields = conflictFields

  // Generate merged data by selecting best values
  const merged = {
    id: target.id, // Target keeps its ID
    firstName: selectBestValue(source.firstName, target.firstName),
    lastName: selectBestValue(source.lastName, target.lastName),
    birthDate: selectBestValue(source.birthDate, target.birthDate),
    deathDate: selectBestValue(source.deathDate, target.deathDate),
    gender: selectBestValue(source.gender, target.gender),
    photoUrl: selectBestValue(source.photoUrl, target.photoUrl),
    birthSurname: selectBestValue(source.birthSurname, target.birthSurname),
    nickname: selectBestValue(source.nickname, target.nickname),
    userId: target.userId
  }

  // Build comparison table
  const comparison = {
    firstName: { source: source.firstName, target: target.firstName, merged: merged.firstName },
    lastName: { source: source.lastName, target: target.lastName, merged: merged.lastName },
    birthDate: { source: source.birthDate, target: target.birthDate, merged: merged.birthDate },
    deathDate: { source: source.deathDate, target: target.deathDate, merged: merged.deathDate },
    gender: { source: source.gender, target: target.gender, merged: merged.gender },
    photoUrl: { source: source.photoUrl, target: target.photoUrl, merged: merged.photoUrl },
    birthSurname: { source: source.birthSurname, target: target.birthSurname, merged: merged.birthSurname },
    nickname: { source: source.nickname, target: target.nickname, merged: merged.nickname }
  }

  // Identify relationships to transfer (all source relationships)
  const relationshipsToTransfer = sourceRelationships

  // Identify existing target relationships
  const existingRelationships = targetRelationships

  return {
    canMerge: validation.canMerge,
    validation,
    source: {
      id: source.id,
      firstName: source.firstName,
      lastName: source.lastName,
      birthDate: source.birthDate,
      deathDate: source.deathDate,
      gender: source.gender,
      photoUrl: source.photoUrl,
      birthSurname: source.birthSurname,
      nickname: source.nickname
    },
    target: {
      id: target.id,
      firstName: target.firstName,
      lastName: target.lastName,
      birthDate: target.birthDate,
      deathDate: target.deathDate,
      gender: target.gender,
      photoUrl: target.photoUrl,
      birthSurname: target.birthSurname,
      nickname: target.nickname
    },
    merged,
    comparison,
    relationshipsToTransfer,
    existingRelationships
  }
}
