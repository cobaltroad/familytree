/**
 * Data Exporter Module (Issue #146)
 *
 * Core business logic for exporting SQLite database data as JSON files.
 * This module is imported by the export-data CLI script and is testable.
 *
 * Design principles:
 * - Single Responsibility: Each function has one clear purpose
 * - Separation of Concerns: Database access, validation, and file I/O are separated
 * - Testability: Pure functions with clear inputs and outputs
 * - Error Handling: Descriptive errors with helpful messages
 */

import Database from 'better-sqlite3'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'

/**
 * SQL query to select people data with sensitive fields excluded
 * Excludes: user_id, created_at
 */
const PEOPLE_QUERY = `
  SELECT
    id,
    first_name as firstName,
    last_name as lastName,
    birth_date as birthDate,
    death_date as deathDate,
    gender,
    photo_url as photoUrl,
    birth_surname as birthSurname,
    nickname
  FROM people
  ORDER BY id
`

/**
 * SQL query to select relationships data with sensitive fields excluded
 * Excludes: user_id, created_at
 */
const RELATIONSHIPS_QUERY = `
  SELECT
    id,
    person1_id as person1Id,
    person2_id as person2Id,
    type,
    parent_role as parentRole
  FROM relationships
  ORDER BY id
`

/**
 * Validates that the database file exists and can be opened
 *
 * @param {string} dbPath - Path to SQLite database file
 * @returns {Database} Opened database connection
 * @throws {Error} If database doesn't exist or cannot be opened
 */
function openDatabase(dbPath) {
  if (!existsSync(dbPath)) {
    const error = new Error(`Database not found at ${dbPath}`)
    console.error('Error: Database file does not exist')
    console.error(`Expected location: ${dbPath}`)
    throw error
  }

  try {
    return new Database(dbPath)
  } catch (error) {
    console.error('Error: Unable to open database file')
    console.error(`Database path: ${dbPath}`)
    console.error(`Error details: ${error.message}`)
    throw error
  }
}

/**
 * Queries all data from the database
 *
 * @param {Database} sqlite - SQLite database connection
 * @returns {{ people: Array, relationships: Array }} Query results
 */
function queryAllData(sqlite) {
  const people = sqlite.prepare(PEOPLE_QUERY).all()
  const relationships = sqlite.prepare(RELATIONSHIPS_QUERY).all()

  return { people, relationships }
}

/**
 * Writes JSON data to a file with pretty formatting
 *
 * @param {string} filePath - Path to output file
 * @param {any} data - Data to write as JSON
 */
function writeJsonFile(filePath, data) {
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

/**
 * Exports data from SQLite database to JSON files
 *
 * This function:
 * 1. Validates and opens the database
 * 2. Queries people and relationships (excluding sensitive fields)
 * 3. Writes data to JSON files in the output directory
 * 4. Provides feedback via console logs
 *
 * @param {string} dbPath - Path to SQLite database file
 * @param {string} outputDir - Directory to write JSON files
 * @throws {Error} If database doesn't exist, cannot be read, or file write fails
 */
export async function exportData(dbPath, outputDir) {
  // Open and validate database
  const sqlite = openDatabase(dbPath)

  // Query all data
  const { people, relationships } = queryAllData(sqlite)

  // Close database connection
  sqlite.close()

  // Warn if database is empty
  if (people.length === 0 && relationships.length === 0) {
    console.warn('Warning: The database is empty (no people or relationships found)')
  }

  // Ensure output directory exists
  mkdirSync(outputDir, { recursive: true })

  // Write people.json
  const peopleJsonPath = join(outputDir, 'people.json')
  writeJsonFile(peopleJsonPath, people)
  console.log(`✓ Exported ${people.length} people to ${peopleJsonPath}`)

  // Write relationships.json
  const relationshipsJsonPath = join(outputDir, 'relationships.json')
  writeJsonFile(relationshipsJsonPath, relationships)
  console.log(`✓ Exported ${relationships.length} relationships to ${relationshipsJsonPath}`)

  console.log('\n✅ Export completed successfully')
}
