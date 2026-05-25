# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM golang:1.22-alpine AS builder

# Install gcc (needed by modernc.org/sqlite CGo-free but libc still required)
RUN apk add --no-cache ca-certificates

WORKDIR /app

# Cache dependencies first
COPY src/go.mod src/go.sum ./
RUN go mod download

# Copy source and build
COPY src/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /file-garage .

# ── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM gcr.io/distroless/static-debian12

# Copy binary and CA certs (needed for GCS HTTPS calls)
COPY --from=builder /file-garage /file-garage
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Cloud Run injects PORT automatically
ENV PORT=8080

EXPOSE 8080

ENTRYPOINT ["/file-garage"]
