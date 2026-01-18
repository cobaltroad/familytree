<script>
  /**
   * FamilyChartPOC - Proof of Concept for family-chart library integration
   *
   * This component evaluates the family-chart library as a potential replacement
   * for our current D3.js-based visualizations.
   *
   * @component
   */

  import { onMount, afterUpdate } from 'svelte'
  import { createChart } from 'family-chart'
  import { people, relationships } from '../stores/familyStore.js'
  import { rootPeople } from '../stores/derivedStores.js'
  import { modal } from '../stores/modalStore.js'

  // Component state
  let chartContainer
  let chartInstance = null
  let focusPersonId = null
  let transformedData = []
  let transitionTime = 300

  // Props for testing and customization
  export let onPersonClick = null

  // Expose state for testing via getters
  export function getTransformedData() {
    return transformedData
  }

  export function getChartInstance() {
    return chartInstance
  }

  export function getFocusPersonId() {
    return focusPersonId
  }

  export function getTransitionTime() {
    return transitionTime
  }

  /**
   * Transform our Person data model to family-chart's Datum format
   *
   * Our format:
   * - id: number
   * - gender: 'male' | 'female' | 'other' | null
   * - relationships stored separately
   *
   * family-chart format:
   * - id: string
   * - data.gender: 'M' | 'F'
   * - rels: { parents: string[], spouses: string[], children: string[] }
   */
  function transformDataForFamilyChart(peopleData, relationshipsData) {
    if (!peopleData || peopleData.length === 0) {
      return []
    }

    // Create a map of valid person IDs for relationship validation
    const validIds = new Set(peopleData.map(p => p.id))

    // Build relationship maps
    const parentsMap = new Map() // childId -> [parentId, ...]
    const childrenMap = new Map() // parentId -> [childId, ...]
    const spousesMap = new Map() // personId -> [spouseId, ...]

    // Process relationships
    relationshipsData.forEach(rel => {
      const person1Id = rel.person1Id?.toString()
      const person2Id = rel.person2Id?.toString()

      // Validate relationship references
      if (!validIds.has(rel.person1Id) || !validIds.has(rel.person2Id)) {
        // Skip invalid relationships
        return
      }

      // Handle parent-child relationships
      if (rel.type === 'mother' || rel.type === 'father' || rel.type === 'parentOf') {
        // person1 is parent, person2 is child
        if (!parentsMap.has(person2Id)) {
          parentsMap.set(person2Id, [])
        }
        parentsMap.get(person2Id).push(person1Id)

        if (!childrenMap.has(person1Id)) {
          childrenMap.set(person1Id, [])
        }
        childrenMap.get(person1Id).push(person2Id)
      }

      // Handle spouse relationships
      if (rel.type === 'spouse') {
        // Bidirectional
        if (!spousesMap.has(person1Id)) {
          spousesMap.set(person1Id, [])
        }
        spousesMap.get(person1Id).push(person2Id)

        if (!spousesMap.has(person2Id)) {
          spousesMap.set(person2Id, [])
        }
        spousesMap.get(person2Id).push(person1Id)
      }
    })

    // Transform each person
    return peopleData.map(person => {
      const personId = person.id.toString()

      // Map gender to family-chart format
      let gender = 'M' // Default to male if not specified
      if (person.gender) {
        const genderLower = person.gender.toLowerCase()
        if (genderLower === 'female') {
          gender = 'F'
        } else if (genderLower === 'male') {
          gender = 'M'
        } else {
          // For 'other' or 'unspecified', default to M
          gender = 'M'
        }
      }

      return {
        id: personId,
        data: {
          gender: gender,
          firstName: person.firstName,
          lastName: person.lastName,
          birthDate: person.birthDate,
          deathDate: person.deathDate,
          // Include original data for reference
          originalId: person.id
        },
        rels: {
          parents: parentsMap.get(personId) || [],
          spouses: spousesMap.get(personId) || [],
          children: childrenMap.get(personId) || []
        }
      }
    })
  }

  // Reactive transformation
  $: transformedData = transformDataForFamilyChart($people, $relationships)

  // Set initial focus person
  $: if ($people.length > 0 && !focusPersonId) {
    const roots = $rootPeople
    focusPersonId = roots.length > 0 ? roots[0].id : $people[0].id
  }

  // Find main person datum
  $: mainDatum = transformedData.find(d => d.id === focusPersonId?.toString())

  /**
   * Initialize the family-chart instance
   */
  function initializeChart() {
    if (!chartContainer || transformedData.length === 0 || !mainDatum) {
      return
    }

    try {
      // Clear existing chart
      if (chartInstance) {
        chartContainer.innerHTML = ''
      }

      // Create chart instance
      chartInstance = createChart(chartContainer, transformedData)

      // Configure chart
      chartInstance
        .setTransitionTime(transitionTime)
        .setAncestryDepth(5)
        .setProgenyDepth(3)

      // Customize card appearance - use SVG cards
      const cardInstance = chartInstance.setCardSvg()

      // Set card dimensions (width, height)
      cardInstance.setCardDim({ w: 120, h: 60, text_x: 60, text_y: 25, img_w: 0, img_h: 0, img_x: 0, img_y: 0 })

      // Set card display function (returns array of display functions)
      // First line: full name, Second line: lifespan
      cardInstance.setCardDisplay([
        (data) => `${data.firstName || ''} ${data.lastName || ''}`.trim(),
        (data) => formatLifespan(data.birthDate, data.deathDate)
      ])

      // Set click handler
      cardInstance.setOnCardClick((e, d) => {
        handlePersonClick(d.data.originalId)
      })

      // Add data-person-id attribute to cards for testing
      cardInstance.setOnCardUpdate((d) => {
        const cardElement = chartContainer.querySelector(`g.card[data-id="${d.id}"]`)
        if (cardElement) {
          cardElement.setAttribute('data-person-id', d.data.originalId)
        }
      })

      // Update main person and render
      chartInstance
        .updateMainId(mainDatum.id)
        .updateTree({ initial: true, tree_position: 'main_to_middle' })

      // Enable zoom and pan
      enableZoomPan()

    } catch (error) {
      console.error('Error initializing family-chart:', error)
    }
  }

  /**
   * Enable zoom and pan functionality
   */
  function enableZoomPan() {
    if (!chartInstance || !chartInstance.svg) return

    // family-chart has built-in zoom/pan via D3
    // Set data attribute for testing
    chartInstance.svg.setAttribute('data-pan-enabled', 'true')
  }

  /**
   * Handle person card click
   */
  function handlePersonClick(personId) {
    if (onPersonClick) {
      onPersonClick(personId)
    } else {
      // Default behavior: open modal
      modal.open(personId, 'edit')
    }
  }

  /**
   * Format lifespan string
   */
  function formatLifespan(birthDate, deathDate) {
    const birth = birthDate ? new Date(birthDate).getFullYear() : '?'
    const death = deathDate ? new Date(deathDate).getFullYear() : 'present'
    return `${birth}–${death}`
  }

  /**
   * Update chart when data changes
   */
  function updateChart() {
    if (!chartInstance || !mainDatum) return

    try {
      // Update data
      chartInstance.updateData(transformedData)

      // Update tree with inherited position (preserves zoom/pan)
      chartInstance.updateTree({ tree_position: 'inherit' })
    } catch (error) {
      console.error('Error updating family-chart:', error)
    }
  }

  // Initialize chart on mount
  onMount(() => {
    initializeChart()
  })

  // Update chart when data changes
  afterUpdate(() => {
    if (chartInstance && transformedData.length > 0) {
      updateChart()
    } else if (!chartInstance && chartContainer && transformedData.length > 0) {
      initializeChart()
    }
  })

  // Handle focus person change
  $: if (chartInstance && focusPersonId && mainDatum) {
    chartInstance.updateMainId(mainDatum.id)
    chartInstance.updateTree({ tree_position: 'main_to_middle' })
  }

  // Zoom controls
  function zoomIn() {
    if (!chartInstance) return
    // TODO: Implement zoom controls
  }

  function zoomOut() {
    if (!chartInstance) return
    // TODO: Implement zoom controls
  }
