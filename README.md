# FamilyTree

A family tree management application with a Go backend and SvelteJS frontend.

## Project Structure

- `backend/` - Go REST API server
- `frontend/` - SvelteJS web application

## Getting Started

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

## Features

- Add, edit, and delete family members
- Define relationships between family members
- View family tree visualization
- SQLite database for data persistence

## Tech Stack

- **Backend**: Go, SQLite, Chi router
- **Frontend**: SvelteJS, Vite
