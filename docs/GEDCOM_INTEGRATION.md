# GEDCOM Integration Documentation

## Overview

The Family Tree application supports importing genealogy data from GEDCOM (GEnealogical Data COMmunication) files, the industry-standard format for exchanging family history information between genealogy software applications.

**Supported GEDCOM Versions:** 5.5.1, 7.0

**Key Features:**
- Upload GEDCOM files up to 10MB
- Parse and validate GEDCOM structure
- Preview individuals, families, and relationships before import
- Import data with transaction safety (all-or-nothing)
- Comprehensive error handling and recovery
- Multi-user data isolation
- Duplicate detection and resolution

## Architecture

### Module Overview

The GEDCOM integration is implemented across several specialized modules:

```
src/lib/server/
├── gedcomStorage.js         # Temporary file storage and retrieval
├── gedcomValidation.js      # File validation (size, format)
├── gedcomParser.js          # GEDCOM parsing and normalization
├── gedcomPreview.js         # Preview data generation and storage
├── gedcomImporter.js        # Database import with transaction safety
└── gedcomErrorHandler.js    # Error formatting and CSV generation

src/routes/api/gedcom/
├── upload/                  # File upload endpoint
├── parse/[uploadId]/        # Parse GEDCOM file
│   └── status/             # Parsing status polling
├── preview/[uploadId]/      # Preview endpoints
│   ├── individuals/         # List all individuals
│   ├── tree/               # Tree structure data
│   ├── person/[gedcomId]/  # Individual person details
│   └── duplicates/resolve/ # Duplicate resolution
└── import/[uploadId]/      # Import data to database
    └── errors.csv/         # Download error log

src/lib/
├── GedcomUpload.svelte           # Upload page component
├── GedcomParsingResults.svelte   # Parsing results display
└── components/
    ├── FileDropZone.svelte       # Drag-and-drop upload zone
    ├── UploadProgress.svelte     # Upload progress bar
    ├── ParseStatisticsCard.svelte # Statistics display card
    ├── ParseErrorList.svelte     # Error list component
    └── DuplicateSummary.svelte   # Duplicate preview component
```

### Data Flow

**User Interface Flow:**

```
┌──────────────────────┐
│  GedcomUpload.svelte │  #/gedcom/import
│  - FileDropZone      │  → User selects/drops .ged file
│  - UploadProgress    │  → Client-side validation (type, size)
└──────────┬───────────┘  → Upload with progress tracking
           │
           ▼
┌──────────────────────┐
│  Upload API          │  POST /api/gedcom/upload
│                      │  → Store in temp directory
└──────────┬───────────┘  → Return uploadId
           │
           ▼
┌──────────────────────┐
│  Auto-redirect to    │  #/gedcom/parsing/:uploadId
│  Parsing Results     │  → Trigger parse immediately
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Parse API           │  POST /api/gedcom/parse/:uploadId
│                      │  → Detect version (5.5.1 or 7.0)
│                      │  → Parse individuals & families
└──────────┬───────────┘  → Return summary with stats
           │
           ▼
┌──────────────────────┐
│  GedcomParsingResults│  Display results
│  - ParseStatistics   │  → Show counts, version, date range
│  - ParseErrorList    │  → Show errors/warnings if any
│  - DuplicateSummary  │  → Show potential duplicates
└──────────┬───────────┘  → User clicks "Continue to Preview"
           │
           ▼
┌──────────────────────┐
│  Preview Interface   │  #/gedcom/preview/:uploadId
│  (Future: Story #104)│  → Review individuals and families
└──────────┬───────────┘  → User clicks "Import"
           │
           ▼
┌──────────────────────┐
│  Import API          │  POST /api/gedcom/import/:uploadId
│                      │  → Transaction-safe database writes
│                      │  → Link to current user
└──────────┬───────────┘  → Auto-cleanup on success
           │
           ▼
┌──────────────────────┐
│  Success/Error       │  → Data visible in family tree
│                      │  OR
│                      │  → Error log available for download
└──────────────────────┘
```

## API Endpoints

### 1. Upload GEDCOM File

**Endpoint:** `POST /api/gedcom/upload`

**Request:**
```javascript
// multipart/form-data
{
  file: File // GEDCOM file (max 10MB)
}
```

**Response (200):**
```javascript
{
  uploadId: "123e4567-e89b-12d3-a456-426614174000",
  filename: "family.ged",
  size: 153600,
  timestamp: "2025-01-03T10:30:00.000Z"
}
```

**Response (400 - Invalid):**
```javascript
{
  error: "File size exceeds 10MB limit"
}
```

**Implementation:** `src/routes/api/gedcom/upload/+server.js`

---

### 2. Parse GEDCOM File

**Endpoint:** `POST /api/gedcom/parse/:uploadId`

**Request:** No body required

