# Bug Fix: Name Fields Not Editable in PersonModal

## Issue Summary

Users were unable to edit the firstName and lastName fields in the PersonModal when editing an existing person. The input fields appeared to be editable (no disabled or readonly attributes), but any typed characters would not persist in the inputs.

## Root Cause

The bug was caused by an overly aggressive reactive statement in `PersonFormFields.svelte` (lines 22-32). The original code:

```javascript
// Reactive update when person prop changes
$: if (person) {
  formData = {
    firstName: person.firstName || '',
    lastName: person.lastName || '',
    birthDate: person.birthDate || '',
    deathDate: person.deathDate || '',
    gender: person.gender || '',
    photoUrl: person.photoUrl || ''
  }
  isAlive = !person.deathDate
}
```

This reactive statement (`$:`) runs whenever any of its dependencies change. In Svelte, this can happen frequently due to:
- Component re-renders
- Reactive recalculations
- Window resize events (due to responsive breakpoints)
- Store updates

Every time the statement ran, it would **overwrite** `formData` with the original `person` values, erasing any user edits.

## The Fix

The fix tracks which person is currently being edited using a `currentPersonId` variable. The reactive statement now only updates `formData` when the person ID changes (i.e., when switching to edit a different person):

```javascript
let currentPersonId = null

// Reactive update when person prop changes to a DIFFERENT person
// Only update formData if we're editing a different person than before
// This prevents overwriting user edits during reactive re-renders
$: if (person && person.id !== currentPersonId) {
  formData = {
    firstName: person.firstName || '',
    lastName: person.lastName || '',
    birthDate: person.birthDate || '',
    deathDate: person.deathDate || '',
    gender: person.gender || '',
    photoUrl: person.photoUrl || ''
  }
  isAlive = !person.deathDate
  currentPersonId = person.id
} else if (!person && currentPersonId !== null) {
  // Person was cleared (switched to add mode)
  formData = {
    firstName: '',
    lastName: '',
    birthDate: '',
    deathDate: '',
    gender: '',
    photoUrl: ''
  }
  isAlive = true
  currentPersonId = null
}
```

## Test Coverage

Following TDD methodology, we implemented this fix in three phases:

### RED Phase - Failing Tests

Created 9 comprehensive tests in `PersonFormFields.nameEditing.test.js` that demonstrated the bug:
- Editing firstName and lastName
- Typing multiple characters sequentially
- Clearing and retyping
- Preserving edits on form submission
- Add mode vs. edit mode
- No readonly/disabled attributes

Initial test run: **6 failed, 3 passed** (add mode worked, edit mode failed)

### GREEN Phase - Fix Implementation

Modified the reactive statement in `PersonFormFields.svelte` to track person ID changes.

Test run after fix: **All 9 tests passed**

### REFACTOR Phase - Integration Testing

Created 4 integration tests in `PersonModal.nameEditing.integration.test.js` to verify:
- End-to-end name editing workflow in the modal
- Realistic character-by-character typing
- Persistence of edits while modal stays open
- Switching between different people in the modal

Integration test run: **All 4 tests passed**

## Regression Testing

Verified no regressions by running existing test suites:
- PersonFormFields.test.js: **34 tests passed**
- PersonModal.test.js: **35 tests passed**
- Total PersonFormFields tests: **43 tests passed** (9 new + 34 existing)

## Files Modified

1. `/Users/cobaltroad/Source/familytree/src/lib/components/PersonFormFields.svelte`
   - Added `currentPersonId` tracking variable
   - Modified reactive statement to only update on person ID change
   - Added handling for switching to add mode (person = null)

## Files Added

1. `/Users/cobaltroad/Source/familytree/src/lib/components/PersonFormFields.nameEditing.test.js`
   - 9 unit tests for name editing functionality

2. `/Users/cobaltroad/Source/familytree/src/lib/PersonModal.nameEditing.integration.test.js`
   - 4 integration tests for end-to-end name editing in modal

## Impact

This fix resolves a critical bug that prevented users from performing basic CRUD operations on person records. Users can now:
- Edit firstName and lastName in the PersonModal
- Type multiple characters without losing input
- Clear and retype names
- Submit forms with edited names
- Switch between editing different people

## Technical Notes

### Svelte Reactivity

This bug highlights an important aspect of Svelte's reactivity system:
- Reactive statements (`$:`) run whenever their dependencies change
- Changes can be triggered by many factors beyond explicit prop updates
- When using reactive statements to populate form data, always check if the data source has actually changed before overwriting local state

### Best Practice

When implementing forms that edit existing data:
1. Track the identity of the data being edited (e.g., ID)
2. Only reset form state when switching to edit different data
3. Preserve user edits during reactive re-renders
4. Write tests that simulate realistic user interactions (character-by-character typing)

## Related Issues

This fix follows the TDD methodology established in the codebase architecture migration (Issues #26-34) and maintains consistency with the reactive store patterns documented in `/Users/cobaltroad/Source/familytree/frontend/src/stores/actions/README.md`.
