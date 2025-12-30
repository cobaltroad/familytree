import { describe, it, expect } from 'vitest'
import { render, fireEvent } from '@testing-library/svelte'
import PersonFormFields from './PersonFormFields.svelte'

describe('PersonFormFields - Name Editing Bug (TDD)', () => {
  describe('RED Phase - Failing Tests', () => {
    it('should allow editing firstName in edit mode', async () => {
      const { container } = render(PersonFormFields, {
        props: {
          person: {
            id: 1,
            firstName: 'John',
            lastName: 'Doe',
            birthDate: '1980-01-01',
            deathDate: null,
            gender: 'male',
            photoUrl: null
          }
        }
      })

      const firstNameInput = container.querySelector('#firstName')
      expect(firstNameInput).toBeTruthy()
      expect(firstNameInput.value).toBe('John')

      // User tries to edit the name
      await fireEvent.input(firstNameInput, { target: { value: 'Jane' } })

      // The input should now show the edited value
      expect(firstNameInput.value).toBe('Jane')
    })

    it('should allow editing lastName in edit mode', async () => {
      const { container } = render(PersonFormFields, {
        props: {
          person: {
            id: 1,
            firstName: 'John',
            lastName: 'Doe',
            birthDate: '1980-01-01',
            deathDate: null,
            gender: 'male',
            photoUrl: null
          }
        }
      })

      const lastNameInput = container.querySelector('#lastName')
      expect(lastNameInput).toBeTruthy()
      expect(lastNameInput.value).toBe('Doe')

      // User tries to edit the name
      await fireEvent.input(lastNameInput, { target: { value: 'Smith' } })

      // The input should now show the edited value
      expect(lastNameInput.value).toBe('Smith')
    })

    it('should allow typing multiple characters in firstName', async () => {
      const { container } = render(PersonFormFields, {
        props: {
          person: {
            id: 1,
            firstName: 'J',
            lastName: 'Doe',
            birthDate: '1980-01-01',
            deathDate: null,
            gender: 'male',
            photoUrl: null
          }
        }
      })

      const firstNameInput = container.querySelector('#firstName')
      expect(firstNameInput.value).toBe('J')

      // User types more characters
      await fireEvent.input(firstNameInput, { target: { value: 'Jo' } })
      expect(firstNameInput.value).toBe('Jo')

      await fireEvent.input(firstNameInput, { target: { value: 'Joh' } })
      expect(firstNameInput.value).toBe('Joh')

      await fireEvent.input(firstNameInput, { target: { value: 'John' } })
      expect(firstNameInput.value).toBe('John')
    })

    it('should allow clearing and retyping firstName', async () => {
      const { container } = render(PersonFormFields, {
        props: {
          person: {
            id: 1,
            firstName: 'John',
            lastName: 'Doe',
            birthDate: '1980-01-01',
            deathDate: null,
            gender: 'male',
            photoUrl: null
          }
        }
      })

      const firstNameInput = container.querySelector('#firstName')
      expect(firstNameInput.value).toBe('John')

      // User clears the field
      await fireEvent.input(firstNameInput, { target: { value: '' } })
      expect(firstNameInput.value).toBe('')

      // User types new name
      await fireEvent.input(firstNameInput, { target: { value: 'Alice' } })
      expect(firstNameInput.value).toBe('Alice')
    })

    it('should preserve edits when form is submitted', async () => {
      const { container, component } = render(PersonFormFields, {
        props: {
          person: {
            id: 1,
            firstName: 'John',
            lastName: 'Doe',
            birthDate: '1980-01-01',
            deathDate: null,
            gender: 'male',
            photoUrl: null
          }
        }
      })

      let submittedData = null
      component.$on('submit', (event) => {
        submittedData = event.detail
      })

      const firstNameInput = container.querySelector('#firstName')
      const lastNameInput = container.querySelector('#lastName')

      // Edit both names
      await fireEvent.input(firstNameInput, { target: { value: 'Jane' } })
      await fireEvent.input(lastNameInput, { target: { value: 'Smith' } })

      // Submit the form
      component.handleSubmit()

      // The submitted data should have the edited values
      expect(submittedData).toBeTruthy()
      expect(submittedData.firstName).toBe('Jane')
      expect(submittedData.lastName).toBe('Smith')
      expect(submittedData.id).toBe(1)
    })

    it('should allow editing firstName in add mode', async () => {
      const { container } = render(PersonFormFields, {
        props: {
          person: null
        }
      })

      const firstNameInput = container.querySelector('#firstName')
      expect(firstNameInput).toBeTruthy()
      expect(firstNameInput.value).toBe('')

      // User types a name
      await fireEvent.input(firstNameInput, { target: { value: 'Alice' } })
      expect(firstNameInput.value).toBe('Alice')
    })

    it('should allow editing lastName in add mode', async () => {
      const { container } = render(PersonFormFields, {
        props: {
          person: null
        }
      })

      const lastNameInput = container.querySelector('#lastName')
      expect(lastNameInput).toBeTruthy()
      expect(lastNameInput.value).toBe('')

      // User types a name
      await fireEvent.input(lastNameInput, { target: { value: 'Brown' } })
      expect(lastNameInput.value).toBe('Brown')
    })

    it('should not reset name fields when person prop remains the same', async () => {
      const { container } = render(PersonFormFields, {
        props: {
          person: {
            id: 1,
            firstName: 'John',
            lastName: 'Doe',
            birthDate: '1980-01-01',
            deathDate: null,
            gender: 'male',
            photoUrl: null
          }
        }
      })

      const firstNameInput = container.querySelector('#firstName')

      // User edits the name
      await fireEvent.input(firstNameInput, { target: { value: 'Jane' } })
      expect(firstNameInput.value).toBe('Jane')

      // Simulate some reactive updates (like window resize) that don't change person
      // The edited value should persist
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(firstNameInput.value).toBe('Jane')
    })

    it('should have firstName and lastName inputs without readonly or disabled attributes', () => {
      const { container } = render(PersonFormFields, {
        props: {
          person: {
            id: 1,
            firstName: 'John',
            lastName: 'Doe',
            birthDate: '1980-01-01',
            deathDate: null,
            gender: 'male',
            photoUrl: null
          }
        }
      })

      const firstNameInput = container.querySelector('#firstName')
      const lastNameInput = container.querySelector('#lastName')

      // Fields should be fully editable
      expect(firstNameInput.hasAttribute('readonly')).toBe(false)
      expect(firstNameInput.hasAttribute('disabled')).toBe(false)
      expect(lastNameInput.hasAttribute('readonly')).toBe(false)
      expect(lastNameInput.hasAttribute('disabled')).toBe(false)
    })
  })
})
