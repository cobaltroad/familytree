# SvelteKit + Drizzle ORM Migration Exploration

**Date:** 2025-12-25
**Status:** Proposal
**Target Architecture:** Full-stack SvelteKit with Drizzle ORM and SQLite

## Executive Summary

This document explores migrating the Family Tree application from a dual-stack architecture (Go backend + Svelte frontend) to a unified SvelteKit full-stack framework with Drizzle ORM for database access. This migration aims to simplify the development workflow, improve type safety, reduce operational complexity, and maintain all existing functionality.

**Key Benefits:**
- Single language (TypeScript/JavaScript) across entire stack
- End-to-end type safety from database to UI
- Simplified deployment (single Node.js process vs. two separate services)
- Reduced codebase complexity (eliminate API client layer)
- Better developer experience with modern tooling
- Preserve existing frontend components and store architecture

**Migration Complexity:** Medium (estimated 16-24 hours)

**Risk Level:** Low-Medium (can be done incrementally with parallel operation during testing)

---

## Table of Contents

1. [Current Architecture Analysis](#current-architecture-analysis)
2. [Proposed Architecture](#proposed-architecture)
3. [Technology Stack Comparison](#technology-stack-comparison)
4. [Benefits Analysis](#benefits-analysis)
5. [Migration Strategy](#migration-strategy)
6. [Technical Design Decisions](#technical-design-decisions)
7. [Risk Assessment](#risk-assessment)
8. [Phased Migration Approach](#phased-migration-approach)
9. [Impact on Existing Features](#impact-on-existing-features)
10. [Testing Strategy](#testing-strategy)
11. [References](#references)

---

## Current Architecture Analysis

### Backend (Go)
**File:** `/backend/main.go` (409 lines)

**Technology Stack:**
- Go 1.x with Chi router
- SQLite3 database (`familytree.db`)
- CORS middleware for cross-origin requests
- Single-file REST API

**Endpoints:**
```
GET    /api/people
POST   /api/people
GET    /api/people/:id
PUT    /api/people/:id
DELETE /api/people/:id

GET    /api/relationships
POST   /api/relationships
DELETE /api/relationships/:id
```

**Business Logic:**
- Relationship normalization (mother/father → parentOf with parent_role)
- Validation (prevent duplicate parents, enforce referential integrity)
- Relationship existence checking
- Database migrations (parent_role column addition)

**Database Schema:**
```sql
people (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  birth_date TEXT,
  death_date TEXT,
  gender TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)

relationships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  person1_id INTEGER NOT NULL,
  person2_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  parent_role TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (person1_id) REFERENCES people(id) ON DELETE CASCADE,
  FOREIGN KEY (person2_id) REFERENCES people(id) ON DELETE CASCADE
)
```

### Frontend (Svelte 4 + Vite)
**Technology Stack:**
- Svelte 4.2.8 with Vite 5.0.8
- D3.js 7.9.0 for visualizations
- Hash-based routing (manual implementation)
- Vitest for testing
- Reactive store architecture (6-phase migration completed)

**Key Components:**
- 26 Svelte components
- Comprehensive store architecture (familyStore, derivedStores, modalStore, notificationStore, panelStore)
- Action creators with optimistic updates (personActions, relationshipActions)
- Three visualization views (PedigreeView, TimelineView, RadialView)
- Responsive PersonModal with hybrid desktop/mobile layouts

**API Client:** `/frontend/src/lib/api.js` (66 lines)
- Simple fetch-based wrapper
- Hardcoded to `http://localhost:8080/api`
- No type safety or validation

### Current Development Workflow
1. Start Go backend: `cd backend && go run main.go` (port 8080)
2. Start Vite dev server: `cd frontend && npm run dev` (port 5173)
3. CORS configured to allow cross-origin requests
4. Two separate processes running during development
5. Two separate deployment artifacts

---

## Proposed Architecture

### SvelteKit Full-Stack Framework
**Version:** SvelteKit 2.x (latest stable in 2025)

**Architecture Pattern:**
```
/src
  /routes
    /api
      /people
        +server.js          (GET, POST for collection)
        /[id]
          +server.js        (GET, PUT, DELETE for single resource)
      /relationships
        +server.js          (GET, POST for collection)
        /[id]
          +server.js        (DELETE for single resource)
    +page.svelte            (Main app entry)
    +layout.svelte          (App-wide layout)
  /lib
    /components             (Existing Svelte components)
    /stores                 (Existing store architecture)
    /db
      schema.js             (Drizzle schema definitions)
      client.js             (Database connection)
      queries.js            (Reusable query functions)
    /server
      relationships.js      (Business logic for relationship normalization)
      validation.js         (Validation rules)
```

**Routing Strategy:**
- Hash-based routing (`router: { type: 'hash' }`) to match current behavior
- Static adapter for deployment (`adapter-static` with `fallback: 'index.html'`)
- Client-side routing for visualization views

**Key Configuration:**
```javascript
// svelte.config.js
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({ fallback: 'index.html' }),
    router: { type: 'hash' },
    alias: {
      $lib: './src/lib'
    }
  }
};
```

### Drizzle ORM Integration
**Version:** drizzle-orm 0.30.x (latest stable)
**SQLite Driver:** better-sqlite3 (synchronous, fast, Node.js native)

**Schema Definition:**
```typescript
// src/lib/db/schema.js
import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const people = sqliteTable('people', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  birthDate: text('birth_date'),
  deathDate: text('death_date'),
  gender: text('gender'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`)
});

export const relationships = sqliteTable('relationships', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  person1Id: integer('person1_id').notNull().references(() => people.id, { onDelete: 'cascade' }),
  person2Id: integer('person2_id').notNull().references(() => people.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  parentRole: text('parent_role'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`)
});
```

**Database Client:**
```javascript
// src/lib/db/client.js
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';

const sqlite = new Database('./familytree.db');
export const db = drizzle(sqlite, { schema });
```

**Migration Configuration:**
```javascript
// drizzle.config.js
export default {
  schema: './src/lib/db/schema.js',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: './familytree.db'
  }
};
```

### API Server Routes Example
```javascript
// src/routes/api/people/+server.js
import { json } from '@sveltejs/kit';
import { db } from '$lib/db/client.js';
import { people } from '$lib/db/schema.js';

export async function GET() {
  const allPeople = await db.select().from(people);
  return json(allPeople);
}

export async function POST({ request }) {
  const data = await request.json();
  const [newPerson] = await db.insert(people).values({
    firstName: data.firstName,
    lastName: data.lastName,
    birthDate: data.birthDate,
    deathDate: data.deathDate,
    gender: data.gender
  }).returning();

  return json(newPerson, { status: 201 });
}
```

---

## Technology Stack Comparison

| Aspect | Current (Go + Svelte) | Proposed (SvelteKit + Drizzle) |
|--------|----------------------|-------------------------------|
| **Backend Language** | Go | JavaScript/TypeScript |
| **Frontend Language** | JavaScript (Svelte) | JavaScript (Svelte) |
| **Database Access** | database/sql (manual queries) | Drizzle ORM (type-safe query builder) |
| **Type Safety** | Go structs (backend only) | End-to-end TypeScript (optional) |
| **API Layer** | REST endpoints + fetch client | Server routes (co-located with frontend) |
| **Routing** | Chi router (backend) + hash-based (frontend) | SvelteKit routing (hash mode) |
| **Dev Server** | 2 processes (Go + Vite) | 1 process (SvelteKit dev) |
| **Build Output** | 2 binaries (Go + Vite bundle) | 1 Node.js app or static bundle |
| **Database Migrations** | Manual SQL in code | Drizzle Kit (CLI-based migrations) |
| **CORS Handling** | Manual middleware | Not needed (same-origin) |
| **Testing** | Go testing + Vitest | Vitest (unified) |
| **Deployment** | 2 services | 1 service (Node.js or static) |

---

## Benefits Analysis

### 1. Developer Experience

**Single Language Stack**
- No context switching between Go and JavaScript
- JavaScript/TypeScript developers can work on entire stack
- Unified debugging experience
- Single package manager (npm)

**Type Safety**
- Drizzle provides inferred TypeScript types from schema
- End-to-end type safety from DB → API → UI
- Example:
  ```typescript
  // Drizzle automatically infers this type from schema
  const person: {
    id: number;
    firstName: string;
    lastName: string;
    birthDate: string | null;
    deathDate: string | null;
    gender: string | null;
    createdAt: string;
  } = await db.select().from(people).where(eq(people.id, 1));
  ```

**Modern Tooling**
- Drizzle Kit for migrations (`npx drizzle-kit generate`, `npx drizzle-kit push`)
- Drizzle Studio for database browsing (`npx drizzle-kit studio`)
- SvelteKit CLI for scaffolding (`npx sv add drizzle`)
- Hot module replacement for both frontend and backend

### 2. Simplified Architecture

**Eliminate API Client Layer**
- Remove `/frontend/src/lib/api.js` (66 lines)
- Server functions are co-located with routes
- No need for CORS configuration
- Direct import of server functions in load functions (if using SSR mode)

**Single Process in Development**
```bash
# Before: 2 terminal windows
cd backend && go run main.go
cd frontend && npm run dev

# After: 1 terminal window
npm run dev
```

**Unified Deployment**
```bash
# Before: Deploy Go binary + static assets separately
go build -o familytree-server backend/main.go
npm run build  # frontend

# After: Single build command
npm run build  # Everything bundled together
```

### 3. Database Schema Management

**Current (Go):**
```go
// Manual migrations in code
func (app *App) migrateToParentRoles() error {
    _, err := app.db.Exec(`ALTER TABLE relationships ADD COLUMN parent_role TEXT`)
    if err != nil && !strings.Contains(err.Error(), "duplicate column") {
        return err
    }
    return nil
}
```

**Proposed (Drizzle):**
```bash
# Generate migration from schema changes
npx drizzle-kit generate

# Apply migrations
npx drizzle-kit migrate

# Or push directly in development
npx drizzle-kit push
```

**Benefits:**
- Declarative schema definition (single source of truth)
- Automatic migration generation
- Version-controlled migration files
- Rollback support
- Schema introspection and validation

### 4. Query Builder vs. Raw SQL

**Current (Go):**
```go
rows, err := app.db.Query(`
    SELECT id, first_name, last_name, birth_date, death_date, gender, created_at
    FROM people
`)
// Manual scanning, error handling, type conversion
```

**Proposed (Drizzle):**
```javascript
// Type-safe, autocomplete-friendly
const allPeople = await db.select().from(people);

// With relations
const peopleWithRelationships = await db.query.people.findMany({
  with: {
    relationships: true
  }
});

// Complex queries
const parents = await db.select()
  .from(relationships)
  .innerJoin(people, eq(relationships.person1Id, people.id))
  .where(and(
    eq(relationships.person2Id, childId),
    eq(relationships.type, 'parentOf')
  ));
```

**Benefits:**
- No SQL injection vulnerabilities
- Type inference and autocomplete
- Composable queries
- Easier testing (can mock db object)

### 5. Code Reduction

**Estimated Line Count Changes:**
- Remove: `/backend/main.go` (409 lines)
- Remove: `/frontend/src/lib/api.js` (66 lines)
- Add: SvelteKit server routes (~200 lines, distributed across files)
- Add: Drizzle schema and client (~100 lines)
- Add: SvelteKit config and setup (~50 lines)

**Net Result:** ~125 lines less code, more maintainable structure

### 6. Testing Improvements

**Current:**
- Go tests for backend logic
- Vitest for frontend components
- Manual integration testing required

**Proposed:**
- Unified Vitest for all testing
- Easy to mock database with in-memory SQLite
- Test server routes with SvelteKit's `@sveltejs/kit` test utilities
- Integration tests can use same test framework

Example:
```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '$lib/db/schema.js';

describe('Person queries', () => {
  let db;

  beforeEach(() => {
    const sqlite = new Database(':memory:');
    db = drizzle(sqlite, { schema });
    // Run migrations, seed data
  });

  it('should create a person', async () => {
    const [person] = await db.insert(schema.people).values({
      firstName: 'Jane',
      lastName: 'Doe'
    }).returning();

    expect(person.firstName).toBe('Jane');
  });
});
```

---

## Migration Strategy

### Prerequisites
1. Backup current database: `cp backend/familytree.db backend/familytree.db.backup`
2. Document all current API endpoints and their behavior
3. Create comprehensive test suite for existing functionality
4. Set up Git feature branch for migration work

### Phase 1: SvelteKit Setup (Estimated: 4 hours)

**1.1 Install SvelteKit (1 hour)**
```bash
cd frontend
npx sv create --template minimal sveltekit-temp
# Copy relevant config files
cp sveltekit-temp/svelte.config.js .
cp sveltekit-temp/vite.config.js .
# Update package.json dependencies
npm install @sveltejs/kit @sveltejs/adapter-static
npm install -D vite svelte
```

**1.2 Restructure Frontend (1.5 hours)**
```bash
# Create new directory structure
mkdir -p src/routes
mkdir -p src/routes/api
mv src/App.svelte src/routes/+page.svelte
# Move lib components (already in src/lib)
# Update imports to use $lib alias
```

**1.3 Configure Hash-Based Routing (0.5 hour)**
```javascript
// svelte.config.js
export default {
  kit: {
    adapter: adapter({ fallback: 'index.html' }),
    router: { type: 'hash' }  // Preserve hash-based routing
  }
};
```

**1.4 Test Frontend Rendering (1 hour)**
- Verify all existing components render correctly
- Test hash-based navigation between views
- Ensure stores continue to work
- Fix any import path issues

**Acceptance Criteria:**
- Frontend runs on SvelteKit dev server
- All views accessible via hash routing
- Stores function correctly
- No console errors

### Phase 2: Drizzle ORM Setup (Estimated: 3 hours)

**2.1 Install Drizzle Dependencies (0.5 hour)**
```bash
npm install drizzle-orm better-sqlite3
npm install -D drizzle-kit @types/better-sqlite3
```

**2.2 Define Schema (1 hour)**
- Create `/src/lib/db/schema.js` with table definitions
- Match existing SQLite schema exactly
- Add JSDoc comments for documentation

**2.3 Configure Drizzle Kit (0.5 hour)**
- Create `drizzle.config.js` in project root
- Configure to use existing `familytree.db`
- Test connection with `npx drizzle-kit studio`

**2.4 Create Database Client (0.5 hour)**
- Create `/src/lib/db/client.js` with database connection
- Add error handling and connection pooling (if needed)
- Export singleton instance

**2.5 Test Database Access (0.5 hour)**
- Write simple SELECT query to verify connection
- Verify schema matches existing database
- Test CRUD operations in isolation

**Acceptance Criteria:**
- Drizzle connects to existing SQLite database
- Schema definitions match current database structure
- Can read existing data without errors
- Drizzle Studio can browse the database

### Phase 3: API Route Migration (Estimated: 6 hours)

**3.1 Create Server Route Structure (0.5 hour)**
```bash
mkdir -p src/routes/api/people/[id]
mkdir -p src/routes/api/relationships/[id]
touch src/routes/api/people/+server.js
touch src/routes/api/people/[id]/+server.js
touch src/routes/api/relationships/+server.js
touch src/routes/api/relationships/[id]/+server.js
```

**3.2 Migrate Business Logic (2 hours)**
- Extract relationship normalization logic to `/src/lib/server/relationships.js`
- Extract validation rules to `/src/lib/server/validation.js`
- Port Go validation logic to JavaScript
- Preserve exact business rules (parent role validation, duplicate checking)

**3.3 Implement People Endpoints (1.5 hours)**
- `GET /api/people` - List all people
- `POST /api/people` - Create person
- `GET /api/people/[id]` - Get single person
- `PUT /api/people/[id]` - Update person
- `DELETE /api/people/[id]` - Delete person
- Add error handling and validation

**3.4 Implement Relationship Endpoints (1.5 hours)**
- `GET /api/relationships` - List all relationships
- `POST /api/relationships` - Create relationship (with normalization)
- `DELETE /api/relationships/[id]` - Delete relationship
- Port parent role validation
- Port duplicate relationship checking

**3.5 Test API Routes (0.5 hour)**
- Use Postman or curl to test each endpoint
- Verify response formats match current API
- Test error cases
- Validate business logic enforcement

**Acceptance Criteria:**
- All API endpoints functional
- Business logic preserved exactly
- Error handling equivalent to Go backend
- Response formats identical to current API
- Parent role validation working
- Relationship normalization working

### Phase 4: Frontend Integration (Estimated: 2 hours)

**4.1 Update API Base URL (0.5 hour)**
```javascript
// src/lib/api.js
const API_BASE = '/api'  // Changed from http://localhost:8080/api
// Rest of the file remains the same
```

**4.2 Test Frontend with New Backend (1 hour)**
- Start SvelteKit dev server
- Test all CRUD operations through UI
- Verify PersonModal works
- Test all three visualization views
- Test Quick Add workflows
- Verify optimistic updates still work

**4.3 Fix Integration Issues (0.5 hour)**
- Debug any API contract mismatches
- Fix any CORS or fetch issues
- Adjust error handling if needed

**Acceptance Criteria:**
- All existing features work identically
- No console errors
- CRUD operations functional
- Optimistic updates working
- Notifications displaying correctly

### Phase 5: Testing & Validation (Estimated: 3 hours)

**5.1 Unit Tests for Server Logic (1 hour)**
- Write tests for relationship normalization
- Test validation rules
- Test database queries
- Use in-memory SQLite for testing

**5.2 Integration Tests (1 hour)**
- Test API routes end-to-end
- Test complete user workflows
- Verify data integrity

**5.3 Regression Testing (1 hour)**
- Test all existing features systematically
- Compare behavior with Go backend
- Document any differences
- Fix any bugs found

**Acceptance Criteria:**
- All tests passing
- Code coverage maintained or improved
- No regressions from current functionality
- Performance comparable or better

### Phase 6: Cleanup & Documentation (Estimated: 2 hours)

**6.1 Remove Old Backend (0.5 hour)**
```bash
# Archive old backend
mkdir -p archive
mv backend archive/backend-go-$(date +%Y%m%d)
# Remove Go dependencies
rm go.mod go.sum
```

**6.2 Update Documentation (1 hour)**
- Update CLAUDE.md with new architecture
- Document SvelteKit setup and commands
- Update deployment instructions
- Add Drizzle schema documentation
- Update README.md

**6.3 Update Scripts and Workflows (0.5 hour)**
- Update package.json scripts
- Remove backend start commands
- Update GitHub Actions (if any)
- Update .gitignore

**Acceptance Criteria:**
- Documentation reflects new architecture
- Old backend code archived
- Scripts updated
- Repository clean

---

## Technical Design Decisions

### 1. Hash-Based Routing vs. Server-Side Rendering

**Decision:** Continue using hash-based routing (no SSR)

**Rationale:**
- Preserves current user experience (URLs don't change)
- Simpler deployment (static files, no Node.js server required)
- Current architecture is SPA-focused
- D3.js visualizations are client-side rendered
- No SEO requirements for family tree tool

**Trade-offs:**
- Lose SSR benefits (faster initial load, better SEO)
- Gain simpler deployment and hosting options

**Future Option:**
- Can migrate to file-based routing later if needed
- Data loading would move to `+page.js` load functions
- Progressive enhancement would improve initial render

### 2. Database Driver: better-sqlite3 vs. libsql

**Decision:** Use better-sqlite3

**Rationale:**
- Synchronous API is simpler for development
- Fast and battle-tested
- No external dependencies
- Works well with existing SQLite database
- Good Drizzle support

**Alternative:** libsql/Turso (for production scaling)
- Could migrate later if need distributed SQLite
- Turso provides SQLite at edge locations
- Not needed for single-user or small family use case

### 3. TypeScript vs. JavaScript

**Decision:** Start with JavaScript, optional TypeScript later

**Rationale:**
- Current codebase is JavaScript
- Faster migration (no type annotations needed)
- Drizzle provides type inference even in JS (via JSDoc)
- Can add TypeScript incrementally later

**Migration Path:**
1. JavaScript with JSDoc comments
2. Rename .js → .ts gradually
3. Add type annotations where valuable
4. Strict mode last

### 4. API Client Layer: Keep vs. Remove

**Decision:** Keep api.js initially, optionally remove later

**Rationale:**
- Preserves existing store actions code
- Minimizes changes during migration
- Acts as abstraction layer during parallel operation
- Can be removed after migration is stable

**Future Optimization:**
- Replace api.js with direct server function imports
- Use SvelteKit's load functions for data fetching
- Reduce one layer of indirection

### 5. Database Location

**Decision:** Keep database in project root (`./familytree.db`)

**Rationale:**
- Preserves existing data location
- Simple for development
- Works with git (can be ignored)
- Easy backups

**Production Consideration:**
- Move to `/data` directory for containerized deployments
- Use environment variable for database path
- Support multiple databases (per-user)

---

## Risk Assessment

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Data loss during migration** | Low | High | Backup database before starting; test with copy first |
| **API contract mismatch** | Medium | Medium | Comprehensive integration tests; side-by-side comparison |
| **Performance regression** | Low | Medium | Benchmark before/after; Drizzle is typically faster than manual queries |
| **Breaking store architecture** | Low | High | No changes to stores; only api.js changes |
| **Hash routing incompatibility** | Low | Low | SvelteKit officially supports hash routing |
| **Drizzle learning curve** | Medium | Low | Good documentation; similar to other query builders |
| **Missing Go business logic** | Medium | High | Careful port of validation rules; comprehensive testing |

### Process Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Incomplete migration** | Low | High | Phased approach; each phase independently testable |
| **Increased complexity** | Low | Medium | SvelteKit is well-documented; reduces overall complexity |
| **Team unfamiliarity** | Medium | Medium | SvelteKit is similar to Vite; Drizzle docs excellent |
| **Deployment changes** | Medium | Low | Document new deployment process; test before production |

### Business Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Feature parity loss** | Low | High | Feature checklist; manual testing |
| **User disruption** | Low | Medium | No UI changes; backend swap is transparent |
| **Extended downtime** | Low | Low | Can run both backends during transition |

---

## Phased Migration Approach

### Option A: Big Bang Migration (Fast, Higher Risk)
1. Complete all phases in feature branch
2. Extensive testing in branch
3. Merge to main once all tests pass
4. Deploy new version

**Timeline:** 2-3 days of focused work
**Risk:** Higher (all-or-nothing)
**Benefit:** Clean cutover

### Option B: Parallel Operation (Slower, Lower Risk) - RECOMMENDED
1. Set up SvelteKit alongside existing Vite app
2. Implement Drizzle and server routes
3. Run both backends simultaneously (Go on :8080, SvelteKit on :5173)
4. Gradual migration of API calls to SvelteKit routes
5. Feature flag to switch between backends
6. Once confident, remove Go backend

**Timeline:** 1-2 weeks with parallel operation
**Risk:** Lower (can rollback easily)
**Benefit:** Safer, allows thorough testing

**Implementation:**
```javascript
// src/lib/api.js
const USE_SVELTEKIT = import.meta.env.VITE_USE_SVELTEKIT === 'true';
const API_BASE = USE_SVELTEKIT ? '/api' : 'http://localhost:8080/api';
```

### Option C: Incremental Endpoint Migration (Slowest, Lowest Risk)
1. Set up SvelteKit structure
2. Migrate one endpoint at a time
3. A/B test each endpoint
4. Keep Go backend running until all endpoints migrated

**Timeline:** 2-3 weeks
**Risk:** Lowest (individual endpoints can be rolled back)
**Benefit:** Maximum safety

---

## Impact on Existing Features

### No Impact (Preserved As-Is)
- All Svelte components (26 files)
- Store architecture (familyStore, derivedStores, modalStore, notificationStore, panelStore)
- Action creators (personActions, relationshipActions)
- Optimistic updates
- D3.js visualizations
- PersonModal hybrid layout
- Quick Add workflows
- Notification toasts
- Hash-based routing behavior

### Minor Changes Required
- `api.js` - Change API_BASE URL from `http://localhost:8080/api` to `/api`
- `App.svelte` - No changes (or minimal path updates)
- `package.json` - Add SvelteKit dependencies

### Major Changes (New Code)
- SvelteKit configuration
- Drizzle schema definitions
- Server route implementations
- Business logic extraction (relationship normalization, validation)

### Testing Impact
- Existing component tests: No changes
- Store tests: No changes
- New tests needed: Server route tests, Drizzle query tests

---

## Testing Strategy

### Phase-Specific Testing

**Phase 1 Testing (SvelteKit Setup):**
- Manual: Navigate to all three views (#/pedigree, #/timeline, #/radial)
- Manual: Test ViewSwitcher navigation
- Automated: Run existing Vitest component tests
- Verify: No console errors

**Phase 2 Testing (Drizzle Setup):**
- Manual: Use Drizzle Studio to browse database
- Automated: Simple SELECT query tests
- Verify: Existing data loads correctly

**Phase 3 Testing (API Routes):**
- Automated: Unit tests for each endpoint
- Automated: Business logic tests (validation, normalization)
- Manual: Postman/curl testing
- Integration: End-to-end API tests

**Phase 4 Testing (Frontend Integration):**
- Manual: Complete user workflow testing
- Automated: Re-run all existing component tests
- Integration: CRUD operations through UI
- Regression: Compare behavior with Go backend

**Phase 5 Testing (Comprehensive):**
- Automated: Full test suite (unit + integration)
- Manual: Exploratory testing
- Performance: Benchmark API response times
- Load: Test with large datasets

### Test Checklist

**CRUD Operations:**
- [ ] Create person (via PersonModal)
- [ ] Update person (edit existing)
- [ ] Delete person (with relationships)
- [ ] Create relationship (mother)
- [ ] Create relationship (father)
- [ ] Create relationship (spouse)
- [ ] Delete relationship
- [ ] Prevent duplicate parent of same role
- [ ] Cascade delete relationships when person deleted

**UI Workflows:**
- [ ] PedigreeView renders correctly
- [ ] TimelineView renders correctly
- [ ] RadialView renders correctly
- [ ] PersonModal opens/closes
- [ ] Quick Add Child workflow
- [ ] Quick Add Parent workflow
- [ ] Quick Add Spouse workflow
- [ ] Link Existing relationships
- [ ] Collapsible sections (mobile)
- [ ] Two-column layout (desktop)

**Data Integrity:**
- [ ] Relationship normalization (mother/father → parentOf)
- [ ] Parent role validation
- [ ] Sibling computation (frontend)
- [ ] Foreign key constraints enforced
- [ ] Timestamps auto-generated

**Performance:**
- [ ] API response times < 100ms for simple queries
- [ ] D3 rendering smooth (60fps)
- [ ] Optimistic updates < 50ms perceived latency
- [ ] Large dataset handling (100+ people)

---

## References

### SvelteKit Resources
- [SvelteKit Routing Documentation](https://svelte.dev/docs/kit/routing)
- [SvelteKit API Routes Tutorial](https://svelte.dev/tutorial/kit/get-handlers)
- [Building Portable SvelteKit Apps: Hash Routing Guide](https://sveltetalk.com/posts/sveltekit-hash-routing)
- [SvelteKit: The Complete Developer's Guide (2025)](https://criztec.com/sveltekit-complete-developers-guide-2025)
- [SvelteKit API Endpoints and Loading Data](https://joyofcode.xyz/sveltekit-loading-data)

### Drizzle ORM Resources
- [Drizzle ORM SQLite Documentation](https://orm.drizzle.team/docs/get-started/sqlite-new)
- [SvelteKit with SQLite and Drizzle](https://fullstacksveltekit.com/blog/sveltekit-sqlite-drizzle)
- [Drizzle CLI Documentation](https://svelte.dev/docs/cli/drizzle)
- [How to Use Drizzle ORM With SvelteKit](https://www.svelterust.com/blog/implementing-drizzle-orm-with-sveltekit-for-efficient-database-management)
- [Building a CRUD application with SvelteKit and SQLite](https://omrecipes.dev/blog/sveltekit-crud-sqlite)

### Migration Guides
- [Migrating to SvelteKit v2](https://kit.svelte.dev/docs/migrating-to-sveltekit-2)
- [Converting a Vite Svelte SPA to SvelteKit](https://github.com/sveltejs/kit/discussions/4595)

---

## Conclusion

Migrating to SvelteKit + Drizzle ORM offers significant benefits in developer experience, code maintainability, and operational simplicity while preserving all existing functionality. The phased migration approach (Option B: Parallel Operation) provides a safe path forward with minimal risk.

**Recommendation:** Proceed with migration using the phased approach outlined above.

**Next Steps:**
1. Review and approve this exploration document
2. Create user stories in GitHub Projects Prioritized Backlog
3. Groom stories with product owner
4. Begin Phase 1: SvelteKit Setup

**Estimated Total Effort:** 20 hours (2.5 days)

**Expected Benefits:**
- Reduced complexity (single language, single framework)
- Improved developer experience (better tooling, type safety)
- Faster development (unified stack, less context switching)
- Easier deployment (single artifact)
- Better testing (unified test framework)
- Modern, maintainable codebase
