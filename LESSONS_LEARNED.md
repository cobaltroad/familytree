# Lessons Learned - Family Tree Application

This document captures critical lessons learned during development to guide future work and prevent recurring issues.

## Backend-Frontend Data Format Synchronization

### Issue: Parent Relationships Not Displaying (December 2025)

**Symptoms:**
- Mother and father relationships not showing in PersonModal
- Add/Link buttons showing even when parents already exist
- Relationship lookups failing silently

**Root Cause:**
Data format mismatch between backend API and frontend stores:
- **Backend API** returns denormalized relationships: `type: "mother"` and `type: "father"`
- **Frontend stores** were only checking for normalized format: `type: "parentOf"` with `parent_role`
- This mismatch caused all parent relationship lookups to fail

**Files Affected:**
- `src/stores/derivedStores.js` - Derived store computations
- `src/lib/treeHelpers.js` - Tree manipulation utilities

**Solution:**
Updated all relationship lookup logic to handle BOTH formats:
```javascript
// Check for both denormalized and normalized formats
const isParentChild =
  rel.type === 'mother' ||
  rel.type === 'father' ||
  rel.type === 'parentOf';
```

### Key Lessons

1. **Always Handle Both Data Formats**
   - The backend normalizes relationships for storage (`parentOf` with `parent_role`)
   - The API denormalizes them for frontend convenience (`mother`, `father`)
   - **All frontend code must handle BOTH formats** for robustness

2. **Centralize Format Checking**
   - Created `isParentChildRelationship()` helper in `treeHelpers.js`
   - Use this helper consistently instead of inline checks
   - Makes future format changes easier to manage

3. **Test with Real API Data**
   - Unit tests with mock data can miss format mismatches
   - Always test with actual API responses
   - Consider integration tests that exercise the full stack

4. **Document Data Transformations**
   - Added comments explaining the denormalized format
   - Document where and why data format changes occur
   - Include examples in code comments

## Relationship Model Guidelines

### Current Architecture

The relationship system uses a **hybrid approach**:
- **Storage (Backend)**: Normalized format with `type: "parentOf"` and `parent_role: "mother"|"father"`
- **API (Backend → Frontend)**: Denormalized format with `type: "mother"|"father"`
- **Frontend Processing**: Must handle both formats for backwards compatibility

### Rules for Working with Relationships

1. **Backend API Endpoints** (`src/routes/api/relationships/`)
   - Accept: `type: "mother"`, `type: "father"`, `type: "spouse"`
   - Store: Normalize mother/father to `type: "parentOf"` with `parent_role`
   - Return: Denormalize back to `type: "mother"` or `type: "father"`

2. **Frontend Stores** (`src/stores/derivedStores.js`)
   - Must check for both denormalized (`mother`, `father`) and normalized (`parentOf`) formats
   - Use helper functions like `isParentChildRelationship()` for consistency
   - Document why dual format checking is necessary

3. **Tree Helpers** (`src/lib/treeHelpers.js`)
   - All relationship queries must handle both formats
   - Functions affected: `findParents()`, `findChildren()`, `findRootPeople()`, `buildDescendantTree()`, `assignGenerations()`
   - Use centralized helper for format checking

4. **Sibling Relationships**
   - Siblings are **computed dynamically** on frontend (people who share at least one parent)
   - Never stored in database as explicit relationships
   - Always derive from parent-child relationships

### Adding New Relationship Types

When adding new relationship types:
1. Decide if normalization is needed (like mother/father → parentOf)
2. Update API endpoints to handle denormalization
3. Update ALL frontend lookup logic (stores + helpers)
4. Add comprehensive tests for both formats
5. Document the storage vs. API format difference

## Testing Best Practices

### What We Learned from the Bug Fix

1. **Test Relationship Display Logic**
   - Created `PersonModal.parentDisplay.test.js` with 13 tests
   - Tests verify both presence of relationships AND absence of add/link buttons
   - Caught the bug immediately with failing tests

2. **Test Derived Store Computations**
   - `derivedStores.test.js` has 33 tests covering all relationship lookups
   - Tests use real relationship data structures from API
   - Validates mother, father, siblings, children, and rootPeople derivations

3. **Use Both Formats in Tests**
   - Test data should include both denormalized (`mother`, `father`) and normalized (`parentOf`) formats
   - Ensures backwards compatibility
   - Example from tests:
     ```javascript
     { id: 1, person1_id: 2, person2_id: 1, type: 'mother' }, // Denormalized
     { id: 2, person1_id: 3, person2_id: 1, type: 'parentOf', parent_role: 'father' } // Normalized
     ```

