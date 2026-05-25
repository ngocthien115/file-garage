package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"file-garage/cleanup"
	"file-garage/database"
	"file-garage/handler"
	"file-garage/storage"
)

func main() {
	bucket := requireEnv("GCS_BUCKET")
	totpSecret := requireEnv("TOTP_SECRET")
	port := getEnv("PORT", "8080")
	dbPath := getEnv("DB_PATH", "/tmp/file-garage.db")
	githubRepo := getEnv("GITHUB_REPO", "YOUR_USER/file-garage")
	githubBranch := getEnv("GITHUB_BRANCH", "main")

	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()

	db, err := database.New(dbPath)
	if err != nil {
		log.Fatalf("FATAL open database: %v", err)
	}
	defer db.Close()

	gcs, err := storage.NewGCS(ctx, bucket)
	if err != nil {
		log.Fatalf("FATAL create GCS client: %v", err)
	}
	defer gcs.Close()

	cleanup.StartCleanupScheduler(ctx, db, gcs)

	mux := http.NewServeMux()
	mux.Handle("/upload", &handler.UploadHandler{DB: db, Storage: gcs, TOTPSecret: totpSecret})
	mux.Handle("/download", &handler.DownloadHandler{DB: db, Storage: gcs, TOTPSecret: totpSecret})
	mux.Handle("/list", &handler.ListHandler{DB: db})
	mux.Handle("/install", &handler.InstallHandler{GithubRepo: githubRepo, Branch: githubBranch})
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})

	srv := &http.Server{
		Addr:    ":" + port,
		Handler: mux,
	}

	go func() {
		log.Printf("Server listening on :%s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("FATAL server: %v", err)
		}
	}()

	<-ctx.Done()
	log.Println("Shutting down...")
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("ERROR graceful shutdown: %v", err)
	}
}

func requireEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("FATAL required env var %q is not set", key)
	}
	return v
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
