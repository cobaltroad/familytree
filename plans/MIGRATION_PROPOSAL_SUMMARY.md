# SvelteKit + Drizzle ORM Migration Proposal - Executive Summary

**Date:** 2025-12-25
**Author:** Claude Code (Agile Project Manager)
**Status:** Ready for Product Owner Review
**GitHub Project:** Family Tree (PVT_kwHOAATJ584BK6zr)

---

## Overview

This proposal presents a comprehensive plan to migrate the Family Tree application from a dual-stack architecture (Go backend + Svelte frontend) to a unified full-stack SvelteKit framework with Drizzle ORM for database access.

## Documents Created

1. **SVELTEKIT_DRIZZLE_MIGRATION.md** (12,500+ words)
   - Comprehensive technical exploration
   - Architecture comparison (current vs. proposed)
   - Benefits analysis with concrete examples
   - Risk assessment and mitigation strategies
   - Phased migration approach with three options
   - Testing strategy and success metrics

2. **MIGRATION_USER_STORIES.md** (8,000+ words)
   - 8 complete user stories with BDD acceptance criteria
   - Stories follow persona-based format (As a [developer/admin]...)
   - Each story has Given-When-Then scenarios
   - Test requirements defined (unit, integration, E2E)
   - Clear dependencies and execution order
   - Estimated effort: 20-24 hours total

3. **MIGRATION_PROPOSAL_SUMMARY.md** (this document)
   - Executive summary for quick review
   - Next steps and decision points

---

## Key Benefits

### 1. Simplified Development Workflow
**Before:** 2 terminal windows, 2 processes, 2 languages
```bash
# Terminal 1
cd backend && go run main.go

# Terminal 2
cd frontend && npm run dev
```

**After:** 1 terminal window, 1 process, 1 language
```bash
npm run dev
```

### 2. End-to-End Type Safety
**Before:** Go structs (backend) → JSON → JavaScript (frontend) - no type safety across boundary

**After:** Drizzle schema → TypeScript types → SvelteKit routes → Frontend (optional TS)
- Automatic type inference from database schema
- Compile-time type checking
- IDE autocomplete throughout stack

### 3. Reduced Codebase Complexity
**Elimination:**
- `/backend/main.go` (409 lines of Go)
- `/frontend/src/lib/api.js` (66 lines - replaced with direct server imports)
- CORS configuration
- Separate API client layer

**Addition:**
- SvelteKit server routes (~200 lines, distributed across files)
- Drizzle schema (~100 lines)
- Configuration (~50 lines)

**Net Result:** ~125 fewer lines, better organization

### 4. Modern Database Tooling
**Go Backend (Manual SQL):**
```go
rows, err := app.db.Query(`
    SELECT id, first_name, last_name, birth_date, death_date, gender, created_at
    FROM people
`)
// Manual scanning, error handling, type conversion
```

**SvelteKit + Drizzle (Type-Safe Query Builder):**
```javascript
const allPeople = await db.select().from(people);
// Type inference, autocomplete, no SQL injection
```

**Drizzle Benefits:**
- Declarative schema (single source of truth)
- Automatic migration generation (`npx drizzle-kit generate`)
- Drizzle Studio for database browsing
- No SQL injection vulnerabilities
- Composable, testable queries

### 5. Simplified Deployment
**Before:** Deploy 2 artifacts (Go binary + static frontend)

**After:** Deploy 1 artifact
- Option A: Static files (adapter-static) - deploy to Netlify, Vercel, S3, etc.
- Option B: Node.js app (adapter-node) - deploy to any Node host
- Option C: Docker container - single containerized app

---

## Migration Approach: Phased with Parallel Operation (RECOMMENDED)

### Option B: Parallel Operation (Low Risk, 1-2 Weeks)

**Strategy:**
1. Set up SvelteKit alongside existing Vite app
2. Implement Drizzle and server routes
3. Run both backends simultaneously (Go on :8080, SvelteKit on :5173)
4. Feature flag to switch between backends: `VITE_USE_SVELTEKIT=true`
5. Gradual testing and validation
6. Once confident, remove Go backend

**Benefits:**
- Can rollback at any point
- Allows thorough side-by-side testing
- No pressure to complete all-at-once
- Production system stays running during migration

---

## User Stories Summary

### Story Execution Order

