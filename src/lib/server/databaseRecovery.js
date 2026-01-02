/**
 * Database Recovery Module
 *
 * Provides automatic database recovery from backups when user data is missing.
 * This module is called during server startup to verify user existence and
 * restore from the most recent backup if needed.
 *
 * Features:
 * - Lists backup files from backups directory
 * - Parses backup timestamps from filenames
 * - Finds most recent backup (prefers SQL dumps over binary copies)
 * - Restores database from SQL dumps or binary backups
 * - Verifies user exists after restoration
 * - Comprehensive error handling for all edge cases
 */

import { promises as fs } from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import { db, reconnectDatabase } from '$lib/db/client.js'
import { users } from '$lib/db/schema.js'
import { eq } from 'drizzle-orm'

const execAsync = promisify(exec)

/**
 * Lists all backup files in the backups directory
 * Only returns files matching the backup naming pattern: familytree_YYYYMMDD_HHMMSS.(sql|db)
 *
 * @param {string} backupsDir - Path to backups directory
 * @returns {Promise<string[]>} Array of backup filenames
 *
 * @example
 * const files = await listBackupFiles('/path/to/backups')
 * // Returns: ['familytree_20260101_120000.sql', 'familytree_20260101_120000.db']
 */
export async function listBackupFiles(backupsDir) {
  try {
    // Read directory contents
    const files = await fs.readdir(backupsDir)

    // Filter for backup files matching naming pattern
    const backupPattern = /^familytree_\d{8}_\d{6}\.(sql|db)$/
    const backupFiles = files.filter((file) => backupPattern.test(file))

    return backupFiles
  } catch (error) {
    // Directory doesn't exist or can't be read
    return []
  }
}

/**
 * Parses timestamp from backup filename
 * Expected format: familytree_YYYYMMDD_HHMMSS.(sql|db)
 *
 * @param {string} filename - Backup filename
 * @returns {Date|null} Date object or null if parsing fails
 *
 * @example
 * const date = parseBackupTimestamp('familytree_20260101_120000.sql')
 * // Returns: Date object for 2026-01-01 12:00:00
 */
export function parseBackupTimestamp(filename) {
  // Extract timestamp from filename
  const match = filename.match(/^familytree_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})\.(sql|db)$/)

  if (!match) {
    return null
  }

  // Parse date components
  const [, year, month, day, hour, minute, second] = match

  // Create Date object (month is 0-indexed)
  const date = new Date(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hour),
    parseInt(minute),
    parseInt(second)
  )

  return date
}

/**
 * Finds the most recent backup file
 * Prefers SQL dumps over binary DB files for portability
 *
 * @param {string} backupsDir - Path to backups directory
 * @returns {Promise<string|null>} Filename of most recent backup or null if none found
 *
 * @example
 * const recent = await findMostRecentBackup('/path/to/backups')
 * // Returns: 'familytree_20260102_120000.sql'
 */
export async function findMostRecentBackup(backupsDir) {
  // Get all backup files
  const files = await listBackupFiles(backupsDir)

  if (files.length === 0) {
    return null
  }

  // Parse timestamps for all files
  const filesWithTimestamps = files
    .map((file) => ({
      filename: file,
      timestamp: parseBackupTimestamp(file),
      isSql: file.endsWith('.sql')
    }))
    .filter((item) => item.timestamp !== null)

  if (filesWithTimestamps.length === 0) {
    return null
  }

  // Sort by timestamp (descending), then prefer SQL files
  filesWithTimestamps.sort((a, b) => {
    // First compare timestamps
    const timeDiff = b.timestamp.getTime() - a.timestamp.getTime()

    // If timestamps are equal or very close (within 5 minutes), prefer SQL
    if (Math.abs(timeDiff) < 5 * 60 * 1000) {
      if (a.isSql && !b.isSql) return -1
      if (!a.isSql && b.isSql) return 1
    }

    return timeDiff
  })

  // Return most recent file
  return filesWithTimestamps[0].filename
}

/**
 * Restores database from backup file
 * Supports both SQL dumps (.sql) and binary copies (.db)
 *
 * @param {string} backupPath - Full path to backup file
 * @param {string} dbPath - Full path to database file
 * @returns {Promise<Object>} Result object with success status and details
 *
 * @example
 * const result = await restoreFromBackup('/backups/familytree_20260101_120000.sql', '/familytree.db')
 * // Returns: { success: true, type: 'sql', message: 'Database restored from SQL dump' }
 */
