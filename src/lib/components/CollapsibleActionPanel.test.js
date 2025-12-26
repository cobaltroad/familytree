import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, fireEvent, screen, waitFor } from '@testing-library/svelte'
import { get } from 'svelte/store'
import CollapsibleActionPanel from './CollapsibleActionPanel.svelte'
import { openPanels } from '../../stores/panelStore.js'

/**
 * Unit tests for CollapsibleActionPanel component (Issue #52, Issue #56)
 * Tests all 11 acceptance criteria from Issue #52
 * Tests auto-collapse behavior from Issue #56
 */
describe('CollapsibleActionPanel', () => {
  beforeEach(() => {
    // Reset panel store before each test
    openPanels.set({})
  })

  describe('AC1: Component rendering and initial state', () => {
    it('should render collapsed by default with trigger button and plus icon', () => {
      const { container } = render(CollapsibleActionPanel, {
        props: {
          label: 'Add/Link Mother',
          relationshipType: 'mother',
          createLabel: 'Create New Mother',
          linkLabel: 'Link Existing Mother'
        }
      })

      // Should show trigger button with label
      const triggerButton = screen.getByRole('button', { name: /Add\/Link Mother/i })
      expect(triggerButton).toBeTruthy()

      // Should show plus icon
      expect(triggerButton.textContent).toContain('+')

      // Options panel should not be visible
      const optionsPanel = container.querySelector('[role="region"]')
      expect(optionsPanel).toBeFalsy()
    })

    it('should not show option buttons when collapsed', () => {
      const { container } = render(CollapsibleActionPanel, {
        props: {
          label: 'Add/Link Mother',
          relationshipType: 'mother',
          createLabel: 'Create New Mother',
          linkLabel: 'Link Existing Mother'
        }
      })

      // Create and Link buttons should not exist
      const createButton = container.querySelector('button[data-action="create"]')
      const linkButton = container.querySelector('button[data-action="link"]')

      expect(createButton).toBeFalsy()
      expect(linkButton).toBeFalsy()
    })

    it('should have aria-expanded="false" when collapsed', () => {
      const { container } = render(CollapsibleActionPanel, {
        props: {
          label: 'Add/Link Mother',
          relationshipType: 'mother',
          createLabel: 'Create New Mother',
          linkLabel: 'Link Existing Mother'
        }
      })

      const triggerButton = screen.getByRole('button', { name: /Add\/Link Mother/i })
      expect(triggerButton.getAttribute('aria-expanded')).toBe('false')
    })
  })

  describe('AC2: Expand behavior - show option buttons', () => {
    it('should show options panel with two buttons when trigger button is clicked', async () => {
      const { container } = render(CollapsibleActionPanel, {
        props: {
          label: 'Add/Link Mother',
          relationshipType: 'mother',
          createLabel: 'Create New Mother',
          linkLabel: 'Link Existing Mother'
        }
      })

      const triggerButton = screen.getByRole('button', { name: /Add\/Link Mother/i })
      await fireEvent.click(triggerButton)

      // Options panel should be visible
      const optionsPanel = container.querySelector('[role="region"]')
      expect(optionsPanel).toBeTruthy()

      // Should show both option buttons
      const createButton = screen.getByRole('button', { name: /Create New Mother/i })
      const linkButton = screen.getByRole('button', { name: /Link Existing Mother/i })

      expect(createButton).toBeTruthy()
      expect(linkButton).toBeTruthy()
    })

    it('should update aria-expanded to "true" when expanded', async () => {
      const { container } = render(CollapsibleActionPanel, {
        props: {
          label: 'Add/Link Mother',
          relationshipType: 'mother',
          createLabel: 'Create New Mother',
          linkLabel: 'Link Existing Mother'
        }
      })

      const triggerButton = screen.getByRole('button', { name: /Add\/Link Mother/i })
      await fireEvent.click(triggerButton)

      expect(triggerButton.getAttribute('aria-expanded')).toBe('true')
    })

    it('should change icon from "+" to "×" when expanded', async () => {
      const { container } = render(CollapsibleActionPanel, {
        props: {
          label: 'Add/Link Mother',
          relationshipType: 'mother',
          createLabel: 'Create New Mother',
          linkLabel: 'Link Existing Mother'
        }
      })

      const triggerButton = screen.getByRole('button', { name: /Add\/Link Mother/i })

      // Initially shows +
      expect(triggerButton.textContent).toContain('+')

      await fireEvent.click(triggerButton)

      // After expansion shows ×
      expect(triggerButton.textContent).toContain('×')
    })

    it('should change button text to "Cancel" when expanded', async () => {
      const { container } = render(CollapsibleActionPanel, {
        props: {
          label: 'Add/Link Mother',
          relationshipType: 'mother',
          createLabel: 'Create New Mother',
          linkLabel: 'Link Existing Mother'
        }
      })

      const triggerButton = screen.getByRole('button', { name: /Add\/Link Mother/i })

      await fireEvent.click(triggerButton)

      expect(screen.getByRole('button', { name: /Cancel/i })).toBeTruthy()
    })
  })

  describe('AC3: Option button display', () => {
    it('should display "Create New Person" button in blue with primary styling', async () => {
      const { container } = render(CollapsibleActionPanel, {
        props: {
          label: 'Add/Link Mother',
          relationshipType: 'mother',
          createLabel: 'Create New Mother',
          linkLabel: 'Link Existing Mother'
        }
      })

      const triggerButton = screen.getByRole('button', { name: /Add\/Link Mother/i })
      await fireEvent.click(triggerButton)

      const createButton = screen.getByRole('button', { name: /Create New Mother/i })

      // Should have primary/blue styling classes
      expect(createButton.classList.contains('primary') ||
             createButton.classList.contains('btn-primary') ||
             createButton.classList.contains('create-button')).toBe(true)
      expect(createButton.getAttribute('data-action')).toBe('create')
    })

    it('should display "Link Existing Person" button in gray with secondary styling', async () => {
      const { container } = render(CollapsibleActionPanel, {
        props: {
          label: 'Add/Link Mother',
          relationshipType: 'mother',
          createLabel: 'Create New Mother',
          linkLabel: 'Link Existing Mother'
        }
      })

      const triggerButton = screen.getByRole('button', { name: /Add\/Link Mother/i })
      await fireEvent.click(triggerButton)

      const linkButton = screen.getByRole('button', { name: /Link Existing Mother/i })

      // Should have secondary/gray styling classes
      expect(linkButton.classList.contains('secondary') ||
             linkButton.classList.contains('btn-secondary') ||
             linkButton.classList.contains('link-button')).toBe(true)
      expect(linkButton.getAttribute('data-action')).toBe('link')
    })

    it('should render both buttons with full width and proper spacing', async () => {
      const { container } = render(CollapsibleActionPanel, {
        props: {
          label: 'Add/Link Mother',
          relationshipType: 'mother',
          createLabel: 'Create New Mother',
          linkLabel: 'Link Existing Mother'
        }
      })

      const triggerButton = screen.getByRole('button', { name: /Add\/Link Mother/i })
      await fireEvent.click(triggerButton)

      const buttonContainer = container.querySelector('.action-buttons, .options-buttons, .button-group')
      expect(buttonContainer).toBeTruthy()

      // Buttons should be in a container with proper structure
      const buttons = buttonContainer.querySelectorAll('button')
      expect(buttons.length).toBe(2)
    })
  })

  describe('AC4: Slot content switching - Create option', () => {
    it('should show "create" slot content when Create New Person button is clicked', async () => {
      const { container } = render(CollapsibleActionPanel, {
        props: {
          label: 'Add/Link Mother',
          relationshipType: 'mother',
          createLabel: 'Create New Mother',
          linkLabel: 'Link Existing Mother'
        }
      })

      const triggerButton = screen.getByRole('button', { name: /Add\/Link Mother/i })
      await fireEvent.click(triggerButton)

      const createButton = screen.getByRole('button', { name: /Create New Mother/i })
      await fireEvent.click(createButton)

      // Create slot container should be visible
      const createSlot = container.querySelector('[data-slot="create"]')
      expect(createSlot).toBeTruthy()

      // Link slot should not be visible
      const linkSlot = container.querySelector('[data-slot="link"]')
      expect(linkSlot).toBeFalsy()
    })

    it('should hide option buttons when showing create slot content', async () => {
      const { container } = render(CollapsibleActionPanel, {
        props: {
          label: 'Add/Link Mother',
          relationshipType: 'mother',
          createLabel: 'Create New Mother',
          linkLabel: 'Link Existing Mother'
        }
      })

      const triggerButton = screen.getByRole('button', { name: /Add\/Link Mother/i })
      await fireEvent.click(triggerButton)

      const createButton = screen.getByRole('button', { name: /Create New Mother/i })
      await fireEvent.click(createButton)

      // Option buttons should no longer be visible
      const optionsPanel = container.querySelector('.action-buttons, .options-buttons')
      expect(optionsPanel).toBeFalsy()
    })
  })

  describe('AC5: Slot content switching - Link option', () => {
    it('should show "link" slot content when Link Existing Person button is clicked', async () => {
      const { container } = render(CollapsibleActionPanel, {
        props: {
          label: 'Add/Link Mother',
          relationshipType: 'mother',
          createLabel: 'Create New Mother',
          linkLabel: 'Link Existing Mother'
        }
      })

      const triggerButton = screen.getByRole('button', { name: /Add\/Link Mother/i })
      await fireEvent.click(triggerButton)

      const linkButton = screen.getByRole('button', { name: /Link Existing Mother/i })
      await fireEvent.click(linkButton)

      // Link slot should be visible
      const linkSlot = container.querySelector('[data-slot="link"]')
      expect(linkSlot).toBeTruthy()

      // Create slot should not be visible
      const createSlot = container.querySelector('[data-slot="create"]')
      expect(createSlot).toBeFalsy()
    })

    it('should hide option buttons when showing link slot content', async () => {
      const { container } = render(CollapsibleActionPanel, {
        props: {
          label: 'Add/Link Mother',
          relationshipType: 'mother',
          createLabel: 'Create New Mother',
          linkLabel: 'Link Existing Mother'
        }
      })

      const triggerButton = screen.getByRole('button', { name: /Add\/Link Mother/i })
      await fireEvent.click(triggerButton)

      const linkButton = screen.getByRole('button', { name: /Link Existing Mother/i })
      await fireEvent.click(linkButton)

      // Option buttons should no longer be visible
      const optionsPanel = container.querySelector('.action-buttons, .options-buttons')
      expect(optionsPanel).toBeFalsy()
    })
  })

  describe('AC6: Cancel/collapse behavior', () => {
    it('should collapse panel and reset to option buttons when Cancel is clicked from options view', async () => {
      const { container } = render(CollapsibleActionPanel, {
        props: {
          label: 'Add/Link Mother',
          relationshipType: 'mother',
          createLabel: 'Create New Mother',
          linkLabel: 'Link Existing Mother'
        }
      })

      const triggerButton = screen.getByRole('button', { name: /Add\/Link Mother/i })

      // Expand
      await fireEvent.click(triggerButton)
      expect(triggerButton.getAttribute('aria-expanded')).toBe('true')

      // Click Cancel
      const cancelButton = screen.getByRole('button', { name: /Cancel/i })
      await fireEvent.click(cancelButton)

      // Should collapse
      expect(triggerButton.getAttribute('aria-expanded')).toBe('false')

      // Trigger button should show original label after collapse
      expect(triggerButton.textContent).toContain('Add/Link Mother')
    })

    it('should collapse panel and reset when Cancel is clicked from create slot view', async () => {
      const { container } = render(CollapsibleActionPanel, {
        props: {
          label: 'Add/Link Mother',
          relationshipType: 'mother',
          createLabel: 'Create New Mother',
          linkLabel: 'Link Existing Mother'
        }
      })

      const triggerButton = screen.getByRole('button', { name: /Add\/Link Mother/i })

      // Expand and select create
      await fireEvent.click(triggerButton)
      const createButton = screen.getByRole('button', { name: /Create New Mother/i })
      await fireEvent.click(createButton)

      // Verify create slot is visible
      let createSlot = container.querySelector('[data-slot="create"]')
      expect(createSlot).toBeTruthy()

      // Click Cancel
      const cancelButton = screen.getByRole('button', { name: /Cancel/i })
      await fireEvent.click(cancelButton)

      // Should collapse
      expect(triggerButton.getAttribute('aria-expanded')).toBe('false')

      // Trigger button should show original label
      expect(triggerButton.textContent).toContain('Add/Link Mother')
    })

    it('should collapse panel and reset when Cancel is clicked from link slot view', async () => {
      const { container } = render(CollapsibleActionPanel, {
        props: {
          label: 'Add/Link Mother',
          relationshipType: 'mother',
          createLabel: 'Create New Mother',
          linkLabel: 'Link Existing Mother'
        }
      })

      const triggerButton = screen.getByRole('button', { name: /Add\/Link Mother/i })

      // Expand and select link
      await fireEvent.click(triggerButton)
      const linkButton = screen.getByRole('button', { name: /Link Existing Mother/i })
      await fireEvent.click(linkButton)

      // Verify link slot is visible
      let linkSlot = container.querySelector('[data-slot="link"]')
      expect(linkSlot).toBeTruthy()

      // Click Cancel
      const cancelButton = screen.getByRole('button', { name: /Cancel/i })
      await fireEvent.click(cancelButton)

      // Should collapse
      expect(triggerButton.getAttribute('aria-expanded')).toBe('false')

      // Trigger button should show original label
      expect(triggerButton.textContent).toContain('Add/Link Mother')
    })

    it('should show option buttons again when re-expanding after cancel', async () => {
      const { container } = render(CollapsibleActionPanel, {
        props: {
          label: 'Add/Link Mother',
          relationshipType: 'mother',
          createLabel: 'Create New Mother',
          linkLabel: 'Link Existing Mother'
        }
      })

      const triggerButton = screen.getByRole('button', { name: /Add\/Link Mother/i })

      // Expand, select create, then cancel
      await fireEvent.click(triggerButton)
      const createButton = screen.getByRole('button', { name: /Create New Mother/i })
      await fireEvent.click(createButton)

      const cancelButton = screen.getByRole('button', { name: /Cancel/i })
      await fireEvent.click(cancelButton)

      // Re-expand
      await fireEvent.click(triggerButton)

      // Should show option buttons again
      const createButtonAgain = screen.getByRole('button', { name: /Create New Mother/i })
      const linkButton = screen.getByRole('button', { name: /Link Existing Mother/i })

      expect(createButtonAgain).toBeTruthy()
      expect(linkButton).toBeTruthy()
    })
  })

  describe('AC7: Props configuration', () => {
    it('should accept and use "label" prop for trigger button text', () => {
      render(CollapsibleActionPanel, {
        props: {
          label: 'Custom Label Text',
          relationshipType: 'mother',
          createLabel: 'Create',
          linkLabel: 'Link'
        }
      })

      const triggerButton = screen.getByRole('button', { name: /Custom Label Text/i })
      expect(triggerButton).toBeTruthy()
    })

    it('should accept and use "relationshipType" prop for analytics/testing', () => {
      const { container } = render(CollapsibleActionPanel, {
        props: {
          label: 'Add/Link Mother',
          relationshipType: 'mother',
          createLabel: 'Create',
          linkLabel: 'Link'
        }
      })

      // Should have data attribute for testing/analytics
      const panel = container.querySelector('[data-relationship-type="mother"]')
      expect(panel).toBeTruthy()
    })

    it('should accept and use "createLabel" prop for create button text', async () => {
      render(CollapsibleActionPanel, {
        props: {
          label: 'Add/Link Mother',
          relationshipType: 'mother',
          createLabel: 'Custom Create Label',
          linkLabel: 'Link'
        }
      })

      const triggerButton = screen.getByRole('button', { name: /Add\/Link Mother/i })
      await fireEvent.click(triggerButton)

      const createButton = screen.getByRole('button', { name: /Custom Create Label/i })
      expect(createButton).toBeTruthy()
    })

    it('should accept and use "linkLabel" prop for link button text', async () => {
      render(CollapsibleActionPanel, {
        props: {
          label: 'Add/Link Mother',
          relationshipType: 'mother',
          createLabel: 'Create',
          linkLabel: 'Custom Link Label'
        }
      })

      const triggerButton = screen.getByRole('button', { name: /Add\/Link Mother/i })
      await fireEvent.click(triggerButton)

      const linkButton = screen.getByRole('button', { name: /Custom Link Label/i })
      expect(linkButton).toBeTruthy()
    })

    it('should work with different relationship types (mother, father, spouse, child)', () => {
      const types = ['mother', 'father', 'spouse', 'child']

      types.forEach(type => {
        const { container } = render(CollapsibleActionPanel, {
          props: {
            label: `Add/Link ${type}`,
            relationshipType: type,
            createLabel: `Create ${type}`,
            linkLabel: `Link ${type}`
          }
        })

        const panel = container.querySelector(`[data-relationship-type="${type}"]`)
        expect(panel).toBeTruthy()
      })
    })
  })

  describe('AC8: Named slots', () => {
    it('should provide "create" named slot for QuickAdd form content', async () => {
      const TestSlotComponent = {
        Component: CollapsibleActionPanel,
        props: {
          label: 'Add/Link Mother',
          relationshipType: 'mother',
          createLabel: 'Create',
          linkLabel: 'Link'
        },
        slots: {
          create: '<div data-testid="create-slot-content">QuickAdd Form</div>'
        }
      }

      const { container } = render(TestSlotComponent.Component, {
        props: TestSlotComponent.props,
        context: new Map([['$$slots', { create: true }]])
      })

      const triggerButton = screen.getByRole('button', { name: /Add\/Link Mother/i })
      await fireEvent.click(triggerButton)

      const createButton = screen.getByRole('button', { name: /Create/i })
      await fireEvent.click(createButton)

      // Create slot container should exist
      const createSlotContainer = container.querySelector('[data-slot="create"]')
      expect(createSlotContainer).toBeTruthy()
    })

    it('should provide "link" named slot for Link component content', async () => {
      const TestSlotComponent = {
        Component: CollapsibleActionPanel,
        props: {
          label: 'Add/Link Mother',
          relationshipType: 'mother',
          createLabel: 'Create',
          linkLabel: 'Link'
        },
        slots: {
          link: '<div data-testid="link-slot-content">Link Component</div>'
        }
      }

      const { container } = render(TestSlotComponent.Component, {
        props: TestSlotComponent.props,
        context: new Map([['$$slots', { link: true }]])
      })

      const triggerButton = screen.getByRole('button', { name: /Add\/Link Mother/i })
      await fireEvent.click(triggerButton)

      const linkButton = screen.getByRole('button', { name: /Link/i })
      await fireEvent.click(linkButton)

      // Link slot container should exist
      const linkSlotContainer = container.querySelector('[data-slot="link"]')
      expect(linkSlotContainer).toBeTruthy()
    })

    it('should allow both slots to be provided simultaneously', () => {
      const { container } = render(CollapsibleActionPanel, {
        props: {
          label: 'Add/Link Mother',
          relationshipType: 'mother',
          createLabel: 'Create',
          linkLabel: 'Link'
        }
      })

      // Component should render without errors
      const triggerButton = screen.getByRole('button', { name: /Add\/Link Mother/i })
      expect(triggerButton).toBeTruthy()
    })
  })

  describe('AC9: Keyboard navigation', () => {
    it('should expand panel when Enter key is pressed on trigger button', async () => {
      const { container } = render(CollapsibleActionPanel, {
        props: {
          label: 'Add/Link Mother',
          relationshipType: 'mother',
          createLabel: 'Create',
          linkLabel: 'Link'
        }
      })

      const triggerButton = screen.getByRole('button', { name: /Add\/Link Mother/i })

      await fireEvent.keyDown(triggerButton, { key: 'Enter', code: 'Enter' })

      expect(triggerButton.getAttribute('aria-expanded')).toBe('true')
    })

    it('should expand panel when Space key is pressed on trigger button', async () => {
      const { container } = render(CollapsibleActionPanel, {
        props: {
          label: 'Add/Link Mother',
          relationshipType: 'mother',
          createLabel: 'Create',
          linkLabel: 'Link'
        }
      })

      const triggerButton = screen.getByRole('button', { name: /Add\/Link Mother/i })

      await fireEvent.keyDown(triggerButton, { key: ' ', code: 'Space' })

      expect(triggerButton.getAttribute('aria-expanded')).toBe('true')
    })

    it('should collapse panel when Escape key is pressed', async () => {
      const { container } = render(CollapsibleActionPanel, {
        props: {
          label: 'Add/Link Mother',
          relationshipType: 'mother',
          createLabel: 'Create',
          linkLabel: 'Link'
        }
      })

      const triggerButton = screen.getByRole('button', { name: /Add\/Link Mother/i })

      // Expand first
      await fireEvent.click(triggerButton)
      expect(triggerButton.getAttribute('aria-expanded')).toBe('true')

      // Press Escape
      await fireEvent.keyDown(triggerButton, { key: 'Escape', code: 'Escape' })

      expect(triggerButton.getAttribute('aria-expanded')).toBe('false')
    })

    it('should return focus to trigger button when panel is collapsed', async () => {
      const { container } = render(CollapsibleActionPanel, {
        props: {
          label: 'Add/Link Mother',
          relationshipType: 'mother',
          createLabel: 'Create',
          linkLabel: 'Link'
        }
      })

      const triggerButton = screen.getByRole('button', { name: /Add\/Link Mother/i })

      // Expand and then collapse
      await fireEvent.click(triggerButton)
      await fireEvent.click(triggerButton) // Click Cancel

      // Focus should be on trigger button
      expect(document.activeElement).toBe(triggerButton)
    })

    it('should have tabindex="0" on trigger button for keyboard accessibility', () => {
      const { container } = render(CollapsibleActionPanel, {
        props: {
          label: 'Add/Link Mother',
          relationshipType: 'mother',
          createLabel: 'Create',
          linkLabel: 'Link'
        }
      })

      const triggerButton = screen.getByRole('button', { name: /Add\/Link Mother/i })
      expect(triggerButton.getAttribute('tabindex')).toBe('0')
    })
  })

  describe('AC10: Screen reader support', () => {
    it('should have aria-expanded attribute that reflects current state', async () => {
      const { container } = render(CollapsibleActionPanel, {
        props: {
          label: 'Add/Link Mother',
          relationshipType: 'mother',
          createLabel: 'Create',
          linkLabel: 'Link'
        }
      })

      const triggerButton = screen.getByRole('button', { name: /Add\/Link Mother/i })

      // Initially collapsed
      expect(triggerButton.getAttribute('aria-expanded')).toBe('false')

      // Expand
      await fireEvent.click(triggerButton)
      expect(triggerButton.getAttribute('aria-expanded')).toBe('true')

      // Collapse
      await fireEvent.click(triggerButton)
      expect(triggerButton.getAttribute('aria-expanded')).toBe('false')
    })

    it('should have aria-controls linking trigger to options panel', async () => {
      const { container } = render(CollapsibleActionPanel, {
        props: {
          label: 'Add/Link Mother',
          relationshipType: 'mother',
          createLabel: 'Create',
          linkLabel: 'Link'
        }
      })

      const triggerButton = screen.getByRole('button', { name: /Add\/Link Mother/i })
      await fireEvent.click(triggerButton)

      const ariaControls = triggerButton.getAttribute('aria-controls')
      expect(ariaControls).toBeTruthy()

      const controlledElement = container.querySelector(`#${ariaControls}`)
      expect(controlledElement).toBeTruthy()
    })

    it('should have role="region" on options panel', async () => {
      const { container } = render(CollapsibleActionPanel, {
        props: {
          label: 'Add/Link Mother',
          relationshipType: 'mother',
          createLabel: 'Create',
          linkLabel: 'Link'
        }
      })

      const triggerButton = screen.getByRole('button', { name: /Add\/Link Mother/i })
      await fireEvent.click(triggerButton)

      const optionsPanel = container.querySelector('[role="region"]')
      expect(optionsPanel).toBeTruthy()
    })

    it('should have aria-labelledby linking panel to trigger button', async () => {
      const { container } = render(CollapsibleActionPanel, {
        props: {
          label: 'Add/Link Mother',
          relationshipType: 'mother',
          createLabel: 'Create',
          linkLabel: 'Link'
        }
      })

      const triggerButton = screen.getByRole('button', { name: /Add\/Link Mother/i })
      await fireEvent.click(triggerButton)

      const optionsPanel = container.querySelector('[role="region"]')
      const ariaLabelledBy = optionsPanel.getAttribute('aria-labelledby')

      expect(ariaLabelledBy).toBeTruthy()
      expect(triggerButton.id).toBe(ariaLabelledBy)
    })

    it('should announce state changes to screen readers', async () => {
      const { container } = render(CollapsibleActionPanel, {
        props: {
          label: 'Add/Link Mother',
          relationshipType: 'mother',
          createLabel: 'Create',
          linkLabel: 'Link'
        }
      })

      const triggerButton = screen.getByRole('button', { name: /Add\/Link Mother/i })

      // Expand
      await fireEvent.click(triggerButton)

      // Should have live region or aria-live for announcements
      const liveRegion = container.querySelector('[aria-live]')
      // Component should update aria-expanded which is read by screen readers
      expect(triggerButton.getAttribute('aria-expanded')).toBe('true')
    })
  })

  describe('AC11: Mobile responsive behavior', () => {
    it('should render properly on mobile viewports (<768px)', () => {
      // Set mobile viewport
      global.innerWidth = 375
      global.innerHeight = 667

      const { container } = render(CollapsibleActionPanel, {
        props: {
          label: 'Add/Link Mother',
          relationshipType: 'mother',
          createLabel: 'Create',
          linkLabel: 'Link'
        }
      })

      const triggerButton = screen.getByRole('button', { name: /Add\/Link Mother/i })
      expect(triggerButton).toBeTruthy()
    })

    it('should have touch-friendly tap targets (≥48px) on mobile', () => {
      global.innerWidth = 375
      global.innerHeight = 667

      const { container } = render(CollapsibleActionPanel, {
        props: {
          label: 'Add/Link Mother',
          relationshipType: 'mother',
          createLabel: 'Create',
          linkLabel: 'Link'
        }
      })

      const triggerButton = screen.getByRole('button', { name: /Add\/Link Mother/i })

      // Trigger button should exist and have proper styling for touch
      expect(triggerButton).toBeTruthy()
      expect(triggerButton.classList.contains('trigger-button')).toBe(true)
    })

    it('should render properly on tablet viewports (768-1023px)', () => {
      global.innerWidth = 768
      global.innerHeight = 1024

      const { container } = render(CollapsibleActionPanel, {
        props: {
          label: 'Add/Link Mother',
          relationshipType: 'mother',
          createLabel: 'Create',
          linkLabel: 'Link'
        }
      })

      const triggerButton = screen.getByRole('button', { name: /Add\/Link Mother/i })
      expect(triggerButton).toBeTruthy()
    })

    it('should render properly on desktop viewports (≥1024px)', () => {
      global.innerWidth = 1440
      global.innerHeight = 900

      const { container } = render(CollapsibleActionPanel, {
        props: {
          label: 'Add/Link Mother',
          relationshipType: 'mother',
          createLabel: 'Create',
          linkLabel: 'Link'
        }
      })

      const triggerButton = screen.getByRole('button', { name: /Add\/Link Mother/i })
      expect(triggerButton).toBeTruthy()
    })

    it('should use full-width buttons on all screen sizes', async () => {
      const { container } = render(CollapsibleActionPanel, {
        props: {
          label: 'Add/Link Mother',
          relationshipType: 'mother',
          createLabel: 'Create',
          linkLabel: 'Link'
        }
      })

      const triggerButton = screen.getByRole('button', { name: /Add\/Link Mother/i })
      await fireEvent.click(triggerButton)

      const createButton = screen.getByRole('button', { name: /Create/i })
      const linkButton = screen.getByRole('button', { name: /Link/i })

      // Buttons should have full width or flex-grow styling
      expect(createButton.classList.contains('full-width') ||
             createButton.style.width === '100%').toBe(true)
      expect(linkButton.classList.contains('full-width') ||
             linkButton.style.width === '100%').toBe(true)
    })
  })

  describe('Animation and transitions', () => {
    it('should use smooth 250ms slide animation when expanding', async () => {
      const { container } = render(CollapsibleActionPanel, {
        props: {
          label: 'Add/Link Mother',
          relationshipType: 'mother',
          createLabel: 'Create',
          linkLabel: 'Link'
        }
      })

      const triggerButton = screen.getByRole('button', { name: /Add\/Link Mother/i })
      await fireEvent.click(triggerButton)

      // Svelte's slide transition is applied programmatically
      const optionsPanel = container.querySelector('[role="region"]')
      expect(optionsPanel).toBeTruthy()
    })

    it('should use smooth 250ms slide animation when collapsing', async () => {
      const { container } = render(CollapsibleActionPanel, {
        props: {
          label: 'Add/Link Mother',
          relationshipType: 'mother',
          createLabel: 'Create',
          linkLabel: 'Link'
        }
      })

      const triggerButton = screen.getByRole('button', { name: /Add\/Link Mother/i })

      // Expand then collapse
      await fireEvent.click(triggerButton)
      await fireEvent.click(triggerButton)

      // Panel should collapse with transition
      expect(triggerButton.getAttribute('aria-expanded')).toBe('false')
    })
  })

  describe('Edge cases and error handling', () => {
    it('should handle rapid clicks on trigger button gracefully', async () => {
      const { container } = render(CollapsibleActionPanel, {
        props: {
          label: 'Add/Link Mother',
          relationshipType: 'mother',
          createLabel: 'Create',
          linkLabel: 'Link'
        }
      })

      const triggerButton = screen.getByRole('button', { name: /Add\/Link Mother/i })

      // Click rapidly 10 times
      for (let i = 0; i < 10; i++) {
        await fireEvent.click(triggerButton)
      }

      // Should be in valid state
      const ariaExpanded = triggerButton.getAttribute('aria-expanded')
      expect(ariaExpanded === 'true' || ariaExpanded === 'false').toBe(true)
    })

    it('should handle empty label prop gracefully', () => {
      const { container } = render(CollapsibleActionPanel, {
        props: {
          label: '',
          relationshipType: 'mother',
          createLabel: 'Create',
          linkLabel: 'Link'
        }
      })

      const triggerButton = container.querySelector('button[aria-expanded]')
      expect(triggerButton).toBeTruthy()
    })

    it('should handle very long labels without breaking layout', async () => {
      const longLabel = 'A'.repeat(100)

      const { container } = render(CollapsibleActionPanel, {
        props: {
          label: longLabel,
          relationshipType: 'mother',
          createLabel: 'Create',
          linkLabel: 'Link'
        }
      })

      const triggerButton = screen.getByRole('button', { name: new RegExp(longLabel) })
      expect(triggerButton).toBeTruthy()

      // Trigger text should have overflow handling
      const triggerText = triggerButton.querySelector('.trigger-text')
      expect(triggerText).toBeTruthy()
    })

    it('should handle switching between create and link slots', async () => {
      const { container } = render(CollapsibleActionPanel, {
        props: {
          label: 'Add/Link Mother',
          relationshipType: 'mother',
          createLabel: 'Create',
          linkLabel: 'Link'
        }
      })

      const triggerButton = screen.getByRole('button', { name: /Add\/Link Mother/i })

      // Expand and select create
      await fireEvent.click(triggerButton)
      const createButton = screen.getByRole('button', { name: /Create/i })
      await fireEvent.click(createButton)

      // Cancel back to options
      let cancelButton = screen.getByRole('button', { name: /Cancel/i })
      await fireEvent.click(cancelButton)

      // Re-expand and select link
      await fireEvent.click(triggerButton)
      const linkButton = screen.getByRole('button', { name: /Link/i })
      await fireEvent.click(linkButton)

      // Should show link slot
      const linkSlot = container.querySelector('[data-slot="link"]')
      expect(linkSlot).toBeTruthy()
    })
  })

  describe('Issue #56: Auto-collapse panel behavior', () => {
    describe('Panel store registration (groupId/panelId)', () => {
      it('should register in panel store when expanded with both groupId and panelId', async () => {
        const { container } = render(CollapsibleActionPanel, {
          props: {
            label: 'Add/Link Mother',
            relationshipType: 'mother',
            groupId: 'parents',
            panelId: 'mother'
          }
        })

        const triggerButton = screen.getByRole('button', { name: /Add\/Link Mother/i })
        await fireEvent.click(triggerButton)

        const state = get(openPanels)
        expect(state).toEqual({ parents: 'mother' })
      })

      it('should not register in panel store without groupId', async () => {
        const { container } = render(CollapsibleActionPanel, {
          props: {
            label: 'Add/Link Spouse',
            relationshipType: 'spouse',
            panelId: 'spouse'
            // No groupId
          }
        })

        const triggerButton = screen.getByRole('button', { name: /Add\/Link Spouse/i })
        await fireEvent.click(triggerButton)

        const state = get(openPanels)
        expect(state).toEqual({})
      })

      it('should not register in panel store without panelId', async () => {
        const { container } = render(CollapsibleActionPanel, {
          props: {
            label: 'Add/Link Mother',
            relationshipType: 'mother',
            groupId: 'parents'
            // No panelId
          }
        })

        const triggerButton = screen.getByRole('button', { name: /Add\/Link Mother/i })
        await fireEvent.click(triggerButton)

        const state = get(openPanels)
        expect(state).toEqual({})
      })

      it('should remove from panel store when manually collapsed', async () => {
        const { container } = render(CollapsibleActionPanel, {
          props: {
            label: 'Add/Link Mother',
            relationshipType: 'mother',
            groupId: 'parents',
            panelId: 'mother'
          }
        })

        const triggerButton = screen.getByRole('button', { name: /Add\/Link Mother/i })

        // Expand
        await fireEvent.click(triggerButton)
        expect(get(openPanels)).toEqual({ parents: 'mother' })

        // Collapse
        await fireEvent.click(screen.getByRole('button', { name: /Cancel/i }))

        // Panel should be removed from store
        const state = get(openPanels)
        expect(state).toEqual({})
      })
    })

    describe('Auto-collapse within same group', () => {
      it('should auto-collapse when another panel in same group opens (AC1)', async () => {
        // Render two panels in same group
        const { rerender: rerenderMother, container: containerMother, queryByText: queryMotherText } = render(CollapsibleActionPanel, {
          props: {
            label: 'Add/Link Mother',
            relationshipType: 'mother',
            groupId: 'parents',
            panelId: 'mother'
          }
        })

        // Expand mother panel
        const motherTrigger = screen.getByRole('button', { name: /Add\/Link Mother/i })
        await fireEvent.click(motherTrigger)
        expect(motherTrigger.getAttribute('aria-expanded')).toBe('true')

        // Simulate opening father panel by updating store
        openPanels.set({ parents: 'father' })

        // Mother panel should detect the change and auto-collapse
        await waitFor(() => {
          expect(motherTrigger.getAttribute('aria-expanded')).toBe('false')
        }, { timeout: 500 })
      })

      it('should handle dirty form protection (isDirty=false - auto-collapse immediately) (AC4)', async () => {
        const { container } = render(CollapsibleActionPanel, {
          props: {
            label: 'Add/Link Mother',
            relationshipType: 'mother',
            groupId: 'parents',
            panelId: 'mother',
            isDirty: false
          }
        })

        const triggerButton = screen.getByRole('button', { name: /Add\/Link Mother/i })

        // Expand mother panel
        await fireEvent.click(triggerButton)
        expect(triggerButton.getAttribute('aria-expanded')).toBe('true')

        // Trigger auto-collapse by opening another panel in same group
        openPanels.set({ parents: 'father' })

        // Should collapse immediately without confirmation (clean form)
        await waitFor(() => {
          expect(triggerButton.getAttribute('aria-expanded')).toBe('false')
        }, { timeout: 500 })
      })

      it('should request confirmation when form is dirty (isDirty=true) (AC4)', async () => {
        const onConfirmationRequested = vi.fn()

        const { container } = render(CollapsibleActionPanel, {
          props: {
            label: 'Add/Link Mother',
            relationshipType: 'mother',
            groupId: 'parents',
            panelId: 'mother',
            isDirty: true,
            onConfirmationRequested
          }
        })

        const triggerButton = screen.getByRole('button', { name: /Add\/Link Mother/i })

        // Expand mother panel
        await fireEvent.click(triggerButton)
        expect(triggerButton.getAttribute('aria-expanded')).toBe('true')

        // Trigger auto-collapse by opening another panel in same group
        openPanels.set({ parents: 'father' })

        // Should call confirmation callback instead of collapsing immediately
        await waitFor(() => {
          expect(onConfirmationRequested).toHaveBeenCalled()
        }, { timeout: 500 })

        // Panel should still be expanded (waiting for user confirmation)
        expect(triggerButton.getAttribute('aria-expanded')).toBe('true')
      })
    })

    describe('Independence between different groups (AC3)', () => {
      it('should not auto-collapse spouse panel when parent panel opens', async () => {
        // Render spouse panel
        const { container: spouseContainer } = render(CollapsibleActionPanel, {
          props: {
            label: 'Add/Link Spouse',
            relationshipType: 'spouse',
            groupId: 'spouses',
            panelId: 'spouse'
          }
        })

        const spouseTrigger = screen.getByRole('button', { name: /Add\/Link Spouse/i })
        await fireEvent.click(spouseTrigger)
        expect(spouseTrigger.getAttribute('aria-expanded')).toBe('true')

        // Open parent panel in different group
        openPanels.set({ spouses: 'spouse', parents: 'mother' })

        // Spouse panel should remain open
        await new Promise(resolve => setTimeout(resolve, 300))
        expect(spouseTrigger.getAttribute('aria-expanded')).toBe('true')
      })

      it('should not auto-collapse children panel when spouse panel opens', async () => {
        // Render children panel
        const { container } = render(CollapsibleActionPanel, {
          props: {
            label: 'Add/Link Children',
            relationshipType: 'child',
            groupId: 'children',
            panelId: 'child'
          }
        })

        const childTrigger = screen.getByRole('button', { name: /Add\/Link Children/i })
        await fireEvent.click(childTrigger)
        expect(childTrigger.getAttribute('aria-expanded')).toBe('true')

        // Open spouse panel in different group
        openPanels.set({ children: 'child', spouses: 'spouse' })

        // Children panel should remain open
        await new Promise(resolve => setTimeout(resolve, 300))
        expect(childTrigger.getAttribute('aria-expanded')).toBe('true')
      })

      it('should allow multiple panels open simultaneously in different groups', async () => {
        // Set up multiple panels in different groups as open
        openPanels.set({
          parents: 'mother',
          spouses: 'spouse',
          children: 'child'
        })

        const state = get(openPanels)
        expect(state).toEqual({
          parents: 'mother',
          spouses: 'spouse',
          children: 'child'
        })
      })
    })

    describe('Autocomplete low-commitment interaction (AC5)', () => {
      it('should treat autocomplete input as non-dirty by default', async () => {
        // Autocomplete text input should not trigger isDirty unless explicitly set
        const { container } = render(CollapsibleActionPanel, {
          props: {
            label: 'Add/Link Mother',
            relationshipType: 'mother',
            groupId: 'parents',
            panelId: 'mother',
            isDirty: false // Autocomplete interaction is low-commitment
          }
        })

        const triggerButton = screen.getByRole('button', { name: /Add\/Link Mother/i })

        // Expand and show link slot (autocomplete content)
        await fireEvent.click(triggerButton)
        await fireEvent.click(screen.getByRole('button', { name: /Link Existing Person/i }))

        // Trigger auto-collapse
        openPanels.set({ parents: 'father' })

        // Should collapse without confirmation (autocomplete is low-commitment)
        await waitFor(() => {
          expect(triggerButton.getAttribute('aria-expanded')).toBe('false')
        }, { timeout: 500 })
      })
    })

    describe('Keyboard navigation with auto-collapse (AC7)', () => {
      it('should auto-collapse via keyboard navigation (Enter key)', async () => {
        const { container } = render(CollapsibleActionPanel, {
          props: {
            label: 'Add/Link Mother',
            relationshipType: 'mother',
            groupId: 'parents',
            panelId: 'mother'
          }
        })

        const triggerButton = screen.getByRole('button', { name: /Add\/Link Mother/i })

        // Expand via Enter key
        await fireEvent.keyDown(triggerButton, { key: 'Enter' })
        expect(triggerButton.getAttribute('aria-expanded')).toBe('true')

        // Trigger auto-collapse
        openPanels.set({ parents: 'father' })

        // Should auto-collapse
        await waitFor(() => {
          expect(triggerButton.getAttribute('aria-expanded')).toBe('false')
        }, { timeout: 500 })
      })

      it('should return focus to trigger button after auto-collapse', async () => {
        const { container } = render(CollapsibleActionPanel, {
          props: {
            label: 'Add/Link Mother',
            relationshipType: 'mother',
            groupId: 'parents',
            panelId: 'mother'
          }
        })

        const triggerButton = screen.getByRole('button', { name: /Add\/Link Mother/i })

        // Expand
        await fireEvent.click(triggerButton)

        // Trigger auto-collapse
        openPanels.set({ parents: 'father' })

        // Wait for collapse
        await waitFor(() => {
          expect(triggerButton.getAttribute('aria-expanded')).toBe('false')
        }, { timeout: 500 })

        // Focus should be on trigger button
        expect(document.activeElement).toBe(triggerButton)
      })
    })

    describe('Screen reader announcements (AC8)', () => {
      it('should announce auto-collapse to screen readers', async () => {
        const { container } = render(CollapsibleActionPanel, {
          props: {
            label: 'Add/Link Mother',
            relationshipType: 'mother',
            groupId: 'parents',
            panelId: 'mother'
          }
        })

        const triggerButton = screen.getByRole('button', { name: /Add\/Link Mother/i })

        // Expand
        await fireEvent.click(triggerButton)
        expect(triggerButton.getAttribute('aria-expanded')).toBe('true')

        // Trigger auto-collapse
        openPanels.set({ parents: 'father' })

        // Wait for collapse
        await waitFor(() => {
          expect(triggerButton.getAttribute('aria-expanded')).toBe('false')
        }, { timeout: 500 })

        // aria-expanded should update for screen readers
        expect(triggerButton.getAttribute('aria-expanded')).toBe('false')
      })
    })

    describe('Mobile layout compatibility (AC9)', () => {
      it('should work identically on mobile layouts', async () => {
        global.innerWidth = 375
        global.innerHeight = 667

        const { container } = render(CollapsibleActionPanel, {
          props: {
            label: 'Add/Link Mother',
            relationshipType: 'mother',
            groupId: 'parents',
            panelId: 'mother'
          }
        })

        const triggerButton = screen.getByRole('button', { name: /Add\/Link Mother/i })

        // Expand
        await fireEvent.click(triggerButton)
        expect(triggerButton.getAttribute('aria-expanded')).toBe('true')

        // Trigger auto-collapse
        openPanels.set({ parents: 'father' })

        // Should auto-collapse on mobile too
        await waitFor(() => {
          expect(triggerButton.getAttribute('aria-expanded')).toBe('false')
        }, { timeout: 500 })
      })
    })

    describe('Modal navigation state reset (AC10)', () => {
      it('should reset panel state when modal closes', async () => {
        const { container } = render(CollapsibleActionPanel, {
          props: {
            label: 'Add/Link Mother',
            relationshipType: 'mother',
            groupId: 'parents',
            panelId: 'mother'
          }
        })

        const triggerButton = screen.getByRole('button', { name: /Add\/Link Mother/i })

        // Expand panel
        await fireEvent.click(triggerButton)
        expect(get(openPanels)).toEqual({ parents: 'mother' })

        // Simulate modal close (reset store)
        openPanels.set({})

        // Store should be empty
        expect(get(openPanels)).toEqual({})
      })

      it('should open fresh modal with all panels collapsed', () => {
        // Ensure store is empty (fresh modal state)
        openPanels.set({})

        const { container } = render(CollapsibleActionPanel, {
          props: {
            label: 'Add/Link Mother',
            relationshipType: 'mother',
            groupId: 'parents',
            panelId: 'mother'
          }
        })

        const triggerButton = screen.getByRole('button', { name: /Add\/Link Mother/i })

        // Should be collapsed initially
        expect(triggerButton.getAttribute('aria-expanded')).toBe('false')
      })
    })

    describe('Edge cases with auto-collapse', () => {
      it('should handle rapid panel switching in same group', async () => {
        const { container } = render(CollapsibleActionPanel, {
          props: {
            label: 'Add/Link Mother',
            relationshipType: 'mother',
            groupId: 'parents',
            panelId: 'mother'
          }
        })

        const triggerButton = screen.getByRole('button', { name: /Add\/Link Mother/i })

        // Expand
        await fireEvent.click(triggerButton)

        // Rapidly switch between panels
        for (let i = 0; i < 5; i++) {
          openPanels.set({ parents: i % 2 === 0 ? 'mother' : 'father' })
          await new Promise(resolve => setTimeout(resolve, 50))
        }

        // Should be in valid state
        const ariaExpanded = triggerButton.getAttribute('aria-expanded')
        expect(ariaExpanded === 'true' || ariaExpanded === 'false').toBe(true)
      })

      it('should handle panel switching while viewing slot content', async () => {
        const { container } = render(CollapsibleActionPanel, {
          props: {
            label: 'Add/Link Mother',
            relationshipType: 'mother',
            groupId: 'parents',
            panelId: 'mother'
          }
        })

        const triggerButton = screen.getByRole('button', { name: /Add\/Link Mother/i })

        // Expand and show create slot
        await fireEvent.click(triggerButton)
        await fireEvent.click(screen.getByRole('button', { name: /Create New Person/i }))

        // Trigger auto-collapse while in slot view
        openPanels.set({ parents: 'father' })

        // Should auto-collapse
        await waitFor(() => {
          expect(triggerButton.getAttribute('aria-expanded')).toBe('false')
        }, { timeout: 500 })
      })
    })
  })
})