**Response (200):**
```javascript
{
  uploadId: "123e4567-e89b-12d3-a456-426614174000",
  version: "5.5.1",
  individualCount: 245,
  familyCount: 89,
  parseErrors: [],
  parseWarnings: [
    {
      severity: "Warning",
      message: "Invalid date format for @I045@",
      line: 234,
      gedcomId: "@I045@"
    }
  ]
}
```

**Response (400 - Unsupported Version):**
```javascript
{
  error: "GEDCOM version 4.0 is not supported. Please use version 5.5.1 or 7.0"
}
```

**Implementation:** `src/routes/api/gedcom/parse/[uploadId]/+server.js`

---

### 3. Preview Individuals

**Endpoint:** `GET /api/gedcom/preview/:uploadId/individuals`

**Query Parameters:**
- `offset` (optional): Pagination offset (default: 0)
- `limit` (optional): Results per page (default: 100, max: 1000)

**Response (200):**
```javascript
{
  individuals: [
    {
      gedcomId: "@I001@",
      firstName: "John",
      lastName: "Smith",
      birthDate: "1950-01-15",
      birthPlace: "New York, NY",
      deathDate: null,
      deathPlace: null,
      gender: "male",
      photoUrl: "https://example.com/photo.jpg"
    }
  ],
  total: 245,
  offset: 0,
  limit: 100
}
```

**Implementation:** `src/routes/api/gedcom/preview/[uploadId]/individuals/+server.js`

---

### 4. Preview Tree Structure

**Endpoint:** `GET /api/gedcom/preview/:uploadId/tree`

**Response (200):**
```javascript
{
  individuals: [...],  // All individuals
  families: [
    {
      familyId: "@F001@",
      husbandId: "@I001@",
      wifeId: "@I002@",
      children: ["@I003@", "@I004@"]
    }
  ]
}
```

**Implementation:** `src/routes/api/gedcom/preview/[uploadId]/tree/+server.js`

---

### 5. Get Individual Details

**Endpoint:** `GET /api/gedcom/preview/:uploadId/person/:gedcomId`

**Response (200):**
```javascript
{
  gedcomId: "@I001@",
  firstName: "John",
  lastName: "Smith",
  birthDate: "1950-01-15",
  birthPlace: "New York, NY",
  deathDate: null,
  deathPlace: null,
  gender: "male",
  photoUrl: "https://example.com/photo.jpg",
  father: "@I010@",
  mother: "@I011@",
  spouses: ["@I002@"],
  children: ["@I003@", "@I004@"]
}
```

**Implementation:** `src/routes/api/gedcom/preview/[uploadId]/person/[gedcomId]/+server.js`

---

### 6. Import GEDCOM Data

**Endpoint:** `POST /api/gedcom/import/:uploadId`

**Request:** No body required (uses stored preview data)

**Response (200 - Success):**
```javascript
{
  success: true,
  importedPeople: 245,
  importedRelationships: 534,
  message: "Successfully imported 245 people and 534 relationships"
}
```

**Response (400 - Validation Error):**
```javascript
{
  success: false,
  error: {
    code: "VALIDATION_ERROR",
    message: "Import failed - please parse file first",
    canRetry: false
  }
}
```

**Response (409 - Constraint Violation):**
```javascript
{
  success: false,
  error: {
    code: "CONSTRAINT_VIOLATION",
    message: "Database constraint violation",
    details: "Person cannot have multiple mothers",
    canRetry: true,
    errorLogUrl: "/api/gedcom/import/123e4567/errors.csv"
  }
}
```

**Response (504 - Timeout):**
```javascript
{
  success: false,
  error: {
    code: "TIMEOUT_ERROR",
    message: "Import timed out - please try again",
    details: "Large imports may take several minutes",
    canRetry: true
  }
}
```

**Implementation:** `src/routes/api/gedcom/import/[uploadId]/+server.js`

---

### 7. Download Error Log

**Endpoint:** `GET /api/gedcom/import/:uploadId/errors.csv`

**Response (200):**
```csv
Severity,Line,GEDCOM ID,Name,Field,Error,Suggested Fix
Error,234,@I045@,John Smith,birthDate,Invalid date format,Use YYYY-MM-DD format
Warning,567,@I078@,Jane Doe,birthDate,Partial date (year only),Date imported as 1950
Error,890,@F012@,,relationships,Orphaned reference,Remove reference to @I999@
```

**Headers:**
```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="import_errors_20250103_103045.csv"
```

**Implementation:** `src/routes/api/gedcom/import/[uploadId]/errors.csv/+server.js`

---

## Core Modules

### gedcomStorage.js

**Purpose:** Manages temporary GEDCOM file storage

**Key Functions:**

```javascript
// Store uploaded file
storeUploadedGedcomFile(file, userId)
  → Returns: { uploadId, filename, size, path }

// Retrieve file path
getGedcomFilePath(uploadId, userId)
  → Returns: absolute file path or null

// Read file content
getGedcomFileContent(uploadId, userId)
  → Returns: file content as string

// Delete file (cleanup)
deleteGedcomFile(uploadId, userId)
  → Returns: boolean success
```

