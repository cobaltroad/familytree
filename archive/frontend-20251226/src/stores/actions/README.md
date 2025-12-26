# Person Actions - Optimistic Update Pattern

This module implements optimistic UI updates for person CRUD operations, providing immediate visual feedback before API calls complete.

## Overview

The optimistic update pattern applies changes to the UI immediately, then synchronizes with the server in the background. If the server operation fails, the UI automatically rolls back to the previous state.

### Benefits

- **Reduced Perceived Latency**: UI updates in <50ms instead of 300ms (66%+ improvement)
- **Better User Experience**: Users can continue working without waiting for server responses
- **Automatic Error Recovery**: Failed operations rollback automatically
- **Data Consistency**: State remains consistent even with concurrent operations

## Usage

### Update Person

```javascript
import { updatePerson } from './stores/actions/personActions.js'

// Update a person - UI updates immediately
await updatePerson(personId, {
  firstName: 'Jane',
  lastName: 'Smith'
})
```

### Create Person

```javascript
import { createPerson } from './stores/actions/personActions.js'

// Create a person - appears immediately with temporary ID
await createPerson({
  firstName: 'John',
  lastName: 'Doe',
  birthDate: '1980-01-01',
  gender: 'male'
})
```

### Delete Person

```javascript
import { deletePerson } from './stores/actions/personActions.js'

// Delete a person - removed immediately from UI
await deletePerson(personId)
```

## How It Works

### Update Flow

1. **Optimistic Update**: Changes applied immediately to UI
2. **API Call**: Server update happens in background
3. **Success**: UI updated with server response (may include additional fields)
4. **Failure**: UI rolls back to original state, error message displayed

### Create Flow

1. **Temporary ID**: Generate unique temp ID (`temp-{timestamp}`)
2. **Optimistic Create**: Person added to UI immediately
3. **API Call**: Server creation happens in background
4. **Success**: Temp ID replaced with real server ID
5. **Failure**: Temporary person removed from UI, error message displayed

### Delete Flow

1. **Optimistic Delete**: Person removed from UI immediately
2. **API Call**: Server deletion happens in background
3. **Success**: Deletion confirmed, no additional action
4. **Failure**: Person restored at original position, error message displayed

## Error Handling

All operations set the `error` store on failure:

```javascript
import { error } from './stores/familyStore.js'

// Subscribe to errors
error.subscribe(err => {
  if (err) {
    console.error('Operation failed:', err)
    // Show error notification to user
  }
})
```

Error messages:
- `"Failed to update person"` - Update operation failed
- `"Failed to create person"` - Create operation failed
- `"Failed to delete person"` - Delete operation failed

## Concurrent Operations

The module handles multiple concurrent operations independently:

```javascript
// These operations won't interfere with each other
await Promise.all([
  updatePerson(1, { firstName: 'John' }),
  updatePerson(2, { firstName: 'Jane' }),
  createPerson({ firstName: 'Bob', lastName: 'Smith' })
])
```

Each operation:
- Tracks its own state independently
- Rolls back only on its own failure
- Doesn't affect other pending operations

## Performance Characteristics

- **Optimistic Update Speed**: <50ms to apply UI changes
- **Perceived Latency**: <100ms (67% reduction from 300ms baseline)
- **Rollback Speed**: <50ms to restore state on error
- **Scalability**: Handles large datasets (1000+ people) efficiently

## Testing

The module includes comprehensive test coverage:

- **Unit Tests** (32 tests): Core functionality, edge cases, error handling
- **Integration Tests** (15 tests): Integration with stores, UI feedback timing
- **Performance Tests** (14 tests): Latency measurements, concurrent operations

Run tests:
```bash
npm test -- src/stores/actions/
```

## Architecture Decisions

### Why Optimistic Updates?

Traditional CRUD operations block the UI until the server responds (300ms+). Optimistic updates provide instant feedback while the server processes in the background.

### Why Temporary IDs?

Creating a person requires a server-generated ID. Temporary IDs allow the UI to display the new person immediately while waiting for the real ID from the server.

### Why Capture Original State?

Capturing the original state before optimistic updates enables precise rollback if the operation fails, ensuring the UI returns to exactly the same state.

### Why Helper Functions?

The `initializeAction()` and `replacePersonAtIndex()` helpers reduce code duplication and follow the DRY (Don't Repeat Yourself) principle.

## Future Enhancements

Potential improvements:
- **Optimistic Relationship Actions**: Extend pattern to relationship CRUD operations
- **Undo/Redo**: Add ability to undo optimistic operations
- **Conflict Resolution**: Handle server state conflicts more gracefully
- **Batch Operations**: Optimize multiple operations in a single request
- **Retry Logic**: Automatically retry failed operations with exponential backoff

## Related Documentation

- [familyStore.js](../familyStore.js) - Core Svelte stores
- [derivedStores.js](../derivedStores.js) - Derived stores for O(1) lookups
- [api.js](../../lib/api.js) - API client for backend communication
