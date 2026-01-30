-- Graph storage table. "data" stores the full GraphPayload JSON.
create table if not exists graphs (
  id text primary key,
  user_id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Migration helpers for existing databases.
alter table graphs add column if not exists user_id text;
create index if not exists graphs_user_id_idx on graphs(user_id);
