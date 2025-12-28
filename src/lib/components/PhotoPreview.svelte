<script>
  /**
   * PhotoPreview Component
   *
   * Displays a profile photo with fallback to initials placeholder.
   * Handles image loading errors gracefully with visual error indicator.
   *
   * Features:
   * - Shows actual profile photo when URL is provided
   * - Displays initials placeholder when no photo URL
   * - Handles broken images with error state fallback
   * - Supports customizable size (default: 90px)
   * - Circular appearance with gradient backgrounds
   * - Lazy loading for performance
   * - Full accessibility support (ARIA labels, alt text)
   *
   * Props:
   * @param {string|null} photoUrl - URL of the profile photo (optional)
   * @param {string} firstName - First name for initials fallback
   * @param {string} lastName - Last name for initials fallback
   * @param {number} size - Size in pixels (default: 90)
   *
   * Examples:
   * <PhotoPreview photoUrl="https://..." firstName="John" lastName="Doe" />
   * <PhotoPreview firstName="Jane" lastName="Smith" size={120} />
   */

  export let photoUrl = null
  export let firstName = ''
  export let lastName = ''
  export let size = 90

  // Internal state for image loading
  let imageError = false

  /**
   * Compute initials from first and last name
   * Handles edge cases: empty names, whitespace, special characters
   * @param {string} first - First name
   * @param {string} last - Last name
   * @returns {string} Two-letter uppercase initials
   */
  function getInitials(first, last) {
    const firstInitial = (first || '').trim()[0] || ''
    const lastInitial = (last || '').trim()[0] || ''
    return (firstInitial + lastInitial).toUpperCase()
  }

  // Reactive computations
  $: initials = getInitials(firstName, lastName)
  $: showPlaceholder = !photoUrl || imageError
  $: fullName = `${firstName} ${lastName}`.trim() || 'Profile'

  // Reset error state when photoUrl changes (allow recovery)
  $: if (photoUrl) {
    imageError = false
  }

  /**
   * Handle image loading errors
   * Sets error state to show fallback placeholder
   */
  function handleImageError() {
    imageError = true
  }

  /**
   * Handle successful image load
   * Clears error state
   */
  function handleImageLoad() {
    imageError = false
  }
</script>

{#if showPlaceholder}
  <!-- Placeholder: Shows initials when no photo or image error -->
  <div
    class="photo-placeholder photo-preview-container"
    class:error-indicator={imageError}
    style="width: {size}px; height: {size}px;"
    aria-label="{fullName} profile photo placeholder"
    data-error={imageError}
    role="img"
  >
    <span class="initials" aria-hidden="true">{initials}</span>
  </div>
{:else}
  <!-- Photo: Shows actual image when URL is valid -->
  <div
    class="photo-preview-container"
    style="width: {size}px; height: {size}px;"
  >
    <img
      src={photoUrl}
      alt="{fullName} profile photo"
      on:error={handleImageError}
      on:load={handleImageLoad}
      loading="lazy"
    />
  </div>
{/if}

<style>
  .photo-preview-container {
    border-radius: 50%;
    overflow: hidden;
    position: relative;
    flex-shrink: 0;
  }

  .photo-placeholder {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .photo-placeholder.error-indicator {
    background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
  }

  .initials {
    color: white;
    font-weight: 600;
    font-size: 1.125rem;
    text-transform: uppercase;
    user-select: none;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
</style>
