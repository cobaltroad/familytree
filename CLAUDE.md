# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
npm run db:studio      # Open Drizzle Studio (database GUI)
npx drizzle-kit generate    # Generate migrations from schema
npx drizzle-kit migrate     # Apply migrations to database
npx drizzle-kit push        # Push schema directly (development)
```

### Testing
```bash
npm test              # Run full test suite (1,840 tests)
npm run test:watch    # Run tests in watch mode
npm run test:ui       # Open Vitest UI for interactive testing
```

**CRITICAL**: Test files must NEVER use the `+*.test.js` naming pattern. The `+` prefix is reserved by SvelteKit and will break the application. See `TESTING_GUIDELINES.md` for complete rules and conventions.

**Test Suite Status**: Comprehensive test coverage with 1,840 total tests. The test suite includes:
- Server route integration tests with Drizzle ORM
- Component tests with @testing-library/svelte
- D3.js visualization optimization tests
- Routing and navigation tests
- Performance benchmarks
- End-to-end acceptance tests
- Facebook integration tests (130+ tests for OAuth and profile sync)

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

#### Features

**Photo Storage (Story #77)**:
- `photoUrl` field added to Person schema
- Supports any valid image URL
- Photo displayed in PersonModal, RelationshipCard, and tree visualizations
- Graceful fallback to initials avatar when photo unavailable

**Facebook Permissions (Story #79)**:
- Requests `user_birthday` and `user_gender` permissions during OAuth flow
- `defaultPersonId` field links users to their family tree Person record
- Permissions stored for privacy-aware data access

**Auto-Create Default Person (Story #81)**:
- On first login, creates Person record from Facebook profile
- Handles edge cases: single names, missing data, partial dates
- Uses `facebookGraphClient.js` to fetch extended profile data
- Uses `defaultPerson.js` module for profile-to-person conversion
- One-time sync policy (manual updates after initial creation)

**Deletion Protection (Story #83)**:
- Users cannot delete their own default Person record
- Returns 403 Forbidden with clear error message
- Ensures data integrity (users always have representation in tree)

**Smart Tree Focusing (Story #82)**:
- PedigreeView and RadialView default to user's profile as focus person
- Graceful fallback for legacy users without default person
- Improves UX by showing relevant family tree section first

**Profile Indicators (Story #84)**:
- Blue "Your Profile" badges in PersonModal and RelationshipCard
- Visual indicators in tree visualizations (highlighted nodes)
- Helps users quickly identify their own record

**Facebook Profile Import (Story #78)**:
- Import profile picture from ANY Facebook user (not just own profile)
- Supports 6+ Facebook URL formats (profile, photo, username, numeric ID)
- Server-side API endpoint at `/api/facebook/profile`
- `facebookProfileParser.js` module for URL parsing and validation
- Secure photo URL extraction via Facebook Graph API

**Data Pre-Population (Story #80)**:
- Import gender and birth date from ANY Facebook profile
- Smart normalization (Facebook values → app schema)
- Date conversion (MM/DD/YYYY → YYYY-MM-DD)
- Privacy-aware handling (respects Facebook privacy settings)

#### Database Schema

**Users Table** (`src/lib/db/schema.js`):
- `id`: Auto-increment primary key
- `facebookId`: OAuth provider ID (unique)
- `email`: User email from Facebook
- `name`: Display name
- `photoUrl`: Profile picture URL
- `defaultPersonId`: FK to people table (user's family tree record)
- `view_all_records`: Boolean flag to bypass data isolation (default: false)
- `createdAt`, `updatedAt`: Timestamps

**People Table** (enhanced):
- `photoUrl`: Person's photo URL (imported from Facebook or custom)

#### Server Modules

**Authentication**:
- `src/lib/server/config.js`: OAuth configuration management
- `src/hooks.server.js`: Auth.js integration and session handling
- `src/routes/signin/+page.svelte`: Login page with Facebook button

**Facebook Integration**:
- `src/lib/server/facebookGraphClient.js`: Graph API client for profile data
- `src/lib/server/defaultPerson.js`: Profile-to-person conversion logic
- `src/lib/server/facebookProfileParser.js`: Facebook URL parsing and validation
- `src/routes/api/facebook/profile/+server.js`: Profile import API endpoint

**API Endpoints**:
- `POST /api/facebook/profile`: Import profile data from Facebook URL
  - Request: `{ facebookUrl: string }`
  - Response: `{ name, gender, birthDate, photoUrl }`
  - Returns 400 for invalid URLs or inaccessible profiles

#### UI Components

**PersonFormFields.svelte** (enhanced):
- Facebook URL import field with validation
- Photo preview with loading states
- Import button triggers profile data fetch
- Auto-populates name, gender, birth date, photo URL

**PersonModal.svelte** (enhanced):
- "Your Profile" badge for user's default person
- Highlights user's record in relationship cards

**RelationshipCard.svelte** (enhanced):
- Blue badge indicator for user's profile
- Photo display with fallback to initials

**Tree Visualizations** (enhanced):
- `d3Helpers.js`: Visual highlighting for user's profile node
- Default focus on user's profile in PedigreeView and RadialView

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

#### Testing

**Test Coverage** (130+ tests):
- OAuth configuration validation (35 tests)
- Facebook Graph API client (30 tests)
- Default person creation (30 tests)
- Profile URL parsing (34 tests)
- Deletion protection (6 tests)
- Tree focusing (10 tests)
- Profile indicators (9 tests)
- Data pre-population (27 tests)

All tests follow TDD methodology (RED → GREEN → REFACTOR) with 100% passing rate for Facebook features.

#### Privacy and Security

- OAuth tokens never stored in database (session-only)
- Graph API calls use secure server-side endpoints
- User consent required for birthday and gender permissions
- Respects Facebook privacy settings (profile import fails gracefully)
- Photo URLs are CDN links (no local storage of Facebook photos)
- Users can manually update imported data at any time

#### Edge Cases Handled

- **Single Names**: Facebook profiles with only first name or last name
- **Missing Data**: Graceful handling when birthday/gender unavailable
- **Partial Dates**: Supports year-only or month-year birth dates
- **Invalid URLs**: Clear error messages for malformed Facebook URLs
- **Private Profiles**: Returns 400 error when profile not accessible
- **Legacy Users**: Existing users without default person (graceful fallback)

### Admin View and Data Isolation Controls

The application includes an Admin view for debugging and data inspection, along with a feature flag system for controlling data visibility.

#### Admin View Component

**Location**: Accessible via `#/admin` route (wrench icon 🔧 in navigation)

