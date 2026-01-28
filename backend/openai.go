// OpenAI integration for AI-assisted graph generation.
package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"
)

const (
	openAIEndpoint     = "https://api.openai.com/v1/responses"
	defaultOpenAIModel = "gpt-4o-mini"
	defaultMaxNodes    = 28
	maxMaxNodes        = 80
	maxPromptChars     = 4000
)

type aiGraphRequest struct {
	Prompt   string `json:"prompt"`
	MaxNodes int    `json:"maxNodes,omitempty"`
}

type aiGraphResponse struct {
	Graph graphPayload `json:"graph"`
}

type openAIRequest struct {
	Model           string            `json:"model"`
	Input           []openAIInputItem `json:"input"`
	Text            openAITextConfig  `json:"text"`
	Temperature     float64           `json:"temperature,omitempty"`
	MaxOutputTokens int               `json:"max_output_tokens,omitempty"`
}

type openAIInputItem struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type openAITextConfig struct {
	Format openAIResponseFormat `json:"format"`
}

type openAIResponseFormat struct {
	Type   string `json:"type"`
	Name   string `json:"name,omitempty"`
	Schema any    `json:"schema,omitempty"`
	Strict bool   `json:"strict,omitempty"`
}

type openAIResponse struct {
	Output []openAIOutputItem `json:"output"`
	Error  *openAIError       `json:"error,omitempty"`
}

type openAIError struct {
	Message string `json:"message"`
}

type openAIOutputItem struct {
	Type    string                 `json:"type"`
	Role    string                 `json:"role,omitempty"`
	Content []openAIOutputContent  `json:"content,omitempty"`
	Meta    map[string]interface{} `json:"metadata,omitempty"`
}

type openAIOutputContent struct {
	Type    string `json:"type"`
	Text    string `json:"text,omitempty"`
	Refusal string `json:"refusal,omitempty"`
}

type aiGraphPayload struct {
	Name  string   `json:"name"`
	Nodes []aiNode `json:"nodes"`
	Edges []aiEdge `json:"edges"`
}

type aiNode struct {
	ID         string       `json:"id"`
	Type       string       `json:"type,omitempty"`
	Position   *aiPosition  `json:"position"`
	ParentNode string       `json:"parentNode,omitempty"`
	Extent     string       `json:"extent,omitempty"`
	Style      *aiNodeStyle `json:"style,omitempty"`
	Data       aiNodeData   `json:"data"`
}

type aiNodeStyle struct {
	Width  float64 `json:"width,omitempty"`
	Height float64 `json:"height,omitempty"`
}

type aiPosition struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

type aiNodeData struct {
	Label      string        `json:"label"`
	Items      []aiItem      `json:"items"`
	Position3d *aiPosition3d `json:"position3d,omitempty"`
}

type aiPosition3d struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
	Z float64 `json:"z"`
}

type aiItem struct {
	ID    string   `json:"id"`
	Title string   `json:"title"`
	Notes []aiNote `json:"notes"`
}

type aiNote struct {
	ID    string `json:"id"`
	Title string `json:"title"`
}

type aiEdge struct {
	ID     string `json:"id"`
	Source string `json:"source"`
	Target string `json:"target"`
	Type   string `json:"type,omitempty"`
}

// POST /api/ai/graph: validate input, call OpenAI, sanitize graph payload.
func (s *server) handleAIGraph(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if s.openAIKey == "" {
		http.Error(w, "OpenAI is not configured", http.StatusNotImplemented)
		return
	}

	body, err := readBody(r)
	if err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}

	var req aiGraphRequest
	if err := json.Unmarshal(body, &req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	prompt := strings.TrimSpace(req.Prompt)
	if prompt == "" {
		http.Error(w, "prompt is required", http.StatusBadRequest)
		return
	}

	if len(prompt) > maxPromptChars {
		http.Error(w, "prompt is too long", http.StatusBadRequest)
		return
	}

	maxNodes := clampInt(req.MaxNodes, defaultMaxNodes, maxMaxNodes)

	ctx, cancel := context.WithTimeout(r.Context(), 25*time.Second)
	defer cancel()

	graph, err := s.generateGraphFromPrompt(ctx, prompt, maxNodes)
	if err != nil {
		logMsg := err.Error()
		if len(logMsg) > 500 {
			logMsg = logMsg[:500]
		}
		log.Printf("ai graph failed: %s", logMsg)
		http.Error(w, "failed to generate graph", http.StatusBadGateway)
		return
	}

	writeJSON(w, aiGraphResponse{Graph: graph})
}

