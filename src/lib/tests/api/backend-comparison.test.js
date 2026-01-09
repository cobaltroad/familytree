/**
 * Backend Comparison Tests
 *
 * This test suite compares the SvelteKit API implementation against the Go backend
 * to ensure identical behavior across all endpoints.
 *
 * Prerequisites:
 * - Go backend must be running on http://localhost:8080
 * - SvelteKit dev server must be running on http://localhost:5173
 *
 * Run with: npm test backend-comparison.test.js
 */

import { describe, it, expect, beforeAll, afterEach } from 'vitest';

// Backend URLs
const GO_BASE_URL = 'http://localhost:8080/api';
const SVELTEKIT_BASE_URL = 'http://localhost:5173/api';

// Track created resources for cleanup
const createdPeople = { go: [], sveltekit: [] };
const createdRelationships = { go: [], sveltekit: [] };

/**
 * Helper function to make HTTP requests
 */
async function makeRequest(url, options = {}) {
	try {
		const response = await fetch(url, {
			...options,
			headers: {
				'Content-Type': 'application/json',
				...options.headers,
			},
		});

		let data = null;
		const text = await response.text();
		if (text) {
			try {
				data = JSON.parse(text);
			} catch {
				data = text;
			}
		}

		return {
			status: response.status,
			statusText: response.statusText,
			headers: response.headers,
			data,
		};
	} catch (error) {
		throw new Error(`Request failed: ${error.message}`);
	}
}

/**
 * Check if a backend is available
 */
async function checkBackendAvailability(baseUrl, name) {
	try {
		const response = await fetch(`${baseUrl}/people`, { method: 'GET' });
		return response.ok || response.status === 404; // 404 is fine, means server is up
	} catch (error) {
		console.error(`${name} backend not available at ${baseUrl}: ${error.message}`);
		return false;
	}
}

/**
 * Compare two response objects
 */
function compareResponses(goResponse, sveltekitResponse, options = {}) {
	const {
		ignoreFields = [],
		allowedDifferences = {},
		description = 'responses',
	} = options;

	// Compare status codes
	expect(
		sveltekitResponse.status,
		`Status codes should match for ${description}`
	).toBe(goResponse.status);

	// If both have data, compare structure and content
	if (goResponse.data && sveltekitResponse.data) {
		const goData = goResponse.data;
		const skData = sveltekitResponse.data;

		// Helper to remove ignored fields
		const cleanData = (obj, ignoreFields) => {
			if (Array.isArray(obj)) {
				return obj.map(item => cleanData(item, ignoreFields));
			}
			if (obj && typeof obj === 'object') {
				const cleaned = { ...obj };
				ignoreFields.forEach(field => delete cleaned[field]);
				Object.keys(cleaned).forEach(key => {
					cleaned[key] = cleanData(cleaned[key], ignoreFields);
				});
				return cleaned;
			}
			return obj;
		};

		const cleanedGoData = cleanData(goData, ignoreFields);
		const cleanedSkData = cleanData(skData, ignoreFields);

		// Compare cleaned data
		if (Object.keys(allowedDifferences).length === 0) {
			expect(
				cleanedSkData,
				`Response data should match for ${description}`
			).toEqual(cleanedGoData);
		} else {
			// Custom comparison with allowed differences
			for (const [field, expectedDiff] of Object.entries(allowedDifferences)) {
				if (typeof expectedDiff === 'function') {
					expect(
						expectedDiff(cleanedGoData, cleanedSkData),
						`Allowed difference check failed for ${field}`
					).toBe(true);
				}
			}
		}
	}
}

/**
 * Cleanup function to delete created resources
 */
async function cleanupResources() {
	// Delete relationships first (foreign key constraints)
	for (const id of createdRelationships.go) {
		try {
			await makeRequest(`${GO_BASE_URL}/relationships/${id}`, { method: 'DELETE' });
		} catch (error) {
			console.warn(`Failed to cleanup Go relationship ${id}: ${error.message}`);
		}
	}
	for (const id of createdRelationships.sveltekit) {
		try {
			await makeRequest(`${SVELTEKIT_BASE_URL}/relationships/${id}`, { method: 'DELETE' });
		} catch (error) {
			console.warn(`Failed to cleanup SvelteKit relationship ${id}: ${error.message}`);
		}
	}

	// Then delete people
	for (const id of createdPeople.go) {
		try {
			await makeRequest(`${GO_BASE_URL}/people/${id}`, { method: 'DELETE' });
		} catch (error) {
			console.warn(`Failed to cleanup Go person ${id}: ${error.message}`);
		}
	}
	for (const id of createdPeople.sveltekit) {
		try {
			await makeRequest(`${SVELTEKIT_BASE_URL}/people/${id}`, { method: 'DELETE' });
		} catch (error) {
			console.warn(`Failed to cleanup SvelteKit person ${id}: ${error.message}`);
		}
	}

	// Clear tracking arrays
	createdPeople.go = [];
	createdPeople.sveltekit = [];
	createdRelationships.go = [];
	createdRelationships.sveltekit = [];
}

