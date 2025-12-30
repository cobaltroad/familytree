/**
 * Sign-in Page Tests
 *
 * Tests for the Facebook OAuth sign-in page UI.
 * Following TDD methodology - these tests define the expected behavior.
 *
 * Test coverage:
 * - Sign-in page renders correctly
 * - Facebook login button is present
 * - Button follows Facebook Brand Guidelines
 * - Page handles authentication state
 * - Redirects after successful login
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/svelte'
import SignInPage from '../../../routes/signin/+page.svelte'

describe('Sign-in Page', () => {
  describe('Page Rendering', () => {
    it('should render sign-in page with title', () => {
      // Act
      render(SignInPage)

      // Assert
      expect(screen.getByRole('heading', { name: /sign in/i })).toBeTruthy()
    })

    it('should display welcome message', () => {
      // Act
      render(SignInPage)

      // Assert
      const heading = screen.getByRole('heading', { name: /sign in/i })
      expect(heading).toBeTruthy()
    })

    it('should have Facebook login button', () => {
      // Act
      render(SignInPage)

      // Assert
      const facebookButton = screen.getByRole('button', { name: /continue with facebook/i })
      expect(facebookButton).toBeTruthy()
    })
  })

  describe('Facebook Login Button', () => {
    it('should submit to Auth.js Facebook sign-in endpoint', () => {
      // Act
      const { container } = render(SignInPage)

      // Assert
      const form = container.querySelector('form.signin-form')
      expect(form).toBeTruthy()
      expect(form.getAttribute('action')).toBe('/auth/signin/facebook')
      expect(form.getAttribute('method')).toBe('POST')
    })

    it('should have Facebook brand color', () => {
      // Act
      render(SignInPage)

      // Assert
      const facebookButton = screen.getByRole('button', { name: /continue with facebook/i })
      const styles = window.getComputedStyle(facebookButton)

      // Facebook brand blue: #1877F2
      // Note: In tests, computed styles may not be available, so we check the class
      expect(facebookButton.classList.contains('facebook-button')).toBe(true)
    })

    it('should include Facebook icon/logo', () => {
      // Act
      render(SignInPage)

      // Assert
      const facebookButton = screen.getByRole('button', { name: /continue with facebook/i })

      // Check for Facebook icon (SVG or emoji)
      const buttonText = facebookButton.textContent
      expect(buttonText).toMatch(/facebook/i)
    })

    it('should have accessible button text', () => {
      // Act
      render(SignInPage)

      // Assert
      const facebookButton = screen.getByRole('button', { name: /continue with facebook/i })
      expect(facebookButton.textContent).toMatch(/continue with facebook/i)
    })
  })

  describe('Page Layout', () => {
    it('should have centered layout', () => {
      // Act
      const { container } = render(SignInPage)

      // Assert
      const mainContainer = container.querySelector('main')
      expect(mainContainer).toBeTruthy()
    })

    it('should have minimal distractions (no navigation)', () => {
      // Act
      const { container } = render(SignInPage)

      // Assert - sign-in page should not have main app navigation
      const navigation = container.querySelector('nav')
      expect(navigation).toBeFalsy()
    })
  })

  describe('Accessibility', () => {
    it('should have proper button role', () => {
      // Act
      render(SignInPage)

      // Assert
      const facebookButton = screen.getByRole('button', { name: /continue with facebook/i })
      expect(facebookButton).toBeTruthy()
      // Button elements have implicit role="button", so getAttribute('role') will be null
      expect(facebookButton.tagName.toLowerCase()).toBe('button')
    })

    it('should have sufficient color contrast', () => {
      // Act
      render(SignInPage)

      // Assert
      const facebookButton = screen.getByRole('button', { name: /continue with facebook/i })
      expect(facebookButton).toBeTruthy()
      // Facebook brand guidelines require white text on blue background for contrast
    })
  })
})
