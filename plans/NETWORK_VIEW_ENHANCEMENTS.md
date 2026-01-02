# Network View Enhancement Stories

This document contains user stories for enhancing the force-directed network view implemented in Story #99.

## Overview

The NetworkView (Story #99) successfully implemented a force-directed graph visualization showing all family members and their relationships. However, user testing has revealed two key areas for improvement:

1. **Spouse Proximity**: Married/partnered couples often appear far apart in the network due to the physics simulation, making it difficult to visually identify family units
2. **Children Display**: Ensuring all children of a couple are properly displayed and visually grouped together

## Research Findings

### Current Implementation Analysis

**NetworkView.svelte** (Story #99, commit 0e72ca9):
- Uses D3 force simulation with 4 forces:
  - `charge`: Node repulsion (-300 strength)
  - `link`: Relationship attraction (100 distance)
  - `center`: Center gravity
  - `collision`: Collision detection (30px radius)
- Link distance is uniform (100px) for all relationship types
- No custom forces for spouse proximity
- No visual grouping mechanisms (hulls, containers)

**Relationship Types Rendered**:
- Parent-child: Solid lines with arrows (blue/pink based on mother/father)
- Spouse: Dashed purple lines (#9333ea)
- Sibling: Dotted gray lines (computed from shared parents)

**D3 Helper Functions** (d3Helpers.js):
- `createForceSimulation(nodes, links, options)`: Creates force simulation
- `updateNetworkNodes(g, nodes, getColor, onClick)`: Renders nodes
- `updateNetworkLinks(g, links)`: Renders links with type-specific styling
- `applyNodeDrag(simulation)`: Drag-to-pin behavior
- `createNetworkTooltip()`: Hover tooltips
- `highlightConnectedNodes(g, node, links, highlight)`: Connected node highlighting

### Technical Approaches Explored

#### For Spouse Proximity (Story #100)

**Option 1: Custom Link Force with Stronger Attraction**
- Increase link strength/reduce distance specifically for spouse relationships
- Pros: Simple, no new forces needed, works with existing simulation
- Cons: May pull spouses too close, causing overlap; doesn't guarantee side-by-side positioning

**Option 2: D3 Force Positioning Constraint**
- Use d3.forceX and d3.forceY to nudge spouses toward each other's coordinates
- Pros: More control over positioning; can maintain spacing
- Cons: More complex; requires custom force function; may conflict with other forces

**Option 3: Custom Spouse Force**
- Implement custom force that pulls spouse pairs together and positions them side-by-side
- Pros: Most control; can ensure specific spacing (e.g., 60px apart); natural side-by-side appearance
- Cons: Most complex implementation; requires understanding D3 force API

**Option 4: Visual Grouping with Hulls**
- Draw convex hulls around spouse pairs (and their children)
- Pros: Visual clarity without changing physics; works with existing layout
- Cons: Doesn't solve positioning problem; only adds visual indicator

**Recommended Approach**: **Option 3 (Custom Spouse Force)** + **Option 1 (Stronger Link)**
- Implement custom force that pulls spouses toward each other's midpoint
- Position them at a fixed distance apart (e.g., 60-80px)
- Increase link strength for spouse relationships
- This combines the benefits of both approaches for optimal results

#### For Children Display (Story #101)

**Option 1: Cluster Force for Family Units**
- Group children with their parent(s) using a cluster force
- Pros: Natural grouping; works well with force simulation
- Cons: May create dense clusters; children may still scatter

**Option 2: Visual Grouping with Hulls**
- Draw convex hulls around parent-child groups
- Pros: Clear visual grouping without changing physics
- Cons: Doesn't solve positioning; purely visual

**Option 3: Custom Parent-Child Force**
- Implement force that positions children below/around parents in an arc
- Pros: Predictable layout; clear parent-child relationship
- Cons: Complex; may conflict with other forces; less organic

**Option 4: Link Distance Adjustment**
- Reduce link distance for parent-child relationships (e.g., 60px instead of 100px)
- Pros: Simple; keeps children closer to parents
- Cons: May cause overlap; doesn't guarantee all children are visible

**Recommended Approach**: **Option 1 (Cluster Force)** + **Option 4 (Shorter Links)**
- Reduce parent-child link distance to 60-80px
- Add cluster force that groups children around their parent(s)
- This ensures children stay close to parents without rigid positioning

---

## Story #100: Spouse Proximity Enhancement

### User Story

**As a** Family Historian
**I want** married/partnered couples to be positioned close together in the network view
**So that I can** easily identify family units and understand which people were married/partnered

### Context

In the current force-directed network view (Story #99), spouse nodes are connected by dashed purple lines. However, the physics simulation often positions spouses far apart from each other, making it difficult to:
- Visually identify married couples at a glance
- Understand family structure (who was married to whom)
- See which children belong to which parental couple

Improving spouse proximity would significantly enhance the readability and usability of the network visualization, especially for complex family trees with multiple marriages and generations.

### Acceptance Criteria

#### AC1: Spouse Nodes Positioned Close Together
**Given** I have two people connected by a spouse relationship in my family tree
**When** I view the force-directed network
**Then** the two spouse nodes should be positioned within 80 pixels of each other
**And** they should appear side-by-side horizontally (±30 degrees from horizontal)
**And** the spacing should be consistent across all spouse pairs in the network

**Given** I have a person with multiple spouses (divorced/widowed scenarios)
**When** I view the network
**Then** each spouse should be positioned close to the person
**And** spouses should be distributed around the person (not all on one side)
**And** there should be visual spacing between different spouse pairs to avoid confusion

#### AC2: Custom Spouse Force Implementation
**Given** the force simulation is running
**When** spouse pairs are detected in the relationship data
**Then** a custom "spouse" force should be applied to pull them together
**And** the force should:
- Pull spouses toward each other's midpoint
- Maintain a target distance of 60-80 pixels apart
- Apply stronger force when spouses are >100px apart
- Apply weaker force when spouses are within target range
**And** the spouse force should not override collision detection (nodes should not overlap)

**Given** the custom spouse force is applied
**When** I drag one spouse node to a new position
**Then** the other spouse should be pulled along (follow behavior)
**And** the target distance should be maintained after the drag ends

#### AC3: Increased Link Strength for Spouse Relationships
**Given** spouse relationships exist in the network
**When** the force simulation initializes
**Then** spouse links should have a shorter target distance (60px) compared to parent-child links (100px)
**And** spouse links should have higher strength (1.5) compared to other links (1.0)
**And** this should work in conjunction with the custom spouse force

**When** the simulation settles
**Then** spouses should consistently end up closer together than unrelated nodes
**And** the network should still appear balanced (no extreme clustering)

#### AC4: Visual Clarity for Spouse Pairs
**Given** I am viewing the network with spouse pairs positioned close together
**When** I hover over one spouse node
**Then** the connected spouse node should also highlight
**And** the spouse link between them should thicken and change color (brighter purple)
**And** the tooltip should indicate "Spouse: [Name]" for the connected person

**Given** multiple spouse pairs exist in the network
**When** the view renders
**Then** I should be able to visually distinguish each pair without confusion
**And** the layout should not create overlapping spouse pairs

#### AC5: Backward Compatibility and Performance
**Given** I have a family tree with no spouse relationships
**When** I view the network
**Then** the custom spouse force should have no effect on the layout
**And** performance should be identical to the current implementation

**Given** I have a family tree with 50 spouse pairs (100 people)
**When** I view the network
**Then** the custom spouse force should not degrade performance
**And** the simulation should settle within 5 seconds (same as current)
**And** interaction latency should remain <50ms

#### AC6: Edge Cases and Error Handling
**Given** a person has a spouse relationship but the spouse node doesn't exist (data integrity issue)
**When** the network renders
**Then** the custom spouse force should skip that relationship gracefully
**And** an error should be logged to the console for debugging
**And** other spouse pairs should render correctly

**Given** two spouses are already pinned by the user at specific positions
**When** the custom spouse force is applied
**Then** it should respect the pinned positions (fx/fy attributes)
**And** not override user-specified positions

### Test Requirements

#### Unit Tests (Vitest)

**Module**: `src/lib/d3Helpers.js` (new function: `createSpouseForce`)
```javascript
describe('createSpouseForce', () => {
  it('should create a force function for spouse proximity')
  it('should pull spouses toward each other when >100px apart')
  it('should maintain target distance of 60-80px')
  it('should respect pinned nodes (fx/fy)')
  it('should handle multiple spouses per person')
  it('should skip invalid spouse relationships gracefully')
  it('should work with empty spouse list (no-op)')
})
```

**Module**: `src/lib/NetworkView.svelte` (updated simulation config)
```javascript
describe('NetworkView - Spouse Force Integration', () => {
  it('should add spouse force to simulation when spouses exist')
  it('should configure spouse links with shorter distance (60px)')
  it('should configure spouse links with higher strength (1.5)')
  it('should extract spouse pairs from relationships store')
  it('should update spouse force when relationships change')
  it('should maintain performance with 50 spouse pairs')
})
```

#### Integration Tests (Vitest + Testing Library)

**Test**: Spouse pair positioning after simulation settles
- Mock 2 people with spouse relationship
- Render NetworkView
- Wait for simulation to settle (alphaMin threshold)
- Assert distance between spouse nodes is 60-80px
- Assert nodes are horizontally aligned (±30 degrees)

**Test**: Multiple spouses distributed around person
- Mock 1 person with 2 spouses (divorced scenario)
- Render NetworkView
- Assert both spouses are within 80px of the person
- Assert spouses are on different sides (not overlapping)

**Test**: Dragging one spouse pulls the other
- Render NetworkView with spouse pair
- Simulate drag event on spouse A to new position
- Wait for simulation to settle
- Assert spouse B moved closer to spouse A
- Assert distance maintained at 60-80px

**Test**: Hover highlighting includes spouse
- Render NetworkView with spouse pair
- Simulate mouseover on spouse A
- Assert spouse B is also highlighted
- Assert spouse link is highlighted

#### Performance Tests (Vitest)

**Test**: Simulation settle time with 50 spouse pairs
- Generate 100 people (50 spouse pairs)
- Render NetworkView
- Measure time for simulation to settle (alpha < 0.01)
- Assert settle time < 5000ms

**Test**: Custom spouse force calculation time
- Generate 100 spouse pairs
- Measure time for one force tick calculation
- Assert calculation time < 10ms

### Implementation Notes

#### Custom Spouse Force Implementation

```javascript
/**
 * Create a custom force that pulls spouse pairs together
 * @param {Array} spousePairs - Array of {source, target} spouse pairs
 * @param {number} targetDistance - Target distance between spouses (default 70px)
 * @returns {Function} - D3 force function
 */
export function createSpouseForce(spousePairs, targetDistance = 70) {
  return function(alpha) {
    spousePairs.forEach(pair => {
      const { source, target } = pair

      // Skip if either node is missing or pinned
      if (!source || !target || source.fx !== undefined || target.fx !== undefined) return

      // Calculate current distance
      const dx = target.x - source.x
      const dy = target.y - source.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance === 0) return

      // Calculate target positions (side-by-side)
      const midX = (source.x + target.x) / 2
      const midY = (source.y + target.y) / 2

      // Apply force proportional to distance from target
      const strength = alpha * 0.5 // Adjust strength based on alpha
      const offset = (distance - targetDistance) / distance * strength

      const offsetX = dx * offset
      const offsetY = dy * offset

      // Move nodes toward each other
      source.vx += offsetX
      source.vy += offsetY
      target.vx -= offsetX
      target.vy -= offsetY
    })
  }
}
```

#### NetworkView Integration

```javascript
// In NetworkView.svelte, prepareLinks function
function prepareSpousePairs(rels, nodeList) {
  const spousePairs = []
  const nodeMap = new Map(nodeList.map(n => [n.id, n]))

  rels.forEach(rel => {
    if (rel.type === 'spouse') {
      const source = nodeMap.get(rel.person1Id)
      const target = nodeMap.get(rel.person2Id)
      if (source && target) {
        spousePairs.push({ source, target })
      }
    }
  })

  return spousePairs
}

// In updateNetwork function
const spousePairs = prepareSpousePairs($relationships, nodes)

simulation = d3.forceSimulation(nodes)
  .force('charge', d3.forceManyBody().strength(-300))
  .force('link', d3.forceLink(links)
    .id(d => d.id)
    .distance(d => d.type === 'spouse' ? 60 : 100)  // Shorter for spouses
    .strength(d => d.type === 'spouse' ? 1.5 : 1.0))  // Stronger for spouses
  .force('center', d3.forceCenter(width / 2, height / 2))
  .force('collision', d3.forceCollide().radius(30))
  .force('spouse', createSpouseForce(spousePairs, 70))  // Custom spouse force
  .alphaDecay(0.02)
```

#### Visual Enhancements

Update hover highlighting in NetworkView.svelte:
```javascript
.on('mouseover', function(event, d) {
  // ... existing tooltip code ...

  // Highlight spouse nodes
  const spouseLinks = links.filter(link =>
    link.type === 'spouse' &&
    (link.source.id === d.id || link.target.id === d.id)
  )

  spouseLinks.forEach(link => {
    const spouseId = link.source.id === d.id ? link.target.id : link.source.id
    g.select(`.network-node[data-id="${spouseId}"] circle`)
      .attr('stroke', '#9333ea')
      .attr('stroke-width', 3)
  })

  highlightConnectedNodes(g, d, links, true)
})
```

### Definition of Done

- [ ] Custom spouse force implemented in d3Helpers.js with unit tests
- [ ] NetworkView.svelte integrates spouse force with existing simulation
- [ ] Spouse link distance reduced to 60px, strength increased to 1.5
- [ ] Spouse pairs consistently positioned 60-80px apart after simulation settles
- [ ] Hover highlighting includes spouse nodes and links
- [ ] All 15+ unit tests passing
- [ ] All 4+ integration tests passing
- [ ] Performance tests validate <5s settle time with 50 spouse pairs
- [ ] No regressions in existing network view functionality
- [ ] Code reviewed and approved
- [ ] Documentation updated in CLAUDE.md

### Priority

**Medium** - Enhances usability and visual clarity of existing network view feature

---

## Story #101: Children Display and Grouping

### User Story

**As a** Family Historian
**I want** all children of a person/couple to be displayed together in a clear visual group
**So that I can** easily identify family units and understand parent-child relationships at a glance

### Context

In the current force-directed network view (Story #99), children are connected to their parents via parent-child links (solid lines with arrows). However, the physics simulation can cause children to scatter across the network, making it difficult to:
- Identify all children of a specific parent or couple
- Visually group siblings together
- Understand family structure (which children belong to which parents)

Implementing visual grouping for children would improve the clarity of family units, especially in complex family trees with multiple generations and step-families.

### Acceptance Criteria

#### AC1: Children Positioned Near Their Parents
**Given** I have a parent with 3 children in my family tree
**When** I view the force-directed network
**Then** all 3 children should be positioned within 120 pixels of the parent
**And** children should appear in a loose cluster around the parent
**And** the parent-child links should be clearly visible without excessive crossing

**Given** a child has two parents (mother and father)
**When** I view the network
**Then** the child should be positioned near both parents (within 120px of each)
**And** the child should appear "between" the parents if they are spouses
**And** both parent-child links should be visible

#### AC2: Reduced Link Distance for Parent-Child Relationships
**Given** parent-child relationships exist in the network
**When** the force simulation initializes
**Then** parent-child links should have a shorter target distance (75px) compared to other links (100px)
**And** this should pull children closer to parents naturally
**And** the shorter distance should not cause node overlap (collision force should prevent this)

**When** the simulation settles
**Then** children should consistently end up closer to their parents than to unrelated nodes
**And** siblings (who share parents) should be positioned near each other

#### AC3: Sibling Proximity via Shared Parent Clustering
**Given** I have 2 siblings who share the same parents
**When** I view the network
**Then** the siblings should be positioned near each other (within 100px)
**And** they should both be near their shared parent(s)
**And** the sibling link (dotted gray line) should be visible between them

**Given** I have half-siblings (share one parent)
**When** I view the network
**Then** the half-siblings should be positioned near their shared parent
**And** they should be somewhat close to each other (within 150px)
**And** the sibling link should indicate the relationship

#### AC4: Visual Grouping with Convex Hulls (Optional Enhancement)
**Given** I have a couple with 3+ children
**When** I view the network
**Then** a subtle convex hull (outlined shape) should be drawn around the family unit
**And** the hull should include both parents and all their children
**And** the hull should use a light color (e.g., rgba(0,0,0,0.1)) to avoid visual clutter
**And** the hull should update dynamically as the simulation runs

**When** I hover over a parent node
**Then** the family unit hull should highlight (darker outline)
**And** all children and the spouse should also highlight
**And** the hull should make it clear which nodes belong to the family unit

**Note**: Hulls are optional and should be toggleable via a button if implemented.

#### AC5: Multiple Children Displayed Without Overlap
**Given** I have a parent with 10 children
**When** I view the network
**Then** all 10 children should be visible (not overlapping)
**And** children should be distributed around the parent in a radial pattern
**And** the collision force should prevent node overlap
**And** the layout should remain balanced (not excessively spread out)

**Given** children nodes overlap initially
**When** the simulation runs
**Then** the collision force should gradually separate them
**And** they should settle into non-overlapping positions within 5 seconds

#### AC6: Edge Cases and Complex Family Structures
**Given** a child has one parent (single parent scenario)
**When** I view the network
**Then** the child should be positioned near the single parent
**And** the parent-child link should be visible

**Given** a child has step-parents (divorced/remarried scenario)
**When** I view the network
**Then** the child should be positioned near the biological parent(s)
**And** step-parent links (if added in future) should be styled differently

**Given** a person has children from multiple spouses
**When** I view the network
**Then** each set of children should be grouped with their respective parent couple
**And** there should be visual spacing between the different family units

#### AC7: Performance with Large Families
**Given** I have a family tree with a person who has 20 children (extreme case)
**When** I view the network
**Then** the simulation should still settle within 5 seconds
**And** all 20 children should be displayed without performance degradation
**And** interaction latency should remain <50ms

### Test Requirements

#### Unit Tests (Vitest)

**Module**: `src/lib/d3Helpers.js` (if hulls are implemented)
```javascript
describe('computeConvexHull', () => {
  it('should compute convex hull for a set of points')
  it('should return null for <3 points')
  it('should handle collinear points gracefully')
})

describe('renderFamilyHulls', () => {
  it('should render hulls for family units (parents + children)')
  it('should update hulls on simulation tick')
  it('should style hulls with light color')
  it('should highlight hulls on hover')
})
```

**Module**: `src/lib/NetworkView.svelte` (updated simulation config)
```javascript
describe('NetworkView - Parent-Child Link Distance', () => {
  it('should configure parent-child links with shorter distance (75px)')
  it('should configure sibling links with dotted style')
  it('should cluster siblings near shared parents')
  it('should handle single-parent scenarios')
  it('should handle children from multiple spouses')
})
```

#### Integration Tests (Vitest + Testing Library)

**Test**: Children positioned near parents after simulation settles
- Mock 1 parent with 3 children
- Render NetworkView
- Wait for simulation to settle
- Assert all 3 children are within 120px of parent
- Assert children are distributed around parent (not all on one side)

**Test**: Siblings positioned near each other
- Mock 2 siblings with shared parents
- Render NetworkView
- Assert siblings are within 100px of each other
- Assert sibling link is rendered

**Test**: Multiple children without overlap
- Mock 1 parent with 10 children
- Render NetworkView
- Assert all 10 children are visible
- Assert no two children overlap (check collision)

**Test**: Family hull rendering (if implemented)
- Mock family unit (2 parents, 3 children)
- Render NetworkView with hulls enabled
- Assert hull path is rendered
- Assert hull includes all family members
- Simulate hover on parent
- Assert hull highlights

#### Performance Tests (Vitest)

**Test**: Simulation settle time with large family
- Generate 1 parent with 20 children
- Render NetworkView
- Measure time for simulation to settle
- Assert settle time < 5000ms

**Test**: Collision force performance
- Generate 50 nodes densely packed
- Measure time for collision force to separate them
- Assert separation completes within 3 seconds

### Implementation Notes

#### Link Distance Configuration

Update NetworkView.svelte simulation config:
```javascript
simulation = d3.forceSimulation(nodes)
  .force('charge', d3.forceManyBody().strength(-300))
  .force('link', d3.forceLink(links)
    .id(d => d.id)
    .distance(d => {
      if (d.type === 'spouse') return 60
      if (d.type === 'mother' || d.type === 'father') return 75  // Parent-child
      if (d.type === 'sibling') return 90
      return 100  // Default
    })
    .strength(d => {
      if (d.type === 'spouse') return 1.5
      if (d.type === 'mother' || d.type === 'father') return 1.2  // Stronger pull
      return 1.0
    }))
  .force('center', d3.forceCenter(width / 2, height / 2))
  .force('collision', d3.forceCollide().radius(32))  // Slightly larger for safety
  .alphaDecay(0.02)
```

#### Convex Hull Implementation (Optional)

```javascript
/**
 * Compute convex hull for a set of points using Graham scan algorithm
 * @param {Array} points - Array of {x, y} points
 * @returns {Array} - Array of points forming the convex hull
 */
export function computeConvexHull(points) {
  if (points.length < 3) return null

  // Use d3.polygonHull for convex hull computation
  return d3.polygonHull(points.map(p => [p.x, p.y]))
}

/**
 * Identify family units (parents + children) for hull rendering
 * @param {Array} people - All people in the network
 * @param {Array} relationships - All relationships
 * @returns {Array} - Array of family units {parents: [], children: []}
 */
export function identifyFamilyUnits(people, relationships) {
  const familyUnits = []
  const peopleMap = new Map(people.map(p => [p.id, p]))

  // Group by parent couples
  const coupleChildren = new Map()

  relationships.forEach(rel => {
    if (rel.type === 'mother' || rel.type === 'father') {
      const parent = peopleMap.get(rel.person1Id)
      const child = peopleMap.get(rel.person2Id)
      if (!parent || !child) return

      // Find parent's spouse (co-parent)
      const spouseRel = relationships.find(r =>
        r.type === 'spouse' &&
        (r.person1Id === parent.id || r.person2Id === parent.id)
      )

      const coParentId = spouseRel
        ? (spouseRel.person1Id === parent.id ? spouseRel.person2Id : spouseRel.person1Id)
        : null

      const coupleKey = coParentId
        ? [parent.id, coParentId].sort().join('-')
        : parent.id.toString()

      if (!coupleChildren.has(coupleKey)) {
        coupleChildren.set(coupleKey, {
          parents: coParentId ? [parent, peopleMap.get(coParentId)] : [parent],
          children: []
        })
      }

      coupleChildren.get(coupleKey).children.push(child)
    }
  })

  // Only create hulls for units with 3+ members
  coupleChildren.forEach(unit => {
    if (unit.parents.length + unit.children.length >= 3) {
      familyUnits.push(unit)
    }
  })

  return familyUnits
}

/**
 * Render family unit hulls in the network view
 * @param {d3.Selection} g - SVG group element
 * @param {Array} familyUnits - Array of family units
 */
export function renderFamilyHulls(g, familyUnits) {
  const hullData = familyUnits.map(unit => {
    const members = [...unit.parents, ...unit.children]
    const points = members.map(m => ({ x: m.x, y: m.y }))
    const hull = computeConvexHull(points)
    return { hull, unit }
  }).filter(d => d.hull !== null)

  const hulls = g.selectAll('.family-hull')
    .data(hullData)

  hulls.exit().remove()

  const hullsEnter = hulls.enter()
    .append('path')
    .attr('class', 'family-hull')
    .attr('fill', 'rgba(100, 100, 255, 0.05)')
    .attr('stroke', 'rgba(100, 100, 255, 0.2)')
    .attr('stroke-width', 2)
    .attr('stroke-dasharray', '5,5')

  hulls.merge(hullsEnter)
    .attr('d', d => {
      const hullPath = d.hull.map((p, i) =>
        `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`
      ).join(' ') + 'Z'
      return hullPath
    })
}
```

#### NetworkView Integration (Optional Hulls)

```javascript
// In NetworkView.svelte, add toggle button
let showFamilyHulls = false

// In updateNetwork function
simulation.on('tick', () => {
  updateNetworkLinks(g, links)
  updateNetworkNodes(g, nodes, getColor, onClick)

  if (showFamilyHulls) {
    const familyUnits = identifyFamilyUnits(nodes, $relationships)
    renderFamilyHulls(g, familyUnits)
  }
})

// Add toggle button to controls
<div class="controls">
  <button on:click={resetView}>Reset View</button>
  <button on:click={reheatSimulation}>Reheat Simulation</button>
  <button on:click={() => showFamilyHulls = !showFamilyHulls}>
    {showFamilyHulls ? 'Hide' : 'Show'} Family Groups
  </button>
  <span class="node-count">{nodes.length} people, {links.length} connections</span>
</div>
```

### Definition of Done

- [ ] Parent-child link distance reduced to 75px
- [ ] Parent-child link strength increased to 1.2
- [ ] Children consistently positioned within 120px of parents after simulation settles
- [ ] Siblings positioned near each other (within 100px)
- [ ] Collision force prevents overlap even with 10+ children
- [ ] All 10+ unit tests passing
- [ ] All 4+ integration tests passing
- [ ] Performance tests validate <5s settle time with 20 children
- [ ] Optional: Convex hulls implemented with toggle button
- [ ] No regressions in existing network view functionality
- [ ] Code reviewed and approved
- [ ] Documentation updated in CLAUDE.md

### Priority

**Medium** - Enhances usability and visual clarity of existing network view feature

---

## Summary

Both stories enhance the NetworkView (Story #99) by improving the visual grouping and positioning of family relationships:

- **Story #100**: Brings spouses closer together using custom forces and adjusted link parameters
- **Story #101**: Groups children near their parents using link distance adjustments and optional visual hulls

These improvements will make the network view significantly more readable and useful for understanding complex family structures.

## Implementation Order

**Recommended**: Implement Story #100 first, then Story #101
- Story #100 (spouse proximity) is simpler and foundational
- Story #101 builds on the same concepts (custom forces, link distance tuning)
- Both can be implemented independently but benefit from shared code patterns

## Estimated Effort

- **Story #100**: 2-3 days (custom force implementation + testing)
- **Story #101**: 2-3 days (link distance tuning + optional hulls + testing)

Total: 4-6 days for both enhancements
