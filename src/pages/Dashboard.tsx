import { useState, useMemo, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DustWordmark } from '@/components/DustMark';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { TopBar, PageHeader } from '@/components/CampaignHeader';
import { DashboardSidebar, TabId, TAB_LABELS, CLIENT_HIDDEN_TABS } from '@/components/DashboardSidebar';
import { SectionCard } from '@/components/console/SectionCard';
import { OpenAnswersCard } from '@/components/console/OpenAnswersCard';
import { SignInLog } from '@/components/console/SignInLog';
import { HeroDiagnostic, KpiCards, DimensionBars, RankedList, PendingBanner, NextSteps, CardLink } from '@/components/console/OverviewBlocks';
import { ParticipantDrawer } from '@/components/console/ParticipantDrawer';
import { CompareView } from '@/components/console/CompareView';
import { DeploymentPlan } from '@/components/console/DeploymentPlan';
import { PartnerServices } from '@/components/console/PartnerServices';
import { ImportResponses } from '@/components/console/ImportResponses';
import { CustomQuestionsCard } from '@/components/console/CustomQuestionsCard';
import { PROFILE_BADGE, profileLabel } from '@/lib/profile-style';
import {
  CLASS_PROFILES,
  DIMENSION_IDS,
  READINESS_DIMENSION_IDS,
  classAsProfile,
  dimensionLabel,
  getDimension,
  getReadinessBand,
  getResultClass,
  type RoleId,
} from '@/lib/assessment-v2';
import { cn } from '@/lib/utils';
import { DEMO_FLAG, isDemoMode } from '@/demo/demo-data';
import { clearAccessKeys } from '@/lib/access';
import { DashboardAccessModal, AdminCampaign, ADMIN_EMAIL_KEY } from '@/components/DashboardAccessModal';
import { EmptyDashboardState } from '@/components/EmptyDashboardState';
import { DownloadOptionsModal } from '@/components/DownloadOptionsModal';
import { DetailedScoresTab } from '@/components/DetailedScoresTab';
import { ItemScoresMatrix } from '@/components/ItemScoresMatrix';
import { ProfileDistribution } from '@/components/charts/ProfileDistribution';
import { ThematicRadar } from '@/components/charts/ThematicRadar';
import { ParticipantsTable } from '@/components/ParticipantsTable';
import { ProfileCardsLegend } from '@/components/ProfileCardsLegend';
import { ThematicCards } from '@/components/ThematicCards';
import { SettingsTab } from '@/components/SettingsTab';
import { CompareSelector, CompareOption } from '@/components/CompareSelector';
import { CampaignSelector, Campaign } from '@/components/CampaignSelector';
import { Loader2, Info, Users, Send, Download, Share2, UserPlus, UserCheck, BadgeCheck, GraduationCap, HelpCircle, ArrowRight, ChevronRight, CheckCircle2, Gauge, Wrench, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCampaignParticipants } from '@/hooks/useCampaignParticipants';
import { useClientCampaigns } from '@/hooks/useClientCampaigns';
import { useClientTimeline } from '@/hooks/useClientTimeline';
import { ClientTimeline } from '@/components/console/ClientTimeline';
import type { SurveyAudience } from '@/lib/assessment-v2';
import { waveLabel, type Wave, type Workflow } from '@/lib/waves';
import type { Usage } from '@/lib/usage-import';
import { useGlobalBenchmark } from '@/hooks/useGlobalBenchmark';


import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import type { SummaryPdfData } from '@/lib/export-pdf';
import { 
  PROFILES, 
  THEMATICS,
  THEMATIC_DEFINITIONS,
  ThematicType,
  getThematicsForType,
  type AssessmentType,
} from '@/lib/assessment-data';
import { setActiveAssessmentType } from '@/lib/active-assessment-type';
import { supabase } from '@/integrations/supabase/client';
import { isGlobalCampaignId, buildGlobalCampaignId, GLOBAL_CAMPAIGN_CODE, GLOBAL_CAMPAIGN_PREFIX } from '@/lib/global-campaign';



interface CampaignAccess {
  campaignId: string;
  companyName: string;
  creatorEmail: string;
  campaignCode?: string;
}

interface StoredSession {
  access: CampaignAccess;
  lastActivity: number;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  allCampaigns?: Campaign[];
}

// v2: bumped to invalidate pre-security-fix sessions that may have cached
// the full campaign list for campaign-tagged admins.
/** Numbered header of an overview block (1 Starting point · 2 People · 3 Rollout plan). */
const OverviewBlockHeader = ({ n, title, question, meta }: { n: number; title: string; question: string; meta?: string }) => (
  <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border pb-2 pt-4 first:pt-0">
    <div className="flex items-center gap-3">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-[13px] font-semibold text-white">{n}</span>
      <div>
        <h2 className="text-[17px] font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="text-[12px] text-muted-foreground">{question}</p>
      </div>
    </div>
    {meta && <p className="text-[12px] text-muted-foreground">{meta}</p>}
  </div>
);

const SESSION_KEY = 'dashboard_session_v2';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes en millisecondes
const SIDEBAR_KEY = 'console_sidebar_collapsed';

const KIT_PENDING_KEY = 'dust_kit_pending';

