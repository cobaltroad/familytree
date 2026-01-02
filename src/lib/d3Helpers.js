/**
 * D3 Helper Functions
 * Reusable D3.js utilities for family tree visualizations
 */

import * as d3 from 'd3'

/**
 * Create standard zoom/pan behavior for SVG
 * @param {d3.Selection} svg - D3 selection of SVG element
 * @param {d3.Selection} g - D3 selection of group element to transform
 * @param {Array} scaleExtent - [min, max] zoom scale (default [0.5, 3])
 * @returns {d3.ZoomBehavior} - D3 zoom behavior
 */
export function createZoomBehavior(svg, g, scaleExtent = [0.5, 3]) {
  const zoom = d3.zoom()
    .scaleExtent(scaleExtent)
    .on('zoom', (event) => {
      g.attr('transform', event.transform)
    })

  svg.call(zoom)
  return zoom
}

/**
 * Render a person node with consistent styling
 * @param {d3.Selection} selection - D3 selection to append node to
 * @param {Function} getColor - Function to get node color from person data
 * @param {Function} onClick - Click handler function
 * @param {Object} size - {width, height} of node rectangle
 * @returns {d3.Selection} - The created node group
 */
export function renderPersonNode(selection, getColor, onClick, size = { width: 120, height: 60 }) {
  // Add rectangle
  selection.append('rect')
    .attr('width', size.width)
    .attr('height', size.height)
    .attr('x', -size.width / 2)
    .attr('y', -size.height / 2)
    .attr('rx', 5)
    .attr('fill', d => {
      const person = d.data?.person || d
      return getColor(person)
    })
    .attr('stroke', d => {
      const person = d.data?.person || d
      return person.deathDate ? '#666' : '#333'
    })
    .attr('stroke-width', 2)
    .attr('stroke-dasharray', d => {
      const person = d.data?.person || d
      return person.deathDate ? '5,5' : '0'
    })
    .style('cursor', 'pointer')
    .on('click', (event, d) => {
      event.stopPropagation()
      const person = d.data?.person || d
      onClick(person)
    })

  // Add name text
  selection.append('text')
    .attr('dy', -5)
    .attr('text-anchor', 'middle')
    .attr('font-size', '12px')
    .attr('font-weight', 'bold')
    .text(d => {
      const person = d.data?.person || d
      return `${person.firstName} ${person.lastName}`
    })

  // Add year text
  selection.append('text')
    .attr('dy', 10)
    .attr('text-anchor', 'middle')
    .attr('font-size', '10px')
    .text(d => {
      const person = d.data?.person || d
      const birth = person.birthDate ? new Date(person.birthDate).getFullYear() : '?'
      const death = person.deathDate ? new Date(person.deathDate).getFullYear() : ''
      return death ? `${birth}–${death}` : birth
    })

  return selection
}

/**
 * Convert polar coordinates to Cartesian coordinates
 * @param {number} angle - Angle in radians
 * @param {number} radius - Radius
 * @returns {Object} - {x, y} Cartesian coordinates
 */
export function polarToCartesian(angle, radius) {
  return {
    x: radius * Math.cos(angle - Math.PI / 2),
    y: radius * Math.sin(angle - Math.PI / 2)
  }
}

/**
 * Render a lifespan bar for timeline view
 * @param {d3.Selection} selection - D3 selection to append bar to
 * @param {d3.ScaleTime} xScale - D3 time scale for x-axis
 * @param {number} yPosition - Y position for the bar
 * @param {number} height - Height of the bar
 * @returns {d3.Selection} - The created bar element
 */
export function renderLifespanBar(selection, xScale, yPosition, height = 25) {
  return selection.append('rect')
    .attr('x', d => xScale(new Date(d.birthDate)))
    .attr('y', yPosition)
    .attr('width', d => {
      const endDate = d.deathDate ? new Date(d.deathDate) : new Date()
      return Math.max(2, xScale(endDate) - xScale(new Date(d.birthDate)))
    })
    .attr('height', height)
    .attr('rx', 3)
}

/**
 * Create a person node for radial layout with proper text rotation
 * @param {d3.Selection} selection - D3 selection of node group
 * @param {Function} getColor - Function to get node color
 * @param {Function} onClick - Click handler
 * @param {number} nodeSize - Size of the node circle
 */
