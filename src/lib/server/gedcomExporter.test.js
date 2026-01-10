import { describe, it, expect } from 'vitest'
import {
  formatGedcomName,
  formatGedcomGender,
  formatGedcomDate,
  formatGedcomId,
  generateGedcomHeader,
  generateGedcomIndividual,
  generateGedcomFamily,
  generateGedcomTrailer,
  buildGedcomFile
} from './gedcomExporter.js'

describe('formatGedcomName', () => {
  it('should format full name with surname delimiters', () => {
    expect(formatGedcomName('John Robert', 'Smith')).toBe('John Robert /Smith/')
  })

  it('should handle first name only when lastName is null', () => {
    expect(formatGedcomName('John', null)).toBe('John')
  })

  it('should handle first name only when lastName is empty string', () => {
    expect(formatGedcomName('John', '')).toBe('John')
  })

  it('should handle last name only when firstName is empty', () => {
    expect(formatGedcomName('', 'Smith')).toBe('/Smith/')
  })

  it('should handle both names missing', () => {
    expect(formatGedcomName('', '')).toBe('')
  })

  it('should trim whitespace', () => {
    expect(formatGedcomName('  John  ', '  Smith  ')).toBe('John /Smith/')
  })
})

describe('formatGedcomGender', () => {
  it('should map male to M', () => {
    expect(formatGedcomGender('male')).toBe('M')
  })

  it('should map female to F', () => {
    expect(formatGedcomGender('female')).toBe('F')
  })

  it('should map other to U', () => {
    expect(formatGedcomGender('other')).toBe('U')
  })

  it('should map unspecified to U', () => {
    expect(formatGedcomGender('unspecified')).toBe('U')
  })

  it('should map null to U', () => {
    expect(formatGedcomGender(null)).toBe('U')
  })

  it('should map undefined to U', () => {
    expect(formatGedcomGender(undefined)).toBe('U')
  })

  it('should be case-insensitive', () => {
    expect(formatGedcomGender('MALE')).toBe('M')
    expect(formatGedcomGender('Female')).toBe('F')
  })
})

describe('formatGedcomDate', () => {
  it('should format full date YYYY-MM-DD', () => {
    expect(formatGedcomDate('1950-01-15')).toBe('15 JAN 1950')
  })

  it('should format partial date YYYY-MM-00 (month-year)', () => {
    expect(formatGedcomDate('1950-01-00')).toBe('JAN 1950')
  })

  it('should format partial date YYYY-00-00 (year only)', () => {
    expect(formatGedcomDate('1950-00-00')).toBe('1950')
  })

  it('should handle null date', () => {
    expect(formatGedcomDate(null)).toBe(null)
  })

  it('should handle empty string', () => {
    expect(formatGedcomDate('')).toBe(null)
  })

  it('should format all months correctly', () => {
    expect(formatGedcomDate('1950-01-15')).toBe('15 JAN 1950')
    expect(formatGedcomDate('1950-02-15')).toBe('15 FEB 1950')
    expect(formatGedcomDate('1950-03-15')).toBe('15 MAR 1950')
    expect(formatGedcomDate('1950-04-15')).toBe('15 APR 1950')
    expect(formatGedcomDate('1950-05-15')).toBe('15 MAY 1950')
    expect(formatGedcomDate('1950-06-15')).toBe('15 JUN 1950')
    expect(formatGedcomDate('1950-07-15')).toBe('15 JUL 1950')
    expect(formatGedcomDate('1950-08-15')).toBe('15 AUG 1950')
    expect(formatGedcomDate('1950-09-15')).toBe('15 SEP 1950')
    expect(formatGedcomDate('1950-10-15')).toBe('15 OCT 1950')
    expect(formatGedcomDate('1950-11-15')).toBe('15 NOV 1950')
    expect(formatGedcomDate('1950-12-15')).toBe('15 DEC 1950')
  })

  it('should remove leading zero from day', () => {
    expect(formatGedcomDate('1950-01-05')).toBe('5 JAN 1950')
  })
})

describe('formatGedcomId', () => {
  it('should format individual ID', () => {
    expect(formatGedcomId('I', 1)).toBe('@I1@')
  })

  it('should format family ID', () => {
    expect(formatGedcomId('F', 5)).toBe('@F5@')
  })

  it('should format submitter ID', () => {
    expect(formatGedcomId('S', 1)).toBe('@S1@')
  })

  it('should handle large numbers', () => {
    expect(formatGedcomId('I', 9999)).toBe('@I9999@')
  })
})

