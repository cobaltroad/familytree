import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { setupTestDatabase } from '$lib/server/testHelpers.js'
import { exportData } from '$lib/server/dataExporter.js'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'fs'

/**
 * Test suite for export-data script
 *
 * Tests BDD acceptance criteria from Issue #146:
 * 1. Given SQLite database with family tree data, When I run export, Then JSON files are created in static/data/
 * 2. Given export runs successfully, When I examine JSON, Then sensitive fields are excluded
 * 3. Given database has people and relationships, When I run export, Then both files are generated with valid JSON
 * 4. Given database is empty, When I run export, Then empty arrays are exported with warning
 * 5. Given database doesn't exist, When I run export, Then helpful error message is displayed
 */

// Get the project root directory (4 levels up from this test file)
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '../../../../')

// Test database path
const testDbPath = join(projectRoot, 'test-export.db')
const staticDataDir = join(projectRoot, 'static', 'data')
const peopleJsonPath = join(staticDataDir, 'people.json')
const relationshipsJsonPath = join(staticDataDir, 'relationships.json')

describe('export-data script', () => {
  let sqlite
  let db
  let userId
  let consoleLogSpy
  let consoleWarnSpy
  let consoleErrorSpy

  beforeEach(async () => {
    // Clean up any existing test files
    if (existsSync(staticDataDir)) {
      rmSync(staticDataDir, { recursive: true, force: true })
    }
    if (existsSync(testDbPath)) {
      rmSync(testDbPath, { force: true })
    }

    // Spy on console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    // Clean up database
    if (sqlite) {
      try {
        sqlite.close()
      } catch (e) {
        // Already closed
      }
    }

    // Clean up test files
    if (existsSync(staticDataDir)) {
      rmSync(staticDataDir, { recursive: true, force: true })
    }
    if (existsSync(testDbPath)) {
      rmSync(testDbPath, { force: true })
    }

    // Restore console
    consoleLogSpy.mockRestore()
    consoleWarnSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  describe('Acceptance Criterion 1: Export creates JSON files', () => {
    it('should create static/data directory if it does not exist', async () => {
      // Arrange: Create test database with data
      sqlite = new Database(testDbPath)
      db = drizzle(sqlite)
      userId = await setupTestDatabase(sqlite, db)

      sqlite.prepare(`
        INSERT INTO people (first_name, last_name, birth_date, gender)
        VALUES (?, ?, ?, ?)
      `).run('John', 'Doe', '1980-01-01', 'male')

      sqlite.close()

      // Act: Run exportData function
      await exportData(testDbPath, staticDataDir)

      // Assert: Directory and files should be created
      expect(existsSync(staticDataDir)).toBe(true)
      expect(existsSync(peopleJsonPath)).toBe(true)
      expect(existsSync(relationshipsJsonPath)).toBe(true)
    })

    it('should export people to people.json', async () => {
      // Arrange
      sqlite = new Database(testDbPath)
      db = drizzle(sqlite)
      userId = await setupTestDatabase(sqlite, db)

      sqlite.prepare(`
        INSERT INTO people (first_name, last_name, birth_date, death_date, gender, photo_url, birth_surname, nickname)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run('John', 'Doe', '1980-01-01', null, 'male', 'https://example.com/photo.jpg', 'Smith', 'Johnny')

      sqlite.prepare(`
        INSERT INTO people (first_name, last_name, birth_date, gender)
        VALUES (?, ?, ?, ?)
      `).run('Jane', 'Doe', '1985-05-15', 'female')

      sqlite.close()

      // Act
      await exportData(testDbPath, staticDataDir)

      // Assert
      const peopleData = JSON.parse(readFileSync(peopleJsonPath, 'utf-8'))
      expect(Array.isArray(peopleData)).toBe(true)
      expect(peopleData).toHaveLength(2)
      expect(peopleData[0]).toMatchObject({
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        birthDate: '1980-01-01',
        deathDate: null,
        gender: 'male',
        photoUrl: 'https://example.com/photo.jpg',
        birthSurname: 'Smith',
        nickname: 'Johnny'
      })
      expect(peopleData[1]).toMatchObject({
        id: 2,
        firstName: 'Jane',
        lastName: 'Doe',
        birthDate: '1985-05-15',
        gender: 'female'
      })
    })

    it('should export relationships to relationships.json', async () => {
      // Arrange
      sqlite = new Database(testDbPath)
      db = drizzle(sqlite)
      userId = await setupTestDatabase(sqlite, db)

      // Insert people
      sqlite.prepare(`
        INSERT INTO people (first_name, last_name)
      VALUES (?, ?)
      `).run('John', 'Doe')

      sqlite.prepare(`
        INSERT INTO people (first_name, last_name)
      VALUES (?, ?)
      `).run('Jane', 'Doe')

      sqlite.prepare(`
        INSERT INTO people (first_name, last_name)
      VALUES (?, ?)
      `).run('Baby', 'Doe')

      // Insert relationships
      sqlite.prepare(`
        INSERT INTO relationships (person1_id, person2_id, type, parent_role)
        VALUES (?, ?, ?, ?)
      `).run(1, 3, 'parentOf', 'father')

      sqlite.prepare(`
        INSERT INTO relationships (person1_id, person2_id, type, parent_role)
        VALUES (?, ?, ?, ?)
      `).run(2, 3, 'parentOf', 'mother')

      sqlite.prepare(`
        INSERT INTO relationships (person1_id, person2_id, type)
      VALUES (?, ?, ?)
      `).run(1, 2, 'spouse')

      sqlite.close()

      // Act
      await exportData(testDbPath, staticDataDir)

      // Assert
      const relationshipsData = JSON.parse(readFileSync(relationshipsJsonPath, 'utf-8'))
      expect(Array.isArray(relationshipsData)).toBe(true)
      expect(relationshipsData).toHaveLength(3)

      // Check parent relationships
      const fatherRelation = relationshipsData.find(r => r.parentRole === 'father')
      expect(fatherRelation).toMatchObject({
        id: 1,
        person1Id: 1,
        person2Id: 3,
        type: 'parentOf',
        parentRole: 'father'
      })

      const motherRelation = relationshipsData.find(r => r.parentRole === 'mother')
      expect(motherRelation).toMatchObject({
        id: 2,
        person1Id: 2,
        person2Id: 3,
        type: 'parentOf',
        parentRole: 'mother'
      })

      // Check spouse relationship
      const spouseRelation = relationshipsData.find(r => r.type === 'spouse')
      expect(spouseRelation).toMatchObject({
        id: 3,
        person1Id: 1,
        person2Id: 2,
        type: 'spouse'
      })
      expect(spouseRelation.parentRole).toBeNull()
    })
  })

  describe('Acceptance Criterion 2: Sensitive fields are excluded', () => {
    it('should exclude userId from people export', async () => {
      // Arrange
      sqlite = new Database(testDbPath)
      db = drizzle(sqlite)
      userId = await setupTestDatabase(sqlite, db)

      sqlite.prepare(`
        INSERT INTO people (first_name, last_name)
      VALUES (?, ?)
      `).run('John', 'Doe')

      sqlite.close()

      // Act
      await exportData(testDbPath, staticDataDir)

      // Assert
      const peopleData = JSON.parse(readFileSync(peopleJsonPath, 'utf-8'))
      expect(peopleData[0]).not.toHaveProperty('userId')
      expect(peopleData[0]).not.toHaveProperty('user_id')
    })

    it('should exclude userId from relationships export', async () => {
      // Arrange
      sqlite = new Database(testDbPath)
      db = drizzle(sqlite)
      userId = await setupTestDatabase(sqlite, db)

      // Insert people
      sqlite.prepare(`
        INSERT INTO people (first_name, last_name)
      VALUES (?, ?)
      `).run('John', 'Doe')

      sqlite.prepare(`
        INSERT INTO people (first_name, last_name)
      VALUES (?, ?)
      `).run('Jane', 'Doe')

      // Insert relationship
      sqlite.prepare(`
        INSERT INTO relationships (person1_id, person2_id, type)
      VALUES (?, ?, ?)
      `).run(1, 2, 'spouse')

      sqlite.close()

      // Act
      await exportData(testDbPath, staticDataDir)

      // Assert
      const relationshipsData = JSON.parse(readFileSync(relationshipsJsonPath, 'utf-8'))
      expect(relationshipsData[0]).not.toHaveProperty('userId')
      expect(relationshipsData[0]).not.toHaveProperty('user_id')
    })

    it('should exclude createdAt timestamps', async () => {
      // Arrange
      sqlite = new Database(testDbPath)
      db = drizzle(sqlite)
      userId = await setupTestDatabase(sqlite, db)

      sqlite.prepare(`
        INSERT INTO people (first_name, last_name)
      VALUES (?, ?)
      `).run('John', 'Doe')

      sqlite.prepare(`
        INSERT INTO people (first_name, last_name)
      VALUES (?, ?)
      `).run('Jane', 'Doe')

      sqlite.prepare(`
        INSERT INTO relationships (person1_id, person2_id, type)
      VALUES (?, ?, ?)
      `).run(1, 2, 'spouse')

      sqlite.close()

      // Act
      await exportData(testDbPath, staticDataDir)

      // Assert
      const peopleData = JSON.parse(readFileSync(peopleJsonPath, 'utf-8'))
      const relationshipsData = JSON.parse(readFileSync(relationshipsJsonPath, 'utf-8'))

      expect(peopleData[0]).not.toHaveProperty('createdAt')
      expect(peopleData[0]).not.toHaveProperty('created_at')
      expect(relationshipsData[0]).not.toHaveProperty('createdAt')
      expect(relationshipsData[0]).not.toHaveProperty('created_at')
    })
  })

  describe('Acceptance Criterion 3: Valid JSON structure', () => {
    it('should generate valid JSON that can be parsed', async () => {
      // Arrange
      sqlite = new Database(testDbPath)
      db = drizzle(sqlite)
      userId = await setupTestDatabase(sqlite, db)

      sqlite.prepare(`
        INSERT INTO people (first_name, last_name)
      VALUES (?, ?)
      `).run('John', 'Doe')

      sqlite.close()

      // Act
      await exportData(testDbPath, staticDataDir)

      // Assert - should not throw when parsing
      expect(() => {
        JSON.parse(readFileSync(peopleJsonPath, 'utf-8'))
      }).not.toThrow()

      expect(() => {
        JSON.parse(readFileSync(relationshipsJsonPath, 'utf-8'))
      }).not.toThrow()
    })

    it('should pretty-print JSON with 2-space indentation', async () => {
      // Arrange
      sqlite = new Database(testDbPath)
      db = drizzle(sqlite)
      userId = await setupTestDatabase(sqlite, db)

      sqlite.prepare(`
        INSERT INTO people (first_name, last_name)
      VALUES (?, ?)
      `).run('John', 'Doe')

      sqlite.close()

      // Act
      await exportData(testDbPath, staticDataDir)

      // Assert - check for indentation
      const peopleJsonContent = readFileSync(peopleJsonPath, 'utf-8')
      expect(peopleJsonContent).toContain('  ') // Should have 2-space indentation
      expect(peopleJsonContent).toMatch(/\[\n\s+{/) // Array with newlines and indentation
    })
  })

  describe('Acceptance Criterion 4: Empty database handling', () => {
    it('should export empty arrays when database is empty', async () => {
      // Arrange - create database but don't add data
      sqlite = new Database(testDbPath)
      db = drizzle(sqlite)
      await setupTestDatabase(sqlite, db)
      sqlite.close()

      // Act
      await exportData(testDbPath, staticDataDir)

      // Assert
      const peopleData = JSON.parse(readFileSync(peopleJsonPath, 'utf-8'))
      const relationshipsData = JSON.parse(readFileSync(relationshipsJsonPath, 'utf-8'))

      expect(Array.isArray(peopleData)).toBe(true)
      expect(peopleData).toHaveLength(0)
      expect(Array.isArray(relationshipsData)).toBe(true)
      expect(relationshipsData).toHaveLength(0)
    })

    it('should display warning message when exporting empty database', async () => {
      // Arrange
      sqlite = new Database(testDbPath)
      db = drizzle(sqlite)
      await setupTestDatabase(sqlite, db)
      sqlite.close()

      // Act
      await exportData(testDbPath, staticDataDir)

      // Assert - should have logged a warning
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('database is empty')
      )
    })
  })

  describe('Acceptance Criterion 5: Error handling', () => {
    it('should throw helpful error when database file does not exist', async () => {
      // Arrange - use non-existent database path
      const nonExistentDbPath = join(projectRoot, 'does-not-exist.db')

      // Act & Assert
      await expect(exportData(nonExistentDbPath, staticDataDir))
        .rejects
        .toThrow(/database.*not found|unable to open database/i)
    })

    it('should display helpful error message when database file does not exist', async () => {
      // Arrange
      const nonExistentDbPath = join(projectRoot, 'does-not-exist.db')

      // Act
      try {
        await exportData(nonExistentDbPath, staticDataDir)
      } catch (e) {
        // Expected to throw
      }

      // Assert - error message should be helpful
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error')
      )
    })

    it('should handle file system errors gracefully', async () => {
      // Arrange
      sqlite = new Database(testDbPath)
      db = drizzle(sqlite)
      userId = await setupTestDatabase(sqlite, db)

      sqlite.prepare(`
        INSERT INTO people (first_name, last_name)
      VALUES (?, ?)
      `).run('John', 'Doe')

      sqlite.close()

      // Create static/data as a file (not directory) to cause write error
      mkdirSync(join(projectRoot, 'static'), { recursive: true })
      writeFileSync(join(projectRoot, 'static', 'data'), 'blocking file')

      // Act & Assert
      await expect(exportData(testDbPath, staticDataDir))
        .rejects
        .toThrow()
    })
  })

  describe('Integration: Complete export workflow', () => {
    it('should successfully export a complete family tree dataset', async () => {
      // Arrange - create a realistic family tree
      sqlite = new Database(testDbPath)
      db = drizzle(sqlite)
      userId = await setupTestDatabase(sqlite, db)

      // Grandparents
      sqlite.prepare(`INSERT INTO people (first_name, last_name, birth_date, gender)
        VALUES (?, ?, ?, ?)`).run('George', 'Doe', '1920-01-01', 'male')
      sqlite.prepare(`INSERT INTO people (first_name, last_name, birth_date, gender)
        VALUES (?, ?, ?, ?)`).run('Mary', 'Doe', '1922-03-15', 'female')

      // Parents
      sqlite.prepare(`INSERT INTO people (first_name, last_name, birth_date, gender)
        VALUES (?, ?, ?, ?)`).run('John', 'Doe', '1950-05-20', 'male')
      sqlite.prepare(`INSERT INTO people (first_name, last_name, birth_date, gender)
        VALUES (?, ?, ?, ?)`).run('Jane', 'Smith', '1952-08-30', 'female')

      // Children
      sqlite.prepare(`INSERT INTO people (first_name, last_name, birth_date, gender)
        VALUES (?, ?, ?, ?)`).run('Alice', 'Doe', '1980-01-01', 'female')
      sqlite.prepare(`INSERT INTO people (first_name, last_name, birth_date, gender)
        VALUES (?, ?, ?, ?)`).run('Bob', 'Doe', '1982-06-15', 'male')

      // Relationships - grandparents to parent
      sqlite.prepare(`INSERT INTO relationships (person1_id, person2_id, type, parent_role)
        VALUES (?, ?, ?, ?)`).run(1, 3, 'parentOf', 'father')
      sqlite.prepare(`INSERT INTO relationships (person1_id, person2_id, type, parent_role)
        VALUES (?, ?, ?, ?)`).run(2, 3, 'parentOf', 'mother')

      // Grandparent spouse
      sqlite.prepare(`INSERT INTO relationships (person1_id, person2_id, type)
      VALUES (?, ?, ?)`).run(1, 2, 'spouse')

      // Parent spouse
      sqlite.prepare(`INSERT INTO relationships (person1_id, person2_id, type)
      VALUES (?, ?, ?)`).run(3, 4, 'spouse')

      // Parents to children
      sqlite.prepare(`INSERT INTO relationships (person1_id, person2_id, type, parent_role)
        VALUES (?, ?, ?, ?)`).run(3, 5, 'parentOf', 'father')
      sqlite.prepare(`INSERT INTO relationships (person1_id, person2_id, type, parent_role)
        VALUES (?, ?, ?, ?)`).run(4, 5, 'parentOf', 'mother')
      sqlite.prepare(`INSERT INTO relationships (person1_id, person2_id, type, parent_role)
        VALUES (?, ?, ?, ?)`).run(3, 6, 'parentOf', 'father')
      sqlite.prepare(`INSERT INTO relationships (person1_id, person2_id, type, parent_role)
        VALUES (?, ?, ?, ?)`).run(4, 6, 'parentOf', 'mother')

      sqlite.close()

      // Act
      await exportData(testDbPath, staticDataDir)

      // Assert
      const peopleData = JSON.parse(readFileSync(peopleJsonPath, 'utf-8'))
      const relationshipsData = JSON.parse(readFileSync(relationshipsJsonPath, 'utf-8'))

      expect(peopleData).toHaveLength(6)
      expect(relationshipsData).toHaveLength(8)

      // Verify structure is suitable for tree visualization
      const allPersonIds = peopleData.map(p => p.id)
      expect(allPersonIds).toEqual([1, 2, 3, 4, 5, 6])

      // All relationships should reference valid person IDs
      relationshipsData.forEach(rel => {
        expect(allPersonIds).toContain(rel.person1Id)
        expect(allPersonIds).toContain(rel.person2Id)
      })

      // Should have both parent and spouse relationships
      const hasParentRelations = relationshipsData.some(r => r.type === 'parentOf')
      const hasSpouseRelations = relationshipsData.some(r => r.type === 'spouse')
      expect(hasParentRelations).toBe(true)
      expect(hasSpouseRelations).toBe(true)
    })
  })

  describe('CLI script behavior', () => {
    it('should use default database path when not specified', async () => {
      // This will be tested when we implement the CLI wrapper
      // For now, just verify the function is imported correctly
      expect(typeof exportData).toBe('function')
    })
  })
})
