import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

/**
 * People table schema
 * Matches existing SQLite database structure
 */
export const people = sqliteTable('people', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  birthDate: text('birth_date'),
  deathDate: text('death_date'),
  gender: text('gender'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`)
})

/**
 * Relationships table schema
 * Matches existing SQLite database structure
 *
 * Relationship types:
 * - "parentOf": person1 is parent of person2 (with parent_role: "mother" or "father")
 * - "spouse": person1 is spouse of person2
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
