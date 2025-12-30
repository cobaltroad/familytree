<script>
  import { createEventDispatcher } from 'svelte'
  import PhotoPreview from './PhotoPreview.svelte'
  import CollapsibleSection from './CollapsibleSection.svelte'

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
  let currentPersonId = null

  // Reactive update when person prop changes to a DIFFERENT person
  // Only update formData if we're editing a different person than before
  // This prevents overwriting user edits during reactive re-renders
  $: if (person && person.id !== currentPersonId) {
    formData = {
      firstName: person.firstName || '',
      lastName: person.lastName || '',
      birthDate: person.birthDate || '',
      deathDate: person.deathDate || '',
      gender: person.gender || '',
      photoUrl: person.photoUrl || ''
    }
    isAlive = !person.deathDate
    currentPersonId = person.id
  } else if (!person && currentPersonId !== null) {
    // Person was cleared (switched to add mode)
    formData = {
      firstName: '',
      lastName: '',
      birthDate: '',
      deathDate: '',
      gender: '',
      photoUrl: ''
    }
    isAlive = true
    currentPersonId = null
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
</script>

<form id="person-form" on:submit|preventDefault={handleSubmit}>
  <!-- Photo Preview Section -->
  <div class="photo-section photo-preview-section">
    <PhotoPreview
      photoUrl={formData.photoUrl}
      firstName={formData.firstName}
      lastName={formData.lastName}
      size={100}
    />
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

  <!-- Additional Metadata Section (Collapsible) -->
  <CollapsibleSection title="Additional Metadata" expanded={false}>
    <div class="form-group">
      <label for="photoUrl">Photo URL</label>
      <input
        id="photoUrl"
        type="url"
        bind:value={formData.photoUrl}
        placeholder="https://example.com/photo.jpg"
      />
    </div>
  </CollapsibleSection>
</form>

<style>
  /* Photo Preview Section */
  .photo-section {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 1.5rem;
    padding: 1rem 0;
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
    .radio-group {
      flex-direction: column;
      gap: 0.75rem;
    }
  }
</style>
