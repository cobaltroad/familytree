/**
 * GEDCOM Parser Module
 * Story #93: GEDCOM File Parsing and Validation
 *
 * Provides functions to parse and validate GEDCOM files (5.5.1 and 7.0)
 */

import * as parseGedcomLib from 'parse-gedcom'

const SUPPORTED_VERSIONS = ['5.5.1', '7.0']
const MONTH_MAP = {
  JAN: '01',
  FEB: '02',
  MAR: '03',
  APR: '04',
  MAY: '05',
  JUN: '06',
  JUL: '07',
  AUG: '08',
  SEP: '09',
  OCT: '10',
  NOV: '11',
  DEC: '12'
}

/**
 * Detects the GEDCOM version from file content
 *
 * @param {string} content - GEDCOM file content
 * @returns {string|null} Version string (e.g., "5.5.1", "7.0") or null if not found
 */
export function detectGedcomVersion(content) {
  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Look for GEDC record
    if (line.match(/^1\s+GEDC/)) {
      // Next line should have VERS
      if (i + 1 < lines.length) {
        const versLine = lines[i + 1].trim()
        const match = versLine.match(/^2\s+VERS\s+(.+)/)

        if (match) {
          return match[1].trim()
        }
      }
    }
  }

  return null
}

/**
 * Validates whether a GEDCOM version is supported
 *
 * @param {string|null} version - GEDCOM version to validate
 * @returns {Object} Validation result with valid flag and optional error message
 */
export function validateGedcomVersion(version) {
  if (!version) {
    return {
      valid: false,
      error: 'GEDCOM version not found in file'
    }
  }

  if (!SUPPORTED_VERSIONS.includes(version)) {
    return {
      valid: false,
      error: `GEDCOM version ${version} is not supported. Please use version 5.5.1 or 7.0`
    }
  }

  return {
    valid: true
  }
}

/**
 * Normalizes a GEDCOM date to ISO format
 *
 * Handles various GEDCOM date formats:
 * - "DD MMM YYYY" -> "YYYY-MM-DD"
 * - "MMM YYYY" -> "YYYY-MM"
 * - "YYYY" -> "YYYY"
 * - "ABT YYYY" -> "YYYY" (with modifier)
 *
 * @param {string} gedcomDate - Date string from GEDCOM file
 * @returns {Object} Result with normalized date, original, validity, and metadata
 */
export function normalizeDate(gedcomDate) {
  if (!gedcomDate || typeof gedcomDate !== 'string') {
    return {
      valid: false,
      normalized: null,
      original: gedcomDate,
      error: 'Invalid date format'
    }
  }

  const trimmed = gedcomDate.trim()

  // Check if already in ISO format (GEDCOM 7.0)
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return {
      valid: true,
      normalized: trimmed,
      original: gedcomDate,
      partial: false
    }
  }

  // Extract modifier (ABT, BEF, AFT, etc.)
  const modifierMatch = trimmed.match(/^(ABT|BEF|AFT|BET|CAL|EST)\s+(.+)/)
  const modifier = modifierMatch ? modifierMatch[1] : null
  const dateStr = modifierMatch ? modifierMatch[2] : trimmed

  // Try to parse date components
  const parts = dateStr.split(/\s+/)

  // Year only (e.g., "1975")
  if (parts.length === 1 && /^\d{4}$/.test(parts[0])) {
    return {
      valid: true,
      normalized: parts[0],
      original: gedcomDate,
      partial: true,
      modifier
    }
  }

  // Month Year (e.g., "JAN 1952")
  if (parts.length === 2) {
    const month = MONTH_MAP[parts[0]]
    const year = parts[1]

    if (month && /^\d{4}$/.test(year)) {
      return {
        valid: true,
        normalized: `${year}-${month}`,
        original: gedcomDate,
        partial: true,
        modifier
      }
    }
  }

  // Day Month Year (e.g., "15 JAN 1950")
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0')
    const month = MONTH_MAP[parts[1]]
    const year = parts[2]

    if (/^\d{1,2}$/.test(parts[0]) && month && /^\d{4}$/.test(year)) {
      return {
        valid: true,
        normalized: `${year}-${month}-${day}`,
        original: gedcomDate,
        partial: false,
        modifier
      }
    }
  }

  // Invalid date format
  return {
    valid: false,
    normalized: null,
    original: gedcomDate,
    error: 'Invalid date format'
  }
}

