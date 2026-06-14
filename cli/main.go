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
    "strings"
)

const (
    tempUploadURL   = "https://temp.sh/upload"
    serverUploadURL = "http://localhost:8080/api/upload"
    listURL         = "http://localhost:8080/api/list"
)

type serverPayload struct {
    FileName string `json:"fileName"`
    URL      string `json:"url"`
}

func main() {
    if len(os.Args) < 2 {
        fmt.Println("Usage: fgr <command> [args]")
        fmt.Println("Commands:")
        fmt.Println("  upload <filePath>   Upload a file to temp.sh and register the link")
        fmt.Println("  ls                  List stored links")
        os.Exit(1)
    }

    switch os.Args[1] {
    case "upload":
        if len(os.Args) < 3 {
            fmt.Println("Missing file path for upload command")
            os.Exit(1)
        }
        filePath := os.Args[2]
        if err := uploadCommand(filePath); err != nil {
            fmt.Fprintf(os.Stderr, "Error: %v\n", err)
            os.Exit(1)
        }
    case "ls":
        if err := listCommand(); err != nil {
            fmt.Fprintf(os.Stderr, "Error: %v\n", err)
            os.Exit(1)
        }
    default:
        fmt.Printf("Unknown command: %s\n", os.Args[1])
        os.Exit(1)
    }
}

func uploadCommand(filePath string) error {
    // 1. Upload to temp.sh
    link, err := uploadToTempSh(filePath)
    if err != nil {
        return fmt.Errorf("failed to upload to temp.sh: %w", err)
    }
    fmt.Printf("Temp.sh link: %s\n", link)

    // 2. Extract file name from the link (last path segment)
    fileName := extractFileName(link)

    // 3. Send to our server API
    if err := postToServer(fileName, link); err != nil {
        return fmt.Errorf("failed to post to server: %w", err)
    }
    fmt.Println("Link registered on server")

    // No longer storing link locally; upload to server is sufficient
    return nil
}

func listCommand() error {
    // Fetch the list of links from the server API
    resp, err := http.Get(listURL)
    if err != nil {
        return fmt.Errorf("failed to fetch list from server: %w", err)
    }
    defer resp.Body.Close()

    if resp.StatusCode < 200 || resp.StatusCode >= 300 {
        body, _ := io.ReadAll(resp.Body)
        return fmt.Errorf("server responded with %d: %s", resp.StatusCode, string(body))
    }

    // Expect JSON array of strings, but fall back to plain text lines if unmarshalling fails
    bodyBytes, err := io.ReadAll(resp.Body)
    if err != nil {
        return err
    }
    var links []string
    if jsonErr := json.Unmarshal(bodyBytes, &links); jsonErr != nil {
        // Assume plain text with one link per line
        lines := strings.Split(strings.TrimSpace(string(bodyBytes)), "\n")
        for _, l := range lines {
            // Derive file name from the URL for nicer output
            name := extractFileName(l)
            if name == "" {
                fmt.Println(l)
            } else {
                fmt.Printf("%s -> %s\n", name, l)
            }
        }
        return nil
    }
    // JSON array of URLs – display file name and URL nicely
    for _, l := range links {
        name := extractFileName(l)
        if name == "" {
            fmt.Println(l)
        } else {
            fmt.Printf("%s -> %s\n", name, l)
        }
    }
    return nil
}

func uploadToTempSh(filePath string) (string, error) {
    file, err := os.Open(filePath)
    if err != nil {
        return "", err
    }
    defer file.Close()

    var requestBody bytes.Buffer
    writer := multipart.NewWriter(&requestBody)
    part, err := writer.CreateFormFile("file", filepath.Base(filePath))
    if err != nil {
        return "", err
    }
    if _, err = io.Copy(part, file); err != nil {
        return "", err
    }
    writer.Close()

    req, err := http.NewRequest("POST", tempUploadURL, &requestBody)
    if err != nil {
        return "", err
    }
    req.Header.Set("Content-Type", writer.FormDataContentType())

    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        return "", err
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
        bodyBytes, _ := io.ReadAll(resp.Body)
        return "", fmt.Errorf("unexpected status %d: %s", resp.StatusCode, string(bodyBytes))
    }
    linkBytes, err := io.ReadAll(resp.Body)
    if err != nil {
        return "", err
    }
    return strings.TrimSpace(string(linkBytes)), nil
}

func extractFileName(link string) string {
    // The link format is something like https://temp.sh/abcxyz/file-name-here.docx
    // We take the last segment after the final '/'
    parts := strings.Split(strings.TrimSpace(link), "/")
    if len(parts) == 0 {
        return ""
    }
    return parts[len(parts)-1]
}

func postToServer(fileName, url string) error {
    payload := serverPayload{FileName: fileName, URL: url}
    jsonData, err := json.Marshal(payload)
    if err != nil {
        return err
    }
    req, err := http.NewRequest("POST", serverUploadURL, bytes.NewReader(jsonData))
    if err != nil {
        return err
    }
    req.Header.Set("Content-Type", "application/json")
    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        return err
    }
    defer resp.Body.Close()
    if resp.StatusCode < 200 || resp.StatusCode >= 300 {
        body, _ := io.ReadAll(resp.Body)
        return fmt.Errorf("server responded with %d: %s", resp.StatusCode, string(body))
    }
    return nil
}

func appendLink(link string) error {
    f, err := os.OpenFile(linksFileName, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
    if err != nil {
        return err
    }
    defer f.Close()
    if _, err := f.WriteString(link + "\n"); err != nil {
        return err
    }
    return nil
}
