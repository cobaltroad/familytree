# GEDCOM Import Debugging Guide

## Overview

This document describes the comprehensive console debugging system added to the GEDCOM import flow to identify and diagnose issues during file upload, parsing, and import processes.

**Date Added**: 2026-01-03
**Related Issue**: Silent failure when uploading `backups/dollete.ged`

## Debugging Coverage

Comprehensive console debugging has been added at every major step of the GEDCOM import flow:

### 1. Frontend (ImportView.svelte)

**Location**: `/Users/cobaltroad/Source/familytree/src/lib/ImportView.svelte`

**Debug Points**:
- `handleFileSelect()` - File selection via input
- `handleDrop()` - File selection via drag-and-drop
- `validateAndSelectFile()` - File validation (type, size, empty check)
- `handleUpload()` - Upload process (FormData creation, fetch request, response handling)
- `clearSelection()` - File deselection

**Debug Output Format**: `[ImportView] <operation> <details>`

**Example Output**:
```
[ImportView] handleFileSelect called
[ImportView] Selected file: { name: 'dollete.ged', size: 5578, type: '', lastModified: ... }
[ImportView] Validating file: { name: 'dollete.ged', size: 5578, ... }
[ImportView] File type validation passed
[ImportView] File size validation passed
[ImportView] All validations passed, file selected
[ImportView] handleUpload called
[ImportView] Creating FormData
[ImportView] Sending POST request to /api/gedcom/upload
[ImportView] Response received: { status: 200, ok: true, ... }
[ImportView] Upload successful, result: { uploadId: '...', fileName: '...', fileSize: 5578 }
```

### 2. Upload API Endpoint

**Location**: `/Users/cobaltroad/Source/familytree/src/routes/api/gedcom/upload/+server.js`

**Debug Points**:
- Request received
- Authentication check
- Form data parsing
- File extraction
- File validation (type, size, empty check)
- Upload ID generation
- File data reading
- File storage
- Response creation
- Error handling

**Debug Output Format**: `[GEDCOM Upload API] <operation> <details>`

**Example Output**:
```
[GEDCOM Upload API] POST request received
[GEDCOM Upload API] Checking authentication
[GEDCOM Upload API] User authenticated, userId: 1
[GEDCOM Upload API] Parsing form data
[GEDCOM Upload API] File extracted: { name: 'dollete.ged', size: 5578, type: '' }
[GEDCOM Upload API] Validating file type: dollete.ged
[GEDCOM Upload API] File type validation passed
[GEDCOM Upload API] Validating file size: 5578
[GEDCOM Upload API] File size validation passed
[GEDCOM Upload API] Generating upload ID for user: 1
[GEDCOM Upload API] Upload ID generated: 1_20260103_211234567
[GEDCOM Upload API] Reading file data into buffer
[GEDCOM Upload API] File data read, buffer size: 5578
[GEDCOM Upload API] Saving file to temporary storage
[GEDCOM Upload API] Success response: { uploadId: '...', fileName: '...', fileSize: 5578 }
```

### 3. GEDCOM Parser Module

**Location**: `/Users/cobaltroad/Source/familytree/src/lib/server/gedcomParser.js`

**Debug Points**:
- `parseGedcom()` - Main parsing function
  - Content validation
  - Version detection
  - Version validation
  - Library parsing
  - Record processing
  - Individual/family extraction
  - Error collection

**Debug Output Format**: `[GEDCOM Parser] <operation> <details>`

**Example Output**:
```
[GEDCOM Parser] parseGedcom called
[GEDCOM Parser] Content length: 5578
[GEDCOM Parser] Content preview (first 200 chars): 0 HEAD\n1 SOUR Gramps...
[GEDCOM Parser] Detecting GEDCOM version
[GEDCOM Parser] Detected version: 5.5.1
[GEDCOM Parser] Validating GEDCOM version
[GEDCOM Parser] Version validation result: { valid: true }
[GEDCOM Parser] Parsing with parse-gedcom library
[GEDCOM Parser] Library parse result: { hasChildren: true, childrenCount: 42 }
[GEDCOM Parser] Processing 42 records
[GEDCOM Parser] Parsing complete: { individualsCount: 15, familiesCount: 8, errorsCount: 0 }
[GEDCOM Parser] First few individuals: [ { id: '@I0000@', name: 'Ronald /Dollete/' }, ... ]
```

### 4. Parse API Endpoint

**Location**: `/Users/cobaltroad/Source/familytree/src/routes/api/gedcom/parse/[uploadId]/+server.js`

