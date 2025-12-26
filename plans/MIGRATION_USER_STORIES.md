# SvelteKit + Drizzle Migration User Stories

**Epic:** Migrate from Go Backend to SvelteKit + Drizzle ORM
**Status:** Needs Grooming
**Created:** 2025-12-25
**Priority:** High

This document contains user stories for migrating the Family Tree application from a dual-stack architecture (Go backend + Svelte frontend) to a unified SvelteKit full-stack framework with Drizzle ORM.

---

## Story 1: SvelteKit Project Setup and Configuration

**Priority:** High (Must complete first)
**Estimated Complexity:** Medium (4 hours)
**Dependencies:** None

### User Story

As a **developer**
I want to set up SvelteKit with hash-based routing and proper configuration
So that I can begin migrating the frontend application to the SvelteKit framework while preserving the current routing behavior

### Acceptance Criteria

#### Scenario 1: SvelteKit installation and configuration
**Given** the current frontend is built with Vite + Svelte 4
**When** I install SvelteKit dependencies and configure the project
**Then** the application should use SvelteKit's development server
**And** hash-based routing should be enabled (`router: { type: 'hash' }`)
**And** the static adapter should be configured with `fallback: 'index.html'`
**And** the `$lib` alias should point to `src/lib`

#### Scenario 2: Directory structure migration
**Given** the SvelteKit configuration is complete
**When** I restructure the frontend directories
**Then** `src/App.svelte` should be moved to `src/routes/+page.svelte`
**And** existing components in `src/lib` should remain accessible via `$lib` alias
**And** all import paths should use the `$lib` alias consistently

#### Scenario 3: Development server functionality
**Given** the SvelteKit project is configured
**When** I run `npm run dev`
**Then** the application should start on a single port (default 5173)
**And** hot module replacement should work for all Svelte components
**And** the server should log "SvelteKit" in the startup message

#### Scenario 4: Hash-based routing verification
**Given** the application is running in SvelteKit dev mode
**When** I navigate to `http://localhost:5173/#/pedigree`
**Then** the PedigreeView component should render
**When** I navigate to `http://localhost:5173/#/timeline`
**Then** the TimelineView component should render
**When** I navigate to `http://localhost:5173/#/radial`
**Then** the RadialView component should render

#### Scenario 5: Existing functionality preserved
**Given** the SvelteKit migration is complete
**When** I interact with the application
**Then** all Svelte components should render without errors
**And** Svelte stores (familyStore, derivedStores, modalStore, etc.) should function correctly
**And** D3.js visualizations should render properly
**And** there should be no console errors related to imports or routing

### Test Requirements

**Unit Tests:**
- No new unit tests required (existing component tests should pass)

