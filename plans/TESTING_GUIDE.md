# Manual Testing Guide for Issue #2 Fix

## Issue #2: Modal Re-open Bug Fix
**Problem:** Modal doesn't reopen when clicking the same node immediately after closing it.
**Solution:** Modified `handleEditPerson` in App.svelte to use Svelte's `tick()` function to ensure proper state cleanup before reopening.

## Prerequisites
1. Ensure backend is running: `cd backend && go run main.go`
2. Ensure frontend is running: `cd frontend && npm run dev`
3. Navigate to http://localhost:5173 (or the URL shown by Vite)
4. Ensure there are at least 2-3 people in the family tree

## Test Cases

### Test Case 1: First Click Opens Modal
**Steps:**
1. View the tree visualization
2. Click on any person node (e.g., "John Doe")

**Expected Result:**
- Modal opens immediately
- Modal displays the person's information
- Modal title shows "Update Person" (or person's name)

**Status:** [ ] PASS [ ] FAIL

---

### Test Case 2: Modal Closes Properly
**Steps:**
1. With modal open from Test Case 1
2. Click the "X" close button in the top-right corner

**Expected Result:**
- Modal closes smoothly
- Tree view is visible again
- No errors in browser console

**Status:** [ ] PASS [ ] FAIL

---

### Test Case 3: Same Node Re-opens (PRIMARY BUG FIX)
**Steps:**
1. Complete Test Case 2 (modal just closed)
2. **Immediately** click the same person node again (e.g., "John Doe")

**Expected Result:**
- Modal opens again
- Modal displays the same person's information
- No delay or hesitation
- No errors in browser console

**Previous Behavior (BUG):** Modal did not reopen
**Fixed Behavior:** Modal should reopen immediately

**Status:** [ ] PASS [ ] FAIL

---

### Test Case 4: Rapid Same-Node Clicks
**Steps:**
1. Close the modal
2. Click the same node
3. Wait for modal to open
4. Close the modal again
5. Click the same node again
6. Repeat steps 4-5 three more times

**Expected Result:**
- Modal opens every single time without fail
- No degradation in responsiveness
- No errors in browser console

**Status:** [ ] PASS [ ] FAIL

---

### Test Case 5: Different Node Opens Modal
**Steps:**
1. Close the modal after viewing "John Doe"
2. Click on a different person node (e.g., "Jane Doe")

**Expected Result:**
- Modal opens immediately
- Modal displays the new person's information
- No errors in browser console

**Status:** [ ] PASS [ ] FAIL

---

### Test Case 6: Switching Between Nodes Without Closing
**Steps:**
1. Open modal for "John Doe"
2. While modal is still open, click on a different node (e.g., "Jane Doe")

**Expected Result:**
- Modal content updates to show "Jane Doe"
- Modal remains open (may briefly close and reopen - this is expected behavior)
- No errors in browser console

**Status:** [ ] PASS [ ] FAIL

---

### Test Case 7: Close Via Backdrop Click, Then Reopen
**Steps:**
1. Open modal for any person
2. Click on the dark area outside the modal (backdrop)
3. Modal should close
4. Click the same person node again

**Expected Result:**
- Modal reopens successfully
- Same behavior as Test Case 3

**Status:** [ ] PASS [ ] FAIL

---

### Test Case 8: Close Via ESC Key, Then Reopen
**Steps:**
1. Open modal for any person
2. Press the ESC key on keyboard
3. Modal should close
4. Click the same person node again

**Expected Result:**
- Modal reopens successfully
- Same behavior as Test Case 3

**Status:** [ ] PASS [ ] FAIL

---

### Test Case 9: Performance - No Lag
**Steps:**
1. Rapidly open and close the modal for the same node 10 times
2. Monitor browser console for warnings/errors
3. Check for any visual lag or stuttering

**Expected Result:**
- All 10 open/close cycles work correctly
- No memory leaks
- No console errors
- Smooth animations throughout

**Status:** [ ] PASS [ ] FAIL

---

### Test Case 10: Edge Case - Spouse Node Click
**Steps:**
1. If a person has a spouse displayed next to them in the tree
2. Click the spouse's node
3. Close the modal
4. Click the same spouse node again

**Expected Result:**
- Modal reopens successfully
- Fix works for spouse nodes as well as regular nodes

**Status:** [ ] PASS [ ] FAIL

---

## Technical Validation

### Code Review Checklist
- [x] `tick()` imported from 'svelte'
- [x] `handleEditPerson` is now async
- [x] Modal state check: `if (isModalOpen)` before reopening
- [x] `isModalOpen = false` followed by `await tick()` for cleanup
- [x] `editingPerson` and `isModalOpen` set after cleanup
- [x] Comments explain the fix

### Browser Console Checks
During testing, verify:
- [ ] No JavaScript errors
- [ ] No React/Svelte warnings
- [ ] No infinite loops or excessive re-renders
- [ ] Network tab shows no unexpected API calls

---

## Regression Testing

Verify that existing functionality still works:

### ListView Still Works
**Steps:**
1. Navigate to `#/list` (List View)
2. Add a new person
3. Edit an existing person
4. Delete a person

**Expected Result:**
- All operations work as before
- No regressions introduced

**Status:** [ ] PASS [ ] FAIL

---

### Tree View Navigation Works
**Steps:**
1. Return to default tree view
2. Test zoom in/out
3. Test pan/drag
4. Test clicking various nodes

**Expected Result:**
- All tree interactions work normally
- No interference with modal fix

**Status:** [ ] PASS [ ] FAIL

---

### FAB Button Works
**Steps:**
1. In tree view, click the floating "+" button
2. Modal should open for adding new person
3. Close modal
4. Click "+" again

**Expected Result:**
- Add person modal opens every time
- No interference from the fix

**Status:** [ ] PASS [ ] FAIL

---

## How the Fix Works

The bug was caused by Svelte's reactivity system not properly detecting when the modal needed to reopen for the same node. The fix works as follows:

1. **Before:** When clicking the same node twice, `editingPerson` was set to the same object reference and `isModalOpen` was set to `true` when it might already be in transition.

2. **After:** The `handleEditPerson` function now:
   - Checks if the modal is already open
   - If yes, explicitly closes it (`isModalOpen = false`)
   - Waits for Svelte to process this state change (`await tick()`)
   - Then sets the new person and opens the modal

3. **Why `tick()` works:** Svelte's `tick()` returns a promise that resolves once pending state changes have been applied to the DOM. This ensures the modal component properly unmounts/remounts or updates its internal state before trying to open again.

## Success Criteria

All test cases must PASS for the fix to be considered complete:
- Primary bug (Test Case 3) must be fixed
- No regressions in existing functionality
- No new console errors or warnings
- Smooth user experience with no noticeable lag

---

## Tested By

**Name:** _________________
**Date:** _________________
**Browser:** _________________
**OS:** _________________

**Overall Result:** [ ] ALL TESTS PASSED [ ] SOME FAILURES (see notes below)

**Notes:**
