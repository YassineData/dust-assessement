-- Create role enum for campaign members
CREATE TYPE public.campaign_member_role AS ENUM ('participant', 'manager', 'admin');

-- Create campaign_members table
CREATE TABLE public.campaign_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.campaign_member_role NOT NULL DEFAULT 'participant',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, email)
);

CREATE INDEX idx_campaign_members_email ON public.campaign_members (lower(email));
CREATE INDEX idx_campaign_members_campaign ON public.campaign_members (campaign_id);

ALTER TABLE public.campaign_members ENABLE ROW LEVEL SECURITY;

-- Public access (no auth in this app, follows campaigns/participants pattern)
CREATE POLICY "Public can view campaign members"
ON public.campaign_members FOR SELECT
USING (true);

CREATE POLICY "Public can insert campaign members"
ON public.campaign_members FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public can delete campaign members"
ON public.campaign_members FOR DELETE
USING (true);

CREATE POLICY "Public can update campaign members"
ON public.campaign_members FOR UPDATE
USING (true);