4. **Test at Multiple Levels**
   - **Unit tests**: Individual helper functions (e.g., `isParentChildRelationship()`)
   - **Integration tests**: Derived stores with real data structures
   - **Component tests**: PersonModal with relationship display
   - **End-to-end**: Full user workflows (recommended for future)

## Code Organization Principles

### Helper Function Strategy

**✅ DO:**
- Extract reusable logic into helper functions (`isParentChildRelationship()`)
- Place helpers in appropriate modules (`treeHelpers.js` for relationship logic)
- Use helpers consistently across codebase (stores, components, utilities)
- Document helper purpose and parameters

**❌ DON'T:**
- Duplicate relationship checking logic across files
- Inline complex format checking (makes changes harder)
- Create helpers without clear single responsibility

### Derived Store Patterns

**Best Practices from `derivedStores.js`:**
1. Use `derived()` for computed values that depend on multiple stores
2. Return Maps for O(1) lookups (e.g., `peopleById`)
3. Handle missing data gracefully with fallbacks
4. Document data format assumptions
5. Add TODO comments for future optimizations

**Example Pattern:**
```javascript
export const peopleById = derived(people, ($people) => {
  const map = new Map();
  $people.forEach(person => map.set(person.id, person));
  return map;
}); // O(1) lookups instead of O(n) array.find()
```

## Future Recommendations

### Prevent Similar Issues

1. **Add Format Validation Tests**
   - Create tests that verify API responses match expected format
   - Test that frontend handles both normalized and denormalized formats
   - Add CI checks for data format consistency

2. **Consider Schema Documentation**
   - Document the canonical relationship data model
   - Show both storage format and API format side-by-side
   - Include examples of transformations

3. **Centralize Data Transformation**
   - Consider a dedicated module for relationship format conversions
   - Single source of truth for normalization/denormalization logic
   - Easier to maintain and test

4. **Add Integration Tests**
   - Test full request/response cycle (backend → API → frontend)
   - Verify data formats at each boundary
   - Catch mismatches before they reach production

### Code Review Checklist

When reviewing relationship-related code:
- [ ] Does it handle both denormalized (`mother`, `father`) and normalized (`parentOf`) formats?
- [ ] Are helper functions used consistently?
- [ ] Are tests included for both data formats?
- [ ] Is the relationship lookup O(1) or optimized?
- [ ] Are edge cases handled (missing parents, orphans, etc.)?
- [ ] Is the code documented with format assumptions?

## Reference Files

Key files for relationship handling:
- `src/stores/derivedStores.js` - Derived store computations with dual format support
- `src/lib/treeHelpers.js` - Tree manipulation with `isParentChildRelationship()` helper
- `src/lib/db/schema.js` - Database schema defining normalized storage format
- `src/routes/api/relationships/+server.js` - API endpoints with denormalization logic
- `src/lib/PersonModal.parentDisplay.test.js` - Parent display test suite
- `src/stores/derivedStores.test.js` - Derived store test coverage

## Svelte Reactivity: Form State Management

### Issue: Name Fields Not Editable in PersonModal (December 2025)

**Symptoms:**
- Users unable to type in firstName and lastName input fields when editing existing person
- Input fields appeared editable (no disabled/readonly attributes) but characters would not persist
- Typed text would disappear immediately after being entered
- Other fields (birthDate, gender, etc.) worked correctly

**Root Cause:**
Overly aggressive reactive statement in `PersonFormFields.svelte` was overwriting formData on every reactive cycle:

```javascript
// PROBLEMATIC CODE - runs on every reactive cycle
$: if (person) {
  formData = {
    firstName: person.firstName || '',
    lastName: person.lastName || '',
    // ... other fields
  }
}
```

The reactive statement (`$:`) would trigger on:
- Component re-renders
- Window resize events (responsive breakpoints)
- Store updates
- Any reactive recalculation

Each trigger would overwrite `formData` with original `person` values, erasing user edits.

**Files Affected:**
- `src/lib/components/PersonFormFields.svelte` - Form component with reactive statements

**Solution:**
Track which person is currently being edited using `currentPersonId`. Only update formData when switching to a DIFFERENT person:

```javascript
let currentPersonId = null

// Only update formData when person ID changes (editing different person)
$: if (person && person.id !== currentPersonId) {
  formData = {
    firstName: person.firstName || '',
    lastName: person.lastName || '',
    // ... other fields
  }
  currentPersonId = person.id
} else if (!person && currentPersonId !== null) {
  // Switched to add mode - clear form
  formData = { /* empty values */ }
  currentPersonId = null
}
```

### Key Lessons

1. **Reactive Statements Run Frequently**
   - Svelte's `$:` reactive statements trigger on ANY dependency change
   - Dependencies include props, variables, stores, and even window events
   - Cannot assume reactive statements only run when props explicitly change
   - Always guard against unnecessary executions

