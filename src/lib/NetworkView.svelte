<script>
  import { onMount, onDestroy } from 'svelte'
  import * as d3 from 'd3'
  import { page } from '$app/stores'
  import { getNodeColor, computeSiblingLinks } from './treeHelpers.js'
  import {
    createForceSimulation,
    updateNetworkNodes,
    updateNetworkLinks,
    applyNodeDrag,
    createNetworkTooltip,
    highlightConnectedNodes,
    createZoomBehavior
  } from './d3Helpers.js'
  import { modal } from '../stores/modalStore.js'
  import { people, relationships } from '../stores/familyStore.js'
  import { notifications } from '../stores/notificationStore.js'

  let svgElement
  let svg, g, zoom
  let width = 1200
  let height = 800
  let initialized = false
  let simulation = null
  let tooltip = null

  // Story #82: Get user's defaultPersonId from session
  $: defaultPersonId = $page?.data?.session?.user?.defaultPersonId

  // Prepare nodes and links for force simulation
  $: nodes = $people.map(p => ({
    ...p,
    x: p.x || width / 2 + (Math.random() - 0.5) * 200,
    y: p.y || height / 2 + (Math.random() - 0.5) * 200
  }))

  // Prepare links from relationships
  $: links = prepareLinks($relationships, nodes)

  // Initialize D3 when svgElement becomes available
  $: if (svgElement && !initialized) {
    svg = d3.select(svgElement)
      .attr('width', width)
      .attr('height', height)
      .style('background', '#f9f9f9')

    g = svg.append('g')

    // Add zoom behavior
    zoom = createZoomBehavior(svg, g, [0.1, 10])

    // Create tooltip
    tooltip = createNetworkTooltip()

    initialized = true

    // Initial render
    if (nodes.length > 0) {
      updateNetwork()
    }
  }

  // Update network when data changes
  $: if (initialized && g && nodes.length > 0) {
    updateNetwork()
  }

  function prepareLinks(rels, nodeList) {
    if (!rels || !nodeList || nodeList.length === 0) return []

    const links = []

    // Add parent-child relationships
    rels.forEach(rel => {
      if (rel.type === 'mother' || rel.type === 'father') {
        links.push({
          source: rel.person1Id,
          target: rel.person2Id,
          type: rel.type,
          id: rel.id
        })
      } else if (rel.type === 'spouse') {
        // Add spouse relationships (bidirectional, but only add once)
        links.push({
          source: rel.person1Id,
          target: rel.person2Id,
          type: 'spouse',
          id: rel.id
        })
      }
    })

    // Add computed sibling relationships
    const siblingLinks = computeSiblingLinks($people, rels)
    siblingLinks.forEach(link => {
      links.push(link)
    })

    return links
  }

  function updateNetwork() {
    if (!g || nodes.length === 0) return

    // Performance warning for large datasets
    if (nodes.length > 500) {
      notifications.info('Large family tree detected. Performance may be affected. Consider filtering the view.')
    }

    // Stop existing simulation if any
    if (simulation) {
      simulation.stop()
    }

    // Create force simulation
    simulation = createForceSimulation(nodes, links, {
      width,
      height,
      chargeStrength: -300,
      linkDistance: 100,
      collisionRadius: 30
    })

    // Apply drag behavior to nodes
    const drag = applyNodeDrag(simulation)

    // Update on each tick
    simulation.on('tick', () => {
      updateNetworkLinks(g, links)
      const nodeSelection = updateNetworkNodes(
        g,
        nodes,
        getNodeColor,
        (person) => modal.open(person.id, 'edit')
      )

      // Apply drag behavior and hover effects
      nodeSelection.call(drag)
        .on('mouseover', function(event, d) {
          const relationshipCount = links.filter(link => {
            const sourceId = link.source.id || link.source
            const targetId = link.target.id || link.target
            return sourceId === d.id || targetId === d.id
          }).length

          const birthYear = d.birthDate ? new Date(d.birthDate).getFullYear() : '?'
          const deathYear = d.deathDate ? new Date(d.deathDate).getFullYear() : ''
          const lifespan = deathYear ? `${birthYear}–${deathYear}` : `${birthYear}–present`

          tooltip.show(
            `<strong>${d.firstName} ${d.lastName}</strong><br/>
             ${lifespan}<br/>
             ${relationshipCount} relationship${relationshipCount !== 1 ? 's' : ''}`,
            event
          )

          highlightConnectedNodes(g, d, links, true)
        })
        .on('mousemove', (event) => {
          tooltip.move(event)
        })
        .on('mouseout', (event, d) => {
          tooltip.hide()
          highlightConnectedNodes(g, d, links, false)
        })
        .on('dblclick', (event, d) => {
          // Double-click to unpin node
          d.fx = null
          d.fy = null
          simulation.alpha(0.3).restart()
        })
    })

    // Render links first (so they appear behind nodes)
    updateNetworkLinks(g, links)
  }

  // Cleanup on component destroy
  onDestroy(() => {
    if (simulation) {
      simulation.stop()
    }
    if (tooltip) {
      tooltip.remove()
    }
  })

  // Handle window resize
  function handleResize() {
    width = window.innerWidth - 40
    height = window.innerHeight - 150

    if (svg) {
      svg.attr('width', width).attr('height', height)
    }

    if (simulation) {
      simulation.force('center', d3.forceCenter(width / 2, height / 2))
      simulation.alpha(0.3).restart()
    }
  }

  onMount(() => {
    window.addEventListener('resize', handleResize)
    handleResize()
  })

  onDestroy(() => {
    window.removeEventListener('resize', handleResize)
  })

  function resetView() {
    if (!svg || !g) return

    // Reset zoom/pan to default
    svg.transition()
      .duration(500)
      .call(zoom.transform, d3.zoomIdentity)
  }

  function reheatSimulation() {
    if (simulation) {
      simulation.alpha(1).restart()
    }
  }
