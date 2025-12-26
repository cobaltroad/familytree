/**
 * Test file to verify that all @testing-library/jest-dom matchers are working correctly
 * This addresses Story #69, Category 2: Missing Testing Library Matchers
 *
 * This test ensures that matchers like:
 * - toBeInTheDocument
 * - toBeVisible
 * - toHaveAttribute
 * - toHaveFocus
 * - toHaveClass
 *
 * are properly configured and work without "Invalid Chai property" errors.
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/svelte'
import { tick } from 'svelte'
import TestComponent from './fixtures/TestComponent.svelte'
import HiddenComponent from './fixtures/HiddenComponent.svelte'
import NoClassComponent from './fixtures/NoClassComponent.svelte'
import NoAttrComponent from './fixtures/NoAttrComponent.svelte'
import InteractiveComponent from './fixtures/InteractiveComponent.svelte'

describe('Testing Library Matchers (Story #69 - AC2)', () => {
  describe('toBeInTheDocument matcher', () => {
    it('should work for elements in the document', () => {
      render(TestComponent, {
        props: {
          visible: true,
          dataTestId: 'test-element'
        }
      })

      const element = screen.getByTestId('test-element')
      expect(element).toBeInTheDocument()
    })

    it('should work with queryBy for non-existent elements', () => {
      render(TestComponent, {
        props: {
          visible: false
        }
      })

      const element = screen.queryByTestId('test-element')
      expect(element).not.toBeInTheDocument()
    })
  })

  describe('toBeVisible matcher', () => {
    it('should work for visible elements', () => {
      render(TestComponent, {
        props: {
          visible: true
        }
      })

      const element = screen.getByTestId('test-element')
      expect(element).toBeVisible()
    })

    it('should work for hidden elements', () => {
      render(HiddenComponent)

      const element = screen.getByTestId('hidden-element')
      expect(element).not.toBeVisible()
    })
  })

  describe('toHaveAttribute matcher', () => {
    it('should work when element has the attribute', () => {
      render(TestComponent, {
        props: {
          customAttr: 'test-value'
        }
      })

      const element = screen.getByTestId('test-element')
      expect(element).toHaveAttribute('data-custom', 'test-value')
    })

    it('should work when checking for attribute existence', () => {
      render(TestComponent, {
        props: {
          customAttr: 'any-value'
        }
      })

      const element = screen.getByTestId('test-element')
      expect(element).toHaveAttribute('data-custom')
    })

    it('should work with not matcher when attribute is missing', () => {
      render(TestComponent, {
        props: {
          customAttr: ''
        }
      })

      const element = screen.getByTestId('test-element')
      expect(element).not.toHaveAttribute('data-nonexistent')
    })
  })

  describe('toHaveFocus matcher', () => {
    it('should work when element has focus', async () => {
      render(TestComponent)

      const button = screen.getByTestId('focus-button')
      button.focus()
      await tick()

      expect(button).toHaveFocus()
    })

    it('should work with not matcher when element does not have focus', () => {
      render(TestComponent)

      const button = screen.getByTestId('focus-button')
      const input = screen.getByTestId('focus-input')

      button.focus()

      expect(input).not.toHaveFocus()
    })
  })

  describe('toHaveClass matcher', () => {
    it('should work when element has the class', () => {
      render(TestComponent, {
        props: {
          className: 'test-class another-class'
        }
      })

      const element = screen.getByTestId('test-element')
      expect(element).toHaveClass('test-class')
      expect(element).toHaveClass('another-class')
    })

    it('should work when checking for multiple classes', () => {
      render(TestComponent, {
        props: {
          className: 'class-one class-two class-three'
        }
      })

      const element = screen.getByTestId('test-element')
      expect(element).toHaveClass('class-one', 'class-two')
    })

    it('should work with not matcher when class is missing', () => {
      render(TestComponent, {
        props: {
          className: 'existing-class'
        }
      })

      const element = screen.getByTestId('test-element')
      expect(element).not.toHaveClass('non-existent-class')
    })
  })

  describe('Combined matchers in real-world scenarios', () => {
    it('should allow using multiple matchers on the same element', () => {
      render(TestComponent, {
        props: {
          visible: true,
          className: 'styled-element',
          customAttr: 'custom-value'
        }
      })

      const element = screen.getByTestId('test-element')

      // All these matchers should work without "Invalid Chai property" errors
      expect(element).toBeInTheDocument()
      expect(element).toBeVisible()
      expect(element).toHaveClass('styled-element')
      expect(element).toHaveAttribute('data-custom', 'custom-value')
      expect(element).toHaveAttribute('data-testid', 'test-element')
    })

    it('should work in component test scenarios with focus and visibility', async () => {
      render(InteractiveComponent, {
        props: {
          show: true
        }
      })

      const container = screen.getByTestId('container')
      const button = screen.getByTestId('action-button')

      expect(container).toBeInTheDocument()
      expect(container).toBeVisible()
      expect(container).toHaveClass('visible-container')

      button.focus()
      await tick()

      expect(button).toHaveFocus()
      expect(button).toHaveAttribute('type', 'button')
    })
  })

  describe('Edge cases and error conditions', () => {
    it('should handle null/undefined queries gracefully with toBeInTheDocument', () => {
      render(TestComponent, {
        props: {
          visible: false
        }
      })

      const element = screen.queryByTestId('test-element')
      expect(element).toBeNull()
      expect(element).not.toBeInTheDocument()
    })

    it('should work with elements that have no classes', () => {
      render(NoClassComponent)

      const element = screen.getByTestId('no-class-element')
      expect(element).not.toHaveClass('any-class')
    })

    it('should work with elements that have no custom attributes', () => {
      render(NoAttrComponent)

      const element = screen.getByTestId('no-attr-element')
      expect(element).not.toHaveAttribute('custom-attr')
      expect(element).toHaveAttribute('data-testid') // but still has data-testid
    })
  })
})
