ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS campaign_name text;

UPDATE public.campaigns
SET 
  campaign_name = CASE 
    WHEN company_name LIKE '% — %' THEN split_part(company_name, ' — ', 2)
    ELSE NULL
  END,
  company_name = CASE 
    WHEN company_name LIKE '% — %' THEN split_part(company_name, ' — ', 1)
    ELSE company_name
  END
WHERE company_name LIKE '% — %';