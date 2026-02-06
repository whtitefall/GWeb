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
	// OpenAI-compatible endpoint override (defaults to OpenAI cloud API).
	openAIEndpoint string
	// Default provider used when request does not specify one.
	aiDefaultProvider string
	// External Python model server endpoint (FastAPI service backed by vLLM).
	modelServerEndpoint string
	modelServerModel    string
	modelServerAPIKey   string
	// SUPABASE_JWT_SECRET supports legacy HS256 projects.
	supabaseJWTSecret string
	// ES256 projects use Supabase JWKS; keep an in-memory cache to avoid frequent fetches.
	jwkCache map[string]jwkCacheEntry
	jwkMu    sync.RWMutex
}
