alter table posts add column if not exists overlay text not null default '';
alter table posts add column if not exists place text not null default '';
alter table posts add column if not exists link_url text not null default '';
