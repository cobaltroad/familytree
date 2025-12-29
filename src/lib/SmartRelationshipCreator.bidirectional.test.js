/**
 * Integration tests for SmartRelationshipCreator - Bidirectional Relationship Handling
 * Issue #88: Verify all relationship types work correctly with proper bidirectional logic
 *
 * Tests cover:
 * 1. Spouse relationships (bidirectional storage)
 * 2. Parent-child relationships (unidirectional storage, bidirectional display)
 * 3. Child relationship with gender-based role determination
 * 4. Child relationship with explicit role selection for ambiguous gender
 * 5. Mother/Father relationships with correct person ordering
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte'
import { get } from 'svelte/store'
import SmartRelationshipCreator from './SmartRelationshipCreator.svelte'
import { people as peopleStore, relationships as relationshipsStore } from '../stores/familyStore.js'
import { modal } from '../stores/modalStore.js'

describe('SmartRelationshipCreator - Issue #88: Bidirectional Relationship Handling', () => {
  beforeEach(() => {
    // Reset stores to clean state
    peopleStore.set([])
    relationshipsStore.set([])
    modal.close()
  })

  describe('Spouse Relationships (Bidirectional Storage)', () => {
    it('should create TWO spouse relationships (bidirectional) when adding spouse', async () => {
      const focusPerson = {
        id: 1,
        firstName: 'Jane',
        lastName: 'Smith',
        gender: 'female',
        userId: 1
      }
      peopleStore.set([focusPerson])

      // Mock fetch for API calls
      global.fetch = vi.fn((url, options) => {
        if (url.includes('/api/facebook/profile')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({
              personData: {
                firstName: 'John',
                lastName: 'Doe',
                gender: 'male',
                birthDate: '1990-01-01'
              }
            })
          })
        }

        if (url.includes('/api/people') && options?.method === 'POST') {
          const body = JSON.parse(options.body)
          return Promise.resolve({
            ok: true,
            status: 201,
            json: () => Promise.resolve({ id: 10, userId: 1, ...body })
          })
        }

        if (url.includes('/api/relationships') && options?.method === 'POST') {
          const body = JSON.parse(options.body)
          return Promise.resolve({
            ok: true,
            status: 201,
            json: () => Promise.resolve({ id: Date.now(), userId: 1, ...body })
          })
        }

        return Promise.reject(new Error(`Unexpected API call: ${url}`))
      })

      render(SmartRelationshipCreator, {
        props: {
          isOpen: true,
          focusPersonId: focusPerson.id
        }
      })

      // Select spouse relationship type
      const relationshipSelect = screen.getByLabelText(/Relationship Type/i)
      await fireEvent.change(relationshipSelect, { target: { value: 'spouse' } })

      // Import profile
      const urlInput = screen.getByLabelText(/Facebook URL/i)
      await fireEvent.input(urlInput, { target: { value: 'facebook.com/john.doe' } })

      const importButton = screen.getByRole('button', { name: /Import & Preview/i })
      await fireEvent.click(importButton)

      await waitFor(() => {
        expect(screen.getByText(/John Doe/i)).toBeInTheDocument()
      })

      // Create and add
      const createButton = screen.getByRole('button', { name: /Create & Add to Tree/i })
      await fireEvent.click(createButton)

      // THEN: Two bidirectional spouse relationships should be created
      await waitFor(() => {
        const relationships = get(relationshipsStore)
        expect(relationships).toHaveLength(2)
      }, { timeout: 3000 })

      const relationships = get(relationshipsStore)

      // First relationship: Jane -> John
      const rel1 = relationships.find(r => r.person1Id === 1 && r.person2Id === 10)
      expect(rel1).toBeDefined()
      expect(rel1.type).toBe('spouse')
      expect(rel1.parentRole).toBeNull()

      // Second relationship: John -> Jane (bidirectional)
      const rel2 = relationships.find(r => r.person1Id === 10 && r.person2Id === 1)
      expect(rel2).toBeDefined()
      expect(rel2.type).toBe('spouse')
      expect(rel2.parentRole).toBeNull()
    })
  })

  describe('Child Relationships (Gender-Based Role Determination)', () => {
    it('should create mother relationship when female adds child', async () => {
      const focusPerson = {
        id: 1,
        firstName: 'Jane',
        lastName: 'Smith',
        gender: 'female',
        userId: 1
      }
      peopleStore.set([focusPerson])

      global.fetch = vi.fn((url, options) => {
        if (url.includes('/api/facebook/profile')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({
              personData: {
                firstName: 'Alice',
                lastName: 'Smith',
                gender: 'female',
                birthDate: '2020-05-15'
              }
            })
          })
        }

        if (url.includes('/api/people') && options?.method === 'POST') {
          const body = JSON.parse(options.body)
          return Promise.resolve({
            ok: true,
            status: 201,
            json: () => Promise.resolve({ id: 10, userId: 1, ...body })
          })
        }

        if (url.includes('/api/relationships') && options?.method === 'POST') {
          const body = JSON.parse(options.body)
          return Promise.resolve({
            ok: true,
            status: 201,
            json: () => Promise.resolve({ id: 100, userId: 1, ...body })
          })
        }

        return Promise.reject(new Error(`Unexpected API call: ${url}`))
      })

      render(SmartRelationshipCreator, {
        props: {
          isOpen: true,
          focusPersonId: focusPerson.id
        }
      })

      // Default is 'child' relationship type
      const urlInput = screen.getByLabelText(/Facebook URL/i)
      await fireEvent.input(urlInput, { target: { value: 'facebook.com/alice.smith' } })

      const importButton = screen.getByRole('button', { name: /Import & Preview/i })
      await fireEvent.click(importButton)

      await waitFor(() => {
        expect(screen.getByText(/Alice Smith/i)).toBeInTheDocument()
      })

      const createButton = screen.getByRole('button', { name: /Create & Add to Tree/i })
      await fireEvent.click(createButton)

      await waitFor(() => {
        const relationships = get(relationshipsStore)
        expect(relationships).toHaveLength(1)
      }, { timeout: 3000 })

      const relationships = get(relationshipsStore)
      const rel = relationships[0]

      // Jane (female) is mother of Alice
      expect(rel.person1Id).toBe(1) // Jane is parent (person1)
      expect(rel.person2Id).toBe(10) // Alice is child (person2)
      expect(rel.type).toBe('mother')
      expect(rel.parentRole).toBe('mother')
    })

    it('should create father relationship when male adds child', async () => {
      const focusPerson = {
        id: 2,
        firstName: 'John',
        lastName: 'Doe',
        gender: 'male',
        userId: 1
      }
      peopleStore.set([focusPerson])

      global.fetch = vi.fn((url, options) => {
        if (url.includes('/api/facebook/profile')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({
              personData: {
                firstName: 'Bob',
                lastName: 'Doe',
                gender: 'male',
                birthDate: '2018-03-20'
              }
            })
          })
        }

        if (url.includes('/api/people') && options?.method === 'POST') {
          const body = JSON.parse(options.body)
          return Promise.resolve({
            ok: true,
            status: 201,
            json: () => Promise.resolve({ id: 20, userId: 1, ...body })
          })
        }

        if (url.includes('/api/relationships') && options?.method === 'POST') {
          const body = JSON.parse(options.body)
          return Promise.resolve({
            ok: true,
            status: 201,
            json: () => Promise.resolve({ id: 200, userId: 1, ...body })
          })
        }

        return Promise.reject(new Error(`Unexpected API call: ${url}`))
      })

      render(SmartRelationshipCreator, {
        props: {
          isOpen: true,
          focusPersonId: focusPerson.id
        }
      })

      const urlInput = screen.getByLabelText(/Facebook URL/i)
      await fireEvent.input(urlInput, { target: { value: 'facebook.com/bob.doe' } })

      const importButton = screen.getByRole('button', { name: /Import & Preview/i })
      await fireEvent.click(importButton)

      await waitFor(() => {
        expect(screen.getByText(/Bob Doe/i)).toBeInTheDocument()
      })

      const createButton = screen.getByRole('button', { name: /Create & Add to Tree/i })
      await fireEvent.click(createButton)

      await waitFor(() => {
        const relationships = get(relationshipsStore)
        expect(relationships).toHaveLength(1)
      }, { timeout: 3000 })

      const relationships = get(relationshipsStore)
      const rel = relationships[0]

      // John (male) is father of Bob
      expect(rel.person1Id).toBe(2) // John is parent (person1)
      expect(rel.person2Id).toBe(20) // Bob is child (person2)
      expect(rel.type).toBe('father')
      expect(rel.parentRole).toBe('father')
    })
  })

  describe('Child Relationships (Ambiguous Gender - Role Selection Required)', () => {
    it('should show parent role selection when gender is "other" and adding child', async () => {
      const focusPerson = {
        id: 3,
        firstName: 'Alex',
        lastName: 'Taylor',
        gender: 'other',
        userId: 1
      }
      peopleStore.set([focusPerson])

      global.fetch = vi.fn((url) => {
        if (url.includes('/api/facebook/profile')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({
              personData: {
                firstName: 'Charlie',
                lastName: 'Taylor',
                gender: 'male',
                birthDate: '2019-07-10'
              }
            })
          })
        }
        return Promise.reject(new Error(`Unexpected API call: ${url}`))
      })

      render(SmartRelationshipCreator, {
        props: {
          isOpen: true,
          focusPersonId: focusPerson.id
        }
      })

      const urlInput = screen.getByLabelText(/Facebook URL/i)
      await fireEvent.input(urlInput, { target: { value: 'facebook.com/charlie.taylor' } })

      const importButton = screen.getByRole('button', { name: /Import & Preview/i })
      await fireEvent.click(importButton)

      await waitFor(() => {
        expect(screen.getByText(/Charlie Taylor/i)).toBeInTheDocument()
      })

      // Parent role selection should be visible
      await waitFor(() => {
        expect(screen.getByText(/Select Parent Role/i)).toBeInTheDocument()
      })

      const motherButton = screen.getByLabelText(/Select Mother role/i)
      const fatherButton = screen.getByLabelText(/Select Father role/i)

      expect(motherButton).toBeInTheDocument()
      expect(fatherButton).toBeInTheDocument()
    })

    it('should create relationship with selected parent role (mother) for ambiguous gender', async () => {
      const focusPerson = {
        id: 3,
        firstName: 'Alex',
        lastName: 'Taylor',
        gender: 'other',
        userId: 1
      }
      peopleStore.set([focusPerson])

      global.fetch = vi.fn((url, options) => {
        if (url.includes('/api/facebook/profile')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({
              personData: {
                firstName: 'Charlie',
                lastName: 'Taylor',
                gender: 'male',
                birthDate: '2019-07-10'
              }
            })
          })
        }

        if (url.includes('/api/people') && options?.method === 'POST') {
          const body = JSON.parse(options.body)
          return Promise.resolve({
            ok: true,
            status: 201,
            json: () => Promise.resolve({ id: 30, userId: 1, ...body })
          })
        }

        if (url.includes('/api/relationships') && options?.method === 'POST') {
          const body = JSON.parse(options.body)
          return Promise.resolve({
            ok: true,
            status: 201,
            json: () => Promise.resolve({ id: 300, userId: 1, ...body })
          })
        }

        return Promise.reject(new Error(`Unexpected API call: ${url}`))
      })

      render(SmartRelationshipCreator, {
        props: {
          isOpen: true,
          focusPersonId: focusPerson.id
        }
      })

      const urlInput = screen.getByLabelText(/Facebook URL/i)
      await fireEvent.input(urlInput, { target: { value: 'facebook.com/charlie.taylor' } })

      const importButton = screen.getByRole('button', { name: /Import & Preview/i })
      await fireEvent.click(importButton)

      await waitFor(() => {
        expect(screen.getByText(/Charlie Taylor/i)).toBeInTheDocument()
      })

      // Select "Mother" role
      const motherButton = screen.getByLabelText(/Select Mother role/i)
      await fireEvent.click(motherButton)

      const createButton = screen.getByRole('button', { name: /Create & Add to Tree/i })
      await fireEvent.click(createButton)

      await waitFor(() => {
        const relationships = get(relationshipsStore)
        expect(relationships).toHaveLength(1)
      }, { timeout: 3000 })

      const relationships = get(relationshipsStore)
      const rel = relationships[0]

      // Alex (other gender) is mother of Charlie (user selected)
      expect(rel.person1Id).toBe(3)
      expect(rel.person2Id).toBe(30)
      expect(rel.type).toBe('mother')
      expect(rel.parentRole).toBe('mother')
    })

    it('should create relationship with selected parent role (father) for unspecified gender', async () => {
      const focusPerson = {
        id: 4,
        firstName: 'Sam',
        lastName: 'Jordan',
        gender: '', // Unspecified
        userId: 1
      }
      peopleStore.set([focusPerson])

      global.fetch = vi.fn((url, options) => {
        if (url.includes('/api/facebook/profile')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({
              personData: {
                firstName: 'Dana',
                lastName: 'Jordan',
                gender: 'female',
                birthDate: '2021-02-14'
              }
            })
          })
        }

        if (url.includes('/api/people') && options?.method === 'POST') {
          const body = JSON.parse(options.body)
          return Promise.resolve({
            ok: true,
            status: 201,
            json: () => Promise.resolve({ id: 40, userId: 1, ...body })
          })
        }

        if (url.includes('/api/relationships') && options?.method === 'POST') {
          const body = JSON.parse(options.body)
          return Promise.resolve({
            ok: true,
            status: 201,
            json: () => Promise.resolve({ id: 400, userId: 1, ...body })
          })
        }

        return Promise.reject(new Error(`Unexpected API call: ${url}`))
      })

      render(SmartRelationshipCreator, {
        props: {
          isOpen: true,
          focusPersonId: focusPerson.id
        }
      })

      const urlInput = screen.getByLabelText(/Facebook URL/i)
      await fireEvent.input(urlInput, { target: { value: 'facebook.com/dana.jordan' } })

      const importButton = screen.getByRole('button', { name: /Import & Preview/i })
      await fireEvent.click(importButton)

      await waitFor(() => {
        expect(screen.getByText(/Dana Jordan/i)).toBeInTheDocument()
      })

      // Select "Father" role
      const fatherButton = screen.getByLabelText(/Select Father role/i)
      await fireEvent.click(fatherButton)

      const createButton = screen.getByRole('button', { name: /Create & Add to Tree/i })
      await fireEvent.click(createButton)

      await waitFor(() => {
        const relationships = get(relationshipsStore)
        expect(relationships).toHaveLength(1)
      }, { timeout: 3000 })

      const relationships = get(relationshipsStore)
      const rel = relationships[0]

      // Sam (unspecified gender) is father of Dana (user selected)
      expect(rel.person1Id).toBe(4)
      expect(rel.person2Id).toBe(40)
      expect(rel.type).toBe('father')
      expect(rel.parentRole).toBe('father')
    })
  })

  describe('Mother Relationships (New Person is Parent)', () => {
    it('should create mother relationship with correct person ordering (new person is parent)', async () => {
      const focusPerson = {
        id: 5,
        firstName: 'Emma',
        lastName: 'Wilson',
        gender: 'female',
        userId: 1
      }
      peopleStore.set([focusPerson])

      global.fetch = vi.fn((url, options) => {
        if (url.includes('/api/facebook/profile')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({
              personData: {
                firstName: 'Grace',
                lastName: 'Wilson',
                gender: 'female',
                birthDate: '1960-08-20'
              }
            })
          })
        }

        if (url.includes('/api/people') && options?.method === 'POST') {
          const body = JSON.parse(options.body)
          return Promise.resolve({
            ok: true,
            status: 201,
            json: () => Promise.resolve({ id: 50, userId: 1, ...body })
          })
        }

        if (url.includes('/api/relationships') && options?.method === 'POST') {
          const body = JSON.parse(options.body)
          return Promise.resolve({
            ok: true,
            status: 201,
            json: () => Promise.resolve({ id: 500, userId: 1, ...body })
          })
        }

        return Promise.reject(new Error(`Unexpected API call: ${url}`))
      })

      render(SmartRelationshipCreator, {
        props: {
          isOpen: true,
          focusPersonId: focusPerson.id
        }
      })

      // Select mother relationship type
      const relationshipSelect = screen.getByLabelText(/Relationship Type/i)
      await fireEvent.change(relationshipSelect, { target: { value: 'mother' } })

      const urlInput = screen.getByLabelText(/Facebook URL/i)
      await fireEvent.input(urlInput, { target: { value: 'facebook.com/grace.wilson' } })

      const importButton = screen.getByRole('button', { name: /Import & Preview/i })
      await fireEvent.click(importButton)

      await waitFor(() => {
        expect(screen.getByText(/Grace Wilson/i)).toBeInTheDocument()
      })

      const createButton = screen.getByRole('button', { name: /Create & Add to Tree/i })
      await fireEvent.click(createButton)

      await waitFor(() => {
        const relationships = get(relationshipsStore)
        expect(relationships).toHaveLength(1)
      }, { timeout: 3000 })

      const relationships = get(relationshipsStore)
      const rel = relationships[0]

      // Grace (new person) is mother of Emma (focus person)
      expect(rel.person1Id).toBe(50) // Grace is parent (person1)
      expect(rel.person2Id).toBe(5) // Emma is child (person2)
      expect(rel.type).toBe('mother')
      expect(rel.parentRole).toBe('mother')
    })
  })

  describe('Father Relationships (New Person is Parent)', () => {
    it('should create father relationship with correct person ordering (new person is parent)', async () => {
      const focusPerson = {
        id: 6,
        firstName: 'Liam',
        lastName: 'Brown',
        gender: 'male',
        userId: 1
      }
      peopleStore.set([focusPerson])

      global.fetch = vi.fn((url, options) => {
        if (url.includes('/api/facebook/profile')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({
              personData: {
                firstName: 'Henry',
                lastName: 'Brown',
                gender: 'male',
                birthDate: '1955-11-30'
              }
            })
          })
        }

        if (url.includes('/api/people') && options?.method === 'POST') {
          const body = JSON.parse(options.body)
          return Promise.resolve({
            ok: true,
            status: 201,
            json: () => Promise.resolve({ id: 60, userId: 1, ...body })
          })
        }

        if (url.includes('/api/relationships') && options?.method === 'POST') {
          const body = JSON.parse(options.body)
          return Promise.resolve({
            ok: true,
            status: 201,
            json: () => Promise.resolve({ id: 600, userId: 1, ...body })
          })
        }

        return Promise.reject(new Error(`Unexpected API call: ${url}`))
      })

      render(SmartRelationshipCreator, {
        props: {
          isOpen: true,
          focusPersonId: focusPerson.id
        }
      })

      // Select father relationship type
      const relationshipSelect = screen.getByLabelText(/Relationship Type/i)
      await fireEvent.change(relationshipSelect, { target: { value: 'father' } })

      const urlInput = screen.getByLabelText(/Facebook URL/i)
      await fireEvent.input(urlInput, { target: { value: 'facebook.com/henry.brown' } })

      const importButton = screen.getByRole('button', { name: /Import & Preview/i })
      await fireEvent.click(importButton)

      await waitFor(() => {
        expect(screen.getByText(/Henry Brown/i)).toBeInTheDocument()
      })

      const createButton = screen.getByRole('button', { name: /Create & Add to Tree/i })
      await fireEvent.click(createButton)

      await waitFor(() => {
        const relationships = get(relationshipsStore)
        expect(relationships).toHaveLength(1)
      }, { timeout: 3000 })

      const relationships = get(relationshipsStore)
      const rel = relationships[0]

      // Henry (new person) is father of Liam (focus person)
      expect(rel.person1Id).toBe(60) // Henry is parent (person1)
      expect(rel.person2Id).toBe(6) // Liam is child (person2)
      expect(rel.type).toBe('father')
      expect(rel.parentRole).toBe('father')
    })
  })
})
