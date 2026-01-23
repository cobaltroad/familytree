# Static Site Build Documentation

This document describes the static site generation configuration for the Family Tree application.

## Overview

As of Story #147, the application is configured to build as a fully static site using `@sveltejs/adapter-static`. This enables deployment to static hosting platforms like GitHub Pages, Netlify, Vercel, CloudFlare Pages, and AWS S3.

## Build Configuration

### Adapter Configuration

The application uses `@sveltejs/adapter-static` configured in `svelte.config.js`:

```javascript
import adapter from '@sveltejs/adapter-static';

const config = {
  kit: {
    adapter: adapter({
      pages: 'build',       // Output directory for HTML pages
      assets: 'build',      // Output directory for assets
      fallback: 'index.html', // SPA fallback for client-side routing
      precompress: false,   // Disable precompression (can be enabled for production)
      strict: false         // Allow mixed prerendering (some routes prerendered, others not)
    })
  }
};
```

### Prerendering Configuration

The root page (`src/routes/+page.js`) is configured for prerendering:

```javascript
export const ssr = false       // Client-side rendering only
export const prerender = true  // Generate static HTML during build
```

The root layout (`src/routes/+layout.js`) enables client-side routing:

```javascript
export const csr = true  // Enable client-side routing
export const ssr = true  // Keep SSR enabled for build-time rendering
```

## Build Process

### 1. Export Static Data

Before building, export your database to static JSON files:

```bash
npm run export-data
```

This creates:
- `static/data/people.json` - All person records (excluding sensitive fields)
- `static/data/relationships.json` - All relationship records

### 2. Build Static Site

Generate the static site:

```bash
npm run build
```

This produces a `build/` directory containing:
- `index.html` - Main entry point and SPA fallback
- `_app/` - JavaScript bundles and CSS
- `data/` - Exported JSON data files
- `.nojekyll` - GitHub Pages compatibility file

### 3. Preview Locally

Test the static build locally:

```bash
npm run preview
```

This serves the `build/` directory on `http://localhost:4173` (or another available port).

## What's Included

The static build includes:

- All Svelte components compiled to JavaScript
- family-chart library and dependencies
- CSS stylesheets
- Static data files (people.json, relationships.json)
- Client-side routing logic
- Hash-based navigation (#/tree, #/duplicates, etc.)

## What's NOT Included

The static build does NOT include:

- Server-side API routes (`src/routes/api/`)
- Database connections (better-sqlite3, Drizzle ORM)
- Authentication system (Auth.js, Facebook OAuth)
- Server-side rendering capabilities
- Real-time data updates

## Client-Side Routing

The application uses hash-based routing for compatibility with static hosting:

- `#/` or `#/tree` - Tree visualization (default)
- `#/duplicates` - Duplicate detection
- `#/import` - GEDCOM import workflow
- `#/admin` - Admin view

The `fallback: 'index.html'` configuration ensures all routes serve the same HTML file, allowing the client-side router to handle navigation.

## Deployment Platforms

### GitHub Pages

1. Build the static site: `npm run build`
2. Push the `build/` directory to the `gh-pages` branch
3. Configure GitHub Pages to serve from the `gh-pages` branch
4. The `.nojekyll` file ensures the `_app/` directory is not ignored

### Netlify

1. Connect your repository to Netlify
2. Set build command: `npm run export-data && npm run build`
3. Set publish directory: `build`
4. Deploy

### Vercel

1. Connect your repository to Vercel
2. Set build command: `npm run export-data && npm run build`
3. Set output directory: `build`
4. Deploy

### Other Platforms

Any static hosting platform that can serve a directory of HTML/JS/CSS files will work:

- CloudFlare Pages
- AWS S3 + CloudFront
- Azure Static Web Apps
- Google Cloud Storage + CDN
- Firebase Hosting

## Build Output Size

Expected build sizes (as of v2.2.2):

- Total build size: ~1.5-2MB (compressed)
- Core app bundle: ~500KB (compressed)
- family-chart library: ~200KB (compressed)
- CSS: ~15KB (compressed)

## Testing

The build configuration is validated by automated tests:

- `src/tests/build/static-adapter.test.js` - Configuration and build output validation
- `src/tests/build/static-preview.test.js` - Preview and deployment compatibility tests

Run build tests:

```bash
npm test -- src/tests/build/
```

## Limitations

### No Server-Side Features

Since this is a static build, the following features are not available:

- User authentication (Facebook OAuth login)
- Database CRUD operations (create/update/delete people and relationships)
- GEDCOM file uploads and parsing
- Dynamic data loading from database

### Read-Only Mode

The static build is essentially a **read-only viewer** for pre-exported family tree data. To use full CRUD functionality:

1. Run the development server: `npm run dev`
2. Use the full application with database and authentication
3. Export data periodically for static site updates: `npm run export-data && npm run build`

## Troubleshooting

### Build Fails with API Route Errors

If the build fails due to server-side code:

1. Ensure `strict: false` is set in `svelte.config.js`
2. Check that API routes don't have `prerender: true` exports
3. Server routes are automatically excluded from the static build

### Static Data Not Found

If the build doesn't include data files:

1. Run `npm run export-data` before building
2. Check that `static/data/people.json` and `relationships.json` exist
3. Verify files are copied to `build/data/` after build

### Client-Side Routing Not Working

If routes don't work after deployment:

1. Ensure `fallback: 'index.html'` is configured in `svelte.config.js`
2. Check that your hosting platform serves `index.html` for 404s
3. Verify hash-based routing is working (URLs should have `#/` prefix)

### GitHub Pages Shows 404 for _app Directory

If `_app/` assets fail to load on GitHub Pages:

1. Ensure `.nojekyll` file exists in `static/` directory
2. Rebuild to include `.nojekyll` in `build/` directory
3. Push updated build to `gh-pages` branch

## Future Enhancements

Potential improvements for static builds (see Epic #145):

- Automatic data export during build process
- Static data loader to replace API calls
- Build optimization (precompression, code splitting)
- Service worker for offline support
- Progressive Web App (PWA) configuration
- CDN-friendly asset versioning

## Related Documentation

- **Epic #145**: Static Site Deployment POC (parent issue)
- **Story #146**: Data Export Script (prerequisite)
- **Story #147**: Adapter-Static Configuration (this implementation)
- **Story #148**: Static Data Loader (next step - to be implemented)

## References

- [SvelteKit Adapter-Static Documentation](https://kit.svelte.dev/docs/adapter-static)
- [Static Site Adapters Guide](https://kit.svelte.dev/docs/adapters)
- [Prerendering Documentation](https://kit.svelte.dev/docs/page-options#prerender)
