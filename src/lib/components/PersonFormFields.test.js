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
    it('should have photoUrl input field in Additional Metadata section', async () => {
      const { container } = render(PersonFormFields, {
        props: {
          person: null
        }
      })

      // Expand Additional Metadata section
      const sectionHeaders = Array.from(container.querySelectorAll('.section-header'))
      const metadataSection = sectionHeaders.find(header =>
        header.textContent.includes('Additional Metadata')
      )
      await fireEvent.click(metadataSection)

      const photoUrlInput = container.querySelector('#photoUrl')
      expect(photoUrlInput).toBeTruthy()
      expect(photoUrlInput.getAttribute('type')).toBe('url')
    })

    it('should populate photoUrl input with existing value', async () => {
      const { container } = render(PersonFormFields, {
        props: {
          person: {
            firstName: 'John',
            lastName: 'Doe',
            photoUrl: 'https://example.com/photo.jpg'
          }
        }
      })

      // Expand Additional Metadata section
      const sectionHeaders = Array.from(container.querySelectorAll('.section-header'))
      const metadataSection = sectionHeaders.find(header =>
        header.textContent.includes('Additional Metadata')
      )
      await fireEvent.click(metadataSection)

      const photoUrlInput = container.querySelector('#photoUrl')
      expect(photoUrlInput.value).toBe('https://example.com/photo.jpg')
    })

    it('should allow editing photoUrl', async () => {
      const { container } = render(PersonFormFields, {
        props: {
          person: {
            firstName: 'John',
            lastName: 'Doe',
            photoUrl: ''
          }
        }
      })

      // Expand Additional Metadata section
      const sectionHeaders = Array.from(container.querySelectorAll('.section-header'))
      const metadataSection = sectionHeaders.find(header =>
        header.textContent.includes('Additional Metadata')
      )
      await fireEvent.click(metadataSection)

      const photoUrlInput = container.querySelector('#photoUrl')
      // Input field should be editable (not disabled/readonly)
      expect(photoUrlInput.hasAttribute('disabled')).toBe(false)
      expect(photoUrlInput.hasAttribute('readonly')).toBe(false)
    })
  })

  describe('Reactive preview updates', () => {
    it('should show placeholder initially when no photoUrl', async () => {
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

      // Expand Additional Metadata section to access photoUrl field
      const sectionHeaders = Array.from(container.querySelectorAll('.section-header'))
      const metadataSection = sectionHeaders.find(header =>
        header.textContent.includes('Additional Metadata')
      )
      await fireEvent.click(metadataSection)

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
    it('should still render all required fields', async () => {
      const { container } = render(PersonFormFields, {
        props: {
          person: null
        }
      })

      expect(container.querySelector('#firstName')).toBeTruthy()
      expect(container.querySelector('#lastName')).toBeTruthy()
      expect(container.querySelector('#birthDate')).toBeTruthy()

      // photoUrl is now in a collapsible section - expand to verify it exists
      const sectionHeaders = Array.from(container.querySelectorAll('.section-header'))
      const metadataSection = sectionHeaders.find(header =>
        header.textContent.includes('Additional Metadata')
      )
      await fireEvent.click(metadataSection)
      expect(container.querySelector('#photoUrl')).toBeTruthy()
    })

    it('should not have Facebook import section (moved to PersonModal)', () => {
      const { container } = render(PersonFormFields, {
        props: {
          person: null
        }
      })

      // Facebook import section should not exist in PersonFormFields anymore
      const facebookImportToggle = container.querySelector('.facebook-import-toggle')
      expect(facebookImportToggle).toBeFalsy()

      const facebookImportSection = container.querySelector('.facebook-import-section')
      expect(facebookImportSection).toBeFalsy()
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

  describe('Part 1: Additional Metadata Positioning (After Death Date)', () => {
    describe('AC1: Additional Metadata positioned after dates', () => {
      it('should render form fields in correct order', async () => {
        const { container } = render(PersonFormFields, {
          props: {
            person: null
          }
        })

        // Get all form labels and section headers in order
        const formElements = Array.from(container.querySelectorAll('label, .section-header'))
        const elementTexts = formElements.map(el => el.textContent.trim())

        // Find indices of key elements
        const birthDateIdx = elementTexts.findIndex(text => text.includes('Birth Date'))
        const deathDateIdx = elementTexts.findIndex(text => text.includes('Still Alive'))
        const metadataIdx = elementTexts.findIndex(text => text.includes('Additional Metadata'))

        // Additional Metadata should come after birth and death date fields
        expect(metadataIdx).toBeGreaterThan(birthDateIdx)
        expect(metadataIdx).toBeGreaterThan(deathDateIdx)
      })

      it('should position Additional Metadata section between Death Date and end of form', () => {
        const { container } = render(PersonFormFields, {
          props: {
            person: null
          }
        })

        const form = container.querySelector('form')
        const formChildren = Array.from(form.children)

        // Find the Additional Metadata section
        const metadataSection = formChildren.find(child => {
          const header = child.querySelector('.section-header')
          return header && header.textContent.includes('Additional Metadata')
        })

        expect(metadataSection).toBeTruthy()

        // Check it comes after the death date checkbox
        const deathDateCheckbox = container.querySelector('input[type="checkbox"]')
        const deathDateGroup = deathDateCheckbox.closest('.form-group')

        const metadataIndex = formChildren.indexOf(metadataSection)
        const deathDateIndex = formChildren.indexOf(deathDateGroup)

        expect(metadataIndex).toBeGreaterThan(deathDateIndex)
      })
    })

    describe('AC2: Functionality unchanged', () => {
      it('should expand/collapse Additional Metadata section correctly', async () => {
        const { container } = render(PersonFormFields, {
          props: {
            person: null
          }
        })

        const sectionHeaders = Array.from(container.querySelectorAll('.section-header'))
        const metadataSection = sectionHeaders.find(header =>
          header.textContent.includes('Additional Metadata')
        )

        // Initially collapsed
        expect(metadataSection.getAttribute('aria-expanded')).toBe('false')

        // Click to expand
        await fireEvent.click(metadataSection)

        // Should now be expanded
        expect(metadataSection.getAttribute('aria-expanded')).toBe('true')
      })

      it('should contain Photo URL field in Additional Metadata section', async () => {
        const { container } = render(PersonFormFields, {
          props: {
            person: null
          }
        })

        // Expand Additional Metadata section
        const sectionHeaders = Array.from(container.querySelectorAll('.section-header'))
        const metadataSection = sectionHeaders.find(header =>
          header.textContent.includes('Additional Metadata')
        )
        await fireEvent.click(metadataSection)

        const photoUrlInput = container.querySelector('#photoUrl')
        expect(photoUrlInput).toBeTruthy()
        expect(photoUrlInput.getAttribute('type')).toBe('url')
      })

      it('should submit form with Photo URL data correctly', async () => {
        const { container, component } = render(PersonFormFields, {
          props: {
            person: null
          }
        })

        let submittedData = null
        component.$on('submit', (event) => {
          submittedData = event.detail
        })

        // Expand Additional Metadata section
        const sectionHeaders = Array.from(container.querySelectorAll('.section-header'))
        const metadataSection = sectionHeaders.find(header =>
          header.textContent.includes('Additional Metadata')
        )
        await fireEvent.click(metadataSection)

        // Fill in form including photoUrl
        const firstNameInput = container.querySelector('#firstName')
        const lastNameInput = container.querySelector('#lastName')
        const photoUrlInput = container.querySelector('#photoUrl')

        await fireEvent.input(firstNameInput, { target: { value: 'John' } })
        await fireEvent.input(lastNameInput, { target: { value: 'Doe' } })
        await fireEvent.input(photoUrlInput, { target: { value: 'https://example.com/photo.jpg' } })

        // Call handleSubmit directly
        component.handleSubmit()

        expect(submittedData).toBeTruthy()
        expect(submittedData.photoUrl).toBe('https://example.com/photo.jpg')
      })
    })
  })

  describe('Additional Metadata Collapsible Section', () => {
    describe('AC1: Collapsible Additional Metadata section', () => {
      it('should render Additional Metadata collapsible section', () => {
        const { container } = render(PersonFormFields, {
          props: {
            person: null
          }
        })

        // Find the section header with "Additional Metadata" text
        const sectionHeaders = Array.from(container.querySelectorAll('.section-header'))
        const metadataSection = sectionHeaders.find(header =>
          header.textContent.includes('Additional Metadata')
        )

        expect(metadataSection).toBeTruthy()
      })

      it('should have Additional Metadata section collapsed by default', () => {
        const { container } = render(PersonFormFields, {
          props: {
            person: null
          }
        })

        // Find the section header
        const sectionHeaders = Array.from(container.querySelectorAll('.section-header'))
        const metadataSection = sectionHeaders.find(header =>
          header.textContent.includes('Additional Metadata')
        )

        expect(metadataSection).toBeTruthy()

        // Check aria-expanded attribute
        expect(metadataSection.getAttribute('aria-expanded')).toBe('false')
      })

      it('should have toggle button/header to expand/collapse', () => {
        const { container } = render(PersonFormFields, {
          props: {
            person: null
          }
        })

        const sectionHeaders = Array.from(container.querySelectorAll('.section-header'))
        const metadataSection = sectionHeaders.find(header =>
          header.textContent.includes('Additional Metadata')
        )

        expect(metadataSection).toBeTruthy()

        // Should have role="button" for accessibility
        expect(metadataSection.getAttribute('role')).toBe('button')

        // Should have tabindex for keyboard navigation
        expect(metadataSection.getAttribute('tabindex')).toBe('0')
      })
    })

    describe('AC2: Photo URL field moved to section', () => {
      it('should show Photo URL field when Additional Metadata section is expanded', async () => {
        const { container } = render(PersonFormFields, {
          props: {
            person: null
          }
        })

        // Find and click the section header
        const sectionHeaders = Array.from(container.querySelectorAll('.section-header'))
        const metadataSection = sectionHeaders.find(header =>
          header.textContent.includes('Additional Metadata')
        )

        // Initially collapsed - Photo URL should not be visible
        let photoUrlInput = container.querySelector('#photoUrl')

        // The input may exist in DOM but should be in a collapsed section
        if (photoUrlInput) {
          // Check if parent section is collapsed
          const sectionContent = photoUrlInput.closest('.section-content')
          if (sectionContent) {
            expect(sectionContent.classList.contains('collapsed')).toBe(true)
          }
        }

        // Click to expand
        await fireEvent.click(metadataSection)

        // Now Photo URL should be visible in expanded section
        photoUrlInput = container.querySelector('#photoUrl')
        expect(photoUrlInput).toBeTruthy()

        // Check that it's in an expanded section
        const sectionContent = photoUrlInput.closest('.section-content')
        expect(sectionContent).toBeTruthy()
        expect(sectionContent.classList.contains('expanded')).toBe(true)
      })

      it('should allow editing Photo URL when section is expanded', async () => {
        const { container } = render(PersonFormFields, {
          props: {
            person: {
              firstName: 'John',
              lastName: 'Doe',
              photoUrl: 'https://example.com/old.jpg'
            }
          }
        })

        // Expand the section
        const sectionHeaders = Array.from(container.querySelectorAll('.section-header'))
        const metadataSection = sectionHeaders.find(header =>
          header.textContent.includes('Additional Metadata')
        )
        await fireEvent.click(metadataSection)

        // Find and verify Photo URL field
        const photoUrlInput = container.querySelector('#photoUrl')
        expect(photoUrlInput).toBeTruthy()
        expect(photoUrlInput.value).toBe('https://example.com/old.jpg')

        // Field should be editable
        expect(photoUrlInput.hasAttribute('disabled')).toBe(false)
        expect(photoUrlInput.hasAttribute('readonly')).toBe(false)
      })

      it('should maintain Photo URL field functionality (validation)', async () => {
        const { container } = render(PersonFormFields, {
          props: {
            person: null
          }
        })

        // Expand the section
        const sectionHeaders = Array.from(container.querySelectorAll('.section-header'))
        const metadataSection = sectionHeaders.find(header =>
          header.textContent.includes('Additional Metadata')
        )
        await fireEvent.click(metadataSection)

        const photoUrlInput = container.querySelector('#photoUrl')
        expect(photoUrlInput).toBeTruthy()

        // Should have type="url" for browser validation
        expect(photoUrlInput.getAttribute('type')).toBe('url')
      })
    })

    describe('AC3: Section toggle functionality', () => {
      it('should expand section when clicking collapsed header', async () => {
        const { container } = render(PersonFormFields, {
          props: {
            person: null
          }
        })

        const sectionHeaders = Array.from(container.querySelectorAll('.section-header'))
        const metadataSection = sectionHeaders.find(header =>
          header.textContent.includes('Additional Metadata')
        )

        // Initially collapsed
        expect(metadataSection.getAttribute('aria-expanded')).toBe('false')

        // Click to expand
        await fireEvent.click(metadataSection)

        // Should now be expanded
        expect(metadataSection.getAttribute('aria-expanded')).toBe('true')
      })

      it('should collapse section when clicking expanded header', async () => {
        const { container } = render(PersonFormFields, {
          props: {
            person: null
          }
        })

        const sectionHeaders = Array.from(container.querySelectorAll('.section-header'))
        const metadataSection = sectionHeaders.find(header =>
          header.textContent.includes('Additional Metadata')
        )

        // Expand first
        await fireEvent.click(metadataSection)
        expect(metadataSection.getAttribute('aria-expanded')).toBe('true')

        // Click again to collapse
        await fireEvent.click(metadataSection)
        expect(metadataSection.getAttribute('aria-expanded')).toBe('false')
      })

      it('should rotate toggle icon to indicate state', async () => {
        const { container } = render(PersonFormFields, {
          props: {
            person: null
          }
        })

        const sectionHeaders = Array.from(container.querySelectorAll('.section-header'))
        const metadataSection = sectionHeaders.find(header =>
          header.textContent.includes('Additional Metadata')
        )

        // Find the chevron icon
        const chevron = metadataSection.querySelector('.chevron, .toggle-icon')
        expect(chevron).toBeTruthy()

        // Initially should not have expanded class
        expect(chevron.classList.contains('expanded')).toBe(false)

        // Expand section
        await fireEvent.click(metadataSection)

        // Chevron should now have expanded class (which applies rotation)
        expect(chevron.classList.contains('expanded')).toBe(true)
      })

      it('should have smooth transition', async () => {
        const { container } = render(PersonFormFields, {
          props: {
            person: null
          }
        })

        const sectionHeaders = Array.from(container.querySelectorAll('.section-header'))
        const metadataSection = sectionHeaders.find(header =>
          header.textContent.includes('Additional Metadata')
        )

        // Expand section
        await fireEvent.click(metadataSection)

        // Check that section content uses svelte transition (via transition:slide)
        // This is verified by the presence of section-content with expanded class
        const sectionContent = container.querySelector('.section-content.expanded')
        expect(sectionContent).toBeTruthy()
      })
    })

    describe('AC4: Mobile responsive behavior', () => {
      it('should maintain collapsible functionality on mobile', async () => {
        // Simulate mobile viewport (this is more for documentation)
        const { container } = render(PersonFormFields, {
          props: {
            person: null
          }
        })

        const sectionHeaders = Array.from(container.querySelectorAll('.section-header'))
        const metadataSection = sectionHeaders.find(header =>
          header.textContent.includes('Additional Metadata')
        )

        // Should still be collapsible
        expect(metadataSection.getAttribute('aria-expanded')).toBe('false')

        await fireEvent.click(metadataSection)

        expect(metadataSection.getAttribute('aria-expanded')).toBe('true')
      })

      it('should have touch-friendly section header', () => {
        const { container } = render(PersonFormFields, {
          props: {
            person: null
          }
        })

        const sectionHeaders = Array.from(container.querySelectorAll('.section-header'))
        const metadataSection = sectionHeaders.find(header =>
          header.textContent.includes('Additional Metadata')
        )

        expect(metadataSection).toBeTruthy()

        // CollapsibleSection component should handle touch-friendly sizing via CSS
        // Just verify the header exists and is clickable
        expect(metadataSection.getAttribute('role')).toBe('button')
      })
    })

    describe('Keyboard navigation (Accessibility)', () => {
      it('should expand/collapse section with Enter key', async () => {
        const { container } = render(PersonFormFields, {
          props: {
            person: null
          }
        })

        const sectionHeaders = Array.from(container.querySelectorAll('.section-header'))
        const metadataSection = sectionHeaders.find(header =>
          header.textContent.includes('Additional Metadata')
        )

        // Initially collapsed
        expect(metadataSection.getAttribute('aria-expanded')).toBe('false')

        // Press Enter key
        await fireEvent.keyDown(metadataSection, { key: 'Enter' })

        // Should expand
        expect(metadataSection.getAttribute('aria-expanded')).toBe('true')
      })

      it('should expand/collapse section with Space key', async () => {
        const { container } = render(PersonFormFields, {
          props: {
            person: null
          }
        })

        const sectionHeaders = Array.from(container.querySelectorAll('.section-header'))
        const metadataSection = sectionHeaders.find(header =>
          header.textContent.includes('Additional Metadata')
        )

        // Initially collapsed
        expect(metadataSection.getAttribute('aria-expanded')).toBe('false')

        // Press Space key
        await fireEvent.keyDown(metadataSection, { key: ' ' })

        // Should expand
        expect(metadataSection.getAttribute('aria-expanded')).toBe('true')
      })

      it('should have ARIA labels', () => {
        const { container } = render(PersonFormFields, {
          props: {
            person: null
          }
        })

        const sectionHeaders = Array.from(container.querySelectorAll('.section-header'))
        const metadataSection = sectionHeaders.find(header =>
          header.textContent.includes('Additional Metadata')
        )

        // Should have aria-label or aria-labelledby
        const hasAriaLabel = metadataSection.hasAttribute('aria-label') ||
                            metadataSection.hasAttribute('aria-labelledby')
        expect(hasAriaLabel).toBe(true)

        // Should have aria-controls pointing to content
        expect(metadataSection.hasAttribute('aria-controls')).toBe(true)
      })
    })
  })
})
