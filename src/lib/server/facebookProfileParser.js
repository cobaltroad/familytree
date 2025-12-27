/**
 * Facebook Profile URL Parser
 * Stories #78 and #80: Facebook Profile Picture Import and Data Pre-population
 *
 * Parses various Facebook profile URL formats to extract user ID or username.
 * This allows users to provide a Facebook profile URL and have the system
 * extract the identifier needed for Graph API calls.
 *
 * Supported formats:
 * - facebook.com/username
 * - facebook.com/profile.php?id=12345
 * - facebook.com/people/name/12345
 * - Direct user ID or username
 *
 * Returns null for invalid inputs or reserved Facebook paths.
 */

/**
 * Reserved Facebook paths that are not user profiles
 * These are system pages, help pages, etc.
 */
const RESERVED_PATHS = [
  'help',
  'privacy',
  'policies',
  'pages',
  'groups',
  'events',
  'marketplace',
  'watch',
  'gaming',
  'messages',
  'notifications',
  'settings',
  'bookmarks',
  'profile.php' // Will be handled separately
]

/**
 * Parses a Facebook profile URL to extract user ID or username
 *
 * @param {string} input - Facebook profile URL, user ID, or username
 * @returns {string|null} User ID or username, or null if invalid
 *
 * @example
 * parseFacebookProfileUrl('facebook.com/zuck') // 'zuck'
 * parseFacebookProfileUrl('facebook.com/profile.php?id=12345') // '12345'
 * parseFacebookProfileUrl('facebook.com/people/John-Doe/12345') // '12345'
 * parseFacebookProfileUrl('12345') // '12345'
 * parseFacebookProfileUrl('https://facebook.com/help') // null (reserved)
 */
export function parseFacebookProfileUrl(input) {
  // Validate input
  if (!input || typeof input !== 'string' || input.trim() === '') {
    return null
  }

  const trimmedInput = input.trim()

  // Direct user ID (numeric only)
  if (/^\d+$/.test(trimmedInput)) {
    return trimmedInput
  }

  // Direct username (alphanumeric with dots/dashes, no slashes)
  if (/^[a-zA-Z0-9._-]+$/.test(trimmedInput) && !trimmedInput.includes('/')) {
    return trimmedInput
  }

  // Try to parse as URL
  try {
    let urlToParse = trimmedInput

    // Add protocol if missing for URL parsing
    if (!urlToParse.match(/^https?:\/\//)) {
      urlToParse = 'https://' + urlToParse
    }

    const url = new URL(urlToParse)

    // Validate it's a Facebook domain
    const hostname = url.hostname.toLowerCase()
    if (!hostname.endsWith('facebook.com')) {
      return null
    }

    // Get pathname without leading slash
    const pathname = url.pathname.replace(/^\//, '')

    // Handle empty pathname (just facebook.com or facebook.com/)
    if (!pathname) {
      return null
    }

    // Handle profile.php?id=12345
    if (pathname === 'profile.php' || pathname.startsWith('profile.php')) {
      const id = url.searchParams.get('id')
      if (id && /^\d+$/.test(id)) {
        return id
      }
      return null
    }

    // Handle people URLs: /people/name/12345
    if (pathname.startsWith('people/')) {
      const parts = pathname.split('/')
      // Format: people/name/id
      if (parts.length >= 3) {
        const id = parts[2]
        if (id && /^\d+$/.test(id)) {
          return id
        }
      }
      return null
    }

    // Extract username from pathname
    // Remove trailing slash and get first path segment
    const pathSegment = pathname.replace(/\/$/, '').split('/')[0]

    // Check if it's a reserved path
    if (RESERVED_PATHS.includes(pathSegment.toLowerCase())) {
      return null
    }

    // Validate username format (alphanumeric with dots, dashes, underscores)
    if (/^[a-zA-Z0-9._-]+$/.test(pathSegment)) {
      return pathSegment
    }

    return null
  } catch (error) {
    // URL parsing failed, return null
    return null
  }
}
