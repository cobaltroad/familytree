# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Backend (Go)
```bash
cd backend
go run main.go        # Start backend server on http://localhost:8080
```

### Frontend (Svelte + Vite)
```bash
cd frontend
npm install           # Install dependencies (first time only)
npm run dev          # Start dev server on http://localhost:5173
npm run build        # Build for production
npm run preview      # Preview production build
```

## Architecture Overview

### Backend Structure
- Single-file Go REST API (`backend/main.go`) using Chi router
- SQLite database (`backend/familytree.db`) for persistence
- Two main entities: **Person** and **Relationship**

### Relationship Model
The relationship system has evolved and uses a normalized storage approach:
- All parent-child relationships are stored as `type: "parentOf"` with a `parent_role` field (`"mother"` or `"father"`)
- The API accepts `"mother"` and `"father"` as relationship types, which are automatically normalized to `"parentOf"` with the appropriate `parent_role`
- Sibling relationships are **computed dynamically** on the frontend (people who share at least one parent), not stored in the database
- Spouse relationships are stored as `type: "spouse"`
- The backend validates that a person can only have one mother and one father

### Frontend Architecture
- **Svelte 4** with Vite build system
- **Hash-based routing**: Multiple visualization views with shared navigation
- **State management**: Reactive Svelte stores for all application state (people, relationships, modal, notifications)
- **D3.js v7.9.0** for all tree visualizations with optimized enter/update/exit pattern and zoom/pan preservation
- **Shared utilities**: `treeHelpers.js` and `d3Helpers.js` provide reusable functions across all views

### State Management with Svelte Stores

The application uses a comprehensive reactive store architecture (see `frontend/src/stores/`):

#### Core Stores (`familyStore.js`)
- **people**: Writable store containing all person data
- **relationships**: Writable store containing all relationship data
- **loading**: Boolean state for API operations
- **error**: Error message state

#### Derived Stores (`derivedStores.js`)
Computed stores that automatically update when core stores change:
- **peopleById**: Map for O(1) person lookups by ID
- **relationshipsByPerson**: Map for O(1) relationship lookups
- **familyTree**: Pre-computed descendant tree structure
- **rootPeople**: People without parents (tree roots)
- **createPersonRelationships(personId)**: Factory function for person-specific relationships (mother, father, siblings, children)

#### Modal Store (`modalStore.js`)
Centralized modal state management:
- **open(personId, mode)**: Open modal for viewing/editing
- **openNew()**: Open modal for adding new person
- **close()**: Close modal

#### Notification Store (`notificationStore.js`)
Non-blocking toast notifications:
- **success(message)**: Green success toast (3s auto-dismiss)
- **error(message)**: Red error toast (5s auto-dismiss)
- **info(message)**: Blue info toast (3s auto-dismiss)

#### Action Creators (`stores/actions/personActions.js`)
Optimistic update pattern for CRUD operations:
- **createPerson(data)**: Create with temporary ID, replace on success
- **updatePerson(id, updates)**: Update immediately, rollback on error
- **deletePerson(id)**: Remove immediately, restore on error

See `frontend/src/stores/actions/README.md` for detailed optimistic update documentation.

### Component Structure

#### Core Components
- **App.svelte**: Root component, manages routing and initial data loading (simplified to ~80 LOC)
- **ViewSwitcher.svelte**: Navigation tabs for switching between visualization views
- **PersonModal.svelte**: Hybrid responsive modal dialog for editing/adding people, uses `$modal` store for state
  - Desktop/Tablet (>=768px): Two-column layout with card-based relationships
  - Mobile (<768px): Collapsible sections with progressive disclosure
  - Responsive breakpoints automatically adjust layout and component behavior
- **PersonFormFields.svelte**: Reusable form fields for person data entry
- **Notification.svelte**: Toast notification component for non-blocking user feedback

