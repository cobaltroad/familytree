<script>
  import { onMount, afterUpdate } from 'svelte'
  import * as d3 from 'd3'
  import { getNodeColor, findRootPeople, buildDescendantTree } from './treeHelpers.js'
  import { createZoomBehavior } from './d3Helpers.js'
  import { modal } from '../stores/modalStore.js'

  export let people = []
  export let relationships = []

  let svgElement
  let width = 1200
  let height = 800

  $: if (people.length > 0) {
    renderTree()
  }

  function buildTreeData() {
    // Find root people (those without parents) using helper
    const rootPeople = findRootPeople(people, relationships)

    // If no roots found, use first person (shouldn't happen with valid data)
    const roots = rootPeople.length > 0 ? rootPeople : people.slice(0, 1)

    // Build tree structure for each root using helper
    return roots.map(root => buildDescendantTree(root, people, relationships))
  }

  function renderTree() {
    if (!svgElement) return

    // Clear existing content
    d3.select(svgElement).selectAll('*').remove()

    const treeData = buildTreeData()
    if (treeData.length === 0) return

    // For simplicity, render first root's tree
    const rootNode = treeData[0]

    // Convert to D3 hierarchy
    const hierarchy = d3.hierarchy(rootNode, d => d.children)

    // Create tree layout
    const treeLayout = d3.tree()
      .size([width - 100, height - 100])
      .separation((a, b) => a.parent === b.parent ? 1 : 1.5)

    const treeNodes = treeLayout(hierarchy)

    // Create SVG with zoom
    const svg = d3.select(svgElement)
      .attr('width', width)
      .attr('height', height)

    const g = svg.append('g')
      .attr('transform', 'translate(50, 50)')

    // Add zoom behavior using helper
    createZoomBehavior(svg, g, [0.5, 2])

    // Draw links (lines between parent and child)
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

    // Add rectangles for person nodes
    nodes.append('rect')
      .attr('width', 120)
      .attr('height', 60)
      .attr('x', -60)
      .attr('y', -30)
      .attr('rx', 5)
      .attr('fill', d => getNodeColor(d.data.person))
      .attr('stroke', d => d.data.person.deathDate ? '#666' : '#333')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', d => d.data.person.deathDate ? '5,5' : '0')
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation()
        modal.open(d.data.person.id, 'edit')
      })

    // Add person name
    nodes.append('text')
      .attr('dy', -5)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .text(d => `${d.data.person.firstName} ${d.data.person.lastName}`)

    // Add birth year
    nodes.append('text')
      .attr('dy', 10)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .text(d => {
        const birth = d.data.person.birthDate ? new Date(d.data.person.birthDate).getFullYear() : '?'
        const death = d.data.person.deathDate ? new Date(d.data.person.deathDate).getFullYear() : ''
        return death ? `${birth} - ${death}` : birth
      })

    // Add spouse if exists
    nodes.filter(d => d.data.spouse)
      .each(function(d) {
        const spouseG = d3.select(this)

        // Spouse rectangle (to the right)
        spouseG.append('rect')
          .attr('width', 120)
          .attr('height', 60)
          .attr('x', 70)
          .attr('y', -30)
          .attr('rx', 5)
          .attr('fill', getNodeColor(d.data.spouse))
          .attr('stroke', d.data.spouse.deathDate ? '#666' : '#333')
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', d.data.spouse.deathDate ? '5,5' : '0')
          .style('cursor', 'pointer')
          .on('click', (event) => {
            event.stopPropagation()
            modal.open(d.data.spouse.id, 'edit')
          })

        // Marriage line
        spouseG.append('line')
          .attr('x1', 60)
          .attr('y1', 0)
          .attr('x2', 70)
          .attr('y2', 0)
          .attr('stroke', '#999')
          .attr('stroke-width', 2)

        // Spouse name
        spouseG.append('text')
          .attr('x', 130)
          .attr('dy', -5)
          .attr('text-anchor', 'middle')
          .attr('font-size', '12px')
          .attr('font-weight', 'bold')
          .text(`${d.data.spouse.firstName} ${d.data.spouse.lastName}`)

        // Spouse birth year
        spouseG.append('text')
          .attr('x', 130)
          .attr('dy', 10)
          .attr('text-anchor', 'middle')
          .attr('font-size', '10px')
          .text(() => {
            const birth = d.data.spouse.birthDate ? new Date(d.data.spouse.birthDate).getFullYear() : '?'
            const death = d.data.spouse.deathDate ? new Date(d.data.spouse.deathDate).getFullYear() : ''
            return death ? `${birth} - ${death}` : birth
          })
      })
  }

  onMount(() => {
    renderTree()
  })

  afterUpdate(() => {
    renderTree()
  })
</script>

<div class="tree-container">
  {#if people.length === 0}
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
