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
            {language === 'fr' ? 'Supprimer le résultat ?' : 'Delete result?'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {language === 'fr'
              ? `Êtes-vous sûr de vouloir supprimer définitivement le résultat de ${participantName} ? Cette action est irréversible.`
              : `Are you sure you want to permanently delete the result of ${participantName}? This action cannot be undone.`}
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
            {language === 'fr' ? 'Supprimer' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