**Storage Location:** `/tmp/gedcom-uploads/:userId/:uploadId/`

**Security:** Files are isolated by userId to prevent cross-user access

---

### gedcomValidation.js

**Purpose:** Validates GEDCOM files before processing

**Key Functions:**

```javascript
// Validate file size
validateFileSize(file)
  → Max 10MB
  → Returns: { valid: boolean, error?: string }

// Validate file extension
validateFileExtension(filename)
  → Accepts: .ged, .gedcom
  → Returns: { valid: boolean, error?: string }

// Validate GEDCOM structure
validateGedcomStructure(content)
  → Checks for HEAD record
  → Returns: { valid: boolean, error?: string }
```

---

### gedcomParser.js

**Purpose:** Parses and normalizes GEDCOM data

**Key Functions:**

```javascript
// Detect GEDCOM version
detectGedcomVersion(content)
  → Returns: "5.5.1" | "7.0" | null

// Validate version support
validateGedcomVersion(version)
  → Returns: { valid: boolean, error?: string }

// Normalize date formats
normalizeDate(gedcomDate)
  → Input: "15 JAN 1950", "ABT 1950", "YYYY"
  → Output: { normalized: "1950-01-15", modifier: "ABT", valid: true }

// Parse individuals
parseIndividuals(gedcomData)
  → Returns: Array of individual objects

// Parse families
parseFamilies(gedcomData)
  → Returns: Array of family objects

// Validate orphaned references
validateOrphanedReferences(individuals, families)
  → Detects references to non-existent individuals
  → Returns: Array of error objects
```

**Date Normalization:**
- `"DD MMM YYYY"` → `"YYYY-MM-DD"`
- `"MMM YYYY"` → `"YYYY-MM"`
- `"YYYY"` → `"YYYY"`
- `"ABT YYYY"` → `"YYYY"` (modifier stored separately)
- Invalid dates → `null` (with warning logged)

**Supported Date Modifiers:**
- ABT (about/approximate)
- BEF (before)
- AFT (after)
- CAL (calculated)
- EST (estimated)
- BET (between)

---

### gedcomPreview.js

**Purpose:** Generates preview data before import

**Key Functions:**

```javascript
// Store preview data in memory
storePreviewData(uploadId, userId, data)
  → Stores: individuals, families, summary, errors

// Retrieve preview data
getPreviewData(uploadId, userId)
  → Returns: { individuals, families, summary, errors }

// Get paginated individuals
getPreviewIndividuals(uploadId, userId, offset, limit)
  → Returns: { individuals, total, offset, limit }

// Get individual by GEDCOM ID
getPreviewPerson(uploadId, userId, gedcomId)
  → Returns: individual object with relationships

// Clear preview data (cleanup)
clearPreviewData(uploadId, userId)
  → Returns: boolean success
```

**Preview Data Structure:**
```javascript
{
  uploadId: string,
  userId: number,
  summary: {
    version: string,
    individualCount: number,
    familyCount: number,
    parseDate: Date
  },
  individuals: Array<Individual>,
  families: Array<Family>,
  errors: Array<ErrorObject>
}
```

---

### gedcomImporter.js

**Purpose:** Imports GEDCOM data to database

**Key Functions:**

```javascript
// Map GEDCOM sex to app gender
mapGedcomSexToGender(sex)
  → "M" → "male"
  → "F" → "female"
  → "U" → "unspecified"
  → other → "other"

// Extract photo URL from OBJE tag
extractPhotoUrlFromObje(individual)
  → Returns: photo URL or null

// Append date modifiers to notes
appendDateModifierToNotes(notes, modifier)
  → Returns: notes with modifier text appended

// Import individuals (transaction-safe)
importIndividuals(individuals, userId, tx)
  → Creates person records
  → Returns: Map<gedcomId, dbId>

// Import relationships (transaction-safe)
importRelationships(families, gedcomIdMap, userId, tx)
  → Creates relationship records
  → Normalizes parent-child relationships
  → Returns: count of created relationships
```

**Transaction Safety:**
All imports occur within a Drizzle transaction. If any step fails, the entire import is rolled back automatically.

---

### gedcomErrorHandler.js

**Purpose:** Error formatting and logging

**Key Functions:**

```javascript
// Create structured error object
createError(severity, code, message, details)
  → Returns: standardized error object

// Create parsing error
createParsingError(line, gedcomId, field, error, suggestedFix)
  → Returns: error with context

// Create constraint error
createConstraintError(details, suggestion)
  → Returns: database constraint error

// Generate CSV error log
generateErrorLogCSV(errors)
  → Returns: CSV string with proper escaping

// Escape CSV field
escapeCSVField(field)
  → Handles quotes, commas, newlines
```

