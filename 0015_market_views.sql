alter table view_events add column if not exists event_type text not null default 'video_watch';
alter table listings add column if not exists views integer not null default 0;

create table if not exists listing_view_log (
  listing_id text not null,
  user_id text not null,
  primary key (listing_id, user_id)
);