/**
 * Parses a GEDCOM file and extracts individuals, families, and metadata
 *
 * @param {string} content - GEDCOM file content
 * @returns {Promise<Object>} Parsed data with individuals, families, errors, etc.
 */
export async function parseGedcom(content) {
  try {
    // Detect version
    const version = detectGedcomVersion(content)
    const versionValidation = validateGedcomVersion(version)

    if (!versionValidation.valid) {
      return {
        success: false,
        error: versionValidation.error
      }
    }

    // Parse using library
    const parsed = parseGedcomLib.parse(content)

    const individuals = []
    const families = []
    const errors = []

    // Process records - parse-gedcom returns root object with children array
    const records = parsed.children || []

    for (const record of records) {
      if (record.type === 'INDI') {
        const individual = extractIndividual(record, errors)
        individuals.push(individual)
      } else if (record.type === 'FAM') {
        const family = extractFamily(record)
        families.push(family)
      }
    }

    return {
      success: true,
      version,
      individuals,
      families,
      errors
    }
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse GEDCOM file: ${error.message}`
    }
  }
}

/**
 * Extracts individual data from a GEDCOM INDI record
 *
 * @private
 * @param {Object} record - Parsed INDI record
 * @param {Array} errors - Array to collect parsing errors
 * @returns {Object} Individual data
 */
function extractIndividual(record, errors) {
  const individual = {
    id: record.data.xref_id,
    name: null,
    firstName: null,
    lastName: null,
    sex: null,
    birthDate: null,
    birthPlace: null,
    deathDate: null,
    deathPlace: null,
    childOfFamily: null,
    spouseFamilies: [],
    _dateErrors: [] // Story #97: Track date parsing errors
  }

  const children = record.children || []

  // Extract name
  const nameRecord = children.find(r => r.type === 'NAME')
  if (nameRecord) {
    individual.name = nameRecord.value
    // Parse name (e.g., "John /Smith/")
    const nameMatch = nameRecord.value.match(/^([^\/]*)\s*\/([^\/]*)\//)
    if (nameMatch) {
      individual.firstName = nameMatch[1].trim()
      individual.lastName = nameMatch[2].trim()
    } else {
      individual.firstName = nameRecord.value.trim()
    }
  }

  // Extract sex
  const sexRecord = children.find(r => r.type === 'SEX')
  if (sexRecord) {
    individual.sex = sexRecord.value
  }

  // Extract birth date/place
  const birthRecord = children.find(r => r.type === 'BIRT')
  if (birthRecord) {
    const birthChildren = birthRecord.children || []
    const dateRecord = birthChildren.find(r => r.type === 'DATE')
    if (dateRecord) {
      const dateResult = normalizeDate(dateRecord.value)
      if (dateResult.valid) {
        individual.birthDate = dateResult.normalized
      } else {
        // Story #97: Track date errors for detailed error reporting
        individual._dateErrors.push({
          field: 'birthDate',
          original: dateRecord.value,
          error: dateResult.error || 'Invalid date format'
        })
        errors.push({
          line: 0,
          message: `Invalid date format in BIRT tag: ${dateRecord.value}`,
          severity: 'warning'
        })
      }
    }

    const placeRecord = birthChildren.find(r => r.type === 'PLAC')
    if (placeRecord) {
      individual.birthPlace = placeRecord.value
    }
  }

  // Extract death date/place
  const deathRecord = children.find(r => r.type === 'DEAT')
  if (deathRecord) {
    const deathChildren = deathRecord.children || []
    const dateRecord = deathChildren.find(r => r.type === 'DATE')
    if (dateRecord) {
      const dateResult = normalizeDate(dateRecord.value)
      if (dateResult.valid) {
        individual.deathDate = dateResult.normalized
      } else {
        // Story #97: Track date errors for detailed error reporting
        individual._dateErrors.push({
          field: 'deathDate',
          original: dateRecord.value,
          error: dateResult.error || 'Invalid date format'
        })
        errors.push({
          line: 0,
          message: `Invalid date format in DEAT tag: ${dateRecord.value}`,
          severity: 'warning'
        })
      }
    }

    const placeRecord = deathChildren.find(r => r.type === 'PLAC')
    if (placeRecord) {
      individual.deathPlace = placeRecord.value
    }
  }

  // Extract family links
  const famcRecords = children.filter(r => r.type === 'FAMC')
  if (famcRecords.length > 0) {
    individual.childOfFamily = famcRecords[0].data?.pointer
  }

  const famsRecords = children.filter(r => r.type === 'FAMS')
  individual.spouseFamilies = famsRecords.map(r => r.data?.pointer).filter(Boolean)

  return individual
}

/**
 * Extracts family data from a GEDCOM FAM record
 *
 * @private
 * @param {Object} record - Parsed FAM record
 * @returns {Object} Family data
 */
function extractFamily(record) {
  const family = {
    id: record.data.xref_id,
    husband: null,
    wife: null,
    children: [],
    marriageDate: null
  }

  const children = record.children || []

  // Extract husband
  const husbRecord = children.find(r => r.type === 'HUSB')
  if (husbRecord) {
    family.husband = husbRecord.data?.pointer
  }

  // Extract wife
  const wifeRecord = children.find(r => r.type === 'WIFE')
  if (wifeRecord) {
    family.wife = wifeRecord.data?.pointer
  }

  // Extract children
  const childRecords = children.filter(r => r.type === 'CHIL')
  family.children = childRecords.map(r => r.data?.pointer).filter(Boolean)

  // Extract marriage date
  const marrRecord = children.find(r => r.type === 'MARR')
  if (marrRecord) {
    const marrChildren = marrRecord.children || []
    const dateRecord = marrChildren.find(r => r.type === 'DATE')
    if (dateRecord) {
      const dateResult = normalizeDate(dateRecord.value)
      if (dateResult.valid) {
        family.marriageDate = dateResult.normalized
      }
    }
  }

  return family
}

/**
 * Extracts statistics from parsed GEDCOM data
 *
 * @param {Object} parsed - Parsed GEDCOM data
 * @returns {Object} Statistics object
 */
export function extractStatistics(parsed) {
  const stats = {
    totalIndividuals: parsed.individuals?.length || 0,
    totalFamilies: parsed.families?.length || 0,
    version: parsed.version,
    dateRange: null
  }

  // Calculate date range
  const dates = []

  if (parsed.individuals) {
    for (const individual of parsed.individuals) {
      if (individual.birthDate) {
        dates.push(individual.birthDate)
      }
      if (individual.deathDate) {
        dates.push(individual.deathDate)
      }
    }
  }

  if (dates.length > 0) {
    dates.sort()
    stats.dateRange = {
      earliest: dates[0],
      latest: dates[dates.length - 1]
    }
  }

  return stats
}

/**
 * Validates relationship consistency between individuals and families
 *
 * @param {Object} parsed - Parsed GEDCOM data
 * @returns {Array} Array of relationship issues
 */
export function validateRelationshipConsistency(parsed) {
  const issues = []

  if (!parsed.individuals || !parsed.families) {
    return issues
  }

  // Check child-family references
  for (const individual of parsed.individuals) {
    if (individual.childOfFamily) {
      const family = parsed.families.find(f => f.id === individual.childOfFamily)

      if (family) {
        if (!family.children.includes(individual.id)) {
          issues.push({
            type: 'child-family-mismatch',
            description: `Individual ${individual.id} (${individual.name}) references family ${individual.childOfFamily} but is not listed as a child`,
            affectedIds: [individual.id, individual.childOfFamily]
          })
        }
      }
    }
  }

  // Check spouse-family references
  for (const individual of parsed.individuals) {
    const spouseFamilies = individual.spouseFamilies || []
    for (const familyId of spouseFamilies) {
      const family = parsed.families.find(f => f.id === familyId)

      if (family) {
        const isSpouse = family.husband === individual.id || family.wife === individual.id

        if (!isSpouse) {
          issues.push({
            type: 'spouse-family-mismatch',
            description: `Individual ${individual.id} (${individual.name}) references family ${familyId} as spouse but is not listed as husband or wife`,
            affectedIds: [individual.id, familyId]
          })
        }
      }
    }
  }

  return issues
}

/**
 * Validates and detects orphaned references in GEDCOM data
 * Story #97: Orphaned relationship handling
 *
 * Checks for references to non-existent individuals in family records
 *
 * @param {Object} parsed - Parsed GEDCOM data with individuals and families
 * @returns {Object} Result with orphan status, warnings, and cleaned families
 */
export function validateOrphanedReferences(parsed) {
  const warnings = []
  const cleanedFamilies = []
  let hasOrphans = false

  if (!parsed.individuals || !parsed.families) {
    return {
      hasOrphans: false,
      warnings: [],
      cleanedFamilies: parsed.families || []
    }
  }

  // Create a Set of valid individual IDs for fast lookup
  const validIndividualIds = new Set(parsed.individuals.map(ind => ind.id))

  // Process each family
  for (const family of parsed.families) {
    const cleanedFamily = { ...family }

    // Check husband reference
    if (family.husband && !validIndividualIds.has(family.husband)) {
      hasOrphans = true
      warnings.push({
        severity: 'Warning',
        code: 'VALIDATION_WARNING',
        message: `Orphaned husband reference: Individual ${family.husband} not found`,
        gedcomId: family.id,
        field: 'husband',
        suggestedFix: 'Remove invalid husband reference or add missing individual'
      })
      cleanedFamily.husband = null
    }

    // Check wife reference
    if (family.wife && !validIndividualIds.has(family.wife)) {
      hasOrphans = true
      warnings.push({
        severity: 'Warning',
        code: 'VALIDATION_WARNING',
        message: `Orphaned wife reference: Individual ${family.wife} not found`,
        gedcomId: family.id,
        field: 'wife',
        suggestedFix: 'Remove invalid wife reference or add missing individual'
      })
      cleanedFamily.wife = null
    }

    // Check children references
    const validChildren = []
    const orphanedChildren = []

    for (const childId of family.children || []) {
      if (validIndividualIds.has(childId)) {
        validChildren.push(childId)
      } else {
        orphanedChildren.push(childId)
      }
    }

    if (orphanedChildren.length > 0) {
      hasOrphans = true
      warnings.push({
        severity: 'Warning',
        code: 'VALIDATION_WARNING',
        message: `Orphaned child reference(s): ${orphanedChildren.join(', ')} not found in family ${family.id}`,
        gedcomId: family.id,
        field: 'children',
        suggestedFix: 'Remove invalid child references or add missing individuals'
      })
    }

    cleanedFamily.children = validChildren
    cleanedFamilies.push(cleanedFamily)
  }

  return {
    hasOrphans,
    warnings,
    cleanedFamilies
  }
}

/**
 * Collects parsing errors from individuals and families
 * Story #97: Enhanced error collection
 *
 * @param {Array} individuals - Array of parsed individuals
 * @param {Array} families - Array of parsed families
 * @returns {Array} Array of error/warning objects
 */
export function collectParsingErrors(individuals, families) {
  const errors = []

  // Collect date parsing errors from individuals
  for (const individual of individuals) {
    if (individual._dateErrors && individual._dateErrors.length > 0) {
      for (const dateError of individual._dateErrors) {
        errors.push({
          severity: 'Warning',
          code: 'VALIDATION_WARNING',
          message: `Could not parse date "${dateError.original}" - ${dateError.error}`,
          gedcomId: individual.id,
          individualName: `${individual.firstName || ''} ${individual.lastName || ''}`.trim() || null,
          field: dateError.field,
          suggestedFix: 'Use format YYYY-MM-DD or standard GEDCOM date format (DD MMM YYYY)'
        })
      }
    }
  }

  return errors
}
