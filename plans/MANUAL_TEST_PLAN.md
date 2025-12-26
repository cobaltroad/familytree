# Manual Test Plan for Story 5: Frontend Integration with SvelteKit API Routes

**Issue:** #64
**Date:** 2025-12-25
**Tested By:** Claude Code

## Pre-Test Setup

1. Start SvelteKit dev server: `cd frontend && npm run dev`
2. Open browser to: `http://localhost:5173`
3. Open browser DevTools (Network tab to verify API calls)

## Test Suite

### 1. Initial Load Test

**Objective:** Verify the app loads and fetches initial data from SvelteKit routes

- [ ] App loads without errors
- [ ] Network tab shows GET requests to `/api/people` and `/api/relationships`
- [ ] No requests to `http://localhost:8080` (Go backend)
- [ ] Pedigree view displays correctly

**Expected Result:** App loads successfully using SvelteKit API routes

---

### 2. People CRUD Operations

#### 2.1 Create Person

**Steps:**
1. Click "Add Person" in top-right navigation
2. Fill in form:
   - First Name: "Test"
   - Last Name: "Person"
   - Gender: "female"
   - Birth Date: "1990-01-01"
3. Click "Add Person" button

**Verify:**
- [ ] Network tab shows POST to `/api/people`
- [ ] Green success toast appears: "Person created successfully"
- [ ] Modal closes
- [ ] New person appears in visualization
- [ ] No errors in console

#### 2.2 Read/View Person

**Steps:**
1. Click on a person node in the pedigree view
2. Modal opens showing person details

**Verify:**
- [ ] Network tab shows GET to `/api/people/[id]` (if needed)
- [ ] Person data displays correctly
- [ ] All fields show correct values
- [ ] No errors in console

#### 2.3 Update Person

**Steps:**
1. With person modal open, click "Edit" button
2. Change First Name to "Updated"
3. Click "Update Person" button

**Verify:**
- [ ] Network tab shows PUT to `/api/people/[id]`
- [ ] Green success toast: "Person updated successfully"
- [ ] Modal updates immediately (optimistic update)
- [ ] Changes persist after modal close/reopen
- [ ] No errors in console

#### 2.4 Delete Person

**Steps:**
1. Open person modal
2. Click "Delete" button
3. Confirm deletion in confirmation dialog

**Verify:**
- [ ] Confirmation dialog appears
- [ ] Network tab shows DELETE to `/api/people/[id]`
- [ ] Green success toast: "Person deleted successfully"
- [ ] Modal closes
- [ ] Person removed from visualization
- [ ] No errors in console

---

### 3. Relationships CRUD Operations

#### 3.1 Create Mother Relationship (QuickAddParent)

**Steps:**
1. Create or open a person with no mother
2. Click "+ Add Mother" button
3. Fill in:
   - First Name: "Mother"
   - Last Name: "Test"
   - Gender: "female" (pre-selected)
4. Click "Add Mother" button

**Verify:**
- [ ] Network tab shows POST to `/api/people` (create mother)
- [ ] Network tab shows POST to `/api/relationships` (create relationship)
- [ ] Relationship type normalized to "parentOf" with parent_role="mother"
- [ ] Green success toast appears
- [ ] Mother appears in relationships section
- [ ] No errors in console

#### 3.2 Create Father Relationship (QuickAddParent)

**Steps:**
1. Create or open a person with no father
2. Click "+ Add Father" button
3. Fill in father details
4. Click "Add Father" button

**Verify:**
- [ ] Network tab shows correct POST requests
- [ ] Relationship normalized to "parentOf" with parent_role="father"
- [ ] Success toast appears
- [ ] Father appears in relationships section

#### 3.3 Create Child Relationship (QuickAddChild)

**Steps:**
1. Open a person modal
2. Click "+ Add Child" button
3. Fill in child details
4. Click "Add Child" button

**Verify:**
- [ ] Network tab shows POST to `/api/people` and `/api/relationships`
- [ ] Success toast appears
- [ ] Child appears in Children section
- [ ] Relationship correctly shows parent as mother or father

#### 3.4 Create Spouse Relationship (QuickAddSpouse)

**Steps:**
1. Open a person modal
2. Click "+ Add Spouse" button
3. Fill in spouse details
4. Click "Add Spouse" button

**Verify:**
- [ ] Network tab shows correct POST requests
- [ ] Relationship type is "spouse" (not normalized)
- [ ] Success toast appears
- [ ] Spouse appears in Spouses section

#### 3.5 Delete Relationship

**Steps:**
1. Open a person with relationships
2. Click the "X" button on a relationship card
3. Confirm deletion

