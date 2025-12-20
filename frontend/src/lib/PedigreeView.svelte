<script>
  import { onMount, afterUpdate } from 'svelte'
  import * as d3 from 'd3'
  import { getNodeColor, findRootPeople, buildAncestorTree } from './treeHelpers.js'
  import { createZoomBehavior } from './d3Helpers.js'
  import { modal } from '../stores/modalStore.js'

  export let people = []
  export let relationships = []

  let svgElement
  let width = 1200
  let height = 800
  let focusPersonId = null

  // Default focus person to first root
  $: if (people.length > 0 && !focusPersonId) {
    const roots = findRootPeople(people, relationships)
    focusPersonId = roots.length > 0 ? roots[0].id : people[0].id
  }

  $: focusPerson = people.find(p => p.id === focusPersonId)

  $: if (focusPerson) {
    renderPedigree()
  }

  function renderPedigree() {
    if (!svgElement || !focusPerson) return

    // Clear existing content
    d3.select(svgElement).selectAll('*').remove()

    // Build ancestor tree (parents as children in tree structure)
    const ancestorTree = buildAncestorTree(focusPerson, people, relationships, 5)

    if (!ancestorTree) return

    // Convert to D3 hierarchy
    const hierarchy = d3.hierarchy(ancestorTree, d => d.children)

    // Create tree layout with compact spacing
    const treeLayout = d3.tree()
      .size([width - 200, height - 150])
      .separation((a, b) => a.parent === b.parent ? 0.8 : 1)

    const treeNodes = treeLayout(hierarchy)

    // Create SVG with zoom
    const svg = d3.select(svgElement)
      .attr('width', width)
      .attr('height', height)

    const g = svg.append('g')
      .attr('transform', 'translate(100, 50)')

    // Add zoom behavior
    createZoomBehavior(svg, g, [0.5, 2])

    // Invert y-coordinates so ancestors appear above
    treeNodes.each(d => {
      d.y = height - 150 - d.y
    })

    // Draw links
    g.selectAll('.link')
      .data(treeNodes.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', d3.linkVertical()
        .x(d => d.x)
        .y(d => d.y))
      .attr('fill', 'none')
      .attr('stroke', '#ccc')
      .attr('stroke-width', 2)

    // Draw nodes
    const nodes = g.selectAll('.node')
      .data(treeNodes.descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.x},${d.y})`)

    // Compact rectangles (80x40 vs 120x60)
    nodes.append('rect')
      .attr('width', 80)
      .attr('height', 40)
      .attr('x', -40)
      .attr('y', -20)
      .attr('rx', 4)
      .attr('fill', d => getNodeColor(d.data.person))
      .attr('stroke', d => {
        // Highlight focus person
        if (d.data.person.id === focusPersonId) return '#4CAF50'
        return d.data.person.deathDate ? '#666' : '#333'
      })
      .attr('stroke-width', d => d.data.person.id === focusPersonId ? 3 : 2)
      .attr('stroke-dasharray', d => d.data.person.deathDate ? '3,3' : '0')
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation()
        modal.open(d.data.person.id, 'edit')
      })

    // Add person name (compact)
    nodes.append('text')
      .attr('dy', -2)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .text(d => {
        const p = d.data.person
        // Shorten long names
        const firstName = p.firstName.length > 8 ? p.firstName.substring(0, 7) + '.' : p.firstName
        const lastName = p.lastName.length > 8 ? p.lastName.substring(0, 7) + '.' : p.lastName
        return `${firstName} ${lastName}`
      })

    // Add birth year (compact)
    nodes.append('text')
      .attr('dy', 8)
      .attr('text-anchor', 'middle')
      .attr('font-size', '9px')
      .text(d => {
        const birth = d.data.person.birthDate ? new Date(d.data.person.birthDate).getFullYear() : '?'
        const death = d.data.person.deathDate ? new Date(d.data.person.deathDate).getFullYear() : ''
        return death ? `${birth}–${death}` : birth
      })

    // Add generation labels
    nodes.append('text')
      .attr('x', -45)
      .attr('y', 0)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .attr('font-size', '8px')
      .attr('fill', '#999')
      .text(d => `G${d.depth}`)
  }

  onMount(() => {
    if (focusPerson) {
      renderPedigree()
    }
  })

  afterUpdate(() => {
    if (focusPerson) {
      renderPedigree()
    }
  })
</script>

<div class="pedigree-container">
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
        <span class="legend-box focus"></span>
        Focus Person
      </span>
      <span class="legend-item">
        <span class="legend-box deceased"></span>
        Deceased
      </span>
      <span class="legend-item">G0 = Focus, G1 = Parents, G2 = Grandparents, etc.</span>
    </div>
  </div>

  {#if people.length === 0}
    <div class="empty-state">
      <p>No family members to display. Add people in the List View first.</p>
    </div>
  {:else}
    <svg bind:this={svgElement}></svg>
    <button class="fab" on:click={() => modal.openNew()} aria-label="Add Person">
      +
    </button>
  {/if}
</div>

<style>
  .pedigree-container {
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

  .legend-box {
    width: 24px;
    height: 16px;
    border-radius: 2px;
    border: 2px solid #333;
  }

  .legend-box.focus {
    border-color: #4CAF50;
    border-width: 3px;
    background: #E0E0E0;
  }

  .legend-box.deceased {
    border-style: dashed;
    background: #E0E0E0;
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

  svg {
    flex: 1;
    cursor: grab;
  }

  svg:active {
    cursor: grabbing;
  }

  :global(.pedigree-container .node) {
    cursor: pointer;
  }

  :global(.pedigree-container .node:hover rect) {
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
