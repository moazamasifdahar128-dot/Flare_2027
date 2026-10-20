alter table gigs add column if not exists category text not null default 'Editing';
alter table gigs add column if not exists hide_counts boolean not null default false;
alter table gigs add column if not exists slides text not null default '[]';
alter table gigs add column if not exists admin_edit text not null default '';
