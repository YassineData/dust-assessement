import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { FileText, FileSpreadsheet, Presentation, FileDown, Loader2, Download, ArrowRight, Copy, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DustMark } from '@/components/DustMark';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import type { CampaignParticipant } from '@/hooks/useCampaignParticipants';
import { buildResponsesTable, exportCSV } from '@/lib/export-csv';
import { exportWord } from '@/lib/export-word';
import { exportPPT } from '@/lib/export-ppt';
import { exportSummaryPDF, type SummaryPdfData } from '@/lib/export-pdf';
import { buildDiagnosticPack, dustAnalysisPrompt, exportDiagnosticPack } from '@/lib/export-diagnostic';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { HubspotExportButton } from '@/components/HubspotExportButton';

type ExportKind = 'pdf' | 'ppt' | 'word' | 'csv' | 'pack';

interface DownloadOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Starting point → people → plan: feeds the one-page PDF and the first slides of the deck. */
  summary: SummaryPdfData | null;
  participants: CampaignParticipant[];
  companyName: string;
  averageScore: number;
  thematicAverages: { thematic: string; originalThematic: string; score: number }[];
  campaignName?: string | null;
  /** Dust team on a single campaign only (not partners, not the « Global » view): shows « Exporter vers HubSpot ». */
  hubspotCampaignId?: string | null;
}

