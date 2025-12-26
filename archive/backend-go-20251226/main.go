package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	_ "github.com/mattn/go-sqlite3"
)

type Person struct {
	ID        int       `json:"id"`
	FirstName string    `json:"firstName"`
	LastName  string    `json:"lastName"`
	BirthDate *string   `json:"birthDate,omitempty"`
	DeathDate *string   `json:"deathDate,omitempty"`
	Gender    string    `json:"gender,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
}

type Relationship struct {
	ID         int     `json:"id"`
	Person1ID  int     `json:"person1Id"`
	Person2ID  int     `json:"person2Id"`
	Type       string  `json:"type"`                    // parentOf, spouse
	ParentRole *string `json:"parentRole"`              // mother, father, or null
	CreatedAt  time.Time `json:"createdAt"`
}

type App struct {
	db *sql.DB
}

// normalizeRelationship converts incoming relationships to storage format
// "mother" and "father" are converted to "parentOf" with appropriate parent_role
func normalizeRelationship(person1ID, person2ID int, relType string) (int, int, string, *string) {
	var parentRole *string

	if relType == "mother" || relType == "father" {
		// Person1 is mother/father of Person2
		role := relType
		parentRole = &role
		return person1ID, person2ID, "parentOf", parentRole
	}

	// For backwards compatibility with old "child" type (if any)
	if relType == "child" {
		return person2ID, person1ID, "parentOf", nil
	}

	return person1ID, person2ID, relType, nil
}

// relationshipExists checks if a relationship already exists (including inverse for parentOf)
func (app *App) relationshipExists(person1ID, person2ID int, relType string) (bool, error) {
	var count int

	if relType == "parentOf" {
		// Check for both the relationship and its inverse
		err := app.db.QueryRow(`
			SELECT COUNT(*) FROM relationships
			WHERE (person1_id = ? AND person2_id = ? AND type = 'parentOf')
			   OR (person1_id = ? AND person2_id = ? AND type = 'parentOf')
		`, person1ID, person2ID, person2ID, person1ID).Scan(&count)
		return count > 0, err
	}

	// For other relationship types, check both directions
	err := app.db.QueryRow(`
		SELECT COUNT(*) FROM relationships
		WHERE ((person1_id = ? AND person2_id = ?) OR (person1_id = ? AND person2_id = ?))
		  AND type = ?
	`, person1ID, person2ID, person2ID, person1ID, relType).Scan(&count)
	return count > 0, err
}

// relationshipExistsExcluding checks if a relationship already exists, excluding a specific relationship ID
func (app *App) relationshipExistsExcluding(person1ID, person2ID int, relType string, excludeID int) (bool, error) {
	var count int

	if relType == "parentOf" {
		// Check for both the relationship and its inverse
		err := app.db.QueryRow(`
			SELECT COUNT(*) FROM relationships
			WHERE ((person1_id = ? AND person2_id = ? AND type = 'parentOf')
			   OR (person1_id = ? AND person2_id = ? AND type = 'parentOf'))
			  AND id != ?
		`, person1ID, person2ID, person2ID, person1ID, excludeID).Scan(&count)
		return count > 0, err
	}

	// For other relationship types, check both directions
	err := app.db.QueryRow(`
		SELECT COUNT(*) FROM relationships
		WHERE ((person1_id = ? AND person2_id = ?) OR (person1_id = ? AND person2_id = ?))
		  AND type = ?
		  AND id != ?
	`, person1ID, person2ID, person2ID, person1ID, relType, excludeID).Scan(&count)
	return count > 0, err
}

// migrateToParentRoles adds parent_role column and removes sibling relationships
func (app *App) migrateToParentRoles() error {
	// Add column if it doesn't exist (will error if already exists, which is fine)
	_, err := app.db.Exec(`ALTER TABLE relationships ADD COLUMN parent_role TEXT`)
	if err != nil && !strings.Contains(err.Error(), "duplicate column") {
		return err
	}

	// Delete all sibling relationships
	_, err = app.db.Exec(`DELETE FROM relationships WHERE type = 'sibling'`)
	return err
}

// hasParentOfRole checks if a person already has a parent of the specified role
func (app *App) hasParentOfRole(childID int, role string) (bool, error) {
	var count int
	err := app.db.QueryRow(`
		SELECT COUNT(*) FROM relationships
		WHERE person2_id = ? AND type = 'parentOf' AND parent_role = ?
	`, childID, role).Scan(&count)
	return count > 0, err
}

// hasParentOfRoleExcluding checks if a person already has a parent of the specified role, excluding a specific relationship ID
func (app *App) hasParentOfRoleExcluding(childID int, role string, excludeID int) (bool, error) {
	var count int
	err := app.db.QueryRow(`
		SELECT COUNT(*) FROM relationships
		WHERE person2_id = ? AND type = 'parentOf' AND parent_role = ? AND id != ?
	`, childID, role, excludeID).Scan(&count)
	return count > 0, err
}

func main() {
	db, err := sql.Open("sqlite3", "./familytree.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	app := &App{db: db}

	if err := app.initDB(); err != nil {
		log.Fatal(err)
	}

	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:5173"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	r.Route("/api", func(r chi.Router) {
		r.Route("/people", func(r chi.Router) {
			r.Get("/", app.getAllPeople)
			r.Post("/", app.createPerson)
			r.Get("/{id}", app.getPerson)
			r.Put("/{id}", app.updatePerson)
			r.Delete("/{id}", app.deletePerson)
		})

		r.Route("/relationships", func(r chi.Router) {
			r.Get("/", app.getAllRelationships)
			r.Post("/", app.createRelationship)
			r.Get("/{id}", app.getRelationship)
			r.Put("/{id}", app.updateRelationship)
			r.Delete("/{id}", app.deleteRelationship)
		})
	})

	log.Println("Server starting on :8080")
	log.Fatal(http.ListenAndServe(":8080", r))
}

func (app *App) initDB() error {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS people (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			first_name TEXT NOT NULL,
			last_name TEXT NOT NULL,
			birth_date TEXT,
			death_date TEXT,
			gender TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS relationships (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			person1_id INTEGER NOT NULL,
			person2_id INTEGER NOT NULL,
			type TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (person1_id) REFERENCES people(id) ON DELETE CASCADE,
			FOREIGN KEY (person2_id) REFERENCES people(id) ON DELETE CASCADE
		)`,
	}

	for _, query := range queries {
		if _, err := app.db.Exec(query); err != nil {
			return err
		}
	}

	// Run migration to add parent_role column and remove sibling relationships
	if err := app.migrateToParentRoles(); err != nil {
		log.Printf("Migration warning: %v", err)
		// Don't fail if migration has issues, just log
	}

	return nil
}