#### Modal-Specific Components
- **TwoColumnLayout.svelte**: Two-column grid layout (40%/60% split) for desktop/tablet modal views
- **CollapsibleSection.svelte**: Accordion-style collapsible sections for mobile modal layout
- **RelationshipCard.svelte**: Clickable card component displaying person info with avatar, name, dates, and relationship type
- **RelationshipCardGrid.svelte**: Responsive grid container for relationship cards (3 columns on desktop, 2 on tablet, 1 on mobile)
- **InlineParentSelector.svelte**: Inline parent selection dropdown with gender-based filtering and remove button

#### Visualization Views
All views access stores directly (no prop drilling), support clicking nodes/bars to open PersonModal via `modal.open()`, and have floating "+" button to add people.

- **TreeView.svelte** (`#/` or `#/tree`): Default hierarchical tree view
  - Descendants flow downward from root ancestors
  - Displays spouses/co-parents horizontally
  - Uses D3 tree layout with optimized enter/update/exit pattern
  - Preserves zoom/pan state during updates
  - Smooth 300ms transitions for changes

- **TimelineView.svelte** (`#/timeline`): Chronological lifespan view
  - Horizontal bars showing birth to death (or present)
  - Sort by birth year or generation
  - Filters for living/deceased people
  - Excludes people without birth dates

- **PedigreeView.svelte** (`#/pedigree`): Compact ancestor chart
  - Focus person selector (dropdown)
  - Ancestors expand upward in compact boxes (80x40)
  - Generation labels (G0=focus, G1=parents, G2=grandparents, etc.)
  - Uses D3 enter/update/exit for incremental updates
  - Limited to 4-5 generations for performance

- **RadialView.svelte** (`#/radial`): Circular fan chart
  - Focus person at center
  - Ancestors in concentric rings (generations)
  - Radial tree layout with smart text rotation
  - Focus person selector (dropdown)
  - D3 optimization for smooth updates
  - Limited to 5 generations

- **ListView.svelte** (`#/list`): Admin view with forms
  - Forms for adding/editing people and relationships
  - Table view of all people with relationship info
  - No ViewSwitcher (use direct link or back navigation)

### Key UI Patterns
- Clicking a tree node calls `modal.open(personId, 'edit')` to open **PersonModal**
- Floating "+" button calls `modal.openNew()` to add new person
- **Hybrid Modal Layout**:
  - Desktop/Tablet: Two-column layout with personal info (left) and relationships (right)
  - Mobile: Collapsible sections (Personal Information expanded by default, relationships collapsed)
  - Responsive breakpoints: <768px (mobile), 768-1023px (tablet), >=1024px (desktop)
- **Card-Based Relationship Navigation**: Click any relationship card to navigate to that person's modal
- **Inline Parent Editing**: Dropdown selectors for mother/father with gender-based filtering and remove buttons
- Modal displays computed relationships from derived stores: parents, siblings, and children
- Modal has sticky close button (top right) and sticky button footer (bottom) that remain visible when scrolling
- **Optimistic updates**: UI updates immediately, shows toast notification, rolls back on error
- **Toast notifications**: Non-blocking feedback in top-right corner (success=green, error=red, info=blue)
- Update/Add button (bottom left) and Delete button (bottom right) in modal footer

### Shared Utilities

