# Default Person User Stories

**Epic:** Authentication & Multi-User Support (Extension)
**Feature:** Default Person (Self Person) Auto-Creation
**Created:** 2025-12-27
**Status:** Ready for Grooming
**Supporting Documentation:** `/plans/DEFAULT_PERSON_EXPLORATION.md`

---

## Story #81: Auto-Create Default Person from Facebook Profile on First Login

**Priority:** HIGH
**Estimated Complexity:** Medium (3-4 days)
**Dependencies:** Issues #77 (Photo Storage), #79 (Facebook Permissions)
**Blocked By:** Issues #77, #79
**Blocks:** Story #82 (Default Person Focus)

### User Story

As a **family historian signing up for the first time**
I want my Facebook profile to automatically create my Person record in the family tree
So that I can immediately start building my family tree without manually entering my own information

### Acceptance Criteria (BDD Format)

#### AC1: Database schema supports default Person link

```gherkin
Given the users table exists in the database schema
When I run the database migration
Then a new column default_person_id should be added to users table
And the column should accept integer values (foreign key to people.id)
And the column should be nullable (optional)
And the column should have ON DELETE SET NULL constraint
And an index users_default_person_id_idx should be created
```

**Test Requirements:**
- Unit test: Drizzle schema validates `defaultPersonId` field definition
- Integration test: Foreign key constraint enforced (cannot set invalid Person ID)
- Migration test: Existing users have `defaultPersonId = null` after migration

---

#### AC2: Person created from Facebook profile on first login

```gherkin
Given I am a new user logging in with Facebook for the first time
And my Facebook profile has:
  - Name: "Sarah Chen"
  - Gender: "female"
  - Birthday: "03/15/1992"
  - Profile Picture URL: "https://graph.facebook.com/12345/picture"
When the OAuth callback completes
Then a new Person record should be created with:
  - firstName: "Sarah"
  - lastName: "Chen"
  - gender: "female"
  - birthDate: "1992-03-15"
  - photoUrl: "https://graph.facebook.com/12345/picture"
  - userId: <my user ID>
And the Person ID should be stored in users.defaultPersonId
And the JWT token should include defaultPersonId
```

**Test Requirements:**
- Unit test: `createPersonFromFacebookProfile()` extracts name correctly
- Unit test: `parseFacebookBirthday()` converts MM/DD/YYYY to ISO format
- Integration test: End-to-end OAuth flow creates Person
- Integration test: User record updated with defaultPersonId

---

#### AC3: Existing Person reused on subsequent logins

```gherkin
Given I am a returning user
And I already have a default Person (defaultPersonId = 5)
When I log in with Facebook again
Then the existing Person (ID 5) should be retrieved
And NO new Person record should be created
And the JWT token should include defaultPersonId = 5
And the Person data should NOT be overwritten by Facebook profile
```

**Test Requirements:**
- Integration test: Second login does not create duplicate Person
- Unit test: `ensureDefaultPerson()` returns existing Person if defaultPersonId set
- E2E test: User logs in, edits Person, logs out, logs in again → edits preserved

---

#### AC4: Handle partial Facebook profile data gracefully

```gherkin
Given I am a new user with a Facebook profile that has:
  - Name: "Madonna" (single name, no last name)
  - Gender: <permission denied>
  - Birthday: "1985" (year only, no month/day)
When the OAuth callback completes
Then a Person record should be created with:
  - firstName: "Madonna"
  - lastName: "User" (default placeholder)
  - gender: null (not provided)
  - birthDate: "1985-01-01" (year with Jan 1 placeholder)
And the Person should be successfully linked to my user account
```

**Test Requirements:**
- Unit test: Single name handled correctly (lastName defaults to "User")
- Unit test: Missing gender results in null
- Unit test: YYYY-only birthday converts to YYYY-01-01
- Unit test: MM/DD birthday (no year) results in null birthDate

---

#### AC5: Handle edge case of deleted default Person

```gherkin
Given I am a returning user
And my users.defaultPersonId = 99
But the Person with ID 99 has been deleted
When I log in with Facebook
Then the system should detect the missing Person
And a new Person should be created from my current Facebook profile
And users.defaultPersonId should be updated to the new Person ID
And I should not encounter an error
```

**Test Requirements:**
- Unit test: `ensureDefaultPerson()` handles missing Person gracefully
- Integration test: Simulate deleted Person, verify recreation

---

#### AC6: JWT and session include default Person ID

