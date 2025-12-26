import { describe, it, expect, beforeEach } from 'vitest'
import { get } from 'svelte/store'
import { modal } from './modalStore.js'

describe('modalStore', () => {
  beforeEach(() => {
    // Reset store to initial closed state
    modal.close()
  })

  describe('initial state', () => {
    it('should initialize with modal closed', () => {
      const value = get(modal)
      expect(value.isOpen).toBe(false)
    })

    it('should initialize with null personId', () => {
      const value = get(modal)
      expect(value.personId).toBe(null)
    })

    it('should initialize with "view" mode', () => {
      const value = get(modal)
      expect(value.mode).toBe('view')
    })

    it('should have all required properties in initial state', () => {
      const value = get(modal)
      expect(value).toHaveProperty('isOpen')
      expect(value).toHaveProperty('personId')
      expect(value).toHaveProperty('mode')
      expect(Object.keys(value).length).toBe(3)
    })
  })

  describe('open() method', () => {
    it('should open modal with personId in view mode by default', () => {
      modal.open(123)

      const value = get(modal)
      expect(value.isOpen).toBe(true)
      expect(value.personId).toBe(123)
      expect(value.mode).toBe('view')
    })

    it('should open modal with personId in edit mode when specified', () => {
      modal.open(456, 'edit')

      const value = get(modal)
      expect(value.isOpen).toBe(true)
      expect(value.personId).toBe(456)
      expect(value.mode).toBe('edit')
    })

    it('should open modal with personId in view mode when explicitly specified', () => {
      modal.open(789, 'view')

      const value = get(modal)
      expect(value.isOpen).toBe(true)
      expect(value.personId).toBe(789)
      expect(value.mode).toBe('view')
    })

    it('should allow reopening same person immediately after close', () => {
      // Open modal for person 123
      modal.open(123, 'edit')
      let value = get(modal)
      expect(value.isOpen).toBe(true)
      expect(value.personId).toBe(123)

      // Close modal
      modal.close()
      value = get(modal)
      expect(value.isOpen).toBe(false)

      // Immediately reopen for same person
      modal.open(123, 'edit')
      value = get(modal)
      expect(value.isOpen).toBe(true)
      expect(value.personId).toBe(123)
      expect(value.mode).toBe('edit')
    })

    it('should allow opening different person without closing first', () => {
      modal.open(111, 'edit')
      let value = get(modal)
      expect(value.personId).toBe(111)

      modal.open(222, 'view')
      value = get(modal)
      expect(value.personId).toBe(222)
      expect(value.mode).toBe('view')
      expect(value.isOpen).toBe(true)
    })

    it('should accept string personId', () => {
      modal.open('abc123', 'edit')

      const value = get(modal)
      expect(value.isOpen).toBe(true)
      expect(value.personId).toBe('abc123')
      expect(value.mode).toBe('edit')
    })

    it('should notify subscribers when state changes', () => {
      let capturedValue
      const unsubscribe = modal.subscribe(value => {
        capturedValue = value
      })

      modal.open(999, 'edit')

      expect(capturedValue.isOpen).toBe(true)
      expect(capturedValue.personId).toBe(999)
      expect(capturedValue.mode).toBe('edit')

      unsubscribe()
    })
  })

  describe('openNew() method', () => {
    it('should open modal in add mode with null personId', () => {
      modal.openNew()

      const value = get(modal)
      expect(value.isOpen).toBe(true)
      expect(value.personId).toBe(null)
      expect(value.mode).toBe('add')
    })

    it('should override previous personId when called after open()', () => {
      modal.open(123, 'edit')
      let value = get(modal)
      expect(value.personId).toBe(123)

      modal.openNew()
      value = get(modal)
      expect(value.personId).toBe(null)
      expect(value.mode).toBe('add')
      expect(value.isOpen).toBe(true)
    })

    it('should allow reopening new person modal immediately after close', () => {
      modal.openNew()
      let value = get(modal)
      expect(value.isOpen).toBe(true)
      expect(value.mode).toBe('add')

      modal.close()
      value = get(modal)
      expect(value.isOpen).toBe(false)

      modal.openNew()
      value = get(modal)
      expect(value.isOpen).toBe(true)
      expect(value.mode).toBe('add')
      expect(value.personId).toBe(null)
    })

    it('should notify subscribers when state changes', () => {
      let capturedValue
      const unsubscribe = modal.subscribe(value => {
        capturedValue = value
      })

      modal.openNew()

      expect(capturedValue.isOpen).toBe(true)
      expect(capturedValue.personId).toBe(null)
      expect(capturedValue.mode).toBe('add')

      unsubscribe()
    })
  })

  describe('close() method', () => {
    it('should close modal and reset to initial state', () => {
      modal.open(123, 'edit')
      let value = get(modal)
      expect(value.isOpen).toBe(true)

      modal.close()
      value = get(modal)
      expect(value.isOpen).toBe(false)
      expect(value.personId).toBe(null)
      expect(value.mode).toBe('view')
    })

    it('should be idempotent when called multiple times', () => {
      modal.open(456, 'edit')
      modal.close()
      modal.close()
      modal.close()

      const value = get(modal)
      expect(value.isOpen).toBe(false)
      expect(value.personId).toBe(null)
      expect(value.mode).toBe('view')
    })

    it('should notify subscribers when state changes', () => {
      let capturedValue
      const unsubscribe = modal.subscribe(value => {
        capturedValue = value
      })

      modal.open(789, 'edit')
      modal.close()

      expect(capturedValue.isOpen).toBe(false)
      expect(capturedValue.personId).toBe(null)
      expect(capturedValue.mode).toBe('view')

      unsubscribe()
    })

    it('should reset from add mode correctly', () => {
      modal.openNew()
      let value = get(modal)
      expect(value.mode).toBe('add')

      modal.close()
      value = get(modal)
      expect(value.isOpen).toBe(false)
      expect(value.personId).toBe(null)
      expect(value.mode).toBe('view')
    })
  })

  describe('mode handling', () => {
    it('should support view mode', () => {
      modal.open(100, 'view')
      const value = get(modal)
      expect(value.mode).toBe('view')
    })

    it('should support edit mode', () => {
      modal.open(200, 'edit')
      const value = get(modal)
      expect(value.mode).toBe('edit')
    })

    it('should support add mode via openNew()', () => {
      modal.openNew()
      const value = get(modal)
      expect(value.mode).toBe('add')
    })

    it('should switch between modes without closing', () => {
      modal.open(123, 'view')
      let value = get(modal)
      expect(value.mode).toBe('view')
      expect(value.isOpen).toBe(true)

      modal.open(123, 'edit')
      value = get(modal)
      expect(value.mode).toBe('edit')
      expect(value.isOpen).toBe(true)
      expect(value.personId).toBe(123)
    })
  })

  describe('reactive behavior', () => {
    it('should trigger reactivity when state changes', () => {
      let updateCount = 0
      const unsubscribe = modal.subscribe(() => {
        updateCount++
      })

      // Initial subscription counts as first update
      expect(updateCount).toBe(1)

      modal.open(111)
      expect(updateCount).toBe(2)

      modal.open(222)
      expect(updateCount).toBe(3)

      modal.close()
      expect(updateCount).toBe(4)

      modal.openNew()
      expect(updateCount).toBe(5)

      unsubscribe()
    })

    it('should allow multiple subscribers', () => {
      let value1, value2
      const unsubscribe1 = modal.subscribe(v => { value1 = v })
      const unsubscribe2 = modal.subscribe(v => { value2 = v })

      modal.open(999, 'edit')

      expect(value1.personId).toBe(999)
      expect(value2.personId).toBe(999)
      expect(value1.mode).toBe('edit')
      expect(value2.mode).toBe('edit')

      unsubscribe1()
      unsubscribe2()
    })
  })

  describe('edge cases', () => {
    it('should handle personId of 0', () => {
      modal.open(0, 'edit')
      const value = get(modal)
      expect(value.personId).toBe(0)
      expect(value.isOpen).toBe(true)
    })

    it('should handle negative personId', () => {
      modal.open(-1, 'edit')
      const value = get(modal)
      expect(value.personId).toBe(-1)
      expect(value.isOpen).toBe(true)
    })

    it('should handle very large personId', () => {
      modal.open(Number.MAX_SAFE_INTEGER, 'edit')
      const value = get(modal)
      expect(value.personId).toBe(Number.MAX_SAFE_INTEGER)
      expect(value.isOpen).toBe(true)
    })

    it('should maintain state consistency across rapid open/close operations', () => {
      for (let i = 0; i < 10; i++) {
        modal.open(i, 'edit')
        if (i % 2 === 0) {
          modal.close()
        }
      }

      const value = get(modal)
      // Last operation was open(9, 'edit')
      expect(value.isOpen).toBe(true)
      expect(value.personId).toBe(9)
      expect(value.mode).toBe('edit')
    })
  })

  describe('integration scenarios', () => {
    it('should support typical workflow: view -> edit -> close', () => {
      // User clicks on person to view
      modal.open(123, 'view')
      let value = get(modal)
      expect(value.isOpen).toBe(true)
      expect(value.personId).toBe(123)
      expect(value.mode).toBe('view')

      // User switches to edit mode
      modal.open(123, 'edit')
      value = get(modal)
      expect(value.mode).toBe('edit')
      expect(value.personId).toBe(123)

      // User closes modal
      modal.close()
      value = get(modal)
      expect(value.isOpen).toBe(false)
    })

    it('should support typical workflow: add new person -> close', () => {
      // User clicks "Add Person" button
      modal.openNew()
      let value = get(modal)
      expect(value.isOpen).toBe(true)
      expect(value.personId).toBe(null)
      expect(value.mode).toBe('add')

      // User closes modal without adding
      modal.close()
      value = get(modal)
      expect(value.isOpen).toBe(false)
    })

    it('should support rapid person switching in pedigree view', () => {
      // User rapidly clicks different people in pedigree
      modal.open(1, 'edit')
      modal.open(2, 'edit')
      modal.open(3, 'edit')

      const value = get(modal)
      expect(value.isOpen).toBe(true)
      expect(value.personId).toBe(3)
      expect(value.mode).toBe('edit')
    })

    it('should handle close and immediate reopen of same person', () => {
      // This was the bug that modalKey workaround was fixing
      modal.open(123, 'edit')
      let value = get(modal)
      expect(value.personId).toBe(123)

      modal.close()
      value = get(modal)
      expect(value.isOpen).toBe(false)

      // Immediately click same person again
      modal.open(123, 'edit')
      value = get(modal)
      expect(value.isOpen).toBe(true)
      expect(value.personId).toBe(123)
      expect(value.mode).toBe('edit')
    })
  })
})