**Debug Points**:
- Request received
- Authentication check
- Upload ID extraction
- Temp file lookup
- File content reading
- GEDCOM parsing
- Statistics extraction
- Duplicate detection
- Relationship validation
- Preview data storage
- Response creation
- Error handling

**Debug Output Format**: `[GEDCOM Parse API] <operation> <details>`

**Example Output**:
```
[GEDCOM Parse API] POST request received
[GEDCOM Parse API] Upload ID: 1_20260103_211234567
[GEDCOM Parse API] Getting temp file info for uploadId: 1_20260103_211234567
[GEDCOM Parse API] File info: { exists: true, filePath: '/tmp/gedcom/...' }
[GEDCOM Parse API] Reading file content from: /tmp/gedcom/...
[GEDCOM Parse API] File content read, length: 5578
[GEDCOM Parse API] Calling parseGedcom
[GEDCOM Parse API] Parse result: { success: true, version: '5.5.1', individualsCount: 15, ... }
[GEDCOM Parse API] Extracting statistics
[GEDCOM Parse API] Statistics: { totalIndividuals: 15, totalFamilies: 8, ... }
[GEDCOM Parse API] Fetching existing people for user: 1
[GEDCOM Parse API] Existing people count: 0
[GEDCOM Parse API] Finding duplicates
[GEDCOM Parse API] Duplicates found: 0
[GEDCOM Parse API] Validating relationship consistency
[GEDCOM Parse API] Relationship issues found: 0
[GEDCOM Parse API] Storing preview data
[GEDCOM Parse API] Preview data stored successfully
[GEDCOM Parse API] Returning response: { uploadId: '...', version: '5.5.1', ... }
```

## Using the Debug Output

### How to Test with dollete.ged

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Open browser console** (F12 or Cmd+Option+I on Mac)

3. **Navigate to Import view** in your app (typically `#/import`)

4. **Upload the dollete.ged file**:
   - Click "Choose File" and select `/Users/cobaltroad/Source/familytree/backups/dollete.ged`
   - Or drag and drop the file into the drop zone

5. **Monitor console output**:
   - Frontend logs appear in browser console
   - Backend logs appear in terminal where `npm run dev` is running

### Identifying Failure Points

Debug output is structured to help identify exactly where failures occur:

#### **1. File Selection Issues**
Look for:
```
[ImportView] No file provided to validate
[ImportView] File type validation failed
[ImportView] File size validation failed
[ImportView] File is empty
```

#### **2. Upload Issues**
Look for:
```
[ImportView] Upload failed with error response
[GEDCOM Upload API] Invalid file object
[GEDCOM Upload API] Failed to parse form data
[GEDCOM Upload API] File type validation failed
[GEDCOM Upload API] File size exceeds limit
```

#### **3. Parsing Issues**
Look for:
```
[GEDCOM Parser] Version validation failed
[GEDCOM Parser] Error caught in parseGedcom
[GEDCOM Parse API] Parsing failed
[GEDCOM Parse API] Upload not found
```

#### **4. Storage/Database Issues**
Look for:
```
[GEDCOM Upload API] Failed to save file
[GEDCOM Parse API] Failed to store preview data
[GEDCOM Parse API] Error caught in main try-catch
```

### Error Details

All error logging includes comprehensive details:

```javascript
console.error('[Component] Error details:', {
  name: error.name,
  message: error.message,
  stack: error.stack
})
```

This helps identify:
- **Error type** (TypeError, ReferenceError, etc.)
- **Error message** (specific failure reason)
- **Stack trace** (exact line where error occurred)

## Expected Flow for dollete.ged

For the `dollete.ged` file (5578 bytes, GEDCOM 5.5.1), you should see:

### Frontend Console:
```
[ImportView] handleFileSelect called
[ImportView] Selected file: { name: 'dollete.ged', size: 5578, ... }
[ImportView] Validating file: { name: 'dollete.ged', size: 5578, ... }
[ImportView] File type validation passed
[ImportView] File size validation passed
[ImportView] All validations passed, file selected
[ImportView] handleUpload called
[ImportView] Creating FormData
[ImportView] Sending POST request to /api/gedcom/upload
[ImportView] Response received: { status: 200, ok: true }
[ImportView] Upload successful, result: { uploadId: '...', fileName: 'dollete.ged', fileSize: 5578 }
```

