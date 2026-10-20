create table if not exists profiles (
  user_id text primary key,
  username text unique not null,
  display_name text not null,
  bio text not null default '',
  today_line text not null default '',
  link_url text not null default '',
  rate_line text not null default '',
  avatar text not null default '',
  banner text not null default '',
  is_private boolean not null default false,
  hide_online boolean not null default false,
  hide_likes boolean not null default false,
  comment_policy text not null default 'all',
  dm_policy text not null default 'all',
  read_receipts boolean not null default true,
  hidden_words text not null default '',
  verified boolean not null default false,
  is_admin boolean not null default false,
  banned_forever boolean not null default false,
  banned_until timestamptz,
  streak_days integer not null default 0,
  last_post_on date,
  last_seen timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists posts (
  id text primary key,
  user_id text not null,
  kind text not null,
  title text not null default '',
  body text not null default '',
  topic text not null default '',
  media text not null default '',
  media_extra text not null default '[]',
  external_id text not null default '',
  thumb text not null default '',
  poll_options text not null default '[]',
  quote_of text not null default '',
  quote_title text not null default '',
  collab text not null default '',
  visibility text not null default 'public',
  pinned boolean not null default false,
  views integer not null default 0,
  replays integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists posts_user_idx on posts (user_id, created_at desc);
create index if not exists posts_created_idx on posts (created_at desc);

create table if not exists comments (
  id text primary key,
  post_id text not null,
  user_id text not null,
  parent_id text not null default '',
  body text not null,
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists comments_post_idx on comments (post_id, created_at);

create table if not exists likes (
  user_id text not null,
  post_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create table if not exists follows (
  follower_id text not null,
  following_id text not null,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id)
);

create table if not exists follow_requests (
  follower_id text not null,
  following_id text not null,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id)
);

create table if not exists blocks (
  blocker_id text not null,
  blocked_id text not null,
  primary key (blocker_id, blocked_id)
);

create table if not exists mutes (
  muter_id text not null,
  muted_id text not null,
  primary key (muter_id, muted_id)
);

create table if not exists saves (
  user_id text not null,
  post_id text not null,
  primary key (user_id, post_id)
);

create table if not exists stories (
  id text primary key,
  user_id text not null,
  media text not null default '',
  body text not null default '',
  close_only boolean not null default false,
  highlight boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists story_views (
  story_id text not null,
  user_id text not null,
  primary key (story_id, user_id)
);

create table if not exists close_friends (
  user_id text not null,
  friend_id text not null,
  primary key (user_id, friend_id)
);

create table if not exists notifications (
  id text primary key,
  user_id text not null,
  kind text not null,
  from_id text not null default '',
  post_id text not null default '',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notif_user_idx on notifications (user_id, created_at desc);

create table if not exists messages (
  id text primary key,
  from_id text not null,
  to_id text not null,
  body text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists msg_pair_idx on messages (from_id, to_id, created_at);

create table if not exists reports (
  id text primary key,
  reporter_id text not null,
  target_user_id text not null default '',
  post_id text not null default '',
  reason text not null,
  note text not null default '',
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists verify_requests (
  user_id text primary key,
  note text not null default '',
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists milestones (
  user_id text not null,
  kind text not null,
  primary key (user_id, kind)
);

create table if not exists post_views (
  post_id text not null,
  user_id text not null,
  n integer not null default 1,
  primary key (post_id, user_id)
);

create table if not exists not_interested (
  user_id text not null,
  post_id text not null,
  primary key (user_id, post_id)
);

create table if not exists poll_votes (
  post_id text not null,
  user_id text not null,
  option_idx integer not null,
  primary key (post_id, user_id)
);

create table if not exists banned_words (
  word text primary key
);

create table if not exists comment_likes (
  user_id text not null,
  comment_id text not null,
  primary key (user_id, comment_id)
);