export function renderRadialPersonNode(selection, getColor, onClick, nodeSize = 30) {
  // Add circle
  selection.append('circle')
    .attr('r', nodeSize)
    .attr('fill', d => {
      const person = d.data?.person || d
      return getColor(person)
    })
    .attr('stroke', d => {
      const person = d.data?.person || d
      return person.deathDate ? '#666' : '#333'
    })
    .attr('stroke-width', 2)
    .attr('stroke-dasharray', d => {
      const person = d.data?.person || d
      return person.deathDate ? '5,5' : '0'
    })
    .style('cursor', 'pointer')
    .on('click', (event, d) => {
      event.stopPropagation()
      const person = d.data?.person || d
      onClick(person)
    })

  // Add text with rotation to keep readable
  selection.append('text')
    .attr('dy', '0.31em')
    .attr('x', d => d.x < Math.PI === !d.children ? 6 : -6)
    .attr('text-anchor', d => d.x < Math.PI === !d.children ? 'start' : 'end')
    .attr('transform', d => `rotate(${d.x >= Math.PI ? d.x * 180 / Math.PI - 90 : d.x * 180 / Math.PI + 90})`)
    .attr('font-size', '11px')
    .text(d => {
      const person = d.data?.person || d
      return `${person.firstName} ${person.lastName}`
    })

  return selection
}

// Test mode configuration - when enabled, disables transitions for JSDOM compatibility
export const testConfig = {
  enabled: false
}

/**
 * Apply transition to a selection if not in test mode
 * In test mode, returns the selection directly (no transition)
 *
 * @param {d3.Selection} selection - The D3 selection
 * @param {number} duration - Transition duration in ms
 * @returns {d3.Selection|d3.Transition} - Selection or transition
 */
function maybeTransition(selection, duration) {
  if (testConfig.enabled) {
    return selection
  }
  return selection.transition().duration(duration)
}

/**
 * Update tree nodes using D3's enter/update/exit pattern
 * This function implements incremental updates instead of full re-renders
 *
 * @param {d3.Selection} g - The main group element containing the tree
 * @param {Array} nodes - Array of D3 hierarchy nodes
 * @param {Function} getColor - Function to get node color
 * @param {Function} onClick - Click handler for nodes
 * @param {Object} options - Configuration options
 * @returns {d3.Selection} - The updated node selection
 */
export function updateTreeNodes(g, nodes, getColor, onClick, options = {}) {
  const {
    transitionDuration = 300,
    nodeWidth = 120,
    nodeHeight = 60,
    includeSpouses = true
  } = options

  // Bind data with key function for object constancy
  const nodeGroups = g.selectAll('.node')
    .data(nodes, d => d.data.person.id)

  // EXIT: Remove old nodes with fade out
  maybeTransition(nodeGroups.exit(), transitionDuration)
    .style('opacity', 0)
    .remove()

  // ENTER: Add new node groups with initial opacity
  const enterGroups = nodeGroups.enter()
    .append('g')
    .attr('class', 'node')
    .attr('transform', d => `translate(${d.x},${d.y})`)
    .style('opacity', testConfig.enabled ? 1 : 0)

  // Add rectangles to new nodes
  enterGroups.append('rect')
    .attr('width', nodeWidth)
    .attr('height', nodeHeight)
    .attr('x', -nodeWidth / 2)
    .attr('y', -nodeHeight / 2)
    .attr('rx', 5)
    .style('cursor', 'pointer')

  // Add name text to new nodes
  enterGroups.append('text')
    .attr('class', 'name-text')
    .attr('dy', -5)
    .attr('text-anchor', 'middle')
    .attr('font-size', '12px')
    .attr('font-weight', 'bold')

  // Add year text to new nodes
  enterGroups.append('text')
    .attr('class', 'year-text')
    .attr('dy', 10)
    .attr('text-anchor', 'middle')
    .attr('font-size', '10px')

  // MERGE enter and update selections
  const mergedNodes = nodeGroups.merge(enterGroups)

  // UPDATE: Transition all nodes to new positions and update attributes
  maybeTransition(mergedNodes, transitionDuration)
    .attr('transform', d => `translate(${d.x},${d.y})`)
    .style('opacity', 1)

  // Update rectangle attributes
  mergedNodes.select('rect')
    .attr('fill', d => getColor(d.data.person))
    .attr('stroke', d => d.data.person.deathDate ? '#666' : '#333')
    .attr('stroke-width', 2)
    .attr('stroke-dasharray', d => d.data.person.deathDate ? '5,5' : '0')
    .on('click', (event, d) => {
      event.stopPropagation()
      onClick(d.data.person)
    })

  // Update name text
  mergedNodes.select('.name-text')
    .text(d => `${d.data.person.firstName} ${d.data.person.lastName}`)

  // Update year text
  mergedNodes.select('.year-text')
    .text(d => {
      const birth = d.data.person.birthDate ? new Date(d.data.person.birthDate).getFullYear() : '?'
      const death = d.data.person.deathDate ? new Date(d.data.person.deathDate).getFullYear() : ''
      return death ? `${birth} - ${death}` : birth
    })

  // Handle spouse nodes if enabled
  if (includeSpouses) {
    updateSpouseNodes(mergedNodes, getColor, onClick, { transitionDuration, nodeWidth, nodeHeight })
  }

  return mergedNodes
}

