package handler

import (
	"encoding/json"
	"log"
	"net/http"

	"file-garage/database"
	"file-garage/model"
)

// ListHandler handles GET /list requests.
type ListHandler struct {
	DB *database.DB
}

func (h *ListHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Only allow GET.
	if r.Method != http.MethodGet {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	files, err := h.DB.ListFiles()
	if err != nil {
		log.Printf("ERROR list files: %v", err)
		http.Error(w, `{"error":"failed to list files"}`, http.StatusInternalServerError)
		return
	}

	// Ensure we return an empty array instead of null when there are no files.
	if files == nil {
		files = []model.FileMetadata{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"files": files,
		"total": len(files),
	})
}