**Integration Tests:**
- Manual test: Navigate to all three views (#/pedigree, #/timeline, #/radial)
- Manual test: Verify ViewSwitcher navigation works
- Manual test: Verify PersonModal opens/closes
- Automated test: Run existing Vitest test suite (`npm run test`)

**Acceptance:**
- All existing Vitest tests must pass
- Manual testing checklist completed with no errors
- No console errors in browser dev tools

### Definition of Done

- [ ] SvelteKit dependencies installed in package.json
- [ ] svelte.config.js created with hash routing configuration
- [ ] Directory structure migrated to SvelteKit conventions
- [ ] Application runs on SvelteKit dev server
- [ ] All existing Vitest tests pass
- [ ] Hash-based routing works for all three views
- [ ] No console errors
- [ ] Code committed to feature branch

---

## Story 2: Drizzle ORM Setup and Schema Definition

**Priority:** High
**Estimated Complexity:** Medium (3 hours)
**Dependencies:** Story 1 (SvelteKit Setup)

### User Story

As a **developer**
I want to set up Drizzle ORM with schema definitions matching the existing SQLite database
So that I can access the database using a type-safe query builder instead of the Go backend

### Acceptance Criteria

#### Scenario 1: Drizzle ORM installation
**Given** SvelteKit is configured and running
**When** I install Drizzle dependencies
**Then** `drizzle-orm` and `better-sqlite3` should be added to dependencies
**And** `drizzle-kit` and `@types/better-sqlite3` should be added to devDependencies
**And** `drizzle.config.js` should exist in the project root

#### Scenario 2: Database schema definition
**Given** Drizzle ORM is installed
**When** I create the schema file at `src/lib/db/schema.js`
**Then** the `people` table should be defined with all existing columns:
- id (integer, primary key, auto increment)
- firstName (text, not null, maps to first_name)
- lastName (text, not null, maps to last_name)
- birthDate (text, nullable, maps to birth_date)
- deathDate (text, nullable, maps to death_date)
- gender (text, nullable)
- createdAt (text, default CURRENT_TIMESTAMP, maps to created_at)

**And** the `relationships` table should be defined with all existing columns:
- id (integer, primary key, auto increment)
- person1Id (integer, not null, foreign key to people.id with cascade delete)
- person2Id (integer, not null, foreign key to people.id with cascade delete)
- type (text, not null)
- parentRole (text, nullable, maps to parent_role)
- createdAt (text, default CURRENT_TIMESTAMP, maps to created_at)

#### Scenario 3: Database client creation
**Given** the schema is defined
**When** I create `src/lib/db/client.js`
**Then** it should export a singleton Drizzle database instance
**And** it should connect to `./familytree.db`
**And** it should include the schema for type inference

#### Scenario 4: Drizzle Kit configuration
**Given** the schema and client are created
**When** I configure `drizzle.config.js`
**Then** it should specify `dialect: 'sqlite'`
**And** it should point schema to `./src/lib/db/schema.js`
**And** it should point migrations output to `./drizzle`
**And** it should specify database URL as `./familytree.db`

#### Scenario 5: Database connection verification
**Given** Drizzle is fully configured
**When** I run `npx drizzle-kit studio`
**Then** Drizzle Studio should open in the browser
**And** I should be able to browse the `people` table
**And** I should be able to browse the `relationships` table
**And** existing data from the Go backend should be visible

#### Scenario 6: Schema introspection
**Given** Drizzle is connected to the existing database
**When** I run `npx drizzle-kit introspect`
**Then** Drizzle should recognize the existing schema
**And** no schema drift warnings should appear
**And** the schema definition should match the actual database structure

### Test Requirements

**Unit Tests:**
- Test database connection in isolation
- Test basic SELECT query on people table
- Test basic SELECT query on relationships table
- Test that schema exports are defined

**Integration Tests:**
- Verify connection to existing familytree.db
- Verify existing data is readable via Drizzle
- Test foreign key relationships are recognized

**Automated Tests:**
```javascript
import { describe, it, expect } from 'vitest';
import { db } from '$lib/db/client.js';
import { people, relationships } from '$lib/db/schema.js';

describe('Drizzle Database Connection', () => {
  it('should connect to database and read people', async () => {
    const allPeople = await db.select().from(people);
    expect(Array.isArray(allPeople)).toBe(true);
  });

  it('should connect to database and read relationships', async () => {
    const allRelationships = await db.select().from(relationships);
    expect(Array.isArray(allRelationships)).toBe(true);
  });

  it('should have correct schema definitions', () => {
    expect(people).toBeDefined();
    expect(relationships).toBeDefined();
  });
});
```

### Definition of Done

- [ ] Drizzle dependencies installed
- [ ] Schema file created with correct table definitions
- [ ] Database client created and exports singleton
- [ ] drizzle.config.js configured
- [ ] Drizzle Studio successfully browses existing data
- [ ] Schema introspection shows no drift
- [ ] Automated tests pass
- [ ] Code committed to feature branch

---

## Story 3: People API Server Routes Implementation

**Priority:** High
**Estimated Complexity:** Medium (3 hours)
**Dependencies:** Story 1 (SvelteKit Setup), Story 2 (Drizzle Setup)

### User Story

As a **developer**
I want to implement SvelteKit server routes for the People API
So that I can replace the Go backend's people endpoints with type-safe TypeScript/JavaScript equivalents

### Acceptance Criteria

#### Scenario 1: GET /api/people endpoint
**Given** Drizzle is configured and connected
**When** a client sends a GET request to `/api/people`
**Then** the server should return a JSON array of all people
**And** each person should include: id, firstName, lastName, birthDate, deathDate, gender, createdAt
**And** the response should have status 200
**And** the response format should match the current Go backend exactly

#### Scenario 2: POST /api/people endpoint
**Given** Drizzle is configured
**When** a client sends a POST request to `/api/people` with valid person data
**Then** the server should insert a new person into the database
**And** the server should return the created person with auto-generated id and createdAt
**And** the response should have status 201
**When** a client sends a POST request with missing required fields (firstName or lastName)
**Then** the server should return status 400 with error message

#### Scenario 3: GET /api/people/[id] endpoint
**Given** a person exists with id=1
**When** a client sends a GET request to `/api/people/1`
**Then** the server should return that person's data as JSON
**And** the response should have status 200
**When** a client requests a non-existent person id
**Then** the server should return status 404 with error message "Person not found"

#### Scenario 4: PUT /api/people/[id] endpoint
**Given** a person exists with id=1
**When** a client sends a PUT request to `/api/people/1` with updated data
**Then** the server should update the person in the database
**And** the server should return the updated person data
**And** the response should have status 200
**When** a client updates a non-existent person
**Then** the server should return status 404

#### Scenario 5: DELETE /api/people/[id] endpoint
**Given** a person exists with id=1
**When** a client sends a DELETE request to `/api/people/1`
**Then** the server should delete the person from the database
**And** all associated relationships should be cascade deleted (foreign key constraint)
**And** the response should have status 204 (no content)
**When** a client deletes a non-existent person
**Then** the server should return status 404

#### Scenario 6: Error handling
**Given** any people endpoint
**When** a database error occurs
**Then** the server should return status 500 with error message
**And** the error should be logged to the console
**And** the database should remain in a consistent state (transaction rollback if applicable)

### Test Requirements

**Unit Tests:**
- Test GET /api/people returns array
- Test POST /api/people creates person
- Test POST /api/people validates required fields
- Test GET /api/people/[id] returns single person
- Test GET /api/people/[id] returns 404 for non-existent
- Test PUT /api/people/[id] updates person
- Test DELETE /api/people/[id] removes person and relationships

**Integration Tests:**
```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { GET, POST } from './src/routes/api/people/+server.js';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

describe('People API Routes', () => {
  let db;

  beforeEach(() => {
    // Use in-memory database for testing
    const sqlite = new Database(':memory:');
    db = drizzle(sqlite);
    // Run migrations
  });

  it('should create and retrieve a person', async () => {
    const createRequest = new Request('http://localhost/api/people', {
      method: 'POST',
      body: JSON.stringify({ firstName: 'Jane', lastName: 'Doe' })
    });

    const createResponse = await POST({ request: createRequest });
    const created = await createResponse.json();

    expect(createResponse.status).toBe(201);
    expect(created.firstName).toBe('Jane');
    expect(created.id).toBeDefined();
  });
});
```

**Manual API Testing:**
- Use Postman or curl to test each endpoint
- Compare responses with Go backend
- Test error cases

### Definition of Done

- [ ] All five people endpoints implemented
- [ ] Error handling implemented
- [ ] Validation logic implemented
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] Manual API testing completed
- [ ] Response formats match Go backend exactly
- [ ] Code committed to feature branch

