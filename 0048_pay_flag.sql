alter table gig_boosts add column if not exists sender_account text not null default '';
alter table board_payments add column if not exists sender_account text not null default '';
alter table manual_orders add column if not exists sender_account text not null default '';
alter table help_notes add column if not exists subject text not null default 'Help';
alter table help_notes add column if not exists reply text not null default '';
alter table help_notes add column if not exists status text not null default 'open';