/**
 * Update spouse nodes within person nodes
 * @param {d3.Selection} nodeGroups - The node groups selection
 * @param {Function} getColor - Function to get node color
 * @param {Function} onClick - Click handler for nodes
 * @param {Object} options - Configuration options
 */
function updateSpouseNodes(nodeGroups, getColor, onClick, options = {}) {
  const { transitionDuration = 300, nodeWidth = 120, nodeHeight = 60 } = options

  // Bind spouse data
  const spouseData = nodeGroups.filter(d => d.data.spouse)

  // Remove old spouse elements
  maybeTransition(nodeGroups.selectAll('.spouse-rect, .spouse-line, .spouse-name, .spouse-year'), transitionDuration)
    .style('opacity', 0)
    .remove()

  // Add/update spouse rectangles
  spouseData.each(function(d) {
    const node = d3.select(this)

    // Spouse rectangle
    maybeTransition(node.append('rect')
      .attr('class', 'spouse-rect')
      .attr('width', nodeWidth)
      .attr('height', nodeHeight)
      .attr('x', 70)
      .attr('y', -nodeHeight / 2)
      .attr('rx', 5)
      .attr('fill', getColor(d.data.spouse))
      .attr('stroke', d.data.spouse.deathDate ? '#666' : '#333')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', d.data.spouse.deathDate ? '5,5' : '0')
      .style('cursor', 'pointer')
      .style('opacity', testConfig.enabled ? 1 : 0)
      .on('click', (event) => {
        event.stopPropagation()
        onClick(d.data.spouse)
      }), transitionDuration)
      .style('opacity', 1)

    // Marriage line
    maybeTransition(node.append('line')
      .attr('class', 'spouse-line')
      .attr('x1', 60)
      .attr('y1', 0)
      .attr('x2', 70)
      .attr('y2', 0)
      .attr('stroke', '#999')
      .attr('stroke-width', 2)
      .style('opacity', testConfig.enabled ? 1 : 0), transitionDuration)
      .style('opacity', 1)

    // Spouse name
    maybeTransition(node.append('text')
      .attr('class', 'spouse-name')
      .attr('x', 130)
      .attr('dy', -5)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .text(`${d.data.spouse.firstName} ${d.data.spouse.lastName}`)
      .style('opacity', testConfig.enabled ? 1 : 0), transitionDuration)
      .style('opacity', 1)

    // Spouse year
    maybeTransition(node.append('text')
      .attr('class', 'spouse-year')
      .attr('x', 130)
      .attr('dy', 10)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .text(() => {
        const birth = d.data.spouse.birthDate ? new Date(d.data.spouse.birthDate).getFullYear() : '?'
        const death = d.data.spouse.deathDate ? new Date(d.data.spouse.deathDate).getFullYear() : ''
        return death ? `${birth} - ${death}` : birth
      })
      .style('opacity', testConfig.enabled ? 1 : 0), transitionDuration)
      .style('opacity', 1)
  })
}

/**
 * Update tree links using D3's enter/update/exit pattern
 * @param {d3.Selection} g - The main group element containing the tree
 * @param {Array} links - Array of D3 hierarchy links
 * @param {Object} options - Configuration options
 * @returns {d3.Selection} - The updated link selection
 */
export function updateTreeLinks(g, links, options = {}) {
  const { transitionDuration = 300 } = options

  // Bind data with key function (using source and target IDs)
  const linkSelection = g.selectAll('.link')
    .data(links, d => `${d.source.data.person.id}-${d.target.data.person.id}`)

  // EXIT: Remove old links with fade out
  maybeTransition(linkSelection.exit(), transitionDuration)
    .style('opacity', 0)
    .remove()

  // ENTER: Add new links with initial opacity
  const enterLinks = linkSelection.enter()
    .append('path')
    .attr('class', 'link')
    .attr('fill', 'none')
    .attr('stroke', '#ccc')
    .attr('stroke-width', 2)
    .style('opacity', testConfig.enabled ? 1 : 0)

  // MERGE and UPDATE: Transition all links to new positions
  maybeTransition(linkSelection.merge(enterLinks), transitionDuration)
    .attr('d', d3.linkVertical()
      .x(d => d.x)
      .y(d => d.y))
    .style('opacity', 1)

  return linkSelection.merge(enterLinks)
}

