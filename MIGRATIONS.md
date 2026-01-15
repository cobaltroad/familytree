# Database Migrations Guide

This document explains how to manage database schema changes using Drizzle ORM's migration system.

## Overview

The application uses Drizzle ORM for database management with a fully functional migration system. All migrations are stored in the `drizzle/` directory and tracked in the `__drizzle_migrations` table.

## Issue #122 Resolution

**Previous Issue**: The database was created manually without using Drizzle's migration system, causing `npx drizzle-kit migrate` to fail.

**Solution**: Implemented a complete migration system with:
1. `applyMigrations()` utility using Drizzle's official `migrate()` function
2. `db:init-migrations` script to initialize tracking for existing databases
3. `db:migrate` script to apply pending migrations
4. Updated test helpers to use the migration system

## Migration System Architecture

### Files and Directories

```
familytree/
├── drizzle/                        # Migration files directory
│   ├── 0000_tiresome_changeling.sql    # Initial schema
│   ├── 0001_dear_annihilus.sql         # Add view_all_records
│   ├── 0002_tiny_lake.sql              # Add birth_surname, nickname
│   └── meta/                           # Migration metadata
│       ├── _journal.json               # Migration journal
│       └── 0000_snapshot.json          # Schema snapshots
├── src/lib/db/
│   ├── schema.js                   # Schema definition (single source of truth)
│   ├── migrations.js               # Migration utilities
│   └── migrations.test.js          # Migration system tests
├── scripts/
│   ├── migrate.js                  # Apply migrations script
│   └── init-migrations.js          # Initialize tracking script
└── drizzle.config.js               # Drizzle configuration
```

### Migration Tracking

Migrations are tracked in the `__drizzle_migrations` table:

```sql
CREATE TABLE "__drizzle_migrations" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hash TEXT NOT NULL,
  created_at NUMERIC
)
```

## Common Tasks

### 1. Initialize Migration Tracking (One-Time Setup)

If you have an existing database without migration tracking:

```bash
npm run db:init-migrations
```

This marks all existing migrations as applied without running them. **Only run this once** on an existing database.

### 2. Create a New Migration

When you make changes to `src/lib/db/schema.js`:

```bash
npm run db:generate
```

This generates a new SQL migration file in the `drizzle/` directory.

**Example**: Adding a new column to the `people` table:

1. Edit `src/lib/db/schema.js`:
   ```javascript
   export const people = sqliteTable('people', {
     // ... existing columns ...
     middleName: text('middle_name'),  // New column
   })
   ```

2. Generate migration:
   ```bash
   npm run db:generate
   ```

3. Review the generated SQL in `drizzle/XXXX_migration_name.sql`

### 3. Apply Pending Migrations

To apply all pending migrations to your database:

```bash
npm run db:migrate
```

This:
- Connects to `familytree.db`
- Applies any migrations that haven't been applied yet
- Updates the `__drizzle_migrations` tracking table
- Enables foreign key constraints
- Is idempotent (safe to run multiple times)

**Example output**:
```
🚀 Starting database migration...
Database: /Users/you/familytree/familytree.db
✓ Connected to database
Current status: 3 migrations applied
✓ Migrations applied successfully
Final status: 3 migrations applied
Applied migrations:
  1. 0000_tiresome_changeling (2025-12-27T23:10:56.310Z)
  2. 0001_dear_annihilus (2025-12-30T19:26:55.619Z)
  3. 0002_tiny_lake (2026-01-10T19:29:00.242Z)
✅ Migration completed successfully
```

### 4. Check Migration Status

To see which migrations have been applied:

```bash
sqlite3 familytree.db "SELECT * FROM __drizzle_migrations ORDER BY id;"
```

### 5. Open Database GUI

To visually inspect your database:

```bash
npm run db:studio
```

This opens Drizzle Studio in your browser.

## Development Workflow

### Standard Development Cycle

1. **Make schema changes** in `src/lib/db/schema.js`
2. **Generate migration**: `npm run db:generate`
3. **Review generated SQL** in `drizzle/XXXX_migration_name.sql`
4. **Apply migration**: `npm run db:migrate`
5. **Test your changes**: `npm test`
6. **Commit both files**: schema.js and the migration SQL file

### Test-Driven Development (TDD)

When adding new features that require schema changes:

1. **Write failing tests** that expect the new schema
2. **Update schema.js** to match expected structure
3. **Generate migration**: `npm run db:generate`
4. **Apply migration**: `npm run db:migrate`
5. **Run tests**: `npm test` (should pass now)
6. **Commit all changes**

## Testing

### Migration System Tests

Comprehensive tests ensure the migration system works correctly:

```bash
npm test -- src/lib/db/migrations.test.js
```

**Test Coverage** (16 tests):
- ✓ Creates `__drizzle_migrations` table
- ✓ Creates all schema tables (users, people, relationships, sessions)
- ✓ Records applied migrations
- ✓ Skips already-applied migrations
- ✓ Enables foreign keys
- ✓ Creates all indexes
- ✓ Creates all expected columns
- ✓ Allows data insertion after migration
- ✓ Enforces foreign key constraints
- ✓ Handles migration status queries
- ✓ Is idempotent (safe to run multiple times)

