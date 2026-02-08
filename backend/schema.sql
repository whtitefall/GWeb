-- Graph storage table. "data" stores the full GraphPayload JSON.
create table if not exists graphs (
  id text primary key,
  user_id text not null,
  name text not null default 'Untitled Graph',
  kind text not null default 'note',
  data jsonb not null,
  node_notes jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- Migration helpers for existing databases.
alter table graphs add column if not exists user_id text;
alter table graphs add column if not exists name text;
alter table graphs add column if not exists kind text;
alter table graphs add column if not exists node_notes jsonb;

update graphs
set name = coalesce(nullif(trim(data->>'name'), ''), 'Untitled Graph')
where name is null or trim(name) = '';

update graphs
set kind = coalesce(nullif(trim(data->>'kind'), ''), 'note')
where kind is null or trim(kind) = '';

update graphs
set node_notes = coalesce(
  (
    select jsonb_agg(
      jsonb_build_object(
        'id', node->>'id',
        'nodeNotes', node->'data'->>'nodeNotes'
      )
    )
    from jsonb_array_elements(
      case
        when jsonb_typeof(data->'nodes') = 'array' then data->'nodes'
        else '[]'::jsonb
      end
    ) as node
    where coalesce(node->'data'->>'nodeNotes', '') <> ''
  ),
  '[]'::jsonb
)
where node_notes is null;

alter table graphs alter column name set default 'Untitled Graph';
alter table graphs alter column kind set default 'note';
alter table graphs alter column name set not null;
alter table graphs alter column kind set not null;
alter table graphs alter column node_notes set default '[]'::jsonb;
alter table graphs alter column node_notes set not null;

create index if not exists graphs_user_id_idx on graphs(user_id);
create index if not exists graphs_user_kind_updated_idx on graphs(user_id, kind, updated_at desc);
create index if not exists graphs_node_notes_idx on graphs using gin(node_notes);
