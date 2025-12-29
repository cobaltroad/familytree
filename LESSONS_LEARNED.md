# Lessons Learned - Family Tree Application

This document captures critical lessons learned during development to guide future work and prevent recurring issues.

## Backend-Frontend Data Format Synchronization

### Issue: Parent Relationships Not Displaying (December 2025)

**Symptoms:**
- Mother and father relationships not showing in PersonModal
- Add/Link buttons showing even when parents already exist
- Relationship lookups failing silently

**Root Cause:**
Data format mismatch between backend API and frontend stores:
- **Backend API** returns denormalized relationships: `type: "mother"` and `type: "father"`
- **Frontend stores** were only checking for normalized format: `type: "parentOf"` with `parent_role`
- This mismatch caused all parent relationship lookups to fail

**Files Affected:**
- `src/stores/derivedStores.js` - Derived store computations
- `src/lib/treeHelpers.js` - Tree manipulation utilities

**Solution:**
Updated all relationship lookup logic to handle BOTH formats:
```javascript
// Check for both denormalized and normalized formats
const isParentChild =
  rel.type === 'mother' ||
  rel.type === 'father' ||
  rel.type === 'parentOf';
```

### Key Lessons

1. **Always Handle Both Data Formats**
   - The backend normalizes relationships for storage (`parentOf` with `parent_role`)
   - The API denormalizes them for frontend convenience (`mother`, `father`)
   - **All frontend code must handle BOTH formats** for robustness

2. **Centralize Format Checking**
   - Created `isParentChildRelationship()` helper in `treeHelpers.js`
   - Use this helper consistently instead of inline checks
   - Makes future format changes easier to manage

3. **Test with Real API Data**
   - Unit tests with mock data can miss format mismatches
   - Always test with actual API responses
   - Consider integration tests that exercise the full stack

4. **Document Data Transformations**
   - Added comments explaining the denormalized format
   - Document where and why data format changes occur
   - Include examples in code comments

## Relationship Model Guidelines

### Current Architecture

The relationship system uses a **hybrid approach**:
- **Storage (Backend)**: Normalized format with `type: "parentOf"` and `parent_role: "mother"|"father"`
- **API (Backend → Frontend)**: Denormalized format with `type: "mother"|"father"`
- **Frontend Processing**: Must handle both formats for backwards compatibility

### Rules for Working with Relationships

1. **Backend API Endpoints** (`src/routes/api/relationships/`)
   - Accept: `type: "mother"`, `type: "father"`, `type: "spouse"`
   - Store: Normalize mother/father to `type: "parentOf"` with `parent_role`
   - Return: Denormalize back to `type: "mother"` or `type: "father"`

2. **Frontend Stores** (`src/stores/derivedStores.js`)
   - Must check for both denormalized (`mother`, `father`) and normalized (`parentOf`) formats
   - Use helper functions like `isParentChildRelationship()` for consistency
   - Document why dual format checking is necessary

3. **Tree Helpers** (`src/lib/treeHelpers.js`)
   - All relationship queries must handle both formats
   - Functions affected: `findParents()`, `findChildren()`, `findRootPeople()`, `buildDescendantTree()`, `assignGenerations()`
   - Use centralized helper for format checking

4. **Sibling Relationships**
   - Siblings are **computed dynamically** on frontend (people who share at least one parent)
   - Never stored in database as explicit relationships
   - Always derive from parent-child relationships

### Adding New Relationship Types

When adding new relationship types:
1. Decide if normalization is needed (like mother/father → parentOf)
2. Update API endpoints to handle denormalization
3. Update ALL frontend lookup logic (stores + helpers)
4. Add comprehensive tests for both formats
5. Document the storage vs. API format difference

## Testing Best Practices

### What We Learned from the Bug Fix

1. **Test Relationship Display Logic**
   - Created `PersonModal.parentDisplay.test.js` with 13 tests
   - Tests verify both presence of relationships AND absence of add/link buttons
   - Caught the bug immediately with failing tests

