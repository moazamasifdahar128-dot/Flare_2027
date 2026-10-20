alter table profiles add column if not exists starred boolean not null default false;

create table if not exists star_requests (
  user_id text primary key,
  note text not null default '',
  status text not null default 'open',
  created_at timestamptz not null default now()
);
