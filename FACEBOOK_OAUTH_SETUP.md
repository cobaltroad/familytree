# Facebook OAuth Configuration Setup

This document explains how Facebook OAuth authentication is configured for the Family Tree application.

## Overview

The application uses Facebook OAuth 2.0 for user authentication. All configuration is managed through environment variables loaded from a `.env` file.

## Files Created

### 1. Environment Configuration
- **`.env`** - Contains actual credentials (NEVER commit to version control)
- **`.env.example`** - Template file for other developers (safe to commit)

### 2. Configuration Module
- **`src/lib/server/config.js`** - Loads and validates Facebook OAuth configuration
- **`src/lib/server/config.test.js`** - Unit tests for configuration module (25 tests)
- **`src/lib/server/config.integration.test.js`** - Integration tests with real .env file (10 tests)

### 3. Test Setup
- **`src/test/setup.js`** - Updated to load .env file for testing using dotenv

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `FACEBOOK_APP_ID` | Facebook application ID | `1226075142824729` |
| `FACEBOOK_APP_SECRET` | Facebook application secret key | `fffd3c97ffe11383db34eff40605b067` |
| `AUTH_SECRET` | Session encryption key (min 32 chars) | Generate with: `openssl rand -base64 32` |

### Optional Variables (with defaults)

| Variable | Description | Default |
|----------|-------------|---------|
| `FACEBOOK_CALLBACK_URL` | OAuth redirect URI | `http://localhost:5173/auth/callback/facebook` |
| `FACEBOOK_API_VERSION` | Facebook Graph API version | `v19.0` |
| `FACEBOOK_SCOPES` | Comma-separated OAuth scopes | `email,public_profile` |

## Usage

### Loading Configuration

```javascript
import { getAuthConfig } from '$lib/server/config.js'

// Load configuration from environment variables
const config = getAuthConfig()

// Access Facebook OAuth settings
console.log(config.facebook.appId)       // '1226075142824729'
console.log(config.facebook.appSecret)   // 'fffd3c97ffe11383db34eff40605b067'
console.log(config.facebook.callbackUrl) // 'http://localhost:5173/auth/callback/facebook'
console.log(config.authSecret)           // Session encryption key
```

### Configuration Object Structure

```javascript
{
  facebook: {
    appId: string,          // Facebook App ID
    appSecret: string,      // Facebook App Secret
    callbackUrl: string,    // OAuth redirect URI
    apiVersion: string,     // Facebook API version (e.g., 'v19.0')
    scopes: string         // Comma-separated scopes (e.g., 'email,public_profile')
  },
  authSecret: string       // Session encryption key (min 32 characters)
}
```

## Validation

The configuration module automatically validates:

1. **Required Variables**: Throws error if `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, or `AUTH_SECRET` are missing
2. **AUTH_SECRET Length**: Must be at least 32 characters for secure encryption
3. **Callback URL Format**: Must be a valid URL (http:// or https://)
4. **Non-Empty Values**: All required fields must contain non-empty strings

## Error Handling

The module throws descriptive errors for common issues:

```javascript
// Missing required variable
throw new Error('Missing required environment variable: FACEBOOK_APP_ID')

// AUTH_SECRET too short
throw new Error('AUTH_SECRET must be at least 32 characters long for secure encryption')

// Invalid callback URL
throw new Error('Invalid configuration: facebook.callbackUrl must be a valid URL')
```

## Setup Instructions for New Developers

1. **Copy the template file**:
   ```bash
   cp .env.example .env
   ```

2. **Get Facebook credentials**:
   - Go to [Facebook Developer Console](https://developers.facebook.com/)
   - Create a new app or select existing app
   - Navigate to App Dashboard > Settings > Basic
   - Copy App ID and App Secret

3. **Generate AUTH_SECRET**:
   ```bash
   openssl rand -base64 32
   ```
   or
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

4. **Edit .env file**:
   - Replace `your_facebook_app_id_here` with your App ID
   - Replace `your_facebook_app_secret_here` with your App Secret
   - Replace the AUTH_SECRET with your generated secret
   - Update callback URL if needed (default works for local development)

5. **Configure Facebook App**:
   - In Facebook Developer Console, add OAuth redirect URI:
     - Development: `http://localhost:5173/auth/callback/facebook`
     - Production: `https://yourdomain.com/auth/callback/facebook`

## Security Best Practices

1. **Never commit .env file**: Already included in `.gitignore`
2. **Rotate secrets regularly**: Generate new AUTH_SECRET periodically
3. **Use HTTPS in production**: Always use https:// callback URLs in production
4. **Limit OAuth scopes**: Only request permissions your app actually needs
5. **Store secrets securely**: Use environment variables or secret management services in production

## Testing

The configuration is fully tested with TDD methodology:

### Unit Tests (25 tests)
```bash
npm test -- src/lib/server/config.test.js
```

Tests cover:
- Environment variable loading with defaults
- Required variable validation
- AUTH_SECRET length validation
- Empty string handling
- Configuration object validation
- Callback URL format validation

### Integration Tests (10 tests)
```bash
npm test -- src/lib/server/config.integration.test.js
```

Tests verify:
- Real .env file loading
- Actual credential values
- Configuration object structure
- URL format validation
- Non-empty value validation

### Run All Config Tests
```bash
npm test -- src/lib/server/config
```

Expected output:
```
✓ src/lib/server/config.integration.test.js (10 tests)
✓ src/lib/server/config.test.js (25 tests)

Test Files  2 passed (2)
Tests  35 passed (35)
```

## TDD Methodology Applied

This configuration was developed using strict Test-Driven Development:

1. **RED Phase**: Wrote 25 failing tests defining expected behavior
2. **GREEN Phase**: Implemented minimal code to make all tests pass
3. **REFACTOR Phase**: Extracted constants and helper functions for DRY code

### Refactoring Improvements

- Extracted magic numbers to named constants (`MIN_AUTH_SECRET_LENGTH`)
- Created reusable helper functions (`requireEnvVar`, `requireConfigField`)
- Improved error messages with consistent formatting
- Added comprehensive JSDoc documentation

## Dependencies

- **dotenv** (`^17.2.3`): Loads environment variables from .env file
  - Installed as dev dependency: `npm install --save-dev dotenv`
  - Automatically loaded in test setup (`src/test/setup.js`)

## Next Steps

This configuration module is ready for integration with:

1. **Auth.js (formerly NextAuth.js)**: Use config for Facebook provider setup
2. **SvelteKit Hooks**: Load config in server hooks for authentication middleware
3. **Session Management**: Use `authSecret` for JWT signing and session encryption
4. **User Profile Sync**: Use Facebook API version and scopes for Graph API calls

## Related Issues

- **GitHub Issue #71**: Facebook Meta OAuth2 Authentication
- **Database Schema**: Users and sessions tables already created (see `src/lib/db/schema.js`)

## Support

For questions or issues:
1. Check Facebook Developer Documentation: https://developers.facebook.com/docs/
2. Review Auth.js documentation: https://authjs.dev/
3. Check this repository's issues on GitHub
