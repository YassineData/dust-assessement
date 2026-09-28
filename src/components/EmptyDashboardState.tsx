import { Users, ClipboardList } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface EmptyDashboardStateProps {
  type: 'overview' | 'participants' | 'compare';
}

export const EmptyDashboardState = ({ type }: EmptyDashboardStateProps) => {
  const { language } = useLanguage();

  const messages = {
    overview: {
      icon: ClipboardList,
      title: language === 'fr' ? "Aucun résultat disponible" : "No results available",
      description: language === 'fr' 
        ? "Les résultats apparaîtront ici dès que les premiers participants auront complété le quiz."
        : "Results will appear here as soon as the first participants complete the quiz."
    },
    participants: {
      icon: Users,
      title: language === 'fr' ? "Aucun participant" : "No participants",
      description: language === 'fr'
        ? "La liste des participants s'affichera ici une fois qu'ils auront complété le quiz."
        : "The list of participants will appear here once they complete the quiz."
    },
    compare: {
      icon: ClipboardList,
      title: language === 'fr' ? "Pas encore de données" : "No data yet",
      description: language === 'fr'
        ? "Les graphiques comparatifs seront disponibles dès que des participants auront complété le quiz."
        : "Comparative charts will be available once participants have completed the quiz."
    }
  };

  const { icon: Icon, title, description } = messages[type];

  return (
    <div className="card-elevated px-6 py-12 text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-muted">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <h3 className="card-title mb-1">{title}</h3>
      <p className="mx-auto max-w-md text-[13px] text-muted-foreground">{description}</p>
    </div>
  );
};
