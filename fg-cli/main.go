package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

const defaultServer = "http://localhost:8080"

func getServer() string {
	if s := os.Getenv("FG_SERVER"); s != "" {
		return strings.TrimRight(s, "/")
	}
	return defaultServer
}

func printUsage() {
	fmt.Println(`fg - File Garage CLI

Usage:
  fg ls                          List all available files
  fg -u <file> -otp <code>       Upload a file
  fg -g <id>   -otp <code>       Download a file by ID
  fg uninstall                   Remove fg from your system

Environment:
  FG_SERVER   Server URL (default: http://localhost:8080)

Examples:
  fg ls
  fg -u ./report.pdf -otp 123456
  fg -g 3 -otp 123456`)
}

// formatSize converts bytes to a human-readable string.
func formatSize(bytes int64) string {
	switch {
	case bytes >= 1<<20:
		return fmt.Sprintf("%.1fMB", float64(bytes)/float64(1<<20))
	case bytes >= 1<<10:
		return fmt.Sprintf("%.1fKB", float64(bytes)/float64(1<<10))
	default:
		return fmt.Sprintf("%dB", bytes)
	}
}

// cmdList calls GET /list and prints files.
func cmdList() {
	resp, err := http.Get(getServer() + "/list")
	if err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}
	defer resp.Body.Close()

	var result struct {
		Files []struct {
			ID         int       `json:"id"`
			Filename   string    `json:"filename"`
			Size       int64     `json:"size"`
			UploadedAt time.Time `json:"uploaded_at"`
			ExpiresAt  time.Time `json:"expires_at"`
		} `json:"files"`
		Total int `json:"total"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		fmt.Fprintf(os.Stderr, "error parsing response: %v\n", err)
		os.Exit(1)
	}

	if result.Total == 0 {
		fmt.Println("No files available.")
		return
	}

	for _, f := range result.Files {
		fmt.Printf("ID: %d, Name: %s, Size: %s\n", f.ID, f.Filename, formatSize(f.Size))
	}
}

// cmdUpload uploads a file to the server.
func cmdUpload(filePath, otp string) {
	f, err := os.Open(filePath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "error opening file: %v\n", err)
		os.Exit(1)
	}
	defer f.Close()

	var body bytes.Buffer
	mw := multipart.NewWriter(&body)
	fw, err := mw.CreateFormFile("file", filepath.Base(filePath))
	if err != nil {
		fmt.Fprintf(os.Stderr, "error creating form: %v\n", err)
		os.Exit(1)
	}
	if _, err := io.Copy(fw, f); err != nil {
		fmt.Fprintf(os.Stderr, "error reading file: %v\n", err)
		os.Exit(1)
	}
	mw.Close()

	req, err := http.NewRequest(http.MethodPost, getServer()+"/upload", &body)
	if err != nil {
		fmt.Fprintf(os.Stderr, "error creating request: %v\n", err)
		os.Exit(1)
	}
	req.Header.Set("Content-Type", mw.FormDataContentType())
	req.Header.Set("X-Auth-Key", otp)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)

	if resp.StatusCode != http.StatusCreated {
		errMsg, _ := result["error"].(string)
		fmt.Fprintf(os.Stderr, "upload failed (%d): %s\n", resp.StatusCode, errMsg)
		os.Exit(1)
	}

	id := result["id"]
	filename, _ := result["filename"].(string)
	size := result["size"]
	fmt.Printf("Upload successful! ID: %v, Name: %s, Size: %v bytes\n", id, filename, size)
}

// cmdDownload downloads a file by ID and saves it to the current directory.
func cmdDownload(idStr, otp string) {
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		fmt.Fprintf(os.Stderr, "error: id must be a positive integer\n")
		os.Exit(1)
	}

	req, err := http.NewRequest(http.MethodGet, fmt.Sprintf("%s/download?id=%d", getServer(), id), nil)
	if err != nil {
		fmt.Fprintf(os.Stderr, "error creating request: %v\n", err)
		os.Exit(1)
	}
	req.Header.Set("X-Auth-Key", otp)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		var result map[string]string
		json.NewDecoder(resp.Body).Decode(&result)
		errMsg := result["error"]
		fmt.Fprintf(os.Stderr, "download failed (%d): %s\n", resp.StatusCode, errMsg)
		os.Exit(1)
	}

	// Parse filename from Content-Disposition header.
	filename := parseFilename(resp.Header.Get("Content-Disposition"), idStr)

	out, err := os.Create(filename)
	if err != nil {
		fmt.Fprintf(os.Stderr, "error creating file: %v\n", err)
		os.Exit(1)
	}
	defer out.Close()

	written, err := io.Copy(out, resp.Body)
	if err != nil {
		fmt.Fprintf(os.Stderr, "error saving file: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("Downloaded: %s (%s)\n", filename, formatSize(written))
}

// parseFilename extracts filename from Content-Disposition header.
// Falls back to "file_<id>" if header is missing or malformed.
func parseFilename(header, fallbackID string) string {
	// Content-Disposition: attachment; filename="example.txt"
	for _, part := range strings.Split(header, ";") {
		part = strings.TrimSpace(part)
		if strings.HasPrefix(part, "filename=") {
			name := strings.TrimPrefix(part, "filename=")
			name = strings.Trim(name, `"`)
			if name != "" {
				return name
			}
		}
	}
	return "file_" + fallbackID
}

