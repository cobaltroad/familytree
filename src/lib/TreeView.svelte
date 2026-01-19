<script>
  /**
   * TreeView - Production family tree visualization using family-chart library
   *
   * This component provides an alternative to the D3.js PedigreeView, using the
   * family-chart library for a more feature-rich ancestor visualization.
   *
   * Features:
   * - Ancestor tree with focus person selection
   * - Gender-based card styling via CSS variables (male=#AED6F1, female=#F8BBD0, other=#E0E0E0)
   * - Person cards display full name and lifespan (birth-death or birth-present)
   * - Click person to open modal for editing
   * - Built-in zoom and pan
   * - 300ms smooth transitions
   * - Dynamic updates when data changes
   *
   * Implementation Notes:
   * - Uses family-chart's CardSvg API with setCardDisplay() for content
   * - Card colors are controlled by CSS variables (--male-color, --female-color, --genderless-color)
   * - The library automatically applies card-male, card-female, card-genderless classes based on data.gender
   * - setOnCardUpdate() adds data-person-id attributes for testing and click handling
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
          formattedLifespan: formatLifespan(person.birthDate, person.deathDate),
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
    if (chartInstance) {
      chartContainer.innerHTML = ''
    }

    // Create chart instance
    chartInstance = createChart(chartContainer, transformedData)

    // Create HTML card instance
    const cardInstance = chartInstance.setCardHtml();

    cardInstance.setCardInnerHtmlCreator((d) => {
      const person = d.data.data;
      const lifespan = formatLifespan(person.birthDate, person.deathDate);
      const isDeceased = person.deathDate !== null;
      // Inline styles override everything
      const bgColor = person.gender === 'F' ? '#F8BBD0' : '#AED6F1';
      const borderStyle = isDeceased ? 'dashed 2px #666' : 'solid 2px #333';

      return `
        <div data-person-id="${person.originalId}"
           style="
             width: 120px; height: 60px;
             background-color: ${bgColor};
             border: ${borderStyle};
             border-radius: 4px;
             padding: 4px 8px;
             box-sizing: border-box;
             display: flex;
             flex-direction: column;
             justify-content: center;
             align-items: center;
             font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
             font-size: 12px;
             cursor: pointer;
             position: relative;
             overflow: hidden;
           "
           title="${person.firstName} ${person.lastName} (${lifespan})">
        <div style="
            font-weight: 600;
            font-size: 13px;
            line-height: 1.1;
            text-align: center;
            margin-bottom: 1px;
            word-break: break-word;">
          ${person.firstName}<br>${person.lastName}
        </div>
        <div style="
            font-size: 10px;
            color: #666;
            text-align: center;
            line-height: 1;">
          ${lifespan}
        </div>
      `;
    });

    // In initializeChart, replace the entire cardInstance block with:
    chartInstance
      .setTransitionTime(transitionTime)
      .setAncestryDepth(5)
      .setProgenyDepth(3)
      .updateMainId(mainDatum.id)

    chartInstance.updateTree({ initial: true, tree_position: 'main_to_middle' })
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
  const birth = birthDate && !isNaN(new Date(birthDate).getTime()) ? new Date(birthDate).getFullYear() : '?'
  const death = deathDate && !isNaN(new Date(deathDate).getTime()) ? new Date(deathDate).getFullYear() : 'present'
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
    console.log('onMount container/data:', !!chartContainer, transformedData.length);
    /* don't run initializeChart until the stores are ready
    initializeChart()
    */
  })

  // Update chart when data changes
  afterUpdate(() => {
    console.log('afterUpdate container/data:', !!chartContainer, transformedData.length);
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

<div class="tree-container" data-testid="tree-container">
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
  {/if}

    <div
      bind:this={chartContainer}
      data-testid="chart-wrapper"
      class="chart-wrapper"
    ></div>
</div>

<style>
  .tree-container {
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

  /* Deceased person styling (dashed border) */
  :global(.chart-wrapper .card rect.card-body-rect) {
    stroke: #333;
    stroke-width: 2;
  }

  /* Add data-person-id attribute to cards for testing */
  :global(.chart-wrapper g.card) {
    cursor: pointer;
  }
</style>
