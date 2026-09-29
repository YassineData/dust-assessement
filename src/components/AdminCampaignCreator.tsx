import { useState } from 'react';
import { Check, Copy, ExternalLink, Link2, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AUDIENCES, AUDIENCE_PARAM, type SurveyAudience } from '@/lib/assessment-v2';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { resultsLink } from '@/lib/access';
import { useIsDustTeam } from '@/hooks/useIsDustTeam';
import { Link } from 'react-router-dom';
import { DUST_TEAM, splitName } from '@/lib/dust-team';

const TEAM_NAMES = DUST_TEAM.flatMap((g) => g.names);

interface AdminCampaignCreatorProps {
  defaultCompany?: string;
  /** Email that will own the results (dashboard login). Asked only when not provided. */
  defaultCreatorEmail?: string;
  onCreated?: () => void;
}

const CREATOR_KEY = 'dust_campaign_creator_name';

/**
 * Creates a deployment and hands back a link (+ code) to send to the client.
 * No recipient list: respondents register themselves when they open the link.
 */
export const AdminCampaignCreator = ({ defaultCompany, defaultCreatorEmail, onCreated }: AdminCampaignCreatorProps) => {
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
  // One link per audience: all teams, Sales or Customer Success (own survey header, team pre-selected).
  const [audience, setAudience] = useState<SurveyAudience>('general');

  const audienceParam = AUDIENCE_PARAM[audience];
  const link = created ? `${window.location.origin}/assessment?lang=${campaignLanguage}&code=${created.code}${audienceParam ? `&for=${audienceParam}` : ''}` : '';
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

      const { data: inserted, error } = await supabase.from('campaigns').insert({
        code,
        company_name: companyClean,
        campaign_name: campaignName.trim() || (fr ? 'Déploiement Dust' : 'Dust rollout'),
        creator_first_name: first,
        creator_last_name: last,
        creator_email: defaultCreatorEmail || 'team@dust.tt',
        language: campaignLanguage,
      } as any).select('access_key').maybeSingle();
      if (error) throw error;
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

        <div className="space-y-1.5">
          <Label>{fr ? 'Pour quelle équipe ?' : 'Which team is it for?'}</Label>
          <div role="radiogroup" className="flex flex-wrap gap-2">
            {(['general', 'sales', 'success'] as SurveyAudience[]).map((a) => (
              <button
                key={a}
                type="button"
                role="radio"
                aria-checked={audience === a}
                onClick={() => setAudience(a)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-[13px] font-medium ring-1 transition-colors duration-150',
                  audience === a ? 'bg-ink text-white ring-ink' : 'bg-card text-foreground ring-border hover:bg-paper'
                )}
              >
                {fr ? AUDIENCES[a].label.fr : AUDIENCES[a].label.en}
              </button>
            ))}
          </div>
          <p className="text-[12px] text-muted-foreground">
            {fr
              ? 'Chaque lien a son propre en-tête (à quoi ça sert, pourquoi, ce qui en ressort) et pré-sélectionne l’équipe. Toutes les réponses arrivent dans la même campagne.'
              : 'Each link has its own header (what it’s for, why it matters, what comes out) and pre-selects the team. All answers land in the same campaign.'}
          </p>
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

        <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setCreated(null);
              setCompany(defaultCompany ?? '');
              setCampaignName('');
            }}
          >
            <Plus className="h-4 w-4" />
            {fr ? 'Créer un autre lien' : 'Create another link'}
          </Button>
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
          <Link to="/login">{fr ? 'Se connecter' : 'Sign in'}</Link>
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