const Dashboard = () => {
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [campaignAccess, setCampaignAccess] = useState<CampaignAccess | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [compareSelections, setCompareSelections] = useState<CompareOption[]>([]);
  const [showCampaignAverage, setShowCampaignAverage] = useState(true);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [allCampaigns, setAllCampaigns] = useState<Campaign[]>([]);
  const [showAccessModal, setShowAccessModal] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [createRequested, setCreateRequested] = useState(0);
  // Prefills for a follow-up wave started from the « Suivi » tab (cleared by the sidebar « New campaign »).
  const [createPreset, setCreatePreset] = useState<{ company: string; name: string; audience: SurveyAudience; wave: Wave } | undefined>(undefined);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem(SIDEBAR_KEY) === '1'; } catch { return false; }
  });
  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0'); } catch { /* storage unavailable */ }
      return next;
    });
  }, []);
  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);

  // Each screen starts at the top
  useEffect(() => {
    window.scrollTo({ top: 0 });
    // The "new campaign" request only applies to the visit that triggered it
    if (activeTab !== 'campaignSettings') setCreateRequested(0);
  }, [activeTab]);

  // Restaurer la session depuis localStorage au chargement
  useEffect(() => {
    // Purge legacy session keys from before the access-scope security fix
    try { localStorage.removeItem('dashboard_session'); } catch {}
    // A private results link (?key=…) always starts a fresh client session, handled by the access modal.
    if (new URLSearchParams(window.location.search).get('key')) {
      localStorage.removeItem(SESSION_KEY);
      setIsInitialized(true);
      return;
    }
    const storedSession = localStorage.getItem(SESSION_KEY);
    if (storedSession) {
      try {
        const session: StoredSession = JSON.parse(storedSession);
        const now = Date.now();
        
        // Vérifier si la session n'a pas expiré (30 minutes d'inactivité)
        if (now - session.lastActivity < SESSION_TIMEOUT) {
          setCampaignAccess(session.access);
          setIsAdmin(session.isAdmin || false);
          setIsSuperAdmin(session.isSuperAdmin || false);
          setAllCampaigns(session.allCampaigns || []);
          setShowAccessModal(false);
          // Mettre à jour le timestamp d'activité
          localStorage.setItem(SESSION_KEY, JSON.stringify({
            ...session,
            lastActivity: now
          }));
        } else {
          // Session expirée : la supprimer, avec les clés d'accès
          localStorage.removeItem(SESSION_KEY);
          clearAccessKeys();
        }
      } catch (e) {
        localStorage.removeItem(SESSION_KEY);
      }
    }
    setIsInitialized(true);
  }, []);

  // Mettre à jour le timestamp d'activité lors des interactions utilisateur
  const updateActivity = useCallback(() => {
    if (campaignAccess) {
      const storedSession = localStorage.getItem(SESSION_KEY);
      if (storedSession) {
        try {
          const session: StoredSession = JSON.parse(storedSession);
          localStorage.setItem(SESSION_KEY, JSON.stringify({
            ...session,
            lastActivity: Date.now()
          }));
        } catch (e) {
          // Ignore parsing errors
        }
      }
    }
  }, [campaignAccess]);

  // Écouter les événements d'activité utilisateur
  useEffect(() => {
    if (!campaignAccess) return;

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, updateActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
    };
  }, [campaignAccess, updateActivity]);

  // Vérifier périodiquement si la session a expiré
  useEffect(() => {
    if (!campaignAccess) return;

    const checkSession = () => {
      const storedSession = localStorage.getItem(SESSION_KEY);
      if (storedSession) {
        try {
          const session: StoredSession = JSON.parse(storedSession);
          const now = Date.now();
          if (now - session.lastActivity >= SESSION_TIMEOUT) {
            // Session expirée
            localStorage.removeItem(SESSION_KEY);
            setCampaignAccess(null);
          }
        } catch (e) {
          localStorage.removeItem(SESSION_KEY);
          setCampaignAccess(null);
        }
      }
    };

    const interval = setInterval(checkSession, 60000); // Vérifier toutes les minutes
    return () => clearInterval(interval);
  }, [campaignAccess]);
  
  // Check if user has access
  const isAccessGranted = campaignAccess !== null;
  
  // Active assessment type for the selected campaign (drives thematic filtering)
  const [assessmentType, setAssessmentType] = useState<AssessmentType>('sales');

  useEffect(() => {
    if (!campaignAccess?.campaignId) return;
    let cancelled = false;
    (async () => {
      const id = campaignAccess.campaignId;
      let data: any = null;
      if (isGlobalCampaignId(id)) {
        const companySlug = id.slice(GLOBAL_CAMPAIGN_PREFIX.length);
        const { data: rows } = await supabase
          .from('campaigns')
          .select('assessment_type, language, company_name, created_at')
          .order('created_at', { ascending: false });
        data = (rows || []).find(
          (r: any) => (r.company_name || '').trim().toLowerCase() === companySlug
        ) || null;
      } else {
        const { data: row } = await supabase
          .from('campaigns')
          .select('assessment_type, language')
          .eq('id', id)
          .maybeSingle();
        data = row;
      }
      if (cancelled) return;
      const tType = ((data as any)?.assessment_type as AssessmentType) || 'sales';
      setAssessmentType(tType);
      setActiveAssessmentType(tType);
    })();
    return () => { cancelled = true; };
  }, [campaignAccess?.campaignId]);

  useEffect(() => {
    // SECURITY: only super-admins (master bypass) may load every campaign.
    // Campaign-tagged admins must stay restricted to allCampaigns from the modal.
    if (!isInitialized || !isSuperAdmin) return;

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('id, code, company_name, campaign_name, creator_email, creator_first_name, creator_last_name, created_at')
        .order('created_at', { ascending: false });

      if (cancelled || error || !data) return;

      setAllCampaigns(data as Campaign[]);
      const storedSession = localStorage.getItem(SESSION_KEY);
      if (storedSession) {
        try {
          const session: StoredSession = JSON.parse(storedSession);
          localStorage.setItem(SESSION_KEY, JSON.stringify({
            ...session,
            allCampaigns: data,
            lastActivity: Date.now(),
          }));
        } catch {
          // Ignore stale session parsing errors.
        }
      }
    })();

    return () => { cancelled = true; };
  }, [isInitialized, isSuperAdmin]);

  // Fetch real participants from database
  const { participants, isLoading, legacyCount } = useCampaignParticipants(campaignAccess?.campaignId || null, refreshKey);
  const { campaigns: clientCampaigns } = useClientCampaigns(
    campaignAccess?.companyName || null,
    campaignAccess?.campaignId || null
  );
  const { benchmark: globalBenchmark } = useGlobalBenchmark();
  // Admins read every campaign of the client; a client (private link) only gets scores through get_client_timeline.
  const {
    points: timelinePoints,
    isLoading: timelineLoading,
    patchPoint,
  } = useClientTimeline(activeTab === 'progress' ? campaignAccess?.companyName || null : null, refreshKey, !isAdmin);
  const saveCampaignFollowup = async (campaignId: string, patch: { workflows?: Workflow[]; usage?: Usage | null }) => {
    const { error } = await supabase.from('campaigns').update(patch as never).eq('id', campaignId);
    if (error) {
      toast.error(
        language === 'fr'
          ? 'Enregistrement impossible. Lancez supabase/007-campaign-wave.sql dans Supabase.'
          : 'Could not save. Run supabase/007-campaign-wave.sql in Supabase.'
      );
      return false;
    }
    patchPoint(campaignId, patch);
    return true;
  };

  
  // A "real" participant for dashboard analytics = someone who actually completed the test.
  // Members who have only been added (not_started) or are mid-test must NOT influence
  // the dashboard averages, otherwise scores get diluted with zeros.
  const completedParticipants = useMemo(
    () => participants.filter(p => p.status === 'completed'),
    [participants]
  );
  const hasParticipants = completedParticipants.length > 0;
  // The 9 Dust dimensions, minus those this campaign's questionnaire does not measure (pre-sales diagnostic).
  const activeThematics = useMemo(() => {
    const all = DIMENSION_IDS as string[];
    if (!completedParticipants.length) return all;
    const measured = all.filter((id) => completedParticipants.some((p) => id in p.thematicScores));
    return measured.length ? measured : all;
  }, [completedParticipants]);

  // Calculate profile distribution - only completed participants
  const profileDistribution = useMemo(() => {
    if (completedParticipants.length === 0) return CLASS_PROFILES.map(profile => ({ profile, count: 0 }));

    return CLASS_PROFILES.map(profile => ({
      profile,
      count: completedParticipants.filter(p => p.profile.id === profile.id).length,
    }));
  }, [completedParticipants]);

  // Calculate average score (completed participants only)
  const averageScore = useMemo(() => {
    if (completedParticipants.length === 0) return 0;
    const total = completedParticipants.reduce((sum, p) => sum + p.score, 0);
    return Math.round(total / completedParticipants.length);
  }, [completedParticipants]);

  // Helper function to translate thematic names
  const translateThematic = (thematic: string): string => dimensionLabel(thematic, language === 'en' ? 'en' : 'fr');

  // Calculate thematic averages (completed participants only)
  const thematicAverages = useMemo(() => {
    if (completedParticipants.length === 0) {
      return activeThematics.map(thematic => ({
        thematic: translateThematic(thematic),
        originalThematic: thematic,
        score: 0,
        benchmark: globalBenchmark.thematicScores[thematic] ?? 50,
        position: 500
      }));
    }

    return activeThematics.map(thematic => {
      const total = completedParticipants.reduce((sum, p) => sum + (p.thematicScores[thematic] || 0), 0);
      const avg = Math.round(total / completedParticipants.length);
      const benchmark = globalBenchmark.thematicScores[thematic] ?? 50;
      return {
        thematic: translateThematic(thematic),
        originalThematic: thematic,
        score: avg,
        benchmark,
        position: Math.round(500 + Math.random() * 200)
      };
    });
  }, [completedParticipants, language, activeThematics, globalBenchmark]);

  // Build selector list with a virtual "Global" entry per client with 2+ campaigns
  const selectorCampaigns = useMemo<Campaign[]>(() => {
    if (!isAdmin || allCampaigns.length === 0) return allCampaigns;
    const byCompany = new Map<string, Campaign[]>();
    allCampaigns.forEach((c) => {
      const key = (c.company_name || '').trim();
      if (!key) return;
      if (!byCompany.has(key)) byCompany.set(key, []);
      byCompany.get(key)!.push(c);
    });
    const virtuals: Campaign[] = [];
    byCompany.forEach((list, company) => {
      if (list.length < 2) return;
      const newest = list[0];
      virtuals.push({
        id: buildGlobalCampaignId(company),
        code: GLOBAL_CAMPAIGN_CODE,
        company_name: company,
        campaign_name: language === 'fr'
          ? `Global · ${list.length} campagnes`
          : `Global · ${list.length} campaigns`,
        creator_email: newest.creator_email,
        created_at: newest.created_at,
      });
    });
    virtuals.sort((a, b) => a.company_name.localeCompare(b.company_name));
    return [...virtuals, ...allCampaigns];
  }, [isAdmin, allCampaigns, language]);

  // Top performers - only completed participants, sorted by score
  const topPerformers = useMemo(() => {
    const completedParticipants = participants.filter(p => p.status === 'completed');
    if (completedParticipants.length === 0) return [];
    return [...completedParticipants]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [participants]);

  // Get score interpretation message
  // Score is already normalized (0-100) from the database
  // Cohort readiness bands (spec v2): 0–44 early · 45–59 uneven · 60–74 good · 75+ strong
  const getScoreMessage = (score: number) => {
    const band = getReadinessBand(score);
    return language === 'en'
      ? { title: band.headline.en, description: band.advice.en }
      : { title: band.headline.fr, description: band.advice.fr };
  };

  const scoreMessage = getScoreMessage(averageScore);

  const handleAccessGranted = (campaignId: string, campaignData: { companyName: string; creatorEmail: string }) => {
    const access: CampaignAccess = {
      campaignId,
      companyName: campaignData.companyName,
      creatorEmail: campaignData.creatorEmail
    };
    setCampaignAccess(access);
    setShowAccessModal(false);
    
    // Sauvegarder la session dans localStorage
    const session: StoredSession = {
      access,
      lastActivity: Date.now(),
      isAdmin: false,
      allCampaigns: []
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  };

  const handleAdminAccessGranted = (campaigns: AdminCampaign[], superAdmin = false) => {
    // No campaign yet (fresh database): nothing to show, go straight to creating the first one.
    if (campaigns.length === 0) {
      navigate('/create-campaign');
      return;
    }
    setIsAdmin(true);
    setIsSuperAdmin(superAdmin);
    setAllCampaigns(campaigns);
    setShowAccessModal(false);
    
    // Select first campaign if available
    if (campaigns.length > 0) {
      const firstCampaign = campaigns[0];
      const access: CampaignAccess = {
        campaignId: firstCampaign.id,
        companyName: firstCampaign.company_name,
        creatorEmail: firstCampaign.creator_email,
        campaignCode: firstCampaign.code
      };
      setCampaignAccess(access);
      
      const session: StoredSession = {
        access,
        lastActivity: Date.now(),
        isAdmin: true,
        isSuperAdmin: superAdmin,
        allCampaigns: campaigns
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
  };

  const handleCampaignSelect = (campaign: Campaign) => {
    const access: CampaignAccess = {
      campaignId: campaign.id,
      companyName: campaign.company_name,
      creatorEmail: campaign.creator_email,
      campaignCode: campaign.code
    };
    setCampaignAccess(access);
    
    const session: StoredSession = {
      access,
      lastActivity: Date.now(),
      isAdmin: true,
      isSuperAdmin,
      allCampaigns
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  };

  // A campaign was just created from the console: list it right away (it opens when the dialog closes).
  const handleCampaignCreated = (campaign: Campaign) => {
    // Point at Share & invite until the client kit page is opened for this campaign.
    setKitPending(campaign.id ?? null);
    try {
      if (campaign.id) localStorage.setItem(KIT_PENDING_KEY, campaign.id);
    } catch {
      /* per-browser reminder only */
    }
    const list = [campaign, ...allCampaigns.filter((c) => c.id !== campaign.id)];
    setAllCampaigns(list);
    try {
      const stored = JSON.parse(localStorage.getItem(SESSION_KEY) || '{}');
      localStorage.setItem(SESSION_KEY, JSON.stringify({ ...stored, allCampaigns: list, lastActivity: Date.now() }));
    } catch {
      /* the list is also reloaded from the database on the next visit */
    }
  };

  // A campaign was deleted: drop it, then open another one (or create the first).
  const handleCampaignDeleted = (id: string) => {
    const remaining = allCampaigns.filter((c) => c.id !== id);
    setAllCampaigns(remaining);
    if (remaining.length === 0) {
      localStorage.removeItem(SESSION_KEY);
      navigate('/create-campaign');
      return;
    }
    const next = campaignAccess?.campaignId === id ? remaining[0] : null;
    const access: CampaignAccess = next
      ? { campaignId: next.id, companyName: next.company_name, creatorEmail: next.creator_email, campaignCode: next.code }
      : campaignAccess!;
    if (next) setCampaignAccess(access);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ access, lastActivity: Date.now(), isAdmin: true, isSuperAdmin, allCampaigns: remaining } as StoredSession));
    setRefreshKey((k) => k + 1);
  };

  const handleCloseModal = () => {
    setShowAccessModal(false);
    navigate('/');
  };

  // Attendre l'initialisation avant d'afficher quoi que ce soit
  // Client manager (private results link): their campaign only, without Dust settings and admin tools.
  const isClientView = !!campaignAccess && !isAdmin;
  // Campaign just created whose client kit has not been opened yet (per browser).
  const [kitPending, setKitPending] = useState<string | null>(() => {
    try {
      return localStorage.getItem(KIT_PENDING_KEY);
    } catch {
      return null;
    }
  });
  useEffect(() => {
    if (activeTab !== 'share' || !kitPending || kitPending !== campaignAccess?.campaignId) return;
    setKitPending(null);
    try {
      localStorage.removeItem(KIT_PENDING_KEY);
    } catch {
      /* nothing to clear */
    }
  }, [activeTab, kitPending, campaignAccess?.campaignId]);
  // The signed-in Dust person (from the sign-in form), shown in the header.
  const adminEmail = (() => {
    try {
      return isDemoMode() ? 'demo@dust.tt' : localStorage.getItem(ADMIN_EMAIL_KEY) ?? '';
    } catch {
      return '';
    }
  })();
  useEffect(() => {
    if (isClientView && CLIENT_HIDDEN_TABS.includes(activeTab)) setActiveTab('overview');
  }, [isClientView, activeTab]);

  // /login is only the way in: once signed in, land on the console's own URL.
  useEffect(() => {
    if (isAccessGranted && !showAccessModal && window.location.pathname === '/login') navigate('/dashboard', { replace: true });
  }, [isAccessGranted, showAccessModal, navigate]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show access modal if not authenticated
  if (!isAccessGranted || showAccessModal) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="border-b border-border/70">
          <div className="mx-auto flex h-14 max-w-[1080px] items-center justify-between px-4">
            <Link to="/" className="rounded-md" aria-label="Dust">
              <DustWordmark subtitle={language === 'fr' ? 'Cadrage du déploiement' : 'Deployment scoping'} />
            </Link>
            <LanguageSwitcher compact />
          </div>
        </header>
        <main className="flex flex-1 items-center justify-center px-4 py-12">
          <DashboardAccessModal
            isOpen={true}
            onClose={handleCloseModal}
            onAccessGranted={handleAccessGranted}
            onAdminAccessGranted={handleAdminAccessGranted}
          />
        </main>
      </div>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">{t('dashboard.loadingResults')}</p>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    if (isDemoMode()) {
      // Leave demo mode: reload so the real data source is used again
      localStorage.removeItem(DEMO_FLAG);
      window.location.reload();
      return;
    }
    clearAccessKeys();
    supabase.auth.signOut().catch(() => {});
    setCampaignAccess(null);
    setIsAdmin(false);
    setIsSuperAdmin(false);
    setAllCampaigns([]);
    setShowAccessModal(true);
  };

  const selectedCampaign = selectorCampaigns.find(c => c.id === campaignAccess?.campaignId) || null;
  const isGlobalView = isGlobalCampaignId(campaignAccess?.campaignId);


  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Reload admin campaign list if super admin
      // Only super-admins may reload the full campaign list from DB
      if (isSuperAdmin) {
        const { data } = await supabase
          .from('campaigns')
          .select('id, code, company_name, campaign_name, creator_email, creator_first_name, creator_last_name, created_at')
          .order('created_at', { ascending: false });
        if (data) {
          setAllCampaigns(data as Campaign[]);
          const session = localStorage.getItem(SESSION_KEY);
          if (session) {
            try {
              const parsed: StoredSession = JSON.parse(session);
              localStorage.setItem(SESSION_KEY, JSON.stringify({
                ...parsed,
                allCampaigns: data,
                lastActivity: Date.now(),
              }));
            } catch {}
          }
        }
      }
      // Force participants refetch
      setRefreshKey((k) => k + 1);
      toast.success(language === 'fr' ? 'Données actualisées' : 'Data refreshed');
    } catch {
      toast.error(language === 'fr' ? 'Erreur lors de l\'actualisation' : 'Refresh failed');
    } finally {
      setIsRefreshing(false);
    }
  };

  const fr = language === 'fr';
  const tabMeta = TAB_LABELS[activeTab];
  const campaignCodeForLinks = isGlobalView ? null : (campaignAccess.campaignCode || selectedCampaign?.code || null);
  const assessmentUrl = campaignCodeForLinks
    ? `/assessment?lang=${language}&code=${campaignCodeForLinks}`
    : '/assessment';
  const campaignName = (selectedCampaign as any)?.campaign_name || null;

  // Display-only aggregates derived from the values computed above
  const pendingParticipants = participants.filter(p => p.status !== 'completed');
  const inProgressCount = participants.filter(p => p.status === 'in_progress').length;
  const notStartedCount = participants.filter(p => p.status === 'not_started').length;
  const completionRate = participants.length > 0 ? Math.round((completedParticipants.length / participants.length) * 100) : 0;
  const readinessAverages = thematicAverages.filter(ta => (READINESS_DIMENSION_IDS as string[]).includes(ta.originalThematic));
  const opportunityAverages = thematicAverages.filter(ta => !(READINESS_DIMENSION_IDS as string[]).includes(ta.originalThematic));
  const rankedThematics = [...readinessAverages].sort((a, b) => b.score - a.score);
  const strongest = rankedThematics[0];
  const weakest = rankedThematics[rankedThematics.length - 1];
  const hasBenchmark = globalBenchmark.participantCount > 0;
  const profileCount = (id: string) => profileDistribution.find(d => d.profile.id === id)?.count ?? 0;
  const pctOfCohort = (n: number) => completedParticipants.length > 0 ? Math.round((n / completedParticipants.length) * 100) : 0;
  const profileById = (id: string) => classAsProfile(id);
  const roleMismatchCount = completedParticipants.filter(p => p.roleMismatch).length;
  // Roles are independent: one person can count as both builder and champion.
  const roleCount = (role: RoleId) => completedParticipants.filter(p => p.roles.includes(role)).length;
  const teamRows = (() => {
    const byTeam = new Map<string, number[]>();
    completedParticipants.forEach(p => {
      const key = p.team || (fr ? 'Non renseignée' : 'Not specified');
      byTeam.set(key, [...(byTeam.get(key) || []), p.score]);
    });
    return [...byTeam.entries()]
      .map(([name, xs]) => ({ name: `${name} (${xs.length})`, score: Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) }))
      .sort((a, b) => b.score - a.score);
  })();
  const sortedScores = completedParticipants.map(p => p.score).sort((a, b) => a - b);
  const medianScore = sortedScores.length === 0 ? 0 : sortedScores.length % 2
    ? sortedScores[(sortedScores.length - 1) / 2]
    : Math.round((sortedScores[sortedScores.length / 2 - 1] + sortedScores[sortedScores.length / 2]) / 2);
  const highScore = sortedScores.length ? sortedScores[sortedScores.length - 1] : 0;
  const drawerParticipant = participants.find(p => p.id === drawerId) || null;

  const dimensionAction = (id: string) => {
    const d = getDimension(id);
    return d ? (fr ? d.lowAction.fr : d.lowAction.en) : '';
  };

  // Next steps straight from the spec: the two weakest readiness dimensions, then the opportunity signals.
  const nextSteps = (() => {
    const weakTwo = [...rankedThematics].reverse().slice(0, 2);
    const steps: { title: string; tag: string; tone: 'red' | 'amber' | 'brand' | 'green'; body: string }[] = weakTwo.map((ta) => ({
      title: `${ta.thematic} · ${ta.score}`,
      tag: ta.score < 50 ? (fr ? 'Bloquant' : 'Blocker') : ta.score < 70 ? (fr ? 'Fragile' : 'Fragile') : (fr ? 'À consolider' : 'To consolidate'),
      tone: ta.score < 50 ? 'red' : ta.score < 70 ? 'amber' : 'brand',
      body: dimensionAction(ta.originalThematic),
    }));
    const pain = opportunityAverages.find(o => o.originalThematic === 'pain');
    if (pain && pain.score >= 50) {
      steps.push({ title: `${pain.thematic} · ${pain.score}`, tag: fr ? 'Levier' : 'Fuel', tone: 'green', body: dimensionAction('pain') });
    }
    const value = opportunityAverages.find(o => o.originalThematic === 'value');
    if (value && value.score < 50) {
      steps.push({ title: `${value.thematic} · ${value.score}`, tag: fr ? 'Cadrage' : 'Framing', tone: 'amber', body: dimensionAction('value') });
    }
    return steps.slice(0, 3);
  })();

  const TAB_DESCRIPTIONS: Partial<Record<TabId, { fr: string; en: string }>> = {
    overview: { fr: "Où votre équipe a de l'élan, et où elle a besoin d'accompagnement.", en: 'Where your team has momentum and where it needs support.' },
    participants: { fr: `${participants.length} membres inscrits, profils et scores individuels.`, en: `${participants.length} enrolled members, profiles and individual scores.` },
    itemScores: { fr: `Performance de chaque répondant sur les ${activeThematics.length} dimensions.`, en: `Each respondent's performance across all ${activeThematics.length} dimensions.` },
    detailed: { fr: 'Répartition des réponses pour chaque question.', en: 'Answer distribution for every question.' },
    progress: { fr: 'L’évolution d’un passage à l’autre : point de départ, re-mesures, bilan, et les workflows convenus au kickoff.', en: 'How things evolve from one wave to the next: baseline, re-measures, review, and the workflows agreed at the kickoff.' },
    compare: { fr: 'Comparez la cohorte à des participants, d’autres campagnes ou des secteurs.', en: 'Benchmark the cohort against participants, other campaigns or sectors.' },
    actions: { fr: 'Qui fait quoi dans le déploiement, et par où commencer.', en: 'Who does what in the rollout, and where to start.' },
    share: { fr: 'Le lien, le message et le suivi des réponses.', en: 'The link, the message and response tracking.' },
    campaignSettings: { fr: 'Langue et campagnes de votre entreprise.', en: 'Language and your company campaigns.' },
    access: { fr: 'Code de campagne et rôles des membres.', en: 'Campaign code and member roles.' },
    dataHealth: { fr: 'Suivi de chaque participant, import et exports.', en: 'Per-participant tracking, import and exports.' },
  };

  const pageActions = activeTab === 'overview' && hasParticipants ? (
    <>
      <Button variant="outline" onClick={() => setIsDownloadModalOpen(true)}>
        <Download className="h-4 w-4" />
        {fr ? 'Exporter le rapport' : 'Export report'}
      </Button>
      <Button onClick={() => setActiveTab('share')}>
        <Share2 className="h-4 w-4" />
        {fr ? 'Partager la campagne' : 'Share campaign'}
      </Button>
    </>
  ) : activeTab === 'participants' && hasParticipants ? (
    <Button onClick={() => setActiveTab('share')}>
      <UserPlus className="h-4 w-4" />
      {fr ? 'Inviter des membres' : 'Invite members'}
    </Button>
  ) : null;

  const summary: SummaryPdfData | null = campaignAccess ? {
    lang: fr ? 'fr' : 'en',
    company: campaignAccess.companyName,
    campaignName,
    completed: completedParticipants.length,
    registered: participants.length,
    readiness: averageScore,
    benchmarkDelta: hasBenchmark ? averageScore - globalBenchmark.averageScore : undefined,
    bandTitle: scoreMessage.title,
    synthesis: scoreMessage.description,
    dimensions: readinessAverages.map((ta) => ({ name: ta.thematic, score: ta.score, benchmark: hasBenchmark ? ta.benchmark : undefined })),
    people: [
      { label: fr ? 'Formateurs' : 'Peer trainers', count: roleCount('trainer'), pct: pctOfCohort(roleCount('trainer')) },
      { label: 'Builders', count: roleCount('builder'), pct: pctOfCohort(roleCount('builder')) },
      { label: 'Champions', count: roleCount('champion'), pct: pctOfCohort(roleCount('champion')) },
      { label: 'Sponsors', count: roleCount('sponsor'), pct: pctOfCohort(roleCount('sponsor')) },
      { label: fr ? 'À convaincre' : 'Needs convincing', count: profileCount('convince'), pct: pctOfCohort(profileCount('convince')) },
    ],
    nextSteps: nextSteps.map((st) => ({ title: st.title, tag: st.tag, body: st.body })),
    roles: (['trainer', 'builder', 'champion', 'sponsor'] as RoleId[]).map((r) => {
      const cls = getResultClass(r);
      const people = completedParticipants.filter((p) => p.roles.includes(r)).sort((a, b) => b.score - a.score).map((p) => `${p.firstName} ${p.lastName}`.trim());
      return { name: fr ? cls.name.fr : cls.name.en, count: roleCount(r), people, action: `${(fr ? cls.action.fr : cls.action.en).split('. ')[0].replace(/\.$/, '')}.` };
    }),
  } : null;

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        assessmentUrl={assessmentUrl}
        campaignSwitcher={isAdmin && allCampaigns.length > 0 ? (
          <CampaignSelector
            variant="sidebar"
            campaigns={selectorCampaigns}
            selectedCampaign={selectedCampaign}
            onSelect={handleCampaignSelect}
          />
        ) : undefined}
        companyName={campaignAccess.companyName}
        campaignName={campaignName}
        responses={{ completed: completedParticipants.length, total: participants.length }}
        onNewCampaign={isAdmin ? () => { setCreatePreset(undefined); setCreateRequested(k => k + 1); setActiveTab('campaignSettings'); } : undefined}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={toggleSidebar}
        mobileOpen={mobileNavOpen}
        onMobileClose={closeMobileNav}
        clientView={isClientView}
        highlight={kitPending && kitPending === campaignAccess?.campaignId ? { tab: 'share', badge: fr ? 'Kit PDF' : 'PDF kit' } : undefined}
      />

      <div className={cn('min-h-screen transition-[margin] duration-150', sidebarCollapsed ? 'lg:ml-14' : 'lg:ml-64')}>
        <TopBar
          company={campaignAccess.companyName}
          campaignName={campaignName}
          campaignsCount={isAdmin ? allCampaigns.length : undefined}
          campaignCode={campaignCodeForLinks}
          userEmail={isAdmin ? (adminEmail || undefined) : undefined}
          roleLabel={isSuperAdmin ? 'Super Admin' : isAdmin ? 'Admin' : 'Manager'}
          isDemo={isDemoMode()}
          onOpenNav={() => setMobileNavOpen(true)}
          onOpenSettings={() => setActiveTab('campaignSettings')}
          onLogout={handleLogout}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />

        <main className="mx-auto w-full max-w-[1440px] space-y-5 px-4 py-5 md:px-6">
          <PageHeader
            crumbs={[fr ? 'Campagnes' : 'Campaigns', campaignAccess.companyName, ...(campaignName ? [campaignName] : []), fr ? tabMeta.fr : tabMeta.en]}
            title={fr ? tabMeta.fr : tabMeta.en}
            status={activeTab === 'overview' && hasParticipants ? (
              <span className="pill pill-green"><span className="h-1.5 w-1.5 rounded-full bg-ok" />{completedParticipants.length} {fr ? 'réponses' : 'responses'}</span>
            ) : undefined}
            description={TAB_DESCRIPTIONS[activeTab] ? (fr ? TAB_DESCRIPTIONS[activeTab]!.fr : TAB_DESCRIPTIONS[activeTab]!.en) : undefined}
            actions={pageActions}
          />

          {legacyCount > 0 && (activeTab === 'overview' || activeTab === 'participants' || activeTab === 'itemScores' || activeTab === 'detailed' || activeTab === 'compare') && (
            <div className="banner" style={{ ['--banner-accent' as string]: 'var(--blue)' }}>
              <Info className="h-4 w-4 shrink-0 text-note-ink" />
              <p className="min-w-0 flex-1 text-[13px] text-foreground">
                {fr
                  ? `${legacyCount} réponse${legacyCount > 1 ? 's' : ''} à l'ancien questionnaire ${legacyCount > 1 ? 'sont conservées' : 'est conservée'} en base mais ${legacyCount > 1 ? 'ne sont pas incluses' : "n'est pas incluse"} dans ces résultats : ${legacyCount > 1 ? 'elles ne portent' : 'elle ne porte'} pas sur les mêmes questions.`
                  : `${legacyCount} answer${legacyCount > 1 ? 's' : ''} to the previous questionnaire ${legacyCount > 1 ? 'are' : 'is'} kept in the database but left out of these results: they do not cover the same questions.`}
              </p>
            </div>
          )}

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <>
            {!hasParticipants ? (
              <EmptyDashboardState type="overview" />
            ) : (
              <div className="space-y-5">
                {isClientView && (
                  <div className="flex flex-wrap items-center gap-3 rounded-lg bg-brand-soft px-4 py-3 text-[13px] text-brand-ink">
                    <span className="font-semibold">{fr ? `Résultats de ${campaignAccess.companyName}, partagés par Dust` : `${campaignAccess.companyName} results, shared by Dust`}</span>
                    <span className="text-brand-ink/80">{fr ? 'Mis à jour en direct à chaque nouvelle réponse. Seule votre campagne est visible ici.' : 'Updated live with every new answer. Only your campaign is visible here.'}</span>
                  </div>
                )}
                {/* Results read as three blocks: starting point → people → plan (the plan is derived from 1 + 2). */}
                <OverviewBlockHeader
                  n={1}
                  title={fr ? 'Point de départ' : 'Starting point'}
                  question={fr ? 'Où en est le compte avec l’IA ?' : 'Where does the account stand with AI?'}
                  meta={fr ? `${completedParticipants.length} réponses sur ${participants.length} inscrits · ${completionRate}% de complétion` : `${completedParticipants.length} answers out of ${participants.length} registered · ${completionRate}% completion`}
                />
                <HeroDiagnostic
                  score={averageScore}
                  eyebrow={fr ? 'Diagnostic' : 'Diagnosis'}
                  benchmarkDelta={hasBenchmark ? { value: averageScore - globalBenchmark.averageScore, label: fr ? 'pts vs benchmark' : 'pts vs benchmark' } : undefined}
                  title={scoreMessage.title}
                  subtitle={fr ? `Indice de préparation IA · ${READINESS_DIMENSION_IDS.filter((id) => activeThematics.includes(id)).length} dimensions` : `AI readiness index · ${READINESS_DIMENSION_IDS.filter((id) => activeThematics.includes(id)).length} dimensions`}
                  synthesisTitle={fr ? 'Synthèse' : 'Synthesis'}
                  synthesis={scoreMessage.description}
                  strongest={strongest ? {
                    eyebrow: fr ? 'Point fort' : 'Strongest',
                    name: strongest.thematic,
                    score: strongest.score,
                    delta: hasBenchmark ? strongest.score - strongest.benchmark : undefined,
                    deltaLabel: fr ? 'vs benchmark' : 'vs benchmark',
                  } : undefined}
                  weakest={weakest ? {
                    eyebrow: fr ? 'Axe prioritaire' : 'Priority gap',
                    name: weakest.thematic,
                    score: weakest.score,
                    delta: hasBenchmark ? weakest.score - weakest.benchmark : undefined,
                    deltaLabel: fr ? 'vs benchmark' : 'vs benchmark',
                  } : undefined}
                />

                <div className="grid gap-5 lg:grid-cols-12">
                  <SectionCard
                    className="lg:col-span-7"
                    title={t('dashboard.thematicPerformance')}
                    description={fr ? `Score de ${campaignAccess.companyName} vs benchmark global` : `${campaignAccess.companyName} score vs global benchmark`}
                    actions={
                      <div className="flex items-center gap-3 text-[11px] text-outline">
                        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[2px] bg-brand" />{fr ? 'Cohorte' : 'Cohort'}</span>
                        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[2px] bg-lav-200" />Benchmark</span>
                      </div>
                    }
                  >
                    <DimensionBars
                      rows={readinessAverages.map(ta => ({ name: ta.thematic, score: ta.score, benchmark: hasBenchmark ? ta.benchmark : undefined }))}
                      vsLabel="vs"
                    />
                  </SectionCard>
                  <SectionCard
                    className="lg:col-span-5"
                    title={fr ? 'Préparation par équipe' : 'Readiness by team'}
                    description={fr ? "Indice moyen par équipe déclarée (nombre de répondants)" : 'Average index per declared team (respondents)'}
                  >
                    <DimensionBars animationKey="team-bars" rows={teamRows} vsLabel="vs" />
                  </SectionCard>
                </div>

                <ThematicCards
                  data={readinessAverages.map(ta => ({
                    id: ta.originalThematic,
                    name: ta.thematic,
                    score: ta.score,
                    benchmark: hasBenchmark ? ta.benchmark : undefined,
                  }))}
                />

                <OverviewBlockHeader
                  n={2}
                  title={fr ? 'Personnes' : 'People'}
                  question={fr ? 'Sur qui s’appuyer ?' : 'Who can we rely on?'}
                  meta={fr ? 'Rôles indépendants : une personne peut en cumuler plusieurs' : 'Independent roles: one person can hold several'}
                />
                <KpiCards
                  items={[
                    {
                      icon: GraduationCap,
                      label: fr ? 'Formateurs potentiels' : 'Peer trainers',
                      value: roleCount('trainer'),
                      suffix: roleMismatchCount > 0
                        ? (fr ? `dont ${roleMismatchCount} à confirmer` : `${roleMismatchCount} to confirm`)
                        : (fr ? 'prêts à transmettre' : 'ready to mentor'),
                      chip: fr ? `${pctOfCohort(roleCount('trainer'))}% de la cohorte` : `${pctOfCohort(roleCount('trainer'))}% of cohort`,
                      tone: 'brand',
                    },
                    {
                      icon: Wrench,
                      label: 'Builders',
                      value: roleCount('builder'),
                      suffix: fr ? 'construisent des agents' : 'can build agents',
                      chip: fr ? `${pctOfCohort(roleCount('builder'))}% de la cohorte` : `${pctOfCohort(roleCount('builder'))}% of cohort`,
                      tone: 'brand',
                    },
                    {
                      icon: BadgeCheck,
                      label: 'Champions',
                      value: roleCount('champion'),
                      suffix: fr ? 'portent l’adoption' : 'drive adoption',
                      chip: fr ? `${pctOfCohort(roleCount('champion'))}% de la cohorte` : `${pctOfCohort(roleCount('champion'))}% of cohort`,
                      tone: 'green',
                    },
                    {
                      icon: Megaphone,
                      label: 'Sponsors',
                      value: roleCount('sponsor'),
                      suffix: fr ? 'portent le programme' : 'own the program',
                      chip: fr ? `${pctOfCohort(roleCount('sponsor'))}% de la cohorte` : `${pctOfCohort(roleCount('sponsor'))}% of cohort`,
                      tone: 'neutral',
                    },
                    {
                      icon: HelpCircle,
                      label: fr ? 'À convaincre' : 'Needs convincing',
                      value: profileCount('convince'),
                      suffix: fr ? 'hésitants ou sceptiques' : 'hesitant or skeptical',
                      chip: fr ? `${pctOfCohort(profileCount('convince'))}% de la cohorte` : `${pctOfCohort(profileCount('convince'))}% of cohort`,
                      tone: 'red',
                    },
                  ]}
                />

                <div className="grid gap-5 lg:grid-cols-12">
                  <SectionCard
                    className="flex flex-col lg:col-span-7"
                    title={fr ? 'Profils les plus avancés' : 'Top readiness profiles'}
                    description={fr ? 'Les relais internes à mobiliser' : 'Key internal leaders to mobilize'}
                    actions={<CardLink onClick={() => setActiveTab('participants')}>{fr ? `Voir les ${completedParticipants.length}` : `View all ${completedParticipants.length}`}</CardLink>}
                  >
                    <RankedList
                      rows={topPerformers.map(p => ({
                        id: p.id,
                        name: `${p.firstName} ${p.lastName}`,
                        meta: p.email,
                        badge: <span className={cn(PROFILE_BADGE[p.profile.id], 'hidden sm:inline-flex')}>{profileLabel(p.profile, language, t)}</span>,
                        score: p.score,
                        onClick: () => { setDrawerId(p.id); setActiveTab('participants'); },
                      }))}
                    />
                    <button
                      type="button"
                      onClick={() => setActiveTab('itemScores')}
                      className="mt-3 flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-lav-100 text-[13px] font-semibold text-foreground transition-colors duration-150 hover:bg-lav-200"
                    >
                      {fr ? 'Explorer la matrice des scores' : 'Explore score matrix'}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </SectionCard>
                  <SectionCard
                    className="lg:col-span-5"
                    title={fr ? 'Répartition des profils' : 'Cohort distribution'}
                    description={fr ? `Profil principal de chacun des ${completedParticipants.length} répondants` : `Main profile of each of the ${completedParticipants.length} respondents`}
                    actions={<span className="mono text-[12px] text-outline">N={completedParticipants.length}</span>}
                  >
                    <ProfileDistribution data={profileDistribution} totalParticipants={completedParticipants.length} />
                  </SectionCard>
                </div>

                {pendingParticipants.length > 0 && (
                  <PendingBanner
                    title={
                      fr
                        ? `${pendingParticipants.length} ${pendingParticipants.length > 1 ? 'personnes n’ont' : 'personne n’a'} pas encore répondu`
                        : `${pendingParticipants.length} ${pendingParticipants.length > 1 ? 'people have' : 'person has'} not responded`
                    }
                    description={fr ? `${inProgressCount} en cours · ${notStartedCount} pas commencés.` : `${inProgressCount} in progress · ${notStartedCount} not started.`}
                    actions={
                      <>
                        <Button variant="outline" onClick={() => setActiveTab('dataHealth')}>
                          {fr ? `Voir les ${pendingParticipants.length} en attente` : `View ${pendingParticipants.length} pending`}
                        </Button>
                        <Button onClick={() => setActiveTab('share')}>
                          <Send className="h-4 w-4" />
                          {fr ? 'Envoyer une relance' : 'Send reminder'}
                        </Button>
                      </>
                    }
                  />
                )}

                <OverviewBlockHeader
                  n={3}
                  title={fr ? 'Plan de déploiement' : 'Rollout plan'}
                  question={fr ? 'Que fait-on, et avec qui ?' : 'What do we do, and with whom?'}
                  meta={fr ? 'Déduit des blocs 1 et 2' : 'Derived from blocks 1 and 2'}
                />
                <div className="grid gap-5 lg:grid-cols-12">
                  <SectionCard
                    className="flex flex-col lg:col-span-7"
                    title={fr ? 'Prochaines étapes recommandées' : 'Recommended next steps'}
                    description={fr ? 'Déduites des thématiques les plus faibles et du point fort' : 'Derived from the weakest themes and the main strength'}
                    actions={<span className="pill pill-neutral">{nextSteps.length} {fr ? 'priorités' : 'priorities'}</span>}
                  >
                    <NextSteps steps={nextSteps} />
                    <div className="mt-3 flex justify-end">
                      <Button className="bg-ink hover:bg-ink/90" onClick={() => setActiveTab('actions')}>
                        {fr ? 'Voir les actions recommandées' : 'Open recommended actions'}
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </SectionCard>
                  <SectionCard
                    className="lg:col-span-5"
                    title={fr ? 'Qui fait quoi' : 'Who does what'}
                    description={fr ? 'Le rôle de chaque groupe dans le déploiement' : 'The role of each group in the rollout'}
                  >
                    <ul className="space-y-3">
                      {(['trainer', 'builder', 'champion', 'sponsor'] as RoleId[]).filter((r) => roleCount(r) > 0).map((r) => {
                        const cls = getResultClass(r);
                        return (
                          <li key={r} className="flex gap-3">
                            <span className={cn(PROFILE_BADGE[r], 'shrink-0 self-start tabular-nums')}>{roleCount(r)}</span>
                            <div className="min-w-0">
                              <p className="text-[13px] font-semibold text-foreground">{fr ? cls.name.fr : cls.name.en}</p>
                              <p className="text-[12px] leading-relaxed text-muted-foreground">{(fr ? cls.action.fr : cls.action.en).split('. ')[0].replace(/\.$/, '')}.</p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </SectionCard>
                </div>
                <OpenAnswersCard participants={participants} fr={fr} />
                <div className="grid gap-5 lg:grid-cols-12">
                  <SectionCard
                    className="lg:col-span-12"
                    title={fr ? "Signaux d'opportunité" : 'Opportunity signals'}
                    description={fr ? "Hors indice : un potentiel d'automatisation élevé est une bonne nouvelle" : 'Not in the index: a high automation opportunity is good news'}
                  >
                    <DimensionBars
                      animationKey="opportunity-bars"
                      rows={opportunityAverages.map(ta => ({ name: ta.thematic, score: ta.score, benchmark: hasBenchmark ? ta.benchmark : undefined }))}
                      vsLabel="vs"
                    />
                    <ul className="mt-4 space-y-2 border-t border-border pt-3">
                      {opportunityAverages.map(ta => (
                        <li key={ta.originalThematic} className="text-[12px] leading-relaxed text-muted-foreground">
                          <span className="font-medium text-foreground">{ta.thematic} :</span> {dimensionAction(ta.originalThematic)}
                        </li>
                      ))}
                    </ul>
                  </SectionCard>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'participants' && (
          <>
            {!hasParticipants ? (
              <EmptyDashboardState type="participants" />
            ) : (
              <div className="space-y-5">
                <KpiCards
                  items={[
                    {
                      icon: Users,
                      label: fr ? 'Membres inscrits' : 'Enrolled members',
                      value: participants.length,
                      suffix: fr ? 'au total' : 'total',
                      chip: fr ? `${completedParticipants.length} terminés · ${pendingParticipants.length} en attente` : `${completedParticipants.length} submitted · ${pendingParticipants.length} pending`,
                      tone: 'neutral',
                    },
                    {
                      icon: CheckCircle2,
                      label: fr ? 'Taux de complétion' : 'Completion rate',
                      value: `${completionRate}%`,
                      note: fr ? `${completedParticipants.length} sur ${participants.length}` : `${completedParticipants.length} of ${participants.length}`,
                      tone: 'green',
                    },
                    {
                      icon: Gauge,
                      label: fr ? 'Indice de préparation' : 'Readiness index',
                      value: averageScore,
                      suffix: '/ 100',
                      chip: fr ? `Médiane ${medianScore} · Max ${highScore}` : `Median ${medianScore} · High ${highScore}`,
                      tone: 'brand',
                    },
                    {
                      icon: GraduationCap,
                      label: fr ? 'Formateurs potentiels' : 'Peer trainers',
                      value: profileCount('trainer'),
                      suffix: fr ? 'identifiés' : 'identified',
                      chip: roleMismatchCount > 0
                        ? (fr ? `${roleMismatchCount} sans rôle déclaré` : `${roleMismatchCount} without declared role`)
                        : (fr ? `${pctOfCohort(profileCount('trainer'))}% de la cohorte` : `${pctOfCohort(profileCount('trainer'))}% of cohort`),
                      tone: roleMismatchCount > 0 ? 'amber' : 'brand',
                    },
                  ]}
                />

                <div className={cn('grid items-start gap-5', drawerParticipant && 'xl:grid-cols-[minmax(0,1fr)_400px]')}>
                  <ParticipantsTable
                    participants={participants}
                    selectedId={drawerId}
                    onSelect={(p) => setDrawerId(p.id === drawerId ? null : p.id)}
                  />
                  {drawerParticipant && (
                    <ParticipantDrawer
                      participant={drawerParticipant}
                      thematics={activeThematics}
                      translateThematic={translateThematic}
                      onClose={() => setDrawerId(null)}
                      onDelete={async () => {
                        // .select() returns the deleted row: an empty result means the database refused it.
                        const { data: deleted, error } = await supabase.from('participants').delete().eq('id', drawerParticipant.id).select('id');
                        if (error || !deleted?.length) {
                          toast.error(fr ? 'Suppression impossible' : 'Could not delete');
                          return;
                        }
                        toast.success(fr ? 'Réponses supprimées' : 'Answers deleted');
                        setDrawerId(null);
                        setRefreshKey((k) => k + 1);
                      }}
                    />
                  )}
                </div>

                <ProfileCardsLegend />
              </div>
            )}
          </>
        )}

        {activeTab === 'progress' && campaignAccess.companyName && (
          <ClientTimeline
            companyName={campaignAccess.companyName}
            points={timelinePoints}
            isLoading={timelineLoading}
            fr={fr}
            client={!isAdmin}
            onSaveWorkflows={isAdmin ? (id, workflows) => saveCampaignFollowup(id, { workflows }) : undefined}
            onSaveUsage={isAdmin ? (id, usage) => saveCampaignFollowup(id, { usage }) : undefined}
            onCreateCampaign={!isAdmin ? undefined : (wave) => {
              // Same audience as the last full survey (a pre-sales diagnostic is followed by the deployment survey).
              const last = [...timelinePoints].reverse().find((p) => p.audience !== 'presales');
              setCreatePreset({
                company: campaignAccess.companyName,
                name: waveLabel(wave, fr),
                audience: (last?.audience as SurveyAudience) || 'general',
                wave,
              });
              setCreateRequested(k => k + 1);
              setActiveTab('campaignSettings');
            }}
          />
        )}

        {activeTab === 'compare' && (
          <>
            {!hasParticipants ? (
              <EmptyDashboardState type="compare" />
            ) : (() => {
              const campaignDisplayName =
                (selectedCampaign as any)?.campaign_name ||
                selectedCampaign?.company_name ||
                campaignAccess.companyName;
              const campaignPillLabel = language === 'fr'
                ? `Moyenne ${campaignDisplayName}`
                : `${campaignDisplayName} average`;

              const campaignOptions = clientCampaigns.map(c => ({
                id: c.id,
                label: (c as any).campaign_name || c.company_name,
              }));

              const getScoreFor = (sel: CompareOption | undefined, thematic: string): number | undefined => {
                if (!sel) return undefined;
                if (sel.type === 'participants') {
                  const participant = participants.find(p => p.id === sel.id);
                  return participant?.thematicScores[thematic] || 0;
                }
                if (sel.type === 'campaigns') {
                  const camp = clientCampaigns.find(c => c.id === sel.id);
                  return camp?.thematicScores[thematic] ?? 0;
                }
                return Math.round(35 + (thematic.charCodeAt(0) % 30));
              };

              return (
                <CompareView
                  selector={
                    <CompareSelector
                      participants={participants.filter(p => p.status === 'completed').map(p => ({
                        id: p.id,
                        firstName: p.firstName,
                        lastName: p.lastName,
                      }))}
                      clientCampaigns={campaignOptions}
                      selectedOptions={compareSelections}
                      onSelect={setCompareSelections}
                      showAverage={showCampaignAverage}
                      onToggleAverage={setShowCampaignAverage}
                      averagePillLabel={campaignPillLabel}
                    />
                  }
                  dimensions={activeThematics.map(thematic => ({
                    key: thematic,
                    name: translateThematic(thematic),
                    cohort: thematicAverages.find(ta => ta.originalThematic === thematic)?.score || 0,
                    benchmark: hasBenchmark ? globalBenchmark.thematicScores[thematic] ?? undefined : undefined,
                    values: compareSelections.map(sel => getScoreFor(sel, thematic) ?? 0),
                  }))}
                  cohortLabel={campaignPillLabel}
                  showCohort={showCampaignAverage}
                  series={compareSelections.map(sel => ({ id: `${sel.type}-${sel.id}`, label: sel.label }))}
                  radar={<ThematicRadar data={thematicAverages} showBenchmark />}
                  radarTitle={t('dashboard.nationalComparison')}
                  radarDescription={t('dashboard.teamVsAverage')}
                />
              );
            })()}
          </>
        )}

        {activeTab === 'actions' && (
          <div className="space-y-5">
            {hasParticipants && (
              <DeploymentPlan
                participants={participants}
                dimensions={readinessAverages.map(ta => ({ id: ta.originalThematic, name: ta.thematic, score: ta.score }))}
                onSelectParticipant={(id) => { setDrawerId(id); setActiveTab('participants'); }}
              />
            )}
            {hasParticipants && !isClientView && (
              <PartnerServices participants={participants} companyName={campaignAccess.companyName} fr={fr} />
            )}
          </div>
        )}

        {activeTab === 'signIns' && !isClientView && <SignInLog fr={fr} />}

        {activeTab === 'openAnswers' && (
          <div className="space-y-5">
            <OpenAnswersCard participants={participants} fr={fr} showEmpty />
            <CustomQuestionsCard participants={participants} fr={fr} />
          </div>
        )}

        {activeTab === 'detailed' && (
          <DetailedScoresTab participants={participants} />
        )}

        {activeTab === 'itemScores' && (
          <ItemScoresMatrix
            participants={participants}
            companyName={campaignAccess.companyName}
            onSelectParticipant={(id) => { setDrawerId(id); setActiveTab('participants'); }}
          />
        )}

        {(activeTab === 'share' || activeTab === 'campaignSettings' || activeTab === 'access' || activeTab === 'dataHealth') && (
          <SettingsTab
            campaignId={campaignAccess.campaignId}
            campaignCode={campaignAccess.campaignCode || selectedCampaign?.code}
            companyName={campaignAccess.companyName}
            isAdmin={isAdmin}
            campaignParticipants={participants}
            averageScore={averageScore}
            thematicAverages={thematicAverages}
            view={activeTab}
            allCampaigns={allCampaigns}
            creatorEmail={campaignAccess.creatorEmail}
            onSelectCampaign={handleCampaignSelect}
            onNavigate={setActiveTab}
            openCreate={createRequested > 0}
            createPreset={createPreset}
            onCampaignDeleted={isAdmin ? handleCampaignDeleted : undefined}
            onCampaignCreated={isAdmin ? handleCampaignCreated : undefined}
            key={activeTab === 'campaignSettings' ? `settings-${createRequested}` : activeTab}
          />
        )}

        {activeTab === 'share' && isAdmin && campaignAccess.campaignId && !isGlobalCampaignId(campaignAccess.campaignId) && (
          <div className="mt-5">
            <ImportResponses
              campaignId={campaignAccess.campaignId}
              companyName={campaignAccess.companyName}
              fr={fr}
              onImported={() => setRefreshKey((k) => k + 1)}
            />
          </div>
        )}

        {/* Download Options Modal */}
        <DownloadOptionsModal
          isOpen={isDownloadModalOpen}
          onClose={() => setIsDownloadModalOpen(false)}
          participants={participants}
          companyName={campaignAccess.companyName}
          averageScore={averageScore}
          thematicAverages={thematicAverages}
          summary={summary}
        />
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
