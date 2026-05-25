# Install fg CLI tool (Windows PowerShell)
# Usage: irm https://raw.githubusercontent.com/ngocthien115/file-garage/main/fg-cli/install.ps1 | iex

$ErrorActionPreference = "Stop"

$REPO = "ngocthien115/file-garage"  # e.g. "user/file-garage"
$BINARY = "fg.exe"
$INSTALL_DIR = "$env:LOCALAPPDATA\Programs\fg"

$RELEASE_URL = "https://github.com/$REPO/releases/latest/download/fg-windows-amd64.exe"

Write-Host "Downloading fg CLI from $RELEASE_URL ..."
New-Item -ItemType Directory -Force -Path $INSTALL_DIR | Out-Null
Invoke-WebRequest -Uri $RELEASE_URL -OutFile "$INSTALL_DIR\$BINARY"

# Add to PATH if not already present
$CurrentPath = [Environment]::GetEnvironmentVariable("PATH", "User")
if ($CurrentPath -notlike "*$INSTALL_DIR*") {
    [Environment]::SetEnvironmentVariable("PATH", "$CurrentPath;$INSTALL_DIR", "User")
    Write-Host "Added $INSTALL_DIR to your PATH (restart your terminal to apply)."
}

Write-Host "fg installed to $INSTALL_DIR\$BINARY"
Write-Host ""
Write-Host "Set your server URL:"
Write-Host '  $env:FG_SERVER = "https://your-garage-server.com"'
Write-Host ""
Write-Host "Usage:"
Write-Host "  fg ls"
Write-Host "  fg -u .\file.txt -otp 123456"
Write-Host "  fg -g 1 -otp 123456"