func (app *App) getAllPeople(w http.ResponseWriter, r *http.Request) {
	rows, err := app.db.Query("SELECT id, first_name, last_name, birth_date, death_date, gender, created_at FROM people")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var people []Person
	for rows.Next() {
		var p Person
		err := rows.Scan(&p.ID, &p.FirstName, &p.LastName, &p.BirthDate, &p.DeathDate, &p.Gender, &p.CreatedAt)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		people = append(people, p)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(people)
}

func (app *App) getPerson(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "Invalid ID", http.StatusBadRequest)
		return
	}

	var p Person
	err = app.db.QueryRow("SELECT id, first_name, last_name, birth_date, death_date, gender, created_at FROM people WHERE id = ?", id).
		Scan(&p.ID, &p.FirstName, &p.LastName, &p.BirthDate, &p.DeathDate, &p.Gender, &p.CreatedAt)

	if err == sql.ErrNoRows {
		http.Error(w, "Person not found", http.StatusNotFound)
		return
	} else if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(p)
}

func (app *App) createPerson(w http.ResponseWriter, r *http.Request) {
	var p Person
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Validate required fields
	if p.FirstName == "" {
		http.Error(w, "firstName is required and must be a non-empty string", http.StatusBadRequest)
		return
	}
	if p.LastName == "" {
		http.Error(w, "lastName is required and must be a non-empty string", http.StatusBadRequest)
		return
	}

	result, err := app.db.Exec(
		"INSERT INTO people (first_name, last_name, birth_date, death_date, gender) VALUES (?, ?, ?, ?, ?)",
		p.FirstName, p.LastName, p.BirthDate, p.DeathDate, p.Gender,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Get the created person from database to get accurate createdAt
	id, _ := result.LastInsertId()
	err = app.db.QueryRow("SELECT id, first_name, last_name, birth_date, death_date, gender, created_at FROM people WHERE id = ?", id).
		Scan(&p.ID, &p.FirstName, &p.LastName, &p.BirthDate, &p.DeathDate, &p.Gender, &p.CreatedAt)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(p)
}

func (app *App) updatePerson(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "Invalid ID", http.StatusBadRequest)
		return
	}

	// Check if person exists
	var existing Person
	err = app.db.QueryRow("SELECT id FROM people WHERE id = ?", id).Scan(&existing.ID)
	if err == sql.ErrNoRows {
		http.Error(w, "Person not found", http.StatusNotFound)
		return
	} else if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	var p Person
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Validate required fields
	if p.FirstName == "" {
		http.Error(w, "firstName is required and must be a non-empty string", http.StatusBadRequest)
		return
	}
	if p.LastName == "" {
		http.Error(w, "lastName is required and must be a non-empty string", http.StatusBadRequest)
		return
	}

	_, err = app.db.Exec(
		"UPDATE people SET first_name = ?, last_name = ?, birth_date = ?, death_date = ?, gender = ? WHERE id = ?",
		p.FirstName, p.LastName, p.BirthDate, p.DeathDate, p.Gender, id,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Get the updated person from database to get accurate createdAt
	err = app.db.QueryRow("SELECT id, first_name, last_name, birth_date, death_date, gender, created_at FROM people WHERE id = ?", id).
		Scan(&p.ID, &p.FirstName, &p.LastName, &p.BirthDate, &p.DeathDate, &p.Gender, &p.CreatedAt)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(p)
}