**Error Object Structure:**
```javascript
{
  severity: "Error" | "Warning",
  code: "VALIDATION_ERROR" | "CONSTRAINT_VIOLATION" | ...,
  message: "Human-readable error message",
  line: 234,           // Line in GEDCOM file
  gedcomId: "@I045@",  // GEDCOM identifier
  individualName: "John Smith",
  field: "birthDate",
  suggestedFix: "Use format YYYY-MM-DD",
  timestamp: Date
}
```

**Error Codes:**
- `UNSUPPORTED_VERSION` - GEDCOM version not supported
- `PARSE_ERROR` - Syntax error in GEDCOM file
- `VALIDATION_ERROR` - Data validation failed
- `CONSTRAINT_VIOLATION` - Database constraint violated
- `TIMEOUT_ERROR` - Import timed out
- `NETWORK_ERROR` - Network request failed
- `UNKNOWN_ERROR` - Unexpected error occurred

---

## Frontend UI Components

### GedcomUpload.svelte

**Purpose:** Main upload page component for GEDCOM file selection and upload

**Location:** `src/lib/GedcomUpload.svelte`

**Features:**
- Drag-and-drop and click-to-browse file selection
- Client-side validation (file type, size)
- Real-time upload progress tracking
- Authentication guard (requires sign-in)
- "What is GEDCOM?" help modal
- Error handling with retry capability
- Auto-redirect to parsing results after successful upload

**Props:** None (uses route parameters from App.svelte)

**Key Functions:**
```javascript
// Validate file before upload
validateFile(file)
  → Checks file extension (.ged, .gedcom)
  → Checks file size (max 10MB)
  → Returns: { valid: boolean, error?: string }

// Upload file with progress tracking
uploadFile(file)
  → Calls api.uploadGedcomFile() with progress callback
  → Updates progress bar in real-time
  → Redirects to #/gedcom/parsing/:uploadId on success
```

**Routes:** Accessible at `#/gedcom/import`

**Tests:** 45 comprehensive tests covering all scenarios

---

### FileDropZone.svelte

**Purpose:** Reusable drag-and-drop file upload zone

**Location:** `src/lib/components/FileDropZone.svelte`

**Features:**
- Drag-and-drop functionality with visual feedback
- Click-to-browse file selection
- Client-side validation (file type and size)
- Displays selected file name and size
- WCAG 2.1 AA accessibility compliant
- Responsive design (mobile and desktop)

**Props:**
```javascript
{
  acceptedExtensions: string[],  // e.g., ['.ged', '.gedcom']
  maxSize: number,               // Max file size in bytes
  onFileSelected: (file: File) => void,
  error: string | null           // Validation error to display
}
```

**Events:**
- `fileSelected` - Emitted when valid file is selected
- `validationError` - Emitted when validation fails

**Tests:** 38 comprehensive tests

---

### UploadProgress.svelte

**Purpose:** Upload progress bar with cancel functionality

**Location:** `src/lib/components/UploadProgress.svelte`

**Features:**
- Real-time progress bar (0-100%)
- File name and formatted size display
- Cancel upload button
- ARIA progressbar attributes for accessibility
- Smooth CSS transitions

**Props:**
```javascript
{
  fileName: string,
  fileSize: number,       // Size in bytes
  progress: number,       // 0-100
  onCancel: () => void
}
```

**Helper Functions:**
```javascript
// Format bytes to KB/MB
formatBytes(bytes)
  → Returns: "5.2 MB", "123 KB", etc.
```

**Tests:** 41 comprehensive tests

---

### GedcomParsingResults.svelte

**Purpose:** Display parsing results, statistics, errors, and duplicates

**Location:** `src/lib/GedcomParsingResults.svelte`

**Features:**
- Parsing statistics display (individuals, families, date range, version)
- Error list with expandable details
- Duplicate detection summary
- CSV error log download link
- Navigation buttons (Continue to Preview / Start Over)
- Polling support for async parsing (future-ready)
- Responsive grid layout

**Props:**
```javascript
{
  uploadId: string  // From route parameter
}
```

**State Management:**
```javascript
let parseResults = null;
let loading = true;
let error = null;

onMount(async () => {
  // Trigger parse and get results
  const results = await api.parseGedcom(uploadId);
  parseResults = results;
  loading = false;
});
```

**Routes:** Accessible at `#/gedcom/parsing/:uploadId`

**Tests:** Full integration testing with subcomponents

---

### ParseStatisticsCard.svelte

**Purpose:** Display individual statistic with icon and label

**Location:** `src/lib/components/ParseStatisticsCard.svelte`

**Features:**
- Icon-based visual representation
- Formatted number display (with commas)
- Hover effects
- Responsive sizing

