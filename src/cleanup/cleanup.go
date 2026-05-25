package cleanup

import (
	"context"
	"log"
	"time"

	"file-garage/database"
	"file-garage/storage"
)

// StartCleanupScheduler runs a background goroutine that removes expired metadata records
// from SQLite once per day at midnight (local time). GCS objects are managed by GCS lifecycle
// rules, so only DB cleanup is strictly necessary here.
func StartCleanupScheduler(ctx context.Context, db *database.DB, gcs *storage.GCS) {
	go func() {
		for {
			next := nextMidnight()
			log.Printf("Cleanup scheduler: next run at %s", next.Format(time.RFC3339))

			select {
			case <-time.After(time.Until(next)):
				runCleanup(ctx, db, gcs)
			case <-ctx.Done():
				log.Println("Cleanup scheduler stopped")
				return
			}
		}
	}()
}

// nextMidnight returns the next midnight in local time.
func nextMidnight() time.Time {
	now := time.Now()
	return time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, now.Location())
}

func runCleanup(ctx context.Context, db *database.DB, gcs *storage.GCS) {
	objects, err := db.DeleteExpiredFiles()
	if err != nil {
		log.Printf("ERROR cleanup - delete expired from DB: %v", err)
		return
	}

	if len(objects) == 0 {
		return
	}

	log.Printf("Cleanup: removing %d expired file(s) from GCS", len(objects))

	for _, obj := range objects {
		if err := gcs.Delete(ctx, obj); err != nil {
			log.Printf("ERROR cleanup - delete GCS object %s: %v", obj, err)
			// Continue deleting other objects even if one fails.
		}
	}

	log.Printf("Cleanup: done removing %d expired file(s)", len(objects))
}
