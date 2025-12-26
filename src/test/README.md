# Test Utilities and Configuration

This directory contains test setup files, utilities, and fixture components for the FamilyTree application.

## Directory Structure

```
src/test/
├── README.md                 # This file
├── setup.js                  # Vitest setup - configures matchers and mocks
├── storeTestUtils.test.js    # Tests for store testing utilities
├── matchers.test.js          # Comprehensive tests for @testing-library/jest-dom matchers
└── fixtures/                 # Reusable test component fixtures
    ├── TestComponent.svelte
    ├── HiddenComponent.svelte
    ├── NoClassComponent.svelte
    ├── NoAttrComponent.svelte
    └── InteractiveComponent.svelte
```

## setup.js

The setup file is automatically loaded before all tests (configured in `vitest.config.js`).

### Features

1. **Testing Library Matchers**
   - Extends Vitest's `expect` with @testing-library/jest-dom matchers
   - Enables matchers like `toBeInTheDocument()`, `toHaveClass()`, `toHaveFocus()`, etc.
   - See `/docs/TESTING_MATCHERS.md` for full documentation

2. **SvelteKit Mocks**
   - Mocks `$app/environment` for testing
   - Mocks `$app/navigation` for routing tests
   - Mocks `$app/stores` for page/navigation store tests

### Example Usage

All test files automatically have access to:

```javascript
import { expect } from 'vitest'
import { render, screen } from '@testing-library/svelte'

// Matchers work out of the box
expect(element).toBeInTheDocument()
expect(element).toHaveClass('my-class')

// SvelteKit modules are mocked
import { goto } from '$app/navigation' // Already mocked
```

## Test Fixtures

The `fixtures/` directory contains simple Svelte components used for testing core functionality.

### Available Fixtures

- **TestComponent.svelte** - Configurable test component with visibility, classes, and attributes
- **HiddenComponent.svelte** - Component with `display: none` for visibility testing
- **NoClassComponent.svelte** - Component without CSS classes
- **NoAttrComponent.svelte** - Component without custom attributes
- **InteractiveComponent.svelte** - Component with interactive elements for focus testing

### Example Usage

```javascript
import TestComponent from './fixtures/TestComponent.svelte'

it('should render with custom props', () => {
  render(TestComponent, {
    props: {
      visible: true,
      className: 'my-class',
      customAttr: 'value'
    }
  })

  const element = screen.getByTestId('test-element')
  expect(element).toHaveClass('my-class')
})
```

## matchers.test.js

Comprehensive test file that validates all @testing-library/jest-dom matchers work correctly.

### Test Coverage

- ✅ toBeInTheDocument
- ✅ toBeVisible
- ✅ toHaveAttribute
- ✅ toHaveFocus
- ✅ toHaveClass
- ✅ Combined matcher scenarios
- ✅ Edge cases and error conditions

Run these tests to verify matcher configuration:

```bash
npm test -- src/test/matchers.test.js
```

## Common Testing Patterns

### Rendering Components

```javascript
import { render, screen } from '@testing-library/svelte'
import MyComponent from './MyComponent.svelte'

// Basic render
render(MyComponent)

// With props
render(MyComponent, {
  props: { name: 'John', age: 30 }
})

// Access component instance
const { component } = render(MyComponent)
component.$set({ newProp: 'value' })
```

### Querying Elements

```javascript
// Recommended queries (fail if not found)
screen.getByRole('button')
screen.getByLabelText('Username')
screen.getByTestId('my-element')

// Query variants (return null if not found)
screen.queryByRole('button')
screen.queryByTestId('my-element')

// Find variants (async, wait for element)
await screen.findByRole('button')
```

### Testing Events

```javascript
import { fireEvent } from '@testing-library/svelte'

const button = screen.getByRole('button')
await fireEvent.click(button)
await fireEvent.keyDown(input, { key: 'Enter' })
```

### Testing Focus

```javascript
import { tick } from 'svelte'

const input = screen.getByRole('textbox')
input.focus()
await tick() // Wait for Svelte reactivity
expect(input).toHaveFocus()
```

### Testing Component Events

```javascript
const { component } = render(MyComponent)

let eventFired = false
component.$on('myEvent', () => {
  eventFired = true
})

// Trigger event
const button = screen.getByRole('button')
await fireEvent.click(button)

expect(eventFired).toBe(true)
```

## Best Practices

1. **Use Semantic Queries** - Prefer `getByRole`, `getByLabelText` over `getByTestId`
2. **Test User Behavior** - Test what users see and do, not implementation details
3. **Avoid Implementation Details** - Don't test internal state/methods
4. **Use `await` with Async** - Always await fireEvent and async queries
5. **Clean Up** - @testing-library handles cleanup automatically
6. **Use `tick()`** - When testing Svelte reactivity, use `tick()` to wait for updates

## Troubleshooting

### Element Not Found

```javascript
// Debug what's in the DOM
screen.debug()

// Or debug specific element
screen.debug(screen.getByTestId('my-element'))
```

### Matcher Errors

If you see "Invalid Chai property" errors:
- Verify setup.js is loaded (check vitest.config.js)
- Check @testing-library/jest-dom is installed
- See `/docs/TESTING_MATCHERS.md` for detailed troubleshooting

### Async Issues

If tests are flaky or failing intermittently:
- Use `await` with all fireEvent calls
- Use `await tick()` after updating Svelte component state
- Use `findBy` queries for elements that appear asynchronously

## Resources

- [Testing Library Docs](https://testing-library.com/)
- [Vitest Docs](https://vitest.dev/)
- [@testing-library/svelte](https://testing-library.com/docs/svelte-testing-library/intro/)
- [@testing-library/jest-dom](https://github.com/testing-library/jest-dom)
- [Testing Matchers Documentation](/docs/TESTING_MATCHERS.md)