func (app *App) deletePerson(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "Invalid ID", http.StatusBadRequest)
		return
	}

	// Check if person exists
	var existing Person
	err = app.db.QueryRow("SELECT id FROM people WHERE id = ?", id).Scan(&existing.ID)
	if err == sql.ErrNoRows {
		http.Error(w, "Person not found", http.StatusNotFound)
		return
	} else if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	_, err = app.db.Exec("DELETE FROM people WHERE id = ?", id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (app *App) getAllRelationships(w http.ResponseWriter, r *http.Request) {
	rows, err := app.db.Query("SELECT id, person1_id, person2_id, type, parent_role, created_at FROM relationships")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var relationships []Relationship
	for rows.Next() {
		var rel Relationship
		err := rows.Scan(&rel.ID, &rel.Person1ID, &rel.Person2ID, &rel.Type, &rel.ParentRole, &rel.CreatedAt)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		relationships = append(relationships, rel)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(relationships)
}

func (app *App) getRelationship(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "Invalid ID", http.StatusBadRequest)
		return
	}

	var rel Relationship
	err = app.db.QueryRow("SELECT id, person1_id, person2_id, type, parent_role, created_at FROM relationships WHERE id = ?", id).
		Scan(&rel.ID, &rel.Person1ID, &rel.Person2ID, &rel.Type, &rel.ParentRole, &rel.CreatedAt)

	if err == sql.ErrNoRows {
		http.Error(w, "Relationship not found", http.StatusNotFound)
		return
	} else if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(rel)
}

