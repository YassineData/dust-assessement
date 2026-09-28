ALTER TABLE public.participants DROP CONSTRAINT IF EXISTS participants_email_key;
ALTER TABLE public.participants ADD CONSTRAINT participants_email_campaign_unique UNIQUE (email, campaign_id);