alter table gig_blobs add column if not exists chunk integer not null default 700000;
