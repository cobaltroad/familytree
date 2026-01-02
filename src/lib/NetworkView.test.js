/**
 * Tests for NetworkView link preparation
 * Following TDD methodology to identify the bug with fathers appearing as siblings
 */

import { describe, it, expect } from 'vitest'
import { computeSiblingLinks } from './treeHelpers.js'

describe('NetworkView link preparation', () => {
  it('should not create sibling links for parent-child relationships', () => {
    // Scenario: Father and Mother have two children
    // Bug report: Father is erroneously displayed as sibling
    const people = [
      { id: 1, firstName: 'Father', lastName: 'Smith' },
      { id: 2, firstName: 'Mother', lastName: 'Jones' },
      { id: 3, firstName: 'Child1', lastName: 'Smith' },
      { id: 4, firstName: 'Child2', lastName: 'Smith' }
    ]

    // API returns denormalized format: type="mother" or type="father"
    const relationships = [
      { id: 1, person1Id: 1, person2Id: 3, type: 'father', parentRole: 'father' },
      { id: 2, person1Id: 2, person2Id: 3, type: 'mother', parentRole: 'mother' },
      { id: 3, person1Id: 1, person2Id: 4, type: 'father', parentRole: 'father' },
      { id: 4, person1Id: 2, person2Id: 4, type: 'mother', parentRole: 'mother' }
    ]

    // This mimics what NetworkView does in prepareLinks()
    const links = []

    // Add parent-child relationships
    relationships.forEach(rel => {
      if (rel.type === 'mother' || rel.type === 'father') {
        links.push({
          source: rel.person1Id,
          target: rel.person2Id,
          type: rel.type,
          id: rel.id
        })
      }
    })

    // Add computed sibling relationships
    const siblingLinks = computeSiblingLinks(people, relationships)
    siblingLinks.forEach(link => {
      links.push(link)
    })

    // Total links should be:
    // - 4 parent-child links (father->child1, mother->child1, father->child2, mother->child2)
    // - 2 sibling links (child1<->child2 bidirectional)
    // = 6 total links
    expect(links).toHaveLength(6)

    // Verify parent-child links exist
    const parentChildLinks = links.filter(l => l.type === 'mother' || l.type === 'father')
    expect(parentChildLinks).toHaveLength(4)

    // Verify sibling links exist (only between children)
    const siblingLinksFiltered = links.filter(l => l.type === 'sibling')
    expect(siblingLinksFiltered).toHaveLength(2)

    // Verify NO sibling link involves a parent
    const parentIdsInSiblingLinks = siblingLinksFiltered.filter(link =>
      link.source === 1 || link.target === 1 || // Father (ID 1)
      link.source === 2 || link.target === 2    // Mother (ID 2)
    )
    expect(parentIdsInSiblingLinks).toHaveLength(0)
  })

  it('should handle case where father has children from different mothers without creating sibling links between parents', () => {
    // Scenario: Father has children with two different mothers
    // Potential bug: Are the mothers marked as siblings because they share a "common parent" (the father)?
    const people = [
      { id: 1, firstName: 'Father', lastName: 'Smith' },
      { id: 2, firstName: 'Mother1', lastName: 'Jones' },
      { id: 3, firstName: 'Mother2', lastName: 'Williams' },
      { id: 4, firstName: 'Child1', lastName: 'Smith' }, // Father + Mother1
      { id: 5, firstName: 'Child2', lastName: 'Smith' }  // Father + Mother2
    ]

    const relationships = [
      { id: 1, person1Id: 1, person2Id: 4, type: 'father', parentRole: 'father' },
      { id: 2, person1Id: 2, person2Id: 4, type: 'mother', parentRole: 'mother' },
      { id: 3, person1Id: 1, person2Id: 5, type: 'father', parentRole: 'father' },
      { id: 4, person1Id: 3, person2Id: 5, type: 'mother', parentRole: 'mother' }
    ]

    const siblingLinks = computeSiblingLinks(people, relationships)

    // Child1 and Child2 are half-siblings (share father)
    expect(siblingLinks).toHaveLength(2) // Bidirectional

    // Verify the siblings are the children
    expect(siblingLinks).toContainEqual({ source: 4, target: 5, type: 'sibling' })
    expect(siblingLinks).toContainEqual({ source: 5, target: 4, type: 'sibling' })

    // Verify NO sibling link involves the parents
    const parentInvolvedLinks = siblingLinks.filter(link =>
      link.source === 1 || link.target === 1 || // Father
      link.source === 2 || link.target === 2 || // Mother1
      link.source === 3 || link.target === 3    // Mother2
    )
    expect(parentInvolvedLinks).toHaveLength(0)
  })

  it('should ensure sibling links and parent-child links have different keys to avoid D3 confusion', () => {
    // Testing for a potential D3 data binding issue
    // If keys collide, D3 might render the wrong link type
    const people = [
      { id: 1, firstName: 'Father', lastName: 'Smith' },
      { id: 2, firstName: 'Mother', lastName: 'Jones' },
      { id: 3, firstName: 'Child1', lastName: 'Smith' },
      { id: 4, firstName: 'Child2', lastName: 'Smith' }
    ]

    const relationships = [
      { id: 1, person1Id: 1, person2Id: 3, type: 'father', parentRole: 'father' },
      { id: 2, person1Id: 2, person2Id: 3, type: 'mother', parentRole: 'mother' },
      { id: 3, person1Id: 1, person2Id: 4, type: 'father', parentRole: 'father' },
      { id: 4, person1Id: 2, person2Id: 4, type: 'mother', parentRole: 'mother' }
    ]

    const links = []

    // Add parent-child relationships (have IDs)
    relationships.forEach(rel => {
      if (rel.type === 'mother' || rel.type === 'father') {
        links.push({
          source: rel.person1Id,
          target: rel.person2Id,
          type: rel.type,
          id: rel.id
        })
      }
    })

    // Add computed sibling relationships (no IDs)
    const siblingLinks = computeSiblingLinks(people, relationships)
    siblingLinks.forEach(link => {
      links.push(link)
    })

    // Generate D3 keys for each link (mimicking the D3 data binding)
    const keys = links.map((d, i) => d.id || `${d.source}-${d.target}-${i}`)

    // Check for duplicate keys
    const uniqueKeys = new Set(keys)
    expect(keys.length).toBe(uniqueKeys.size) // No duplicate keys

    // Verify parent-child links all have explicit IDs
    const parentChildLinks = links.filter(l => l.type === 'mother' || l.type === 'father')
    parentChildLinks.forEach(link => {
      expect(link.id).toBeDefined()
      expect(typeof link.id).toBe('number')
    })

    // Verify sibling links don't have IDs (they use generated keys)
    const siblingLinksFiltered = links.filter(l => l.type === 'sibling')
    siblingLinksFiltered.forEach(link => {
      expect(link.id).toBeUndefined()
    })
  })
})