**Props:**
```javascript
{
  icon: string,      // e.g., '👤', '👨‍👩‍👧‍👦', '📅', 'ℹ️'
  label: string,     // e.g., 'Individuals', 'Families'
  value: string      // e.g., '1,234', '5.5.1', '1850-2020'
}
```

**Usage Example:**
```svelte
<ParseStatisticsCard
  icon="👤"
  label="Individuals"
  value={formatNumber(parseResults.individualCount)}
/>
```

**Tests:** 11 comprehensive tests

---

### ParseErrorList.svelte

**Purpose:** Expandable list of parsing errors and warnings

**Location:** `src/lib/components/ParseErrorList.svelte`

**Features:**
- Groups errors by severity (errors vs warnings)
- Expandable/collapsible accordion
- Shows line number, error type, and message
- Error count badges
- Keyboard navigation support

**Props:**
```javascript
{
  errors: Array<{
    severity: 'Error' | 'Warning',
    line: number,
    gedcomId: string,
    message: string,
    field: string
  }>
}
```

**Behavior:**
- Errors section expanded by default
- Warnings section collapsed by default
- Click to toggle expand/collapse
- Shows count badges (e.g., "3 Errors", "5 Warnings")

**Tests:** 14 comprehensive tests

---

### DuplicateSummary.svelte

**Purpose:** Preview of potential duplicate individuals

**Location:** `src/lib/components/DuplicateSummary.svelte`

**Features:**
- Displays top 3 potential duplicates
- Confidence percentage with color coding
  - High (≥90%): Green
  - Medium (70-89%): Orange
  - Low (<70%): Red
- Shows GEDCOM individual and matching existing person
- "View All Duplicates" link for full list

**Props:**
```javascript
{
  duplicates: Array<{
    gedcomPerson: {
      gedcomId: string,
      firstName: string,
      lastName: string,
      birthDate: string
    },
    existingPerson: {
      id: number,
      firstName: string,
      lastName: string,
      birthDate: string
    },
    confidence: number  // 0-100
  }>,
  uploadId: string
}
```

**Tests:** 17 comprehensive tests

---

## Data Mapping

### Individual Fields

| GEDCOM Tag | Database Field | Notes |
|------------|---------------|-------|
| `NAME` | `firstName`, `lastName` | Split on `/` delimiter |
| `SEX` | `gender` | M→male, F→female, U→unspecified |
| `BIRT.DATE` | `birthDate` | Normalized to YYYY-MM-DD |
| `BIRT.PLAC` | `birthPlace` | Text as-is |
| `DEAT.DATE` | `deathDate` | Normalized to YYYY-MM-DD |
| `DEAT.PLAC` | `deathPlace` | Text as-is |
| `OBJE.FILE` | `photoUrl` | First photo URL found |
| `NOTE` | `notes` | Text as-is, modifiers appended |

### Relationship Mapping

| GEDCOM Family | Database Relationships | Notes |
|--------------|----------------------|-------|
| `HUSB` ↔ `WIFE` | `type: "spouse"` | Bidirectional |
| `HUSB` → `CHIL` | `type: "parentOf"`, `parent_role: "father"` | Based on SEX |
| `WIFE` → `CHIL` | `type: "parentOf"`, `parent_role: "mother"` | Based on SEX |

**Relationship Normalization:**
- API accepts `type: "mother"` or `type: "father"`
- Backend normalizes to `type: "parentOf"` with `parent_role`
- Validation ensures one mother and one father per person

---

## Error Handling

### Error Categories

**1. Validation Errors** (prevent import from starting)
- Unsupported GEDCOM version
- File corruption
- Invalid file structure
- Missing required fields

