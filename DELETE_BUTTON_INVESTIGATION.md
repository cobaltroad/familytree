# Delete Button Investigation

## Problem Report
User reported not seeing delete buttons for parent and child relationships.

## Investigation Results

### Current Implementation Status
The delete buttons ARE implemented for both parent and child relationships. All tests pass.

### How Delete Buttons Work

**Desktop/Tablet (>=768px):**
- Delete buttons appear **on hover** only
- Hover over any parent, child, or spouse card to reveal the delete button
- This is intentional UX design to keep the interface clean when not in use

**Mobile (<768px):**
- Delete buttons are **always visible** on relationship cards
- No hover needed (touch devices don't support hover states)

### Code Implementation

**PersonModal.svelte:**
- Lines 410-427: Mother and Father cards include `relationship` prop and `on:delete` handler
- Lines 536-543: Child cards include `relationship` prop and `on:delete` handler
- Both use `handleDeleteRelationship` to show a confirmation dialog

**RelationshipCard.svelte:**
- Line 83: `$: showDeleteButton = relationship && (isMobile || isHovering)`
- Delete button visibility logic:
  - Always show on mobile (`isMobile`)
  - Show on desktop only when hovering (`isHovering`)
  - Only show if `relationship` prop exists

### Test Coverage

All relationship deletion tests pass (11 tests):

**Parent Deletion (6 tests):**
- Mother card with delete handler ✓
- Father card with delete handler ✓
- Confirmation dialog for mother ✓
- Confirmation dialog for father ✓
- Correct message in dialog ✓
- Mobile support ✓

**Child Deletion (4 tests):**
- Child card with delete handler ✓
- Confirmation dialog ✓
- Correct message in dialog ✓
- Mobile support ✓

**Sibling Relationships (1 test):**
- NO delete button (siblings are computed, not stored) ✓

## User Testing Instructions

### Desktop/Tablet Testing:
1. Open the app at http://localhost:5174
2. Open PersonModal for a person with parents (e.g., Alice Doe)
3. Look at the parent cards (Mother, Father)
4. **HOVER** your mouse over the card
5. The delete button (trash icon 🗑) should appear on the right side
6. Click the delete button to see confirmation dialog

### Mobile Testing:
1. Resize browser window to <768px width
2. Open PersonModal for a person with parents
3. Expand "Parents" collapsible section
4. Delete buttons should be **always visible** (no hover needed)

## Possible User Issues

### Issue 1: Not Aware of Hover Behavior
**Symptom:** User doesn't see delete buttons on desktop
**Solution:** Hover over the relationship card to reveal the button

### Issue 2: Relationship Object Not Found
**Symptom:** Delete button never appears even on hover
**Root Cause:** `findRelationshipObject()` returns null
**Solution:** Check database to ensure relationship records exist with correct structure

### Issue 3: Browser/Display Issue
**Symptom:** Delete button hidden by CSS or rendering issue
**Solution:** Check browser console for errors, try different browser

## Recommendation

If the user still can't see delete buttons after hovering, we should:

1. Add a visual indicator that cards are hoverable (e.g., cursor change, subtle hint)
2. Consider always showing delete buttons (not just on hover) for better discoverability
3. Add tooltip or help text explaining hover behavior

## Next Steps

Please test the hover behavior on desktop and confirm:
1. Can you see delete buttons when you hover over parent cards?
2. Can you see delete buttons when you hover over child cards?
3. Are you testing on mobile (<768px) where buttons should always be visible?

If hover doesn't work, we may need to investigate browser-specific issues or change the UX to always show delete buttons.
