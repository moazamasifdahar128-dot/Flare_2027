create table if not exists gig_blobs (
  id text primary key,
  user_id text not null,
  mime text not null,
  bytes integer not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists gig_blob_parts (
  blob_id text not null,
  idx integer not null,
  data text not null,
  primary key (blob_id, idx)
);
