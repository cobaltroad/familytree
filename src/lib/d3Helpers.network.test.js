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
  testConfig
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
