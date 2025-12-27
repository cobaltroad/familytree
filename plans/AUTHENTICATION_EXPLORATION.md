# Authentication & Multi-User Exploration

**Date:** 2025-12-26
**Status:** Exploration Phase
**Stakeholder:** Product Owner / Development Team

## Executive Summary

This document explores authentication and multi-user capabilities for the family tree application. Currently, the application is a single-user, unauthenticated system with no access controls. This exploration evaluates different authentication approaches, multi-user scenarios, and implementation trade-offs.

## Current State Analysis

### Application Architecture
- **Framework:** SvelteKit full-stack with SQLite database via Drizzle ORM
- **Data Model:** Person and Relationship entities with cascade deletes
- **Access Control:** None - database is fully accessible to anyone with URL access
- **Deployment:** Static adapter (no server-side state management)
- **Frontend:** Hash-based routing, client-side only
- **Data Sensitivity:** Family genealogy data (names, dates, relationships)

### Current Pain Points
1. **No privacy protection**: Anyone with the URL can view/edit/delete all family data
2. **No audit trail**: Cannot track who made changes or when
3. **Single family limitation**: Cannot support multiple independent family trees
4. **No collaboration**: Family members cannot work together on shared tree
5. **Data loss risk**: No per-user backups or version control

## Authentication Approach Options

### Option 1: Simple Password Protection (Single-User Enhanced)
**Description:** Add a single password to protect the application, no individual user accounts.

**Pros:**
- Simplest implementation (1-2 days)
- No database schema changes
- No user management complexity
- Works with static deployment
- Maintains current single-family-tree model

**Cons:**
- No per-user tracking or audit trails
- Shared password security risk
- Cannot support collaboration features
- No granular permissions (all-or-nothing access)
- Password sharing defeats purpose

**Implementation:**
- Environment variable password stored server-side
- Login page with password field
- Session cookie or localStorage token
- SvelteKit hooks for route protection

**Best For:** Solo family historian who wants basic privacy

---

### Option 2: Email/Password Authentication (Traditional)
**Description:** Full user account system with email and password credentials.

**Pros:**
- Industry-standard, well-understood pattern
- Full control over user data and security
- Enables audit trails (track who changed what)
- Supports multi-user collaboration
- Works offline (no external dependencies)

**Cons:**
- Complex implementation (password hashing, reset flows, email verification)
- Security burden (bcrypt, salt, password policies)
- User friction (password creation, remembering, reset)
- Requires email sending infrastructure (password resets)
- Database schema changes (users table, sessions)

**Implementation:**
- Add `users` table (id, email, passwordHash, createdAt)
- Add `sessions` table (id, userId, token, expiresAt)
- Password hashing with bcrypt (10+ rounds)
- Email verification flow (optional but recommended)
- Password reset flow with expiring tokens
- SvelteKit session management

**Best For:** Applications needing full control, offline operation, and audit trails

---

### Option 3: Social Login (OAuth/OIDC)
**Description:** Authenticate via third-party providers (Google, GitHub, Facebook, etc.)

**Providers to Consider:**
- **Google:** Ubiquitous, family-friendly, free tier
- **GitHub:** Developer-friendly, already using GitHub for project
- **Facebook:** High adoption, but privacy concerns
- **Apple:** iOS-friendly, privacy-focused
- **Microsoft:** Enterprise-friendly

**Pros:**
- No password management burden (provider handles security)
- Better UX (one-click login, no password to remember)
- Email verification already done by provider
- Trust signals (users trust Google/GitHub)
- Faster implementation than email/password (no reset flows)

**Cons:**
- External dependency (provider downtime affects app)
- Privacy concerns (user data shared with provider)
- Requires internet connection
- Users without provider account excluded
- Provider policy changes could affect app
- Callback URL requirements (affects deployment)

**Implementation:**
- SvelteKit OAuth library (e.g., Auth.js/SvelteKitAuth)
- Add `users` table (id, provider, providerUserId, email, name)
- Add `sessions` table for auth tokens
- Configure OAuth apps with each provider
- Handle OAuth callback routes

