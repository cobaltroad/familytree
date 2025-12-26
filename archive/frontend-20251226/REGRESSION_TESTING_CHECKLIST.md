# Regression Testing Checklist

**Purpose:** Manual QA checklist for validating functionality before releases and after major changes
**Last Updated:** December 26, 2025
**Related Issue:** #65 - Comprehensive Testing and Validation

---

## Pre-Testing Setup

- [ ] Backend server running on http://localhost:8080
- [ ] Frontend server running on http://localhost:5173
- [ ] Fresh database or known test database state
- [ ] Browser console open (check for errors)
- [ ] Network tab open (monitor API calls)

---

## 1. Data Integrity Tests

### 1.1 Database Referential Integrity
- [ ] Create a person with relationships
- [ ] Delete the person
- [ ] Verify all relationships are cascade-deleted
- [ ] Verify no orphaned relationships exist in database
- [ ] Check console for no errors

### 1.2 Parent Relationship Validation
- [ ] Create a child person
- [ ] Add a mother relationship
- [ ] Attempt to add a second mother → Should show error "Person already has a mother"
- [ ] Add a father relationship → Should succeed
- [ ] Attempt to add a second father → Should show error "Person already has a father"
- [ ] Verify only one mother and one father exist for the child

### 1.3 Duplicate Relationship Prevention
- [ ] Create two people (Person A and Person B)
- [ ] Add Person A as spouse of Person B
- [ ] Attempt to add Person A as spouse of Person B again → Should show error "This relationship already exists"
- [ ] Verify only one spouse relationship exists

### 1.4 Self-Referential Relationship Prevention
- [ ] Open modal for a person
- [ ] Attempt to link the person as their own parent → Should be filtered out
- [ ] Attempt to link the person as their own child → Should be filtered out
- [ ] Attempt to link the person as their own spouse → Should be filtered out
- [ ] Verify error message: "A person cannot be related to themselves"

### 1.5 Circular Reference Prevention
- [ ] Create Person A with Person B as child
- [ ] Attempt to add Person A as child of Person B → Should be filtered out
- [ ] Verify no circular parent-child relationships can be created

---

## 2. CRUD Operations

### 2.1 Create Person
- [ ] Click "Add Person" link in top-right navigation
- [ ] Modal opens in "Add Mode"
- [ ] Fill in all fields:
  - First Name: "Jane"
  - Last Name: "Doe"
  - Birth Date: "1990-05-15"
  - Death Date: (leave empty)
  - Gender: Select "Female"
- [ ] Click "Add Person" button
- [ ] Success notification appears (green toast, top-right)
- [ ] Modal closes
- [ ] New person appears in visualizations
- [ ] Database updated (check via API or dev tools)

### 2.2 Read/View Person
- [ ] Click on a person node in tree visualization
- [ ] Modal opens showing person details
- [ ] Verify all fields display correctly:
  - Name
  - Birth date
  - Death date (if deceased)
  - Gender
  - Lifespan indicator
- [ ] Verify relationships display correctly:
  - Parents section (if applicable)
  - Siblings section (if applicable)
  - Children section (if applicable)
  - Spouses section (if applicable)

### 2.3 Update Person
- [ ] Open modal for existing person
- [ ] Update First Name to "Janet"
- [ ] Update Birth Date to "1990-06-20"
- [ ] Click "Update Person" button
- [ ] Success notification appears
- [ ] Modal stays open with updated data
- [ ] Changes reflected in visualizations immediately (optimistic update)
- [ ] Database updated (refresh page to verify persistence)

### 2.4 Delete Person
- [ ] Open modal for person with NO relationships
- [ ] Click "Delete Person" button (bottom-right)
- [ ] Confirmation dialog appears
- [ ] Click "Delete" to confirm
- [ ] Success notification appears
- [ ] Modal closes
- [ ] Person removed from visualizations
- [ ] Database updated (person deleted)

