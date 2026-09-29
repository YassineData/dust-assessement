import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useLanguage } from '@/contexts/LanguageContext';
import { DustWordmark } from '@/components/DustMark';
import { AdminCampaignCreator } from '@/components/AdminCampaignCreator';

const CreateCampaign = () => {
  const { language } = useLanguage();
  const fr = language !== 'en';

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-[780px] items-center justify-between px-4">
          <Link to="/dashboard" className="rounded-md" aria-label="Dust">
            <DustWordmark subtitle="Assessment" />
          </Link>
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard">
                <ArrowLeft className="h-4 w-4" />
                {fr ? 'Retour' : 'Back'}
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[640px] px-4 py-10">
        <p className="eyebrow">{fr ? 'Nouveau déploiement' : 'New rollout'}</p>
        <h1 className="page-title mt-1">{fr ? 'Créer un lien d’évaluation' : 'Create an assessment link'}</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {fr
            ? 'Un lien et un code à envoyer au client. Pas besoin de lister les personnes : elles s’inscrivent en ouvrant le lien.'
            : 'One link and one code to send to the client. No need to list people: they register when they open the link.'}
        </p>
        <div className="card-elevated mt-5 p-5">
          <AdminCampaignCreator />
        </div>
      </main>
    </div>
  );
};

export default CreateCampaign;
