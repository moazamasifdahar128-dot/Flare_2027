alter table gig_saves add column if not exists created_at timestamptz not null default now();
alter table board_withdrawals add column if not exists method text not null default '';
alter table board_withdrawals add column if not exists account_title text not null default '';
alter table board_withdrawals add column if not exists account_mask text not null default '';

create table if not exists help_notes (
  id text primary key,
  user_id text not null,
  body text not null,
  created_at timestamptz not null default now()
);
