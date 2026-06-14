# syntax=docker/dockerfile:1

# ---- Build stage ----
FROM golang:1.24-alpine AS builder
WORKDIR /app
RUN mkdir -p /app/data

# Cache go.mod and go.sum
COPY go.mod ./
COPY go.sum ./
RUN go mod download

# Copy the source code
COPY . ./

# Build the binary (disable CGO for a static binary)
RUN CGO_ENABLED=0 GOOS=linux go build -o server .

# ---- Run stage ----
FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/server .
# Ensure the data directory exists for SQLite file
RUN mkdir -p data

# Expose the port the server listens on (adjust if needed)
EXPOSE 8080

# Run the server binary
CMD ["./server"]