**Verify:**
- [ ] Network tab shows DELETE to `/api/relationships/[id]`
- [ ] Success toast appears
- [ ] Relationship removed from UI
- [ ] Other person still exists (only relationship deleted)

---

### 4. Visualization Views

#### 4.1 Pedigree View

**Steps:**
1. Navigate to Pedigree view (default view)
2. Change focus person via dropdown
3. Click on different nodes

**Verify:**
- [ ] View renders correctly with SvelteKit data
- [ ] Focus person selector works
- [ ] Clicking nodes opens modal
- [ ] No errors in console

#### 4.2 Timeline View

**Steps:**
1. Click "Timeline" tab in navigation
2. Try different sort options
3. Toggle living/deceased filters

**Verify:**
- [ ] Timeline renders with correct data
- [ ] Sorting works correctly
- [ ] Filters work correctly
- [ ] Clicking bars opens modal

#### 4.3 Radial View

**Steps:**
1. Click "Radial" tab in navigation
2. Change focus person
3. Click on nodes

**Verify:**
- [ ] Radial view renders correctly
- [ ] Focus person selector works
- [ ] Clicking nodes opens modal
- [ ] Zoom/pan works

---

### 5. Error Handling

#### 5.1 Validation Errors

**Steps:**
1. Try to create person with empty required fields
2. Submit form

**Verify:**
- [ ] Network tab shows 400 error response
- [ ] Red error toast appears with helpful message
- [ ] Form remains open for correction
- [ ] No console errors (error is handled)

#### 5.2 Not Found Errors

**Steps:**
1. Manually edit URL to access non-existent person ID
   - Or delete a person and try to access it

**Verify:**
- [ ] Network tab shows 404 error
- [ ] Error toast appears
- [ ] App doesn't crash
- [ ] User can continue using app

#### 5.3 Duplicate Parent Errors

**Steps:**
1. Create a person with a mother
2. Try to add a second mother

**Verify:**
- [ ] Network tab shows 400 error
- [ ] Red error toast: "Person already has a mother"
- [ ] Relationship not created
- [ ] Form can be cancelled/closed

---

### 6. Data Consistency

#### 6.1 Referential Integrity

**Steps:**
1. Create parent-child relationship
2. Delete parent
3. Check that relationship is also deleted

**Verify:**
- [ ] Both person and relationships deleted
- [ ] Child person still exists
- [ ] No orphaned relationships
- [ ] UI updates correctly

#### 6.2 Multi-Generational Tree

**Steps:**
1. Create a 3-generation family tree:
   - Grandparent
   - Parent (child of grandparent)
   - Child (child of parent)
2. Navigate between all people
3. Verify relationships in all views

**Verify:**
- [ ] All relationships display correctly
- [ ] All views show correct tree structure
- [ ] No data inconsistencies
- [ ] Navigation works smoothly

---

### 7. Optimistic Updates

#### 7.1 Update Person (Optimistic)

**Steps:**
1. Open person modal
2. Update a field
3. Observe UI behavior before API response

**Verify:**
- [ ] UI updates immediately (before network request completes)
- [ ] Toast appears after successful response
- [ ] If API fails, UI rolls back to previous state

#### 7.2 Delete Person (Optimistic)

**Steps:**
1. Delete a person
2. Observe UI behavior

**Verify:**
- [ ] Person removed from UI immediately
- [ ] Toast confirms deletion
- [ ] If API fails, person reappears with error toast

---

### 8. Performance

**Steps:**
1. Create 20+ people with various relationships
2. Navigate between views
3. Perform CRUD operations

**Verify:**
- [ ] App remains responsive
- [ ] Views update smoothly
- [ ] No significant lag
- [ ] Network requests are efficient (no unnecessary calls)

---

## Final Verification

### Network Tab Check
- [ ] ALL API calls use `/api/*` (relative paths)
- [ ] NO calls to `http://localhost:8080` (Go backend)
- [ ] All requests return successful responses (200, 201, 204)

### Console Check
- [ ] No JavaScript errors
- [ ] No React/Svelte warnings (except pre-existing A11y warnings)
- [ ] No network errors

### Functional Check
- [ ] All CRUD operations work correctly
- [ ] All views render correctly
- [ ] All Quick Add workflows work
- [ ] Error handling works as expected
- [ ] Toast notifications display correctly

---

## Test Results

**Date Tested:** _____________

**All Tests Passed:** [ ] YES [ ] NO

**Issues Found:**
1. _______________________________________
2. _______________________________________
3. _______________________________________

**Tested By:** _____________________________

**Notes:**
________________________________________________________________
________________________________________________________________
________________________________________________________________
