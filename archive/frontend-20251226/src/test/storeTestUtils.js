/**
 * Test utilities for Svelte store testing.
 * Provides helper functions for creating mock stores, resetting state, and capturing updates.
 *
 * @module storeTestUtils
 */

import { writable } from 'svelte/store'
import { people, relationships, loading, error } from '../stores/familyStore.js'

/**
 * Creates a mock Svelte writable store with an initial value.
 * Useful for testing components that depend on stores without using real stores.
 *
 * @param {*} initialValue - The initial value for the mock store
 * @returns {import('svelte/store').Writable} A Svelte writable store
 *
 * @example
 * const mockPeople = mockStore([])
 * mockPeople.set([{ id: 1, firstName: 'John' }])
 */
export function mockStore(initialValue) {
  return writable(initialValue)
}

/**
 * Resets all family tree stores to their initial state.
 * Should be called in beforeEach() to ensure test isolation.
 *
 * @example
 * beforeEach(() => {
 *   resetStores()
 * })
 */
export function resetStores() {
  people.set([])
  relationships.set([])
  loading.set(false)
  error.set(null)
}

/**
 * Captures all updates to a store in an array.
 * Returns an object with the updates array and unsubscribe function.
 *
 * @param {import('svelte/store').Readable} store - The store to monitor
 * @returns {{ updates: Array, unsubscribe: Function }} Object containing updates array and unsubscribe function
 *
 * @example
 * const { updates, unsubscribe } = captureStoreUpdates(people)
 * people.set([{ id: 1, firstName: 'John' }])
 * expect(updates.length).toBe(2) // Initial value + update
 * expect(updates[1]).toEqual([{ id: 1, firstName: 'John' }])
 * unsubscribe()
 */
export function captureStoreUpdates(store) {
  const updates = []
  const unsubscribe = store.subscribe(value => {
    updates.push(value)
  })

  return {
    updates,
    unsubscribe
  }
}

/**
 * Creates a spy that tracks store subscription calls.
 * Useful for verifying subscription behavior in components.
 *
 * @param {import('svelte/store').Readable} store - The store to spy on
 * @returns {{ callCount: number, values: Array, unsubscribe: Function }} Spy object
 *
 * @example
 * const spy = createStoreSpy(people)
 * people.set([{ id: 1, firstName: 'John' }])
 * expect(spy.callCount).toBe(2)
 * expect(spy.values[1]).toEqual([{ id: 1, firstName: 'John' }])
 * spy.unsubscribe()
 */
export function createStoreSpy(store) {
  const spy = {
    callCount: 0,
    values: []
  }

  const unsubscribe = store.subscribe(value => {
    spy.callCount++
    spy.values.push(value)
  })

  spy.unsubscribe = unsubscribe

  return spy
}

/**
 * Waits for a store to reach a specific value.
 * Useful for async testing scenarios.
 *
 * @param {import('svelte/store').Readable} store - The store to monitor
 * @param {*} expectedValue - The value to wait for
 * @param {number} timeout - Maximum time to wait in milliseconds (default: 1000)
 * @returns {Promise<void>} Resolves when value is reached, rejects on timeout
 *
 * @example
 * loading.set(true)
 * // ... async operation ...
 * await waitForStoreValue(loading, false)
 * expect(get(loading)).toBe(false)
 */
export function waitForStoreValue(store, expectedValue, timeout = 1000) {
  return new Promise((resolve, reject) => {
    let timer
    let unsub

    const cleanup = () => {
      if (timer) clearTimeout(timer)
      if (unsub) unsub()
    }

    timer = setTimeout(() => {
      cleanup()
      reject(new Error(`Timeout waiting for store value: ${JSON.stringify(expectedValue)}`))
    }, timeout)

    unsub = store.subscribe(value => {
      if (JSON.stringify(value) === JSON.stringify(expectedValue)) {
        cleanup()
        resolve()
      }
    })
  })
}

/**
 * Creates a test fixture with pre-populated store data.
 * Useful for setting up consistent test scenarios.
 *
 * @param {Object} options - Configuration options
 * @param {Array} options.people - People data
 * @param {Array} options.relationships - Relationship data
 * @param {boolean} options.loading - Loading state
 * @param {string|null} options.error - Error message
 *
 * @example
 * createTestFixture({
 *   people: [{ id: 1, firstName: 'John', lastName: 'Doe' }],
 *   relationships: [{ id: 1, person1Id: 1, person2Id: 2, type: 'spouse' }],
 *   loading: false,
 *   error: null
 * })
 */
export function createTestFixture(options = {}) {
  const {
    people: peopleData = [],
    relationships: relationshipsData = [],
    loading: loadingState = false,
    error: errorState = null
  } = options

  people.set(peopleData)
  relationships.set(relationshipsData)
  loading.set(loadingState)
  error.set(errorState)
}
