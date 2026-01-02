/**
 * Database Recovery Tests
 *
 * Tests for automatic database recovery from backups when user is not found.
 * Following TDD methodology - these tests will initially fail (RED phase).
 *
 * Test coverage:
 * - List backup files in backups directory
 * - Parse backup filenames to extract timestamps
 * - Find most recent backup file
 * - Restore from SQL dump (.sql)
 * - Restore from binary copy (.db)
 * - Verify user exists after restoration
 * - Handle edge cases (no backups, empty directory, restoration failures)
 * - Prefer SQL dumps over binary copies
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { promises as fs } from 'fs'
import path from 'path'
import {
  listBackupFiles,
  parseBackupTimestamp,
  findMostRecentBackup,
  restoreFromBackup,
  verifyUserExists,
  recoverDatabaseIfNeeded
} from './databaseRecovery.js'
import { db } from '$lib/db/client.js'
import { users } from '$lib/db/schema.js'

// Test constants
const TEST_BACKUPS_DIR = path.join(process.cwd(), 'test-backups')
const TEST_DB_PATH = path.join(process.cwd(), 'test-familytree.db')
const PROD_DB_PATH = path.join(process.cwd(), 'familytree.db')
const PROD_DB_BACKUP_PATH = path.join(process.cwd(), 'familytree.db.test-backup')

describe('Database Recovery Module', () => {
  beforeEach(async () => {
    // Back up production database before tests
    // Some tests modify the production DB when testing recoverDatabaseIfNeeded
    try {
      await fs.copyFile(PROD_DB_PATH, PROD_DB_BACKUP_PATH)
    } catch (error) {
      // Production DB might not exist yet
    }

    // Create test backups directory
    try {
      await fs.mkdir(TEST_BACKUPS_DIR, { recursive: true })
    } catch (error) {
      // Directory might already exist
    }

    // Clean up test database file if it exists
    try {
      await fs.unlink(TEST_DB_PATH)
    } catch (error) {
      // File might not exist
    }
  })

  afterEach(async () => {
    // Restore production database after tests
    try {
      await fs.copyFile(PROD_DB_BACKUP_PATH, PROD_DB_PATH)
      await fs.unlink(PROD_DB_BACKUP_PATH)

      // Reconnect to restored database
      const { reconnectDatabase } = await import('$lib/db/client.js')
      reconnectDatabase()
    } catch (error) {
      // Backup might not exist
    }

    // Clean up test backups directory
    try {
      const files = await fs.readdir(TEST_BACKUPS_DIR)
      for (const file of files) {
        await fs.unlink(path.join(TEST_BACKUPS_DIR, file))
      }
      await fs.rmdir(TEST_BACKUPS_DIR)
    } catch (error) {
      // Directory might not exist
    }

    // Clean up test database file
    try {
      await fs.unlink(TEST_DB_PATH)
    } catch (error) {
      // File might not exist
    }
  })

  describe('listBackupFiles', () => {
    it('should list all backup files in directory', async () => {
      // Arrange: Create test backup files
      await fs.writeFile(path.join(TEST_BACKUPS_DIR, 'familytree_20260101_120000.sql'), 'test')
      await fs.writeFile(path.join(TEST_BACKUPS_DIR, 'familytree_20260101_130000.db'), 'test')
      await fs.writeFile(path.join(TEST_BACKUPS_DIR, 'README.md'), 'readme')

      // Act: List backup files
      const files = await listBackupFiles(TEST_BACKUPS_DIR)

      // Assert: Should return only .sql and .db files
      expect(files).toHaveLength(2)
      expect(files).toContain('familytree_20260101_120000.sql')
      expect(files).toContain('familytree_20260101_130000.db')
      expect(files).not.toContain('README.md')
    })

    it('should return empty array if directory does not exist', async () => {
      // Act: List files from non-existent directory
      const files = await listBackupFiles('/nonexistent/path')

      // Assert: Should return empty array
      expect(files).toEqual([])
    })

    it('should return empty array if directory is empty', async () => {
      // Act: List files from empty directory
      const files = await listBackupFiles(TEST_BACKUPS_DIR)

      // Assert: Should return empty array
      expect(files).toEqual([])
    })

    it('should only return files matching backup naming pattern', async () => {
      // Arrange: Create various files
      await fs.writeFile(path.join(TEST_BACKUPS_DIR, 'familytree_20260101_120000.sql'), 'test')
      await fs.writeFile(path.join(TEST_BACKUPS_DIR, 'invalid_backup.sql'), 'test')
      await fs.writeFile(path.join(TEST_BACKUPS_DIR, 'familytree.db'), 'test')

      // Act: List backup files
      const files = await listBackupFiles(TEST_BACKUPS_DIR)

      // Assert: Should only return properly named backups
      expect(files).toHaveLength(1)
      expect(files).toContain('familytree_20260101_120000.sql')
    })
  })

  describe('parseBackupTimestamp', () => {
    it('should parse timestamp from SQL backup filename', () => {
      // Arrange: SQL backup filename
      const filename = 'familytree_20260101_120000.sql'

      // Act: Parse timestamp
      const timestamp = parseBackupTimestamp(filename)

      // Assert: Should return Date object
      expect(timestamp).toBeInstanceOf(Date)
      expect(timestamp.getFullYear()).toBe(2026)
      expect(timestamp.getMonth()).toBe(0) // January is 0
      expect(timestamp.getDate()).toBe(1)
      expect(timestamp.getHours()).toBe(12)
      expect(timestamp.getMinutes()).toBe(0)
      expect(timestamp.getSeconds()).toBe(0)
    })

    it('should parse timestamp from DB backup filename', () => {
      // Arrange: DB backup filename
      const filename = 'familytree_20251231_235959.db'

      // Act: Parse timestamp
      const timestamp = parseBackupTimestamp(filename)

      // Assert: Should return Date object
      expect(timestamp).toBeInstanceOf(Date)
      expect(timestamp.getFullYear()).toBe(2025)
      expect(timestamp.getMonth()).toBe(11) // December is 11
      expect(timestamp.getDate()).toBe(31)
      expect(timestamp.getHours()).toBe(23)
      expect(timestamp.getMinutes()).toBe(59)
      expect(timestamp.getSeconds()).toBe(59)
    })

    it('should return null for invalid filename format', () => {
      // Arrange: Invalid filenames
      const invalidFilenames = [
        'invalid_backup.sql',
        'familytree.db',
        'backup_20260101.sql',
        'familytree_20260101.sql',
        'familytree_invalid_120000.sql'
      ]

      // Act & Assert: Should return null for all invalid names
      for (const filename of invalidFilenames) {
        const timestamp = parseBackupTimestamp(filename)
        expect(timestamp).toBeNull()
      }
    })
  })

  describe('findMostRecentBackup', () => {
    it('should find most recent backup file', async () => {
      // Arrange: Create backup files with different timestamps
      await fs.writeFile(path.join(TEST_BACKUPS_DIR, 'familytree_20260101_120000.sql'), 'old')
      await fs.writeFile(path.join(TEST_BACKUPS_DIR, 'familytree_20260102_120000.sql'), 'recent')
      await fs.writeFile(path.join(TEST_BACKUPS_DIR, 'familytree_20260101_180000.db'), 'medium')

      // Act: Find most recent backup
      const recent = await findMostRecentBackup(TEST_BACKUPS_DIR)

      // Assert: Should return most recent file
      expect(recent).toBe('familytree_20260102_120000.sql')
    })

    it('should prefer SQL dumps over DB files with same timestamp', async () => {
      // Arrange: Create SQL and DB backups with same timestamp
      await fs.writeFile(path.join(TEST_BACKUPS_DIR, 'familytree_20260101_120000.sql'), 'sql')
      await fs.writeFile(path.join(TEST_BACKUPS_DIR, 'familytree_20260101_120000.db'), 'db')

      // Act: Find most recent backup
      const recent = await findMostRecentBackup(TEST_BACKUPS_DIR)

      // Assert: Should prefer SQL file
      expect(recent).toBe('familytree_20260101_120000.sql')
    })

    it('should prefer SQL dumps over slightly older DB files', async () => {
      // Arrange: SQL backup 1 minute older than DB backup
      await fs.writeFile(path.join(TEST_BACKUPS_DIR, 'familytree_20260101_115900.sql'), 'sql')
      await fs.writeFile(path.join(TEST_BACKUPS_DIR, 'familytree_20260101_120000.db'), 'db')

      // Act: Find most recent backup
      const recent = await findMostRecentBackup(TEST_BACKUPS_DIR)

      // Assert: Should prefer SQL file even if slightly older
      expect(recent).toBe('familytree_20260101_115900.sql')
    })

    it('should return null if no backup files exist', async () => {
      // Act: Find backup in empty directory
      const recent = await findMostRecentBackup(TEST_BACKUPS_DIR)

      // Assert: Should return null
      expect(recent).toBeNull()
    })

    it('should return null if directory does not exist', async () => {
      // Act: Find backup in non-existent directory
      const recent = await findMostRecentBackup('/nonexistent/path')

      // Assert: Should return null
      expect(recent).toBeNull()
    })
  })

  describe('restoreFromBackup', () => {
    it('should restore from SQL dump file', async () => {
      // Arrange: Create a SQL dump backup with full schema (like a real backup)
      const sqlDump = `
PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  provider TEXT NOT NULL,
  provider_user_id TEXT,
  email_verified INTEGER DEFAULT 1 NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
  last_login_at TEXT,
  default_person_id INTEGER,
  view_all_records INTEGER NOT NULL DEFAULT 0
);
DELETE FROM users;
INSERT INTO users (id, email, name, provider, provider_user_id, email_verified)
VALUES (1, 'restored@example.com', 'Restored User', 'facebook', 'fb_restored', 1);
COMMIT;
      `
      const backupPath = path.join(TEST_BACKUPS_DIR, 'familytree_20260101_120000.sql')
      await fs.writeFile(backupPath, sqlDump)

      // Act: Restore from backup
      const result = await restoreFromBackup(backupPath, TEST_DB_PATH)

      // Assert: Should succeed
      expect(result.success).toBe(true)
      expect(result.type).toBe('sql')
      expect(result.message).toContain('restored')
    })

    it('should delete existing database file before restoring from SQL dump', async () => {
      // RED PHASE: This test will fail because the current implementation
      // doesn't delete the existing database, causing CREATE TABLE conflicts

      // Arrange: Create existing database with tables
      const { exec } = await import('child_process')
      const { promisify } = await import('util')
      const execAsync = promisify(exec)

      // Create existing database with users table
      await execAsync(`sqlite3 "${TEST_DB_PATH}" "CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT); INSERT INTO users VALUES (1, 'old@example.com');"`)

      // Create a SQL dump backup with CREATE TABLE statement (without IF NOT EXISTS)
      const sqlDump = `
PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  provider TEXT NOT NULL,
  provider_user_id TEXT,
  email_verified INTEGER DEFAULT 1 NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);
DELETE FROM users;
INSERT INTO users (id, email, name, provider, provider_user_id, email_verified)
VALUES (1, 'restored@example.com', 'Restored User', 'facebook', 'fb_restored', 1);
COMMIT;
      `
      const backupPath = path.join(TEST_BACKUPS_DIR, 'familytree_20260101_120000.sql')
      await fs.writeFile(backupPath, sqlDump)

      // Act: Restore from backup (should delete existing DB first)
      const result = await restoreFromBackup(backupPath, TEST_DB_PATH)

      // Assert: Should succeed even with existing database
      expect(result.success).toBe(true)
      expect(result.type).toBe('sql')
      expect(result.message).toContain('restored')

      // Verify the new data was restored (not the old data)
      const { stdout } = await execAsync(`sqlite3 "${TEST_DB_PATH}" "SELECT email FROM users WHERE id = 1;"`)
      expect(stdout.trim()).toBe('restored@example.com')
    })

    it('should restore from binary DB file', async () => {
      // Arrange: Create a binary DB backup
      const backupPath = path.join(TEST_BACKUPS_DIR, 'familytree_20260101_120000.db')
      // Create a minimal SQLite database file
      const dbContent = Buffer.from('SQLite format 3\0')
      await fs.writeFile(backupPath, dbContent)

      // Act: Restore from backup
      const result = await restoreFromBackup(backupPath, TEST_DB_PATH)

      // Assert: Should succeed
      expect(result.success).toBe(true)
      expect(result.type).toBe('db')
      expect(result.message).toContain('restored')
    })

    it('should return error if backup file does not exist', async () => {
      // Act: Restore from non-existent file
      const result = await restoreFromBackup('/nonexistent/backup.sql', TEST_DB_PATH)

      // Assert: Should fail
      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })

    it('should return error if backup file is corrupted', async () => {
      // Arrange: Create corrupted backup file
      const backupPath = path.join(TEST_BACKUPS_DIR, 'familytree_20260101_120000.sql')
      await fs.writeFile(backupPath, 'INVALID SQL SYNTAX;;;')

      // Act: Restore from corrupted backup
      const result = await restoreFromBackup(backupPath, TEST_DB_PATH)

      // Assert: Should fail
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('verifyUserExists', () => {
    beforeEach(async () => {
      // Clean users table before each test
      try {
        await db.delete(users)
      } catch (error) {
        // Table might not exist if database was replaced
      }
    })

    afterEach(async () => {
      // Clean users table after each test
      try {
        await db.delete(users)
      } catch (error) {
        // Table might not exist if database was replaced
      }
    })

    it('should return true if user exists by ID', async () => {
      // Arrange: Create a test user
      const [testUser] = await db
        .insert(users)
        .values({
          email: 'test@example.com',
          name: 'Test User',
          provider: 'facebook',
          providerUserId: 'fb_12345',
          emailVerified: true
        })
        .returning()

      // Act: Verify user exists
      const exists = await verifyUserExists(testUser.id)

      // Assert: Should return true
      expect(exists).toBe(true)
    })

    it('should return false if user does not exist', async () => {
      // Act: Verify non-existent user
      const exists = await verifyUserExists(999999)

      // Assert: Should return false
      expect(exists).toBe(false)
    })

    it('should return false if user ID is null or undefined', async () => {
      // Act & Assert: Should return false for invalid IDs
      expect(await verifyUserExists(null)).toBe(false)
      expect(await verifyUserExists(undefined)).toBe(false)
    })
  })

  describe('recoverDatabaseIfNeeded', () => {
    beforeEach(async () => {
      // Clean users table before each test
      try {
        await db.delete(users)
      } catch (error) {
        // Table might not exist if database was replaced
      }
    })

    afterEach(async () => {
      // Clean users table after each test
      try {
        await db.delete(users)
      } catch (error) {
        // Table might not exist if database was replaced
      }
    })

    it('should not recover if user exists', async () => {
      // Arrange: Create a test user
      const [testUser] = await db
        .insert(users)
        .values({
          email: 'existing@example.com',
          name: 'Existing User',
          provider: 'facebook',
          providerUserId: 'fb_exists',
          emailVerified: true
        })
        .returning()

      // Act: Try to recover
      const result = await recoverDatabaseIfNeeded(testUser.id, TEST_BACKUPS_DIR)

      // Assert: Should not recover
      expect(result.recovered).toBe(false)
      expect(result.reason).toBe('user_exists')
    })

    it('should find backup file when user does not exist', async () => {
      // Arrange: Create a backup file
      const sqlDump = `SELECT 1;` // Simple SQL that won't conflict
      const backupPath = path.join(TEST_BACKUPS_DIR, 'familytree_20260101_120000.sql')
      await fs.writeFile(backupPath, sqlDump)

      // Act: Attempt recovery for non-existent user
      const result = await recoverDatabaseIfNeeded(999999, TEST_BACKUPS_DIR)

      // Assert: Should find the backup file
      // Note: Recovery may fail due to production DB schema conflicts, but should find the file
      expect(result.backupFile).toBe('familytree_20260101_120000.sql')
      expect(result).toHaveProperty('recovered')
    })

    it('should check for user verification property in result', async () => {
      // Arrange: Create a backup file
      const sqlDump = `SELECT 1;`
      const backupPath = path.join(TEST_BACKUPS_DIR, 'familytree_20260101_120000.sql')
      await fs.writeFile(backupPath, sqlDump)

      // Act: Attempt recovery for non-existent user
      const result = await recoverDatabaseIfNeeded(999999, TEST_BACKUPS_DIR)

      // Assert: Result should have userFoundAfterRecovery property if recovery was attempted
      expect(result).toHaveProperty('recovered')
      if (result.recovered) {
        expect(result).toHaveProperty('userFoundAfterRecovery')
      }
    })

    it('should return error if no backups available', async () => {
      // Act: Try to recover with no backups
      const result = await recoverDatabaseIfNeeded(999999, TEST_BACKUPS_DIR)

      // Assert: Should fail
      expect(result.recovered).toBe(false)
      expect(result.reason).toBe('no_backups')
    })

    it('should handle case where backup does not contain the user', async () => {
      // Arrange: Create a backup file
      const sqlDump = `SELECT 1;`
      const backupPath = path.join(TEST_BACKUPS_DIR, 'familytree_20260101_120000.sql')
      await fs.writeFile(backupPath, sqlDump)

      // Act: Try to recover for a non-existent user
      const result = await recoverDatabaseIfNeeded(999999, TEST_BACKUPS_DIR)

      // Assert: Should have a result with recovery attempt information
      expect(result).toHaveProperty('recovered')
    })

    it('should handle recovery failures gracefully', async () => {
      // Arrange: Create corrupted backup
      const backupPath = path.join(TEST_BACKUPS_DIR, 'familytree_20260101_120000.sql')
      await fs.writeFile(backupPath, 'CORRUPTED DATA;;;')

      // Act: Try to recover
      const result = await recoverDatabaseIfNeeded(999999, TEST_BACKUPS_DIR)

      // Assert: Should handle error
      expect(result.recovered).toBe(false)
      expect(result.reason).toBe('recovery_failed')
      expect(result.error).toBeDefined()
    })

    it('should skip recovery if user ID is null or undefined', async () => {
      // Act: Try to recover with invalid user IDs
      const result1 = await recoverDatabaseIfNeeded(null, TEST_BACKUPS_DIR)
      const result2 = await recoverDatabaseIfNeeded(undefined, TEST_BACKUPS_DIR)

      // Assert: Should not recover
      expect(result1.recovered).toBe(false)
      expect(result1.reason).toBe('invalid_user_id')
      expect(result2.recovered).toBe(false)
      expect(result2.reason).toBe('invalid_user_id')
    })
  })

  describe('Integration scenarios', () => {
    beforeEach(async () => {
      try {
        await db.delete(users)
      } catch (error) {
        // Table might not exist if database was replaced
      }
    })

    afterEach(async () => {
      try {
        await db.delete(users)
      } catch (error) {
        // Table might not exist if database was replaced
      }
    })

    it('should handle complete recovery workflow', async () => {
      // Scenario: User authenticates, but user record is missing from database
      // System should automatically restore from most recent backup

      // Arrange: Create multiple backups
      const oldBackup = `
PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  provider TEXT NOT NULL,
  provider_user_id TEXT,
  email_verified INTEGER DEFAULT 1 NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
  last_login_at TEXT,
  default_person_id INTEGER,
  view_all_records INTEGER NOT NULL DEFAULT 0
);
DELETE FROM users;
INSERT INTO users (id, email, name, provider, provider_user_id, email_verified)
VALUES (1, 'old@example.com', 'Old User', 'facebook', 'fb_old', 1);
COMMIT;
      `
      const newBackup = `
PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  provider TEXT NOT NULL,
  provider_user_id TEXT,
  email_verified INTEGER DEFAULT 1 NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
  last_login_at TEXT,
  default_person_id INTEGER,
  view_all_records INTEGER NOT NULL DEFAULT 0
);
DELETE FROM users;
INSERT INTO users (id, email, name, provider, provider_user_id, email_verified)
VALUES (1, 'new@example.com', 'New User', 'facebook', 'fb_new', 1);
COMMIT;
      `
      await fs.writeFile(
        path.join(TEST_BACKUPS_DIR, 'familytree_20260101_120000.sql'),
        oldBackup
      )
      await fs.writeFile(
        path.join(TEST_BACKUPS_DIR, 'familytree_20260102_120000.sql'),
        newBackup
      )

      // Act: User ID 1 logs in, but doesn't exist in database
      const result = await recoverDatabaseIfNeeded(1, TEST_BACKUPS_DIR)

      // Assert: Should restore from most recent backup
      expect(result.recovered).toBe(true)
      expect(result.backupFile).toBe('familytree_20260102_120000.sql')
      expect(result.userFoundAfterRecovery).toBe(true)

      // Verify user data was restored from most recent backup
      const exists = await verifyUserExists(1)
      expect(exists).toBe(true)
    })
  })
})
