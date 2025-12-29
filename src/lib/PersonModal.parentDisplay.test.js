/**
 * Tests for PersonModal parent display functionality
 *
 * Bug Fix Summary:
 * - Fixed issue where parents weren't being displayed in PersonModal
 * - Root cause: API returns denormalized relationships (type="mother"/"father")
 *   but derivedStores.js was only checking for type="parentOf"
 * - Solution: Updated derivedStores.js and treeHelpers.js to handle both formats
 *
 * Test Coverage:
 * - Parent cards display correctly when parents exist
 * - Add/Link panels only show when parent doesn't exist
 * - Works correctly on both desktop and mobile layouts
 * - Handles mixed scenarios (mother only, father only, both, neither)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, fireEvent } from '@testing-library/svelte'
import PersonModal from './PersonModal.svelte'
import { modal } from '../stores/modalStore.js'
import { people, relationships } from '../stores/familyStore.js'
import { vi } from 'vitest'

// Mock $app/stores
vi.mock('$app/stores', () => ({
  page: {
    subscribe: (fn) => {
      fn({ data: { session: null } })
      return () => {}
    }
  }
}))

describe('PersonModal - Parent Display Bug', () => {
  const mockPeople = [
    { id: 1, firstName: 'John', lastName: 'Doe', gender: 'male', birthDate: '1949-01-01' },
    { id: 2, firstName: 'Jane', lastName: 'Smith', gender: 'female', birthDate: '1952-02-02' },
    { id: 3, firstName: 'Alice', lastName: 'Doe', gender: 'female', birthDate: '1980-03-03' }
  ]

  // BUG FIX: The API actually returns denormalized relationships:
  // - type: "mother" or "father" (NOT "parentOf")
  // - parentRole: "mother" or "father" (kept for reference)
  // This matches what the backend's denormalizeRelationship() function returns
  const mockRelationships = [
    { id: 1, person1Id: 1, person2Id: 3, type: 'father', parentRole: 'father' },
    { id: 2, person1Id: 2, person2Id: 3, type: 'mother', parentRole: 'mother' }
  ]

  beforeEach(() => {
    people.set(mockPeople)
    relationships.set(mockRelationships)
    modal.close()

    // Set window width to desktop to see both layouts
    global.innerWidth = 1920
  })

  afterEach(() => {
    modal.close()
  })

  describe('RED Phase - Failing Tests for Mother Display', () => {
    it('should display mother as a RelationshipCard when mother exists', () => {
      // Alice (id: 3) has Jane Smith (id: 2) as mother
      modal.open(3, 'edit')

      const { container } = render(PersonModal)

      // Should display mother's name in a RelationshipCard
      const motherCard = Array.from(container.querySelectorAll('.relationship-card, [role="button"]'))
        .find(card => card.textContent.includes('Jane Smith') && card.textContent.includes('Mother'))

      expect(motherCard).toBeTruthy()
      expect(motherCard.textContent).toContain('Jane Smith')
      expect(motherCard.textContent).toContain('Mother')
    })

    it('should NOT show Add/Link Mother panel when mother exists', () => {
      // Alice (id: 3) has Jane Smith (id: 2) as mother
      modal.open(3, 'edit')

      const { container } = render(PersonModal)

      // Should NOT show the Add/Link Mother panel
      const motherPanel = container.querySelector('[data-relationship-type="mother"]')
      expect(motherPanel).toBeFalsy()
    })

    it('should display father as a RelationshipCard when father exists', () => {
      // Alice (id: 3) has John Doe (id: 1) as father
      modal.open(3, 'edit')

      const { container } = render(PersonModal)

      // Should display father's name in a RelationshipCard
      const fatherCard = Array.from(container.querySelectorAll('.relationship-card, [role="button"]'))
        .find(card => card.textContent.includes('John Doe') && card.textContent.includes('Father'))

      expect(fatherCard).toBeTruthy()
      expect(fatherCard.textContent).toContain('John Doe')
      expect(fatherCard.textContent).toContain('Father')
    })

    it('should NOT show Add/Link Father panel when father exists', () => {
      // Alice (id: 3) has John Doe (id: 1) as father
      modal.open(3, 'edit')

      const { container } = render(PersonModal)

      // Should NOT show the Add/Link Father panel
      const fatherPanel = container.querySelector('[data-relationship-type="father"]')
      expect(fatherPanel).toBeFalsy()
    })

    it('should show Add/Link Mother panel only when mother does NOT exist', () => {
      // Set up person with only father, no mother
      people.set([
        { id: 1, firstName: 'John', lastName: 'Doe', gender: 'male', birthDate: '1949-01-01' },
        { id: 3, firstName: 'Alice', lastName: 'Doe', gender: 'female', birthDate: '1980-03-03' }
      ])
      relationships.set([
        { id: 1, person1Id: 1, person2Id: 3, type: 'father', parentRole: 'father' }
      ])

      modal.open(3, 'edit')

      const { container } = render(PersonModal)

      // Should show the Add/Link Mother panel
      const motherPanel = container.querySelector('[data-relationship-type="mother"]')
      expect(motherPanel).toBeTruthy()
      expect(motherPanel.textContent).toContain('Add/Link Mother')

      // Should NOT show mother card
      const motherCard = Array.from(container.querySelectorAll('.relationship-card, [role="button"]'))
        .find(card => card.textContent.includes('Mother'))
      expect(motherCard).toBeFalsy()
    })

    it('should show Add/Link Father panel only when father does NOT exist', () => {
      // Set up person with only mother, no father
      people.set([
        { id: 2, firstName: 'Jane', lastName: 'Smith', gender: 'female', birthDate: '1952-02-02' },
        { id: 3, firstName: 'Alice', lastName: 'Doe', gender: 'female', birthDate: '1980-03-03' }
      ])
      relationships.set([
        { id: 2, person1Id: 2, person2Id: 3, type: 'mother', parentRole: 'mother' }
      ])

      modal.open(3, 'edit')

      const { container } = render(PersonModal)

      // Should show the Add/Link Father panel
      const fatherPanel = container.querySelector('[data-relationship-type="father"]')
      expect(fatherPanel).toBeTruthy()
      expect(fatherPanel.textContent).toContain('Add/Link Father')

      // Should NOT show father card
      const fatherCard = Array.from(container.querySelectorAll('.relationship-card, [role="button"]'))
        .find(card => card.textContent.includes('Father'))
      expect(fatherCard).toBeFalsy()
    })

    it('should show both Add/Link panels when no parents exist', () => {
      // Set up person with no parents
      people.set([
        { id: 3, firstName: 'Alice', lastName: 'Doe', gender: 'female', birthDate: '1980-03-03' }
      ])
      relationships.set([])

      modal.open(3, 'edit')

      const { container } = render(PersonModal)

      // Should show both panels
      const motherPanel = container.querySelector('[data-relationship-type="mother"]')
      const fatherPanel = container.querySelector('[data-relationship-type="father"]')

      expect(motherPanel).toBeTruthy()
      expect(motherPanel.textContent).toContain('Add/Link Mother')

      expect(fatherPanel).toBeTruthy()
      expect(fatherPanel.textContent).toContain('Add/Link Father')
    })

    it('should show neither Add/Link panel when both parents exist', () => {
      // Alice (id: 3) has both parents
      modal.open(3, 'edit')

      const { container } = render(PersonModal)

      // Should NOT show either panel
      const motherPanel = container.querySelector('[data-relationship-type="mother"]')
      const fatherPanel = container.querySelector('[data-relationship-type="father"]')

      expect(motherPanel).toBeFalsy()
      expect(fatherPanel).toBeFalsy()

      // Should show both parent cards instead
      const cards = container.querySelectorAll('.relationship-card, [role="button"]')
      const motherCard = Array.from(cards).find(card =>
        card.textContent.includes('Jane Smith') && card.textContent.includes('Mother')
      )
      const fatherCard = Array.from(cards).find(card =>
        card.textContent.includes('John Doe') && card.textContent.includes('Father')
      )

      expect(motherCard).toBeTruthy()
      expect(fatherCard).toBeTruthy()
    })
  })

  describe('Mobile Layout - Parent Display', () => {
    beforeEach(() => {
      global.innerWidth = 375 // Mobile width
    })

    it('should display mother and father count in collapsed Parents section header on mobile', () => {
      modal.open(3, 'edit')

      const { container } = render(PersonModal)

      // On mobile, parents are in a collapsed section with count badge
      // Parents section should show "Parents (2)" since Alice has both parents
      const parentsSection = container.querySelector('[aria-label*="Parents"]')
      expect(parentsSection).toBeTruthy()
      expect(parentsSection.textContent).toContain('Parents (2)')
    })

    it('should display mother as RelationshipCard on mobile when Parents section is expanded', async () => {
      modal.open(3, 'edit')

      const { container } = render(PersonModal)

      // Find and expand the Parents section
      const parentsSectionHeader = container.querySelector('[aria-label*="Parents"]')
      expect(parentsSectionHeader).toBeTruthy()

      // Click to expand
      await fireEvent.click(parentsSectionHeader)

      // Now the mother card should be visible
      const allCards = container.querySelectorAll('.card, .relationship-card')
      const motherCard = Array.from(allCards)
        .find(card => card.textContent.includes('Jane Smith') && card.textContent.includes('Mother'))

      expect(motherCard).toBeTruthy()
    })

    it('should NOT show Add/Link Mother panel on mobile when mother exists', () => {
      modal.open(3, 'edit')

      const { container } = render(PersonModal)

      // Should NOT show the Add/Link Mother panel
      const motherPanel = container.querySelector('[data-relationship-type="mother"]')
      expect(motherPanel).toBeFalsy()
    })

    it('should display father as RelationshipCard on mobile when Parents section is expanded', async () => {
      modal.open(3, 'edit')

      const { container } = render(PersonModal)

      // Find and expand the Parents section
      const parentsSectionHeader = container.querySelector('[aria-label*="Parents"]')
      await fireEvent.click(parentsSectionHeader)

      // Should display father's name in mobile card layout
      const allCards = container.querySelectorAll('.card, .relationship-card')
      const fatherCard = Array.from(allCards)
        .find(card => card.textContent.includes('John Doe') && card.textContent.includes('Father'))

      expect(fatherCard).toBeTruthy()
    })

    it('should NOT show Add/Link Father panel on mobile when father exists', () => {
      modal.open(3, 'edit')

      const { container } = render(PersonModal)

      // Should NOT show the Add/Link Father panel
      const fatherPanel = container.querySelector('[data-relationship-type="father"]')
      expect(fatherPanel).toBeFalsy()
    })
  })
})
