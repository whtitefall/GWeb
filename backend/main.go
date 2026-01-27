package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/joho/godotenv"
	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	_ = godotenv.Load()

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
