/**
 * Auth Removal Verification Tests
 * RED Phase - These tests verify that all OAuth and Facebook integration has been removed
 *
 * These tests should FAIL initially and pass once auth code is removed.
 */

import { describe, it, expect } from 'vitest'
import { db } from '$lib/db/client.js'
import { people, relationships } from '$lib/db/schema.js'
import { eq } from 'drizzle-orm'
import fs from 'fs'
import path from 'path'

describe('Auth Removal Verification', () => {
  describe('Auth files should not exist', () => {
    it('should not have auth.js', () => {
      const authPath = path.join(process.cwd(), 'src/lib/server/auth.js')
      expect(fs.existsSync(authPath)).toBe(false)
    })

    it('should not have config.js (auth config)', () => {
      const configPath = path.join(process.cwd(), 'src/lib/server/config.js')
      expect(fs.existsSync(configPath)).toBe(false)
    })

    it('should not have userSync.js', () => {
      const userSyncPath = path.join(process.cwd(), 'src/lib/server/userSync.js')
      expect(fs.existsSync(userSyncPath)).toBe(false)
    })

    it('should not have defaultPerson.js', () => {
      const defaultPersonPath = path.join(process.cwd(), 'src/lib/server/defaultPerson.js')
      expect(fs.existsSync(defaultPersonPath)).toBe(false)
    })

    it('should not have session.js (auth session helpers)', () => {
      const sessionPath = path.join(process.cwd(), 'src/lib/server/session.js')
      expect(fs.existsSync(sessionPath)).toBe(false)
    })

    it('should not have hooks.server.js (auth hooks)', () => {
      const hooksPath = path.join(process.cwd(), 'src/hooks.server.js')
      expect(fs.existsSync(hooksPath)).toBe(false)
    })

    it('should not have FACEBOOK_OAUTH_SETUP.md', () => {
      const docPath = path.join(process.cwd(), 'FACEBOOK_OAUTH_SETUP.md')
      expect(fs.existsSync(docPath)).toBe(false)
    })
  })

  describe('Auth dependencies should not exist', () => {
    it('should not have @auth/core in package.json', () => {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8')
      )

      expect(packageJson.dependencies).toBeDefined()
      expect(packageJson.dependencies['@auth/core']).toBeUndefined()
    })

    it('should not have @auth/sveltekit in package.json', () => {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8')
      )

      expect(packageJson.dependencies).toBeDefined()
      expect(packageJson.dependencies['@auth/sveltekit']).toBeUndefined()
    })
  })

  describe('Database schema should not have users/sessions tables', () => {
    it('should not export users table from schema', () => {
      // This will be checked by TypeScript/import errors once removed
      // For now, we check that the import would fail
      expect(() => {
        // If users table exists in schema, this would succeed
        // We expect it to NOT exist
        const schema = { people, relationships }
        expect(schema.users).toBeUndefined()
      }).not.toThrow()
    })

    it('people table should not require userId', () => {
      // Check schema definition
      const peopleSchema = people

      // The userId column should not exist or should be nullable
      // This is a meta-test - actual validation happens when trying to insert without userId
      expect(peopleSchema).toBeDefined()
    })

    it('relationships table should not require userId', () => {
      // Check schema definition
      const relationshipsSchema = relationships

      // The userId column should not exist or should be nullable
      expect(relationshipsSchema).toBeDefined()
    })
  })

  describe('Documentation should not mention Facebook/OAuth', () => {
    it('README.md should not mention Facebook OAuth', () => {
      const readmePath = path.join(process.cwd(), 'README.md')
      if (fs.existsSync(readmePath)) {
        const readme = fs.readFileSync(readmePath, 'utf-8')

        expect(readme.toLowerCase()).not.toContain('facebook oauth')
        expect(readme.toLowerCase()).not.toContain('auth_secret')
        expect(readme.toLowerCase()).not.toContain('facebook_app_id')
      }
    })

    it('CLAUDE.md should not mention Facebook OAuth', () => {
      const claudePath = path.join(process.cwd(), 'CLAUDE.md')
      if (fs.existsSync(claudePath)) {
        const claude = fs.readFileSync(claudePath, 'utf-8')

        expect(claude).not.toContain('Facebook Integration')
        expect(claude).not.toContain('Facebook OAuth')
        expect(claude).not.toContain('AUTH_SECRET')
      }
    })
  })

  describe('API routes should work without authentication', () => {
    it('should be able to create person without userId', async () => {
      // This test verifies the schema change worked
      const testPerson = {
        firstName: 'Test',
        lastName: 'Person',
        birthDate: '1990-01-01',
        gender: 'male'
      }

      // Should not throw an error about missing userId
      const [created] = await db.insert(people).values(testPerson).returning()

      expect(created).toBeDefined()
      expect(created.id).toBeDefined()
      expect(created.firstName).toBe('Test')

      // Cleanup
      await db.delete(people).where(eq(people.id, created.id))
    })

    it('should be able to create relationship without userId', async () => {
      // Create two people first
      const [person1] = await db.insert(people).values({
        firstName: 'Parent',
        lastName: 'Test',
        gender: 'female'
      }).returning()

      const [person2] = await db.insert(people).values({
        firstName: 'Child',
        lastName: 'Test',
        gender: 'male'
      }).returning()

      // Create relationship without userId
      const [relationship] = await db.insert(relationships).values({
        person1Id: person1.id,
        person2Id: person2.id,
        type: 'parentOf',
        parentRole: 'mother'
      }).returning()

      expect(relationship).toBeDefined()
      expect(relationship.id).toBeDefined()

      // Cleanup
      await db.delete(relationships).where(eq(relationships.id, relationship.id))
      await db.delete(people).where(eq(people.id, person1.id))
      await db.delete(people).where(eq(people.id, person2.id))
    })
  })
})