describe('generateGedcomHeader', () => {
  it('should generate valid GEDCOM 5.5.1 header', () => {
    const header = generateGedcomHeader('5.5.1', 'Test User', '2026-01-09')

    expect(header).toContain('0 HEAD')
    expect(header).toContain('1 GEDC')
    expect(header).toContain('2 VERS 5.5.1')
    expect(header).toContain('1 CHAR UTF-8')
    expect(header).toContain('1 SOUR FamilyTree App')
    expect(header).toContain('1 DATE 9 JAN 2026')
    expect(header).toContain('0 @S1@ SUBM')
    expect(header).toContain('1 NAME Test User')
  })

  it('should generate valid GEDCOM 7.0 header', () => {
    const header = generateGedcomHeader('7.0', 'Test User', '2026-01-09')

    expect(header).toContain('0 HEAD')
    expect(header).toContain('1 GEDC')
    expect(header).toContain('2 VERS 7.0')
    expect(header).toContain('1 CHAR UTF-8')
  })

  it('should default to 5.5.1 if version not specified', () => {
    const header = generateGedcomHeader(null, 'Test User', '2026-01-09')

    expect(header).toContain('2 VERS 5.5.1')
  })

  it('should handle missing user name', () => {
    const header = generateGedcomHeader('5.5.1', null, '2026-01-09')

    expect(header).toContain('1 NAME Unknown')
  })
})

describe('generateGedcomIndividual', () => {
  it('should generate basic individual record', () => {
    const person = {
      id: 1,
      firstName: 'John',
      lastName: 'Smith',
      gender: 'male',
      birthDate: null,
      deathDate: null,
      photoUrl: null
    }

    const individual = generateGedcomIndividual(person, '@I1@')

    expect(individual).toContain('0 @I1@ INDI')
    expect(individual).toContain('1 NAME John /Smith/')
    expect(individual).toContain('1 SEX M')
    expect(individual).not.toContain('1 BIRT')
    expect(individual).not.toContain('1 DEAT')
  })

  it('should include birth date and place', () => {
    const person = {
      id: 1,
      firstName: 'John',
      lastName: 'Smith',
      gender: 'male',
      birthDate: '1950-01-15',
      birthPlace: 'Chicago, Illinois, USA',
      deathDate: null,
      photoUrl: null
    }

    const individual = generateGedcomIndividual(person, '@I1@')

    expect(individual).toContain('1 BIRT')
    expect(individual).toContain('2 DATE 15 JAN 1950')
    expect(individual).toContain('2 PLAC Chicago, Illinois, USA')
  })

  it('should include death date', () => {
    const person = {
      id: 1,
      firstName: 'John',
      lastName: 'Smith',
      gender: 'male',
      birthDate: '1950-01-15',
      deathDate: '2020-03-10',
      photoUrl: null
    }

    const individual = generateGedcomIndividual(person, '@I1@')

    expect(individual).toContain('1 DEAT')
    expect(individual).toContain('2 DATE 10 MAR 2020')
  })

  it('should include photo URL', () => {
    const person = {
      id: 1,
      firstName: 'John',
      lastName: 'Smith',
      gender: 'male',
      birthDate: null,
      deathDate: null,
      photoUrl: 'https://example.com/photos/john.jpg'
    }

    const individual = generateGedcomIndividual(person, '@I1@')

    expect(individual).toContain('1 OBJE')
    expect(individual).toContain('2 FILE https://example.com/photos/john.jpg')
  })

  it('should include notes', () => {
    const person = {
      id: 1,
      firstName: 'John',
      lastName: 'Smith',
      gender: 'male',
      birthDate: null,
      deathDate: null,
      photoUrl: null,
      notes: 'World War II veteran'
    }

    const individual = generateGedcomIndividual(person, '@I1@')

    expect(individual).toContain('1 NOTE World War II veteran')
  })

  it('should handle partial dates', () => {
    const person = {
      id: 1,
      firstName: 'John',
      lastName: 'Smith',
      gender: 'male',
      birthDate: '1950-01-00',
      deathDate: '2020-00-00',
      photoUrl: null
    }

    const individual = generateGedcomIndividual(person, '@I1@')

    expect(individual).toContain('2 DATE JAN 1950')
    expect(individual).toContain('2 DATE 2020')
  })

  it('should handle missing last name', () => {
    const person = {
      id: 1,
      firstName: 'John',
      lastName: null,
      gender: 'male',
      birthDate: null,
      deathDate: null,
      photoUrl: null
    }

    const individual = generateGedcomIndividual(person, '@I1@')

    expect(individual).toContain('1 NAME John')
  })
})

