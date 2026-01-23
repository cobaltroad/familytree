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
npm run build        # Build for production
npm run preview      # Preview production build
```

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
- **Hash-based routing**: Multiple visualization views with shared navigation
- **State management**: Reactive Svelte stores for all application state (people, relationships, modal, notifications)
- **family-chart v0.9.0** library for tree visualizations (replaced custom D3.js implementation in v2.3.0)
- **Shared utilities**: `treeHelpers.js` provides reusable tree manipulation functions

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
All views access stores directly (no prop drilling) and support clicking nodes/bars to open PersonModal via `modal.open()`. The "Add Person" link in the ViewSwitcher navigation (top right) opens a modal to add new people via `modal.openNew()`.

- **TreeView.svelte** (`#/` or `#/tree`): Default ancestor visualization using family-chart library (Story #140)
  - Built on family-chart library (v0.9.0) for feature-rich tree visualization
  - Focus person selector (dropdown) with reactive updates
  - Ancestors displayed above focus person (up to 5 generations)
  - Gender-based card colors (male=#AED6F1, female=#F8BBD0, other=#E0E0E0)
  - Deceased indicator (dashed border, reduced opacity)
  - Person cards display name and lifespan (YYYY-YYYY or YYYY-present)
  - Built-in zoom and pan controls from family-chart
  - Click person card to open PersonModal via `modal.open()`
  - 300ms smooth transitions for data updates
  - Dynamic updates preserve zoom/pan state
  - Performance optimized (<500ms for 100 people)
  - Empty state with helpful guidance

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

- **`src/lib/treeHelpers.js`**: Common tree manipulation functions
  - `isParentChildRelationship(rel)`: Check if relationship is parent-child type
  - `getNodeColor(person)`: Gender-based colors (male=#AED6F1, female=#F8BBD0, other=#E0E0E0)
  - `findRootPeople(people, relationships)`: Find people without parents
  - `buildDescendantTree(person, ...)`: Build tree structure with person, spouse, and children

Note: After v2.3.0 (PR #144), custom D3.js visualization code was removed in favor of the family-chart library for TreeView. The `d3Helpers.js` file was deleted along with deprecated helper functions from `treeHelpers.js`.

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
   - Smooth 300ms transitions
   - Zoom/pan state preserved
   - Dynamic updates via family-chart's updateTree() method

### Routing
Hash-based routing in `App.svelte`:
- `#/` or `#/tree`: Default TreeView (family-chart library ancestor visualization) - Story #140
- `#/duplicates`: Duplicate detection view
- `#/gedcom/import`: GEDCOM import workflow
- `#/admin`: Admin view for data inspection

ViewSwitcher navigation appears on all views and shows: Pedigree, Tree, Network, Duplicates, Import, and Admin tabs (6 tabs total).

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
- **Phase 1-2 (Issues #26-27)**: Core Svelte stores and derived stores with O(1) lookups
- **Phase 3 (Issue #28)**: Optimistic updates and toast notifications
- **Phase 4 (Issue #29)**: Modal state refactoring (eliminated modalKey workaround)
- **Phase 5 (Issue #30)**: Removed prop drilling (App.svelte simplified from 253 to 81 LOC)
- **v2.3.0 (PR #144)**: Migrated from custom D3.js to family-chart library, removed PedigreeView and NetworkView

**Performance Improvements:**
- Person lookups: O(n) → O(1) via derived stores
- CRUD operations: 300ms perceived latency → <50ms with optimistic updates
- App.svelte: 253 LOC → 81 LOC (68% reduction)
- Bundle size: Reduced via D3 dependency removal (family-chart has its own D3 dependency)

### Known Issues
See GitHub issues for resolved and current bugs