2. **Preserve User Input During Reactivity**
   - When populating forms from props, track the identity of the data source (e.g., ID)
   - Only reset form state when switching to edit DIFFERENT data
   - Never overwrite local form state during routine reactive cycles
   - User edits must persist across re-renders

3. **Test Realistic User Interactions**
   - Unit tests must simulate character-by-character typing (not just final value)
   - Test that edits persist during component lifecycle events
   - Verify behavior during window resize, store updates, and other reactive triggers
   - Integration tests should exercise full modal workflows

4. **Form State Management Pattern**
   - **Track data identity**: Store ID of currently edited record
   - **Guard updates**: Only update form when data identity changes
   - **Handle mode switches**: Clear form when switching from edit → add mode
   - **Preserve edits**: Never reset during reactive re-renders

### Testing Approach (TDD Methodology)

**RED Phase - 9 Failing Tests:**
- Created `PersonFormFields.nameEditing.test.js`
- Tests demonstrated bug: 6 failed (edit mode), 3 passed (add mode)
- Simulated realistic typing: character-by-character input
- Verified no readonly/disabled attributes

**GREEN Phase - Fix Implementation:**
- Added `currentPersonId` tracking in PersonFormFields.svelte
- Modified reactive statement to check ID before updating
- All 9 unit tests passed

**REFACTOR Phase - Integration Testing:**
- Created `PersonModal.nameEditing.integration.test.js` (4 tests)
- End-to-end workflows: open modal → edit → submit
- Switching between different people in modal
- All 13 new tests passed + 69 existing tests passed (82 total)

### Best Practices for Svelte Forms

**✅ DO:**
- Track the identity of data being edited (ID, key, etc.)
- Use guards to prevent unnecessary reactive updates
- Test with realistic user interactions (incremental typing)
- Document why reactive guards exist
- Handle both edit mode and add mode explicitly

**❌ DON'T:**
- Assume reactive statements only run when you expect them to
- Overwrite local form state unconditionally in reactive blocks
- Test only with final values (miss incremental input bugs)
- Rely on prop changes being "infrequent" or "controlled"
- Mix concerns (data loading and user input preservation)

### Code Review Checklist

When reviewing Svelte form components:
- [ ] Are reactive statements guarded against unnecessary executions?
- [ ] Does the component track data identity (ID) to detect actual changes?
- [ ] Will user input persist during window resize, store updates, re-renders?
- [ ] Are tests simulating realistic user interactions (incremental typing)?
- [ ] Is there clear documentation about reactive statement purpose?
- [ ] Does the component handle both edit and add modes correctly?

## Authentication and Frontend Error Handling

### Issue: Person Records Not Appearing (December 2025)

**Symptoms:**
- Users reported person records not appearing in the UI
- API calls failing silently with no user feedback
- Unauthenticated users could load the page but couldn't access data
- Suspicion of data isolation issues or orphaned records

**Root Cause Investigation:**
Initial investigation revealed the database schema was **already correct** with proper `user_id` foreign keys on both `people` and `relationships` tables. Data isolation was working at the database level.

The actual problems were:
1. **Missing Frontend Authentication Guards** - No check for authenticated session before loading page
2. **Poor API Error Handling** - Errors didn't include HTTP status codes, preventing detection of 401 (unauthorized) responses
3. **Silent Failures** - 401 errors from API were swallowed without redirecting to sign-in

**Files Affected:**
- `src/lib/api.js` - API client with inadequate error handling
- `src/routes/+page.svelte` - Main page without authentication checks
- `src/routes/+page.js` - Page config with prerendering enabled (incompatible with auth)

**Solution:**

1. **Enhanced API Error Handling** (`src/lib/api.js`):
   ```javascript
   function createApiError(message, response) {
     const error = new Error(message)
     error.status = response.status
     return error
   }

   // All API methods now attach HTTP status to errors
   if (!response.ok) {
     const error = await response.json()
     throw createApiError(error.error || 'Request failed', response)
   }
   ```

2. **Page-Level Authentication Guards** (`src/routes/+page.svelte`):
   ```javascript
   onMount(async () => {
     // Check session on mount
     const session = await getSession()
     if (!session?.user) {
       goto('/signin')
       return
     }

     try {
       // Load data...
     } catch (err) {
       // Handle 401 (expired session)
       if (err.status === 401) {
         goto('/signin')
         return
       }
       // Handle other errors...
     }
   })
   ```

3. **Disabled Prerendering** (`src/routes/+page.js`):
   ```javascript
   export const prerender = false // Can't prerender authenticated pages
   ```

### Key Lessons