describe.skip('Backend Comparison Tests (OBSOLETE - Go backend removed)', () => {
	let goBackendAvailable = false;
	let sveltekitBackendAvailable = false;

	beforeAll(async () => {
		// Check backend availability
		goBackendAvailable = await checkBackendAvailability(GO_BASE_URL, 'Go');
		sveltekitBackendAvailable = await checkBackendAvailability(SVELTEKIT_BASE_URL, 'SvelteKit');

		if (!goBackendAvailable) {
			console.warn('⚠️  Go backend not available at http://localhost:8080');
			console.warn('   Start it with: cd backend && go run main.go');
		}

		if (!sveltekitBackendAvailable) {
			console.warn('⚠️  SvelteKit backend not available at http://localhost:5173');
			console.warn('   Start it with: cd frontend && npm run dev');
		}

		if (!goBackendAvailable || !sveltekitBackendAvailable) {
			console.warn('\n⚠️  Skipping comparison tests - both backends must be running\n');
		}
	});

	afterEach(async () => {
		// Cleanup after each test
		await cleanupResources();
	});

	describe('Backend Availability', () => {
		it('Go backend should be available', () => {
			expect(goBackendAvailable, 'Go backend should be running on http://localhost:8080').toBe(true);
		});

		it('SvelteKit backend should be available', () => {
			expect(sveltekitBackendAvailable, 'SvelteKit backend should be running on http://localhost:5173').toBe(true);
		});
	});

	describe('GET /api/people - List all people', () => {
		it('should return identical response structure and status', async () => {
			if (!goBackendAvailable || !sveltekitBackendAvailable) {
				return; // Skip if backends not available
			}

			const goResponse = await makeRequest(`${GO_BASE_URL}/people`);
			const skResponse = await makeRequest(`${SVELTEKIT_BASE_URL}/people`);

			compareResponses(goResponse, skResponse, {
				description: 'GET /api/people',
			});

			// Verify response is an array
			expect(Array.isArray(goResponse.data)).toBe(true);
			expect(Array.isArray(skResponse.data)).toBe(true);
		});

		it('should return same person structure for existing data', async () => {
			if (!goBackendAvailable || !sveltekitBackendAvailable) {
				return;
			}

			const goResponse = await makeRequest(`${GO_BASE_URL}/people`);
			const skResponse = await makeRequest(`${SVELTEKIT_BASE_URL}/people`);

			if (goResponse.data.length > 0 && skResponse.data.length > 0) {
				const goPerson = goResponse.data[0];
				const skPerson = skResponse.data[0];

				// Verify all expected fields exist
				const expectedFields = ['id', 'firstName', 'lastName', 'birthDate', 'deathDate', 'gender', 'notes'];
				for (const field of expectedFields) {
					expect(goPerson).toHaveProperty(field);
					expect(skPerson).toHaveProperty(field);
				}
			}
		});
	});

	describe('GET /api/people/:id - Get single person', () => {
		it('should return identical person data', async () => {
			if (!goBackendAvailable || !sveltekitBackendAvailable) {
				return;
			}

			// First, create a test person in both backends
			const testPerson = {
				firstName: 'ComparisonTest',
				lastName: 'Person',
				birthDate: '1990-01-01',
				deathDate: null,
				gender: 'male',
				notes: 'Test person for comparison',
			};

			const goCreateResponse = await makeRequest(`${GO_BASE_URL}/people`, {
				method: 'POST',
				body: JSON.stringify(testPerson),
			});
			createdPeople.go.push(goCreateResponse.data.id);

			const skCreateResponse = await makeRequest(`${SVELTEKIT_BASE_URL}/people`, {
				method: 'POST',
				body: JSON.stringify(testPerson),
			});
			createdPeople.sveltekit.push(skCreateResponse.data.id);

			// Now fetch the created persons
			const goResponse = await makeRequest(`${GO_BASE_URL}/people/${goCreateResponse.data.id}`);
			const skResponse = await makeRequest(`${SVELTEKIT_BASE_URL}/people/${skCreateResponse.data.id}`);

			// Compare responses (ignoring IDs since they'll differ)
			compareResponses(goResponse, skResponse, {
				ignoreFields: ['id'],
				description: 'GET /api/people/:id',
			});
		});

		it('should return 404 for non-existent person', async () => {
			if (!goBackendAvailable || !sveltekitBackendAvailable) {
				return;
			}

			const nonExistentId = 999999;
			const goResponse = await makeRequest(`${GO_BASE_URL}/people/${nonExistentId}`);
			const skResponse = await makeRequest(`${SVELTEKIT_BASE_URL}/people/${nonExistentId}`);

			expect(goResponse.status).toBe(404);
			expect(skResponse.status).toBe(404);
		});
	});

	describe('POST /api/people - Create person', () => {
		it('should create person with identical structure', async () => {
			if (!goBackendAvailable || !sveltekitBackendAvailable) {
				return;
			}

			const newPerson = {
				firstName: 'CreateTest',
				lastName: 'Person',
				birthDate: '1985-05-15',
				deathDate: null,
				gender: 'female',
				notes: 'Test person creation',
			};

			const goResponse = await makeRequest(`${GO_BASE_URL}/people`, {
				method: 'POST',
				body: JSON.stringify(newPerson),
			});
			createdPeople.go.push(goResponse.data.id);

			const skResponse = await makeRequest(`${SVELTEKIT_BASE_URL}/people`, {
				method: 'POST',
				body: JSON.stringify(newPerson),
			});
			createdPeople.sveltekit.push(skResponse.data.id);

			// Both should return 201 Created
			expect(goResponse.status).toBe(201);
			expect(skResponse.status).toBe(201);

			// Compare response structure (ignoring IDs)
			compareResponses(goResponse, skResponse, {
				ignoreFields: ['id'],
				description: 'POST /api/people',
			});

			// Verify all input fields are in response
			expect(goResponse.data.firstName).toBe(newPerson.firstName);
			expect(skResponse.data.firstName).toBe(newPerson.firstName);
			expect(goResponse.data.lastName).toBe(newPerson.lastName);
			expect(skResponse.data.lastName).toBe(newPerson.lastName);
		});

		it('should handle validation errors identically', async () => {
			if (!goBackendAvailable || !sveltekitBackendAvailable) {
				return;
			}

			const invalidPerson = {
				firstName: '', // Empty firstName should fail validation
				lastName: 'Test',
				birthDate: '1990-01-01',
			};

			const goResponse = await makeRequest(`${GO_BASE_URL}/people`, {
				method: 'POST',
				body: JSON.stringify(invalidPerson),
			});

			const skResponse = await makeRequest(`${SVELTEKIT_BASE_URL}/people`, {
				method: 'POST',
				body: JSON.stringify(invalidPerson),
			});

			// Both should return 400 Bad Request
			expect(goResponse.status).toBe(400);
			expect(skResponse.status).toBe(400);
		});

		it('should handle missing required fields identically', async () => {
			if (!goBackendAvailable || !sveltekitBackendAvailable) {
				return;
			}

			const incompletePerson = {
				lastName: 'Test',
				// Missing firstName
			};

			const goResponse = await makeRequest(`${GO_BASE_URL}/people`, {
				method: 'POST',
				body: JSON.stringify(incompletePerson),
			});

			const skResponse = await makeRequest(`${SVELTEKIT_BASE_URL}/people`, {
				method: 'POST',
				body: JSON.stringify(incompletePerson),
			});

			// Both should return 400 Bad Request
			expect(goResponse.status).toBe(400);
			expect(skResponse.status).toBe(400);
		});
	});

	describe('PUT /api/people/:id - Update person', () => {
		it('should update person with identical behavior', async () => {
			if (!goBackendAvailable || !sveltekitBackendAvailable) {
				return;
			}

			// Create test persons first
			const initialPerson = {
				firstName: 'UpdateTest',
				lastName: 'Original',
				birthDate: '1980-01-01',
				gender: 'male',
			};

			const goCreateResponse = await makeRequest(`${GO_BASE_URL}/people`, {
				method: 'POST',
				body: JSON.stringify(initialPerson),
			});
			createdPeople.go.push(goCreateResponse.data.id);

			const skCreateResponse = await makeRequest(`${SVELTEKIT_BASE_URL}/people`, {
				method: 'POST',
				body: JSON.stringify(initialPerson),
			});
			createdPeople.sveltekit.push(skCreateResponse.data.id);

			// Update the persons
			const updates = {
				firstName: 'UpdateTest',
				lastName: 'Modified',
				birthDate: '1980-01-01',
				deathDate: '2020-12-31',
				gender: 'male',
				notes: 'Updated notes',
			};

			const goUpdateResponse = await makeRequest(
				`${GO_BASE_URL}/people/${goCreateResponse.data.id}`,
				{
					method: 'PUT',
					body: JSON.stringify(updates),
				}
			);

			const skUpdateResponse = await makeRequest(
				`${SVELTEKIT_BASE_URL}/people/${skCreateResponse.data.id}`,
				{
					method: 'PUT',
					body: JSON.stringify(updates),
				}
			);

			// Both should return 200 OK
			expect(goUpdateResponse.status).toBe(200);
			expect(skUpdateResponse.status).toBe(200);

			// Compare updated data (ignoring IDs)
			compareResponses(goUpdateResponse, skUpdateResponse, {
				ignoreFields: ['id'],
				description: 'PUT /api/people/:id',
			});

			// Verify updates were applied
			expect(goUpdateResponse.data.lastName).toBe('Modified');
			expect(skUpdateResponse.data.lastName).toBe('Modified');
			expect(goUpdateResponse.data.deathDate).toBe('2020-12-31');
			expect(skUpdateResponse.data.deathDate).toBe('2020-12-31');
		});

		it('should return 404 for non-existent person', async () => {
			if (!goBackendAvailable || !sveltekitBackendAvailable) {
				return;
			}

			const nonExistentId = 999999;
			const updates = {
				firstName: 'Test',
				lastName: 'Test',
			};

			const goResponse = await makeRequest(`${GO_BASE_URL}/people/${nonExistentId}`, {
				method: 'PUT',
				body: JSON.stringify(updates),
			});

			const skResponse = await makeRequest(`${SVELTEKIT_BASE_URL}/people/${nonExistentId}`, {
				method: 'PUT',
				body: JSON.stringify(updates),
			});

			expect(goResponse.status).toBe(404);
			expect(skResponse.status).toBe(404);
		});
	});

	describe('DELETE /api/people/:id - Delete person', () => {
		it('should delete person with identical behavior', async () => {
			if (!goBackendAvailable || !sveltekitBackendAvailable) {
				return;
			}

			// Create test persons first
			const testPerson = {
				firstName: 'DeleteTest',
				lastName: 'Person',
				birthDate: '1990-01-01',
			};

			const goCreateResponse = await makeRequest(`${GO_BASE_URL}/people`, {
				method: 'POST',
				body: JSON.stringify(testPerson),
			});
			const goPersonId = goCreateResponse.data.id;

			const skCreateResponse = await makeRequest(`${SVELTEKIT_BASE_URL}/people`, {
				method: 'POST',
				body: JSON.stringify(testPerson),
			});
			const skPersonId = skCreateResponse.data.id;

			// Delete the persons
			const goDeleteResponse = await makeRequest(`${GO_BASE_URL}/people/${goPersonId}`, {
				method: 'DELETE',
			});

			const skDeleteResponse = await makeRequest(`${SVELTEKIT_BASE_URL}/people/${skPersonId}`, {
				method: 'DELETE',
			});

			// Both should return 204 No Content
			expect(goDeleteResponse.status).toBe(204);
			expect(skDeleteResponse.status).toBe(204);

			// Verify persons are actually deleted
			const goVerifyResponse = await makeRequest(`${GO_BASE_URL}/people/${goPersonId}`);
			const skVerifyResponse = await makeRequest(`${SVELTEKIT_BASE_URL}/people/${skPersonId}`);

			expect(goVerifyResponse.status).toBe(404);
			expect(skVerifyResponse.status).toBe(404);

			// Don't track for cleanup since they're already deleted
		});

		it('should return 404 for non-existent person', async () => {
			if (!goBackendAvailable || !sveltekitBackendAvailable) {
				return;
			}

			const nonExistentId = 999999;
			const goResponse = await makeRequest(`${GO_BASE_URL}/people/${nonExistentId}`, {
				method: 'DELETE',
			});

			const skResponse = await makeRequest(`${SVELTEKIT_BASE_URL}/people/${nonExistentId}`, {
				method: 'DELETE',
			});

			expect(goResponse.status).toBe(404);
			expect(skResponse.status).toBe(404);
		});
	});

	describe('GET /api/relationships - List all relationships', () => {
		it('should return identical response structure and status', async () => {
			if (!goBackendAvailable || !sveltekitBackendAvailable) {
				return;
			}

			const goResponse = await makeRequest(`${GO_BASE_URL}/relationships`);
			const skResponse = await makeRequest(`${SVELTEKIT_BASE_URL}/relationships`);

			compareResponses(goResponse, skResponse, {
				description: 'GET /api/relationships',
			});

			// Verify response is an array
			expect(Array.isArray(goResponse.data)).toBe(true);
			expect(Array.isArray(skResponse.data)).toBe(true);
		});

		it('should return same relationship structure for existing data', async () => {
			if (!goBackendAvailable || !sveltekitBackendAvailable) {
				return;
			}

			const goResponse = await makeRequest(`${GO_BASE_URL}/relationships`);
			const skResponse = await makeRequest(`${SVELTEKIT_BASE_URL}/relationships`);

			if (goResponse.data.length > 0 && skResponse.data.length > 0) {
				const goRel = goResponse.data[0];
				const skRel = skResponse.data[0];

				// Verify all expected fields exist
				const expectedFields = ['id', 'person1Id', 'person2Id', 'type', 'parentRole'];
				for (const field of expectedFields) {
					expect(goRel).toHaveProperty(field);
					expect(skRel).toHaveProperty(field);
				}
			}
		});
	});

	describe('GET /api/relationships/:id - Get single relationship', () => {
		it('should return identical relationship data', async () => {
			if (!goBackendAvailable || !sveltekitBackendAvailable) {
				return;
			}

			// Create test persons first
			const person1 = {
				firstName: 'RelTest',
				lastName: 'Parent',
				birthDate: '1960-01-01',
				gender: 'female',
			};

			const person2 = {
				firstName: 'RelTest',
				lastName: 'Child',
				birthDate: '1990-01-01',
			};

			// Create persons in Go backend
			const goParent = await makeRequest(`${GO_BASE_URL}/people`, {
				method: 'POST',
				body: JSON.stringify(person1),
			});
			createdPeople.go.push(goParent.data.id);

			const goChild = await makeRequest(`${GO_BASE_URL}/people`, {
				method: 'POST',
				body: JSON.stringify(person2),
			});
			createdPeople.go.push(goChild.data.id);

			// Create persons in SvelteKit backend
			const skParent = await makeRequest(`${SVELTEKIT_BASE_URL}/people`, {
				method: 'POST',
				body: JSON.stringify(person1),
			});
			createdPeople.sveltekit.push(skParent.data.id);

			const skChild = await makeRequest(`${SVELTEKIT_BASE_URL}/people`, {
				method: 'POST',
				body: JSON.stringify(person2),
			});
			createdPeople.sveltekit.push(skChild.data.id);

			// Create relationships
			const goRelCreateResponse = await makeRequest(`${GO_BASE_URL}/relationships`, {
				method: 'POST',
				body: JSON.stringify({
					person1Id: goParent.data.id,
					person2Id: goChild.data.id,
					type: 'mother',
				}),
			});
			createdRelationships.go.push(goRelCreateResponse.data.id);

			const skRelCreateResponse = await makeRequest(`${SVELTEKIT_BASE_URL}/relationships`, {
				method: 'POST',
				body: JSON.stringify({
					person1Id: skParent.data.id,
					person2Id: skChild.data.id,
					type: 'mother',
				}),
			});
			createdRelationships.sveltekit.push(skRelCreateResponse.data.id);

			// Fetch the created relationships
			const goResponse = await makeRequest(`${GO_BASE_URL}/relationships/${goRelCreateResponse.data.id}`);
			const skResponse = await makeRequest(`${SVELTEKIT_BASE_URL}/relationships/${skRelCreateResponse.data.id}`);

			// Compare responses (ignoring IDs and person IDs)
			compareResponses(goResponse, skResponse, {
				ignoreFields: ['id', 'person1Id', 'person2Id'],
				description: 'GET /api/relationships/:id',
			});

			// Verify type and parentRole are correct
			expect(goResponse.data.type).toBe('parentOf');
			expect(skResponse.data.type).toBe('parentOf');
			expect(goResponse.data.parentRole).toBe('mother');
			expect(skResponse.data.parentRole).toBe('mother');
		});

		it('should return 404 for non-existent relationship', async () => {
			if (!goBackendAvailable || !sveltekitBackendAvailable) {
				return;
			}

			const nonExistentId = 999999;
			const goResponse = await makeRequest(`${GO_BASE_URL}/relationships/${nonExistentId}`);
			const skResponse = await makeRequest(`${SVELTEKIT_BASE_URL}/relationships/${nonExistentId}`);

			expect(goResponse.status).toBe(404);
			expect(skResponse.status).toBe(404);
		});
	});

	describe('POST /api/relationships - Create relationship', () => {
		it('should create mother relationship with identical structure', async () => {
			if (!goBackendAvailable || !sveltekitBackendAvailable) {
				return;
			}

			// Create test persons
			const parent = {
				firstName: 'CreateRel',
				lastName: 'Parent',
				birthDate: '1960-01-01',
				gender: 'female',
			};

			const child = {
				firstName: 'CreateRel',
				lastName: 'Child',
				birthDate: '1990-01-01',
			};

			// Create in Go backend
			const goParent = await makeRequest(`${GO_BASE_URL}/people`, {
				method: 'POST',
				body: JSON.stringify(parent),
			});
			createdPeople.go.push(goParent.data.id);

			const goChild = await makeRequest(`${GO_BASE_URL}/people`, {
				method: 'POST',
				body: JSON.stringify(child),
			});
			createdPeople.go.push(goChild.data.id);

			// Create in SvelteKit backend
			const skParent = await makeRequest(`${SVELTEKIT_BASE_URL}/people`, {
				method: 'POST',
				body: JSON.stringify(parent),
			});
			createdPeople.sveltekit.push(skParent.data.id);

			const skChild = await makeRequest(`${SVELTEKIT_BASE_URL}/people`, {
				method: 'POST',
				body: JSON.stringify(child),
			});
			createdPeople.sveltekit.push(skChild.data.id);

			// Create relationships
			const goResponse = await makeRequest(`${GO_BASE_URL}/relationships`, {
				method: 'POST',
				body: JSON.stringify({
					person1Id: goParent.data.id,
					person2Id: goChild.data.id,
					type: 'mother',
				}),
			});
			createdRelationships.go.push(goResponse.data.id);

			const skResponse = await makeRequest(`${SVELTEKIT_BASE_URL}/relationships`, {
				method: 'POST',
				body: JSON.stringify({
					person1Id: skParent.data.id,
					person2Id: skChild.data.id,
					type: 'mother',
				}),
			});
			createdRelationships.sveltekit.push(skResponse.data.id);

			// Both should return 201 Created
			expect(goResponse.status).toBe(201);
			expect(skResponse.status).toBe(201);

			// Compare response structure
			compareResponses(goResponse, skResponse, {
				ignoreFields: ['id', 'person1Id', 'person2Id'],
				description: 'POST /api/relationships (mother)',
			});

			// Verify normalization: type should be 'parentOf' and parentRole should be 'mother'
			expect(goResponse.data.type).toBe('parentOf');
			expect(skResponse.data.type).toBe('parentOf');
			expect(goResponse.data.parentRole).toBe('mother');
			expect(skResponse.data.parentRole).toBe('mother');
		});

		it('should create father relationship with identical structure', async () => {
			if (!goBackendAvailable || !sveltekitBackendAvailable) {
				return;
			}

			// Create test persons
			const parent = {
				firstName: 'CreateRel',
				lastName: 'Father',
				birthDate: '1960-01-01',
				gender: 'male',
			};

			const child = {
				firstName: 'CreateRel',
				lastName: 'Child',
				birthDate: '1990-01-01',
			};

			// Create in Go backend
			const goParent = await makeRequest(`${GO_BASE_URL}/people`, {
				method: 'POST',
				body: JSON.stringify(parent),
			});
			createdPeople.go.push(goParent.data.id);

			const goChild = await makeRequest(`${GO_BASE_URL}/people`, {
				method: 'POST',
				body: JSON.stringify(child),
			});
			createdPeople.go.push(goChild.data.id);

			// Create in SvelteKit backend
			const skParent = await makeRequest(`${SVELTEKIT_BASE_URL}/people`, {
				method: 'POST',
				body: JSON.stringify(parent),
			});
			createdPeople.sveltekit.push(skParent.data.id);

			const skChild = await makeRequest(`${SVELTEKIT_BASE_URL}/people`, {
				method: 'POST',
				body: JSON.stringify(child),
			});
			createdPeople.sveltekit.push(skChild.data.id);

			// Create relationships
			const goResponse = await makeRequest(`${GO_BASE_URL}/relationships`, {
				method: 'POST',
				body: JSON.stringify({
					person1Id: goParent.data.id,
					person2Id: goChild.data.id,
					type: 'father',
				}),
			});
			createdRelationships.go.push(goResponse.data.id);

			const skResponse = await makeRequest(`${SVELTEKIT_BASE_URL}/relationships`, {
				method: 'POST',
				body: JSON.stringify({
					person1Id: skParent.data.id,
					person2Id: skChild.data.id,
					type: 'father',
				}),
			});
			createdRelationships.sveltekit.push(skResponse.data.id);

			// Both should return 201 Created
			expect(goResponse.status).toBe(201);
			expect(skResponse.status).toBe(201);

			// Verify normalization
			expect(goResponse.data.type).toBe('parentOf');
			expect(skResponse.data.type).toBe('parentOf');
			expect(goResponse.data.parentRole).toBe('father');
			expect(skResponse.data.parentRole).toBe('father');
		});

		it('should create spouse relationship with identical structure', async () => {
			if (!goBackendAvailable || !sveltekitBackendAvailable) {
				return;
			}

			// Create test persons
			const person1 = {
				firstName: 'Spouse',
				lastName: 'One',
				birthDate: '1970-01-01',
			};

			const person2 = {
				firstName: 'Spouse',
				lastName: 'Two',
				birthDate: '1972-01-01',
			};

			// Create in Go backend
			const goPerson1 = await makeRequest(`${GO_BASE_URL}/people`, {
				method: 'POST',
				body: JSON.stringify(person1),
			});
			createdPeople.go.push(goPerson1.data.id);

			const goPerson2 = await makeRequest(`${GO_BASE_URL}/people`, {
				method: 'POST',
				body: JSON.stringify(person2),
			});
			createdPeople.go.push(goPerson2.data.id);

			// Create in SvelteKit backend
			const skPerson1 = await makeRequest(`${SVELTEKIT_BASE_URL}/people`, {
				method: 'POST',
				body: JSON.stringify(person1),
			});
			createdPeople.sveltekit.push(skPerson1.data.id);

			const skPerson2 = await makeRequest(`${SVELTEKIT_BASE_URL}/people`, {
				method: 'POST',
				body: JSON.stringify(person2),
			});
			createdPeople.sveltekit.push(skPerson2.data.id);

			// Create relationships
			const goResponse = await makeRequest(`${GO_BASE_URL}/relationships`, {
				method: 'POST',
				body: JSON.stringify({
					person1Id: goPerson1.data.id,
					person2Id: goPerson2.data.id,
					type: 'spouse',
				}),
			});
			createdRelationships.go.push(goResponse.data.id);

			const skResponse = await makeRequest(`${SVELTEKIT_BASE_URL}/relationships`, {
				method: 'POST',
				body: JSON.stringify({
					person1Id: skPerson1.data.id,
					person2Id: skPerson2.data.id,
					type: 'spouse',
				}),
			});
			createdRelationships.sveltekit.push(skResponse.data.id);

			// Both should return 201 Created
			expect(goResponse.status).toBe(201);
			expect(skResponse.status).toBe(201);

			// Verify type is 'spouse' and parentRole is null
			expect(goResponse.data.type).toBe('spouse');
			expect(skResponse.data.type).toBe('spouse');
			expect(goResponse.data.parentRole).toBe(null);
			expect(skResponse.data.parentRole).toBe(null);
		});

		it('should handle validation errors identically - duplicate mother', async () => {
			if (!goBackendAvailable || !sveltekitBackendAvailable) {
				return;
			}

			// Create test persons
			const mother1 = {
				firstName: 'Mother',
				lastName: 'One',
				gender: 'female',
			};

			const mother2 = {
				firstName: 'Mother',
				lastName: 'Two',
				gender: 'female',
			};

			const child = {
				firstName: 'Child',
				lastName: 'Test',
			};

			// Create in Go backend
			const goMother1 = await makeRequest(`${GO_BASE_URL}/people`, {
				method: 'POST',
				body: JSON.stringify(mother1),
			});
			createdPeople.go.push(goMother1.data.id);

			const goMother2 = await makeRequest(`${GO_BASE_URL}/people`, {
				method: 'POST',
				body: JSON.stringify(mother2),
			});
			createdPeople.go.push(goMother2.data.id);

			const goChild = await makeRequest(`${GO_BASE_URL}/people`, {
				method: 'POST',
				body: JSON.stringify(child),
			});
			createdPeople.go.push(goChild.data.id);

			// Create in SvelteKit backend
			const skMother1 = await makeRequest(`${SVELTEKIT_BASE_URL}/people`, {
				method: 'POST',
				body: JSON.stringify(mother1),
			});
			createdPeople.sveltekit.push(skMother1.data.id);

			const skMother2 = await makeRequest(`${SVELTEKIT_BASE_URL}/people`, {
				method: 'POST',
				body: JSON.stringify(mother2),
			});
			createdPeople.sveltekit.push(skMother2.data.id);

			const skChild = await makeRequest(`${SVELTEKIT_BASE_URL}/people`, {
				method: 'POST',
				body: JSON.stringify(child),
			});
			createdPeople.sveltekit.push(skChild.data.id);

			// Create first mother relationship
			const goRel1 = await makeRequest(`${GO_BASE_URL}/relationships`, {
				method: 'POST',
				body: JSON.stringify({
					person1Id: goMother1.data.id,
					person2Id: goChild.data.id,
					type: 'mother',
				}),
			});
			createdRelationships.go.push(goRel1.data.id);

			const skRel1 = await makeRequest(`${SVELTEKIT_BASE_URL}/relationships`, {
				method: 'POST',
				body: JSON.stringify({
					person1Id: skMother1.data.id,
					person2Id: skChild.data.id,
					type: 'mother',
				}),
			});
			createdRelationships.sveltekit.push(skRel1.data.id);

			// Try to create second mother relationship (should fail)
			const goResponse = await makeRequest(`${GO_BASE_URL}/relationships`, {
				method: 'POST',
				body: JSON.stringify({
					person1Id: goMother2.data.id,
					person2Id: goChild.data.id,
					type: 'mother',
				}),
			});

			const skResponse = await makeRequest(`${SVELTEKIT_BASE_URL}/relationships`, {
				method: 'POST',
				body: JSON.stringify({
					person1Id: skMother2.data.id,
					person2Id: skChild.data.id,
					type: 'mother',
				}),
			});

			// Both should return 400 Bad Request
			expect(goResponse.status).toBe(400);
			expect(skResponse.status).toBe(400);
		});

		it('should handle validation errors identically - non-existent person', async () => {
			if (!goBackendAvailable || !sveltekitBackendAvailable) {
				return;
			}

			const invalidRel = {
				person1Id: 999999,
				person2Id: 999998,
				type: 'mother',
			};

			const goResponse = await makeRequest(`${GO_BASE_URL}/relationships`, {
				method: 'POST',
				body: JSON.stringify(invalidRel),
			});

			const skResponse = await makeRequest(`${SVELTEKIT_BASE_URL}/relationships`, {
				method: 'POST',
				body: JSON.stringify(invalidRel),
			});

			// Both should return 400 Bad Request
			expect(goResponse.status).toBe(400);
			expect(skResponse.status).toBe(400);
		});
	});

	describe('PUT /api/relationships/:id - Update relationship', () => {
		it('should update relationship with identical behavior', async () => {
			if (!goBackendAvailable || !sveltekitBackendAvailable) {
				return;
			}

			// Create test persons
			const person1 = {
				firstName: 'UpdateRel',
				lastName: 'One',
			};

			const person2 = {
				firstName: 'UpdateRel',
				lastName: 'Two',
			};

			// Create in Go backend
			const goPerson1 = await makeRequest(`${GO_BASE_URL}/people`, {
				method: 'POST',
				body: JSON.stringify(person1),
			});
			createdPeople.go.push(goPerson1.data.id);

			const goPerson2 = await makeRequest(`${GO_BASE_URL}/people`, {
				method: 'POST',
				body: JSON.stringify(person2),
			});
			createdPeople.go.push(goPerson2.data.id);

			// Create in SvelteKit backend
			const skPerson1 = await makeRequest(`${SVELTEKIT_BASE_URL}/people`, {
				method: 'POST',
				body: JSON.stringify(person1),
			});
			createdPeople.sveltekit.push(skPerson1.data.id);

			const skPerson2 = await makeRequest(`${SVELTEKIT_BASE_URL}/people`, {
				method: 'POST',
				body: JSON.stringify(person2),
			});
			createdPeople.sveltekit.push(skPerson2.data.id);

			// Create initial relationships (father)
			const goRelCreate = await makeRequest(`${GO_BASE_URL}/relationships`, {
				method: 'POST',
				body: JSON.stringify({
					person1Id: goPerson1.data.id,
					person2Id: goPerson2.data.id,
					type: 'father',
				}),
			});
			createdRelationships.go.push(goRelCreate.data.id);

			const skRelCreate = await makeRequest(`${SVELTEKIT_BASE_URL}/relationships`, {
				method: 'POST',
				body: JSON.stringify({
					person1Id: skPerson1.data.id,
					person2Id: skPerson2.data.id,
					type: 'father',
				}),
			});
			createdRelationships.sveltekit.push(skRelCreate.data.id);

			// Update to mother relationship
			const updates = {
				person1Id: goPerson1.data.id,
				person2Id: goPerson2.data.id,
				type: 'mother',
			};

			const goUpdateResponse = await makeRequest(
				`${GO_BASE_URL}/relationships/${goRelCreate.data.id}`,
				{
					method: 'PUT',
					body: JSON.stringify(updates),
				}
			);

			const skUpdateResponse = await makeRequest(
				`${SVELTEKIT_BASE_URL}/relationships/${skRelCreate.data.id}`,
				{
					method: 'PUT',
					body: JSON.stringify({
						...updates,
						person1Id: skPerson1.data.id,
						person2Id: skPerson2.data.id,
					}),
				}
			);

			// Both should return 200 OK
			expect(goUpdateResponse.status).toBe(200);
			expect(skUpdateResponse.status).toBe(200);

			// Verify updates were applied
			expect(goUpdateResponse.data.type).toBe('parentOf');
			expect(skUpdateResponse.data.type).toBe('parentOf');
			expect(goUpdateResponse.data.parentRole).toBe('mother');
			expect(skUpdateResponse.data.parentRole).toBe('mother');
		});

		it('should return 404 for non-existent relationship', async () => {
			if (!goBackendAvailable || !sveltekitBackendAvailable) {
				return;
			}

			const nonExistentId = 999999;
			const updates = {
				person1Id: 1,
				person2Id: 2,
				type: 'spouse',
			};

			const goResponse = await makeRequest(`${GO_BASE_URL}/relationships/${nonExistentId}`, {
				method: 'PUT',
				body: JSON.stringify(updates),
			});

			const skResponse = await makeRequest(`${SVELTEKIT_BASE_URL}/relationships/${nonExistentId}`, {
				method: 'PUT',
				body: JSON.stringify(updates),
			});

			expect(goResponse.status).toBe(404);
			expect(skResponse.status).toBe(404);
		});
	});

	describe('DELETE /api/relationships/:id - Delete relationship', () => {
		it('should delete relationship with identical behavior', async () => {
			if (!goBackendAvailable || !sveltekitBackendAvailable) {
				return;
			}

			// Create test persons
			const person1 = {
				firstName: 'DeleteRel',
				lastName: 'One',
			};

			const person2 = {
				firstName: 'DeleteRel',
				lastName: 'Two',
			};

			// Create in Go backend
			const goPerson1 = await makeRequest(`${GO_BASE_URL}/people`, {
				method: 'POST',
				body: JSON.stringify(person1),
			});
			createdPeople.go.push(goPerson1.data.id);

			const goPerson2 = await makeRequest(`${GO_BASE_URL}/people`, {
				method: 'POST',
				body: JSON.stringify(person2),
			});
			createdPeople.go.push(goPerson2.data.id);

			// Create in SvelteKit backend
			const skPerson1 = await makeRequest(`${SVELTEKIT_BASE_URL}/people`, {
				method: 'POST',
				body: JSON.stringify(person1),
			});
			createdPeople.sveltekit.push(skPerson1.data.id);

			const skPerson2 = await makeRequest(`${SVELTEKIT_BASE_URL}/people`, {
				method: 'POST',
				body: JSON.stringify(person2),
			});
			createdPeople.sveltekit.push(skPerson2.data.id);

			// Create relationships
			const goRelCreate = await makeRequest(`${GO_BASE_URL}/relationships`, {
				method: 'POST',
				body: JSON.stringify({
					person1Id: goPerson1.data.id,
					person2Id: goPerson2.data.id,
					type: 'spouse',
				}),
			});
			const goRelId = goRelCreate.data.id;

			const skRelCreate = await makeRequest(`${SVELTEKIT_BASE_URL}/relationships`, {
				method: 'POST',
				body: JSON.stringify({
					person1Id: skPerson1.data.id,
					person2Id: skPerson2.data.id,
					type: 'spouse',
				}),
			});
			const skRelId = skRelCreate.data.id;

			// Delete the relationships
			const goDeleteResponse = await makeRequest(`${GO_BASE_URL}/relationships/${goRelId}`, {
				method: 'DELETE',
			});

			const skDeleteResponse = await makeRequest(`${SVELTEKIT_BASE_URL}/relationships/${skRelId}`, {
				method: 'DELETE',
			});

			// Both should return 204 No Content
			expect(goDeleteResponse.status).toBe(204);
			expect(skDeleteResponse.status).toBe(204);

			// Verify relationships are actually deleted
			const goVerifyResponse = await makeRequest(`${GO_BASE_URL}/relationships/${goRelId}`);
			const skVerifyResponse = await makeRequest(`${SVELTEKIT_BASE_URL}/relationships/${skRelId}`);

			expect(goVerifyResponse.status).toBe(404);
			expect(skVerifyResponse.status).toBe(404);
		});

		it('should return 404 for non-existent relationship', async () => {
			if (!goBackendAvailable || !sveltekitBackendAvailable) {
				return;
			}

			const nonExistentId = 999999;
			const goResponse = await makeRequest(`${GO_BASE_URL}/relationships/${nonExistentId}`, {
				method: 'DELETE',
			});

			const skResponse = await makeRequest(`${SVELTEKIT_BASE_URL}/relationships/${nonExistentId}`, {
				method: 'DELETE',
			});

			expect(goResponse.status).toBe(404);
			expect(skResponse.status).toBe(404);
		});
	});
});