/** Every export in one place: summary PDF, kickoff deck, full report, raw data. */
export const DownloadOptionsModal = ({
  isOpen,
  onClose,
  summary,
  participants,
  companyName,
  averageScore,
  thematicAverages,
  campaignName = null,
  hubspotCampaignId = null,
}: DownloadOptionsModalProps) => {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const [loading, setLoading] = useState<ExportKind | null>(null);
  const [copied, setCopied] = useState(false);
  const [exported, setExported] = useState(false);
  const [sendingAnalysis, setSendingAnalysis] = useState(false);
  // Dust team session + direct sending enabled: the pack and the instruction go straight to @dust (api/hubspot-export.ts).
  const [dustToken, setDustToken] = useState<string | null>(null);
  useEffect(() => {
    if (!isOpen || import.meta.env.VITE_HUBSPOT_DIRECT !== 'true') return;
    supabase.auth.getSession().then(({ data }) => {
      const s = data.session;
      setDustToken(s?.user?.email?.toLowerCase().endsWith('@dust.tt') ? s.access_token : null);
    });
  }, [isOpen]);

  const sendAnalysisToDust = () => {
    if (!dustToken) return;
    const lang = fr ? 'fr' : 'en';
    const pack = buildDiagnosticPack(participants, companyName, campaignName, lang);
    const slug = companyName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'client';
    const fileName = `diagnostic-${slug}-${new Date().toISOString().slice(0, 10)}.json`;
    // Raw answers as in the CSV export, without email addresses.
    const table = buildResponsesTable(participants, language, { includeEmail: false, isoDates: true, singleTeamColumn: true });
    const csv = [table.headers, ...table.rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const csvName = `reponses-${slug}-${new Date().toISOString().slice(0, 10)}.csv`;
    const tab = window.open('', '_blank');
    if (tab) {
      tab.opener = null;
      tab.document.body.innerHTML = '<p style="font:15px system-ui;margin:40px;color:#555">Envoi vers Dust…</p>';
    }
    setSendingAnalysis(true);
    fetch('/api/hubspot-export', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${dustToken}` },
      body: JSON.stringify({
        kind: 'analysis',
        fileName,
        // Direct send only: start with the Frame skill when one is configured (e.g. « /Yassine Frame Maker v2 »).
        message:
          (import.meta.env.VITE_DUST_FRAME_SKILL ? `${String(import.meta.env.VITE_DUST_FRAME_SKILL).trim()}\n\n` : '') +
          dustAnalysisPrompt(companyName, lang) +
          (fr
            ? `\n\nDeux fichiers sont joints : ${fileName} (synthèse et réponses libres) et ${csvName} (réponses brutes, une ligne par répondant, sans e-mail). Utilise le CSV pour vérifier les chiffres. Exception à la règle « aucun nom » : tu peux nommer les 3 à 5 personnes à mobiliser (meilleurs fits champion et builder), et seulement dans la slide dédiée. Termine par la présentation en Frame.`
            : `\n\nTwo files are attached: ${fileName} (summary and open answers) and ${csvName} (raw answers, one row per respondent, no email). Use the CSV to check figures. Exception to the « no person's name » rule: you may name the 3 to 5 people to rely on (best champion and builder fits), only on the dedicated slide. Finish with the presentation as a Frame.`),
        exportJson: JSON.stringify(pack),
        csv: { fileName: csvName, content: csv },
        title: `Diagnostic IA · ${companyName}`,
      }),
    })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as { url?: string };
        if (!res.ok || !data.url) throw new Error(String(res.status));
        if (tab) tab.location.href = data.url;
        toast.success(fr ? 'Envoyé à Dust : la présentation se construit dans la conversation.' : 'Sent to Dust: the presentation is being built in the conversation.');
      })
      .catch(() => {
        tab?.close();
        toast.error(fr ? 'Envoi direct impossible : utilise Télécharger puis Consigne.' : 'Direct sending failed: use Download, then Instruction.');
      })
      .finally(() => setSendingAnalysis(false));
  };

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(dustAnalysisPrompt(companyName, fr ? 'fr' : 'en'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error(fr ? 'Copie impossible' : 'Could not copy');
    }
  };

  const options: { kind: ExportKind; icon: typeof FileText; title: string; body: string; tag?: string }[] = [
    {
      kind: 'pdf',
      icon: FileDown,
      title: fr ? 'Synthèse d’une page (PDF)' : 'One-page summary (PDF)',
      body: fr ? 'Point de départ, personnes, plan : à envoyer au client ou à partager en interne.' : 'Starting point, people, plan: to send to the client or share internally.',
    },
    {
      kind: 'ppt',
      icon: Presentation,
      title: fr ? 'Deck de kickoff (PowerPoint)' : 'Kickoff deck (PowerPoint)',
      body: fr ? 'Les slides à présenter au client : résultats, profils et plan.' : 'Slides to present to the client: results, profiles and plan.',
    },
    {
      kind: 'word',
      icon: FileText,
      title: fr ? 'Rapport complet (Word)' : 'Full report (Word)',
      body: fr ? 'Le détail par dimension et par question, modifiable.' : 'Detail by dimension and question, editable.',
    },
    {
      kind: 'csv',
      icon: FileSpreadsheet,
      title: fr ? 'Données brutes (CSV)' : 'Raw data (CSV)',
      body: fr ? 'Une ligne par répondant : scores, rôles, contexte et réponses ouvertes.' : 'One row per respondent: scores, roles, context and open answers.',
    },
  ];

  const run = async (kind: ExportKind) => {
    setLoading(kind);
    try {
      if (kind === 'pdf' && summary) exportSummaryPDF(summary);
      if (kind === 'ppt') await exportPPT(participants, companyName, language, averageScore, thematicAverages, summary);
      if (kind === 'word') await exportWord(participants, companyName, language, averageScore, thematicAverages);
      if (kind === 'csv') exportCSV(participants, companyName, language);
      if (kind === 'pack') {
        exportDiagnosticPack(participants, companyName, campaignName, fr ? 'fr' : 'en');
        setExported(true);
      }
      toast.success(fr ? 'Export téléchargé' : 'Export downloaded');
    } catch (err) {
      console.error('Export error:', err);
      toast.error(fr ? 'L’export a échoué, réessayez.' : 'The export failed, please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-[17px] font-semibold">{fr ? 'Exporter les résultats' : 'Export results'}</DialogTitle>
          <DialogDescription>
            {fr ? `Campagne ${companyName} · ${participants.filter((p) => p.status === 'completed').length} réponses` : `${companyName} campaign · ${participants.filter((p) => p.status === 'completed').length} answers`}
          </DialogDescription>
        </DialogHeader>
        {/* Recommended path: export the data, analyse it in Dust. Three steps with arrows. */}
        <section className="mt-2 rounded-xl bg-brand-soft/60 p-4 ring-1 ring-brand/30">
          <div className="flex items-center gap-2">
            <DustMark className="h-5 w-5" />
            <p className="text-[15px] font-semibold text-foreground">{fr ? 'Analyser avec Dust' : 'Analyse with Dust'}</p>
            <span className="pill pill-green">{fr ? 'Recommandé' : 'Recommended'}</span>
          </div>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {fr
              ? 'Un agent Dust regroupe les réponses en cas d’usage et en freins, propose un pilote et crée la présentation des résultats.'
              : 'A Dust agent groups the answers into use cases and blockers, proposes a pilot and builds the results presentation.'}
          </p>
          <ol className="mt-3 grid items-stretch gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr]">
            <li className="flex flex-col rounded-lg bg-card p-3 ring-1 ring-border">
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-brand-ink">1 · {fr ? 'Exporter' : 'Export'}</span>
              <span className="mt-1 text-[12px] text-muted-foreground">{fr ? 'Les données anonymes du diagnostic.' : 'The anonymous diagnostic data.'}</span>
              <div className="mt-auto space-y-1.5 pt-2.5">
              {dustToken && (
                <Button size="sm" className="w-full" onClick={sendAnalysisToDust} disabled={sendingAnalysis}>
                  {sendingAnalysis ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
                  {fr ? 'Envoyer à Dust' : 'Send to Dust'}
                </Button>
              )}
              <Button size="sm" variant={dustToken ? 'outline' : 'default'} className="w-full" onClick={() => run('pack')} disabled={loading !== null}>
                {loading === 'pack' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : exported ? <Check className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
                {exported ? (fr ? 'Téléchargé' : 'Downloaded') : fr ? 'Télécharger' : 'Download'}
              </Button>
              </div>
            </li>
            <ArrowRight className="hidden h-4 w-4 self-center text-brand-ink sm:block" aria-hidden />
            <li className="flex flex-col rounded-lg bg-card p-3 ring-1 ring-border">
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-brand-ink">2 · {fr ? 'Déposer dans Dust' : 'Drop into Dust'}</span>
              <span className="mt-1 text-[12px] text-muted-foreground">{fr ? 'Le fichier et la consigne, dans une conversation.' : 'The file and the instruction, in a conversation.'}</span>
              <div className="mt-auto flex gap-1.5 pt-2.5">
                <Button size="sm" variant="outline" onClick={copyPrompt} className="flex-1">
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? (fr ? 'Copiée' : 'Copied') : fr ? 'Consigne' : 'Instruction'}
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <a href="https://dust.tt" target="_blank" rel="noopener noreferrer" aria-label={fr ? 'Ouvrir Dust' : 'Open Dust'}>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
              </div>
            </li>
            <ArrowRight className="hidden h-4 w-4 self-center text-brand-ink sm:block" aria-hidden />
            <li className="flex flex-col rounded-lg bg-card p-3 ring-1 ring-border">
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-brand-ink">3 · {fr ? 'Récupérer' : 'Get back'}</span>
              <span className="mt-1 text-[12px] text-muted-foreground">
                {fr ? 'Cas d’usage, freins et comment les lever, pilote proposé, présentation aux couleurs Dust.' : 'Use cases, blockers and how to remove them, proposed pilot, Dust-branded presentation.'}
              </span>
            </li>
          </ol>
        </section>

        {hubspotCampaignId && <HubspotExportButton campaignId={hubspotCampaignId} participants={participants} fr={fr} />}

        <p className="mt-4 text-[12px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">{fr ? 'Autres exports' : 'Other exports'}</p>
        <div className="mt-2 grid gap-2">
          {options.map(({ kind, icon: Icon, title, body, tag }) => (
            <button
              key={kind}
              type="button"
              onClick={() => run(kind)}
              disabled={loading !== null}
              className={cn(
                'flex items-center gap-3 rounded-lg p-3 text-left ring-1 ring-border transition-colors duration-150',
                'hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60'
              )}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand-ink">
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-[14px] font-semibold text-foreground">
                  {title}
                  {tag && <span className="pill pill-green">{tag}</span>}
                </span>
                <span className="mt-0.5 block text-[12px] text-muted-foreground">{body}</span>
              </span>
              {loading === kind ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <Download className="h-4 w-4 text-muted-foreground" />}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
