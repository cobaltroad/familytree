<script>
  import { onMount, afterUpdate } from 'svelte'
  import * as d3 from 'd3'
  import { getNodeColor, formatLifespan, assignGenerations } from './treeHelpers.js'
  import { modal } from '../stores/modalStore.js'
  import { people, relationships } from '../stores/familyStore.js'

  let svgElement
  let width = 1200
  let height = 600
  let groupBy = 'birth' // 'birth' or 'generation'
  let showDeceased = true
  let showLiving = true

  $: filteredPeople = $people.filter(p => {
    if (!p.birthDate) return false
    if (!showDeceased && p.deathDate) return false
    if (!showLiving && !p.deathDate) return false
    return true
  })

  $: excludedCount = $people.filter(p => !p.birthDate).length

  $: if (filteredPeople.length > 0) {
    renderTimeline()
  }

  function renderTimeline() {
    if (!svgElement) return

    // Clear existing content
    d3.select(svgElement).selectAll('*').remove()

    if (filteredPeople.length === 0) return

    // Calculate date range
    const minYear = d3.min(filteredPeople, p => new Date(p.birthDate).getFullYear())
    const maxYear = Math.max(
      d3.max(filteredPeople, p =>
        p.deathDate ? new Date(p.deathDate).getFullYear() : new Date().getFullYear()
      ),
      new Date().getFullYear()
    )

    // X-scale for years
    const xScale = d3.scaleTime()
      .domain([new Date(minYear - 5, 0, 1), new Date(maxYear + 5, 11, 31)])
      .range([150, width - 100])

    // Sort people based on groupBy setting
    let sortedPeople
    if (groupBy === 'generation') {
      const peopleWithGen = assignGenerations(filteredPeople, $relationships)
      sortedPeople = peopleWithGen.sort((a, b) => {
        if (a.generation !== b.generation) return a.generation - b.generation
        return new Date(a.birthDate) - new Date(b.birthDate)
      })
    } else {
      sortedPeople = [...filteredPeople].sort((a, b) =>
        new Date(a.birthDate) - new Date(b.birthDate)
      )
    }

    // Dynamic height based on count
    const barHeight = 25
    const barSpacing = 5
    const calculatedHeight = sortedPeople.length * (barHeight + barSpacing) + 150
    height = Math.max(600, calculatedHeight)

    // Create SVG
    const svg = d3.select(svgElement)
      .attr('width', width)
      .attr('height', height)

    // X-axis
    const xAxis = d3.axisBottom(xScale)
      .tickFormat(d3.timeFormat("%Y"))
      .ticks(d3.timeYear.every(10))

    svg.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${height - 50})`)
      .call(xAxis)
      .selectAll('text')
      .attr('font-size', '12px')

    // Grid lines
    svg.append('g')
      .attr('class', 'grid')
      .selectAll('line')
      .data(xScale.ticks(d3.timeYear.every(10)))
      .enter()
      .append('line')
      .attr('x1', d => xScale(d))
      .attr('x2', d => xScale(d))
      .attr('y1', 0)
      .attr('y2', height - 50)
      .attr('stroke', '#e0e0e0')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '2,2')

    // Lifespan bars
    const bars = svg.selectAll('.person-bar')
      .data(sortedPeople)
      .enter()
      .append('g')
      .attr('class', 'person-bar')
      .attr('transform', (d, i) => `translate(0, ${i * (barHeight + barSpacing) + 50})`)

    // Bar rectangles
    bars.append('rect')
      .attr('x', d => xScale(new Date(d.birthDate)))
      .attr('y', 0)
      .attr('width', d => {
        const endDate = d.deathDate ? new Date(d.deathDate) : new Date()
        return Math.max(3, xScale(endDate) - xScale(new Date(d.birthDate)))
      })
      .attr('height', barHeight)
      .attr('rx', 3)
      .attr('fill', d => getNodeColor(d))
      .attr('stroke', d => d.deathDate ? '#666' : '#333')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', d => d.deathDate ? '3,3' : '0')
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation()
        modal.open(d.id, 'edit')
      })
      .on('mouseover', function() {
        d3.select(this).attr('opacity', 0.8)
      })
      .on('mouseout', function() {
        d3.select(this).attr('opacity', 1)
      })

    // Name labels (left side)
    bars.append('text')
      .attr('x', 145)
      .attr('y', barHeight / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .text(d => `${d.firstName} ${d.lastName}`)

    // Lifespan labels (inside bar if space, otherwise outside)
    bars.append('text')
      .attr('x', d => {
        const start = xScale(new Date(d.birthDate))
        const end = d.deathDate ? xScale(new Date(d.deathDate)) : xScale(new Date())
        const barWidth = end - start
        return barWidth > 80 ? start + 5 : end + 5
      })
      .attr('y', barHeight / 2)
      .attr('dy', '0.35em')
      .attr('font-size', '10px')
      .attr('fill', d => {
        const start = xScale(new Date(d.birthDate))
        const end = d.deathDate ? xScale(new Date(d.deathDate)) : xScale(new Date())
        const barWidth = end - start
        return barWidth > 80 ? 'white' : '#666'
      })
      .text(d => formatLifespan(d.birthDate, d.deathDate))

    // Generation labels if grouping by generation
    if (groupBy === 'generation') {
      const peopleWithGen = assignGenerations(sortedPeople, $relationships)
      let lastGen = -1
      let genY = 50

      peopleWithGen.forEach((person, i) => {
        if (person.generation !== lastGen) {
          svg.append('text')
            .attr('x', 10)
            .attr('y', genY + barHeight / 2)
            .attr('dy', '0.35em')
            .attr('font-size', '11px')
            .attr('font-weight', 'bold')
            .attr('fill', '#666')
            .text(`Gen ${person.generation}`)

          lastGen = person.generation
        }
        genY += barHeight + barSpacing
      })
    }
  }

  onMount(() => {
    if (filteredPeople.length > 0) {
      renderTimeline()
    }
  })

  afterUpdate(() => {
    if (filteredPeople.length > 0) {
      renderTimeline()
    }
  })
</script>

<div class="timeline-container">
  <div class="controls">
    <label class="control-group">
      <span>Group by:</span>
      <select bind:value={groupBy}>
        <option value="birth">Birth Year</option>
        <option value="generation">Generation</option>
      </select>
    </label>

    <label class="control-group checkbox">
      <input type="checkbox" bind:checked={showLiving} />
      <span>Show Living</span>
    </label>

    <label class="control-group checkbox">
      <input type="checkbox" bind:checked={showDeceased} />
      <span>Show Deceased</span>
    </label>

    {#if excludedCount > 0}
      <span class="excluded-notice">
        ({excludedCount} {excludedCount === 1 ? 'person' : 'people'} without birth dates excluded)
      </span>
    {/if}
  </div>

  {#if filteredPeople.length === 0}
    <div class="empty-state">
      <p>No people with birth dates to display.</p>
      {#if excludedCount > 0}
        <p>Add birth dates in the List view to see people on the timeline.</p>
      {/if}
    </div>
  {:else}
    <div class="timeline-scroll">
      <svg bind:this={svgElement}></svg>
    </div>
  {/if}
</div>

<style>
  .timeline-container {
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
    gap: 1.5rem;
    flex-wrap: wrap;
    align-items: center;
    border-bottom: 1px solid #e0e0e0;
    background: white;
    position: sticky;
    top: 0;
    z-index: 10;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .control-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.95rem;
  }

  .control-group select {
    padding: 0.4rem 0.6rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 0.9rem;
  }

  .control-group.checkbox {
    cursor: pointer;
  }

  .control-group input[type="checkbox"] {
    cursor: pointer;
  }

  .excluded-notice {
    color: #666;
    font-size: 0.85rem;
    font-style: italic;
  }

  .timeline-scroll {
    flex: 1;
    overflow: auto;
    padding: 1rem;
  }

  .empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    text-align: center;
    color: #666;
  }

  .empty-state p {
    margin: 0.5rem 0;
  }

  svg {
    display: block;
  }

  :global(.timeline-container .person-bar) {
    cursor: pointer;
  }

  :global(.timeline-container .x-axis line),
  :global(.timeline-container .x-axis path) {
    stroke: #999;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .controls {
      gap: 1rem;
    }

    .control-group {
      font-size: 0.85rem;
    }
  }
</style>
