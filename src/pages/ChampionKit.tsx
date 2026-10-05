import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, Copy, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { DustMark } from '@/components/DustMark';
import { useLanguage } from '@/contexts/LanguageContext';
import { AUDIENCE_PARAM, V2_QUESTIONS, type SurveyAudience } from '@/lib/assessment-v2';
import { cn } from '@/lib/utils';

/**
 * One-pager sent to the client's champion before the survey links:
 * what the survey is, why we run it, what we need from them, what they get back, and the links.
 * `variant=deployment` (default) is sent by Deployment / CS at kickoff; `variant=sales` by Sales before the rollout.
 */
type KitVariant = 'deployment' | 'sales';

const ChampionKit = () => {
  const [params] = useSearchParams();
  const { language, setLanguage } = useLanguage();
  // ?lang=fr|en: open the kit in the campaign's language.
  useEffect(() => {
    const l = params.get('lang');
    if (l === 'fr' || l === 'en') setLanguage(l);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const fr = language === 'fr';
  const L = (en: string, frText: string) => (fr ? frText : en);
  const [copied, setCopied] = useState(false);

  const variant: KitVariant = params.get('variant') === 'sales' ? 'sales' : 'deployment';
  const code = (params.get('code') || 'XXXXXXXX').toUpperCase();
  const company = params.get('company') || L('your company', 'votre entreprise');
  // Links always point to production, even when the kit is generated from a local copy.
  const origin = typeof window === 'undefined' || /localhost|127\.0\.0\.1/.test(window.location.hostname) ? 'https://dust-assessment.com' : window.location.origin;
  const linkFor = (a: SurveyAudience) =>
    `${origin}/assessment?lang=${language}&code=${code}${AUDIENCE_PARAM[a] ? `&for=${AUDIENCE_PARAM[a]}` : ''}`;
  const areas = [
    L('AI use today', 'Usage de l’IA aujourd’hui'),
    L('Ability to build agents', 'Capacité à construire des agents'),
    L('Motivation', 'Motivation'),
    L('Will to train others', 'Envie de former les autres'),
    L('Reach across teams', 'Rayonnement entre équipes'),
    L('Governance & trust', 'Gouvernance & confiance'),
    L('Team habits', 'Habitudes d’équipe'),
    L('Work to automate', 'Travail à automatiser'),
  ];

  const intro =
    variant === 'sales'
      ? L(
          `Before ${company}'s rollout starts, we'd like to understand how your teams work with AI today. This short survey helps us scope the deployment around the teams and use cases that will bring the most value.`,
          `Avant le démarrage du déploiement chez ${company}, nous aimerions comprendre comment vos équipes utilisent l'IA aujourd'hui. Ce court questionnaire nous aide à cadrer le déploiement autour des équipes et des cas d'usage qui apporteront le plus de valeur.`
        )
      : L(
          `To prepare ${company}'s kickoff, we'd like to understand how your teams work with AI today. This short survey lets us start the rollout with a clear plan instead of a blank page.`,
          `Pour préparer le kickoff de ${company}, nous aimerions comprendre comment vos équipes utilisent l'IA aujourd'hui. Ce court questionnaire nous permet de démarrer le déploiement avec un plan clair plutôt qu'une page blanche.`
        );

  const sections = [
    {
      title: L('What it is', 'De quoi il s’agit'),
      body: L(
        `A short online survey, less than 5 minutes: ${V2_QUESTIONS.length} short statements plus a few questions about the tools people use and the tasks they would like help with. No account needed, English or French, answers saved as people go.`,
        `Un court questionnaire en ligne, moins de 5 minutes : ${V2_QUESTIONS.length} affirmations courtes et quelques questions sur les outils utilisés et les tâches où l'on aimerait de l'aide. Sans compte, en français ou en anglais, réponses enregistrées au fil de l'eau.`
      ),
    },
    {
      title: L('Why we run it', 'Pourquoi on le fait'),
      body:
        variant === 'sales'
          ? L(
              'So the rollout we propose fits how your teams actually work: which teams to start with, which 2–3 use cases to build first, and what support each team needs.',
              "Pour que le déploiement proposé corresponde à la façon dont vos équipes travaillent : par quelles équipes commencer, quels 2–3 cas d'usage construire d'abord, et quel accompagnement pour chaque équipe."
            )
          : L(
              'So the kickoff starts with the right people and the right use cases: which teams to start with, who can build agents, who will drive adoption, and who needs more support.',
              "Pour que le kickoff démarre avec les bonnes personnes et les bons cas d'usage : par quelles équipes commencer, qui peut construire des agents, qui portera l'adoption, et qui a besoin de plus d'accompagnement."
            ),
    },
    {
      title: L('What we need from you', 'Ce qu’on attend de vous'),
      body: L(
        'Forward the link below to the teams in scope, ideally with a short word from you. Aim for most people to answer within a week; one reminder halfway usually does it. You can follow answers live.',
        "Transférer le lien ci-dessous aux équipes concernées, idéalement avec un petit mot de votre part. L'objectif : que la majorité réponde en une semaine ; une relance à mi-parcours suffit en général. Vous pouvez suivre les réponses en direct."
      ),
    },
    {
      title: L('What you get back', 'Ce que vous obtenez'),
      body:
        variant === 'sales'
          ? L(
              'A readiness snapshot of your organization, by team: where AI is already used, where the quick wins are, and who can lead internally. It shapes the deployment plan we propose to you.',
              "Une photographie de votre organisation, équipe par équipe : où l'IA est déjà utilisée, où sont les gains rapides et qui peut porter le sujet en interne. Elle sert de base au plan de déploiement que nous vous proposons."
            )
          : L(
              'A shared view of the results: where each team stands, your future trainers, builders and champions by name, and the first use cases to build, reviewed together at kickoff. A second pass a few months later measures the progress.',
              'Une vue partagée des résultats : où en est chaque équipe, vos futurs formateurs, builders et champions nommément, et les premiers cas d’usage à construire, revus ensemble au kickoff. Un second passage quelques mois plus tard mesure la progression.'
            ),
    },
  ];

  const forwardMessage = L(
    `Hi all,\n\nDust is our new AI platform. The Dust team wants to learn more about you and what you do, so the rollout fits the way we work.\n\nIt takes less than 5 minutes: ${linkFor('general')}\n\nThanks!`,
    `Bonjour à tous,\n\nDust est notre nouvelle plateforme d'IA. L'équipe Dust veut en savoir plus sur vous et sur ce que vous faites, pour que le déploiement colle à notre façon de travailler.\n\nCela prend moins de 5 minutes : ${linkFor('general')}\n\nMerci !`
  );

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(forwardMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable: the text stays selectable on the page */
    }
  };

  return (
    <div className="min-h-screen bg-background print:bg-white">
      {/* Toolbar (hidden when printing) */}
      <header className="sticky top-0 z-10 border-b border-border bg-card print:hidden">
        <div className="mx-auto flex h-14 max-w-[820px] items-center justify-between gap-3 px-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              {L('Back to the console', 'Retour à la console')}
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <div role="radiogroup" className="hidden gap-1 rounded-full bg-paper p-1 ring-1 ring-border sm:flex">
              {(['deployment', 'sales'] as KitVariant[]).map((v) => {
                const next = new URLSearchParams(params);
                next.set('variant', v);
                return (
                  <Link
                    key={v}
                    to={`/kit?${next.toString()}`}
                    role="radio"
                    aria-checked={variant === v}
                    className={cn(
                      'rounded-full px-3 py-1 text-[12px] font-medium transition-colors',
                      variant === v ? 'bg-ink text-white' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {v === 'sales' ? L('Sales version', 'Version Sales') : L('Deployment / CS version', 'Version Deployment / CS')}
                  </Link>
                );
              })}
            </div>
            <LanguageSwitcher />
            <Button size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              {L('Print / Save as PDF', 'Imprimer / PDF')}
            </Button>
          </div>
        </div>
      </header>

      {/* The one-pager */}
      <main className="mx-auto max-w-[820px] px-4 py-8 print:max-w-none print:p-0">
        <article className="rounded-2xl bg-card p-8 shadow-sm ring-1 ring-border print:rounded-none print:p-0 print:shadow-none print:ring-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <DustMark className="h-6 w-6" />
              <span className="text-[15px] font-semibold text-foreground">Dust</span>
              <span className="h-4 w-px bg-border" aria-hidden />
              <span className="text-[13px] text-muted-foreground">{L('Deployment scoping', 'Cadrage du déploiement')}</span>
            </div>
            <span className="text-[12px] text-muted-foreground">
              {variant === 'sales' ? L('Before the rollout', 'Avant le déploiement') : L('Kickoff preparation', 'Préparation du kickoff')}
            </span>
          </div>

          <h1 className="mt-6 text-[28px] font-semibold leading-tight tracking-tight text-foreground">
            {L(`A short survey to prepare ${company}'s AI rollout`, `Un court questionnaire pour préparer le déploiement IA de ${company}`)}
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-slate">{intro}</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 print:grid-cols-2">
            {sections.map((s) => (
              <section key={s.title} className="rounded-xl bg-paper p-4 ring-1 ring-border print:break-inside-avoid">
                <h2 className="text-[14px] font-semibold text-foreground">{s.title}</h2>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{s.body}</p>
              </section>
            ))}
          </div>

          <section className="mt-6 print:break-inside-avoid">
            <h2 className="text-[14px] font-semibold text-foreground">{L('What we look at', 'Ce qu’on regarde')}</h2>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {areas.map((a) => (
                <span key={a} className="rounded-full bg-paper px-2.5 py-1 text-[12px] text-foreground ring-1 ring-border">{a}</span>
              ))}
            </div>
            <p className="mt-2 text-[12px] text-muted-foreground">
              {L('Plus open questions on time sinks, the tasks people would hand over to an agent, and what could block them.', 'Plus des questions ouvertes sur les pertes de temps, les tâches à confier à un agent et ce qui pourrait bloquer.')}
            </p>
          </section>

          <section className="mt-6 print:break-inside-avoid">
            <h2 className="text-[14px] font-semibold text-foreground">{L('Link to forward', 'Lien à transférer')}</h2>
            <a href={linkFor('general')} className="mt-2 block break-all rounded-xl px-4 py-3 font-mono text-[13px] text-brand-ink ring-1 ring-border underline-offset-2 hover:underline">
              {linkFor('general')}
            </a>
          </section>

          <section className="mt-6 print:break-inside-avoid">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[14px] font-semibold text-foreground">{L('Suggested message for your teams', 'Message suggéré pour vos équipes')}</h2>
              <Button variant="outline" size="sm" className="print:hidden" onClick={copyMessage}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? L('Copied', 'Copié') : L('Copy', 'Copier')}
              </Button>
            </div>
            <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-paper p-4 font-sans text-[13px] leading-relaxed text-foreground ring-1 ring-border">{forwardMessage}</pre>
          </section>

          <p className="mt-6 border-t border-border pt-4 text-[12px] text-muted-foreground">
            {L(
              `Results are shared with the project team at ${company} and with Dust, and only used to plan and follow the rollout. Questions? Reply to the person who sent you this page.`,
              `Les résultats sont partagés avec l'équipe projet de ${company} et avec Dust, et servent uniquement à préparer et suivre le déploiement. Une question ? Répondez à la personne qui vous a envoyé cette page.`
            )}
          </p>
        </article>
      </main>
    </div>
  );
};

export default ChampionKit;
