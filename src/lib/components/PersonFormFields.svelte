<script>
  import { createEventDispatcher } from 'svelte'
  import { api } from '$lib/api.js'
  import * as notifications from '../../stores/notificationStore.js'

  export let person = null

  const dispatch = createEventDispatcher()

  let formData = {
    firstName: '',
    lastName: '',
    birthDate: '',
    deathDate: '',
    gender: '',
    photoUrl: ''
  }

  let isAlive = true

  // Facebook import state
  let facebookUrl = ''
  let isImporting = false
  let showFacebookImport = false

  // Reactive update when person prop changes
  $: if (person) {
    formData = {
      firstName: person.firstName || '',
      lastName: person.lastName || '',
      birthDate: person.birthDate || '',
      deathDate: person.deathDate || '',
      gender: person.gender || '',
      photoUrl: person.photoUrl || ''
    }
    isAlive = !person.deathDate
  }

  $: if (isAlive) {
    formData.deathDate = ''
  }

  export function handleSubmit() {
    const data = {
      ...formData,
      birthDate: formData.birthDate || null,
      deathDate: formData.deathDate || null,
      gender: formData.gender || null,
      photoUrl: formData.photoUrl || null
    }

    if (person) {
      // Include ID for update
      dispatch('submit', { ...data, id: person.id })
    } else {
      dispatch('submit', data)
    }

    resetForm()
  }

  function resetForm() {
    if (!person) {
      formData = {
        firstName: '',
        lastName: '',
        birthDate: '',
        deathDate: '',
        gender: '',
        photoUrl: ''
      }
      isAlive = true
    }
  }

  /**
   * Import data from Facebook profile
   * Stories #78 and #80: Facebook Profile Picture Import and Data Pre-population
   */
  async function importFromFacebook() {
    if (!facebookUrl || !facebookUrl.trim()) {
      notifications.error('Please enter a Facebook profile URL')
      return
    }

    isImporting = true

    try {
      const personData = await api.fetchFacebookProfile(facebookUrl)

      // Pre-populate form fields with Facebook data
      // Only update fields that are empty or if Facebook has data
      if (personData.firstName) {
        formData.firstName = personData.firstName
      }

      if (personData.lastName) {
        formData.lastName = personData.lastName
      }

      if (personData.birthDate) {
        formData.birthDate = personData.birthDate
      }

      if (personData.gender) {
        formData.gender = personData.gender
      }

      if (personData.photoUrl) {
        formData.photoUrl = personData.photoUrl
      }

      // Build success message
      const importedFields = []
      if (personData.firstName || personData.lastName) importedFields.push('name')
      if (personData.birthDate) importedFields.push('birth date')
      if (personData.gender) importedFields.push('gender')
      if (personData.photoUrl) importedFields.push('photo')

      if (importedFields.length > 0) {
        notifications.success(
          `Imported ${importedFields.join(', ')} from Facebook profile`
        )
      } else {
        notifications.info('Profile found but no additional data available (check privacy settings)')
      }

      // Clear Facebook URL and collapse section
      facebookUrl = ''
      showFacebookImport = false
    } catch (error) {
      notifications.error(error.message || 'Failed to import Facebook profile')
    } finally {
      isImporting = false
    }
  }

  function toggleFacebookImport() {
    showFacebookImport = !showFacebookImport
    if (showFacebookImport) {
      facebookUrl = ''
    }
  }
</script>

