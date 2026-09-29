import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';

interface DeleteCampaignDialogProps {
  campaign: { name: string; code: string; answers: number } | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

/** Deleting a campaign removes every answer with it: the code must be typed to confirm. */
export const DeleteCampaignDialog = ({ campaign, onClose, onConfirm }: DeleteCampaignDialogProps) => {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setTyped('');
    setBusy(false);
  }, [campaign?.code]);

  const matches = !!campaign && typed.trim().toUpperCase() === campaign.code.toUpperCase();

  const confirm = async () => {
    if (!matches) return;
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog open={!!campaign} onOpenChange={(open) => !open && !busy && onClose()}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-lg bg-risk-soft">
            <AlertTriangle className="h-4 w-4 text-risk-ink" />
          </div>
          <AlertDialogTitle>{fr ? 'Supprimer cette campagne ?' : 'Delete this campaign?'}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-[13px] leading-relaxed text-muted-foreground">
              <p>
                {fr ? 'Vous allez supprimer ' : 'You are about to delete '}
                <span className="font-semibold text-foreground">{campaign?.name}</span>
                {fr
                  ? `, avec ses ${campaign?.answers ?? 0} participant(s) et toutes leurs réponses. Le lien du questionnaire et le lien privé des résultats cesseront de fonctionner.`
                  : `, with its ${campaign?.answers ?? 0} participant(s) and all their answers. The survey link and the private results link will stop working.`}
              </p>
              <p className="font-medium text-risk-ink">{fr ? 'C’est définitif : rien ne pourra être récupéré.' : 'This is permanent: nothing can be recovered.'}</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="confirm-code" className="text-[13px]">
            {fr ? 'Pour confirmer, tapez le code de la campagne : ' : 'To confirm, type the campaign code: '}
            <span className="mono font-semibold text-foreground">{campaign?.code}</span>
          </Label>
          <Input
            id="confirm-code"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            className="font-mono uppercase tracking-wider"
            onKeyDown={(e) => e.key === 'Enter' && confirm()}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{fr ? 'Annuler' : 'Cancel'}</AlertDialogCancel>
          <Button variant="destructive" disabled={!matches || busy} onClick={confirm}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {fr ? 'Supprimer définitivement' : 'Delete permanently'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
