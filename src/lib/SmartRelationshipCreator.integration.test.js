import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte'
import { get } from 'svelte/store'
import SmartRelationshipCreator from './SmartRelationshipCreator.svelte'
import { people as peopleStore, relationships as relationshipsStore } from '../stores/familyStore.js'
import { modal } from '../stores/modalStore.js'
import * as notificationStore from '../stores/notificationStore.js'

/**
 * INTEGRATION TEST: Full end-to-end test
 *
 * This test uses REAL API calls (or realistic mocks) to verify that:
 * 1. Person is created and added to the people store
 * 2. Relationship is created and added to the relationships store
 *
 * The bug might be that the API calls succeed but the stores don't update.
 */
describe('SmartRelationshipCreator - Integration Test (Stores)', () => {
  beforeEach(() => {
    // Reset stores to clean state
    peopleStore.set([])
    relationshipsStore.set([])
    modal.close()
  })

  it('should update BOTH people store AND relationships store after creation', async () => {
    // GIVEN I have one person in the store
    const focusPerson = {
      id: 1,
      firstName: 'Jane',
      lastName: 'Smith',
      gender: 'female',
      userId: 1
    }
    peopleStore.set([focusPerson])

    // Verify initial state
    expect(get(peopleStore)).toHaveLength(1)
    expect(get(relationshipsStore)).toHaveLength(0)

    // Mock the global fetch function for API calls
    global.fetch = vi.fn((url, options) => {
      if (url.includes('/api/facebook/profile')) {
        // Mock Facebook profile import
        // The API returns { personData: {...} }, not the data directly
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            personData: {
              firstName: 'John',
              lastName: 'Doe',
              gender: 'male',
              birthDate: '1995-05-15',
              photoUrl: 'https://facebook.com/photo.jpg'
            }
          })
        })
      }

      if (url.includes('/api/people') && options?.method === 'POST') {
        // Mock createPerson API
        const body = JSON.parse(options.body)
        const newPerson = { id: 10, userId: 1, ...body }

        // NOTE: Do NOT update the store here - the action creator handles that!
        // The action creator uses optimistic updates and will manage the store

        return Promise.resolve({
          ok: true,
          status: 201,
          json: () => Promise.resolve(newPerson)
        })
      }

      if (url.includes('/api/relationships') && options?.method === 'POST') {
        // Mock createRelationship API
        const body = JSON.parse(options.body)
        const newRelationship = { id: 100, userId: 1, ...body }

        // NOTE: Do NOT update the store here - the action creator handles that!
        // The action creator uses optimistic updates and will manage the store

        return Promise.resolve({
          ok: true,
          status: 201,
          json: () => Promise.resolve(newRelationship)
        })
      }

      return Promise.reject(new Error(`Unexpected API call: ${url}`))
    })

    // Render the component
    render(SmartRelationshipCreator, {
      props: {
        isOpen: true,
        focusPersonId: focusPerson.id
      }
    })

    // Import Facebook profile
    const urlInput = screen.getByLabelText(/Facebook URL/i)
    await fireEvent.input(urlInput, { target: { value: 'facebook.com/john.doe' } })

    const importButton = screen.getByRole('button', { name: /Import & Preview/i })
    await fireEvent.click(importButton)

    await waitFor(() => {
      expect(screen.getByText(/John Doe/i)).toBeInTheDocument()
    })

    // WHEN I click "Create & Add to Tree"
    const createButton = screen.getByRole('button', { name: /Create & Add to Tree/i })
    await fireEvent.click(createButton)

    // THEN both stores should be updated
    await waitFor(() => {
      const people = get(peopleStore)
      expect(people).toHaveLength(2) // Jane + John
    }, { timeout: 3000 })

    const relationships = get(relationshipsStore)
    expect(relationships).toHaveLength(1) // One relationship created

    // Verify the relationship
    const relationship = relationships[0]
    expect(relationship.person1Id).toBe(1) // Jane is parent
    expect(relationship.person2Id).toBe(10) // John is child
    expect(relationship.type).toBe('mother')
    expect(relationship.parentRole).toBe('mother')
  })

  it('should update stores in fallback mode after manual entry', async () => {
    // GIVEN I have one person in the store
    const focusPerson = {
      id: 1,
      firstName: 'Jane',
      lastName: 'Smith',
      gender: 'female',
      userId: 1
    }
    peopleStore.set([focusPerson])

    // Verify initial state
    expect(get(peopleStore)).toHaveLength(1)
    expect(get(relationshipsStore)).toHaveLength(0)

    // Mock the global fetch function for API calls
    global.fetch = vi.fn((url, options) => {
      if (url.includes('/api/facebook/profile')) {
        // Mock Facebook profile import FAILURE
        return Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ error: 'Profile not found' })
        })
      }

      if (url.includes('/api/people') && options?.method === 'POST') {
        // Mock createPerson API
        const body = JSON.parse(options.body)
        const newPerson = { id: 10, userId: 1, ...body }

        // NOTE: Do NOT update the store here - the action creator handles that!
        // The action creator uses optimistic updates and will manage the store

        return Promise.resolve({
          ok: true,
          status: 201,
          json: () => Promise.resolve(newPerson)
        })
      }

      if (url.includes('/api/relationships') && options?.method === 'POST') {
        // Mock createRelationship API
        const body = JSON.parse(options.body)
        const newRelationship = { id: 100, userId: 1, ...body }

        // NOTE: Do NOT update the store here - the action creator handles that!
        // The action creator uses optimistic updates and will manage the store

        return Promise.resolve({
          ok: true,
          status: 201,
          json: () => Promise.resolve(newRelationship)
        })
      }

      return Promise.reject(new Error(`Unexpected API call: ${url}`))
    })

    // Render the component
    render(SmartRelationshipCreator, {
      props: {
        isOpen: true,
        focusPersonId: focusPerson.id
      }
    })

    // Try to import (will fail)
    const urlInput = screen.getByLabelText(/Facebook URL/i)
    await fireEvent.input(urlInput, { target: { value: 'facebook.com/john.doe' } })

    const importButton = screen.getByRole('button', { name: /Import & Preview/i })
    await fireEvent.click(importButton)

    // Wait for fallback mode
    await waitFor(() => {
      expect(screen.getByText(/We couldn't import this profile/i)).toBeInTheDocument()
    })

    // Manually enter data
    const firstNameInput = screen.getByLabelText(/First Name/i)
    const lastNameInput = screen.getByLabelText(/Last Name/i)
    const genderSelect = screen.getByLabelText(/Gender/i)
    const birthDateInput = screen.getByLabelText(/Birth Date/i)

    await fireEvent.input(firstNameInput, { target: { value: 'John' } })
    await fireEvent.input(lastNameInput, { target: { value: 'Doe' } })
    await fireEvent.change(genderSelect, { target: { value: 'male' } })
    await fireEvent.input(birthDateInput, { target: { value: '1990-01-15' } })

    // WHEN I click "Create & Add to Tree"
    const createButton = screen.getByRole('button', { name: /Create & Add to Tree/i })
    await fireEvent.click(createButton)

    // THEN both stores should be updated (THIS IS THE BUG IN FALLBACK MODE)
    await waitFor(() => {
      const people = get(peopleStore)
      expect(people).toHaveLength(2) // Jane + John
    }, { timeout: 3000 })

    const relationships = get(relationshipsStore)
    expect(relationships).toHaveLength(1) // One relationship created

    // Verify the relationship
    const relationship = relationships[0]
    expect(relationship.person1Id).toBe(1) // Jane is parent
    expect(relationship.person2Id).toBe(10) // John is child
    expect(relationship.type).toBe('mother')
    expect(relationship.parentRole).toBe('mother')
  })
})
