// GraphNotes backend entry point. Loads env config, connects to Postgres,
// and serves REST endpoints for graph persistence + AI generation.
package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env if present (safe in prod; no-op if missing).
	_ = godotenv.Load()

	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("DATABASE_URL is required")
	}

	// Legacy single-graph ID (used by /api/graph); multi-graph endpoints use /api/graphs/:id.
	graphID := os.Getenv("GRAPH_ID")
	if graphID == "" {
		graphID = "default"
	}

	// HTTP server configuration.
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	corsOrigin := os.Getenv("CORS_ORIGIN")
	if corsOrigin == "" {
		corsOrigin = "http://localhost:5173"
	}

	// OpenAI is optional; AI endpoint will be disabled without a key.
	openAIKey := strings.TrimSpace(os.Getenv("OPENAI_API_KEY"))
	openAIModel := strings.TrimSpace(os.Getenv("OPENAI_MODEL"))
	if openAIModel == "" {
		openAIModel = defaultOpenAIModel
	}
	if openAIKey == "" {
		log.Print("OPENAI_API_KEY not set; /api/ai/graph will be disabled")
	}
	supabaseJWTSecret := strings.TrimSpace(os.Getenv("SUPABASE_JWT_SECRET"))
	if supabaseJWTSecret == "" {
		log.Print("SUPABASE_JWT_SECRET not set; legacy HS256 tokens will not be accepted")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)

	pool, err := pgxpool.New(ctx, databaseURL)
	cancel()
	if err != nil {
		log.Fatalf("failed to create pool: %v", err)
	}
	defer pool.Close()

	pingCtx, pingCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer pingCancel()
	if err := pool.Ping(pingCtx); err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}

	migrateCtx, migrateCancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer migrateCancel()
	if err := ensureSchema(migrateCtx, pool); err != nil {
		log.Fatalf("failed to ensure schema: %v", err)
	}

	srv := &server{
		pool:              pool,
		graphID:           graphID,
		corsOrigins:       parseOrigins(corsOrigin),
		openAIKey:         openAIKey,
		openAIModel:       openAIModel,
		supabaseJWTSecret: supabaseJWTSecret,
		jwkCache:          make(map[string]jwkCacheEntry),
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/health", srv.handleHealth)
	mux.Handle("/api/graph", srv.withCORS(http.HandlerFunc(srv.handleGraph)))
	mux.Handle("/api/graphs", srv.withCORS(http.HandlerFunc(srv.handleGraphs)))
	mux.Handle("/api/graphs/", srv.withCORS(http.HandlerFunc(srv.handleGraphByID)))
	mux.Handle("/api/ai/graph", srv.withCORS(http.HandlerFunc(srv.handleAIGraph)))

	log.Printf("backend ready on :%s", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatalf("server stopped: %v", err)
	}
}