func (s *server) generateGraphFromPrompt(ctx context.Context, prompt string, maxNodes int) (graphPayload, error) {
	systemPrompt := buildSystemPrompt(maxNodes)

	request := openAIRequest{
		Model: s.openAIModel,
		Input: []openAIInputItem{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: prompt},
		},
		Text: openAITextConfig{
			Format: openAIResponseFormat{
				Type:   "json_schema",
				Name:   "graph_payload",
				Schema: graphSchema(),
				Strict: true,
			},
		},
		Temperature:     0.2,
		MaxOutputTokens: 1200,
	}

	raw, err := s.callOpenAI(ctx, request)
	if err != nil {
		return graphPayload{}, err
	}

	var response openAIResponse
	if err := json.Unmarshal(raw, &response); err != nil {
		return graphPayload{}, err
	}

	if response.Error != nil {
		return graphPayload{}, errors.New(response.Error.Message)
	}

	outputText, refusal := extractOutputText(response)
	if refusal != "" {
		return graphPayload{}, errors.New(refusal)
	}

	if strings.TrimSpace(outputText) == "" {
		return graphPayload{}, errors.New("empty response")
	}

	var graph aiGraphPayload
	if err := json.Unmarshal([]byte(outputText), &graph); err != nil {
		return graphPayload{}, err
	}

	sanitized := sanitizeAIGraph(graph, maxNodes)
	nodesJSON, err := json.Marshal(sanitized.Nodes)
	if err != nil {
		return graphPayload{}, err
	}
	edgesJSON, err := json.Marshal(sanitized.Edges)
	if err != nil {
		return graphPayload{}, err
	}

	name := strings.TrimSpace(sanitized.Name)
	if name == "" {
		name = "AI Graph"
	}

	return graphPayload{
		Name:  name,
		Nodes: nodesJSON,
		Edges: edgesJSON,
	}, nil
}

func (s *server) callOpenAI(ctx context.Context, payload openAIRequest) ([]byte, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, openAIEndpoint, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+s.openAIKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 25 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	if err != nil {
		return nil, err
	}

	if resp.StatusCode >= http.StatusBadRequest {
		return nil, fmt.Errorf("openai request failed: %s", strings.TrimSpace(string(raw)))
	}

	return raw, nil
}

func extractOutputText(response openAIResponse) (string, string) {
	var builder strings.Builder
	var refusal string
	for _, item := range response.Output {
		for _, content := range item.Content {
			switch content.Type {
			case "output_text":
				builder.WriteString(content.Text)
			case "refusal":
				if refusal == "" {
					refusal = content.Refusal
				}
			}
		}
	}
	return builder.String(), refusal
}

func sanitizeAIGraph(graph aiGraphPayload, maxNodes int) aiGraphPayload {
	name := strings.TrimSpace(graph.Name)
	if name == "" {
		name = "AI Graph"
	}

	nodes := make([]aiNode, 0, len(graph.Nodes))
	nodeIDs := make(map[string]struct{})
	for _, node := range graph.Nodes {
		if len(nodes) >= maxNodes {
			break
		}
		id := strings.TrimSpace(node.ID)
		if id == "" || hasKey(nodeIDs, id) {
			id = newID("node")
		}
		node.ID = id
		nodeIDs[id] = struct{}{}

		if strings.TrimSpace(node.Type) == "" {
			node.Type = "default"
		}
		if node.Position == nil {
			pos := gridPosition(len(nodes))
			node.Position = &pos
		}

		label := strings.TrimSpace(node.Data.Label)
		if label == "" {
			if node.Type == "group" {
				label = fmt.Sprintf("Group %d", len(nodes)+1)
			} else {
				label = fmt.Sprintf("Node %d", len(nodes)+1)
			}
			node.Data.Label = label
		}

		if node.Data.Items == nil {
			node.Data.Items = []aiItem{}
		}
		for i := range node.Data.Items {
			item := &node.Data.Items[i]
			if strings.TrimSpace(item.ID) == "" {
				item.ID = newID("item")
			}
			if strings.TrimSpace(item.Title) == "" {
				item.Title = fmt.Sprintf("Item %d", i+1)
			}
			if item.Notes == nil {
				item.Notes = []aiNote{}
			}
			for j := range item.Notes {
				note := &item.Notes[j]
				if strings.TrimSpace(note.ID) == "" {
					note.ID = newID("note")
				}
				if strings.TrimSpace(note.Title) == "" {
					note.Title = fmt.Sprintf("Note %d", j+1)
				}
			}
		}

		if node.Type == "group" {
			if node.Style == nil {
				node.Style = &aiNodeStyle{Width: 280, Height: 180}
			}
			if node.Style.Width == 0 {
				node.Style.Width = 280
			}
			if node.Style.Height == 0 {
				node.Style.Height = 180
			}
		}

		nodes = append(nodes, node)
	}

	for i := range nodes {
		if nodes[i].ParentNode != "" {
			if !hasKey(nodeIDs, nodes[i].ParentNode) {
				nodes[i].ParentNode = ""
				nodes[i].Extent = ""
			} else if nodes[i].Extent == "" {
				nodes[i].Extent = "parent"
			}
		}
	}

	edgeIDs := make(map[string]struct{})
	edges := make([]aiEdge, 0, len(graph.Edges))
	for _, edge := range graph.Edges {
		if !hasKey(nodeIDs, edge.Source) || !hasKey(nodeIDs, edge.Target) {
			continue
		}
		id := strings.TrimSpace(edge.ID)
		if id == "" || hasKey(edgeIDs, id) {
			id = newID("edge")
		}
		edge.ID = id
		edgeIDs[id] = struct{}{}
		edges = append(edges, edge)
	}

	return aiGraphPayload{
		Name:  name,
		Nodes: nodes,
		Edges: edges,
	}
}

