alter table geo_blocks add column if not exists name text not null default '';
alter table geo_blocks add column if not exists flag text not null default '';
alter table geo_blocks add column if not exists phone text not null default '';
alter table geo_blocks add column if not exists continent text not null default '';
alter table geo_blocks add column if not exists banned_at timestamptz;
alter table geo_blocks add column if not exists duration text not null default '';

create table if not exists geo_log (
  id text primary key,
  body text not null,
  created_at timestamptz not null default now()
);
