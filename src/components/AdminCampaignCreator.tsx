import { useState } from 'react';
import { Check, Copy, ExternalLink, Link2, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { validateProfessionalEmail } from '@/lib/email-validation';
import { cn } from '@/lib/utils';

interface AdminCampaignCreatorProps {
  defaultCompany?: string;
  /** Email that will own the results (dashboard login). Asked only when not provided. */
  defaultCreatorEmail?: string;
  onCreated?: () => void;
}

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
  const [email, setEmail] = useState(defaultCreatorEmail ?? '');
  const [campaignLanguage, setCampaignLanguage] = useState<'fr' | 'en'>(fr ? 'fr' : 'en');
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<{ code: string; company: string } | null>(null);
  const [copied, setCopied] = useState<'link' | 'message' | null>(null);

  const askEmail = !defaultCreatorEmail;
  const link = created ? `${window.location.origin}/assessment?lang=${campaignLanguage}&code=${created.code}` : '';

  const message = created
    ? campaignLanguage === 'fr'
      ? `Bonjour,\n\nDans le cadre du déploiement de Dust chez ${created.company}, nous vous invitons à répondre à un court questionnaire (environ 10 minutes) sur vos usages de l'IA.\n\nVos réponses nous aideront à adapter l'accompagnement à votre équipe.\n\nLien : ${link}\nCode (si demandé) : ${created.code}\n\nMerci !`
      : `Hello,\n\nAs part of the Dust rollout at ${created.company}, we invite you to answer a short questionnaire (about 10 minutes) on how you use AI today.\n\nYour answers will help us tailor the rollout to your team.\n\nLink: ${link}\nCode (if asked): ${created.code}\n\nThank you!`
    : '';

  const copy = async (what: 'link' | 'message') => {
    try {
      await navigator.clipboard.writeText(what === 'link' ? link : message);
      setCopied(what);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast({ title: fr ? 'Erreur de copie' : 'Copy failed', variant: 'destructive' });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const companyClean = company.trim();
    const owner = email.trim().toLowerCase();
    if (!companyClean || !owner) {
      toast({ title: fr ? 'Erreur' : 'Error', description: fr ? 'Indiquez le client' + (askEmail ? ' et votre email' : '') : 'Enter the client' + (askEmail ? ' and your email' : ''), variant: 'destructive' });
      return;
    }
    if (askEmail) {
      const v = validateProfessionalEmail(owner);
      if (!v.valid) {
        toast({ title: fr ? 'Email invalide' : 'Invalid email', description: v.message, variant: 'destructive' });
        return;
      }
    }

    setCreating(true);
    try {
      const { data: codeData, error: codeError } = await supabase.rpc('generate_campaign_code');
      if (codeError) throw codeError;
      const code = codeData as string;

      const { error } = await supabase.from('campaigns').insert({
        code,
        company_name: companyClean,
        campaign_name: campaignName.trim() || (fr ? 'Déploiement Dust' : 'Dust rollout'),
        creator_first_name: 'Dust',
        creator_last_name: '-',
        creator_email: owner,
        language: campaignLanguage,
      } as any);
      if (error) throw error;

      setCreated({ code, company: companyClean });
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

      {askEmail && (
        <div className="space-y-1.5">
          <Label htmlFor="cc-email">{fr ? 'Votre email (accès aux résultats)' : 'Your email (results access)'}</Label>
          <Input id="cc-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prenom@entreprise.com" />
        </div>
      )}

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
