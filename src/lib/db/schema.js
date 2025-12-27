import { sqliteTable, integer, text, index, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

/**
 * People table schema
 * Matches existing SQLite database structure
 *
 * User Association (Issue #72):
 * - user_id: Associates each person with a user (multi-user support)
 * - Foreign key to users table with CASCADE DELETE
 * - Index on user_id for performance
 */
export const people = sqliteTable('people', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  birthDate: text('birth_date'),
  deathDate: text('death_date'),
  gender: text('gender'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
}, (table) => {
  return {
    userIdIdx: index('people_user_id_idx').on(table.userId)
  }
})

/**
 * Relationships table schema
 * Matches existing SQLite database structure
 *
 * Relationship types:
 * - "parentOf": person1 is parent of person2 (with parent_role: "mother" or "father")
 * - "spouse": person1 is spouse of person2
 *
 * User Association (Issue #72):
 * - user_id: Associates each relationship with a user (multi-user support)
 * - Foreign key to users table with CASCADE DELETE
 * - Index on user_id for performance
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
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
}, (table) => {
  return {
    userIdIdx: index('relationships_user_id_idx').on(table.userId)
  }
})

/**
 * Users table schema
 * Stores user authentication and profile data for Google OAuth
 */
export const users = sqliteTable(
  'users',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    email: text('email').notNull().unique(),
    name: text('name'),
    avatarUrl: text('avatar_url'),
    provider: text('provider').notNull(),
    providerUserId: text('provider_user_id'),
    emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(true),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    lastLoginAt: text('last_login_at')
  },
  (table) => {
    return {
      emailIdx: uniqueIndex('users_email_idx').on(table.email),
      providerUserIdIdx: index('users_provider_user_id_idx').on(table.providerUserId)
    }
  }
)

/**
 * Sessions table schema
 * Manages user authentication sessions with 30-day expiration
 */
export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: text('expires_at').notNull(),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    lastAccessedAt: text('last_accessed_at')
  },
  (table) => {
    return {
      userIdIdx: index('sessions_user_id_idx').on(table.userId),
      expiresAtIdx: index('sessions_expires_at_idx').on(table.expiresAt)
    }
  }
)
