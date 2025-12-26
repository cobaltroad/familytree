# Backend Comparison Test Report

**Date:** December 26, 2025
**Issue:** #65 - Backend Comparison Tests
**Test File:** `/Users/cobaltroad/Source/familytree/frontend/src/routes/api/backend-comparison.test.js`

## Executive Summary

Comprehensive side-by-side testing of the Go backend and SvelteKit API routes revealed **21 failures out of 26 tests**, indicating significant behavioral differences between the two implementations. The discrepancies fall into several categories:

1. **Missing validation** in SvelteKit implementation
2. **Different response structures** (extra fields in SvelteKit responses)
3. **Relationship type normalization** not implemented in SvelteKit
4. **Missing HTTP methods** (PUT/DELETE) for relationships/:id endpoint
5. **Different null handling** (null vs undefined)

## Test Results Summary

- **Total Tests:** 26
- **Passed:** 5 (19%)
- **Failed:** 21 (81%)
- **Duration:** 518ms

### Passing Tests (5)

1. Backend Availability > Go backend should be available
2. Backend Availability > SvelteKit backend should be available
3. GET /api/people/:id > should return 404 for non-existent person
4. DELETE /api/people/:id > should delete person with identical behavior
5. POST /api/relationships > should handle validation errors identically - duplicate mother

### Failing Tests (21)

The failures are categorized below by severity and type.

## Critical Discrepancies

### 1. Missing Input Validation (CRITICAL)

The SvelteKit implementation lacks input validation that the Go backend enforces:

#### A. Person Creation - Empty firstName
- **Go Backend:** Returns 400 Bad Request
- **SvelteKit:** Returns 201 Created (ACCEPTS INVALID DATA)
- **Test:** POST /api/people - should handle validation errors identically
- **Impact:** CRITICAL - allows invalid data into database

#### B. Person Creation - Missing Required Fields
- **Go Backend:** Returns 400 Bad Request
- **SvelteKit:** Returns 201 Created (ACCEPTS INCOMPLETE DATA)
- **Test:** POST /api/people - should handle missing required fields identically
- **Impact:** CRITICAL - allows incomplete records

#### C. Relationship Creation - Non-Existent Persons
- **Go Backend:** Returns 400 Bad Request
- **SvelteKit:** Returns 201 Created (ACCEPTS INVALID FOREIGN KEYS)
- **Test:** POST /api/relationships - should handle validation errors identically - non-existent person
- **Impact:** CRITICAL - allows orphaned relationships

### 2. Missing HTTP Methods (CRITICAL)

The SvelteKit relationships/:id endpoint does not implement PUT and DELETE methods:

#### A. GET /api/relationships/:id
- **Go Backend:** Returns 200 OK with relationship data
- **SvelteKit:** Returns 405 Method Not Allowed
- **Impact:** CRITICAL - cannot retrieve individual relationships

#### B. PUT /api/relationships/:id
- **Go Backend:** Returns 200 OK and updates relationship
- **SvelteKit:** Returns 405 Method Not Allowed
- **Tests:** All PUT relationship tests fail
- **Impact:** CRITICAL - cannot update relationships

#### C. DELETE /api/relationships/:id
- **Go Backend:** Returns 204 No Content (or 404 for non-existent)
- **SvelteKit:** Returns 405 Method Not Allowed (or 204 if already deleted)
- **Tests:** All DELETE relationship tests fail
- **Impact:** CRITICAL - cannot delete relationships reliably

### 3. Missing Error Handling

#### A. PUT /api/people/:id - Non-Existent Person
- **Go Backend:** Returns 404 Not Found
- **SvelteKit:** Returns 200 OK (appears to succeed)
- **Test:** PUT /api/people/:id - should return 404 for non-existent person
- **Impact:** HIGH - misleading responses

#### B. DELETE /api/people/:id - Non-Existent Person
- **Go Backend:** Returns 404 Not Found
- **SvelteKit:** Returns 204 No Content (appears to succeed)
- **Test:** DELETE /api/people/:id - should return 404 for non-existent person
- **Impact:** MEDIUM - idempotent but misleading

