/**
 * Root Layout Server Load Function
 *
 * Runs on the server for every page request.
 * Loads session data and makes it available to all pages via $page.data.session.
 *
 * This allows components to access authentication state:
 * ```svelte
 * <script>
 *   import { page } from '$app/stores'
 *   $: session = $page.data.session
 *   $: user = session?.user
 * </script>
 * ```
 *
 * @param {Object} event - SvelteKit request event
 * @returns {Promise<Object>} Object containing session data
 */
export async function load(event) {
  try {
    // Get session from Auth.js via event.locals
    if (event.locals && typeof event.locals.getSession === 'function') {
      const session = await event.locals.getSession()
      return {
        session
      }
    }

    // No getSession available (shouldn't happen in production)
    return {
      session: null
    }
  } catch (error) {
    // Log error but don't break the app
    console.error('Error loading session in layout:', error)

    // Return null session on error
    return {
      session: null
    }
  }
}
