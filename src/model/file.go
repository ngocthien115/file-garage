package model

import "time"

// FileMetadata represents metadata for a file stored in GCS.
type FileMetadata struct {
	ID         int       `json:"id"`
	Filename   string    `json:"filename"`
	Size       int64     `json:"size"`
	GCSObject  string    `json:"-"`
	UploadedAt time.Time `json:"uploaded_at"`
	ExpiresAt  time.Time `json:"expires_at"`
}