---

## Story 4: Relationships API Server Routes with Business Logic

**Priority:** High
**Estimated Complexity:** High (4 hours)
**Dependencies:** Story 3 (People API)

### User Story

As a **developer**
I want to implement SvelteKit server routes for the Relationships API with all business logic from the Go backend
So that I can enforce relationship rules (parent role validation, normalization, duplicate prevention) in the new architecture

### Acceptance Criteria

#### Scenario 1: Relationship normalization logic
**Given** the relationship business logic is extracted to `src/lib/server/relationships.js`
**When** a client creates a relationship with type "mother"
**Then** it should be normalized to type "parentOf" with parentRole "mother"
**When** a client creates a relationship with type "father"
**Then** it should be normalized to type "parentOf" with parentRole "father"
**When** a client creates a relationship with type "spouse"
**Then** it should be stored as-is without normalization

#### Scenario 2: GET /api/relationships endpoint
**Given** relationships exist in the database
**When** a client sends a GET request to `/api/relationships`
**Then** the server should return a JSON array of all relationships
**And** each relationship should include: id, person1Id, person2Id, type, parentRole, createdAt
**And** the response should have status 200

#### Scenario 3: POST /api/relationships with parent role validation
**Given** a person with id=1 has no mother
**When** a client creates a "mother" relationship for person 1
**Then** the relationship should be created successfully
**When** a client tries to create another "mother" relationship for person 1
**Then** the server should return status 400 with error "Person already has a mother"

