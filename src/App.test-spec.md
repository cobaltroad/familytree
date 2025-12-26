# App Component - Modal Re-open Bug Test Specification

## Issue #2: Modal doesn't reopen when clicking same node immediately after closing

### Test Scenario 1: Modal should open on first click
**Given:** User is viewing the tree with multiple nodes
**When:** User clicks on a person node (e.g., "John Doe")
**Then:**
- PersonModal should open
- Modal should display "John Doe"'s information
- `isModalOpen` should be `true`
- `editingPerson` should reference the John Doe person object

### Test Scenario 2: Modal should close when user dismisses it
**Given:** Modal is open showing "John Doe"'s information
**When:** User clicks the close button (X) or clicks backdrop or presses ESC
**Then:**
- PersonModal should close
- `isModalOpen` should be `false`
- `editingPerson` should be `null`

### Test Scenario 3: Modal should reopen when clicking same node after closing (BUG)
**Given:** Modal was just closed after viewing "John Doe"
**When:** User immediately clicks the "John Doe" node again
**Then:**
- PersonModal should open again
- Modal should display "John Doe"'s information
- `isModalOpen` should be `true`
- `editingPerson` should reference the John Doe person object

**Current Behavior (BUG):** Modal does not reopen

**Expected Behavior:** Modal should reopen every time a node is clicked, regardless of whether it was just closed

### Test Scenario 4: Modal should open for different nodes
**Given:** Modal was closed after viewing "John Doe"
**When:** User clicks on a different node (e.g., "Jane Doe")
**Then:**
- PersonModal should open
- Modal should display "Jane Doe"'s information
- `isModalOpen` should be `true`
- `editingPerson` should reference the Jane Doe person object

### Test Scenario 5: Modal should switch between nodes without closing
**Given:** Modal is open showing "John Doe"
**When:** User clicks on a different node (e.g., "Jane Doe")
**Then:**
- Modal should remain open (or close and immediately reopen)
- Modal should now display "Jane Doe"'s information
- `isModalOpen` should be `true`
- `editingPerson` should reference the Jane Doe person object

## Root Cause Hypothesis

The bug likely occurs because:

1. **Same Object Reference**: When clicking the same node twice, Svelte might not detect a change if `editingPerson` is set to the same object reference
2. **State Update Timing**: The `handleEditPerson` function sets both `editingPerson` and `isModalOpen` in the same function call, which might not trigger proper reactivity
3. **Modal Component Lifecycle**: The `PersonModal` component might not properly reset when `isOpen` transitions from `false` back to `true` if the `person` prop hasn't changed

## Proposed Solution

**Option 1: Force state reset before opening**
```javascript
function handleEditPerson(event) {
  // Force a clean slate by ensuring modal is closed first
  isModalOpen = false
  editingPerson = null

  // Use setTimeout or tick() to ensure state change is processed
  setTimeout(() => {
    editingPerson = event.detail
    isModalOpen = true
  }, 0)
}
```

**Option 2: Add a key to PersonModal to force re-render**
```svelte
<PersonModal
  key={editingPerson?.id}  <!-- Forces component to remount when person changes -->
  person={editingPerson}
  {people}
  {relationships}
  isOpen={isModalOpen}
  on:close={handleModalClose}
  on:submit={handleModalSubmit}
  on:delete={handleDeletePerson}
/>
```

**Option 3: Use Svelte's tick() for proper timing**
```javascript
import { tick } from 'svelte'

async function handleEditPerson(event) {
  // Close modal first if needed
  if (isModalOpen) {
    isModalOpen = false
    await tick()  // Wait for Svelte to process the change
  }

  editingPerson = event.detail
  isModalOpen = true
}
```

**Option 4: Track modal opening with a counter or timestamp**
```javascript
let modalKey = 0

function handleEditPerson(event) {
  editingPerson = event.detail
  isModalOpen = true
  modalKey++  // Increment to force re-render
}
```

## Test Validation Criteria

After implementing the fix:
1. Click a node → Modal opens (PASS)
2. Close modal → Modal closes (PASS)
3. Click the same node again → Modal opens (MUST PASS - currently fails)
4. Click a different node → Modal opens with new person (PASS)
5. Click same node multiple times in succession → Modal opens every time (MUST PASS)

## Manual Testing Steps

1. Start the dev server: `npm run dev`
2. Navigate to the tree view (default route)
3. Click on any person node → Verify modal opens
4. Close the modal using the X button
5. Immediately click the same node again → Verify modal opens (BUG: currently fails)
6. Close modal and click a different node → Verify modal opens
7. With modal open, click another node → Verify modal updates to new person
8. Repeat step 4-5 several times to ensure consistency
