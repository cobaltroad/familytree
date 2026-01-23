# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Guidelines

**Before starting development, review these essential guidelines:**

- **`TESTING_GUIDELINES.md`** - Testing conventions, file naming, and API route testing requirements
- **`CODING_GUIDELINES.md`** - View component development, API routes, and code style standards
- **`MIGRATIONS.md`** - Database migration system and schema change workflow

These guidelines ensure consistency and prevent common issues like route mismatches and SvelteKit reserved file name conflicts.

## Development Commands

### Full-Stack SvelteKit Application
```bash
npm install           # Install dependencies (first time only)
npm run dev          # Start dev server on http://localhost:5173
npm run build        # Build static site for production
npm run preview      # Preview production build locally
npm run export-data  # Export database to static JSON files
```

**Static Site Generation (Story #147 - IMPLEMENTED)**:
The application is configured to build as a static site using `@sveltejs/adapter-static`. The build process:
1. Generates static HTML, CSS, and JavaScript files in the `build/` directory
2. Includes all assets and libraries (family-chart, etc.)
3. Copies static data files from `static/` directory
4. Creates a fallback `index.html` for client-side routing
5. Produces a fully self-contained site ready for static hosting (GitHub Pages, Netlify, Vercel, etc.)

**Note**: The static build does NOT include server-side API routes or authentication. For full functionality with database and authentication, use the development server (`npm run dev`).

### Drizzle ORM (Database Management)
```bash
npm run db:studio         # Open Drizzle Studio (database GUI)
npm run db:generate       # Generate migrations from schema changes
npm run db:migrate        # Apply pending migrations to database
npm run db:push           # Push schema directly (development only)
npm run db:init-migrations  # Initialize migration tracking (one-time setup for existing DB)
```

**Migration System (Issue #122 - RESOLVED)**:
The migration system is fully functional. All migrations are tracked in the `__drizzle_migrations` table and applied using Drizzle's official migrate() function. See **`MIGRATIONS.md`** for complete documentation.

**Common workflow**:
1. Modify `src/lib/db/schema.js`
2. Generate migration: `npm run db:generate`
3. Review generated SQL in `drizzle/XXXX_migration_name.sql`
4. Apply migration: `npm run db:migrate`
5. Test changes: `npm test`

### Testing
```bash
npm test              # Run full test suite (2,997 tests)
npm run test:watch    # Run tests in watch mode
npm run test:ui       # Open Vitest UI for interactive testing
```

**CRITICAL**: Test files must NEVER use the `+*.test.js` naming pattern. The `+` prefix is reserved by SvelteKit and will break the application. See `TESTING_GUIDELINES.md` for complete rules and conventions.

**Test Suite Status**: Comprehensive test coverage with 2,997 total tests (2,820 passing as of v2.2.1). The test suite includes:
- Server route integration tests with Drizzle ORM
- Component tests with @testing-library/svelte
- family-chart integration tests for TreeView
- Routing and navigation tests
- Performance benchmarks
- End-to-end acceptance tests
- GEDCOM import and parsing tests (200+ tests for file format handling)

**v2.2.1 Test Infrastructure Improvements**:
The v2.2.1 release focused on major test infrastructure improvements, reducing test failures from 315 to 10 (97% reduction). Key improvements include:

- **Test Helpers**: `setupTestDatabase()` and `createMockAuthenticatedEvent()` helpers in `src/lib/server/testHelpers.js` provide consistent test database setup and authentication mocking
- **Schema Synchronization**: Test databases now use production migrations (single source of truth) instead of duplicated CREATE statements, eliminating schema mismatch errors
- **Foreign Key Support**: Automatic `PRAGMA foreign_keys = ON` in test helpers ensures foreign key constraints are properly tested
- **Store Mocking**: Improved Svelte store mock patterns with proper subscribe/unsubscribe contract implementation
- **Performance Tuning**: Adjusted performance test thresholds to account for CI/CD environment variance

See `TESTING_GUIDELINES.md` for test helper usage patterns and `LESSONS_LEARNED.md` for detailed insights from the v2.2.1 test infrastructure improvements.

## Architecture Overview

### Backend Structure
- SvelteKit server routes (`src/routes/api/`) for REST API
- Drizzle ORM for type-safe database access
- SQLite database (`familytree.db`) for persistence
- Two main entities: **Person** and **Relationship**
- Business logic modules in `src/lib/server/`
- Facebook OAuth integration with Auth.js
- User authentication and session management

### Facebook Integration

The application includes comprehensive Facebook OAuth integration for user authentication and profile synchronization. This feature set was implemented in v2.1.0 (Issues #77-84).

#### Authentication Flow

1. **OAuth Login**: Users authenticate via Facebook OAuth 2.0
2. **Session Management**: Auth.js handles secure session management with JWT tokens
3. **User Profile**: OAuth profile data (name, email, photo) stored in users table
4. **Default Person**: On first login, user's Facebook profile automatically creates a Person record

#### Configuration

See `FACEBOOK_OAUTH_SETUP.md` for detailed setup instructions.

**Required Environment Variables**:
```bash
FACEBOOK_APP_ID=your_app_id
FACEBOOK_APP_SECRET=your_app_secret
AUTH_SECRET=your_32_char_secret  # Generate with: openssl rand -base64 32
```

**Optional Variables** (with defaults):
```bash
FACEBOOK_CALLBACK_URL=http://localhost:5173/auth/callback/facebook
FACEBOOK_API_VERSION=v19.0
FACEBOOK_SCOPES=email,public_profile,user_birthday,user_gender
```
### Database Access with Drizzle ORM
The application uses Drizzle ORM for type-safe database queries:
- Schema defined in `src/lib/db/schema.js`
- Database client in `src/lib/db/client.js`
- Automatic type inference from schema
- Migration management via Drizzle Kit
- Zero-cost abstractions with minimal runtime overhead

### Relationship Model
The relationship system has evolved and uses a normalized storage approach:
- All parent-child relationships are stored as `type: "parentOf"` with a `parent_role` field (`"mother"` or `"father"`)
- The API accepts `"mother"` and `"father"` as relationship types, which are automatically normalized to `"parentOf"` with the appropriate `parent_role`
- Sibling relationships are **computed dynamically** on the frontend (people who share at least one parent), not stored in the database
- Spouse relationships are stored as `type: "spouse"`
- The backend validates that a person can only have one mother and one father

### Frontend Architecture
- **Svelte 4** with Vite build system
- **Hash-based routing**: Multiple view types with shared navigation
- **State management**: Reactive Svelte stores for all application state (people, relationships, modal, notifications)
- **family-chart v0.9.0** library for genealogy tree visualization (replaced custom D3.js implementation in v2.3.0)
- **Shared utilities**: `treeHelpers.js` provides tree manipulation and data transformation functions

### Visualization Architecture (v2.3.0+)

The application uses the **family-chart library** for all genealogy tree visualization. This specialized library was adopted in v2.3.0 (Epic #132) to replace custom D3.js implementations.

**Why family-chart?**
- Purpose-built for genealogy and family tree visualization
- Interactive features designed specifically for ancestor/descendant trees
- Built on D3.js internally (no need for separate D3 dependency)
- TypeScript support and framework-agnostic design
- Significantly reduces custom visualization code (70-80% reduction)

**Library Integration:**
- **Package**: `family-chart` v0.9.0 (npm)
- **Documentation**: https://github.com/donatso/family-chart
- **View Component**: `TreeView.svelte` (primary visualization)
- **Data Transformation**: `treeHelpers.js` provides helper functions to convert Person/Relationship data to family-chart format

**Key Features:**
- Ancestor tree layout with focus person selection
- Built-in zoom and pan controls
- Gender-based card styling (male=#AED6F1, female=#F8BBD0, other=#E0E0E0)
- Deceased indicator (dashed border, reduced opacity)
- Click person card to open editing modal
- 300ms smooth transitions for data updates
- Dynamic updates preserve zoom/pan state
- Performance optimized (<500ms for 100 people)

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
- **createPersonRelationships(personId)**: Factory function for person-specific relationships (mother, father, siblings, children, spouses)

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
- **QuickAddChild.svelte**: Inline form for quickly adding a child with pre-filled parent relationship (blue accent)
- **QuickAddParent.svelte**: Inline form for quickly adding mother or father with pre-set gender and relationship (orange accent)
- **QuickAddSpouse.svelte**: Inline form for quickly adding spouse/partner with bidirectional relationship (purple accent)

#### Visualization Views
All views access stores directly (no prop drilling). The "Add Person" button in the ViewSwitcher navigation (top right) opens a modal to add new people via `modal.openNew()`.

- **TreeView.svelte** (`#/` or `#/tree`): Default ancestor tree visualization using family-chart library (Story #140)
  - Built on family-chart library (v0.9.0) for feature-rich genealogy tree visualization
  - Focus person selector (dropdown) with reactive updates - choose any person to view their ancestors
  - Ancestors displayed above focus person (parents, grandparents, etc.)
  - Gender-based card colors via CSS variables (male=#AED6F1, female=#F8BBD0, other=#E0E0E0)
  - Deceased indicator (dashed border, reduced opacity)
  - Person cards display full name and lifespan (YYYY-YYYY or YYYY-present)
  - Built-in zoom and pan controls from family-chart
  - Click person card to open PersonModal via `modal.open()` for editing
  - 300ms smooth transitions for data updates
  - Dynamic updates preserve zoom/pan state (uses family-chart's updateTree with 'inherit' position)
  - Performance optimized (<500ms for 100 people)
  - Empty state with helpful guidance

- **DuplicateDetection.svelte** (`#/duplicates`): Duplicate person detection tool
  - Fuzzy matching to find potential duplicate people
  - Side-by-side comparison of person details
  - Merge functionality to consolidate duplicate records

- **ImportView.svelte** (`#/import`): GEDCOM file import workflow
  - Upload GEDCOM files to import family trees
  - File parsing and validation
  - Preview imported data before finalizing
  - Comprehensive GEDCOM format support (200+ test cases)

- **AdminView.svelte** (`#/admin`): Database inspection and management
  - View all people and relationships in tabular format
  - Useful for debugging and data verification

### Key UI Patterns
- Clicking a tree node calls `modal.open(personId, 'edit')` to open **PersonModal**
- "Add Person" link in ViewSwitcher (top right) calls `modal.openNew()` to add new person
- **Hybrid Modal Layout**:
  - Desktop/Tablet: Two-column layout with personal info (left) and relationships (right)
  - Mobile: Collapsible sections (Personal Information expanded by default, relationships collapsed)
  - Responsive breakpoints: <768px (mobile), 768-1023px (tablet), >=1024px (desktop)
- **Card-Based Relationship Navigation**: Click any relationship card to navigate to that person's modal
- **Quick Add Workflows**: Add related people directly from within PersonModal
  - **QuickAddChild**: Blue "+ Add Child" button creates child with automatic parent relationship
  - **QuickAddParent**: Orange "+ Add Mother/Father" buttons (shown when parent missing) with pre-set gender
  - **QuickAddSpouse**: Purple "+ Add Spouse" button creates bidirectional spouse relationships (supports multiple spouses)
  - All Quick Add forms use atomic transactions (person + relationship created together or rolled back)
  - Pre-fills last name from context person for convenience
- Modal displays computed relationships from derived stores: parents, siblings, children, and spouses
- Modal has sticky close button (top right) and sticky button footer (bottom) that remain visible when scrolling
- **Optimistic updates**: UI updates immediately, shows toast notification, rolls back on error
- **Toast notifications**: Non-blocking feedback in top-right corner (success=green, error=red, info=blue)
- Update/Add button (bottom left) and Delete button (bottom right) in modal footer

### Shared Utilities

- **`src/lib/treeHelpers.js`**: Common tree manipulation and data transformation functions
  - `isParentChildRelationship(rel)`: Check if relationship is parent-child type (handles both denormalized and normalized formats)
  - `getNodeColor(person)`: Gender-based colors for UI styling (male=#AED6F1, female=#F8BBD0, other=#E0E0E0)
  - `findRootPeople(people, relationships)`: Find people without parents (tree roots)
  - `buildDescendantTree(person, people, relationships)`: Build descendant tree structure with person, spouse, and children

**Architecture Migration Notes (v2.3.0):**

After Epic #132 (Migrate to family-chart Library), the application's visualization architecture was significantly simplified:

**Removed in v2.3.0 (PR #144):**
- `d3Helpers.js` - All custom D3.js utilities removed
- `PedigreeView.svelte` - Custom D3.js pedigree chart (replaced by TreeView)
- `NetworkView.svelte` - D3.js force-directed network visualization
- `RadialView.svelte` - D3.js radial fan chart
- Deprecated helper functions from `treeHelpers.js` (D3-specific code)

**Current Architecture:**
- Single visualization view: `TreeView.svelte` (family-chart library)
- Simplified utility layer: `treeHelpers.js` (D3-independent functions only)
- No direct D3.js dependency (family-chart has its own D3 dependency internally)
- 70-80% reduction in custom visualization code

This migration reduced complexity, improved maintainability, and leveraged a purpose-built genealogy visualization library designed specifically for family trees.

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

5. **Tree Building**: TreeView uses family-chart library with data transformation
   - Converts Person/Relationship data to family-chart Datum format
   - Uses `buildDescendantTree()` from treeHelpers for familyTree store

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

8. **Visualization Updates**: TreeView uses family-chart library for rendering
   - Smooth 300ms transitions for data updates
   - Zoom/pan state preserved during updates (family-chart's 'inherit' position mode)
   - Dynamic updates via family-chart's updateTree() method
   - Reactive updates when stores change (people, relationships)

### Routing
Hash-based routing in `App.svelte` (SvelteKit client-side routing):
- `#/` or `#/tree`: Default TreeView (family-chart library ancestor visualization)
- `#/duplicates`: Duplicate detection view
- `#/gedcom/import`: GEDCOM import workflow (upload step)
- `#/gedcom/parsing/{uploadId}`: GEDCOM parsing results
- `#/gedcom/preview/{uploadId}`: GEDCOM preview before import
- `#/gedcom/import-progress/{uploadId}`: Import progress tracking
- `#/admin`: Admin view for data inspection

**Legacy Route Redirects:**
The following routes automatically redirect to `#/tree` for backwards compatibility:
- `#/list` → `#/tree` (ListView removed in v2.3.0)
- `#/timeline` → `#/tree` (TimelineView removed in v2.3.0)
- `#/radial` → `#/tree` (RadialView removed in v2.3.0)

**ViewSwitcher Navigation:**
The ViewSwitcher component displays 4 main tabs:
1. **Tree** (🌳) - Default family tree visualization
2. **Duplicates** (🔍) - Duplicate person detection
3. **Import** (📁) - GEDCOM file import
4. **Admin** (🔧) - Database inspection

Plus an "Add Person" button (top right) for quickly adding new people.

### API Client
`src/lib/api.js` provides typed API methods for all backend endpoints (both client and server). The backend expects relationships to use:
- `type: "mother"` or `type: "father"` (will be normalized to `"parentOf"` with `parent_role`)
- `type: "spouse"` for spousal relationships

SvelteKit server routes (`src/routes/api/`) handle:
- Person CRUD operations (`/api/people`, `/api/people/[id]`)
- Relationship CRUD operations (`/api/relationships`, `/api/relationships/[id]`)
- Validation and business logic
- Database transactions via Drizzle ORM

### Gender Display
- Gender is shown with radio buttons in the PersonForm (female, male, other, unspecified)
- Gender values are stored lowercase in the database
- Gender determines card color in tree visualization (via CSS variables in TreeView)
- Selected gender radio button text appears bold

## Working with family-chart Library

The application uses the family-chart library for all genealogy tree visualization. This section provides guidance for developers working with the library.

### Installation and Setup

The library is already installed via npm:
```bash
# Already in package.json
"family-chart": "^0.9.0"
```

No additional setup required - family-chart includes its own D3.js dependency internally.

### Data Transformation Pattern

family-chart expects data in a specific format. The `TreeView` component transforms our Person/Relationship data:

```javascript
import { createChart } from 'family-chart'
import { people, relationships } from '../stores/familyStore.js'

// Transform Person data to family-chart format
function transformToFamilyChart(people, relationships, focusPerson) {
  const familyChartData = people.map(person => ({
    id: person.id,
    data: {
      // Person properties
      'first name': person.firstName || '',
      'last name': person.lastName || '',
      birthday: person.birthDate || '',
      deathday: person.deathDate || '',
      gender: person.gender || 'unspecified',

      // Add more fields as needed
      avatar: person.avatarUrl || ''
    },

    // Parent relationships (family-chart uses rels array)
    rels: {
      mother: relationships.find(r =>
        (r.type === 'mother' || (r.type === 'parentOf' && r.parent_role === 'mother')) &&
        r.person2Id === person.id
      )?.person1Id,

      father: relationships.find(r =>
        (r.type === 'father' || (r.type === 'parentOf' && r.parent_role === 'father')) &&
        r.person2Id === person.id
      )?.person1Id,

      spouses: relationships
        .filter(r => r.type === 'spouse' &&
          (r.person1Id === person.id || r.person2Id === person.id))
        .map(r => r.person1Id === person.id ? r.person2Id : r.person1Id)
    }
  }))

  return familyChartData
}
```

### Configuration Options

Initialize family-chart with customization options:

```javascript
const chart = createChart({
  target: chartContainer,  // DOM element
  data: transformedData,
  node_separation: 250,    // Horizontal spacing
  level_separation: 150,   // Vertical spacing (generation gap)

  // Card rendering configuration
  card_display: (person) => {
    const firstName = person.data['first name'] || ''
    const lastName = person.data['last name'] || ''
    const birthDate = person.data.birthday ? person.data.birthday.split('-')[0] : ''
    const deathDate = person.data.deathday ? person.data.deathday.split('-')[0] : ''

    return `<div class="card-content">
      <div class="name">${firstName} ${lastName}</div>
      <div class="dates">${birthDate}${deathDate ? '–' + deathDate : '–present'}</div>
    </div>`
  },

  // Card dimensions
  card_dim: {
    w: 220,
    h: 70,
    text_x: 75,
    text_y: 15,
    img_w: 60,
    img_h: 60,
    img_x: 5,
    img_y: 5
  }
})
```

### Gender-Based Card Styling

TreeView uses CSS variables for card colors based on gender:

```javascript
// In TreeView.svelte - setOnCardUpdate callback adds data attributes
chart.setOnCardUpdate((element, data) => {
  // Add person ID for click handling and testing
  element.setAttribute('data-person-id', data.id)

  // family-chart automatically applies classes: card-male, card-female, card-genderless
  // based on data.gender field
})
```

```css
/* CSS variables control colors */
:root {
  --male-color: #AED6F1;      /* Light blue */
  --female-color: #F8BBD0;    /* Light pink */
  --genderless-color: #E0E0E0; /* Gray */
}

/* family-chart applies these classes automatically */
.card-male { background: var(--male-color); }
.card-female { background: var(--female-color); }
.card-genderless { background: var(--genderless-color); }

/* Deceased indicator */
.card[data-deceased="true"] {
  border: 2px dashed #999;
  opacity: 0.7;
}
```

### Event Handler Integration

Integrate click events with modal store:

```javascript
import { modal } from '../stores/modalStore.js'

// Add click handler to person cards
chart.setOnCardClick((cardElement, personData) => {
  modal.open(personData.id, 'edit')
})
```

### Dynamic Updates

Update the tree when data changes while preserving zoom/pan state:

```javascript
// React to store changes
$: {
  if (chartInstance && $people && $relationships) {
    const newData = transformToFamilyChart($people, $relationships, focusPersonId)

    // Update with 'inherit' position mode to preserve zoom/pan
    chartInstance.updateTree({
      data: newData,
      transition_time: 300,  // 300ms smooth transition
      initial_position: 'inherit'  // Preserve current zoom/pan
    })
  }
}
```

### Performance Optimization

family-chart is optimized for genealogy trees but consider:
- Limit to 5-6 generations for best performance
- For very large trees (500+ people), consider pagination or filtering
- Use focus person selector to navigate different branches
- family-chart renders only visible nodes (built-in optimization)

### Testing family-chart Components

Example test patterns from `TreeView.test.js`:

```javascript
import { render } from '@testing-library/svelte'
import TreeView from './TreeView.svelte'
import * as familyStore from '../stores/familyStore.js'

test('initializes family-chart on mount', () => {
  familyStore.people.set([{ id: 1, firstName: 'John' }])
  familyStore.relationships.set([])

  const { container } = render(TreeView)

  // Verify chart container exists
  const chartDiv = container.querySelector('.family-chart-container')
  expect(chartDiv).toBeTruthy()
})
```

**Note**: Some rendering tests may fail in JSDOM (test environment) due to SVG rendering limitations. This is expected and does not affect production functionality.

### References

- **family-chart GitHub**: https://github.com/donatso/family-chart
- **family-chart npm**: https://www.npmjs.com/package/family-chart
- **Examples**: https://codesandbox.io/examples/package/family-chart
- **TreeView Implementation**: `src/lib/TreeView.svelte`
- **Epic #132**: Full migration documentation and evaluation notes

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
- **Quick Add buttons**:
  - "+ Add Mother/Father" buttons when parents don't exist (orange accent)
  - "+ Add Child" button to quickly add children (blue accent)
  - "+ Add Spouse" button to add spouse/partner (purple accent)
  - All Quick Add forms expand inline with pre-filled context data
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
7. **QuickAddChild.svelte**: Inline child creation form
8. **QuickAddParent.svelte**: Inline parent creation form (mother/father)
9. **QuickAddSpouse.svelte**: Inline spouse creation form

See issue #37 (PersonModal Layout Redesign Epic) and issue #41 (Hybrid Modal Implementation) for design decisions and evaluation process.

### Architecture Documentation

For detailed information about the reactive architecture migration:
- **`plans/REACTIVE_ARCHITECTURE_EXPLORATION.md`**: Comprehensive technical analysis of the migration (1965 lines)
- **`frontend/src/stores/actions/README.md`**: Optimistic update pattern documentation
- **`plans/PHASE_1_1_IMPLEMENTATION_SUMMARY.md`**: Phase 1.1 implementation details

The application has evolved through major architecture improvements:

**Reactive Architecture Migration (v2.1.0-v2.2.0):**
- **Phase 1-2 (Issues #26-27)**: Core Svelte stores and derived stores with O(1) lookups
- **Phase 3 (Issue #28)**: Optimistic updates and toast notifications
- **Phase 4 (Issue #29)**: Modal state refactoring (eliminated modalKey workaround)
- **Phase 5 (Issue #30)**: Removed prop drilling (App.svelte simplified from 253 to 81 LOC)

**Visualization Migration (v2.3.0 - Epic #132):**
- **Story #133**: Evaluated family-chart library capabilities (CONDITIONAL GO)
- **Story #140**: Added TreeView component using family-chart
- **PR #144**: Removed custom D3.js views (PedigreeView, NetworkView, RadialView)
- **Story #138**: Cleaned up deprecated D3 code and archived POC
- **Story #139**: Updated documentation (this file)

**Migration Rationale:**
The custom D3.js implementation required significant maintenance overhead:
- 500+ lines of custom D3 utilities (`d3Helpers.js`)
- 800+ lines of view-specific D3 code
- Complex enter/update/exit patterns
- Manual force simulation tuning
- Custom zoom/pan implementations

family-chart provides:
- Purpose-built genealogy tree layouts
- Built-in zoom/pan with state preservation
- Gender-based card styling out of the box
- Automatic relationship rendering
- TypeScript support
- Active maintenance and community

**Performance Improvements:**
- Person lookups: O(n) → O(1) via derived stores
- CRUD operations: 300ms perceived latency → <50ms with optimistic updates
- App.svelte: 253 LOC → 81 LOC (68% reduction)
- Visualization code: 70-80% reduction via family-chart adoption
- Bundle size: Reduced (family-chart includes optimized D3 internally)

### Known Issues
See GitHub issues for resolved and current bugs
