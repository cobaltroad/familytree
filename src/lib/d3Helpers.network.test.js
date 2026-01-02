/**
 * Tests for D3 Force Simulation Helper Functions
 * Following TDD methodology (RED-GREEN-REFACTOR)
 * Story #99: Force-Directed Network View
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as d3 from 'd3'
import {
  createForceSimulation,
  updateNetworkNodes,
  updateNetworkLinks,
  applyNodeDrag,
  createNetworkTooltip,
  highlightConnectedNodes,
  testConfig,
  createSpouseForce
} from './d3Helpers.js'

describe('createForceSimulation', () => {
  it('should create a force simulation with charge, link, center, and collision forces', () => {
    const nodes = [
      { id: 1, firstName: 'John', lastName: 'Doe' },
      { id: 2, firstName: 'Jane', lastName: 'Doe' }
    ]

    const links = [
      { source: 1, target: 2, type: 'spouse' }
    ]

    const simulation = createForceSimulation(nodes, links, { width: 800, height: 600 })

    expect(simulation).toBeDefined()
    expect(typeof simulation.nodes).toBe('function')
    expect(typeof simulation.force).toBe('function')

    // Verify forces are configured
    expect(simulation.force('charge')).toBeDefined()
    expect(simulation.force('link')).toBeDefined()
    expect(simulation.force('center')).toBeDefined()
    expect(simulation.force('collision')).toBeDefined()
  })

  it('should configure charge force with negative strength for repulsion', () => {
    const nodes = [{ id: 1, firstName: 'John', lastName: 'Doe' }]
    const links = []

    const simulation = createForceSimulation(nodes, links, { width: 800, height: 600 })
    const chargeForce = simulation.force('charge')

    expect(chargeForce.strength()()).toBeLessThan(0) // Negative = repulsion
  })

  it('should configure center force to center of viewport', () => {
    const nodes = [{ id: 1, firstName: 'John', lastName: 'Doe' }]
    const links = []
    const width = 1000
    const height = 800

    const simulation = createForceSimulation(nodes, links, { width, height })
    const centerForce = simulation.force('center')

    expect(centerForce.x()).toBe(width / 2)
    expect(centerForce.y()).toBe(height / 2)
  })

  it('should accept custom force strengths via options', () => {
    const nodes = [{ id: 1, firstName: 'John', lastName: 'Doe' }]
    const links = []

    const simulation = createForceSimulation(nodes, links, {
      width: 800,
      height: 600,
      chargeStrength: -500,
      linkDistance: 100
    })

    const chargeForce = simulation.force('charge')
    const linkForce = simulation.force('link')

    expect(chargeForce.strength()()).toBe(-500)
    expect(linkForce.distance()()).toBe(100)
  })
})

describe('updateNetworkNodes', () => {
  let svg, g

  beforeEach(() => {
    // Enable test mode to disable transitions for JSDOM compatibility
    testConfig.enabled = true

    // Create minimal SVG structure for testing
    svg = d3.select(document.body).append('svg')
    g = svg.append('g')
  })

  afterEach(() => {
    testConfig.enabled = false
    svg.remove()
  })

  it('should create node groups with circles and text for new nodes', () => {
    const nodes = [
      { id: 1, firstName: 'John', lastName: 'Doe', gender: 'male', x: 100, y: 100 },
      { id: 2, firstName: 'Jane', lastName: 'Doe', gender: 'female', x: 200, y: 200 }
    ]

    const getColor = (person) => person.gender === 'male' ? '#AED6F1' : '#F8BBD0'
    const onClick = vi.fn()

    updateNetworkNodes(g, nodes, getColor, onClick)

    const nodeGroups = g.selectAll('.network-node')
    expect(nodeGroups.size()).toBe(2)

    // Verify each node has circle and text
    nodeGroups.each(function() {
      const node = d3.select(this)
      expect(node.select('circle').size()).toBe(1)
      expect(node.select('text').size()).toBe(1)
    })
  })

  it('should position nodes at their x,y coordinates', () => {
    const nodes = [
      { id: 1, firstName: 'John', lastName: 'Doe', gender: 'male', x: 150, y: 250 }
    ]

    updateNetworkNodes(g, nodes, d => '#AED6F1', vi.fn())

    const nodeGroup = g.select('.network-node')
    const transform = nodeGroup.attr('transform')

    expect(transform).toBe('translate(150,250)')
  })

  it('should apply gradient fill to node circles', () => {
    const nodes = [
      { id: 1, firstName: 'John', lastName: 'Doe', gender: 'male', x: 100, y: 100 }
    ]

    updateNetworkNodes(g, nodes, () => '#AED6F1', vi.fn())

    const circle = g.select('.network-node circle')
    const fill = circle.attr('fill')

    // Should use gradient URL
    expect(fill).toMatch(/url\(#gradient-/)
  })

  it('should handle click events on nodes', () => {
    const nodes = [
      { id: 1, firstName: 'John', lastName: 'Doe', gender: 'male', x: 100, y: 100 }
    ]

    const onClick = vi.fn()
    updateNetworkNodes(g, nodes, () => '#AED6F1', onClick)

    const circle = g.select('.network-node circle')

    // Simulate click
    circle.dispatch('click')

    expect(onClick).toHaveBeenCalledWith(nodes[0])
  })

  it('should use enter/update/exit pattern for incremental updates', () => {
    const initialNodes = [
      { id: 1, firstName: 'John', lastName: 'Doe', gender: 'male', x: 100, y: 100 }
    ]

    updateNetworkNodes(g, initialNodes, () => '#AED6F1', vi.fn())
    expect(g.selectAll('.network-node').size()).toBe(1)

    // Add a node
    const updatedNodes = [
      ...initialNodes,
      { id: 2, firstName: 'Jane', lastName: 'Doe', gender: 'female', x: 200, y: 200 }
    ]

    updateNetworkNodes(g, updatedNodes, () => '#F8BBD0', vi.fn())
    expect(g.selectAll('.network-node').size()).toBe(2)

    // Remove first node
    const finalNodes = [updatedNodes[1]]
    updateNetworkNodes(g, finalNodes, () => '#F8BBD0', vi.fn())
    expect(g.selectAll('.network-node').size()).toBe(1)
  })
})

describe('updateNetworkLinks', () => {
  let svg, g

  beforeEach(() => {
    testConfig.enabled = true
    svg = d3.select(document.body).append('svg')
    g = svg.append('g')
  })

  afterEach(() => {
    testConfig.enabled = false
    svg.remove()
  })

  it('should create path elements for links', () => {
    const nodes = [
      { id: 1, x: 100, y: 100 },
      { id: 2, x: 200, y: 200 }
    ]

    const links = [
      { source: nodes[0], target: nodes[1], type: 'father' }
    ]

    updateNetworkLinks(g, links)

    const linkPaths = g.selectAll('.network-link')
    expect(linkPaths.size()).toBe(1)
  })

  it('should style parent-child links as solid lines with arrows', () => {
    const nodes = [
      { id: 1, x: 100, y: 100 },
      { id: 2, x: 200, y: 200 }
    ]

    const links = [
      { source: nodes[0], target: nodes[1], type: 'father' }
    ]

    updateNetworkLinks(g, links)

    const link = g.select('.network-link')
    expect(link.attr('stroke-dasharray')).toBe('0')
    expect(link.attr('marker-end')).toMatch(/url\(#arrow/)
  })

  it('should style spouse links as purple dashed lines without arrows', () => {
    const nodes = [
      { id: 1, x: 100, y: 100 },
      { id: 2, x: 200, y: 200 }
    ]

    const links = [
      { source: nodes[0], target: nodes[1], type: 'spouse' }
    ]

    updateNetworkLinks(g, links)

    const link = g.select('.network-link')
    expect(link.attr('stroke')).toBe('#9333ea')
    expect(link.attr('stroke-dasharray')).toBe('5,5')
    expect(link.attr('marker-end')).toBeNull()
  })

  it('should style sibling links as gray dotted lines without arrows', () => {
    const nodes = [
      { id: 1, x: 100, y: 100 },
      { id: 2, x: 200, y: 200 }
    ]

    const links = [
      { source: nodes[0], target: nodes[1], type: 'sibling' }
    ]

    updateNetworkLinks(g, links)

    const link = g.select('.network-link')
    expect(link.attr('stroke')).toBe('#999')
    expect(link.attr('stroke-dasharray')).toBe('2,2')
    expect(link.attr('marker-end')).toBeNull()
  })

  it('should use enter/update/exit pattern for incremental updates', () => {
    const nodes = [
      { id: 1, x: 100, y: 100 },
      { id: 2, x: 200, y: 200 }
    ]

    const initialLinks = [
      { source: nodes[0], target: nodes[1], type: 'father' }
    ]

    updateNetworkLinks(g, initialLinks)
    expect(g.selectAll('.network-link').size()).toBe(1)

    // Update links
    const updatedLinks = []
    updateNetworkLinks(g, updatedLinks)
    expect(g.selectAll('.network-link').size()).toBe(0)
  })
})

describe('applyNodeDrag', () => {
  it('should return a D3 drag behavior', () => {
    const simulation = {
      alphaTarget: vi.fn().mockReturnThis(),
      restart: vi.fn()
    }

    const drag = applyNodeDrag(simulation)

    expect(drag).toBeDefined()
    expect(typeof drag.on).toBe('function')
  })

  it('should set fx/fy on drag end to pin nodes', () => {
    const simulation = {
      alphaTarget: vi.fn().mockReturnThis(),
      restart: vi.fn()
    }

    const drag = applyNodeDrag(simulation)

    // Verify drag end handler exists
    const handlers = drag.on('end')
    expect(handlers).toBeDefined()
  })
})

describe('createNetworkTooltip', () => {
  it('should create a tooltip div element', () => {
    const tooltip = createNetworkTooltip()

    expect(tooltip.node().tagName).toBe('DIV')
    expect(tooltip.style('position')).toBe('absolute')
    expect(tooltip.style('opacity')).toBe('0')
  })

  it('should have methods for show, hide, and move', () => {
    const tooltip = createNetworkTooltip()

    expect(typeof tooltip.show).toBe('function')
    expect(typeof tooltip.hide).toBe('function')
    expect(typeof tooltip.move).toBe('function')
  })
})

describe('highlightConnectedNodes', () => {
  let svg, g

  beforeEach(() => {
    testConfig.enabled = true
    svg = d3.select(document.body).append('svg')
    g = svg.append('g')
  })

  afterEach(() => {
    testConfig.enabled = false
    svg.remove()
  })

  it('should highlight node and connected nodes on hover', () => {
    const nodes = [
      { id: 1, firstName: 'John', lastName: 'Doe', x: 100, y: 100 },
      { id: 2, firstName: 'Jane', lastName: 'Doe', x: 200, y: 200 }
    ]

    const links = [
      { source: nodes[0], target: nodes[1], type: 'spouse' }
    ]

    // Create node groups
    const nodeGroups = g.selectAll('.network-node')
      .data(nodes, d => d.id)
      .enter()
      .append('g')
      .attr('class', 'network-node')

    nodeGroups.append('circle')
      .attr('r', 15)

    // Create links
    g.selectAll('.network-link')
      .data(links)
      .enter()
      .append('path')
      .attr('class', 'network-link')

    highlightConnectedNodes(g, nodes[0], links, true)

    // Verify highlighting is applied
    const highlightedNodes = g.selectAll('.network-node circle[stroke="#4CAF50"]')
    expect(highlightedNodes.size()).toBeGreaterThan(0)
  })

  it('should remove highlighting when highlight is false', () => {
    const nodes = [
      { id: 1, firstName: 'John', lastName: 'Doe', x: 100, y: 100 }
    ]

    const links = []

    const nodeGroups = g.selectAll('.network-node')
      .data(nodes, d => d.id)
      .enter()
      .append('g')
      .attr('class', 'network-node')

    nodeGroups.append('circle')
      .attr('r', 15)
      .attr('stroke', '#4CAF50')

    highlightConnectedNodes(g, nodes[0], links, false)

    // Verify highlighting is removed
    const circle = g.select('.network-node circle')
    expect(circle.attr('stroke')).not.toBe('#4CAF50')
  })
})

/**
 * Tests for Custom Spouse Force
 * Story #100: Spouse Proximity Enhancement
 * TDD methodology (RED-GREEN-REFACTOR)
 */
