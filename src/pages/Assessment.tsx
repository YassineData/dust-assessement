import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { type AssessmentType } from '@/lib/assessment-data';
import {
  CONTEXT_FIELDS,
  OPEN_FIELDS,
  DIMENSION_IDS,
  V2_QUESTIONS,
  computeScores,
  dimensionLabel,
  getResultClass,
  isV2Responses,
  optionLabel,
  questionText,
  type AnswerValue,
  type ContextAnswers,
  type OpenAnswers,
  type V2Question,
  type V2Responses,
} from '@/lib/assessment-v2';
import { LikertScale } from '@/components/LikertScale';
import { AssessmentProgress } from '@/components/AssessmentProgress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ArrowRight, RotateCcw, UserPlus, AlertCircle, Loader2, CheckCircle2, Timer, Save, Check } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { validateProfessionalEmail } from '@/lib/email-validation';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { DustWordmark } from '@/components/DustMark';


interface ParticipantInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  campaignCode: string;
  campaignId: string;
  companyName: string;
  assessmentType: AssessmentType;
  campaignLanguage: 'fr' | 'en';
}

const Assessment = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language, t: translate, setLanguage } = useLanguage();
  const [searchParams] = useSearchParams();
  // /exemple (or ?preview=1): straight into the questionnaire, nothing is saved.
  const isPreview = searchParams.get('preview') === '1';
  const [participantInfo, setParticipantInfo] = useState<ParticipantInfo | null>(() =>
    isPreview
      ? {
          id: 'preview',
          firstName: 'Exemple',
          lastName: '',
          email: 'exemple@dust.tt',
          campaignCode: 'EXEMPLE',
          campaignId: 'preview',
          companyName: 'Exemple',
          assessmentType: 'generic',
          campaignLanguage: 'fr',
        }
      : null
  );
  const [registrationForm, setRegistrationForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    campaignCode: (searchParams.get('code') || '').toUpperCase()
  });

  // Apply lang query param on mount
  useEffect(() => {
    const langParam = searchParams.get('lang');
    if (langParam === 'en' || langParam === 'fr') {
      setLanguage(langParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [isValidating, setIsValidating] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [context, setContext] = useState<ContextAnswers>({});
  const [open, setOpen] = useState<OpenAnswers>({});
  const [phase, setPhase] = useState<'context' | 'questions' | 'open'>('context');
  const [isComplete, setIsComplete] = useState(false);
  const [currentThematicIndex, setCurrentThematicIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const questionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  // Set when the respondent navigates between themes by hand, so the auto-advance
  // below does not immediately bounce them out of an already completed theme.
  // Cleared on the next answer. Resume (restored answers) still auto-advances.
  const manualNavRef = useRef(false);

  // Translations
  const t = {
    back: language === 'fr' ? 'Retour' : 'Back',
    title: language === 'fr' ? 'Avant de commencer le quiz' : 'Before starting the quiz',
    description: language === 'fr' 
      ? 'Renseignez vos informations et le code de campagne fourni par votre responsable'
      : 'Enter your information and the campaign code provided by your manager',
    firstName: language === 'fr' ? 'Prénom' : 'First Name',
    lastName: language === 'fr' ? 'Nom' : 'Last Name',
    email: language === 'fr' ? 'Adresse email professionnelle' : 'Professional email address',
    campaignCode: language === 'fr' ? 'Code de campagne' : 'Campaign code',
    firstNamePlaceholder: language === 'fr' ? 'Votre prénom' : 'Your first name',
    lastNamePlaceholder: language === 'fr' ? 'Votre nom' : 'Your last name',
    emailPlaceholder: language === 'fr' ? 'votre.email@entreprise.com' : 'your.email@company.com',
    codePlaceholder: 'Ex: A1B2C3D4',
    validating: language === 'fr' ? 'Vérification...' : 'Verifying...',
    startQuiz: language === 'fr' ? 'Commencer le quiz' : 'Start the quiz',
    noCode: language === 'fr' ? 'Vous n\'avez pas de code de campagne ?' : 'Don\'t have a campaign code?',
    createAssessment: language === 'fr' ? 'Créer un assessment pour mon équipe' : 'Create an assessment for my team',
    error: language === 'fr' ? 'Erreur' : 'Error',
    fillAllFields: language === 'fr' ? 'Veuillez remplir tous les champs' : 'Please fill in all fields',
    invalidEmail: language === 'fr' ? 'Email non valide' : 'Invalid email',
    invalidCode: language === 'fr' ? 'Code invalide' : 'Invalid code',
    invalidCodeDesc: language === 'fr' 
      ? 'Ce code de campagne n\'existe pas. Vérifiez le code ou créez votre propre campagne.'
      : 'This campaign code does not exist. Check the code or create your own campaign.',
    testCompleted: language === 'fr' ? 'Test déjà complété' : 'Test already completed',
    testCompletedDesc: language === 'fr' ? 'Vous avez déjà terminé ce test.' : 'You have already completed this test.',
    resumeTest: language === 'fr' ? 'Reprise du test' : 'Resuming test',
    resumeTestDesc: language === 'fr' ? 'Vous reprenez là où vous vous étiez arrêté.' : 'Resuming where you left off.',
    welcome: language === 'fr' ? 'Bienvenue !' : 'Welcome!',
    welcomeDesc: language === 'fr' ? 'Vous participez à la campagne de' : 'You are participating in the campaign of',
    errorValidation: language === 'fr' ? 'Impossible de valider le code de campagne' : 'Unable to validate campaign code',
    errorCreateParticipant: language === 'fr' ? 'Impossible de créer votre participation' : 'Unable to create your participation',
    contactSupport: language === 'fr' ? 'Contacter le support' : 'Contact support',
    saving: language === 'fr' ? 'Enregistrement de vos résultats...' : 'Saving your results...',
    score: language === 'fr' ? 'Score' : 'Score',
    points: language === 'fr' ? 'points' : 'points',
    backHome: language === 'fr' ? 'Retour à l\'accueil' : 'Back to home',
    previousSection: language === 'fr' ? 'Section précédente' : 'Previous section',
    sectionOf: language === 'fr' ? 'sur' : 'of',
    restart: language === 'fr' ? 'Recommencer' : 'Restart',
  };

  const lang: 'fr' | 'en' = language === 'en' ? 'en' : 'fr';

  // v2: one questionnaire for every campaign, grouped by dimension in spec order.
  const thematicOrder = DIMENSION_IDS as string[];
  const questionsByThematic = useMemo(() => {
    const grouped: Record<string, V2Question[]> = {};
    V2_QUESTIONS.forEach(q => {
      (grouped[q.dimension] ||= []).push(q);
    });
    return grouped;
  }, []);

  const currentThematic = thematicOrder[currentThematicIndex];
  const questionsInCurrentThematic = questionsByThematic[currentThematic] || [];

  // Find the current active question (first unanswered in current thematic)
  const currentActiveQuestionId = useMemo(() => {
    for (const q of questionsInCurrentThematic) {
      if (answers[q.id] === undefined) {
        return q.id;
      }
    }
    return null;
  }, [questionsInCurrentThematic, answers]);

  // Get completed thematics
  const completedThematics = useMemo(() => {
    return thematicOrder.filter(th => (questionsByThematic[th] || []).every(q => answers[q.id] !== undefined));
  }, [answers, questionsByThematic, thematicOrder]);

  // Check if current thematic is complete
  const isCurrentThematicComplete = useMemo(() => {
    return questionsInCurrentThematic.every(q => answers[q.id] !== undefined);
  }, [questionsInCurrentThematic, answers]);

  const contextComplete = CONTEXT_FIELDS.every(f => {
    const v = context[f.id];
    return Array.isArray(v) ? v.length > 0 : !!v;
  });

  // Save progress to database (answers, context and open answers live in `responses`)
  const saveProgress = useCallback(async (isCompleted: boolean = false) => {
    if (!participantInfo || isPreview) return;

    try {
      const scores = computeScores(answers);
      const responses: V2Responses = { version: 2, answers, context, open };
      const teamLabel = typeof context.team === 'string' ? optionLabel('team', context.team, 'en') : null;

      const updateData: Record<string, any> = {
        responses,
        item_scores: scores,
        team: teamLabel,
        updated_at: new Date().toISOString()
      };

      if (isCompleted) {
        updateData.status = 'completed';
        updateData.completed_at = new Date().toISOString();
        // Readiness index (0–100). The v2 class lives in item_scores.classId:
        // the legacy `profile` enum cannot hold the new classes.
        updateData.global_score = scores.readiness;
        updateData.profile = null;
      }

      const { error } = await supabase
        .from('participants')
        .update(updateData)
        .eq('id', participantInfo.id);

      if (error) {
        console.error('Error saving progress:', error);
      }
    } catch (err) {
      console.error('Error saving progress:', err);
    }
  }, [participantInfo, answers, context, open]);

  // Advance when a section is complete; after the last one, move on to the open questions.
  useEffect(() => {
    if (manualNavRef.current || phase !== 'questions') return;
    if (isCurrentThematicComplete && participantInfo && currentThematicIndex < thematicOrder.length - 1) {
      saveProgress(false);
      setTimeout(() => {
        setCurrentThematicIndex(prev => prev + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 500);
    } else if (isCurrentThematicComplete && currentThematicIndex === thematicOrder.length - 1 && participantInfo) {
      saveProgress(false);
      setTimeout(() => {
        setPhase('open');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 400);
    }
  }, [isCurrentThematicComplete, currentThematicIndex, thematicOrder.length, participantInfo, saveProgress, phase]);

  const handleAnswer = useCallback((questionId: string, value: AnswerValue) => {
    manualNavRef.current = false;
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  }, []);

  const handleAutoAdvance = useCallback((questionId: string) => {
    const currentIndex = questionsInCurrentThematic.findIndex(q => q.id === questionId);
    const nextQuestion = questionsInCurrentThematic[currentIndex + 1];

    if (nextQuestion && questionRefs.current[nextQuestion.id]) {
      setTimeout(() => {
        questionRefs.current[nextQuestion.id]?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }, 100);
    }
  }, [questionsInCurrentThematic]);

  const handlePreviousThematic = () => {
    if (currentThematicIndex > 0) {
      manualNavRef.current = true;
      setCurrentThematicIndex(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setPhase('context');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Themes the respondent may open: every completed one plus the first incomplete one.
  const firstIncompleteIndex = thematicOrder.findIndex(th => !completedThematics.includes(th));
  const maxReachableIndex = firstIncompleteIndex === -1 ? thematicOrder.length - 1 : firstIncompleteIndex;

  const handleSelectThematic = (index: number) => {
    if (index === currentThematicIndex || index > maxReachableIndex) return;
    // Jumping forward to the first incomplete theme resumes the normal flow.
    manualNavRef.current = index !== firstIncompleteIndex;
    setCurrentThematicIndex(index);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetThematic = () => {
    const questionIds = questionsInCurrentThematic.map(q => q.id);
    setAnswers(prev => {
      const newAnswers = { ...prev };
      questionIds.forEach(id => delete newAnswers[id]);
      return newAnswers;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmitContext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contextComplete) {
      toast({ title: t.error, description: t.fillAllFields, variant: 'destructive' });
      return;
    }
    saveProgress(false);
    setPhase('questions');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmitOpen = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await saveProgress(true);
    setIsSaving(false);
    setIsComplete(true);
  };

  const finalScores = useMemo(() => computeScores(answers), [answers]);

  // Current question number within thematic for progress
  const answeredInThematic = questionsInCurrentThematic.filter(q => answers[q.id] !== undefined).length;

  // Handle registration form submission
  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!registrationForm.firstName || !registrationForm.lastName || !registrationForm.email || !registrationForm.campaignCode) {
      toast({
        title: t.error,
        description: t.fillAllFields,
        variant: "destructive"
      });
      return;
    }

    // Validate professional email
    const emailValidation = validateProfessionalEmail(registrationForm.email);
    if (!emailValidation.valid) {
      setEmailError(emailValidation.message || (language === 'fr' ? 'Email invalide' : 'Invalid email'));
      toast({
        title: t.invalidEmail,
        description: emailValidation.message,
        variant: "destructive"
      });
      return;
    }

    setIsValidating(true);

    try {
      // Validate campaign code
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('id, company_name, assessment_type, language')
        .eq('code', registrationForm.campaignCode.toUpperCase())
        .maybeSingle();

      if (campaignError) throw campaignError;

      if (!campaign) {
        toast({
          title: t.invalidCode,
          description: t.invalidCodeDesc,
          variant: "destructive"
        });
        setIsValidating(false);
        return;
      }

      // Apply campaign default language for the participant journey
      const campaignLang: 'fr' | 'en' = (campaign as any).language === 'en' ? 'en' : 'fr';
      setLanguage(campaignLang);

      // Check if participant already exists
      const { data: existingParticipant } = await supabase
        .from('participants')
        .select('id, status, responses')
        .eq('email', registrationForm.email.toLowerCase())
        .eq('campaign_id', campaign.id)
        .maybeSingle();

      let participantId: string;

      if (existingParticipant) {
        // Resume existing participant
        participantId = existingParticipant.id;
        
        // Restore previous v2 answers if any (answers to the previous questionnaire are not reusable)
        if (isV2Responses(existingParticipant.responses)) {
          const saved = existingParticipant.responses;
          setAnswers(saved.answers || {});
          setContext(saved.context || {});
          setOpen(saved.open || {});
          const ctxDone = CONTEXT_FIELDS.every(f => {
            const v = saved.context?.[f.id];
            return Array.isArray(v) ? v.length > 0 : !!v;
          });
          const allAnswered = V2_QUESTIONS.every(q => saved.answers?.[q.id]);
          setPhase(!ctxDone ? 'context' : allAnswered ? 'open' : 'questions');
        }

        if (existingParticipant.status === 'completed') {
          toast({
            title: t.testCompleted,
            description: t.testCompletedDesc,
            variant: "destructive"
          });
          setIsValidating(false);
          return;
        }

        toast({
          title: t.resumeTest,
          description: t.resumeTestDesc
        });
      } else {
        // Create new participant
        const { data: newParticipant, error: insertError } = await supabase
          .from('participants')
          .insert({
            first_name: registrationForm.firstName.trim(),
            last_name: registrationForm.lastName.trim(),
            email: registrationForm.email.toLowerCase().trim(),
            company_name: campaign.company_name,
            campaign_id: campaign.id,
            status: 'in_progress',
            started_at: new Date().toISOString()
          })
          .select('id')
          .single();

        if (insertError) {
          console.error('Error creating participant:', insertError);
          const errorDetails = insertError.message || JSON.stringify(insertError);
          const mailSubject = encodeURIComponent(
            language === 'fr' ? 'Erreur création participation' : 'Participation creation error'
          );
          const mailBody = encodeURIComponent(
            `${language === 'fr' ? 'Erreur rencontrée' : 'Error encountered'}: ${errorDetails}\n\n` +
            `Email: ${registrationForm.email}\nCampagne: ${registrationForm.campaignCode}\nDate: ${new Date().toISOString()}`
          );
          toast({
            title: t.error,
            description: (
              <div className="space-y-2">
                <p>{t.errorCreateParticipant}</p>
                <p className="text-xs opacity-90 font-mono break-all">{errorDetails}</p>
              </div>
            ),
            variant: "destructive",
            duration: 15000,
          });
          setIsValidating(false);
          return;
        }

        participantId = newParticipant.id;

        toast({
          title: t.welcome,
          description: `${t.welcomeDesc} ${campaign.company_name}`
        });
      }

      const campaignType = ((campaign as any).assessment_type as AssessmentType) || 'sales';
      setParticipantInfo({
        id: participantId,
        firstName: registrationForm.firstName,
        lastName: registrationForm.lastName,
        email: registrationForm.email,
        campaignCode: registrationForm.campaignCode.toUpperCase(),
        campaignId: campaign.id,
        companyName: campaign.company_name,
        assessmentType: campaignType,
        campaignLanguage: campaignLang,
      });

    } catch (error: any) {
      console.error('Error validating campaign:', error);
      const errorDetails = error?.message || JSON.stringify(error);
      const mailSubject = encodeURIComponent(
        language === 'fr' ? 'Erreur validation campagne' : 'Campaign validation error'
      );
      const mailBody = encodeURIComponent(
        `${language === 'fr' ? 'Erreur rencontrée' : 'Error encountered'}: ${errorDetails}\n\n` +
        `Email: ${registrationForm.email}\nCampagne: ${registrationForm.campaignCode}\nDate: ${new Date().toISOString()}`
      );
      toast({
        title: t.error,
        description: (
          <div className="space-y-2">
            <p>{t.errorValidation}</p>
            <p className="text-xs opacity-90 font-mono break-all">{errorDetails}</p>
          </div>
        ),
        variant: "destructive",
        duration: 15000,
      });
    } finally {
      setIsValidating(false);
    }
  };

  // Registration screen
  if (!participantInfo) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 border-b border-border bg-card">
          <div className="mx-auto flex h-14 max-w-[780px] items-center justify-between px-4">
            <Link to="/" className="rounded-md" aria-label="Dust">
              <DustWordmark subtitle={language === 'fr' ? 'Évaluation de maturité IA' : 'AI maturity assessment'} />
            </Link>
            <div className="flex items-center gap-1">
              <LanguageSwitcher />
              <Button variant="ghost" size="sm" asChild>
                <Link to="/">
                  <ArrowLeft className="h-4 w-4" />
                  {t.back}
                </Link>
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[520px] px-4 py-10">
          <div className="mb-5">
            <h1 className="page-title">{t.title}</h1>
            <p className="mt-1 text-[13px] text-muted-foreground">{t.description}</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><Timer className="h-3.5 w-3.5" />{language === 'fr' ? 'Environ 10 minutes' : 'About 10 minutes'}</span>
              <span className="inline-flex items-center gap-1.5"><Save className="h-3.5 w-3.5" />{language === 'fr' ? 'Réponses enregistrées à chaque thématique' : 'Answers saved after each theme'}</span>
            </div>
          </div>

          <div className="card-elevated p-5">
            <form onSubmit={handleRegistration} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">{t.firstName}</Label>
                  <Input
                    id="firstName"
                    autoComplete="given-name"
                    value={registrationForm.firstName}
                    onChange={(e) => setRegistrationForm({ ...registrationForm, firstName: e.target.value })}
                    placeholder={t.firstNamePlaceholder}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">{t.lastName}</Label>
                  <Input
                    id="lastName"
                    autoComplete="family-name"
                    value={registrationForm.lastName}
                    onChange={(e) => setRegistrationForm({ ...registrationForm, lastName: e.target.value })}
                    placeholder={t.lastNamePlaceholder}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">{t.email}</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={registrationForm.email}
                  onChange={(e) => {
                    setRegistrationForm({ ...registrationForm, email: e.target.value });
                    setEmailError(null);
                  }}
                  placeholder={t.emailPlaceholder}
                  className={emailError ? 'border-destructive' : ''}
                  aria-invalid={!!emailError}
                  aria-describedby={emailError ? 'email-error' : undefined}
                />
                {emailError && (
                  <p id="email-error" className="flex items-center gap-1 text-[12px] text-risk-ink">
                    <AlertCircle className="h-3 w-3" />
                    {emailError}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="campaignCode">{t.campaignCode}</Label>
                <Input
                  id="campaignCode"
                  value={registrationForm.campaignCode}
                  onChange={(e) => setRegistrationForm({ ...registrationForm, campaignCode: e.target.value.toUpperCase() })}
                  placeholder={t.codePlaceholder}
                  className="font-mono uppercase tracking-widest"
                />
              </div>

              <Button type="submit" className="w-full" disabled={isValidating}>
                {isValidating && <Loader2 className="h-4 w-4 animate-spin" />}
                {isValidating ? t.validating : t.startQuiz}
              </Button>
            </form>
          </div>

          {/* Redirect for people without code */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-border px-4 py-3">
            <p className="text-[13px] text-muted-foreground">{t.noCode}</p>
            <Button variant="outline" size="sm" asChild>
              <Link to="/create-campaign">
                <UserPlus className="h-4 w-4" />
                {t.createAssessment}
              </Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const fr = lang === 'fr';

  const topBar = (children?: React.ReactNode) => (
    <header className="sticky top-0 z-10 border-b border-border bg-card">
      <div className="mx-auto flex h-12 max-w-[780px] items-center justify-between gap-3 px-4">
        <DustWordmark subtitle={participantInfo.companyName} />
        <div className="flex items-center gap-2">
          {isPreview && (
            <span className="pill pill-amber">{fr ? 'Exemple · rien n’est enregistré' : 'Preview · nothing is saved'}</span>
          )}
          <LanguageSwitcher />
        </div>
      </div>
      {children}
    </header>
  );

  if (isComplete || isSaving) {
    const cls = getResultClass(finalScores.classId);
    return (
      <div className="min-h-screen bg-background">
        {topBar()}
        <main className="mx-auto max-w-[640px] px-4 py-10">
          <div className="card-elevated p-6 sm:p-8">
            {isSaving ? (
              <div className="flex flex-col items-center py-6 text-center">
                <Loader2 className="mb-3 h-6 w-6 animate-spin text-brand-ink" />
                <h1 className="card-title">{t.saving}</h1>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 text-ok-ink">
                  <CheckCircle2 className="h-4 w-4" />
                  <p className="text-[13px] font-medium">
                    {fr ? 'Questionnaire terminé, réponses enregistrées' : 'Assessment complete, answers saved'}
                  </p>
                </div>
                <p className="eyebrow mt-5">{fr ? 'Votre profil' : 'Your profile'}</p>
                <h1 className="page-title mt-1">{fr ? cls.name.fr : cls.name.en}</h1>
                <p className="mt-2 text-[14px] leading-relaxed text-foreground">{fr ? cls.meaning.fr : cls.meaning.en}</p>
                <div className="mt-5 flex items-baseline gap-2 border-l-2 border-brand pl-4">
                  <span className="text-[13px] text-muted-foreground">{fr ? 'Indice de maturité IA' : 'AI readiness index'}</span>
                  <span className="text-[22px] font-semibold tabular-nums text-foreground">{finalScores.readiness}</span>
                  <span className="text-[13px] text-muted-foreground">/100</span>
                </div>
                <p className="mt-4 text-[13px] text-muted-foreground">
                  {fr
                    ? 'Ce profil est un signal, pas un verdict : il sera confirmé avec vous avant toute proposition de rôle.'
                    : 'This profile is a signal, not a verdict: it will be confirmed with you before any role is proposed.'}
                </p>
                <div className="mt-6 flex justify-end border-t border-border pt-4">
                  <Button variant="outline" onClick={() => navigate('/')}>
                    {t.backHome}
                  </Button>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    );
  }

  const choiceClass = (selected: boolean) =>
    cn(
      'flex min-h-9 items-center gap-2 rounded-md border px-3 py-1.5 text-left text-[13px] transition-colors duration-150',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1',
      selected ? 'border-brand bg-brand-soft font-medium text-foreground' : 'border-border bg-card text-foreground hover:border-brand/50'
    );

  // Step 1 — About you (context, not scored)
  if (phase === 'context') {
    return (
      <div className="min-h-screen bg-background">
        {topBar()}
        <main className="mx-auto max-w-[780px] px-4 py-8">
          <p className="eyebrow">{fr ? 'Étape 1 sur 3' : 'Step 1 of 3'}</p>
          <h1 className="page-title mt-1">{fr ? 'À propos de vous' : 'About you'}</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {fr ? 'Ces informations ne sont pas notées. Elles servent à organiser le déploiement.' : 'These answers are not scored. They help organise the rollout.'}
          </p>

          <form onSubmit={handleSubmitContext} className="mt-5 space-y-3">
            {CONTEXT_FIELDS.map((field) => {
              const value = context[field.id];
              const list = Array.isArray(value) ? value : value ? [value] : [];
              return (
                <fieldset key={field.id} className="card-elevated p-5">
                  <legend className="sr-only">{fr ? field.label.fr : field.label.en}</legend>
                  <p className="text-[15px] font-medium leading-relaxed text-foreground" aria-hidden>
                    {fr ? field.label.fr : field.label.en}
                  </p>
                  {field.multiple && (
                    <p className="mt-0.5 text-[12px] text-muted-foreground">{fr ? 'Plusieurs choix possibles' : 'Select all that apply'}</p>
                  )}
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {field.options.map((opt) => {
                      const selected = list.includes(opt.id);
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          role={field.multiple ? 'checkbox' : 'radio'}
                          aria-checked={selected}
                          className={choiceClass(selected)}
                          onClick={() =>
                            setContext((prev) => {
                              if (!field.multiple) return { ...prev, [field.id]: opt.id };
                              const cur = Array.isArray(prev[field.id]) ? (prev[field.id] as string[]) : [];
                              return { ...prev, [field.id]: selected ? cur.filter((x) => x !== opt.id) : [...cur, opt.id] };
                            })
                          }
                        >
                          <span
                            className={cn(
                              'flex h-4 w-4 shrink-0 items-center justify-center border',
                              field.multiple ? 'rounded-[4px]' : 'rounded-full',
                              selected ? 'border-brand bg-brand-strong text-white' : 'border-line bg-card'
                            )}
                            aria-hidden
                          >
                            {selected && <Check className="h-3 w-3" />}
                          </span>
                          {fr ? opt.label.fr : opt.label.en}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              );
            })}
            <div className="flex items-center justify-end gap-3 pt-2">
              {!contextComplete && (
                <span className="text-[12px] text-muted-foreground">{fr ? 'Répondez à toutes les questions pour continuer' : 'Answer every question to continue'}</span>
              )}
              <Button type="submit" disabled={!contextComplete}>
                {fr ? 'Continuer vers le questionnaire' : 'Continue to the questionnaire'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </main>
      </div>
    );
  }

  // Step 3 — Open questions (not scored)
  if (phase === 'open') {
    return (
      <div className="min-h-screen bg-background">
        {topBar()}
        <main className="mx-auto max-w-[780px] px-4 py-8">
          <p className="eyebrow">{fr ? 'Étape 3 sur 3' : 'Step 3 of 3'}</p>
          <h1 className="page-title mt-1">{fr ? 'Pour finir, en quelques mots' : 'To finish, in a few words'}</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {fr ? 'Facultatif, mais très utile pour choisir les premiers cas d’usage.' : 'Optional, but very useful to pick the first use cases.'}
          </p>
          <form onSubmit={handleSubmitOpen} className="mt-5 space-y-3">
            {OPEN_FIELDS.map((field) => (
              <div key={field.id} className="card-elevated p-5">
                <Label htmlFor={`open-${field.id}`} className="text-[15px] font-medium leading-relaxed">
                  {fr ? field.label.fr : field.label.en}
                </Label>
                <Textarea
                  id={`open-${field.id}`}
                  className="mt-3 min-h-[76px]"
                  value={open[field.id] ?? ''}
                  onChange={(e) => setOpen((prev) => ({ ...prev, [field.id]: e.target.value }))}
                  maxLength={1000}
                />
              </div>
            ))}
            <div className="flex items-center justify-between gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  manualNavRef.current = true;
                  setCurrentThematicIndex(thematicOrder.length - 1);
                  setPhase('questions');
                }}
              >
                <ArrowLeft className="h-4 w-4" />
                {fr ? 'Revenir aux questions' : 'Back to the questions'}
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {fr ? 'Envoyer mes réponses' : 'Submit my answers'}
              </Button>
            </div>
          </form>
        </main>
      </div>
    );
  }

  // Step 2 — Scored statements, one dimension at a time
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {topBar(
        <div className="mx-auto max-w-[780px] px-4 pb-3">
          <AssessmentProgress
            thematics={thematicOrder}
            currentThematic={currentThematic}
            answeredInThematic={answeredInThematic}
            totalQuestionsInThematic={questionsInCurrentThematic.length}
            completedThematics={completedThematics}
            maxReachableIndex={maxReachableIndex}
            onSelectThematic={handleSelectThematic}
            labelFor={(id) => dimensionLabel(id, lang)}
            stepLabel={fr ? 'Étape 2 sur 3' : 'Step 2 of 3'}
          />
        </div>
      )}

      <main className="flex-1 py-6">
        <div className="mx-auto max-w-[780px] space-y-3 px-4">
          {questionsInCurrentThematic.map((question, index) => (
            <LikertScale
              key={question.id}
              ref={(el) => { questionRefs.current[question.id] = el; }}
              questionId={question.id}
              text={questionText(question, lang)}
              value={answers[question.id]}
              onChange={(value) => handleAnswer(question.id, value)}
              onAutoAdvance={() => handleAutoAdvance(question.id)}
              isActive={question.id === currentActiveQuestionId || answers[question.id] !== undefined}
              questionNumber={index + 1}
            />
          ))}
        </div>
      </main>

      <footer className="sticky bottom-0 border-t border-border bg-card">
        <div className="mx-auto flex h-14 max-w-[780px] items-center justify-between gap-2 px-4">
          <Button variant="ghost" size="sm" onClick={handlePreviousThematic}>
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{currentThematicIndex === 0 ? (fr ? 'À propos de vous' : 'About you') : t.previousSection}</span>
          </Button>

          <span className="text-[12px] tabular-nums text-muted-foreground">
            Section {currentThematicIndex + 1} {t.sectionOf} {thematicOrder.length}
          </span>

          <Button variant="ghost" size="sm" onClick={handleResetThematic}>
            <RotateCcw className="h-4 w-4" />
            <span className="hidden sm:inline">{t.restart}</span>
          </Button>
        </div>
      </footer>
    </div>
  );
};

export default Assessment;