/**
 * Update radial tree nodes using D3's enter/update/exit pattern
 * @param {d3.Selection} g - The main group element
 * @param {Array} nodes - Array of D3 hierarchy nodes
 * @param {Function} getColor - Function to get node color
 * @param {Function} onClick - Click handler
 * @param {number} focusPersonId - ID of the focus person
 * @param {Object} options - Configuration options
 * @returns {d3.Selection} - The updated node selection
 */
export function updateRadialNodes(g, nodes, getColor, onClick, focusPersonId, options = {}) {
  const { transitionDuration = 300, defaultPersonId = null } = options

  // Bind data with key function
  const nodeGroups = g.selectAll('.node')
    .data(nodes, d => d.data.person.id)

  // EXIT: Remove old nodes
  maybeTransition(nodeGroups.exit(), transitionDuration)
    .style('opacity', 0)
    .remove()

  // ENTER: Add new node groups
  const enterGroups = nodeGroups.enter()
    .append('g')
    .attr('class', 'node')
    .style('opacity', testConfig.enabled ? 1 : 0)

  // Add circles to new nodes
  enterGroups.append('circle')
    .style('cursor', 'pointer')

  // Add text to new nodes
  enterGroups.append('text')
    .attr('class', 'name-text')

  // Add year text to outer nodes
  enterGroups.filter(d => d.depth > 0)
    .append('text')
    .attr('class', 'year-text')

  // MERGE and UPDATE
  const mergedNodes = nodeGroups.merge(enterGroups)

  // Update transform and opacity
  maybeTransition(mergedNodes, transitionDuration)
    .attr('transform', d => {
      const angle = d.x - Math.PI / 2
      const x = d.y * Math.cos(angle)
      const y = d.y * Math.sin(angle)
      return `translate(${x},${y})`
    })
    .style('opacity', 1)

  // Update circles
  mergedNodes.select('circle')
    .attr('r', d => d.depth === 0 ? 40 : 25)
    .attr('fill', d => getColor(d.data.person))
    .attr('stroke', d => {
      // Story #84: Blue border for user's profile
      if (defaultPersonId && d.data.person.id === defaultPersonId) return '#3b82f6'
      if (d.data.person.id === focusPersonId) return '#4CAF50'
      return d.data.person.deathDate ? '#666' : '#333'
    })
    .attr('stroke-width', d => {
      // Story #84: Thicker border for user's profile
      if (defaultPersonId && d.data.person.id === defaultPersonId) return 4
      if (d.data.person.id === focusPersonId) return 3
      return 2
    })
    .attr('stroke-dasharray', d => d.data.person.deathDate ? '3,3' : '0')
    .on('click', (event, d) => {
      event.stopPropagation()
      onClick(d.data.person)
    })

  // Update name text
  mergedNodes.select('.name-text')
    .attr('dy', '0.31em')
    .attr('x', d => {
      if (d.depth === 0) return 0
      return d.x < Math.PI ? 6 : -6
    })
    .attr('y', d => d.depth === 0 ? 50 : 0)
    .attr('text-anchor', d => {
      if (d.depth === 0) return 'middle'
      return d.x < Math.PI ? 'start' : 'end'
    })
    .attr('transform', d => {
      if (d.depth === 0) return ''
      const angle = d.x * 180 / Math.PI
      if (d.x < Math.PI) {
        return `rotate(${angle - 90})`
      } else {
        return `rotate(${angle + 90})`
      }
    })
    .attr('font-size', d => d.depth === 0 ? '14px' : '11px')
    .attr('font-weight', d => d.depth === 0 ? 'bold' : 'normal')
    .text(d => {
      const p = d.data.person
      if (d.depth === 0) {
        return `${p.firstName} ${p.lastName}`
      }
      const firstName = p.firstName.length > 10 ? p.firstName.substring(0, 9) + '.' : p.firstName
      return `${firstName} ${p.lastName.charAt(0)}.`
    })

  // Update year text
  mergedNodes.filter(d => d.depth > 0).select('.year-text')
    .attr('dy', '1.5em')
    .attr('x', d => d.x < Math.PI ? 6 : -6)
    .attr('text-anchor', d => d.x < Math.PI ? 'start' : 'end')
    .attr('transform', d => {
      const angle = d.x * 180 / Math.PI
      if (d.x < Math.PI) {
        return `rotate(${angle - 90})`
      } else {
        return `rotate(${angle + 90})`
      }
    })
    .attr('font-size', '9px')
    .attr('fill', '#666')
    .text(d => {
      const birth = d.data.person.birthDate ? new Date(d.data.person.birthDate).getFullYear() : '?'
      return birth
    })

  return mergedNodes
}

