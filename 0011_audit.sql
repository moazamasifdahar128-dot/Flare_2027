create table if not exists removed_posts (
  id text primary key,
  post_id text not null,
  user_id text not null,
  title text not null default '',
  copyrighted boolean not null default false,
  removed_at timestamptz not null default now()
);
create index if not exists removed_posts_recent on removed_posts (removed_at desc);
