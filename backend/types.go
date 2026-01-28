// Payload types shared by graph handlers and AI generation.
package main

import (
	"encoding/json"
	"time"
)

// graphPayload mirrors frontend GraphPayload with JSON-encoded nodes/edges.
type graphPayload struct {
	Name  string          `json:"name"`
	Nodes json.RawMessage `json:"nodes"`
	Edges json.RawMessage `json:"edges"`
	Kind  string          `json:"kind,omitempty"`
}

// graphSummary is returned in graph lists.
type graphSummary struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	UpdatedAt time.Time `json:"updatedAt"`
}
