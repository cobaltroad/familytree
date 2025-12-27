# Default Person - Quick Reference Guide

**Feature:** Auto-create Person from Facebook profile on first login
**Status:** Ready for Grooming
**Created:** 2025-12-27

---

## TL;DR

When a user signs in with Facebook for the first time, automatically create a Person record for them using their Facebook profile data (name, photo, gender, birthdate) and link it to their User account. This Person becomes the starting point of their family tree.

---

## GitHub Issues

| Issue | Title | Priority | Estimate | Status |
|-------|-------|----------|----------|--------|
| [#81](https://github.com/cobaltroad/familytree/issues/81) | Auto-Create Default Person from Facebook Profile | HIGH | 3-4 days | Open |
| [#82](https://github.com/cobaltroad/familytree/issues/82) | Focus PedigreeView/RadialView on Default Person | HIGH | 1 day | Open |
| [#83](https://github.com/cobaltroad/familytree/issues/83) | Prevent Deletion of User's Default Person | MEDIUM | 0.5 days | Open |
| [#84](https://github.com/cobaltroad/familytree/issues/84) | Display "Your Profile" Indicator | LOW | 0.5 days | Open |

**Total Effort:** 5-6 days

---

## Prerequisites (MUST be complete)

- [ ] Issue #77: Add Photo Storage to Person Model
- [ ] Issue #79: Request Facebook Gender and Birthday Permissions
- [x] Issue #71: Facebook OAuth Authentication (COMPLETE)
- [x] Issue #72: User Association to Data Model (COMPLETE)

---

## Implementation Order

```
Issue #77 + #79 (Prerequisites)
         ↓
   Story #81 (Auto-Create) ← START HERE
         ↓
   ┌─────┴─────┐
   ↓           ↓
Story #82   Story #83
(Focus)     (Prevent Delete)
   ↓
Story #84 (Visual - OPTIONAL)
```

---

## Key Technical Changes

### Database
- Add `users.defaultPersonId` column (foreign key to `people.id`, nullable, ON DELETE SET NULL)
- Create index: `users_default_person_id_idx`

### New Module
- `src/lib/server/defaultPerson.js`
  - `createPersonFromFacebookProfile(profile, userId)`
  - `ensureDefaultPerson(user, profile)`
  - `parseFacebookBirthday(fbBirthday)`

### Modified Files
- `src/lib/server/auth.js` - Call `ensureDefaultPerson()` in `signInCallback()`
- `src/lib/server/auth.js` - Include `defaultPersonId` in JWT and session
- `src/routes/+layout.server.js` - Pass `defaultPersonId` to frontend
- `src/lib/PedigreeView.svelte` - Use `defaultPersonId` as focus default
- `src/lib/RadialView.svelte` - Use `defaultPersonId` as focus default
- `src/routes/api/people/[id]/+server.js` - Block deletion of defaultPerson
- `src/lib/PersonModal.svelte` - Hide delete button for defaultPerson

---

## Test Requirements Summary

| Story | Unit | Integration | Component | E2E | Total |
|-------|------|-------------|-----------|-----|-------|
| #81   | 10+  | 5+          | 0         | 3+  | 18+   |
| #82   | 0    | 2+          | 3+        | 2+  | 7+    |
| #83   | 0    | 3+          | 2         | 1   | 6+    |
| #84   | 0    | 0           | 3         | 0   | 3     |
| **TOTAL** | **10+** | **10+** | **8+** | **6+** | **34+** |

---

## Edge Cases Handled

1. **Single Name** (e.g., "Madonna") → lastName = "User"
2. **Missing Gender** → gender = null
3. **Partial Birthday** (MM/DD or YYYY only) → Graceful conversion or null
4. **No Profile Photo** → photoUrl = null
5. **Deleted Default Person** → Recreate on next login
6. **User Edits Person** → Do NOT overwrite on subsequent logins

---

## Open Questions (for Product Owner)

1. Should we complete all 4 stories or defer Story #84 (visual indicator)?
2. Update Person from Facebook on every login or only first login? (Rec: Only first)
3. If Facebook name changes, auto-update or notify user? (Rec: Notify)
4. Hard block self-deletion or soft warning? (Rec: Hard block)
5. Migration strategy for existing users? (Rec: Lazy migration on next login)

---

## Success Metrics

- 100% of new users get defaultPersonId on first login
- 0% duplicate Person creation rate
- Time to first relationship created decreases by 50%
- <5% of users edit auto-created Person (indicates good data quality)
- 0 errors during Person creation

---

## Documentation

### Comprehensive
- **Exploration:** `/plans/DEFAULT_PERSON_EXPLORATION.md` (6,500+ words)
- **User Stories:** `/plans/DEFAULT_PERSON_USER_STORIES.md` (3,500+ words)
- **Summary:** `/plans/DEFAULT_PERSON_SUMMARY.md` (2,500+ words)

### Quick Links
- [Issue #81](https://github.com/cobaltroad/familytree/issues/81) - Auto-Create Default Person
- [Issue #82](https://github.com/cobaltroad/familytree/issues/82) - Focus on Default Person
- [Issue #83](https://github.com/cobaltroad/familytree/issues/83) - Prevent Deletion
- [Issue #84](https://github.com/cobaltroad/familytree/issues/84) - Visual Indicator

---

## Next Action

**Schedule grooming session with product owner to:**
1. Answer 5 open questions
2. Approve priorities and estimates
3. Confirm prerequisites are complete
4. Approve start of Story #81

**Estimated Grooming Time:** 30-60 minutes

---

**Last Updated:** 2025-12-27
**Status:** Ready for Grooming
