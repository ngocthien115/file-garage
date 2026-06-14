# server

HTTP server cho file-garage. Server lắng nghe ở cổng `8080` và lưu dữ liệu SQLite tại `data/links.db`.

## Chạy dev

Từ thư mục `server`:

```bash
go mod tidy
mkdir -p data
go run .
```

Server sẽ chạy tại `http://localhost:8080`.

## Chạy bằng Docker

Build image:

```bash
docker build -t file-garage-server .
```

Run container:

```bash
docker run -d \
  --name file-garage-server \
  -p 8080:8080 \
  -v $(pwd)/data:/app/data \
  --restart unless-stopped \
  file-garage-server
```

## API

- `POST /api/upload`
- `GET /api/list`
