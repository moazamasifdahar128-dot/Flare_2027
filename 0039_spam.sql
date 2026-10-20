create table if not exists spam_logs (
  id text primary key,
  user_id text not null,
  kind text not null default '',
  body text not null default '',
  created_at timestamptz not null default now()
);
