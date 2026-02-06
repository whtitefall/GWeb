// server holds runtime dependencies for request handlers.
package main

import (
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type jwkCacheEntry struct {
	key       any
	expiresAt time.Time
}

type server struct {
	pool        *pgxpool.Pool
	graphID     string
	corsOrigins []string
	openAIKey   string
	openAIModel string
	// SUPABASE_JWT_SECRET supports legacy HS256 projects.
	supabaseJWTSecret string
	// ES256 projects use Supabase JWKS; keep an in-memory cache to avoid frequent fetches.
	jwkCache map[string]jwkCacheEntry
	jwkMu    sync.RWMutex
}
