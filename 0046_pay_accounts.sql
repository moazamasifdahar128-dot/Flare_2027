alter table board_settings add column if not exists payee_title text not null default '';
alter table board_settings add column if not exists payee_jazzcash text not null default '';
alter table board_settings add column if not exists payee_easypaisa text not null default '';
alter table board_settings add column if not exists payee_bank text not null default '';
alter table board_settings add column if not exists payee_wise text not null default '';
alter table board_settings add column if not exists payee_payoneer text not null default '';
alter table board_settings add column if not exists payee_usdt text not null default '';

alter table manual_orders add column if not exists payer_name text not null default '';
alter table verify_requests add column if not exists payer_name text not null default '';
alter table verify_requests add column if not exists screenshot_url text not null default '';

create table if not exists payout_methods (
  id text primary key,
  user_id text not null,
  method text not null,
  title text not null default '',
  account text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists payout_methods_user on payout_methods (user_id, created_at desc);