**Best For:** Applications prioritizing ease of use and modern UX

---

### Option 4: Passkeys/WebAuthn (Passwordless)
**Description:** Use biometric or hardware authenticators (Touch ID, Face ID, YubiKey).

**Pros:**
- Best security (phishing-resistant, no shared secrets)
- Best UX (touch to login, no passwords)
- Modern, cutting-edge
- Works offline (biometric stored locally)
- No password reset flows needed

**Cons:**
- Bleeding-edge (some browser support issues)
- Complex implementation (WebAuthn API)
- Requires compatible devices (not all users have)
- Account recovery is complex (lost device scenario)
- Limited SvelteKit libraries (manual implementation likely)
- User education required

**Implementation:**
- WebAuthn API integration
- Add `users` table (id, username, email)
- Add `credentials` table (id, userId, credentialId, publicKey, counter)
- Registration ceremony (create credential)
- Authentication ceremony (verify signature)
- Fallback authentication method needed

**Best For:** Tech-savvy users with modern devices, future-proof apps

---

### Option 5: Magic Link (Passwordless Email)
**Description:** Send one-time login links to user's email address.

**Pros:**
- No password to remember or manage
- Simple UX (enter email, click link)
- Secure (time-limited, single-use tokens)
- No password reset flows needed
- Email verification built-in

**Cons:**
- Requires email infrastructure (SendGrid, Postmark, etc.)
- Email deliverability issues (spam filters)
- Slower login flow (wait for email)
- Requires reliable email access
- Email compromise = account compromise

**Implementation:**
- Add `users` table (id, email, name)
- Add `magic_links` table (id, userId, token, expiresAt, used)
- Email sending service integration
- Token generation (crypto random, 32+ bytes)
- Token expiration handling (15-30 min)
- SvelteKit session management

**Best For:** Low-friction apps where email reliability is high

---

## Hybrid Approach Recommendation

**Combination: Social Login (primary) + Email/Password (fallback)**

### Why This Works Best
1. **Ease of Use:** Most users have Google/GitHub accounts (one-click login)
2. **Flexibility:** Users without preferred provider can use email/password
3. **Privacy Options:** Users can choose their comfort level
4. **Progressive Enhancement:** Start with one provider, add more later
5. **Real-World Pattern:** Common in modern apps (Notion, Linear, etc.)

### Implementation Priority
1. **Phase 1:** Google OAuth (highest adoption, family-friendly)
2. **Phase 2:** Email/Password (fallback for privacy-conscious users)
3. **Phase 3:** GitHub OAuth (leverage existing account, developer-friendly)
4. **Future:** Passkeys as enhancement (cutting edge, optional)

---

## Multi-User Model Options

### Model A: Single-User with Login (No Sharing)
**Description:** Each user has their own isolated family tree, no collaboration.

**Data Model:**
```sql
users (id, email, name, provider, createdAt)
people (id, userId, firstName, lastName, ...) -- Add userId FK
relationships (id, userId, person1Id, person2Id, ...) -- Add userId FK
```

**Pros:**
- Simple to implement (add userId to existing tables)
- Clear data isolation (no permission complexity)
- No sharing/collaboration code needed
- Easy to reason about security

**Cons:**
- Cannot collaborate with family members
- Duplicate data if multiple family members use app independently
- No shared source of truth for family history

**Best For:** Solo researchers who want privacy

---

### Model B: Multi-User with Shared Family Trees
**Description:** Multiple users can view/edit the same family tree.

**Data Model:**
```sql
users (id, email, name, provider, createdAt)
family_trees (id, name, ownerId, createdAt)
tree_members (id, treeId, userId, role, permissions, invitedAt)
people (id, treeId, firstName, lastName, ...) -- Belongs to tree, not user
relationships (id, treeId, person1Id, person2Id, ...)
```

**Roles:**
- **Owner:** Full control (delete tree, manage members)
- **Editor:** Can add/edit/delete people and relationships
- **Viewer:** Read-only access
- **Contributor:** Can add but not delete

**Pros:**
- True collaboration (family works together)
- Single source of truth (no duplicate data)
- Flexible permissions (viewers vs editors)
- Family sharing is intuitive use case

