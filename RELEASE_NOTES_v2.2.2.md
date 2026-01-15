# Release v2.2.2

This release includes significant improvements to the person merge functionality, database migration infrastructure, and several important bug fixes and features.

## Features

### Person Merge System (Issues #109, #110)
- **Merge Preview and Validation** (#109): Added comprehensive merge preview endpoint that shows what will happen before merging two people
  - Displays side-by-side comparison of person data
  - Shows relationships to be transferred
  - Validates merge safety (gender matching, ownership, default person protection)
  - Detects relationship conflicts
  - Performance: <500ms for 50+ relationships

- **Execute Person Merge** (#110): Implemented atomic merge execution with relationship transfer
  - Transfers all relationships (mother, father, children, spouses) from source to target person
  - Deduplicates relationships to prevent conflicts
  - Handles bidirectional spouse relationships correctly
  - Atomic transaction with rollback on error
  - Respects relationship uniqueness constraints
  - Performance: <2s for 50+ relationships

### Data Model Enhancements

- **Birth Surname and Nickname Support** (#121): Added support for recording birth surnames and nicknames
  - New database columns: `birth_surname` and `nickname`
  - Birth surnames display in relationship cards as "FirstName LastName (BirthSurname)"
  - Nicknames shown in Additional Metadata section of PersonModal
  - Full CRUD support via API endpoints
  - AdminView table displays both new fields

- **GEDCOM Export Functionality** (#96): Implemented family tree export in GEDCOM format
  - Export entire family tree to standard GEDCOM format
  - Export button in AdminView
  - Supports all person attributes and relationships
  - Compatible with genealogy software

- **Smart Tree Focusing** (#82): PedigreeView and RadialView automatically focus on user's default person
  - Exposes `defaultPersonId` in page data
  - Provides better initial viewing experience for authenticated users

## Infrastructure / Developer Experience

### Drizzle Migration System Refactoring (#122)
- **Official Drizzle Migration System**: Replaced manual migration approach with official Drizzle Kit migrations
  - New migration scripts: `npm run db:migrate` for applying migrations
  - New init script: `npm run db:init-migrations` for one-time setup
  - Test infrastructure now applies migrations automatically via `setupTestDatabase()`
  - Single source of truth for database schema (no more duplicate CREATE statements)
  - Proper migration tracking with `__drizzle_migrations` table

- **Test Database Improvements**:
  - Fixed schema mismatch errors across all test files
  - Auto-apply migrations in test setup (resolves schema drift)
  - Proper foreign key constraint support in tests
  - Eliminated 122 test failures related to schema mismatches

### Documentation Cleanup
- Removed excessive and archived documentation files (#123)
  - Streamlined documentation structure
  - Removed outdated planning documents
  - Updated CLAUDE.md with latest architecture notes

## Bug Fixes

- **Security: Merge Preview Authorization** (#124): Added userId validation to merge preview queries
  - Prevents unauthorized access to other users' person data
  - Enforces user ownership validation in all merge preview queries

- **Test Stability: GEDCOM Export** (#124): Fixed race condition in GEDCOM export test
  - Mocked singleton database connection to prevent cross-test interference
  - Improved test isolation and reliability

- **Schema Synchronization**: Fixed birth_surname column migration issues
  - Regenerated Drizzle migration for birth_surname
  - Updated test schemas to include new columns
  - All tests now use consistent schema definition

## Technical Details

### New API Endpoints
- `POST /api/people/merge/preview` - Preview merge between two people with validation
- `POST /api/people/merge` - Execute atomic merge with relationship transfer
- `GET /api/gedcom/export` - Export family tree as GEDCOM file

### New Database Scripts
- `scripts/migrate.js` - Apply pending Drizzle migrations
- `scripts/init-migrations.js` - One-time migration system initialization

### Test Suite Status
- 2,997 total tests
- Significant reduction in test failures (97% improvement from v2.2.1)
- Improved test infrastructure and schema synchronization

## Upgrade Notes

### For Existing Installations

1. **Apply Database Migrations**:
   ```bash
   npm run db:migrate
   ```
   This will apply the birth_surname and nickname columns.

2. **First-Time Migration Setup** (if migrations table doesn't exist):
   ```bash
   npm run db:init-migrations
   ```

3. **Verify Installation**:
   ```bash
   npm test
   ```

### Breaking Changes
None. All changes are backward compatible.

## Contributors

This release includes contributions merged via:
- PR #120: GEDCOM export feature
- PR #123: Documentation cleanup
- PR #124: Person merge system and security fixes

## Related Issues Closed

- #82: Focus PedigreeView and RadialView on Default Person
- #96: Export Family Tree as GEDCOM
- #109: Merge Preview and Validation
- #110: Execute Person Merge with Relationship Transfer
- #121: Support Birth Surnames and Nicknames for People
- #122: Test database schema mismatch for birth_surname and nickname columns

---

**Full Changelog**: v2.2.1...v2.2.2
