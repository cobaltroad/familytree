# Deployment Guide

This document provides instructions for deploying the Family Tree application to GitHub Pages and other static hosting platforms.

## Overview

The Family Tree application is configured for static site generation using `@sveltejs/adapter-static`. The build process creates a fully self-contained static website that can be hosted on any static file server.

**Live Site**: [https://cobaltroad.github.io/familytree/](https://cobaltroad.github.io/familytree/)

## GitHub Pages

### Automatic Deployment

The application is configured for automatic deployment to GitHub Pages via GitHub Actions.

**Workflow**: `.github/workflows/deploy-static-site.yml`

**Triggers**:
- Automatic: Push to `main` branch
- Manual: Workflow dispatch via GitHub Actions UI

**Process**:
1. Checkout code
2. Setup Node.js (v20)
3. Install dependencies (`npm ci`)
4. Build application (`npm run build` with `VITE_VIEWER_MODE=true` and `GITHUB_PAGES=true`)
5. Upload build artifacts
6. Deploy to GitHub Pages

**Note**: The workflow does NOT export data from a database. Static data files (`static/data/people.json` and `static/data/relationships.json`) must be exported locally and committed to the repository before deployment. See "Data Updates" section below for the correct workflow.

**Deployment Time**: Typically completes in under 5 minutes.

### First-Time Setup

To enable GitHub Pages deployment for your repository:

1. **Enable GitHub Pages** in repository settings:
   - Go to Settings > Pages
   - Source: GitHub Actions
   - Branch: (handled by workflow, no need to select)

2. **Configure Secrets** (if needed for future enhancements):
   - Go to Settings > Secrets and variables > Actions
   - Add any required secrets (none currently needed)

3. **Trigger Deployment**:
   - Push to `main` branch, or
   - Go to Actions tab > Deploy Static Site to GitHub Pages > Run workflow

4. **Verify Deployment**:
   - Wait for workflow to complete (green checkmark)
   - Visit https://cobaltroad.github.io/familytree/
   - Check browser console for errors (should be none)

### Base Path Configuration

GitHub Pages serves repositories at a subpath (`/<repository-name>/`). The application is configured to handle this automatically:

- **Environment Variable**: `GITHUB_PAGES=true` in workflow
- **Configuration**: `svelte.config.js` sets `paths.base = '/familytree'`
- **Asset Paths**: SvelteKit automatically prefixes all asset URLs with the base path
- **Routing**: Hash-based routing works seamlessly with base path

**Local Testing with Base Path**:
```bash
# Build with GitHub Pages base path
GITHUB_PAGES=true npm run build

# Preview the build
npm run preview
# Note: Preview server ignores base path - test actual deployment on GitHub Pages
```

## Manual Deployment

For manual deployment or troubleshooting, follow these steps:

### Prerequisites

- Node.js 20 or higher
- npm 9 or higher
- Git repository access

### Steps

1. **Clone Repository**:
   ```bash
   git clone https://github.com/cobaltroad/familytree.git
   cd familytree
   ```

2. **Install Dependencies**:
   ```bash
   npm ci
   ```

3. **Export Static Data** (if needed):
   ```bash
   npm run export-data
   ```

   This creates JSON files in `static/data/`:
   - `people.json` - All person records
   - `relationships.json` - All relationship records

   **Note**: This step requires access to `familytree.db`. If the data files already exist in the repository, you can skip this step.

4. **Build Application**:
   ```bash
   VITE_VIEWER_MODE=true GITHUB_PAGES=true npm run build
   ```

   Environment variables:
   - `VITE_VIEWER_MODE=true` - Enables read-only viewer mode (hides edit controls)
   - `GITHUB_PAGES=true` - Sets base path to `/familytree`

5. **Deploy Build Directory**:

   The `build/` directory contains the complete static site. Upload to your hosting platform:

   - **GitHub Pages**: Use GitHub Actions (recommended) or manual upload
   - **Netlify**: Drag & drop `build/` folder or connect repository
   - **Vercel**: Import repository or use Vercel CLI
   - **AWS S3**: Sync `build/` to S3 bucket
   - **Any static host**: Upload `build/` contents to web root

## Data Updates

To update the family tree data after deployment:

### Correct Workflow (Required)

The GitHub Actions workflow has NO access to the database. You MUST export data locally and commit the files:

1. **Update the database locally**: Modify `familytree.db` using the development server (`npm run dev`)
2. **Export data locally**: Run `npm run export-data` to generate JSON files
3. **Commit the exported files**:
   ```bash
   git add static/data/people.json static/data/relationships.json
   git commit -m "chore: update family tree data"
   ```
4. **Push to main**:
   ```bash
   git push origin main
   ```
5. **Automatic deployment**: GitHub Actions builds and deploys using the committed JSON files

**Why this workflow?**
- GitHub Actions CI environment has no database file (`familytree.db`)
- Attempting to run `npm run export-data` in CI will fail
- Static data files must be version-controlled in the repository
- The build process uses the committed JSON files from `static/data/`

**Note**: In viewer mode (production), editing is disabled. All data updates must follow the workflow above.

## Rollback

To rollback to a previous deployment:

### Via GitHub Actions

1. Go to Actions tab in GitHub repository
2. Find the successful deployment you want to restore
3. Click "Re-run jobs" > "Re-run all jobs"
4. Wait for deployment to complete

### Via Git

1. Identify the commit you want to rollback to:
   ```bash
   git log --oneline
   ```

2. Create a revert commit:
   ```bash
   git revert <commit-sha>
   git push origin main
   ```

3. Or reset to a specific commit (use with caution):
   ```bash
   git reset --hard <commit-sha>
   git push --force origin main
   ```

4. Workflow automatically redeploys

### Manual Rollback

1. Checkout the commit you want to restore:
   ```bash
   git checkout <commit-sha>
   ```

2. Rebuild:
   ```bash
   npm ci
   npm run export-data
   VITE_VIEWER_MODE=true GITHUB_PAGES=true npm run build
   ```

3. Manually upload `build/` directory to hosting platform

## Troubleshooting

### Deployment Fails

**Problem**: GitHub Actions workflow fails

**Solutions**:
1. Check workflow logs in Actions tab for specific error
2. Verify `static/data/people.json` and `static/data/relationships.json` exist and are committed
3. Ensure JSON files contain valid data (not empty)
4. Check Node.js version matches workflow (v20)
5. Try running build locally: `npm ci && npm run build`
6. If data files are missing, export locally: `npm run export-data` and commit the files

**Common Error**: "Cannot find module './static/data/people.json'" means data files are not committed to the repository. Run `npm run export-data` locally and commit the generated files.

### Site Doesn't Load

**Problem**: Deployed site shows blank page or 404 errors

**Solutions**:
1. Check browser console for errors
2. Verify base path is correctly set in `svelte.config.js`
3. Ensure `GITHUB_PAGES=true` was set during build
4. Check GitHub Pages settings: Settings > Pages > Source should be "GitHub Actions"
5. Verify deployment completed successfully (green checkmark in Actions tab)
6. Hard refresh browser (Cmd+Shift+R or Ctrl+Shift+F5)
7. Check GitHub Pages environment URL in deployment logs

### Assets Not Loading

**Problem**: CSS, JavaScript, or images return 404

**Solutions**:
1. Verify `paths.base` is set correctly in `svelte.config.js`
2. Check that `GITHUB_PAGES=true` environment variable was set during build
3. Inspect network tab: URLs should include `/familytree/` prefix
4. Rebuild with correct environment variables
5. Clear CDN cache (GitHub Pages may cache assets)

### Data Not Showing

**Problem**: Tree view is empty or shows "No people found"

**Solutions**:
1. Verify `npm run export-data` ran successfully
2. Check `static/data/people.json` and `static/data/relationships.json` exist
3. Verify JSON files contain valid data (not empty arrays)
4. Check browser console for fetch errors
5. Ensure data files are included in `build/` directory

### Viewer Mode Not Working

**Problem**: Edit controls still visible in production

**Solutions**:
1. Verify `VITE_VIEWER_MODE=true` was set during build
2. Check build logs for environment variable
3. Rebuild with correct environment variable
4. Clear browser cache and hard reload
5. Check `import.meta.env.VITE_VIEWER_MODE` in browser console (should be "true")

### Performance Issues

**Problem**: Site loads slowly or is unresponsive

**Solutions**:
1. Check total page weight (should be <3MB)
2. Verify family-chart library is loaded correctly
3. Test with smaller dataset (subset of people)
4. Check browser performance tools for bottlenecks
5. Ensure `precompress` is set correctly in adapter config
6. Consider enabling compression at CDN/server level

### Build Timeout

**Problem**: GitHub Actions workflow times out during build

**Solutions**:
1. Check database size (`familytree.db`)
2. Verify no infinite loops in export script
3. Increase workflow timeout (default: 60 minutes)
4. Optimize export script for large datasets
5. Consider splitting large family trees into separate deployments

## Other Hosting Platforms

### Netlify

1. **Connect Repository**:
   - New site from Git > Select repository
   - Build command: `npm run build`
   - Publish directory: `build`
   - Environment variables:
     - `VITE_VIEWER_MODE=true`
     - (No GITHUB_PAGES needed - Netlify serves from root)

   **Important**: Ensure `static/data/people.json` and `static/data/relationships.json` are committed to the repository. The build command does NOT export data (no database access in CI).

2. **Deploy**:
   - Auto-deploys on push to `main`
   - Manual deploy: Drag `build/` folder to Netlify dashboard

3. **Custom Domain** (optional):
   - Domain settings > Add custom domain
   - Update DNS records as instructed

### Vercel

1. **Import Repository**:
   - New Project > Import Git Repository
   - Framework Preset: SvelteKit
   - Build Command: `npm run build`
   - Output Directory: `build`
   - Install Command: `npm ci`

   **Important**: Ensure `static/data/people.json` and `static/data/relationships.json` are committed to the repository. The build command does NOT export data (no database access in CI).

2. **Environment Variables**:
   - Settings > Environment Variables
   - Add: `VITE_VIEWER_MODE=true`

3. **Deploy**:
   - Auto-deploys on push to `main`
   - Manual redeploy: Deployments > Redeploy

### AWS S3 + CloudFront

1. **Create S3 Bucket**:
   ```bash
   aws s3 mb s3://familytree-static
   ```

2. **Build and Upload**:
   ```bash
   npm run export-data
   VITE_VIEWER_MODE=true npm run build
   aws s3 sync build/ s3://familytree-static --delete
   ```

3. **Configure S3**:
   - Enable static website hosting
   - Index document: `index.html`
   - Error document: `index.html` (for client-side routing)

4. **Create CloudFront Distribution**:
   - Origin: S3 bucket
   - Viewer Protocol Policy: Redirect HTTP to HTTPS
   - Default Root Object: `index.html`
   - Custom Error Responses: 404 → /index.html (for SPA routing)

5. **Deploy Updates**:
   ```bash
   aws s3 sync build/ s3://familytree-static --delete
   aws cloudfront create-invalidation --distribution-id <ID> --paths "/*"
   ```

## Performance Validation

After deployment, validate performance meets acceptance criteria:

### Initial Page Load

**Target**: <3 seconds on 3G connection

**Test**:
1. Open Chrome DevTools
2. Network tab > Throttling > Slow 3G
3. Hard reload (Cmd+Shift+R)
4. Check Load time in Network tab

**Expected**: 2-3 seconds on 3G

### Largest Contentful Paint (LCP)

**Target**: <2.5 seconds

**Test**:
1. Open Chrome DevTools
2. Lighthouse tab > Generate report
3. Check Performance > Metrics > Largest Contentful Paint

**Expected**: 1.5-2.5 seconds

### Total Page Weight

**Target**: <3MB

**Test**:
1. Open Chrome DevTools
2. Network tab > Reload
3. Check total size at bottom of Network tab

**Expected**: 1-2 MB (depends on data size)

## Monitoring

### GitHub Actions

Monitor deployment status:
- Repository > Actions tab
- Watch for failed workflows (red X)
- Review logs for errors

### GitHub Pages Status

Check deployment status:
- Repository > Settings > Pages
- "Your site is published at..." indicates success
- "Your site is ready to be published..." indicates pending

### Browser Console

Monitor client-side errors:
- Open browser DevTools > Console
- Should have no errors on page load
- Warnings are acceptable (e.g., Svelte dev mode warnings)

## Security

### Environment Variables

**Public Variables** (exposed to browser):
- `VITE_VIEWER_MODE` - Safe to expose (controls UI visibility)
- `GITHUB_PAGES` - Safe to expose (controls base path)

**Private Variables** (server-only, not used in static build):
- `AUTH_SECRET` - Not needed for static viewer mode
- `FACEBOOK_APP_SECRET` - Not needed for static viewer mode
- Database credentials - Not needed for static viewer mode

**Note**: The static build does NOT include any server-side code or secrets. All authentication and database access is disabled in viewer mode.

### Data Privacy

The exported data files (`people.json`, `relationships.json`) are PUBLIC:
- Hosted on GitHub Pages (public repository)
- Accessible to anyone with the URL
- No authentication or access control

**Recommendations**:
1. Only export data you're comfortable sharing publicly
2. Omit sensitive information (SSN, private addresses, etc.)
3. For private family trees, use a private GitHub repository and self-hosted solution
4. Consider data filtering in export script for public deployments

## Support

For deployment issues:

1. **Check this guide**: Review troubleshooting section
2. **Review workflow logs**: Actions tab > Failed workflow > Job logs
3. **Test locally**: Run build commands locally to isolate issues
4. **GitHub Issues**: Open issue with:
   - Workflow logs (if applicable)
   - Browser console errors
   - Steps to reproduce
   - Expected vs actual behavior

## Related Documentation

- **Viewer Mode**: See `VIEWER_MODE.md` for viewer mode configuration
- **Development**: See `CLAUDE.md` for development workflow
- **Testing**: See `TESTING_GUIDELINES.md` for test requirements
- **Static Data**: See `scripts/export-data.js` for data export logic
