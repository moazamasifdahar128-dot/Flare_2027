create table if not exists system_messages (
  id text primary key,
  user_id text not null,
  kind text not null,
  body text not null,
  ref text not null default '',
  appeal_ok boolean not null default false,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists system_messages_user_idx on system_messages (user_id, created_at desc);

create table if not exists listing_appeals (
  id text primary key,
  user_id text not null,
  listing_id text not null default '',
  title text not null default '',
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists sweep_clock (
  name text primary key,
  ran_at timestamptz not null default now()
);