2. **Test Derived Store Computations**
   - `derivedStores.test.js` has 33 tests covering all relationship lookups
   - Tests use real relationship data structures from API
   - Validates mother, father, siblings, children, and rootPeople derivations

3. **Use Both Formats in Tests**
   - Test data should include both denormalized (`mother`, `father`) and normalized (`parentOf`) formats
   - Ensures backwards compatibility
   - Example from tests:
     ```javascript
     { id: 1, person1_id: 2, person2_id: 1, type: 'mother' }, // Denormalized
     { id: 2, person1_id: 3, person2_id: 1, type: 'parentOf', parent_role: 'father' } // Normalized
     ```

4. **Test at Multiple Levels**
   - **Unit tests**: Individual helper functions (e.g., `isParentChildRelationship()`)
   - **Integration tests**: Derived stores with real data structures
   - **Component tests**: PersonModal with relationship display
   - **End-to-end**: Full user workflows (recommended for future)

## Code Organization Principles

### Helper Function Strategy

**✅ DO:**
- Extract reusable logic into helper functions (`isParentChildRelationship()`)
- Place helpers in appropriate modules (`treeHelpers.js` for relationship logic)
- Use helpers consistently across codebase (stores, components, utilities)
- Document helper purpose and parameters

**❌ DON'T:**
- Duplicate relationship checking logic across files
- Inline complex format checking (makes changes harder)
- Create helpers without clear single responsibility

### Derived Store Patterns

**Best Practices from `derivedStores.js`:**
1. Use `derived()` for computed values that depend on multiple stores
2. Return Maps for O(1) lookups (e.g., `peopleById`)
3. Handle missing data gracefully with fallbacks
4. Document data format assumptions
5. Add TODO comments for future optimizations

**Example Pattern:**
```javascript
export const peopleById = derived(people, ($people) => {
  const map = new Map();
  $people.forEach(person => map.set(person.id, person));
  return map;
}); // O(1) lookups instead of O(n) array.find()
```

## Future Recommendations

### Prevent Similar Issues

1. **Add Format Validation Tests**
   - Create tests that verify API responses match expected format
   - Test that frontend handles both normalized and denormalized formats
   - Add CI checks for data format consistency

2. **Consider Schema Documentation**
   - Document the canonical relationship data model
   - Show both storage format and API format side-by-side
   - Include examples of transformations

3. **Centralize Data Transformation**
   - Consider a dedicated module for relationship format conversions
   - Single source of truth for normalization/denormalization logic
   - Easier to maintain and test

4. **Add Integration Tests**
   - Test full request/response cycle (backend → API → frontend)
   - Verify data formats at each boundary
   - Catch mismatches before they reach production

### Code Review Checklist

When reviewing relationship-related code:
- [ ] Does it handle both denormalized (`mother`, `father`) and normalized (`parentOf`) formats?
- [ ] Are helper functions used consistently?
- [ ] Are tests included for both data formats?
- [ ] Is the relationship lookup O(1) or optimized?
- [ ] Are edge cases handled (missing parents, orphans, etc.)?
- [ ] Is the code documented with format assumptions?

## Reference Files

Key files for relationship handling:
- `src/stores/derivedStores.js` - Derived store computations with dual format support
- `src/lib/treeHelpers.js` - Tree manipulation with `isParentChildRelationship()` helper
- `src/lib/db/schema.js` - Database schema defining normalized storage format
- `src/routes/api/relationships/+server.js` - API endpoints with denormalization logic
- `src/lib/PersonModal.parentDisplay.test.js` - Parent display test suite
- `src/stores/derivedStores.test.js` - Derived store test coverage

## Version History

- **December 2025**: Initial lessons learned from parent display bug fix
  - Root cause: Backend-frontend data format mismatch
  - Solution: Dual format support in all relationship lookups
  - Tests added: 13 parent display tests, 33 derived store tests
  - Commit: [See git log for parent display fix]

---

**Note to Future Developers:**
This document should be updated whenever significant bugs are discovered or architectural decisions are made. Keep it current to maximize its value as a knowledge base.