1. **Authentication Must Be Checked Early**
   - Check for authenticated session before attempting to load protected data
   - Redirect to sign-in BEFORE making API calls that will fail
   - Don't assume SvelteKit handles authentication automatically
   - Unauthenticated pages should redirect immediately (not show broken UI)

2. **API Errors Must Include HTTP Status Codes**
   - JavaScript `Error` objects don't have status codes by default
   - Attach `error.status = response.status` to all API errors
   - Frontend needs status codes to distinguish error types (401 vs 403 vs 404 vs 500)
   - Never swallow error details from server responses

3. **Different Error Types Need Different Handling**
   - **401 Unauthorized**: Redirect to sign-in (session expired or missing)
   - **403 Forbidden**: Show error message (authenticated but not allowed)
   - **404 Not Found**: Show "not found" UI
   - **500 Server Error**: Show generic error, possibly retry
   - Design error handling strategy for each status code

4. **Prerendering and Authentication Don't Mix**
   - SvelteKit's `prerender` option generates static HTML at build time
   - Authenticated pages need runtime session checks
   - Set `export const prerender = false` for protected routes
   - Document why prerendering is disabled

5. **Test Database Schema Before Assuming Issues**
   - The initial suspicion was data isolation issues (missing userId)
   - Database schema was actually correct - problem was in frontend
   - Always verify assumptions with direct database inspection
   - Don't assume problems are in one layer without checking

### Testing Approach (TDD Methodology)

**RED Phase - 6 Failing Tests:**
- Created `src/lib/api.auth.test.js` (later moved)
- Tests demonstrated missing HTTP status codes on errors
- Could not distinguish 401 from other error types

**GREEN Phase - Implementation:**
- Added `createApiError()` helper to API client
- All API methods now attach `status` to errors
- Page component checks session and handles 401 errors
- All 6 authentication tests passed

**REFACTOR Phase:**
- Test file moved from `src/routes/` to `src/lib/tests/` (SvelteKit naming issue)
- Created comprehensive documentation in `AUTHENTICATION_FIX_SUMMARY.md`
- Updated Facebook profile tests to include `accessToken` in mock sessions
- Total: 1,750+ tests passing

### Best Practices for SvelteKit Authentication

**✅ DO:**
- Check session in `onMount()` before loading protected data
- Attach HTTP status codes to all API errors
- Handle 401 errors with redirect to sign-in
- Set `prerender = false` for authenticated routes
- Test with both authenticated and unauthenticated states
- Document authentication requirements in components

**❌ DON'T:**
- Assume authentication is handled automatically
- Let API errors lose HTTP status information
- Show broken UI to unauthenticated users
- Enable prerendering for protected routes
- Swallow 401 errors without redirecting
- Rely on backend to redirect (frontend should handle it)

### Code Review Checklist

When reviewing authentication-related code:
- [ ] Does the page check for authenticated session before loading data?
- [ ] Are API errors preserving HTTP status codes?
- [ ] Is 401 handled with redirect to sign-in?
- [ ] Is `prerender = false` set for protected routes?
- [ ] Are tests covering both authenticated and unauthenticated scenarios?
- [ ] Is the authentication flow documented?

## SvelteKit File Naming Conventions

### Issue: Reserved File Name Breaking Application (December 2025)

**Symptoms:**
- Error: "Files prefixed with + are reserved (saw src/routes/+page.auth.test.js)"
- Development server would not start
- Application completely broken - users could not access the app
- Critical production-blocking issue

**Root Cause:**
A test file was created at `src/routes/+page.auth.test.js`, violating SvelteKit's reserved file naming convention.

In SvelteKit, files with `+` prefix in the `src/routes/` directory are **reserved for framework files**:
- `+page.svelte` - Page components
- `+page.js` / `+page.ts` - Page load functions
- `+page.server.js` / `+page.server.ts` - Server-only page logic
- `+layout.svelte` - Layout components
- `+layout.js` / `+layout.ts` - Layout load functions
- `+server.js` / `+server.ts` - API endpoints
- `+error.svelte` - Error pages

**Files Affected:**
- `src/routes/+page.auth.test.js` - Problematic test file (created during authentication fix)

**Solution:**

1. **Moved test file to proper location:**
   - FROM: `src/routes/+page.auth.test.js`
   - TO: `src/lib/tests/page.auth.test.js`

2. **Updated import paths:**
   ```javascript
   // Before (in src/routes/)
   import Page from './+page.svelte'
   import * as familyStore from '../stores/familyStore.js'

   // After (in src/lib/tests/)
   import Page from '../../routes/+page.svelte'
   import * as familyStore from '../../stores/familyStore.js'
   ```

3. **Created documentation:**
   - `TESTING_GUIDELINES.md` - Comprehensive testing documentation to prevent recurrence

