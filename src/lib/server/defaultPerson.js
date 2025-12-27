/**
 * Default Person Management Module
 * Story #81: Auto-Create Default Person from Facebook Profile
 *
 * Provides functions to create and manage a user's default Person record
 * (their own profile in the family tree).
 *
 * Features:
 * - Check if user needs a default person
 * - Create Person from Facebook profile data
 * - Link Person to User as default_person_id
 * - Handle edge cases (single name, missing data, etc.)
 */

import { db as defaultDb } from '$lib/db/client.js'
import { users, people } from '$lib/db/schema.js'
import { eq } from 'drizzle-orm'
import { extractPersonDataFromProfile } from './facebookGraphClient.js'

/**
 * Checks if a user needs a default person created
 *
 * Returns true if:
 * - User exists
 * - User has no default_person_id
 * - OR default_person_id points to a deleted person
 *
 * Returns false if:
 * - User already has a valid default person
 *
 * @param {number} userId - User's database ID
 * @param {Object} [database] - Drizzle database instance (for testing)
 * @returns {Promise<boolean>} True if user needs a default person
 * @throws {Error} If user not found
 *
 * @example
 * if (await shouldCreateDefaultPerson(userId)) {
 *   await createDefaultPersonFromProfile(userId, facebookProfile)
 * }
 */
export async function shouldCreateDefaultPerson(userId, database = defaultDb) {
  // Get user
  const [user] = await database.select().from(users).where(eq(users.id, userId)).limit(1)

  if (!user) {
    throw new Error(`User not found with id: ${userId}`)
  }

  // If user has no default person ID, they need one
  if (!user.defaultPersonId) {
    return true
  }

  // Check if the default person still exists
  // (it might have been deleted, which sets defaultPersonId to NULL via ON DELETE SET NULL)
  const [person] = await database
    .select()
    .from(people)
    .where(eq(people.id, user.defaultPersonId))
    .limit(1)

  // If person doesn't exist, user needs a new default person
  return !person
}

/**
 * Creates a Person record from Facebook profile and links it to user
 *
 * This function is ONLY called on first login when the user has no default person.
 * It does NOT update the Person on subsequent logins (manual sync only).
 *
 * Steps:
 * 1. Verify user exists
 * 2. Verify user doesn't already have a default person
 * 3. Extract person data from Facebook profile
 * 4. Create Person record
 * 5. Update user's default_person_id
 *
 * @param {number} userId - User's database ID
 * @param {Object} facebookProfile - Facebook profile object from Graph API
 * @param {Object} [database] - Drizzle database instance (for testing)
 * @returns {Promise<Object>} Created Person record
 * @throws {Error} If user not found or already has default person
 *
 * @example
 * const facebookProfile = await fetchFacebookProfile(accessToken)
 * const person = await createDefaultPersonFromProfile(userId, facebookProfile)
 * console.log('Created default person:', person.id)
 */
export async function createDefaultPersonFromProfile(userId, facebookProfile, database = defaultDb) {
  // Verify user exists
  const [user] = await database.select().from(users).where(eq(users.id, userId)).limit(1)

  if (!user) {
    throw new Error(`User not found with id: ${userId}`)
  }

  // Verify user doesn't already have a default person
  if (user.defaultPersonId) {
    throw new Error('User already has a default person')
  }

  // Extract person data from Facebook profile
  const personData = extractPersonDataFromProfile(facebookProfile)

  // Create Person record
  const [createdPerson] = await database
    .insert(people)
    .values({
      firstName: personData.firstName,
      lastName: personData.lastName,
      birthDate: personData.birthDate,
      gender: personData.gender,
      photoUrl: personData.photoUrl,
      userId: userId
    })
    .returning()

  // Update user's default_person_id
  await database
    .update(users)
    .set({ defaultPersonId: createdPerson.id })
    .where(eq(users.id, userId))

  return createdPerson
}