func (app *App) updateRelationship(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "Invalid ID", http.StatusBadRequest)
		return
	}

	// Check if relationship exists
	var existing Relationship
	err = app.db.QueryRow("SELECT id FROM relationships WHERE id = ?", id).Scan(&existing.ID)
	if err == sql.ErrNoRows {
		http.Error(w, "Relationship not found", http.StatusNotFound)
		return
	} else if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	var rel Relationship
	if err := json.NewDecoder(r.Body).Decode(&rel); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Normalize the relationship (convert "mother"/"father" to "parentOf" with parent_role)
	person1ID, person2ID, relType, parentRole := normalizeRelationship(rel.Person1ID, rel.Person2ID, rel.Type)

	// Validate relationship type
	validTypes := map[string]bool{"parentOf": true, "spouse": true}
	if !validTypes[relType] {
		http.Error(w, "Invalid relationship type. Must be: mother, father, or spouse", http.StatusBadRequest)
		return
	}

	// For parent relationships, validate that child doesn't already have a parent of this role
	// (excluding the current relationship being updated)
	if relType == "parentOf" && parentRole != nil {
		hasParent, err := app.hasParentOfRoleExcluding(person2ID, *parentRole, id)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		if hasParent {
			http.Error(w, "Person already has a "+*parentRole, http.StatusBadRequest)
			return
		}
	}

	// Check for duplicate relationships (excluding current relationship)
	exists, err := app.relationshipExistsExcluding(person1ID, person2ID, relType, id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if exists {
		http.Error(w, "This relationship already exists", http.StatusBadRequest)
		return
	}

	_, err = app.db.Exec(
		"UPDATE relationships SET person1_id = ?, person2_id = ?, type = ?, parent_role = ? WHERE id = ?",
		person1ID, person2ID, relType, parentRole, id,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Get the updated relationship from database to get accurate createdAt
	err = app.db.QueryRow("SELECT id, person1_id, person2_id, type, parent_role, created_at FROM relationships WHERE id = ?", id).
		Scan(&rel.ID, &rel.Person1ID, &rel.Person2ID, &rel.Type, &rel.ParentRole, &rel.CreatedAt)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(rel)
}

func (app *App) createRelationship(w http.ResponseWriter, r *http.Request) {
	var rel Relationship
	if err := json.NewDecoder(r.Body).Decode(&rel); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Normalize the relationship (convert "mother"/"father" to "parentOf" with parent_role)
	person1ID, person2ID, relType, parentRole := normalizeRelationship(rel.Person1ID, rel.Person2ID, rel.Type)

	// Validate relationship type
	validTypes := map[string]bool{"parentOf": true, "spouse": true}
	if !validTypes[relType] {
		http.Error(w, "Invalid relationship type. Must be: mother, father, or spouse", http.StatusBadRequest)
		return
	}

	// For parent relationships, validate that child doesn't already have a parent of this role
	if relType == "parentOf" && parentRole != nil {
		hasParent, err := app.hasParentOfRole(person2ID, *parentRole)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		if hasParent {
			http.Error(w, "Person already has a "+*parentRole, http.StatusBadRequest)
			return
		}
	}

	// Check for duplicate/inverse relationships
	exists, err := app.relationshipExists(person1ID, person2ID, relType)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if exists {
		http.Error(w, "This relationship already exists", http.StatusBadRequest)
		return
	}

	result, err := app.db.Exec(
		"INSERT INTO relationships (person1_id, person2_id, type, parent_role) VALUES (?, ?, ?, ?)",
		person1ID, person2ID, relType, parentRole,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	id, err := result.LastInsertId()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Get the created relationship from database to get accurate createdAt
	err = app.db.QueryRow("SELECT id, person1_id, person2_id, type, parent_role, created_at FROM relationships WHERE id = ?", id).
		Scan(&rel.ID, &rel.Person1ID, &rel.Person2ID, &rel.Type, &rel.ParentRole, &rel.CreatedAt)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(rel)
}

func (app *App) deleteRelationship(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "Invalid ID", http.StatusBadRequest)
		return
	}

	// Check if relationship exists
	var existing Relationship
	err = app.db.QueryRow("SELECT id FROM relationships WHERE id = ?", id).Scan(&existing.ID)
	if err == sql.ErrNoRows {
		http.Error(w, "Relationship not found", http.StatusNotFound)
		return
	} else if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	_, err = app.db.Exec("DELETE FROM relationships WHERE id = ?", id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