**Features**:
- **People Table**: Displays all person records with ID, Name, Birth/Death dates, Gender, Photo URL, and User ID
- **Relationships Table**: Displays all relationship records with IDs, person names, type, parent role, and User ID
- **Record Counts**: Badge indicators showing total count for each table
- **Responsive Design**: Horizontal scrolling tables on smaller screens
- **Data Isolation Visibility**: User ID column highlighted in green to verify multi-user data separation
- **Empty States**: Clear messages when no records exist

**Purpose**: Development and debugging tool to inspect database records and verify data isolation is working correctly.

#### Feature Flag: View All Records

**Description**: Per-user feature flag that controls whether a user sees only their own records (default) or all records from all users in the database.

**Database Field**:
- Column: `users.view_all_records` (INTEGER, defaults to 0/false)
- Location: `src/lib/db/schema.js`
- Migration: `drizzle/0001_dear_annihilus.sql`

**API Endpoints**:
- `GET /api/user/settings` - Retrieve current user's settings
- `PATCH /api/user/settings` - Update settings (accepts `{ viewAllRecords: boolean }`)
  - Authentication required
  - Users can only update their own settings
  - Returns updated settings object

**Behavior**:
- **Flag OFF (default)**: User sees only their own people and relationships
  - `/api/people` filters by `user_id = current_user.id`
  - `/api/relationships` filters by `user_id = current_user.id`
  - Blue info banner: "Viewing only your records - data isolation active"

- **Flag ON**: User sees ALL records from all users
  - `/api/people` returns all people (no user_id filter)
  - `/api/relationships` returns all relationships (no user_id filter)
  - Orange warning banner: "Viewing ALL users' records - You are seeing records from all users in the database"

**UI Controls** (in AdminView):
- **Toggle Switch**: Custom styled toggle for "View All Users' Records"
  - Orange background when enabled
  - Loading indicator during updates
  - Error handling with user feedback
- **Visual Banners**: Clear indication of current viewing mode
- **Auto-refresh**: Page reloads after toggling to display new data