### Test Database Setup

Test helpers automatically apply migrations to in-memory test databases:

```javascript
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { setupTestDatabase } from './src/lib/server/testHelpers.js'

const sqlite = new Database(':memory:')
const db = drizzle(sqlite)
const userId = await setupTestDatabase(sqlite, db)
// Test database now has full schema with migrations applied
```

## Migration System API

### `applyMigrations(sqlite, db)`

Applies all pending migrations to a database.

**Parameters**:
- `sqlite` - Better-SQLite3 database instance
- `db` - Drizzle database instance

**Returns**: `Promise<void>`

**Example**:
```javascript
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { applyMigrations } from './src/lib/db/migrations.js'

const sqlite = new Database('./familytree.db')
const db = drizzle(sqlite)
await applyMigrations(sqlite, db)
```

### `getMigrationStatus(sqlite)`

Gets the list of applied migrations.

**Parameters**:
- `sqlite` - Better-SQLite3 database instance

**Returns**: `Promise<Array<{hash: string, created_at: number}>>`

**Example**:
```javascript
const status = await getMigrationStatus(sqlite)
console.log(`Applied ${status.length} migrations`)
```

## Available npm Scripts

| Command | Description |
|---------|-------------|
| `npm run db:generate` | Generate a new migration from schema changes |
| `npm run db:migrate` | Apply pending migrations to the database |
| `npm run db:init-migrations` | Initialize tracking for existing database (one-time) |
| `npm run db:studio` | Open Drizzle Studio (database GUI) |
| `npm run db:push` | Push schema directly (development only, no migrations) |
| `npm run db:introspect` | Introspect existing database schema |

## Best Practices

### ✅ Do:

1. **Always commit migrations with schema changes** - Keep schema.js and migration files in sync
2. **Review generated SQL** - Check migrations before applying them
3. **Test after migrations** - Run `npm test` to ensure nothing broke
4. **Use meaningful schema changes** - Make incremental, logical changes
5. **Write tests first (TDD)** - Define expected behavior before changing schema

### ❌ Don't:

1. **Don't manually edit applied migrations** - Migrations are immutable once applied
2. **Don't delete migration files** - Keep the full migration history
3. **Don't use `db:push` in production** - It bypasses migration tracking
4. **Don't run `db:init-migrations` twice** - It's only for one-time setup
5. **Don't modify `__drizzle_migrations` manually** - Let the system manage it

## Troubleshooting

### Problem: Migration fails with "table already exists"

**Cause**: Database has tables but migration tracking isn't initialized.

**Solution**:
```bash
npm run db:init-migrations
```

### Problem: Schema in database doesn't match schema.js

**Cause**: Migrations weren't applied or were modified manually.

**Solution**:
1. Check migration status: `sqlite3 familytree.db "SELECT * FROM __drizzle_migrations;"`
2. Review schema: `npm run db:studio`
3. Apply missing migrations: `npm run db:migrate`
4. If corrupted, restore from backup and re-apply migrations

### Problem: Test failures after schema change

**Cause**: Test helpers are using the new migration system, which may expose issues.

**Solution**:
1. Check if migration applied correctly: `npm run db:migrate`
2. Verify schema matches expectations: `npm run db:studio`
3. Update tests if schema expectations changed
4. Run tests: `npm test`

### Problem: Foreign key constraint errors in tests

**Cause**: Tests not using `setupTestDatabase()` helper which enables foreign keys.

**Solution**:
```javascript
// Use setupTestDatabase helper
await setupTestDatabase(sqlite, db)
// OR manually enable foreign keys
sqlite.exec('PRAGMA foreign_keys = ON')
```

## Migration History

### 0000_tiresome_changeling.sql (Initial Schema)
- Created `users` table with OAuth support
- Created `people` table with user association
- Created `relationships` table with parent_role
- Created `sessions` table for authentication
- Added all indexes and foreign keys

### 0001_dear_annihilus.sql (View All Records Feature)
- Added `view_all_records` column to `users` table
- Enables admin users to bypass data isolation

### 0002_tiny_lake.sql (Birth Surname and Nickname)
- Added `birth_surname` column to `people` table
- Added `nickname` column to `people` table
- Issue #121: Support for maiden names and common names

## Related Documentation

- **CLAUDE.md** - Development guidelines and architecture overview
- **TESTING_GUIDELINES.md** - Testing conventions and patterns
- **CODING_GUIDELINES.md** - Code style and component guidelines
- **src/lib/db/schema.js** - Schema definition (single source of truth)
- **drizzle.config.js** - Drizzle ORM configuration

## References

- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Drizzle Kit Migrations](https://orm.drizzle.team/kit-docs/overview#migrations)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [Better-SQLite3](https://github.com/WiseLibs/better-sqlite3)
