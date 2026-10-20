create table if not exists dm_accepts (
  user_id text not null,
  peer_id text not null,
  primary key (user_id, peer_id)
);
