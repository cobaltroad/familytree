# Testing Guidelines

## Test File Naming Convention

### CRITICAL RULE: NEVER Use `+*.test.js` Pattern

**The `+` prefix is STRICTLY RESERVED by SvelteKit and must NEVER be used for test files.**

❌ **PROHIBITED - These patterns are FORBIDDEN**:
```
+page.test.js
+server.test.js
+gedcomParser.test.js
+api.test.js
+anything.test.js
```

✅ **CORRECT - Use these patterns instead**:
```
page.test.js
server.test.js
gedcomParser.test.js
api.test.js
anything.test.js
```

### Why This Rule Exists

SvelteKit reserves the `+` prefix for special route files (`+page.svelte`, `+server.js`, `+layout.svelte`, etc.). Using `+*.test.js` anywhere in your codebase will cause this error:

```
Files prefixed with + are reserved (saw src/routes/+page.auth.test.js)
```

This error **breaks the entire application** - the dev server will not start, even if the test file is outside the routes directory.

### Universal Application

This rule applies to **ALL test files** in the codebase:
- ✅ `src/lib/tests/*.test.js` - No `+` prefix
- ✅ `src/routes/**/*.test.js` - No `+` prefix
- ✅ `src/lib/server/__tests__/*.test.js` - No `+` prefix
- ✅ Any other location - No `+` prefix

**There are NO exceptions to this rule.**

## Test File Placement

### CRITICAL: Avoid SvelteKit Reserved File Names in Routes Directory

**Files with `+` prefix in the `src/routes/` directory are RESERVED for SvelteKit route files.**

### Correct Test File Locations

#### Option 1: Place tests in `src/lib/tests/` (Recommended)
```
src/lib/tests/
  ├── page.auth.test.js          ✅ GOOD
  ├── component.test.js          ✅ GOOD
  └── integration.test.js        ✅ GOOD
```

#### Option 2: Place tests in `src/routes/` without `+` prefix
```
src/routes/
  ├── +page.svelte               ✅ SvelteKit route file
  ├── page.test.js               ✅ GOOD - test without + prefix
  └── api/
      ├── +server.js             ✅ SvelteKit route file
      └── server.test.js         ✅ GOOD - test without + prefix
```

#### NEVER Do This
```
src/routes/
  ├── +page.auth.test.js         ❌ BAD - breaks the app!
  └── +component.test.js         ❌ BAD - breaks the app!
```

### SvelteKit Reserved File Patterns

The following file patterns in `src/routes/` are reserved for SvelteKit:
- `+page.svelte` - Page component
- `+page.js` / `+page.ts` - Page load function
- `+page.server.js` / `+page.server.ts` - Server-side page load
- `+layout.svelte` - Layout component
- `+layout.js` / `+layout.ts` - Layout load function
- `+layout.server.js` / `+layout.server.ts` - Server-side layout load
- `+server.js` / `+server.ts` - API endpoint
- `+error.svelte` - Error page

**Never use `+` prefix for ANY other files in the routes directory.**

## Test Organization

### Recommended Structure

```
src/
├── lib/
│   ├── tests/              # Component and unit tests
│   │   ├── page.auth.test.js
│   │   ├── modal.test.js
│   │   └── stores.test.js
│   ├── components/         # Svelte components
│   └── server/             # Server-side modules
│       └── __tests__/      # Server module tests
│
├── routes/
│   ├── +page.svelte        # Route files (+ prefix OK)
│   ├── api/
│   │   ├── people/
│   │   │   ├── +server.js  # Route files (+ prefix OK)
│   │   │   └── server.test.js  # Tests (NO + prefix)
│   │   └── relationships/
│   │       ├── +server.js
│   │       └── server.test.js
│   └── signin/
│       ├── +page.svelte
│       └── signin.test.js  # Tests (NO + prefix)
│
└── stores/
    ├── familyStore.js
    └── familyStore.test.js
```

## Quick Fix for Reserved File Name Error

If you encounter the error:
```
Files prefixed with + are reserved (saw src/routes/+something.test.js)
```

**Fix it immediately:**

