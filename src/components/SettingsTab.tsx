import { useState, useEffect, useRef, useMemo } from 'react';
import { Loader2, Users, Clock, CheckCircle2, CircleDashed, Copy, Check, Mail, Trash2, Plus, Info, Upload, Search, Link2, ExternalLink, KeyRound, Timer, Save, MessageSquare, ArrowRight, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AUDIENCES, AUDIENCE_PARAM, type SurveyAudience } from '@/lib/assessment-v2';
import { SectionCard } from '@/components/console/SectionCard';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdminDownloadBar } from '@/components/AdminDownloadBar';
import { DeleteParticipantDialog } from '@/components/DeleteParticipantDialog';
import { CampaignParticipant } from '@/hooks/useCampaignParticipants';
import { AdminCampaignCreator } from '@/components/AdminCampaignCreator';
import type { Campaign } from '@/components/CampaignSelector';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { validateProfessionalEmail } from '@/lib/email-validation';
import { isGlobalCampaignId, GLOBAL_CAMPAIGN_PREFIX } from '@/lib/global-campaign';

type Participant = Tables<'participants'>;
type MemberRole = 'participant' | 'manager' | 'consultant' | 'admin';

interface SettingsTabProps {
  campaignId: string;
  campaignCode?: string;
  companyName?: string;
  isAdmin?: boolean;
  campaignParticipants?: CampaignParticipant[];
  averageScore?: number;
  thematicAverages?: { thematic: string; originalThematic: string; score: number }[];
  view: 'share' | 'campaignSettings' | 'access' | 'dataHealth';
  allCampaigns?: Campaign[];
  creatorEmail?: string;
  onSelectCampaign?: (campaign: Campaign) => void;
  /** Navigate to another console screen (e.g. from Share to Data health). */
  onNavigate?: (tab: 'dataHealth') => void;
  /** Open the “create a link” dialog on mount (sidebar “New campaign”). */
  openCreate?: boolean;
}