## Moderate Discrepancies

### 4. Relationship Type Normalization Not Implemented

The SvelteKit implementation does not normalize relationship types as the Go backend does:

#### A. Mother Relationships
- **Go Backend:** Converts type 'mother' to 'parentOf' with parentRole 'mother'
- **SvelteKit:** Keeps type as 'mother', does not set parentRole
- **Test:** POST /api/relationships - should create mother relationship with identical structure
- **Impact:** HIGH - inconsistent data model

#### B. Father Relationships
- **Go Backend:** Converts type 'father' to 'parentOf' with parentRole 'father'
- **SvelteKit:** Keeps type as 'father', does not set parentRole
- **Test:** POST /api/relationships - should create father relationship with identical structure
- **Impact:** HIGH - inconsistent data model

### 5. Response Structure Differences

The SvelteKit implementation returns extra fields in responses:

#### A. Person Responses
- **Go Backend:** Returns 5 fields (id, firstName, lastName, birthDate, deathDate, gender, notes)
- **SvelteKit:** Returns 6 fields (includes an extra field)
- **Tests:**
  - GET /api/people/:id - should return identical person data
  - POST /api/people - should create person with identical structure
  - PUT /api/people/:id - should update person with identical behavior
- **Impact:** LOW - likely just formatting, but needs investigation

### 6. Null vs Undefined Handling

Different handling of null values:

#### A. Spouse Relationship parentRole
- **Go Backend:** Returns parentRole: null
- **SvelteKit:** Returns parentRole: undefined (or omits field)
- **Test:** POST /api/relationships - should create spouse relationship with identical structure
- **Impact:** LOW - JSON serialization difference

### 7. Array Response Comparison Issues

#### A. GET /api/people - List All People
- **Error:** "expected false to be true" in array comparison
- **Likely Cause:** Response structure or ordering differences
- **Impact:** MEDIUM - needs investigation

#### B. GET /api/relationships - List All Relationships
- **Error:** "expected false to be true" in array comparison
- **Likely Cause:** Response structure or ordering differences
- **Impact:** MEDIUM - needs investigation

## Detailed Findings by Endpoint

### People Endpoints

| Endpoint | Method | Go Status | SK Status | Issue |
|----------|--------|-----------|-----------|-------|
| /api/people | GET | 200 | 200 | Array comparison fails |
| /api/people/:id | GET | 200/404 | 200/404 | Extra field in SK response |
| /api/people | POST | 201/400 | 201 | SK missing validation |
| /api/people/:id | PUT | 200/404 | 200 | SK returns 200 for non-existent |
| /api/people/:id | DELETE | 204/404 | 204 | SK returns 204 for non-existent |

### Relationships Endpoints

| Endpoint | Method | Go Status | SK Status | Issue |
|----------|--------|-----------|-----------|-------|
| /api/relationships | GET | 200 | 200 | Array comparison fails |
| /api/relationships/:id | GET | 200/404 | 405 | Method not implemented in SK |
| /api/relationships | POST | 201/400 | 201 | SK missing validation, no normalization |
| /api/relationships/:id | PUT | 200/404 | 405 | Method not implemented in SK |
| /api/relationships/:id | DELETE | 204/404 | 405 | Method not implemented in SK |

## Recommendations

### Priority 1: Critical Fixes (Required for Production)

1. **Implement Input Validation in SvelteKit**
   - Add validation for required fields (firstName, lastName)
   - Add validation for empty strings
   - Add foreign key validation for relationships
   - Match Go backend's validation rules exactly

2. **Implement Missing HTTP Methods for /api/relationships/:id**
   - Implement GET handler
   - Implement PUT handler
   - Implement DELETE handler
   - Add proper 404 error handling

3. **Implement Relationship Type Normalization**
   - Convert 'mother' → 'parentOf' + parentRole: 'mother'
   - Convert 'father' → 'parentOf' + parentRole: 'father'
   - Match Go backend's normalization logic