### 2.5 Delete Person with Relationships
- [ ] Open modal for person WITH relationships (children, spouse, etc.)
- [ ] Click "Delete Person" button
- [ ] Confirmation dialog appears with warning about cascade delete
- [ ] Click "Delete" to confirm
- [ ] All relationships cascade-deleted
- [ ] Person and relationships removed from database
- [ ] Other related people still exist (only relationships deleted)

---

## 3. Relationship Management (UI Workflows)

### 3.1 Add Mother (Quick Add)
- [ ] Open modal for person WITHOUT a mother
- [ ] Orange "+ Add Mother" button visible in Parents section
- [ ] Click "+ Add Mother"
- [ ] Quick Add Mother form expands inline
- [ ] Form pre-fills:
  - Gender: "Female" (disabled)
  - Last Name: (inherited from child)
- [ ] Fill in First Name: "Mary"
- [ ] Fill in Birth Date: "1965-03-10"
- [ ] Click "Add Mother"
- [ ] Success notification appears
- [ ] Mother created AND relationship created atomically
- [ ] Mother appears in Parents section
- [ ] Quick Add form collapses
- [ ] "+ Add Mother" button disappears (already has mother)

### 3.2 Add Father (Quick Add)
- [ ] Open modal for person WITHOUT a father
- [ ] Orange "+ Add Father" button visible in Parents section
- [ ] Click "+ Add Father"
- [ ] Quick Add Father form expands inline
- [ ] Form pre-fills:
  - Gender: "Male" (disabled)
  - Last Name: (inherited from child)
- [ ] Fill in First Name: "John"
- [ ] Fill in Birth Date: "1963-07-22"
- [ ] Click "Add Father"
- [ ] Success notification appears
- [ ] Father created AND relationship created atomically
- [ ] Father appears in Parents section
- [ ] Quick Add form collapses
- [ ] "+ Add Father" button disappears (already has father)

### 3.3 Add Child (Quick Add)
- [ ] Open modal for any person (potential parent)
- [ ] Blue "+ Add Child" button visible in Children section
- [ ] Click "+ Add Child"
- [ ] Quick Add Child form expands inline
- [ ] Form pre-fills:
  - Last Name: (inherited from parent)
- [ ] Fill in First Name: "Emily"
- [ ] Select Gender: "Female"
- [ ] Fill in Birth Date: "2015-09-05"
- [ ] Select Parent Role: "Mother" or "Father"
- [ ] Click "Add Child"
- [ ] Success notification appears
- [ ] Child created AND relationship created atomically
- [ ] Child appears in Children section
- [ ] Quick Add form collapses

### 3.4 Add Spouse (Quick Add)
- [ ] Open modal for any person
- [ ] Purple "+ Add Spouse" button visible in Spouses section
- [ ] Click "+ Add Spouse"
- [ ] Quick Add Spouse form expands inline
- [ ] Fill in all fields:
  - First Name: "Michael"
  - Last Name: "Smith"
  - Birth Date: "1988-11-30"
  - Gender: "Male"
- [ ] Click "Add Spouse"
- [ ] Success notification appears
- [ ] Spouse created AND bidirectional relationship created
- [ ] Spouse appears in Spouses section
- [ ] Quick Add form collapses
- [ ] Can add multiple spouses (button remains visible)

### 3.5 Link Existing Person as Parent
- [ ] Open modal for person WITHOUT a mother
- [ ] Click "Link Existing Mother" button
- [ ] Autocomplete dropdown appears
- [ ] Type to search for existing person
- [ ] Verify filtering works:
  - Person themselves excluded
  - Existing mother excluded (if any)
  - Descendants excluded (children, grandchildren)
  - People too young excluded (age validation)
- [ ] Select valid person from dropdown
- [ ] Click "Link as Mother"
- [ ] Success notification appears
- [ ] Relationship created (person linked as mother)
- [ ] Mother appears in Parents section
- [ ] Link form collapses

### 3.6 Link Existing Person as Child
- [ ] Open modal for any person (potential parent)
- [ ] Click "Link Existing Child" button
- [ ] Autocomplete dropdown appears
- [ ] Type to search for existing person
- [ ] Verify filtering works:
  - Person themselves excluded
  - Existing children excluded
  - Ancestors excluded (parents, grandparents)
  - Descendants of existing children excluded (grandchildren)
  - People too old excluded (age validation: parent must be 13+ years older)