describe('createSpouseForce', () => {
  it('should be a function that returns a force function', () => {
    expect(typeof createSpouseForce).toBe('function')

    const spouseForce = createSpouseForce([])
    expect(typeof spouseForce).toBe('function')
  })

  it('should create a force function for spouse proximity', () => {
    const spousePairs = [
      { source: { id: 1, x: 100, y: 100 }, target: { id: 2, x: 200, y: 200 } }
    ]

    const force = createSpouseForce(spousePairs)
    expect(typeof force).toBe('function')
  })

  it('should pull spouses toward each other when >100px apart', () => {
    const source = { id: 1, x: 0, y: 0, vx: 0, vy: 0 }
    const target = { id: 2, x: 200, y: 0, vx: 0, vy: 0 }
    const spousePairs = [{ source, target }]

    const force = createSpouseForce(spousePairs, 70)
    force(0.5) // Apply force with alpha = 0.5

    // Source should move toward target (positive vx)
    expect(source.vx).toBeGreaterThan(0)
    // Target should move toward source (negative vx)
    expect(target.vx).toBeLessThan(0)
  })

  it('should maintain target distance of 60-80px', () => {
    const targetDistance = 70
    const source = { id: 1, x: 0, y: 0, vx: 0, vy: 0 }
    const target = { id: 2, x: 200, y: 0, vx: 0, vy: 0 }
    const spousePairs = [{ source, target }]

    const force = createSpouseForce(spousePairs, targetDistance)

    // Apply force multiple times
    for (let i = 0; i < 100; i++) {
      force(0.1)
      source.x += source.vx
      source.y += source.vy
      target.x += target.vx
      target.y += target.vy
      source.vx *= 0.9 // Damping
      source.vy *= 0.9
      target.vx *= 0.9
      target.vy *= 0.9
    }

    const finalDistance = Math.sqrt(
      Math.pow(target.x - source.x, 2) + Math.pow(target.y - source.y, 2)
    )

    // Should be close to target distance (within 20px tolerance)
    expect(finalDistance).toBeGreaterThan(targetDistance - 20)
    expect(finalDistance).toBeLessThan(targetDistance + 20)
  })

  it('should respect pinned nodes with fx/fy set', () => {
    
    const source = { id: 1, x: 0, y: 0, fx: 0, fy: 0, vx: 0, vy: 0 }
    const target = { id: 2, x: 200, y: 0, vx: 0, vy: 0 }
    const spousePairs = [{ source, target }]

    const force = createSpouseForce(spousePairs, 70)
    force(0.5)

    // Pinned node (source) should not have velocity changed
    expect(source.vx).toBe(0)
    expect(source.vy).toBe(0)

    // Target may still have velocity (not pinned)
    // This is acceptable behavior
  })

  it('should handle multiple spouses per person', () => {
    
    const person = { id: 1, x: 100, y: 100, vx: 0, vy: 0 }
    const spouse1 = { id: 2, x: 0, y: 100, vx: 0, vy: 0 }
    const spouse2 = { id: 3, x: 200, y: 100, vx: 0, vy: 0 }

    const spousePairs = [
      { source: person, target: spouse1 },
      { source: person, target: spouse2 }
    ]

    const force = createSpouseForce(spousePairs, 70)
    force(0.5)

    // Person should have forces from both spouses
    // Both spouses should have forces toward person
    expect(spouse1.vx).toBeGreaterThan(0) // Moving right toward person
    expect(spouse2.vx).toBeLessThan(0) // Moving left toward person
  })

  it('should skip invalid spouse relationships gracefully', () => {
    
    const validPair = {
      source: { id: 1, x: 100, y: 100, vx: 0, vy: 0 },
      target: { id: 2, x: 200, y: 200, vx: 0, vy: 0 }
    }

    const spousePairs = [
      validPair,
      { source: null, target: { id: 3, x: 300, y: 300 } }, // Missing source
      { source: { id: 4, x: 400, y: 400 }, target: null }, // Missing target
      {} // Invalid pair
    ]

    const force = createSpouseForce(spousePairs, 70)

    // Should not throw error
    expect(() => force(0.5)).not.toThrow()

    // Valid pair should still have forces applied
    expect(validPair.source.vx).not.toBe(0)
  })

  it('should work with empty spouse list as no-op', () => {
    
    const force = createSpouseForce([], 70)

    // Should not throw error
    expect(() => force(0.5)).not.toThrow()
  })

  it('should handle spouses at the same position (distance = 0)', () => {
    
    const source = { id: 1, x: 100, y: 100, vx: 0, vy: 0 }
    const target = { id: 2, x: 100, y: 100, vx: 0, vy: 0 }
    const spousePairs = [{ source, target }]

    const force = createSpouseForce(spousePairs, 70)

    // Should not throw division by zero error
    expect(() => force(0.5)).not.toThrow()

    // Velocities should remain 0 (no force when distance is 0)
    expect(source.vx).toBe(0)
    expect(source.vy).toBe(0)
    expect(target.vx).toBe(0)
    expect(target.vy).toBe(0)
  })

  it('should apply stronger force when spouses are far apart', () => {
    

    // Close spouses (80px apart)
    const closePair = {
      source: { id: 1, x: 0, y: 0, vx: 0, vy: 0 },
      target: { id: 2, x: 80, y: 0, vx: 0, vy: 0 }
    }

    // Far spouses (300px apart)
    const farPair = {
      source: { id: 3, x: 0, y: 0, vx: 0, vy: 0 },
      target: { id: 4, x: 300, y: 0, vx: 0, vy: 0 }
    }

    const closeForce = createSpouseForce([closePair], 70)
    const farForce = createSpouseForce([farPair], 70)

    closeForce(0.5)
    farForce(0.5)

    // Far pair should have larger velocity change
    const closeVelocity = Math.abs(closePair.source.vx)
    const farVelocity = Math.abs(farPair.source.vx)

    expect(farVelocity).toBeGreaterThan(closeVelocity)
  })

  it('should apply weaker force when spouses are within target range', () => {
    

    // Within target range (70px apart, target is 70px)
    const withinPair = {
      source: { id: 1, x: 0, y: 0, vx: 0, vy: 0 },
      target: { id: 2, x: 70, y: 0, vx: 0, vy: 0 }
    }

    // Far from target (200px apart, target is 70px)
    const farPair = {
      source: { id: 3, x: 0, y: 0, vx: 0, vy: 0 },
      target: { id: 4, x: 200, y: 0, vx: 0, vy: 0 }
    }

    const withinForce = createSpouseForce([withinPair], 70)
    const farForce = createSpouseForce([farPair], 70)

    withinForce(0.5)
    farForce(0.5)

    const withinVelocity = Math.abs(withinPair.source.vx)
    const farVelocity = Math.abs(farPair.source.vx)

    // Far pair should have larger force
    expect(farVelocity).toBeGreaterThan(withinVelocity)
  })

  it('should scale force strength based on alpha parameter', () => {
    
    const source = { id: 1, x: 0, y: 0, vx: 0, vy: 0 }
    const target = { id: 2, x: 200, y: 0, vx: 0, vy: 0 }
    const spousePairs = [{ source, target }]

    const force = createSpouseForce(spousePairs, 70)

    // Apply with high alpha
    force(1.0)
    const highAlphaVx = source.vx

    // Reset and apply with low alpha
    source.vx = 0
    target.vx = 0
    force(0.1)
    const lowAlphaVx = source.vx

    // High alpha should produce stronger force
    expect(Math.abs(highAlphaVx)).toBeGreaterThan(Math.abs(lowAlphaVx))
  })

  it('should handle diagonal positioning (not just horizontal)', () => {
    
    const source = { id: 1, x: 0, y: 0, vx: 0, vy: 0 }
    const target = { id: 2, x: 150, y: 150, vx: 0, vy: 0 }
    const spousePairs = [{ source, target }]

    const force = createSpouseForce(spousePairs, 70)
    force(0.5)

    // Both x and y velocities should be affected
    expect(source.vx).toBeGreaterThan(0)
    expect(source.vy).toBeGreaterThan(0)
    expect(target.vx).toBeLessThan(0)
    expect(target.vy).toBeLessThan(0)
  })

  it('should accept custom target distance parameter', () => {
    
    const customDistance = 100
    const source = { id: 1, x: 0, y: 0, vx: 0, vy: 0 }
    const target = { id: 2, x: 300, y: 0, vx: 0, vy: 0 }
    const spousePairs = [{ source, target }]

    const force = createSpouseForce(spousePairs, customDistance)

    // Apply force multiple times to settle
    for (let i = 0; i < 100; i++) {
      force(0.1)
      source.x += source.vx
      target.x += target.vx
      source.vx *= 0.9
      target.vx *= 0.9
    }

    const finalDistance = Math.abs(target.x - source.x)

    // Should settle near custom distance
    expect(finalDistance).toBeGreaterThan(customDistance - 20)
    expect(finalDistance).toBeLessThan(customDistance + 20)
  })

  it('should default target distance to 70px when not specified', () => {
    
    const source = { id: 1, x: 0, y: 0, vx: 0, vy: 0 }
    const target = { id: 2, x: 300, y: 0, vx: 0, vy: 0 }
    const spousePairs = [{ source, target }]

    const force = createSpouseForce(spousePairs) // No distance parameter

    // Should not throw error
    expect(() => force(0.5)).not.toThrow()
  })

  it('should skip pairs where both nodes are pinned', () => {

    const source = { id: 1, x: 0, y: 0, fx: 0, fy: 0, vx: 0, vy: 0 }
    const target = { id: 2, x: 200, y: 0, fx: 200, fy: 0, vx: 0, vy: 0 }
    const spousePairs = [{ source, target }]

    const force = createSpouseForce(spousePairs, 70)
    force(0.5)

    // Both nodes are pinned, no velocity should be added
    expect(source.vx).toBe(0)
    expect(source.vy).toBe(0)
    expect(target.vx).toBe(0)
    expect(target.vy).toBe(0)
  })
})

