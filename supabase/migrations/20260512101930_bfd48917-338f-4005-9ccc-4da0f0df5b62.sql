ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'fr' CHECK (language IN ('fr','en'));
-- Allow updating campaigns (needed to change language later from admin)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='campaigns' AND policyname='Allow public update to campaigns'
  ) THEN
    CREATE POLICY "Allow public update to campaigns" ON public.campaigns FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;