- [ ] Select valid person from dropdown
- [ ] Select Parent Role: "Mother" or "Father"
- [ ] Click "Link as Child"
- [ ] Success notification appears
- [ ] Relationship created
- [ ] Child appears in Children section
- [ ] Link form collapses

### 3.7 Link Existing Person as Spouse
- [ ] Open modal for any person
- [ ] Click "Link Existing Spouse" button
- [ ] Autocomplete dropdown appears
- [ ] Type to search for existing person
- [ ] Verify filtering works:
  - Person themselves excluded
  - Existing spouses excluded
  - Descendants excluded (children, grandchildren)
  - Ancestors excluded (parents, grandparents)
  - People with age difference >50 years excluded
- [ ] Select valid person from dropdown
- [ ] Click "Link as Spouse"
- [ ] Success notification appears
- [ ] Bidirectional relationship created
- [ ] Spouse appears in Spouses section for both people
- [ ] Link form collapses

### 3.8 Remove Relationship
- [ ] Open modal for person with relationships
- [ ] Click "Remove" button next to a relationship (e.g., remove spouse)
- [ ] Confirmation dialog appears
- [ ] Click "Delete" to confirm
- [ ] Success notification appears
- [ ] Relationship deleted from database
- [ ] Relationship card removed from UI
- [ ] Bidirectional relationships removed (for spouse)
- [ ] Person entities remain (only relationship deleted)

---

## 4. UI Component Workflows

### 4.1 Modal Behavior
- [ ] Open modal by clicking person node in tree
- [ ] Modal displays with correct person data
- [ ] Sticky header with close button (X) visible
- [ ] Sticky footer with buttons visible
- [ ] Content area scrollable (if content exceeds viewport)
- [ ] Close button always accessible at top-right
- [ ] Click close button → Modal closes
- [ ] Click backdrop → Modal closes
- [ ] Press Escape key → Modal closes

### 4.2 Modal Re-open Bug (Issue #2) - FIXED
- [ ] Click on person node → Modal opens
- [ ] Close modal (any method)
- [ ] **Immediately** click same person node again
- [ ] Modal should reopen with same person (not stuck closed)
- [ ] Repeat 3-4 times to verify consistency
- [ ] Click different person → Modal opens with new person

### 4.3 Modal Navigation Between People
- [ ] Open modal for Person A
- [ ] Click on a relationship card (e.g., mother)
- [ ] Modal updates to show mother's details
- [ ] Click on another relationship card (e.g., spouse of mother)
- [ ] Modal updates to show spouse's details
- [ ] Browser back button NOT affected (modal state separate from routing)
- [ ] Navigate through 5-6 people via relationship cards
- [ ] Verify smooth transitions and data loading

### 4.4 Responsive Modal Layout

#### Desktop/Tablet (>=768px width)
- [ ] Open modal on desktop browser
- [ ] Two-column layout visible:
  - Left: Personal information form (white background)
  - Right: Relationships display (gray background)
- [ ] Relationship cards in grid:
  - 3 cards per row on desktop (>=1024px)
  - 2 cards per row on tablet (768-1023px)
- [ ] All sections visible without scrolling (up to max-height 70vh)
- [ ] Hover over relationship card → Lift animation and green border
- [ ] Click card → Navigate to that person

#### Mobile (<768px width)
- [ ] Resize browser to <768px or use mobile device
- [ ] Single-column layout visible
- [ ] Collapsible sections:
  - Personal Information (expanded by default)
  - Parents (collapsed, shows count badge)
  - Siblings (collapsed, shows count badge)
  - Children (collapsed, shows count badge)
  - Spouses (collapsed, shows count badge)
- [ ] Click section header → Expands with smooth slide transition
- [ ] Chevron icon rotates to indicate state
- [ ] Click expanded section header → Collapses
- [ ] Only one section expanded at a time (progressive disclosure)
- [ ] Relationship cards full-width (1 per row)
- [ ] Touch targets >=48px (WCAG 2.1 AA compliance)