### Key Lessons

1. **Never Use Reserved File Patterns**
   - SvelteKit reserves `+` prefix for framework files
   - Test files should NEVER use `+` prefix regardless of location
   - This is a hard error that breaks the entire application
   - No workarounds - must follow SvelteKit conventions strictly

2. **Test File Placement Strategies**
   - **Option A (Recommended)**: Place tests in `src/lib/tests/` directory
     - Clean separation from routes
     - Easy to find and organize
     - No naming conflicts possible

   - **Option B**: Co-locate tests with components in `src/lib/components/`
     - `Button.svelte` and `Button.test.js` side-by-side
     - Good for component-specific tests
     - Still avoid `+` prefix

   - **Option C**: Root-level `tests/` directory
     - Separation of test and source code
     - Mirrors `src/` structure
     - Good for large projects

3. **Framework Conventions Are Non-Negotiable**
   - SvelteKit (like Next.js, Nuxt, etc.) has strict file naming rules
   - Framework conventions supersede personal preferences
   - Breaking conventions breaks the app immediately
   - Always consult framework docs when creating special files

4. **Error Messages Are Helpful**
   - SvelteKit's error message was clear: "Files prefixed with + are reserved"
   - Read error messages carefully - they often tell you exactly what's wrong
   - Framework errors about file naming are usually non-negotiable

5. **Document Team Conventions**
   - Create `TESTING_GUIDELINES.md` or similar
   - Document where test files should go
   - Include examples of correct file placement
   - Reference in onboarding docs

### Testing Approach

**Immediate Fix (Critical Bug):**
- Identified problematic file from error message
- Moved to `src/lib/tests/` directory
- Updated import paths
- Verified dev server starts successfully
- Confirmed app is accessible

**Prevention:**
- Created `TESTING_GUIDELINES.md` with:
  - SvelteKit reserved file patterns
  - Correct test file placement strategies
  - Quick reference for developers
  - Examples of do's and don'ts

### Best Practices for SvelteKit File Organization

**✅ DO:**
- Place test files in `src/lib/tests/` directory
- Use descriptive test file names (e.g., `page.auth.test.js`, `api.people.test.js`)
- Keep route directory clean (only `+` prefix framework files)
- Document file organization conventions in README or guidelines
- Consult SvelteKit docs when creating new file types

**❌ DON'T:**
- Use `+` prefix for non-framework files (especially tests)
- Place test files directly in `src/routes/` directory
- Assume file naming conventions from other frameworks apply
- Ignore framework-specific error messages
- Create custom file patterns without checking docs

### Quick Reference: SvelteKit File Patterns

| Pattern | Purpose | Location | Example |
|---------|---------|----------|---------|
| `+page.svelte` | Page component | `src/routes/` | `src/routes/+page.svelte` |
| `+page.js` | Page load function | `src/routes/` | `src/routes/about/+page.js` |
| `+server.js` | API endpoint | `src/routes/api/` | `src/routes/api/people/+server.js` |
| `+layout.svelte` | Layout component | `src/routes/` | `src/routes/+layout.svelte` |
| `+error.svelte` | Error page | `src/routes/` | `src/routes/+error.svelte` |
| `*.test.js` | Test files | `src/lib/tests/` | `src/lib/tests/page.auth.test.js` |
| `ComponentName.svelte` | Components | `src/lib/components/` | `src/lib/components/PersonModal.svelte` |

### Code Review Checklist

When reviewing file structure changes:
- [ ] Are all test files outside `src/routes/` directory?
- [ ] Do test files avoid using `+` prefix?
- [ ] Are `+` prefix files only framework files (page, layout, server)?
- [ ] Is the file organization documented?
- [ ] Will the structure be obvious to new developers?
- [ ] Does the dev server start without file naming errors?

## D3.js Force Simulation and Svelte Integration

### Story #99: Force-Directed Network View (January 2026)

**Implementation:**
Created a comprehensive force-directed network visualization to display all family relationships in an interactive graph layout using D3.js force simulation.

**Key Components:**
- `NetworkView.svelte`: Interactive Svelte component with force simulation
- `d3Helpers.js`: Reusable D3 force simulation helpers
  - `createForceSimulation()`: Configures charge, link, center, and collision forces
  - `updateNetworkNodes()`: Enter/update/exit pattern for node rendering
  - `updateNetworkLinks()`: Path rendering for parent-child, spouse, and sibling links
  - `applyNodeDrag()`: Drag behavior to pin nodes at fixed positions
  - `createNetworkTooltip()`: Hover tooltips with person information
  - `highlightConnectedNodes()`: Visual highlighting of related nodes