**Security**:
- Per-user flag (not global setting)
- Each user controls their own flag independently
- Requires authentication to toggle
- No elevation of privileges required
- Defaults to safe mode (data isolation active)

**Use Cases**:
1. **Debugging**: Developers can verify data isolation is working correctly
2. **Admin Review**: Admin users can inspect all records without direct database access
3. **Testing**: QA can verify multi-user scenarios
4. **Development**: Easier to see test data from multiple users

**Testing**:
- 25 comprehensive tests covering:
  - Database schema changes (6 tests)
  - User settings API endpoint (9 tests)
  - People API flag behavior (8 tests)
  - Relationships API flag behavior (2 tests)
- All tests follow TDD methodology
- Integration tests verify end-to-end behavior

**Implementation Files**:
- Schema: `src/lib/db/schema.js`
- Settings API: `src/routes/api/user/settings/+server.js`
- People API: `src/routes/api/people/+server.js` (modified GET handler)
- Relationships API: `src/routes/api/relationships/+server.js` (modified GET handler)
- Frontend: `src/lib/AdminView.svelte` (toggle UI)
- API Client: `src/lib/api.js` (updateUserSettings method)

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

- **PedigreeView.svelte** (`#/` or `#/pedigree`): Default compact ancestor chart
  - Focus person selector (dropdown)
  - Ancestors expand upward in compact boxes (80x40)
  - Generation labels (G0=focus, G1=parents, G2=grandparents, etc.)
  - Uses D3 enter/update/exit for incremental updates
  - Preserves zoom/pan state during updates
  - Limited to 4-5 generations for performance

- **TimelineView.svelte** (`#/timeline`): Chronological lifespan view
  - Horizontal bars showing birth to death (or present)
  - Sort by birth year or generation
  - Filters for living/deceased people
  - Excludes people without birth dates

- **RadialView.svelte** (`#/radial`): Circular fan chart
  - Focus person at center
  - Ancestors in concentric rings (generations)
  - Radial tree layout with smart text rotation
  - Focus person selector (dropdown)
  - D3 optimization for smooth updates
  - Limited to 5 generations