```gherkin
Given I have successfully logged in with Facebook
And a default Person was created for me (ID 42)
When the JWT token is created
Then the token should include { userId: <my user ID>, defaultPersonId: 42 }
When the session is created
Then the session should include { user: { id, email, name, image, defaultPersonId: 42 } }
And the frontend can access session.user.defaultPersonId
```

**Test Requirements:**
- Unit test: `jwtCallback()` includes defaultPersonId in token
- Unit test: `sessionCallback()` includes defaultPersonId in session
- Integration test: Session object accessible in +layout.server.js

---

### Technical Implementation Notes

**New Module: `src/lib/server/defaultPerson.js`**
- `createPersonFromFacebookProfile(profile, userId)` - Create Person from OAuth profile
- `ensureDefaultPerson(user, profile)` - Idempotent: create or retrieve default Person
- `parseFacebookBirthday(fbBirthday)` - Convert Facebook date formats to ISO

**Modified Modules:**
- `src/lib/server/auth.js` - Call `ensureDefaultPerson()` in `signInCallback()`
- `src/lib/server/auth.js` - Include `defaultPersonId` in JWT and session
- `src/lib/db/schema.js` - Add `defaultPersonId` field to `users` table

**Database Migration:**
```javascript
// src/lib/db/migrations/0004_add_default_person_id.js
export async function up(db) {
  await db.schema
    .alterTable('users')
    .addColumn('default_person_id', 'integer', (col) =>
      col.references('people.id').onDelete('set null')
    )
    .execute()

  await db.schema
    .createIndex('users_default_person_id_idx')
    .on('users')
    .column('default_person_id')
    .execute()
}
```

---

### Test Requirements Summary

**Unit Tests (10+ tests):**
- Schema migration adds defaultPersonId correctly
- `createPersonFromFacebookProfile()` parses full name
- `createPersonFromFacebookProfile()` handles single name
- `createPersonFromFacebookProfile()` converts gender to lowercase
- `parseFacebookBirthday()` handles MM/DD/YYYY format
- `parseFacebookBirthday()` handles MM/DD format (returns null)
- `parseFacebookBirthday()` handles YYYY format (uses Jan 1 placeholder)
- `ensureDefaultPerson()` creates Person on first login
- `ensureDefaultPerson()` retrieves existing Person on subsequent login
- `ensureDefaultPerson()` recreates Person if deleted
- `jwtCallback()` includes defaultPersonId in token
- `sessionCallback()` includes defaultPersonId in session

**Integration Tests (5+ tests):**
- OAuth callback creates User + Person atomically
- Second login does not create duplicate Person
- User with defaultPersonId can access Person via API
- Deleted Person edge case handled gracefully
- Session includes defaultPersonId accessible in frontend

**E2E Tests (3+ tests):**
- First-time user: login → Person auto-created → lands on PedigreeView with self
- Returning user: login → same Person loaded → no duplicates
- User edits Person → logs out → logs in → edits preserved

---

### Definition of Done

- [ ] Database migration created and tested
- [ ] `defaultPerson.js` module implemented
- [ ] Integration with `auth.js` complete
- [ ] JWT includes defaultPersonId
- [ ] Session includes defaultPersonId
- [ ] All unit tests passing (10+)
- [ ] All integration tests passing (5+)
- [ ] Manual E2E testing complete
- [ ] Edge cases tested (single name, missing permissions, deleted Person)
- [ ] Code reviewed
- [ ] Documentation updated (CLAUDE.md)
- [ ] Deployed to staging
- [ ] Tested on staging with Facebook Test Users
- [ ] No errors in production logs for 48 hours post-deployment

---

## Story #82: Focus PedigreeView and RadialView on Default Person

**Priority:** HIGH
**Estimated Complexity:** Low (1 day)
**Dependencies:** Story #81 (Default Person Creation)
**Blocked By:** Story #81

### User Story

As a **user with a default Person record**
I want the Pedigree and Radial views to automatically focus on me when I log in
So that my family tree is centered on my own lineage and I can immediately see my ancestors and descendants

### Acceptance Criteria (BDD Format)

#### AC1: PedigreeView defaults to user's default Person

```gherkin
Given I am logged in with Facebook
And my default Person ID is 42
When I navigate to the PedigreeView (#/ or #/pedigree)
And I have not manually selected a different focus person
Then the pedigree chart should be centered on Person 42 (me)
And the focus person dropdown should show my name as selected
And my ancestors should expand upward from my position
```

**Test Requirements:**
- Component test: PedigreeView uses defaultPersonId from page data
- E2E test: User logs in → PedigreeView auto-focuses on self

---

#### AC2: RadialView defaults to user's default Person

