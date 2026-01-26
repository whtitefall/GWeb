package main

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
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
	Name  string          `json:"name"`
	Nodes json.RawMessage `json:"nodes"`
	Edges json.RawMessage `json:"edges"`
}

type server struct {
	pool        *pgxpool.Pool
	graphID     string
	corsOrigins []string
	openAIKey   string
	openAIModel string
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

	openAIKey := strings.TrimSpace(os.Getenv("OPENAI_API_KEY"))
	openAIModel := strings.TrimSpace(os.Getenv("OPENAI_MODEL"))
	if openAIModel == "" {
		openAIModel = defaultOpenAIModel
	}
	if openAIKey == "" {
		log.Print("OPENAI_API_KEY not set; /api/ai/graph will be disabled")
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
		openAIKey:   openAIKey,
		openAIModel: openAIModel,
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
		w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
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
		data = []byte(`{"name":"Default Graph","nodes":[],"edges":[]}`)
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

	if strings.TrimSpace(payload.Name) == "" {
		payload.Name = "Default Graph"
		body, _ = json.Marshal(payload)
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

type graphSummary struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	UpdatedAt time.Time `json:"updatedAt"`
}

func (s *server) handleGraphs(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		s.handleListGraphs(w, r)
	case http.MethodPost:
		s.handleCreateGraph(w, r)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (s *server) handleGraphByID(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/graphs/")
	if id == "" || strings.Contains(id, "/") {
		http.Error(w, "graph id required", http.StatusBadRequest)
		return
	}

	switch r.Method {
	case http.MethodGet:
		s.handleGetGraphByID(w, r, id)
	case http.MethodPut:
		s.handlePutGraphByID(w, r, id)
	case http.MethodDelete:
		s.handleDeleteGraphByID(w, r, id)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (s *server) handleListGraphs(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
	defer cancel()

	rows, err := s.pool.Query(ctx, `SELECT id, COALESCE(data->>'name', 'Untitled Graph') AS name, updated_at
		FROM graphs ORDER BY updated_at DESC`)
	if err != nil {
		log.Printf("failed to list graphs: %v", err)
		http.Error(w, "failed to list graphs", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var summaries []graphSummary
	for rows.Next() {
		var summary graphSummary
		if err := rows.Scan(&summary.ID, &summary.Name, &summary.UpdatedAt); err != nil {
			log.Printf("failed to scan graph: %v", err)
			http.Error(w, "failed to list graphs", http.StatusInternalServerError)
			return
		}
		summaries = append(summaries, summary)
	}

	if err := rows.Err(); err != nil {
		log.Printf("failed to list graphs: %v", err)
		http.Error(w, "failed to list graphs", http.StatusInternalServerError)
		return
	}

	writeJSON(w, summaries)
}

func (s *server) handleCreateGraph(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
	defer cancel()

	body, err := readBody(r)
	if err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}

	payload := graphPayload{
		Name:  "Untitled Graph",
		Nodes: []byte("[]"),
		Edges: []byte("[]"),
	}

	if len(bytes.TrimSpace(body)) > 0 {
		if err := json.Unmarshal(body, &payload); err != nil {
			http.Error(w, "invalid json", http.StatusBadRequest)
			return
		}
		if payload.Nodes == nil || payload.Edges == nil {
			http.Error(w, "nodes and edges are required", http.StatusBadRequest)
			return
		}
	}

	if strings.TrimSpace(payload.Name) == "" {
		payload.Name = "Untitled Graph"
	}

	data, err := json.Marshal(payload)
	if err != nil {
		http.Error(w, "failed to encode graph", http.StatusInternalServerError)
		return
	}

	id, err := generateID()
	if err != nil {
		http.Error(w, "failed to create graph", http.StatusInternalServerError)
		return
	}

	var updatedAt time.Time
	err = s.pool.QueryRow(
		ctx,
		`INSERT INTO graphs (id, data, updated_at)
		 VALUES ($1, $2, now())
		 RETURNING updated_at`,
		id,
		data,
	).Scan(&updatedAt)
	if err != nil {
		log.Printf("failed to create graph: %v", err)
		http.Error(w, "failed to create graph", http.StatusInternalServerError)
		return
	}

	writeJSON(w, graphSummary{
		ID:        id,
		Name:      payload.Name,
		UpdatedAt: updatedAt,
	})
}

func (s *server) handleGetGraphByID(w http.ResponseWriter, r *http.Request, id string) {
	ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
	defer cancel()

	var data []byte
	err := s.pool.QueryRow(ctx, "SELECT data FROM graphs WHERE id=$1", id).Scan(&data)
	if errors.Is(err, pgx.ErrNoRows) {
		http.Error(w, "graph not found", http.StatusNotFound)
		return
	} else if err != nil {
		log.Printf("failed to read graph: %v", err)
		http.Error(w, "failed to load graph", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}

func (s *server) handlePutGraphByID(w http.ResponseWriter, r *http.Request, id string) {
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

	if strings.TrimSpace(payload.Name) == "" {
		payload.Name = "Untitled Graph"
		body, _ = json.Marshal(payload)
	}

	_, err = s.pool.Exec(
		ctx,
		`INSERT INTO graphs (id, data, updated_at)
		 VALUES ($1, $2, now())
		 ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
		id,
		body,
	)
	if err != nil {
		log.Printf("failed to save graph: %v", err)
		http.Error(w, "failed to save graph", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (s *server) handleDeleteGraphByID(w http.ResponseWriter, r *http.Request, id string) {
	ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
	defer cancel()

	cmd, err := s.pool.Exec(ctx, "DELETE FROM graphs WHERE id=$1", id)
	if err != nil {
		log.Printf("failed to delete graph: %v", err)
		http.Error(w, "failed to delete graph", http.StatusInternalServerError)
		return
	}

	if cmd.RowsAffected() == 0 {
		http.Error(w, "graph not found", http.StatusNotFound)
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
