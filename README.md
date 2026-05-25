# File Garage 📦

Dịch vụ lưu trữ file tạm thời. Upload/download qua `curl`. Backend: Google Cloud Storage + SQLite metadata.

## ⚠️ Bảo mật

- **TOTP Secret**: Mỗi deployment phải tạo secret riêng. **Không bao giờ dùng lại secret mẫu.**
- **Service Account Key**: Không commit file `sa-key.json` lên Git. Chỉ dùng local, Cloud Run dùng Workload Identity.
- **File TTL**: File tự xóa sau 24 giờ — không lưu dữ liệu nhạy cảm lâu dài.

## Tính năng

- **Upload** file qua `curl` với TOTP authentication (mã 6 số)
- **Download** file theo ID với TOTP authentication
- **List** tất cả file đang lưu trữ (JSON, không cần auth)
- **TTL**: File tự động hết hạn sau **24 giờ**
- **Giới hạn**: Upload tối đa **100MB** / file

## Biến môi trường

| Biến                             | Bắt buộc | Mô tả                                                 | Mặc định                |
| -------------------------------- | -------- | ----------------------------------------------------- | ----------------------- |
| `GCS_BUCKET`                     | ✅       | Tên GCS bucket                                        | —                       |
| `GCS_PROJECT_ID`                 | ✅       | Google Cloud project ID                               | —                       |
| `TOTP_SECRET`                    | ✅       | TOTP shared secret (Base32). Dùng để validate mã 6 số | —                       |
| `PORT`                           | ❌       | Port server                                           | `8080`                  |
| `GITHUB_REPO`                    | ❌       | `owner/repo` trên GitHub, dùng cho redirect `/install` | `YOUR_USER/file-garage` |
| `GITHUB_BRANCH`                  | ❌       | Branch chứa install scripts                            | `main`                  |
| `SERVER_URL`                     | ❌       | Public URL của server, nhúng vào install script       | tự detect từ request    |
| `GOOGLE_APPLICATION_CREDENTIALS` | ❌       | Đường dẫn đến service account JSON (chỉ local)        | —                       |

## Cấu hình TOTP

Server và client dùng chung một **TOTP secret** (Base32 encoded). Client tạo mã 6 số bằng app như Google Authenticator, Authy, hoặc command line.

### Tạo TOTP secret

```bash
# Python
python3 -c "import pyotp; secret = pyotp.random_base32(); print(f'Secret: {secret}'); print(f'OTP URI: {pyotp.totp.TOTP(secret).provisioning_uri(name=\"file-garage\", issuer_name=\"FileGarage\")}')"

# Hoặc dùng bất kỳ TOTP generator nào
```

### Lấy mã TOTP 6 số (client-side)

```bash
# Python (cài pyotp: pip install pyotp)
python3 -c "import pyotp; print(pyotp.TOTP('YOUR_TOTP_SECRET').now())"

# Hoặc dùng Google Authenticator / Authy app (quét QR code từ OTP URI)
```

## Chạy local

```bash
# 1. Cài dependencies
go mod tidy

# 2. Set biến môi trường
export GCS_BUCKET=your-bucket
export GCS_PROJECT_ID=your-project
export TOTP_SECRET=JBSWY3DPEHPK3PXP
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa-key.json

# 3. Chạy server
go run main.go
```

## Sử dụng (curl)

### Upload file

```bash
# Lấy mã TOTP 6 số từ authenticator app hoặc CLI
OTP=$(python3 -c "import pyotp; print(pyotp.TOTP('YOUR_TOTP_SECRET').now())")

curl -H "X-Auth-Key: $OTP" -F "file=@myfile.txt" http://localhost:8080/upload
```

Response:

```json
{
  "id": 1,
  "filename": "myfile.txt",
  "size": 12345,
  "uploaded_at": "2026-05-25T15:20:00Z",
  "expires_at": "2026-05-26T15:20:00Z",
  "message": "upload successful"
}
```

### Xem danh sách file (không cần auth)

```bash
curl http://localhost:8080/list
```

Response:

```json
{
  "files": [
    {
      "id": 1,
      "filename": "myfile.txt",
      "size": 12345,
      "uploaded_at": "2026-05-25T15:20:00Z",
      "expires_at": "2026-05-26T15:20:00Z"
    }
  ],
  "total": 1
}
```

### Download file

