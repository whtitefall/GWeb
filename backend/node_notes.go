// Helpers for extracting node-level rich notes into a queryable DB column.
package main

import (
	"encoding/json"
	"strings"
)

var emptyNodeNotesJSON = []byte("[]")

type graphNodeForNotes struct {
	ID   string `json:"id"`
	Data struct {
		NodeNotes string `json:"nodeNotes"`
	} `json:"data"`
}

type nodeNotesEntry struct {
	ID        string `json:"id"`
	NodeNotes string `json:"nodeNotes"`
}

func extractNodeNotes(nodes json.RawMessage) []byte {
	if len(nodes) == 0 {
		return emptyNodeNotesJSON
	}

	var parsed []graphNodeForNotes
	if err := json.Unmarshal(nodes, &parsed); err != nil {
		return emptyNodeNotesJSON
	}

	entries := make([]nodeNotesEntry, 0, len(parsed))
	for _, node := range parsed {
		if strings.TrimSpace(node.Data.NodeNotes) == "" {
			continue
		}
		entries = append(entries, nodeNotesEntry{
			ID:        node.ID,
			NodeNotes: node.Data.NodeNotes,
		})
	}

	if len(entries) == 0 {
		return emptyNodeNotesJSON
	}

	data, err := json.Marshal(entries)
	if err != nil {
		return emptyNodeNotesJSON
	}
	return data
}
