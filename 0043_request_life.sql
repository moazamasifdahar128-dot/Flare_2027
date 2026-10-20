update job_posts
set expires_at = created_at + interval '30 days'
where kind = 'need'
  and expires_at is not null
  and expires_at > created_at + interval '30 days';
