import { describe, it, expect, beforeEach } from 'vitest'
import { get } from 'svelte/store'
import { openPanels, openPanel, closePanel, isPanelOpen } from './panelStore.js'

describe('panelStore', () => {
  beforeEach(() => {
    // Reset store to empty state
    openPanels.set({})
  })

  describe('initial state', () => {
    it('should initialize with empty object', () => {
      const value = get(openPanels)
      expect(value).toEqual({})
      expect(Object.keys(value).length).toBe(0)
    })
  })

  describe('openPanel() function', () => {
    it('should register panel in group', () => {
      openPanel('parents', 'mother')

      const value = get(openPanels)
      expect(value).toEqual({ parents: 'mother' })
    })

    it('should handle multiple groups simultaneously', () => {
      openPanel('parents', 'mother')
      openPanel('spouses', 'spouse')
      openPanel('children', 'child')

      const value = get(openPanels)
      expect(value).toEqual({
        parents: 'mother',
        spouses: 'spouse',
        children: 'child'
      })
    })

    it('should replace panel in same group', () => {
      openPanel('parents', 'mother')
      openPanel('parents', 'father')

      const value = get(openPanels)
      expect(value).toEqual({ parents: 'father' })
    })

    it('should do nothing when groupId is null', () => {
      openPanel(null, 'mother')

      const value = get(openPanels)
      expect(value).toEqual({})
    })

    it('should do nothing when groupId is undefined', () => {
      openPanel(undefined, 'mother')

      const value = get(openPanels)
      expect(value).toEqual({})
    })

    it('should do nothing when groupId is empty string', () => {
      openPanel('', 'mother')

      const value = get(openPanels)
      expect(value).toEqual({})
    })

    it('should handle panelId as null', () => {
      openPanel('parents', null)

      const value = get(openPanels)
      expect(value).toEqual({ parents: null })
    })

    it('should notify subscribers when state changes', () => {
      let capturedValue
      const unsubscribe = openPanels.subscribe(value => {
        capturedValue = value
      })

      openPanel('parents', 'mother')

      expect(capturedValue).toEqual({ parents: 'mother' })

      unsubscribe()
    })
  })

  describe('closePanel() function', () => {
    it('should remove panel from group', () => {
      openPanel('parents', 'mother')
      closePanel('parents')

      const value = get(openPanels)
      expect(value).toEqual({})
    })

    it('should only remove specified group', () => {
      openPanel('parents', 'mother')
      openPanel('spouses', 'spouse')
      closePanel('parents')

      const value = get(openPanels)
      expect(value).toEqual({ spouses: 'spouse' })
    })

    it('should do nothing when groupId is null', () => {
      openPanel('parents', 'mother')
      closePanel(null)

      const value = get(openPanels)
      expect(value).toEqual({ parents: 'mother' })
    })

    it('should do nothing when groupId is undefined', () => {
      openPanel('parents', 'mother')
      closePanel(undefined)

      const value = get(openPanels)
      expect(value).toEqual({ parents: 'mother' })
    })

    it('should do nothing when groupId is empty string', () => {
      openPanel('parents', 'mother')
      closePanel('')

      const value = get(openPanels)
      expect(value).toEqual({ parents: 'mother' })
    })

    it('should do nothing when group does not exist', () => {
      openPanel('parents', 'mother')
      closePanel('nonexistent')

      const value = get(openPanels)
      expect(value).toEqual({ parents: 'mother' })
    })

    it('should notify subscribers when state changes', () => {
      let capturedValue
      openPanel('parents', 'mother')

      const unsubscribe = openPanels.subscribe(value => {
        capturedValue = value
      })

      closePanel('parents')

      expect(capturedValue).toEqual({})

      unsubscribe()
    })
  })

  describe('isPanelOpen() function', () => {
    it('should return true when panel is open in group', () => {
      openPanel('parents', 'mother')

      expect(isPanelOpen('parents', 'mother')).toBe(true)
    })

    it('should return false when panel is not open in group', () => {
      openPanel('parents', 'mother')

      expect(isPanelOpen('parents', 'father')).toBe(false)
    })

    it('should return false when group does not exist', () => {
      expect(isPanelOpen('nonexistent', 'mother')).toBe(false)
    })

    it('should return false when groupId is null', () => {
      openPanel('parents', 'mother')

      expect(isPanelOpen(null, 'mother')).toBe(false)
    })

    it('should return false when panelId is null', () => {
      openPanel('parents', 'mother')

      expect(isPanelOpen('parents', null)).toBe(false)
    })

    it('should handle multiple panels in different groups', () => {
      openPanel('parents', 'mother')
      openPanel('spouses', 'spouse')

      expect(isPanelOpen('parents', 'mother')).toBe(true)
      expect(isPanelOpen('spouses', 'spouse')).toBe(true)
      expect(isPanelOpen('parents', 'father')).toBe(false)
      expect(isPanelOpen('children', 'child')).toBe(false)
    })
  })

  describe('reactive behavior', () => {
    it('should trigger reactivity when panel opens', () => {
      let updateCount = 0
      const unsubscribe = openPanels.subscribe(() => {
        updateCount++
      })

      // Initial subscription counts as first update
      expect(updateCount).toBe(1)

      openPanel('parents', 'mother')
      expect(updateCount).toBe(2)

      openPanel('spouses', 'spouse')
      expect(updateCount).toBe(3)

      unsubscribe()
    })

    it('should trigger reactivity when panel closes', () => {
      let updateCount = 0
      openPanel('parents', 'mother')

      const unsubscribe = openPanels.subscribe(() => {
        updateCount++
      })

      // Initial subscription counts as first update
      expect(updateCount).toBe(1)

      closePanel('parents')
      expect(updateCount).toBe(2)

      unsubscribe()
    })

    it('should allow multiple subscribers', () => {
      let value1, value2
      const unsubscribe1 = openPanels.subscribe(v => { value1 = v })
      const unsubscribe2 = openPanels.subscribe(v => { value2 = v })

      openPanel('parents', 'mother')

      expect(value1).toEqual({ parents: 'mother' })
      expect(value2).toEqual({ parents: 'mother' })

      unsubscribe1()
      unsubscribe2()
    })
  })

  describe('auto-collapse scenarios', () => {
    it('should auto-collapse mother panel when father panel opens (same group)', () => {
      openPanel('parents', 'mother')
      expect(isPanelOpen('parents', 'mother')).toBe(true)

      openPanel('parents', 'father')
      expect(isPanelOpen('parents', 'father')).toBe(true)
      expect(isPanelOpen('parents', 'mother')).toBe(false)
    })

    it('should not collapse spouse panel when parent panel opens (different groups)', () => {
      openPanel('spouses', 'spouse')
      openPanel('parents', 'mother')

      expect(isPanelOpen('spouses', 'spouse')).toBe(true)
      expect(isPanelOpen('parents', 'mother')).toBe(true)
    })

    it('should not collapse children panel when spouse panel opens (different groups)', () => {
      openPanel('children', 'child')
      openPanel('spouses', 'spouse')

      expect(isPanelOpen('children', 'child')).toBe(true)
      expect(isPanelOpen('spouses', 'spouse')).toBe(true)
    })

    it('should handle rapid panel switching in same group', () => {
      openPanel('parents', 'mother')
      openPanel('parents', 'father')
      openPanel('parents', 'mother')
      openPanel('parents', 'father')

      expect(isPanelOpen('parents', 'father')).toBe(true)
      expect(isPanelOpen('parents', 'mother')).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('should handle panelId with special characters', () => {
      openPanel('parents', 'mother-step')

      expect(isPanelOpen('parents', 'mother-step')).toBe(true)
    })

    it('should handle groupId with special characters', () => {
      openPanel('parents-in-law', 'mother')

      expect(isPanelOpen('parents-in-law', 'mother')).toBe(true)
    })

    it('should handle very long groupId and panelId', () => {
      const longGroupId = 'a'.repeat(100)
      const longPanelId = 'b'.repeat(100)

      openPanel(longGroupId, longPanelId)

      expect(isPanelOpen(longGroupId, longPanelId)).toBe(true)
    })

    it('should maintain state consistency across rapid operations', () => {
      for (let i = 0; i < 10; i++) {
        openPanel('parents', i % 2 === 0 ? 'mother' : 'father')
      }

      const value = get(openPanels)
      expect(value).toEqual({ parents: 'father' }) // Last operation was i=9 (odd)
    })
  })

  describe('integration scenarios', () => {
    it('should support typical parent panel workflow', () => {
      // User opens mother panel
      openPanel('parents', 'mother')
      expect(isPanelOpen('parents', 'mother')).toBe(true)
      expect(isPanelOpen('parents', 'father')).toBe(false)

      // User opens father panel (mother auto-collapses)
      openPanel('parents', 'father')
      expect(isPanelOpen('parents', 'father')).toBe(true)
      expect(isPanelOpen('parents', 'mother')).toBe(false)

      // User closes father panel
      closePanel('parents')
      expect(isPanelOpen('parents', 'father')).toBe(false)
      expect(isPanelOpen('parents', 'mother')).toBe(false)
    })

    it('should support multiple independent relationship groups', () => {
      // User opens mother panel
      openPanel('parents', 'mother')

      // User opens spouse panel (independent, should not close mother)
      openPanel('spouses', 'spouse')

      // User opens child panel (independent, should not close mother or spouse)
      openPanel('children', 'child')

      expect(isPanelOpen('parents', 'mother')).toBe(true)
      expect(isPanelOpen('spouses', 'spouse')).toBe(true)
      expect(isPanelOpen('children', 'child')).toBe(true)
    })

    it('should handle modal navigation (all panels should reset)', () => {
      // User opens panels in current modal
      openPanel('parents', 'mother')
      openPanel('spouses', 'spouse')

      // User navigates to different person (simulate by resetting store)
      openPanels.set({})

      expect(get(openPanels)).toEqual({})
      expect(isPanelOpen('parents', 'mother')).toBe(false)
      expect(isPanelOpen('spouses', 'spouse')).toBe(false)
    })
  })
})
