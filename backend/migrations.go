// Lightweight startup migrations for graph metadata/indexes.
package main

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

func ensureSchema(ctx context.Context, pool *pgxpool.Pool) error {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS graphs (
			id text PRIMARY KEY,
			user_id text NOT NULL,
			name text NOT NULL DEFAULT 'Untitled Graph',
			kind text NOT NULL DEFAULT 'note',
			data jsonb NOT NULL,
			node_notes jsonb NOT NULL DEFAULT '[]'::jsonb,
			updated_at timestamptz NOT NULL DEFAULT now()
		)`,
		`ALTER TABLE graphs ADD COLUMN IF NOT EXISTS user_id text`,
		`ALTER TABLE graphs ADD COLUMN IF NOT EXISTS name text`,
		`ALTER TABLE graphs ADD COLUMN IF NOT EXISTS kind text`,
		`ALTER TABLE graphs ADD COLUMN IF NOT EXISTS node_notes jsonb`,
		`UPDATE graphs
		 SET name = coalesce(nullif(trim(data->>'name'), ''), 'Untitled Graph')
		 WHERE name IS NULL OR trim(name) = ''`,
		`UPDATE graphs
		 SET kind = coalesce(nullif(trim(data->>'kind'), ''), 'note')
		 WHERE kind IS NULL OR trim(kind) = ''`,
		`UPDATE graphs
		 SET node_notes = coalesce(
			(
				SELECT jsonb_agg(
					jsonb_build_object(
						'id', node->>'id',
						'nodeNotes', node->'data'->>'nodeNotes'
					)
				)
				FROM jsonb_array_elements(
					CASE
						WHEN jsonb_typeof(data->'nodes') = 'array' THEN data->'nodes'
						ELSE '[]'::jsonb
					END
				) AS node
				WHERE coalesce(node->'data'->>'nodeNotes', '') <> ''
			),
			'[]'::jsonb
		 )
		 WHERE node_notes IS NULL`,
		`ALTER TABLE graphs ALTER COLUMN name SET DEFAULT 'Untitled Graph'`,
		`ALTER TABLE graphs ALTER COLUMN kind SET DEFAULT 'note'`,
		`ALTER TABLE graphs ALTER COLUMN name SET NOT NULL`,
		`ALTER TABLE graphs ALTER COLUMN kind SET NOT NULL`,
		`ALTER TABLE graphs ALTER COLUMN node_notes SET DEFAULT '[]'::jsonb`,
		`ALTER TABLE graphs ALTER COLUMN node_notes SET NOT NULL`,
		`CREATE INDEX IF NOT EXISTS graphs_user_id_idx ON graphs(user_id)`,
		`CREATE INDEX IF NOT EXISTS graphs_user_kind_updated_idx ON graphs(user_id, kind, updated_at DESC)`,
		`CREATE INDEX IF NOT EXISTS graphs_node_notes_idx ON graphs USING GIN(node_notes)`,
	}

	for _, statement := range statements {
		if _, err := pool.Exec(ctx, statement); err != nil {
			return err
		}
	}
	return nil
}
