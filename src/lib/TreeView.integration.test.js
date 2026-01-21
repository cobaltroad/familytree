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

describe('TreeView - Modal Store Integration', () => {
  beforeEach(() => {
    people.set([
      { id: 1, firstName: 'John', lastName: 'Doe', gender: 'male', birthDate: '1950-01-01', deathDate: null }
    ])
    relationships.set([])
    vi.clearAllMocks()
  })

  it('should call modal.open() when person card is clicked', async () => {
    const modalSpy = vi.spyOn(modal, 'open')
    const { component, container } = render(TreeView)
    await new Promise(resolve => setTimeout(resolve, 100))
    await tick()

    console.log("Container", container.innerHTML)
    console.log("Data", component.getTransformedData())
    const personCard = container.querySelector('[data-person-id="1"]')
    await fireEvent.click(personCard)

    expect(modalSpy).toHaveBeenCalledTimes(1)
    expect(modalSpy).toHaveBeenCalledWith(1, 'edit')
  })

  it('should not call modal.open() if custom onPersonClick handler is provided', async () => {
    const modalSpy = vi.spyOn(modal, 'open')
    const customHandler = vi.fn()

    const { container } = render(TreeView, { props: { onPersonClick: customHandler } })
    await new Promise(resolve => setTimeout(resolve, 100))

    const personCard = container.querySelector('[data-person-id="1"]')
    await fireEvent.click(personCard)

    // Custom handler called instead of modal
    expect(customHandler).toHaveBeenCalledWith(1)
    expect(modalSpy).not.toHaveBeenCalled()
  })
})

describe('TreeView - Complex Family Structures', () => {
  it('should handle multi-generational family tree (3 generations)', async () => {
    people.set([
      { id: 1, firstName: 'Grandpa', lastName: 'Smith', gender: 'male', birthDate: '1920-01-01', deathDate: '2000-01-01' },
      { id: 2, firstName: 'Grandma', lastName: 'Smith', gender: 'female', birthDate: '1922-01-01', deathDate: '2005-01-01' },
      { id: 3, firstName: 'Parent', lastName: 'Smith', gender: 'male', birthDate: '1950-01-01', deathDate: null },
      { id: 4, firstName: 'Child', lastName: 'Smith', gender: 'female', birthDate: '1980-01-01', deathDate: null }
    ])

    relationships.set([
      { id: 1, person1Id: 1, person2Id: 3, type: 'father', parentRole: 'father' },
      { id: 2, person1Id: 2, person2Id: 3, type: 'mother', parentRole: 'mother' },
      { id: 3, person1Id: 1, person2Id: 2, type: 'spouse', parentRole: null },
      { id: 4, person1Id: 3, person2Id: 4, type: 'father', parentRole: 'father' }
    ])

    const { container, component } = render(TreeView)
    await new Promise(resolve => setTimeout(resolve, 100))

    // All people should be in transformed data
    const data = component.getTransformedData()
    expect(data).toHaveLength(4)

    // Child should have correct parent relationships
    const child = data.find(d => d.id === '4')
    expect(child.rels.parents).toContain('3')

    // Parent should have correct relationships
    const parent = data.find(d => d.id === '3')
    expect(parent.rels.parents).toHaveLength(2)
    expect(parent.rels.children).toContain('4')

    // All names should be visible
    expect(container.textContent).toContain('Grandpa')
    expect(container.textContent).toContain('Grandma')
    expect(container.textContent).toContain('Parent')
    expect(container.textContent).toContain('Child')
  })

  it('should handle multiple spouses', async () => {
    people.set([
      { id: 1, firstName: 'Person', lastName: 'Test', gender: 'male', birthDate: '1950-01-01', deathDate: null },
      { id: 2, firstName: 'Spouse1', lastName: 'Test', gender: 'female', birthDate: '1952-01-01', deathDate: '2000-01-01' },
      { id: 3, firstName: 'Spouse2', lastName: 'Test', gender: 'female', birthDate: '1955-01-01', deathDate: null }
    ])

    relationships.set([
      { id: 1, person1Id: 1, person2Id: 2, type: 'spouse', parentRole: null },
      { id: 2, person1Id: 1, person2Id: 3, type: 'spouse', parentRole: null }
    ])

    const { component } = render(TreeView)
    await new Promise(resolve => setTimeout(resolve, 50))

    const data = component.getTransformedData()
    const person = data.find(d => d.id === '1')

    // Should have both spouses
    expect(person.rels.spouses).toHaveLength(2)
    expect(person.rels.spouses).toContain('2')
    expect(person.rels.spouses).toContain('3')
  })

  it('should handle half-siblings (shared single parent)', async () => {
    people.set([
      { id: 1, firstName: 'Parent', lastName: 'Test', gender: 'male', birthDate: '1950-01-01', deathDate: null },
      { id: 2, firstName: 'Child1', lastName: 'Test', gender: 'male', birthDate: '1975-01-01', deathDate: null },
      { id: 3, firstName: 'Child2', lastName: 'Test', gender: 'female', birthDate: '1980-01-01', deathDate: null }
    ])

    relationships.set([
      { id: 1, person1Id: 1, person2Id: 2, type: 'father', parentRole: 'father' },
      { id: 2, person1Id: 1, person2Id: 3, type: 'father', parentRole: 'father' }
    ])

    const { container, component } = render(TreeView)
    await new Promise(resolve => setTimeout(resolve, 100))

    const data = component.getTransformedData()
    const parent = data.find(d => d.id === '1')

    // Parent should have both children
    expect(parent.rels.children).toHaveLength(2)
    expect(parent.rels.children).toContain('2')
    expect(parent.rels.children).toContain('3')

    // Both children should appear in the tree
    expect(container.textContent).toContain('Child1')
    expect(container.textContent).toContain('Child2')
  })
})