- `treeHelpers.js`: Added `computeSiblingLinks()` for sibling relationship computation

**Test Coverage:**
- 33 comprehensive tests for D3 force simulation helpers
- TDD methodology: RED (failing tests) → GREEN (implementation) → REFACTOR (optimization)
- Tests cover force configuration, node/link rendering, drag behavior, tooltips, and highlighting

### Key Lessons

1. **D3.js and Svelte Integration Patterns**
   - **Reactive Updates**: Use Svelte's `$:` reactive statements to trigger D3 updates when store data changes
   - **SVG References**: Store SVG element references using `bind:this={svgElement}` for D3 selection
   - **Force Simulation Lifecycle**: Create simulation in `onMount()`, update on data changes, stop on `onDestroy()`
   - **Test Mode**: Add `testConfig.enabled` flag to disable transitions and animations in JSDOM tests
   - **Performance**: Use enter/update/exit pattern to only update changed nodes/links, not entire graph

2. **Force Simulation Configuration Best Practices**
   - **Charge Force**: Negative strength (-300 to -600) creates repulsion between nodes
   - **Link Force**: Distance (80-150px) controls spacing between connected nodes
   - **Center Force**: Centers graph at viewport midpoint (width/2, height/2)
   - **Collision Force**: Prevents node overlap with radius matching visual node size
   - **Alpha Decay**: Controls simulation cooling rate (0.0228 default, lower = longer simulation)
   - **Allow Customization**: Accept force strengths via options parameter for flexibility

3. **Testing D3 Visualizations in JSDOM**
   - **JSDOM Limitations**: No CSS transitions, no actual rendering, no getBBox()
   - **Test Config Pattern**: Use feature flags to disable transitions during tests
     ```javascript
     export const testConfig = { enabled: false }

     // In production code
     const transition = testConfig.enabled ? selection : selection.transition().duration(300)

     // In tests
     beforeEach(() => { testConfig.enabled = true })
     afterEach(() => { testConfig.enabled = false })
     ```
   - **Focus on Data Binding**: Test that correct data is bound to DOM elements, not visual rendering
   - **Verify Structure**: Check for presence of expected elements (circles, paths, text)
   - **Mock Interactions**: Use `dispatch('click')` to simulate user events
   - **Isolation**: Create/remove SVG elements in beforeEach/afterEach to prevent test pollution

4. **Sibling Relationship Computation**
   - **Dynamic Computation**: Compute sibling links on frontend from parent-child relationships
   - **Bidirectional Links**: Create both A→B and B→A for force simulation symmetry
   - **Half-Siblings**: People who share at least one parent are siblings (handled automatically)
   - **Efficiency**: Use parent lookup maps for O(1) performance instead of nested loops
   - **Network Visualization**: Include sibling links as gray dotted lines for completeness

5. **Link Visual Styling Strategy**
   - **Parent-Child**: Solid black lines with arrows (directional, shows lineage flow)
   - **Spouse**: Purple dashed lines without arrows (bidirectional, romantic connection)
   - **Sibling**: Gray dotted lines without arrows (bidirectional, peer relationship)
   - **Markers**: Define SVG marker elements for arrowheads, reference via `url(#arrow)`
   - **Consistency**: Use same visual language across all tree views (Timeline, Radial, Network)

6. **Interactive Features Implementation**
   - **Click to Edit**: Attach click handlers to nodes that call `modal.open(personId, 'edit')`
   - **Drag to Pin**: Use D3 drag behavior with `fx`/`fy` fixed coordinates to lock node positions
   - **Hover Tooltips**: Show person name, birth/death dates on mouseover with absolute positioning
   - **Connected Highlighting**: On hover, highlight node + direct connections with green stroke
   - **Zoom/Pan**: Reuse `createZoomBehavior()` helper from other tree views for consistency

### Best Practices for D3 + Svelte

**✅ DO:**
- Write tests BEFORE implementation (TDD methodology)
- Use enter/update/exit pattern for incremental updates (never destroy/recreate entire graph)
- Add test mode flags to disable transitions for JSDOM compatibility
- Store D3 selections in component variables to avoid repeated selections
- Bind SVG elements with `bind:this` for direct D3 manipulation
- Stop force simulations in `onDestroy()` to prevent memory leaks
- Use reactive statements (`$:`) to trigger D3 updates when Svelte stores change
- Create reusable D3 helper functions in `d3Helpers.js` for cross-view consistency
- Test data structure and bindings, not visual rendering output

**❌ DON'T:**
- Mix Svelte reactive bindings and D3 DOM manipulation on same elements (conflicts)
- Recreate force simulations on every data change (expensive, causes flicker)
- Forget to remove event listeners and stop simulations (memory leaks)
- Test CSS transitions or animations in JSDOM (not supported)
- Use `getBBox()` or layout calculations in JSDOM tests (returns zeros)
- Assume transitions work in tests (use test config to disable)
- Duplicate D3 code across components (extract to helpers)

