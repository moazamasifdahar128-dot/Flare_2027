create table if not exists watch_opens (
  post_id text not null,
  user_id text not null,
  opened_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