```gherkin
Given I am logged in with Facebook
And my default Person ID is 42
When I navigate to the RadialView (#/radial)
And I have not manually selected a different focus person
Then the radial chart should be centered on Person 42 (me)
And the focus person dropdown should show my name as selected
And my ancestors should appear in concentric rings around me
```

**Test Requirements:**
- Component test: RadialView uses defaultPersonId from page data
- E2E test: User logs in → RadialView auto-focuses on self

---

#### AC3: Manual focus selection overrides default

```gherkin
Given I am logged in and viewing PedigreeView focused on myself (Person 42)
When I select a different person (Person 10) from the focus person dropdown
Then the view should re-focus on Person 10
And when I navigate away and return to PedigreeView
Then the view should still be focused on Person 10 (preserve user choice)
```

**Test Requirements:**
- Component test: Manual selection overrides defaultPersonId
- Component test: Reactive variable precedence: selectedPersonId > defaultPersonId > rootPeople[0].id

---

#### AC4: Fallback to first root person if no default Person

```gherkin
Given I am logged in but have no default Person (edge case)
When I navigate to PedigreeView
Then the view should focus on the first person in rootPeople array (existing behavior)
And the app should not crash or show an error
```

**Test Requirements:**
- Component test: Fallback chain works correctly (selectedPersonId || defaultPersonId || rootPeople[0]?.id)

---

#### AC5: Session data includes default Person ID

```gherkin
Given I am logged in with Facebook
When the +layout.server.js load function executes
Then the returned data should include { session, defaultPersonId: 42 }
And the page store should make defaultPersonId available to components
```

**Test Requirements:**
- Integration test: +layout.server.js returns defaultPersonId from session
- Component test: Views can access $page.data.defaultPersonId

---

### Technical Implementation Notes

**Modified Files:**
- `src/routes/+layout.server.js` - Extract and return `defaultPersonId` from session
- `src/lib/PedigreeView.svelte` - Use `$page.data.defaultPersonId` as focus default
- `src/lib/RadialView.svelte` - Use `$page.data.defaultPersonId` as focus default

**Implementation:**

```javascript
// src/routes/+layout.server.js
export async function load({ locals }) {
  const session = await locals.getSession()

  return {
    session,
    defaultPersonId: session?.user?.defaultPersonId || null
  }
}
```

```javascript
// src/lib/PedigreeView.svelte
import { page } from '$app/stores'

$: defaultPersonId = $page.data.defaultPersonId
$: focusPerson = selectedPersonId || defaultPersonId || rootPeople[0]?.id
```

---

### Test Requirements Summary

**Unit Tests:**
- (No new unit tests - existing tests cover component logic)

**Component Tests (3+ tests):**
- PedigreeView reactive variable uses defaultPersonId as fallback
- RadialView reactive variable uses defaultPersonId as fallback
- Manual selection overrides defaultPersonId

**Integration Tests (2+ tests):**
- +layout.server.js returns defaultPersonId from session
- Page data includes defaultPersonId accessible in components

**E2E Tests (2+ tests):**
- User logs in → PedigreeView auto-focuses on self
- User logs in → RadialView auto-focuses on self

---

### Definition of Done

- [ ] +layout.server.js returns defaultPersonId
- [ ] PedigreeView uses defaultPersonId as focus default
- [ ] RadialView uses defaultPersonId as focus default
- [ ] Component tests passing (3+)
- [ ] Integration tests passing (2+)
- [ ] E2E tests passing (2+)
- [ ] Manual testing complete (all three views)
- [ ] Code reviewed
- [ ] Deployed to staging
- [ ] Tested on staging
- [ ] No regressions in existing functionality

---

## Story #83: Prevent Deletion of User's Default Person

**Priority:** MEDIUM
**Estimated Complexity:** Low (0.5 days)
**Dependencies:** Story #81 (Default Person Creation)
**Blocked By:** Story #81

### User Story

As a **user with a default Person record**
I want the system to prevent me from accidentally deleting my own Person record
So that I don't remove myself from my family tree and lose the starting point of my genealogy

### Acceptance Criteria (BDD Format)

#### AC1: API rejects deletion of default Person

```gherkin
Given I am logged in as User ID 1
And my default Person ID is 42
When I send a DELETE request to /api/people/42
Then the API should return status 403 Forbidden
And the response should include error message: "Cannot delete your own Person record"
And the Person with ID 42 should remain in the database
```

**Test Requirements:**
- Integration test: DELETE /api/people/:id returns 403 if deleting own defaultPerson
- Integration test: DELETE /api/people/:id succeeds if deleting another Person

