/**
 * Migration: Add User Association to Data Model
 *
 * Issue #72: This migration adds user_id to people and relationships tables,
 * enabling multi-user support with data isolation.
 *
 * Steps:
 * 1. Create default user if no users exist
 * 2. Migrate existing people data to new table with user_id
 * 3. Migrate existing relationships data to new table with user_id
 *
 * This migration is designed to be idempotent (safe to run multiple times).
 */

import { eq } from 'drizzle-orm'
import { users, people, relationships } from '../schema.js'

/**
 * Migrates existing data to include user_id associations
 *
 * @param {DrizzleDatabase} db - Drizzle database instance
 * @param {BetterSqlite3Database} sqlite - Raw SQLite database instance
 * @returns {Promise<Object>} Migration results with counts
 */
export async function migrateExistingData(db, sqlite) {
  const results = {
    defaultUserCreated: false,
    defaultUserId: null,
    peopleMigrated: 0,
    relationshipsMigrated: 0
  }

  // Step 1: Create or get default user
  const defaultUser = await getOrCreateDefaultUser(db)
  results.defaultUserId = defaultUser.id
  results.defaultUserCreated = !defaultUser.existing

  // Step 2: Check if old tables exist (migration scenario)
  const tablesExist = checkOldTablesExist(sqlite)

  if (tablesExist.peopleOld) {
    // Check if we've already migrated (idempotency check)
    const existingPeople = await db.select().from(people).where(eq(people.userId, defaultUser.id))

    if (existingPeople.length === 0) {
      // Migrate people from old table
      results.peopleMigrated = await migratePeopleFromOldTable(db, sqlite, defaultUser.id)
    }
  }

  if (tablesExist.relationshipsOld) {
    // Check if we've already migrated (idempotency check)
    const existingRelationships = await db
      .select()
      .from(relationships)
      .where(eq(relationships.userId, defaultUser.id))

    if (existingRelationships.length === 0) {
      // Migrate relationships from old table
      results.relationshipsMigrated = await migrateRelationshipsFromOldTable(
        db,
        sqlite,
        defaultUser.id
      )
    }
  }

  return results
}

/**
 * Gets existing default user or creates a new one
 *
 * @param {DrizzleDatabase} db - Drizzle database instance
 * @returns {Promise<Object>} Default user object with existing flag
 */
async function getOrCreateDefaultUser(db) {
  const DEFAULT_EMAIL = 'default@familytree.local'

  // Check if default user already exists
  const existingUsers = await db.select().from(users).where(eq(users.email, DEFAULT_EMAIL))

  if (existingUsers.length > 0) {
    return {
      id: existingUsers[0].id,
      existing: true
    }
  }

  // Create default user
  const newUsers = await db
    .insert(users)
    .values({
      email: DEFAULT_EMAIL,
      name: 'Default User',
      provider: 'system',
      emailVerified: true
    })
    .returning()

  return {
    id: newUsers[0].id,
    existing: false
  }
}

/**
 * Checks if old tables exist (for migration scenario)
 *
 * @param {BetterSqlite3Database} sqlite - Raw SQLite database instance
 * @returns {Object} Object with boolean flags for each old table
 */
function checkOldTablesExist(sqlite) {
  const tables = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all()
    .map((t) => t.name)

  return {
    peopleOld: tables.includes('people_old'),
    relationshipsOld: tables.includes('relationships_old')
  }
}

/**
 * Migrates people from people_old table to new people table
 *
 * @param {DrizzleDatabase} db - Drizzle database instance
 * @param {BetterSqlite3Database} sqlite - Raw SQLite database instance
 * @param {number} defaultUserId - ID of default user
 * @returns {Promise<number>} Number of people migrated
 */
async function migratePeopleFromOldTable(db, sqlite, defaultUserId) {
  // Get all people from old table
  const oldPeople = sqlite.prepare('SELECT * FROM people_old').all()

  if (oldPeople.length === 0) {
    return 0
  }

  // Migrate each person to new table with user_id
  for (const oldPerson of oldPeople) {
    await db.insert(people).values({
      firstName: oldPerson.first_name,
      lastName: oldPerson.last_name,
      birthDate: oldPerson.birth_date || null,
      deathDate: oldPerson.death_date || null,
      gender: oldPerson.gender || null,
      createdAt: oldPerson.created_at || undefined,
      userId: defaultUserId
    })
  }

  return oldPeople.length
}

/**
 * Migrates relationships from relationships_old table to new relationships table
 *
 * @param {DrizzleDatabase} db - Drizzle database instance
 * @param {BetterSqlite3Database} sqlite - Raw SQLite database instance
 * @param {number} defaultUserId - ID of default user
 * @returns {Promise<number>} Number of relationships migrated
 */
async function migrateRelationshipsFromOldTable(db, sqlite, defaultUserId) {
  // First, we need to get the new IDs for people (since they were re-inserted)
  // For this migration, we'll need to rebuild the relationships based on the migrated people

  // Get all relationships from old table
  const oldRelationships = sqlite.prepare('SELECT * FROM relationships_old').all()

  if (oldRelationships.length === 0) {
    return 0
  }

  // Get old people to new people ID mapping
  const oldPeople = sqlite.prepare('SELECT * FROM people_old').all()
  const newPeople = await db.select().from(people).where(eq(people.userId, defaultUserId))

  // Create mapping: old_id -> new_id based on matching first_name and last_name
  const idMapping = {}
  for (const oldPerson of oldPeople) {
    const matchingNew = newPeople.find(
      (np) => np.firstName === oldPerson.first_name && np.lastName === oldPerson.last_name
    )
    if (matchingNew) {
      idMapping[oldPerson.id] = matchingNew.id
    }
  }

  // Migrate each relationship to new table with user_id and new person IDs
  let migratedCount = 0
  for (const oldRel of oldRelationships) {
    const newPerson1Id = idMapping[oldRel.person1_id]
    const newPerson2Id = idMapping[oldRel.person2_id]

    if (newPerson1Id && newPerson2Id) {
      await db.insert(relationships).values({
        person1Id: newPerson1Id,
        person2Id: newPerson2Id,
        type: oldRel.type,
        parentRole: oldRel.parent_role || null,
        createdAt: oldRel.created_at || undefined,
        userId: defaultUserId
      })
      migratedCount++
    }
  }

  return migratedCount
}

/**
 * Runs the actual database migration (adds user_id columns to existing tables)
 * This is run directly on the production database
 *
 * @param {BetterSqlite3Database} sqlite - Raw SQLite database instance
 */
export async function runDatabaseMigration(sqlite) {
  // Enable foreign keys
  sqlite.exec('PRAGMA foreign_keys = OFF')

  // Step 1: Rename existing tables to _old
  try {
    sqlite.exec('ALTER TABLE people RENAME TO people_old')
  } catch (e) {
    // Table might not exist or already renamed
    console.log('people table already migrated or does not exist')
  }

  try {
    sqlite.exec('ALTER TABLE relationships RENAME TO relationships_old')
  } catch (e) {
    // Table might not exist or already renamed
    console.log('relationships table already migrated or does not exist')
  }

  // Step 2: Create new tables with user_id
  // These will be created automatically by Drizzle when we use the schema

  // Note: The actual table creation is handled by Drizzle ORM
  // We just need to prepare the old data for migration

  // Re-enable foreign keys
  sqlite.exec('PRAGMA foreign_keys = ON')
}
