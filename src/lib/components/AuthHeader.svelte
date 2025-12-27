<script>
  /**
   * Authentication Header Component
   *
   * Displays user authentication status and provides sign-in/sign-out functionality.
   *
   * Features:
   * - Shows user profile (avatar, name) when authenticated
   * - Shows sign-in link when not authenticated
   * - Provides sign-out button
   * - Responsive layout
   * - Accessible
   *
   * @component
   * @prop {Object|null} session - Session object from $page.data.session
   */

  export let session = null

  $: user = session?.user
  $: isAuthenticated = !!user

  // Display name with fallback to email
  $: displayName = user?.name || user?.email || 'User'

  // Get user initials for fallback avatar
  $: initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user?.email
      ? user.email[0].toUpperCase()
      : 'U'
</script>

<header class="auth-header">
  <div class="auth-header-content">
    {#if isAuthenticated}
      <!-- Authenticated: Show user profile -->
      <div class="user-profile">
        <div class="user-avatar">
          {#if user.image}
            <img src={user.image} alt={displayName} class="avatar-image" />
          {:else}
            <div class="avatar-initials" aria-label={displayName}>
              {initials}
            </div>
          {/if}
        </div>

        <span class="user-name">{displayName}</span>

        <a href="/auth/signout" class="sign-out-link"> Sign Out </a>
      </div>
    {:else}
      <!-- Unauthenticated: Show sign-in link -->
      <div class="sign-in-container">
        <a href="/signin" class="sign-in-link"> Sign In </a>
      </div>
    {/if}
  </div>
</header>

<style>
  .auth-header {
    background: white;
    border-bottom: 1px solid #e0e0e0;
    padding: 0.75rem 1.5rem;
  }

  .auth-header-content {
    max-width: 1400px;
    margin: 0 auto;
    display: flex;
    justify-content: flex-end;
    align-items: center;
  }

  /* User Profile (Authenticated) */
  .user-profile {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .user-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    overflow: hidden;
    background: #f0f0f0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .avatar-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .avatar-initials {
    font-size: 0.875rem;
    font-weight: 600;
    color: #666;
  }

  .user-name {
    font-size: 0.9375rem;
    color: #333;
    font-weight: 500;
  }

  .sign-out-link {
    padding: 0.5rem 1rem;
    background: #f44336;
    color: white;
    text-decoration: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    transition: background 0.2s ease;
  }

  .sign-out-link:hover {
    background: #d32f2f;
  }

  .sign-out-link:focus {
    outline: 3px solid #ffcdd2;
    outline-offset: 2px;
  }

  /* Sign In (Unauthenticated) */
  .sign-in-container {
    display: flex;
    align-items: center;
  }

  .sign-in-link {
    padding: 0.5rem 1.25rem;
    background: #1877f2;
    color: white;
    text-decoration: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    transition: all 0.2s ease;
  }

  .sign-in-link:hover {
    background: #166fe5;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(24, 119, 242, 0.3);
  }

  .sign-in-link:focus {
    outline: 3px solid #bbdefb;
    outline-offset: 2px;
  }

  /* Mobile Responsiveness */
  @media (max-width: 768px) {
    .auth-header {
      padding: 0.5rem 1rem;
    }

    .user-name {
      display: none; /* Hide name on mobile to save space */
    }

    .sign-out-link,
    .sign-in-link {
      font-size: 0.8125rem;
      padding: 0.375rem 0.875rem;
    }
  }

  /* Accessibility */
  @media (prefers-reduced-motion: reduce) {
    .sign-in-link,
    .sign-out-link {
      transition: none;
    }

    .sign-in-link:hover {
      transform: none;
    }
  }
</style>
