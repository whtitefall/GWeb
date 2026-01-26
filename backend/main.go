package main

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type graphPayload struct {
	Nodes json.RawMessage `json:"nodes"`
	Edges json.RawMessage `json:"edges"`
}

type server struct {
	pool        *pgxpool.Pool
	graphID     string
	corsOrigins []string
}

func main() {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("DATABASE_URL is required")
	}

	graphID := os.Getenv("GRAPH_ID")
	if graphID == "" {
		graphID = "default"
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	corsOrigin := os.Getenv("CORS_ORIGIN")
	if corsOrigin == "" {
		corsOrigin = "http://localhost:5173"
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		log.Fatalf("failed to create pool: %v", err)
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}

	srv := &server{
		pool:        pool,
		graphID:     graphID,
		corsOrigins: parseOrigins(corsOrigin),
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/health", srv.handleHealth)
	mux.Handle("/api/graph", srv.withCORS(http.HandlerFunc(srv.handleGraph)))

	log.Printf("backend ready on :%s", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatalf("server stopped: %v", err)
	}
}

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

func (s *server) withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if allowed := matchOrigin(origin, s.corsOrigins); allowed != "" {
			w.Header().Set("Access-Control-Allow-Origin", allowed)
		}
		w.Header().Set("Access-Control-Allow-Methods", "GET,PUT,OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
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

func (s *server) handleHealth(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"ok"}`))
}

func (s *server) handleGraph(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		s.handleGetGraph(w, r)
	case http.MethodPut:
		s.handlePutGraph(w, r)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (s *server) handleGetGraph(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
	defer cancel()

	var data []byte
	err := s.pool.QueryRow(ctx, "SELECT data FROM graphs WHERE id=$1", s.graphID).Scan(&data)
	if errors.Is(err, pgx.ErrNoRows) {
		data = []byte(`{"nodes":[],"edges":[]}`)
	} else if err != nil {
		log.Printf("failed to read graph: %v", err)
		http.Error(w, "failed to load graph", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}

func (s *server) handlePutGraph(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
	defer cancel()

	body, err := readBody(r)
	if err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}

	var payload graphPayload
	if err := json.Unmarshal(body, &payload); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	if payload.Nodes == nil || payload.Edges == nil {
		http.Error(w, "nodes and edges are required", http.StatusBadRequest)
		return
	}

	_, err = s.pool.Exec(
		ctx,
		`INSERT INTO graphs (id, data, updated_at)
		 VALUES ($1, $2, now())
		 ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
		s.graphID,
		body,
	)
	if err != nil {
		log.Printf("failed to save graph: %v", err)
		http.Error(w, "failed to save graph", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func readBody(r *http.Request) ([]byte, error) {
	if r.Body == nil {
		return nil, errors.New("missing body")
	}
	defer r.Body.Close()
	return io.ReadAll(io.LimitReader(r.Body, 2<<20))
}
