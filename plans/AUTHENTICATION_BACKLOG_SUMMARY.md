# Authentication & Multi-User Backlog Summary

**Date Created:** 2025-12-26
**Status:** Ready for Product Owner Review & Grooming
**Epic:** Authentication & Multi-User Support

## Overview

This document summarizes the authentication exploration and the groomed user stories now in the Prioritized Backlog. All stories follow BDD (Behavior-Driven Development) principles with Given-When-Then acceptance criteria and comprehensive test requirements.

## Created GitHub Issues (Backlog)

1. **Story #71: Implement Google OAuth Authentication** (Phase 1, Week 1)
   - **Priority:** HIGH - CRITICAL PATH
   - **Persona:** Family historian
   - **Goal:** Log in with Google account to protect genealogy data
   - **Estimate:** 3-4 days
   - **Blocks:** All other authentication stories
   - **Link:** https://github.com/cobaltroad/familytree/issues/71

2. **Story #72: Add User Association to Data Model** (Phase 2, Week 2)
   - **Priority:** HIGH - CRITICAL PATH
   - **Persona:** Family historian
   - **Goal:** Private, isolated family tree data
   - **Estimate:** 5-7 days
   - **Blocked By:** Story #71
   - **Link:** https://github.com/cobaltroad/familytree/issues/72

3. **Story #73: Implement Shared Family Trees with Role-Based Permissions** (Phase 3, Weeks 3-4)
   - **Priority:** HIGH
   - **Persona:** Family member (collaborator)
   - **Goal:** Collaborate with relatives on shared tree
   - **Estimate:** 10-14 days
   - **Blocked By:** Stories #71, #72
   - **Link:** https://github.com/cobaltroad/familytree/issues/73

4. **Story #74: Add Email/Password Authentication (Fallback)** (Phase 4, Week 5)
   - **Priority:** MEDIUM (Optional)
   - **Persona:** Privacy-conscious user
   - **Goal:** Login without Google OAuth (privacy alternative)
   - **Estimate:** 5-7 days
   - **Blocked By:** Story #71
   - **Link:** https://github.com/cobaltroad/familytree/issues/74

## Supporting Documentation

- **Exploration Document:** `/plans/AUTHENTICATION_EXPLORATION.md` (comprehensive 300+ line analysis)
  - Authentication approach comparison (5 options evaluated)
  - Multi-user model analysis (3 models compared)
  - Security considerations and GDPR compliance
  - Implementation timeline estimates
  - Database schema design
  - Deployment considerations

## Critical Decisions Required (Product Owner)

Before implementation can begin, the following decisions need product owner approval:

### 1. Primary Use Case
**Question:** Is the primary use case solo research or family collaboration?

**Options:**
- **Solo Research:** Each user has their own isolated tree (simpler, faster to implement)
- **Family Collaboration:** Multiple users work on shared trees (core value proposition)