```bash
# Lấy mã TOTP
OTP=$(python3 -c "import pyotp; print(pyotp.TOTP('YOUR_TOTP_SECRET').now())")

# -O: lưu với tên từ URL, -J: lưu với tên từ Content-Disposition header
curl -H "X-Auth-Key: $OTP" -OJ "http://localhost:8080/download?id=1"
```

### Health check

```bash
curl http://localhost:8080/health
```

### Cài fg-cli từ server

```bash
# Unix/macOS
curl -fsSL http://localhost:8080/install | sh

# Windows (PowerShell)
irm http://localhost:8080/install | iex
```

Server tự detect OS qua `User-Agent` và trả về script phù hợp.

## Docker

### Build image

```bash
docker build -t file-garage .
```

### Chạy container

```bash
docker run -p 8080:8080 \
  -e GCS_BUCKET=your-bucket \
  -e GCS_PROJECT_ID=your-project \
  -e TOTP_SECRET=YOUR_BASE32_SECRET \
  -e GOOGLE_APPLICATION_CREDENTIALS=/secrets/sa-key.json \
  -v /path/to/sa-key.json:/secrets/sa-key.json:ro \
  file-garage
```

## Deploy lên Cloud Run

### 1. Chuẩn bị

```bash
export PROJECT_ID=your-project-id
export REGION=asia-southeast1
export REPO_NAME=file-garage
export IMAGE_NAME=file-garage
export GCS_BUCKET=your-bucket-name
export TOTP_SECRET=YOUR_BASE32_SECRET
```

### 2. Tạo Artifact Registry repository (lần đầu)

```bash
gcloud artifacts repositories create $REPO_NAME \
  --repository-format=docker \
  --location=$REGION \
  --project=$PROJECT_ID
```

### 3. Build & Push

```bash
# Cấu hình Docker auth
gcloud auth configure-docker ${REGION}-docker.pkg.dev

# Build
docker build -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${IMAGE_NAME}:latest .

# Push
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${IMAGE_NAME}:latest
```

### 4. Deploy

```bash
gcloud run deploy $IMAGE_NAME \
  --image=${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${IMAGE_NAME}:latest \
  --platform=managed \
  --region=$REGION \
  --project=$PROJECT_ID \
  --set-env-vars="GCS_BUCKET=${GCS_BUCKET},GCS_PROJECT_ID=${PROJECT_ID},TOTP_SECRET=${TOTP_SECRET}" \
  --allow-unauthenticated \
  --memory=256Mi \
  --max-instances=3
```

### 5. IAM — Cấp quyền GCS cho Cloud Run service account

```bash
# Lấy service account mặc định của Cloud Run
SA_EMAIL=$(gcloud iam service-accounts list \
  --filter="displayName:Compute Engine default" \
  --format="value(email)" \
  --project=$PROJECT_ID)

# Cấp quyền Storage Object Admin
gsutil iam ch serviceAccount:${SA_EMAIL}:roles/storage.objectAdmin gs://${GCS_BUCKET}
```

### 6. Sử dụng

```bash
SERVICE_URL=$(gcloud run services describe $IMAGE_NAME --region=$REGION --format="value(status.url)")

# Lấy mã TOTP
OTP=$(python3 -c "import pyotp; print(pyotp.TOTP('$TOTP_SECRET').now())")

# Upload
curl -H "X-Auth-Key: $OTP" -F "file=@myfile.txt" $SERVICE_URL/upload

# List (không cần auth)
curl $SERVICE_URL/list

# Download
OTP=$(python3 -c "import pyotp; print(pyotp.TOTP('$TOTP_SECRET').now())")
curl -H "X-Auth-Key: $OTP" -OJ "$SERVICE_URL/download?id=1"
```

## Lưu ý

- **SQLite trong container**: Database metadata nằm trong container. Khi container restart/redeploy, metadata sẽ bị reset. File vẫn còn trên GCS nhưng không được index lại. Đây là thiết kế phù hợp cho **lưu trữ tạm thời**.
- **TTL**: File tự động xóa sau 24 giờ (cả metadata lẫn GCS object). Cleanup chạy mỗi 1 giờ.
- **Authentication (TOTP)**: Upload và download cần mã TOTP 6 số qua header `X-Auth-Key`. List và health check mở public.
- **TOTP window**: Mã TOTP có hiệu lực trong 30 giây (mặc định). Thư viện `pquerna/otp` chấp nhận ±1 period (tổng ~90 giây) để bù trừ lệch thời gian giữa client và server.
