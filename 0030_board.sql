alter table job_posts add column if not exists kind text not null default 'offer';
alter table job_posts add column if not exists category text not null default 'Other';
alter table job_posts add column if not exists price integer not null default 0;
alter table job_posts add column if not exists currency text not null default 'PKR';
alter table job_posts add column if not exists photo text not null default '';
alter table job_posts add column if not exists shop_url text not null default '';
alter table job_posts add column if not exists boost_until timestamptz;
alter table job_posts add column if not exists boost_rank timestamptz;
alter table job_posts add column if not exists hidden_at timestamptz;
alter table job_posts add column if not exists expires_at timestamptz;

update job_posts set expires_at = created_at + interval '30 days' where expires_at is null;

create table if not exists board_payments (
  id text primary key,
  user_id text not null,
  post_id text not null,
  kind text not null,
  method text not null,
  reference text not null,
  amount_label text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists board_reports (
  post_id text not null,
  reporter_id text not null,
  created_at timestamptz not null default now(),
  primary key (post_id, reporter_id)
);

create table if not exists board_deals (
  id text primary key,
  post_id text not null,
  buyer_id text not null,
  seller_id text not null,
  amount integer not null,
  currency text not null,
  status text not null default 'asked',
  reference text not null default '',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (post_id, buyer_id)
);

create table if not exists board_settings (
  id text primary key,
  payee_pk text not null default '',
  payee_world text not null default ''
);

insert into board_settings (id) values ('main') on conflict (id) do nothing;
