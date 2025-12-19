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
