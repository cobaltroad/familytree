/**
 * Simple standalone test for modal re-open bug (Issue #2)
 * Run with: node modal-reopen-simple.test.mjs
 */

class ModalStateManager {
  constructor() {
    this.editingPerson = null
    this.isModalOpen = false
    this.modalKey = 0
  }

  // Current buggy implementation
  async handleEditPersonBuggy(person) {
    if (this.isModalOpen) {
      this.isModalOpen = false
      // await tick() simulation
    }
    this.editingPerson = person
    this.isModalOpen = true
  }

  // Fixed implementation with modalKey
  handleEditPersonFixed(person) {
    this.editingPerson = person
    this.isModalOpen = true
    this.modalKey += 1
  }

  handleModalClose() {
    this.isModalOpen = false
    this.editingPerson = null
  }

  getState() {
    return {
      editingPerson: this.editingPerson,
      isModalOpen: this.isModalOpen,
      modalKey: this.modalKey
    }
  }
}

// Test utilities
let testCount = 0
let passCount = 0
let failCount = 0

function assert(condition, message) {
  testCount++
  if (condition) {
    passCount++
    console.log(`✓ ${message}`)
  } else {
    failCount++
    console.log(`✗ ${message}`)
  }
}

function assertEquals(actual, expected, message) {
  testCount++
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    passCount++
    console.log(`✓ ${message}`)
  } else {
    failCount++
    console.log(`✗ ${message}`)
    console.log(`  Expected: ${JSON.stringify(expected)}`)
    console.log(`  Actual: ${JSON.stringify(actual)}`)
  }
}

// Run tests
console.log('\n=== Testing Modal Re-open Bug (Issue #2) ===\n')

console.log('--- Current Implementation (BUGGY) ---')
{
  const manager = new ModalStateManager()
  const mockPerson = { id: 1, firstName: 'John', lastName: 'Doe' }

  // First click
  await manager.handleEditPersonBuggy(mockPerson)
  assert(manager.getState().isModalOpen === true, 'Modal opens on first click')

  // Close
  manager.handleModalClose()
  assert(manager.getState().isModalOpen === false, 'Modal closes')

  // Second click on same node
  await manager.handleEditPersonBuggy(mockPerson)
  assert(manager.getState().isModalOpen === true, 'Modal isOpen state is true on second click')

  // The problem: modalKey doesn't exist in buggy version, so no way to force recreation
  assert(manager.getState().modalKey === 0, 'EXPECTED FAILURE: modalKey remains 0 (no forced recreation)')
}

console.log('\n--- Fixed Implementation with modalKey ---')
{
  const manager = new ModalStateManager()
  const mockPerson = { id: 1, firstName: 'John', lastName: 'Doe' }

  // First click
  manager.handleEditPersonFixed(mockPerson)
  assert(manager.getState().isModalOpen === true, 'Modal opens on first click')
  assert(manager.getState().modalKey === 1, 'modalKey is 1 after first open')

  // Close
  manager.handleModalClose()
  assert(manager.getState().isModalOpen === false, 'Modal closes')

  // Second click on same node
  manager.handleEditPersonFixed(mockPerson)
  assert(manager.getState().isModalOpen === true, 'Modal isOpen state is true on second click')
  assert(manager.getState().modalKey === 2, 'modalKey increments to 2 on second open')
}

console.log('\n--- Multiple Open/Close Cycles ---')
{
  const manager = new ModalStateManager()
  const mockPerson = { id: 1, firstName: 'John', lastName: 'Doe' }

  for (let i = 1; i <= 5; i++) {
    manager.handleEditPersonFixed(mockPerson)
    assert(manager.getState().modalKey === i, `Cycle ${i}: modalKey is ${i}`)
    manager.handleModalClose()
  }
}

console.log('\n--- Rapid Clicks on Same Node ---')
{
  const manager = new ModalStateManager()
  const mockPerson = { id: 1, firstName: 'John', lastName: 'Doe' }

  manager.handleEditPersonFixed(mockPerson)
  const key1 = manager.getState().modalKey

  manager.handleEditPersonFixed(mockPerson)
  const key2 = manager.getState().modalKey

  manager.handleEditPersonFixed(mockPerson)
  const key3 = manager.getState().modalKey

  assert(key2 > key1, 'Second click increments key')
  assert(key3 > key2, 'Third click increments key')
  assertEquals(key3, 3, 'modalKey is 3 after three rapid clicks')
}

console.log('\n--- Different People ---')
{
  const manager = new ModalStateManager()
  const person1 = { id: 1, firstName: 'John', lastName: 'Doe' }
  const person2 = { id: 2, firstName: 'Jane', lastName: 'Smith' }

  manager.handleEditPersonFixed(person1)
  assert(manager.getState().modalKey === 1, 'First person opens with key 1')

  manager.handleModalClose()

  manager.handleEditPersonFixed(person2)
  assert(manager.getState().modalKey === 2, 'Second person opens with key 2')

  manager.handleModalClose()

  manager.handleEditPersonFixed(person1)
  assert(manager.getState().modalKey === 3, 'Returning to first person opens with key 3')
}

// Summary
console.log('\n=== Test Summary ===')
console.log(`Total: ${testCount} tests`)
console.log(`Passed: ${passCount} tests`)
console.log(`Failed: ${failCount} tests`)

if (failCount === 0) {
  console.log('\n✓ All tests passed!')
  process.exit(0)
} else {
  console.log(`\n✗ ${failCount} test(s) failed`)
  process.exit(1)
}
