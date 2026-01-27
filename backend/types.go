package main

import (
	"encoding/json"
	"time"
)

type graphPayload struct {
	Name  string          `json:"name"`
	Nodes json.RawMessage `json:"nodes"`
	Edges json.RawMessage `json:"edges"`
	Kind  string          `json:"kind,omitempty"`
}

type graphSummary struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	UpdatedAt time.Time `json:"updatedAt"`
}
