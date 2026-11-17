import { useEffect, useState } from 'react';
import { Check, Copy, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { HubspotExportGuide } from '@/components/HubspotExportGuide';
import { hubspotGuideHidden } from '@/lib/hubspot-guide';
import type { CampaignParticipant } from '@/lib/participant-row';
import {
  buildHubspotExport,
  buildHubspotMessage,
  dustNewConversationUrl,
  hubspotFileName,
  MIN_RESPONDENTS_FOR_HUBSPOT,
  normalizeHubspotDomain,
  suggestHubspotDomain,
  type HubspotExportCampaign,
} from '@/lib/hubspot-export';

interface CampaignRow {
  id: string;
  company_name: string;
  campaign_name: string | null;
  audience: string | null;
  language: string | null;
  created_at: string;
  hubspot_domain: string | null;
  hubspot_exported_at: string | null;
  partners: { name: string } | null;
}

/**
 * « Exporter vers HubSpot » (Dust team only): downloads the export file, then (after an animated explanation the
 * first times) copies the short message for the @hubspot-assessment agent and opens a new Dust conversation.
 * The campaign's HubSpot fields are loaded when the export window opens, before any click.
 */
export const HubspotExportButton = ({
  campaignId,
  participants,
  fr,
  compact = false,
}: {
  campaignId: string;
  participants: CampaignParticipant[];
  fr: boolean;
  /** Page header: the orange button alone. Otherwise the highlighted block of the export window. */
  compact?: boolean;
}) => {
  const [row, setRow] = useState<CampaignRow | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'notfound'>('loading');
  const [fallbackMessage, setFallbackMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [guide, setGuide] = useState<{ message: string; fileName: string } | null>(null);
  // Signed in with an @dust.tt address: the export can go straight to Dust (api/hubspot-export.ts).
  const [dustToken, setDustToken] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const s = data.session;
      setDustToken(s?.user?.email?.toLowerCase().endsWith('@dust.tt') ? s.access_token : null);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    supabase
      .from('campaigns')
      .select('id, company_name, campaign_name, audience, language, created_at, hubspot_domain, hubspot_exported_at, partners(name)' as never)
      .eq('id', campaignId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        // Columns not installed yet (supabase/010-hubspot.sql), or a campaign that is not in the database (demo).
        if (error) return setState('missing');
        if (!data) return setState('notfound');
        setRow(data as unknown as CampaignRow);
        setState('ready');
      });
    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  const domain = normalizeHubspotDomain(row?.hubspot_domain);
  const completed = participants.filter((p) => p.status === 'completed').length;
  const disabledReason =
    state === 'notfound'
      ? fr ? 'Campagne introuvable dans la base : export indisponible.' : 'Campaign not found in the database: export unavailable.'
      : state === 'missing'
      ? fr ? 'Lancez supabase/010-hubspot.sql dans Supabase pour exporter.' : 'Run supabase/010-hubspot.sql in Supabase to export.'
      : state === 'ready' && !domain
        ? 'Renseigne le domaine HubSpot du client pour exporter.'
        : state === 'ready' && completed < MIN_RESPONDENTS_FOR_HUBSPOT
          ? fr
            ? `Il faut au moins ${MIN_RESPONDENTS_FOR_HUBSPOT} réponses complètes pour exporter (${completed} pour l’instant).`
            : `At least ${MIN_RESPONDENTS_FOR_HUBSPOT} completed answers are needed to export (${completed} so far).`
          : null;

  // No domain yet: proposed from the respondents' work addresses, saved in one click.
  const suggested = state === 'ready' && !domain ? suggestHubspotDomain(participants.map((p) => p.email)) : null;
  const [savingDomain, setSavingDomain] = useState(false);
  const useSuggested = async () => {
    if (!row || !suggested) return;
    setSavingDomain(true);
    const { error } = await supabase.from('campaigns').update({ hubspot_domain: suggested } as never).eq('id', row.id);
    setSavingDomain(false);
    if (error) {
      toast.error(fr ? 'Enregistrement du domaine impossible.' : 'Could not save the domain.');
      return;
    }
    setRow({ ...row, hubspot_domain: suggested });
    toast.success(fr ? `Domaine HubSpot enregistré : ${suggested}` : `HubSpot domain saved: ${suggested}`);
  };

  // Copy the message (started while this page still has focus) and open Dust with the agent preselected:
  // called from a click, so the browser allows both.
  const sendToDust = (message: string) => {
    const copying = navigator.clipboard?.writeText(message) ?? Promise.reject(new Error('no clipboard'));
    window.open(dustNewConversationUrl(import.meta.env.VITE_DUST_WORKSPACE_ID as string | undefined, import.meta.env.VITE_DUST_HUBSPOT_AGENT_ID as string | undefined), '_blank', 'noopener');
    copying.then(
      () => toast.success('Message copié. Dans Dust : colle (Cmd+V), glisse le fichier, puis Entrée.', { duration: 8000 }),
      () => setFallbackMessage(message)
    );
  };

  const run = () => {
    if (!row || !domain) return;
    const campaign: HubspotExportCampaign = {
      id: row.id,
      name: row.campaign_name,
      companyName: row.company_name,
      audience: row.audience,
      createdAt: row.created_at,
      hubspotDomain: domain,
      partnerName: row.partners?.name ?? null,
    };
    // The campaign's own language (not the screen's): the note reads the same whoever exports it.
    const exp = buildHubspotExport({
      participants,
      campaign,
      campaignUrl: `${window.location.origin}/dashboard?campaign=${encodeURIComponent(row.id)}`,
      lang: row.language === 'en' ? 'en' : 'fr',
    });
    const fileName = hubspotFileName(exp);
    const message = buildHubspotMessage(exp, fileName);

    const exportJson = JSON.stringify(exp);

    // Manual flow: file in the downloads, then (explanation the first times) message copied and Dust opened.
    const manual = (forceGuide = false) => {
      const url = URL.createObjectURL(new Blob([exportJson], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      // After a failed direct send we are outside the click: the explanation's button keeps Dust opening allowed.
      if (!forceGuide && hubspotGuideHidden()) sendToDust(message);
      else setGuide({ message, fileName });
    };

    if (dustToken && import.meta.env.VITE_HUBSPOT_DIRECT === 'true') {
      // Direct: a tab is opened inside the click (browsers allow it), then pointed at the new conversation.
      const tab = window.open('', '_blank');
      if (tab) {
        tab.opener = null;
        tab.document.title = 'Dust…';
        tab.document.body.innerHTML = '<p style="font:15px system-ui;margin:40px;color:#555">Envoi vers Dust…</p>';
      }
      setSending(true);
      fetch('/api/hubspot-export', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${dustToken}` },
        body: JSON.stringify({ fileName, message, exportJson, title: `[Assessment IA] ${row.company_name}` }),
      })
        .then(async (res) => {
          const data = (await res.json().catch(() => ({}))) as { url?: string };
          if (!res.ok || !data.url) throw new Error(String(res.status));
          if (tab) tab.location.href = data.url;
          else window.open(data.url, '_blank', 'noopener');
          toast.success(fr ? 'Envoyé à @hubspot-assessment. Dans Dust, vérifie l’aperçu de l’agent puis confirme.' : 'Sent to @hubspot-assessment. In Dust, check the agent’s preview, then confirm.', { duration: 9000 });
        })
        .catch(() => {
          tab?.close();
          manual(true);
        })
        .finally(() => setSending(false));
    } else {
      manual();
    }

    // 4. Last export date (best effort, after the click).
    const at = new Date().toISOString();
    setRow({ ...row, hubspot_exported_at: at });
    supabase.from('campaigns').update({ hubspot_exported_at: at } as never).eq('id', row.id).then(({ error }) => {
      if (error) console.error('hubspot_exported_at not saved:', error);
    });
  };

  const button = (
    <Button
      className={`${compact ? '' : 'w-full '}gap-2 bg-[#D9481E] font-semibold text-white hover:bg-[#BF3D17] focus-visible:ring-[#FF7A59] disabled:bg-[#D9481E]/45`}
      onClick={run}
      disabled={state !== 'ready' || !!disabledReason || sending}
    >
      {state === 'loading' || sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      {fr ? 'Exporter vers HubSpot' : 'Export to HubSpot'}
    </Button>
  );

  const trigger = disabledReason ? (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* A disabled button gets no hover: the wrapper carries the tooltip. */}
        <span tabIndex={0} className={compact ? 'inline-block' : 'block'}>
          {button}
        </span>
      </TooltipTrigger>
      <TooltipContent>{disabledReason}</TooltipContent>
    </Tooltip>
  ) : (
    button
  );

  const fallbackDialog = (
    <>
      <HubspotExportGuide
        open={guide !== null}
        fr={fr}
        fileName={guide?.fileName ?? ''}
        companyName={row?.company_name ?? ''}
        domain={domain ?? ''}
        onSend={() => {
          const message = guide?.message;
          setGuide(null);
          if (message) sendToDust(message);
        }}
        onClose={() => setGuide(null)}
      />
      {/* Clipboard refused: the message to copy by hand. */}
      <Dialog open={fallbackMessage !== null} onOpenChange={(open) => !open && setFallbackMessage(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{fr ? 'Message pour Dust' : 'Message for Dust'}</DialogTitle>
            <DialogDescription>
              {fr ? 'Le fichier est téléchargé. Copie ce message, colle-le dans Dust avec le fichier, puis Entrée.' : 'The file is downloaded. Copy this message, paste it in Dust with the file, then Enter.'}
            </DialogDescription>
          </DialogHeader>
          <textarea readOnly value={fallbackMessage ?? ''} rows={9} className="w-full rounded-md bg-paper p-3 font-mono text-[12px] text-foreground ring-1 ring-border" onFocus={(e) => e.currentTarget.select()} />
          <Button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(fallbackMessage ?? '');
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {
                toast.error(fr ? 'Copie impossible : sélectionne le texte et copie-le.' : 'Could not copy: select the text and copy it.');
              }
            }}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? (fr ? 'Copié' : 'Copied') : fr ? 'Copier' : 'Copy'}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );

  if (compact)
    return (
      <>
        {trigger}
        {fallbackDialog}
      </>
    );

  return (
    <section className="mt-3 rounded-xl bg-[#FFF1EC] p-4 ring-1 ring-[#FF7A59]/45 dark:bg-[#FF7A59]/10">
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FF7A59] text-white" aria-hidden>
          <Send className="h-3 w-3" />
        </span>
        <p className="text-[15px] font-semibold text-foreground">HubSpot</p>
        <span className="rounded-full bg-[#FF7A59]/15 px-2 py-0.5 text-[11px] font-semibold text-[#B23C15] dark:text-[#FF9F85]">{fr ? 'Équipe Dust' : 'Dust team'}</span>
      </div>
      <p className="mb-3 mt-1 text-[12px] text-muted-foreground">
        {fr ? 'Envoie la synthèse chiffrée et les réponses brutes dans une note sur la Company HubSpot du client, via l’agent Dust @hubspot-assessment.' : 'Sends the figures and the raw answers to a note on the client’s HubSpot Company, through the Dust agent @hubspot-assessment.'}
      </p>
      {suggested && (
        <div className="mb-2 flex flex-wrap items-center gap-2 rounded-md bg-card px-3 py-2 text-[12px] ring-1 ring-[#FF7A59]/30">
          <span className="text-muted-foreground">
            {fr ? 'Domaine trouvé dans les adresses des répondants : ' : 'Domain found in the respondents’ addresses: '}
            <span className="font-medium text-foreground">{suggested}</span>
          </span>
          <Button size="sm" variant="outline" className="ml-auto h-7" onClick={useSuggested} disabled={savingDomain}>
            {savingDomain ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {fr ? 'Utiliser ce domaine' : 'Use this domain'}
          </Button>
        </div>
      )}
      {trigger}
      {(domain || row?.hubspot_exported_at) && (
        <p className="mt-2 text-[12px] text-muted-foreground">
          {domain && <>{fr ? 'Company : ' : 'Company: '}<span className="font-medium text-foreground">{domain}</span></>}
          {domain && row?.hubspot_exported_at && ' · '}
          {row?.hubspot_exported_at && (
            <>
              {fr ? 'Dernier export : ' : 'Last export: '}
              {new Date(row.hubspot_exported_at).toLocaleString(fr ? 'fr-FR' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
            </>
          )}
        </p>
      )}

      {fallbackDialog}
    </section>
  );
};
