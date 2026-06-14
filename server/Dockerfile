# syntax=docker/dockerfile:1

# ---- Build stage ----
FROM golang:1.22-alpine AS builder
WORKDIR /app

# Install build tools required by go-sqlite3 (cgo, gcc, sqlite headers)
RUN apk add --no-cache gcc musl-dev sqlite-dev

# Copy go.mod (go.sum will be generated later) and resolve dependencies
COPY go.mod .
RUN go mod tidy

# Copy source code
COPY . .

# Build the binary (cgo enabled for sqlite3)
RUN CGO_ENABLED=1 GOOS=linux GOARCH=amd64 go build -o server

# ---- Run stage ----
FROM alpine:latest
WORKDIR /app

# Copy the compiled binary from builder
COPY --from=builder /app/server .

# Expose the port the server listens on (8080 inside container)
EXPOSE 8080

# Set entrypoint
CMD ["./server"]