**Given** a person with id=1 has no father
**When** a client creates a "father" relationship for person 1
**Then** the relationship should be created successfully
**When** a client tries to create another "father" relationship for person 1
**Then** the server should return status 400 with error "Person already has a father"

#### Scenario 4: Duplicate relationship prevention
**Given** a relationship exists between person 1 and person 2 as "parentOf"
**When** a client tries to create the same relationship again
**Then** the server should return status 400 with error "This relationship already exists"
**When** a client tries to create the inverse relationship (person 2 to person 1 as "parentOf")
**Then** the server should return status 400 with error "This relationship already exists"

#### Scenario 5: Spouse relationship creation
**Given** two people exist
**When** a client creates a "spouse" relationship between them
**Then** the relationship should be created successfully
**And** the response should have status 201
**When** a client creates another spouse relationship for the same people
**Then** multiple spouses should be allowed (no validation error)

#### Scenario 6: DELETE /api/relationships/[id] endpoint
**Given** a relationship exists with id=1
**When** a client sends a DELETE request to `/api/relationships/1`
**Then** the server should delete the relationship from the database
**And** the response should have status 204
**When** a client deletes a non-existent relationship
**Then** the server should return status 404

#### Scenario 7: Invalid relationship type rejection
**Given** the API only accepts "mother", "father", and "spouse" types
**When** a client tries to create a relationship with type "sibling"
**Then** the server should return status 400 with error "Invalid relationship type. Must be: mother, father, or spouse"
**When** a client tries to create a relationship with type "child"
**Then** the server should return status 400 (old "child" type is deprecated)

### Test Requirements

**Unit Tests:**
- Test relationship normalization function (mother → parentOf with role)
- Test relationship normalization function (father → parentOf with role)
- Test duplicate relationship detection
- Test parent role validation
- Test relationship type validation

**Integration Tests:**
```javascript
import { describe, it, expect } from 'vitest';
import { normalizeRelationship, hasParentOfRole } from '$lib/server/relationships.js';

describe('Relationship Business Logic', () => {
  it('should normalize mother relationship', () => {
    const { type, parentRole } = normalizeRelationship('mother');
    expect(type).toBe('parentOf');
    expect(parentRole).toBe('mother');
  });

  it('should prevent duplicate parent of same role', async () => {
    // Create person and mother relationship
    // Attempt to create another mother relationship
    // Assert error thrown
  });

  it('should allow multiple spouses', async () => {
    // Create person with one spouse
    // Create another spouse relationship
    // Assert both relationships exist
  });
});
```

**Manual API Testing:**
- Test all relationship creation scenarios
- Test parent role validation
- Test duplicate prevention
- Compare with Go backend behavior

### Definition of Done

- [ ] Relationship normalization logic extracted to separate module
- [ ] Validation logic extracted to separate module
- [ ] GET /api/relationships endpoint implemented
- [ ] POST /api/relationships endpoint implemented with all validations
- [ ] DELETE /api/relationships/[id] endpoint implemented
- [ ] Unit tests for business logic written and passing
- [ ] Integration tests written and passing
- [ ] Manual API testing completed
- [ ] All Go backend business rules preserved
- [ ] Code committed to feature branch

---

## Story 5: Frontend Integration with SvelteKit API Routes

**Priority:** High
**Estimated Complexity:** Low (2 hours)
**Dependencies:** Story 3 (People API), Story 4 (Relationships API)

### User Story

As a **developer**
I want to update the frontend API client to use SvelteKit server routes instead of the Go backend
So that the application runs as a unified full-stack SvelteKit app

### Acceptance Criteria

#### Scenario 1: API base URL update
**Given** the SvelteKit server routes are implemented and tested
**When** I update `src/lib/api.js`
**Then** the API_BASE constant should change from `http://localhost:8080/api` to `/api`
**And** all API methods should remain unchanged (same function signatures)

#### Scenario 2: CRUD operations through UI
**Given** the API client is updated to use SvelteKit routes
**When** I open the PersonModal and create a new person
**Then** the person should be saved to the database via `/api/people`
**And** the person should appear in all three visualization views
**And** an optimistic update should occur (immediate UI feedback)
**And** a success notification should display