export const SettingsTab = ({ campaignId, campaignCode, companyName, isAdmin, campaignParticipants, averageScore, thematicAverages, view, allCampaigns = [], creatorEmail, onSelectCampaign, onNavigate, openCreate }: SettingsTabProps) => {
  const { language } = useLanguage();
  const [shareAudience, setShareAudience] = useState<SurveyAudience>('general');
  const { toast } = useToast();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [members, setMembers] = useState<{ id: string; email: string; role: MemberRole }[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Participant | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(!!openCreate);
  const [newMember, setNewMember] = useState<{ firstName: string; lastName: string; email: string; role: MemberRole }>({ firstName: '', lastName: '', email: '', role: 'manager' });
  const [addingMember, setAddingMember] = useState(false);
  const [campaignLanguage, setCampaignLanguage] = useState<'fr' | 'en'>('en');
  const [savingLanguage, setSavingLanguage] = useState(false);

  const [importing, setImporting] = useState(false);
  const csvFileRef = useRef<HTMLInputElement>(null);
  const [campaignCounts, setCampaignCounts] = useState<Record<string, { total: number; completed: number }>>({});
  const [participantSearch, setParticipantSearch] = useState('');
  const [participantCampaignFilter, setParticipantCampaignFilter] = useState<string>('all');
  const [colFilters, setColFilters] = useState<{ firstName: string; lastName: string; email: string; campaign: string; status: string; role: string }>({
    firstName: '', lastName: '', email: '', campaign: '', status: 'all', role: 'all',
  });
  const [dateSort, setDateSort] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (!campaignId) return;
    (async () => {
      const { data } = await supabase
        .from('campaigns')
        .select('language')
        .eq('id', campaignId)
        .maybeSingle();
      const lang = ((data as any)?.language as 'fr' | 'en') || 'en';
      setCampaignLanguage(lang);
    })();
  }, [campaignId]);

  const handleChangeCampaignLanguage = async (newLang: 'fr' | 'en') => {
    setSavingLanguage(true);
    const { error } = await supabase.from('campaigns').update({ language: newLang } as any).eq('id', campaignId);
    setSavingLanguage(false);
    if (error) {
      toast({ title: language === 'fr' ? 'Erreur' : 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    setCampaignLanguage(newLang);
    toast({ title: language === 'fr' ? 'Langue mise à jour' : 'Language updated' });
  };

  const handleAddMember = async () => {
    const firstName = newMember.firstName.trim();
    const lastName = newMember.lastName.trim();
    const email = newMember.email.trim().toLowerCase();
    if (!firstName || !lastName || !email) {
      toast({ title: language === 'fr' ? 'Erreur' : 'Error', description: language === 'fr' ? 'Prénom, nom et email requis' : 'First name, last name and email required', variant: 'destructive' });
      return;
    }
    const v = validateProfessionalEmail(email);
    if (!v.valid) {
      toast({ title: language === 'fr' ? 'Email invalide' : 'Invalid email', description: v.message, variant: 'destructive' });
      return;
    }
    if (participants.some((p) => p.email.toLowerCase() === email)) {
      toast({ title: language === 'fr' ? 'Déjà ajouté' : 'Already added', description: email, variant: 'destructive' });
      return;
    }
    setAddingMember(true);
    try {
      const { error: pErr } = await supabase.from('participants').insert({
        campaign_id: campaignId,
        first_name: firstName,
        last_name: lastName,
        email,
        company_name: companyName ?? '',
      });
      if (pErr) throw pErr;
      const { error: mErr } = await supabase.from('campaign_members').insert({ campaign_id: campaignId, email, role: newMember.role });
      if (mErr) console.error('member insert error:', mErr);
      toast({ title: language === 'fr' ? 'Membre ajouté' : 'Member added', description: `${firstName} ${lastName}` });
      setNewMember({ firstName: '', lastName: '', email: '', role: 'manager' });
      fetchParticipants();
      fetchMembers();
    } catch (err: any) {
      toast({ title: language === 'fr' ? 'Erreur' : 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setAddingMember(false);
    }
  };

  const resolveTargetCampaignIds = async (): Promise<string[]> => {
    if (!campaignId) return [];
    if (!isGlobalCampaignId(campaignId)) return [campaignId];
    const companySlug = campaignId.slice(GLOBAL_CAMPAIGN_PREFIX.length);
    const { data } = await supabase.from('campaigns').select('id, company_name');
    return (data || [])
      .filter((r: any) => (r.company_name || '').trim().toLowerCase() === companySlug)
      .map((r: any) => r.id);
  };

  const fetchParticipants = async () => {
    setLoading(true);
    const ids = await resolveTargetCampaignIds();
    if (ids.length === 0) {
      setParticipants([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .in('campaign_id', ids)
      .order('created_at', { ascending: false });

    if (error) console.error('Error loading participants:', error);
    else setParticipants(data || []);
    setLoading(false);
  };

  const fetchMembers = async () => {
    const ids = await resolveTargetCampaignIds();
    if (ids.length === 0) { setMembers([]); return; }
    const { data } = await supabase
      .from('campaign_members')
      .select('id, email, role')
      .in('campaign_id', ids);
    setMembers((data as any) ?? []);
  };

  useEffect(() => {
    if (!campaignId) return;
    fetchParticipants();
    fetchMembers();

    const isGlobal = isGlobalCampaignId(campaignId);
    const channel = supabase
      .channel(`settings-participants-${campaignId}`)
      .on('postgres_changes',
        isGlobal
          ? { event: '*', schema: 'public', table: 'participants' }
          : { event: '*', schema: 'public', table: 'participants', filter: `campaign_id=eq.${campaignId}` },
        () => fetchParticipants())
      .on('postgres_changes',
        isGlobal
          ? { event: '*', schema: 'public', table: 'campaign_members' }
          : { event: '*', schema: 'public', table: 'campaign_members', filter: `campaign_id=eq.${campaignId}` },
        () => fetchMembers())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [campaignId]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="pill pill-green">{language === 'fr' ? 'Test terminé' : 'Test completed'}</span>;
      case 'in_progress':
        return <span className="pill pill-amber">{language === 'fr' ? 'Pas terminé' : 'Not finished'}</span>;
      default:
        return <span className="pill pill-neutral">{language === 'fr' ? 'Pas commencé' : 'Not started'}</span>;
    }
  };

  const adminEmails = useMemo(
    () => new Set(members.filter((m: any) => m.role === 'admin').map((m: any) => (m.email || '').toLowerCase())),
    [members]
  );
  const nonAdminParticipants = useMemo(
    () => participants.filter((p) => !adminEmails.has((p.email || '').toLowerCase())),
    [participants, adminEmails]
  );
  const completedCount = nonAdminParticipants.filter(p => p.status === 'completed').length;
  const inProgressCount = nonAdminParticipants.filter(p => p.status === 'in_progress').length;
  const notStartedCount = nonAdminParticipants.length - completedCount - inProgressCount;

  const campaignsById = useMemo(() => {
    const map = new Map<string, Campaign>();
    (allCampaigns || []).forEach((c) => map.set(c.id, c));
    return map;
  }, [allCampaigns]);

  const participantCampaignOptions = useMemo(() => {
    const ids = new Set<string>();
    nonAdminParticipants.forEach((p) => { if (p.campaign_id) ids.add(p.campaign_id); });
    return Array.from(ids)
      .map((id) => campaignsById.get(id))
      .filter((c): c is Campaign => !!c)
      .sort((a, b) => (a.campaign_name || a.company_name).localeCompare(b.campaign_name || b.company_name));
  }, [nonAdminParticipants, campaignsById]);

  const filteredParticipants = useMemo(() => {
    const q = participantSearch.trim().toLowerCase();
    const cf = colFilters;
    const fnQ = cf.firstName.trim().toLowerCase();
    const lnQ = cf.lastName.trim().toLowerCase();
    const emQ = cf.email.trim().toLowerCase();
    const caQ = cf.campaign.trim().toLowerCase();

    let result = nonAdminParticipants.filter((p) => {
      if (participantCampaignFilter !== 'all' && p.campaign_id !== participantCampaignFilter) return false;
      const campaign = p.campaign_id ? campaignsById.get(p.campaign_id) : undefined;

      if (fnQ && !(p.first_name || '').toLowerCase().includes(fnQ)) return false;
      if (lnQ && !(p.last_name || '').toLowerCase().includes(lnQ)) return false;
      if (emQ && !(p.email || '').toLowerCase().includes(emQ)) return false;
      if (caQ) {
        const ch = [campaign?.campaign_name, campaign?.company_name, campaign?.code].filter(Boolean).join(' ').toLowerCase();
        if (!ch.includes(caQ)) return false;
      }
      if (cf.status !== 'all' && p.status !== cf.status) return false;
      if (cf.role !== 'all') {
        const member = members.find((m) => m.email.toLowerCase() === (p.email || '').toLowerCase());
        const role = (member?.role as MemberRole) || 'participant';
        if (role !== cf.role) return false;
      }

      if (!q) return true;
      const haystack = [
        p.first_name, p.last_name, p.email,
        campaign?.campaign_name, campaign?.company_name, campaign?.code,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });

    result.sort((a, b) => {
      const da = new Date(a.completed_at || a.started_at || 0).getTime();
      const db = new Date(b.completed_at || b.started_at || 0).getTime();
      return dateSort === 'asc' ? da - db : db - da;
    });

    return result;
  }, [nonAdminParticipants, participantSearch, participantCampaignFilter, campaignsById, colFilters, members, dateSort]);

  const handleCopyCode = () => {
    if (!campaignCode) return;
    navigator.clipboard.writeText(campaignCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: language === 'fr' ? 'Code copié !' : 'Code copied!', description: campaignCode });
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !campaignId) return;
    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) throw new Error(language === 'fr' ? 'Fichier vide' : 'Empty file');
      const rows = lines.slice(1).map(l => l.split(',').map(c => c.trim()));
      const existing = new Set(participants.map(p => p.email.toLowerCase()));
      let added = 0, skipped = 0;
      for (const [firstName, lastName, email, statusRole] of rows) {
        if (!email) continue;
        const em = email.toLowerCase();
        if (existing.has(em)) { skipped++; continue; }
        const role = (['participant','manager','consultant','admin'].includes((statusRole || '').toLowerCase()) ? (statusRole as string).toLowerCase() : 'participant') as MemberRole;
        const { error: pErr } = await supabase.from('participants').insert({
          campaign_id: campaignId,
          first_name: firstName || '',
          last_name: lastName || '',
          email: em,
          company_name: companyName ?? '',
        });
        if (pErr) continue;
        await supabase.from('campaign_members').insert({ campaign_id: campaignId, email: em, role });
        added++;
      }
      toast({ title: language === 'fr' ? 'Import terminé' : 'Import complete', description: `${added} ${language === 'fr' ? 'ajoutés' : 'added'} · ${skipped} ${language === 'fr' ? 'ignorés (déjà présents)' : 'skipped (existing)'}` });
      fetchParticipants();
      fetchMembers();
    } catch (err: any) {
      toast({ title: language === 'fr' ? 'Erreur' : 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setImporting(false);
      if (csvFileRef.current) csvFileRef.current.value = '';
    }
  };

  const getEmailTemplate = () => {
    // Email language follows the current UI language so admins see the invite in the language they're viewing.
    const emailLang = language;
    const link = `${window.location.origin}/assessment?lang=${emailLang}&code=${campaignCode || 'XXXXXXXX'}${AUDIENCE_PARAM[shareAudience] ? `&for=${AUDIENCE_PARAM[shareAudience]}` : ''}`;
    if (emailLang === 'fr') {
      return `Bonjour,\n\nJe vous invite à participer à notre évaluation de maturité IA.\n\n🔗 Cliquez sur ce lien pour démarrer directement en français : ${link}\n📝 (Au besoin, code à saisir : ${campaignCode || 'XXXXXXXX'})\n\nCe test prend environ 8 minutes et nous permettra d'évaluer ensemble votre niveau de maîtrise des outils d'intelligence artificielle.\n\nMerci de votre participation !`;
    }
    return `Hello,\n\nI invite you to participate in our AI maturity assessment.\n\n🔗 Click this link to start directly in English: ${link}\n📝 (If needed, code to enter: ${campaignCode || 'XXXXXXXX'})\n\nThis test takes about 8 minutes and will help us assess your level of AI tool proficiency.\n\nThank you for your participation!`;
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(getEmailTemplate());
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
    toast({
      title: language === 'fr' ? 'Email copié !' : 'Email copied!',
      description: language === 'fr' ? "Le modèle d'email a été copié dans le presse-papier." : 'Email template has been copied to clipboard.',
    });
  };

  const handleDeleteParticipant = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const { error } = await supabase.from('participants').delete().eq('id', deleteTarget.id);
    if (error) {
      toast({ title: language === 'fr' ? 'Erreur' : 'Error', description: language === 'fr' ? 'Impossible de supprimer ce participant.' : 'Could not delete this participant.', variant: 'destructive' });
    } else {
      toast({ title: language === 'fr' ? 'Supprimé !' : 'Deleted!', description: `${deleteTarget.first_name} ${deleteTarget.last_name}` });
      fetchParticipants();
    }
    setIsDeleting(false);
    setDeleteTarget(null);
  };

  // Resolve role for a participant by email lookup in campaign_members
  const getMemberFor = (email: string) =>
    members.find((m) => m.email.toLowerCase() === email.toLowerCase());

  const handleChangeParticipantRole = async (email: string, newRole: MemberRole) => {
    const existing = getMemberFor(email);
    if (existing) {
      const { error } = await supabase.from('campaign_members').update({ role: newRole }).eq('id', existing.id);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    } else {
      const { error } = await supabase.from('campaign_members').insert({ campaign_id: campaignId, email: email.toLowerCase(), role: newRole });
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    }
    toast({ title: language === 'fr' ? 'Rôle mis à jour' : 'Role updated' });
    fetchMembers();
  };

  const roleBadgeClass = (r: MemberRole) =>
    r === 'admin'
      ? 'bg-brand-soft text-accent-foreground'
      : r === 'manager'
      ? 'bg-note-soft text-note-ink'
      : r === 'consultant'
      ? 'bg-muted text-foreground'
      : 'bg-muted text-muted-foreground';

  // ===== Shared building blocks =====
  const fr = language === 'fr';
  const companyShort = (companyName ?? '').split(' — ')[0];
  const audienceSuffix = AUDIENCE_PARAM[shareAudience] ? `&for=${AUDIENCE_PARAM[shareAudience]}` : '';
  const shareLink = `${window.location.origin}/assessment?lang=${language}&code=${campaignCode || 'XXXXXXXX'}${audienceSuffix}`;
  const pendingParticipants = nonAdminParticipants.filter((p) => p.status !== 'completed');
  const pendingCount = pendingParticipants.length;
  const completionRate = nonAdminParticipants.length > 0 ? Math.round((completedCount / nonAdminParticipants.length) * 100) : 0;

  const getChatTemplate = () => {
    const company = companyShort || (fr ? 'votre équipe' : 'your team');
    const code = campaignCode || 'XXXXXXXX';
    return fr
      ? `Bonjour à tous,\n\nNous lançons l'évaluation de maturité IA de ${company}. Le questionnaire prend environ 8 minutes et vos réponses sont enregistrées au fil de l'eau.\n\nLien : ${shareLink}\nCode (si demandé) : ${code}\n\nMerci de votre participation !`
      : `Hi everyone,\n\nWe're launching the AI maturity assessment for ${company}. The questionnaire takes about 8 minutes and your answers are saved as you go.\n\nLink: ${shareLink}\nCode (if asked): ${code}\n\nThank you for taking part!`;
  };

  const copyText = async (text: string, title: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title });
    } catch {
      toast({ title: fr ? 'Erreur de copie' : 'Copy failed', variant: 'destructive' });
    }
  };

  const renderStatusStrip = () => (
    <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-border bg-card shadow-sm md:grid-cols-4">
      {[
        { label: fr ? 'Total participants' : 'Total participants', value: nonAdminParticipants.length, icon: Users, tone: 'text-muted-foreground' },
        { label: fr ? 'Tests terminés' : 'Tests completed', value: completedCount, icon: CheckCircle2, tone: 'text-ok' },
        { label: fr ? 'En cours' : 'In progress', value: inProgressCount, icon: Clock, tone: 'text-warn-ink' },
        { label: fr ? 'Pas commencés' : 'Not started', value: notStartedCount, icon: CircleDashed, tone: 'text-muted-foreground' },
      ].map((kpi, i) => {
        const Icon = kpi.icon;
        return (
          <div
            key={kpi.label}
            className={cn(
              'flex items-center gap-3 px-5 py-3.5',
              i % 2 === 1 && 'border-l border-border',
              i >= 2 && 'border-t border-border md:border-t-0',
              i === 2 && 'md:border-l'
            )}
          >
            <Icon className={cn('h-4 w-4 shrink-0', kpi.tone)} />
            <div className="min-w-0">
              <p className="text-[20px] font-semibold leading-tight tabular-nums text-foreground">{kpi.value}</p>
              <p className="truncate text-[12px] text-muted-foreground">{kpi.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderCreateCampaignDialog = () => (
    <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
      <DialogTrigger asChild>
        <Button className="gap-1.5">
          <Plus className="w-4 h-4" />
          {fr ? 'Créer une campagne' : 'Create a campaign'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{fr ? 'Créer un lien d’évaluation' : 'Create an assessment link'}</DialogTitle>
        </DialogHeader>
        <AdminCampaignCreator
          defaultCreatorEmail={creatorEmail}
          onCreated={() => setCreateDialogOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );

  // ===== Share & invite =====
  const renderShare = () => (
    <div className="space-y-4">
      {/* 1. The link to share: primary element of the page */}
      <SectionCard
        title={fr ? 'Lien du questionnaire' : 'Assessment link'}
        description={fr ? 'Le lien à envoyer aux répondants. Le code de campagne est déjà inclus.' : 'The link to send to respondents. The campaign code is already included.'}
      >
        <div role="radiogroup" aria-label={fr ? 'Équipe visée' : 'Target team'} className="mb-3 flex flex-wrap items-center gap-2">
          {(['general', 'sales', 'success'] as SurveyAudience[]).map((a) => (
            <button
              key={a}
              type="button"
              role="radio"
              aria-checked={shareAudience === a}
              onClick={() => setShareAudience(a)}
              className={cn(
                'rounded-full px-3 py-1.5 text-[13px] font-medium ring-1 transition-colors duration-150',
                shareAudience === a ? 'bg-ink text-white ring-ink' : 'bg-card text-foreground ring-border hover:bg-paper'
              )}
            >
              {fr ? AUDIENCES[a].label.fr : AUDIENCES[a].label.en}
            </button>
          ))}
          <span className="text-[12px] text-muted-foreground">
            {fr ? 'Un lien par équipe, avec son propre en-tête. Toutes les réponses arrivent ici.' : 'One link per team, each with its own header. All answers land here.'}
          </span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input readOnly value={shareLink} onFocus={(e) => e.currentTarget.select()} className="font-mono text-[12px]" aria-label={fr ? 'Lien du questionnaire' : 'Assessment link'} />
          <div className="flex gap-2">
            <Button
              className="flex-1 gap-1.5 sm:flex-none"
              onClick={async () => {
                await copyText(shareLink, fr ? 'Lien copié' : 'Link copied');
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              disabled={!campaignCode}
            >
              {copied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
              {copied ? (fr ? 'Copié' : 'Copied') : (fr ? 'Copier le lien' : 'Copy link')}
            </Button>
            <Button variant="outline" className="flex-1 gap-1.5 sm:flex-none" asChild>
              <a href={shareLink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4" />
                {fr ? 'Ouvrir' : 'Open'}
              </a>
            </Button>
          </div>
        </div>
        <dl className="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-3">
          {[
            {
              icon: KeyRound,
              term: fr ? 'Accès' : 'Access',
              desc: fr
                ? `Le répondant ouvre le lien et saisit prénom, nom et email professionnel. Code : ${campaignCode || '—'}.`
                : `The respondent opens the link and enters first name, last name and work email. Code: ${campaignCode || '—'}.`,
            },
            {
              icon: Timer,
              term: fr ? 'Durée' : 'Duration',
              desc: fr ? 'Environ 8 minutes, une thématique à la fois.' : 'About 8 minutes, one theme at a time.',
            },
            {
              icon: Save,
              term: fr ? 'Enregistrement' : 'Saving',
              desc: fr
                ? 'Sauvegarde automatique à chaque thématique terminée. Reprise possible avec le même email.'
                : 'Saved automatically after each completed theme. Can be resumed with the same email.',
            },
          ].map(({ icon: Icon, term, desc }) => (
            <div key={term} className="flex gap-2.5">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <dt className="text-[13px] font-medium text-foreground">{term}</dt>
                <dd className="text-[12px] leading-snug text-muted-foreground">{desc}</dd>
              </div>
            </div>
          ))}
        </dl>
      </SectionCard>

      {/* Kit for the client champion: one-pager to send before the links */}
      <SectionCard
        title={fr ? 'Kit pour le champion côté client' : 'Kit for the client champion'}
        description={fr
          ? 'Un one-pager à envoyer au contact client avant les liens : ce qu’est le questionnaire, pourquoi, ce qu’on attend, ce qu’il obtient, et les liens par équipe. Imprimable en PDF.'
          : 'A one-pager to send to the client contact before the links: what the survey is, why, what we need, what they get back, and the links per team. Prints to PDF.'}
      >
        <div className="flex flex-wrap gap-2">
          {([
            ['deployment', fr ? 'Version Deployment / CS (kickoff)' : 'Deployment / CS version (kickoff)'],
            ['sales', fr ? 'Version Sales (avant le déploiement)' : 'Sales version (before the rollout)'],
          ] as const).map(([v, label]) => (
            <Button key={v} variant="outline" asChild>
              <a
                href={`/kit?variant=${v}&code=${encodeURIComponent(campaignCode || '')}&company=${encodeURIComponent(companyShort || '')}&lang=${language}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FileText className="h-4 w-4" />
                {label}
              </a>
            </Button>
          ))}
        </div>
      </SectionCard>

      {/* 2. Who has / hasn't answered */}
      {pendingCount > 0 && (
        <div className="banner" style={{ ['--banner-accent' as string]: 'var(--amber)' }}>
          <Clock className="h-4 w-4 shrink-0 text-warn-ink" />
          <p className="min-w-0 flex-1 text-[13px] text-foreground">
            <span className="font-semibold tabular-nums">{pendingCount}</span>{' '}
            {fr
              ? `${pendingCount > 1 ? 'personnes n’ont' : 'personne n’a'} pas encore terminé le questionnaire.`
              : `${pendingCount > 1 ? 'people have' : 'person has'} not finished the assessment yet.`}
          </p>
          <Button size="sm" className="gap-1.5" onClick={() => copyText(getChatTemplate(), fr ? 'Relance copiée' : 'Reminder copied')}>
            <Copy className="h-3.5 w-3.5" />
            {fr ? 'Copier une relance' : 'Copy a reminder'}
          </Button>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-5">
        {/* 3. Ready-to-paste messages */}
        <SectionCard
          className="xl:col-span-3"
          title={fr ? 'Message prêt à envoyer' : 'Ready-to-send message'}
          description={fr ? 'Lien, code et nom de la campagne sont insérés automatiquement.' : 'Link, code and campaign name are filled in automatically.'}
        >
          <Tabs defaultValue="email">
            <TabsList>
              <TabsTrigger value="email"><Mail className="h-3.5 w-3.5" /> Email</TabsTrigger>
              <TabsTrigger value="chat"><MessageSquare className="h-3.5 w-3.5" /> Slack / Teams</TabsTrigger>
            </TabsList>
            <TabsContent value="email" className="mt-3 space-y-3">
              <pre className="max-h-[260px] overflow-auto whitespace-pre-wrap rounded-md border border-border bg-paper p-3 font-sans text-[13px] leading-relaxed text-foreground">{getEmailTemplate()}</pre>
              <Button onClick={handleCopyEmail} className="gap-1.5">
                {copiedEmail ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedEmail ? (fr ? 'Copié !' : 'Copied!') : (fr ? "Copier l'email" : 'Copy email')}
              </Button>
            </TabsContent>
            <TabsContent value="chat" className="mt-3 space-y-3">
              <pre className="max-h-[260px] overflow-auto whitespace-pre-wrap rounded-md border border-border bg-paper p-3 font-sans text-[13px] leading-relaxed text-foreground">{getChatTemplate()}</pre>
              <Button onClick={() => copyText(getChatTemplate(), fr ? 'Message copié' : 'Message copied')} className="gap-1.5">
                <Copy className="w-4 h-4" />
                {fr ? 'Copier le message' : 'Copy message'}
              </Button>
            </TabsContent>
          </Tabs>
        </SectionCard>

        {/* 4. Response status */}
        <SectionCard
          className="xl:col-span-2"
          flush
          title={fr ? 'Réponses' : 'Responses'}
          description={
            <span className="tabular-nums">
              {completedCount}/{nonAdminParticipants.length} {fr ? 'terminés' : 'completed'} · {completionRate}%
            </span>
          }
          actions={
            onNavigate && (
              <Button variant="ghost" size="sm" className="h-7 gap-1 px-2" onClick={() => onNavigate('dataHealth')}>
                {fr ? 'Suivi complet' : 'Full tracking'}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )
          }
        >
          <div className="px-5 pt-3">
            <div className="flex h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
              <div className="bg-ok" style={{ width: `${completionRate}%` }} />
              <div className="bg-warn" style={{ width: `${nonAdminParticipants.length ? (inProgressCount / nonAdminParticipants.length) * 100 : 0}%` }} />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-muted-foreground tabular-nums">
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-ok" />{completedCount} {fr ? 'terminés' : 'completed'}</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-warn" />{inProgressCount} {fr ? 'en cours' : 'in progress'}</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-muted-foreground/40" />{notStartedCount} {fr ? 'pas commencés' : 'not started'}</span>
            </div>
          </div>
          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : pendingParticipants.length === 0 ? (
            <p className="px-5 py-6 text-center text-[13px] text-muted-foreground">
              {nonAdminParticipants.length === 0
                ? (fr ? "Aucun participant pour l'instant." : 'No participants yet.')
                : (fr ? 'Tout le monde a répondu.' : 'Everyone has responded.')}
            </p>
          ) : (
            <>
              <p className="eyebrow px-5 pb-1 pt-4">{fr ? 'En attente de réponse' : 'Awaiting response'}</p>
              <ul className="divide-y divide-border">
                {pendingParticipants.slice(0, 8).map((p) => (
                  <li key={p.id} className="flex min-h-[44px] items-center gap-3 px-5 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-foreground">{p.first_name} {p.last_name}</p>
                      <p className="truncate text-[12px] text-muted-foreground">{p.email}</p>
                    </div>
                    {getStatusBadge(p.status)}
                  </li>
                ))}
              </ul>
              {pendingParticipants.length > 8 && (
                <p className="border-t border-border px-5 py-2 text-[12px] text-muted-foreground">
                  + {pendingParticipants.length - 8} {fr ? 'autres' : 'more'}
                </p>
              )}
            </>
          )}
        </SectionCard>
      </div>
    </div>
  );

  // ===== Campaign settings =====
  const renderCampaignSettings = () => (
    <div className="space-y-4">
      <SectionCard
        title={fr ? 'Langue de la campagne' : 'Campaign language'}
        description={fr ? 'Affichage par défaut pour les participants et le dashboard.' : 'Default display for participants and the dashboard.'}
        actions={
          <div className="inline-flex rounded-md border border-border bg-muted p-0.5" role="radiogroup">
            {(['fr', 'en'] as const).map((lng) => {
              const selected = campaignLanguage === lng;
              return (
                <button
                  key={lng}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={savingLanguage}
                  onClick={() => handleChangeCampaignLanguage(lng)}
                  className={cn(
                    'h-8 rounded-sm px-3 text-[13px] font-medium transition-colors duration-150',
                    selected ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {lng === 'fr' ? 'Français' : 'English'}
                </button>
              );
            })}
          </div>
        }
      />

      {isAdmin && (
        <SectionCard
          flush
          title={fr ? 'Campagnes de votre entreprise' : 'Your company campaigns'}
          description={`${companyShort} · ${companyCampaigns.length} ${fr ? 'campagne(s)' : 'campaign(s)'}`}
          actions={renderCreateCampaignDialog()}
        >
          {companyCampaigns.length === 0 ? (
            <div className="p-8 text-center text-[13px] text-muted-foreground">
              {fr ? 'Aucune campagne pour cette entreprise.' : 'No campaign for this company yet.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">{fr ? 'Campagne' : 'Campaign'}</TableHead>
                  <TableHead className="hidden sm:table-cell">{fr ? 'Créateur' : 'Creator'}</TableHead>
                  <TableHead className="text-right">{fr ? 'Participants' : 'Participants'}</TableHead>
                  <TableHead className="w-28 pr-5 text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companyCampaigns.map((c) => {
                  const counts = campaignCounts[c.id] || { total: 0, completed: 0 };
                  const isCurrent = c.id === campaignId;
                  return (
                    <TableRow key={c.id} className={isCurrent ? 'bg-brand-soft hover:bg-brand-soft' : ''}>
                      <TableCell className="pl-5 font-medium">{(c as any).campaign_name || c.company_name}</TableCell>
                      <TableCell className="hidden text-[12px] text-muted-foreground sm:table-cell">{c.creator_email}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {counts.completed}<span className="text-muted-foreground"> / {counts.total}</span>
                      </TableCell>
                      <TableCell className="pr-5 text-right">
                        {onSelectCampaign && !isCurrent && (
                          <Button size="sm" variant="outline" className="h-7" onClick={() => onSelectCampaign(c)}>
                            {fr ? 'Ouvrir' : 'Open'}
                          </Button>
                        )}
                        {isCurrent && <span className="pill pill-brand">{fr ? 'Active' : 'Active'}</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </SectionCard>
      )}
    </div>
  );

  // ===== Access & codes =====
  const renderAccess = () => {
    const rows = (() => {
      const map = new Map<string, { email: string; firstName: string; lastName: string; role: MemberRole; participantId?: string }>();
      participants.forEach((p) => {
        const m = getMemberFor(p.email);
        map.set(p.email.toLowerCase(), {
          email: p.email,
          firstName: p.first_name || '',
          lastName: p.last_name || '',
          role: ((m?.role as MemberRole) || 'participant'),
          participantId: p.id,
        });
      });
      members.forEach((m) => {
        const key = m.email.toLowerCase();
        if (!map.has(key)) {
          map.set(key, { email: m.email, firstName: '', lastName: '', role: m.role });
        }
      });
      // Only display managers, consultants and admins in the Roles table
      return Array.from(map.values()).filter((r) => r.role === 'manager' || r.role === 'consultant' || r.role === 'admin');
    })();

    const company = companyName || (fr ? '[Nom de la société]' : '[Company name]');
    const rolesEmailTemplate = fr
      ? `Bonjour,

Pour accéder aux résultats de l'évaluation Dust, cliquez sur le lien suivant : ${window.location.origin}/dashboard

Renseignez votre mail et le nom de votre société suivant : ${company}

Bien à vous,`
      : `Hello,

To access the Dust assessment results, click the following link: ${window.location.origin}/dashboard

Enter your email and the following company name: ${company}

Best regards,`;

    return (
      <div className="space-y-4">
        {campaignCode && (
          <SectionCard
            title={fr ? 'Code de la campagne' : 'Campaign Code'}
            description={companyName}
            actions={
              <Button onClick={handleCopyCode} variant="outline" className="gap-1.5">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? (fr ? 'Copié !' : 'Copied!') : (fr ? 'Copier le code' : 'Copy code')}
              </Button>
            }
          >
            <p className="font-mono text-[26px] font-semibold tracking-[0.2em] text-foreground">{campaignCode}</p>
          </SectionCard>
        )}

        {!isAdmin ? (
          <div className="banner" style={{ ['--banner-accent' as string]: 'var(--blue)' }}>
            <Info className="h-4 w-4 shrink-0 text-note-ink" />
            <p className="text-[13px] text-foreground">
              {fr ? 'La gestion des rôles est réservée aux administrateurs de la campagne.' : 'Role management is reserved for campaign administrators.'}
            </p>
          </div>
        ) : (
          <>
            <SectionCard
              title={fr ? 'Donner un rôle' : 'Assign a role'}
              description={
                <span className="block space-y-0.5">
                  <span className="block">
                    <span className="font-medium text-foreground">Manager :</span>{' '}
                    {fr
                      ? "accède au dashboard de cette campagne (résultats, scores, suivi des participants) sans pouvoir créer de campagne ni gérer les rôles."
                      : 'can view this campaign dashboard (results, scores, participant tracking) but cannot create campaigns or manage roles.'}
                  </span>
                  <span className="block">
                    <span className="font-medium text-foreground">Consultant :</span>{' '}
                    {fr
                      ? "mêmes droits qu'un manager : accès au dashboard de la campagne sans gestion des rôles ni création de campagne."
                      : 'same rights as a manager: dashboard access without role management or campaign creation.'}
                  </span>
                  <span className="block">
                    <span className="font-medium text-foreground">Admin :</span>{' '}
                    {fr
                      ? "accès complet : dashboard, création de nouvelles campagnes, gestion des membres et de leurs rôles, exports."
                      : 'full access: dashboard, create new campaigns, manage members and roles, exports.'}
                  </span>
                </span>
              }
            >
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                <Input
                  placeholder={fr ? 'Prénom' : 'First name'}
                  value={newMember.firstName}
                  onChange={(e) => setNewMember({ ...newMember, firstName: e.target.value })}
                  className="sm:col-span-2"
                />
                <Input
                  placeholder={fr ? 'Nom' : 'Last name'}
                  value={newMember.lastName}
                  onChange={(e) => setNewMember({ ...newMember, lastName: e.target.value })}
                  className="sm:col-span-2"
                />
                <Input
                  type="email"
                  placeholder="email@societe.com"
                  value={newMember.email}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                  className="sm:col-span-4"
                />
                <Select value={newMember.role} onValueChange={(v) => setNewMember({ ...newMember, role: v as MemberRole })}>
                  <SelectTrigger className="sm:col-span-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="consultant">Consultant</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleAddMember} disabled={addingMember} className="sm:col-span-2">
                  {addingMember ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" />{fr ? 'Ajouter' : 'Add'}</>}
                </Button>
              </div>
            </SectionCard>

            <SectionCard flush title={fr ? 'Rôles' : 'Roles'} description={fr ? 'Ajoutez des membres et gérez leurs rôles dans la campagne.' : 'Add members and manage their campaign roles.'}>
              {rows.length === 0 ? (
                <div className="p-8 text-center text-[13px] text-muted-foreground">
                  {fr ? 'Aucun membre pour le moment.' : 'No members yet.'}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-5">{fr ? 'Nom' : 'Name'}</TableHead>
                      <TableHead className="hidden sm:table-cell">Email</TableHead>
                      <TableHead className="pr-5 text-right">{fr ? 'Rôle' : 'Role'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.email}>
                        <TableCell className="pl-5 font-medium">
                          {(r.firstName || r.lastName) ? `${r.firstName} ${r.lastName}`.trim() : <span className="text-muted-foreground">—</span>}
                          <span className="block truncate text-[12px] font-normal text-muted-foreground sm:hidden">{r.email}</span>
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground sm:table-cell">{r.email}</TableCell>
                        <TableCell className="pr-5">
                          <div className="flex justify-end">
                            <Select value={r.role} onValueChange={(v) => handleChangeParticipantRole(r.email, v as MemberRole)}>
                              <SelectTrigger className={`h-7 w-[130px] border-transparent shadow-none ${roleBadgeClass(r.role)}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="manager">Manager</SelectItem>
                                <SelectItem value="consultant">Consultant</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </SectionCard>

            <SectionCard
              title={fr ? "Email d'accès aux résultats" : 'Results access email'}
              description={fr
                ? "Copiez ce modèle pour partager l'accès au dashboard avec vos managers, consultants ou admins."
                : 'Copy this template to share dashboard access with your managers, consultants or admins.'}
              actions={
                <Button variant="outline" onClick={() => copyText(rolesEmailTemplate, fr ? 'Email copié !' : 'Email copied!')} className="gap-1.5">
                  <Copy className="w-4 h-4" />
                  {fr ? "Copier l'email" : 'Copy email'}
                </Button>
              }
            >
              <pre className="whitespace-pre-wrap rounded-md border border-border bg-paper p-3 font-sans text-[13px] leading-relaxed text-foreground">{rolesEmailTemplate}</pre>
            </SectionCard>
          </>
        )}
      </div>
    );
  };

  // ===== Data health (participant tracking) =====
  const renderDataHealth = () => (
    <div className="space-y-4">
      {renderStatusStrip()}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={fr ? 'Rechercher (nom, email, campagne)...' : 'Search (name, email, campaign)...'}
            value={participantSearch}
            onChange={(e) => setParticipantSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {participantCampaignOptions.length > 1 && (
          <Select value={participantCampaignFilter} onValueChange={setParticipantCampaignFilter}>
            <SelectTrigger className="w-full sm:w-[240px]">
              <SelectValue placeholder={fr ? 'Campagne' : 'Campaign'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{fr ? 'Toutes les campagnes' : 'All campaigns'}</SelectItem>
              {participantCampaignOptions.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.campaign_name || c.company_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="card-elevated overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : participants.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <Users className="w-8 h-8 text-muted-foreground mb-3" />
            <h3 className="card-title mb-1">{fr ? 'Aucun participant' : 'No participants'}</h3>
            <p className="text-[13px] text-muted-foreground max-w-md">
              {fr ? "Les participants apparaîtront ici dès qu'ils commenceront le quiz avec votre code de campagne." : 'Participants will appear here as soon as they start the quiz with your campaign code.'}
            </p>
          </div>
        ) : (
          <Table className="[&_td]:whitespace-nowrap">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">{fr ? 'Prénom' : 'First Name'}</TableHead>
                <TableHead>{fr ? 'Nom' : 'Last Name'}</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>{fr ? 'Campagne' : 'Campaign'}</TableHead>
                <TableHead>{fr ? 'Statut' : 'Status'}</TableHead>
                <TableHead>{fr ? 'Date du test' : 'Test date'}</TableHead>
                {isAdmin && <TableHead>{fr ? 'Rôle' : 'Role'}</TableHead>}
                {isAdmin && <TableHead className="w-12 pr-5"></TableHead>}
              </TableRow>
              <TableRow className="bg-paper hover:bg-paper">
                <TableHead className="py-1.5 pl-5">
                  <Input
                    value={colFilters.firstName}
                    onChange={(e) => setColFilters((s) => ({ ...s, firstName: e.target.value }))}
                    placeholder={fr ? 'Filtrer' : 'Filter'}
                    className="h-7 min-w-[96px] text-xs normal-case tracking-normal"
                  />
                </TableHead>
                <TableHead className="py-1.5">
                  <Input
                    value={colFilters.lastName}
                    onChange={(e) => setColFilters((s) => ({ ...s, lastName: e.target.value }))}
                    placeholder={fr ? 'Filtrer' : 'Filter'}
                    className="h-7 min-w-[96px] text-xs normal-case tracking-normal"
                  />
                </TableHead>
                <TableHead className="py-1.5">
                  <Input
                    value={colFilters.email}
                    onChange={(e) => setColFilters((s) => ({ ...s, email: e.target.value }))}
                    placeholder={fr ? 'Filtrer' : 'Filter'}
                    className="h-7 min-w-[96px] text-xs normal-case tracking-normal"
                  />
                </TableHead>
                <TableHead className="py-1.5">
                  <Input
                    value={colFilters.campaign}
                    onChange={(e) => setColFilters((s) => ({ ...s, campaign: e.target.value }))}
                    placeholder={fr ? 'Filtrer' : 'Filter'}
                    className="h-7 min-w-[96px] text-xs normal-case tracking-normal"
                  />
                </TableHead>
                <TableHead className="py-1.5">
                  <Select value={colFilters.status} onValueChange={(v) => setColFilters((s) => ({ ...s, status: v }))}>
                    <SelectTrigger className="h-7 min-w-[96px] text-xs normal-case tracking-normal"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{fr ? 'Tous' : 'All'}</SelectItem>
                      <SelectItem value="completed">{fr ? 'Terminé' : 'Completed'}</SelectItem>
                      <SelectItem value="in_progress">{fr ? 'En cours' : 'In progress'}</SelectItem>
                      <SelectItem value="not_started">{fr ? 'Pas commencé' : 'Not started'}</SelectItem>
                    </SelectContent>
                  </Select>
                </TableHead>
                <TableHead className="py-1.5">
                  <Select value={dateSort} onValueChange={(v) => setDateSort(v as 'asc' | 'desc')}>
                    <SelectTrigger className="h-7 min-w-[96px] text-xs normal-case tracking-normal">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">{fr ? 'Récent → Ancien' : 'Newest → Oldest'}</SelectItem>
                      <SelectItem value="asc">{fr ? 'Ancien → Récent' : 'Oldest → Newest'}</SelectItem>
                    </SelectContent>
                  </Select>
                </TableHead>
                {isAdmin && (
                  <TableHead className="py-1.5">
                    <Select value={colFilters.role} onValueChange={(v) => setColFilters((s) => ({ ...s, role: v }))}>
                      <SelectTrigger className="h-7 min-w-[96px] text-xs normal-case tracking-normal"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{fr ? 'Tous' : 'All'}</SelectItem>
                        <SelectItem value="participant">Participant</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="consultant">Consultant</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableHead>
                )}
                {isAdmin && <TableHead className="py-1.5 pr-5"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredParticipants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 8 : 6} className="text-center py-8 text-muted-foreground">
                    {fr ? 'Aucun participant trouvé.' : 'No participant found.'}
                  </TableCell>
                </TableRow>
              ) : filteredParticipants.map((p) => {
                const member = getMemberFor(p.email);
                const role: MemberRole = (member?.role as MemberRole) || 'participant';
                const campaign = p.campaign_id ? campaignsById.get(p.campaign_id) : undefined;
                const testDate = p.completed_at || p.started_at;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="pl-5 font-medium">{p.first_name}</TableCell>
                    <TableCell className="font-medium">{p.last_name}</TableCell>
                    <TableCell className="text-[12px] text-muted-foreground">{p.email}</TableCell>
                    <TableCell className="text-[12px]">
                      {campaign ? (campaign.campaign_name || campaign.company_name) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>{getStatusBadge(p.status)}</TableCell>
                    <TableCell className="whitespace-nowrap text-[12px] text-muted-foreground">
                      {testDate
                        ? new Date(testDate).toLocaleDateString(fr ? 'fr-FR' : 'en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
                        : '—'}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <Select value={role} onValueChange={(v) => handleChangeParticipantRole(p.email, v as MemberRole)}>
                          <SelectTrigger className={`h-7 w-[130px] border-transparent shadow-none ${roleBadgeClass(role)}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="participant">Participant</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="consultant">Consultant</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    )}
                    {isAdmin && (
                      <TableCell className="pr-5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:bg-risk-soft hover:text-risk-ink"
                          onClick={() => setDeleteTarget(p)}
                          aria-label={fr ? 'Supprimer le participant' : 'Delete participant'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {isAdmin && campaignParticipants && companyName && (
        <AdminDownloadBar
          participants={campaignParticipants}
          companyName={companyName}
          averageScore={averageScore ?? 0}
          thematicAverages={thematicAverages ?? []}
        />
      )}
    </div>
  );

  const showCreate = isAdmin && view === 'campaignSettings';

  // Compute the admin's company prefix and filter campaigns
  const companyPrefix = (companyName ?? '').split(' — ')[0].trim().toLowerCase();
  const companyCampaigns = (allCampaigns ?? []).filter((c) => {
    const prefix = (c.company_name ?? '').split(' — ')[0].trim().toLowerCase();
    return prefix === companyPrefix;
  });

  useEffect(() => {
    if (!showCreate || companyCampaigns.length === 0) return;
    const ids = companyCampaigns.map((c) => c.id);
    (async () => {
      const { data, error } = await supabase
        .from('participants')
        .select('campaign_id, status')
        .in('campaign_id', ids);
      if (error || !data) return;
      const counts: Record<string, { total: number; completed: number }> = {};
      for (const id of ids) counts[id] = { total: 0, completed: 0 };
      for (const p of data as any[]) {
        const cid = p.campaign_id as string;
        if (!counts[cid]) counts[cid] = { total: 0, completed: 0 };
        counts[cid].total += 1;
        if (p.status === 'completed') counts[cid].completed += 1;
      }
      setCampaignCounts(counts);
    })();
  }, [showCreate, companyCampaigns.map((c) => c.id).join(',')]);

  return (
    <div className="space-y-4">
      {view === 'share' && renderShare()}
      {view === 'campaignSettings' && renderCampaignSettings()}
      {view === 'access' && renderAccess()}
      {view === 'dataHealth' && renderDataHealth()}

      <DeleteParticipantDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteParticipant}
        participantName={deleteTarget ? `${deleteTarget.first_name} ${deleteTarget.last_name}` : ''}
      />
    </div>
  );
};
