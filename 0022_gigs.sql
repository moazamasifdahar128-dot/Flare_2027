drop table if exists listing_messages;
drop table if exists listing_threads;
drop table if exists listing_view_log;
drop table if exists listings;

create table if not exists gigs (
  id text primary key,
  user_id text not null,
  title text not null,
  body text not null,
  price_usd integer not null,
  days text not null,
  thumb text not null default '',
  photos text not null default '[]',
  videos text not null default '[]',
  views integer not null default 0,
  likes integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists gig_likes (
  gig_id text not null,
  user_id text not null,
  primary key (gig_id, user_id)
);

create table if not exists gig_views (
  gig_id text not null,
  user_id text not null,
  primary key (gig_id, user_id)
);

create table if not exists gig_saves (
  gig_id text not null,
  user_id text not null,
  primary key (gig_id, user_id)
);

create table if not exists gig_orders (
  id text primary key,
  gig_id text not null,
  buyer_id text not null,
  seller_id text not null,
  created_at timestamptz not null default now(),
  unique (gig_id, buyer_id)
);

create table if not exists gig_messages (
  id text primary key,
  gig_id text not null,
  from_id text not null,
  to_id text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists gig_messages_pair on gig_messages (gig_id, created_at);