/**
 * Update radial tree links using D3's enter/update/exit pattern
 * @param {d3.Selection} g - The main group element
 * @param {Array} links - Array of D3 hierarchy links
 * @param {Object} options - Configuration options
 * @returns {d3.Selection} - The updated link selection
 */
export function updateRadialLinks(g, links, options = {}) {
  const { transitionDuration = 300 } = options

  // Bind data with key function
  const linkSelection = g.selectAll('.link')
    .data(links, d => `${d.source.data.person.id}-${d.target.data.person.id}`)

  // EXIT
  maybeTransition(linkSelection.exit(), transitionDuration)
    .style('opacity', 0)
    .remove()

  // ENTER
  const enterLinks = linkSelection.enter()
    .append('path')
    .attr('class', 'link')
    .attr('fill', 'none')
    .attr('stroke', '#ccc')
    .attr('stroke-width', 2)
    .style('opacity', testConfig.enabled ? 1 : 0)

  // MERGE and UPDATE
  maybeTransition(linkSelection.merge(enterLinks), transitionDuration)
    .attr('d', d3.linkRadial()
      .angle(d => d.x)
      .radius(d => d.y))
    .style('opacity', 1)

  return linkSelection.merge(enterLinks)
}

/**
 * Update pedigree (ancestor) tree nodes using D3's enter/update/exit pattern
 * Compact nodes for pedigree view (80x40)
 *
 * @param {d3.Selection} g - The main group element
 * @param {Array} nodes - Array of D3 hierarchy nodes
 * @param {Function} getColor - Function to get node color
 * @param {Function} onClick - Click handler
 * @param {number} focusPersonId - ID of the focus person
 * @param {Object} options - Configuration options
 * @returns {d3.Selection} - The updated node selection
 */
export function updatePedigreeNodes(g, nodes, getColor, onClick, focusPersonId, options = {}) {
  const { transitionDuration = 300, nodeWidth = 80, nodeHeight = 40, defaultPersonId = null } = options

  // Bind data with key function
  const nodeGroups = g.selectAll('.node')
    .data(nodes, d => d.data.person.id)

  // EXIT
  maybeTransition(nodeGroups.exit(), transitionDuration)
    .style('opacity', 0)
    .remove()

  // ENTER
  const enterGroups = nodeGroups.enter()
    .append('g')
    .attr('class', 'node')
    .style('opacity', testConfig.enabled ? 1 : 0)

  // Add rectangles to new nodes
  enterGroups.append('rect')
    .attr('width', nodeWidth)
    .attr('height', nodeHeight)
    .attr('x', -nodeWidth / 2)
    .attr('y', -nodeHeight / 2)
    .attr('rx', 4)
    .style('cursor', 'pointer')

  // Add name text
  enterGroups.append('text')
    .attr('class', 'name-text')
    .attr('dy', -2)
    .attr('text-anchor', 'middle')
    .attr('font-size', '10px')
    .attr('font-weight', 'bold')

  // Add year text
  enterGroups.append('text')
    .attr('class', 'year-text')
    .attr('dy', 8)
    .attr('text-anchor', 'middle')
    .attr('font-size', '9px')

  // Add generation label
  enterGroups.append('text')
    .attr('class', 'gen-label')
    .attr('x', -nodeWidth / 2 - 5)
    .attr('y', 0)
    .attr('dy', '0.35em')
    .attr('text-anchor', 'end')
    .attr('font-size', '8px')
    .attr('fill', '#999')

  // MERGE and UPDATE
  const mergedNodes = nodeGroups.merge(enterGroups)

  // Update transform and opacity
  maybeTransition(mergedNodes, transitionDuration)
    .attr('transform', d => `translate(${d.x},${d.y})`)
    .style('opacity', 1)

  // Update rectangles
  mergedNodes.select('rect')
    .attr('fill', d => getColor(d.data.person))
    .attr('stroke', d => {
      // Story #84: Blue border for user's profile
      if (defaultPersonId && d.data.person.id === defaultPersonId) return '#3b82f6'
      if (d.data.person.id === focusPersonId) return '#4CAF50'
      return d.data.person.deathDate ? '#666' : '#333'
    })
    .attr('stroke-width', d => {
      // Story #84: Thicker border for user's profile
      if (defaultPersonId && d.data.person.id === defaultPersonId) return 4
      if (d.data.person.id === focusPersonId) return 3
      return 2
    })
    .attr('stroke-dasharray', d => d.data.person.deathDate ? '3,3' : '0')
    .on('click', (event, d) => {
      event.stopPropagation()
      onClick(d.data.person)
    })

  // Update name text (shorten long names)
  mergedNodes.select('.name-text')
    .text(d => {
      const p = d.data.person
      const firstName = p.firstName.length > 8 ? p.firstName.substring(0, 7) + '.' : p.firstName
      const lastName = p.lastName.length > 8 ? p.lastName.substring(0, 7) + '.' : p.lastName
      return `${firstName} ${lastName}`
    })

  // Update year text
  mergedNodes.select('.year-text')
    .text(d => {
      const birth = d.data.person.birthDate ? new Date(d.data.person.birthDate).getFullYear() : '?'
      const death = d.data.person.deathDate ? new Date(d.data.person.deathDate).getFullYear() : ''
      return death ? `${birth}–${death}` : birth
    })

  // Update generation labels
  mergedNodes.select('.gen-label')
    .text(d => `G${d.depth}`)

  return mergedNodes
}