```bash
# Move the file to src/lib/tests/
mkdir -p src/lib/tests
mv src/routes/+page.auth.test.js src/lib/tests/page.auth.test.js

# Update import paths in the moved test file
# Change relative imports to reflect the new location
```

## Test Naming Conventions

Use descriptive names that indicate what is being tested:

```
✅ CORRECT:
- page.auth.test.js           (descriptive, no + prefix)
- personModal.test.js         (descriptive, no + prefix)
- server.test.js              (descriptive, no + prefix)
- familyStore.test.js         (descriptive, no + prefix)
- gedcomParser.test.js        (descriptive, no + prefix)

❌ PROHIBITED:
- +page.test.js               (FORBIDDEN - breaks SvelteKit!)
- +server.test.js             (FORBIDDEN - breaks SvelteKit!)
- +anything.test.js           (FORBIDDEN - breaks SvelteKit!)

❌ AVOID:
- test.js                     (not descriptive enough)
- spec.js                     (use .test.js consistently)
```

**Remember**: The `+` prefix is absolutely forbidden for test files. See "CRITICAL RULE" section above for details.

## Running Tests

```bash
npm test              # Run all tests
npm test -- --watch   # Watch mode
npm test -- path/to/specific.test.js  # Run specific test
npm run test:ui       # Open Vitest UI
```

## API Route Testing

### CRITICAL: Mock Routes Must Match Actual Routes

**When testing API endpoints or mocking fetch calls, ALWAYS verify that the route paths match the actual SvelteKit route structure.**

#### Common Pitfalls

❌ **BAD - Route mismatch**:
```javascript
// Test file
mockRequest = new Request('http://localhost/api/gedcom/parsing/upload-123')

// Actual route file
// src/routes/api/gedcom/parse/[uploadId]/+server.js  ← Different path!
```

✅ **GOOD - Routes match**:
```javascript
// Test file
mockRequest = new Request('http://localhost/api/gedcom/parse/upload-123')

// Actual route file
// src/routes/api/gedcom/parse/[uploadId]/+server.js  ← Matches!
```

#### Verification Process

Before writing or updating tests, follow these steps:

1. **Identify the actual route file**:
   ```bash
   find src/routes/api -name '+server.js' | grep gedcom
   # Example output: src/routes/api/gedcom/parse/[uploadId]/+server.js
   ```

2. **Extract the route path**:
   - File: `src/routes/api/gedcom/parse/[uploadId]/+server.js`
   - Route: `/api/gedcom/parse/:uploadId` or `/api/gedcom/parse/[uploadId]`
   - **NOT**: `/api/gedcom/parsing/:uploadId` ❌

3. **Use the exact route in tests**:
   ```javascript
   // Server-side route tests
   mockRequest = new Request('http://localhost/api/gedcom/parse/upload-123')
   mockEvent = {
     request: mockRequest,
     params: { uploadId: 'upload-123' }
   }

   // Client-side API mocks
   fetchMock.mockResolvedValue({...})
   await api.parseGedcom('upload-123')
   expect(fetchMock).toHaveBeenCalledWith('/api/gedcom/parse/upload-123', {...})
   ```

4. **Verify the API client matches**:
   - Check `src/lib/api.js` to ensure the client method uses the correct route
   - If there's a mismatch, fix the API client first, then update tests

#### Route Mapping Reference

**Always use this mapping from file path to route URL:**

| File Path | Route URL |
|-----------|-----------|
| `src/routes/api/people/+server.js` | `/api/people` |
| `src/routes/api/people/[id]/+server.js` | `/api/people/:id` or `/api/people/[id]` |
| `src/routes/api/gedcom/upload/+server.js` | `/api/gedcom/upload` |
| `src/routes/api/gedcom/parse/[uploadId]/+server.js` | `/api/gedcom/parse/:uploadId` |
| `src/routes/api/gedcom/parse/[uploadId]/status/+server.js` | `/api/gedcom/parse/:uploadId/status` |
| `src/routes/api/gedcom/preview/[uploadId]/duplicates/+server.js` | `/api/gedcom/preview/:uploadId/duplicates` |

