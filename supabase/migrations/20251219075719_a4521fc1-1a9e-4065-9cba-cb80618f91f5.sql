-- Supprimer les anciennes tables (dans l'ordre des dépendances)
DROP TABLE IF EXISTS public.assessment_item_scores CASCADE;
DROP TABLE IF EXISTS public.assessment_responses CASCADE;
DROP TABLE IF EXISTS public.assessments CASCADE;
DROP TABLE IF EXISTS public.participants CASCADE;

-- Supprimer les anciens types
DROP TYPE IF EXISTS public.assessment_status CASCADE;
DROP TYPE IF EXISTS public.participant_profile CASCADE;

-- Recréer le type pour le profil
CREATE TYPE public.participant_profile AS ENUM ('explorer', 'analyst', 'leader', 'collaborator', 'innovator');

-- Recréer le type pour le statut
CREATE TYPE public.assessment_status AS ENUM ('not_started', 'in_progress', 'completed');

-- Créer la table unique participants
CREATE TABLE public.participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Infos personnelles
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  company_domain TEXT,
  team TEXT,
  
  -- Infos évaluation
  status public.assessment_status NOT NULL DEFAULT 'not_started',
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  global_score NUMERIC,
  profile public.participant_profile,
  autoconnect_token UUID NOT NULL DEFAULT gen_random_uuid(),
  
  -- Données stockées en JSONB
  responses JSONB DEFAULT '[]'::jsonb,
  item_scores JSONB DEFAULT '[]'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour les recherches fréquentes
CREATE INDEX idx_participants_email ON public.participants(email);
CREATE INDEX idx_participants_status ON public.participants(status);
CREATE INDEX idx_participants_autoconnect_token ON public.participants(autoconnect_token);
CREATE INDEX idx_participants_company ON public.participants(company_name);

-- Activer RLS
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;

-- Policies pour accès public (à ajuster selon les besoins)
CREATE POLICY "Allow public read access to participants"
ON public.participants FOR SELECT
USING (true);

CREATE POLICY "Allow public insert to participants"
ON public.participants FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update to participants"
ON public.participants FOR UPDATE
USING (true);

-- Trigger pour updated_at
CREATE TRIGGER update_participants_updated_at
  BEFORE UPDATE ON public.participants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();