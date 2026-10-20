alter table profiles add column if not exists payout_strikes integer not null default 0;
alter table profiles add column if not exists payout_locked boolean not null default false;