</script>

<div class="family-chart-poc">
  {#if $people.length === 0}
    <div class="empty-state">
      <p>No family members to display. Add people to see the family tree.</p>
    </div>
  {:else}
    <div class="controls">
      <label class="control-group">
        <span>Focus Person:</span>
        <select bind:value={focusPersonId} data-testid="focus-person-select">
          {#each $people as person}
            <option value={person.id}>
              {person.firstName} {person.lastName}
            </option>
          {/each}
        </select>
      </label>

      <div class="zoom-controls">
        <button on:click={zoomIn} data-testid="zoom-in" title="Zoom In">+</button>
        <button on:click={zoomOut} data-testid="zoom-out" title="Zoom Out">-</button>
      </div>
    </div>

    <div
      bind:this={chartContainer}
      data-testid="family-chart-container"
      class="chart-container"
    ></div>
  {/if}
</div>

<style>
  .family-chart-poc {
    width: 100%;
    height: calc(100vh - 200px);
    display: flex;
    flex-direction: column;
    background: #fafafa;

    /* Gender-based card colors (matching PedigreeView) */
    --male-color: #AED6F1;     /* Blue for male */
    --female-color: #F8BBD0;   /* Pink for female */
    --genderless-color: #E0E0E0; /* Gray for other/unknown */
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #666;
    font-size: 16px;
  }

  .controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    background: white;
    border-bottom: 1px solid #ddd;
    gap: 16px;
  }

  .control-group {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
  }

  .control-group span {
    font-weight: 500;
    color: #333;
  }

  .control-group select {
    padding: 6px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
    min-width: 200px;
  }

  .zoom-controls {
    display: flex;
    gap: 8px;
  }

  .zoom-controls button {
    width: 32px;
    height: 32px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: white;
    cursor: pointer;
    font-size: 18px;
    font-weight: bold;
    transition: all 0.2s;
  }

  .zoom-controls button:hover {
    background: #f5f5f5;
    border-color: #4CAF50;
  }

  .zoom-controls button:active {
    background: #e8e8e8;
  }

  .chart-container {
    flex: 1;
    overflow: hidden;
    position: relative;
    background: white;
  }

  :global(.chart-container svg) {
    width: 100%;
    height: 100%;
  }

  :global(.chart-container .deceased rect) {
    opacity: 0.7;
  }
</style>
