// HTTP handlers for graph CRUD endpoints.
package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

func (s *server) handleHealth(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"ok"}`))
}

// Legacy single-graph endpoint used by early clients.
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
		data = []byte(`{"name":"Default Graph","nodes":[],"edges":[],"kind":"note"}`)
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
	if strings.TrimSpace(payload.Kind) == "" {
		payload.Kind = "note"
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

// Multi-graph collection endpoint (list + create).
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

// Per-graph CRUD handler.
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

// Lists graphs filtered by kind (defaults to "note").
func (s *server) handleListGraphs(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
	defer cancel()

	kind := strings.TrimSpace(r.URL.Query().Get("kind"))
	if kind == "" {
		kind = "note"
	}

	rows, err := s.pool.Query(
		ctx,
		`SELECT id, COALESCE(data->>'name', 'Untitled Graph') AS name, updated_at
		 FROM graphs
		 WHERE COALESCE(data->>'kind', 'note') = $1
		 ORDER BY updated_at DESC`,
		kind,
	)
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
		Kind:  "note",
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
	if strings.TrimSpace(payload.Kind) == "" {
		payload.Kind = "note"
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
	if strings.TrimSpace(payload.Kind) == "" {
		payload.Kind = "note"
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