### Code Review Checklist for D3 Visualizations

When reviewing D3 + Svelte code:
- [ ] Does it follow enter/update/exit pattern for incremental updates?
- [ ] Are force simulations stopped in `onDestroy()`?
- [ ] Are tests using test mode to disable transitions?
- [ ] Are D3 selections stored in variables (not repeated)?
- [ ] Does it use shared helpers from `d3Helpers.js`?
- [ ] Are SVG elements bound with `bind:this` for D3 access?
- [ ] Is visual styling consistent across all tree views?
- [ ] Are click handlers connected to modal store?
- [ ] Is performance optimized (only update changed elements)?

## Relationship Validation Logic

### Bug Fix: Add A Spouse Duplicate Relationship Error (January 2026)

**Symptoms:**
- QuickAddSpouse feature would successfully create first spouse relationship
- When creating the second (bidirectional) relationship, error: "A relationship already exists between these people"
- Only one direction of spouse relationship was created instead of both
- Feature was broken and unusable

**Root Cause:**
The `relationshipExists()` function in `/api/relationships` was checking BOTH directions for spouse relationships:

```javascript
// PROBLEMATIC CODE
function relationshipExists(relationships, person1Id, person2Id, type) {
  return relationships.some(rel =>
    (rel.person1Id === person1Id && rel.person2Id === person2Id && rel.type === type) ||
    (rel.person1Id === person2Id && rel.person2Id === person1Id && rel.type === type) // ❌ Bidirectional check
  )
}
```

QuickAddSpouse creates TWO relationships to establish bidirectional connection:
1. Creates spouse relationship: person1 → person2 (succeeds)
2. Attempts to create reverse: person2 → person1 (fails because of bidirectional check)

The function detected the first relationship when checking the second, incorrectly treating the reverse direction as a duplicate.

**Files Affected:**
- `src/routes/api/relationships/+server.js` - Relationship creation validation

**Solution:**

Changed `relationshipExists()` to only check for EXACT duplicates (same person1Id and person2Id):

```javascript
// FIXED CODE
function relationshipExists(relationships, person1Id, person2Id, type) {
  return relationships.some(rel =>
    rel.person1Id === person1Id &&
    rel.person2Id === person2Id &&
    rel.type === type // Only check exact match
  )
}
```

This allows bidirectional spouse relationships (A→B and B→A) while still preventing exact duplicates (duplicate A→B).

### Key Lessons

1. **Understand Bidirectional Relationship Semantics**
   - **Spouse relationships**: Require TWO database records for bidirectionality (A→B and B→A)
   - **Parent-child relationships**: Single record with direction (parent→child, never reversed)
   - **Sibling relationships**: Computed dynamically on frontend, not stored in database
   - **Validation logic must match relationship semantics** (spouse = allow bidirectional, parent = disallow)

2. **Exact Duplicates vs. Reverse Relationships**
   - **Exact Duplicate**: Same person1Id, person2Id, AND type (should be prevented)
     - Example: Two records of "John → Mary, spouse" (TRUE duplicate)
   - **Reverse Relationship**: Swapped person1Id and person2Id, same type (bidirectional, allowed for spouses)
     - Example: "John → Mary, spouse" AND "Mary → John, spouse" (NOT duplicates, intentional)
   - Validation must distinguish between these cases

3. **Testing Relationship Validation**
   - **Test Exact Duplicates**: Verify same-direction duplicates are rejected (person1→person2 twice)
   - **Test Bidirectional**: Verify reverse direction is allowed for spouse relationships
   - **Test Edge Cases**: Single spouse (no reverse), multiple spouses (polygamy support)
   - **Integration Tests**: Test full QuickAddSpouse workflow, not just API endpoint
   - **Bug Reproduction Tests**: Create failing test that reproduces user-reported bug BEFORE fixing

4. **TDD for Bug Fixes**
   - **RED Phase**: Write test that reproduces the bug (QuickAddSpouse creating duplicate error)
   - **GREEN Phase**: Fix the bug (change validation logic)
   - **REFACTOR Phase**: Update existing tests to reflect correct behavior
   - **Document Root Cause**: Add detailed commit message explaining why bug occurred
   - Bug fix should include comprehensive test that would have caught the bug originally

5. **Validation Function Design**
   - **Single Responsibility**: `relationshipExists()` should only check for exact duplicates
   - **Explicit Intent**: Function name should match what it checks (not ambiguous)
   - **Context Awareness**: Validation may differ by relationship type (spouse vs parent)
   - **Clear Documentation**: Comment explaining what constitutes a "duplicate" for each type

