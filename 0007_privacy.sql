alter table profiles add column if not exists username_changed_at timestamptz;
alter table profiles add column if not exists hide_following boolean not null default false;
alter table profiles add column if not exists welcomed boolean not null default false;
alter table posts add column if not exists comments_on boolean not null default true;
alter table posts add column if not exists comment_words text not null default '';
alter table view_events add column if not exists seconds integer not null default 0;
alter table view_events add column if not exists source text not null default 'foryou';
alter table view_events add column if not exists ip_hash text not null default '';

create table if not exists like_marks (
  user_id text not null,
  post_id text not null,
  stage integer not null default 0,
  primary key (user_id, post_id)
);

create table if not exists app_rules (
  key text primary key,
  value text not null
);

create table if not exists geo_blocks (
  country text primary key,
  until timestamptz,
  forever boolean not null default false,
  message text not null default ''
);

create table if not exists broadcasts (
  id text primary key,
  user_id text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists broadcast_likes (
  user_id text not null,
  broadcast_id text not null,
  primary key (user_id, broadcast_id)
);

create table if not exists broadcast_comments (
  id text primary key,
  broadcast_id text not null,
  user_id text not null,
  body text not null,
  created_at timestamptz not null default now(),
  unique (broadcast_id, user_id)
);

create table if not exists action_log (
  id text primary key,
  user_id text not null,
  kind text not null,
  created_at timestamptz not null default now()
);