/**
 * Create a D3 force simulation for force-directed network layout
 * Story #99: Force-Directed Network View
 *
 * @param {Array} nodes - Array of node objects (people)
 * @param {Array} links - Array of link objects (relationships)
 * @param {Object} options - Configuration options
 * @returns {d3.ForceSimulation} - Configured D3 force simulation
 */
export function createForceSimulation(nodes, links, options = {}) {
  const {
    width = 800,
    height = 600,
    chargeStrength = -300,
    linkDistance = 100,
    collisionRadius = 30,
    alphaDecay = 0.02
  } = options

  // Create simulation with multiple forces
  const simulation = d3.forceSimulation(nodes)
    .force('charge', d3.forceManyBody().strength(chargeStrength))
    .force('link', d3.forceLink(links).id(d => d.id).distance(linkDistance))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(collisionRadius))
    .alphaDecay(alphaDecay)

  return simulation
}

/**
 * Update network nodes using D3's enter/update/exit pattern
 * Creates circular nodes with text labels for force-directed network
 *
 * @param {d3.Selection} g - The main group element
 * @param {Array} nodes - Array of node objects (people)
 * @param {Function} getColor - Function to get node color
 * @param {Function} onClick - Click handler
 * @param {Object} options - Configuration options
 * @returns {d3.Selection} - The updated node selection
 */
export function updateNetworkNodes(g, nodes, getColor, onClick, options = {}) {
  const { transitionDuration = 300, nodeRadius = 15 } = options

  // Bind data with key function
  const nodeGroups = g.selectAll('.network-node')
    .data(nodes, d => d.id)

  // EXIT
  maybeTransition(nodeGroups.exit(), transitionDuration)
    .style('opacity', 0)
    .remove()

  // ENTER
  const enterGroups = nodeGroups.enter()
    .append('g')
    .attr('class', 'network-node')
    .attr('data-id', d => d.id) // Story #100: AC4 - Add data-id for spouse highlighting
    .style('opacity', testConfig.enabled ? 1 : 0)

  // Create gradient defs for each node
  enterGroups.each(function(d) {
    const node = d3.select(this)
    const color = getColor(d)
    const gradientId = `gradient-${d.id}`

    // Create gradient definition in defs
    let defs = d3.select(this.ownerDocument).select('defs')
    if (defs.empty()) {
      defs = d3.select(this.ownerDocument).select('svg').append('defs')
    }

    defs.append('radialGradient')
      .attr('id', gradientId)
      .html(`
        <stop offset="0%" stop-color="${color}" stop-opacity="1"/>
        <stop offset="100%" stop-color="${d3.color(color).darker(0.3)}" stop-opacity="1"/>
      `)
  })

  // Add circles to new nodes
  enterGroups.append('circle')
    .attr('r', nodeRadius)
    .style('cursor', 'pointer')

  // Add text to new nodes
  enterGroups.append('text')
    .attr('class', 'node-label')
    .attr('dy', '0.31em')
    .attr('text-anchor', 'middle')
    .attr('font-size', '10px')
    .attr('pointer-events', 'none')

  // MERGE and UPDATE
  const mergedNodes = nodeGroups.merge(enterGroups)

  // Update positions
  maybeTransition(mergedNodes, transitionDuration)
    .attr('transform', d => `translate(${d.x || 0},${d.y || 0})`)
    .style('opacity', 1)

  // Update circles
  mergedNodes.select('circle')
    .attr('fill', d => `url(#gradient-${d.id})`)
    .attr('stroke', d => d.deathDate ? '#666' : '#333')
    .attr('stroke-width', 2)
    .attr('stroke-dasharray', d => d.deathDate ? '3,3' : '0')
    .on('click', (event, d) => {
      event.stopPropagation()
      onClick(d)
    })

  // Update text labels
  mergedNodes.select('.node-label')
    .text(d => {
      const firstName = d.firstName.length > 8 ? d.firstName.substring(0, 7) + '.' : d.firstName
      const lastName = d.lastName.length > 8 ? d.lastName.charAt(0) + '.' : d.lastName
      return `${firstName} ${lastName}`
    })

  return mergedNodes
}

