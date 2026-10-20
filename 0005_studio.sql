alter table posts add column if not exists ratio text not null default '9:16';
alter table posts add column if not exists video_hash text not null default '';
alter table posts add column if not exists held boolean not null default false;

create index if not exists posts_hash_idx on posts (video_hash);

create table if not exists view_events (
  id text primary key,
  post_id text not null,
  user_id text not null,
  created_at timestamptz not null default now()
);

create index if not exists view_events_recent_idx on view_events (created_at desc);

create table if not exists wallets (
  user_id text primary key,
  coins integer not null default 0
);

create table if not exists gifts (
  id text primary key,
  from_id text not null,
  to_id text not null,
  post_id text not null default '',
  kind text not null,
  created_at timestamptz not null default now()
);

create table if not exists tickets (
  id text primary key,
  user_id text not null,
  subject text not null,
  body text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);
