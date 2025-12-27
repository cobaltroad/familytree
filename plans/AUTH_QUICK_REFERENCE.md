# Authentication Quick Reference

**For:** Product Owner / Developer
**Date:** 2025-12-26

## TL;DR (Executive Summary)

Your family tree app currently has **no authentication** - anyone with the URL can view/edit data. We've created 4 groomed user stories to add login and multi-user collaboration.

**Recommended Path:** Google OAuth → User Isolation → Shared Family Trees (15-20 days)

## The 4 Stories (In Order)

### Story #71: Google OAuth Login (Week 1)
- **What:** Add "Login with Google" button
- **Why:** Protect data from unauthorized access
- **Impact:** Users must log in to use app
- **Effort:** 3-4 days
- **Link:** https://github.com/cobaltroad/familytree/issues/71

### Story #72: User Data Isolation (Week 2)
- **What:** Each user gets their own private tree
- **Why:** Prevent User A from seeing User B's data
- **Impact:** Multi-user support (everyone has separate tree)
- **Effort:** 5-7 days
- **Link:** https://github.com/cobaltroad/familytree/issues/72

### Story #73: Shared Family Trees (Weeks 3-4)
- **What:** Invite family members to collaborate on one tree
- **Why:** Multiple people can work together (core feature!)
- **Impact:** True family collaboration (invites, permissions)
- **Effort:** 10-14 days
- **Link:** https://github.com/cobaltroad/familytree/issues/73

### Story #74: Email/Password Login (Week 5, Optional)
- **What:** Alternative to Google (email/password)
- **Why:** Some users don't want to use Google
- **Impact:** Broader accessibility
- **Effort:** 5-7 days
- **Link:** https://github.com/cobaltroad/familytree/issues/74

## Quick Decision Matrix

| Question | Recommendation | Why |
|----------|---------------|-----|
| Which auth method first? | Google OAuth (Story #71) | Fastest, easiest for users |
| Single-user or multi-user? | Multi-user (Stories #72 + #73) | Core value proposition |
| What about existing data? | Assign to first registered user | No data loss |
| Where to deploy? | Vercel | Easy, reliable, $0-20/mo |
| Email/password needed? | Optional (Story #74) | Add later if Google isn't enough |

## What Changes

### For Users
- **Before:** Open app, see family tree (no login)
- **After:** Log in with Google → see your tree → invite family → collaborate

### For Developers
- **Before:** Static site (no server)
- **After:** Node.js runtime (server-side sessions)
- **Migration:** Change adapter in `svelte.config.js`, deploy to Vercel/Railway

### For Database
- **New Tables:** users, sessions, family_trees, tree_members, invitations
- **Modified Tables:** people and relationships get `tree_id` column
- **Migration:** Existing data assigned to first user automatically

## Timeline

### Minimum Viable Auth (Stories #71-72: 8-11 days)
- Week 1: Google OAuth login
- Week 2: User data isolation
- **Result:** Secure, multi-user app (separate trees)

### Full Collaboration (Stories #71-73: 15-20 days)
- Weeks 1-2: Auth + isolation (above)
- Weeks 3-4: Shared trees with invitations
- **Result:** Families can collaborate on shared trees

### Complete Auth Suite (Stories #71-74: 20-27 days)
- Weeks 1-4: Full collaboration (above)
- Week 5: Email/password fallback
- **Result:** Maximum accessibility + security

## Technical Requirements Checklist

Before starting Story #71:
- [ ] Google Cloud Console account (free)
- [ ] Google OAuth credentials (15 min setup)
- [ ] Email provider account - Postmark recommended (free tier: 100 emails/mo)
- [ ] Hosting platform - Vercel recommended (free tier available)
- [ ] Staging environment for testing
- [ ] Database backup strategy

## Cost Estimate

### Development Cost
- **Stories #71-73:** 15-20 days developer time
- **Story #74 (optional):** +5-7 days

### Ongoing Operational Cost
| Service | Free Tier | Paid Tier | Recommendation |
|---------|-----------|-----------|----------------|
| **Vercel Hosting** | Yes (hobby) | $20/mo (pro) | Start free, upgrade if needed |
| **Postmark Email** | 100 emails/mo | $15/mo (10k emails) | Start free |
| **Google OAuth** | Unlimited | Free forever | Free |
| **Railway DB** | $5/mo credit | Usage-based | Good for dev/staging |

**Total Estimated Cost:** $0-20/mo depending on usage

## Risk Level by Story

- **Story #71 (OAuth):** LOW - Well-established pattern
- **Story #72 (Isolation):** MEDIUM - Database migration required
- **Story #73 (Shared Trees):** HIGH - Complex permissions, email delivery
- **Story #74 (Email/Password):** MEDIUM - Password security, reset flows

## Security Highlights

All stories include:
- bcrypt password hashing (if email/password used)
- httpOnly cookies (session hijacking prevention)
- CSRF protection (SvelteKit built-in)
- Rate limiting (brute force prevention)
- Row-level security (users can't access other's data)
- Audit logging (track who changed what)

## What Existing Users See

### Migration Day Experience
1. User opens app → sees "Login Required" page
2. Clicks "Login with Google" → Google consent screen
3. Approves → back to app, sees familiar tree (all data intact)
4. Invited family members → they also log in → see shared tree

### Communication Plan
- Email 1 week before: "Authentication coming - here's what to expect"
- Email on launch day: "Login now required - click here to get started"
- FAQ document: "How to invite family members"

## Next Steps

1. **Review Stories:** Read #71, #72, #73 (links above)
2. **Decide Priority:** All 3 stories or just #71-72?
3. **Setup Accounts:** Google Cloud, Postmark, Vercel
4. **Grooming Session:** Approve stories, confirm estimates
5. **Start Development:** Story #71 first (critical path)

## Common Questions

**Q: Will this break existing functionality?**
A: No. All 1,442 tests must pass. Users just need to log in first.

**Q: Can we skip Story #72 and go straight to #73?**
A: No. Story #72 creates the user/database foundation that #73 extends.

**Q: What if Google is down?**
A: Users can't log in until Google is back up. Story #74 (email/password) provides redundancy.

**Q: Can we support Facebook/Apple/Microsoft login?**
A: Yes, easy to add after Story #71. Auth.js supports 50+ providers.

**Q: What about mobile apps?**
A: OAuth works the same way. The SvelteKit app is already mobile-responsive.

## Files to Review

1. **Comprehensive Analysis:** `/plans/AUTHENTICATION_EXPLORATION.md` (300+ lines)
2. **Backlog Summary:** `/plans/AUTHENTICATION_BACKLOG_SUMMARY.md` (this doc's big brother)
3. **Story #71:** https://github.com/cobaltroad/familytree/issues/71
4. **Story #72:** https://github.com/cobaltroad/familytree/issues/72
5. **Story #73:** https://github.com/cobaltroad/familytree/issues/73
6. **Story #74:** https://github.com/cobaltroad/familytree/issues/74

## Approval Needed

- [ ] Approve authentication approach (Google OAuth recommended)
- [ ] Approve multi-user model (shared trees recommended)
- [ ] Approve timeline (15-20 days for Stories #71-73)
- [ ] Confirm budget ($0-20/mo operational cost)
- [ ] Authorize developer to start Story #71

---

**Questions?** Review the detailed exploration document or reach out to the development team.

**Ready to Start?** Approve Story #71 and let's build secure, collaborative family trees!
