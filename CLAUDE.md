# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Backend (Go)
```bash
cd backend
go run main.go        # Start backend server on http://localhost:8080
```

### Frontend (Svelte + Vite)
```bash
cd frontend
npm install           # Install dependencies (first time only)
npm run dev          # Start dev server on http://localhost:5173
npm run build        # Build for production
npm run preview      # Preview production build
```

## Architecture Overview

### Backend Structure
- Single-file Go REST API (`backend/main.go`) using Chi router
- SQLite database (`backend/familytree.db`) for persistence
- Two main entities: **Person** and **Relationship**

### Relationship Model
The relationship system has evolved and uses a normalized storage approach:
- All parent-child relationships are stored as `type: "parentOf"` with a `parent_role` field (`"mother"` or `"father"`)
- The API accepts `"mother"` and `"father"` as relationship types, which are automatically normalized to `"parentOf"` with the appropriate `parent_role`
- Sibling relationships are **computed dynamically** on the frontend (people who share at least one parent), not stored in the database
- Spouse relationships are stored as `type: "spouse"`
- The backend validates that a person can only have one mother and one father

### Frontend Architecture
- **Svelte 4** with Vite build system
- **Hash-based routing**: Tree View is default (`/`), List View accessible at `#/list`
- **State management**: All data flows through `App.svelte`, which manages people, relationships, and modal state
- **D3.js** for tree visualization with zoom/pan capabilities

### Component Structure
- **App.svelte**: Root component, manages routing, data fetching, and modal state
- **TreeView.svelte**: Default view showing D3 family tree with clickable nodes and floating add button
- **ListView.svelte**: Admin view at `#/list` with forms for adding/editing people and relationships
- **PersonModal.svelte**: Modal dialog for editing/adding people (shared between Tree and List views)
- **PersonForm.svelte**: Form inside modal that displays relationship info (parents, siblings, children)

### Key UI Patterns
- Clicking a tree node opens **PersonModal** (does not navigate away from tree)
- Floating "+" button in tree view opens modal to add new person
- Modal displays computed relationships: parents (from parent_role), siblings (shared parents), and children
- Modal has sticky close button that stays visible when scrolling
- Update button (bottom left) and Delete button (bottom right) in modal footer

### Data Flow
1. `App.svelte` fetches all people and relationships on mount via `api.js`
2. Components receive data as props and dispatch events upward
3. `TreeView` builds tree structure by finding roots (people without parents) and recursively building child nodes
4. Parent relationships (mother/father) are identified by `type: "parentOf"` and `parent_role` field
5. When creating relationships via frontend, use `"mother"` or `"father"` as the type - backend handles normalization

### API Client
`frontend/src/lib/api.js` provides typed API methods for all backend endpoints. The backend expects relationships to use:
- `type: "mother"` or `type: "father"` (will be normalized to `"parentOf"` with `parent_role`)
- `type: "spouse"` for spousal relationships

### Known Issues
See GitHub issues for current bugs including:
- Issue #1: Parent names not displaying in modal relationships section
- Issue #2: Modal doesn't reopen when clicking same node immediately after closing
