# Delete Button Fix for Parent and Child Relationships

## Problem Summary

Delete buttons were appearing on spouse relationship cards but NOT on parent or child relationship cards in PersonModal.

## Root Cause Analysis

The issue was in the `findRelationshipObject()` helper function in `PersonModal.svelte`. This function searches for a relationship object to pass to `RelationshipCard`, which uses it to determine whether to show a delete button.

### The API Denormalization

The relationship API denormalizes `parentOf` relationships for easier consumption:
- Database stores: `type: "parentOf", parent_role: "mother"`
- API returns: `type: "mother", parentRole: "mother"`

This denormalization happens in `src/lib/server/relationshipHelpers.js` via the `denormalizeRelationship()` function.

### The Bug

The `findRelationshipObject()` function was ONLY checking for `rel.type === 'parentOf'`, which would never match the denormalized API response where `type: "mother"` or `type: "father"`.

```javascript
// BEFORE (buggy code)
if (parentRole) {
  // Looking for a parent relationship
  return rel.type === 'parentOf' &&  // ❌ Never matches denormalized format!
    rel.person2Id === person.id &&
    rel.person1Id === relatedPersonId &&
    rel.parentRole === parentRole
}
```

Result: `findRelationshipObject()` returned `null`, so the `relationship` prop was `null`, and `RelationshipCard` hid the delete button (because `showDeleteButton = relationship && (isMobile || isHovering)`).

## The Fix

Updated `findRelationshipObject()` to check for BOTH denormalized and normalized formats:

```javascript
// AFTER (fixed code)
if (parentRole) {
  // Looking for a parent relationship
  // IMPORTANT: API denormalizes parentOf relationships, so we need to check for both:
  // - Denormalized format: type="mother" or type="father" with parentRole="mother"/"father"
  // - Normalized format: type="parentOf" with parentRole="mother"/"father" (backwards compatibility)
  const isParentRelationship = rel.type === 'parentOf' || rel.type === parentRole
  return isParentRelationship &&
    rel.person2Id === person.id &&
    rel.person1Id === relatedPersonId &&
    rel.parentRole === parentRole
} else {
  // Looking for a child relationship
  // IMPORTANT: API denormalizes parentOf relationships, so we need to check for both:
  // - Denormalized format: type="mother" or type="father"
  // - Normalized format: type="parentOf" (backwards compatibility)
  const isParentRelationship = rel.type === 'parentOf' || rel.type === 'mother' || rel.type === 'father'
  return isParentRelationship &&
    rel.person1Id === person.id &&
    rel.person2Id === relatedPersonId
}
```

## Test Coverage

Created comprehensive test suite in `src/lib/PersonModal.findRelationshipObject.test.js` with 15 tests:

1. **Spouse relationships** (3 tests) - All passing before fix
2. **Parent relationships with denormalized format** (3 tests) - **Fixed by this change**
3. **Child relationships with denormalized format** (3 tests) - **Fixed by this change**
4. **Parent/child with normalized format** (3 tests) - Backwards compatibility maintained
5. **Edge cases** (3 tests) - Null/undefined handling

All 15 tests now pass.

## Impact

- Delete buttons now appear on parent relationship cards (mother and father)
- Delete buttons now appear on child relationship cards
- Delete buttons continue to work on spouse relationship cards
- Backwards compatibility maintained for any normalized format data
- No breaking changes to API or database schema

## Files Changed

1. `src/lib/PersonModal.svelte` - Fixed `findRelationshipObject()` function
2. `src/lib/PersonModal.findRelationshipObject.test.js` - New comprehensive test suite

## TDD Process

Followed strict RED-GREEN-REFACTOR cycle:

1. **RED**: Wrote failing tests demonstrating the bug with denormalized API format
2. **GREEN**: Fixed the code to handle both denormalized and normalized formats
3. **REFACTOR**: Code already clean; added explanatory comments

All tests passing (15/15).
