alter table profiles add column if not exists review_flag boolean not null default false;

create table if not exists shares (
  user_id text not null,
  post_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
