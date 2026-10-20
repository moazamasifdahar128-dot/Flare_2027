alter table gigs add column if not exists whatsapp text not null default '';
alter table gigs add column if not exists expires_at timestamptz;
update gigs set expires_at = created_at + interval '90 days' where expires_at is null;

alter table shops add column if not exists whatsapp text not null default '';
alter table shops add column if not exists shop_url text not null default '';
alter table shops add column if not exists expires_at timestamptz;
update shops set expires_at = created_at + interval '90 days' where expires_at is null;
