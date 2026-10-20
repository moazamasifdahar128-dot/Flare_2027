alter table gig_likes add column if not exists liked_at timestamptz not null default now();

create table if not exists owner_notes (
  id text primary key,
  body text not null,
  created_at timestamptz not null default now()
);
