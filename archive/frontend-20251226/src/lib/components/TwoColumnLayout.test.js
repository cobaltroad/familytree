import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/svelte'
import TwoColumnLayout from './TwoColumnLayout.svelte'
import TwoColumnLayoutTestWrapper from './TwoColumnLayoutTestWrapper.svelte'

describe('TwoColumnLayout', () => {
  describe('Basic rendering', () => {
    it('should render with slot content', () => {
      const { container } = render(TwoColumnLayoutTestWrapper)

      const columns = container.querySelectorAll('[role="region"]')
      expect(columns.length).toBe(2)
    })

    it('should render left column with correct aria-label', () => {
      const { container } = render(TwoColumnLayoutTestWrapper)

      const leftColumn = container.querySelector('[aria-label="Personal Information"]')
      expect(leftColumn).toBeTruthy()
    })

    it('should render right column with correct aria-label', () => {
      const { container } = render(TwoColumnLayoutTestWrapper)

      const rightColumn = container.querySelector('[aria-label="Relationships"]')
      expect(rightColumn).toBeTruthy()
    })

    it('should render left slot content', () => {
      const { container } = render(TwoColumnLayoutTestWrapper)

      const leftContent = container.querySelector('.test-left-content')
      expect(leftContent).toBeTruthy()
      expect(leftContent.textContent).toContain('Left column content')
    })

    it('should render right slot content', () => {
      const { container } = render(TwoColumnLayoutTestWrapper)

      const rightContent = container.querySelector('.test-right-content')
      expect(rightContent).toBeTruthy()
      expect(rightContent.textContent).toContain('Right column content')
    })
  })

  describe('Layout structure', () => {
    it('should have two-column-layout class', () => {
      const { container } = render(TwoColumnLayoutTestWrapper)

      const layout = container.querySelector('.two-column-layout')
      expect(layout).toBeTruthy()
    })

    it('should have left and right column classes', () => {
      const { container } = render(TwoColumnLayoutTestWrapper)

      const leftColumn = container.querySelector('.left-column')
      const rightColumn = container.querySelector('.right-column')
      expect(leftColumn).toBeTruthy()
      expect(rightColumn).toBeTruthy()
    })
  })

  describe('Column styling', () => {
    it('should have left column element', () => {
      const { container } = render(TwoColumnLayoutTestWrapper)

      const leftColumn = container.querySelector('.left-column')
      expect(leftColumn).toBeTruthy()
    })

    it('should have right column element', () => {
      const { container } = render(TwoColumnLayoutTestWrapper)

      const rightColumn = container.querySelector('.right-column')
      expect(rightColumn).toBeTruthy()
    })

    it('should render both columns in layout container', () => {
      const { container } = render(TwoColumnLayoutTestWrapper)

      const layout = container.querySelector('.two-column-layout')
      const leftColumn = layout.querySelector('.left-column')
      const rightColumn = layout.querySelector('.right-column')

      expect(leftColumn).toBeTruthy()
      expect(rightColumn).toBeTruthy()
    })
  })

  describe('Column structure', () => {
    it('should have left column for scrolling', () => {
      const { container } = render(TwoColumnLayoutTestWrapper)

      const leftColumn = container.querySelector('.left-column')
      expect(leftColumn).toBeTruthy()
    })

    it('should have right column for scrolling', () => {
      const { container } = render(TwoColumnLayoutTestWrapper)

      const rightColumn = container.querySelector('.right-column')
      expect(rightColumn).toBeTruthy()
    })

    it('should have both columns available for content', () => {
      const { container } = render(TwoColumnLayoutTestWrapper)

      const leftColumn = container.querySelector('.left-column')
      const rightColumn = container.querySelector('.right-column')

      expect(leftColumn).toBeTruthy()
      expect(rightColumn).toBeTruthy()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA landmarks for columns', () => {
      const { container } = render(TwoColumnLayoutTestWrapper)

      const regions = container.querySelectorAll('[role="region"]')
      expect(regions.length).toBe(2)
    })

    it('should have descriptive aria-label for left column', () => {
      const { container } = render(TwoColumnLayoutTestWrapper)

      const leftColumn = container.querySelector('.left-column')
      expect(leftColumn.getAttribute('aria-label')).toBe('Personal Information')
    })

    it('should have descriptive aria-label for right column', () => {
      const { container } = render(TwoColumnLayoutTestWrapper)

      const rightColumn = container.querySelector('.right-column')
      expect(rightColumn.getAttribute('aria-label')).toBe('Relationships')
    })

    it('should render in correct document order for screen readers', () => {
      const { container } = render(TwoColumnLayoutTestWrapper)

      const layout = container.querySelector('.two-column-layout')
      const children = Array.from(layout.children)

      expect(children[0].classList.contains('left-column')).toBe(true)
      expect(children[1].classList.contains('right-column')).toBe(true)
    })
  })

  describe('Column layout', () => {
    it('should have both columns present', () => {
      const { container } = render(TwoColumnLayoutTestWrapper)

      const leftColumn = container.querySelector('.left-column')
      const rightColumn = container.querySelector('.right-column')

      expect(leftColumn).toBeTruthy()
      expect(rightColumn).toBeTruthy()
    })

    it('should have layout container', () => {
      const { container } = render(TwoColumnLayoutTestWrapper)

      const layout = container.querySelector('.two-column-layout')
      expect(layout).toBeTruthy()
    })
  })
})
