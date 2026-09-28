import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface DownloadOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownloadBilan: () => void;
}

export const DownloadOptionsModal = ({ 
  isOpen, 
  onClose, 
  onDownloadBilan 
}: DownloadOptionsModalProps) => {
  const { t } = useLanguage();
  const [isSelected, setIsSelected] = useState(false);

  const handleConfirm = () => {
    if (isSelected) {
      onDownloadBilan();
      onClose();
      setIsSelected(false);
    }
  };

  const handleClose = () => {
    onClose();
    setIsSelected(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{t('downloadModal.title')}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {t('downloadModal.description')}
          </p>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm font-semibold text-foreground mb-3">{t('downloadModal.reportLabel')}</p>
          <button
            onClick={() => setIsSelected(!isSelected)}
            className={cn(
              "relative w-full p-4 rounded-lg border-2 text-left transition-all",
              "hover:border-primary/50 hover:bg-muted/50",
              isSelected 
                ? "border-primary bg-primary/5" 
                : "border-border bg-card"
            )}
          >
            {isSelected && (
              <div className="absolute top-3 right-3 w-5 h-5 rounded bg-primary flex items-center justify-center">
                <Check className="w-3 h-3 text-primary-foreground" />
              </div>
            )}
            <FileText className={cn(
              "w-8 h-8 mb-3",
              isSelected ? "text-primary" : "text-muted-foreground"
            )} />
            <h3 className="font-semibold text-foreground mb-1">
              {t('downloadModal.campaignSummary')}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t('downloadModal.campaignSummaryDesc')}
            </p>
          </button>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose}>
            {t('common.cancel')}
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!isSelected}
            className=""
          >
            {t('common.download')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
