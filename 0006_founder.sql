alter table profiles add column if not exists country text not null default '';
alter table profiles add column if not exists is_founder boolean not null default false;
alter table posts add column if not exists sequel_of text not null default '';
