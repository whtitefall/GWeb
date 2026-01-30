// JWT auth helpers for Supabase access tokens.
package main

import (
	"errors"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

var errMissingAuth = errors.New("missing authorization")

type supabaseClaims struct {
	jwt.RegisteredClaims
	Role string `json:"role"`
}

func (s *server) requireUserID(r *http.Request) (string, error) {
	token, err := bearerToken(r)
	if err != nil {
		return "", err
	}
	claims := &supabaseClaims{}
	parsed, err := jwt.ParseWithClaims(token, claims, func(t *jwt.Token) (any, error) {
		if t.Method != jwt.SigningMethodHS256 {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(s.supabaseJWTSecret), nil
	})
	if err != nil || !parsed.Valid {
		return "", errors.New("invalid token")
	}
	if strings.TrimSpace(claims.Subject) == "" {
		return "", errors.New("missing subject")
	}
	return claims.Subject, nil
}

func bearerToken(r *http.Request) (string, error) {
	header := strings.TrimSpace(r.Header.Get("Authorization"))
	if header == "" {
		return "", errMissingAuth
	}
	parts := strings.SplitN(header, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return "", errMissingAuth
	}
	token := strings.TrimSpace(parts[1])
	if token == "" {
		return "", errMissingAuth
	}
	return token, nil
}
