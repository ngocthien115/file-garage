# fg-cli

CLI tool cho [File Garage](../README.md). Dùng lệnh `fg` thay vì gõ `curl` dài dòng.

## Yêu cầu

- [Go 1.22+](https://go.dev/dl/)

## Build

```bash
cd fg-cli
```

### Linux

```bash
GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o fg .
```

### macOS (Intel)

```bash
GOOS=darwin GOARCH=amd64 go build -ldflags="-s -w" -o fg .
```

### macOS (Apple Silicon)

```bash
GOOS=darwin GOARCH=arm64 go build -ldflags="-s -w" -o fg .
```

### Windows

```powershell
$env:GOOS="windows"; $env:GOARCH="amd64"; go build -ldflags="-s -w" -o fg.exe .
```

> **Build cross-platform từ một máy**: Go hỗ trợ cross-compile sẵn, chỉ cần đổi `GOOS` và `GOARCH` là được, không cần máy ảo hay Docker.

## Cài đặt sau khi build

### Linux/macOS

```bash
sudo mv fg /usr/local/bin/fg
```

### Windows

Di chuyển `fg.exe` vào một thư mục có trong `PATH`, ví dụ:

```powershell
Move-Item fg.exe "$env:LOCALAPPDATA\Programs\fg\fg.exe"
# Thêm vào PATH nếu chưa có
$p = [Environment]::GetEnvironmentVariable("PATH","User")
[Environment]::SetEnvironmentVariable("PATH", "$p;$env:LOCALAPPDATA\Programs\fg", "User")
```

## Cấu hình

Đặt biến môi trường `FG_SERVER` trỏ về server File Garage của bạn:

```bash
# Linux/macOS — thêm vào ~/.bashrc hoặc ~/.zshrc
export FG_SERVER=https://your-server.com

# Windows (PowerShell)
[Environment]::SetEnvironmentVariable("FG_SERVER", "https://your-server.com", "User")
```

Nếu không set, mặc định là `http://localhost:8080`.

## Sử dụng

```bash
fg ls                          # Liệt kê file trên server
fg -u ./file.txt -otp 123456   # Upload file
fg -g 1 -otp 123456            # Download file ID=1 về thư mục hiện tại
fg uninstall                   # Hướng dẫn gỡ cài đặt
```
