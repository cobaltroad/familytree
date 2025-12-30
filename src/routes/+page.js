/**
 * Page Configuration
 *
 * This page requires authentication. SSR is disabled to ensure
 * client-side rendering with session data from the layout.
 */

// Disable server-side rendering (client-side only with session data from layout)
export const ssr = false

// Cannot prerender authenticated pages
export const prerender = false
