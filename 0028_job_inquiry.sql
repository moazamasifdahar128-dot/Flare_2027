create table if not exists job_posts (
  id text primary key,
  user_id text not null,
  title text not null,
  body text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists job_messages (
  id text primary key,
  job_id text not null,
  from_id text not null,
  to_id text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists job_messages_pair on job_messages (job_id, created_at);
