package handler

import (
	"net/http"

	"github.com/pquerna/otp/totp"
)

// ValidateTOTP checks the X-Auth-Key header for a valid 6-digit TOTP code.
// Returns true if valid, otherwise writes a 401 response and returns false.
func ValidateTOTP(w http.ResponseWriter, r *http.Request, secret string) bool {
	code := r.Header.Get("X-Auth-Key")
	if code == "" {
		http.Error(w, `{"error":"unauthorized: missing X-Auth-Key header (TOTP code required)"}`, http.StatusUnauthorized)
		return false
	}

	if !totp.Validate(code, secret) {
		http.Error(w, `{"error":"unauthorized: invalid TOTP code"}`, http.StatusUnauthorized)
		return false
	}

	return true
}
