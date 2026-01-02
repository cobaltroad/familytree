# Database Backup

Created: 2026-01-01

## Backup Files

This directory contains multiple backup formats of the familytree database:

### 1. Binary Database Copy
- **File**: `familytree_YYYYMMDD_HHMMSS.db`
- **Format**: SQLite database file (binary)
- **Size**: ~80KB
- **Best for**: Quick restoration, exact replica of database state

**To restore:**
```bash
# Stop the application first, then:
cp backups/familytree_20260101_232905.db familytree.db
```

### 2. SQL Dump
- **File**: `familytree_YYYYMMDD_HHMMSS.sql`
- **Format**: SQL statements (text)
- **Size**: ~5.7KB
- **Best for**: Version control, cross-platform compatibility, manual inspection

**To restore:**
```bash
# Create a new database from the dump:
sqlite3 familytree_new.db < backups/familytree_20260101_232907.sql

# Or restore to existing database (WARNING: this will clear existing data):
sqlite3 familytree.db < backups/familytree_20260101_232907.sql
```

### 3. JSON Data Exports
- **Files**:
  - `users_data.json` (431B)
  - `people_data.json` (2.5KB)
  - `relationships_data.json` (2.2KB)
- **Format**: JSON arrays (text)
- **Best for**: Data analysis, migrations, external integrations

**To view data:**
```bash
# Pretty-print JSON:
cat backups/users_data.json | python3 -m json.tool
cat backups/people_data.json | python3 -m json.tool
cat backups/relationships_data.json | python3 -m json.tool
```

**To restore** (requires custom script):
The JSON files can be imported using the application's API or by writing a custom import script.

## Database Statistics

- **Users**: Check `users_data.json`
- **People**: Check `people_data.json`
- **Relationships**: Check `relationships_data.json`

## Recommended Restoration Method

For most cases, use the **SQL dump** method as it's portable and readable:

```bash
# 1. Backup current database (if it exists)
mv familytree.db familytree.db.old

# 2. Restore from SQL dump
sqlite3 familytree.db < backups/familytree_20260101_232907.sql

# 3. Verify restoration
sqlite3 familytree.db "SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM people; SELECT COUNT(*) FROM relationships;"
```

## Notes

- Always stop the application before restoring backups
- Test restorations in a separate environment first
- Keep multiple backup versions for different points in time
- The binary database copy is the fastest to restore but least portable
- The SQL dump can be edited manually if needed
- JSON exports are useful for data analysis but require custom tooling to restore
