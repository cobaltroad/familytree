/**
 * GEDCOM Export Module
 *
 * Implements GEDCOM 5.5.1 and 7.0 export functionality for family tree data.
 * Converts Person and Relationship records into standard GEDCOM format.
 *
 * Story #96: Export Family Tree as GEDCOM
 */

/**
 * Maps month numbers to GEDCOM month abbreviations
 */
const MONTH_MAP = {
  '01': 'JAN', '02': 'FEB', '03': 'MAR', '04': 'APR',
  '05': 'MAY', '06': 'JUN', '07': 'JUL', '08': 'AUG',
  '09': 'SEP', '10': 'OCT', '11': 'NOV', '12': 'DEC'
}

/**
 * Formats a person's name in GEDCOM format
 *
 * @param {string} firstName - Person's first name
 * @param {string} lastName - Person's last name
 * @returns {string} GEDCOM formatted name (e.g., "John Robert /Smith/")
 *
 * @example
 * formatGedcomName('John Robert', 'Smith') // "John Robert /Smith/"
 * formatGedcomName('John', null) // "John"
 * formatGedcomName('', 'Smith') // "/Smith/"
 */
export function formatGedcomName(firstName, lastName) {
  const first = (firstName || '').trim()
  const last = (lastName || '').trim()

  if (!first && !last) return ''
  if (!last) return first
  if (!first) return `/${last}/`

  return `${first} /${last}/`
}

/**
 * Maps gender to GEDCOM sex code
 *
 * @param {string} gender - Gender value (male, female, other, unspecified, etc.)
 * @returns {string} GEDCOM sex code (M, F, or U)
 *
 * @example
 * formatGedcomGender('male') // "M"
 * formatGedcomGender('female') // "F"
 * formatGedcomGender('other') // "U"
 */
export function formatGedcomGender(gender) {
  if (!gender) return 'U'

  const normalized = gender.toLowerCase()

  if (normalized === 'male') return 'M'
  if (normalized === 'female') return 'F'

  return 'U'
}

/**
 * Converts date from YYYY-MM-DD format to GEDCOM format
 *
 * Handles full dates, partial dates (month-year, year-only), and null values.
 *
 * @param {string} date - Date in YYYY-MM-DD format (may have 00 for unknown parts)
 * @returns {string|null} GEDCOM formatted date or null
 *
 * @example
 * formatGedcomDate('1950-01-15') // "15 JAN 1950"
 * formatGedcomDate('1950-01-00') // "JAN 1950"
 * formatGedcomDate('1950-00-00') // "1950"
 * formatGedcomDate(null) // null
 */
export function formatGedcomDate(date) {
  if (!date || date === '') return null

  const parts = date.split('-')
  if (parts.length !== 3) return null

  const [year, month, day] = parts

  // Year only (YYYY-00-00)
  if (month === '00' || month === '0') {
    return year
  }

  // Month and year (YYYY-MM-00)
  if (day === '00' || day === '0') {
    return `${MONTH_MAP[month]} ${year}`
  }

  // Full date (YYYY-MM-DD)
  const dayNum = parseInt(day, 10)
  return `${dayNum} ${MONTH_MAP[month]} ${year}`
}

/**
 * Formats a GEDCOM ID with proper delimiters
 *
 * @param {string} prefix - ID prefix (I for individual, F for family, S for submitter)
 * @param {number} number - ID number
 * @returns {string} GEDCOM formatted ID (e.g., "@I1@")
 *
 * @example
 * formatGedcomId('I', 1) // "@I1@"
 * formatGedcomId('F', 5) // "@F5@"
 */
export function formatGedcomId(prefix, number) {
  return `@${prefix}${number}@`
}

/**
 * Generates GEDCOM file header
 *
 * @param {string} version - GEDCOM version ("5.5.1" or "7.0")
 * @param {string} userName - Name of the submitter
 * @param {string} exportDate - Export date in YYYY-MM-DD format
 * @returns {string} GEDCOM header section
 */