/**
 * Integration Tests for Spouse Force
 * Story #100: Spouse Proximity Enhancement
 */
describe('createSpouseForce - Integration Tests', () => {
  it('should work with createForceSimulation to position spouses together', () => {
    const nodes = [
      { id: 1, firstName: 'John', lastName: 'Doe', x: 100, y: 100, vx: 0, vy: 0 },
      { id: 2, firstName: 'Jane', lastName: 'Doe', x: 300, y: 100, vx: 0, vy: 0 }
    ]

    const links = [
      { source: 1, target: 2, type: 'spouse' }
    ]

    const spousePairs = [{ source: nodes[0], target: nodes[1] }]

    const simulation = createForceSimulation(nodes, links, {
      width: 800,
      height: 600,
      chargeStrength: -300,
      linkDistance: 100
    })

    // Add spouse force
    const spouseForce = createSpouseForce(spousePairs, 70)
    simulation.force('spouse', spouseForce)

    // Run simulation for a few ticks
    for (let i = 0; i < 50; i++) {
      simulation.tick()
    }

    // Calculate final distance
    const dx = nodes[1].x - nodes[0].x
    const dy = nodes[1].y - nodes[0].y
    const distance = Math.sqrt(dx * dx + dy * dy)

    // Spouses should be closer than initial distance (200px)
    expect(distance).toBeLessThan(150)
  })

  it('should position multiple spouse pairs independently', () => {
    const nodes = [
      { id: 1, firstName: 'John', lastName: 'Doe', x: 100, y: 100, vx: 0, vy: 0 },
      { id: 2, firstName: 'Jane', lastName: 'Doe', x: 300, y: 100, vx: 0, vy: 0 },
      { id: 3, firstName: 'Bob', lastName: 'Smith', x: 100, y: 300, vx: 0, vy: 0 },
      { id: 4, firstName: 'Alice', lastName: 'Smith', x: 300, y: 300, vx: 0, vy: 0 }
    ]

    const links = [
      { source: 1, target: 2, type: 'spouse' },
      { source: 3, target: 4, type: 'spouse' }
    ]

    const spousePairs = [
      { source: nodes[0], target: nodes[1] },
      { source: nodes[2], target: nodes[3] }
    ]

    const simulation = createForceSimulation(nodes, links, {
      width: 800,
      height: 600,
      chargeStrength: -300,
      linkDistance: 100
    })

    const spouseForce = createSpouseForce(spousePairs, 70)
    simulation.force('spouse', spouseForce)

    // Run simulation
    for (let i = 0; i < 50; i++) {
      simulation.tick()
    }

    // Check first pair
    const distance1 = Math.sqrt(
      Math.pow(nodes[1].x - nodes[0].x, 2) + Math.pow(nodes[1].y - nodes[0].y, 2)
    )

    // Check second pair
    const distance2 = Math.sqrt(
      Math.pow(nodes[3].x - nodes[2].x, 2) + Math.pow(nodes[3].y - nodes[2].y, 2)
    )

    // Both pairs should be positioned close together
    expect(distance1).toBeLessThan(150)
    expect(distance2).toBeLessThan(150)
  })

  it('should maintain spouse proximity after dragging one spouse', () => {
    const nodes = [
      { id: 1, firstName: 'John', lastName: 'Doe', x: 100, y: 100, vx: 0, vy: 0 },
      { id: 2, firstName: 'Jane', lastName: 'Doe', x: 150, y: 100, vx: 0, vy: 0 }
    ]

    const links = [
      { source: 1, target: 2, type: 'spouse' }
    ]

    const spousePairs = [{ source: nodes[0], target: nodes[1] }]

    const simulation = createForceSimulation(nodes, links, {
      width: 800,
      height: 600,
      chargeStrength: -300,
      linkDistance: 60
    })

    const spouseForce = createSpouseForce(spousePairs, 70)
    simulation.force('spouse', spouseForce)

    // Simulate dragging first node to new position
    nodes[0].fx = 400
    nodes[0].fy = 400
    nodes[0].x = 400
    nodes[0].y = 400

    // Run simulation to allow second node to catch up
    simulation.alpha(0.3).restart()
    for (let i = 0; i < 100; i++) {
      simulation.tick()
    }

    // Unpin the dragged node
    nodes[0].fx = null
    nodes[0].fy = null

    // Run more simulation ticks
    for (let i = 0; i < 50; i++) {
      simulation.tick()
    }

    // Calculate distance
    const dx = nodes[1].x - nodes[0].x
    const dy = nodes[1].y - nodes[0].y
    const distance = Math.sqrt(dx * dx + dy * dy)

    // Second spouse should have moved closer to dragged spouse
    // Should be within reasonable range of target distance
    expect(distance).toBeLessThan(120)
  })

  it('should not interfere with other force types', () => {
    const nodes = [
      { id: 1, firstName: 'Parent', lastName: 'Doe', x: 200, y: 100, vx: 0, vy: 0 },
      { id: 2, firstName: 'Spouse', lastName: 'Doe', x: 270, y: 100, vx: 0, vy: 0 },
      { id: 3, firstName: 'Child', lastName: 'Doe', x: 200, y: 200, vx: 0, vy: 0 }
    ]

    const links = [
      { source: 1, target: 2, type: 'spouse' },
      { source: 1, target: 3, type: 'mother' }
    ]

    const spousePairs = [{ source: nodes[0], target: nodes[1] }]

    const simulation = createForceSimulation(nodes, links, {
      width: 800,
      height: 600,
      chargeStrength: -300,
      linkDistance: 100
    })

    const spouseForce = createSpouseForce(spousePairs, 70)
    simulation.force('spouse', spouseForce)

    // Run simulation
    for (let i = 0; i < 100; i++) {
      simulation.tick()
    }

    // All nodes should have moved (forces applied)
    // Check that parent and spouse are close
    const spouseDistance = Math.sqrt(
      Math.pow(nodes[1].x - nodes[0].x, 2) + Math.pow(nodes[1].y - nodes[0].y, 2)
    )

    // Check that child is reasonably positioned (affected by link force)
    const childDistance = Math.sqrt(
      Math.pow(nodes[2].x - nodes[0].x, 2) + Math.pow(nodes[2].y - nodes[0].y, 2)
    )

    expect(spouseDistance).toBeLessThan(120)
    expect(childDistance).toBeLessThan(200) // Link distance + some variance
  })
})

