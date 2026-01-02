/**
 * Startup Recovery Module
 *
 * Integrates database recovery into the SvelteKit request handling flow.
 * This module is called on authenticated requests to verify the user exists
 * and trigger recovery if needed.
 *
 * Features:
 * - Extracts user ID from session
 * - Verifies user exists in database
 * - Triggers automatic recovery from backups
 * - Logs all recovery actions
 * - Graceful error handling
 */

import path from 'path'
import { verifyUserExists, recoverDatabaseIfNeeded } from './databaseRecovery.js'

/**
 * Checks if user exists and recovers from backup if needed
 * This function should be called during SvelteKit request handling
 * for authenticated requests.
 *
 * @param {Object|null} session - Auth.js session object
 * @param {string} backupsDir - Path to backups directory (defaults to 'backups')
 * @returns {Promise<Object>} Result object with check and recovery status
 *
 * @example
 * // In hooks.server.js handle function
 * const session = await event.locals.getSession()
 * const result = await checkAndRecoverUser(session)
 * if (result.recovered) {
 *   console.log('Database recovered from backup')
 * }
 */
export async function checkAndRecoverUser(session, backupsDir = 'backups') {
  // Skip if no session
  if (!session) {
    return {
      checked: false,
      reason: 'no_session'
    }
  }

  // Skip if session has no user
  if (!session.user) {
    return {
      checked: false,
      reason: 'no_user_in_session'
    }
  }

  // Skip if user has no ID
  if (!session.user.id) {
    return {
      checked: false,
      reason: 'no_user_id'
    }
  }

  const userId = session.user.id

  // Check if user exists in database
  const userExists = await verifyUserExists(userId)

  if (userExists) {
    // User exists, no recovery needed
    return {
      checked: true,
      userExists: true,
      recovered: false
    }
  }

  // User doesn't exist - log warning
  console.warn(
    `User ID ${userId} not found in database. Attempting recovery from backup...`
  )

  // Attempt recovery
  try {
    const recoveryResult = await recoverDatabaseIfNeeded(userId, backupsDir)

    if (recoveryResult.recovered) {
      if (recoveryResult.userFoundAfterRecovery) {
        console.log(`Successfully recovered user ID ${userId} from backup`)
      } else {
        console.error(
          `Recovery completed but user ID ${userId} still not found in backup`
        )
      }
    } else {
      console.error(`Failed to recover database: ${recoveryResult.reason}`)
    }

    return {
      checked: true,
      userExists: false,
      attemptedRecovery: true,
      recoveryResult
    }
  } catch (error) {
    console.error('Error during database recovery:', error)

    return {
      checked: true,
      userExists: false,
      attemptedRecovery: true,
      recoveryResult: {
        recovered: false,
        error: error.message
      }
    }
  }
}