export function generateGedcomHeader(version, userName, exportDate) {
  const gedcomVersion = version || '5.5.1'
  const submitterName = userName || 'Unknown'
  const formattedDate = formatGedcomDate(exportDate) || formatGedcomDate(new Date().toISOString().split('T')[0])

  const lines = []
  lines.push('0 HEAD')
  lines.push('1 GEDC')
  lines.push(`2 VERS ${gedcomVersion}`)
  lines.push('1 CHAR UTF-8')
  lines.push('1 SOUR FamilyTree App')
  lines.push(`1 DATE ${formattedDate}`)
  lines.push('0 @S1@ SUBM')
  lines.push(`1 NAME ${submitterName}`)

  return lines.join('\n')
}

/**
 * Generates a GEDCOM individual record
 *
 * @param {Object} person - Person object from database
 * @param {string} gedcomId - GEDCOM ID for this individual (e.g., "@I1@")
 * @returns {string} GEDCOM individual record
 */
export function generateGedcomIndividual(person, gedcomId) {
  const lines = []

  lines.push(`0 ${gedcomId} INDI`)
  lines.push(`1 NAME ${formatGedcomName(person.firstName, person.lastName)}`)
  lines.push(`1 SEX ${formatGedcomGender(person.gender)}`)

  // Birth information
  if (person.birthDate || person.birthPlace) {
    lines.push('1 BIRT')

    if (person.birthDate) {
      const formattedDate = formatGedcomDate(person.birthDate)
      if (formattedDate) {
        lines.push(`2 DATE ${formattedDate}`)
      }
    }

    if (person.birthPlace) {
      lines.push(`2 PLAC ${person.birthPlace}`)
    }
  }

  // Death information
  if (person.deathDate || person.deathPlace) {
    lines.push('1 DEAT')

    if (person.deathDate) {
      const formattedDate = formatGedcomDate(person.deathDate)
      if (formattedDate) {
        lines.push(`2 DATE ${formattedDate}`)
      }
    }

    if (person.deathPlace) {
      lines.push(`2 PLAC ${person.deathPlace}`)
    }
  }

  // Notes
  if (person.notes) {
    lines.push(`1 NOTE ${person.notes}`)
  }

  // Photo/media
  if (person.photoUrl) {
    lines.push('1 OBJE')
    lines.push(`2 FILE ${person.photoUrl}`)
  }

  return lines.join('\n')
}

/**
 * Generates a GEDCOM family record
 *
 * @param {Object} family - Family object with husband, wife, and children IDs
 * @param {string} gedcomId - GEDCOM ID for this family (e.g., "@F1@")
 * @returns {string} GEDCOM family record
 */
export function generateGedcomFamily(family, gedcomId) {
  const lines = []

  lines.push(`0 ${gedcomId} FAM`)

  if (family.husbandId) {
    lines.push(`1 HUSB ${family.husbandId}`)
  }

  if (family.wifeId) {
    lines.push(`1 WIFE ${family.wifeId}`)
  }

  if (family.childrenIds && family.childrenIds.length > 0) {
    family.childrenIds.forEach(childId => {
      lines.push(`1 CHIL ${childId}`)
    })
  }

  return lines.join('\n')
}

/**
 * Generates GEDCOM file trailer
 *
 * @returns {string} GEDCOM trailer
 */
export function generateGedcomTrailer() {
  return '0 TRLR'
}

/**
 * Builds families from relationships
 *
 * Groups relationships into family units (spouse + children).
 *
 * @param {Array} people - Array of person objects
 * @param {Array} relationships - Array of relationship objects
 * @param {Map} personIdMap - Map of person.id to GEDCOM ID
 * @returns {Array} Array of family objects
 */
