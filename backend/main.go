package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
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
	ID         int    `json:"id"`
	Person1ID  int    `json:"person1Id"`
	Person2ID  int    `json:"person2Id"`
	Type       string `json:"type"` // parent, spouse, sibling
	CreatedAt  time.Time `json:"createdAt"`
}

type App struct {
	db *sql.DB
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

	result, err := app.db.Exec(
		"INSERT INTO people (first_name, last_name, birth_date, death_date, gender) VALUES (?, ?, ?, ?, ?)",
		p.FirstName, p.LastName, p.BirthDate, p.DeathDate, p.Gender,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	id, _ := result.LastInsertId()
	p.ID = int(id)
	p.CreatedAt = time.Now()

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

	var p Person
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
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

	p.ID = id
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(p)
}

func (app *App) deletePerson(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "Invalid ID", http.StatusBadRequest)
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
	rows, err := app.db.Query("SELECT id, person1_id, person2_id, type, created_at FROM relationships")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var relationships []Relationship
	for rows.Next() {
		var rel Relationship
		err := rows.Scan(&rel.ID, &rel.Person1ID, &rel.Person2ID, &rel.Type, &rel.CreatedAt)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		relationships = append(relationships, rel)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(relationships)
}

func (app *App) createRelationship(w http.ResponseWriter, r *http.Request) {
	var rel Relationship
	if err := json.NewDecoder(r.Body).Decode(&rel); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	result, err := app.db.Exec(
		"INSERT INTO relationships (person1_id, person2_id, type) VALUES (?, ?, ?)",
		rel.Person1ID, rel.Person2ID, rel.Type,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	id, _ := result.LastInsertId()
	rel.ID = int(id)
	rel.CreatedAt = time.Now()

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

	_, err = app.db.Exec("DELETE FROM relationships WHERE id = ?", id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
