-- =============================================
-- ADMIN INTERFACE DATABASE SCHEMA
-- =============================================

-- 1. ENUM TYPES
-- =============================================

-- Question types
CREATE TYPE public.question_type AS ENUM ('likert_5', 'likert_7', 'multiple_choice', 'yes_no', 'scale_10');

-- Assessment template status
CREATE TYPE public.template_status AS ENUM ('draft', 'active', 'archived');

-- Admin role type
CREATE TYPE public.admin_role AS ENUM ('super_admin', 'admin', 'viewer');

-- =============================================
-- 2. ADMIN USERS & ROLES (for Google SSO)
-- =============================================

CREATE TABLE public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  google_id TEXT UNIQUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Separate roles table (security best practice)
CREATE TABLE public.admin_user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  role admin_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- =============================================
-- 3. ASSESSMENT TEMPLATES
-- =============================================

CREATE TABLE public.assessment_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status template_status NOT NULL DEFAULT 'draft',
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID REFERENCES public.admin_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Thematics/Categories within a template
CREATE TABLE public.template_thematics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.assessment_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  description_en TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Questions within thematics
CREATE TABLE public.template_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thematic_id UUID NOT NULL REFERENCES public.template_thematics(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_text_en TEXT,
  question_type question_type NOT NULL DEFAULT 'likert_5',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Answer options with scoring
CREATE TABLE public.template_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.template_questions(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  answer_text_en TEXT,
  score INTEGER NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 4. CAMPAIGN-TEMPLATE LINK
-- =============================================

-- Link campaigns to specific templates
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.assessment_templates(id);

-- =============================================
-- 5. SEGMENTATION SYSTEM
-- =============================================

-- Segmentation types per campaign (flexible)
CREATE TABLE public.segmentation_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, name)
);

-- Segmentation groups/values
CREATE TABLE public.segmentation_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_id UUID NOT NULL REFERENCES public.segmentation_types(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_en TEXT,
  color TEXT, -- For UI display
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Link participants to segmentation groups
CREATE TABLE public.participant_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.segmentation_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(participant_id, group_id)
);

-- =============================================
-- 6. ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on all new tables
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_thematics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segmentation_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segmentation_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participant_segments ENABLE ROW LEVEL SECURITY;

-- Security definer function to check admin role
CREATE OR REPLACE FUNCTION public.has_admin_role(_email TEXT, _role admin_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users au
    JOIN public.admin_user_roles aur ON au.id = aur.user_id
    WHERE au.email = _email
      AND aur.role = _role
  )
$$;

-- Function to check if user is any admin
CREATE OR REPLACE FUNCTION public.is_admin(_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users au
    JOIN public.admin_user_roles aur ON au.id = aur.user_id
    WHERE au.email = _email
  )
$$;

-- Admin users: only admins can read
CREATE POLICY "Admins can view admin_users"
ON public.admin_users FOR SELECT
USING (public.is_admin(auth.jwt() ->> 'email'));

CREATE POLICY "Super admins can manage admin_users"
ON public.admin_users FOR ALL
USING (public.has_admin_role(auth.jwt() ->> 'email', 'super_admin'));

-- Admin roles: only super_admins can manage
CREATE POLICY "Admins can view roles"
ON public.admin_user_roles FOR SELECT
USING (public.is_admin(auth.jwt() ->> 'email'));

CREATE POLICY "Super admins can manage roles"
ON public.admin_user_roles FOR ALL
USING (public.has_admin_role(auth.jwt() ->> 'email', 'super_admin'));

-- Assessment templates: admins can manage
CREATE POLICY "Admins can view templates"
ON public.assessment_templates FOR SELECT
USING (public.is_admin(auth.jwt() ->> 'email'));

CREATE POLICY "Admins can manage templates"
ON public.assessment_templates FOR ALL
USING (public.has_admin_role(auth.jwt() ->> 'email', 'admin') OR public.has_admin_role(auth.jwt() ->> 'email', 'super_admin'));

-- Template thematics
CREATE POLICY "Admins can view thematics"
ON public.template_thematics FOR SELECT
USING (public.is_admin(auth.jwt() ->> 'email'));

