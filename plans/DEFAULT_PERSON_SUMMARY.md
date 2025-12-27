# Default Person Feature - Backlog Summary

**Date Created:** 2025-12-27
**Status:** Ready for Product Owner Review & Grooming
**Epic:** Authentication & Multi-User Support (Extension)
**Feature:** Default Person (Self Person) Auto-Creation

---

## Overview

The Default Person feature automatically creates a Person entity from a user's Facebook profile data on first login and establishes a persistent link between the User (authentication) and Person (family tree entity). This provides zero-friction onboarding and makes the authenticated user the natural starting point of their family tree.

### Key Benefits

1. **Zero-Friction Onboarding:** Users don't need to manually create a Person record for themselves
2. **Automatic Profile Import:** Name, photo, gender, and birthdate automatically populated from Facebook
3. **Clear Tree Root:** User becomes the natural center of their family tree
4. **No Duplicates:** System prevents creating multiple Person records for the same user
5. **Leverages Existing Integration:** Built on top of Facebook OAuth (Issue #71)

---

## Created GitHub Issues (Backlog)

### Story #81: Auto-Create Default Person from Facebook Profile on First Login
- **Priority:** HIGH - CORE FEATURE
- **Persona:** Family historian signing up for the first time
- **Goal:** Automatic Person creation from Facebook profile
- **Estimate:** 3-4 days
- **Blocks:** Stories #82, #83, #84
- **Blocked By:** Issues #77 (Photo Storage), #79 (Facebook Permissions)
- **Link:** https://github.com/cobaltroad/familytree/issues/81

**Key Implementation:**
- New database field: `users.defaultPersonId` (foreign key to people.id)
- New module: `src/lib/server/defaultPerson.js`
- Integration with Auth.js callbacks (signIn, jwt, session)
- Automatic Person creation on first login, reuse on subsequent logins
- Comprehensive edge case handling (missing data, deleted Person, etc.)

---

### Story #82: Focus PedigreeView and RadialView on Default Person
- **Priority:** HIGH - UX ENHANCEMENT
- **Persona:** User with a default Person record
- **Goal:** Automatically focus tree views on self
- **Estimate:** 1 day
- **Blocked By:** Story #81
- **Link:** https://github.com/cobaltroad/familytree/issues/82

**Key Implementation:**
- Update `+layout.server.js` to pass `defaultPersonId` from session
- Update PedigreeView to use `defaultPersonId` as focus default
- Update RadialView to use `defaultPersonId` as focus default
- Fallback chain: `selectedPersonId || defaultPersonId || rootPeople[0]?.id`

---

### Story #83: Prevent Deletion of User's Default Person
- **Priority:** MEDIUM - DATA INTEGRITY
- **Persona:** User with a default Person record
- **Goal:** Prevent accidental self-deletion from tree
- **Estimate:** 0.5 days
- **Blocked By:** Story #81
- **Link:** https://github.com/cobaltroad/familytree/issues/83

**Key Implementation:**
- API validation in DELETE /api/people/:id (return 403 if deleting own defaultPerson)
- PersonModal hides delete button when viewing own Person
- Tooltip: "You cannot delete yourself"

---

### Story #84: Display "Your Profile" Indicator for Default Person
- **Priority:** LOW - NICE-TO-HAVE
- **Persona:** User viewing their family tree
- **Goal:** Clear visual indicator of which Person is "me"
- **Estimate:** 0.5 days
- **Blocked By:** Story #81
- **Link:** https://github.com/cobaltroad/familytree/issues/84

**Key Implementation:**
- Badge in PersonModal header: "You" (blue background, white text)
- Small badge on RelationshipCard when displaying user's Person
- Tooltip: "This is your profile"

---

## Implementation Timeline

### Recommended Sequence (5-6 days total)

#### Phase 1: Core Default Person (Story #81) - 3-4 days
- **Deliverable:** Users automatically get a Person record on first login
- **User Impact:** Seamless onboarding, no manual data entry
- **Risk:** Medium (database migration, OAuth integration)
- **Prerequisites:** Issues #77 and #79 must be COMPLETE

#### Phase 2: UX Enhancements (Stories #82, #83) - 1.5 days
- **Deliverable:** Tree views auto-focus on user, deletion protection
- **User Impact:** Intuitive navigation, prevents data loss
- **Risk:** Low (simple reactive changes, validation logic)

#### Phase 3: Visual Polish (Story #84) - 0.5 days
- **Deliverable:** "You" badge in UI
- **User Impact:** Clear identification of self in tree
- **Risk:** Very Low (purely presentational)
- **Status:** OPTIONAL - Can defer if time-constrained

---

## Prerequisites & Dependencies

### Before Starting Story #81

**MUST BE COMPLETE:**
- [ ] Issue #77: Add Photo Storage to Person Model
  - Adds `photoUrl` field to Person schema
  - Without this, cannot store Facebook profile picture
- [ ] Issue #79: Request Facebook Gender and Birthday Permissions
  - Adds `user_gender` and `user_birthday` to OAuth scopes
  - Without this, cannot populate gender/birthdate from Facebook

**SHOULD BE COMPLETE:**
- [ ] Issue #78: Enable Facebook Profile Picture Import
  - Provides profile picture URL from Facebook Graph API
  - Enhances Story #81 but not strictly required

**ALREADY COMPLETE:**
- [x] Issue #71: Facebook OAuth Authentication (DEPLOYED)
- [x] Issue #72: User Association to Data Model (DEPLOYED)

### Dependency Chain

```
Issue #77 (Photo Storage) ────────┐
                                  ├──> Story #81 (Auto-Create) ────┬──> Story #82 (Focus)
Issue #79 (Facebook Permissions) ─┘                                ├──> Story #83 (Prevent Deletion)
                                                                    └──> Story #84 (Visual Indicator)
```

---

## Technical Architecture

### Database Schema Changes

```sql
-- Migration: Add defaultPersonId to users table
ALTER TABLE users ADD COLUMN default_person_id INTEGER;

ALTER TABLE users ADD CONSTRAINT fk_users_default_person
  FOREIGN KEY (default_person_id) REFERENCES people(id) ON DELETE SET NULL;

CREATE INDEX users_default_person_id_idx ON users(default_person_id);
```

**Rationale:**
- User "has one" default Person (1:1 relationship)
- Nullable (allows users without default Person if needed)
- ON DELETE SET NULL (if Person deleted, user remains but link breaks)
- Separate from `people.userId` (which is for multi-user data isolation)

### New Module: defaultPerson.js

**Location:** `src/lib/server/defaultPerson.js`

**Functions:**
1. `createPersonFromFacebookProfile(profile, userId)` - Create Person from Facebook profile
2. `ensureDefaultPerson(user, profile)` - Idempotent creation/retrieval
3. `parseFacebookBirthday(fbBirthday)` - Convert Facebook date formats to ISO

**Edge Cases Handled:**
- Single name (no last name) → Use "User" as placeholder
- Missing gender → Store as null
- Partial birthday (MM/DD or YYYY only) → Handle gracefully
- Deleted Person → Recreate on next login
- No profile photo → Store as null (use default avatar)

### Data Flow

```
1. User clicks "Sign in with Facebook"
2. Facebook OAuth redirect → Authentication
3. Auth.js signInCallback() triggered
   ├─> syncUserFromOAuth() → Create/update User record
   └─> ensureDefaultPerson() → Create/retrieve Person record
4. User.defaultPersonId updated (if new Person created)
5. JWT token includes { userId, defaultPersonId }
6. Session includes { user: { ..., defaultPersonId } }
7. Frontend receives session via +layout.server.js
8. PedigreeView/RadialView auto-focus on defaultPersonId
```

---

## Testing Strategy

### Comprehensive Test Coverage (50+ tests across all stories)

#### Story #81 Testing
- **10+ Unit Tests:** Name parsing, date conversion, edge cases
- **5+ Integration Tests:** OAuth flow, database operations
- **3+ E2E Tests:** First login, returning login, edit persistence

#### Story #82 Testing
- **3+ Component Tests:** Reactive variables, fallback chain
- **2+ Integration Tests:** Session data, page data
- **2+ E2E Tests:** Auto-focus on login

#### Story #83 Testing
- **2 Component Tests:** Delete button visibility
- **3+ Integration Tests:** API validation, deletion allowed/blocked
- **1 E2E Test:** Cannot delete self

#### Story #84 Testing
- **3 Component Tests:** Badge rendering, tooltip

**Test Coverage Goal:** 80%+ for new defaultPerson.js module

---

## Risk Assessment

### Overall Risk: LOW

#### Low Risk Factors
- Well-defined integration point (Auth.js callbacks)
- Comprehensive edge case analysis
- Clear fallback behavior
- Extensive test requirements
- Simple database schema change

#### Medium Risk Factors
- Database migration (existing users get NULL defaultPersonId)
  - **Mitigation:** Lazy migration on next login
- OAuth profile data variations (missing fields)
  - **Mitigation:** Graceful defaults for all fields

#### Mitigation Strategies
- Staging environment testing with Facebook Test Users
- Manual E2E testing checklist (15+ scenarios)
- Rollback plan: Remove defaultPersonId constraint, revert auth.js changes
- Monitor error logs for 48 hours post-deployment

---

## Success Metrics

### Adoption Metrics
- **Target:** 100% of new users have defaultPersonId set on first login
- **Target:** 0% duplicate Person creation rate (same user, multiple Persons)
- **Target:** 100% of users migrated within 30 days (lazy migration)

### User Experience Metrics
- **Target:** Average time from login to first relationship created decreases by 50%
- **Target:** <5% of users manually edit auto-created Person name/birthdate
- **Target:** User survey: "Sign-up was easy" >90% agreement

### Technical Metrics
- **Target:** 0 errors in defaultPerson creation during OAuth flow
- **Target:** <100ms latency for Person creation during callback
- **Target:** All 50+ tests passing (100% pass rate)

---

## Open Questions for Product Owner

### 1. Priority Confirmation
**Question:** Should all 4 stories be completed, or can we defer Story #84 (visual indicator)?

**Options:**
- A. Complete all 4 stories (5-6 days total)
- B. Complete #81-83 only, defer #84 (5 days total)

**Recommendation:** Option B (defer #84 if time-constrained, it's purely cosmetic)

---

### 2. Profile Data Sync Policy
**Question:** Should we update the Person from Facebook on every login, or only on first login?

**Options:**
- A. Update on every login (Facebook is source of truth)
- B. Update only on first login (user controls after creation)
- C. User setting toggle: "Sync from Facebook on login"

**Recommendation:** Option B (respect user edits, one-time sync)

**Rationale:**
- User may change name for privacy (use maiden name vs. married name)
- User may prefer different photo than Facebook profile
- User may have edited birthdate for accuracy (Facebook allows approximate dates)

---

### 3. Name Change Handling
**Question:** If a user changes their name on Facebook, what should happen on next login?

**Options:**
- A. Auto-update Person name (overwrite user's tree data)
- B. Show notification: "Facebook name changed. Update tree?" (user chooses)
- C. Never update (user must manually edit in PersonModal)

**Recommendation:** Option B (notification with user choice)

**Rationale:**
- Name changes are significant events (marriage, divorce, legal change)
- User should consciously decide whether to update tree
- Prevents accidental data loss if user preferred old name

---

### 4. Deletion Policy (Story #83)
**Question:** How strict should we be about preventing self-deletion?

**Options:**
- A. Hard block with no override ("Cannot delete yourself")
- B. Soft warning ("Are you sure? This will remove you from your tree. Continue?")
- C. Allow deletion, set defaultPersonId = null (user can re-create)

**Recommendation:** Option A (hard block)

**Rationale:**
- Deleting oneself from family tree is almost certainly a mistake
- No legitimate use case for self-deletion
- User can manually unlink defaultPersonId in advanced settings (future feature)

---

### 5. Existing User Migration
**Question:** For users who authenticated before this feature, how should we handle migration?

**Current Plan:** Lazy migration (on next login, create defaultPerson if null)

**Alternative Options:**
- A. Lazy migration (recommended, implemented in Story #81)
- B. Interactive matching ("We found a Person named 'John Doe'. Is this you?")
- C. Batch migration script (auto-match by name)

**Recommendation:** Stay with Option A (lazy migration)

**Rationale:**
- Simple, safe, no risk of incorrect matching
- User gets fresh Person from current Facebook profile
- If user already created themselves, they can manually delete duplicate

---

## Supporting Documentation

### Exploration & Analysis
- **`/plans/DEFAULT_PERSON_EXPLORATION.md`** (6,500+ words)
  - Comprehensive technical analysis
  - 7 personas analyzed
  - 10+ edge cases documented
  - Complete data flow diagrams
  - Security and privacy considerations

### User Stories
- **`/plans/DEFAULT_PERSON_USER_STORIES.md`** (3,500+ words)
  - 4 complete user stories with BDD acceptance criteria
  - 50+ test requirements defined
  - Implementation checklists
  - Definition of done for each story

### Related Documentation
- **`/plans/AUTHENTICATION_BACKLOG_SUMMARY.md`** - Context on Issues #71-74
- **`/plans/AUTHENTICATION_EXPLORATION.md`** - Original auth analysis

---

## Communication Plan

### Stakeholder Updates
- **Before Implementation:** Grooming session with product owner (decision on 5 open questions)
- **During Implementation:** Daily standup updates on Story #81 progress
- **After Completion:** Demo video showing auto-creation flow

### User Communication
- **Before Launch:** Email to existing users: "New feature: Your profile automatically created from Facebook"
- **Launch Day:** In-app notification: "We've created a Person record for you using your Facebook profile"
- **Post-Launch:** Help article: "Understanding Your Default Person"

### Documentation Updates
- [ ] Update CLAUDE.md with Default Person section
- [ ] Add to USER_GUIDE.md: "Your Profile in the Family Tree"
- [ ] Update API documentation (session.user.defaultPersonId field)

---

## Next Steps (Backlog Grooming)

### Immediate Actions Required

1. **Product Owner Review** (1 hour)
   - [ ] Review all 4 stories (Issues #81-84)
   - [ ] Answer 5 open questions
   - [ ] Approve priorities and estimates
   - [ ] Decide: All 4 stories or defer #84?

2. **Prerequisites Validation** (30 minutes)
   - [ ] Confirm Issue #77 (Photo Storage) is complete
   - [ ] Confirm Issue #79 (Facebook Permissions) is complete
   - [ ] Verify Facebook OAuth working in production

3. **Environment Preparation** (1 hour)
   - [ ] Create Facebook Test Users for testing
   - [ ] Set up staging environment with clean database
   - [ ] Prepare rollback plan documentation

4. **Development Start** (After grooming)
   - [ ] Assign Story #81 to developer
   - [ ] Create feature branch: `feature/default-person`
   - [ ] Begin implementation

---

## Grooming Checklist

- [x] User stories written in persona format (As a... I want... So that...)
- [x] Acceptance criteria in BDD Given-When-Then format
- [x] Test requirements defined (unit, integration, component, E2E)
- [x] Implementation notes and technical approach documented
- [x] Dependencies identified (blocked by, blocks)
- [x] Estimates provided (effort in days)
- [x] Definition of Done specified for each story
- [x] Edge cases documented and handled
- [x] Risk assessment completed
- [x] Success metrics defined
- [x] Open questions identified for product owner

**All stories are READY FOR GROOMING SESSION with product owner.**

---

## Conclusion

The Default Person feature provides a critical bridge between authentication (User) and family tree data (Person), creating a seamless onboarding experience. By automatically creating a Person entity from Facebook profile data on first login, we:

1. Eliminate manual data entry friction
2. Leverage existing Facebook OAuth integration
3. Establish a clear "root" for each user's family tree
4. Prevent duplicate Person records
5. Import rich profile data (photo, name, gender, birthdate)

**Total Effort:** 5-6 days (or 5 days if deferring Story #84)
**Risk Level:** LOW (well-defined, thoroughly analyzed)
**Prerequisites:** Issues #77 and #79 must be complete

**Ready for:** Product Owner Grooming → Development → Testing → Deployment

---

**Document Version:** 1.0
**Author:** Claude Sonnet 4.5 (Agile PM Mode)
**Status:** READY FOR PRODUCT OWNER REVIEW
**Next Review:** After grooming session

**GitHub Issues:**
- Story #81: https://github.com/cobaltroad/familytree/issues/81
- Story #82: https://github.com/cobaltroad/familytree/issues/82
- Story #83: https://github.com/cobaltroad/familytree/issues/83
- Story #84: https://github.com/cobaltroad/familytree/issues/84