---

#### AC2: PersonModal hides delete button for default Person

```gherkin
Given I am logged in and viewing PersonModal for my default Person
When the modal renders
Then the "Delete" button should not be visible
And hovering over the delete button area should show a tooltip: "You cannot delete yourself"
```

**Test Requirements:**
- Component test: PersonModal.svelte hides delete button when `person.id === $page.data.defaultPersonId`
- Component test: PersonModal shows delete button for other people

---

#### AC3: Allow deletion of other people (not default Person)

```gherkin
Given I am logged in as User ID 1
And my default Person ID is 42
And I am viewing PersonModal for Person ID 10 (not my default)
When I click the "Delete" button
Then the Person with ID 10 should be deleted
And the deletion should succeed without error
```

**Test Requirements:**
- Integration test: Verify deletion still works for non-default people
- E2E test: User can delete any Person except their own

---

#### AC4: Handle edge case of no default Person

```gherkin
Given I am logged in but have no default Person (edge case)
When I attempt to delete any Person
Then the deletion should succeed (no false positive blocking)
```

**Test Requirements:**
- Integration test: Deletion allowed if user.defaultPersonId is null

---

### Technical Implementation Notes

**Modified Files:**
- `src/routes/api/people/[id]/+server.js` - Add validation in DELETE handler
- `src/lib/PersonModal.svelte` - Conditionally hide delete button

**Implementation:**

```javascript
// src/routes/api/people/[id]/+server.js
export async function DELETE({ params, locals }) {
  const session = await locals.getSession()
  const userId = session?.user?.id
  const defaultPersonId = session?.user?.defaultPersonId
  const personId = parseInt(params.id)

  // Prevent deletion of own default Person
  if (defaultPersonId && personId === defaultPersonId) {
    return json(
      { error: 'Cannot delete your own Person record' },
      { status: 403 }
    )
  }

  // Existing deletion logic...
}
```

```svelte
<!-- src/lib/PersonModal.svelte -->
<script>
  import { page } from '$app/stores'

  $: isDefaultPerson = person.id === $page.data.defaultPersonId
</script>

{#if !isDefaultPerson}
  <button on:click={handleDelete}>Delete</button>
{:else}
  <span class="tooltip">You cannot delete yourself</span>
{/if}
```

---

### Test Requirements Summary

**Unit Tests:**
- (No new unit tests - validation is integration-level)

**Component Tests (2 tests):**
- PersonModal hides delete button when viewing own default Person
- PersonModal shows delete button for other people

**Integration Tests (3+ tests):**
- DELETE /api/people/:id returns 403 if deleting defaultPersonId
- DELETE /api/people/:id succeeds if deleting another Person
- Deletion allowed if user.defaultPersonId is null

**E2E Tests (1 test):**
- User cannot delete themselves via PersonModal

---

### Definition of Done

- [ ] API validation implemented (403 on delete defaultPerson)
- [ ] PersonModal hides delete button for defaultPerson
- [ ] Component tests passing (2)
- [ ] Integration tests passing (3+)
- [ ] E2E test passing (1)
- [ ] Manual testing complete
- [ ] Code reviewed
- [ ] Deployed to staging
- [ ] Tested on staging
- [ ] No regressions

---

## Story #84: Display "Your Profile" Indicator for Default Person

**Priority:** LOW (Nice-to-Have)
**Estimated Complexity:** Low (0.5 days)
**Dependencies:** Story #81 (Default Person Creation)
**Blocked By:** Story #81

### User Story

As a **user viewing my family tree**
I want a clear visual indicator showing which Person record represents me
So that I can quickly identify myself in the tree and understand that this Person is special

### Acceptance Criteria (BDD Format)

#### AC1: Badge appears on default Person in PersonModal

```gherkin
Given I am logged in and viewing PersonModal for my default Person
When the modal header renders
Then I should see a badge next to the person's name saying "You"
And the badge should be styled distinctively (e.g., blue background, white text)
```

**Test Requirements:**
- Component test: PersonModal renders "You" badge when `person.id === defaultPersonId`
- Component test: Badge does not appear for other people

---

#### AC2: Badge appears on default Person in RelationshipCard

```gherkin
Given I am viewing PersonModal for another person
And that person has me listed as a relationship (e.g., parent, child, spouse)
When the RelationshipCard for my default Person renders
Then I should see a small "You" badge on the card
```

**Test Requirements:**
- Component test: RelationshipCard renders badge when `person.id === defaultPersonId`

---

