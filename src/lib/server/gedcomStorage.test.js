import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { promises as fs } from 'fs'
import path from 'path'
import {
  generateUploadId,
  generateTempFilePath,
  saveUploadedFile,
  cleanupTempFile,
  getTempFileInfo
} from './gedcomStorage.js'

/**
 * Test suite for GEDCOM File Storage
 * Story #92: Basic GEDCOM File Upload
 *
 * Tests temporary file storage for GEDCOM uploads:
 * - Upload ID generation
 * - Temporary file path generation
 * - File saving to temporary directory
 * - File cleanup
 */

describe('generateUploadId', () => {
  it('should generate a unique upload ID', () => {
    const id1 = generateUploadId()
    const id2 = generateUploadId()

    expect(id1).toBeTruthy()
    expect(id2).toBeTruthy()
    expect(id1).not.toBe(id2)
  })

  it('should generate ID with userId and timestamp', () => {
    const userId = 123
    const uploadId = generateUploadId(userId)

    expect(uploadId).toContain('123')
    expect(uploadId).toMatch(/^\d+_\d+_[a-z0-9]+$/)
  })

  it('should generate different IDs for same user', () => {
    const userId = 123
    const id1 = generateUploadId(userId)
    const id2 = generateUploadId(userId)

    expect(id1).not.toBe(id2)
  })

  it('should handle string userId', () => {
    const userId = 'user-abc-123'
    const uploadId = generateUploadId(userId)

    expect(uploadId).toBeTruthy()
    expect(uploadId).toContain('user-abc-123')
  })
})

describe('generateTempFilePath', () => {
  it('should generate path in temp directory', () => {
    const uploadId = '123_1234567890_abc123'
    const fileName = 'family.ged'

    const filePath = generateTempFilePath(uploadId, fileName)

    expect(filePath).toContain('/tmp/gedcom-uploads/')
    expect(filePath).toContain(uploadId)
    expect(filePath).toContain('family.ged')
  })

  it('should sanitize filename in path', () => {
    const uploadId = '123_1234567890_abc123'
    const maliciousName = '../../../etc/passwd'

    const filePath = generateTempFilePath(uploadId, maliciousName)

    expect(filePath).not.toContain('..')
    expect(filePath).not.toContain('/etc/')
  })

  it('should use uploadId as directory name', () => {
    const uploadId = '123_1234567890_abc123'
    const fileName = 'tree.ged'

    const filePath = generateTempFilePath(uploadId, fileName)

    expect(filePath).toMatch(/\/tmp\/gedcom-uploads\/123_1234567890_abc123\/tree\.ged$/)
  })
})

describe('saveUploadedFile', () => {
  const testTempDir = path.join(process.cwd(), 'test-tmp')

  beforeEach(async () => {
    // Clean up test directory before each test
    try {
      await fs.rm(testTempDir, { recursive: true, force: true })
    } catch (error) {
      // Ignore if directory doesn't exist
    }
  })

  afterEach(async () => {
    // Clean up test directory after each test
    try {
      await fs.rm(testTempDir, { recursive: true, force: true })
    } catch (error) {
      // Ignore cleanup errors
    }
  })

  it('should save file to temporary directory', async () => {
    const uploadId = generateUploadId(123)
    const fileName = 'test.ged'
    const fileData = Buffer.from('0 HEAD\n1 GEDC\n2 VERS 5.5.1\n')

    const result = await saveUploadedFile(uploadId, fileName, fileData)

    expect(result.success).toBe(true)
    expect(result.filePath).toBeTruthy()
    expect(result.fileName).toBe('test.ged')
    expect(result.fileSize).toBe(fileData.length)
  })

  it('should create directory if it does not exist', async () => {
    const uploadId = generateUploadId(456)
    const fileName = 'tree.ged'
    const fileData = Buffer.from('GEDCOM content')

    const result = await saveUploadedFile(uploadId, fileName, fileData)

    expect(result.success).toBe(true)

    // Verify file was actually created
    const fileExists = await fs.access(result.filePath).then(() => true).catch(() => false)
    expect(fileExists).toBe(true)
  })

  it('should return file metadata', async () => {
    const uploadId = generateUploadId(789)
    const fileName = 'export.ged'
    const fileData = Buffer.from('0 HEAD\n1 SOUR FamilyTree\n')

    const result = await saveUploadedFile(uploadId, fileName, fileData)

    expect(result).toMatchObject({
      success: true,
      uploadId: uploadId,
      fileName: 'export.ged',
      fileSize: fileData.length,
      filePath: expect.stringContaining(uploadId)
    })
  })

  it('should handle save errors gracefully', async () => {
    const uploadId = generateUploadId(999)
    const fileName = 'test.ged'
    const fileData = null // Invalid data to trigger error

    const result = await saveUploadedFile(uploadId, fileName, fileData)

    expect(result.success).toBe(false)
    expect(result.error).toBeTruthy()
  })

  it('should sanitize filename before saving', async () => {
    const uploadId = generateUploadId(111)
    const maliciousName = '../../../etc/passwd.ged'
    const fileData = Buffer.from('test content')

    const result = await saveUploadedFile(uploadId, maliciousName, fileData)

    expect(result.success).toBe(true)
    expect(result.filePath).not.toContain('..')
    expect(result.filePath).not.toContain('/etc/')
  })
})

