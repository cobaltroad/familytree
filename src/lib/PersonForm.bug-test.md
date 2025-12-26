# Bug Test Documentation: Parent Names Not Displayed

## Bug Description
Mother and father names are not displayed in the Person modal's Relationships section when editing a person in Tree View.

## Root Cause
The code in `PersonForm.svelte` (lines 23 and 28) uses `rel.parentType` to filter parent relationships, but the API returns `rel.parentRole` instead.

## Test Scenarios

### Test Case 1: Display Mother's Name
**Given:**
- A person with ID 3 (Alice Doe)
- A relationship record: `{ type: 'parentOf', person1Id: 1, person2Id: 3, parentRole: 'mother' }`
- A person with ID 1 (Jane Doe) exists in the people array

**Expected:**
- The Relationships section should display: "Mother: Jane Doe"

**Actual (Before Fix):**
- The Relationships section displays: "Mother: <unknown>"
- The relationship is not found because the code checks `rel.parentType === 'mother'` but the field is actually `rel.parentRole`

**Why it fails:**
```javascript
// Current buggy code (line 20-24)
const motherRel = relationships.find(rel =>
  rel.type === 'parentOf' &&
  rel.person2Id === person.id &&
  rel.parentType === 'mother'  // BUG: field is 'parentRole', not 'parentType'
)
```

### Test Case 2: Display Father's Name
**Given:**
- A person with ID 3 (Alice Doe)
- A relationship record: `{ type: 'parentOf', person1Id: 2, person2Id: 3, parentRole: 'father' }`
- A person with ID 2 (John Doe) exists in the people array

**Expected:**
- The Relationships section should display: "Father: John Doe"

**Actual (Before Fix):**
- The Relationships section displays: "Father: <unknown>"
- The relationship is not found because the code checks `rel.parentType === 'father'` but the field is actually `rel.parentRole`

**Why it fails:**
```javascript
// Current buggy code (line 25-29)
const fatherRel = relationships.find(rel =>
  rel.type === 'parentOf' &&
  rel.person2Id === person.id &&
  rel.parentType === 'father'  // BUG: field is 'parentRole', not 'parentType'
)
```

### Test Case 3: Display Both Parents
**Given:**
- A person with ID 3 (Alice Doe)
- Two relationship records:
  - `{ type: 'parentOf', person1Id: 1, person2Id: 3, parentRole: 'mother' }`
  - `{ type: 'parentOf', person1Id: 2, person2Id: 3, parentRole: 'father' }`
- People array includes Jane Doe (ID 1) and John Doe (ID 2)

**Expected:**
- Mother: Jane Doe
- Father: John Doe

**Actual (Before Fix):**
- Mother: <unknown>
- Father: <unknown>

### Test Case 4: Person with No Parents
**Given:**
- A person with ID 1 (Jane Doe)
- No parent relationships exist for this person

**Expected:**
- Mother: <unknown>
- Father: <unknown>

**Actual:**
- Works correctly (displays <unknown> for both)
- This case works because both the buggy code and correct code would return null

### Test Case 5: Mixed Field Names (Edge Case)
**Given:**
- A relationship with BOTH fields: `{ type: 'parentOf', person1Id: 1, person2Id: 3, parentType: 'mother', parentRole: 'father' }`
- This tests that we're using the correct field

**Expected (After Fix):**
- Should use `parentRole` field, so father would be found

**Actual (Before Fix):**
- Uses `parentType` field, so mother would be found
- This demonstrates the bug

## API Response Format (From Backend)

According to the issue description and backend code, the API returns:

```javascript
{
  type: "parentOf",
  person1Id: 1,       // Parent's ID
  person2Id: 3,       // Child's ID
  parentRole: "mother" // or "father" - THIS is the correct field name
}
```

## The Fix

Change lines 23 and 28 in `PersonForm.svelte`:

**Before (Buggy):**
```javascript
rel.parentType === 'mother'  // Line 23
rel.parentType === 'father'  // Line 28
```

**After (Fixed):**
```javascript
rel.parentRole === 'mother'  // Line 23
rel.parentRole === 'father'  // Line 28
```

## Verification Steps After Fix

1. Open the application
2. Navigate to Tree View
3. Click on a person who has parent relationships in the database
4. Scroll to the Relationships section
5. Verify that mother and father names are displayed correctly
6. Test with:
   - Person with both parents
   - Person with only mother
   - Person with only father
   - Person with no parents

## Test Data for Manual Verification

Sample test data structure:
```javascript
const testPeople = [
  { id: 1, firstName: 'Jane', lastName: 'Doe' },
  { id: 2, firstName: 'John', lastName: 'Doe' },
  { id: 3, firstName: 'Alice', lastName: 'Doe' }
]

const testRelationships = [
  { type: 'parentOf', person1Id: 1, person2Id: 3, parentRole: 'mother' },
  { type: 'parentOf', person1Id: 2, person2Id: 3, parentRole: 'father' }
]

// When viewing Alice (ID 3), should display:
// Mother: Jane Doe
// Father: John Doe
```
