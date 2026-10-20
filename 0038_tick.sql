alter table profiles add column if not exists tick_state text not null default 'none';
alter table profiles add column if not exists faded_at timestamptz;
alter table profiles add column if not exists views_reset_at timestamptz;
alter table profiles add column if not exists hide_followers boolean not null default false;
update profiles set tick_state = 'active' where verified = true and tick_state = 'none';