describe('cleanupTempFile', () => {
  const testTempDir = path.join(process.cwd(), 'test-tmp')

  beforeEach(async () => {
    await fs.rm(testTempDir, { recursive: true, force: true }).catch(() => {})
  })

  afterEach(async () => {
    await fs.rm(testTempDir, { recursive: true, force: true }).catch(() => {})
  })

  it('should delete temporary file', async () => {
    const uploadId = generateUploadId(123)
    const fileName = 'cleanup-test.ged'
    const fileData = Buffer.from('test content')

    // First, save a file
    const saveResult = await saveUploadedFile(uploadId, fileName, fileData)
    expect(saveResult.success).toBe(true)

    // Verify file exists
    const existsBefore = await fs.access(saveResult.filePath).then(() => true).catch(() => false)
    expect(existsBefore).toBe(true)

    // Clean up file
    const cleanupResult = await cleanupTempFile(uploadId)
    expect(cleanupResult.success).toBe(true)

    // Verify file is deleted
    const existsAfter = await fs.access(saveResult.filePath).then(() => true).catch(() => false)
    expect(existsAfter).toBe(false)
  })

  it('should delete entire upload directory', async () => {
    const uploadId = generateUploadId(456)
    const fileName = 'test.ged'
    const fileData = Buffer.from('content')

    const saveResult = await saveUploadedFile(uploadId, fileName, fileData)
    const uploadDir = path.dirname(saveResult.filePath)

    // Verify directory exists
    const dirExistsBefore = await fs.access(uploadDir).then(() => true).catch(() => false)
    expect(dirExistsBefore).toBe(true)

    // Clean up
    await cleanupTempFile(uploadId)

    // Verify directory is deleted
    const dirExistsAfter = await fs.access(uploadDir).then(() => true).catch(() => false)
    expect(dirExistsAfter).toBe(false)
  })

  it('should handle cleanup of non-existent file gracefully', async () => {
    const fakeUploadId = 'nonexistent_123_abc'

    const result = await cleanupTempFile(fakeUploadId)

    // Should not throw error, should return success: false or handle gracefully
    expect(result).toBeDefined()
  })

  it('should clean up on error during upload', async () => {
    const uploadId = generateUploadId(789)

    // Simulate partial upload by creating directory but not file
    const uploadDir = path.join('/tmp/gedcom-uploads', uploadId)
    await fs.mkdir(uploadDir, { recursive: true })

    // Clean up should still work
    const result = await cleanupTempFile(uploadId)
    expect(result.success).toBe(true)

    const dirExists = await fs.access(uploadDir).then(() => true).catch(() => false)
    expect(dirExists).toBe(false)
  })
})

describe('getTempFileInfo', () => {
  const testTempDir = path.join(process.cwd(), 'test-tmp')

  beforeEach(async () => {
    await fs.rm(testTempDir, { recursive: true, force: true }).catch(() => {})
  })

  afterEach(async () => {
    await fs.rm(testTempDir, { recursive: true, force: true }).catch(() => {})
  })

  it('should return file metadata for existing file', async () => {
    const uploadId = generateUploadId(123)
    const fileName = 'info-test.ged'
    const fileData = Buffer.from('test content')

    const saveResult = await saveUploadedFile(uploadId, fileName, fileData)

    const info = await getTempFileInfo(uploadId)

    expect(info).toMatchObject({
      exists: true,
      uploadId: uploadId,
      fileName: fileName,
      fileSize: fileData.length,
      filePath: saveResult.filePath
    })
  })

  it('should return exists: false for non-existent file', async () => {
    const fakeUploadId = 'nonexistent_456_xyz'

    const info = await getTempFileInfo(fakeUploadId)

    expect(info.exists).toBe(false)
    expect(info.uploadId).toBe(fakeUploadId)
  })

  it('should include file stats (creation time, etc)', async () => {
    const uploadId = generateUploadId(789)
    const fileName = 'stats-test.ged'
    const fileData = Buffer.from('content')

    await saveUploadedFile(uploadId, fileName, fileData)

    const info = await getTempFileInfo(uploadId)

    expect(info.createdAt).toBeTruthy()
    expect(info.createdAt).toBeInstanceOf(Date)
  })
})
