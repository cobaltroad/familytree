# Testing Library Matchers Configuration

## Overview

This document describes the configuration of @testing-library/jest-dom matchers for use with Vitest in the FamilyTree application. This addresses Story #69, Category 2: Missing Testing Library Matchers.

## Problem Statement

Component tests were failing with "Invalid Chai property" errors for matchers like:
- `toBeInTheDocument`
- `toBeVisible`
- `toHaveAttribute`
- `toHaveFocus`
- `toHaveClass`

## Solution

The matchers are properly configured in the Vitest setup file using @testing-library/jest-dom.

### Configuration Details

**File:** `/src/test/setup.js`

```javascript
import { vi } from 'vitest';
import { expect } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with @testing-library/jest-dom matchers
expect.extend(matchers);
```

**File:** `/vitest.config.js`

```javascript
export default defineConfig({
  plugins: [svelte({ hot: !process.env.VITEST })],
  test: {
    include: ['src/**/*.test.js'],
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'], // Loads matchers
  },
  // ...
})
```

## Available Matchers

The following matchers are available in all test files:

### DOM Matchers

- **`toBeInTheDocument()`** - Asserts element is present in the DOM
- **`toBeVisible()`** - Asserts element is visible (not display:none, opacity:0, etc.)
- **`toBeDisabled()` / `toBeEnabled()`** - Asserts element disabled/enabled state
- **`toBeEmptyDOMElement()`** - Asserts element has no visible content
- **`toBeInvalid()` / `toBeValid()`** - Asserts form element validation state
- **`toBeRequired()`** - Asserts form element has required attribute

### Attribute Matchers

- **`toHaveAttribute(attr, value?)`** - Asserts element has attribute with optional value
- **`toHaveClass(...classes)`** - Asserts element has CSS class(es)
- **`toHaveStyle(styles)`** - Asserts element has inline styles
- **`toHaveAccessibleName(name)`** - Asserts element's accessible name
- **`toHaveAccessibleDescription(desc)`** - Asserts element's accessible description

### Form Matchers

- **`toHaveFormValues(values)`** - Asserts form has specific values
- **`toHaveValue(value)`** - Asserts input/select/textarea value
- **`toHaveDisplayValue(value)`** - Asserts input display value
- **`toBeChecked()` / `toBePartiallyChecked()`** - Asserts checkbox/radio state

### Content Matchers

- **`toHaveTextContent(text)`** - Asserts element text content
- **`toContainElement(element)`** - Asserts element contains another element
- **`toContainHTML(html)`** - Asserts element contains HTML string

### Focus Matchers

- **`toHaveFocus()`** - Asserts element has focus

## Usage Examples

### Basic Usage

```javascript
import { render, screen } from '@testing-library/svelte'
import { describe, it, expect } from 'vitest'
import MyComponent from './MyComponent.svelte'

describe('MyComponent', () => {
  it('should render button in document', () => {
    render(MyComponent)
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
  })

  it('should have correct attributes', () => {
    render(MyComponent)
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('type', 'button')
    expect(button).toHaveClass('primary-button')
  })

  it('should handle focus', async () => {
    render(MyComponent)
    const input = screen.getByRole('textbox')
    input.focus()
    expect(input).toHaveFocus()
  })
})
```

### Negative Assertions

All matchers support `.not` for negative assertions:

```javascript
expect(element).not.toBeInTheDocument()
expect(element).not.toBeVisible()
expect(element).not.toHaveClass('active')
expect(element).not.toHaveFocus()
```

### Multiple Matchers on Same Element

```javascript
const element = screen.getByTestId('my-element')
expect(element).toBeInTheDocument()
expect(element).toBeVisible()
expect(element).toHaveClass('styled-element')
expect(element).toHaveAttribute('aria-label', 'My Element')
```

## Test Examples

See `/src/test/matchers.test.js` for comprehensive examples of all matcher usage patterns.

## Troubleshooting

### "Invalid Chai property" Error

If you encounter "Invalid Chai property" errors:

1. Verify @testing-library/jest-dom is installed:
   ```bash
   npm list @testing-library/jest-dom
   ```

2. Check that setup.js is being loaded in vitest.config.js:
   ```javascript
   setupFiles: ['./src/test/setup.js']
   ```

3. Ensure you're importing `expect` from 'vitest':
   ```javascript
   import { expect } from 'vitest'
   ```

### Matcher Not Working

If a matcher isn't working as expected:

1. Check you're using the correct matcher name (camelCase)
2. Verify the element is actually in the DOM (use `screen.debug()`)
3. Check async timing (use `await` with `tick()` for Svelte)
4. Review the matcher documentation for correct usage

## References

- [@testing-library/jest-dom Documentation](https://github.com/testing-library/jest-dom)
- [Vitest Documentation](https://vitest.dev/)
- [@testing-library/svelte Documentation](https://testing-library.com/docs/svelte-testing-library/intro/)

## Acceptance Criteria Met

This configuration satisfies Story #69, AC2:

- ✅ All matcher assertions execute successfully
- ✅ Custom matchers are properly configured for Vitest/Chai
- ✅ No "Invalid Chai property" errors occur
- ✅ Matchers work for: toBeInTheDocument, toBeVisible, toHaveClass, toHaveFocus, toHaveAttribute
- ✅ Comprehensive test coverage validates matcher functionality
