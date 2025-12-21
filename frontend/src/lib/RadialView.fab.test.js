/**
 * Unit tests for RadialView - Floating Action Button Removal.
 * Tests that RadialView does not have a floating add person button.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/svelte'
import RadialView from './RadialView.svelte'
import { people, relationships } from '../stores/familyStore.js'

describe('RadialView - Floating Action Button Removal', () => {
  beforeEach(() => {
    // Reset stores to empty state before each test
    people.set([])
    relationships.set([])
  })

  afterEach(() => {
    // Clean up after each test
    people.set([])
    relationships.set([])
  })

  it('should not render a floating add person button', () => {
    people.set([
      {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        birthDate: '1950-01-01',
        deathDate: null,
        gender: 'male'
      }
    ])

    const { container } = render(RadialView)

    // Should not have a button with class "fab"
    const fabButton = container.querySelector('.fab')
    expect(fabButton).toBeFalsy()

    // Should not have a button with aria-label "Add Person"
    const addButton = container.querySelector('button[aria-label="Add Person"]')
    expect(addButton).toBeFalsy()
  })

  it('should not have floating button in empty state', () => {
    // Empty store
    people.set([])
    relationships.set([])

    const { container } = render(RadialView)

    // Should not have a button with class "fab"
    const fabButton = container.querySelector('.fab')
    expect(fabButton).toBeFalsy()
  })
})