describe('generateGedcomFamily', () => {
  it('should generate family with husband, wife, and children', () => {
    const family = {
      husbandId: '@I1@',
      wifeId: '@I2@',
      childrenIds: ['@I3@', '@I4@']
    }

    const famRecord = generateGedcomFamily(family, '@F1@')

    expect(famRecord).toContain('0 @F1@ FAM')
    expect(famRecord).toContain('1 HUSB @I1@')
    expect(famRecord).toContain('1 WIFE @I2@')
    expect(famRecord).toContain('1 CHIL @I3@')
    expect(famRecord).toContain('1 CHIL @I4@')
  })

  it('should handle family with only husband', () => {
    const family = {
      husbandId: '@I1@',
      wifeId: null,
      childrenIds: []
    }

    const famRecord = generateGedcomFamily(family, '@F1@')

    expect(famRecord).toContain('1 HUSB @I1@')
    expect(famRecord).not.toContain('1 WIFE')
    expect(famRecord).not.toContain('1 CHIL')
  })

  it('should handle family with only wife', () => {
    const family = {
      husbandId: null,
      wifeId: '@I2@',
      childrenIds: []
    }

    const famRecord = generateGedcomFamily(family, '@F1@')

    expect(famRecord).not.toContain('1 HUSB')
    expect(famRecord).toContain('1 WIFE @I2@')
  })

  it('should handle family with single child', () => {
    const family = {
      husbandId: '@I1@',
      wifeId: '@I2@',
      childrenIds: ['@I3@']
    }

    const famRecord = generateGedcomFamily(family, '@F1@')

    expect(famRecord).toContain('1 CHIL @I3@')
  })
})

describe('generateGedcomTrailer', () => {
  it('should generate GEDCOM trailer', () => {
    const trailer = generateGedcomTrailer()

    expect(trailer).toBe('0 TRLR')
  })
})

describe('buildGedcomFile', () => {
  it('should build complete GEDCOM file with all sections', () => {
    const people = [
      {
        id: 1,
        firstName: 'John',
        lastName: 'Smith',
        gender: 'male',
        birthDate: '1950-01-15',
        deathDate: null,
        photoUrl: null
      },
      {
        id: 2,
        firstName: 'Jane',
        lastName: 'Doe',
        gender: 'female',
        birthDate: '1952-03-20',
        deathDate: null,
        photoUrl: null
      }
    ]

    const relationships = [
      {
        person1Id: 1,
        person2Id: 2,
        type: 'spouse'
      }
    ]

    const options = {
      version: '5.5.1',
      userName: 'Test User',
      exportDate: '2026-01-09'
    }

    const gedcom = buildGedcomFile(people, relationships, options)

    // Should contain header
    expect(gedcom).toContain('0 HEAD')
    expect(gedcom).toContain('2 VERS 5.5.1')

    // Should contain individuals
    expect(gedcom).toContain('0 @I1@ INDI')
    expect(gedcom).toContain('1 NAME John /Smith/')
    expect(gedcom).toContain('0 @I2@ INDI')
    expect(gedcom).toContain('1 NAME Jane /Doe/')

    // Should contain family
    expect(gedcom).toContain('0 @F1@ FAM')
    expect(gedcom).toContain('1 HUSB @I1@')
    expect(gedcom).toContain('1 WIFE @I2@')

    // Should contain trailer
    expect(gedcom).toContain('0 TRLR')
  })

  it('should handle parent-child relationships', () => {
    const people = [
      { id: 1, firstName: 'John', lastName: 'Smith', gender: 'male', birthDate: null, deathDate: null, photoUrl: null },
      { id: 2, firstName: 'Jane', lastName: 'Doe', gender: 'female', birthDate: null, deathDate: null, photoUrl: null },
      { id: 3, firstName: 'Alice', lastName: 'Smith', gender: 'female', birthDate: null, deathDate: null, photoUrl: null }
    ]

    const relationships = [
      { person1Id: 1, person2Id: 2, type: 'spouse' },
      { person1Id: 1, person2Id: 3, type: 'parentOf', parentRole: 'father' },
      { person1Id: 2, person2Id: 3, type: 'parentOf', parentRole: 'mother' }
    ]

    const options = {
      version: '5.5.1',
      userName: 'Test User',
      exportDate: '2026-01-09'
    }

    const gedcom = buildGedcomFile(people, relationships, options)

    // Should create family with child
    expect(gedcom).toContain('1 HUSB @I1@')
    expect(gedcom).toContain('1 WIFE @I2@')
    expect(gedcom).toContain('1 CHIL @I3@')
  })

  it('should handle empty people array', () => {
    const gedcom = buildGedcomFile([], [], {
      version: '5.5.1',
      userName: 'Test User',
      exportDate: '2026-01-09'
    })

    expect(gedcom).toContain('0 HEAD')
    expect(gedcom).toContain('0 TRLR')
    expect(gedcom).not.toContain('0 @I')
    expect(gedcom).not.toContain('0 @F')
  })

  it('should use GEDCOM 7.0 format when specified', () => {
    const people = [
      { id: 1, firstName: 'John', lastName: 'Smith', gender: 'male', birthDate: null, deathDate: null, photoUrl: null }
    ]

    const gedcom = buildGedcomFile(people, [], {
      version: '7.0',
      userName: 'Test User',
      exportDate: '2026-01-09'
    })

    expect(gedcom).toContain('2 VERS 7.0')
  })
})
