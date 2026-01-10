-- Migration: Add birth_surname and nickname columns to people table
-- Issue: #121 - Support Birth Surnames and Nicknames for People
-- Date: 2026-01-10

ALTER TABLE `people` ADD `birth_surname` text;
ALTER TABLE `people` ADD `nickname` text;
