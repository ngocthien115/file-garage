# syntax=docker/dockerfile:1

# ---- Build stage ----
FROM golang:1.22-alpine AS builder
WORKDIR /app

# Copy go.mod (go.sum will be generated later) and resolve dependencies
COPY go.mod .
RUN go mod tidy

# Copy source code
COPY . .

# Build the binary
RUN CGO_ENABLED=0 GOOS=linux go build -o server

# ---- Run stage ----
FROM alpine:3.20
WORKDIR /app

# Copy the compiled binary from builder
COPY --from=builder /app/server .

# Expose the port the server listens on (8080 inside container)
EXPOSE 8080

# Set entrypoint
CMD ["./server"]
