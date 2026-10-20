alter table posts add column if not exists allow_download boolean not null default true;
alter table posts add column if not exists ai_made boolean not null default false;
alter table posts add column if not exists sound text not null default '';
alter table posts add column if not exists boosted boolean not null default false;
alter table posts add column if not exists tags text not null default '';
alter table profiles add column if not exists monetized boolean not null default false;

create table if not exists device_marks (
  id text primary key,
  user_id text not null,
  fp text not null,
  ip_hash text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists hard_bans (
  fp text primary key,
  ip_hash text not null default '',
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists payouts (
  id text primary key,
  user_id text not null,
  method text not null,
  amount_usd numeric not null,
  detail text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);
