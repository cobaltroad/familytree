# Coding Guidelines

This document provides guidelines for developing new features in the Family Tree application.

## Table of Contents

- [View Component Development](#view-component-development)
- [API Route Development](#api-route-development)
- [Component Development](#component-development)
- [Code Style and Best Practices](#code-style-and-best-practices)

## View Component Development

### CRITICAL: New Views Must Be Properly Routed

**When creating a new view component, you MUST update the routing configuration in `src/App.svelte` to make the view accessible.**

#### Step-by-Step Process for Adding a New View

##### 1. Create the View Component

Create your view component in `src/lib/` following the naming convention `<ViewName>View.svelte`:

```svelte
<!-- src/lib/MyNewView.svelte -->
<script>
  import { people, relationships } from '../stores/familyStore.js'

  // Your view logic here
</script>

<div class="my-new-view">
  <h2>My New View</h2>
  <!-- Your view template here -->
</div>

<style>
  .my-new-view {
    /* Your styles here */
  }
</style>
```

**View naming conventions:**
- ✅ `TimelineView.svelte`
- ✅ `PedigreeView.svelte`
- ✅ `NetworkView.svelte`
- ✅ `MyNewView.svelte`
- ❌ `Timeline.svelte` (missing "View" suffix)
- ❌ `mynewview.svelte` (not PascalCase)

##### 2. Import the View in App.svelte

Add an import statement at the top of `src/App.svelte`:

```javascript
import MyNewView from './lib/MyNewView.svelte'
```

**Current imports example:**
```javascript
import TimelineView from './lib/TimelineView.svelte'
import PedigreeView from './lib/PedigreeView.svelte'
import RadialView from './lib/RadialView.svelte'
import NetworkView from './lib/NetworkView.svelte'
import MyNewView from './lib/MyNewView.svelte'  // ← Add your new view
```

##### 3. Add Route Handling in App.svelte

Update the route handling logic in `src/App.svelte` to include your new view:

```svelte
{#if normalizedPath === '/timeline'}
  <TimelineView />
{:else if normalizedPath === '/pedigree'}
  <PedigreeView />
{:else if normalizedPath === '/radial'}
  <RadialView />
{:else if normalizedPath === '/network'}
  <NetworkView />
{:else if normalizedPath === '/mynew'}
  <MyNewView />  <!-- ← Add your route condition -->
{:else}
  <PedigreeView />
{/if}
```

**Route path conventions:**
- Use lowercase, hyphenated paths: `/my-new-view`, `/timeline`, `/network`
- Avoid underscores: ❌ `/my_new_view`
- Avoid spaces or special characters: ❌ `/my new view`, ❌ `/my!view`
- Keep paths short and descriptive

##### 4. Add Navigation Tab (Optional)

If your view should appear in the main navigation, update `src/lib/ViewSwitcher.svelte`:

```svelte
<nav>
  <a href="#/pedigree">Pedigree</a>
  <a href="#/timeline">Timeline</a>
  <a href="#/radial">Radial</a>
  <a href="#/network">Network</a>
  <a href="#/mynew">My New View</a>  <!-- ← Add navigation link -->
</nav>
```

**Navigation guidelines:**
- Tab labels should be concise (1-2 words)
- Use title case: "My View" not "my view"
- Order tabs logically (most commonly used first)
- Maximum 6-7 tabs to avoid navigation clutter

##### 5. Test the Route

After adding the route, verify it works:

```bash
npm run dev
```

Then navigate to your new view:
- Direct URL: `http://localhost:5173/#/mynew`
- Via navigation tab (if added)

**Testing checklist:**
- [ ] View loads without errors
- [ ] Hash route updates in URL bar
- [ ] Navigation tab highlights correctly (if applicable)
- [ ] View has access to required stores and data
- [ ] Browser back/forward buttons work correctly
- [ ] Direct URL navigation works (reload page with hash)

##### 6. Add Tests for the View

Create a test file following the naming convention (NO `+` prefix):

```javascript
// src/lib/MyNewView.test.js
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/svelte'
import MyNewView from './MyNewView.svelte'

describe('MyNewView', () => {
  it('should render the view', () => {
    const { container } = render(MyNewView)
    expect(container).toBeTruthy()
  })

  it('should display the correct title', () => {
    const { getByText } = render(MyNewView)
    expect(getByText('My New View')).toBeTruthy()
  })
})
```

See `TESTING_GUIDELINES.md` for complete testing conventions.

### View Component Best Practices

#### State Management

**Always use Svelte stores for state:**

```svelte
<script>
  import { people, relationships } from '../stores/familyStore.js'
  import { modal } from '../stores/modalStore.js'

  // Access store data with $ prefix (reactive)
  $: filteredPeople = $people.filter(p => p.birthDate)

  function handleClick(personId) {
    modal.open(personId, 'edit')
  }
</script>
```

**DON'T use props for global data:**

```svelte
<!-- ❌ BAD - Don't pass global data as props -->
<MyNewView people={$people} relationships={$relationships} />

<!-- ✅ GOOD - Views access stores directly -->
<MyNewView />
```

#### Component Composition

**Break down complex views into smaller components:**

```
src/lib/
├── MyNewView.svelte              ← Main view component
└── components/
    ├── MyNewViewFilter.svelte    ← Filter controls
    ├── MyNewViewCard.svelte      ← Data card component
    └── MyNewViewHeader.svelte    ← Header component
```

#### Responsive Design

**Use responsive breakpoints consistent with the app:**

```svelte
<script>
  import { onMount, onDestroy } from 'svelte'

  let windowWidth = 0
  $: isMobile = windowWidth < 768
  $: isTablet = windowWidth >= 768 && windowWidth < 1024
  $: isDesktop = windowWidth >= 1024

  function handleResize() {
    windowWidth = window.innerWidth
  }

  onMount(() => {
    windowWidth = window.innerWidth
    window.addEventListener('resize', handleResize)
  })

  onDestroy(() => {
    window.removeEventListener('resize', handleResize)
  })
</script>

{#if isMobile}
  <MobileLayout />
{:else if isTablet}
  <TabletLayout />
{:else}
  <DesktopLayout />
{/if}
```

**Breakpoint reference:**
- Mobile: `< 768px`
- Tablet: `768px - 1023px`
- Desktop: `>= 1024px`

## API Route Development

### Creating New API Routes

When adding new API endpoints, follow the SvelteKit routing conventions:

#### 1. Create the Route File

Create a `+server.js` file in the appropriate directory under `src/routes/api/`:

```
src/routes/api/
├── people/
│   ├── +server.js                    # /api/people
│   └── [id]/
│       └── +server.js                # /api/people/:id
└── mynew/
    ├── +server.js                    # /api/mynew (NEW)
    └── [itemId]/
        └── +server.js                # /api/mynew/:itemId (NEW)
```

**Route file structure maps to URL paths:**

| File Path | URL Path |
|-----------|----------|
| `src/routes/api/mynew/+server.js` | `/api/mynew` |
| `src/routes/api/mynew/[itemId]/+server.js` | `/api/mynew/:itemId` or `/api/mynew/123` |
| `src/routes/api/mynew/[itemId]/details/+server.js` | `/api/mynew/:itemId/details` |

**CRITICAL**: The directory structure under `src/routes/api/` MUST match the URL path exactly.

#### 2. Implement the Route Handler

```javascript
// src/routes/api/mynew/+server.js
import { json } from '@sveltejs/kit'
import { requireAuth } from '$lib/server/session.js'
import { db } from '$lib/db/client.js'

/**
 * GET /api/mynew
 * Returns all items
 */
export async function GET({ request, locals }) {
  try {
    // Require authentication
    const { user } = await requireAuth(locals)

    // Query database
    const items = await db.select().from(myTable).where(eq(myTable.userId, user.id))

    return json(items)
  } catch (error) {
    if (error.name === 'AuthenticationError') {
      return new Response(error.message, { status: error.status })
    }
    console.error('GET /api/mynew error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}

/**
 * POST /api/mynew
 * Creates a new item
 */
export async function POST({ request, locals }) {
  try {
    const { user } = await requireAuth(locals)
    const data = await request.json()

    // Validate input
    if (!data.name) {
      return new Response('Name is required', { status: 400 })
    }

    // Insert into database
    const [item] = await db.insert(myTable).values({
      ...data,
      userId: user.id
    }).returning()

    return json(item, { status: 201 })
  } catch (error) {
    if (error.name === 'AuthenticationError') {
      return new Response(error.message, { status: error.status })
    }
    console.error('POST /api/mynew error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
```

**Route handler conventions:**
- Export named functions: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`
- Always require authentication unless endpoint is explicitly public
- Always handle errors gracefully with appropriate status codes
- Use `json()` helper for JSON responses
- Document each handler with JSDoc comments

#### 3. Add API Client Method

Update `src/lib/api.js` to add a client method for the new endpoint:

```javascript
export const api = {
  // ... existing methods ...

  /**
   * Gets all items
   *
   * @returns {Promise<Array>} Array of items
   * @throws {Error} If request fails
   */
  async getMyNewItems() {
    const response = await fetch(`${API_BASE}/mynew`)
    if (!response.ok) throw await createApiError(response, 'Failed to fetch items')
    return response.json()
  },

  /**
   * Creates a new item
   *
   * @param {Object} item - Item data
   * @returns {Promise<Object>} Created item
   * @throws {Error} If request fails
   */
  async createMyNewItem(item) {
    const response = await fetch(`${API_BASE}/mynew`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    })
    if (!response.ok) throw await createApiError(response, 'Failed to create item')
    return response.json()
  }
}
```

**CRITICAL**: The route path in `api.js` MUST match the file path in `src/routes/api/`:

✅ **CORRECT**:
- File: `src/routes/api/mynew/+server.js`
- API client: `fetch('/api/mynew')`

❌ **INCORRECT**:
- File: `src/routes/api/mynew/+server.js`
- API client: `fetch('/api/my-new')` ← Path doesn't match!

#### 4. Write Tests

Create a test file for the route handler:

```javascript
// src/routes/api/mynew/server.test.js  ← NO + prefix!
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from './+server.js'

describe('GET /api/mynew', () => {
  let mockEvent

  beforeEach(() => {
    vi.clearAllMocks()

    mockEvent = {
      request: new Request('http://localhost/api/mynew'),  // ← Must match actual route
      locals: {},
      params: {}
    }
  })

  it('should require authentication', async () => {
    // Test implementation
  })

  it('should return all items', async () => {
    // Test implementation
  })
})
```

**Test file naming:**
- ✅ `server.test.js` (preferred)
- ✅ `mynew.test.js` (acceptable)
- ❌ `+server.test.js` (FORBIDDEN - breaks SvelteKit!)

See `TESTING_GUIDELINES.md` for complete testing conventions.

### API Route Checklist

Before submitting a new API route, verify:

- [ ] Route file is at `src/routes/api/<path>/+server.js`
- [ ] File path matches the desired URL path exactly
- [ ] Handlers are exported as named functions (`GET`, `POST`, etc.)
- [ ] Authentication is required (unless explicitly public)
- [ ] Errors are handled with appropriate status codes
- [ ] API client method added to `src/lib/api.js`
- [ ] API client path matches the route file path
- [ ] JSDoc comments document all public methods
- [ ] Tests created (without `+` prefix)
- [ ] Tests use the correct route path

## Component Development

### Component File Organization

```
src/lib/
├── components/           # Reusable UI components
│   ├── Button.svelte
│   ├── Modal.svelte
│   └── Card.svelte
├── TimelineView.svelte   # View components
├── PedigreeView.svelte
└── utils/                # Utility functions
    ├── treeHelpers.js
    └── d3Helpers.js
```

### Component Naming Conventions

- **View components**: `<Name>View.svelte` (e.g., `TimelineView.svelte`)
- **UI components**: `<Name>.svelte` (e.g., `Button.svelte`, `PersonCard.svelte`)
- **Utility modules**: `<name>Helpers.js` or `<name>Utils.js`

### Component Best Practices

#### Props vs. Stores

**Use props for:**
- Component-specific data
- Configuration options
- Callbacks and event handlers

```svelte
<script>
  export let title = 'Default Title'
  export let onClick = () => {}
</script>
```

**Use stores for:**
- Global application state
- Shared data across components
- Data that needs reactivity across the app

```svelte
<script>
  import { people } from '../stores/familyStore.js'

  $: filteredPeople = $people.filter(p => p.birthDate)
</script>
```

#### Component Documentation

Document your components with JSDoc:

```svelte
<script>
/**
 * PersonCard component
 *
 * Displays a person's information in a card format with optional actions.
 *
 * @component
 * @example
 * <PersonCard
 *   person={{ id: 1, firstName: 'John', lastName: 'Doe' }}
 *   onClick={() => handleClick()}
 * />
 */

  /** @type {Object} Person object with id, firstName, lastName, etc. */
  export let person

  /** @type {Function?} Optional click handler */
  export let onClick = null
</script>
```

## Code Style and Best Practices

### JavaScript/Svelte Style

**Formatting:**
- Use 2 spaces for indentation
- Use single quotes for strings (except JSON)
- Add trailing commas in multi-line objects and arrays
- Use semicolons

**Naming:**
- `camelCase` for variables, functions, and methods
- `PascalCase` for components and classes
- `UPPER_SNAKE_CASE` for constants
- Descriptive names over abbreviations

```javascript
// ✅ GOOD
const filteredPeople = people.filter(p => p.birthDate)
const MAX_TREE_DEPTH = 5

function calculateGenerations(person) {
  // ...
}

// ❌ BAD
const fp = people.filter(p => p.birthDate)  // Unclear abbreviation
const maxTreeDepth = 5  // Should be constant case

function calcGen(p) {  // Unclear abbreviation
  // ...
}
```

### Reactivity

**Use reactive statements for derived values:**

```svelte
<script>
  import { people } from '../stores/familyStore.js'

  let filterText = ''

  // ✅ GOOD - Reactive statement
  $: filteredPeople = $people.filter(p =>
    p.firstName?.toLowerCase().includes(filterText.toLowerCase())
  )

  // ❌ BAD - Non-reactive function call
  function getFilteredPeople() {
    return people.filter(p =>
      p.firstName?.toLowerCase().includes(filterText.toLowerCase())
    )
  }
</script>
```

### Error Handling

**Always handle errors gracefully:**

```javascript
try {
  const result = await api.createPerson(personData)
  notifications.success('Person created successfully')
} catch (error) {
  console.error('Failed to create person:', error)
  notifications.error(error.message || 'Failed to create person')
}
```

### Performance

**Avoid unnecessary re-renders:**

```svelte
<script>
  import { people } from '../stores/familyStore.js'

  // ✅ GOOD - Only recalculates when people changes
  $: personCount = $people.length

  // ❌ BAD - Recalculates on every render
  let personCount = $people.length
</script>
```

**Use derived stores for complex computations:**

```javascript
// src/stores/derivedStores.js
import { derived } from 'svelte/store'
import { people, relationships } from './familyStore.js'

// ✅ GOOD - Computed once when dependencies change
export const peopleWithChildren = derived(
  [people, relationships],
  ([$people, $relationships]) => {
    return $people.filter(person => {
      return $relationships.some(rel =>
        rel.person1Id === person.id && rel.type === 'parentOf'
      )
    })
  }
)
```

### Accessibility

**Always include proper ARIA attributes:**

```svelte
<button
  on:click={handleClick}
  aria-label="Close modal"
  tabindex="0"
>
  ×
</button>

<input
  type="text"
  id="firstName"
  aria-label="First name"
  aria-required="true"
/>
```

**Ensure keyboard navigation:**

```svelte
<div
  role="button"
  tabindex="0"
  on:click={handleClick}
  on:keydown={(e) => e.key === 'Enter' && handleClick()}
>
  Click me
</div>
```

## Additional Resources

- [SvelteKit Documentation](https://kit.svelte.dev/docs)
- [Svelte Tutorial](https://svelte.dev/tutorial)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- See `TESTING_GUIDELINES.md` for testing conventions
- See `CLAUDE.md` for architecture overview