- **`frontend/src/lib/treeHelpers.js`**: Common tree manipulation functions
  - `getNodeColor(person)`: Gender-based colors (male=#AED6F1, female=#F8BBD0, other=#E0E0E0)
  - `findRootPeople(people, relationships)`: Find people without parents
  - `buildDescendantTree(person, ...)`: Build tree downward (for TreeView)
  - `buildAncestorTree(person, ...)`: Build tree upward (for PedigreeView, RadialView)
  - `findParents(personId, ...)`: Get mother and father
  - `findChildren(personId, ...)`: Get children
  - `assignGenerations(people, ...)`: Compute generation numbers
  - `formatLifespan(birthDate, deathDate)`: Format as "YYYY–YYYY" or "YYYY–present"

- **`frontend/src/lib/d3Helpers.js`**: Reusable D3.js utilities
  - `createZoomBehavior(svg, g, scaleExtent)`: Standard zoom/pan behavior
  - `renderPersonNode(...)`: Consistent node rendering across views
  - `polarToCartesian(angle, radius)`: Coordinate conversion for radial layout
  - `renderRadialPersonNode(...)`: Radial-specific node rendering
  - `updateTreeNodes(...)`: Enter/update/exit pattern for tree nodes
  - `updateTreeLinks(...)`: Enter/update/exit pattern for tree links
  - `updatePedigreeNodes(...)`: Optimized updates for pedigree view
  - `updateRadialNodes(...)`: Optimized updates for radial view
  - `updateRadialLinks(...)`: Optimized links for radial view

### Data Flow

**Store-Based Reactive Architecture:**

1. **Initial Load**: `App.svelte` fetches all people and relationships on mount, populates core stores
   ```javascript
   onMount(async () => {
     const [peopleData, relationshipsData] = await Promise.all([
       api.getPeople(),
       api.getRelationships()
     ])
     people.set(peopleData)
     relationships.set(relationshipsData)
   })
   ```

2. **Reactive Updates**: All components subscribe to stores using `$` syntax
   ```javascript
   // Components automatically re-render when stores change
   $: treeData = $familyTree
   $: currentPerson = $peopleById.get(personId)
   ```

3. **CRUD Operations**: Use action creators with optimistic updates
   ```javascript
   import { createPerson, updatePerson, deletePerson } from './stores/actions/personActions.js'

   // UI updates immediately, rolls back on error
   await updatePerson(personId, { firstName: 'Jane' })
   ```

4. **Derived Computations**: Derived stores automatically recompute when dependencies change
   - `peopleById`: O(1) lookups (no array.find())
   - `familyTree`: Pre-computed tree structure
   - `createPersonRelationships()`: Reactive relationship data

5. **Tree Building**: Tree views use shared helpers with derived store data
   - TreeView: Uses `$familyTree` derived store (descendants)
   - PedigreeView/RadialView: Uses `buildAncestorTree()` with `$rootPeople`

6. **Modal Interactions**: Components call modal store methods directly
   ```javascript
   import { modal } from './stores/modalStore.js'

   // Open modal from any component
   modal.open(personId, 'edit')
   ```

7. **Notifications**: Action creators show toast notifications
   ```javascript
   notifications.success('Person updated successfully')
   notifications.error('Failed to update person')
   ```

8. **D3 Updates**: Views use enter/update/exit pattern for incremental rendering
   - Only changed nodes update (not entire tree)
   - Zoom/pan state preserved
   - Smooth 300ms transitions

### Routing
Hash-based routing in `App.svelte`:
- `#/` or `#/tree`: Default tree view (hierarchical descendants)
- `#/timeline`: Chronological timeline with lifespan bars
- `#/pedigree`: Compact ancestor chart with focus person
- `#/radial`: Circular fan chart with concentric generations
- `#/list`: Admin list view (forms and tables)

ViewSwitcher navigation appears on all views except List view.

### API Client
`frontend/src/lib/api.js` provides typed API methods for all backend endpoints. The backend expects relationships to use:
- `type: "mother"` or `type: "father"` (will be normalized to `"parentOf"` with `parent_role`)
- `type: "spouse"` for spousal relationships

### Gender Display
- Gender is shown with radio buttons in the PersonForm (female, male, other, unspecified)
- Gender values are stored lowercase in the database
- Gender determines node color in all tree visualizations
- Selected gender radio button text appears bold

### Responsive Modal Implementation

The PersonModal uses a hybrid responsive design that adapts to screen size, providing an optimal UX across all devices.

#### Desktop/Tablet Layout (>=768px)
- **Two-column grid layout** (40%/60% split):
  - Left column: Personal information form with white background
  - Right column: Relationships display with gray background (#fafafa)
- **Card-based relationship display**:
  - RelationshipCard components with avatar, name, dates, and relationship type
  - Hover effects with lift animation and green border
  - Click cards to navigate between people
  - Responsive grid: 3 cards per row (desktop >=1024px), 2 cards per row (tablet 768-1023px)
- **Inline parent selectors**:
  - Dropdown menus for mother/father selection
  - Gender-based filtering (mothers=female, fathers=male)
  - Remove button appears when parent is selected
  - Gray background section (#f9f9f9) for visual grouping
- **Immediate visibility**: All relationships visible without scrolling (max-height: 70vh per column)

#### Mobile Layout (<768px)
- **Single-column layout** with collapsible sections:
  - Personal Information section (expanded by default)
  - Parents section (collapsed, shows count badge)
  - Siblings section (collapsed, shows count badge)
  - Children section (collapsed, shows count badge)
- **Progressive disclosure**:
  - Smooth slide transitions (250ms) when expanding/collapsing
  - Chevron icon rotates to indicate state
  - Sections use gray header (#f5f5f5) for clear visual separation
- **Full-width cards**: Single-column card layout optimized for touch
- **Touch-friendly targets**: Minimum 48px tap targets for WCAG 2.1 AA compliance

#### Responsive Breakpoints
- **Mobile**: <768px (window width)
- **Tablet**: 768-1023px
- **Desktop**: >=1024px

Breakpoint detection uses Svelte's reactive `$:` syntax with `window.innerWidth` binding for automatic layout switching.

#### Accessibility Features
- ARIA labels and roles throughout
- Keyboard navigation support (Enter/Space for cards and sections)
- Focus indicators with green outlines
- Screen reader announcements for expand/collapse actions
- Semantic HTML (sections, buttons, headings)

#### Component Composition
The hybrid modal is built from specialized components:
1. **PersonModal.svelte**: Top-level component with responsive logic
2. **TwoColumnLayout.svelte**: Grid layout container (desktop/tablet)
3. **CollapsibleSection.svelte**: Accordion sections (mobile)
4. **PersonFormFields.svelte**: Form fields (shared across layouts)
5. **RelationshipCard.svelte**: Person card with click handler
6. **RelationshipCardGrid.svelte**: Responsive grid wrapper
7. **InlineParentSelector.svelte**: Parent dropdown with filtering

See issue #37 (PersonModal Layout Redesign Epic) and issue #41 (Hybrid Modal Implementation) for design decisions and evaluation process.

### Architecture Documentation

For detailed information about the reactive architecture migration:
- **`REACTIVE_ARCHITECTURE_EXPLORATION.md`**: Comprehensive technical analysis of the migration (1965 lines)
- **`frontend/src/stores/actions/README.md`**: Optimistic update pattern documentation
- **`STORE_TEST_COVERAGE.md`**: Complete test coverage report
- **`PHASE_1_1_IMPLEMENTATION_SUMMARY.md`**: Phase 1.1 implementation details

The application has evolved through a 6-phase reactive architecture migration (Issues #26-34):
- **Phase 1**: Core Svelte stores foundation
- **Phase 2**: Derived stores and O(1) performance optimizations
- **Phase 3**: Optimistic updates and toast notifications
- **Phase 4**: Modal state refactoring (eliminated modalKey workaround)
- **Phase 5**: Removed prop drilling (App.svelte simplified from 253 to 81 LOC)
- **Phase 6**: D3.js optimization with enter/update/exit pattern

**Performance Improvements:**
- Person lookups: O(n) → O(1) via derived stores
- CRUD operations: 300ms perceived latency → <50ms with optimistic updates
- Tree re-renders: Full destroy/rebuild → Incremental updates (83-97% faster)
- App.svelte: 253 LOC → 81 LOC (68% reduction)

### Known Issues
See GitHub issues for resolved and current bugs:
- Issue #1: ~~Parent names not displaying in modal relationships section~~ (RESOLVED)
- Issue #2: ~~Modal doesn't reopen when clicking same node immediately after closing~~ (RESOLVED)
- Issue #3: ~~Gender not displayed correctly in Person modal~~ (RESOLVED)
