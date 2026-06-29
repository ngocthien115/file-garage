package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/robfig/cron/v3"
	_ "modernc.org/sqlite"
)

type linkEntry struct {
	FileName  string `json:"fileName"`
	URL       string `json:"url"`
	ExpiresAt string `json:"expiresAt"`
}

type server struct {
    db *sql.DB
}

func newServer(dbPath string) *server {
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to open sqlite db: %v\n", err)
		os.Exit(1)
	}
	// Ensure table exists with expires_at column
	createStmt := `CREATE TABLE IF NOT EXISTS links (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		filename TEXT,
		url TEXT NOT NULL,
		expires_at TEXT NOT NULL
	);`
	if _, err := db.Exec(createStmt); err != nil {
		fmt.Fprintf(os.Stderr, "failed to create table: %v\n", err)
		os.Exit(1)
	}
	// Add expires_at column if it doesn't exist (for existing databases)
	alterStmt := `ALTER TABLE links ADD COLUMN expires_at TEXT;`
	db.Exec(alterStmt) // ignore error if column already exists
	return &server{db: db}
}

func corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next(w, r)
	}
}

func (s *server) uploadHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var payload linkEntry
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}
	// Set expiration to now + 3 days
	expiresAt := time.Now().Add(3 * 24 * time.Hour).Format(time.RFC3339)
	// Insert into SQLite
	_, err := s.db.Exec("INSERT INTO links (filename, url, expires_at) VALUES (?, ?, ?)", payload.FileName, payload.URL, expiresAt)
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to insert: %v", err), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"ok"}`))
}

func (s *server) listHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	// Retrieve filename, URL, and expires_at for each entry
	rows, err := s.db.Query("SELECT filename, url, expires_at FROM links")
	if err != nil {
		http.Error(w, fmt.Sprintf("query error: %v", err), http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	var entries []linkEntry
	for rows.Next() {
		var e linkEntry
		if err := rows.Scan(&e.FileName, &e.URL, &e.ExpiresAt); err != nil {
			http.Error(w, fmt.Sprintf("scan error: %v", err), http.StatusInternalServerError)
			return
		}
		entries = append(entries, e)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(entries)
}

// clearExpiredRecords deletes all records that have passed their expiration date
func (s *server) clearExpiredRecords() {
	now := time.Now().Format(time.RFC3339)
	result, err := s.db.Exec("DELETE FROM links WHERE expires_at < ?", now)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to clear expired records: %v\n", err)
		return
	}
	rowsAffected, _ := result.RowsAffected()
	if rowsAffected > 0 {
		fmt.Printf("Cleared %d expired record(s)\n", rowsAffected)
	}
}

func main() {
	// Store the SQLite file inside the mounted data volume
	srv := newServer("data/links.db")
	http.HandleFunc("/api/upload", corsMiddleware(srv.uploadHandler))
	http.HandleFunc("/api/list", corsMiddleware(srv.listHandler))

	// Set up cron job to clear expired records every hour
	c := cron.New()
	c.AddFunc("@hourly", srv.clearExpiredRecords)
	c.Start()
	defer c.Stop()

	fmt.Println("Server listening on :8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		fmt.Fprintf(os.Stderr, "server error: %v\n", err)
	}
}
