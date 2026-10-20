alter table gigs add column if not exists admin_hold boolean not null default false;
alter table job_posts add column if not exists admin_hold boolean not null default false;
alter table reports add column if not exists action text not null default '';
alter table reports add column if not exists listing_title text not null default '';