#### AC3: Tooltip explains the "You" badge

```gherkin
Given I see the "You" badge on a Person
When I hover over the badge
Then a tooltip should appear saying "This is your profile"
```

**Test Requirements:**
- Component test: Tooltip renders on hover

---

### Technical Implementation Notes

**Modified Files:**
- `src/lib/PersonModal.svelte` - Add badge to header
- `src/lib/components/RelationshipCard.svelte` - Add small badge to card

**Implementation:**

```svelte
<!-- PersonModal.svelte -->
<h2>
  {person.firstName} {person.lastName}
  {#if person.id === $page.data.defaultPersonId}
    <span class="you-badge" title="This is your profile">You</span>
  {/if}
</h2>

<style>
  .you-badge {
    background: #2196F3;
    color: white;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    margin-left: 8px;
  }
</style>
```

---

### Test Requirements Summary

**Component Tests (3 tests):**
- PersonModal renders "You" badge for defaultPerson
- RelationshipCard renders badge for defaultPerson
- Tooltip renders on hover

---

### Definition of Done

- [ ] Badge implemented in PersonModal
- [ ] Badge implemented in RelationshipCard
- [ ] Tooltip added
- [ ] Styling consistent with design system
- [ ] Component tests passing (3)
- [ ] Manual testing complete
- [ ] Code reviewed
- [ ] Deployed to staging
- [ ] Tested on staging

---

## Epic Summary

**Total Stories:** 4
**Total Estimated Effort:** 5-6 days
- Story #81 (Auto-Create Default Person): 3-4 days - HIGH PRIORITY
- Story #82 (Focus on Default Person): 1 day - HIGH PRIORITY
- Story #83 (Prevent Deletion): 0.5 days - MEDIUM PRIORITY
- Story #84 (Visual Indicator): 0.5 days - LOW PRIORITY (nice-to-have)

### Story Dependencies (Order of Execution)

1. **Story #81**: Auto-Create Default Person (MUST complete first)
2. **Story #82**: Focus on Default Person (depends on #81)
3. **Story #83**: Prevent Deletion (depends on #81)
4. **Story #84**: Visual Indicator (depends on #81, optional)

### Prerequisites

Before starting Story #81:
- [ ] Issue #77 (Photo Storage) must be COMPLETE
- [ ] Issue #79 (Facebook Permissions) must be COMPLETE
- [ ] Issue #78 (Profile Picture Import) should be COMPLETE (enhances feature)
- [ ] Facebook OAuth in production and working

### Success Metrics

**Adoption Metrics:**
- 100% of new users have defaultPersonId set on first login
- 0% duplicate Person creation rate for same user

**User Experience Metrics:**
- Average time from login to first relationship created decreases by 50%
- <5% of users manually edit auto-created Person name/birthdate (indicates good data quality)

**Technical Metrics:**
- 0 errors in defaultPerson creation (robust error handling)
- <100ms latency for Person creation during OAuth callback

---

## Questions for Product Owner

1. **Priority Confirmation:** Should all 4 stories be completed, or just #81-82 (core functionality)?
2. **Deletion Policy:** Should we hard-block deletion (Story #83) or soft-warn ("Are you sure you want to delete yourself?")?
3. **Profile Sync:** Should we update Person from Facebook on every login, or only on first login?
4. **Visual Design:** For Story #84 (badge), do you have design preferences (color, shape, placement)?
5. **Migration Strategy:** For existing users, should we try to match existing Person records by name, or always create new?

---

## Risk Assessment

### Low Risk
- Story #81: Well-defined integration point, comprehensive edge case handling
- Story #82: Simple reactive variable change, low complexity
- Story #83: Straightforward validation, limited scope
- Story #84: Purely presentational, no business logic

### Mitigation Strategies
- Comprehensive unit and integration tests (50+ tests across all stories)
- Manual E2E testing with Facebook Test Users
- Staging environment validation before production
- Rollback plan: Remove defaultPersonId constraint, revert auth.js changes

---

## Next Steps

1. **Product Owner Review:** Review and approve all 4 stories
2. **Technical Validation:** Confirm Issues #77 and #79 are ready
3. **Backlog Grooming:** Add stories to GitHub Projects Prioritized Backlog
4. **Estimation Refinement:** Confirm 5-6 day estimate with development team
5. **Start Story #81:** Begin implementation once prerequisites complete

---

**Document Version:** 1.0
**Author:** Claude Sonnet 4.5 (Agile PM Mode)
**Status:** READY FOR PRODUCT OWNER REVIEW
**Next Review:** After grooming session
