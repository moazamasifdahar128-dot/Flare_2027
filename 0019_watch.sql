alter table posts add column if not exists duration_s integer not null default 0;
alter table wallets add column if not exists estimate_usd numeric not null default 0;
