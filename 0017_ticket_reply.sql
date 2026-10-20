alter table tickets add column if not exists device text not null default '';
alter table tickets add column if not exists reply text not null default '';