export async function restoreFromBackup(backupPath, dbPath) {
  try {
    // Check if backup file exists
    await fs.access(backupPath)

    // Determine backup type
    const isSqlDump = backupPath.endsWith('.sql')

    if (isSqlDump) {
      // Restore from SQL dump
      try {
        // Ensure database directory exists
        const dbDir = path.dirname(dbPath)
        await fs.mkdir(dbDir, { recursive: true })

        // Delete existing database file if it exists
        // This prevents CREATE TABLE conflicts when restoring from backup
        try {
          await fs.unlink(dbPath)
        } catch (error) {
          // File doesn't exist, which is fine
          if (error.code !== 'ENOENT') {
            throw error // Re-throw if it's a different error (permission, etc.)
          }
        }

        // Create fresh empty database
        await execAsync(`sqlite3 "${dbPath}" "VACUUM;"`)

        // Execute SQL statements using sqlite3 CLI
        // This is safer than using db.run() for multiple statements
        const command = `sqlite3 "${dbPath}" < "${backupPath}"`
        await execAsync(command)

        return {
          success: true,
          type: 'sql',
          message: `Database restored from SQL dump: ${path.basename(backupPath)}`
        }
      } catch (error) {
        return {
          success: false,
          error: `Failed to restore from SQL dump: ${error.message}`
        }
      }
    } else {
      // Restore from binary DB copy
      try {
        // Copy backup file to database location
        await fs.copyFile(backupPath, dbPath)

        return {
          success: true,
          type: 'db',
          message: `Database restored from binary backup: ${path.basename(backupPath)}`
        }
      } catch (error) {
        return {
          success: false,
          error: `Failed to restore from binary backup: ${error.message}`
        }
      }
    }
  } catch (error) {
    return {
      success: false,
      error: `Backup file not found: ${backupPath}`
    }
  }
}

/**
 * Verifies that a user exists in the database
 *
 * @param {number} userId - User's database ID
 * @returns {Promise<boolean>} True if user exists, false otherwise
 *
 * @example
 * const exists = await verifyUserExists(123)
 * // Returns: true if user ID 123 exists in database
 */
export async function verifyUserExists(userId) {
  // Handle invalid user IDs
  if (userId === null || userId === undefined) {
    return false
  }

  try {
    // Query database for user
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)

    return user !== undefined
  } catch (error) {
    console.error('Error verifying user existence:', error)
    return false
  }
}

/**
 * Recovers database from most recent backup if user is not found
 * Main entry point for automatic recovery workflow
 *
 * @param {number} userId - User's database ID to verify
 * @param {string} backupsDir - Path to backups directory
 * @returns {Promise<Object>} Recovery result object
 *
 * @example
 * const result = await recoverDatabaseIfNeeded(123, '/backups')
 * if (result.recovered) {
 *   console.log('Database recovered from', result.backupFile)
 * }
 */
export async function recoverDatabaseIfNeeded(userId, backupsDir = 'backups') {
  // Validate user ID
  if (userId === null || userId === undefined) {
    return {
      recovered: false,
      reason: 'invalid_user_id'
    }
  }

  // Check if user exists
  const userExists = await verifyUserExists(userId)

  if (userExists) {
    return {
      recovered: false,
      reason: 'user_exists'
    }
  }

  console.warn(`User ID ${userId} not found in database. Attempting recovery from backup...`)

  // Find most recent backup
  const backupFile = await findMostRecentBackup(backupsDir)

  if (!backupFile) {
    console.error('No backup files found in', backupsDir)
    return {
      recovered: false,
      reason: 'no_backups'
    }
  }

  console.log(`Found backup: ${backupFile}`)

  // Construct full paths
  const backupPath = path.join(backupsDir, backupFile)
  const dbPath = path.join(process.cwd(), 'familytree.db')

  // Restore from backup
  const restoreResult = await restoreFromBackup(backupPath, dbPath)

  if (!restoreResult.success) {
    console.error('Failed to restore from backup:', restoreResult.error)
    return {
      recovered: false,
      reason: 'recovery_failed',
      error: restoreResult.error
    }
  }

  console.log(restoreResult.message)

  // Reconnect to database after file replacement
  // This ensures the ORM client uses the new database file
  // Only reconnect if we restored the production database (familytree.db)
  if (dbPath.endsWith('familytree.db')) {
    reconnectDatabase()
  }

  // Verify user exists after recovery
  const userExistsAfterRecovery = await verifyUserExists(userId)

  return {
    recovered: true,
    backupFile,
    backupType: restoreResult.type,
    userFoundAfterRecovery: userExistsAfterRecovery
  }
}
