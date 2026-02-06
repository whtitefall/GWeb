// JWT auth helpers for Supabase access tokens.
package main

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"encoding/base64"
	"encoding/json"
	"errors"
	"math/big"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var errMissingAuth = errors.New("missing authorization")

type supabaseClaims struct {
	jwt.RegisteredClaims
	Role string `json:"role"`
}

type supabaseJWKS struct {
	Keys []supabaseJWK `json:"keys"`
}

type supabaseJWK struct {
	Kid string `json:"kid"`
	Kty string `json:"kty"`
	Crv string `json:"crv"`
	X   string `json:"x"`
	Y   string `json:"y"`
}

func (s *server) requireUserID(r *http.Request) (string, error) {
	token, err := bearerToken(r)
	if err != nil {
		return "", err
	}

	unverifiedClaims := &supabaseClaims{}
	parser := jwt.NewParser()
	unverifiedToken, _, err := parser.ParseUnverified(token, unverifiedClaims)
	if err != nil {
		return "", errors.New("invalid token")
	}

	alg, _ := unverifiedToken.Header["alg"].(string)
	keyFunc, err := s.authKeyFunc(r.Context(), alg, unverifiedClaims.Issuer, unverifiedToken.Header)
	if err != nil {
		return "", errors.New("invalid token")
	}

	claims := &supabaseClaims{}
	parsed, err := jwt.ParseWithClaims(token, claims, keyFunc)
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

func (s *server) authKeyFunc(ctx context.Context, alg, issuer string, header map[string]any) (jwt.Keyfunc, error) {
	switch alg {
	case jwt.SigningMethodHS256.Alg():
		if strings.TrimSpace(s.supabaseJWTSecret) == "" {
			return nil, errors.New("missing hs256 secret")
		}
		return func(t *jwt.Token) (any, error) {
			if t.Method != jwt.SigningMethodHS256 {
				return nil, errors.New("unexpected signing method")
			}
			return []byte(s.supabaseJWTSecret), nil
		}, nil
	case jwt.SigningMethodES256.Alg():
		kid, _ := header["kid"].(string)
		publicKey, err := s.fetchJWKECDSAKey(ctx, issuer, kid)
		if err != nil {
			return nil, err
		}
		return func(t *jwt.Token) (any, error) {
			if t.Method != jwt.SigningMethodES256 {
				return nil, errors.New("unexpected signing method")
			}
			return publicKey, nil
		}, nil
	default:
		return nil, errors.New("unsupported signing method")
	}
}

func (s *server) fetchJWKECDSAKey(ctx context.Context, issuer, kid string) (*ecdsa.PublicKey, error) {
	issuer = strings.TrimSpace(issuer)
	if issuer == "" {
		return nil, errors.New("missing issuer")
	}

	cacheKey := issuer + "|" + kid
	now := time.Now()

	s.jwkMu.RLock()
	if cached, ok := s.jwkCache[cacheKey]; ok && cached.expiresAt.After(now) {
		if key, ok := cached.key.(*ecdsa.PublicKey); ok {
			s.jwkMu.RUnlock()
			return key, nil
		}
	}
	s.jwkMu.RUnlock()

	jwksURL := strings.TrimSuffix(issuer, "/") + "/.well-known/jwks.json"
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, jwksURL, nil)
	if err != nil {
		return nil, err
	}

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, errors.New("failed to fetch jwks")
	}

	var jwks supabaseJWKS
	if err := json.NewDecoder(resp.Body).Decode(&jwks); err != nil {
		return nil, err
	}

	key, err := findECDSAKey(jwks.Keys, kid)
	if err != nil {
		return nil, err
	}

	s.jwkMu.Lock()
	s.jwkCache[cacheKey] = jwkCacheEntry{
		key:       key,
		expiresAt: now.Add(1 * time.Hour),
	}
	s.jwkMu.Unlock()

	return key, nil
}

func findECDSAKey(keys []supabaseJWK, kid string) (*ecdsa.PublicKey, error) {
	for _, key := range keys {
		if !isMatchingECDSAKey(key, kid) {
			continue
		}
		return decodeECDSAPublicKey(key)
	}
	return nil, errors.New("matching jwk not found")
}

func isMatchingECDSAKey(key supabaseJWK, kid string) bool {
	if key.Kty != "EC" || key.Crv != "P-256" {
		return false
	}
	if strings.TrimSpace(kid) == "" {
		return true
	}
	return key.Kid == kid
}

func decodeECDSAPublicKey(jwk supabaseJWK) (*ecdsa.PublicKey, error) {
	xBytes, err := base64.RawURLEncoding.DecodeString(jwk.X)
	if err != nil {
		return nil, err
	}
	yBytes, err := base64.RawURLEncoding.DecodeString(jwk.Y)
	if err != nil {
		return nil, err
	}

	x := new(big.Int).SetBytes(xBytes)
	y := new(big.Int).SetBytes(yBytes)
	if x.Sign() == 0 || y.Sign() == 0 {
		return nil, errors.New("invalid ecdsa key")
	}

	return &ecdsa.PublicKey{
		Curve: elliptic.P256(),
		X:     x,
		Y:     y,
	}, nil
}