func gridPosition(index int) aiPosition {
	const spacingX = 220.0
	const spacingY = 140.0
	columns := 4
	col := index % columns
	row := index / columns
	return aiPosition{
		X: float64(col) * spacingX,
		Y: float64(row) * spacingY,
	}
}

func buildSystemPrompt(maxNodes int) string {
	return fmt.Sprintf(
		`You are a graph builder. Return ONLY valid JSON matching the schema.
Rules:
- Keep node count <= %d.
- Use unique ids for nodes and edges.
- Provide position.x and position.y for each node.
- Use type="group" for containers and set child nodes' parentNode to the group id.
- Include items/notes only if they add value; otherwise use empty arrays.
- Always include all fields in the schema; use null for optional fields when unused (parentNode, extent, style, position3d).
- Use edge type "smoothstep".
- Edges must reference existing node ids.`,
		maxNodes,
	)
}

// JSON schema used for strict structured output from OpenAI.
func graphSchema() map[string]any {
	return map[string]any{
		"type":                 "object",
		"additionalProperties": false,
		"properties": map[string]any{
			"name": map[string]any{
				"type": "string",
			},
			"nodes": map[string]any{
				"type": "array",
				"items": map[string]any{
					"type":                 "object",
					"additionalProperties": false,
					"properties": map[string]any{
						"id": map[string]any{
							"type": "string",
						},
						"type": map[string]any{
							"type": "string",
						},
						"position": map[string]any{
							"type":                 "object",
							"additionalProperties": false,
							"properties": map[string]any{
								"x": map[string]any{"type": "number"},
								"y": map[string]any{"type": "number"},
							},
							"required": []string{"x", "y"},
						},
						"parentNode": map[string]any{
							"type": []string{"string", "null"},
						},
						"extent": map[string]any{
							"type": []string{"string", "null"},
						},
						"style": map[string]any{
							"type":                 []string{"object", "null"},
							"additionalProperties": false,
							"properties": map[string]any{
								"width":  map[string]any{"type": "number"},
								"height": map[string]any{"type": "number"},
							},
							"required": []string{"width", "height"},
						},
						"data": map[string]any{
							"type":                 "object",
							"additionalProperties": false,
							"properties": map[string]any{
								"label": map[string]any{"type": "string"},
								"position3d": map[string]any{
									"type":                 []string{"object", "null"},
									"additionalProperties": false,
									"properties": map[string]any{
										"x": map[string]any{"type": "number"},
										"y": map[string]any{"type": "number"},
										"z": map[string]any{"type": "number"},
									},
									"required": []string{"x", "y", "z"},
								},
								"items": map[string]any{
									"type": "array",
									"items": map[string]any{
										"type":                 "object",
										"additionalProperties": false,
										"properties": map[string]any{
											"id":    map[string]any{"type": "string"},
											"title": map[string]any{"type": "string"},
											"notes": map[string]any{
												"type": "array",
												"items": map[string]any{
													"type":                 "object",
													"additionalProperties": false,
													"properties": map[string]any{
														"id":    map[string]any{"type": "string"},
														"title": map[string]any{"type": "string"},
													},
													"required": []string{"id", "title"},
												},
											},
										},
										"required": []string{"id", "title", "notes"},
									},
								},
							},
							"required": []string{"label", "position3d", "items"},
						},
					},
					"required": []string{"id", "type", "position", "parentNode", "extent", "style", "data"},
				},
			},
			"edges": map[string]any{
				"type": "array",
				"items": map[string]any{
					"type":                 "object",
					"additionalProperties": false,
					"properties": map[string]any{
						"id":     map[string]any{"type": "string"},
						"source": map[string]any{"type": "string"},
						"target": map[string]any{"type": "string"},
						"type":   map[string]any{"type": "string"},
					},
					"required": []string{"id", "source", "target", "type"},
				},
			},
		},
		"required": []string{"name", "nodes", "edges"},
	}
}

func newID(prefix string) string {
	id, err := generateID()
	if err != nil {
		return fmt.Sprintf("%s-%d", prefix, time.Now().UnixNano())
	}
	return fmt.Sprintf("%s-%s", prefix, id[:8])
}

func clampInt(value, fallback, max int) int {
	if value <= 0 {
		return fallback
	}
	if value > max {
		return max
	}
	return value
}

func hasKey(m map[string]struct{}, key string) bool {
	_, ok := m[key]
	return ok
}
