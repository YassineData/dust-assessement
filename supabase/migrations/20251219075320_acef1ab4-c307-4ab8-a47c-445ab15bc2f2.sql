-- Enum pour le statut du test
CREATE TYPE public.assessment_status AS ENUM ('not_started', 'in_progress', 'completed');

-- Enum pour les profils
CREATE TYPE public.participant_profile AS ENUM ('explorer', 'analyst', 'leader', 'collaborator', 'innovator');

-- Table des participants
CREATE TABLE public.participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  company_domain TEXT,
  team TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des évaluations/tests
CREATE TABLE public.assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  status public.assessment_status NOT NULL DEFAULT 'not_started',
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  global_score NUMERIC(5,2),
  profile public.participant_profile,
  autoconnect_token UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des réponses individuelles aux questions
CREATE TABLE public.assessment_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  question_text TEXT,
  response_value INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des scores par item/thématique
CREATE TABLE public.assessment_item_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  score NUMERIC(5,2) NOT NULL,
  benchmark NUMERIC(5,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX idx_assessments_participant ON public.assessments(participant_id);
CREATE INDEX idx_assessments_status ON public.assessments(status);
CREATE INDEX idx_assessments_autoconnect ON public.assessments(autoconnect_token);
CREATE INDEX idx_responses_assessment ON public.assessment_responses(assessment_id);
CREATE INDEX idx_item_scores_assessment ON public.assessment_item_scores(assessment_id);

-- Enable RLS
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_item_scores ENABLE ROW LEVEL SECURITY;

-- Policies pour accès public en lecture (à ajuster selon vos besoins)
CREATE POLICY "Allow public read access to participants" ON public.participants FOR SELECT USING (true);
CREATE POLICY "Allow public read access to assessments" ON public.assessments FOR SELECT USING (true);
CREATE POLICY "Allow public read access to responses" ON public.assessment_responses FOR SELECT USING (true);
CREATE POLICY "Allow public read access to item scores" ON public.assessment_item_scores FOR SELECT USING (true);

-- Policies pour insertion (accès public pour le moment)
CREATE POLICY "Allow public insert to participants" ON public.participants FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert to assessments" ON public.assessments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert to responses" ON public.assessment_responses FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert to item scores" ON public.assessment_item_scores FOR INSERT WITH CHECK (true);

-- Policies pour mise à jour
CREATE POLICY "Allow public update to participants" ON public.participants FOR UPDATE USING (true);
CREATE POLICY "Allow public update to assessments" ON public.assessments FOR UPDATE USING (true);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_participants_updated_at
  BEFORE UPDATE ON public.participants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assessments_updated_at
  BEFORE UPDATE ON public.assessments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();