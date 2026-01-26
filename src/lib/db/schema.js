import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

/**
 * People table schema
 * Matches existing SQLite database structure
 *
 * Photo Support (Story #77):
 * - photo_url: URL to person's photo (nullable, for avatar display)
 *
 * Birth Surname and Nickname (Issue #121):
 * - birth_surname: Original family name before marriage (nullable)
 * - nickname: Common name or alternate name (nullable)
 *
 * Note: userId removed - this is now a local-only app with no authentication
 */
export const people = sqliteTable('people', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  birthDate: text('birth_date'),
  deathDate: text('death_date'),
  gender: text('gender'),
  photoUrl: text('photo_url'),
  birthSurname: text('birth_surname'),
  nickname: text('nickname'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`)
})

/**
 * Relationships table schema
 * Matches existing SQLite database structure
 *
 * Relationship types:
 * - "parentOf": person1 is parent of person2 (with parent_role: "mother" or "father")
 * - "spouse": person1 is spouse of person2
 *
 * Duplicate Prevention (Duplicate Resolution Fix):
 * - Unique index on (person1_id, person2_id, type, parent_role)
 * - Prevents duplicate parent and spouse relationships
 * - Handles NULL parent_role values (for spouse relationships)
 *
 * Note: userId removed - this is now a local-only app with no authentication
 */
export const relationships = sqliteTable('relationships', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  person1Id: integer('person1_id')
    .notNull()
    .references(() => people.id, { onDelete: 'cascade' }),
  person2Id: integer('person2_id')
    .notNull()
    .references(() => people.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  parentRole: text('parent_role'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`)
})

// Users and sessions tables removed - no authentication in local-only app
