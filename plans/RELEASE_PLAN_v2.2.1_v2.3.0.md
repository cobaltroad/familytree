# Release Plan: v2.2.1 (Patch) and v2.3.0 (Feature)

**Created:** 2026-01-08
**Status:** Planning
**Author:** Product Manager (with Claude Code assistance)

## Executive Summary

This release plan addresses the current test suite instability and prepares for completion of the GEDCOM import feature. The approach follows a two-phase release strategy:

1. **v2.2.1 Patch Release**: Fix all 315 failing tests and restore green test suite (quality gate)
2. **v2.3.0 Feature Release**: Complete GEDCOM import functionality with confidence in test coverage

## Current State Analysis

### Test Suite Health
- **Total Tests**: 2,951
- **Passing**: 2,605 (88.3%)
- **Failing**: 315 (10.7%)
- **Skipped**: 31 (1.0%)
- **Failing Test Files**: 39 out of 167

### Root Causes Identified

1. **Database Schema Mismatch** (Primary cause - affects ~200 tests)
   - `setupTestDatabase()` helper uses raw SQL strings
   - Schema definitions duplicated between `schema.js` and `testHelpers.js`
   - Test SQL missing columns added in v2.0 and v2.1:
     - `photo_url` in people table (Story #77)
     - `default_person_id` in users table (Story #81)
     - `view_all_records` in users table (Story #85)
   - Errors: `SqliteError: no such table: users`, `SqliteError: table people has no column named photo_url`

2. **Authentication Issues** (Secondary cause - affects ~9 GEDCOM tests)
   - GEDCOM import tests create mock requests without authentication
   - Tests return 401 Unauthorized instead of expected 200/201
   - Missing `event.locals.session` in test setup

3. **Variable Scoping Problems** (Tertiary cause - affects ~5 edge case tests)
   - `userId` variable declared but not properly initialized in some test paths
   - Tests use undefined `userId` in assertions
   - Errors: `ReferenceError: userId is not defined`

4. **Foreign Key Constraint Violations** (Affects ~10-20 tests)
   - Tests create relationships before creating people
   - Tests use hardcoded non-existent IDs
   - Incomplete cascade delete handling

## v2.2.1 Patch Release Plan

### Objective
Restore test suite to 100% passing state. No new features. Quality and stability focus.

### Scope
Fix all 315 failing tests by addressing root causes systematically.

### Stories (Priority Order)

| Story | Title | Priority | Est. Effort | Blocks |
|-------|-------|----------|-------------|--------|
| #108 | Fix Test Database Setup Infrastructure | P0 - Critical | 8 hours | #109, #110, #111 |
| #109 | Fix GEDCOM Import Test Authentication | P1 - High | 4 hours | #112 |
| #110 | Fix Edge Case Test Variable Scoping Issues | P1 - High | 3 hours | #112 |
| #111 | Fix Remaining Test Database Foreign Key Errors | P2 - Medium | 4 hours | #112 |
| #112 | Verify Full Test Suite Passes (Green Suite Goal) | P0 - Critical | 2 hours | Release |
| #113 | Update Documentation for v2.2.1 Release | P2 - Medium | 3 hours | Release |

**Total Estimated Effort**: 24 hours (3 days for single developer)

### Implementation Sequence

#### Phase 1: Database Setup (Day 1)
1. **Story #108**: Fix `setupTestDatabase()` helper
   - Eliminate SQL duplication
   - Generate test schema from production `schema.js`
   - Add all missing columns
   - Support optional tables (GEDCOM, etc.)
   - **Success Criteria**: Database schema errors eliminated (~200 tests fixed)

#### Phase 2: Authentication and Scoping (Day 2)
2. **Story #109**: Fix GEDCOM test authentication
   - Add `createMockAuthenticatedEvent()` to all GEDCOM tests
   - Pass correct userId in session
   - **Success Criteria**: All 9 GEDCOM tests pass

3. **Story #110**: Fix variable scoping in edge case tests
   - Review all uses of `userId` variable
   - Ensure proper initialization in beforeEach
   - Pass userId to authentication helpers
   - **Success Criteria**: No ReferenceError failures

4. **Story #111**: Fix foreign key constraint errors
   - Verify PRAGMA foreign_keys = ON
   - Fix test data creation order
   - Add cascade delete handling
   - **Success Criteria**: No FOREIGN KEY constraint failures

#### Phase 3: Verification and Documentation (Day 3)
5. **Story #112**: Verify full test suite passes
   - Run complete test suite multiple times
   - Check for flaky tests
   - Verify test execution time acceptable
   - Document any remaining known issues
   - **Success Criteria**: 0 failing tests (2,951/2,951 passing)

6. **Story #113**: Update documentation
   - Update TESTING_GUIDELINES.md
   - Update CLAUDE.md test suite status
   - Create/update LESSONS_LEARNED.md
   - Write release notes
   - **Success Criteria**: Documentation reflects v2.2.1 improvements

### Success Metrics
- **Primary**: 100% test pass rate (0 failures out of 2,951 tests)
- **Secondary**: Test execution time <3 minutes
- **Tertiary**: No test warnings or deprecation notices

### Release Criteria
- [ ] All stories #108-113 complete
- [ ] Full test suite passes (verified 3+ times)
- [ ] Documentation updated
- [ ] Code reviewed
- [ ] Clean test output (no warnings)
- [ ] Tag v2.2.1 release
- [ ] Update package.json version

### Risk Mitigation
- **Risk**: Additional test failures discovered during fixes
  - **Mitigation**: Story #112 is dedicated verification step, can iterate back to earlier stories
- **Risk**: Schema synchronization approach too complex
  - **Mitigation**: Keep SQL strings as fallback, improve them first if needed
- **Risk**: Tests pass locally but fail in CI
  - **Mitigation**: Test on clean checkout, verify no environment dependencies

## v2.3.0 Feature Release Plan

### Objective
Complete GEDCOM import feature with full UI workflow and data integrity.

### Scope
Implement Stories #102-107 for end-to-end GEDCOM import capability.

### Stories (Dependency Order)

| Story | Title | Priority | Est. Effort | Depends On |
|-------|-------|----------|-------------|------------|
| #102 | GEDCOM Upload UI Component | P0 - Critical | 12 hours | Backend #92 (complete) |
| #103 | GEDCOM Parsing Results Display | P0 - Critical | 8 hours | #102 |
| #104 | GEDCOM Preview Interface with Individuals Table | P0 - Critical | 10 hours | #103 |
| #105 | GEDCOM Tree Visualization Preview | P1 - High | 8 hours | #104 |
| #106 | GEDCOM Duplicate Resolution UI | P0 - Critical | 12 hours | #104 |
| #107 | GEDCOM Import Progress and Confirmation | P0 - Critical | 6 hours | #106 |

**Total Estimated Effort**: 56 hours (7 days for single developer)

### Implementation Sequence

#### Phase 1: File Upload (Days 1-1.5)
1. **Story #102**: GEDCOM Upload UI Component
   - Drag-and-drop file upload area
   - Client-side validation (.ged files, 10MB limit)
   - Upload progress indicator
   - Error handling and retry logic
   - Authentication guard
   - **Success Criteria**: Users can upload .ged files successfully

#### Phase 2: Parsing and Preview (Days 2-3.5)
2. **Story #103**: GEDCOM Parsing Results Display
   - Display parsing statistics (individuals, families, errors)
   - Show warnings for malformed data
   - Preview sample individuals
   - **Success Criteria**: Users see parsing results before import

3. **Story #104**: GEDCOM Preview Interface with Individuals Table
   - Sortable, paginated table of all individuals
   - Filter by name, birth year, gender
   - Show photo URLs if present
   - Select/deselect individuals for import
   - **Success Criteria**: Users can review and filter individuals

#### Phase 3: Advanced Features (Days 4-5.5)
4. **Story #105**: GEDCOM Tree Visualization Preview
   - Render small tree preview of GEDCOM data
   - Focus on root individuals
   - Visual verification before import
   - **Success Criteria**: Users can visualize family structure

5. **Story #106**: GEDCOM Duplicate Resolution UI
   - Detect potential duplicates (name/DOB matching)
   - Side-by-side comparison view
   - Merge, skip, or import as new options
   - Bulk resolution controls
   - **Success Criteria**: Users can resolve duplicates before import

#### Phase 4: Import Execution (Days 6-7)
6. **Story #107**: GEDCOM Import Progress and Confirmation
   - Real-time progress indicator during import
   - Show records created (people, relationships)
   - Handle errors gracefully
   - Success summary with link to imported people
   - **Success Criteria**: Users can import data and verify success

### Success Metrics
- **Primary**: Users can successfully import GEDCOM files end-to-end
- **Secondary**: Duplicate detection accuracy >90%
- **Tertiary**: Import performance <5s for 100 individuals

### Release Criteria
- [ ] v2.2.1 complete and released (prerequisite)
- [ ] All stories #102-107 complete
- [ ] All acceptance criteria pass
- [ ] Full test suite passes (including new GEDCOM tests)
- [ ] E2E testing with real GEDCOM files from major platforms
- [ ] Performance testing with large files (500+ individuals)
- [ ] UI/UX review and approval
- [ ] Documentation updated (user guides, API docs)
- [ ] Tag v2.3.0 release

### Risk Mitigation
- **Risk**: GEDCOM files from different platforms vary significantly
  - **Mitigation**: Test with files from Ancestry, MyHeritage, FamilySearch, etc.
- **Risk**: Large files cause performance issues
  - **Mitigation**: Story #104 includes pagination, Story #107 has performance testing
- **Risk**: Duplicate detection too aggressive or too lenient
  - **Mitigation**: Story #106 includes tuning and user control over thresholds
- **Risk**: Import errors leave database in inconsistent state
  - **Mitigation**: Use database transactions, rollback on error

## Dependencies

### v2.2.1 Dependencies
- **Internal**: None (pure test fixes)
- **External**: None

### v2.3.0 Dependencies
- **Internal**:
  - v2.2.1 MUST be complete (green test suite required)
  - Backend Story #92 (GEDCOM Upload API) - already complete
  - Backend Story #93 (GEDCOM Parser) - already complete
  - Backend Story #94 (Duplicate Detection) - already complete
  - Backend Story #95 (GEDCOM Import) - already complete
- **External**: None

### Critical Path
```
v2.2.1 (#108) → v2.2.1 (#109, #110, #111) → v2.2.1 (#112, #113) →
v2.3.0 (#102) → v2.3.0 (#103) → v2.3.0 (#104) → v2.3.0 (#106) → v2.3.0 (#107)
                                           ↓
                                    v2.3.0 (#105) [can be parallel with #106]
```

## Timeline

### Optimistic (Single Developer, Full-Time)
- **v2.2.1**: Days 1-3 (Week 1)
- **v2.3.0**: Days 4-10 (Week 2)
- **Total**: 10 business days (~2 weeks)

### Realistic (Part-Time, Interruptions)
- **v2.2.1**: Week 1-2 (5 business days)
- **v2.3.0**: Week 3-4 (10 business days)
- **Total**: 4 weeks

### Conservative (Buffer for Unknowns)
- **v2.2.1**: Week 1-2 (5 business days + buffer)
- **v2.3.0**: Week 3-6 (15 business days + buffer)
- **Total**: 6 weeks

## Communication Plan

### Stakeholder Updates
- **Daily**: Update GitHub project board with story status
- **Weekly**: Summary report to product owner
- **Milestone**: Announcement when v2.2.1 releases
- **Release**: Comprehensive release notes for v2.3.0

### Developer Communication
- Use GitHub issue comments for technical discussions
- Update story status promptly (Needs Grooming → Groomed → In Progress → Done)
- Link PRs to stories for traceability
- Document blockers immediately

## Backlog Grooming Status

### v2.2.1 Stories
- [x] Story #108 - Groomed, ready for development
- [x] Story #109 - Groomed, ready for development
- [x] Story #110 - Groomed, ready for development
- [x] Story #111 - Groomed, ready for development
- [x] Story #112 - Groomed, ready for development
- [x] Story #113 - Groomed, ready for development

### v2.3.0 Stories
- [x] Story #102 - Already groomed (detailed acceptance criteria)
- [x] Story #103 - Already groomed (detailed acceptance criteria)
- [x] Story #104 - Already groomed (detailed acceptance criteria)
- [x] Story #105 - Already groomed (detailed acceptance criteria)
- [x] Story #106 - Already groomed (detailed acceptance criteria)
- [x] Story #107 - Already groomed (detailed acceptance criteria)

**All stories are properly groomed with BDD acceptance criteria. Development can begin immediately after product owner approval.**

## Approval

- [ ] Product Owner Review
- [ ] Technical Lead Review
- [ ] Stakeholder Sign-Off
- [ ] Development Start Date: _______________

---

**Next Steps:**
1. Product owner reviews and approves this plan
2. Development begins with Story #108 (Test Database Setup)
3. Daily standups to track progress
4. Adjust timeline as needed based on actual velocity
