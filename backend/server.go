package main

import "github.com/jackc/pgx/v5/pgxpool"

type server struct {
	pool        *pgxpool.Pool
	graphID     string
	corsOrigins []string
	openAIKey   string
	openAIModel string
}
