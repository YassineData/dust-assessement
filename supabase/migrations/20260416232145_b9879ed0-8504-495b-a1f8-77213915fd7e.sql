DO $$ BEGIN
  CREATE TYPE public.assessment_type AS ENUM ('sales', 'generic');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS assessment_type public.assessment_type NOT NULL DEFAULT 'generic';

UPDATE public.campaigns SET assessment_type = 'sales' WHERE created_at < now();