**Cons:**
- Complex permissions logic
- Conflict resolution (simultaneous edits)
- Invitation/sharing flows needed
- Tree membership management UI

**Best For:** Families working together on genealogy

---

### Model C: Hybrid - Personal Trees + Shared Trees
**Description:** Users have personal trees by default, can create/join shared trees.

**Data Model:**
```sql
users (id, email, name, provider, createdAt)
family_trees (id, name, ownerId, isShared, createdAt)
tree_members (id, treeId, userId, role, permissions) -- Only for shared trees
people (id, treeId, firstName, lastName, ...)
relationships (id, treeId, person1Id, person2Id, ...)
```

**Pros:**
- Flexibility (solo or collaborative workflows)
- Progressive disclosure (start solo, share later)
- Multiple tree support (maternal vs paternal sides)
- Clear ownership model

**Cons:**
- Most complex to implement
- Tree switching UI needed
- Potential user confusion (which tree am I editing?)

**Best For:** Users who want both private research and family collaboration

---

## Recommended Multi-User Model

**Model B: Shared Family Trees** (with future option to add personal trees)

### Rationale
1. **Core Use Case:** Genealogy is inherently collaborative (multiple family members contribute)
2. **Data Quality:** Shared trees reduce duplicate/conflicting data
3. **Engagement:** Collaboration drives app usage and value
4. **Simplicity:** Start with one clear model, add personal trees later if needed
5. **Market Fit:** Matches successful genealogy apps (Ancestry, FamilySearch)

### Implementation Approach
- **MVP:** Single shared tree per user (user creates one tree, invites family)
- **Phase 2:** Multiple shared trees (user can create/join multiple families)
- **Phase 3:** Personal trees as workspace (draft before sharing)

---

## Data Privacy & Security Considerations

### Data Sensitivity Analysis
**Genealogy data sensitivity levels:**
- **Public:** Deceased ancestors (>100 years old) - Low sensitivity
- **Sensitive:** Living people's names and dates - Medium sensitivity
- **Highly Sensitive:** Medical info, causes of death - High sensitivity (not currently supported)

### Security Requirements

#### Authentication Security
- [ ] Password hashing with bcrypt (12+ rounds) if using email/password
- [ ] Secure session management (httpOnly cookies, SameSite=Strict)
- [ ] CSRF protection (SvelteKit built-in)
- [ ] Rate limiting on login attempts (5 attempts, 15-min lockout)
- [ ] Session expiration (30-day rolling, 1-year max)
- [ ] Secure password reset flow (expiring tokens, 15-min validity)