**When** I edit an existing person's details
**Then** the changes should be saved via `/api/people/[id]`
**And** the updated data should reflect in the UI immediately
**And** a success notification should display

**When** I delete a person
**Then** the person should be removed via `/api/people/[id]`
**And** the person should disappear from the UI immediately
**And** all related relationships should be deleted (cascade)

#### Scenario 3: Relationship creation workflows
**Given** the API client is updated
**When** I use Quick Add Child to add a child
**Then** both the person and relationship should be created
**And** the child should appear in the Children section immediately

**When** I use Quick Add Parent to add a mother
**Then** the mother and relationship should be created
**And** the mother should appear in the Parents section

**When** I use Quick Add Spouse to add a spouse
**Then** the spouse and bidirectional relationship should be created
**And** the spouse should appear in the Spouses section

#### Scenario 4: Error handling
**Given** the API client is connected to SvelteKit routes
**When** a server error occurs (e.g., duplicate parent)
**Then** the optimistic update should be rolled back
**And** an error notification should display with the server error message
**And** the UI should revert to the previous state

#### Scenario 5: Performance and responsiveness
**Given** the application is running entirely on SvelteKit
**When** I perform CRUD operations
**Then** perceived latency should be < 50ms (optimistic updates)
**And** actual API response times should be < 100ms for simple queries
**And** D3.js visualizations should update smoothly (60fps)

