update gigs set expires_at = null where expires_at is not null;
update job_posts set expires_at = null where expires_at is not null;
delete from system_messages
where kind in ('expiry_soon', 'expiry_final', 'expired')
   or body ilike '%will be deleted in 3 days%'
   or body ilike '%will be permanently deleted tomorrow%'
   or body ilike '%deleted on % after % days%';