#### Authorization Security
- [ ] Row-level security (users can only access their tree data)
- [ ] Permission checks on ALL mutations (create, update, delete)
- [ ] API endpoint protection (check user auth + tree membership)
- [ ] Prevent horizontal privilege escalation (can't access other trees)
- [ ] Audit logging (who changed what, when)

#### Data Protection
- [ ] Database encryption at rest (if hosting on cloud)
- [ ] HTTPS enforcement (redirect HTTP → HTTPS)
- [ ] XSS protection (Svelte auto-escaping, CSP headers)
- [ ] SQL injection protection (Drizzle ORM parameterized queries)
- [ ] GDPR compliance considerations (EU users)
  - Right to access (export tree data)
  - Right to erasure (delete account + data)
  - Data portability (GEDCOM export)
  - Privacy policy and terms of service

#### Backup & Recovery
- [ ] Automated database backups (daily, 30-day retention)
- [ ] Point-in-time recovery capability
- [ ] User-initiated tree export (GEDCOM format)
- [ ] Account recovery flow (email verification)

### Privacy Settings (Future Enhancement)
- **Living person privacy:** Hide living people from non-family viewers
- **Birthdate obfuscation:** Show "Living" instead of dates for people <100 years
- **Relationship privacy:** Hide sensitive relationships (e.g., adoptions)
- **Tree visibility:** Public (searchable), Unlisted (link-only), Private (members only)

---

## Implementation Complexity & Timeline Estimates

### Option 1: Simple Password Protection
**Complexity:** Low
**Timeline:** 1-2 days
**LOC Added:** ~150 lines

**Tasks:**
- Add login page component (50 LOC)
- Add SvelteKit hooks for auth check (30 LOC)
- Session management with cookies (40 LOC)
- Logout flow (20 LOC)
- Tests (10 LOC)

---

### Option 2: Email/Password Auth (Single-User)
**Complexity:** Medium
**Timeline:** 5-7 days
**LOC Added:** ~800 lines

**Tasks:**
- Database schema migration (users, sessions tables) (1 day)
- Registration flow (email, password, validation) (1 day)
- Login flow (password verification, session creation) (1 day)
- Password reset flow (token generation, email, verification) (1.5 days)
- Email infrastructure setup (SendGrid/Postmark integration) (0.5 day)
- SvelteKit auth hooks and middleware (1 day)
- UI components (login, register, reset forms) (1 day)
- Tests (0.5 day)

---

### Option 3: Google OAuth (Single-User)
**Complexity:** Medium
**Timeline:** 3-4 days
**LOC Added:** ~400 lines

**Tasks:**
- Database schema migration (users, sessions tables) (0.5 day)
- Google OAuth app setup (credentials, redirect URIs) (0.5 day)
- Auth.js (SvelteKitAuth) integration (1 day)
- OAuth callback handling and session creation (1 day)
- UI components (login button, user menu) (0.5 day)
- Account linking flow (if adding email/password later) (0.5 day)
- Tests (0.5 day)

---

### Option 4: Shared Family Trees (Multi-User)
**Complexity:** High
**Timeline:** 10-14 days (in addition to auth implementation)
**LOC Added:** ~1500 lines

**Tasks:**
- Database schema migration (family_trees, tree_members) (1 day)
- Data model refactoring (add treeId to people, relationships) (2 days)
- Permission system (role-based access control) (2 days)
- Tree creation and management UI (1.5 days)
- Member invitation flow (email invites, accept/decline) (2 days)
- Tree switching UI (dropdown, routing changes) (1 day)
- Migration script (existing data → default tree) (0.5 day)
- Permission checks in all API routes (1.5 days)
- Tests (integration, permissions, flows) (2 days)

---

### Hybrid Recommendation Timeline
**Total Complexity:** Medium-High
**Total Timeline:** 15-20 days (3-4 weeks)

**Phase 1: Google OAuth + Single-User** (3-4 days)
- Get authentication working quickly
- Users can secure their data
- Foundation for multi-user

**Phase 2: Shared Family Trees** (10-14 days)
- Add multi-user data model
- Implement permissions and invitations
- Enable collaboration

**Phase 3: Email/Password Fallback** (5-7 days, optional)
- Add alternative auth method
- Increase accessibility
- Privacy-conscious option

---

## User Experience Trade-offs

### UX Comparison Matrix

| Factor | Simple Password | Email/Password | Social Login | Passkeys | Magic Link |
|--------|----------------|----------------|--------------|----------|------------|
| **First-time login speed** | Fast (1 field) | Slow (form, verify) | Fast (1 click) | Medium (setup) | Slow (email wait) |
| **Returning user login** | Fast | Medium | Fastest | Fastest | Slow |
| **Password fatigue** | Low (shared) | High | None | None | None |
| **Trust & security perception** | Low | Medium | High (trusted brand) | Highest | Medium |
| **Account recovery** | N/A | Complex | Easy (provider) | Complex | Easy |
| **Privacy concerns** | None | None | High (data sharing) | Low | Low |
| **Device compatibility** | Universal | Universal | Universal | Modern only | Universal |
| **Offline capability** | Yes | Yes | No (initial) | Yes | No |

### Recommended UX Flow (Hybrid Approach)

#### First-Time User Registration
1. Land on marketing page or login gate
2. See prominent "Continue with Google" button
3. See smaller "Or use email and password" link below
4. One-click Google → Consent screen → Logged in (5 seconds)
5. First-time setup: "Create your family tree" wizard
   - Tree name (default: "[User]'s Family Tree")
   - Add yourself as first person (pre-filled from Google profile)
   - Optional: Invite family members

#### Returning User Login
1. Land on login page
2. "Continue with Google" (instant if already logged into Google)
3. Redirect to last-viewed tree or dashboard

#### Collaboration Flow (Inviting Family)
1. In tree settings, click "Invite Family Members"
2. Enter email addresses (comma-separated or one-per-line)
3. Select role: Viewer, Contributor, Editor
4. Send invitations (email with magic link)
5. Invitee clicks link → Prompted to create account or login
6. After auth, auto-added to tree with assigned role
7. Toast notification: "Welcome to [Tree Name]! You're now an Editor."

---

## Migration Path for Existing Data

### Current State
- Unauthenticated app with SQLite database
- People and relationships tables with no user association
- No sessions or users

### Migration Strategy

**Assumption:** Current app has 1 primary user (the developer/owner)

**Step 1: Add Authentication (No Data Changes)**
- Add `users` table (empty initially)
- Add `sessions` table (empty initially)
- Add login page
- Auth protects all routes
- Existing data remains untouched

**Step 2: Seed Owner Account**
- Create first user account (owner)
- Option A: Pre-seed with environment variable email
- Option B: Registration flow creates first user
- Assign userId=1 to owner

**Step 3: Add User Association to Data**
- Add migration: `ALTER TABLE people ADD COLUMN user_id INTEGER REFERENCES users(id)`
- Add migration: `ALTER TABLE relationships ADD COLUMN user_id INTEGER REFERENCES users(id)`
- Backfill: `UPDATE people SET user_id = 1` (assign all to owner)
- Backfill: `UPDATE relationships SET user_id = 1`

**Step 4: Migrate to Shared Trees (Optional)**
- Add `family_trees` table
- Add `tree_members` table
- Create default tree: `INSERT INTO family_trees (name, owner_id) VALUES ('My Family Tree', 1)`
- Change schema: `people.user_id` → `people.tree_id`
- Change schema: `relationships.user_id` → `relationships.tree_id`
- Backfill: Assign all people/relationships to default tree
- Add owner to `tree_members` with Owner role

**Rollback Plan:**
- Keep database backups before each migration
- Write reversible migrations (up/down)
- Test on development copy first

---

## Deployment Considerations

### Current Deployment (Static Adapter)
The app currently uses `@sveltejs/adapter-static` which means:
- No server-side rendering or API routes at runtime
- All routes are pre-rendered HTML files
- No session management on server
- Deployed to static hosts (Netlify, Vercel, GitHub Pages)

### Authentication Requires Server Runtime
**Problem:** OAuth callbacks, session management, and API protection require a **server runtime**.

**Solution Options:**

#### Option A: Switch to Node Adapter (Recommended)
- Change to `@sveltejs/adapter-node`
- Deploy to platforms supporting Node.js (Vercel, Netlify Functions, Railway, Render)
- Enables SvelteKit server routes (`+server.js`)
- Session cookies work properly
- Full control over auth flows

**Migration:**
```bash
npm uninstall @sveltejs/adapter-static
npm install @sveltejs/adapter-node
# Update svelte.config.js
```

#### Option B: Keep Static + Serverless Functions
- Keep static adapter for frontend
- Add separate serverless functions for auth (Vercel Functions, Netlify Functions)
- API routes call serverless endpoints
- More complex architecture (split frontend/backend)

**Recommended:** Option A (Node Adapter) for simplicity and control

### Environment Variables (Required)
```env
# Database
DATABASE_URL=./familytree.db

# Session Secret (generate with: openssl rand -base64 32)
SESSION_SECRET=<random-32-byte-string>

# Google OAuth (if using)
GOOGLE_CLIENT_ID=<from-google-cloud-console>
GOOGLE_CLIENT_SECRET=<from-google-cloud-console>
OAUTH_CALLBACK_URL=https://yourdomain.com/auth/callback/google

# Email (if using email/password or magic links)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=<sendgrid-api-key>
FROM_EMAIL=noreply@yourdomain.com

# App Config
PUBLIC_APP_URL=https://yourdomain.com
NODE_ENV=production
```

### Hosting Platform Recommendations

| Platform | Pros | Cons | Cost |
|----------|------|------|------|
| **Vercel** | Easy deploy, great DX, auto-scaling | Expensive for high traffic | Free tier, then $20+/mo |
| **Netlify** | Similar to Vercel, generous free tier | Function cold starts | Free tier, then $19+/mo |
| **Railway** | Simple, includes database hosting | Less mature than Vercel | $5+/mo usage-based |
| **Render** | Free tier includes DB, easy setup | Slower deploys | Free tier, then $7+/mo |
| **Fly.io** | Full control, Docker-based | Steeper learning curve | Free tier, then usage-based |
| **DigitalOcean App Platform** | Predictable pricing, simple | Less features than Vercel | $5+/mo |

**Recommendation for Family Tree App:**
- **Development:** Railway or Render (free tier, includes DB)
- **Production:** Vercel or Netlify (professional, reliable, good support)

---

## Recommended Implementation Plan

### Phase 1: Foundation (Week 1) - CRITICAL PATH
**Goal:** Get basic authentication working, protect existing data

**Stories:**
1. **Set up development environment for authentication**
   - Switch from static to node adapter
   - Set up environment variables
   - Configure HTTPS for local development (required for OAuth)

2. **Implement Google OAuth authentication**
   - Create Google Cloud Console project
   - Configure OAuth credentials
   - Install Auth.js (SvelteKitAuth)
   - Add login page with "Continue with Google" button
   - Implement OAuth callback handler
   - Create session management

3. **Add users table and seed owner account**
   - Create users table migration (id, email, name, provider, providerUserId)
   - Create sessions table migration
   - Seed first user account (owner)
   - Associate owner with environment variable email

4. **Protect existing routes with authentication**
   - Add SvelteKit hooks for auth checking
   - Redirect unauthenticated users to login
   - Add user menu with logout
   - Add session persistence (remember me)

**Acceptance Criteria:**
- Unauthenticated users see login page
- Google OAuth flow works end-to-end
- After login, users see existing family tree
- Logout works and redirects to login
- Sessions persist across browser restarts

---

### Phase 2: User Association (Week 2)
**Goal:** Associate existing data with authenticated user, enable multi-user foundation

**Stories:**
1. **Add user association to data model**
   - Add userId column to people table
   - Add userId column to relationships table
   - Backfill existing data with owner userId
   - Update API routes to filter by userId

2. **Add user-specific data isolation**
   - Add permission checks to all API routes
   - Ensure users can only see their own data
   - Add tests for authorization logic
   - Prevent horizontal privilege escalation

3. **Add basic user profile and settings**
   - User profile page (view email, name, avatar from Google)
   - Account deletion flow (GDPR compliance)
   - Data export (download all people/relationships as JSON or GEDCOM)

**Acceptance Criteria:**
- Multiple users can register and have independent trees
- User A cannot see or edit User B's data
- API routes check authentication AND authorization
- User can delete their account and all associated data
- User can export their data

---

### Phase 3: Shared Family Trees (Weeks 3-4)
**Goal:** Enable true collaboration with shared trees and permissions

**Stories:**
1. **Implement family tree data model**
   - Add family_trees table (id, name, ownerId, createdAt)
   - Add tree_members table (id, treeId, userId, role, permissions)
   - Migrate userId → treeId in people and relationships tables
   - Create default tree for each existing user

2. **Build tree management UI**
   - Tree dashboard (list of trees user owns/is member of)
   - Create new tree flow
   - Rename/delete tree (owner only)
   - Tree settings page

3. **Implement invitation system**
   - Invite members by email
   - Email invitation with magic link
   - Accept/decline invitation
   - List members in tree settings
   - Remove members (owner only)
   - Change member roles (owner only)

4. **Add role-based permissions**
   - Owner: Full control (manage tree, members, data)
   - Editor: Create, edit, delete people and relationships
   - Contributor: Create and edit, but not delete
   - Viewer: Read-only access
   - Enforce permissions in API routes
   - UI adjustments based on role (hide delete buttons for viewers)

5. **Tree switching and navigation**
   - Tree switcher dropdown in header
   - Remember last-viewed tree in session
   - Route protection based on tree membership
   - Redirect to tree dashboard if accessing non-member tree

**Acceptance Criteria:**
- Users can create multiple family trees
- Users can invite others via email
- Invited users receive email with accept link
- Different roles have different permissions enforced
- UI adapts to user's role (no edit buttons for viewers)
- Users can switch between trees seamlessly
- All existing tests pass with multi-tree model

---

### Phase 4: Polish & Security Hardening (Week 5, Optional)
**Goal:** Production-ready security and UX polish

**Stories:**
1. **Add email/password authentication (fallback)**
   - Registration form (email, password, confirm password)
   - Password validation (min 8 chars, complexity)
   - Password hashing with bcrypt (12 rounds)
   - Password reset flow (email token, 15-min expiry)
   - Email verification flow

2. **Security hardening**
   - Rate limiting on login attempts
   - CSRF protection validation
   - XSS protection headers (CSP)
   - SQL injection testing (Drizzle ORM should prevent)
   - Security audit of all API routes
   - Penetration testing (basic manual testing)

3. **Privacy and GDPR compliance**
   - Privacy policy page
   - Terms of service page
   - Cookie consent banner (EU users)
   - Account deletion with data erasure confirmation
   - Data export in standardized format (GEDCOM)
   - Audit log (who changed what, when)

4. **Production deployment**
   - Choose hosting platform (Vercel recommended)
   - Set up production environment variables
   - Configure domain and SSL
   - Set up database backups (daily, 30-day retention)
   - Set up error monitoring (Sentry or similar)
   - Performance monitoring
   - Deploy and smoke test

**Acceptance Criteria:**
- Email/password auth works as alternative to Google
- Password reset flow tested end-to-end
- Security checklist completed
- GDPR compliance features functional
- Production deployment stable
- Backups configured and tested
- Monitoring alerts configured

---

## Open Questions & Decisions Needed

### Critical Decisions (Need Product Owner Input)
1. **Primary use case:** Solo researcher or family collaboration?
   - **Impacts:** Whether to prioritize single-user or multi-user first
   - **Recommendation:** Start multi-user (collaborative is core value prop)

2. **Authentication method:** Social login only, or also email/password?
   - **Impacts:** Implementation complexity and user accessibility
   - **Recommendation:** Start with Google OAuth, add email/password in Phase 4

3. **Data migration:** What happens to existing data?
   - **Impacts:** Migration strategy and testing burden
   - **Recommendation:** Assign all existing data to first registered user (owner)

4. **Deployment platform:** Where to host?
   - **Impacts:** Cost, performance, features available
   - **Recommendation:** Vercel (ease of use, reliable, good DX)

5. **Free vs paid:** Monetization strategy?
   - **Impacts:** Features to limit, payment integration scope
   - **Recommendation:** Start free (no limits), monetize later if needed

### Technical Decisions (Development Team)
1. **Session storage:** Cookies vs localStorage vs sessionStorage?
   - **Recommendation:** httpOnly cookies (most secure, works with SSR)

2. **Auth library:** Auth.js vs custom implementation?
   - **Recommendation:** Auth.js (battle-tested, well-maintained)

3. **Email provider:** SendGrid vs Postmark vs AWS SES?
   - **Recommendation:** Postmark (better deliverability, generous free tier)

4. **Tree ID in URL:** `/tree/123` vs subdomain vs query param?
   - **Recommendation:** `/tree/[treeId]` route structure

### Future Enhancements (Out of Scope for MVP)
- [ ] GitHub OAuth provider (in addition to Google)
- [ ] Passkeys/WebAuthn support
- [ ] Real-time collaboration (multiple users editing simultaneously)
- [ ] Conflict resolution UI (when two users edit same person)
- [ ] Activity feed (recent changes in tree)
- [ ] Commenting on people/relationships
- [ ] Tagging and custom fields
- [ ] Advanced privacy controls (hide living people)
- [ ] Public tree profiles (share tree with read-only link)
- [ ] GEDCOM import/export
- [ ] DNA integration (23andMe, Ancestry DNA)

---

## Success Metrics

### MVP Success Criteria (Phase 1-2)
- [ ] 100% of routes protected by authentication
- [ ] User can register with Google OAuth in <30 seconds
- [ ] User can logout and login again successfully
- [ ] Existing data visible after migration
- [ ] Zero security vulnerabilities in initial audit
- [ ] All existing tests pass after auth implementation

### Full Implementation Success (Phase 3-4)
- [ ] Users can create and manage family trees
- [ ] Users can invite family members successfully
- [ ] 95%+ of invited users can join without support requests
- [ ] Multi-user editing works without data conflicts
- [ ] All permission levels enforced correctly
- [ ] GDPR compliance features functional
- [ ] Production deployment stable (99.9% uptime)

### User Satisfaction Targets
- [ ] Login flow completion rate >90%
- [ ] Invitation acceptance rate >70%
- [ ] User reports feeling data is "secure" (survey)
- [ ] No user-reported security incidents in first 3 months
- [ ] Support requests for auth issues <5% of users

---

## References & Resources

### SvelteKit Authentication
- [Auth.js (SvelteKitAuth)](https://authjs.dev/reference/sveltekit)
- [SvelteKit Hooks Documentation](https://kit.svelte.dev/docs/hooks)
- [SvelteKit Sessions](https://kit.svelte.dev/docs/server-only-modules)

### OAuth Providers
- [Google OAuth Setup](https://developers.google.com/identity/protocols/oauth2)
- [GitHub OAuth Setup](https://docs.github.com/en/developers/apps/building-oauth-apps)

### Security Best Practices
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [bcrypt Best Practices](https://auth0.com/blog/hashing-in-action-understanding-bcrypt/)

### Genealogy-Specific Considerations
- [GEDCOM Standard](https://www.gedcom.org/)
- [FamilySearch API](https://www.familysearch.org/developers/) (for future integration)
- [Ancestry DNA Privacy Concerns](https://www.eff.org/deeplinks/2023/04/genetic-genealogy-databases-and-law-enforcement) (privacy model insights)

---

## Appendix: Database Schema (Proposed)

### Users Table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  avatar_url TEXT,
  provider TEXT NOT NULL, -- 'google', 'github', 'email'
  provider_user_id TEXT, -- OAuth provider's user ID
  password_hash TEXT, -- Only for email/password auth
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_login_at TEXT
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_provider_id ON users(provider, provider_user_id);
```

### Sessions Table
```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY, -- UUID or random token
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_accessed_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```

### Family Trees Table (Multi-User Model)
```sql
CREATE TABLE family_trees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  description TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_family_trees_owner_id ON family_trees(owner_id);
```

### Tree Members Table
```sql
CREATE TABLE tree_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tree_id INTEGER NOT NULL REFERENCES family_trees(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'owner', 'editor', 'contributor', 'viewer'
  invited_by INTEGER REFERENCES users(id),
  invited_at TEXT DEFAULT CURRENT_TIMESTAMP,
  joined_at TEXT,
  UNIQUE(tree_id, user_id)
);

CREATE INDEX idx_tree_members_tree_id ON tree_members(tree_id);
CREATE INDEX idx_tree_members_user_id ON tree_members(user_id);
```

### Updated People Table
```sql
-- Migration: Add tree_id column
ALTER TABLE people ADD COLUMN tree_id INTEGER REFERENCES family_trees(id) ON DELETE CASCADE;

CREATE INDEX idx_people_tree_id ON people(tree_id);
```

### Updated Relationships Table
```sql
-- Migration: Add tree_id column
ALTER TABLE relationships ADD COLUMN tree_id INTEGER REFERENCES family_trees(id) ON DELETE CASCADE;

CREATE INDEX idx_relationships_tree_id ON relationships(tree_id);
```

### Password Reset Tokens Table (If using email/password)
```sql
CREATE TABLE password_reset_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);
```

---

**Document Version:** 1.0
**Last Updated:** 2025-12-26
**Next Review:** After Phase 1 implementation
