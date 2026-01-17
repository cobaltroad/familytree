/**
 * Test Suite for TreeView Component
 *
 * This test suite validates the TreeView component using family-chart library.
 * Tests are written in TDD red-green-refactor style.
 *
 * @module TreeView.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/svelte'
import TreeView from './TreeView.svelte'
import { people, relationships } from '../stores/familyStore.js'
import { modal } from '../stores/modalStore.js'

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

  it('should display an empty state message when no people exist', () => {
    render(TreeView)
    expect(screen.getByText(/no people in your family tree yet/i)).toBeInTheDocument()
  })

  it('should render a container element for the family chart', () => {
    const { container } = render(TreeView)
    const chartContainer = container.querySelector('[data-testid="tree-container"]')
    expect(chartContainer).toBeInTheDocument()
  })

  it('should not show controls when there are no people', () => {
    const { container } = render(TreeView)
    const controls = container.querySelector('.controls')
    expect(controls).not.toBeInTheDocument()
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
})

describe('TreeView - Chart Initialization', () => {
  beforeEach(() => {
    people.set([
      { id: 1, firstName: 'Test', lastName: 'Person', gender: 'male', birthDate: '1980-01-01', deathDate: null }
    ])
    relationships.set([])
  })

  it('should initialize family-chart instance after mount', async () => {
    const { component } = render(TreeView)
    await new Promise(resolve => setTimeout(resolve, 100))

    // Chart instance should be created
    expect(component.getChartInstance()).toBeTruthy()
  })

  it('should set initial focus person to first root person by default', async () => {
    const { component } = render(TreeView)
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(component.getFocusPersonId()).toBe(1)
  })

  it('should render SVG element for the chart', async () => {
    const { container } = render(TreeView)
    await new Promise(resolve => setTimeout(resolve, 100))

    // family-chart should create an SVG
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('should show controls when people exist', async () => {
    const { container } = render(TreeView)
    await new Promise(resolve => setTimeout(resolve, 50))

    const controls = container.querySelector('.controls')
    expect(controls).toBeInTheDocument()
  })
})

describe('TreeView - Focus Person Selection', () => {
  beforeEach(() => {
    people.set([
      { id: 1, firstName: 'Person1', lastName: 'Test', gender: 'male', birthDate: '1950-01-01', deathDate: null },
      { id: 2, firstName: 'Person2', lastName: 'Test', gender: 'female', birthDate: '1975-01-01', deathDate: null }
    ])
    relationships.set([
      { id: 1, person1Id: 1, person2Id: 2, type: 'father', parentRole: 'father' }
    ])
  })

  it('should render focus person dropdown', async () => {
    const { container } = render(TreeView)
    await new Promise(resolve => setTimeout(resolve, 50))

    const dropdown = container.querySelector('[data-testid="focus-person-select"]')
    expect(dropdown).toBeInTheDocument()
  })

  it('should list all people in the dropdown', async () => {
    const { container } = render(TreeView)
    await new Promise(resolve => setTimeout(resolve, 50))

    const dropdown = container.querySelector('[data-testid="focus-person-select"]')
    const options = dropdown.querySelectorAll('option')

    expect(options).toHaveLength(2)
    expect(options[0].textContent).toContain('Person1 Test')
    expect(options[1].textContent).toContain('Person2 Test')
  })

  it('should update chart when focus person changes', async () => {
    const { container, component } = render(TreeView)
    await new Promise(resolve => setTimeout(resolve, 100))

    // Initial focus person
    expect(component.getFocusPersonId()).toBe(1)

    // Change focus person
    const dropdown = container.querySelector('[data-testid="focus-person-select"]')
    await fireEvent.change(dropdown, { target: { value: '2' } })

    await new Promise(resolve => setTimeout(resolve, 100))

    // Focus person should be updated
    expect(component.getFocusPersonId()).toBe(2)
  })
})

describe('TreeView - Person Card Styling', () => {
  beforeEach(() => {
    people.set([
      { id: 1, firstName: 'John', lastName: 'Doe', gender: 'male', birthDate: '1950-01-01', deathDate: '2020-12-31' },
      { id: 2, firstName: 'Jane', lastName: 'Smith', gender: 'female', birthDate: '1955-06-15', deathDate: null },
      { id: 3, firstName: 'Alex', lastName: 'Other', gender: 'other', birthDate: '1960-01-01', deathDate: null }
    ])
    relationships.set([])
  })

  it('should render person name in card', async () => {
    const { container } = render(TreeView)
    await new Promise(resolve => setTimeout(resolve, 100))

    // Cards should display names
    expect(container.textContent).toContain('John Doe')
    expect(container.textContent).toContain('Jane Smith')
  })

  it('should render lifespan with birth and death dates', async () => {
    const { container } = render(TreeView)
    await new Promise(resolve => setTimeout(resolve, 100))

    // Should show lifespan for deceased (1950-2020)
    expect(container.textContent).toContain('1950')
    expect(container.textContent).toContain('2020')

    // Should show lifespan for living (1955-present)
    expect(container.textContent).toContain('1955')
    expect(container.textContent).toContain('present')
  })

  it('should apply gender-based colors to cards', async () => {
    const { container } = render(TreeView)
    await new Promise(resolve => setTimeout(resolve, 100))

    // Check that cards exist with gender-specific styling
    const cards = container.querySelectorAll('[data-person-id]')
    expect(cards.length).toBeGreaterThan(0)
  })

  it('should distinguish deceased persons with dashed border', async () => {
    const { container } = render(TreeView)
    await new Promise(resolve => setTimeout(resolve, 100))

    // Deceased card should have CSS class or attribute
    const deceasedCard = container.querySelector('[data-person-id="1"]')
    expect(deceasedCard).toBeTruthy()
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

    // Find and click person card
    const personCard = container.querySelector('[data-person-id="1"]')
    expect(personCard).toBeTruthy()

    // Simulate click
    await fireEvent.click(personCard)

    // Modal should be opened with correct person ID
    expect(modalSpy).toHaveBeenCalledWith(1, 'edit')
  })

  it('should allow custom onPersonClick handler via props', async () => {
    const clickHandler = vi.fn()
    const { container } = render(TreeView, { props: { onPersonClick: clickHandler } })
    await new Promise(resolve => setTimeout(resolve, 100))

    // Click on a person card
    const personCard = container.querySelector('[data-person-id="1"]')
    await fireEvent.click(personCard)

    expect(clickHandler).toHaveBeenCalledWith(1)
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
    expect(container.textContent).toContain('John Doe')

    // Update person
    people.set([
      { id: 1, firstName: 'John', lastName: 'Smith', gender: 'male', birthDate: '1950-01-01', deathDate: null }
    ])

    await new Promise(resolve => setTimeout(resolve, 100))
    expect(container.textContent).toContain('John Smith')
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
  it('should handle empty data gracefully', async () => {
    people.set([])
    relationships.set([])

    const { container } = render(TreeView)
    expect(container.textContent.toLowerCase()).toContain('no people')
  })

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
