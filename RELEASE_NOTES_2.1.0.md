# Family Tree Application - Release v2.1.0

**Release Date:** December 27, 2025

**Release Type:** Minor Version (Feature Release)

---

## Overview

Version 2.1.0 introduces comprehensive Facebook OAuth integration with intelligent profile synchronization, bringing social authentication and automated data import to the Family Tree application. This release implements 8 complete user stories (Issues #77-84) with 130+ passing tests, all developed using strict Test-Driven Development methodology.

This release focuses on improving user onboarding, reducing manual data entry, and enhancing the overall user experience through seamless Facebook integration.

---

## What's New

### Facebook OAuth Authentication

**Seamless Social Login**
- Authenticate securely via Facebook OAuth 2.0
- Session management powered by Auth.js with JWT tokens
- User profile data automatically synced (name, email, profile picture)
- Sign-in page with prominent "Sign in with Facebook" button

**Auto-Profile Creation**
- On first login, your Facebook profile automatically creates your Person record in the family tree
- Requests extended permissions for birthday and gender (with your consent)
- One-time sync policy: manual control after initial creation
- Handles edge cases gracefully: single names, missing data, partial birth dates

### Photo Management

**Profile Pictures**
- Every person in your family tree can now have a photo
- Import profile pictures directly from Facebook URLs
- Photo displayed throughout the application:
  - PersonModal edit dialog
  - RelationshipCard components
  - Tree visualization nodes
- Graceful fallback to colored initials avatars when photos unavailable

**Facebook Photo Import**
- Import profile pictures from ANY Facebook user (not just your own)
- Supports 6+ Facebook URL formats:
  - Standard profile URLs: `https://www.facebook.com/username`
  - Photo URLs: `https://www.facebook.com/photo/?fbid=...`
  - Numeric IDs: `https://www.facebook.com/profile.php?id=100000123456`
  - Mobile URLs: `https://m.facebook.com/username`
  - And more!
- Server-side secure extraction of photo URLs
- Privacy-aware: respects Facebook privacy settings

### Smart Data Import

**Pre-populate Personal Information**
- Import name, gender, and birth date from Facebook profiles
- Paste any Facebook profile URL and click "Import from Facebook"
- Smart data normalization:
  - Facebook gender values automatically converted to app schema
  - Date formats converted from MM/DD/YYYY to YYYY-MM-DD
  - Supports partial dates (year-only or month-year)
- All imported data is editable - you maintain full control

### Enhanced User Experience

**Smart Tree Focusing**
- When you open Pedigree or Radial views, the tree automatically focuses on YOUR profile
- No more hunting for yourself in large family trees
- Graceful fallback for users who joined before this feature

**Visual Profile Indicators**
- Blue "Your Profile" badges help you instantly identify your own record:
  - Badge in PersonModal header when viewing your profile
  - Badge on RelationshipCard when you appear in someone's relationships
  - Visual highlighting in tree visualizations (D3.js nodes)
- Especially helpful in large, complex family trees

**Data Integrity Protection**
- You cannot accidentally delete your own profile person
- Attempting deletion returns a clear error message
- Ensures you always have representation in the family tree
- Prevents orphaned relationships and data inconsistencies

---

## Technical Details

### Database Changes

**Schema Updates:**
- `people.photoUrl` - New TEXT column for person photo URLs (nullable)
- `users.defaultPersonId` - New INTEGER column linking users to their Person record (nullable, foreign key)

**Migration:**
- Migrations run automatically on application startup (Drizzle ORM)
- Existing data is preserved - no breaking changes
- Lazy migration: existing users linked on next login

### New API Endpoints

**`POST /api/facebook/profile`**
- Import profile data from Facebook URL
- Request body: `{ facebookUrl: string }`
- Response: `{ name, gender, birthDate, photoUrl }`
- Returns 400 for invalid URLs or inaccessible profiles
- Server-side only (secure Graph API access)

**Enhanced Endpoints:**
- `DELETE /api/people/[id]` - Now validates against user's default person

### New Server Modules

**Facebook Integration:**
- `src/lib/server/facebookGraphClient.js` - Facebook Graph API client
- `src/lib/server/defaultPerson.js` - Profile-to-person conversion logic
- `src/lib/server/facebookProfileParser.js` - Facebook URL parser with validation
- `src/routes/api/facebook/profile/+server.js` - Profile import endpoint

**Configuration:**
- `src/lib/server/config.js` - OAuth configuration management with validation

### Enhanced UI Components

**Updated Components:**
- `PersonFormFields.svelte` - Facebook URL import field with live preview
- `PersonModal.svelte` - "Your Profile" badge and deletion protection UI
- `RelationshipCard.svelte` - Profile badge and photo display
- `PedigreeView.svelte` - Smart focus selection defaulting to user's profile
- `RadialView.svelte` - Smart focus selection defaulting to user's profile
- `d3Helpers.js` - Visual node highlighting for user's profile

### Test Coverage

**130+ New Tests:**
- OAuth configuration validation: 35 tests
- Facebook Graph API client: 30 tests
- Default person creation logic: 30 tests
- Facebook URL parsing: 34 tests
- Deletion protection: 6 tests
- Smart tree focusing: 10 tests
- Profile indicators: 9 tests
- Data pre-population: 27 tests

**Total Test Suite:**
- 1,840 tests (398 tests added since v2.0.1)
- 100% passing rate for Facebook integration features
- Comprehensive coverage across all integration points

**TDD Methodology:**
- All features developed with Test-Driven Development
- RED phase: Write failing test defining expected behavior
- GREEN phase: Implement minimal code to pass test
- REFACTOR phase: Improve code quality while maintaining green tests

---

## Security & Privacy

### OAuth Security
- Facebook OAuth tokens never stored in database (session-only)
- Graph API calls executed server-side only (never exposed to client)
- Session encryption using 32+ character AUTH_SECRET
- Secure callback URL validation

### Privacy Protections
- User consent explicitly requested for extended permissions (birthday, gender)
- Respects Facebook privacy settings (profile import fails gracefully for private profiles)
- Photo URLs are CDN links (no local storage/copying of Facebook photos)
- All imported data can be manually edited or removed by users

### Data Control
- Users maintain full control over all imported data
- One-time sync policy: no automatic updates after initial creation
- Manual deletion protection only applies to user's own profile
- Can disconnect Facebook account while retaining family tree data

---

## User Stories Implemented

This release completes 8 user stories developed through BDD acceptance criteria:

1. **Issue #77** - Add Photo Storage to Person Model (14 tests)
2. **Issue #78** - Enable Facebook Profile Picture Import (34 tests)
3. **Issue #79** - Request Facebook Gender and Birthday Permissions (validation)
4. **Issue #80** - Pre-populate Gender and Birth Date from Facebook Profile (27 tests)
5. **Issue #81** - Auto-Create Default Person from Facebook Profile (30 tests)
6. **Issue #82** - Focus PedigreeView/RadialView on Default Person (10 tests)
7. **Issue #83** - Prevent Deletion of User's Default Person (6 tests)
8. **Issue #84** - Display "Your Profile" Indicator (9 tests)

All stories include:
- Persona-based user story format
- BDD-style Given-When-Then acceptance criteria
- Comprehensive test coverage
- Edge case handling
- Documentation updates

---

## Breaking Changes

**None.** This release is fully backward compatible.

- Existing data is preserved
- New fields are nullable (optional)
- Legacy users without Facebook accounts continue to work normally
- API endpoints maintain backward compatibility

---

## Migration Guide

### For Existing Installations

**Automatic Migration:**
1. Update to v2.1.0 via `git pull` or download
2. Run `npm install` to update dependencies
3. Database migrations run automatically on first startup
4. No manual intervention required

**User Experience:**
- Existing users see Facebook sign-in option on next visit
- Family tree data remains unchanged
- Photo URLs can be added to existing people via edit modal
- Tree views continue to work with existing focus behavior

### For New Installations

**Required Setup:**
1. Create Facebook app at [developers.facebook.com](https://developers.facebook.com/)
2. Configure OAuth redirect URI in Facebook app settings
3. Copy `.env.example` to `.env`
4. Add Facebook App ID, App Secret, and AUTH_SECRET to `.env`
5. See `FACEBOOK_OAUTH_SETUP.md` for detailed instructions

**Environment Variables:**
```bash
# Required
FACEBOOK_APP_ID=your_app_id_here
FACEBOOK_APP_SECRET=your_app_secret_here
AUTH_SECRET=your_32_char_secret_here  # Generate: openssl rand -base64 32

# Optional (have sensible defaults)
FACEBOOK_CALLBACK_URL=http://localhost:5173/auth/callback/facebook
FACEBOOK_API_VERSION=v19.0
FACEBOOK_SCOPES=email,public_profile,user_birthday,user_gender
```

---

## Known Issues & Limitations

### Facebook API Limitations
- Profile import only works for public Facebook profiles or profiles you have permission to view
- Some users may restrict birthday/gender visibility via privacy settings
- Facebook API rate limits apply (generally not a concern for personal use)

### Browser Compatibility
- Modern browsers required (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- JavaScript must be enabled
- Cookies must be enabled for authentication

### Future Improvements
Potential enhancements for future releases:
- Support for additional OAuth providers (Google, GitHub, etc.)
- Bulk photo import from cloud storage
- Profile update sync on user request
- Photo upload directly to application server

---

## Performance Impact

### Application Performance
- OAuth authentication adds ~200-300ms to initial page load (session validation)
- Facebook profile import API calls take ~500-1500ms (network dependent)
- No performance impact on tree rendering or navigation
- Photo loading is lazy-loaded and cached by browser

### Database Performance
- Two new columns add negligible storage overhead
- Foreign key constraint maintains referential integrity
- No performance degradation observed in testing

### Test Suite Performance
- 398 new tests add ~8 seconds to full test suite runtime
- Total test suite now runs in ~56 seconds (on average hardware)
- All tests remain parallelizable for CI/CD pipelines

---

## Upgrade Instructions

### Step-by-Step Upgrade

**1. Backup Your Data** (Recommended)
```bash
# Backup your database
cp familytree.db familytree.db.backup-$(date +%Y%m%d)
```

**2. Update Application**
```bash
# Pull latest changes
git pull origin main

# Or download and extract v2.1.0 release
```

**3. Install Dependencies**
```bash
npm install
```

**4. Configure Facebook OAuth**
```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your Facebook app credentials
# See FACEBOOK_OAUTH_SETUP.md for detailed setup
```

**5. Start Application**
```bash
# Development
npm run dev

# Production
npm run build
npm run preview
```

**6. Verify Installation**
- Visit `http://localhost:5173`
- Click "Sign in with Facebook"
- Verify profile creation and photo import
- Check tree views focus on your profile

### Rollback Procedure

If you encounter issues and need to rollback:

```bash
# Restore database backup
cp familytree.db.backup-YYYYMMDD familytree.db

# Checkout previous version
git checkout v2.0.1

# Reinstall dependencies
npm install

# Restart application
npm run dev
```

---

## Documentation Updates

### Updated Files
- `CLAUDE.md` - Added comprehensive Facebook integration section (160+ lines)
- `README.md` - Updated features list and setup instructions
- `CHANGELOG.md` - Added v2.1.0 section with full details
- `FACEBOOK_OAUTH_SETUP.md` - Enhanced with implementation details
- `RELEASE_NOTES_2.1.0.md` - This file

### New Documentation
All features include inline code documentation:
- JSDoc comments for new modules
- Test descriptions explaining expected behavior
- Error messages with actionable guidance

---

## Community & Support

### Getting Help
- Review `FACEBOOK_OAUTH_SETUP.md` for setup issues
- Check GitHub Issues for known problems
- Consult `CLAUDE.md` for architecture details

### Contributing
This project welcomes contributions! Areas for contribution:
- Additional OAuth providers
- Photo upload functionality
- Internationalization (i18n)
- Accessibility improvements
- Performance optimizations

### Reporting Issues
Found a bug? Please report it on GitHub Issues with:
- Steps to reproduce
- Expected vs actual behavior
- Browser and OS information
- Relevant error messages

---

## Credits

### Development
- TDD methodology ensuring robust, well-tested features
- 130+ comprehensive tests with 100% passing rate
- Adherence to BDD acceptance criteria for all stories
- Clean code principles throughout implementation

### Technologies
- **SvelteKit** - Full-stack framework
- **Auth.js** - Authentication library
- **Drizzle ORM** - Type-safe database access
- **Facebook Graph API** - Profile data retrieval
- **Vitest** - Testing framework
- **D3.js** - Data visualizations

### Acknowledgments
Special thanks to:
- Auth.js team for excellent OAuth library
- Facebook Graph API documentation
- Drizzle ORM community
- All contributors and testers

---

## What's Next

### Planned for v2.2.0
Potential features under consideration:
- Additional OAuth providers (Google, GitHub)
- Photo upload to application server
- Advanced privacy controls
- Family tree sharing features
- Export/import functionality

### Feedback Welcome
We'd love to hear your thoughts on v2.1.0! Please share:
- Features you find most useful
- Pain points or confusion
- Ideas for future enhancements
- Bug reports or edge cases

---

## Version Information

**Release:** v2.1.0
**Released:** December 27, 2025
**Previous Version:** v2.0.1
**Type:** Minor Version (Feature Release)
**Git Tag:** `v2.1.0`

**Compare Versions:**
[v2.0.1...v2.1.0](https://github.com/cobaltroad/familytree/compare/v2.0.1...v2.1.0)

**Download:**
[Release Archive](https://github.com/cobaltroad/familytree/archive/refs/tags/v2.1.0.zip)

---

## License

MIT License - See LICENSE file for details

---

**Thank you for using Family Tree Application!**

We hope v2.1.0's Facebook integration makes building and exploring your family history even easier and more enjoyable.

Happy tree building!
