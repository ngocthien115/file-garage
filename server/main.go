package main

import (
    "database/sql"
    "encoding/json"
    "fmt"
    "net/http"
    "os"
    _ "modernc.org/sqlite"
)

type linkEntry struct {
    FileName string `json:"fileName"`
    URL      string `json:"url"`
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
    // Ensure table exists
    createStmt := `CREATE TABLE IF NOT EXISTS links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT,
        url TEXT NOT NULL
    );`
    if _, err := db.Exec(createStmt); err != nil {
        fmt.Fprintf(os.Stderr, "failed to create table: %v\n", err)
        os.Exit(1)
    }
    return &server{db: db}
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
    // Insert into SQLite
    _, err := s.db.Exec("INSERT INTO links (filename, url) VALUES (?, ?)", payload.FileName, payload.URL)
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
    // Retrieve both filename and URL for each entry
    rows, err := s.db.Query("SELECT filename, url FROM links")
    if err != nil {
        http.Error(w, fmt.Sprintf("query error: %v", err), http.StatusInternalServerError)
        return
    }
    defer rows.Close()
    var entries []linkEntry
    for rows.Next() {
        var e linkEntry
        if err := rows.Scan(&e.FileName, &e.URL); err != nil {
            http.Error(w, fmt.Sprintf("scan error: %v", err), http.StatusInternalServerError)
            return
        }
        entries = append(entries, e)
    }
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(entries)
}

func main() {
    // Store the SQLite file inside the mounted data volume
    srv := newServer("data/links.db")
    http.HandleFunc("/api/upload", srv.uploadHandler)
    http.HandleFunc("/api/list", srv.listHandler)
    fmt.Println("Server listening on :8080")
    if err := http.ListenAndServe(":8080", nil); err != nil {
        fmt.Fprintf(os.Stderr, "server error: %v\n", err)
    }
}
