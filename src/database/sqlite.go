package database

import (
	"database/sql"
	"fmt"
	"time"

	"file-garage/model"

	_ "modernc.org/sqlite"
)

// DB wraps the SQLite database connection.
type DB struct {
	conn *sql.DB
}

// New opens a SQLite database at the given path and creates the files table if it doesn't exist.
func New(dbPath string) (*DB, error) {
	conn, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}

	// Enable WAL mode for better concurrent read performance.
	if _, err := conn.Exec("PRAGMA journal_mode=WAL"); err != nil {
		conn.Close()
		return nil, fmt.Errorf("set WAL mode: %w", err)
	}

	createTable := `
	CREATE TABLE IF NOT EXISTS files (
		id          INTEGER PRIMARY KEY AUTOINCREMENT,
		filename    TEXT NOT NULL,
		size        INTEGER NOT NULL,
		gcs_object  TEXT NOT NULL UNIQUE,
		uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		expires_at  DATETIME NOT NULL
	);`

	if _, err := conn.Exec(createTable); err != nil {
		conn.Close()
		return nil, fmt.Errorf("create table: %w", err)
	}

	return &DB{conn: conn}, nil
}

// Close closes the database connection.
func (db *DB) Close() error {
	return db.conn.Close()
}

// InsertFile saves file metadata and returns the created record with its auto-generated ID.
func (db *DB) InsertFile(filename, gcsObject string, size int64, ttl time.Duration) (*model.FileMetadata, error) {
	now := time.Now().UTC()
	expiresAt := now.Add(ttl)

	result, err := db.conn.Exec(
		"INSERT INTO files (filename, size, gcs_object, uploaded_at, expires_at) VALUES (?, ?, ?, ?, ?)",
		filename, size, gcsObject, now.Format(time.RFC3339), expiresAt.Format(time.RFC3339),
	)
	if err != nil {
		return nil, fmt.Errorf("insert file: %w", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return nil, fmt.Errorf("get last insert id: %w", err)
	}

	return &model.FileMetadata{
		ID:         int(id),
		Filename:   filename,
		Size:       size,
		GCSObject:  gcsObject,
		UploadedAt: now,
		ExpiresAt:  expiresAt,
	}, nil
}

// ListFiles returns all files that have not yet expired.
func (db *DB) ListFiles() ([]model.FileMetadata, error) {
	now := time.Now().UTC().Format(time.RFC3339)

	rows, err := db.conn.Query(
		"SELECT id, filename, size, gcs_object, uploaded_at, expires_at FROM files WHERE expires_at > ? ORDER BY id DESC",
		now,
	)
	if err != nil {
		return nil, fmt.Errorf("list files: %w", err)
	}
	defer rows.Close()

	var files []model.FileMetadata
	for rows.Next() {
		var f model.FileMetadata
		var uploadedAt, expiresAt string
		if err := rows.Scan(&f.ID, &f.Filename, &f.Size, &f.GCSObject, &uploadedAt, &expiresAt); err != nil {
			return nil, fmt.Errorf("scan file row: %w", err)
		}
		f.UploadedAt, _ = time.Parse(time.RFC3339, uploadedAt)
		f.ExpiresAt, _ = time.Parse(time.RFC3339, expiresAt)
		files = append(files, f)
	}

	return files, rows.Err()
}

// GetFileByID returns metadata for a specific file by ID, only if it hasn't expired.
func (db *DB) GetFileByID(id int) (*model.FileMetadata, error) {
	now := time.Now().UTC().Format(time.RFC3339)

	var f model.FileMetadata
	var uploadedAt, expiresAt string

	err := db.conn.QueryRow(
		"SELECT id, filename, size, gcs_object, uploaded_at, expires_at FROM files WHERE id = ? AND expires_at > ?",
		id, now,
	).Scan(&f.ID, &f.Filename, &f.Size, &f.GCSObject, &uploadedAt, &expiresAt)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get file by id: %w", err)
	}

	f.UploadedAt, _ = time.Parse(time.RFC3339, uploadedAt)
	f.ExpiresAt, _ = time.Parse(time.RFC3339, expiresAt)

	return &f, nil
}

// DeleteExpiredFiles removes all expired records and returns the GCS object names
// so the caller can delete them from cloud storage.
func (db *DB) DeleteExpiredFiles() ([]string, error) {
	now := time.Now().UTC().Format(time.RFC3339)

	// First, collect the GCS object names of expired files.
	rows, err := db.conn.Query("SELECT gcs_object FROM files WHERE expires_at <= ?", now)
	if err != nil {
		return nil, fmt.Errorf("query expired files: %w", err)
	}
	defer rows.Close()

	var objects []string
	for rows.Next() {
		var obj string
		if err := rows.Scan(&obj); err != nil {
			return nil, fmt.Errorf("scan expired object: %w", err)
		}
		objects = append(objects, obj)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Then delete the expired records.
	if len(objects) > 0 {
		if _, err := db.conn.Exec("DELETE FROM files WHERE expires_at <= ?", now); err != nil {
			return nil, fmt.Errorf("delete expired files: %w", err)
		}
	}

	return objects, nil
}
