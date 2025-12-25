# FamilyTree

A modern family tree management application with multiple visualization modes. Built with a Go backend and SvelteJS frontend, featuring interactive D3.js visualizations.

## Features

### 🌳 Multiple Visualization Views

Explore your family tree data from different perspectives:

- **Tree View** - Traditional hierarchical tree with descendants flowing downward
- **Timeline View** - Chronological lifespan visualization with sortable horizontal bars
- **Pedigree View** - Compact ancestor chart focusing on a selected person's lineage
- **Radial View** - Circular fan chart with ancestors in concentric generational rings

### 👥 Family Management

- Add, edit, and delete family members with detailed information
- Define parent-child relationships (mother/father with validation)
- Track spouse/partner relationships
- Automatic sibling computation based on shared parents
- Gender-based color coding across all views

### 🎨 Interactive Features

- Click any person in any view to edit their information
- Zoom and pan controls on tree visualizations
- Focus person selector for Pedigree and Radial views
- Filter controls (show/hide living/deceased in Timeline)
- Sort by birth year or generation in Timeline view
- Responsive design with mobile support

### 💾 Data Management

- SQLite database for reliable data persistence
- RESTful API for all operations
- Normalized relationship storage
- Support for incomplete data (missing dates handled gracefully)

## Getting Started

### Prerequisites

- Go 1.x or higher
- Node.js and npm

### Backend

```bash
cd backend
go run main.go
```

The backend server will start on `http://localhost:8080`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will start on `http://localhost:5173`

### Navigation

Once running, access different views:
- **Tree View**: http://localhost:5173/#/tree (default)
- **Timeline View**: http://localhost:5173/#/timeline
- **Pedigree View**: http://localhost:5173/#/pedigree
- **Radial View**: http://localhost:5173/#/radial
- **List View** (admin): http://localhost:5173/#/list

## Tech Stack

### Backend
- **Go** - REST API server
- **SQLite** - Database
- **Chi** - HTTP router

### Frontend
- **Svelte 4** - Reactive UI framework
- **Vite** - Build tool and dev server
- **D3.js v7.9.0** - Data visualization
- **Hash-based routing** - Client-side navigation

## Project Structure

```
familytree/
├── backend/
│   ├── main.go           # Go REST API server
│   └── familytree.db     # SQLite database
├── frontend/
│   ├── src/
│   │   ├── App.svelte           # Root component with routing
│   │   ├── lib/
│   │   │   ├── TreeView.svelte      # Hierarchical tree view
│   │   │   ├── TimelineView.svelte  # Chronological timeline
│   │   │   ├── PedigreeView.svelte  # Compact ancestor chart
│   │   │   ├── RadialView.svelte    # Circular fan chart
│   │   │   ├── ViewSwitcher.svelte  # Navigation tabs
│   │   │   ├── PersonModal.svelte   # Edit person modal
│   │   │   ├── PersonForm.svelte    # Person form component
│   │   │   ├── treeHelpers.js       # Shared tree utilities
│   │   │   ├── d3Helpers.js         # Shared D3 utilities
│   │   │   └── api.js               # API client
│   └── package.json
└── README.md
```

## Development

See [CLAUDE.md](CLAUDE.md) for detailed architecture documentation, component structure, and development guidelines.

## License

MIT
