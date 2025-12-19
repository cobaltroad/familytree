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
- **State management**: All data flows through `App.svelte`, which manages people, relationships, and modal state
- **D3.js v7.9.0** for all tree visualizations with zoom/pan capabilities
- **Shared utilities**: `treeHelpers.js` and `d3Helpers.js` provide reusable functions across all views

### Component Structure

#### Core Components
- **App.svelte**: Root component, manages routing, data fetching, and modal state
- **ViewSwitcher.svelte**: Navigation tabs for switching between visualization views
- **PersonModal.svelte**: Modal dialog for editing/adding people (shared across all views)
- **PersonForm.svelte**: Form inside modal that displays relationship info (parents, siblings, children)

#### Visualization Views
All views support clicking nodes/bars to open PersonModal and have floating "+" button to add people.

- **TreeView.svelte** (`#/` or `#/tree`): Default hierarchical tree view
  - Descendants flow downward from root ancestors
  - Displays spouses/co-parents horizontally
  - Uses D3 tree layout with zoom/pan

- **TimelineView.svelte** (`#/timeline`): Chronological lifespan view
  - Horizontal bars showing birth to death (or present)
  - Sort by birth year or generation
  - Filters for living/deceased people
  - Excludes people without birth dates

- **PedigreeView.svelte** (`#/pedigree`): Compact ancestor chart
  - Focus person selector (dropdown)
  - Ancestors expand upward in compact boxes (80x40)
  - Generation labels (G0=focus, G1=parents, G2=grandparents, etc.)
  - Limited to 4-5 generations for performance

- **RadialView.svelte** (`#/radial`): Circular fan chart
  - Focus person at center
  - Ancestors in concentric rings (generations)
  - Radial tree layout with smart text rotation
  - Focus person selector (dropdown)
  - Limited to 5 generations

- **ListView.svelte** (`#/list`): Admin view with forms
  - Forms for adding/editing people and relationships
  - Table view of all people with relationship info
  - No ViewSwitcher (use direct link or back navigation)

### Key UI Patterns
- Clicking a tree node opens **PersonModal** (does not navigate away from tree)
- Floating "+" button in tree view opens modal to add new person
- Modal displays computed relationships: parents (from parent_role), siblings (shared parents), and children
- Modal has sticky close button that stays visible when scrolling
- Update button (bottom left) and Delete button (bottom right) in modal footer

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

### Data Flow
1. `App.svelte` fetches all people and relationships on mount via `api.js`
2. Components receive data as props and dispatch events upward (`editPerson`, `addPerson`)
3. Tree views use shared helpers to build tree structures:
   - TreeView: `findRootPeople()` + `buildDescendantTree()` (downward)
   - PedigreeView/RadialView: `buildAncestorTree()` (upward)
4. Parent relationships (mother/father) are identified by `type: "parentOf"` and `parent_role` field
5. When creating relationships via frontend, use `"mother"` or `"father"` as the type - backend handles normalization

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

### Known Issues
See GitHub issues for resolved and current bugs:
- Issue #1: ~~Parent names not displaying in modal relationships section~~ (RESOLVED)
- Issue #2: ~~Modal doesn't reopen when clicking same node immediately after closing~~ (RESOLVED)
- Issue #3: ~~Gender not displayed correctly in Person modal~~ (RESOLVED)
