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

## Additional Resources

- [SvelteKit Routing Documentation](https://kit.svelte.dev/docs/routing)
- [Vitest Documentation](https://vitest.dev/)
- See `CLAUDE.md` for full architecture details