</script>

<div class="network-view">
  {#if $people.length === 0}
    <div class="empty-state">
      <p>No family members to display. Add people to see your network.</p>
      <button on:click={() => modal.openNew()}>Add Person</button>
    </div>
  {:else if $relationships.length === 0}
    <div class="info-banner">
      Add relationships to connect your family network
    </div>
  {/if}

  <div class="controls">
    <button on:click={resetView}>Reset View</button>
    <button on:click={reheatSimulation}>Reheat Simulation</button>
    <span class="node-count">{nodes.length} people, {links.length} connections</span>
  </div>

  <svg bind:this={svgElement}></svg>
</div>

<style>
  .network-view {
    position: relative;
    width: 100%;
    height: calc(100vh - 100px);
    overflow: hidden;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #666;
  }

  .empty-state p {
    font-size: 18px;
    margin-bottom: 20px;
  }

  .empty-state button {
    background: #4CAF50;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 6px;
    font-size: 16px;
    cursor: pointer;
    transition: background 0.2s;
  }

  .empty-state button:hover {
    background: #45a049;
  }

  .info-banner {
    position: absolute;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    background: #2196F3;
    color: white;
    padding: 10px 20px;
    border-radius: 6px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    z-index: 100;
  }

  .controls {
    position: absolute;
    top: 10px;
    right: 10px;
    display: flex;
    gap: 10px;
    align-items: center;
    z-index: 100;
  }

  .controls button {
    background: white;
    border: 1px solid #ccc;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
  }

  .controls button:hover {
    background: #f5f5f5;
    border-color: #999;
  }

  .node-count {
    color: #666;
    font-size: 14px;
    background: white;
    padding: 8px 12px;
    border-radius: 4px;
    border: 1px solid #ccc;
  }

  svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  :global(.network-node) {
    transition: opacity 0.3s;
  }

  :global(.network-node circle) {
    transition: stroke 0.3s, stroke-width 0.3s;
  }

  :global(.network-link) {
    transition: stroke-width 0.3s, opacity 0.3s;
  }

  :global(.network-tooltip) {
    font-size: 12px;
    line-height: 1.5;
  }
</style>
