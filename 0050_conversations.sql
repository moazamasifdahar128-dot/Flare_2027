create table if not exists conversations (
  id text primary key,
  participant1 text not null,
  participant2 text not null,
  gig_id text not null,
  kind text not null default 'gig',
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  unique (participant1, participant2, gig_id, kind)
);

create index if not exists conversations_inbox on conversations (participant2, status, created_at desc);
create index if not exists conversations_peer on conversations (participant1, status);
create index if not exists conversations_listing on conversations (gig_id);

create table if not exists conversation_messages (
  id text primary key,
  conversation_id text not null,
  sender_id text not null,
  body text not null,
  status text not null default 'sent',
  delivered_at timestamptz,
  seen_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists conversation_messages_conv on conversation_messages (conversation_id, created_at);

create table if not exists chat_leak_logs (
  id text primary key,
  user_id text not null,
  conversation_id text not null default '',
  gig_id text not null default '',
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_leak_logs_at on chat_leak_logs (created_at desc);
