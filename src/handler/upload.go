package handler

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"file-garage/database"
	"file-garage/storage"

	"github.com/google/uuid"
)

// maxUploadSize is the maximum allowed upload size (100MB).
const maxUploadSize = 100 << 20 // 100 MB

// fileTTL is how long uploaded files are kept before automatic deletion.
const fileTTL = 24 * time.Hour

// UploadHandler handles POST /upload requests.
type UploadHandler struct {
	DB         *database.DB
	Storage    *storage.GCS
	TOTPSecret string
}

func (h *UploadHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Only allow POST.
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	// Validate TOTP code from X-Auth-Key header.
	if !ValidateTOTP(w, r, h.TOTPSecret) {
		return
	}

	// Limit request body size.
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize)

	// Parse multipart form.
	if err := r.ParseMultipartForm(maxUploadSize); err != nil {
		http.Error(w, fmt.Sprintf(`{"error":"file too large, max %dMB"}`, maxUploadSize/(1<<20)), http.StatusBadRequest)
		return
	}

	// Get the uploaded file.
	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, `{"error":"missing 'file' field in form data"}`, http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Generate a unique object name to avoid collisions.
	objectName := fmt.Sprintf("uploads/%s_%s", uuid.New().String(), header.Filename)

	// Upload to GCS.
	if err := h.Storage.Upload(r.Context(), objectName, file); err != nil {
		log.Printf("ERROR upload to GCS: %v", err)
		http.Error(w, `{"error":"failed to upload file"}`, http.StatusInternalServerError)
		return
	}

	// Save metadata to database.
	meta, err := h.DB.InsertFile(header.Filename, objectName, header.Size, fileTTL)
	if err != nil {
		log.Printf("ERROR insert file metadata: %v", err)
		http.Error(w, `{"error":"failed to save file metadata"}`, http.StatusInternalServerError)
		return
	}

	// Return success response.
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":         meta.ID,
		"filename":   meta.Filename,
		"size":       meta.Size,
		"uploaded_at": meta.UploadedAt.Format(time.RFC3339),
		"expires_at": meta.ExpiresAt.Format(time.RFC3339),
		"message":    "upload successful",
	})
}
