-- Create super_admins table for secure admin access
CREATE TABLE public.super_admins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  access_code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

-- No direct public access - only edge functions should validate
CREATE POLICY "No direct access to super_admins"
  ON public.super_admins FOR SELECT
  USING (false);

-- Insert the admin user
INSERT INTO public.super_admins (email, access_code) 
VALUES ('admin@revenu-ia.com', 'REVENUIA2026!');