**Note**: SvelteKit uses `[paramName]` in file paths, which becomes `:paramName` in route URLs.

#### Testing API Routes

When testing SvelteKit API route handlers (`+server.js` files):

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from './+server.js'  // Import actual handler

describe('GET /api/people', () => {  // ← Use actual route path in description
  let mockEvent

  beforeEach(() => {
    mockEvent = {
      request: new Request('http://localhost/api/people'),  // ← Match actual route
      locals: {},
      params: {}
    }
  })

  it('should return all people', async () => {
    const response = await GET(mockEvent)
    expect(response.status).toBe(200)
  })
})
```

#### Testing API Client Methods

When testing the API client (`src/lib/api.js`):

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { api } from './api.js'

describe('API Client', () => {
  let fetchMock

  beforeEach(() => {
    fetchMock = vi.fn()
    global.fetch = fetchMock
  })

  it('should call correct route for parseGedcom', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    })

    await api.parseGedcom('upload-123')

    // Verify the route matches the actual file structure
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/gedcom/parse/upload-123',  // ← Must match src/routes/api/gedcom/parse/[uploadId]/+server.js
      expect.any(Object)
    )
  })
})
```

### Pre-Test Checklist

Before submitting tests, verify:

- [ ] Route paths in tests match the actual `src/routes/api/**` file structure
- [ ] API client methods in `src/lib/api.js` use the correct routes
- [ ] Mock requests use the same route as the actual handler
- [ ] Test descriptions document the correct route path
- [ ] Parameter names match (`[uploadId]` in files, `:uploadId` or actual value in tests)

## Test Infrastructure and Helpers (v2.2.1)

### Database Setup with setupTestDatabase()

The `setupTestDatabase()` helper in `src/lib/server/testHelpers.js` provides consistent database initialization for integration tests. This helper eliminates schema duplication by applying production migrations directly to test databases.

#### How It Works

**Single Source of Truth**: Production migrations from `drizzle/` directory are embedded in the helper and applied to in-memory test databases. This ensures test schema exactly matches production schema, preventing schema mismatch errors.

**Example Usage**:
```javascript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { setupTestDatabase } from '$lib/server/testHelpers.js'
import { GET } from './+server.js'

describe('GET /api/people', () => {
  let sqlite, db, userId

  beforeEach(async () => {
    // Create in-memory database
    sqlite = new Database(':memory:')
    db = drizzle(sqlite)

    // Apply migrations and create test user
    userId = await setupTestDatabase(sqlite, db)
  })

  afterEach(() => {
    sqlite.close()
  })

  it('should return people for authenticated user', async () => {
    // Test implementation...
  })
})
```

#### Key Benefits

1. **No Schema Duplication**: Migrations are applied from embedded SQL, not duplicated CREATE statements
2. **Foreign Key Support**: Automatically enables `PRAGMA foreign_keys = ON`
3. **Test User Creation**: Returns userId for use in authentication mocks
4. **Isolation**: Each test gets a fresh in-memory database

### Authentication Patterns for API Routes

Use `createMockAuthenticatedEvent()` from `src/lib/server/testHelpers.js` to simulate authenticated requests in API route tests.

#### createMockAuthenticatedEvent(db, session, additionalProps)

Creates a mock SvelteKit event object with authentication for testing server routes.

**Parameters**:
- `db`: Drizzle database instance (required)
- `session`: Mock session object (optional, uses default if not provided)
- `additionalProps`: Additional event properties like `request`, `params`, `url` (optional)

**Example**:
```javascript
import { createMockAuthenticatedEvent, createMockSession } from '$lib/server/testHelpers.js'
import { GET } from './+server.js'

it('should return user-specific data', async () => {
  const session = createMockSession(1, 'user@example.com', 'Test User')
  const mockEvent = createMockAuthenticatedEvent(db, session, {
    request: new Request('http://localhost/api/people'),
    params: {}
  })

  const response = await GET(mockEvent)
  expect(response.status).toBe(200)
})
```

#### createMockSession(userId, userEmail, userName)

