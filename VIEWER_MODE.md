# Viewer Mode

## Overview

Viewer Mode is a read-only mode designed for static site deployments where editing features are disabled. Users can explore the family tree visualization but cannot add, edit, or delete people or relationships.

## When to Use Viewer Mode

Use Viewer Mode when:
- Deploying the family tree as a static site (GitHub Pages, Netlify, Vercel, etc.)
- Sharing a read-only version of your family tree with others
- Hosting a public family tree without backend API access
- Creating a presentation or demo version of the family tree

## Enabling Viewer Mode

Viewer Mode is controlled by the `VITE_VIEWER_MODE` environment variable.

### Development

Create or update your `.env` file:

```bash
VITE_VIEWER_MODE=true
```

Then restart the development server:

```bash
npm run dev
```

### Production Build

Set the environment variable before building:

```bash
# Linux/macOS
VITE_VIEWER_MODE=true npm run build

# Windows (PowerShell)
$env:VITE_VIEWER_MODE="true"; npm run build

# Windows (Command Prompt)
set VITE_VIEWER_MODE=true && npm run build
```

### Static Hosting Platforms

#### GitHub Pages

Add to your GitHub Actions workflow (`.github/workflows/deploy.yml`):

```yaml
- name: Build
  run: npm run build
  env:
    VITE_VIEWER_MODE: true
```

#### Netlify

Add to `netlify.toml`:

```toml
[build.environment]
  VITE_VIEWER_MODE = "true"
```

Or set in Netlify UI:
1. Go to Site settings > Build & deploy > Environment variables
2. Add key: `VITE_VIEWER_MODE`, value: `true`

#### Vercel

Add to `vercel.json`:

```json
{
  "build": {
    "env": {
      "VITE_VIEWER_MODE": "true"
    }
  }
}
```

Or set in Vercel UI:
1. Go to Project Settings > Environment Variables
2. Add `VITE_VIEWER_MODE` = `true`

## Features Disabled in Viewer Mode

When Viewer Mode is enabled, the following features are automatically disabled:

### UI Components Hidden
- Add Person button (top-right navigation)
- Admin tab (database inspection)
- Import tab (GEDCOM upload)
- Duplicates tab (duplicate detection)
- PersonModal (edit/add person dialog)
- Quick Add buttons (Add Child, Add Parent, Add Spouse)
- Delete buttons
- Edit pencil buttons on person cards

### Functionality Preserved
- Tree visualization with family-chart library
- Zoom and pan controls
- Focus person selector (dropdown to change tree root)
- Navigation between different views (only Tree view visible)
- Person card display with names and lifespans

## Architecture

### Store-Based Detection

Viewer Mode uses a centralized Svelte store (`src/stores/viewerModeStore.js`):

```javascript
import { isViewerMode } from '../stores/viewerModeStore.js'

// In components:
{#if !$isViewerMode}
  <button>Add Person</button>
{/if}
```

### Components Modified

1. **ViewSwitcher.svelte**: Filters navigation tabs based on viewer mode
2. **PersonModal.svelte**: Prevents modal rendering in viewer mode
3. **TreeView.svelte**: Hides edit pencil buttons and disables click-to-edit
4. **viewerModeStore.js**: Detects environment variable and exposes boolean state

### Environment Variable Detection

The store uses Vite's `import.meta.env` to access environment variables:

```javascript
const viewerModeEnv = import.meta.env.VITE_VIEWER_MODE
return viewerModeEnv === 'true'
```

Only the string `"true"` enables viewer mode. All other values (including `undefined`, `"false"`, empty string) disable it.

## Testing

Comprehensive test coverage ensures viewer mode works correctly:

### Unit Tests
- `src/stores/viewerModeStore.test.js`: Store behavior
- `src/lib/ViewSwitcher.test.js`: Tab filtering
- `src/lib/PersonModal.test.js`: Modal rendering prevention
- `src/lib/TreeView.test.js`: Edit button hiding

### Integration Tests
- `src/lib/viewerMode.integration.test.js`: End-to-end workflows

Run tests:

```bash
npm test -- viewerMode
```

## Development Workflow

1. **Normal Development** (editing enabled):
   ```bash
   # .env
   VITE_VIEWER_MODE=false
   # or omit the variable entirely
   ```

2. **Preview Viewer Mode Locally**:
   ```bash
   # .env
   VITE_VIEWER_MODE=true

   npm run dev
   ```

3. **Build for Static Deployment**:
   ```bash
   VITE_VIEWER_MODE=true npm run build
   npm run preview  # Test the build locally
   ```

## Troubleshooting

### Viewer Mode Not Working

**Problem**: Edit controls still visible in production

**Solutions**:
1. Verify `VITE_VIEWER_MODE=true` is set in build environment (check build logs)
2. Rebuild the application (`npm run build`)
3. Clear browser cache and hard reload
4. Check `import.meta.env.VITE_VIEWER_MODE` in browser console

### Environment Variable Not Recognized

**Problem**: `VITE_VIEWER_MODE` not detected

**Solutions**:
1. Ensure variable starts with `VITE_` prefix (required by Vite)
2. Restart development server after changing `.env`
3. For production builds, set in CI/CD environment (not `.env`)
4. Check vite.config.js loads environment variables correctly

### Modal Still Opens

**Problem**: PersonModal appears when clicking person cards

**Solutions**:
1. Verify `!$isViewerMode` condition in PersonModal.svelte (line 344)
2. Check TreeView.svelte `handlePencilClick` guard (line 273)
3. Rebuild and clear cache

## Migration from Development to Static Site

1. **Export Static Data** (if using database):
   ```bash
   npm run export-data
   ```
   This creates JSON files in `static/data/` directory.

2. **Update API Calls** (if needed):
   The static adapter (Story #148) loads data from JSON files instead of database.

3. **Build with Viewer Mode**:
   ```bash
   VITE_VIEWER_MODE=true npm run build
   ```

4. **Deploy `build/` Directory**:
   Upload to your static hosting platform.

## Related Stories

- **Story #147**: Configure adapter-static for static site generation
- **Story #148**: Static data loader for viewer mode
- **Story #149**: Viewer mode UI - Hide edit controls (this implementation)

## Future Enhancements

Potential improvements for viewer mode:

- [ ] Read-only person info tooltips (click to view details without editing)
- [ ] Print/export family tree as PDF
- [ ] Share specific person view via URL parameters
- [ ] Timeline view in viewer mode
- [ ] Search/filter functionality for large family trees

## Support

For issues or questions about Viewer Mode:
1. Check this documentation
2. Review test files for expected behavior
3. Open an issue on GitHub with steps to reproduce
