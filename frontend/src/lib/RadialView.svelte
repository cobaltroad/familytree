<script>
  import { onMount, afterUpdate } from 'svelte'
  import { createEventDispatcher } from 'svelte'
  import * as d3 from 'd3'
  import { getNodeColor, findRootPeople, buildAncestorTree } from './treeHelpers.js'
  import { createZoomBehavior } from './d3Helpers.js'

  export let people = []
  export let relationships = []

  const dispatch = createEventDispatcher()

  let svgElement
  let width = 1000
  let height = 1000
  let focusPersonId = null

  // Default focus person to first root
  $: if (people.length > 0 && !focusPersonId) {
    const roots = findRootPeople(people, relationships)
    focusPersonId = roots.length > 0 ? roots[0].id : people[0].id
  }

  $: focusPerson = people.find(p => p.id === focusPersonId)

  $: if (focusPerson) {
    renderRadial()
  }

  function renderRadial() {
    if (!svgElement || !focusPerson) return

    // Clear existing content
    d3.select(svgElement).selectAll('*').remove()

    // Build ancestor tree
    const ancestorTree = buildAncestorTree(focusPerson, people, relationships, 5)

    if (!ancestorTree) return

    // Convert to D3 hierarchy
    const hierarchy = d3.hierarchy(ancestorTree, d => d.children)

    // Calculate radius based on depth
    const maxDepth = hierarchy.height
    const radius = Math.min(width, height) / 2 - 120

    // Create radial tree layout
    const treeLayout = d3.tree()
      .size([2 * Math.PI, radius])
      .separation((a, b) => (a.parent === b.parent ? 1 : 2) / (a.depth + 1))

    const treeNodes = treeLayout(hierarchy)

    // Create SVG with zoom
    const svg = d3.select(svgElement)
      .attr('width', width)
      .attr('height', height)

    const g = svg.append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`)

    // Add zoom behavior
    createZoomBehavior(svg, g, [0.5, 3])

    // Draw radial links
    g.selectAll('.link')
      .data(treeNodes.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', d3.linkRadial()
        .angle(d => d.x)
        .radius(d => d.y))
      .attr('fill', 'none')
      .attr('stroke', '#ccc')
      .attr('stroke-width', 2)

    // Draw nodes
    const nodes = g.selectAll('.node')
      .data(treeNodes.descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', d => {
        const angle = d.x - Math.PI / 2
        const x = d.y * Math.cos(angle)
        const y = d.y * Math.sin(angle)
        return `translate(${x},${y})`
      })

    // Add circles for person nodes
    nodes.append('circle')
      .attr('r', d => d.depth === 0 ? 40 : 25) // Larger circle for focus person
      .attr('fill', d => getNodeColor(d.data.person))
      .attr('stroke', d => {
        if (d.data.person.id === focusPersonId) return '#4CAF50'
        return d.data.person.deathDate ? '#666' : '#333'
      })
      .attr('stroke-width', d => d.data.person.id === focusPersonId ? 3 : 2)
      .attr('stroke-dasharray', d => d.data.person.deathDate ? '3,3' : '0')
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation()
        dispatch('editPerson', d.data.person)
      })

    // Add person names with smart rotation
    nodes.append('text')
      .attr('dy', '0.31em')
      .attr('x', d => {
        if (d.depth === 0) return 0 // Center text for focus person
        return d.x < Math.PI ? 6 : -6
      })
      .attr('y', d => d.depth === 0 ? 50 : 0) // Below focus person
      .attr('text-anchor', d => {
        if (d.depth === 0) return 'middle'
        return d.x < Math.PI ? 'start' : 'end'
      })
      .attr('transform', d => {
        if (d.depth === 0) return '' // No rotation for focus person
        const angle = d.x * 180 / Math.PI
        // Rotate text to be readable (not upside-down)
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
        // Compact names for outer rings
        const firstName = p.firstName.length > 10 ? p.firstName.substring(0, 9) + '.' : p.firstName
        return `${firstName} ${p.lastName.charAt(0)}.`
      })

    // Add year labels
    nodes.filter(d => d.depth > 0).append('text')
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

    // Add generation ring labels
    for (let i = 1; i <= maxDepth; i++) {
      const ringRadius = (radius / maxDepth) * i

      g.append('circle')
        .attr('r', ringRadius)
        .attr('fill', 'none')
        .attr('stroke', '#e0e0e0')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '2,2')

      g.append('text')
        .attr('x', 0)
        .attr('y', -ringRadius)
        .attr('dy', '-0.3em')
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('fill', '#999')
        .text(`Generation ${i}`)
    }
  }

  onMount(() => {
    if (focusPerson) {
      renderRadial()
    }
  })

  afterUpdate(() => {
    if (focusPerson) {
      renderRadial()
    }
  })
</script>

<div class="radial-container">
  <div class="controls">
    <label class="control-group">
      <span>Focus Person:</span>
      <select bind:value={focusPersonId}>
        {#each people as person}
          <option value={person.id}>
            {person.firstName} {person.lastName}
          </option>
        {/each}
      </select>
    </label>

    <div class="legend">
      <span class="legend-item">
        <span class="legend-circle focus"></span>
        Focus Person
      </span>
      <span class="legend-item">
        <span class="legend-circle deceased"></span>
        Deceased
      </span>
      <span class="legend-item">
        Concentric rings = generations (parents, grandparents, etc.)
      </span>
    </div>
  </div>

  {#if people.length === 0}
    <div class="empty-state">
      <p>No family members to display. Add people in the List View first.</p>
    </div>
  {:else}
    <div class="radial-view">
      <svg bind:this={svgElement}></svg>
    </div>
    <button class="fab" on:click={() => dispatch('addPerson')} aria-label="Add Person">
      +
    </button>
  {/if}
</div>

<style>
  .radial-container {
    width: 100%;
    height: calc(100vh - 200px);
    display: flex;
    flex-direction: column;
    border: 1px solid #ccc;
    border-radius: 8px;
    background: #fafafa;
    overflow: hidden;
  }

  .controls {
    padding: 1rem;
    display: flex;
    gap: 2rem;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid #e0e0e0;
    background: white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .control-group {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.95rem;
    font-weight: 500;
  }

  .control-group select {
    padding: 0.5rem 2rem 0.5rem 0.75rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 0.9rem;
    min-width: 200px;
    background: white;
  }

  .legend {
    display: flex;
    gap: 1.5rem;
    align-items: center;
    font-size: 0.85rem;
    color: #666;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .legend-circle {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 2px solid #333;
    background: #E0E0E0;
  }

  .legend-circle.focus {
    border-color: #4CAF50;
    border-width: 3px;
    width: 24px;
    height: 24px;
  }

  .legend-circle.deceased {
    border-style: dashed;
  }

  .empty-state {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    text-align: center;
    color: #666;
  }

  .radial-view {
    flex: 1;
    overflow: auto;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  svg {
    cursor: grab;
  }

  svg:active {
    cursor: grabbing;
  }

  :global(.radial-container .node) {
    cursor: pointer;
  }

  :global(.radial-container .node:hover circle) {
    filter: brightness(0.9);
  }

  /* FAB button */
  .fab {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background-color: #4CAF50;
    color: white;
    border: none;
    font-size: 2rem;
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    transition: all 0.3s;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }

  .fab:hover {
    background-color: #45a049;
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.4);
    transform: scale(1.1);
  }

  .fab:active {
    transform: scale(0.95);
  }

  /* Responsive */
  @media (max-width: 768px) {
    .controls {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }

    .legend {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .control-group select {
      min-width: 150px;
    }
  }
</style>