function buildFamilies(people, relationships, personIdMap) {
  const families = []
  const familyMap = new Map() // Key: "husbandId-wifeId" or personId for single parent

  // First, identify spouse relationships
  relationships.forEach(rel => {
    if (rel.type === 'spouse') {
      const person1GedcomId = personIdMap.get(rel.person1Id)
      const person2GedcomId = personIdMap.get(rel.person2Id)

      if (!person1GedcomId || !person2GedcomId) return

      // Determine husband/wife based on gender
      const person1 = people.find(p => p.id === rel.person1Id)
      const person2 = people.find(p => p.id === rel.person2Id)

      let husbandId = null
      let wifeId = null

      if (person1?.gender === 'male' && person2?.gender === 'female') {
        husbandId = person1GedcomId
        wifeId = person2GedcomId
      } else if (person1?.gender === 'female' && person2?.gender === 'male') {
        husbandId = person2GedcomId
        wifeId = person1GedcomId
      } else {
        // Default assignment for same-sex or unspecified
        husbandId = person1GedcomId
        wifeId = person2GedcomId
      }

      const familyKey = `${rel.person1Id}-${rel.person2Id}`
      familyMap.set(familyKey, {
        husbandId,
        wifeId,
        childrenIds: []
      })
    }
  })

  // Then, add children to families
  relationships.forEach(rel => {
    if (rel.type === 'parentOf') {
      const parentId = rel.person1Id
      const childId = rel.person2Id
      const childGedcomId = personIdMap.get(childId)

      if (!childGedcomId) return

      // Find if parent has a spouse
      let familyFound = false
      familyMap.forEach((family, key) => {
        const [id1, id2] = key.split('-').map(Number)
        if (id1 === parentId || id2 === parentId) {
          if (!family.childrenIds.includes(childGedcomId)) {
            family.childrenIds.push(childGedcomId)
          }
          familyFound = true
        }
      })

      // If no family found, create single-parent family
      if (!familyFound) {
        const parentGedcomId = personIdMap.get(parentId)
        if (!parentGedcomId) return

        const parent = people.find(p => p.id === parentId)
        const familyKey = `single-${parentId}`

        if (!familyMap.has(familyKey)) {
          const family = {
            husbandId: parent?.gender === 'male' ? parentGedcomId : null,
            wifeId: parent?.gender === 'female' ? parentGedcomId : null,
            childrenIds: []
          }
          familyMap.set(familyKey, family)
        }

        const family = familyMap.get(familyKey)
        if (!family.childrenIds.includes(childGedcomId)) {
          family.childrenIds.push(childGedcomId)
        }
      }
    }
  })

  // Convert map to array
  familyMap.forEach(family => {
    families.push(family)
  })

  return families
}

/**
 * Builds a complete GEDCOM file from people and relationships
 *
 * @param {Array} people - Array of person objects
 * @param {Array} relationships - Array of relationship objects
 * @param {Object} options - Export options
 * @param {string} options.version - GEDCOM version ("5.5.1" or "7.0")
 * @param {string} options.userName - Submitter name
 * @param {string} options.exportDate - Export date (YYYY-MM-DD)
 * @returns {string} Complete GEDCOM file content
 */
export function buildGedcomFile(people, relationships, options) {
  const { version = '5.5.1', userName = 'Unknown', exportDate } = options

  const lines = []

  // Generate header
  lines.push(generateGedcomHeader(version, userName, exportDate))

  // Create mapping from person ID to GEDCOM ID
  const personIdMap = new Map()
  people.forEach((person, index) => {
    personIdMap.set(person.id, formatGedcomId('I', index + 1))
  })

  // Generate individual records
  people.forEach((person, index) => {
    const gedcomId = formatGedcomId('I', index + 1)
    lines.push(generateGedcomIndividual(person, gedcomId))
  })

  // Build families from relationships
  const families = buildFamilies(people, relationships, personIdMap)

  // Generate family records
  families.forEach((family, index) => {
    const gedcomId = formatGedcomId('F', index + 1)
    lines.push(generateGedcomFamily(family, gedcomId))
  })

  // Generate trailer
  lines.push(generateGedcomTrailer())

  return lines.join('\n')
}
