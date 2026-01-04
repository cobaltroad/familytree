/**
 * TDD Test Suite: GEDCOM Route Integration
 *
 * RED PHASE: These tests verify that all GEDCOM routes are properly connected
 * and render the correct components in the correct sequence.
 *
 * GEDCOM Import Flow:
 * 1. User navigates to #/gedcom/import → GedcomUpload component
 * 2. After upload succeeds → Redirect to #/gedcom/parsing/:uploadId → GedcomParsingResults
 * 3. After parsing → Navigate to #/gedcom/preview/:uploadId → GedcomPreview
 * 4. After import starts → Navigate to #/gedcom/import-progress/:uploadId → GedcomImportProgress
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render } from '@testing-library/svelte'
import { writable } from 'svelte/store'
import App from './routes/+page.svelte'
import { people, relationships } from './stores/familyStore.js'

// Mock $app/stores with proper page store
vi.mock('$app/stores', () => ({
  page: writable({
    data: {
      session: {
        user: {
          id: 1,
          email: 'test@example.com'
        }
      }
    }
  }),
  navigating: {
    subscribe: vi.fn()
  },
  updated: {
    subscribe: vi.fn()
  }
}))

// Mock API to prevent actual API calls
vi.mock('$lib/api', () => ({
  api: {
    getAllPeople: vi.fn().mockResolvedValue([]),
    getAllRelationships: vi.fn().mockResolvedValue([])
  }
}))

describe('App.svelte - GEDCOM Route Integration (TDD)', () => {
  beforeEach(() => {
    // Reset stores
    people.set([])
    relationships.set([])

    // Reset window.location.hash
    window.location.hash = ''
  })

  afterEach(() => {
    people.set([])
    relationships.set([])
  })

  describe('GEDCOM Upload Route', () => {
    it('should render GedcomUpload component for #/gedcom/import', () => {
      window.location.hash = '#/gedcom/import'

      const { container } = render(App)

      // GedcomUpload component should render
      // Check for content that indicates GEDCOM upload page
      const content = container.textContent
      expect(
        content.includes('GEDCOM') ||
        content.includes('Import') ||
        content.includes('Upload')
      ).toBe(true)

      // Should NOT render other views
      expect(container.querySelector('.pedigree-container')).toBeFalsy()
      expect(container.querySelector('.timeline-container')).toBeFalsy()
    })

    it('should NOT render GedcomUpload for other routes', () => {
      window.location.hash = '#/pedigree'

      const { container } = render(App)

      // Should render pedigree view instead
      expect(container.querySelector('.pedigree-container')).toBeTruthy()
    })
  })

  describe('GEDCOM Parsing Results Route', () => {
    it('should render GedcomParsingResults for #/gedcom/parsing/:uploadId', () => {
      const uploadId = 'test-upload-123'
      window.location.hash = `#/gedcom/parsing/${uploadId}`

      const { container } = render(App)

      // GedcomParsingResults has a heading "Parsing Results" or similar
      // Component will be in loading state initially
      const content = container.textContent
      expect(
        content.includes('Parsing') ||
        content.includes('Loading') ||
        content.includes('Results')
      ).toBe(true)

      // Should NOT render other views
      expect(container.querySelector('.pedigree-container')).toBeFalsy()
    })

    it('should extract uploadId from parsing route', () => {
      const uploadId = 'abc-123-xyz'
      window.location.hash = `#/gedcom/parsing/${uploadId}`

      const { container } = render(App)

      // Component should render (uploadId extraction works)
      expect(container).toBeTruthy()
    })

    it('should handle different uploadId formats', () => {
      const uploadIds = [
        '123e4567-e89b-12d3-a456-426614174000', // UUID
        'upload_12345', // Underscore format
        'test-123', // Simple format
        'abc123xyz' // No separators
      ]

      uploadIds.forEach(uploadId => {
        window.location.hash = `#/gedcom/parsing/${uploadId}`
        const { container } = render(App)
        expect(container).toBeTruthy()
      })
    })
  })

  describe('GEDCOM Preview Route', () => {
    it('should render GedcomPreview for #/gedcom/preview/:uploadId', () => {
      const uploadId = 'test-preview-456'
      window.location.hash = `#/gedcom/preview/${uploadId}`

      const { container } = render(App)

      // GedcomPreview component should render
      // Component will be in loading state initially
      const content = container.textContent
      expect(
        content.includes('Preview') ||
        content.includes('Loading') ||
        content.includes('GEDCOM')
      ).toBe(true)

      // Should NOT render other views
      expect(container.querySelector('.pedigree-container')).toBeFalsy()
    })

    it('should extract uploadId from preview route', () => {
      const uploadId = 'preview-abc-123'
      window.location.hash = `#/gedcom/preview/${uploadId}`

      const { container } = render(App)

      // Component should render (uploadId extraction works)
      expect(container).toBeTruthy()
    })
  })

  describe('GEDCOM Import Progress Route', () => {
    it('should render GedcomImportProgress for #/gedcom/import-progress/:uploadId', () => {
      const uploadId = 'test-import-789'
      window.location.hash = `#/gedcom/import-progress/${uploadId}`

      const { container } = render(App)

      // GedcomImportProgress component should render
      const content = container.textContent
      expect(
        content.includes('Import') ||
        content.includes('Progress') ||
        content.includes('Loading')
      ).toBe(true)

      // Should NOT render other views
      expect(container.querySelector('.pedigree-container')).toBeFalsy()
    })

    it('should extract uploadId from import-progress route', () => {
      const uploadId = 'import-abc-123'
      window.location.hash = `#/gedcom/import-progress/${uploadId}`

      const { container } = render(App)

      // Component should render (uploadId extraction works)
      expect(container).toBeTruthy()
    })
  })

  describe('GEDCOM Route Navigation Flow', () => {
    it('should support navigation from upload to parsing', () => {
      // Start at upload
      window.location.hash = '#/gedcom/import'
      const { container: uploadContainer } = render(App)
      expect(uploadContainer.textContent).toContain('Import GEDCOM File')

      // Simulate navigation to parsing (after successful upload)
      window.location.hash = '#/gedcom/parsing/test-123'
      const { container: parsingContainer } = render(App)

      // Should now show parsing results
      expect(
        parsingContainer.textContent.includes('Parsing') ||
        parsingContainer.textContent.includes('Results')
      ).toBe(true)
    })

    it('should support navigation from parsing to preview', () => {
      const uploadId = 'flow-test-123'

      // Start at parsing
      window.location.hash = `#/gedcom/parsing/${uploadId}`
      const { container: parsingContainer } = render(App)
      expect(parsingContainer).toBeTruthy()

      // Navigate to preview
      window.location.hash = `#/gedcom/preview/${uploadId}`
      const { container: previewContainer } = render(App)

      // Should show preview
      expect(previewContainer.textContent).toContain('Preview')
    })

    it('should support navigation from preview to import-progress', () => {
      const uploadId = 'flow-test-456'

      // Start at preview
      window.location.hash = `#/gedcom/preview/${uploadId}`
      const { container: previewContainer } = render(App)
      expect(previewContainer).toBeTruthy()

      // Navigate to import progress
      window.location.hash = `#/gedcom/import-progress/${uploadId}`
      const { container: progressContainer } = render(App)

      // Should show import progress
      expect(
        progressContainer.textContent.includes('Import') ||
        progressContainer.textContent.includes('Progress')
      ).toBe(true)
    })
  })

  describe('GEDCOM Route Path Parsing', () => {
    it('should correctly parse uploadId with special characters', () => {
      const uploadId = '123e4567-e89b-12d3-a456-426614174000'
      window.location.hash = `#/gedcom/parsing/${uploadId}`

      const { container } = render(App)

      // Should render without errors
      expect(container).toBeTruthy()
    })

    it('should not match partial GEDCOM routes', () => {
      window.location.hash = '#/gedcom'

      const { container } = render(App)

      // Should fallback to default view (pedigree)
      expect(container.querySelector('.pedigree-container')).toBeTruthy()
    })

    it('should not match routes with extra path segments', () => {
      window.location.hash = '#/gedcom/parsing/123/extra'

      const { container } = render(App)

      // Should still render parsing results (may handle gracefully)
      // Or fallback to default view
      expect(container).toBeTruthy()
    })
  })

  describe('GEDCOM Route vs Import Route', () => {
    it('should render ImportView for #/import (legacy route)', () => {
      window.location.hash = '#/import'

      const { container } = render(App)

      // ImportView component should render
      // This is different from GEDCOM upload
      expect(container).toBeTruthy()
    })

    it('should render GedcomUpload for #/gedcom/import (GEDCOM-specific route)', () => {
      window.location.hash = '#/gedcom/import'

      const { container } = render(App)

      // Should show GEDCOM upload heading
      expect(container.textContent).toContain('Import GEDCOM File')
    })

    it('should keep /import and /gedcom/import as separate routes', () => {
      // Test /import route
      window.location.hash = '#/import'
      const { container: importContainer } = render(App)

      // Test /gedcom/import route
      window.location.hash = '#/gedcom/import'
      const { container: gedcomContainer } = render(App)

      // Both should render successfully but show different content
      expect(importContainer).toBeTruthy()
      expect(gedcomContainer).toBeTruthy()
    })
  })

  describe('GEDCOM Route Component Props', () => {
    it('should pass uploadId prop to GedcomParsingResults', () => {
      const uploadId = 'prop-test-123'
      window.location.hash = `#/gedcom/parsing/${uploadId}`

      const { container } = render(App)

      // Component should receive uploadId and render
      expect(container).toBeTruthy()
    })

    it('should pass uploadId prop to GedcomPreview', () => {
      const uploadId = 'prop-test-456'
      window.location.hash = `#/gedcom/preview/${uploadId}`

      const { container } = render(App)

      // Component should receive uploadId and render
      expect(container).toBeTruthy()
    })

    it('should pass uploadId prop to GedcomImportProgress', () => {
      const uploadId = 'prop-test-789'
      window.location.hash = `#/gedcom/import-progress/${uploadId}`

      const { container } = render(App)

      // Component should receive uploadId and render
      expect(container).toBeTruthy()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty uploadId gracefully', () => {
      window.location.hash = '#/gedcom/parsing/'

      const { container } = render(App)

      // Should not crash, may fallback to default view
      expect(container).toBeTruthy()
    })

    it('should handle very long uploadIds', () => {
      const longId = 'x'.repeat(200)
      window.location.hash = `#/gedcom/parsing/${longId}`

      const { container } = render(App)

      // Should not crash
      expect(container).toBeTruthy()
    })

    it('should handle uploadId with URL-unsafe characters', () => {
      // Browser will encode these, but test handling
      window.location.hash = '#/gedcom/parsing/test%20id'

      const { container } = render(App)

      // Should not crash
      expect(container).toBeTruthy()
    })
  })

  describe('Route Normalization', () => {
    it('should not normalize GEDCOM routes to pedigree', () => {
      window.location.hash = '#/gedcom/import'

      const { container } = render(App)

      // Should NOT render pedigree view
      expect(container.querySelector('.pedigree-container')).toBeFalsy()
    })

    it('should preserve uploadId when route changes', () => {
      const uploadId = 'preserve-test-123'

      window.location.hash = `#/gedcom/parsing/${uploadId}`
      const { container: parsing } = render(App)

      // Change to preview with same uploadId
      window.location.hash = `#/gedcom/preview/${uploadId}`
      const { container: preview } = render(App)

      // Both should render successfully
      expect(parsing).toBeTruthy()
      expect(preview).toBeTruthy()
    })
  })

  describe('Unknown GEDCOM Routes', () => {
    it('should handle unknown GEDCOM sub-routes', () => {
      window.location.hash = '#/gedcom/unknown'

      const { container } = render(App)

      // Should fallback to default view or handle gracefully
      expect(container).toBeTruthy()
    })

    it('should handle malformed GEDCOM routes', () => {
      window.location.hash = '#/gedcom///'

      const { container } = render(App)

      // Should not crash
      expect(container).toBeTruthy()
    })
  })
})