1. **Story 1: SvelteKit Setup** (4 hours)
   - Install SvelteKit, configure hash-based routing
   - Migrate directory structure
   - Verify existing components still work

2. **Story 2: Drizzle Setup** (3 hours)
   - Install Drizzle ORM and better-sqlite3
   - Define schema matching existing database
   - Test connection with Drizzle Studio

3. **Story 3: People API Routes** (3 hours)
   - Implement 5 server routes (GET, POST, PUT, DELETE)
   - Port validation logic from Go
   - Test with Postman/curl

4. **Story 4: Relationships API Routes** (4 hours)
   - Implement relationship endpoints
   - Port business logic (normalization, parent role validation)
   - Ensure duplicate prevention works

5. **Story 5: Frontend Integration** (2 hours)
   - Update API client to use `/api` instead of `http://localhost:8080/api`
   - Test all CRUD operations through UI
   - Verify optimistic updates work

6. **Story 6: Comprehensive Testing** (3 hours)
   - Side-by-side comparison with Go backend
   - Performance benchmarking
   - Regression testing checklist

7. **Story 7: Go Backend Removal** (2 hours)
   - Archive Go code
   - Update documentation (CLAUDE.md, README.md)
   - Clean up scripts

8. **Story 8: Production Deployment** (3-4 hours, OPTIONAL)
   - Deployment documentation
   - Docker configuration
   - Environment variable setup

**Total Core Effort:** 20 hours (Stories 1-7)
**Total with Deployment:** 24 hours (Stories 1-8)

---

## Impact Assessment

### Zero Impact (Preserved Exactly)
- All 26 Svelte components
- Store architecture (familyStore, derivedStores, modalStore, notificationStore, panelStore)
- Action creators with optimistic updates
- D3.js visualizations (PedigreeView, TimelineView, RadialView)
- PersonModal hybrid layout
- Quick Add workflows
- Hash-based routing behavior
- Existing Vitest test suite

### Minor Changes
- `api.js`: Change `API_BASE` from `http://localhost:8080/api` to `/api`
- `package.json`: Add SvelteKit dependencies

### Major Additions
- SvelteKit configuration (`svelte.config.js`)
- Drizzle schema definitions (`src/lib/db/schema.js`)
- Server route implementations (`src/routes/api/**/*.js`)
- Business logic modules (`src/lib/server/relationships.js`, `src/lib/server/validation.js`)

---

## Risk Assessment

### Low Risk
- **Data loss during migration:** Backup database first, test with copy
- **Performance regression:** Drizzle typically faster than raw SQL
- **Breaking store architecture:** No changes to stores required
- **Hash routing incompatibility:** SvelteKit officially supports it

### Medium Risk
- **API contract mismatch:** Mitigated by side-by-side testing and comprehensive test suite
- **Missing Go business logic:** Careful port with testing validates all rules preserved
- **Team unfamiliarity:** SvelteKit similar to Vite, Drizzle well-documented

### Mitigation Strategy
- Parallel operation allows rollback at any point
- Each story is independently testable
- Comprehensive acceptance criteria ensure no regressions
- Feature flag enables gradual migration

---

## Technology Stack References

