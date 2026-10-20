create table if not exists listings (
  id text primary key,
  user_id text not null,
  platform text not null,
  followers int not null,
  price_usd int not null,
  country text not null,
  note text not null default '',
  shots text not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists listings_created on listings (created_at desc);

create table if not exists listing_threads (
  id text primary key,
  listing_id text not null,
  buyer_id text not null,
  unique (listing_id, buyer_id)
);

create table if not exists listing_messages (
  id text primary key,
  thread_id text not null,
  sender_id text not null,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists listing_messages_thread on listing_messages (thread_id, created_at);
