import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useLanguage } from '@/contexts/LanguageContext';

interface DeleteParticipantDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  participantName: string;
}

export const DeleteParticipantDialog = ({
  isOpen,
  onClose,
  onConfirm,
  participantName,
}: DeleteParticipantDialogProps) => {
  const { language } = useLanguage();

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {language === 'fr' ? `Supprimer les réponses de ${participantName} ?` : `Delete ${participantName}'s answers?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {language === 'fr'
              ? `Ses réponses et son score seront supprimés définitivement, sans retour possible. Les réponses des autres personnes ne changent pas, et les résultats se recalculent sans les siennes.`
              : `Their answers and score will be permanently deleted and cannot be restored. Other people's answers are not affected, and the results are recalculated without theirs.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            {language === 'fr' ? 'Annuler' : 'Cancel'}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {language === 'fr' ? 'Supprimer définitivement' : 'Delete permanently'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
