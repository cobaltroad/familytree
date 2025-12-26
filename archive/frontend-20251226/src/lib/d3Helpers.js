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
  nodeGroups.exit()
    .transition()
    .duration(transitionDuration)
    .style('opacity', 0)
    .remove()

  // ENTER: Add new node groups with initial opacity 0
  const enterGroups = nodeGroups.enter()
    .append('g')
    .attr('class', 'node')
    .attr('transform', d => `translate(${d.x},${d.y})`)
    .style('opacity', 0)

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
  mergedNodes.transition()
    .duration(transitionDuration)
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
  nodeGroups.selectAll('.spouse-rect, .spouse-line, .spouse-name, .spouse-year')
    .transition()
    .duration(transitionDuration)
    .style('opacity', 0)
    .remove()

  // Add/update spouse rectangles
  spouseData.each(function(d) {
    const node = d3.select(this)

    // Spouse rectangle
    node.append('rect')
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
      .style('opacity', 0)
      .on('click', (event) => {
        event.stopPropagation()
        onClick(d.data.spouse)
      })
      .transition()
      .duration(transitionDuration)
      .style('opacity', 1)

    // Marriage line
    node.append('line')
      .attr('class', 'spouse-line')
      .attr('x1', 60)
      .attr('y1', 0)
      .attr('x2', 70)
      .attr('y2', 0)
      .attr('stroke', '#999')
      .attr('stroke-width', 2)
      .style('opacity', 0)
      .transition()
      .duration(transitionDuration)
      .style('opacity', 1)

    // Spouse name
    node.append('text')
      .attr('class', 'spouse-name')
      .attr('x', 130)
      .attr('dy', -5)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .text(`${d.data.spouse.firstName} ${d.data.spouse.lastName}`)
      .style('opacity', 0)
      .transition()
      .duration(transitionDuration)
      .style('opacity', 1)

    // Spouse year
    node.append('text')
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
      .style('opacity', 0)
      .transition()
      .duration(transitionDuration)
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
  linkSelection.exit()
    .transition()
    .duration(transitionDuration)
    .style('opacity', 0)
    .remove()

  // ENTER: Add new links with initial opacity 0
  const enterLinks = linkSelection.enter()
    .append('path')
    .attr('class', 'link')
    .attr('fill', 'none')
    .attr('stroke', '#ccc')
    .attr('stroke-width', 2)
    .style('opacity', 0)

  // MERGE and UPDATE: Transition all links to new positions
  linkSelection.merge(enterLinks)
    .transition()
    .duration(transitionDuration)
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
  const { transitionDuration = 300 } = options

  // Bind data with key function
  const nodeGroups = g.selectAll('.node')
    .data(nodes, d => d.data.person.id)

  // EXIT: Remove old nodes
  nodeGroups.exit()
    .transition()
    .duration(transitionDuration)
    .style('opacity', 0)
    .remove()

  // ENTER: Add new node groups
  const enterGroups = nodeGroups.enter()
    .append('g')
    .attr('class', 'node')
    .style('opacity', 0)

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
  mergedNodes.transition()
    .duration(transitionDuration)
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
      if (d.data.person.id === focusPersonId) return '#4CAF50'
      return d.data.person.deathDate ? '#666' : '#333'
    })
    .attr('stroke-width', d => d.data.person.id === focusPersonId ? 3 : 2)
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
  linkSelection.exit()
    .transition()
    .duration(transitionDuration)
    .style('opacity', 0)
    .remove()

  // ENTER
  const enterLinks = linkSelection.enter()
    .append('path')
    .attr('class', 'link')
    .attr('fill', 'none')
    .attr('stroke', '#ccc')
    .attr('stroke-width', 2)
    .style('opacity', 0)

  // MERGE and UPDATE
  linkSelection.merge(enterLinks)
    .transition()
    .duration(transitionDuration)
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
  const { transitionDuration = 300, nodeWidth = 80, nodeHeight = 40 } = options

  // Bind data with key function
  const nodeGroups = g.selectAll('.node')
    .data(nodes, d => d.data.person.id)

  // EXIT
  nodeGroups.exit()
    .transition()
    .duration(transitionDuration)
    .style('opacity', 0)
    .remove()

  // ENTER
  const enterGroups = nodeGroups.enter()
    .append('g')
    .attr('class', 'node')
    .style('opacity', 0)

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
  mergedNodes.transition()
    .duration(transitionDuration)
    .attr('transform', d => `translate(${d.x},${d.y})`)
    .style('opacity', 1)

  // Update rectangles
  mergedNodes.select('rect')
    .attr('fill', d => getColor(d.data.person))
    .attr('stroke', d => {
      if (d.data.person.id === focusPersonId) return '#4CAF50'
      return d.data.person.deathDate ? '#666' : '#333'
    })
    .attr('stroke-width', d => d.data.person.id === focusPersonId ? 3 : 2)
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
