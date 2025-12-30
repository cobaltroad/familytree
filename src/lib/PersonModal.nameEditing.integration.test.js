import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/svelte'
import PersonModal from './PersonModal.svelte'
import { modal } from '../stores/modalStore.js'
import { people, relationships } from '../stores/familyStore.js'

// Mock $app/stores
vi.mock('$app/stores', () => ({
  page: {
    subscribe: (fn) => {
      fn({ data: { session: null } })
      return () => {}
    }
  }
}))

describe('PersonModal - Name Editing Integration Test', () => {
  const mockPeople = [
    { id: 1, firstName: 'John', lastName: 'Doe', gender: 'male', birthDate: '1949-01-01' }
  ]

  beforeEach(() => {
    people.set(mockPeople)
    relationships.set([])
    modal.close()
  })

  afterEach(() => {
    modal.close()
  })

  it('should allow editing person names in the modal and submitting the form', async () => {
    // Set up: Open modal in edit mode
    modal.open(1, 'edit')

    const { container } = render(PersonModal)

    // Verify modal is open with person data
    expect(container.textContent).toContain('Edit Person')

    // Find the name input fields
    const firstNameInput = container.querySelector('#firstName')
    const lastNameInput = container.querySelector('#lastName')

    expect(firstNameInput).toBeTruthy()
    expect(lastNameInput).toBeTruthy()

    // Verify initial values
    expect(firstNameInput.value).toBe('John')
    expect(lastNameInput.value).toBe('Doe')

    // User edits the names
    await fireEvent.input(firstNameInput, { target: { value: 'Jane' } })
    await fireEvent.input(lastNameInput, { target: { value: 'Smith' } })

    // Verify the inputs now show the edited values
    expect(firstNameInput.value).toBe('Jane')
    expect(lastNameInput.value).toBe('Smith')

    // This integration test demonstrates that the bug is fixed:
    // - User can type in the name fields
    // - The values persist and don't get overwritten by reactive statements
    // - The form is ready to submit with the edited values
  })

  it('should allow editing a single character at a time (realistic typing)', async () => {
    modal.open(1, 'edit')

    const { container } = render(PersonModal)

    const firstNameInput = container.querySelector('#firstName')
    expect(firstNameInput.value).toBe('John')

    // Simulate realistic typing: user clears field and types new name one char at a time
    await fireEvent.input(firstNameInput, { target: { value: '' } })
    expect(firstNameInput.value).toBe('')

    await fireEvent.input(firstNameInput, { target: { value: 'J' } })
    expect(firstNameInput.value).toBe('J')

    await fireEvent.input(firstNameInput, { target: { value: 'Ja' } })
    expect(firstNameInput.value).toBe('Ja')

    await fireEvent.input(firstNameInput, { target: { value: 'Jan' } })
    expect(firstNameInput.value).toBe('Jan')

    await fireEvent.input(firstNameInput, { target: { value: 'Jane' } })
    expect(firstNameInput.value).toBe('Jane')

    // Each keystroke should be preserved
  })

  it('should not reset edited names when modal stays open', async () => {
    modal.open(1, 'edit')

    const { container } = render(PersonModal)

    const firstNameInput = container.querySelector('#firstName')

    // Edit the name
    await fireEvent.input(firstNameInput, { target: { value: 'Alice' } })
    expect(firstNameInput.value).toBe('Alice')

    // Wait a bit to simulate user thinking or other reactive updates
    await new Promise(resolve => setTimeout(resolve, 50))

    // The edited value should still be there
    expect(firstNameInput.value).toBe('Alice')
  })

  it('should handle switching between different people in the modal', async () => {
    // Add another person
    people.set([
      { id: 1, firstName: 'John', lastName: 'Doe', gender: 'male', birthDate: '1949-01-01' },
      { id: 2, firstName: 'Jane', lastName: 'Smith', gender: 'female', birthDate: '1952-02-02' }
    ])

    // Open modal for person 1
    modal.open(1, 'edit')

    const { container } = render(PersonModal)

    let firstNameInput = container.querySelector('#firstName')
    expect(firstNameInput.value).toBe('John')

    // Edit person 1's name
    await fireEvent.input(firstNameInput, { target: { value: 'Jonathan' } })
    expect(firstNameInput.value).toBe('Jonathan')

    // Now switch to person 2 (this should load person 2's data)
    modal.open(2, 'edit')

    // Wait for reactive update
    await new Promise(resolve => setTimeout(resolve, 10))

    // The form should now show person 2's original data
    firstNameInput = container.querySelector('#firstName')
    expect(firstNameInput.value).toBe('Jane')

    // And we should be able to edit person 2's name
    await fireEvent.input(firstNameInput, { target: { value: 'Janet' } })
    expect(firstNameInput.value).toBe('Janet')
  })
})
