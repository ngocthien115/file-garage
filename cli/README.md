# fgr CLI – Build Instructions

This repository contains a simple Go command‑line tool named **fgr** that uploads a file to `temp.sh`, registers the returned link on a custom server, and can list stored links.

---

## Prerequisites

- **Go 1.22** or newer must be installed on the machine that performs the build. You can download it from the official site: https://go.dev/dl/
- The source code lives in the `cli/` directory.

---

## Building for macOS (Apple Silicon – M1/M2)

The M1 chip uses the `darwin` OS and the `arm64` architecture.

```bash
# Navigate to the cli folder
cd /Users/ngthien/stuff/file-garage/cli

# Build a binary for macOS (Apple Silicon)
GOOS=darwin GOARCH=arm64 go build -o fgr-macos-arm64
```

The resulting `fgr-macos-arm64` executable can be run on any macOS device with an Apple‑silicon processor.

---

## Building for Windows (64‑bit)

```bash
# From the cli folder
cd /Users/ngthien/stuff/file-garage/cli

# Build a Windows executable (amd64)
GOOS=windows GOARCH=amd64 go build -o fgr-windows-amd64.exe
```

The produced `fgr-windows-amd64.exe` can be copied to a Windows machine and executed directly.

---

## Quick Test (no Go runtime needed on target)

Both binaries are **stand‑alone**; they do not require Go to be installed on the target machine. After building, you can verify the binary works by running:

```bash
# macOS binary
./fgr-macos-arm64 upload /path/to/file.txt

# Windows binary (run on Windows CMD or PowerShell)
.\gr-windows-amd64.exe upload C:\path\to\file.txt
```

If you see the usage output or a successful upload message, the build succeeded.

---

## Notes

- The `GOOS` and `GOARCH` environment variables tell the Go toolchain to cross‑compile for the specified platform.
- If you encounter `cgo`‑related errors, add `CGO_ENABLED=0` to the build command to force a pure‑Go binary:
  ```bash
  CGO_ENABLED=0 GOOS=darwin GOARCH=arm64 go build -o fgr-macos-arm64
  ```
- The server URLs are hard‑coded in `main.go`. Adjust them if you deploy your own backend.

---

## License

This tool is provided under the MIT License. Feel free to modify and redistribute.