#### Scenario 6: All visualization views functional
**Given** the frontend is integrated with SvelteKit routes
**When** I navigate to PedigreeView (#/pedigree)
**Then** the ancestor chart should render correctly with data from SvelteKit API
**When** I navigate to TimelineView (#/timeline)
**Then** the timeline should render correctly with data from SvelteKit API
**When** I navigate to RadialView (#/radial)
**Then** the radial tree should render correctly with data from SvelteKit API

### Test Requirements

**Unit Tests:**
- No new unit tests required (existing tests should pass)

**Integration Tests:**
- Test complete user workflow: create person → add relationships → edit → delete
- Test optimistic updates work with SvelteKit routes
- Test error rollback works correctly

**Manual Testing Checklist:**
- [ ] Create person via PersonModal
- [ ] Edit person details
- [ ] Delete person
- [ ] Quick Add Child workflow
- [ ] Quick Add Parent (mother) workflow
- [ ] Quick Add Parent (father) workflow
- [ ] Quick Add Spouse workflow
- [ ] Link Existing Spouse workflow
- [ ] Link Existing Parent workflow
- [ ] Link Existing Children workflow
- [ ] Delete relationship
- [ ] Test duplicate parent validation (should show error)
- [ ] PedigreeView renders correctly
- [ ] TimelineView renders correctly
- [ ] RadialView renders correctly
- [ ] Collapsible sections work (mobile layout)
- [ ] Two-column layout works (desktop layout)

**Performance Testing:**
- Benchmark API response times (should be similar or better than Go backend)
- Test with 50+ people and 100+ relationships
- Verify D3 rendering performance unchanged

### Definition of Done

- [ ] API client updated to use `/api` instead of `http://localhost:8080/api`
- [ ] All manual testing checklist items pass
- [ ] All existing Vitest tests pass
- [ ] No console errors
- [ ] Optimistic updates working
- [ ] Error handling and rollback working
- [ ] Performance meets or exceeds Go backend
- [ ] Code committed to feature branch

---

## Story 6: Comprehensive Testing and Validation

**Priority:** High
**Estimated Complexity:** Medium (3 hours)
**Dependencies:** Story 5 (Frontend Integration)

### User Story

As a **developer**
I want to comprehensively test the migrated SvelteKit application against the original Go backend
So that I can ensure feature parity and prevent regressions before removing the Go code

### Acceptance Criteria

#### Scenario 1: Automated test suite expansion
**Given** the SvelteKit migration is complete
**When** I run the full test suite (`npm run test`)
**Then** all existing component tests should pass
**And** all new server route tests should pass
**And** all business logic tests should pass
**And** code coverage should be maintained or improved (>80%)

#### Scenario 2: Side-by-side API comparison
**Given** both Go backend and SvelteKit backend are running simultaneously
**When** I send identical requests to both backends
**Then** response status codes should match
**And** response body formats should match
**And** response data should match
**And** error messages should match

#### Scenario 3: Data integrity validation
**Given** a test database with realistic family tree data (10+ people, 20+ relationships)
**When** I perform CRUD operations via SvelteKit routes
**Then** foreign key constraints should be enforced
**And** cascade deletes should work correctly
**And** parent role validation should prevent duplicate parents
**And** relationship normalization should work correctly

#### Scenario 4: Edge case testing
**Given** the SvelteKit application is running
**When** I attempt to create a person with only firstName (missing lastName)
**Then** the API should return 400 error
**When** I attempt to create a relationship with invalid type "sibling"
**Then** the API should return 400 error
**When** I attempt to delete a non-existent person
**Then** the API should return 404 error
**When** I attempt to update a person with id=999999 (doesn't exist)
**Then** the API should return 404 error

#### Scenario 5: Performance benchmarking
**Given** both backends are running
**When** I benchmark GET /api/people with 100+ records
**Then** SvelteKit response time should be <= Go backend response time
**When** I benchmark POST /api/people
**Then** SvelteKit response time should be <= Go backend response time
**When** I benchmark complex relationship queries
**Then** SvelteKit (Drizzle) should perform comparably to Go (raw SQL)

#### Scenario 6: Regression testing checklist
**Given** the complete SvelteKit application
**When** I systematically test all features
**Then** the following must all work identically to the Go backend version:
- Person creation, editing, deletion
- Relationship creation with normalization
- Parent role validation (prevent duplicate mother/father)
- Cascade deletion of relationships when person deleted
- Spouse relationships (multiple spouses allowed)
- Computed siblings (frontend calculation)
- PedigreeView rendering and interaction
- TimelineView rendering and sorting
- RadialView rendering and generation display
- PersonModal opening/closing
- Quick Add workflows
- Optimistic updates
- Error notifications
- Success notifications
- Hash-based routing navigation

### Test Requirements

**Unit Tests:**
- All existing unit tests must pass
- New server route unit tests must pass
- New business logic unit tests must pass

**Integration Tests:**
```javascript
import { describe, it, expect } from 'vitest';
import { db } from '$lib/db/client.js';
import { people, relationships } from '$lib/db/schema.js';

describe('SvelteKit Backend Integration', () => {
  it('should handle cascade delete correctly', async () => {
    // Create person with relationships
    const [person] = await db.insert(people).values({
      firstName: 'Test', lastName: 'Person'
    }).returning();

    await db.insert(relationships).values({
      person1Id: person.id, person2Id: 99, type: 'spouse'
    });

    // Delete person
    await db.delete(people).where(eq(people.id, person.id));

    // Verify relationships also deleted
    const rels = await db.select().from(relationships)
      .where(eq(relationships.person1Id, person.id));
    expect(rels.length).toBe(0);
  });

  it('should prevent duplicate parent of same role', async () => {
    // Test parent role validation
  });
});
```

**Performance Tests:**
```javascript
import { describe, it, expect } from 'vitest';

describe('Performance Benchmarks', () => {
  it('should handle 100+ people efficiently', async () => {
    const start = performance.now();
    const response = await fetch('/api/people');
    const data = await response.json();
    const end = performance.now();

    expect(end - start).toBeLessThan(100); // < 100ms
    expect(data.length).toBeGreaterThan(0);
  });
});
```

**Manual Testing:**
- Complete the regression testing checklist
- Test on different screen sizes (mobile, tablet, desktop)
- Test in different browsers (Chrome, Firefox, Safari)

### Definition of Done

- [ ] All automated tests passing (unit, integration, performance)
- [ ] Side-by-side API comparison shows identical behavior
- [ ] Edge cases tested and handled correctly
- [ ] Performance benchmarks show comparable or better performance
- [ ] Regression testing checklist 100% complete
- [ ] No bugs or issues found
- [ ] Testing results documented
- [ ] Code committed to feature branch

---

## Story 7: Go Backend Removal and Documentation Update

**Priority:** Medium (Complete after Story 6 passes)
**Estimated Complexity:** Low (2 hours)
**Dependencies:** Story 6 (Testing passes)

### User Story

As a **developer**
I want to remove the Go backend code and update all documentation
So that the repository reflects the new SvelteKit-only architecture and future developers understand the current setup

### Acceptance Criteria

#### Scenario 1: Go backend archival
**Given** all testing has passed and SvelteKit backend is proven stable
**When** I archive the Go backend
**Then** the `backend/` directory should be moved to `archive/backend-go-YYYYMMDD/`
**And** `go.mod` and `go.sum` should be removed from the repository root
**And** the original database `backend/familytree.db` should be moved to project root as `familytree.db`

#### Scenario 2: CLAUDE.md documentation update
**Given** the Go backend is removed
**When** I update `/CLAUDE.md`
**Then** the "Backend Structure" section should be replaced with "SvelteKit Server Routes"
**And** the "Database Access" section should document Drizzle ORM usage
**And** the "Development Commands" section should show single-command startup
**And** the "Architecture Overview" should reflect SvelteKit full-stack architecture
**And** all references to Go backend should be removed or marked as historical

#### Scenario 3: README.md update
**Given** the architecture has changed
**When** I update `/README.md` (if exists) or create one
**Then** it should document the SvelteKit + Drizzle stack
**And** it should include setup instructions: `npm install`, `npm run dev`
**And** it should include build instructions: `npm run build`
**And** it should document Drizzle commands for migrations
**And** it should explain the hash-based routing approach

#### Scenario 4: Package.json scripts cleanup
**Given** only SvelteKit is needed
**When** I update `package.json`
**Then** dev script should be `vite dev` or `vite`
**And** build script should be `vite build`
**And** preview script should be `vite preview`
**And** test scripts should remain (`vitest run`, `vitest`)
**And** any backend-related scripts should be removed

#### Scenario 5: Migration documentation
**Given** the migration is complete
**When** I review the documentation
**Then** `/plans/SVELTEKIT_DRIZZLE_MIGRATION.md` should exist with full exploration
**And** `/plans/MIGRATION_USER_STORIES.md` should exist with all stories
**And** a migration summary should be added to CLAUDE.md referencing these documents
**And** the benefits of the migration should be documented

#### Scenario 6: .gitignore update
**Given** SvelteKit uses different build artifacts
**When** I update `.gitignore`
**Then** it should include `.svelte-kit/` (build directory)
**And** it should include `build/` (output directory)
**And** it should include `drizzle/` (migration files - optional)
**And** it should continue to include `node_modules/`
**And** it should include `familytree.db` (or not, depending on if we want to version it)

### Test Requirements

**Validation:**
- Build the project from scratch on a clean machine (or clean clone)
- Follow documentation to set up and run
- Verify all commands in documentation work correctly
- Have another developer review documentation for clarity

**Checklist:**
- [ ] Clone repository to new directory
- [ ] Run `npm install`
- [ ] Run `npm run dev`
- [ ] Verify application starts correctly
- [ ] Run `npm run build`
- [ ] Verify build completes successfully
- [ ] Run `npm run preview`
- [ ] Verify production build works

### Definition of Done

- [ ] Go backend archived (moved to archive/ directory)
- [ ] go.mod and go.sum removed
- [ ] CLAUDE.md updated to reflect SvelteKit architecture
- [ ] README.md updated with setup and build instructions
- [ ] package.json scripts cleaned up
- [ ] .gitignore updated for SvelteKit
- [ ] Migration documentation complete
- [ ] Documentation validation checklist completed
- [ ] Another developer has reviewed documentation
- [ ] Changes committed and pushed to feature branch
- [ ] Pull request created for review

---

## Story 8: Production Deployment Preparation (Optional/Future)

**Priority:** Low (Post-Migration)
**Estimated Complexity:** Medium (3-4 hours)
**Dependencies:** Story 7 (Go removal complete)

### User Story

As a **system administrator**
I want deployment documentation and configuration for the SvelteKit application
So that I can deploy the family tree application to production environments

### Acceptance Criteria

#### Scenario 1: Static deployment option
**Given** the application uses hash-based routing and static adapter
**When** I run `npm run build`
**Then** the `build/` directory should contain a fully static application
**And** I should be able to deploy the build directory to any static host (Netlify, Vercel, GitHub Pages, S3, etc.)
**And** the application should work without a Node.js server

#### Scenario 2: Node.js deployment option
**Given** the application could use Node adapter for server-side features
**When** I switch to `@sveltejs/adapter-node`
**Then** the build should create a Node.js application
**And** I should be able to run it with `node build/index.js`
**And** environment variables should be configurable for database path

#### Scenario 3: Docker containerization
**Given** the application needs containerized deployment
**When** I create a Dockerfile
**Then** it should use a Node.js base image
**And** it should install dependencies
**And** it should build the application
**And** it should expose the correct port
**And** it should include the SQLite database or mount it as a volume
**And** `docker build` and `docker run` should work correctly

#### Scenario 4: Environment configuration
**Given** the application may run in different environments
**When** I configure environment variables
**Then** `DATABASE_PATH` should be configurable (default: `./familytree.db`)
**And** `PORT` should be configurable (default: 3000 or 5173)
**And** environment-specific settings should be documented

#### Scenario 5: Database backup strategy
**Given** the application uses SQLite
**When** I document backup procedures
**Then** instructions for backing up `familytree.db` should be provided
**And** instructions for restoring from backup should be provided
**And** optional: Litestream configuration for automatic backups to S3

#### Scenario 6: Production checklist
**Given** the application is ready for production
**When** I review the production readiness
**Then** a production deployment checklist should exist covering:
- Database backup strategy
- Environment variable configuration
- SSL/HTTPS setup (if applicable)
- Performance optimization (build minification)
- Error logging and monitoring
- Security considerations

### Test Requirements

**Deployment Testing:**
- Test static build deployment to Netlify or Vercel
- Test Node.js deployment locally
- Test Docker container build and run
- Test database backup and restore

**Documentation:**
- Deployment guide written
- Environment variable documentation complete
- Backup/restore procedures documented

### Definition of Done

- [ ] Static deployment tested and documented
- [ ] Node.js deployment option documented (if applicable)
- [ ] Dockerfile created and tested (optional)
- [ ] Environment configuration documented
- [ ] Database backup strategy documented
- [ ] Production deployment checklist created
- [ ] Deployment guide added to documentation
- [ ] At least one deployment method tested end-to-end

---

## Epic Summary

**Total Stories:** 8 (7 core + 1 optional)
**Total Estimated Effort:** 20-24 hours
**Core Migration Effort:** 20 hours (Stories 1-7)

### Story Dependencies (Order of Execution)

1. **Story 1**: SvelteKit Setup (no dependencies) - START HERE
2. **Story 2**: Drizzle Setup (depends on Story 1)
3. **Story 3**: People API (depends on Stories 1, 2)
4. **Story 4**: Relationships API (depends on Story 3)
5. **Story 5**: Frontend Integration (depends on Stories 3, 4)
6. **Story 6**: Testing (depends on Story 5)
7. **Story 7**: Go Removal & Docs (depends on Story 6)
8. **Story 8**: Production Deployment (optional, depends on Story 7)

### Risk Mitigation

Each story is independently testable and has clear acceptance criteria. If issues arise:
- Stories 1-2 can be reverted without impacting the Go backend (it continues to run)
- Stories 3-4 can be tested in parallel with the Go backend using different ports
- Story 5 can use a feature flag to switch between backends during testing
- Story 6 validates everything before removal of Go code
- Story 7 only happens after all tests pass

### Success Metrics

- All acceptance criteria met for Stories 1-7
- Zero regressions from current functionality
- Performance equal or better than Go backend
- Development workflow simplified (1 process instead of 2)
- Codebase reduced by ~125 lines
- Single language across entire stack
- End-to-end type safety achieved (if using TypeScript)

---

## Next Steps for Product Owner

1. **Review Stories**: Read through all 8 user stories
2. **Prioritize**: Confirm priority order (currently set as High for Stories 1-6)
3. **Refine Acceptance Criteria**: Suggest any additional scenarios or edge cases
4. **Approve for Backlog**: Mark stories as "Groomed" once approved
5. **Assign to Developer**: Assign to developer for implementation
6. **Track Progress**: Use GitHub Projects to track story completion

## Questions for Product Owner

1. Do you want to proceed with all 7 core stories, or phase differently?
2. Is Story 8 (Production Deployment) needed now, or can it wait?
3. Are there any additional acceptance criteria or test cases you'd like to see?
4. Do you want to add TypeScript migration as a separate story, or handle that later?
5. Should we add performance benchmarking as a standalone story?
6. Are there any specific deployment targets you have in mind (Netlify, Vercel, Docker, etc.)?