// cmdUninstall prints instructions to manually remove fg from the system.
func cmdUninstall() {
	exePath, _ := os.Executable()

	fmt.Println("To uninstall fg, remove the binary manually:")
	fmt.Println()
	fmt.Println("  Unix/macOS:")
	if exePath != "" {
		fmt.Printf("    rm %s\n", exePath)
	} else {
		fmt.Println("    rm $(which fg)")
	}
	fmt.Println()
	fmt.Println("  Windows (PowerShell):")
	if exePath != "" {
		fmt.Printf("    Remove-Item \"%s\"\n", filepath.ToSlash(exePath))
	} else {
		fmt.Println("    Remove-Item (Get-Command fg).Source")
	}
	fmt.Println()
	fmt.Println("  Then remove the install directory from your PATH (Windows only):")
	fmt.Println(`    $p = [Environment]::GetEnvironmentVariable("PATH","User")`)
	fmt.Println(`    $p = ($p -split ";" | Where-Object { $_ -notlike "*\Programs\fg*" }) -join ";"`)
	fmt.Println(`    [Environment]::SetEnvironmentVariable("PATH", $p, "User")`)
}

func main() {
	args := os.Args[1:]
	if len(args) == 0 {
		printUsage()
		os.Exit(1)
	}

	if args[0] == "ls" {
		cmdList()
		return
	}

	if args[0] == "uninstall" {
		cmdUninstall()
		return
	}

	// Parse flags: -u, -g, -otp
	var uploadFile, downloadID, otpCode string
	for i := 0; i < len(args); i++ {
		switch args[i] {
		case "-u":
			if i+1 < len(args) {
				uploadFile = args[i+1]
				i++
			}
		case "-g":
			if i+1 < len(args) {
				downloadID = args[i+1]
				i++
			}
		case "-otp":
			if i+1 < len(args) {
				otpCode = args[i+1]
				i++
			}
		default:
			fmt.Fprintf(os.Stderr, "unknown flag: %s\n", args[i])
			printUsage()
			os.Exit(1)
		}
	}

	switch {
	case uploadFile != "":
		if otpCode == "" {
			fmt.Fprintln(os.Stderr, "error: -otp is required for upload")
			os.Exit(1)
		}
		cmdUpload(uploadFile, otpCode)
	case downloadID != "":
		if otpCode == "" {
			fmt.Fprintln(os.Stderr, "error: -otp is required for download")
			os.Exit(1)
		}
		cmdDownload(downloadID, otpCode)
	default:
		printUsage()
		os.Exit(1)
	}
}