### SvelteKit Resources
- [SvelteKit Routing Documentation](https://svelte.dev/docs/kit/routing)
- [Building Portable SvelteKit Apps: Hash Routing Guide](https://sveltetalk.com/posts/sveltekit-hash-routing)
- [SvelteKit API Endpoints and Loading Data](https://joyofcode.xyz/sveltekit-loading-data)
- [SvelteKit: The Complete Developer's Guide (2025)](https://criztec.com/sveltekit-complete-developers-guide-2025)

### Drizzle ORM Resources
- [Drizzle ORM SQLite Documentation](https://orm.drizzle.team/docs/get-started/sqlite-new)
- [SvelteKit with SQLite and Drizzle](https://fullstacksveltekit.com/blog/sveltekit-sqlite-drizzle)
- [Drizzle CLI Documentation](https://svelte.dev/docs/cli/drizzle)
- [How to Use Drizzle ORM With SvelteKit](https://www.svelterust.com/blog/implementing-drizzle-orm-with-sveltekit-for-efficient-database-management)

### Migration Guides
- [Migrating to SvelteKit v2](https://kit.svelte.dev/docs/migrating-to-sveltekit-2)
- [Converting a Vite Svelte SPA to SvelteKit](https://github.com/sveltejs/kit/discussions/4595)

---

## Next Steps for Product Owner

### Immediate Actions Required

1. **Review Documentation**
   - Read `/plans/SVELTEKIT_DRIZZLE_MIGRATION.md` (comprehensive technical analysis)
   - Read `/plans/MIGRATION_USER_STORIES.md` (8 user stories with acceptance criteria)
   - Review this summary document

2. **Decision Points**
   - **Approve Migration?** Yes/No/Defer
   - **Timeline?** When should this migration begin?
   - **Migration Approach?**
     - Option A: Big Bang (2-3 days, higher risk)
     - Option B: Parallel Operation (1-2 weeks, lower risk) - RECOMMENDED
     - Option C: Incremental Endpoint (2-3 weeks, lowest risk)
   - **Include Story 8 (Deployment)?** Now or later?

3. **Backlog Grooming Session**
   - Schedule time to review all 8 user stories
   - Refine acceptance criteria if needed
   - Add any additional scenarios or edge cases
   - Prioritize stories (currently all set as High priority)
   - Mark stories as "Groomed" once approved

4. **GitHub Projects Setup**
   - Add stories to "Family Tree" GitHub Project (PVT_kwHOAATJ584BK6zr)
   - Place in "Prioritized Backlog" view
   - Set priority labels (P0, P1, P2)
   - Link dependencies between stories

### Questions for Product Owner

1. **Urgency:** Is this migration time-sensitive, or can it wait for the right development window?

2. **Risk Tolerance:** Are you comfortable with the parallel operation approach, or do you prefer the slower incremental migration?

3. **TypeScript:** Should we add TypeScript as part of this migration, or handle that separately later?

4. **Testing:** Are the proposed test requirements sufficient, or do you want additional testing phases?

5. **Deployment:** What's the target deployment environment? (Static hosting, Node.js server, Docker, etc.)

6. **Breaking Changes:** Are you okay with breaking changes if they improve the architecture, or must we maintain 100% backward compatibility?

---

## Success Metrics

### Technical Success
- [ ] All existing features work identically
- [ ] Zero regressions from current functionality
- [ ] Performance equal or better than Go backend
- [ ] All automated tests passing (unit, integration, E2E)
- [ ] Code coverage maintained or improved

### Developer Experience Success
- [ ] Development workflow simplified (1 process instead of 2)
- [ ] Type safety across entire stack
- [ ] Modern tooling (Drizzle Studio, SvelteKit CLI)
- [ ] Easier onboarding for new developers

### Operational Success
- [ ] Single deployment artifact
- [ ] Simplified hosting (no Go binary needed)
- [ ] Better error logging and debugging
- [ ] Database migrations automated via Drizzle Kit

---

## Recommendation

**I recommend proceeding with the migration using Option B: Parallel Operation.**

**Rationale:**
1. **Clear Benefits:** Single language, better tooling, simpler deployment
2. **Low Risk:** Parallel operation allows safe rollback
3. **Proven Technology:** SvelteKit and Drizzle are production-ready and widely adopted
4. **Maintainability:** Future developers will find a modern, unified stack easier to work with
5. **Community Support:** Active communities for both SvelteKit and Drizzle

**Timeline:**
- Week 1: Stories 1-4 (Setup and API implementation)
- Week 2: Stories 5-7 (Integration, testing, cleanup)
- Week 3 (optional): Story 8 (Deployment preparation)

**Next Step:**
Schedule a backlog grooming session to review user stories and make final decision.

---

## Appendix: Story Checklist Template

For Product Owner to mark as stories are groomed:

- [ ] **Story 1: SvelteKit Setup** - Groomed: _____ (date)
- [ ] **Story 2: Drizzle Setup** - Groomed: _____ (date)
- [ ] **Story 3: People API Routes** - Groomed: _____ (date)
- [ ] **Story 4: Relationships API Routes** - Groomed: _____ (date)
- [ ] **Story 5: Frontend Integration** - Groomed: _____ (date)
- [ ] **Story 6: Comprehensive Testing** - Groomed: _____ (date)
- [ ] **Story 7: Go Backend Removal** - Groomed: _____ (date)
- [ ] **Story 8: Production Deployment** (optional) - Groomed: _____ (date)

**Final Approval:** _____________ (Product Owner Signature/Date)

---

**Contact:** Ready to answer questions and begin implementation once approved.