**Recommendation:** Family collaboration (Stories #71 → #72 → #73 sequence)

**Impact:** Determines implementation priority and phasing

---

### 2. Authentication Methods
**Question:** Which authentication methods should we support?

**Options:**
- **Google OAuth Only:** Simplest, fastest (3-4 days)
- **Google OAuth + Email/Password:** Maximum accessibility (8-11 days total)
- **Social Login Only (Google + GitHub):** Developer-friendly (5-6 days)

**Recommendation:** Google OAuth first (Story #71), Email/Password later if needed (Story #74)

**Impact:** Development timeline and user accessibility

---

### 3. Multi-User Rollout Strategy
**Question:** Should we implement multi-user immediately or start single-user?

**Options:**
- **Immediate Multi-User:** Stories #71 → #72 → #73 in sequence (15-20 days)
- **Phased Rollout:** Story #71 → #72 first (single-user), Story #73 later (8-11 days Phase 1)

**Recommendation:** Immediate multi-user (full sequence) - collaboration is core value

**Impact:** Time to market and feature completeness

---

### 4. Existing Data Migration
**Question:** What happens to existing family tree data?

**Options:**
- **Assign to First User:** First person to register gets all existing data (recommended)
- **Public Archive:** Existing data visible to all users (not recommended for privacy)
- **Delete and Start Fresh:** All users start with empty trees (data loss)

**Recommendation:** Assign to first user (Story #72 handles migration)

**Impact:** Data continuity and user experience

---

### 5. Deployment Platform
**Question:** Where should we host the authenticated application?

**Options:**
- **Vercel:** Easy, reliable, good support ($0-20/mo)
- **Railway:** Simple, includes DB hosting ($5+/mo)
- **Render:** Free tier includes DB ($0-7/mo)

**Recommendation:** Vercel for production, Railway for development/staging

**Impact:** Cost, deployment complexity, reliability

---

## Implementation Timeline

### Recommended Sequence (4 weeks total)

#### Week 1: Foundation (Story #71)
- **Deliverable:** Google OAuth authentication working
- **User Impact:** Users must log in to access app
- **Risk:** Low (well-established pattern)
- **Estimate:** 3-4 days

#### Week 2: User Association (Story #72)
- **Deliverable:** Each user has isolated tree data
- **User Impact:** Multiple users can use app without conflicts
- **Risk:** Medium (database migration required)
- **Estimate:** 5-7 days

#### Weeks 3-4: Shared Trees (Story #73)
- **Deliverable:** Family collaboration with invitations and permissions
- **User Impact:** Families can work together on shared tree
- **Risk:** High (complex permissions, email infrastructure)
- **Estimate:** 10-14 days

#### Week 5 (Optional): Email/Password (Story #74)
- **Deliverable:** Alternative login method for non-Google users
- **User Impact:** Broader accessibility
- **Risk:** Medium (password security, reset flows)
- **Estimate:** 5-7 days

**Total:** 15-20 days for core authentication + multi-user (Weeks 1-4)
**With Optional:** 20-27 days including email/password fallback

---

## Key Technical Changes

### Database Schema
**New Tables:**
- `users` - User accounts (email, name, provider, password_hash)
- `sessions` - Authentication sessions (token, expiration)
- `family_trees` - Shared family trees (name, owner)
- `tree_members` - Tree membership and roles (user-tree association)
- `tree_invitations` - Email invitations (token, expiration)
- `password_reset_tokens` - Password reset flow (if email/password enabled)

**Modified Tables:**
- `people` - Add `tree_id` (replaces `user_id` after Phase 3)
- `relationships` - Add `tree_id`

### Architecture Changes
- **Adapter:** Switch from `@sveltejs/adapter-static` to `@sveltejs/adapter-node`
- **Auth Library:** Install Auth.js (SvelteKitAuth) for OAuth
- **Email Service:** Configure SMTP (Postmark recommended)
- **Deployment:** Requires server runtime (no longer static hosting)

### Security Enhancements
- Session management with httpOnly cookies
- CSRF protection (SvelteKit built-in)
- Rate limiting on login attempts
- Row-level security (users can only access their trees)
- Audit logging for security events

---

## Testing Strategy

Each story includes comprehensive test requirements:

### Unit Tests
- Business logic (password hashing, token generation, permissions)
- Validation functions (email format, password strength)
- Drizzle ORM queries (filtering by userId/treeId)

### Integration Tests
- API route authorization (403 for forbidden, 401 for unauthenticated)
- OAuth callback flow (create user, create session)
- Database migrations (existing data → tree association)
- Email sending (invitations, password resets)

### E2E Tests (Manual → Automated)
- Complete auth flows (register → login → logout)
- Multi-user collaboration (User A invites User B)
- Permission enforcement (viewer cannot edit)
- Session persistence (browser restart)

### Security Tests
- Horizontal privilege escalation blocked
- Brute force protection (rate limiting)
- SQL injection attempts fail
- XSS protection
- CSRF protection

**Test Coverage Goal:** 80%+ for authentication code (critical security path)

---

## Risk Assessment

### High Risk Items
1. **Database Migration (Story #72):** Existing data must migrate correctly
   - **Mitigation:** Comprehensive backup, reversible migrations, staging environment testing

2. **Permission System (Story #73):** Complex role-based access control
   - **Mitigation:** Extensive integration tests, security audit, manual testing

3. **Email Deliverability (Story #73, #74):** Invitations/resets must reach inbox
   - **Mitigation:** Use reputable provider (Postmark), SPF/DKIM setup, test on multiple email services

### Medium Risk Items
1. **Deployment Change:** Static → Node runtime
   - **Mitigation:** Document thoroughly, test on staging before production

2. **OAuth Configuration:** Google OAuth setup can be finicky
   - **Mitigation:** Follow official docs, test redirect URIs, use Auth.js library

### Low Risk Items
1. **Session Management:** Well-established pattern with Auth.js
2. **Google OAuth:** Battle-tested, billions of users
3. **bcrypt Password Hashing:** Industry standard since 1999

---

## Success Metrics

### MVP Success Criteria (Stories #71-73)
- [ ] 100% of routes protected by authentication
- [ ] User can register with Google OAuth in <30 seconds
- [ ] User can invite family member successfully
- [ ] 95%+ of invited users can join without support
- [ ] All 1,442 existing tests still pass
- [ ] Zero P0/P1 security vulnerabilities in audit

### User Satisfaction Targets
- [ ] Login flow completion rate >90%
- [ ] Invitation acceptance rate >70%
- [ ] Users report feeling data is "secure" (survey)
- [ ] Support requests for auth issues <5% of users

### Performance Targets
- [ ] Login flow completes in <3 seconds
- [ ] Invitation email delivered in <30 seconds
- [ ] Tree switching loads new data in <1 second
- [ ] No perceived latency increase for authenticated users

---

## Next Steps (Backlog Grooming)

### Immediate Actions Required
1. **Product Owner Review:** Review all 4 stories and approve priorities
2. **Technical Spike:** Estimate Auth.js integration effort (1-2 hours)
3. **Google OAuth Setup:** Create Google Cloud Console project (15 minutes)
4. **Environment Prep:** Set up staging environment for testing (1-2 hours)
5. **Team Capacity:** Confirm developer availability (15-20 days over 4-5 weeks)

### Before Starting Story #71
- [ ] Product owner approves authentication approach (Google OAuth)
- [ ] Product owner approves multi-user model (shared trees)
- [ ] Google Cloud Console project created
- [ ] OAuth credentials configured (dev + prod)
- [ ] Deployment platform selected (Vercel recommended)
- [ ] Staging environment set up for testing
- [ ] Email provider selected (Postmark recommended)
- [ ] Database backup strategy confirmed

### Grooming Checklist
- [x] User stories written in persona format (As a... I want... So that...)
- [x] Acceptance criteria in BDD Given-When-Then format
- [x] Test requirements defined (unit, integration, E2E, security)
- [x] Implementation checklists created
- [x] Dependencies identified (blocked by, blocks)
- [x] Estimates provided (effort in days)
- [x] Definition of Done specified
- [x] Technical notes and edge cases documented

**All stories are READY FOR GROOMING SESSION with product owner.**

---

## Questions & Answers

### Q: Can we keep the static deployment?
**A:** No. Authentication requires server-side session management, which needs a runtime environment. We must switch to `@sveltejs/adapter-node`. This is a one-line change in `svelte.config.js` and deployment config update.

### Q: What about users who don't have Google accounts?
**A:** Story #74 (Email/Password) provides a fallback. This is optional and can be added later if needed. Most users (especially family members) have Google accounts.

### Q: Will this break existing functionality?
**A:** No. All existing features continue to work after authentication is added. The 1,442-test suite ensures no regressions. Users will just need to log in first.

### Q: What if we want to support GitHub OAuth too?
**A:** Easy to add after Story #71. Auth.js supports multiple providers. Add GitHub provider config (~2 hours work).

### Q: Can we do Story #73 (Shared Trees) without Story #72 (User Association)?
**A:** No. Story #72 creates the foundation (users table, userId column) that Story #73 extends (trees table, treeId column). They must be sequential.

### Q: What about GDPR compliance?
**A:** The exploration document covers this. Key features:
- Account deletion (delete user + all data)
- Data export (GEDCOM format)
- Privacy policy and terms of service
- Cookie consent (EU users)

Story #73 includes account deletion. Full GDPR compliance is a separate story (not yet written).

---

## Resources & References

### Documentation
- **Exploration Document:** `/plans/AUTHENTICATION_EXPLORATION.md`
- **User Stories:** GitHub Issues #71, #72, #73, #74
- **Project Board:** GitHub Projects "Family Tree" (needs stories added manually)

### External Resources
- [Auth.js SvelteKit Docs](https://authjs.dev/reference/sveltekit)
- [Google OAuth Setup](https://developers.google.com/identity/protocols/oauth2)
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

### Example Apps
- [SvelteKit Auth.js Example](https://github.com/nextauthjs/sveltekit-auth-example)
- [Drizzle + SvelteKit Starter](https://github.com/iamhectorsosa/drizzle-sveltekit)

---

## Communication Plan

### Stakeholder Updates
- **Weekly:** Progress report on current story (Slack/email)
- **Bi-weekly:** Demo of completed features (video recording)
- **Milestone:** After each phase completion (blog post/changelog)

### User Communication
- **Before Launch:** Email to existing users about authentication requirement
- **Launch Day:** Migration guide and FAQ
- **Post-Launch:** Support channel for authentication issues (email/Discord)

### Documentation Updates
- [ ] Update CLAUDE.md with authentication section
- [ ] Update README.md with setup instructions (OAuth credentials)
- [ ] Create USER_GUIDE.md for login/collaboration features
- [ ] Create ADMIN_GUIDE.md for deployment and configuration

---

## Conclusion

The authentication epic is now **ready for product owner review and implementation**. All user stories are:
- Written in proper persona format
- Include comprehensive BDD acceptance criteria
- Define complete test requirements
- Estimate effort and dependencies
- Ready to be groomed and prioritized

**Recommended Action:** Schedule grooming session with product owner to:
1. Review and approve authentication approach
2. Confirm multi-user model decision
3. Set priorities and timeline
4. Approve start of Story #71 (Google OAuth)

Once groomed, development can begin immediately on Story #71.

---

**Document Version:** 1.0
**Created By:** Claude Sonnet 4.5 (Agile PM Mode)
**Next Review:** After Product Owner Grooming Session