describe('TreeView - Real-World Scenarios', () => {
  it('should handle focus person change with preserved zoom/pan', async () => {
    people.set([
      { id: 1, firstName: 'Person1', lastName: 'Test', gender: 'male', birthDate: '1950-01-01', deathDate: null },
      { id: 2, firstName: 'Person2', lastName: 'Test', gender: 'female', birthDate: '1952-01-01', deathDate: null }
    ])
    relationships.set([])

    const { container, component } = render(TreeView)
    await new Promise(resolve => setTimeout(resolve, 100))

    // Initial focus
    expect(component.getFocusPersonId()).toBe(1)

    // Change focus
    const dropdown = container.querySelector('[data-testid="focus-person-select"]')
    await fireEvent.change(dropdown, { target: { value: '2' } })
    await new Promise(resolve => setTimeout(resolve, 100))

    // Focus should be updated
    expect(component.getFocusPersonId()).toBe(2)

    // Chart should still be rendered
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('should handle person deletion gracefully', async () => {
    people.set([
      { id: 1, firstName: 'Person1', lastName: 'Test', gender: 'male', birthDate: '1950-01-01', deathDate: null },
      { id: 2, firstName: 'Person2', lastName: 'Test', gender: 'female', birthDate: '1952-01-01', deathDate: null }
    ])
    relationships.set([])

    const { container, component } = render(TreeView)
    await new Promise(resolve => setTimeout(resolve, 100))

    expect(component.getTransformedData()).toHaveLength(2)

    // Delete one person
    people.set([
      { id: 2, firstName: 'Person2', lastName: 'Test', gender: 'female', birthDate: '1952-01-01', deathDate: null }
    ])

    await new Promise(resolve => setTimeout(resolve, 100))

    // Should update reactively
    expect(component.getTransformedData()).toHaveLength(1)
    expect(container.textContent).not.toContain('Person1')
    expect(container.textContent).toContain('Person2')
  })

  it('should handle person update (name change) gracefully', async () => {
    people.set([
      { id: 1, firstName: 'John', lastName: 'Doe', gender: 'male', birthDate: '1950-01-01', deathDate: null }
    ])
    relationships.set([])

    const { container } = render(TreeView)
    await new Promise(resolve => setTimeout(resolve, 100))

    expect(container.textContent).toContain('John Doe')

    // Update person
    people.set([
      { id: 1, firstName: 'John', lastName: 'Smith', gender: 'male', birthDate: '1950-01-01', deathDate: null }
    ])

    await new Promise(resolve => setTimeout(resolve, 100))

    // Should show updated name
    expect(container.textContent).not.toContain('John Doe')
    expect(container.textContent).toContain('John Smith')
  })

  it('should display correct ancestor tree structure', async () => {
    // Create 3 generation ancestor tree with focus on youngest
    people.set([
      { id: 1, firstName: 'Grandparent', lastName: 'Smith', gender: 'male', birthDate: '1920-01-01', deathDate: null },
      { id: 2, firstName: 'Parent', lastName: 'Smith', gender: 'male', birthDate: '1950-01-01', deathDate: null },
      { id: 3, firstName: 'Child', lastName: 'Smith', gender: 'male', birthDate: '1980-01-01', deathDate: null }
    ])

    relationships.set([
      { id: 1, person1Id: 1, person2Id: 2, type: 'father', parentRole: 'father' },
      { id: 2, person1Id: 2, person2Id: 3, type: 'father', parentRole: 'father' }
    ])

    const { container, component } = render(TreeView)
    await new Promise(resolve => setTimeout(resolve, 100))

    // Set focus to youngest person (Child)
    const dropdown = container.querySelector('[data-testid="focus-person-select"]')
    await fireEvent.change(dropdown, { target: { value: '3' } })
    await new Promise(resolve => setTimeout(resolve, 100))

    // All ancestors should be visible
    expect(container.textContent).toContain('Grandparent')
    expect(container.textContent).toContain('Parent')
    expect(container.textContent).toContain('Child')

    // Verify relationships in transformed data
    const data = component.getTransformedData()
    const child = data.find(d => d.id === '3')
    const parent = data.find(d => d.id === '2')

    expect(child.rels.parents).toContain('2')
    expect(parent.rels.parents).toContain('1')
  })
})
