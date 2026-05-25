package handler

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"

	"file-garage/database"
	"file-garage/storage"
)

// DownloadHandler handles GET /download?id=N requests.
type DownloadHandler struct {
	DB         *database.DB
	Storage    *storage.GCS
	TOTPSecret string
}

func (h *DownloadHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Only allow GET.
	if r.Method != http.MethodGet {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	// Validate TOTP code from X-Auth-Key header.
	if !ValidateTOTP(w, r, h.TOTPSecret) {
		return
	}
	// Parse the "id" query parameter.
	idStr := r.URL.Query().Get("id")
	if idStr == "" {
		http.Error(w, `{"error":"missing 'id' query parameter"}`, http.StatusBadRequest)
		return
	}

	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, `{"error":"'id' must be an integer"}`, http.StatusBadRequest)
		return
	}

	// Look up the file metadata.
	meta, err := h.DB.GetFileByID(id)
	if err != nil {
		log.Printf("ERROR get file by id %d: %v", id, err)
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
		return
	}
	if meta == nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{
			"error": fmt.Sprintf("file with id %d not found or has expired", id),
		})
		return
	}

	// Set headers so curl -OJ saves the file with the original filename.
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, meta.Filename))
	w.Header().Set("Content-Type", "application/octet-stream")

	// Stream file directly from GCS to the client.
	if err := h.Storage.Download(r.Context(), meta.GCSObject, w); err != nil {
		log.Printf("ERROR download from GCS: %v", err)
		// Headers already sent, can't send error response cleanly.
		return
	}
}
