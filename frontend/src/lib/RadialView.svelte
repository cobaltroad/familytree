<script>
  import { onMount, afterUpdate } from 'svelte'
  import * as d3 from 'd3'
  import { getNodeColor, buildAncestorTree } from './treeHelpers.js'
  import { createZoomBehavior, updateRadialNodes, updateRadialLinks } from './d3Helpers.js'
  import { modal } from '../stores/modalStore.js'
  import { people, relationships } from '../stores/familyStore.js'
  import { rootPeople } from '../stores/derivedStores.js'

  let svgElement
  let svg, g, zoom
  let width = 1000
  let height = 1000
  let focusPersonId = null
  let initialized = false

  // Default focus person to first root
  $: if ($people.length > 0 && !focusPersonId) {
    const roots = $rootPeople
    focusPersonId = roots.length > 0 ? roots[0].id : $people[0].id
  }

  $: focusPerson = $people.find(p => p.id === focusPersonId)

  // Initialize D3 structure on mount
  onMount(() => {
    if (!svgElement) return

    svg = d3.select(svgElement)
      .attr('width', width)
      .attr('height', height)

    g = svg.append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`)

    // Add zoom behavior
    zoom = createZoomBehavior(svg, g, [0.5, 3])

    initialized = true

    // Initial render
    if (focusPerson) {
      updateRadial()
    }
  })

  // Update radial view when focus person or data changes
  $: if (focusPerson && initialized && g) {
    updateRadial()
  }

  function updateRadial() {
    if (!g || !focusPerson) return

    // Build ancestor tree
    const ancestorTree = buildAncestorTree(focusPerson, $people, $relationships, 5)

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

    // Update links using enter/update/exit pattern
    updateRadialLinks(g, treeNodes.links(), { transitionDuration: 300 })

    // Update nodes using enter/update/exit pattern
    updateRadialNodes(
      g,
      treeNodes.descendants(),
      getNodeColor,
      (person) => modal.open(person.id, 'edit'),
      focusPersonId,
      { transitionDuration: 300 }
    )

    // Update generation rings
    updateGenerationRings(maxDepth, radius)
  }

  function updateGenerationRings(maxDepth, radius) {
    if (!g) return

    // Bind ring data
    const ringData = Array.from({ length: maxDepth }, (_, i) => i + 1)

    const rings = g.selectAll('.generation-ring')
      .data(ringData)

    // EXIT
    rings.exit()
      .transition()
      .duration(300)
      .style('opacity', 0)
      .remove()

    // ENTER
    const enterRings = rings.enter()
      .append('g')
      .attr('class', 'generation-ring')
      .style('opacity', 0)

    enterRings.append('circle')
      .attr('class', 'ring-circle')
      .attr('fill', 'none')
      .attr('stroke', '#e0e0e0')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '2,2')

    enterRings.append('text')
      .attr('class', 'ring-label')
      .attr('x', 0)
      .attr('dy', '-0.3em')
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', '#999')

    // MERGE and UPDATE
    const mergedRings = rings.merge(enterRings)

    mergedRings.transition()
      .duration(300)
      .style('opacity', 1)

    mergedRings.select('.ring-circle')
      .attr('r', (d, i) => (radius / maxDepth) * (i + 1))

    mergedRings.select('.ring-label')
      .attr('y', (d, i) => -(radius / maxDepth) * (i + 1))
      .text((d, i) => `Generation ${i + 1}`)
  }
</script>

<div class="radial-container">
  <div class="controls">
    <label class="control-group">
      <span>Focus Person:</span>
      <select bind:value={focusPersonId}>
        {#each $people as person}
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

  {#if $people.length === 0}
    <div class="empty-state">
      <p>No family members to display. Add people in the List View first.</p>
    </div>
  {:else}
    <div class="radial-view">
      <svg bind:this={svgElement}></svg>
    </div>
    <button class="fab" on:click={() => modal.openNew()} aria-label="Add Person">
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
