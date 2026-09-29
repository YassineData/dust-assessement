import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DustWordmark } from '@/components/DustMark';
import { useLanguage } from '@/contexts/LanguageContext';

/** Broken or mistyped link. Mostly reached by respondents, so it points to dust.tt, not to the internal landing page. */
const NotFound = () => {
  const { language } = useLanguage();
  const fr = language === 'fr';

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-[780px] items-center px-4">
          <DustWordmark subtitle={fr ? 'Évaluation de maturité IA' : 'AI maturity assessment'} />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-[520px] flex-1 flex-col justify-center px-4 py-16">
        <p className="eyebrow">404</p>
        <h1 className="page-title mt-1">{fr ? 'Ce lien ne fonctionne pas' : 'This link doesn’t work'}</h1>
        <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
          {fr
            ? 'Vérifiez le lien que vous avez reçu (il est peut-être incomplet), ou demandez-le à nouveau à la personne qui vous l’a envoyé.'
            : 'Check the link you received (it may be incomplete), or ask the person who sent it to you for it again.'}
        </p>
        <div className="mt-6">
          <Button asChild>
            <a href="https://dust.tt" target="_blank" rel="noopener noreferrer">
              {fr ? 'Découvrir Dust' : 'Discover Dust'}
              <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </main>
    </div>
  );
};

export default NotFound;
