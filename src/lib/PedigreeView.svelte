<script>
  import { onMount, afterUpdate } from 'svelte'
  import * as d3 from 'd3'
  import { getNodeColor, buildAncestorTree } from './treeHelpers.js'
  import { createZoomBehavior, updatePedigreeNodes, updateTreeLinks } from './d3Helpers.js'
  import { modal } from '../stores/modalStore.js'
  import { people, relationships } from '../stores/familyStore.js'
  import { rootPeople } from '../stores/derivedStores.js'

  let svgElement
  let svg, g, zoom
  let width = 1200
  let height = 800
  let focusPersonId = null
  let initialized = false

  // Default focus person to first root
  $: if ($people.length > 0 && !focusPersonId) {
    const roots = $rootPeople
    focusPersonId = roots.length > 0 ? roots[0].id : $people[0].id
  }

  $: focusPerson = $people.find(p => p.id === focusPersonId)

  // Initialize D3 when svgElement becomes available (reactive to binding)
  $: if (svgElement && !initialized) {
    svg = d3.select(svgElement)
      .attr('width', width)
      .attr('height', height)

    g = svg.append('g')
      .attr('transform', 'translate(100, 50)')

    // Add zoom behavior
    zoom = createZoomBehavior(svg, g, [0.5, 2])

    initialized = true

    // Initial render
    if (focusPerson) {
      updatePedigree()
    }
  }

  // Update pedigree when focus person or data changes
  $: if (focusPerson && initialized && g) {
    updatePedigree()
  }

  function updatePedigree() {
    if (!g || !focusPerson) return

    // Build ancestor tree (parents as children in tree structure)
    const ancestorTree = buildAncestorTree(focusPerson, $people, $relationships, 5)

    if (!ancestorTree) return

    // Convert to D3 hierarchy
    const hierarchy = d3.hierarchy(ancestorTree, d => d.children)

    // Create tree layout with compact spacing
    const treeLayout = d3.tree()
      .size([width - 200, height - 150])
      .separation((a, b) => a.parent === b.parent ? 0.8 : 1)

    const treeNodes = treeLayout(hierarchy)

    // Invert y-coordinates so ancestors appear above
    treeNodes.each(d => {
      d.y = height - 150 - d.y
    })

    // Update links using enter/update/exit pattern
    updateTreeLinks(g, treeNodes.links(), { transitionDuration: 300 })

    // Update nodes using enter/update/exit pattern
    updatePedigreeNodes(
      g,
      treeNodes.descendants(),
      getNodeColor,
      (person) => modal.open(person.id, 'edit'),
      focusPersonId,
      {
        transitionDuration: 300,
        nodeWidth: 80,
        nodeHeight: 40
      }
    )
  }
</script>

<div class="pedigree-container">
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

  {#if $people.length === 0}
    <div class="empty-state">
      <p>No family members to display. Add people in the List View first.</p>
    </div>
  {:else}
    <svg bind:this={svgElement}></svg>
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
