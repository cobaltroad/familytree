import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/svelte'
import { get } from 'svelte/store'
import Page from '../../routes/+page.svelte'
import * as familyStore from '../../stores/familyStore.js'
import { goto } from '$app/navigation'

// Mock the $app/navigation module
vi.mock('$app/navigation', () => ({
  goto: vi.fn()
}))

// Mock the $app/environment module
vi.mock('$app/environment', () => ({
  browser: true
}))

// Mock the API module
vi.mock('$lib/api', () => ({
  api: {
    getAllPeople: vi.fn(),
    getAllRelationships: vi.fn()
  }
}))

/**
 * Test Suite: Authentication Handling in Main Page
 *
 * Tests the behavior of the main page when users are not authenticated.
 * The page should handle 401 errors gracefully and redirect to signin.
 *
 * TDD Red Phase: These tests demonstrate the expected behavior
 */
describe('+page.svelte - Authentication Handling', () => {
  beforeEach(() => {
    // Reset stores before each test
    familyStore.people.set([])
    familyStore.relationships.set([])
    familyStore.error.set(null)
    familyStore.loading.set(false)

    // Clear all mocks
    vi.clearAllMocks()
  })

  describe('Unauthenticated User Behavior', () => {
    it('should handle 401 error when fetching people without authentication', async () => {
      // Arrange: Mock API to return 401 error (unauthenticated)
      const { api } = await import('$lib/api')
      const authError = new Error('Authentication required')
      authError.status = 401
      api.getAllPeople.mockRejectedValue(authError)
      api.getAllRelationships.mockRejectedValue(authError)

      // Act: Render the page (which triggers loadData in onMount)
      render(Page)

      // Assert: Should set error in store
      await waitFor(() => {
        expect(get(familyStore.error)).toBeTruthy()
        expect(get(familyStore.error)).toContain('Authentication required')
      })
    })

    it('should redirect to signin page when API returns 401', async () => {
      // Arrange: Mock API to return 401 error
      const { api } = await import('$lib/api')
      const authError = new Error('Authentication required')
      authError.status = 401
      api.getAllPeople.mockRejectedValue(authError)
      api.getAllRelationships.mockRejectedValue(authError)

      // Act: Render the page
      render(Page)

      // Assert: Should redirect to signin page
      await waitFor(() => {
        expect(goto).toHaveBeenCalledWith('/signin')
      })
    })

    it('should not redirect for non-authentication errors', async () => {
      // Arrange: Mock API to return regular error (500)
      const { api } = await import('$lib/api')
      const serverError = new Error('Internal Server Error')
      serverError.status = 500
      api.getAllPeople.mockRejectedValue(serverError)
      api.getAllRelationships.mockRejectedValue(serverError)

      // Act: Render the page
      render(Page)

      // Assert: Should NOT redirect (just show error)
      await waitFor(() => {
        expect(get(familyStore.error)).toBeTruthy()
      })

      // Should not redirect for server errors
      expect(goto).not.toHaveBeenCalled()
    })
  })

  describe('Authenticated User Behavior', () => {
    it('should load data successfully for authenticated users', async () => {
      // Arrange: Mock successful API responses
      const { api } = await import('$lib/api')
      const mockPeople = [
        { id: 1, firstName: 'John', lastName: 'Doe' }
      ]
      const mockRelationships = [
        { id: 1, person1Id: 1, person2Id: 2, type: 'spouse' }
      ]
      api.getAllPeople.mockResolvedValue(mockPeople)
      api.getAllRelationships.mockResolvedValue(mockRelationships)

      // Act: Render the page
      render(Page)

      // Assert: Should load data into stores
      await waitFor(() => {
        expect(get(familyStore.people)).toEqual(mockPeople)
        expect(get(familyStore.relationships)).toEqual(mockRelationships)
        expect(get(familyStore.error)).toBeNull()
      })

      // Should NOT redirect
      expect(goto).not.toHaveBeenCalled()
    })
  })
})
