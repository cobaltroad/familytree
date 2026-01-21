/**
 * Test Suite for TreeView Component
 *
 * This test suite validates the TreeView component using family-chart library.
 * Tests are written in TDD red-green-refactor style.
 *
 * NOTE: family-chart is a D3-based library that renders SVG elements. In the JSDOM
 * test environment, SVG rendering may not work completely, causing some tests to fail
 * or pass conditionally. Tests that verify data transformation, component structure,
 * and reactive behavior will pass reliably. Tests that depend on full SVG rendering
 * (chart initialization, card styling, tooltips) may fail in JSDOM but work correctly
 * in a real browser environment.
 *
 * @module TreeView.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/svelte'
import { tick } from 'svelte'
import * as svelteinternal from 'svelte/internal'
import { people, relationships } from '../stores/familyStore.js'
import { modal } from '../stores/modalStore.js'

// use internal DOM runtime to force lifecycle hooks for subsequent modules
beforeAll(async () => {
  vi.doMock('svelte', () => svelteinternal)
  
  // Mock WebKitCSSMatrix
  Object.defineProperty(window, 'WebKitCSSMatrix', {
    value: class WebKitCSSMatrix {
      constructor(m) {
        this.m = m || null;
      }
      a() { return this.m?.a ?? 1; }
      b() { return this.m?.b ?? 0; }
      c() { return this.m?.c ?? 1; }
      d() { return this.m?.d ?? 1; }
      e() { return this.m?.e ?? 0; }
      f() { return this.m?.f ?? 0; }
      // Minimal props/methods Svelte/SvelteMotion expects
    },
    writable: true,
    configurable: true
  });  
})

let TreeView
beforeAll(async () => {
  ({ default: TreeView } = await import('./TreeView.svelte'))
})

describe('TreeView - Basic Rendering', () => {
  beforeEach(() => {
    // Reset stores before each test
    people.set([])
    relationships.set([])
  })

  it('should render without errors when family-chart is imported', () => {
    const { container } = render(TreeView)
    expect(container).toBeTruthy()
  })

  it('should render a container element for the family chart', () => {
    const { container } = render(TreeView)
    const chartContainer = container.querySelector('[data-testid="tree-container"]')
    expect(chartContainer).toBeInTheDocument()
  })
})

describe('TreeView - Data Transformation', () => {
  const samplePeople = [
    {
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      gender: 'male',
      birthDate: '1950-01-15',
      deathDate: null
    },
    {
      id: 2,
      firstName: 'Jane',
      lastName: 'Smith',
      gender: 'female',
      birthDate: '1952-03-20',
      deathDate: null
    },
    {
      id: 3,
      firstName: 'Bob',
      lastName: 'Doe',
      gender: 'male',
      birthDate: '1975-06-10',
      deathDate: null
    }
  ]

  const sampleRelationships = [
    {
      id: 1,
      person1Id: 1,
      person2Id: 3,
      type: 'father',
      parentRole: 'father'
    },
    {
      id: 2,
      person1Id: 2,
      person2Id: 3,
      type: 'mother',
      parentRole: 'mother'
    },
    {
      id: 3,
      person1Id: 1,
      person2Id: 2,
      type: 'spouse',
      parentRole: null
    }
  ]

  beforeEach(() => {
    people.set(samplePeople)
    relationships.set(sampleRelationships)
  })

  it('should transform Person data to family-chart Datum format', async () => {
    const { component } = render(TreeView)

    // Access the transformed data via exported function
    await new Promise(resolve => setTimeout(resolve, 50))
    const data = component.getTransformedData()

    // Should have same number of items
    expect(data).toHaveLength(3)

    // Should have correct ID format (string)
    expect(typeof data[0].id).toBe('string')

    // Should have data.gender in 'M' or 'F' format
    expect(['M', 'F']).toContain(data[0].data.gender)

    // Should have rels object with parents, spouses, children arrays
    expect(data[0].rels).toHaveProperty('parents')
    expect(data[0].rels).toHaveProperty('spouses')
    expect(data[0].rels).toHaveProperty('children')
  })

  it('should include custom data fields (firstName, lastName, dates)', async () => {
    const { component } = render(TreeView)
    await new Promise(resolve => setTimeout(resolve, 50))

    const data = component.getTransformedData()
    const johnDoe = data.find(d => d.id === '1')

    expect(johnDoe.data.firstName).toBe('John')
    expect(johnDoe.data.lastName).toBe('Doe')
    expect(johnDoe.data.birthDate).toBe('1950-01-15')
    expect(johnDoe.data.deathDate).toBeNull()
  })

  it('should include originalId for card template reference', async () => {
    const { component } = render(TreeView)
    await new Promise(resolve => setTimeout(resolve, 50))

    const data = component.getTransformedData()
    const johnDoe = data.find(d => d.id === '1')

    // originalId should be available for card template to use
    expect(johnDoe.data.originalId).toBe(1)
  })

  it('should map gender to M/F format for card template colors', async () => {
    const { component } = render(TreeView)
    await new Promise(resolve => setTimeout(resolve, 50))

    const data = component.getTransformedData()

    // John (male) should be 'M'
    const johnDoe = data.find(d => d.id === '1')
    expect(johnDoe.data.gender).toBe('M')

    // Jane (female) should be 'F'
    const janeSmith = data.find(d => d.id === '2')
    expect(janeSmith.data.gender).toBe('F')

    // Bob (male) should be 'M'
    const bobDoe = data.find(d => d.id === '3')
    expect(bobDoe.data.gender).toBe('M')
  })
})

describe('TreeView - Chart Initialization', () => {
  beforeEach(() => {
    people.set([
      { id: 1, firstName: 'Test', lastName: 'Person', gender: 'male', birthDate: '1980-01-01', deathDate: null, isDeceased: false}
    ])
    relationships.set([])
  })

  it('should set initial focus person to first root person by default', async () => {
    const { component } = render(TreeView)
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(component.getFocusPersonId()).toBe(1)
  })
})

describe('TreeView - Person Card Styling', () => {
  beforeEach(() => {
    people.set([
      { id: 1, firstName: 'John', lastName: 'Doe', gender: 'male', birthDate: null, deathDate: '2020-12-31', isDeceased: true },
      { id: 2, firstName: 'Jane', lastName: 'Smith', gender: 'female', birthDate: '1950-01-01', deathDate: null, isDeceased: false }
    ])
    relationships.set([
      { id: 1, person1Id: 1, person2Id: 2, type: 'spouse', parentRole: null }
    ])
  })

  it('should render person name in card body', async () => {
    const { container } = render(TreeView)
	await tick()

    // Cards should display names in custom HTML elements
    const johnCard = container.querySelector('[data-person-id="1"]')
    expect(johnCard).toBeTruthy()
    expect(johnCard.innerHTML).toContain('John<br>Doe')
    
    const janeCard = container.querySelector('[data-person-id="2"]')
    expect(janeCard).toBeTruthy()
    expect(janeCard.innerHTML).toContain('Jane<br>Smith')
    expect(janeCard.innerHTML).toContain('Jane<br>Smith')
  })

  it('should render lifespan with birth and death dates in card', async () => {
    const { container } = render(TreeView)
    await tick()

    // Cards should display names in custom HTML elements
    const johnCard = container.querySelector('[data-person-id="1"] .card-lifespan')
    expect(johnCard).toBeTruthy()
    // normalize all dashes
    expect(johnCard.innerHTML.replace(/[\u2012-\u2015]/g, '-')).toContain('?-2020')

    const janeCard = container.querySelector('[data-person-id="2"] .card-lifespan')
    expect(janeCard).toBeTruthy()
    expect(johnCard.innerHTML).not.toContain('1949') // test that the correct year was calculated
    // normalize all dashes
    expect(janeCard.innerHTML.replace(/[\u2012-\u2015]/g, '-')).toContain('1950-present')
  })

  it('should apply gender-based colors to cards', async () => {
    const { container } = render(TreeView)
    await tick()

    // Check that cards exist with gender-specific styling
    const johnCard = container.querySelector('[data-person-id="1"]')
    // use data attributes to confirm styling
    expect(johnCard).toHaveAttribute('data-background-color','#AED6F1')

    const janeCard = container.querySelector('[data-person-id="2"]')
    // use data attributes to confirm styling
    expect(janeCard).toHaveAttribute('data-background-color','#F8BBD0')

  })

  it('should distinguish deceased persons with dashed border', async () => {
    const { container } = render(TreeView)
    await tick()

    // Deceased card should have CSS class or attribute
    const johnCard = container.querySelector('[data-person-id="1"]')
    // use data attributes to confirm styling
    expect(johnCard).toHaveAttribute('data-border','dashed 2px #666')

    const janeCard = container.querySelector('[data-person-id="2"]')
    // use data attributes to confirm styling
    expect(janeCard).toHaveAttribute('data-border','solid 2px #333')
  })
})

describe('TreeView - Modal Integration', () => {
  beforeEach(() => {
    people.set([
      { id: 1, firstName: 'John', lastName: 'Doe', gender: 'male', birthDate: '1950-01-01', deathDate: null }
    ])
    relationships.set([])
    vi.clearAllMocks()
  })

  it('should open modal when person card is clicked', async () => {
    const modalSpy = vi.spyOn(modal, 'open')
    const { container } = render(TreeView)
    await new Promise(resolve => setTimeout(resolve, 100))

    // Find and click pencil on the person card
    const pencil = container.querySelector('[data-person-id="1"] .card-edit-button')
    await fireEvent.click(pencil)

    // Modal should be opened with correct person ID
    expect(modalSpy).toHaveBeenCalledWith(1, 'edit')
  })
})

describe('TreeView - Zoom and Pan', () => {
  beforeEach(() => {
    people.set([
      { id: 1, firstName: 'Test', lastName: 'Person', gender: 'male', birthDate: '1980-01-01', deathDate: null }
    ])
    relationships.set([])
  })

  it('should support pan operations', async () => {
    const { container } = render(TreeView)
    await new Promise(resolve => setTimeout(resolve, 100))

    // family-chart should have pan enabled by default
    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
  })
})

describe('TreeView - Dynamic Updates', () => {
  it('should update chart when person data changes', async () => {
    const { container } = render(TreeView)

    // Initial state
    people.set([
      { id: 1, firstName: 'John', lastName: 'Doe', gender: 'male', birthDate: '1950-01-01', deathDate: null }
    ])

    await new Promise(resolve => setTimeout(resolve, 100))
    expect(container.textContent).toContain('JohnDoe')

    // Update person
    people.set([
      { id: 1, firstName: 'John', lastName: 'Smith', gender: 'male', birthDate: '1950-01-01', deathDate: null }
    ])

    await new Promise(resolve => setTimeout(resolve, 100))
    expect(container.textContent).toContain('JohnSmith')
  })

  it('should update chart when a person is removed', async () => {
    // Initial state
    people.set([
      { id: 1, firstName: 'John', lastName: 'Doe', gender: 'male', birthDate: null, deathDate: '2020-12-31', isDeceased: true },
      { id: 2, firstName: 'Jane', lastName: 'Smith', gender: 'female', birthDate: '1950-01-01', deathDate: null, isDeceased: false }
    ])
    relationships.set([
      { id: 1, person1Id: 1, person2Id: 2, type: 'spouse', parentRole: null }
    ])

    const { component } = render(TreeView)
    await tick()

    expect(component.getTransformedData()).toHaveLength(2)

    // Update person
    people.set([
      { id: 1, firstName: 'John', lastName: 'Doe', gender: 'male', birthDate: null, deathDate: '2020-12-31', isDeceased: true },
    ])
    relationships.set([])
    await tick()

    expect(component.getTransformedData()).toHaveLength(1)
  })

  it('should update chart when relationship data changes', async () => {
    // Initial state
    people.set([
      { id: 1, firstName: 'John', lastName: 'Doe', gender: 'male', birthDate: null, deathDate: '2020-12-31', isDeceased: true },
      { id: 2, firstName: 'Jane', lastName: 'Smith', gender: 'female', birthDate: '1950-01-01', deathDate: null, isDeceased: false }
    ])
    
    const { container } = render(TreeView)    
    await tick()
    
    const johnCard = container.querySelector('[data-person-id="1"]')
    expect(johnCard).toBeTruthy()
    const janeCard = container.querySelector('[data-person-id="2"]')
    expect(janeCard).toBeFalsy()

    // Update relationship
    relationships.set([
      { id: 1, person1Id: 1, person2Id: 2, type: 'spouse', parentRole: null }
    ])
    await tick()
    
    const updatedJaneCard = container.querySelector('[data-person-id="2"]')
    expect(updatedJaneCard).toBeTruthy()
  })
  
  it('should animate smoothly during updates (300ms transition)', async () => {
    const { component } = render(TreeView)

    people.set([
      { id: 1, firstName: 'Test', lastName: 'Person', gender: 'male', birthDate: '1980-01-01', deathDate: null }
    ])

    await new Promise(resolve => setTimeout(resolve, 50))

    // Transition time should be set to 300ms
    expect(component.getTransitionTime()).toBe(300)
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
    // unknown mother to Child4 should be in the data
    expect(data).toHaveLength(5)

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

describe('TreeView - Performance', () => {
  it('should render 100 people in under 500ms', async () => {
    const largePeople = Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      firstName: `Person${i}`,
      lastName: 'Test',
      gender: i % 2 === 0 ? 'male' : 'female',
      birthDate: `${1920 + i % 80}-01-01`,
      deathDate: i % 3 === 0 ? `${2000 + i % 20}-01-01` : null
    }))

    people.set(largePeople)
    relationships.set([])

    const startTime = performance.now()
    render(TreeView)
    await new Promise(resolve => setTimeout(resolve, 100))
    const endTime = performance.now()

    expect(endTime - startTime).toBeLessThan(500)
  })
})

describe('TreeView - Edge Cases', () => {
  it('should handle missing gender field with default', async () => {
    people.set([
      { id: 1, firstName: 'Test', lastName: 'Person', gender: null, birthDate: '1950-01-01', deathDate: null }
    ])
    relationships.set([])

    const { component } = render(TreeView)
    await new Promise(resolve => setTimeout(resolve, 50))

    const data = component.getTransformedData()

    // Should default to M or F
    expect(['M', 'F']).toContain(data[0].data.gender)
  })

  it('should handle invalid relationship references', async () => {
    people.set([
      { id: 1, firstName: 'Person', lastName: 'Test', gender: 'male', birthDate: '1950-01-01', deathDate: null }
    ])
    relationships.set([
      { id: 1, person1Id: 1, person2Id: 999, type: 'father', parentRole: 'father' } // Invalid person2Id
    ])

    const { component } = render(TreeView)
    await new Promise(resolve => setTimeout(resolve, 50))

    const data = component.getTransformedData()

    // Should handle gracefully - invalid relationship ignored
    const person = data.find(d => d.id === '1')
    expect(person.rels.children).not.toContain('999')
  })
})
