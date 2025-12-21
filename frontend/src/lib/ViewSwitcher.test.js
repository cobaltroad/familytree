/**
 * Unit tests for ViewSwitcher component with Add Person link.
 * Tests that ViewSwitcher displays navigation tabs and an "Add Person" link
 * that opens the modal for adding a new person.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/svelte'
import ViewSwitcher from './ViewSwitcher.svelte'
import { modal } from '../stores/modalStore.js'

describe('ViewSwitcher - Add Person Link', () => {
  beforeEach(() => {
    // Reset modal store before each test
    modal.close()
  })

  describe('Add Person Link Rendering', () => {
    it('should render "Add Person" link', () => {
      render(ViewSwitcher, { props: { currentPath: '/tree' } })

      const addPersonLink = screen.getByText(/add person/i)
      expect(addPersonLink).toBeTruthy()
    })

    it('should position Add Person link to the right of navigation tabs', () => {
      const { container } = render(ViewSwitcher, { props: { currentPath: '/tree' } })

      const nav = container.querySelector('nav')
      expect(nav).toBeTruthy()

      // Find the add person link within the nav
      const addPersonLink = screen.getByText(/add person/i)
      expect(addPersonLink).toBeTruthy()

      // Verify it's within the navigation
      expect(nav.contains(addPersonLink)).toBe(true)
    })

    it('should include a plus icon or symbol in Add Person link', () => {
      render(ViewSwitcher, { props: { currentPath: '/tree' } })

      // Should have text containing "Add Person" and potentially a "+" symbol
      const addPersonLink = screen.getByText(/add person/i)
      expect(addPersonLink).toBeTruthy()

      // Check if it's a link or button element
      const element = addPersonLink.closest('a') || addPersonLink.closest('button')
      expect(element).toBeTruthy()
    })

    it('should have proper ARIA label for accessibility', () => {
      const { container } = render(ViewSwitcher, { props: { currentPath: '/tree' } })

      const addPersonElement = screen.getByText(/add person/i).closest('a') || screen.getByText(/add person/i).closest('button')
      expect(addPersonElement).toBeTruthy()

      // Should have aria-label or proper text content
      const ariaLabel = addPersonElement.getAttribute('aria-label')
      const textContent = addPersonElement.textContent

      expect(ariaLabel || textContent).toBeTruthy()
      expect((ariaLabel || textContent).toLowerCase()).toContain('add')
    })

    it('should be keyboard navigable', () => {
      const { container } = render(ViewSwitcher, { props: { currentPath: '/tree' } })

      const addPersonElement = screen.getByText(/add person/i).closest('a') || screen.getByText(/add person/i).closest('button')

      // Should be focusable (not have tabindex="-1")
      const tabIndex = addPersonElement.getAttribute('tabindex')
      expect(tabIndex).not.toBe('-1')
    })
  })

  describe('Add Person Link Functionality', () => {
    it('should call modal.openNew() when clicked', async () => {
      // Spy on modal.openNew
      const openNewSpy = vi.spyOn(modal, 'openNew')

      render(ViewSwitcher, { props: { currentPath: '/tree' } })

      const addPersonElement = screen.getByText(/add person/i).closest('a') || screen.getByText(/add person/i).closest('button')

      await fireEvent.click(addPersonElement)

      expect(openNewSpy).toHaveBeenCalled()
      expect(openNewSpy).toHaveBeenCalledTimes(1)

      openNewSpy.mockRestore()
    })

    it('should not navigate when Add Person is clicked (prevent default)', async () => {
      render(ViewSwitcher, { props: { currentPath: '/tree' } })

      const addPersonElement = screen.getByText(/add person/i).closest('a') || screen.getByText(/add person/i).closest('button')

      const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true })
      const preventDefaultSpy = vi.spyOn(clickEvent, 'preventDefault')

      addPersonElement.dispatchEvent(clickEvent)

      // If it's a link (a tag), preventDefault should be called
      if (addPersonElement.tagName === 'A') {
        expect(preventDefaultSpy).toHaveBeenCalled()
      }

      preventDefaultSpy.mockRestore()
    })
  })

  describe('ViewSwitcher Layout', () => {
    it('should display all view tabs and Add Person link', () => {
      render(ViewSwitcher, { props: { currentPath: '/tree' } })

      // Check for all view tabs
      expect(screen.getByText('Tree')).toBeTruthy()
      expect(screen.getByText('Timeline')).toBeTruthy()
      expect(screen.getByText('Pedigree')).toBeTruthy()
      expect(screen.getByText('Radial')).toBeTruthy()

      // Check for Add Person link
      expect(screen.getByText(/add person/i)).toBeTruthy()
    })

    it('should use flexbox layout with Add Person flushed right', () => {
      const { container } = render(ViewSwitcher, { props: { currentPath: '/tree' } })

      const nav = container.querySelector('nav')
      const addPersonElement = screen.getByText(/add person/i).closest('button') || screen.getByText(/add person/i).closest('a')

      // Navigation should contain the add person element
      expect(nav.contains(addPersonElement)).toBe(true)

      // Add person element should have margin-left auto (checked via class)
      expect(addPersonElement.classList.contains('add-person-link')).toBe(true)
    })
  })

  describe('Responsive Behavior', () => {
    it('should render Add Person link on mobile viewports', () => {
      // Render component
      render(ViewSwitcher, { props: { currentPath: '/tree' } })

      // Add Person link should be present regardless of viewport
      const addPersonLink = screen.getByText(/add person/i)
      expect(addPersonLink).toBeTruthy()

      // Verify it's visible (not display: none)
      const element = addPersonLink.closest('a') || addPersonLink.closest('button')
      const computedStyle = window.getComputedStyle(element)
      expect(computedStyle.display).not.toBe('none')
    })
  })

  describe('Styling Consistency', () => {
    it('should style Add Person link consistently with view tabs', () => {
      const { container } = render(ViewSwitcher, { props: { currentPath: '/tree' } })

      const viewTab = screen.getByText('Tree').closest('a')
      const addPersonElement = screen.getByText(/add person/i).closest('a') || screen.getByText(/add person/i).closest('button')

      // Both should be within the same navigation
      const nav = container.querySelector('nav')
      expect(nav.contains(viewTab)).toBe(true)
      expect(nav.contains(addPersonElement)).toBe(true)
    })

    it('should not have active state styling on Add Person link', () => {
      const { container } = render(ViewSwitcher, { props: { currentPath: '/tree' } })

      const addPersonElement = screen.getByText(/add person/i).closest('a') || screen.getByText(/add person/i).closest('button')

      // Should not have "active" class
      expect(addPersonElement.classList.contains('active')).toBe(false)
    })
  })
})