/**
 * Update network links using D3's enter/update/exit pattern
 * Renders relationships with different styles based on type
 *
 * @param {d3.Selection} g - The main group element
 * @param {Array} links - Array of link objects
 * @param {Object} options - Configuration options
 * @returns {d3.Selection} - The updated link selection
 */
export function updateNetworkLinks(g, links, options = {}) {
  const { transitionDuration = 300 } = options

  // Create arrow markers for parent-child relationships
  let defs = g.select('defs')
  if (defs.empty()) {
    defs = d3.select(g.node().ownerDocument).select('svg').select('defs')
    if (defs.empty()) {
      defs = d3.select(g.node().ownerDocument).select('svg').append('defs')
    }
  }

  // Create arrow marker for mother relationships
  if (defs.select('#arrow-mother').empty()) {
    defs.append('marker')
      .attr('id', 'arrow-mother')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#ec4899')
  }

  // Create arrow marker for father relationships
  if (defs.select('#arrow-father').empty()) {
    defs.append('marker')
      .attr('id', 'arrow-father')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#3b82f6')
  }

  // Bind data
  const linkSelection = g.selectAll('.network-link')
    .data(links, (d, i) => d.id || `${d.source.id || d.source}-${d.target.id || d.target}-${i}`)

  // EXIT
  maybeTransition(linkSelection.exit(), transitionDuration)
    .style('opacity', 0)
    .remove()

  // ENTER
  const enterLinks = linkSelection.enter()
    .append('path')
    .attr('class', 'network-link')
    .attr('fill', 'none')
    .style('opacity', testConfig.enabled ? 1 : 0)

  // MERGE and UPDATE
  const mergedLinks = linkSelection.merge(enterLinks)

  // Update link styling based on type
  mergedLinks
    .attr('stroke', d => {
      if (d.type === 'mother') return '#ec4899'
      if (d.type === 'father') return '#3b82f6'
      if (d.type === 'spouse') return '#9333ea'
      if (d.type === 'sibling') return '#999'
      return '#999'
    })
    .attr('stroke-width', 2)
    .attr('stroke-dasharray', d => {
      if (d.type === 'mother' || d.type === 'father') return '0'
      if (d.type === 'spouse') return '5,5'
      if (d.type === 'sibling') return '2,2'
      return '0'
    })
    .attr('marker-end', d => {
      if (d.type === 'mother') return 'url(#arrow-mother)'
      if (d.type === 'father') return 'url(#arrow-father)'
      return null
    })

  // Update positions
  maybeTransition(mergedLinks, transitionDuration)
    .attr('d', d => {
      const sourceX = d.source.x || 0
      const sourceY = d.source.y || 0
      const targetX = d.target.x || 0
      const targetY = d.target.y || 0
      return `M${sourceX},${sourceY} L${targetX},${targetY}`
    })
    .style('opacity', 1)

  return mergedLinks
}

/**
 * Create drag behavior for network nodes
 * Allows users to drag nodes and pin them in place
 *
 * @param {d3.ForceSimulation} simulation - The force simulation
 * @returns {d3.DragBehavior} - D3 drag behavior
 */