- **NetworkView.svelte** (`#/network`): Force-directed network graph (Story #99, #100, #101)
  - Interactive physics-based layout showing all family members
  - D3 force simulation with multiple forces (charge, link, center, collision, custom spouse force)
  - Displays all relationships simultaneously (parent-child, spouse, sibling)
  - **Spouse Proximity Enhancement** (Story #100):
    - Custom spouse force positions married/partnered couples close together (60-80px apart)
    - Adjusted link parameters for spouse relationships (60px distance, 1.5x strength)
    - Enhanced hover highlighting: spouse nodes and links highlighted with purple border/brighter color
    - Handles multiple spouses per person, pinned nodes, and edge cases gracefully
    - Performance optimized for <5s settle time with 50 spouse pairs
  - **Children Display and Grouping** (Story #101):
    - Parent-child links configured with shorter distance (75px) to keep families closer
    - Stronger link pull (1.2x strength) for parent-child relationships
    - Children positioned within 120px of parents after simulation settles
    - Siblings naturally cluster together near shared parents (within 110px)
    - Collision force prevents overlap even with 10+ children per parent
    - Performance validated: <5s settle time with 20 children
  - Drag nodes to reposition (pinned until double-click to release)
  - Zoom/pan controls (0.1x to 10x scale)
  - Hover effects with tooltips showing name, lifespan, and relationship count
  - Connected node highlighting on hover
  - Distinct visual styles for relationship types:
    - Parent-child: Solid lines with arrows (mother=pink, father=blue) - 75px distance, 1.2x strength
    - Spouse: Purple dashed lines - 60px distance, 1.5x strength
    - Sibling: Gray dotted lines (computed dynamically) - 100px distance, 1.0x strength
  - Reset view and reheat simulation controls
  - Performance warning for datasets >500 people
  - Responsive to window resize
  - Empty state guidance for adding people/relationships

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

- **`frontend/src/lib/treeHelpers.js`**: Common tree manipulation functions
  - `getNodeColor(person)`: Gender-based colors (male=#AED6F1, female=#F8BBD0, other=#E0E0E0)
  - `findRootPeople(people, relationships)`: Find people without parents
  - `buildDescendantTree(person, ...)`: Build tree downward (for future views if needed)
  - `buildAncestorTree(person, ...)`: Build tree upward (for PedigreeView, RadialView)
  - `findParents(personId, ...)`: Get mother and father
  - `findChildren(personId, ...)`: Get children
  - `assignGenerations(people, ...)`: Compute generation numbers
  - `formatLifespan(birthDate, deathDate)`: Format as "YYYY–YYYY" or "YYYY–present"
  - `computeSiblingLinks(people, relationships)`: Generate bidirectional sibling links from shared parents (Story #99)

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
  - **Force Network Functions (Story #99, #100, #101)**:
    - `createForceSimulation(nodes, links, options)`: Configure D3 force simulation with dynamic link parameters (Story #100, #101)
      - Charge, link, center, and collision forces
      - Dynamic link distance based on relationship type:
        - Spouse: 60px (Story #100)
        - Parent-child (mother/father): 75px (Story #101)
        - Sibling: 100px (default)
      - Dynamic link strength based on relationship type:
        - Spouse: 1.5x (Story #100)
        - Parent-child (mother/father): 1.2x (Story #101)
        - Sibling: 1.0x (default)
      - Handles undefined/null links gracefully
    - `createSpouseForce(spousePairs, targetDistance)`: Custom force that pulls spouse pairs together (Story #100)
      - Positions spouses 60-80px apart (configurable)
      - Respects pinned nodes (fx/fy attributes)
      - Handles multiple spouses per person
      - Scales force strength based on alpha parameter for smooth settling
      - Gracefully handles edge cases (missing nodes, distance=0, invalid pairs)
    - `updateNetworkNodes(g, nodes, getColor, onClick)`: Render network nodes with enter/update/exit pattern
    - `updateNetworkLinks(g, links)`: Render relationship links with type-specific styling
    - `applyNodeDrag(simulation)`: Drag behavior for pinning/unpinning nodes
    - `createNetworkTooltip()`: Tooltip with show/hide/move methods
    - `highlightConnectedNodes(g, node, links, highlight)`: Highlight connected nodes and links on hover

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
- `#/` or `#/pedigree`: Default pedigree view (compact ancestor chart with focus person)
- `#/tree`: Redirects to pedigree view (TreeView removed)
- `#/list`: Redirects to pedigree view (ListView removed)
- `#/timeline`: Chronological timeline with lifespan bars
- `#/radial`: Circular fan chart with concentric generations
- `#/network`: Force-directed network graph (Story #99)
- `#/admin`: Admin view for data inspection

ViewSwitcher navigation appears on all views and shows: Pedigree, Timeline, Radial, Network, and Admin tabs.

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

## Migration History

### SvelteKit + Drizzle Migration (December 2025)

The application was migrated from a dual-server architecture (Go backend + Svelte frontend) to a unified SvelteKit full-stack framework with Drizzle ORM. This migration represents a fundamental shift in the application's architecture and development workflow.

#### Architecture Changes

**Before:**
- Go backend (Chi router, database/sql)
- Svelte frontend (Vite)
- Two separate processes to run
- Manual API synchronization
- SQL query strings

**After:**
- SvelteKit full-stack (unified framework)
- Drizzle ORM (type-safe database access)
- Single process for development
- End-to-end type safety
- Schema-driven development

#### Benefits

**Developer Experience:**
- Single language (TypeScript/JavaScript) across entire stack
- Simplified development workflow (1 command vs. 2)
- Hot module replacement for server routes
- Drizzle Studio for database management
- Better IDE support with full-stack type inference

**Code Quality:**
- Reduced codebase complexity (approximately 125 fewer lines)
- End-to-end type safety from database to UI
- Schema-driven development reduces bugs
- Modern tooling and best practices
- Easier onboarding for new developers

**Performance:**
- Faster development iteration cycles
- Optimized production builds
- Built-in SvelteKit optimizations (prerendering, SSR, etc.)
- Efficient database queries with Drizzle

#### Documentation

For comprehensive technical details about the migration:
- `/plans/SVELTEKIT_DRIZZLE_MIGRATION.md` - Technical analysis and exploration
- `/plans/MIGRATION_USER_STORIES.md` - User stories and acceptance criteria
- `/plans/MIGRATION_PROPOSAL_SUMMARY.md` - Executive summary and decision rationale

#### Historical Reference

The original Go backend has been archived at `/archive/backend-go-YYYYMMDD/` for reference. All functionality has been preserved and enhanced in the SvelteKit version.
