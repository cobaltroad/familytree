<script>
  /**
   * TreeView - Production family tree visualization using family-chart library
   *
   * This component provides an alternative to the D3.js PedigreeView, using the
   * family-chart library for a more feature-rich ancestor visualization.
   *
   * Features:
   * - Ancestor tree with focus person selection
   * - Gender-based card styling (male=#AED6F1, female=#F8BBD0, other=#E0E0E0)
   * - Deceased indicator (dashed border)
   * - Click person to open modal
   * - Built-in zoom and pan
   * - 300ms smooth transitions
   * - Dynamic updates when data changes
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
        .setCardSvg() // Use SVG cards for better performance
        .updateMainId(mainDatum.id)

      // Customize card appearance
      const cardInstance = chartInstance.setCardSvg()
      cardInstance.setCardTemplate((d) => {
        const person = d.data
        const lifespan = formatLifespan(person.birthDate, person.deathDate)
        const isDeceased = person.deathDate !== null

        // Gender-based colors (matching current PedigreeView)
        // Female: pink, Male: blue, Other/Unknown: gray
        let fillColor = '#AED6F1' // Default to male (blue)
        if (person.gender === 'F') {
          fillColor = '#F8BBD0' // Female (pink)
        } else if (person.gender === 'M') {
          fillColor = '#AED6F1' // Male (blue)
        } else {
          fillColor = '#E0E0E0' // Other/Unknown (gray)
        }
        const strokeColor = isDeceased ? '#666' : '#333'
        const strokeDasharray = isDeceased ? '5,3' : 'none'

        return {
          svg: `
            <g data-person-id="${person.originalId}" class="${isDeceased ? 'deceased' : ''}">
              <rect x="0" y="0" width="120" height="60"
                    fill="${fillColor}"
                    stroke="${strokeColor}"
                    stroke-width="2"
                    stroke-dasharray="${strokeDasharray}"
                    rx="4" />
              <text x="60" y="25" text-anchor="middle" font-size="14" font-weight="bold">
                ${person.firstName} ${person.lastName}
              </text>
              <text x="60" y="45" text-anchor="middle" font-size="11" fill="#555">
                ${lifespan}
              </text>
            </g>
          `,
          click: () => handlePersonClick(person.originalId)
        }
      })

      // Initial render
      chartInstance.updateTree({ initial: true, tree_position: 'main_to_middle' })

    } catch (error) {
      console.error('Error initializing family-chart:', error)
    }
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
</script>

<div class="tree-container">
  {#if $people.length === 0}
    <div class="empty-state">
      <p>No people in your family tree yet. Add people to see the family tree visualization.</p>
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
    </div>

    <div
      bind:this={chartContainer}
      data-testid="chart-wrapper"
      class="chart-wrapper"
    ></div>
  {/if}
</div>

<style>
  .tree-container {
    width: 100%;
    height: calc(100vh - 200px);
    display: flex;
    flex-direction: column;
    background: #fafafa;
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #666;
    font-size: 16px;
    text-align: center;
    padding: 2rem;
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

  .chart-wrapper {
    flex: 1;
    overflow: hidden;
    position: relative;
    background: white;
  }

  :global(.chart-wrapper svg) {
    width: 100%;
    height: 100%;
  }

  :global(.chart-wrapper .deceased rect) {
    opacity: 0.7;
  }
</style>