### Priority 2: High Priority Fixes

4. **Fix Error Response Codes**
   - Return 404 for non-existent resources in PUT operations
   - Return 404 for non-existent resources in DELETE operations (instead of 204)

5. **Standardize Response Structure**
   - Investigate extra field in person responses
   - Ensure identical JSON structure between backends

### Priority 3: Medium Priority Improvements

6. **Fix Array Response Comparisons**
   - Investigate GET /api/people comparison failure
   - Investigate GET /api/relationships comparison failure
   - Ensure consistent ordering and structure

7. **Standardize Null Handling**
   - Consistently use null (not undefined) for nullable fields
   - Match Go backend's JSON serialization

## Testing Recommendations

### Before Production Deployment

1. All comparison tests must pass (26/26 passing)
2. Add integration tests for:
   - End-to-end user workflows
   - Error handling scenarios
   - Edge cases and boundary conditions
3. Perform load testing to compare performance
4. Test database integrity after operations

### Continuous Integration

1. Run comparison tests automatically on every PR
2. Block merges if comparison tests fail
3. Maintain parity between backends until Go backend is deprecated

## Migration Path

### Phase 1: Fix Critical Issues (This Sprint)
- Implement validation
- Implement missing HTTP methods
- Implement relationship normalization

### Phase 2: Achieve Parity (Next Sprint)
- Fix error codes
- Standardize response structures
- Fix null handling

### Phase 3: Verify and Deploy (Following Sprint)
- All tests passing
- Integration testing
- Gradual rollout with monitoring

## Test Coverage

The comparison test suite covers:

- **People CRUD:** 13 tests
  - List all people (2 tests)
  - Get single person (2 tests)
  - Create person (3 tests)
  - Update person (2 tests)
  - Delete person (2 tests)
  - Backend availability (2 tests)

- **Relationships CRUD:** 13 tests
  - List all relationships (2 tests)
  - Get single relationship (2 tests)
  - Create relationship (5 tests: mother, father, spouse, duplicate validation, invalid person)
  - Update relationship (2 tests)
  - Delete relationship (2 tests)

## Running the Tests

### Prerequisites
```bash
# Terminal 1: Start Go backend
cd backend
go run main.go

# Terminal 2: Start SvelteKit backend
cd frontend
npm run dev
```

### Execute Tests
```bash
cd frontend
npm test backend-comparison.test.js
```

## Conclusion

The backend comparison tests have successfully identified significant discrepancies between the Go backend and SvelteKit implementation. **The SvelteKit implementation is NOT production-ready** and requires critical fixes before it can replace the Go backend.

The most serious issues are:
1. **Missing input validation** (allows invalid data)
2. **Missing HTTP methods** for relationships/:id
3. **Missing relationship type normalization** (breaks data model)

These issues must be resolved before considering the SvelteKit backend as a viable replacement for the Go backend.

## Files Created

- `/Users/cobaltroad/Source/familytree/frontend/src/routes/api/backend-comparison.test.js` - Comprehensive comparison test suite
- `/Users/cobaltroad/Source/familytree/BACKEND_COMPARISON_REPORT.md` - This report

## Test File Renames (Side Effect)

During testing, we discovered that SvelteKit reserves the `+server.` prefix for server routes. Test files with this naming pattern caused the dev server to crash. The following files were renamed:

- `people/+server.test.js` → `people/server.test.js`
- `people/+server.edgecase.test.js` → `people/server.edgecase.test.js`
- `people/[id]/+server.test.js` → `people/[id]/server.test.js`
- `relationships/+server.test.js` → `relationships/server.test.js`
- `relationships/+server.edgecase.test.js` → `relationships/server.edgecase.test.js`
- `relationships/[id]/+server.test.js` → `relationships/[id]/server.test.js`

This is a **beneficial side effect** as it prevents the SvelteKit dev server from crashing on startup.