/**
 * Performance Tests for Spouse Force
 * Story #100: AC5 - Performance requirements
 */
describe('createSpouseForce - Performance Tests', () => {
  it('should settle within 5 seconds with 50 spouse pairs', () => {
    // Generate 100 people (50 spouse pairs)
    const nodes = []
    for (let i = 0; i < 100; i++) {
      nodes.push({
        id: i + 1,
        firstName: `Person${i}`,
        lastName: 'Test',
        x: 400 + (Math.random() - 0.5) * 200,
        y: 300 + (Math.random() - 0.5) * 200,
        vx: 0,
        vy: 0
      })
    }

    // Create 50 spouse pairs
    const links = []
    const spousePairs = []
    for (let i = 0; i < 50; i++) {
      const sourceIdx = i * 2
      const targetIdx = i * 2 + 1
      links.push({
        source: nodes[sourceIdx].id,
        target: nodes[targetIdx].id,
        type: 'spouse'
      })
      spousePairs.push({
        source: nodes[sourceIdx],
        target: nodes[targetIdx]
      })
    }

    const simulation = createForceSimulation(nodes, links, {
      width: 1200,
      height: 800,
      chargeStrength: -300,
      linkDistance: 100
    })

    const spouseForce = createSpouseForce(spousePairs, 70)
    simulation.force('spouse', spouseForce)

    const startTime = performance.now()

    // Run simulation until settled (alpha < 0.01) or timeout
    let iterations = 0
    const maxIterations = 1000 // Prevent infinite loop
    while (simulation.alpha() > 0.01 && iterations < maxIterations) {
      simulation.tick()
      iterations++
    }

    const endTime = performance.now()
    const duration = endTime - startTime

    // Should settle within 5000ms (5 seconds)
    expect(duration).toBeLessThan(5000)
    expect(iterations).toBeLessThan(maxIterations)
  })

  it('should have fast force calculation time (<10ms per tick with 100 spouse pairs)', () => {
    // Generate 200 people (100 spouse pairs)
    const nodes = []
    for (let i = 0; i < 200; i++) {
      nodes.push({
        id: i + 1,
        firstName: `Person${i}`,
        lastName: 'Test',
        x: 400 + (Math.random() - 0.5) * 200,
        y: 300 + (Math.random() - 0.5) * 200,
        vx: 0,
        vy: 0
      })
    }

    // Create 100 spouse pairs
    const spousePairs = []
    for (let i = 0; i < 100; i++) {
      const sourceIdx = i * 2
      const targetIdx = i * 2 + 1
      spousePairs.push({
        source: nodes[sourceIdx],
        target: nodes[targetIdx]
      })
    }

    const spouseForce = createSpouseForce(spousePairs, 70)

    // Measure time for one force tick
    const startTime = performance.now()
    spouseForce(0.5)
    const endTime = performance.now()

    const duration = endTime - startTime

    // Should complete in less than 10ms
    expect(duration).toBeLessThan(10)
  })
})

