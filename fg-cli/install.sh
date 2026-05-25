#!/bin/sh
# Install fg CLI tool
# Usage: curl -fsSL https://raw.githubusercontent.com/ngocthien115/file-garage/main/fg-cli/install.sh | sh

set -e

REPO="ngocthien115/file-garage"
BINARY="fg"
INSTALL_DIR="/usr/local/bin"

OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)
case "$ARCH" in
  x86_64) ARCH="amd64" ;;
  aarch64|arm64) ARCH="arm64" ;;
  *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
esac

RELEASE_URL="https://github.com/${REPO}/releases/latest/download/fg-${OS}-${ARCH}"

echo "Downloading fg CLI from ${RELEASE_URL} ..."
curl -fsSL "$RELEASE_URL" -o "/tmp/${BINARY}"
chmod +x "/tmp/${BINARY}"

if [ -w "$INSTALL_DIR" ]; then
  mv "/tmp/${BINARY}" "${INSTALL_DIR}/${BINARY}"
else
  sudo mv "/tmp/${BINARY}" "${INSTALL_DIR}/${BINARY}"
fi

echo "fg installed to ${INSTALL_DIR}/${BINARY}"
echo ""
echo "Set your server URL:"
echo "  export FG_SERVER=https://your-garage-server.com"
echo ""
echo "Usage:"
echo "  fg ls"
echo "  fg -u ./file.txt -otp 123456"
echo "  fg -g 1 -otp 123456"
