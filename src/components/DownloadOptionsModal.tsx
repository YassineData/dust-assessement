import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { FileText, FileSpreadsheet, Presentation, FileDown, Loader2, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import type { CampaignParticipant } from '@/hooks/useCampaignParticipants';
import { exportCSV } from '@/lib/export-csv';
import { exportWord } from '@/lib/export-word';
import { exportPPT } from '@/lib/export-ppt';
import { exportSummaryPDF, type SummaryPdfData } from '@/lib/export-pdf';
import { cn } from '@/lib/utils';

type ExportKind = 'pdf' | 'ppt' | 'word' | 'csv';

interface DownloadOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Starting point → people → plan: feeds the one-page PDF and the first slides of the deck. */
  summary: SummaryPdfData | null;
  participants: CampaignParticipant[];
  companyName: string;
  averageScore: number;
  thematicAverages: { thematic: string; originalThematic: string; score: number }[];
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
}: DownloadOptionsModalProps) => {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const [loading, setLoading] = useState<ExportKind | null>(null);

  const options: { kind: ExportKind; icon: typeof FileText; title: string; body: string; tag?: string }[] = [
    {
      kind: 'pdf',
      icon: FileDown,
      title: fr ? 'Synthèse d’une page (PDF)' : 'One-page summary (PDF)',
      body: fr ? 'Point de départ, personnes, plan : à envoyer au client ou à partager en interne.' : 'Starting point, people, plan: to send to the client or share internally.',
      tag: fr ? 'Recommandé' : 'Recommended',
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[17px] font-semibold">{fr ? 'Exporter les résultats' : 'Export results'}</DialogTitle>
          <DialogDescription>
            {fr ? `Campagne ${companyName} · ${participants.filter((p) => p.status === 'completed').length} réponses` : `${companyName} campaign · ${participants.filter((p) => p.status === 'completed').length} answers`}
          </DialogDescription>
        </DialogHeader>
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