<form id="person-form" on:submit|preventDefault={handleSubmit}>
  <!-- Facebook Import Section -->
  <div class="facebook-import-section">
    <button
      type="button"
      class="facebook-import-toggle"
      on:click={toggleFacebookImport}
      aria-expanded={showFacebookImport}
    >
      {showFacebookImport ? '−' : '+'} Import from Facebook
    </button>

    {#if showFacebookImport}
      <div class="facebook-import-form">
        <p class="import-help">
          Enter a Facebook profile URL, username, or user ID to pre-fill this form.
        </p>
        <div class="import-input-group">
          <input
            type="text"
            bind:value={facebookUrl}
            placeholder="facebook.com/username or user ID"
            disabled={isImporting}
            class="facebook-url-input"
          />
          <button
            type="button"
            on:click={importFromFacebook}
            disabled={isImporting || !facebookUrl.trim()}
            class="import-button"
          >
            {isImporting ? 'Importing...' : 'Import'}
          </button>
        </div>
      </div>
    {/if}
  </div>

  <div class="form-group">
    <label for="firstName">First Name *</label>
    <input
      id="firstName"
      type="text"
      bind:value={formData.firstName}
      required
    />
  </div>

  <div class="form-group">
    <label for="lastName">Last Name *</label>
    <input
      id="lastName"
      type="text"
      bind:value={formData.lastName}
      required
    />
  </div>

  <div class="form-group">
    <label for="photoUrl">Photo URL</label>
    <input
      id="photoUrl"
      type="url"
      bind:value={formData.photoUrl}
      placeholder="https://example.com/photo.jpg"
    />
  </div>

  <div class="form-group">
    <label>Gender</label>
    <div class="radio-group">
      <label class="radio-label">
        <input
          type="radio"
          name="gender"
          value="female"
          checked={formData.gender === 'female'}
          on:change={() => formData.gender = 'female'}
        />
        female
      </label>
      <label class="radio-label">
        <input
          type="radio"
          name="gender"
          value="male"
          checked={formData.gender === 'male'}
          on:change={() => formData.gender = 'male'}
        />
        male
      </label>
      <label class="radio-label">
        <input
          type="radio"
          name="gender"
          value="other"
          checked={formData.gender === 'other'}
          on:change={() => formData.gender = 'other'}
        />
        other
      </label>
      <label class="radio-label">
        <input
          type="radio"
          name="gender"
          value=""
          checked={formData.gender === ''}
          on:change={() => formData.gender = ''}
        />
        unspecified
      </label>
    </div>
  </div>

  <div class="form-group">
    <label for="birthDate">Birth Date</label>
    <input
      id="birthDate"
      type="date"
      bind:value={formData.birthDate}
    />
  </div>

  <div class="form-group">
    <label>
      <input
        type="checkbox"
        bind:checked={isAlive}
      />
      Still Alive
    </label>
  </div>

  {#if !isAlive}
    <div class="form-group">
      <label for="deathDate">Death Date</label>
      <input
        id="deathDate"
        type="date"
        bind:value={formData.deathDate}
      />
    </div>
  {/if}
</form>

<style>
  /* Facebook Import Section */
  .facebook-import-section {
    margin-bottom: 1.5rem;
    padding: 1rem;
    background-color: #f8f9fa;
    border-radius: 6px;
    border: 1px solid #e0e0e0;
  }

  .facebook-import-toggle {
    width: 100%;
    padding: 0.75rem 1rem;
    background: linear-gradient(135deg, #1877f2 0%, #0c63d4 100%);
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
  }

  .facebook-import-toggle:hover {
    background: linear-gradient(135deg, #166fe5 0%, #0a57c2 100%);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(24, 119, 242, 0.3);
  }

  .facebook-import-toggle:active {
    transform: translateY(0);
  }

  .facebook-import-form {
    margin-top: 1rem;
    animation: slideDown 0.2s ease;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .import-help {
    margin: 0 0 0.75rem 0;
    font-size: 0.9rem;
    color: #666;
    line-height: 1.4;
  }

  .import-input-group {
    display: flex;
    gap: 0.5rem;
  }

  .facebook-url-input {
    flex: 1;
    padding: 0.75rem;
    border: 2px solid #e0e0e0;
    border-radius: 4px;
    font-size: 1rem;
    transition: border-color 0.2s ease;
  }

  .facebook-url-input:focus {
    outline: none;
    border-color: #1877f2;
  }

  .facebook-url-input:disabled {
    background-color: #f5f5f5;
    cursor: not-allowed;
  }

  .import-button {
    padding: 0.75rem 1.5rem;
    background-color: #42b983;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.2s ease;
  }

  .import-button:hover:not(:disabled) {
    background-color: #38a373;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(66, 185, 131, 0.3);
  }

  .import-button:active:not(:disabled) {
    transform: translateY(0);
  }

  .import-button:disabled {
    background-color: #ccc;
    cursor: not-allowed;
    opacity: 0.6;
  }

  /* Form Groups */
  .form-group {
    margin-bottom: 1rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #333;
  }

  .form-group input[type="text"],
  .form-group input[type="date"],
  .form-group input[type="url"] {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 1rem;
  }

  .form-group input[type="checkbox"] {
    margin-right: 0.5rem;
  }

  .radio-group {
    display: flex;
    gap: 1.5rem;
    margin-top: 0.5rem;
  }

  .radio-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    font-weight: normal;
  }

  .radio-label:has(input[type="radio"]:checked) {
    font-weight: bold;
  }

  .radio-label input[type="radio"] {
    cursor: pointer;
  }

  @media (max-width: 768px) {
    .import-input-group {
      flex-direction: column;
    }

    .import-button {
      width: 100%;
    }

    .radio-group {
      flex-direction: column;
      gap: 0.75rem;
    }
  }
</style>
