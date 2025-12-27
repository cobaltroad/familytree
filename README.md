# Family Tree Application

A modern family tree management application with multiple visualization modes. Built with SvelteKit and Drizzle ORM, featuring interactive D3.js visualizations and a reactive store architecture.

## Features

### 🔐 Facebook Authentication & Profile Sync

- **Facebook OAuth Login** - Secure authentication via Facebook
- **Auto-Profile Creation** - Your Facebook profile automatically creates your family tree person on first login
- **Profile Photo Import** - Import profile pictures from any Facebook profile
- **Smart Data Import** - Pre-populate name, gender, and birth date from Facebook profiles
- **Profile Indicators** - Visual "Your Profile" badges help you find yourself in the tree
- **Deletion Protection** - Cannot delete your own profile record (data integrity)

### 🌳 Multiple Visualization Views

Explore your family tree data from different perspectives:

- **Pedigree View** - Compact ancestor chart focusing on a selected person's lineage (default, auto-focuses on your profile)
- **Timeline View** - Chronological lifespan visualization with sortable horizontal bars
- **Radial View** - Circular fan chart with ancestors in concentric generational rings (auto-focuses on your profile)

### 👥 Family Management

- Add, edit, and delete family members with detailed information
- Define parent-child relationships (mother/father with validation)
- Track spouse/partner relationships
- Automatic sibling computation based on shared parents
- Gender-based color coding across all views
- Photo support with graceful fallback to initials avatars

### 🎨 Interactive Features

- Click any person in any view to edit their information
- Zoom and pan controls on tree visualizations
- Focus person selector for Pedigree and Radial views
- Filter controls (show/hide living/deceased in Timeline)
- Sort by birth year or generation in Timeline view
- Responsive hybrid modal design (desktop/tablet/mobile)
- Quick Add workflows for adding related people
- Optimistic updates for instant UI feedback

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
- **Pedigree View**: http://localhost:5173/ or http://localhost:5173/#/pedigree (default)
- **Timeline View**: http://localhost:5173/#/timeline
- **Radial View**: http://localhost:5173/#/radial

## Tech Stack

- **Frontend:** Svelte 4, D3.js v7.9.0 for visualizations
- **Backend:** SvelteKit server routes
- **Database:** SQLite with Drizzle ORM
- **Authentication:** Auth.js with Facebook OAuth provider
- **Testing:** Vitest (1,840+ tests)
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
│   │   ├── components/       # Svelte components
│   │   │   ├── views/        # Visualization views (Pedigree, Timeline, Radial)
│   │   │   ├── modal/        # PersonModal and related components
│   │   │   └── ...
│   │   ├── stores/           # State management (Svelte stores)
│   │   │   ├── familyStore.js      # Core data stores
│   │   │   ├── derivedStores.js    # Computed stores
│   │   │   ├── modalStore.js       # Modal state
│   │   │   └── actions/            # Action creators
│   │   ├── db/               # Drizzle schema and database client
│   │   │   ├── schema.js     # Database schema
│   │   │   └── client.js     # Database connection
│   │   ├── server/           # Server-only business logic
│   │   ├── treeHelpers.js    # Shared tree utilities
│   │   ├── d3Helpers.js      # Shared D3 utilities
│   │   └── api.js            # API client
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
