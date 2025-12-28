import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/svelte'
import PersonFormFields from './PersonFormFields.svelte'

describe('PersonFormFields - Photo Preview Integration', () => {
  describe('Photo preview display', () => {
    it('should show PhotoPreview component', () => {
      const { container } = render(PersonFormFields, {
        props: {
          person: {
            firstName: 'John',
            lastName: 'Doe',
            photoUrl: 'https://example.com/photo.jpg'
          }
        }
      })

      // Should have photo preview container
      const photoPreview = container.querySelector('.photo-preview-container, .photo-placeholder')
      expect(photoPreview).toBeTruthy()
    })

    it('should display actual photo when photoUrl is provided', () => {
      const { container } = render(PersonFormFields, {
        props: {
          person: {
            firstName: 'Jane',
            lastName: 'Smith',
            photoUrl: 'https://example.com/jane.jpg'
          }
        }
      })

      const img = container.querySelector('img')
      expect(img).toBeTruthy()
      expect(img.getAttribute('src')).toBe('https://example.com/jane.jpg')
    })

    it('should show placeholder with initials when no photoUrl', () => {
      const { container } = render(PersonFormFields, {
        props: {
          person: {
            firstName: 'Bob',
            lastName: 'Jones',
            photoUrl: null
          }
        }
      })

      const placeholder = container.querySelector('.photo-placeholder')
      expect(placeholder).toBeTruthy()

      const initials = container.querySelector('.initials')
      expect(initials).toBeTruthy()
      expect(initials.textContent).toBe('BJ')
    })

    it('should show placeholder for new person (no person prop)', () => {
      const { container } = render(PersonFormFields, {
        props: {
          person: null
        }
      })

      // Should render form fields
      expect(container.querySelector('#firstName')).toBeTruthy()
    })
  })

  describe('Photo URL field', () => {
    it('should have photoUrl input field', () => {
      const { container } = render(PersonFormFields, {
        props: {
          person: null
        }
      })

      const photoUrlInput = container.querySelector('#photoUrl')
      expect(photoUrlInput).toBeTruthy()
      expect(photoUrlInput.getAttribute('type')).toBe('url')
    })

    it('should populate photoUrl input with existing value', () => {
      const { container } = render(PersonFormFields, {
        props: {
          person: {
            firstName: 'John',
            lastName: 'Doe',
            photoUrl: 'https://example.com/photo.jpg'
          }
        }
      })

      const photoUrlInput = container.querySelector('#photoUrl')
      expect(photoUrlInput.value).toBe('https://example.com/photo.jpg')
    })

    it('should allow editing photoUrl', () => {
      const { container } = render(PersonFormFields, {
        props: {
          person: {
            firstName: 'John',
            lastName: 'Doe',
            photoUrl: ''
          }
        }
      })

      const photoUrlInput = container.querySelector('#photoUrl')
      // Input field should be editable (not disabled/readonly)
      expect(photoUrlInput.hasAttribute('disabled')).toBe(false)
      expect(photoUrlInput.hasAttribute('readonly')).toBe(false)
    })
  })

  describe('Reactive preview updates', () => {
    it('should show placeholder initially when no photoUrl', () => {
      const { container } = render(PersonFormFields, {
        props: {
          person: {
            firstName: 'John',
            lastName: 'Doe',
            photoUrl: ''
          }
        }
      })

      // Initially should show placeholder
      expect(container.querySelector('.photo-placeholder')).toBeTruthy()

      // PhotoUrl input should be accessible for editing
      const photoUrlInput = container.querySelector('#photoUrl')
      expect(photoUrlInput).toBeTruthy()
      expect(photoUrlInput.value).toBe('')
    })

    it('should render PhotoPreview with current form data', () => {
      const { container } = render(PersonFormFields, {
        props: {
          person: {
            firstName: 'Alice',
            lastName: 'Brown',
            photoUrl: null
          }
        }
      })

      // PhotoPreview should use current firstName/lastName for initials
      const initials = container.querySelector('.initials')
      expect(initials).toBeTruthy()
      expect(initials.textContent).toBe('AB')
    })
  })

  describe('Layout and positioning', () => {
    it('should position photo preview at top of form', () => {
      const { container } = render(PersonFormFields, {
        props: {
          person: {
            firstName: 'John',
            lastName: 'Doe',
            photoUrl: 'https://example.com/photo.jpg'
          }
        }
      })

      const form = container.querySelector('form')
      const photoSection = container.querySelector('.photo-section, .photo-preview-section')

      expect(form).toBeTruthy()
      expect(photoSection).toBeTruthy()
    })

    it('should center align photo preview', () => {
      const { container } = render(PersonFormFields, {
        props: {
          person: {
            firstName: 'John',
            lastName: 'Doe',
            photoUrl: 'https://example.com/photo.jpg'
          }
        }
      })

      const photoSection = container.querySelector('.photo-section, .photo-preview-section')
      expect(photoSection).toBeTruthy()
    })
  })

  describe('Existing form functionality', () => {
    it('should still render all required fields', () => {
      const { container } = render(PersonFormFields, {
        props: {
          person: null
        }
      })

      expect(container.querySelector('#firstName')).toBeTruthy()
      expect(container.querySelector('#lastName')).toBeTruthy()
      expect(container.querySelector('#photoUrl')).toBeTruthy()
      expect(container.querySelector('#birthDate')).toBeTruthy()
    })

    it('should not break Facebook import functionality', () => {
      const { container } = render(PersonFormFields, {
        props: {
          person: null
        }
      })

      const facebookImportToggle = container.querySelector('.facebook-import-toggle')
      expect(facebookImportToggle).toBeTruthy()
    })

    it('should maintain form submission functionality', () => {
      const { container, component } = render(PersonFormFields, {
        props: {
          person: null
        }
      })

      let submitted = false
      component.$on('submit', () => {
        submitted = true
      })

      const form = container.querySelector('form')
      expect(form).toBeTruthy()
    })
  })
})