### Backend Terminal:
```
[GEDCOM Upload API] POST request received
[GEDCOM Upload API] User authenticated, userId: 1
[GEDCOM Upload API] File extracted: { name: 'dollete.ged', size: 5578 }
[GEDCOM Upload API] File type validation passed
[GEDCOM Upload API] File size validation passed
[GEDCOM Upload API] Upload ID generated: 1_20260103_...
[GEDCOM Upload API] File data read, buffer size: 5578
[GEDCOM Upload API] Success response: { uploadId: '...', fileName: 'dollete.ged', fileSize: 5578 }
```

If parsing is triggered:
```
[GEDCOM Parse API] POST request received
[GEDCOM Parser] parseGedcom called
[GEDCOM Parser] Content length: 5578
[GEDCOM Parser] Detected version: 5.5.1
[GEDCOM Parser] Version validation result: { valid: true }
[GEDCOM Parser] Parsing complete: { individualsCount: ~15, familiesCount: ~8 }
[GEDCOM Parse API] Returning response: { uploadId: '...', version: '5.5.1', ... }
```

## Test Coverage

A comprehensive test suite has been added to verify the debugging system:

**Location**: `/Users/cobaltroad/Source/familytree/src/lib/server/gedcomDebug.test.js`

**Tests** (10 total):
1. File reading and initial validation
2. File size and content length logging
3. Parsing dollete.ged successfully
4. Logging individual and family counts
5. Logging parsing errors/warnings
6. Invalid GEDCOM version handling
7. Empty file content handling
8. Malformed GEDCOM data handling
9. Statistics extraction logging
10. Date range calculation logging

**Run tests**:
```bash
npm test -- gedcomDebug.test.js
```

## Troubleshooting Common Issues

### Issue: No console output appears

**Check**:
1. Browser console is open (F12)
2. Console is set to show all log levels (not filtered to errors only)
3. Terminal where `npm run dev` is running is visible
4. Authentication is working (user is logged in)

### Issue: Upload stops silently

**Look for**:
1. Last debug message before silence
2. Error messages in browser console
3. Network tab showing failed requests
4. Terminal showing server errors

### Issue: Parse errors not showing

**Verify**:
1. Upload completed successfully (uploadId returned)
2. Parse endpoint is being called
3. File content is readable
4. GEDCOM version is supported (5.5.1 or 7.0)

## Removal of Debug Code

When debugging is complete, you can remove debug statements by:

1. **Search for debug patterns**:
   ```bash
   grep -r "console.log\(\'\[" src/lib/ImportView.svelte
   grep -r "console.log\(\'\[GEDCOM" src/routes/api/gedcom/
   grep -r "console.log\(\'\[GEDCOM Parser\]" src/lib/server/gedcomParser.js
   ```

2. **Remove all lines containing**:
   - `console.log('[ImportView]`
   - `console.log('[GEDCOM Upload API]`
   - `console.log('[GEDCOM Parser]`
   - `console.log('[GEDCOM Parse API]`
   - `console.error('[ImportView]`
   - `console.error('[GEDCOM Upload API]`
   - `console.error('[GEDCOM Parser]`
   - `console.error('[GEDCOM Parse API]`

3. **Keep essential error logging**:
   - Authentication errors
   - Database errors
   - File system errors
   - Validation failures

## Related Files

- `/Users/cobaltroad/Source/familytree/src/lib/ImportView.svelte` - Frontend import view
- `/Users/cobaltroad/Source/familytree/src/routes/api/gedcom/upload/+server.js` - Upload endpoint
- `/Users/cobaltroad/Source/familytree/src/routes/api/gedcom/parse/[uploadId]/+server.js` - Parse endpoint
- `/Users/cobaltroad/Source/familytree/src/lib/server/gedcomParser.js` - Parser module
- `/Users/cobaltroad/Source/familytree/src/lib/server/gedcomDebug.test.js` - Debug test suite
- `/Users/cobaltroad/Source/familytree/backups/dollete.ged` - Test file (5578 bytes, GEDCOM 5.5.1)

## Next Steps

After identifying the failure point using this debugging system:

1. **Document the specific error** from console output
2. **Create a bug report** with:
   - Complete debug output
   - Error message and stack trace
   - File characteristics (size, version, format)
   - Expected vs. actual behavior
3. **Write a failing test** that reproduces the issue
4. **Implement a fix** following TDD methodology
5. **Verify fix** with both the test and the actual dollete.ged file
6. **Clean up debug code** (optional - can keep for future debugging)

## Conclusion

This comprehensive debugging system provides visibility into every stage of the GEDCOM import flow, making it easy to identify exactly where and why the import is failing. The structured debug output format ensures you can quickly pinpoint issues without needing to add additional logging.
