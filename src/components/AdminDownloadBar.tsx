import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, FileText, Presentation, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { CampaignParticipant } from '@/hooks/useCampaignParticipants';
import { exportCSV } from '@/lib/export-csv';
import { exportWord } from '@/lib/export-word';
import { exportPPT } from '@/lib/export-ppt';
import { toast } from 'sonner';

interface AdminDownloadBarProps {
  participants: CampaignParticipant[];
  companyName: string;
  averageScore: number;
  thematicAverages: { thematic: string; originalThematic: string; score: number }[];
}

export const AdminDownloadBar = ({
  participants,
  companyName,
  averageScore,
  thematicAverages,
}: AdminDownloadBarProps) => {
  const { language } = useLanguage();
  const [loadingType, setLoadingType] = useState<string | null>(null);

  const handleExport = async (type: 'csv' | 'word' | 'ppt') => {
    setLoadingType(type);
    try {
      switch (type) {
        case 'csv':
          exportCSV(participants, companyName, language);
          break;
        case 'word':
          await exportWord(participants, companyName, language, averageScore, thematicAverages);
          break;
        case 'ppt':
          exportPPT(participants, companyName, language, averageScore, thematicAverages);
          break;
      }
      toast.success(language === 'fr' ? 'Export téléchargé !' : 'Export downloaded!');
    } catch (err) {
      console.error('Export error:', err);
      toast.error(language === 'fr' ? 'Erreur lors de l\'export' : 'Export error');
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <div className="card-elevated p-5">
      <h3 className="card-title mb-1">
        {language === 'fr' ? 'Exporter les résultats' : 'Export Results'}
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        {language === 'fr'
          ? 'Téléchargez les résultats de la campagne dans le format de votre choix.'
          : 'Download campaign results in your preferred format.'}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => handleExport('csv')}
          disabled={loadingType !== null}
        >
          {loadingType === 'csv' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
          CSV
        </Button>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => handleExport('word')}
          disabled={loadingType !== null}
        >
          {loadingType === 'word' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
          Word (.docx)
        </Button>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => handleExport('ppt')}
          disabled={loadingType !== null}
        >
          {loadingType === 'ppt' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Presentation className="w-4 h-4" />}
          PowerPoint (.pptx)
        </Button>
      </div>
    </div>
  );
};
