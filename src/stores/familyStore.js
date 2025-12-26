/**
 * Core Svelte stores for family tree data.
 * These stores provide reactive state management for people, relationships, and UI state.
 *
 * @module familyStore
 */

import { writable } from 'svelte/store'

/**
 * @typedef {Object} Person
 * @property {number} id - Unique identifier for the person
 * @property {string} firstName - First name
 * @property {string} lastName - Last name
 * @property {string|null} birthDate - Birth date in YYYY-MM-DD format
 * @property {string|null} deathDate - Death date in YYYY-MM-DD format
 * @property {string|null} gender - Gender (female, male, other, or null for unspecified)
 */

/**
 * @typedef {Object} Relationship
 * @property {number} id - Unique identifier for the relationship
 * @property {number} person1Id - ID of the first person in the relationship
 * @property {number} person2Id - ID of the second person in the relationship
 * @property {string} type - Type of relationship (parentOf, spouse)
 * @property {string|null} parentRole - Role in parent relationship (mother, father)
 */

/**
 * Store containing all people in the family tree.
 * @type {import('svelte/store').Writable<Person[]>}
 */
export const people = writable([])

/**
 * Store containing all relationships between people.
 * @type {import('svelte/store').Writable<Relationship[]>}
 */
export const relationships = writable([])

/**
 * Store indicating whether data is currently being loaded.
 * @type {import('svelte/store').Writable<boolean>}
 */
export const loading = writable(false)

/**
 * Store containing error message if an error occurred, null otherwise.
 * @type {import('svelte/store').Writable<string|null>}
 */
export const error = writable(null)
