#!/usr/bin/env node

/**
 * Data Export Script (Issue #146)
 *
 * CLI wrapper for exporting SQLite database data as JSON files.
 *
 * Usage:
 *   npm run export-data
 *   node scripts/export-data.js
 *   node scripts/export-data.js [dbPath] [outputDir]
 *
 * This script:
 * 1. Reads people and relationships from the SQLite database
 * 2. Excludes sensitive fields (userId, email, sessionId, createdAt)
 * 3. Exports to JSON files in static/data/ directory
 * 4. Handles errors gracefully with helpful messages
 */

import { exportData } from '../src/lib/server/dataExporter.js'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Get project root directory
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')

// Default paths
const DEFAULT_DB_PATH = join(projectRoot, 'familytree.db')
const DEFAULT_OUTPUT_DIR = join(projectRoot, 'static', 'data')

// CLI entry point
const dbPath = process.argv[2] || DEFAULT_DB_PATH
const outputDir = process.argv[3] || DEFAULT_OUTPUT_DIR

console.log('🚀 Starting data export...\n')
console.log(`Database: ${dbPath}`)
console.log(`Output directory: ${outputDir}\n`)

exportData(dbPath, outputDir)
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('Export failed. Please check the error messages above.')
    process.exit(1)
  })
