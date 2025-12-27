<script>
  /**
   * Sign-in Page
   *
   * Provides Facebook OAuth authentication interface.
   * Follows Facebook Brand Guidelines for login button design.
   *
   * Features:
   * - Facebook login button with proper branding
   * - Centered, clean layout
   * - Accessible and mobile-friendly
   * - Links to Auth.js Facebook sign-in endpoint
   */
</script>

<main class="signin-container">
  <div class="signin-card">
    <h1>Sign In to Family Tree</h1>

    <p class="welcome-text">
      Sign in to access your family tree and manage your genealogy data.
    </p>

    <div class="signin-buttons">
      <form action="/auth/signin/facebook" method="POST" class="signin-form">
        <button type="submit" class="facebook-button">
          <svg
            class="facebook-icon"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            width="20"
            height="20"
            aria-hidden="true"
          >
            <path
              d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
            />
          </svg>
          <span>Continue with Facebook</span>
        </button>
      </form>
    </div>

    <p class="privacy-note">
      By signing in, you agree to our terms of service and privacy policy.
    </p>
  </div>
</main>

<style>
  .signin-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 1rem;
  }

  .signin-card {
    background: white;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    padding: 3rem 2rem;
    max-width: 450px;
    width: 100%;
    text-align: center;
  }

  h1 {
    color: #333;
    font-size: 1.75rem;
    font-weight: 600;
    margin: 0 0 1rem 0;
  }

  .welcome-text {
    color: #666;
    font-size: 1rem;
    line-height: 1.6;
    margin: 0 0 2rem 0;
  }

  .signin-buttons {
    margin: 2rem 0;
  }

  .signin-form {
    width: 100%;
  }

  .facebook-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    background-color: #1877f2; /* Facebook brand blue */
    color: white;
    font-size: 1rem;
    font-weight: 600;
    padding: 0.875rem 1.5rem;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    width: 100%;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .facebook-button:hover {
    background-color: #166fe5; /* Slightly darker on hover */
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    transform: translateY(-1px);
  }

  .facebook-button:active {
    transform: translateY(0);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .facebook-button:focus {
    outline: 3px solid #4c9aff;
    outline-offset: 2px;
  }

  .facebook-icon {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }

  .privacy-note {
    color: #999;
    font-size: 0.875rem;
    line-height: 1.5;
    margin: 1.5rem 0 0 0;
  }

  /* Mobile responsiveness */
  @media (max-width: 768px) {
    .signin-card {
      padding: 2rem 1.5rem;
    }

    h1 {
      font-size: 1.5rem;
    }

    .welcome-text {
      font-size: 0.9375rem;
    }
  }

  /* Accessibility: High contrast mode support */
  @media (prefers-contrast: high) {
    .facebook-button {
      border: 2px solid white;
    }
  }

  /* Accessibility: Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .facebook-button {
      transition: none;
    }

    .facebook-button:hover {
      transform: none;
    }
  }
</style>
