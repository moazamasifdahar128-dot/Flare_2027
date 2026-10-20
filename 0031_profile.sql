create table if not exists listing_views (
  kind text not null,
  listing_id text not null,
  viewer_id text not null,
  owner_id text not null,
  viewed_on date not null,
  primary key (kind, listing_id, viewer_id, viewed_on)
);

create index if not exists listing_views_owner on listing_views (owner_id);

create table if not exists verify_requests (
  user_id text primary key,
  status text not null default 'review',
  method text not null default '',
  reference text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists board_withdrawals (
  id text primary key,
  user_id text not null,
  amount integer not null,
  currency text not null,
  status text not null default 'requested',
  created_at timestamptz not null default now()
);