Creates a mock authentication session object.

**Parameters**:
- `userId`: User ID (default: 1)
- `userEmail`: User email (default: 'test@example.com')
- `userName`: User name (default: 'Test User')

**Example**:
```javascript
const session = createMockSession(42, 'admin@example.com', 'Admin User')
// Returns: { user: { id: 42, email: 'admin@example.com', name: 'Admin User' } }
```

### Foreign Key Handling in Tests

SQLite requires explicit enabling of foreign key constraints. The `setupTestDatabase()` helper handles this automatically, but if you're creating custom test databases:

```javascript
beforeEach(() => {
  sqlite = new Database(':memory:')
  sqlite.exec('PRAGMA foreign_keys = ON')  // CRITICAL: Enable foreign keys
  db = drizzle(sqlite)
})
```

**Why This Matters**:
- Without `PRAGMA foreign_keys = ON`, foreign key constraints are silently ignored
- Tests may pass even with invalid data relationships
- Production database enforces constraints, causing runtime failures

### Common Test Failure Patterns and Solutions

Based on v2.2.1 test infrastructure improvements, here are common patterns and their solutions:

#### Pattern 1: Schema Mismatch Errors

**Symptom**: Test fails with "no such column" or "table not found"

**Cause**: Test database schema doesn't match production schema

**Solution**: Use `setupTestDatabase()` instead of manually creating tables
```javascript
// BAD: Manual table creation
beforeEach(() => {
  sqlite.exec(`CREATE TABLE people (id INTEGER PRIMARY KEY, name TEXT)`)
})

// GOOD: Use helper
beforeEach(async () => {
  userId = await setupTestDatabase(sqlite, db)
})
```

#### Pattern 2: Authentication Not Working

**Symptom**: Test fails with 401 Unauthorized

**Cause**: Mock event missing proper authentication structure

**Solution**: Use `createMockAuthenticatedEvent()`
```javascript
// BAD: Incomplete mock event
const mockEvent = { locals: { db } }

// GOOD: Complete authenticated event
const mockEvent = createMockAuthenticatedEvent(db)
```

#### Pattern 3: Foreign Key Constraint Violations

**Symptom**: Test fails with "FOREIGN KEY constraint failed"

**Cause**: Foreign keys not enabled or test data created in wrong order

**Solution**: Enable foreign keys and insert parent records first
```javascript
beforeEach(async () => {
  sqlite = new Database(':memory:')
  sqlite.exec('PRAGMA foreign_keys = ON')  // Enable constraints
  db = drizzle(sqlite)
  userId = await setupTestDatabase(sqlite, db)

  // Insert parent record before child
  await db.insert(people).values({ userId, firstName: 'John', lastName: 'Doe' })
  // Now can insert relationships referencing the person
})
```

#### Pattern 4: Svelte Store Mock Subscriptions

**Symptom**: Component tests fail with "store is not iterable" or subscription errors

**Cause**: Store mocks not implementing proper Svelte store contract

**Solution**: Use proper store mock with subscribe method
```javascript
import { vi } from 'vitest'

const mockStore = {
  subscribe: vi.fn((callback) => {
    callback(mockValue)  // Call immediately with value
    return () => {}      // Return unsubscribe function
  })
}
```

### Best Practices Summary

1. **Always use `setupTestDatabase()`** for API route integration tests
2. **Always use `createMockAuthenticatedEvent()`** for authenticated route tests
3. **Enable foreign keys** with `PRAGMA foreign_keys = ON` if not using helper
4. **Clean up after tests** with `afterEach(() => sqlite.close())`
5. **Use in-memory databases** (`:memory:`) for fast, isolated tests
6. **Apply migrations, don't duplicate schema** to maintain single source of truth
7. **Mock stores properly** with subscribe/unsubscribe pattern for component tests

## Additional Resources

- [SvelteKit Routing Documentation](https://kit.svelte.dev/docs/routing)
- [Vitest Documentation](https://vitest.dev/)
- See `CLAUDE.md` for full architecture details
- See `LESSONS_LEARNED.md` for v2.2.1 test infrastructure insights
