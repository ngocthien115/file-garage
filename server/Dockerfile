# syntax=docker/dockerfile:1

# ---- Build stage ----
FROM golang:1.22-alpine AS builder
WORKDIR /app

# Copy go.mod and go.sum (if present) and download dependencies
COPY go.mod .
RUN go mod download

# Copy source code
COPY . .

# Build the binary (static)
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o server

# ---- Run stage ----
FROM alpine:latest
WORKDIR /app

# Copy the compiled binary from builder
COPY --from=builder /app/server .

# Expose the port the server listens on (8080 inside container)
EXPOSE 8080

# Set entrypoint
CMD ["./server"]
