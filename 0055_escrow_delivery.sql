create table if not exists escrow_deliveries (
  deal_id text primary key references board_deals (id) on delete cascade,
  link_a text not null,
  link_b text not null default '',
  demo_link text not null default '',
  message text not null,
  kind text not null,
  delivered_at timestamptz not null default now(),
  expires_at timestamptz not null,
  locked boolean not null default false
);
