create table if not exists manual_orders (
  id text primary key,
  gig_id text not null,
  buyer_id text not null,
  seller_id text not null,
  deal_type text not null,
  payment_method text not null,
  transaction_id text not null default '',
  screenshot_url text not null default '',
  amount_pkr integer not null default 0,
  amount_usd_cents integer not null default 0,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists manual_orders_gig_idx on manual_orders (gig_id, buyer_id, created_at desc);