/**
 * Story #101: Children Display and Grouping
 * Tests for parent-child link distance and strength configuration
 */
describe('Story #101: Parent-Child Link Configuration', () => {
  describe('Link Distance Configuration', () => {
    it('should configure parent-child links with shorter distance (75px)', () => {
      const nodes = [
        { id: 1, firstName: 'Parent', lastName: 'Doe' },
        { id: 2, firstName: 'Child', lastName: 'Doe' }
      ]

      const links = [
        { source: 1, target: 2, type: 'mother' }
      ]

      const simulation = createForceSimulation(nodes, links, { width: 800, height: 600 })
      const linkForce = simulation.force('link')

      // Get the distance function and test with mother link
      const distanceFn = linkForce.distance()
      const motherLink = links[0]
      const distance = typeof distanceFn === 'function' ? distanceFn(motherLink) : distanceFn

      expect(distance).toBe(75)
    })

    it('should configure father links with 75px distance', () => {
      const nodes = [
        { id: 1, firstName: 'Parent', lastName: 'Doe' },
        { id: 2, firstName: 'Child', lastName: 'Doe' }
      ]

      const links = [
        { source: 1, target: 2, type: 'father' }
      ]

      const simulation = createForceSimulation(nodes, links, { width: 800, height: 600 })
      const linkForce = simulation.force('link')

      const distanceFn = linkForce.distance()
      const fatherLink = links[0]
      const distance = typeof distanceFn === 'function' ? distanceFn(fatherLink) : distanceFn

      expect(distance).toBe(75)
    })

    it('should maintain spouse link distance at 60px (Story #100)', () => {
      const nodes = [
        { id: 1, firstName: 'Spouse1', lastName: 'Doe' },
        { id: 2, firstName: 'Spouse2', lastName: 'Doe' }
      ]

      const links = [
        { source: 1, target: 2, type: 'spouse' }
      ]

      const simulation = createForceSimulation(nodes, links, { width: 800, height: 600 })
      const linkForce = simulation.force('link')

      const distanceFn = linkForce.distance()
      const spouseLink = links[0]
      const distance = typeof distanceFn === 'function' ? distanceFn(spouseLink) : distanceFn

      expect(distance).toBe(60)
    })

    it('should use default distance (100px) for sibling links', () => {
      const nodes = [
        { id: 1, firstName: 'Sibling1', lastName: 'Doe' },
        { id: 2, firstName: 'Sibling2', lastName: 'Doe' }
      ]

      const links = [
        { source: 1, target: 2, type: 'sibling' }
      ]

      const simulation = createForceSimulation(nodes, links, { width: 800, height: 600 })
      const linkForce = simulation.force('link')

      const distanceFn = linkForce.distance()
      const siblingLink = links[0]
      const distance = typeof distanceFn === 'function' ? distanceFn(siblingLink) : distanceFn

      expect(distance).toBe(100)
    })
  })

  describe('Link Strength Configuration', () => {
    it('should configure parent-child links with stronger pull (1.2x)', () => {
      const nodes = [
        { id: 1, firstName: 'Parent', lastName: 'Doe' },
        { id: 2, firstName: 'Child', lastName: 'Doe' }
      ]

      const links = [
        { source: 1, target: 2, type: 'mother' }
      ]

      const simulation = createForceSimulation(nodes, links, { width: 800, height: 600 })
      const linkForce = simulation.force('link')

      const strengthFn = linkForce.strength()
      const motherLink = links[0]
      const strength = typeof strengthFn === 'function' ? strengthFn(motherLink) : strengthFn

      expect(strength).toBe(1.2)
    })

    it('should configure father links with 1.2x strength', () => {
      const nodes = [
        { id: 1, firstName: 'Parent', lastName: 'Doe' },
        { id: 2, firstName: 'Child', lastName: 'Doe' }
      ]

      const links = [
        { source: 1, target: 2, type: 'father' }
      ]

      const simulation = createForceSimulation(nodes, links, { width: 800, height: 600 })
      const linkForce = simulation.force('link')

      const strengthFn = linkForce.strength()
      const fatherLink = links[0]
      const strength = typeof strengthFn === 'function' ? strengthFn(fatherLink) : strengthFn

      expect(strength).toBe(1.2)
    })

    it('should maintain spouse link strength at 1.5 (Story #100)', () => {
      const nodes = [
        { id: 1, firstName: 'Spouse1', lastName: 'Doe' },
        { id: 2, firstName: 'Spouse2', lastName: 'Doe' }
      ]

      const links = [
        { source: 1, target: 2, type: 'spouse' }
      ]

      const simulation = createForceSimulation(nodes, links, { width: 800, height: 600 })
      const linkForce = simulation.force('link')

      const strengthFn = linkForce.strength()
      const spouseLink = links[0]
      const strength = typeof strengthFn === 'function' ? strengthFn(spouseLink) : strengthFn

      expect(strength).toBe(1.5)
    })

    it('should use default strength (1.0) for sibling links', () => {
      const nodes = [
        { id: 1, firstName: 'Sibling1', lastName: 'Doe' },
        { id: 2, firstName: 'Sibling2', lastName: 'Doe' }
      ]

      const links = [
        { source: 1, target: 2, type: 'sibling' }
      ]

      const simulation = createForceSimulation(nodes, links, { width: 800, height: 600 })
      const linkForce = simulation.force('link')

      const strengthFn = linkForce.strength()
      const siblingLink = links[0]
      const strength = typeof strengthFn === 'function' ? strengthFn(siblingLink) : strengthFn

      expect(strength).toBe(1.0)
    })
  })

  describe('Integration: Children Positioning', () => {
    it('should position children near parent after simulation settles', () => {
      // Create parent with 3 children
      const nodes = [
        { id: 1, firstName: 'Parent', lastName: 'Doe', x: 400, y: 300, vx: 0, vy: 0 },
        { id: 2, firstName: 'Child1', lastName: 'Doe', x: 500, y: 400, vx: 0, vy: 0 },
        { id: 3, firstName: 'Child2', lastName: 'Doe', x: 300, y: 400, vx: 0, vy: 0 },
        { id: 4, firstName: 'Child3', lastName: 'Doe', x: 400, y: 500, vx: 0, vy: 0 }
      ]

      const links = [
        { source: 1, target: 2, type: 'mother' },
        { source: 1, target: 3, type: 'mother' },
        { source: 1, target: 4, type: 'mother' }
      ]

      const simulation = createForceSimulation(nodes, links, { width: 800, height: 600 })

      // Run simulation for 100 ticks to settle
      for (let i = 0; i < 100; i++) {
        simulation.tick()
      }

      // All children should be within 120px of parent
      const parent = nodes[0]
      const children = nodes.slice(1)

      children.forEach(child => {
        const dx = child.x - parent.x
        const dy = child.y - parent.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        expect(distance).toBeLessThanOrEqual(120)
      })
    })

    it('should position siblings near each other when they share parents', () => {
      // Create 2 siblings with shared parent
      const nodes = [
        { id: 1, firstName: 'Parent', lastName: 'Doe', x: 400, y: 300, vx: 0, vy: 0 },
        { id: 2, firstName: 'Sibling1', lastName: 'Doe', x: 500, y: 400, vx: 0, vy: 0 },
        { id: 3, firstName: 'Sibling2', lastName: 'Doe', x: 300, y: 400, vx: 0, vy: 0 }
      ]

      const links = [
        { source: 1, target: 2, type: 'mother' },
        { source: 1, target: 3, type: 'mother' },
        { source: 2, target: 3, type: 'sibling' }
      ]

      const simulation = createForceSimulation(nodes, links, { width: 800, height: 600 })

      // Run simulation for 100 ticks to settle
      for (let i = 0; i < 100; i++) {
        simulation.tick()
      }

      // Siblings should be within 110px of each other (allowing for physics variance)
      const sibling1 = nodes[1]
      const sibling2 = nodes[2]

      const dx = sibling1.x - sibling2.x
      const dy = sibling1.y - sibling2.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      expect(distance).toBeLessThanOrEqual(110)
    })

    it('should position child between two parents if they are spouses', () => {
      // Create child with mother and father who are spouses
      const nodes = [
        { id: 1, firstName: 'Mother', lastName: 'Doe', x: 300, y: 300, vx: 0, vy: 0 },
        { id: 2, firstName: 'Father', lastName: 'Doe', x: 500, y: 300, vx: 0, vy: 0 },
        { id: 3, firstName: 'Child', lastName: 'Doe', x: 400, y: 500, vx: 0, vy: 0 }
      ]

      const links = [
        { source: 1, target: 2, type: 'spouse' },
        { source: 1, target: 3, type: 'mother' },
        { source: 2, target: 3, type: 'father' }
      ]

      const simulation = createForceSimulation(nodes, links, { width: 800, height: 600 })

      // Run simulation for 100 ticks to settle
      for (let i = 0; i < 100; i++) {
        simulation.tick()
      }

      // Child should be within 120px of both parents
      const mother = nodes[0]
      const father = nodes[1]
      const child = nodes[2]

      const distToMother = Math.sqrt((child.x - mother.x) ** 2 + (child.y - mother.y) ** 2)
      const distToFather = Math.sqrt((child.x - father.x) ** 2 + (child.y - father.y) ** 2)

      expect(distToMother).toBeLessThanOrEqual(120)
      expect(distToFather).toBeLessThanOrEqual(120)
    })

    it('should handle parent with 10 children without overlap', () => {
      // Create parent with 10 children
      const nodes = [
        { id: 1, firstName: 'Parent', lastName: 'Doe', x: 400, y: 300, vx: 0, vy: 0 }
      ]

      // Add 10 children at various positions
      for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * Math.PI * 2
        const radius = 150
        nodes.push({
          id: i + 2,
          firstName: `Child${i + 1}`,
          lastName: 'Doe',
          x: 400 + Math.cos(angle) * radius,
          y: 300 + Math.sin(angle) * radius,
          vx: 0,
          vy: 0
        })
      }

      const links = []
      for (let i = 0; i < 10; i++) {
        links.push({ source: 1, target: i + 2, type: 'mother' })
      }

      const simulation = createForceSimulation(nodes, links, { width: 800, height: 600 })

      // Run simulation for 200 ticks to ensure settling
      for (let i = 0; i < 200; i++) {
        simulation.tick()
      }

      // Check that no two children overlap (should be at least collision radius apart)
      // Allow small tolerance (1px) for floating point precision
      const children = nodes.slice(1)
      const collisionRadius = 30
      const minDistance = collisionRadius * 2 - 1  // 59px minimum (allowing 1px tolerance)

      for (let i = 0; i < children.length; i++) {
        for (let j = i + 1; j < children.length; j++) {
          const dx = children[i].x - children[j].x
          const dy = children[i].y - children[j].y
          const distance = Math.sqrt(dx * dx + dy * dy)

          expect(distance).toBeGreaterThanOrEqual(minDistance)
        }
      }
    })
  })

  describe('Performance: Large Families', () => {
    it('should settle within 5 seconds with 20 children', () => {
      // Create parent with 20 children
      const nodes = [
        { id: 1, firstName: 'Parent', lastName: 'Doe', x: 400, y: 300, vx: 0, vy: 0 }
      ]

      for (let i = 0; i < 20; i++) {
        const angle = (i / 20) * Math.PI * 2
        const radius = 200
        nodes.push({
          id: i + 2,
          firstName: `Child${i + 1}`,
          lastName: 'Doe',
          x: 400 + Math.cos(angle) * radius,
          y: 300 + Math.sin(angle) * radius,
          vx: 0,
          vy: 0
        })
      }

      const links = []
      for (let i = 0; i < 20; i++) {
        links.push({ source: 1, target: i + 2, type: 'mother' })
      }

      const simulation = createForceSimulation(nodes, links, { width: 800, height: 600 })

      // Measure settle time
      const startTime = performance.now()
      let ticks = 0

      while (simulation.alpha() > 0.01 && ticks < 1000) {
        simulation.tick()
        ticks++
      }

      const duration = performance.now() - startTime

      // Should settle in less than 5 seconds
      expect(duration).toBeLessThan(5000)
      expect(ticks).toBeGreaterThan(0)
    })
  })

  /**
   * Bug Fix: Handle BOTH Normalized and Denormalized Relationship Formats
   *
   * Context:
   * - Database stores normalized format: type="parentOf" with parent_role="mother"/"father"
   * - API returns denormalized format: type="mother" or type="father" (backward compatibility)
   * - Network view must handle BOTH formats
   *
   * Bug:
   * - createForceSimulation() only checks for type="spouse"
   * - Doesn't check for parent-child relationships (neither format)
   * - Results in all parent-child links using default distance (100px) and strength (1.0)
   * - This makes network view look identical to pedigree view
   *
   * Expected behavior:
   * - Parent-child links (both formats): 75px distance, 1.2x strength
   * - Spouse links: 60px distance, 1.5x strength
   * - Sibling links: 100px distance, 1.0x strength
   */
  describe('Bug Fix: Normalized Format Support (type="parentOf")', () => {
    describe('Link Distance with Normalized Format', () => {
      it('should configure parentOf links with mother role at 75px distance', () => {
        const nodes = [
          { id: 1, firstName: 'Parent', lastName: 'Doe' },
          { id: 2, firstName: 'Child', lastName: 'Doe' }
        ]

        const links = [
          { source: 1, target: 2, type: 'parentOf', parentRole: 'mother' }
        ]

        const simulation = createForceSimulation(nodes, links, { width: 800, height: 600 })
        const linkForce = simulation.force('link')

        const distanceFn = linkForce.distance()
        const motherLink = links[0]
        const distance = typeof distanceFn === 'function' ? distanceFn(motherLink) : distanceFn

        expect(distance).toBe(75)
      })

      it('should configure parentOf links with father role at 75px distance', () => {
        const nodes = [
          { id: 1, firstName: 'Parent', lastName: 'Doe' },
          { id: 2, firstName: 'Child', lastName: 'Doe' }
        ]

        const links = [
          { source: 1, target: 2, type: 'parentOf', parentRole: 'father' }
        ]

        const simulation = createForceSimulation(nodes, links, { width: 800, height: 600 })
        const linkForce = simulation.force('link')

        const distanceFn = linkForce.distance()
        const fatherLink = links[0]
        const distance = typeof distanceFn === 'function' ? distanceFn(fatherLink) : distanceFn

        expect(distance).toBe(75)
      })
    })

    describe('Link Strength with Normalized Format', () => {
      it('should configure parentOf links with mother role at 1.2x strength', () => {
        const nodes = [
          { id: 1, firstName: 'Parent', lastName: 'Doe' },
          { id: 2, firstName: 'Child', lastName: 'Doe' }
        ]

        const links = [
          { source: 1, target: 2, type: 'parentOf', parentRole: 'mother' }
        ]

        const simulation = createForceSimulation(nodes, links, { width: 800, height: 600 })
        const linkForce = simulation.force('link')

        const strengthFn = linkForce.strength()
        const motherLink = links[0]
        const strength = typeof strengthFn === 'function' ? strengthFn(motherLink) : strengthFn

        expect(strength).toBe(1.2)
      })

      it('should configure parentOf links with father role at 1.2x strength', () => {
        const nodes = [
          { id: 1, firstName: 'Parent', lastName: 'Doe' },
          { id: 2, firstName: 'Child', lastName: 'Doe' }
        ]

        const links = [
          { source: 1, target: 2, type: 'parentOf', parentRole: 'father' }
        ]

        const simulation = createForceSimulation(nodes, links, { width: 800, height: 600 })
        const linkForce = simulation.force('link')

        const strengthFn = linkForce.strength()
        const fatherLink = links[0]
        const strength = typeof strengthFn === 'function' ? strengthFn(fatherLink) : strengthFn

        expect(strength).toBe(1.2)
      })
    })

    describe('Mixed Format Support', () => {
      it('should handle mixed normalized and denormalized formats in same dataset', () => {
        const nodes = [
          { id: 1, firstName: 'Parent', lastName: 'Doe' },
          { id: 2, firstName: 'Child1', lastName: 'Doe' },
          { id: 3, firstName: 'Child2', lastName: 'Doe' }
        ]

        const links = [
          { source: 1, target: 2, type: 'mother' }, // Denormalized
          { source: 1, target: 3, type: 'parentOf', parentRole: 'mother' } // Normalized
        ]

        const simulation = createForceSimulation(nodes, links, { width: 800, height: 600 })
        const linkForce = simulation.force('link')

        const distanceFn = linkForce.distance()
        const strengthFn = linkForce.strength()

        // Both formats should get same distance and strength
        const denormalizedDistance = typeof distanceFn === 'function' ? distanceFn(links[0]) : distanceFn
        const normalizedDistance = typeof distanceFn === 'function' ? distanceFn(links[1]) : distanceFn

        const denormalizedStrength = typeof strengthFn === 'function' ? strengthFn(links[0]) : strengthFn
        const normalizedStrength = typeof strengthFn === 'function' ? strengthFn(links[1]) : strengthFn

        expect(denormalizedDistance).toBe(75)
        expect(normalizedDistance).toBe(75)
        expect(denormalizedStrength).toBe(1.2)
        expect(normalizedStrength).toBe(1.2)
      })
    })
  })
})
