# Testing Guidelines

## Test File Placement

### CRITICAL: Avoid SvelteKit Reserved File Names

**Files with `+` prefix in the `src/routes/` directory are RESERVED for SvelteKit route files.**

Using `+` prefix for test files will cause this error:
```
Files prefixed with + are reserved (saw src/routes/+page.auth.test.js)
```

This error **breaks the entire application** - the dev server will not start.

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
✅ GOOD:
- page.auth.test.js
- personModal.test.js
- server.test.js
- familyStore.test.js

❌ AVOID:
- +page.test.js (breaks SvelteKit)
- test.js (not descriptive)
- spec.js (use .test.js consistently)
```

## Running Tests

```bash
npm test              # Run all tests
npm test -- --watch   # Watch mode
npm test -- path/to/specific.test.js  # Run specific test
npm run test:ui       # Open Vitest UI
```

## Additional Resources

- [SvelteKit Routing Documentation](https://kit.svelte.dev/docs/routing)
- [Vitest Documentation](https://vitest.dev/)
- See `CLAUDE.md` for full architecture details
