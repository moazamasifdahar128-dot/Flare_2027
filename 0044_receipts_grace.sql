alter table gig_boosts add column if not exists payer_name text not null default '';
alter table gig_boosts add column if not exists screenshot_url text not null default '';
alter table gig_boosts add column if not exists listing_title text not null default '';
alter table board_payments add column if not exists payer_name text not null default '';
alter table board_payments add column if not exists screenshot_url text not null default '';
alter table profiles add column if not exists tick_grace_until timestamptz;
