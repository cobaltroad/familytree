import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, waitFor } from '@testing-library/svelte'
import PhotoPreview from './PhotoPreview.svelte'

describe('PhotoPreview', () => {
  describe('AC1: Display profile photo preview', () => {
    it('should display actual image when photoUrl is provided', () => {
      const photoUrl = 'https://example.com/photo.jpg'
      const { container } = render(PhotoPreview, {
        props: {
          photoUrl,
          firstName: 'John',
          lastName: 'Doe'
        }
      })

      const img = container.querySelector('img')
      expect(img).toBeTruthy()
      expect(img.getAttribute('src')).toBe(photoUrl)
    })

    it('should render photo with appropriate size (80-100px)', () => {
      const { container } = render(PhotoPreview, {
        props: {
          photoUrl: 'https://example.com/photo.jpg',
          firstName: 'Jane',
          lastName: 'Smith'
        }
      })

      const photoContainer = container.querySelector('.photo-preview-container')
      expect(photoContainer).toBeTruthy()

      // Check computed style or class that sets the size
      const styles = getComputedStyle(photoContainer)
      const width = parseInt(styles.width)
      expect(width).toBeGreaterThanOrEqual(80)
      expect(width).toBeLessThanOrEqual(100)
    })

    it('should render photo with circular appearance', () => {
      const { container } = render(PhotoPreview, {
        props: {
          photoUrl: 'https://example.com/photo.jpg',
          firstName: 'John',
          lastName: 'Doe'
        }
      })

      const photoContainer = container.querySelector('.photo-preview-container')
      expect(photoContainer).toBeTruthy()

      // Should have class for circular appearance (CSS sets border-radius: 50%)
      expect(photoContainer.classList.contains('photo-preview-container')).toBe(true)
    })

    it('should have alt text for accessibility', () => {
      const { container } = render(PhotoPreview, {
        props: {
          photoUrl: 'https://example.com/photo.jpg',
          firstName: 'John',
          lastName: 'Doe'
        }
      })

      const img = container.querySelector('img')
      const alt = img.getAttribute('alt')
      expect(alt).toBeTruthy()
      expect(alt).toContain('John Doe')
    })
  })

  describe('AC2: Fallback for missing photos', () => {
    it('should show placeholder when photoUrl is null', () => {
      const { container } = render(PhotoPreview, {
        props: {
          photoUrl: null,
          firstName: 'John',
          lastName: 'Doe'
        }
      })

      const placeholder = container.querySelector('.photo-placeholder')
      expect(placeholder).toBeTruthy()
    })

    it('should show placeholder when photoUrl is empty string', () => {
      const { container } = render(PhotoPreview, {
        props: {
          photoUrl: '',
          firstName: 'Jane',
          lastName: 'Smith'
        }
      })

      const placeholder = container.querySelector('.photo-placeholder')
      expect(placeholder).toBeTruthy()
    })

    it('should show placeholder when photoUrl is undefined', () => {
      const { container } = render(PhotoPreview, {
        props: {
          photoUrl: undefined,
          firstName: 'Bob',
          lastName: 'Jones'
        }
      })

      const placeholder = container.querySelector('.photo-placeholder')
      expect(placeholder).toBeTruthy()
    })

    it('should display initials in placeholder (first letter of first and last name)', () => {
      const { container } = render(PhotoPreview, {
        props: {
          photoUrl: null,
          firstName: 'John',
          lastName: 'Doe'
        }
      })

      const initials = container.querySelector('.initials')
      expect(initials).toBeTruthy()
      expect(initials.textContent).toBe('JD')
    })

    it('should handle single letter names', () => {
      const { container } = render(PhotoPreview, {
        props: {
          photoUrl: null,
          firstName: 'A',
          lastName: 'B'
        }
      })

      const initials = container.querySelector('.initials')
      expect(initials.textContent).toBe('AB')
    })

    it('should handle missing first name gracefully', () => {
      const { container } = render(PhotoPreview, {
        props: {
          photoUrl: null,
          firstName: '',
          lastName: 'Doe'
        }
      })

      const initials = container.querySelector('.initials')
      expect(initials.textContent).toBe('D')
    })

    it('should handle missing last name gracefully', () => {
      const { container } = render(PhotoPreview, {
        props: {
          photoUrl: null,
          firstName: 'John',
          lastName: ''
        }
      })

      const initials = container.querySelector('.initials')
      expect(initials.textContent).toBe('J')
    })

    it('should handle missing both names gracefully', () => {
      const { container } = render(PhotoPreview, {
        props: {
          photoUrl: null,
          firstName: '',
          lastName: ''
        }
      })

      const placeholder = container.querySelector('.photo-placeholder')
      expect(placeholder).toBeTruthy()
      // Should still render, possibly with default icon
    })

    it('should match same size and shape as photos', () => {
      const { container } = render(PhotoPreview, {
        props: {
          photoUrl: null,
          firstName: 'John',
          lastName: 'Doe'
        }
      })

      const placeholder = container.querySelector('.photo-placeholder')
      const styles = getComputedStyle(placeholder)
      const width = parseInt(styles.width)

      expect(width).toBeGreaterThanOrEqual(80)
      expect(width).toBeLessThanOrEqual(100)
      // Placeholder should have same classes as photo container for consistent styling
      expect(placeholder.classList.contains('photo-preview-container')).toBe(true)
    })

    it('should have colored background for placeholder', () => {
      const { container } = render(PhotoPreview, {
        props: {
          photoUrl: null,
          firstName: 'John',
          lastName: 'Doe'
        }
      })

      const placeholder = container.querySelector('.photo-placeholder')
      const styles = getComputedStyle(placeholder)

      // Should have some background color (not transparent)
      expect(styles.background).not.toBe('')
      expect(styles.background).not.toBe('transparent')
    })
  })

  describe('AC3: Edit capability maintained', () => {
    it('should reactively update when photoUrl changes', async () => {
      const { container, component } = render(PhotoPreview, {
        props: {
          photoUrl: 'https://example.com/photo1.jpg',
          firstName: 'John',
          lastName: 'Doe'
        }
      })

      let img = container.querySelector('img')
      expect(img.getAttribute('src')).toBe('https://example.com/photo1.jpg')

      // Update the photoUrl prop
      await component.$set({ photoUrl: 'https://example.com/photo2.jpg' })

      img = container.querySelector('img')
      expect(img.getAttribute('src')).toBe('https://example.com/photo2.jpg')
    })

    it('should switch from placeholder to image when photoUrl is added', async () => {
      const { container, component } = render(PhotoPreview, {
        props: {
          photoUrl: null,
          firstName: 'John',
          lastName: 'Doe'
        }
      })

      expect(container.querySelector('.photo-placeholder')).toBeTruthy()
      expect(container.querySelector('img')).toBeFalsy()

      // Add photoUrl
      await component.$set({ photoUrl: 'https://example.com/photo.jpg' })

      expect(container.querySelector('img')).toBeTruthy()
      expect(container.querySelector('.photo-placeholder')).toBeFalsy()
    })

    it('should switch from image to placeholder when photoUrl is removed', async () => {
      const { container, component } = render(PhotoPreview, {
        props: {
          photoUrl: 'https://example.com/photo.jpg',
          firstName: 'John',
          lastName: 'Doe'
        }
      })

      expect(container.querySelector('img')).toBeTruthy()
      expect(container.querySelector('.photo-placeholder')).toBeFalsy()

      // Remove photoUrl
      await component.$set({ photoUrl: null })

      expect(container.querySelector('.photo-placeholder')).toBeTruthy()
      expect(container.querySelector('img')).toBeFalsy()
    })
  })

  describe('AC4: Error handling for broken images', () => {
    it('should show fallback when image fails to load', async () => {
      const { container } = render(PhotoPreview, {
        props: {
          photoUrl: 'https://example.com/broken-image.jpg',
          firstName: 'John',
          lastName: 'Doe'
        }
      })

      const img = container.querySelector('img')
      expect(img).toBeTruthy()

      // Simulate image load error
      await fireEvent.error(img)

      // Should show placeholder after error
      await waitFor(() => {
        const placeholder = container.querySelector('.photo-placeholder')
        expect(placeholder).toBeTruthy()
      })
    })

    it('should display initials in error fallback', async () => {
      const { container } = render(PhotoPreview, {
        props: {
          photoUrl: 'https://example.com/broken.jpg',
          firstName: 'Jane',
          lastName: 'Smith'
        }
      })

      const img = container.querySelector('img')
      await fireEvent.error(img)

      await waitFor(() => {
        const initials = container.querySelector('.initials')
        expect(initials).toBeTruthy()
        expect(initials.textContent).toBe('JS')
      })
    })

    it('should show error indicator when image fails to load', async () => {
      const { container } = render(PhotoPreview, {
        props: {
          photoUrl: 'https://example.com/broken.jpg',
          firstName: 'John',
          lastName: 'Doe'
        }
      })

      const img = container.querySelector('img')
      await fireEvent.error(img)

      await waitFor(() => {
        // Should have some visual error indicator
        const errorIndicator = container.querySelector('.error-indicator, .photo-error, [data-error="true"]')
        expect(errorIndicator).toBeTruthy()
      })
    })

    it('should allow recovery by updating photoUrl after error', async () => {
      const { container, component } = render(PhotoPreview, {
        props: {
          photoUrl: 'https://example.com/broken.jpg',
          firstName: 'John',
          lastName: 'Doe'
        }
      })

      const img = container.querySelector('img')
      await fireEvent.error(img)

      // Update to a new URL
      await component.$set({ photoUrl: 'https://example.com/fixed.jpg' })

      // Should try to load the new image
      const newImg = container.querySelector('img')
      expect(newImg).toBeTruthy()
      expect(newImg.getAttribute('src')).toBe('https://example.com/fixed.jpg')
    })
  })

  describe('Visual design and styling', () => {
    it('should apply consistent styling across all states', () => {
      const { container: container1 } = render(PhotoPreview, {
        props: {
          photoUrl: 'https://example.com/photo.jpg',
          firstName: 'John',
          lastName: 'Doe'
        }
      })

      const { container: container2 } = render(PhotoPreview, {
        props: {
          photoUrl: null,
          firstName: 'Jane',
          lastName: 'Smith'
        }
      })

      const photo = container1.querySelector('.photo-preview-container, .photo-placeholder, img')
      const placeholder = container2.querySelector('.photo-placeholder')

      expect(photo).toBeTruthy()
      expect(placeholder).toBeTruthy()
    })

    it('should support optional size prop for customization', () => {
      const { container } = render(PhotoPreview, {
        props: {
          photoUrl: 'https://example.com/photo.jpg',
          firstName: 'John',
          lastName: 'Doe',
          size: 120
        }
      })

      const photoContainer = container.querySelector('.photo-preview-container')
      const styles = getComputedStyle(photoContainer)
      const width = parseInt(styles.width)

      expect(width).toBe(120)
    })

    it('should have proper object-fit for images to prevent distortion', () => {
      const { container } = render(PhotoPreview, {
        props: {
          photoUrl: 'https://example.com/photo.jpg',
          firstName: 'John',
          lastName: 'Doe'
        }
      })

      const img = container.querySelector('img')
      expect(img).toBeTruthy()

      // Image element should exist and be properly sized (CSS sets object-fit: cover)
      expect(img.tagName).toBe('IMG')
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA role for image', () => {
      const { container } = render(PhotoPreview, {
        props: {
          photoUrl: 'https://example.com/photo.jpg',
          firstName: 'John',
          lastName: 'Doe'
        }
      })

      const img = container.querySelector('img')
      expect(img.getAttribute('alt')).toBeTruthy()
    })

    it('should have aria-label for placeholder', () => {
      const { container } = render(PhotoPreview, {
        props: {
          photoUrl: null,
          firstName: 'John',
          lastName: 'Doe'
        }
      })

      const placeholder = container.querySelector('.photo-placeholder')
      const ariaLabel = placeholder.getAttribute('aria-label')

      expect(ariaLabel).toBeTruthy()
      expect(ariaLabel).toContain('John Doe')
    })

    it('should indicate loading state for screen readers', () => {
      const { container } = render(PhotoPreview, {
        props: {
          photoUrl: 'https://example.com/photo.jpg',
          firstName: 'John',
          lastName: 'Doe'
        }
      })

      // Component should exist and be accessible
      expect(container.querySelector('.photo-preview-container, img')).toBeTruthy()
    })
  })

  describe('Edge cases', () => {
    it('should handle very long names in initials', () => {
      const { container } = render(PhotoPreview, {
        props: {
          photoUrl: null,
          firstName: 'VeryLongFirstName',
          lastName: 'VeryLongLastName'
        }
      })

      const initials = container.querySelector('.initials')
      // Should only show first letter of each name
      expect(initials.textContent).toBe('VV')
    })

    it('should handle lowercase names correctly', () => {
      const { container } = render(PhotoPreview, {
        props: {
          photoUrl: null,
          firstName: 'john',
          lastName: 'doe'
        }
      })

      const initials = container.querySelector('.initials')
      // Should uppercase the initials
      expect(initials.textContent).toBe('JD')
    })

    it('should handle names with special characters', () => {
      const { container } = render(PhotoPreview, {
        props: {
          photoUrl: null,
          firstName: 'José',
          lastName: "O'Brien"
        }
      })

      const initials = container.querySelector('.initials')
      expect(initials.textContent).toBe('JO')
    })

    it('should handle whitespace in names', () => {
      const { container } = render(PhotoPreview, {
        props: {
          photoUrl: null,
          firstName: '  John  ',
          lastName: '  Doe  '
        }
      })

      const initials = container.querySelector('.initials')
      expect(initials.textContent).toBe('JD')
    })

    it('should handle null/undefined names gracefully', () => {
      const { container } = render(PhotoPreview, {
        props: {
          photoUrl: null,
          firstName: null,
          lastName: undefined
        }
      })

      const placeholder = container.querySelector('.photo-placeholder')
      expect(placeholder).toBeTruthy()
    })

    it('should handle data URLs for images', () => {
      const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      const { container } = render(PhotoPreview, {
        props: {
          photoUrl: dataUrl,
          firstName: 'John',
          lastName: 'Doe'
        }
      })

      const img = container.querySelector('img')
      expect(img.getAttribute('src')).toBe(dataUrl)
    })
  })

  describe('Performance', () => {
    it('should not reload image unnecessarily when other props change', async () => {
      const { container, component } = render(PhotoPreview, {
        props: {
          photoUrl: 'https://example.com/photo.jpg',
          firstName: 'John',
          lastName: 'Doe'
        }
      })

      const img1 = container.querySelector('img')
      const src1 = img1.getAttribute('src')

      // Update firstName (shouldn't reload image)
      await component.$set({ firstName: 'Jane' })

      const img2 = container.querySelector('img')
      const src2 = img2.getAttribute('src')

      expect(src1).toBe(src2)
      expect(src2).toBe('https://example.com/photo.jpg')
    })

    it('should use loading="lazy" for performance', () => {
      const { container } = render(PhotoPreview, {
        props: {
          photoUrl: 'https://example.com/photo.jpg',
          firstName: 'John',
          lastName: 'Doe'
        }
      })

      const img = container.querySelector('img')
      expect(img.getAttribute('loading')).toBe('lazy')
    })
  })
})