### 4.5 Form Validation
- [ ] Open modal in Add Mode
- [ ] Leave First Name empty
- [ ] Click "Add Person"
- [ ] Validation error appears (HTML5 required field)
- [ ] Enter First Name
- [ ] Leave Last Name empty
- [ ] Click "Add Person"
- [ ] Validation error appears
- [ ] Fill in both names
- [ ] Enter invalid Birth Date (e.g., "99/99/9999")
- [ ] Validation error appears
- [ ] Enter valid Birth Date
- [ ] Enter Death Date before Birth Date
- [ ] Validation error or warning appears
- [ ] Fix dates
- [ ] Click "Add Person" → Success

### 4.6 Notification System
- [ ] Perform successful action (e.g., update person)
- [ ] Green success toast appears in top-right corner
- [ ] Toast auto-dismisses after 3 seconds
- [ ] Toast can be manually dismissed (click X)
- [ ] Perform error action (e.g., add duplicate parent)
- [ ] Red error toast appears
- [ ] Error message descriptive and helpful
- [ ] Toast auto-dismisses after 5 seconds
- [ ] Multiple toasts stack vertically (if rapid actions)

### 4.7 Collapsible Action Panels (Issue #56)
- [ ] Open modal for person without mother
- [ ] Parents section shows "+ Add Mother" button
- [ ] Click button → Panel expands with Quick Add Mother form
- [ ] Click "Cancel" → Panel collapses
- [ ] Click "+ Add Mother" again → Panel re-expands
- [ ] Open "+ Add Child" panel
- [ ] Verify "+ Add Mother" panel stays open (different group)
- [ ] Open "+ Add Father" panel
- [ ] Verify "+ Add Mother" panel auto-collapses (same group: parents)
- [ ] Open "+ Add Spouse" panel
- [ ] Verify parent panels stay open (different group)

---

## 5. Visualization Views

