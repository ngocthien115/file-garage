package handler

import (
	"net/http"
	"strings"
)

// InstallHandler redirects to the appropriate install script on GitHub
// based on the client's User-Agent:
//   - Windows / PowerShell → install.ps1
//   - Unix/macOS/others    → install.sh
//
// Usage:
//
//	Unix:    curl -fsSL http://yourserver/install | sh
//	Windows: irm http://yourserver/install | iex
type InstallHandler struct {
	// GithubRepo is "owner/repo", e.g. "myuser/file-garage"
	GithubRepo string
	// Branch to pull scripts from (default: "main")
	Branch string
}

func (h *InstallHandler) branch() string {
	if h.Branch != "" {
		return h.Branch
	}
	return "main"
}

func (h *InstallHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	ua := strings.ToLower(r.UserAgent())
	isWindows := strings.Contains(ua, "windows") || strings.Contains(ua, "powershell")

	var scriptFile string
	if isWindows {
		scriptFile = "install.ps1"
	} else {
		scriptFile = "install.sh"
	}

	url := "https://raw.githubusercontent.com/" + h.GithubRepo + "/" + h.branch() + "/fg-cli/" + scriptFile
	http.Redirect(w, r, url, http.StatusFound)
}
