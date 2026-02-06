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
			updated_at timestamptz NOT NULL DEFAULT now()
		)`,
		`ALTER TABLE graphs ADD COLUMN IF NOT EXISTS user_id text`,
		`ALTER TABLE graphs ADD COLUMN IF NOT EXISTS name text`,
		`ALTER TABLE graphs ADD COLUMN IF NOT EXISTS kind text`,
		`UPDATE graphs
		 SET name = coalesce(nullif(trim(data->>'name'), ''), 'Untitled Graph')
		 WHERE name IS NULL OR trim(name) = ''`,
		`UPDATE graphs
		 SET kind = coalesce(nullif(trim(data->>'kind'), ''), 'note')
		 WHERE kind IS NULL OR trim(kind) = ''`,
		`ALTER TABLE graphs ALTER COLUMN name SET DEFAULT 'Untitled Graph'`,
		`ALTER TABLE graphs ALTER COLUMN kind SET DEFAULT 'note'`,
		`ALTER TABLE graphs ALTER COLUMN name SET NOT NULL`,
		`ALTER TABLE graphs ALTER COLUMN kind SET NOT NULL`,
		`CREATE INDEX IF NOT EXISTS graphs_user_id_idx ON graphs(user_id)`,
		`CREATE INDEX IF NOT EXISTS graphs_user_kind_updated_idx ON graphs(user_id, kind, updated_at DESC)`,
	}

	for _, statement := range statements {
		if _, err := pool.Exec(ctx, statement); err != nil {
			return err
		}
	}
	return nil
}
