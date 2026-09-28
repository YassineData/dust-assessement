-- Create campaigns table
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(8) NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  creator_first_name TEXT NOT NULL,
  creator_last_name TEXT NOT NULL,
  creator_email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- Allow public read/insert for campaigns
CREATE POLICY "Allow public read access to campaigns"
ON public.campaigns
FOR SELECT
USING (true);

CREATE POLICY "Allow public insert to campaigns"
ON public.campaigns
FOR INSERT
WITH CHECK (true);

-- Add campaign_id to participants table
ALTER TABLE public.participants
ADD COLUMN campaign_id UUID REFERENCES public.campaigns(id);

-- Create trigger for updated_at
CREATE TRIGGER update_campaigns_updated_at
BEFORE UPDATE ON public.campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate unique campaign code
CREATE OR REPLACE FUNCTION generate_campaign_code()
RETURNS VARCHAR(8)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_code VARCHAR(8);
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
    SELECT EXISTS(SELECT 1 FROM campaigns WHERE code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$;