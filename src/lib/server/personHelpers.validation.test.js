import { describe, it, expect } from 'vitest'
import { validatePersonData } from './personHelpers.js'

describe('Person Data Validation - Birth Surname and Nickname (AC7)', () => {
  describe('Birth Surname Validation', () => {
    it('should accept valid birth surname with letters', () => {
      const result = validatePersonData({
        firstName: 'Jane',
        lastName: 'Smith',
        birthSurname: 'Jones'
      })
      expect(result.valid).toBe(true)
      expect(result.error).toBeNull()
    })

    it('should accept birth surname with hyphens', () => {
      const result = validatePersonData({
        firstName: 'Jane',
        lastName: 'Smith',
        birthSurname: 'Hyphen-Name'
      })
      expect(result.valid).toBe(true)
    })

    it('should accept birth surname with apostrophes', () => {
      const result = validatePersonData({
        firstName: 'Jane',
        lastName: 'Smith',
        birthSurname: "O'Brien"
      })
      expect(result.valid).toBe(true)
    })

    it('should accept birth surname with spaces', () => {
      const result = validatePersonData({
        firstName: 'Jane',
        lastName: 'Smith',
        birthSurname: 'Van Der Berg'
      })
      expect(result.valid).toBe(true)
    })

    it('should accept birth surname with mixed special characters', () => {
      const result = validatePersonData({
        firstName: 'Jane',
        lastName: 'Smith',
        birthSurname: "O'Brien-Jones"
      })
      expect(result.valid).toBe(true)
    })

    it('should reject birth surname exceeding 255 characters', () => {
      const longName = 'A'.repeat(256)
      const result = validatePersonData({
        firstName: 'Jane',
        lastName: 'Smith',
        birthSurname: longName
      })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('255')
      expect(result.error).toContain('birthSurname')
    })

    it('should accept birth surname with exactly 255 characters', () => {
      const maxName = 'A'.repeat(255)
      const result = validatePersonData({
        firstName: 'Jane',
        lastName: 'Smith',
        birthSurname: maxName
      })
      expect(result.valid).toBe(true)
    })

    it('should reject birth surname with invalid characters (numbers)', () => {
      const result = validatePersonData({
        firstName: 'Jane',
        lastName: 'Smith',
        birthSurname: 'Jones123'
      })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('birthSurname')
      expect(result.error).toContain('letters')
    })

    it('should reject birth surname with invalid characters (special symbols)', () => {
      const result = validatePersonData({
        firstName: 'Jane',
        lastName: 'Smith',
        birthSurname: 'Jones@Email'
      })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('birthSurname')
    })

    it('should accept null birth surname', () => {
      const result = validatePersonData({
        firstName: 'Jane',
        lastName: 'Smith',
        birthSurname: null
      })
      expect(result.valid).toBe(true)
    })

    it('should accept undefined birth surname (not provided)', () => {
      const result = validatePersonData({
        firstName: 'Jane',
        lastName: 'Smith'
      })
      expect(result.valid).toBe(true)
    })

    it('should accept empty string birth surname', () => {
      const result = validatePersonData({
        firstName: 'Jane',
        lastName: 'Smith',
        birthSurname: ''
      })
      expect(result.valid).toBe(true)
    })
  })

  describe('Nickname Validation', () => {
    it('should accept valid nickname with letters', () => {
      const result = validatePersonData({
        firstName: 'Robert',
        lastName: 'Johnson',
        nickname: 'Bob'
      })
      expect(result.valid).toBe(true)
      expect(result.error).toBeNull()
    })

    it('should accept nickname with dots', () => {
      const result = validatePersonData({
        firstName: 'Robert',
        lastName: 'Johnson',
        nickname: 'J.J.'
      })
      expect(result.valid).toBe(true)
    })

    it('should accept nickname with hyphens', () => {
      const result = validatePersonData({
        firstName: 'Robert',
        lastName: 'Johnson',
        nickname: 'Bobby-Joe'
      })
      expect(result.valid).toBe(true)
    })

    it('should accept nickname with apostrophes', () => {
      const result = validatePersonData({
        firstName: 'Robert',
        lastName: 'Johnson',
        nickname: "J'Bob"
      })
      expect(result.valid).toBe(true)
    })

    it('should accept nickname with spaces', () => {
      const result = validatePersonData({
        firstName: 'Robert',
        lastName: 'Johnson',
        nickname: 'Big Bob'
      })
      expect(result.valid).toBe(true)
    })

    it('should reject nickname exceeding 255 characters', () => {
      const longName = 'B'.repeat(256)
      const result = validatePersonData({
        firstName: 'Robert',
        lastName: 'Johnson',
        nickname: longName
      })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('255')
      expect(result.error).toContain('nickname')
    })

    it('should accept nickname with exactly 255 characters', () => {
      const maxName = 'B'.repeat(255)
      const result = validatePersonData({
        firstName: 'Robert',
        lastName: 'Johnson',
        nickname: maxName
      })
      expect(result.valid).toBe(true)
    })

    it('should reject nickname with invalid characters (numbers)', () => {
      const result = validatePersonData({
        firstName: 'Robert',
        lastName: 'Johnson',
        nickname: 'Bob123'
      })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('nickname')
      expect(result.error).toContain('letters')
    })

    it('should reject nickname with invalid characters (special symbols)', () => {
      const result = validatePersonData({
        firstName: 'Robert',
        lastName: 'Johnson',
        nickname: 'Bob@2024'
      })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('nickname')
    })

    it('should accept null nickname', () => {
      const result = validatePersonData({
        firstName: 'Robert',
        lastName: 'Johnson',
        nickname: null
      })
      expect(result.valid).toBe(true)
    })

    it('should accept undefined nickname (not provided)', () => {
      const result = validatePersonData({
        firstName: 'Robert',
        lastName: 'Johnson'
      })
      expect(result.valid).toBe(true)
    })

    it('should accept empty string nickname', () => {
      const result = validatePersonData({
        firstName: 'Robert',
        lastName: 'Johnson',
        nickname: ''
      })
      expect(result.valid).toBe(true)
    })
  })

  describe('Combined Validation', () => {
    it('should validate both birthSurname and nickname together', () => {
      const result = validatePersonData({
        firstName: 'Jane',
        lastName: 'Smith',
        birthSurname: 'Jones',
        nickname: 'JJ'
      })
      expect(result.valid).toBe(true)
    })

    it('should fail if birthSurname is invalid even if nickname is valid', () => {
      const result = validatePersonData({
        firstName: 'Jane',
        lastName: 'Smith',
        birthSurname: 'Jones123',
        nickname: 'JJ'
      })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('birthSurname')
    })

    it('should fail if nickname is invalid even if birthSurname is valid', () => {
      const result = validatePersonData({
        firstName: 'Jane',
        lastName: 'Smith',
        birthSurname: 'Jones',
        nickname: 'JJ@123'
      })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('nickname')
    })
  })

  describe('Backwards Compatibility', () => {
    it('should still validate existing fields correctly', () => {
      const result = validatePersonData({
        firstName: 'John',
        lastName: 'Doe',
        birthDate: '1980-01-01',
        gender: 'male'
      })
      expect(result.valid).toBe(true)
    })

    it('should fail on invalid firstName even with valid birthSurname', () => {
      const result = validatePersonData({
        firstName: '',
        lastName: 'Smith',
        birthSurname: 'Jones'
      })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('firstName')
    })
  })
})
