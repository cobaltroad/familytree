# Default Person (Self Person) Feature Exploration

**Date Created:** 2025-12-27
**Status:** Exploration - Ready for Grooming
**Epic:** Authentication & Multi-User Support (Extension)
**Context:** Issues #71-80, Facebook OAuth Integration

## Executive Summary

This document explores the "Default Person" feature - automatically creating a Person entity from a user's Facebook profile on first login and establishing a persistent link between User (authentication) and Person (family tree entity). This feature provides a seamless onboarding experience and makes the authenticated user the starting point of their own family tree.

**Key Benefits:**
- Zero-friction onboarding (no manual data entry for self)
- Automatic profile data import (name, photo, gender, birthdate)
- Clear starting point for building family tree
- Prevents duplicate Person records for the same user
- Leverages existing Facebook OAuth integration (Issue #71)

**Timeline Estimate:** 3-5 days (after Issues #77-80 complete)

---

## Problem Statement

### Current State
As of December 2025:
- Users authenticate via Facebook OAuth (Issue #71 - COMPLETED)
- User accounts exist in `users` table (authentication layer)
- Family tree data exists in `people` table (data model layer)
- **NO LINK** between User and Person entities
- Users must manually create a Person record for themselves after login
- Risk of duplicate Person records for the same user
- Missed opportunity to leverage Facebook profile data

### Pain Points
1. **Friction in Onboarding:** User logs in, sees empty tree, must manually add themselves
2. **Data Entry Burden:** User must re-type name, birthdate, gender already provided to Facebook
3. **No Clear Starting Point:** Unclear whose family tree this is (no "root" person)
4. **Duplicate Risk:** User might create multiple Person records for themselves
5. **Lost Profile Data:** Facebook provides photo, name, gender, birthday - we ignore it

### User Expectations
When a user signs in with Facebook, they expect:
- Their profile picture to appear in the app
- Their name to be recognized ("Welcome, John!")
- To be the center of their own family tree
- To immediately add parents, siblings, children without first creating themselves

---

## Solution Overview

### Concept: "Default Person" (Self Person)

**Definition:** A Person entity automatically created from a user's Facebook profile on first login, linked to the User account as their "self" representation in the family tree.

### Core Mechanics

1. **On First Login:**
   - User completes Facebook OAuth flow
   - System creates User record in `users` table (EXISTING - Issue #71)
   - **NEW:** System automatically creates Person record from Facebook profile data
   - **NEW:** System links Person to User via `defaultPersonId` field in `users` table
   - User lands on tree visualization with themselves as the root person

2. **On Subsequent Logins:**
   - User completes Facebook OAuth flow
   - System finds existing User record
   - System finds linked Person record via `defaultPersonId`
   - User lands on tree visualization with themselves as the root person (same as before)
   - **No duplicate Person records created**

3. **Profile Data Sync:**
   - Person.firstName populated from Facebook first_name
   - Person.lastName populated from Facebook last_name
   - Person.photoUrl populated from Facebook profile picture (Issue #77)
   - Person.gender populated from Facebook gender (Issue #79)
   - Person.birthDate populated from Facebook birthday (Issue #79)

4. **User Experience:**
   - User logs in → Sees their own profile card immediately
   - "Add Parent" button → Creates relationship to self
   - "Add Child" button → Creates relationship from self
   - "Add Spouse" button → Creates spouse relationship to self
   - Clear UX: "You are building John Doe's family tree"

---

## Technical Design

### Database Schema Changes

#### Option A: Add defaultPersonId to users table (RECOMMENDED)

```sql
ALTER TABLE users ADD COLUMN default_person_id INTEGER;
ALTER TABLE users ADD CONSTRAINT fk_users_default_person
  FOREIGN KEY (default_person_id) REFERENCES people(id) ON DELETE SET NULL;
CREATE INDEX users_default_person_id_idx ON users(default_person_id);
```

**Drizzle ORM Schema:**
```javascript
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  provider: text('provider').notNull(),
  providerUserId: text('provider_user_id'),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  lastLoginAt: text('last_login_at'),
  defaultPersonId: integer('default_person_id')
    .references(() => people.id, { onDelete: 'set null' })  // NEW
}, (table) => {
  return {
    emailIdx: uniqueIndex('users_email_idx').on(table.email),
    providerUserIdIdx: index('users_provider_user_id_idx').on(table.providerUserId),
    defaultPersonIdIdx: index('users_default_person_id_idx').on(table.defaultPersonId)  // NEW
  }
})
```

**Rationale:**
- User "has one" default Person (1:1 relationship)
- Nullable (allows users without a default Person if needed)
- ON DELETE SET NULL (if Person deleted, user remains but link breaks)
- Index for fast lookups

#### Option B: Add userId to people table (ALTERNATIVE)

```sql
ALTER TABLE people ADD COLUMN associated_user_id INTEGER UNIQUE;
ALTER TABLE people ADD CONSTRAINT fk_people_user
  FOREIGN KEY (associated_user_id) REFERENCES users(id) ON DELETE SET NULL;
```

**Comparison:**

| Aspect | Option A (defaultPersonId in users) | Option B (userId in people) |
|--------|-------------------------------------|----------------------------|
| Clarity | Clear ownership: "User's default Person" | Ambiguous: "Person's user?" |
| Performance | O(1) lookup: user.defaultPersonId | O(1) lookup with UNIQUE constraint |
| Migration | Easier (no change to people table) | Harder (people table already has userId for multi-user) |
| Conflicts | No conflict with existing schema | CONFLICT: people.userId already exists for multi-user support (Issue #72) |

**Decision: Option A (defaultPersonId in users) - RECOMMENDED**

Reason: `people.userId` already exists for multi-user data isolation (Issue #72). A person can belong to a user's tree without being that user's "self" representation. We need a separate field to indicate "this Person IS the user."

---

### Data Flow

#### First Login Flow

```
1. User clicks "Sign in with Facebook"
2. Facebook OAuth redirect → Facebook login
3. Facebook callback → Auth.js signInCallback()
4. syncUserFromOAuth() creates/updates User in users table
5. NEW: createDefaultPersonFromOAuth() checks if user.defaultPersonId exists
   - If NULL (first login):
     a. Extract profile data: firstName, lastName, gender, birthDate, photoUrl
     b. Create Person record in people table
     c. Update user.defaultPersonId = newPerson.id
     d. Return newPerson
   - If NOT NULL (returning user):
     a. Fetch existing Person by user.defaultPersonId
     b. Optionally update Person from latest Facebook data
     c. Return existingPerson
6. JWT token includes { userId, defaultPersonId }
7. Session object includes { user: { id, email, name, image, defaultPersonId } }
8. Frontend redirects to #/pedigree with focusPerson = defaultPersonId
```

#### Returning Login Flow

```
1. User clicks "Sign in with Facebook"
2. Facebook OAuth redirect → Facebook login
3. Facebook callback → Auth.js signInCallback()
4. syncUserFromOAuth() finds existing User in users table
5. NEW: User already has defaultPersonId (not null)
6. NEW: createDefaultPersonFromOAuth() fetches existing Person
7. JWT token includes { userId, defaultPersonId }
8. Session loads existing Person data
9. Frontend redirects to #/pedigree with focusPerson = defaultPersonId
10. User sees their family tree with themselves as the root
```

---

### Implementation Modules

#### 1. New Module: `src/lib/server/defaultPerson.js`

```javascript
/**
 * Default Person Management Module
 *
 * Handles automatic creation and linking of Person entities from OAuth profiles.
 * This module is called during authentication to ensure each user has a "self"
 * Person record in the family tree.
 */

import { db } from '$lib/db/client.js'
import { users, people } from '$lib/db/schema.js'
import { eq } from 'drizzle-orm'

/**
 * Creates a Person from Facebook profile data
 *
 * @param {Object} profile - Facebook profile data
 * @param {number} userId - User's database ID
 * @returns {Promise<Object>} Created Person object
 */
export async function createPersonFromFacebookProfile(profile, userId) {
  // Extract name (handle edge cases: no last name, single name, etc.)
  const fullName = profile.name || ''
  const nameParts = fullName.trim().split(' ')
  const firstName = nameParts[0] || 'Unknown'
  const lastName = nameParts.slice(1).join(' ') || 'User'

  // Extract gender (Facebook values: male, female, other, or null)
  const gender = profile.gender?.toLowerCase() || null

  // Extract birthdate (Facebook format: MM/DD/YYYY or MM/DD or YYYY)
  // Convert to ISO format: YYYY-MM-DD
  const birthDate = parseFacebookBirthday(profile.birthday) || null

  // Extract photo URL
  const photoUrl = profile.picture?.data?.url || null

  // Create Person record
  const personData = {
    firstName,
    lastName,
    birthDate,
    gender,
    photoUrl,
    userId, // Associate with user's tree (Issue #72)
    createdAt: new Date().toISOString()
  }

  const [createdPerson] = await db.insert(people).values(personData).returning()

  return createdPerson
}

/**
 * Ensures user has a default Person, creating one if needed
 *
 * @param {Object} user - User object from database
 * @param {Object} profile - OAuth profile data
 * @returns {Promise<Object>} Default Person object
 */
export async function ensureDefaultPerson(user, profile) {
  // If user already has a default Person, return it
  if (user.defaultPersonId) {
    const [existingPerson] = await db
      .select()
      .from(people)
      .where(eq(people.id, user.defaultPersonId))
      .limit(1)

    if (existingPerson) {
      return existingPerson
    }

    // Edge case: defaultPersonId references deleted Person
    // Fall through to create new Person
  }

  // Create new Person from profile
  const newPerson = await createPersonFromFacebookProfile(profile, user.id)

  // Link Person to User as default
  await db
    .update(users)
    .set({ defaultPersonId: newPerson.id })
    .where(eq(users.id, user.id))

  return newPerson
}

/**
 * Parses Facebook birthday format to ISO date (YYYY-MM-DD)
 *
 * Facebook birthday formats:
 * - "MM/DD/YYYY" (full birthdate)
 * - "MM/DD" (no year, privacy setting)
 * - "YYYY" (year only, privacy setting)
 *
 * @param {string} facebookBirthday - Birthday string from Facebook
 * @returns {string|null} ISO date string or null
 */
function parseFacebookBirthday(facebookBirthday) {
  if (!facebookBirthday) return null

  // Handle MM/DD/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(facebookBirthday)) {
    const [month, day, year] = facebookBirthday.split('/')
    return `${year}-${month}-${day}`
  }

  // Handle MM/DD (no year - use placeholder or skip)
  if (/^\d{2}\/\d{2}$/.test(facebookBirthday)) {
    // Option 1: Return null (no year = incomplete date)
    return null
    // Option 2: Use placeholder year (1900, 0000, etc.)
    // const [month, day] = facebookBirthday.split('/')
    // return `1900-${month}-${day}`
  }

  // Handle YYYY only
  if (/^\d{4}$/.test(facebookBirthday)) {
    return `${facebookBirthday}-01-01` // Use Jan 1 as placeholder
  }

  return null
}
```

#### 2. Integration with Auth.js

**Update `src/lib/server/auth.js`:**

```javascript
import { ensureDefaultPerson } from './defaultPerson.js'

export async function signInCallback({ user, account, profile }) {
  try {
    // Existing user sync
    const dbUser = await syncUserFromOAuth(oauthData)

    // NEW: Ensure user has a default Person
    await ensureDefaultPerson(dbUser, profile)

    return true
  } catch (error) {
    console.error('Error during sign in:', error)
    return false
  }
}

export async function jwtCallback({ token, user, account }) {
  // On sign in, add user data to token
  if (user && account) {
    const providerUserId = account.providerAccountId || user.id
    const dbUser = await findUserByProviderAndId(account.provider, providerUserId)

    if (dbUser) {
      token.userId = dbUser.id
      token.defaultPersonId = dbUser.defaultPersonId  // NEW
    }

    token.email = user.email
    token.name = user.name
    token.picture = user.image
    token.provider = account.provider
  }

  return token
}

export async function sessionCallback({ session, token }) {
  session.user = {
    id: token.userId,
    email: token.email,
    name: token.name,
    image: token.picture,
    provider: token.provider,
    defaultPersonId: token.defaultPersonId  // NEW
  }

  return session
}
```

#### 3. Frontend Integration

**Update `src/routes/+layout.server.js`:**

```javascript
export async function load({ locals }) {
  const session = await locals.getSession()

  // Pass defaultPersonId to client
  return {
    session,
    defaultPersonId: session?.user?.defaultPersonId || null
  }
}
```

**Update PedigreeView/RadialView to use defaultPersonId as default focus:**

```javascript
// src/lib/PedigreeView.svelte
import { page } from '$app/stores'

$: defaultPersonId = $page.data.defaultPersonId
$: focusPerson = selectedPersonId || defaultPersonId || rootPeople[0]?.id
```

---

### Edge Cases & Handling

#### 1. Facebook Profile Has No Last Name
**Scenario:** User named "Madonna" or "Cher" (single name)
**Solution:** Use "User" as lastName or split first/last intelligently

#### 2. Facebook Denies Birthday Permission
**Scenario:** User grants `public_profile` but denies `user_birthday`
**Solution:** Create Person with birthDate = null (optional field)

#### 3. Facebook Denies Gender Permission
**Scenario:** User grants `public_profile` but denies `user_gender`
**Solution:** Create Person with gender = null (optional field)

#### 4. User Deletes Their Default Person
**Scenario:** User navigates to their own Person card and clicks "Delete"
**Solution:**
- Option A: Prevent deletion (show error: "Cannot delete yourself")
- Option B: Allow deletion but set user.defaultPersonId = null
- **Recommended: Option A** (preserve data integrity)

#### 5. User Changes Facebook Profile
**Scenario:** User changes name on Facebook, logs in again
**Solution:**
- Option A: Always update Person from Facebook (overwrite)
- Option B: Only update if Person fields are empty
- Option C: Never update after creation (immutable)
- **Recommended: Option B** (sync once, user controls later)

#### 6. Migration: Existing Users
**Scenario:** User authenticated before this feature, has no defaultPersonId
**Solution:** On next login, run `ensureDefaultPerson()` which creates Person retroactively

#### 7. User Has Multiple Person Records
**Scenario:** User manually created a Person for themselves before feature launched
**Solution:**
- Detect duplicate by name matching (fuzzy)
- Show UI: "Link to existing Person?" with list
- Allow user to choose which Person to link as default

---

## User Personas & Stories

### Persona 1: New User (First-Time Registration)
**Name:** Sarah Chen
**Age:** 32
**Occupation:** Marketing Manager
**Goal:** Document her family history for her children

**Current Experience (WITHOUT feature):**
1. Clicks "Sign in with Facebook"
2. Grants permissions (email, public_profile, user_birthday, user_gender)
3. Lands on empty PedigreeView
4. Confused: "Where do I start?"
5. Clicks "Add Person" → Manually enters her own name, birthdate
6. Now can add parents, siblings, etc.

**New Experience (WITH feature):**
1. Clicks "Sign in with Facebook"
2. Grants permissions
3. Lands on PedigreeView with her profile card at center
4. Sees her Facebook photo, name, birthdate pre-populated
5. Immediately clicks "Add Mother" → Creates parent relationship
6. Delighted: "It already knows who I am!"

### Persona 2: Returning User
**Name:** Michael Torres
**Age:** 58
**Occupation:** Retired Teacher
**Goal:** Add more relatives to his established tree

**Current Experience (WITHOUT feature):**
1. Logs in with Facebook
2. Lands on PedigreeView
3. Must remember which Person record is himself
4. Navigates to his Person card manually

**New Experience (WITH feature):**
1. Logs in with Facebook
2. Lands on PedigreeView focused on himself
3. Immediately sees his branch of the tree
4. Continues adding relatives from where he left off

### Persona 3: Privacy-Conscious User
**Name:** Alex Rivera
**Age:** 41
**Occupation:** Software Engineer
**Goal:** Use app but minimize data shared with Facebook

**Concerns:**
- "Does the app overwrite my manually entered data with Facebook data?"
- "If I change my Facebook profile, does it change my family tree?"
- "Can I delete the auto-created Person and create my own?"

**Solution:**
- Only sync from Facebook on FIRST login (immutable after creation)
- Allow user to edit Person fields (override Facebook data)
- Allow user to unlink defaultPerson (advanced setting)

---

## Testing Strategy

### Unit Tests

**Module: `src/lib/server/defaultPerson.js`**

```javascript
describe('createPersonFromFacebookProfile', () => {
  it('should create Person with full name', async () => {
    const profile = {
      name: 'John Doe',
      gender: 'male',
      birthday: '01/15/1990',
      picture: { data: { url: 'https://...' } }
    }
    const person = await createPersonFromFacebookProfile(profile, 1)

    expect(person.firstName).toBe('John')
    expect(person.lastName).toBe('Doe')
    expect(person.gender).toBe('male')
    expect(person.birthDate).toBe('1990-01-15')
    expect(person.photoUrl).toBe('https://...')
  })

  it('should handle single name (no last name)', async () => {
    const profile = { name: 'Madonna' }
    const person = await createPersonFromFacebookProfile(profile, 1)

    expect(person.firstName).toBe('Madonna')
    expect(person.lastName).toBe('User')
  })

  it('should handle missing gender', async () => {
    const profile = { name: 'Jane Doe' }
    const person = await createPersonFromFacebookProfile(profile, 1)

    expect(person.gender).toBe(null)
  })

  it('should handle MM/DD birthday (no year)', async () => {
    const profile = { name: 'John Doe', birthday: '03/20' }
    const person = await createPersonFromFacebookProfile(profile, 1)

    expect(person.birthDate).toBe(null) // No year = incomplete
  })

  it('should handle YYYY-only birthday', async () => {
    const profile = { name: 'John Doe', birthday: '1995' }
    const person = await createPersonFromFacebookProfile(profile, 1)

    expect(person.birthDate).toBe('1995-01-01')
  })
})

describe('ensureDefaultPerson', () => {
  it('should create Person on first login', async () => {
    const user = { id: 1, defaultPersonId: null }
    const profile = { name: 'John Doe', gender: 'male' }

    const person = await ensureDefaultPerson(user, profile)

    expect(person.firstName).toBe('John')
    expect(person.userId).toBe(1)

    // Verify user.defaultPersonId was updated
    const [updatedUser] = await db.select().from(users).where(eq(users.id, 1))
    expect(updatedUser.defaultPersonId).toBe(person.id)
  })

  it('should return existing Person on subsequent login', async () => {
    const existingPerson = { id: 5, firstName: 'John', lastName: 'Doe' }
    const user = { id: 1, defaultPersonId: 5 }
    const profile = { name: 'John Updated Doe' }

    const person = await ensureDefaultPerson(user, profile)

    expect(person.id).toBe(5)
    expect(person.firstName).toBe('John') // Not updated
  })

  it('should recreate Person if defaultPersonId references deleted Person', async () => {
    const user = { id: 1, defaultPersonId: 999 } // Deleted Person
    const profile = { name: 'Jane Doe' }

    const person = await ensureDefaultPerson(user, profile)

    expect(person.id).not.toBe(999)
    expect(person.firstName).toBe('Jane')
  })
})

describe('parseFacebookBirthday', () => {
  it('should parse MM/DD/YYYY format', () => {
    expect(parseFacebookBirthday('12/25/1990')).toBe('1990-12-25')
  })

  it('should return null for MM/DD format', () => {
    expect(parseFacebookBirthday('06/15')).toBe(null)
  })

  it('should parse YYYY format with Jan 1 placeholder', () => {
    expect(parseFacebookBirthday('1985')).toBe('1985-01-01')
  })

  it('should return null for invalid format', () => {
    expect(parseFacebookBirthday('invalid')).toBe(null)
    expect(parseFacebookBirthday(null)).toBe(null)
  })
})
```

### Integration Tests

**Auth Flow Integration:**

```javascript
describe('Default Person Auth Integration', () => {
  it('should create default Person on first Facebook login', async () => {
    // Simulate Facebook OAuth callback
    const account = {
      provider: 'facebook',
      providerAccountId: 'fb_12345',
      type: 'oauth'
    }

    const profile = {
      name: 'Test User',
      email: 'test@example.com',
      gender: 'female',
      birthday: '05/10/1992',
      picture: { data: { url: 'https://fb.com/photo.jpg' } }
    }

    // Trigger sign-in callback
    const result = await signInCallback({ user: profile, account, profile })

    expect(result).toBe(true)

    // Verify User created
    const [user] = await db.select().from(users).where(eq(users.email, 'test@example.com'))
    expect(user).toBeDefined()

    // Verify Person created
    expect(user.defaultPersonId).toBeDefined()
    const [person] = await db.select().from(people).where(eq(people.id, user.defaultPersonId))

    expect(person.firstName).toBe('Test')
    expect(person.lastName).toBe('User')
    expect(person.gender).toBe('female')
    expect(person.birthDate).toBe('1992-05-10')
    expect(person.photoUrl).toBe('https://fb.com/photo.jpg')
  })

  it('should NOT create duplicate Person on second login', async () => {
    // First login
    await signInCallback({ user: profile1, account, profile: profile1 })

    const personCountBefore = await db.select().from(people)

    // Second login (same user)
    await signInCallback({ user: profile1, account, profile: profile1 })

    const personCountAfter = await db.select().from(people)

    expect(personCountAfter.length).toBe(personCountBefore.length) // No new Person
  })
})
```

### E2E Tests (Manual → Automated)

**Test Case 1: First-Time User Registration**
```gherkin
Given I am a new user who has never used the app
When I click "Sign in with Facebook"
And I grant all permissions (email, public_profile, user_birthday, user_gender)
Then I should be redirected to the PedigreeView
And I should see my profile card at the center
And my profile card should show my Facebook name
And my profile card should show my Facebook photo
And my profile card should show my Facebook birthday
And the focus person selector should show my name as selected
```

**Test Case 2: Returning User Login**
```gherkin
Given I am a returning user who logged in before
When I click "Sign in with Facebook"
Then I should be redirected to the PedigreeView
And I should see the same Person record as before (same ID)
And no duplicate Person records should be created
```

**Test Case 3: User Edits Auto-Created Person**
```gherkin
Given I logged in and have an auto-created Person
When I click on my Person card in PedigreeView
And I click "Edit" in the PersonModal
And I change my first name from "John" to "Jonathan"
And I click "Update"
Then my Person record should show "Jonathan"
And on next login, my name should still be "Jonathan" (not overwritten by Facebook)
```

**Test Case 4: User Denies Facebook Birthday Permission**
```gherkin
Given I am signing in with Facebook for the first time
When Facebook prompts for permissions
And I deny the "user_birthday" permission
Then I should still be able to log in
And my auto-created Person should have birthDate = null
And I can manually edit my birthDate in PersonModal
```

---

## Security & Privacy Considerations

### Data Minimization
- Only request necessary Facebook permissions (email, public_profile, user_birthday, user_gender)
- Do NOT request friends list, posts, or other unnecessary data
- Store only what's needed for family tree functionality

### User Consent
- Clearly explain what data is imported from Facebook
- Show Facebook permissions prompt before OAuth redirect
- Allow user to decline optional permissions (birthday, gender)

### Data Ownership
- User owns their Person data (can edit, delete)
- Unlinking Facebook doesn't delete Person (preserve tree)
- User can export their data (GDPR compliance)

### Update Policy
- ONLY sync from Facebook on first login
- Never overwrite user-edited fields
- Allow user to manually "Refresh from Facebook" (optional)

---

## Migration Plan

### Existing Users (Before Feature Launch)

**Scenario:** User authenticated with Facebook before `defaultPersonId` feature exists

**Migration Strategy:**

1. **Database Migration:**
   ```sql
   ALTER TABLE users ADD COLUMN default_person_id INTEGER;
   -- Field is NULL for all existing users
   ```

2. **Lazy Migration (Recommended):**
   - On next login, `ensureDefaultPerson()` detects `user.defaultPersonId == null`
   - Creates Person from current Facebook profile
   - Links Person to User

3. **Interactive Migration (Optional):**
   - On next login, check if user already has a Person with matching name
   - Show modal: "We found a Person that might be you. Link this as your profile?"
   - User chooses: "Yes, link" or "No, create new"

4. **Batch Migration (Advanced):**
   - Run script to attempt name-matching for all users
   - Auto-link if high confidence (exact name match)
   - Flag low-confidence matches for manual review

**Recommended Approach:** Lazy migration (simple, safe, no risk of incorrect links)

---

## Success Metrics

### Adoption Metrics
- Percentage of users with defaultPersonId set (target: 100% within 30 days)
- Average time from login to first relationship created (expect decrease)

### User Experience Metrics
- Percentage of users who edit auto-created Person (expect <20% - most accept default)
- Percentage of users who unlink defaultPerson (expect <5% - edge case)

### Data Quality Metrics
- Percentage of Person records with photoUrl populated (expect significant increase)
- Percentage of Person records with birthDate populated (expect increase if permissions granted)

### Error Metrics
- Failed Person creation rate (expect <1%)
- Duplicate Person detection rate (expect 0% with proper logic)

---

## Future Enhancements

### 1. Manual Default Person Selection
**Feature:** Allow user to choose a different Person as their default (not auto-created one)
**Use Case:** User manually created a Person before auto-creation, wants to use that instead
**Implementation:** Add "Set as My Profile" button in PersonModal

### 2. Profile Sync Settings
**Feature:** User controls which fields sync from Facebook
**Use Case:** User wants photo from Facebook but manually manages name
**Implementation:** Settings page with checkboxes for each field

### 3. Multi-Profile Support
**Feature:** User can have multiple "self" Persons (e.g., adopted, changed name)
**Use Case:** Complex identity scenarios (name changes, adoptions)
**Implementation:** Array of defaultPersonIds instead of single field

### 4. Profile Picture Upload
**Feature:** Allow user to upload custom photo (override Facebook)
**Use Case:** User wants different photo in family tree vs. Facebook
**Implementation:** File upload to cloud storage (S3, Cloudinary)

---

## Implementation Checklist

### Prerequisites
- [ ] Issue #77 (Photo Storage) completed
- [ ] Issue #78 (Facebook Profile Picture) completed (optional)
- [ ] Issue #79 (Facebook Gender/Birthday Permissions) completed
- [ ] Issue #71 (Facebook OAuth) deployed to production

### Development Tasks
- [ ] Database migration: Add `defaultPersonId` to `users` table
- [ ] Create `src/lib/server/defaultPerson.js` module
- [ ] Implement `createPersonFromFacebookProfile()`
- [ ] Implement `ensureDefaultPerson()`
- [ ] Implement `parseFacebookBirthday()` helper
- [ ] Update `src/lib/server/auth.js` signInCallback
- [ ] Update `src/lib/server/auth.js` jwtCallback
- [ ] Update `src/lib/server/auth.js` sessionCallback
- [ ] Update `src/routes/+layout.server.js` to pass defaultPersonId
- [ ] Update PedigreeView to use defaultPersonId as default focus
- [ ] Update RadialView to use defaultPersonId as default focus
- [ ] Add "Cannot delete yourself" validation to Person deletion
- [ ] Write unit tests (10+ test cases)
- [ ] Write integration tests (3+ scenarios)
- [ ] Write E2E tests (4+ user journeys)
- [ ] Manual testing on dev environment
- [ ] Update CLAUDE.md with Default Person documentation
- [ ] Create user guide: "Your Profile in the Family Tree"

### Deployment Tasks
- [ ] Deploy database migration to staging
- [ ] Test on staging with Facebook Test Users
- [ ] Deploy to production
- [ ] Monitor error logs for 48 hours
- [ ] Measure adoption metrics (weekly)

---

## Dependencies

### Blocks
- (No blocking dependencies - can implement after Issues #77-80)

### Blocked By
- Issue #77: Add Photo Storage to Person Model (MUST complete first)
- Issue #79: Request Facebook Gender and Birthday Permissions (SHOULD complete first)
- Issue #78: Enable Facebook Profile Picture Import (OPTIONAL - enhances feature)

### Related
- Issue #71: Google OAuth (COMPLETED - now Facebook OAuth)
- Issue #72: User Association to Data Model (COMPLETED)
- Issue #80: Pre-populate Gender and Birth Date (REPLACED by this feature)

---

## Open Questions

### 1. Should we update Person from Facebook on every login?
**Options:**
- A. Yes, always sync (keep Facebook as source of truth)
- B. No, only on first login (user controls after creation)
- C. User setting: "Sync from Facebook" toggle

**Recommendation:** B (only on first login) - respects user edits

### 2. How to handle name changes on Facebook?
**Scenario:** User changes name on Facebook (marriage, legal change)
**Options:**
- A. Auto-update Person name on next login
- B. Show notification: "Facebook name changed. Update tree?"
- C. Never update (user must manually edit)

**Recommendation:** B (show notification, let user choose)

### 3. What if Facebook profile has no photo?
**Options:**
- A. Use default avatar (generic silhouette)
- B. Generate avatar from initials (like Gmail)
- C. Leave photoUrl = null (no avatar)

**Recommendation:** B (generate avatar from initials)

### 4. Should we prevent deletion of defaultPerson?
**Options:**
- A. Hard block: "Cannot delete yourself"
- B. Soft warning: "This will remove you from your tree. Continue?"
- C. Allow deletion, set defaultPersonId = null

**Recommendation:** A (hard block - prevent accidental self-deletion)

---

## Conclusion

The Default Person feature provides a seamless bridge between authentication (User) and family tree data (Person), leveraging Facebook profile data to eliminate onboarding friction. By automatically creating and linking a Person entity on first login, we give users a clear starting point for building their family tree while respecting data ownership and privacy.

**Next Step:** Create user stories with BDD acceptance criteria for backlog grooming.

**Estimated Timeline:** 3-5 days development + 2 days testing = 5-7 days total

**Risk Level:** LOW (well-defined scope, clear integration points, comprehensive edge case handling)

---

**Document Version:** 1.0
**Author:** Claude Sonnet 4.5 (Agile PM Mode)
**Ready for:** User Story Creation → Backlog Grooming → Implementation
