# Family Tree Application

A modern family tree management application with interactive genealogy tree visualization. Built with SvelteKit and Drizzle ORM, featuring the family-chart library for family tree visualization and a reactive store architecture.

## Features

### 🔐 Facebook Authentication & Profile Sync

- **Facebook OAuth Login** - Secure authentication via Facebook
- **Auto-Profile Creation** - Your Facebook profile automatically creates your family tree person on first login
- **Profile Photo Import** - Import profile pictures from any Facebook profile
- **Smart Data Import** - Pre-populate name, gender, and birth date from Facebook profiles
- **Profile Indicators** - Visual "Your Profile" badges help you find yourself in the tree
- **Deletion Protection** - Cannot delete your own profile record (data integrity)

### 👥 Family Management

- Add, edit, and delete family members with detailed information
- Define parent-child relationships (mother/father with validation)
- Track spouse/partner relationships
- Automatic sibling computation based on shared parents
- Gender-based color coding across all views
- Photo support with graceful fallback to initials avatars

### 🌳 Family Tree Visualization

- Interactive ancestor tree using family-chart library
- Focus person selector to view any person's ancestry
- Gender-based color coding (male=blue, female=pink)
- Deceased indicators with visual styling
- Built-in zoom and pan controls
- Click person cards to edit information
- Smooth transitions for data updates

### 🎨 Interactive Features

- Click any person to open editing modal
- Responsive hybrid modal design (desktop/tablet/mobile)
- Quick Add workflows for adding related people (children, parents, spouses)
- Optimistic updates for instant UI feedback
- Toast notifications for all actions

### 💾 Data Management

- SQLite database for reliable data persistence
- Drizzle ORM for type-safe database access
- RESTful API via SvelteKit server routes
- Normalized relationship storage
- Support for incomplete data (missing dates handled gracefully)
- Migration management with Drizzle Kit

## Getting Started

### Prerequisites

- Node.js 18+ (or 20+)
- npm or pnpm
- Facebook Developer Account (for OAuth login)

### Installation

```bash
# Clone the repository
git clone https://github.com/cobaltroad/familytree.git
cd familytree

# Install dependencies
npm install

# Configure Facebook OAuth (required for authentication)
cp .env.example .env
# Edit .env and add your Facebook App credentials
# See FACEBOOK_OAUTH_SETUP.md for detailed instructions

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

### Facebook OAuth Setup

The application requires Facebook OAuth for user authentication. See [FACEBOOK_OAUTH_SETUP.md](FACEBOOK_OAUTH_SETUP.md) for complete setup instructions.

**Quick setup:**

1. Create a Facebook app at [developers.facebook.com](https://developers.facebook.com/)
2. Copy App ID and App Secret
3. Generate an AUTH_SECRET: `openssl rand -base64 32`
4. Update `.env` file with credentials
5. Configure OAuth redirect URI in Facebook app settings

**Required environment variables:**

```bash
FACEBOOK_APP_ID=your_app_id_here
FACEBOOK_APP_SECRET=your_app_secret_here
AUTH_SECRET=your_generated_secret_here
```

### Static Site Deployment (Viewer Mode)

Deploy as a read-only static site to GitHub Pages, Netlify, or Vercel:

```bash
# Export data from database to static JSON files
npm run export-data

# Build with viewer mode enabled (hides all edit controls)
VITE_VIEWER_MODE=true npm run build

# Preview the static build locally
npm run preview
```

**Viewer Mode** disables all editing features for static deployments:
- Hides Add Person button, Quick Add controls, delete buttons
- Prevents modal from opening for editing
- Filters navigation to only viewer-compatible tabs (Tree view only)
- Preserves all viewing and navigation functionality

See [VIEWER_MODE.md](VIEWER_MODE.md) for complete deployment instructions.

### Database Management

```bash
# Open Drizzle Studio (database GUI)
npm run db:studio

# Generate migrations from schema changes
npx drizzle-kit generate

