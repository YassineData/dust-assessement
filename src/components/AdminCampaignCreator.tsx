import { useState } from 'react';
import { Check, Copy, Download, ExternalLink, FileText, Link2, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AUDIENCES, AUDIENCE_PARAM, type SurveyAudience } from '@/lib/assessment-v2';
import { AudiencePicker } from '@/components/AudiencePicker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { resultsLink } from '@/lib/access';
import { useIsDustTeam } from '@/hooks/useIsDustTeam';
import { DUST_TEAM, splitName } from '@/lib/dust-team';
import type { Campaign } from '@/components/CampaignSelector';

const TEAM_NAMES = DUST_TEAM.flatMap((g) => g.names);

interface AdminCampaignCreatorProps {
  defaultCompany?: string;
  /** Email that will own the results (dashboard login). Asked only when not provided. */
  defaultCreatorEmail?: string;
  onCreated?: () => void;
  /** Called as soon as the campaign exists, so the console can list and open it. */
  onCampaignCreated?: (campaign: Campaign) => void;
}

const CREATOR_KEY = 'dust_campaign_creator_name';

/**
 * Creates a deployment and hands back a link (+ code) to send to the client.
 * No recipient list: respondents register themselves when they open the link.
 */
export const AdminCampaignCreator = ({ defaultCompany, defaultCreatorEmail, onCreated, onCampaignCreated }: AdminCampaignCreatorProps) => {
  const { language } = useLanguage();
  const fr = language !== 'en';
  const { toast } = useToast();

  const [company, setCompany] = useState(defaultCompany ?? '');
  const [campaignName, setCampaignName] = useState('');
  // Who is creating it: one field with the Dust team as suggestions, remembered on this browser.
  const [creator, setCreator] = useState(() => {
    try {
      return localStorage.getItem(CREATOR_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const [campaignLanguage, setCampaignLanguage] = useState<'fr' | 'en'>('en');
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<{ code: string; company: string; accessKey: string } | null>(null);
  const [copied, setCopied] = useState<'link' | 'message' | 'results' | null>(null);
  // Only the Dust team (admin key) can create campaigns; the database enforces it too.
  const canCreate = useIsDustTeam();
  // Survey type, saved with the campaign (own header; Sales and CS pre-select the team). Default: all teams.
  const [audience, setAudience] = useState<SurveyAudience>('general');
  // Optional intro written for this client, replacing the standard title and first line.
  const [introOpen, setIntroOpen] = useState(false);
  const [introTitle, setIntroTitle] = useState('');
  const [introBody, setIntroBody] = useState('');

  const audienceParam = AUDIENCE_PARAM[audience];
  const link = created ? `${window.location.origin}/assessment?lang=${campaignLanguage}&code=${created.code}${audienceParam ? `&for=${audienceParam}` : ''}` : '';
  // The client kit (one-pager, downloadable as PDF) for the campaign just created.
  const kitLink = created
    ? `/kit?variant=deployment&code=${created.code}&company=${encodeURIComponent(created.company)}&lang=${campaignLanguage}${audience === 'presales' ? '&for=presales' : ''}`
    : '';
  const teamFr = audience === 'general' ? '' : ` (${AUDIENCES[audience].label.fr})`;
  const teamEn = audience === 'general' ? '' : ` (${AUDIENCES[audience].label.en})`;

  const message = created
    ? campaignLanguage === 'fr'
      ? `Bonjour,\n\nDans le cadre du déploiement de Dust chez ${created.company}${teamFr}, nous vous invitons à répondre à un court questionnaire (moins de 5 minutes) sur vos usages de l'IA.\n\nVos réponses nous aideront à adapter l'accompagnement à votre équipe.\n\nLien : ${link}\nCode (si demandé) : ${created.code}\n\nMerci !`
      : `Hello,\n\nAs part of the Dust rollout at ${created.company}${teamEn}, we invite you to answer a short questionnaire (less than 5 minutes) on how you use AI today.\n\nYour answers will help us tailor the rollout to your team.\n\nLink: ${link}\nCode (if asked): ${created.code}\n\nThank you!`
    : '';

  const copy = async (what: 'link' | 'message' | 'results') => {
    try {
      await navigator.clipboard.writeText(what === 'link' ? link : what === 'results' ? resultsLink(created?.accessKey || '') : message);
      setCopied(what);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast({ title: fr ? 'Erreur de copie' : 'Copy failed', variant: 'destructive' });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const companyClean = company.trim();
    const creatorClean = creator.trim().replace(/\s+/g, ' ');
    if (!companyClean || !creatorClean) {
      toast({
        title: fr ? 'Erreur' : 'Error',
        description: fr ? 'Indiquez le client et votre nom' : 'Enter the client and your name',
        variant: 'destructive',
      });
      return;
    }
    const { first, last } = splitName(creatorClean);

    setCreating(true);
    try {
      const { data: codeData, error: codeError } = await supabase.rpc('generate_campaign_code');
      if (codeError) throw codeError;
      const code = codeData as string;

      const base = {
        code,
        company_name: companyClean,
        campaign_name: campaignName.trim() || (fr ? 'Déploiement Dust' : 'Dust rollout'),
        creator_first_name: first,
        creator_last_name: last,
        creator_email: defaultCreatorEmail || 'team@dust.tt',
        language: campaignLanguage,
      };
      const intro = introTitle.trim() || introBody.trim() ? { title: introTitle.trim(), body: introBody.trim() } : null;
      const COLS = 'id, code, company_name, campaign_name, creator_email, creator_first_name, creator_last_name, created_at, access_key';
      let { data: inserted, error } = await supabase.from('campaigns').insert({ ...base, audience, intro } as any).select(COLS).maybeSingle();
      // Columns not installed yet (supabase/004-campaign-audience.sql): create without them; the link still carries the type.
      // The pre-sales type needs supabase/006-presales-audience.sql: say so instead of creating another type.
      if (error && /audience_check/i.test(error.message || '')) {
        toast({ title: fr ? 'Type pas encore activé' : 'Type not enabled yet', description: fr ? 'Lancez supabase/006-presales-audience.sql dans Supabase, puis recréez la campagne.' : 'Run supabase/006-presales-audience.sql in Supabase, then create the campaign again.', variant: 'destructive' });
        return;
      }
      if (error && /audience|intro|column/i.test(error.message || '')) {
        ({ data: inserted, error } = await supabase.from('campaigns').insert(base as any).select(COLS).maybeSingle());
      }
      if (error) throw error;
      onCampaignCreated?.({ ...base, created_at: new Date().toISOString(), ...(inserted as object | null ?? {}) } as unknown as Campaign);
      try {
        localStorage.setItem(CREATOR_KEY, creatorClean);
      } catch {
        /* per-browser convenience only */
      }

      setCreated({ code, company: companyClean, accessKey: (inserted as { access_key?: string } | null)?.access_key || 'DEMO' });
    } catch (err) {
      console.error(err);
      toast({ title: fr ? 'Erreur' : 'Error', description: fr ? 'Impossible de créer le lien' : 'Unable to create the link', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  if (created) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-ok-ink">
          <Check className="h-4 w-4" />
          <p className="text-[13px] font-medium">{fr ? `Lien créé pour ${created.company}` : `Link created for ${created.company}`}</p>
        </div>

        <p className="text-[13px] text-muted-foreground">
          {fr ? 'Type : ' : 'Type: '}
          <span className="font-medium text-foreground">
            {audience === 'presales'
              ? (fr ? 'Diagnostic IA' : 'AI diagnostic')
              : `${fr ? 'Déploiement' : 'Deployment'} · ${fr ? AUDIENCES[audience].label.fr : AUDIENCES[audience].label.en}`}
          </span>
          {(introTitle.trim() || introBody.trim()) && (fr ? ' · intro personnalisée' : ' · custom intro')}
        </p>

        {/* Next step first: the one-pager to send to the client contact, ready as a PDF. */}
        <div className="flex flex-col gap-3 rounded-md bg-brand-soft p-4 ring-1 ring-brand/20 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <FileText className="mt-0.5 h-5 w-5 shrink-0 text-brand-ink" />
            <div>
              <p className="text-[14px] font-semibold text-foreground">{fr ? 'Étape suivante : le kit pour le client' : 'Next step: the client kit'}</p>
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                {fr
                  ? 'Un PDF d’une page avec le lien, le message pour ses équipes et le lien privé des résultats. À envoyer à la personne qui pilote le projet.'
                  : 'A one-page PDF with the link, the message for their teams and the private results link. Send it to the person running the project.'}
              </p>
            </div>
          </div>
          <Button asChild className="shrink-0">
            <a href={kitLink} target="_blank" rel="noopener noreferrer">
              <Download className="h-4 w-4" />
              {fr ? 'Ouvrir le kit PDF' : 'Open the PDF kit'}
            </a>
          </Button>
        </div>

        <div className="space-y-1.5">
          <Label>{fr ? 'Lien à envoyer au client' : 'Link to send to the client'}</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input readOnly value={link} onFocus={(e) => e.currentTarget.select()} className="font-mono text-[12px]" />
            <div className="flex gap-2">
              <Button type="button" onClick={() => copy('link')} className="flex-1 sm:flex-none">
                {copied === 'link' ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                {copied === 'link' ? (fr ? 'Copié' : 'Copied') : (fr ? 'Copier' : 'Copy')}
              </Button>
              <Button type="button" variant="outline" asChild className="flex-1 sm:flex-none">
                <a href={link} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  {fr ? 'Ouvrir' : 'Open'}
                </a>
              </Button>
            </div>
          </div>
          <p className="text-[12px] text-muted-foreground">
            {fr ? 'Code de la campagne : ' : 'Campaign code: '}
            <span className="mono font-semibold text-foreground">{created.code}</span>
          </p>
        </div>

        <div className="space-y-1.5 rounded-md bg-paper p-3 ring-1 ring-border">
          <Label>{fr ? 'Lien privé des résultats (pour votre contact client)' : 'Private results link (for your client contact)'}</Label>
          <p className="text-[12px] text-muted-foreground">
            {fr
              ? 'Il donne accès aux résultats de cette campagne uniquement. À envoyer seulement à la personne qui pilote le projet chez le client, jamais aux répondants.'
              : 'It opens the results of this campaign only. Send it only to the person running the project at the client, never to respondents.'}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input readOnly value={resultsLink(created.accessKey)} onFocus={(e) => e.currentTarget.select()} className="font-mono text-[12px]" />
            <Button type="button" variant="outline" onClick={() => copy('results')} className="sm:flex-none">
              {copied === 'results' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied === 'results' ? (fr ? 'Copié' : 'Copied') : (fr ? 'Copier' : 'Copy')}
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>{fr ? 'Message prêt à envoyer' : 'Ready-to-send message'}</Label>
          <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-paper p-3 font-sans text-[13px] leading-relaxed text-foreground">{message}</pre>
          <Button type="button" variant="outline" onClick={() => copy('message')}>
            {copied === 'message' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied === 'message' ? (fr ? 'Copié' : 'Copied') : (fr ? 'Copier le message' : 'Copy message')}
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <button
            type="button"
            className="inline-flex items-center gap-1 text-[12px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            onClick={() => {
              setCreated(null);
              setCompany(defaultCompany ?? '');
              setCampaignName('');
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            {fr ? 'Créer une autre campagne' : 'Create another campaign'}
          </button>
          {onCreated && (
            <Button type="button" onClick={onCreated}>
              {fr ? 'Terminé' : 'Done'}
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (!canCreate) {
    return (
      <div className="space-y-3 rounded-md bg-paper p-4 ring-1 ring-border">
        <p className="text-[14px] font-medium text-foreground">{fr ? 'Réservé à l’équipe Dust' : 'For the Dust team only'}</p>
        <p className="text-[13px] text-muted-foreground">
          {fr
            ? 'Connectez-vous côté équipe Dust (Console → « Équipe Dust : se connecter ») pour créer un lien de campagne.'
            : 'Sign in as the Dust team (Console → "Dust team sign-in") to create a campaign link.'}
        </p>
        <Button asChild>
          <a href="/login">{fr ? 'Se connecter' : 'Sign in'}</a>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleCreate} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="cc-company">{fr ? 'Client' : 'Client'}</Label>
          <Input id="cc-company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder={fr ? 'Ex : Acme' : 'E.g. Acme'} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cc-name">
            {fr ? 'Nom du déploiement' : 'Rollout name'} <span className="font-normal text-muted-foreground">({fr ? 'facultatif' : 'optional'})</span>
          </Label>
          <Input id="cc-name" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder={fr ? 'Ex : Équipe Sales, Q4' : 'E.g. Sales team, Q4'} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cc-owner">{fr ? 'Votre nom' : 'Your name'}</Label>
        <Input
          id="cc-owner"
          list="cc-team"
          value={creator}
          onChange={(e) => setCreator(e.target.value)}
          autoComplete="off"
          placeholder={fr ? 'Tapez les premières lettres' : 'Start typing'}
        />
        <datalist id="cc-team">
          {TEAM_NAMES.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
        <p className="text-[12px] text-muted-foreground">
          {fr ? 'Pour savoir qui a lancé quelle campagne. Mémorisé sur ce navigateur.' : 'So the team knows who launched which campaign. Remembered on this browser.'}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label>{fr ? 'Type de campagne' : 'Campaign type'}</Label>
        <AudiencePicker value={audience} onChange={setAudience} fr={fr} />
        {!introOpen ? (
          <button type="button" className="text-[12px] font-medium text-brand-ink hover:underline" onClick={() => setIntroOpen(true)}>
            {fr ? '+ Écrire une intro personnalisée (facultatif)' : '+ Write a custom intro (optional)'}
          </button>
        ) : (
          <div className="space-y-2 rounded-md bg-paper p-3 ring-1 ring-border">
            <Input value={introTitle} onChange={(e) => setIntroTitle(e.target.value)} placeholder={fr ? 'Titre, ex : Dust chez Acme : questionnaire Builders' : 'Title, e.g. Dust at Acme: Builder Survey'} />
            <textarea
              value={introBody}
              onChange={(e) => setIntroBody(e.target.value)}
              rows={3}
              placeholder={fr ? 'Une ou deux phrases sous le titre' : 'One or two sentences under the title'}
              className="w-full rounded-md border border-input bg-card px-3 py-2 text-[14px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className="text-[12px] text-muted-foreground">{fr ? 'Remplace le titre et la première phrase de l’en-tête.' : 'Replaces the header title and first line.'}</p>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>{fr ? 'Langue du questionnaire' : 'Questionnaire language'}</Label>
        <div className="inline-flex rounded-md border border-border bg-muted p-0.5" role="radiogroup">
          {(['fr', 'en'] as const).map((l) => (
            <button
              key={l}
              type="button"
              role="radio"
              aria-checked={campaignLanguage === l}
              onClick={() => setCampaignLanguage(l)}
              className={cn(
                'h-8 rounded-sm px-3 text-[13px] font-medium transition-colors duration-150',
                campaignLanguage === l ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {l === 'fr' ? 'Français' : 'English'}
            </button>
          ))}
        </div>
        <p className="text-[12px] text-muted-foreground">
          {fr ? 'Le répondant peut toujours basculer en français ou en anglais.' : 'Respondents can always switch between French and English.'}
        </p>
      </div>

      <Button type="submit" className="w-full" disabled={creating}>
        {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
        {fr ? 'Créer le lien' : 'Create the link'}
      </Button>
    </form>
  );
};
