alter table gigs add column if not exists hidden boolean not null default false;
alter table gigs add column if not exists flagged boolean not null default false;
alter table gigs add column if not exists removed_at timestamptz;
alter table gig_blobs add column if not exists seconds integer not null default 0;

create table if not exists gig_audit (
  id text primary key,
  gig_id text not null,
  actor_id text not null,
  action text not null,
  note text not null default '',
  created_at timestamptz not null default now()
);
