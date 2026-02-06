-- Graph storage table. "data" stores the full GraphPayload JSON.
create table if not exists graphs (
  id text primary key,
  user_id text not null,
  name text not null default 'Untitled Graph',
  kind text not null default 'note',
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Migration helpers for existing databases.
alter table graphs add column if not exists user_id text;
alter table graphs add column if not exists name text;
alter table graphs add column if not exists kind text;

update graphs
set name = coalesce(nullif(trim(data->>'name'), ''), 'Untitled Graph')
where name is null or trim(name) = '';

update graphs
set kind = coalesce(nullif(trim(data->>'kind'), ''), 'note')
where kind is null or trim(kind) = '';

alter table graphs alter column name set default 'Untitled Graph';
alter table graphs alter column kind set default 'note';
alter table graphs alter column name set not null;
alter table graphs alter column kind set not null;

create index if not exists graphs_user_id_idx on graphs(user_id);
create index if not exists graphs_user_kind_updated_idx on graphs(user_id, kind, updated_at desc);
