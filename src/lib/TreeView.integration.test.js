/**
 * Integration Test Suite for TreeView Component
 *
 * This test suite validates TreeView integration with:
 * - Svelte stores ($people, $relationships, $rootPeople)
 * - Modal store (modal.open())
 * - family-chart library
 * - Real-world data scenarios
 *
 * @module TreeView.integration.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/svelte'
import { tick } from 'svelte'
import TreeView from './TreeView.svelte'
import { people, relationships } from '../stores/familyStore.js'
import { rootPeople } from '../stores/derivedStores.js'
import { modal } from '../stores/modalStore.js'
import { get } from 'svelte/store'

describe('TreeView - Store Integration', () => {
  beforeEach(() => {
    people.set([])
    relationships.set([])
  })

  it('should reactively update when people store changes', async () => {
    const { container, component } = render(TreeView)

    // Initially empty
    expect(get(people)).toHaveLength(0)
    expect(component.getTransformedData()).toHaveLength(0)

    // Add people
    people.set([
      { id: 1, firstName: 'John', lastName: 'Doe', gender: 'male', birthDate: '1950-01-01', deathDate: null },
      { id: 2, firstName: 'Jane', lastName: 'Smith', gender: 'female', birthDate: '1952-01-01', deathDate: null }
    ])

    await new Promise(resolve => setTimeout(resolve, 100))

    // Should transform data reactively
    expect(component.getTransformedData()).toHaveLength(2)
  })

  it('should reactively update when relationships store changes', async () => {
    const { component } = render(TreeView)

    // Set initial people
    people.set([
      { id: 1, firstName: 'Parent', lastName: 'Test', gender: 'male', birthDate: '1950-01-01', deathDate: null },
      { id: 2, firstName: 'Child', lastName: 'Test', gender: 'male', birthDate: '1975-01-01', deathDate: null }
    ])

    await new Promise(resolve => setTimeout(resolve, 50))

    // Initially no relationships
    const initialData = component.getTransformedData()
    const parent = initialData.find(d => d.id === '1')
    expect(parent.rels.children).toHaveLength(0)

    // Add relationship
    relationships.set([
      { id: 1, person1Id: 1, person2Id: 2, type: 'father', parentRole: 'father' }
    ])

    await new Promise(resolve => setTimeout(resolve, 50))

    // Should update relationships
    const updatedData = component.getTransformedData()
    const updatedParent = updatedData.find(d => d.id === '1')
    expect(updatedParent.rels.children).toContain('2')
  })

  it('should use rootPeople derived store for initial focus person', async () => {
    people.set([
      { id: 1, firstName: 'Root1', lastName: 'Test', gender: 'male', birthDate: '1920-01-01', deathDate: null },
      { id: 2, firstName: 'Child', lastName: 'Test', gender: 'male', birthDate: '1950-01-01', deathDate: null },
      { id: 3, firstName: 'Root2', lastName: 'Test', gender: 'female', birthDate: '1925-01-01', deathDate: null }
    ])

    relationships.set([
      { id: 1, person1Id: 1, person2Id: 2, type: 'father', parentRole: 'father' }
    ])

    await new Promise(resolve => setTimeout(resolve, 50))

    const roots = get(rootPeople)
    expect(roots).toHaveLength(2)
    expect(roots.map(r => r.id)).toContain(1)
    expect(roots.map(r => r.id)).toContain(3)

    const { component } = render(TreeView)
    await new Promise(resolve => setTimeout(resolve, 50))

    // Should default to first root person
    const focusId = component.getFocusPersonId()
    expect([1, 3]).toContain(focusId)
  })
})