<script>
  import { onMount, afterUpdate } from 'svelte'
  import * as d3 from 'd3'
  import { getNodeColor } from './treeHelpers.js'
  import { createZoomBehavior, updateTreeNodes, updateTreeLinks } from './d3Helpers.js'
  import { modal } from '../stores/modalStore.js'
  import { familyTree } from '../stores/derivedStores.js'

  let svgElement
  let svg, g, zoom
  let width = 1200
  let height = 800
  let initialized = false

  // Initialize D3 structure on mount
  onMount(() => {
    if (!svgElement) return

    svg = d3.select(svgElement)
      .attr('width', width)
      .attr('height', height)

    g = svg.append('g')
      .attr('transform', 'translate(50, 50)')

    // Add zoom behavior using helper
    zoom = createZoomBehavior(svg, g, [0.5, 2])

    initialized = true

    // Initial render
    if ($familyTree && $familyTree.length > 0) {
      updateTree($familyTree)
    }
  })

  // Update tree when familyTree changes
  $: if ($familyTree && $familyTree.length > 0 && initialized && g) {
    updateTree($familyTree)
  }

  afterUpdate(() => {
    if ($familyTree && $familyTree.length > 0 && initialized && g) {
      updateTree($familyTree)
    }
  })

  function updateTree(treeData) {
    if (!g || treeData.length === 0) return

    // For simplicity, render first root's tree
    const rootNode = treeData[0]

    // Convert to D3 hierarchy
    const hierarchy = d3.hierarchy(rootNode, d => d.children)

    // Create tree layout
    const treeLayout = d3.tree()
      .size([width - 100, height - 100])
      .separation((a, b) => a.parent === b.parent ? 1 : 1.5)

    const treeNodes = treeLayout(hierarchy)

    // Update links using enter/update/exit pattern
    updateTreeLinks(g, treeNodes.links(), { transitionDuration: 300 })

    // Update nodes using enter/update/exit pattern
    updateTreeNodes(
      g,
      treeNodes.descendants(),
      getNodeColor,
      (person) => modal.open(person.id, 'edit'),
      {
        transitionDuration: 300,
        nodeWidth: 120,
        nodeHeight: 60,
        includeSpouses: true
      }
    )
  }
</script>

<div class="tree-container">
  {#if !$familyTree || $familyTree.length === 0}
    <p>No family members to display. Add people in the List View first.</p>
  {:else}
    <svg bind:this={svgElement}></svg>
    <button class="fab" on:click={() => modal.openNew()} aria-label="Add Person">
      +
    </button>
  {/if}
</div>

<style>
  .tree-container {
    width: 100%;
    height: 800px;
    overflow: auto;
    border: 1px solid #ccc;
    border-radius: 8px;
    background: #fafafa;
  }

  svg {
    cursor: grab;
  }

  svg:active {
    cursor: grabbing;
  }

  :global(.node) {
    cursor: pointer;
  }

  :global(.node:hover rect) {
    filter: brightness(0.9);
  }

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
</style>
