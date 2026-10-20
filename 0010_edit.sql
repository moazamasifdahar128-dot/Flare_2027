alter table posts add column if not exists volume real not null default 1;
alter table posts add column if not exists trim_start real not null default 0;
alter table posts add column if not exists trim_end real not null default 0;
alter table posts add column if not exists filter text not null default '';
alter table posts add column if not exists branded boolean not null default false;
alter table posts add column if not exists copyrighted boolean not null default false;
alter table profiles add column if not exists strikes integer not null default 0;