CREATE POLICY "Admins can manage thematics"
ON public.template_thematics FOR ALL
USING (public.has_admin_role(auth.jwt() ->> 'email', 'admin') OR public.has_admin_role(auth.jwt() ->> 'email', 'super_admin'));

-- Template questions
CREATE POLICY "Admins can view questions"
ON public.template_questions FOR SELECT
USING (public.is_admin(auth.jwt() ->> 'email'));

CREATE POLICY "Admins can manage questions"
ON public.template_questions FOR ALL
USING (public.has_admin_role(auth.jwt() ->> 'email', 'admin') OR public.has_admin_role(auth.jwt() ->> 'email', 'super_admin'));

-- Template answers
CREATE POLICY "Admins can view answers"
ON public.template_answers FOR SELECT
USING (public.is_admin(auth.jwt() ->> 'email'));

CREATE POLICY "Admins can manage answers"
ON public.template_answers FOR ALL
USING (public.has_admin_role(auth.jwt() ->> 'email', 'admin') OR public.has_admin_role(auth.jwt() ->> 'email', 'super_admin'));

-- Segmentation types
CREATE POLICY "Admins can view segmentation_types"
ON public.segmentation_types FOR SELECT
USING (public.is_admin(auth.jwt() ->> 'email'));

CREATE POLICY "Admins can manage segmentation_types"
ON public.segmentation_types FOR ALL
USING (public.has_admin_role(auth.jwt() ->> 'email', 'admin') OR public.has_admin_role(auth.jwt() ->> 'email', 'super_admin'));

-- Segmentation groups
CREATE POLICY "Admins can view segmentation_groups"
ON public.segmentation_groups FOR SELECT
USING (public.is_admin(auth.jwt() ->> 'email'));

CREATE POLICY "Admins can manage segmentation_groups"
ON public.segmentation_groups FOR ALL
USING (public.has_admin_role(auth.jwt() ->> 'email', 'admin') OR public.has_admin_role(auth.jwt() ->> 'email', 'super_admin'));

-- Participant segments
CREATE POLICY "Admins can view participant_segments"
ON public.participant_segments FOR SELECT
USING (public.is_admin(auth.jwt() ->> 'email'));

CREATE POLICY "Admins can manage participant_segments"
ON public.participant_segments FOR ALL
USING (public.has_admin_role(auth.jwt() ->> 'email', 'admin') OR public.has_admin_role(auth.jwt() ->> 'email', 'super_admin'));

-- Public read for active templates (for assessment app)
CREATE POLICY "Public can view active templates"
ON public.assessment_templates FOR SELECT
USING (status = 'active');

CREATE POLICY "Public can view active template thematics"
ON public.template_thematics FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.assessment_templates t 
  WHERE t.id = template_id AND t.status = 'active'
));

CREATE POLICY "Public can view active template questions"
ON public.template_questions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.template_thematics th
  JOIN public.assessment_templates t ON t.id = th.template_id
  WHERE th.id = thematic_id AND t.status = 'active'
));

CREATE POLICY "Public can view active template answers"
ON public.template_answers FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.template_questions q
  JOIN public.template_thematics th ON th.id = q.thematic_id
  JOIN public.assessment_templates t ON t.id = th.template_id
  WHERE q.id = question_id AND t.status = 'active'
));

-- =============================================
-- 7. TRIGGERS
-- =============================================

-- Update timestamp triggers
CREATE TRIGGER update_admin_users_updated_at
BEFORE UPDATE ON public.admin_users
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assessment_templates_updated_at
BEFORE UPDATE ON public.assessment_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 8. SEED INITIAL SUPER ADMIN
-- =============================================

-- Insert initial super admin (REVENU IA team)
INSERT INTO public.admin_users (email, full_name)
VALUES ('admin@revenu-ia.com', 'Admin REVENU IA')
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.admin_user_roles (user_id, role)
SELECT id, 'super_admin'
FROM public.admin_users
WHERE email = 'admin@revenu-ia.com'
ON CONFLICT DO NOTHING;