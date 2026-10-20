create table if not exists founder_links (
  user_id text primary key,
  created_at timestamptz not null default now()
);

create table if not exists live_taps (
  post_id text not null,
  user_id text not null,
  n integer not null default 0,
  primary key (post_id, user_id)
);
