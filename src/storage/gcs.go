package storage

import (
	"context"
	"fmt"
	"io"

	"cloud.google.com/go/storage"
)

// GCS wraps the Google Cloud Storage client for a specific bucket.
type GCS struct {
	client *storage.Client
	bucket string
}

// NewGCS creates a new GCS wrapper. It uses Application Default Credentials (ADC)
// which are automatically available on Cloud Run via the service account.
// For local development, set GOOGLE_APPLICATION_CREDENTIALS env var.
func NewGCS(ctx context.Context, bucket string) (*GCS, error) {
	client, err := storage.NewClient(ctx)
	if err != nil {
		return nil, fmt.Errorf("create GCS client: %w", err)
	}
	return &GCS{client: client, bucket: bucket}, nil
}

// Close closes the underlying GCS client.
func (g *GCS) Close() error {
	return g.client.Close()
}

// Upload writes data from reader to the specified object in the bucket.
func (g *GCS) Upload(ctx context.Context, objectName string, reader io.Reader) error {
	writer := g.client.Bucket(g.bucket).Object(objectName).NewWriter(ctx)

	if _, err := io.Copy(writer, reader); err != nil {
		writer.Close()
		return fmt.Errorf("copy to GCS: %w", err)
	}

	if err := writer.Close(); err != nil {
		return fmt.Errorf("close GCS writer: %w", err)
	}

	return nil
}

// Download streams the specified object's contents to the writer.
func (g *GCS) Download(ctx context.Context, objectName string, writer io.Writer) error {
	reader, err := g.client.Bucket(g.bucket).Object(objectName).NewReader(ctx)
	if err != nil {
		return fmt.Errorf("open GCS reader: %w", err)
	}
	defer reader.Close()

	if _, err := io.Copy(writer, reader); err != nil {
		return fmt.Errorf("copy from GCS: %w", err)
	}

	return nil
}

// Delete removes the specified object from the bucket.
func (g *GCS) Delete(ctx context.Context, objectName string) error {
	err := g.client.Bucket(g.bucket).Object(objectName).Delete(ctx)
	if err != nil {
		return fmt.Errorf("delete GCS object %s: %w", objectName, err)
	}
	return nil
}
