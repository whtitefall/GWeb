// Simple CORS middleware for local dev + configurable origins.
package main

import (
	"net/http"
	"strings"
)

func parseOrigins(value string) []string {
	parts := strings.Split(value, ",")
	origins := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			origins = append(origins, trimmed)
		}
	}
	return origins
}

func matchOrigin(origin string, allowed []string) string {
	for _, entry := range allowed {
		if entry == "*" {
			return "*"
		}
		if origin != "" && strings.EqualFold(entry, origin) {
			return entry
		}
	}
	if len(allowed) > 0 && allowed[0] != "*" {
		return allowed[0]
	}
	return ""
}

func (s *server) withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if allowed := matchOrigin(origin, s.corsOrigins); allowed != "" {
			w.Header().Set("Access-Control-Allow-Origin", allowed)
		}
		w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}
