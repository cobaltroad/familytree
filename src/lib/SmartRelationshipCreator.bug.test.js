import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte'
import { get } from 'svelte/store'
import SmartRelationshipCreator from './SmartRelationshipCreator.svelte'
import { people, relationships } from '../stores/familyStore.js'
import { modal } from '../stores/modalStore.js'
import * as api from './api.js'

/**
 * BUG REPRODUCTION TEST
 *
 * This test reproduces the bug where:
 * - Person is created successfully
 * - Relationship is NOT created
 *
 * Expected: Both person AND relationship should be created
 * Actual: Only person is created, relationship creation is missing or failing
 */
describe('SmartRelationshipCreator - Bug Reproduction: Relationship Not Created', () => {
  let mockApi
  let consoleLogSpy
  let consoleErrorSpy

  beforeEach(() => {
    // Reset stores
    people.set([])
    relationships.set([])
    modal.close()

    // Spy on console to catch any hidden errors
    consoleLogSpy = vi.spyOn(console, 'log')
    consoleErrorSpy = vi.spyOn(console, 'error')

    // Mock API
    mockApi = {
      createPerson: vi.fn(),
      createRelationship: vi.fn(),
      deletePerson: vi.fn(),
      fetchFacebookProfile: vi.fn()
    }

    // Spy on API module
    vi.spyOn(api, 'api', 'get').mockReturnValue(mockApi)
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  it('CRITICAL: should create BOTH person AND relationship when clicking Create & Add to Tree', async () => {
    // GIVEN I have a focus person
    const focusPerson = {
      id: 1,
      firstName: 'Jane',
      lastName: 'Smith',
      gender: 'female'
    }
    people.set([focusPerson])

    // AND I have successfully imported Facebook profile data
    const importedData = {
      firstName: 'John',
      lastName: 'Doe',
      gender: 'male',
      birthDate: '1995-05-15',
      photoUrl: 'https://facebook.com/photo.jpg'
    }
    mockApi.fetchFacebookProfile.mockResolvedValue(importedData)

    // AND the API will successfully create the person
    const createdPerson = { id: 10, ...importedData }
    mockApi.createPerson.mockResolvedValue(createdPerson)

    // AND the API will successfully create the relationship
    const createdRelationship = {
      id: 100,
      person1Id: 1,
      person2Id: 10,
      type: 'mother',
      parentRole: 'mother'
    }
    mockApi.createRelationship.mockResolvedValue(createdRelationship)

    // Render the component
    render(SmartRelationshipCreator, {
      props: {
        isOpen: true,
        focusPersonId: focusPerson.id
      }
    })

    // Import the profile
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

    // THEN the person should be created
    await waitFor(() => {
      expect(mockApi.createPerson).toHaveBeenCalledTimes(1)
    })
    expect(mockApi.createPerson).toHaveBeenCalledWith({
      ...importedData,
      facebookUrl: 'facebook.com/john.doe'
    })

    // AND THE RELATIONSHIP MUST ALSO BE CREATED (THIS IS THE BUG)
    expect(mockApi.createRelationship).toHaveBeenCalledTimes(1)
    expect(mockApi.createRelationship).toHaveBeenCalledWith({
      person1Id: 1,
      person2Id: 10,
      type: 'mother',
      parentRole: 'mother'
    })

    // AND no errors should have been logged
    expect(consoleErrorSpy).not.toHaveBeenCalled()
  })

  it('FALLBACK MODE: should create BOTH person AND relationship after failed import', async () => {
    // GIVEN I have a focus person
    const focusPerson = {
      id: 1,
      firstName: 'Jane',
      lastName: 'Smith',
      gender: 'female'
    }
    people.set([focusPerson])

    // AND the Facebook import FAILS
    mockApi.fetchFacebookProfile.mockRejectedValue(new Error('Profile not found'))

    // AND the API will successfully create the person
    const createdPerson = {
      id: 10,
      firstName: 'John',
      lastName: 'Doe',
      gender: 'male',
      birthDate: '1990-01-15',
      facebookUrl: 'facebook.com/john.doe'
    }
    mockApi.createPerson.mockResolvedValue(createdPerson)

    // AND the API will successfully create the relationship
    const createdRelationship = {
      id: 100,
      person1Id: 1,
      person2Id: 10,
      type: 'mother',
      parentRole: 'mother'
    }
    mockApi.createRelationship.mockResolvedValue(createdRelationship)

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

    // THEN the person should be created
    await waitFor(() => {
      expect(mockApi.createPerson).toHaveBeenCalledTimes(1)
    })

    // AND THE RELATIONSHIP MUST ALSO BE CREATED (THIS IS THE BUG IN FALLBACK MODE)
    expect(mockApi.createRelationship).toHaveBeenCalledTimes(1)
    expect(mockApi.createRelationship).toHaveBeenCalledWith({
      person1Id: 1,
      person2Id: 10,
      type: 'mother',
      parentRole: 'mother'
    })

    // NOTE: Console errors are expected during import failure (this is normal)
    // The bug we're testing is whether the relationship gets created despite the import error
  })

  it('should verify the exact sequence of API calls', async () => {
    // This test verifies the order of operations
    const callOrder = []

    const focusPerson = { id: 1, firstName: 'Jane', lastName: 'Smith', gender: 'female' }
    people.set([focusPerson])

    const importedData = { firstName: 'John', lastName: 'Doe', gender: 'male' }
    mockApi.fetchFacebookProfile.mockResolvedValue(importedData)

    const createdPerson = { id: 10, ...importedData }
    mockApi.createPerson.mockImplementation((...args) => {
      callOrder.push({ method: 'createPerson', args })
      return Promise.resolve(createdPerson)
    })

    const createdRelationship = {
      id: 100,
      person1Id: 1,
      person2Id: 10,
      type: 'mother',
      parentRole: 'mother'
    }
    mockApi.createRelationship.mockImplementation((...args) => {
      callOrder.push({ method: 'createRelationship', args })
      return Promise.resolve(createdRelationship)
    })

    render(SmartRelationshipCreator, {
      props: {
        isOpen: true,
        focusPersonId: focusPerson.id
      }
    })

    const urlInput = screen.getByLabelText(/Facebook URL/i)
    await fireEvent.input(urlInput, { target: { value: 'facebook.com/john.doe' } })

    const importButton = screen.getByRole('button', { name: /Import & Preview/i })
    await fireEvent.click(importButton)

    await waitFor(() => {
      expect(screen.getByText(/John Doe/i)).toBeInTheDocument()
    })

    const createButton = screen.getByRole('button', { name: /Create & Add to Tree/i })
    await fireEvent.click(createButton)

    // THEN the calls should happen in the correct order
    await waitFor(() => {
      expect(callOrder.length).toBe(2)
    })

    // First: createPerson
    expect(callOrder[0].method).toBe('createPerson')

    // Second: createRelationship (THIS MIGHT NOT BE CALLED - THE BUG)
    expect(callOrder[1].method).toBe('createRelationship')
    expect(callOrder[1].args[0]).toEqual({
      person1Id: 1,
      person2Id: 10,
      type: 'mother',
      parentRole: 'mother'
    })
  })
})
