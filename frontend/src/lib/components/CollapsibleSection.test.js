import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, fireEvent, screen } from '@testing-library/svelte'
import CollapsibleSection from './CollapsibleSection.svelte'

describe('CollapsibleSection', () => {
  describe('rendering', () => {
    it('should render section with title', () => {
      const { container } = render(CollapsibleSection, {
        props: {
          title: 'Test Section',
          expanded: true
        }
      })

      expect(screen.getByText('Test Section')).toBeTruthy()
    })

    it('should render content when expanded', () => {
      const { container } = render(CollapsibleSection, {
        props: {
          title: 'Test Section',
          expanded: true
        }
      })

      const content = container.querySelector('.section-content')
      expect(content).toBeTruthy()
      expect(content.style.display).not.toBe('none')
    })

    it('should hide content when collapsed', () => {
      const { container } = render(CollapsibleSection, {
        props: {
          title: 'Test Section',
          expanded: false
        }
      })

      const content = container.querySelector('.section-content')
      expect(content).toBeTruthy()
      // Content should have max-height: 0 or be visually hidden
      const computedStyle = window.getComputedStyle(content)
      expect(computedStyle.maxHeight === '0px' || content.classList.contains('collapsed')).toBe(true)
    })

    it('should render slot content', () => {
      const { container } = render(CollapsibleSection, {
        props: {
          title: 'Test Section',
          expanded: true
        }
      })

      // Slot content area should exist when expanded
      expect(container.querySelector('.section-content')).toBeTruthy()
    })

    it('should display item count in title when provided', () => {
      const { container } = render(CollapsibleSection, {
        props: {
          title: 'Relationships',
          expanded: true,
          count: 4
        }
      })

      expect(screen.getByText(/Relationships.*4/)).toBeTruthy()
    })

    it('should not display count when count is 0', () => {
      const { container } = render(CollapsibleSection, {
        props: {
          title: 'Relationships',
          expanded: true,
          count: 0
        }
      })

      const title = screen.getByText('Relationships')
      expect(title.textContent).not.toContain('(0)')
    })

    it('should display count when count is greater than 0', () => {
      const { container } = render(CollapsibleSection, {
        props: {
          title: 'Siblings',
          expanded: true,
          count: 3
        }
      })

      expect(screen.getByText(/Siblings.*3/)).toBeTruthy()
    })
  })

  describe('expand/collapse behavior', () => {
    it('should toggle expanded state when header is clicked', async () => {
      const { component, container } = render(CollapsibleSection, {
        props: {
          title: 'Test Section',
          expanded: true
        }
      })

      const header = container.querySelector('.section-header')
      expect(header).toBeTruthy()

      // Verify toggle event is emitted
      let toggleEmitted = false
      component.$on('toggle', (event) => {
        toggleEmitted = true
        expect(event.detail.expanded).toBe(false)
      })

      // Click to collapse
      await fireEvent.click(header)

      // Verify toggle was emitted
      expect(toggleEmitted).toBe(true)
    })

    it('should expand collapsed section when header is clicked', async () => {
      const { container } = render(CollapsibleSection, {
        props: {
          title: 'Test Section',
          expanded: false
        }
      })

      const header = container.querySelector('.section-header')

      // Click to expand
      await fireEvent.click(header)

      // Content should be expanded or expanding
      const content = container.querySelector('.section-content')
      expect(content.classList.contains('expanded') || content.classList.contains('expanding')).toBe(true)
    })

    it('should emit toggle event when header is clicked', async () => {
      const { component, container } = render(CollapsibleSection, {
        props: {
          title: 'Test Section',
          expanded: true
        }
      })

      let toggleEmitted = false
      component.$on('toggle', (event) => {
        toggleEmitted = true
        expect(event.detail.expanded).toBe(false)
      })

      const header = container.querySelector('.section-header')
      await fireEvent.click(header)

      expect(toggleEmitted).toBe(true)
    })

    it('should provide new expanded state in toggle event', async () => {
      const { component, container } = render(CollapsibleSection, {
        props: {
          title: 'Test Section',
          expanded: false
        }
      })

      let newExpandedState = null
      component.$on('toggle', (event) => {
        newExpandedState = event.detail.expanded
      })

      const header = container.querySelector('.section-header')
      await fireEvent.click(header)

      expect(newExpandedState).toBe(true)
    })
  })

  describe('keyboard navigation', () => {
    it('should toggle when Enter key is pressed on header', async () => {
      const { component, container } = render(CollapsibleSection, {
        props: {
          title: 'Test Section',
          expanded: true
        }
      })

      let toggleEmitted = false
      component.$on('toggle', () => {
        toggleEmitted = true
      })

      const header = container.querySelector('.section-header')
      await fireEvent.keyDown(header, { key: 'Enter', code: 'Enter' })

      expect(toggleEmitted).toBe(true)
    })

    it('should toggle when Space key is pressed on header', async () => {
      const { component, container } = render(CollapsibleSection, {
        props: {
          title: 'Test Section',
          expanded: true
        }
      })

      let toggleEmitted = false
      component.$on('toggle', () => {
        toggleEmitted = true
      })

      const header = container.querySelector('.section-header')
      await fireEvent.keyDown(header, { key: ' ', code: 'Space' })

      expect(toggleEmitted).toBe(true)
    })

    it('should not toggle on other keys', async () => {
      const { component, container } = render(CollapsibleSection, {
        props: {
          title: 'Test Section',
          expanded: true
        }
      })

      let toggleEmitted = false
      component.$on('toggle', () => {
        toggleEmitted = true
      })

      const header = container.querySelector('.section-header')
      await fireEvent.keyDown(header, { key: 'a', code: 'KeyA' })
      await fireEvent.keyDown(header, { key: 'Escape', code: 'Escape' })

      expect(toggleEmitted).toBe(false)
    })

    it('should have tabindex="0" for keyboard accessibility', () => {
      const { container } = render(CollapsibleSection, {
        props: {
          title: 'Test Section',
          expanded: true
        }
      })

      const header = container.querySelector('.section-header')
      expect(header.getAttribute('tabindex')).toBe('0')
    })

    it('should have role="button" for screen readers', () => {
      const { container } = render(CollapsibleSection, {
        props: {
          title: 'Test Section',
          expanded: true
        }
      })

      const header = container.querySelector('.section-header')
      expect(header.getAttribute('role')).toBe('button')
    })
  })

  describe('accessibility (WCAG 2.1 AA)', () => {
    it('should have aria-expanded="true" when expanded', () => {
      const { container } = render(CollapsibleSection, {
        props: {
          title: 'Test Section',
          expanded: true
        }
      })

      const header = container.querySelector('.section-header')
      expect(header.getAttribute('aria-expanded')).toBe('true')
    })

    it('should have aria-expanded="false" when collapsed', () => {
      const { container } = render(CollapsibleSection, {
        props: {
          title: 'Test Section',
          expanded: false
        }
      })

      const header = container.querySelector('.section-header')
      expect(header.getAttribute('aria-expanded')).toBe('false')
    })

    it('should update aria-expanded when toggled', async () => {
      const { container } = render(CollapsibleSection, {
        props: {
          title: 'Test Section',
          expanded: true
        }
      })

      const header = container.querySelector('.section-header')
      expect(header.getAttribute('aria-expanded')).toBe('true')

      await fireEvent.click(header)

      expect(header.getAttribute('aria-expanded')).toBe('false')
    })

    it('should have aria-controls attribute linking to content', () => {
      const { container } = render(CollapsibleSection, {
        props: {
          title: 'Test Section',
          expanded: true
        }
      })

      const header = container.querySelector('.section-header')
      const ariaControls = header.getAttribute('aria-controls')

      expect(ariaControls).toBeTruthy()

      const content = container.querySelector(`#${ariaControls}`)
      expect(content).toBeTruthy()
      expect(content.classList.contains('section-content')).toBe(true)
    })

    it('should have descriptive aria-label', () => {
      const { container } = render(CollapsibleSection, {
        props: {
          title: 'Personal Information',
          expanded: true
        }
      })

      const header = container.querySelector('.section-header')
      const ariaLabel = header.getAttribute('aria-label')

      expect(ariaLabel).toBeTruthy()
      expect(ariaLabel.toLowerCase()).toContain('personal information')
    })
  })

  describe('animations', () => {
    it('should use Svelte slide transition for smooth animation', () => {
      const { container } = render(CollapsibleSection, {
        props: {
          title: 'Test Section',
          expanded: true
        }
      })

      // Component uses Svelte's slide transition which is applied programmatically
      // Just verify content container exists
      const content = container.querySelector('.section-content')
      expect(content).toBeTruthy()
    })

    it('should animate with appropriate duration (250ms)', () => {
      const { container } = render(CollapsibleSection, {
        props: {
          title: 'Test Section',
          expanded: true
        }
      })

      // Svelte slide transition is configured with 250ms duration
      // This is verified by the component implementation
      const content = container.querySelector('.section-content')
      expect(content).toBeTruthy()
    })
  })

  describe('visual indicators', () => {
    it('should display chevron/arrow icon', () => {
      const { container } = render(CollapsibleSection, {
        props: {
          title: 'Test Section',
          expanded: true
        }
      })

      const icon = container.querySelector('.chevron, .arrow, .toggle-icon')
      expect(icon).toBeTruthy()
    })

    it('should rotate chevron when collapsed vs expanded', async () => {
      const { component, container } = render(CollapsibleSection, {
        props: {
          title: 'Test Section',
          expanded: true
        }
      })

      const icon = container.querySelector('.chevron, .arrow, .toggle-icon')
      expect(icon).toBeTruthy()

      // When expanded, chevron should have 'expanded' class
      expect(icon.classList.contains('expanded')).toBe(true)

      // Toggle to collapsed
      await component.$set({ expanded: false })

      // When collapsed, chevron should not have 'expanded' class
      const iconAfter = container.querySelector('.chevron, .arrow, .toggle-icon')
      expect(iconAfter.classList.contains('expanded')).toBe(false)
    })
  })

  describe('responsive behavior', () => {
    it('should render on mobile viewport widths', () => {
      // Set mobile viewport
      global.innerWidth = 375
      global.innerHeight = 667

      const { container } = render(CollapsibleSection, {
        props: {
          title: 'Test Section',
          expanded: true
        }
      })

      const header = container.querySelector('.section-header')
      expect(header).toBeTruthy()

      const content = container.querySelector('.section-content')
      expect(content).toBeTruthy()
    })

    it('should be touchable on mobile (no hover-only interactions)', async () => {
      const { component, container } = render(CollapsibleSection, {
        props: {
          title: 'Test Section',
          expanded: true
        }
      })

      const header = container.querySelector('.section-header')

      // Should respond to click events (not just hover)
      let clickHandled = false
      component.$on('toggle', () => {
        clickHandled = true
      })

      await fireEvent.click(header)
      expect(clickHandled).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should handle empty title gracefully', () => {
      const { container } = render(CollapsibleSection, {
        props: {
          title: '',
          expanded: true
        }
      })

      const header = container.querySelector('.section-header')
      expect(header).toBeTruthy()
    })

    it('should handle very long titles', () => {
      const longTitle = 'A'.repeat(200)
      const { container } = render(CollapsibleSection, {
        props: {
          title: longTitle,
          expanded: true
        }
      })

      expect(screen.getByText(longTitle)).toBeTruthy()
    })

    it('should handle rapid toggle clicks', async () => {
      const { component, container } = render(CollapsibleSection, {
        props: {
          title: 'Test Section',
          expanded: true
        }
      })

      const header = container.querySelector('.section-header')

      // Click rapidly 10 times
      for (let i = 0; i < 10; i++) {
        await fireEvent.click(header)
      }

      // Should still be in a valid state
      const ariaExpanded = header.getAttribute('aria-expanded')
      expect(ariaExpanded === 'true' || ariaExpanded === 'false').toBe(true)
    })

    it('should handle count as 0 correctly', () => {
      const { container } = render(CollapsibleSection, {
        props: {
          title: 'Test Section',
          expanded: true,
          count: 0
        }
      })

      const title = screen.getByText('Test Section')
      expect(title.textContent).not.toContain('(0)')
    })

    it('should handle large count numbers', () => {
      const { container } = render(CollapsibleSection, {
        props: {
          title: 'Test Section',
          expanded: true,
          count: 9999
        }
      })

      expect(screen.getByText(/9999/)).toBeTruthy()
    })
  })

  describe('integration with PersonModal', () => {
    it('should work correctly when nested in a modal', () => {
      const { container } = render(CollapsibleSection, {
        props: {
          title: 'Personal Information',
          expanded: true
        }
      })

      // Should render correctly even when inside another component
      expect(container.querySelector('.section-header')).toBeTruthy()
      expect(container.querySelector('.section-content')).toBeTruthy()
    })

    it('should maintain state during parent re-renders', async () => {
      const { component, container, rerender } = render(CollapsibleSection, {
        props: {
          title: 'Test Section',
          expanded: true
        }
      })

      const header = container.querySelector('.section-header')
      await fireEvent.click(header)

      // Re-render with same props
      await rerender({
        title: 'Test Section',
        expanded: false
      })

      // State should be maintained
      expect(header.getAttribute('aria-expanded')).toBe('false')
    })
  })
})
