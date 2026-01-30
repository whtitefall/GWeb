// Shared helpers for HTTP request handling and ID generation.
package main

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
)

func readBody(r *http.Request) ([]byte, error) {
	if r.Body == nil {
		return nil, errors.New("missing body")
	}
	defer r.Body.Close()
	return io.ReadAll(io.LimitReader(r.Body, 2<<20))
}

func generateID() (string, error) {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}

func writeJSON(w http.ResponseWriter, value any) {
	w.Header().Set("Content-Type", "application/json")
	encoder := json.NewEncoder(w)
	if err := encoder.Encode(value); err != nil {
		http.Error(w, "failed to encode response", http.StatusInternalServerError)
	}
}

// userGraphID namespaces legacy single-graph ids by user to avoid collisions.
func userGraphID(userID, graphID string) string {
	if strings.TrimSpace(graphID) == "" {
		return userID
	}
	return userID + ":" + graphID
}
