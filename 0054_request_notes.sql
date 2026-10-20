alter table gig_boosts add column if not exists reject_note text not null default '';
alter table board_payments add column if not exists reject_note text not null default '';
alter table manual_orders add column if not exists reject_note text not null default '';
alter table verify_requests add column if not exists reject_note text not null default '';