**2. Data Errors** (logged but don't stop import)
- Malformed dates (set to null with warning)
- Missing optional fields
- Orphaned relationships (removed from import)
- Invalid photo URLs

**3. Fatal Errors** (stop import and rollback)
- Database constraint violations
- Network timeouts
- Transaction failures
- Disk space issues

### Error Recovery Workflow

```
Upload GEDCOM
     ↓
Parse & Validate
     ↓
Error Detected → Show Error Message
     ↓              ↓
Preview Data    Download Error Log (CSV)
     ↓              ↓
Import Data     Fix GEDCOM File
     ↓              ↓
Success!        Retry Upload
```

### Error Message Best Practices

Every error message includes:
1. **WHAT** went wrong
2. **WHERE** it went wrong (line, individual)
3. **WHY** it's a problem
4. **HOW** to fix it
5. **Option** to download full details

**Example Error:**
```
Import failed at individual #45

Error: Invalid birth date format
Individual: John Smith (@I045@)
Line: 234 in GEDCOM file
Expected format: YYYY-MM-DD or GEDCOM date format (DD MMM YYYY)

[Download Error Log]  [Retry Import]  [Go Back to Preview]
```

---

## Testing

### Test Coverage

**Total Tests:** 156 tests across all GEDCOM modules

| Module | Unit Tests | Integration Tests | Coverage |
|--------|-----------|------------------|----------|
| gedcomStorage | 15 | 3 | 100% |
| gedcomValidation | 12 | 2 | 100% |
| gedcomParser | 26 | 4 | 100% |
| gedcomPreview | 18 | 5 | 100% |
| gedcomImporter | 22 | 8 | 100% |
| gedcomErrorHandler | 24 | 6 | 100% |
| API Routes | - | 56 | 95% |

### Running Tests

```bash
# Run all GEDCOM tests
npm test -- gedcom

# Run specific module tests
npm test -- gedcomParser.test.js

# Run with coverage
npm test -- --coverage gedcom

# Run in watch mode
npm run test:watch -- gedcom
```

### Test Data

Sample GEDCOM files for testing:

```
tests/fixtures/gedcom/
├── valid_551.ged          # Valid GEDCOM 5.5.1 (100 individuals)
├── valid_70.ged           # Valid GEDCOM 7.0 (50 individuals)
├── unsupported_40.ged     # GEDCOM 4.0 (should reject)
├── malformed_dates.ged    # Various invalid date formats
├── orphaned_refs.ged      # Missing individual references
├── large_file.ged         # 5000+ individuals (performance test)
└── constraint_violation.ged # Duplicate mother/father
```

---

## Security Considerations

### Multi-User Isolation

**File Storage:**
- Files stored in user-specific directories: `/tmp/gedcom-uploads/:userId/`
- All API endpoints validate `userId` from session
- Cross-user access attempts return 404 (not 403 to prevent enumeration)

**Database Import:**
- All imported records automatically tagged with `user_id`
- Relationships only created between user's own people
- Import process cannot access other users' data

**Preview Data:**
- In-memory storage keyed by `(uploadId, userId)` tuple
- Preview retrieval requires matching userId
- Automatic cleanup after import or timeout

### File Upload Security

**Validation:**
- Maximum file size: 10MB
- Allowed extensions: `.ged`, `.gedcom`
- Content-type validation
- GEDCOM structure validation

**Storage:**
- Temporary storage only (24-hour TTL)
- Automatic cleanup on success
- Manual cleanup API for failures
- No permanent storage of uploaded files

**Sanitization:**
- All GEDCOM data sanitized before database insert
- SQL injection prevented via Drizzle ORM parameterization
- XSS prevention via input escaping
- Path traversal prevention in file operations

### Error Information Disclosure

**Principle:** Provide helpful errors without exposing system internals

**Safe Error Messages:**
- ✅ "Invalid birth date format (expected YYYY-MM-DD)"
- ✅ "Individual @I045@ not found in GEDCOM file"
- ✅ "Database constraint: Person cannot have multiple mothers"

**Avoid:**
- ❌ Full file system paths
- ❌ Database table/column names
- ❌ Stack traces to end users
- ❌ Internal error codes

---

## Performance Optimization

### Large File Handling

**Streaming Parser:**
- GEDCOM files parsed in chunks to reduce memory usage
- Preview pagination (100 individuals per page by default)
- Database inserts batched in transactions

**Import Performance:**
- 100 individuals: ~500ms
- 500 individuals: ~2 seconds
- 1000 individuals: ~4 seconds
- 5000 individuals: ~20 seconds

**Timeout Handling:**
- Import timeout: 5 minutes (300 seconds)
- Parse timeout: 2 minutes (120 seconds)
- File upload timeout: 30 seconds

### Memory Management

**Preview Data:**
- In-memory storage cleared after import
- Maximum preview storage: 1000 individuals per upload
- Automatic garbage collection after 24 hours

**File Cleanup:**
- Success: Immediate deletion after import
- Failure: Preserved for 24 hours (allow retry)
- Orphaned files: Daily cleanup cron job

---

## Usage Examples

### Complete Import Workflow (JavaScript)

```javascript
import { api } from './lib/api.js'

async function importGedcomFile(file) {
  try {
    // Step 1: Upload file
    console.log('Uploading GEDCOM file...')
    const uploadResponse = await api.uploadGedcom(file)
    const { uploadId } = uploadResponse

    // Step 2: Parse and validate
    console.log('Parsing GEDCOM file...')
    const parseResponse = await api.parseGedcom(uploadId)

    if (!parseResponse.success) {
      console.error('Parse failed:', parseResponse.error)
      return
    }

    console.log(`Found ${parseResponse.individualCount} individuals`)
    console.log(`Found ${parseResponse.familyCount} families`)
    console.log(`Version: ${parseResponse.version}`)

    // Step 3: Preview individuals
    console.log('Loading preview data...')
    const previewResponse = await api.getGedcomPreviewIndividuals(uploadId)

    console.log(`Preview loaded: ${previewResponse.total} individuals`)

    // Display first 10 individuals
    previewResponse.individuals.slice(0, 10).forEach(person => {
      console.log(`- ${person.firstName} ${person.lastName} (${person.birthDate})`)
    })

    // Step 4: Import to tree
    const confirmImport = confirm(
      `Import ${parseResponse.individualCount} individuals to your tree?`
    )

    if (!confirmImport) {
      console.log('Import cancelled')
      return
    }

    console.log('Importing data...')
    const importResponse = await api.importGedcom(uploadId)

    if (importResponse.success) {
      console.log('✅ Import successful!')
      console.log(`Imported ${importResponse.importedPeople} people`)
      console.log(`Created ${importResponse.importedRelationships} relationships`)
    } else {
      console.error('❌ Import failed:', importResponse.error.message)

      if (importResponse.error.errorLogUrl) {
        console.log('Download error log:', importResponse.error.errorLogUrl)
      }
    }

  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

// Usage
const fileInput = document.getElementById('gedcom-file')
fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0]
  if (file) {
    importGedcomFile(file)
  }
})
```

### Error Handling Example

```javascript
async function importWithErrorHandling(uploadId) {
  try {
    const response = await api.importGedcom(uploadId)

    if (response.success) {
      showSuccess('Import completed successfully!')
      return
    }

    // Handle different error types
    const { error } = response

    switch (error.code) {
      case 'UNSUPPORTED_VERSION':
        showError(
          'GEDCOM version not supported',
          'Please export your file in GEDCOM 5.5.1 or 7.0 format'
        )
        break

      case 'CONSTRAINT_VIOLATION':
        showError(
          'Data constraint violation',
          error.details,
          { downloadLog: error.errorLogUrl }
        )
        break

      case 'TIMEOUT_ERROR':
        showError(
          'Import timed out',
          'This is a large file. Please try again.',
          { canRetry: true }
        )
        break

      case 'VALIDATION_ERROR':
        showError(
          'Validation failed',
          error.message
        )
        break

      default:
        showError(
          'Import failed',
          error.message,
          { downloadLog: error.errorLogUrl }
        )
    }

  } catch (error) {
    showError('Unexpected error', error.message)
  }
}

function showError(title, message, options = {}) {
  const errorDiv = document.createElement('div')
  errorDiv.innerHTML = `
    <h3>${title}</h3>
    <p>${message}</p>
    ${options.downloadLog ?
      `<a href="${options.downloadLog}">Download Error Log</a>` : ''}
    ${options.canRetry ?
      `<button onclick="retryImport()">Retry Import</button>` : ''}
  `
  document.body.appendChild(errorDiv)
}
```

### Preview with Pagination

```javascript
async function loadPreviewPage(uploadId, page = 0, pageSize = 100) {
  const offset = page * pageSize

  const response = await api.getGedcomPreviewIndividuals(
    uploadId,
    offset,
    pageSize
  )

  const totalPages = Math.ceil(response.total / pageSize)

  console.log(`Page ${page + 1} of ${totalPages}`)
  console.log(`Showing ${response.individuals.length} of ${response.total}`)

  return {
    individuals: response.individuals,
    currentPage: page,
    totalPages,
    total: response.total
  }
}

// Load first page
const preview = await loadPreviewPage(uploadId, 0)

// Load next page
const nextPage = await loadPreviewPage(uploadId, preview.currentPage + 1)
```

---

## Configuration

### Environment Variables

No environment variables required - GEDCOM integration works out of the box.

### Constants (Configurable)

**File Upload Limits:**
```javascript
// src/lib/server/gedcomValidation.js
const MAX_FILE_SIZE = 10 * 1024 * 1024  // 10MB
const ALLOWED_EXTENSIONS = ['.ged', '.gedcom']
```

**Import Timeouts:**
```javascript
// src/routes/api/gedcom/import/[uploadId]/+server.js
const IMPORT_TIMEOUT = 5 * 60 * 1000  // 5 minutes
const PARSE_TIMEOUT = 2 * 60 * 1000   // 2 minutes
```

**Preview Pagination:**
```javascript
// src/routes/api/gedcom/preview/[uploadId]/individuals/+server.js
const DEFAULT_LIMIT = 100
const MAX_LIMIT = 1000
```

**File Cleanup:**
```javascript
// src/lib/server/gedcomStorage.js
const TEMP_FILE_TTL = 24 * 60 * 60 * 1000  // 24 hours
```

---

## Future Enhancements

### Planned Features

1. **GEDCOM Export** (Story #96)
   - Export user's tree as GEDCOM 5.5.1 or 7.0
   - Include photos as OBJE references
   - Preserve date modifiers in export

2. **Duplicate Resolution UI** (Story #106)
   - Visual interface for resolving duplicate individuals
   - Smart matching algorithm (name, dates, places)
   - Merge duplicates workflow

3. **Tree Visualization Preview** (Story #105)
   - Interactive tree preview before import
   - Highlight potential duplicates
   - Show relationship structure

4. **Progress Indicator** (Story #107)
   - Real-time import progress (10%, 25%, 50%...)
   - Estimated time remaining
   - Cancel import mid-process

5. **Advanced Parsing**
   - Support GEDCOM 7.0.1+ extensions
   - Handle multimedia objects (photos, documents)
   - Parse source citations (SOUR tags)
   - Import notes and events

### Known Limitations

1. **Photo Handling**
   - Only first photo URL extracted (OBJE.FILE)
   - Local file paths not supported (must be URLs)
   - No photo upload/storage (reference only)

2. **Relationship Complexity**
   - Adoption relationships not distinguished from biological
   - Step-relationships not currently modeled
   - Foster relationships not supported

3. **Date Precision**
   - Date ranges (BET...AND) reduced to start date only
   - Approximate dates lose modifier in database (stored in notes)
   - Future dates not validated

4. **Name Handling**
   - Multiple names (NAME tags) only first is imported
   - Name suffixes (Jr., Sr., III) stored in lastName
   - Nicknames not extracted from quotes

---

## Troubleshooting

### Common Issues

**Issue:** "GEDCOM version not supported"
- **Cause:** File is GEDCOM 4.0 or older
- **Solution:** Re-export from source application in GEDCOM 5.5.1 or 7.0 format

**Issue:** "File size exceeds 10MB limit"
- **Cause:** GEDCOM file too large
- **Solution:** Split into smaller files or contact support for limit increase

**Issue:** "Invalid date format" warnings
- **Cause:** Non-standard date formats in GEDCOM
- **Solution:** Dates set to null automatically; edit in app after import

**Issue:** "Orphaned reference detected"
- **Cause:** GEDCOM references individual that doesn't exist
- **Solution:** Orphaned relationships automatically removed; verify in preview

**Issue:** "Database constraint violation"
- **Cause:** Data violates database rules (e.g., duplicate mother)
- **Solution:** Download error log, fix GEDCOM file, retry import

**Issue:** Import times out
- **Cause:** Very large file (5000+ individuals)
- **Solution:** Split file into smaller batches or contact support

### Debug Mode

Enable detailed logging for troubleshooting:

```javascript
// src/lib/server/gedcomParser.js
const DEBUG = true

if (DEBUG) {
  console.log('Parsing individual:', gedcomId)
  console.log('Date before normalization:', rawDate)
  console.log('Date after normalization:', normalizedDate)
}
```

### Error Log Analysis

Error logs contain valuable debugging information:

```csv
Severity,Line,GEDCOM ID,Name,Field,Error,Suggested Fix
Error,234,@I045@,John Smith,birthDate,Invalid date format,Use YYYY-MM-DD
```

**Common patterns:**
- Multiple date errors → Check source application export settings
- Orphaned references → Check for missing individuals in source
- Constraint violations → Review family relationships for conflicts

---

## Related Documentation

- **CLAUDE.md** - Development commands and architecture overview
- **FACEBOOK_OAUTH_SETUP.md** - Facebook integration setup
- **Issue #98** - GEDCOM Import/Export Epic (umbrella issue)
- **Story #92** - Basic GEDCOM File Upload
- **Story #93** - GEDCOM File Parsing and Validation
- **Story #94** - Preview GEDCOM Data Before Import
- **Story #95** - Import GEDCOM Data to User's Tree
- **Story #97** - GEDCOM Import Error Handling and Recovery

---

## Support

For issues, feature requests, or questions:

- **GitHub Issues:** https://github.com/anthropics/familytree/issues
- **Label:** `gedcom` for GEDCOM-specific issues
- **Format:** Use BDD user story format for feature requests

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.3.1 | 2026-01-03 | Frontend UI implementation (Stories #102, #103) |
|  |  | - GedcomUpload component (Story #102) |
|  |  | - FileDropZone with drag-and-drop |
|  |  | - UploadProgress bar component |
|  |  | - GedcomParsingResults display (Story #103) |
|  |  | - ParseStatisticsCard component |
|  |  | - ParseErrorList with accordion |
|  |  | - DuplicateSummary preview |
|  |  | - Client-side validation (file type, size) |
|  |  | - Real-time upload progress tracking |
|  |  | - Parsing status polling infrastructure |
|  |  | - 171 new UI tests (total: 327 tests) |
| 2.3.0 | 2026-01-03 | Initial GEDCOM backend implementation |
|  |  | - File upload and validation (Story #92) |
|  |  | - Parser for GEDCOM 5.5.1 and 7.0 (Story #93) |
|  |  | - Preview data API endpoints (Story #94) |
|  |  | - Transaction-safe import (Story #95) |
|  |  | - Comprehensive error handling (Story #97) |
|  |  | - CSV error log download |
|  |  | - Multi-user isolation |
|  |  | - 156 backend tests |

---

**Last Updated:** 2026-01-03
**Document Version:** 1.1.0
