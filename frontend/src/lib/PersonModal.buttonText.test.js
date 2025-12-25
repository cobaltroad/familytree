/**
 * TDD Test Suite for Quick Add Button Text Updates
 *
 * RED Phase: These tests verify that Quick Add buttons display
 * "Add New Person As [Role]" instead of just "Add [Role]"
 *
 * Expected button text:
 * - "Add New Person As Mother"
 * - "Add New Person As Father"
 * - "Add New Person As Child"
 * - "Add New Person As Spouse"
 * - "Add Another New Person As Spouse" (when spouses exist)
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/svelte'
import PersonModal from './PersonModal.svelte'
import { people, relationships } from '../stores/familyStore.js'
import { modal } from '../stores/modalStore.js'

describe('PersonModal - Quick Add Button Text', () => {
  beforeEach(() => {
    people.set([])
    relationships.set([])
    modal.close()
  })

  describe('Desktop/Tablet Layout (>=768px)', () => {
    beforeEach(() => {
      global.innerWidth = 1024 // Desktop mode
    })

    it('should display "Add/Link Mother" collapsible panel when mother does not exist', () => {
      // GIVEN a person with no mother
      people.set([
        { id: 1, firstName: 'Alice', lastName: 'Smith', gender: 'female', birthDate: '1980-01-01' }
      ])
      relationships.set([])

      // WHEN modal is opened for that person
      modal.open(1, 'edit')
      const { container } = render(PersonModal)

      // THEN the CollapsibleActionPanel should show "Add/Link Mother"
      const motherPanel = container.querySelector('[data-relationship-type="mother"]')
      expect(motherPanel).toBeTruthy()
      expect(motherPanel.textContent).toContain('Add/Link Mother')
    })

    it('should display "Add/Link Father" collapsible panel when father does not exist', () => {
      // GIVEN a person with no father
      people.set([
        { id: 1, firstName: 'Alice', lastName: 'Smith', gender: 'female', birthDate: '1980-01-01' }
      ])
      relationships.set([])

      // WHEN modal is opened for that person
      modal.open(1, 'edit')
      const { container } = render(PersonModal)

      // THEN the CollapsibleActionPanel should show "Add/Link Father"
      const fatherPanel = container.querySelector('[data-relationship-type="father"]')
      expect(fatherPanel).toBeTruthy()
      expect(fatherPanel.textContent).toContain('Add/Link Father')
    })

    it('should display "Add/Link Children" collapsible panel', () => {
      // GIVEN any existing person
      people.set([
        { id: 1, firstName: 'Alice', lastName: 'Smith', gender: 'female', birthDate: '1980-01-01' }
      ])
      relationships.set([])

      // WHEN modal is opened for that person
      modal.open(1, 'edit')
      const { container } = render(PersonModal)

      // THEN should show CollapsibleActionPanel for children
      const childPanel = container.querySelector('[data-relationship-type="child"]')
      expect(childPanel).toBeTruthy()
      expect(childPanel.textContent).toMatch(/Add\/Link Children/i)
    })

    it('should display "Add/Link Spouse" collapsible panel when no spouses exist', () => {
      // GIVEN a person with no spouses
      people.set([
        { id: 1, firstName: 'Alice', lastName: 'Smith', gender: 'female', birthDate: '1980-01-01' }
      ])
      relationships.set([])

      // WHEN modal is opened for that person
      modal.open(1, 'edit')
      const { container } = render(PersonModal)

      // THEN should show CollapsibleActionPanel for spouse
      const spousePanel = container.querySelector('[data-relationship-type="spouse"]')
      expect(spousePanel).toBeTruthy()
      expect(spousePanel.textContent).toMatch(/Add\/Link Spouse/i)
      expect(spousePanel.textContent).not.toMatch(/Another/i)
    })

    it('should display "Add/Link Another Spouse" panel when spouses already exist', () => {
      // GIVEN a person with an existing spouse
      people.set([
        { id: 1, firstName: 'Alice', lastName: 'Smith', gender: 'female', birthDate: '1980-01-01' },
        { id: 2, firstName: 'Bob', lastName: 'Jones', gender: 'male', birthDate: '1978-05-15' }
      ])
      relationships.set([
        { id: 1, person1Id: 1, person2Id: 2, type: 'spouse' }
      ])

      // WHEN modal is opened for that person
      modal.open(1, 'edit')
      const { container } = render(PersonModal)

      // THEN should show CollapsibleActionPanel with "Another" label
      const spousePanel = container.querySelector('[data-relationship-type="spouse"]')
      expect(spousePanel).toBeTruthy()
      expect(spousePanel.textContent).toMatch(/Add\/Link Another Spouse/i)
    })
  })

  describe('Mobile Layout (<768px)', () => {
    beforeEach(() => {
      global.innerWidth = 375 // Mobile mode
    })

    it('should display "Add/Link Mother" collapsible panel on mobile', async () => {
      // GIVEN a person with no mother
      people.set([
        { id: 1, firstName: 'Alice', lastName: 'Smith', gender: 'female', birthDate: '1980-01-01' }
      ])
      relationships.set([])

      // WHEN modal is opened for that person
      modal.open(1, 'edit')
      const { container, getByText } = render(PersonModal)

      // AND the Parents section is expanded
      const parentsSection = getByText('Parents')
      parentsSection.click()

      // THEN the CollapsibleActionPanel should show "Add/Link Mother"
      await waitFor(() => {
        const motherPanel = container.querySelector('[data-relationship-type="mother"]')
        expect(motherPanel).toBeTruthy()
        expect(motherPanel.textContent).toContain('Add/Link Mother')
      })
    })

    it('should display "Add/Link Father" collapsible panel on mobile', async () => {
      // GIVEN a person with no father
      people.set([
        { id: 1, firstName: 'Alice', lastName: 'Smith', gender: 'female', birthDate: '1980-01-01' }
      ])
      relationships.set([])

      // WHEN modal is opened for that person
      modal.open(1, 'edit')
      const { container, getByText } = render(PersonModal)

      // AND the Parents section is expanded
      const parentsSection = getByText('Parents')
      parentsSection.click()

      // THEN the CollapsibleActionPanel should show "Add/Link Father"
      await waitFor(() => {
        const fatherPanel = container.querySelector('[data-relationship-type="father"]')
        expect(fatherPanel).toBeTruthy()
        expect(fatherPanel.textContent).toContain('Add/Link Father')
      })
    })

    it('should display "Add/Link Children" panel on mobile', async () => {
      // GIVEN any existing person
      people.set([
        { id: 1, firstName: 'Alice', lastName: 'Smith', gender: 'female', birthDate: '1980-01-01' }
      ])
      relationships.set([])

      // WHEN modal is opened for that person
      modal.open(1, 'edit')
      const { container, getByText } = render(PersonModal)

      // AND the Children section is expanded
      const childrenSection = getByText('Children')
      childrenSection.click()

      // THEN should show CollapsibleActionPanel for children
      await waitFor(() => {
        const childPanel = container.querySelector('[data-relationship-type="child"]')
        expect(childPanel).toBeTruthy()
        expect(childPanel.textContent).toMatch(/Add\/Link Children/i)
      })
    })

    it('should display "Add/Link Spouse" panel on mobile when no spouses exist', async () => {
      // GIVEN a person with no spouses
      people.set([
        { id: 1, firstName: 'Alice', lastName: 'Smith', gender: 'female', birthDate: '1980-01-01' }
      ])
      relationships.set([])

      // WHEN modal is opened for that person
      modal.open(1, 'edit')
      const { container, getByText } = render(PersonModal)

      // AND the Spouses section is expanded
      const spousesSection = getByText('Spouses')
      spousesSection.click()

      // THEN should show CollapsibleActionPanel for spouse
      await waitFor(() => {
        const spousePanel = container.querySelector('[data-relationship-type="spouse"]')
        expect(spousePanel).toBeTruthy()
        expect(spousePanel.textContent).toMatch(/Add\/Link Spouse/i)
        expect(spousePanel.textContent).not.toMatch(/Another/i)
      })
    })

    it('should display "Add/Link Another Spouse" panel on mobile when spouses exist', async () => {
      // GIVEN a person with an existing spouse
      people.set([
        { id: 1, firstName: 'Alice', lastName: 'Smith', gender: 'female', birthDate: '1980-01-01' },
        { id: 2, firstName: 'Bob', lastName: 'Jones', gender: 'male', birthDate: '1978-05-15' }
      ])
      relationships.set([
        { id: 1, person1Id: 1, person2Id: 2, type: 'spouse' }
      ])

      // WHEN modal is opened for that person
      modal.open(1, 'edit')
      const { container, getByText } = render(PersonModal)

      // AND the Spouses section is expanded (section title includes count)
      const spousesSection = getByText(/Spouses/)
      spousesSection.click()

      // THEN should show CollapsibleActionPanel with "Another" label
      await waitFor(() => {
        const spousePanel = container.querySelector('[data-relationship-type="spouse"]')
        expect(spousePanel).toBeTruthy()
        expect(spousePanel.textContent).toMatch(/Add\/Link Another Spouse/i)
      })
    })
  })

  describe('Edge Cases', () => {
    it('should not show parent buttons when both parents exist', () => {
      // GIVEN a person with both mother and father
      people.set([
        { id: 1, firstName: 'Alice', lastName: 'Smith', gender: 'female', birthDate: '1980-01-01' },
        { id: 2, firstName: 'Mother', lastName: 'Smith', gender: 'female', birthDate: '1950-01-01' },
        { id: 3, firstName: 'Father', lastName: 'Smith', gender: 'male', birthDate: '1948-01-01' }
      ])
      relationships.set([
        { id: 1, person1Id: 2, person2Id: 1, type: 'parentOf', parentRole: 'mother' },
        { id: 2, person1Id: 3, person2Id: 1, type: 'parentOf', parentRole: 'father' }
      ])

      global.innerWidth = 1024
      modal.open(1, 'edit')
      const { container } = render(PersonModal)

      // THEN parent buttons should not be visible
      const addMotherButton = container.querySelector('[data-testid="add-mother-button"]')
      const addFatherButton = container.querySelector('[data-testid="add-father-button"]')
      expect(addMotherButton).toBeFalsy()
      expect(addFatherButton).toBeFalsy()
    })

    it('should show child and spouse panels even when relationships exist', () => {
      // GIVEN a person with existing children and spouses
      people.set([
        { id: 1, firstName: 'Alice', lastName: 'Smith', gender: 'female', birthDate: '1980-01-01' },
        { id: 2, firstName: 'Child', lastName: 'Smith', gender: 'female', birthDate: '2000-01-01' },
        { id: 3, firstName: 'Spouse', lastName: 'Jones', gender: 'male', birthDate: '1978-01-01' }
      ])
      relationships.set([
        { id: 1, person1Id: 1, person2Id: 2, type: 'parentOf', parentRole: 'mother' },
        { id: 2, person1Id: 1, person2Id: 3, type: 'spouse' }
      ])

      global.innerWidth = 1024
      modal.open(1, 'edit')
      const { container } = render(PersonModal)

      // THEN both panels should still be visible (can add more children and spouses)
      const childPanel = container.querySelector('[data-relationship-type="child"]')
      const spousePanel = container.querySelector('[data-relationship-type="spouse"]')
      expect(childPanel).toBeTruthy()
      expect(spousePanel).toBeTruthy()
      expect(childPanel.textContent).toMatch(/Add\/Link Children/i)
      expect(spousePanel.textContent).toMatch(/Add\/Link Another Spouse/i)
    })
  })
})