export function applyNodeDrag(simulation) {
  function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart()
    d.fx = d.x
    d.fy = d.y
  }

  function dragged(event, d) {
    d.fx = event.x
    d.fy = event.y
  }

  function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0)
    // Keep node pinned after drag
    d.fx = event.x
    d.fy = event.y
  }

  return d3.drag()
    .on('start', dragstarted)
    .on('drag', dragged)
    .on('end', dragended)
}

/**
 * Create tooltip for network nodes
 * Returns a D3 selection with show/hide/move methods
 *
 * @returns {d3.Selection} - Tooltip selection with methods
 */
export function createNetworkTooltip() {
  const tooltip = d3.select('body')
    .append('div')
    .attr('class', 'network-tooltip')
    .style('position', 'absolute')
    .style('opacity', 0)
    .style('background', 'white')
    .style('border', '1px solid #ccc')
    .style('border-radius', '4px')
    .style('padding', '8px')
    .style('pointer-events', 'none')
    .style('z-index', '1000')
    .style('box-shadow', '0 2px 4px rgba(0,0,0,0.1)')

  // Add show method
  tooltip.show = function(html, event) {
    this.html(html)
      .style('opacity', 1)
      .style('left', (event.pageX + 10) + 'px')
      .style('top', (event.pageY - 10) + 'px')
    return this
  }

  // Add hide method
  tooltip.hide = function() {
    this.style('opacity', 0)
    return this
  }

  // Add move method
  tooltip.move = function(event) {
    this.style('left', (event.pageX + 10) + 'px')
      .style('top', (event.pageY - 10) + 'px')
    return this
  }

  return tooltip
}

/**
 * Highlight connected nodes and links on hover
 *
 * @param {d3.Selection} g - The main group element
 * @param {Object} node - The hovered node
 * @param {Array} links - Array of all links
 * @param {boolean} highlight - True to highlight, false to remove
 */
export function highlightConnectedNodes(g, node, links, highlight) {
  if (highlight) {
    // Find connected node IDs
    const connectedIds = new Set()
    connectedIds.add(node.id)

    links.forEach(link => {
      const sourceId = link.source.id || link.source
      const targetId = link.target.id || link.target

      if (sourceId === node.id) connectedIds.add(targetId)
      if (targetId === node.id) connectedIds.add(sourceId)
    })

    // Highlight connected nodes
    g.selectAll('.network-node circle')
      .attr('stroke', d => connectedIds.has(d.id) ? '#4CAF50' : null)
      .attr('stroke-width', d => connectedIds.has(d.id) ? 3 : 2)

    // Highlight connected links
    g.selectAll('.network-link')
      .attr('stroke-width', d => {
        const sourceId = d.source.id || d.source
        const targetId = d.target.id || d.target
        return (sourceId === node.id || targetId === node.id) ? 4 : 2
      })
  } else {
    // Remove highlighting
    g.selectAll('.network-node circle')
      .attr('stroke', d => d.deathDate ? '#666' : '#333')
      .attr('stroke-width', 2)

    g.selectAll('.network-link')
      .attr('stroke-width', 2)
  }
}

/**
 * Create a custom force that pulls spouse pairs together
 * Story #100: Spouse Proximity Enhancement
 *
 * This force positions spouse pairs close together (side-by-side) in the network view.
 * It applies stronger force when spouses are far apart and weaker force when they are
 * within the target distance range.
 *
 * @param {Array} spousePairs - Array of {source, target} spouse pair objects
 * @param {number} targetDistance - Target distance between spouses in pixels (default 70)
 * @returns {Function} - D3 force function that accepts alpha parameter
 */
export function createSpouseForce(spousePairs, targetDistance = 70) {
  return function(alpha) {
    spousePairs.forEach(pair => {
      const { source, target } = pair

      // Skip if either node is missing
      if (!source || !target) return

      // Skip if either node is pinned (has fx/fy set by user)
      if (source.fx !== undefined || target.fx !== undefined) return

      // Calculate current distance between spouses
      const dx = target.x - source.x
      const dy = target.y - source.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      // Skip if nodes are at the same position (avoid division by zero)
      if (distance === 0) return

      // Calculate force strength based on distance from target
      // Stronger force when far from target, weaker when close
      const offset = (distance - targetDistance) / distance
      const strength = alpha * 0.5 // Scale by alpha for smooth settling

      // Calculate velocity changes for each node
      const forceX = dx * offset * strength
      const forceY = dy * offset * strength

      // Apply force to move nodes toward each other
      // Source moves toward target
      source.vx += forceX
      source.vy += forceY

      // Target moves toward source
      target.vx -= forceX
      target.vy -= forceY
    })
  }
}