### Testing Approach (TDD Methodology)

**RED Phase - Bug Reproduction:**
- Created `spouse-duplicate-bug.test.js` with 13 tests
- Test demonstrated exact bug: second spouse relationship rejected
- Failed test: "should allow bidirectional spouse relationships"

**GREEN Phase - Fix Implementation:**
- Modified `relationshipExists()` to only check exact duplicates
- All QuickAddSpouse tests passed (12 tests)
- Bug reproduction test passed

**REFACTOR Phase - Test Updates:**
- Updated existing test: "should prevent duplicate relationships" to use same person1Id/person2Id
- All relationship API tests passed (46 tests)
- Total: 1,840+ tests passing

**Test Coverage:**
- 168 lines of comprehensive spouse relationship tests
- Edge cases: bidirectional, exact duplicates, multiple spouses, single spouse
- Integration-level test simulating full QuickAddSpouse workflow

### Best Practices for Relationship Validation

**✅ DO:**
- Understand bidirectionality requirements for each relationship type
- Write failing test that reproduces bug before fixing (RED phase)
- Distinguish exact duplicates from reverse relationships
- Test both API endpoint and full user workflow (integration tests)
- Document root cause in commit message for future reference
- Add comments explaining validation logic and edge cases
- Consider polygamy support (multiple spouse relationships allowed)

**❌ DON'T:**
- Assume all relationship types have same validation rules
- Prevent bidirectional relationships for spouse type
- Fix bugs without adding tests that would have caught the bug
- Use ambiguous function names that hide validation intent
- Forget to update existing tests when behavior changes
- Leave commented-out code from debugging process

### Code Review Checklist for Relationship Validation

When reviewing relationship validation code:
- [ ] Does validation distinguish exact duplicates from reverse relationships?
- [ ] Are bidirectional spouse relationships allowed?
- [ ] Does test coverage include both directions of relationship creation?
- [ ] Are edge cases tested (multiple spouses, single spouse, etc.)?
- [ ] Is validation logic documented with comments?
- [ ] Would tests catch bugs like the QuickAddSpouse duplicate error?
- [ ] Are function names clear about what they validate?

## Version History

- **December 2025**: Initial lessons learned from parent display bug fix
  - Root cause: Backend-frontend data format mismatch
  - Solution: Dual format support in all relationship lookups
  - Tests added: 13 parent display tests, 33 derived store tests
  - Commit: [See git log for parent display fix]

- **December 2025**: Svelte reactivity form state management
  - Root cause: Reactive statement overwriting user input on every cycle
  - Solution: Track currentPersonId to only update on person identity change
  - Tests added: 9 unit tests (PersonFormFields.nameEditing.test.js), 4 integration tests (PersonModal.nameEditing.integration.test.js)
  - Total test suite: 82 tests passing
  - Documentation: `/Users/cobaltroad/Source/familytree/docs/BUG_FIX_NAME_EDITING.md`

- **December 2025**: Authentication and frontend error handling
  - Root cause: Missing frontend auth guards, API errors without HTTP status codes
  - Solution: Check session in onMount, attach status codes to all errors, handle 401 with redirect
  - Tests added: 6 authentication error handling tests
  - Total test suite: 1,750+ tests passing
  - Documentation: `AUTHENTICATION_FIX_SUMMARY.md`

- **December 2025**: SvelteKit file naming conventions
  - Root cause: Test file using reserved `+` prefix in routes directory
  - Solution: Moved test files to `src/lib/tests/`, documented file organization
  - Critical fix: Application was completely broken
  - Documentation: `TESTING_GUIDELINES.md`

- **January 2026**: D3.js Force Simulation and Network View
  - Feature: Force-directed network visualization with D3.js force simulation (Story #99)
  - Implementation: 33 comprehensive tests, reusable D3 helpers, sibling link computation
  - Tests added: 33 D3 force simulation tests, 4 sibling computation tests
  - Total test suite: 1,840+ tests passing
  - Commit: 0e72ca9 feat: implement force-directed network view (closes #99)

- **January 2026**: Relationship validation bug fix
  - Root cause: relationshipExists() incorrectly prevented bidirectional spouse relationships
  - Solution: Changed validation to only check exact duplicates, allow reverse relationships
  - Tests added: 168 lines of spouse relationship validation tests
  - Total test suite: 1,840+ tests passing
  - Commit: db2df16 fix: allow bidirectional spouse relationships in QuickAddSpouse

---

**Note to Future Developers:**
This document should be updated whenever significant bugs are discovered or architectural decisions are made. Keep it current to maximize its value as a knowledge base.
