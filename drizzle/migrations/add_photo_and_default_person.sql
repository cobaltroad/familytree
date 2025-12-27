-- Migration: Add photo_url and default_person_id fields
-- Story #77: Add photoUrl field to Person model
-- Story #81: Add defaultPersonId to User model
-- Date: 2025-12-27

-- Add photo_url column to people table
ALTER TABLE people ADD COLUMN photo_url TEXT;

-- Add default_person_id column to users table
ALTER TABLE users ADD COLUMN default_person_id INTEGER REFERENCES people(id) ON DELETE SET NULL;