### 5.1 Pedigree View (Default)
- [ ] Navigate to `http://localhost:5173/#/` or `#/pedigree`
- [ ] Pedigree chart displays with compact ancestor boxes
- [ ] Focus person selector dropdown visible at top
- [ ] Select different person from dropdown
- [ ] Chart updates to show new focus person's ancestors
- [ ] Ancestors expand upward (parents, grandparents, etc.)
- [ ] Generation labels visible (G0=focus, G1=parents, G2=grandparents)
- [ ] Boxes colored by gender:
  - Male: Light blue (#AED6F1)
  - Female: Light pink (#F8BBD0)
  - Other/Unspecified: Gray (#E0E0E0)
- [ ] Click on any person box → Modal opens
- [ ] Zoom and pan work smoothly:
  - Mouse wheel to zoom in/out
  - Click and drag to pan
  - Zoom state preserved during data updates
- [ ] Limited to 4-5 generations for performance

### 5.2 Timeline View
- [ ] Navigate to `#/timeline`
- [ ] Horizontal bars show lifespans (birth to death or present)
- [ ] Sort controls visible:
  - Sort by Birth Year
  - Sort by Generation
- [ ] Click "Sort by Birth Year" → Bars reorder chronologically
- [ ] Click "Sort by Generation" → Bars reorder by family generation
- [ ] Filter controls visible:
  - Show Living
  - Show Deceased
- [ ] Toggle "Show Living" off → Living people hidden
- [ ] Toggle "Show Deceased" off → Deceased people hidden
- [ ] People without birth dates excluded from timeline
- [ ] Click on any bar → Modal opens for that person
- [ ] Bars colored by gender (same color scheme as pedigree)

### 5.3 Radial View
- [ ] Navigate to `#/radial`
- [ ] Circular fan chart displays
- [ ] Focus person at center
- [ ] Ancestors in concentric rings (generations)
- [ ] Focus person selector dropdown visible
- [ ] Select different person from dropdown
- [ ] Chart updates with new focus person at center
- [ ] Text labels rotated for readability on outer rings
- [ ] Nodes colored by gender
- [ ] Click on any node → Modal opens
- [ ] Zoom and pan work smoothly
- [ ] Limited to 5 generations for performance

### 5.4 View Switching
- [ ] Click "Pedigree" tab → Navigates to pedigree view
- [ ] Active tab highlighted
- [ ] Click "Timeline" tab → Navigates to timeline view
- [ ] Click "Radial" tab → Navigates to radial view
- [ ] Click "Add Person" link → Modal opens in add mode
- [ ] Browser back/forward buttons work with hash routing
- [ ] Direct URL navigation works (e.g., `#/timeline`)

### 5.5 D3 Visualization Performance
- [ ] Open pedigree view with person who has 3+ generations of ancestors
- [ ] Add a new parent via modal
- [ ] Chart updates incrementally (only new nodes added, not full redraw)
- [ ] Zoom/pan state preserved during update
- [ ] Smooth 300ms transitions for new nodes
- [ ] No flickering or full chart rebuild
- [ ] Update person name via modal
- [ ] Chart updates node label immediately (optimistic update)
- [ ] Delete person via modal
- [ ] Chart removes node with smooth transition

---

## 6. Edge Cases and Error Handling

### 6.1 Age Validation for Relationships

#### Parent-Child Age Validation
- [ ] Open modal for child born in 2020
- [ ] Click "Link Existing Mother"
- [ ] Verify people born after 2007 are filtered out (parent must be 13+ years older)
- [ ] Person born in 2005 should be excluded
- [ ] Person born in 2000 should be included
- [ ] Select valid mother and link successfully

#### Spouse Age Validation
- [ ] Open modal for person born in 1990
- [ ] Click "Link Existing Spouse"
- [ ] Verify people born before 1940 are filtered out (>50 year age difference)
- [ ] Verify people born after 2040 are filtered out
- [ ] Person born in 1950 should be excluded
- [ ] Person born in 1970 should be included
- [ ] Select valid spouse and link successfully

### 6.2 Missing Data Handling
- [ ] Create person with NO birth date
- [ ] View person in Timeline → Should be excluded
- [ ] View person in Pedigree/Radial → Should appear (date optional)
- [ ] Create person with NO gender
- [ ] Verify gender displays as "Not specified"
- [ ] Verify node colored as gray in visualizations
- [ ] Create person with ONLY first name and last name (minimal data)
- [ ] Verify person can be created and appears in all views

### 6.3 Network Error Handling
- [ ] Stop backend server
- [ ] Attempt to create a person
- [ ] Red error toast appears: "Failed to create person"
- [ ] Modal stays open (data not lost)
- [ ] Optimistic update rolls back (person not added to UI)
- [ ] Restart backend server
- [ ] Click "Add Person" again → Success

### 6.4 Concurrent Updates
- [ ] Open same person modal in two browser tabs
- [ ] Update person name in Tab 1 → Save
- [ ] Update person birth date in Tab 2 → Save
- [ ] Both updates persist (last write wins)
- [ ] Refresh both tabs
- [ ] Verify data consistency (Tab 2's update should be visible)

### 6.5 Large Dataset Performance
- [ ] Create 50+ people with interconnected relationships
- [ ] Open pedigree view → Should render in <2 seconds
- [ ] Zoom and pan → Should be smooth (60fps)
- [ ] Search autocomplete → Should filter instantly (<100ms)
- [ ] Modal open/close → Should be instant (<50ms)
- [ ] Create 100+ relationships
- [ ] GET /api/relationships → Should return in <500ms

### 6.6 Special Characters in Names
- [ ] Create person with name: "O'Brien"
- [ ] Create person with name: "José García"
- [ ] Create person with name: "李明" (Chinese characters)
- [ ] Create person with name: "Müller"
- [ ] Verify all names display correctly in UI
- [ ] Verify autocomplete search works with special characters
- [ ] Verify database stores and retrieves correctly

### 6.7 Date Edge Cases
- [ ] Create person with birth date: "1900-01-01" (old date)
- [ ] Create person with birth date: "2024-12-31" (recent date)
- [ ] Create person with birth date == death date (died on birthday)
- [ ] Create person with birth date in future → Validation error
- [ ] Create person with death date in future → Validation error
- [ ] Verify lifespan calculations correct for all cases

---

## 7. Browser Compatibility

### 7.1 Chrome/Chromium
- [ ] Test all workflows in Chrome (latest version)
- [ ] Verify visualizations render correctly
- [ ] Verify modal animations smooth
- [ ] Check console for no errors

### 7.2 Firefox
- [ ] Test all workflows in Firefox (latest version)
- [ ] Verify visualizations render correctly
- [ ] Verify modal animations smooth
- [ ] Check console for no errors

### 7.3 Safari
- [ ] Test all workflows in Safari (if on macOS)
- [ ] Verify visualizations render correctly
- [ ] Verify modal animations smooth
- [ ] Check console for no errors

### 7.4 Mobile Browsers
- [ ] Test on mobile Chrome (Android or iOS)
- [ ] Verify responsive modal layout
- [ ] Verify touch interactions work (tap, swipe, pinch-zoom)
- [ ] Test on mobile Safari (iOS)
- [ ] Verify same functionality

---

## 8. Accessibility (A11y)

### 8.1 Keyboard Navigation
- [ ] Navigate entire application using only keyboard
- [ ] Tab through all interactive elements
- [ ] Focus indicators visible (green outline)
- [ ] Enter/Space activate buttons
- [ ] Escape closes modal
- [ ] Arrow keys work in dropdowns/selects

### 8.2 Screen Reader Compatibility
- [ ] Enable screen reader (VoiceOver on macOS, NVDA on Windows)
- [ ] Navigate application with screen reader
- [ ] Verify ARIA labels announced correctly
- [ ] Verify relationship counts announced (e.g., "Parents (2)")
- [ ] Verify form labels associated with inputs
- [ ] Verify error messages announced

### 8.3 Color Contrast
- [ ] Verify text has sufficient contrast (WCAG AA: 4.5:1 for normal text)
- [ ] Verify interactive elements distinguishable
- [ ] Verify error messages visible without color (icons, text)

### 8.4 Touch Targets
- [ ] Verify all buttons/links at least 48x48px (WCAG 2.1 AA)
- [ ] Verify adequate spacing between touch targets
- [ ] Test on mobile device

---

## 9. Performance Benchmarks

### 9.1 Initial Load
- [ ] Clear browser cache
- [ ] Navigate to `http://localhost:5173`
- [ ] Measure time to interactive (TTI) → Should be <3 seconds
- [ ] Verify no layout shift (CLS < 0.1)

### 9.2 API Response Times
- [ ] GET /api/people → <500ms
- [ ] GET /api/relationships → <500ms
- [ ] POST /api/people → <200ms
- [ ] PUT /api/people/[id] → <200ms
- [ ] DELETE /api/people/[id] → <200ms

### 9.3 Optimistic Update Perceived Latency
- [ ] Update person name
- [ ] Measure time from button click to UI update → <50ms
- [ ] Create new person
- [ ] Measure time from button click to UI update → <50ms
- [ ] Delete person
- [ ] Measure time from button click to UI update → <50ms

### 9.4 Derived Store Performance (O(1) Lookups)
- [ ] Open browser dev tools
- [ ] Profile person lookup (should be O(1) via Map)
- [ ] Profile relationship lookup (should be O(1) via Map)
- [ ] Verify no O(n) array.find() calls in hot paths

---

## 10. Security Checks

### 10.1 Input Sanitization
- [ ] Attempt SQL injection in name field: `'; DROP TABLE people; --`
- [ ] Verify input escaped/sanitized (no SQL execution)
- [ ] Attempt XSS in name field: `<script>alert('XSS')</script>`
- [ ] Verify script tags not executed (displayed as text)

### 10.2 API Validation
- [ ] Send invalid JSON to POST /api/people
- [ ] Verify 400 error returned
- [ ] Send missing required fields
- [ ] Verify 400 error with helpful message
- [ ] Send invalid data types (string instead of number)
- [ ] Verify 400 error

### 10.3 CORS and CSP
- [ ] Verify CORS headers allow frontend origin
- [ ] Verify CSP headers prevent inline scripts (if configured)
- [ ] Check for no CORS errors in console

---

## 11. Regression Tests for Known Issues

### Issue #1: Parent Names Not Displaying (RESOLVED)
- [ ] Create child with mother and father
- [ ] Open child's modal
- [ ] Verify mother's name displays correctly in Parents section
- [ ] Verify father's name displays correctly in Parents section
- [ ] Verify both relationship cards clickable

### Issue #2: Modal Reopen Bug (RESOLVED)
- [ ] Click person node → Modal opens
- [ ] Close modal
- [ ] Immediately click same node again
- [ ] Verify modal reopens (not stuck closed)
- [ ] Repeat 3 times to ensure consistency

### Issue #3: Gender Display Bug (RESOLVED)
- [ ] Create person with gender "Female"
- [ ] Open person's modal
- [ ] Verify gender radio button "Female" is selected (bold text)
- [ ] Verify gender displays in person info (if in view mode)
- [ ] Update gender to "Male"
- [ ] Verify radio button updates correctly

### Issue #56: Auto-Collapse Panel Behavior (RESOLVED)
- [ ] Open "+ Add Mother" panel
- [ ] Open "+ Add Father" panel
- [ ] Verify "+ Add Mother" panel auto-collapses (same group)
- [ ] Open "+ Add Child" panel
- [ ] Verify parent panels stay open (different group)

### Issue #65: Test Coverage (CURRENT)
- [ ] Run full test suite: `npm test`
- [ ] Verify 93.8%+ tests passing
- [ ] Run relationship tests: `npm test relationships/+server.edgecase.test.js`
- [ ] Verify all 31 tests passing

---

## 12. Post-Deployment Smoke Tests

### 12.1 Critical Path - Happy Path
- [ ] Open application
- [ ] Create person "John Doe" (born 1990)
- [ ] Create person "Jane Doe" (born 1992)
- [ ] Link Jane as spouse of John
- [ ] Quick Add Child "Emily Doe" (born 2020, mother: Jane)
- [ ] Open Emily's modal
- [ ] Verify parents display correctly
- [ ] Navigate to John via relationship card
- [ ] Verify spouse (Jane) and child (Emily) display correctly
- [ ] Delete Emily (with cascade confirmation)
- [ ] Verify Emily removed, John and Jane remain

### 12.2 Multi-Generational Family
- [ ] Create grandparent "Alice Smith" (born 1950)
- [ ] Create parent "Bob Smith" (born 1975, mother: Alice)
- [ ] Create child "Charlie Smith" (born 2000, father: Bob)
- [ ] Open pedigree view with Charlie as focus
- [ ] Verify 3 generations display correctly
- [ ] Open radial view with Charlie as focus
- [ ] Verify 3 generations in concentric rings
- [ ] Open timeline view
- [ ] Verify all 3 people appear chronologically

---

## Sign-Off

**Tester Name:** _______________________
**Date:** _______________________
**Test Environment:** _______________________
**Pass/Fail Summary:**
- Total Checks: _______
- Passed: _______
- Failed: _______
- Blocked: _______

**Critical Issues Found:**
1. _______________________
2. _______________________
3. _______________________

**Notes:**
_______________________
_______________________
_______________________

---

## Appendix: Test Data

### Sample Family for Testing

```
Grandparents:
- Robert Wilson (M, 1945-2020)
- Margaret Wilson (F, 1948)

Parents (Children of Robert & Margaret):
- David Wilson (M, 1970)
- Sarah Johnson (F, 1972)

Spouses:
- David married to Linda Wilson (F, 1973)
- Sarah married to Michael Johnson (M, 1970)

Grandchildren:
- Emma Wilson (F, 2000) - child of David & Linda
- Noah Wilson (M, 2002) - child of David & Linda
- Olivia Johnson (F, 2005) - child of Sarah & Michael
```

**Use this data for:**
- Multi-generational testing
- Sibling relationships
- Spouse relationships
- Deceased person handling

---

**End of Checklist**
