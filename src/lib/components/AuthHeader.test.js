/**
 * Auth Header Component Tests
 *
 * Tests for the authentication header component that shows:
 * - User profile when authenticated
 * - Sign-in link when not authenticated
 * - Sign-out functionality
 *
 * Following TDD methodology - these tests define the expected behavior.
 *
 * Test coverage:
 * - Displays user info when authenticated
 * - Shows sign-in link when not authenticated
 * - Sign-out button works correctly
 * - Avatar display
 * - Responsive layout
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/svelte'
import AuthHeader from './AuthHeader.svelte'

describe('AuthHeader Component', () => {
  describe('Unauthenticated State', () => {
    it('should show sign-in link when not authenticated', () => {
      // Arrange & Act
      render(AuthHeader, {
        props: {
          session: null
        }
      })

      // Assert
      const signInLink = screen.getByRole('link', { name: /sign in/i })
      expect(signInLink).toBeTruthy()
      expect(signInLink.getAttribute('href')).toBe('/signin')
    })

    it('should not show user profile when not authenticated', () => {
      // Arrange & Act
      render(AuthHeader, {
        props: {
          session: null
        }
      })

      // Assert
      const userProfile = screen.queryByText(/sign out/i)
      expect(userProfile).toBeFalsy()
    })
  })

  describe('Authenticated State', () => {
    const mockSession = {
      user: {
        id: 'fb_12345',
        email: 'user@example.com',
        name: 'Test User',
        image: 'https://example.com/avatar.jpg',
        provider: 'facebook'
      }
    }

    it('should show user name when authenticated', () => {
      // Arrange & Act
      render(AuthHeader, {
        props: {
          session: mockSession
        }
      })

      // Assert
      expect(screen.getByText('Test User')).toBeTruthy()
    })

    it('should show user avatar when authenticated', () => {
      // Arrange & Act
      render(AuthHeader, {
        props: {
          session: mockSession
        }
      })

      // Assert
      const avatar = screen.getByAltText('Test User')
      expect(avatar).toBeTruthy()
      expect(avatar.getAttribute('src')).toBe('https://example.com/avatar.jpg')
    })

    it('should show sign-out button when authenticated', () => {
      // Arrange & Act
      render(AuthHeader, {
        props: {
          session: mockSession
        }
      })

      // Assert
      const signOutButton = screen.getByRole('link', { name: /sign out/i })
      expect(signOutButton).toBeTruthy()
      expect(signOutButton.getAttribute('href')).toBe('/auth/signout')
    })

    it('should not show sign-in link when authenticated', () => {
      // Arrange & Act
      render(AuthHeader, {
        props: {
          session: mockSession
        }
      })

      // Assert
      const signInLink = screen.queryByText(/sign in/i)
      expect(signInLink).toBeFalsy()
    })

    it('should handle user without avatar', () => {
      // Arrange
      const sessionNoAvatar = {
        user: {
          id: 'fb_67890',
          email: 'noavatar@example.com',
          name: 'No Avatar User',
          image: null,
          provider: 'facebook'
        }
      }

      // Act
      render(AuthHeader, {
        props: {
          session: sessionNoAvatar
        }
      })

      // Assert - should show initials or default avatar
      expect(screen.getByText('No Avatar User')).toBeTruthy()
    })

    it('should handle user without name', () => {
      // Arrange
      const sessionNoName = {
        user: {
          id: 'fb_99999',
          email: 'noname@example.com',
          name: null,
          image: 'https://example.com/avatar.jpg',
          provider: 'facebook'
        }
      }

      // Act
      render(AuthHeader, {
        props: {
          session: sessionNoName
        }
      })

      // Assert - should show email as fallback
      expect(screen.getByText('noname@example.com')).toBeTruthy()
    })
  })

  describe('Layout and Styling', () => {
    it('should have header element', () => {
      // Arrange & Act
      const { container } = render(AuthHeader, {
        props: {
          session: null
        }
      })

      // Assert
      const header = container.querySelector('header')
      expect(header).toBeTruthy()
    })

    it('should have auth-header class', () => {
      // Arrange & Act
      const { container } = render(AuthHeader, {
        props: {
          session: null
        }
      })

      // Assert
      const header = container.querySelector('.auth-header')
      expect(header).toBeTruthy()
    })
  })

  describe('Accessibility', () => {
    it('should have semantic header element', () => {
      // Arrange & Act
      const { container } = render(AuthHeader, {
        props: {
          session: null
        }
      })

      // Assert
      const header = container.querySelector('header')
      expect(header).toBeTruthy()
    })

    it('should have accessible sign-in link', () => {
      // Arrange & Act
      render(AuthHeader, {
        props: {
          session: null
        }
      })

      // Assert
      const signInLink = screen.getByRole('link', { name: /sign in/i })
      expect(signInLink).toBeTruthy()
    })

    it('should have accessible sign-out button', () => {
      // Arrange
      const mockSession = {
        user: {
          id: 'fb_12345',
          email: 'user@example.com',
          name: 'Test User',
          image: 'https://example.com/avatar.jpg'
        }
      }

      // Act
      render(AuthHeader, {
        props: {
          session: mockSession
        }
      })

      // Assert
      const signOutButton = screen.getByRole('link', { name: /sign out/i })
      expect(signOutButton).toBeTruthy()
    })

    it('should have alt text for avatar image', () => {
      // Arrange
      const mockSession = {
        user: {
          id: 'fb_12345',
          email: 'user@example.com',
          name: 'Test User',
          image: 'https://example.com/avatar.jpg'
        }
      }

      // Act
      render(AuthHeader, {
        props: {
          session: mockSession
        }
      })

      // Assert
      const avatar = screen.getByAltText('Test User')
      expect(avatar).toBeTruthy()
    })
  })
})
