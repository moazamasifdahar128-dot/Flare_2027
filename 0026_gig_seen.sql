alter table gig_views add column if not exists seen_at timestamptz not null default now();
