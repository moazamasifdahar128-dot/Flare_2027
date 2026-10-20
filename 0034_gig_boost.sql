alter table gigs add column if not exists boost_until timestamptz;

create table if not exists gig_boosts (
  id text primary key,
  gig_id text not null,
  user_id text not null,
  kind text not null,
  method text not null,
  reference text not null,
  amount_label text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