# Apply migrations
npx drizzle-kit migrate

# Push schema directly (development)
npx drizzle-kit push
```

### Navigation

Once running, access different views:
- **Tree View**: http://localhost:5173/ or http://localhost:5173/#/tree (default)
- **Duplicates**: http://localhost:5173/#/duplicates
- **Import**: http://localhost:5173/#/gedcom/import
- **Admin**: http://localhost:5173/#/admin

## Tech Stack

- **Frontend:** Svelte 4, family-chart v0.9.0 for genealogy tree visualization
- **Backend:** SvelteKit server routes
- **Database:** SQLite with Drizzle ORM
- **Authentication:** Auth.js with Facebook OAuth provider
- **Testing:** Vitest (2,997 tests with comprehensive coverage)
- **Build Tool:** Vite
- **Routing:** Hash-based client-side navigation

## Project Structure

```
familytree/
├── src/
│   ├── routes/
│   │   ├── api/              # SvelteKit server routes (API endpoints)
│   │   │   ├── people/       # Person CRUD operations
│   │   │   └── relationships/ # Relationship CRUD operations
│   │   └── +page.svelte      # Main application page
│   ├── lib/
│   │   ├── TreeView.svelte         # Main tree visualization (family-chart)
│   │   ├── DuplicateDetection.svelte  # Duplicate detection tool
│   │   ├── ImportView.svelte       # GEDCOM import workflow
│   │   ├── AdminView.svelte        # Database inspection
│   │   ├── PersonModal.svelte      # Person editing modal
│   │   ├── ViewSwitcher.svelte     # Navigation tabs
│   │   ├── components/             # Reusable components
│   │   │   ├── modal/              # Modal-specific components
│   │   │   └── ...
│   │   ├── stores/                 # State management (Svelte stores)
│   │   │   ├── familyStore.js      # Core data stores
│   │   │   ├── derivedStores.js    # Computed stores
│   │   │   ├── modalStore.js       # Modal state
│   │   │   └── actions/            # Action creators
│   │   ├── db/                     # Drizzle schema and database client
│   │   │   ├── schema.js           # Database schema
│   │   │   └── client.js           # Database connection
│   │   ├── server/                 # Server-only business logic
│   │   ├── treeHelpers.js          # Tree manipulation utilities
│   │   └── api.js                  # API client
├── plans/                    # Architecture documentation
├── familytree.db             # SQLite database
└── package.json
```

## Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run test         # Run tests once
npm run test:watch   # Run tests in watch mode
npm run test:ui      # Run tests with UI
npm run db:studio    # Open Drizzle Studio (database GUI)
```

### Architecture

The application uses a reactive store architecture with Svelte stores for state management:
- `familyStore.js` - Core data (people, relationships)
- `derivedStores.js` - Computed values (family tree, lookups)
- `modalStore.js` - Modal state
- `notificationStore.js` - Toast notifications

See [CLAUDE.md](CLAUDE.md) for comprehensive architecture documentation, component structure, and development guidelines.

## Documentation

- [CLAUDE.md](CLAUDE.md) - Detailed architecture and development guide
- [FACEBOOK_OAUTH_SETUP.md](FACEBOOK_OAUTH_SETUP.md) - Facebook OAuth configuration guide
- [CHANGELOG.md](CHANGELOG.md) - Version history and release notes
- [/plans/SVELTEKIT_DRIZZLE_MIGRATION.md](/plans/SVELTEKIT_DRIZZLE_MIGRATION.md) - Migration technical analysis
- [/plans/MIGRATION_USER_STORIES.md](/plans/MIGRATION_USER_STORIES.md) - User stories and acceptance criteria

## Migration History

This application was migrated from a Go backend + Svelte frontend architecture to a unified SvelteKit full-stack framework with Drizzle ORM in December 2025. The migration simplified the development workflow, improved type safety, and reduced codebase complexity. See the documentation links above for detailed information about the migration process and benefits.

## License

MIT
