import { useState, type CSSProperties } from 'react';
import { ArrowRight, LogIn, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { DustWordmark } from '@/components/DustMark';
import { useLanguage } from '@/contexts/LanguageContext';

/* The Dust brand shapes (brand guide), as a small accent. */
type Shape = 'circle' | 'arch' | 'square' | 'quarterR' | 'quarterL';
const RADIUS: Record<Shape, string> = {
  circle: '9999px',
  arch: '9999px 9999px 0 0',
  square: '0',
  quarterR: '0 100% 0 0',
  quarterL: '100% 0 0 0',
};
const ROW: { shape: Shape; color: string }[] = [
  { shape: 'circle', color: '#418B5C' },
  { shape: 'arch', color: '#9FDBFF' },
  { shape: 'square', color: '#FFC3DF' },
  { shape: 'quarterR', color: '#1C91FF' },
  { shape: 'quarterL', color: '#FE9C1A' },
];
const ShapeRow = () => (
  <div className="flex gap-1.5" aria-hidden="true">
    {ROW.map((g, i) => (
      <div key={i} className="home-shape h-4 w-4" style={{ background: g.color, borderRadius: RADIUS[g.shape], '--d': `${i * 80}ms` } as CSSProperties} />
    ))}
  </div>
);

/**
 * Public home page (dust-assessment.com), kept deliberately lean: what the survey is, what it looks at,
 * what the company gets, how it runs, and one clear way to start. Respondents normally arrive straight on
 * the survey through their link; the internal pitch for the Dust team lives at /internal.
 */
const Home = () => {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const L = (en: string, frText: string) => (fr ? frText : en);
  const [code, setCode] = useState('');

  const openCode = (e: React.FormEvent) => {
    e.preventDefault();
    const c = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    // Full page load so the startup checks (demo vs real campaign) run for this code.
    if (c) window.location.assign(`/assessment?lang=${language}&code=${c}`);
  };

  const dimensions = [
    { color: '#1C91FF', name: L('AI use today', 'Usage de l’IA aujourd’hui'), body: L('How much AI is already in their week.', 'La place de l’IA dans leur semaine.') },
    { color: '#9FDBFF', name: L('Ability to build', 'Capacité à construire'), body: L('Who can set up and connect an agent.', 'Qui sait configurer et connecter un agent.') },
    { color: '#418B5C', name: L('Motivation', 'Motivation'), body: L('Appetite to get good at it.', 'L’envie de progresser.') },
    { color: '#E2F78C', name: L('Will to train others', 'Envie de former'), body: L('Who could coach their colleagues.', 'Qui pourrait accompagner ses collègues.') },
    { color: '#FFC3DF', name: L('Reach across teams', 'Rayonnement'), body: L('Whether their work gets reused by others.', 'Si leur travail est repris par d’autres.') },
    { color: '#FE9C1A', name: L('Governance & trust', 'Gouvernance & confiance'), body: L('Clarity on rules and data.', 'Clarté sur les règles et les données.') },
    { color: '#FFE262', name: L('Team habits', 'Habitudes d’équipe'), body: L('Whether teams share how they work.', 'Si les équipes partagent leurs méthodes.') },
    { color: '#E14322', name: L('Work to automate', 'Travail à automatiser'), body: L('Repetitive tasks an agent could take.', 'Les tâches répétitives qu’un agent pourrait prendre.') },
  ];

  const outputs = [
    { n: 1, title: L('Where your teams stand', 'Où en sont vos équipes'), body: L('A score per team and per area, compared with other Dust rollouts.', 'Un score par équipe et par domaine, comparé aux autres déploiements Dust.') },
    { n: 2, title: L('Who can lead the rollout', 'Qui peut porter le déploiement'), body: L('By name: future trainers, builders, champions and sponsors.', 'Nommément : futurs formateurs, builders, champions et sponsors.') },
    { n: 3, title: L('What to build first', 'Quoi construire en premier'), body: L('The first use cases and agents, taken from what your teams wrote.', 'Les premiers cas d’usage et agents, tirés de ce que vos équipes ont écrit.') },
  ];

  const steps = [
    { title: L('You get a one-pager and a ready-to-send message', 'Vous recevez un one-pager et un message prêt à envoyer'), body: L('From your Dust contact, with your survey link inside.', 'De la part de votre contact Dust, avec votre lien.') },
    { title: L('Your teams answer', 'Vos équipes répondent'), body: L('Less than 5 minutes, no account, on a phone or a laptop.', 'Moins de 5 minutes, sans compte, sur mobile ou ordinateur.') },
    { title: L('We review the results together', 'On revoit les résultats ensemble'), body: L('A short readout with Dust that shapes your kickoff.', 'Une courte restitution avec Dust, qui prépare votre kickoff.') },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/70">
        <div className="mx-auto flex h-14 max-w-[1040px] items-center justify-between px-4">
          <DustWordmark subtitle={L('Deployment scoping', 'Cadrage du déploiement')} />
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
              <a href="/login">
                <LogIn className="h-3.5 w-3.5" />
                {L('Sign in', 'Connexion')}
              </a>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1040px] px-4">
        {/* Hero: what it is + the one way to start */}
        <section className="grid gap-10 py-14 sm:py-20 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-center">
          <div className="home-rise">
            <ShapeRow />
            <h1 className="mt-6 text-[36px] font-semibold leading-[1.08] tracking-[-0.02em] text-foreground sm:text-[50px]">
              {L('A 5-minute survey to plan your Dust rollout.', 'Un questionnaire de 5 minutes pour préparer votre déploiement Dust.')}
            </h1>
            <p className="mt-5 max-w-[560px] text-[16px] leading-relaxed text-muted-foreground sm:text-[17px]">
              {L(
                'Your teams answer once. You get a clear picture of where they stand, who can lead the rollout, and what to build first.',
                'Vos équipes répondent une fois. Vous obtenez une vue claire : où elles en sont, qui peut porter le déploiement, et quoi construire en premier.'
              )}
            </p>
          </div>

          <form onSubmit={openCode} className="home-rise rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border" style={{ animationDelay: '150ms' }}>
            <h2 className="text-[18px] font-semibold text-foreground">{L('Start the survey', 'Commencer le questionnaire')}</h2>
            <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">
              {L('Got a link from your company? Just open it. Otherwise, enter your code:', 'Vous avez reçu un lien ? Ouvrez-le simplement. Sinon, entrez votre code :')}
            </p>
            <div className="mt-4 flex gap-2">
              <Input
                aria-label={L('Survey code', 'Code du questionnaire')}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={L('E.g. ACME1234', 'Ex : ACME1234')}
                autoComplete="off"
                className="font-mono uppercase tracking-wider placeholder:font-sans placeholder:normal-case placeholder:tracking-normal"
              />
              <Button type="submit" disabled={!code.trim()}>
                {L('Start', 'Commencer')}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-5 border-t border-border pt-4 text-[13px] text-muted-foreground">
              {L('Leading the rollout? ', 'Vous pilotez le déploiement ? ')}
              <a href="/results?key=demo-velor119" className="font-medium text-brand-ink hover:underline">
                {L('See sample results', 'Voir un exemple de résultats')}
              </a>
              {' · '}
              <a href={`/assessment?preview=1&lang=${language}`} className="font-medium text-brand-ink hover:underline">
                {L('preview the survey', 'voir le questionnaire')}
              </a>
            </div>
          </form>
        </section>

        {/* What we look at */}
        <section className="border-t border-border py-14">
          <p className="eyebrow">{L('What we look at', 'Ce qu’on regarde')}</p>
          <h2 className="mt-2 text-[26px] font-semibold tracking-[-0.01em] text-foreground">
            {L('8 areas, from today’s AI use to the work worth automating.', '8 domaines, de l’usage de l’IA aujourd’hui au travail à automatiser.')}
          </h2>
          <ul className="mt-8 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
            {dimensions.map((d) => (
              <li key={d.name} className="flex gap-3">
                <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
                <div>
                  <p className="text-[15px] font-semibold text-foreground">{d.name}</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{d.body}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-[13px] text-muted-foreground">
            {L('Plus 5 open questions on time sinks, use cases and blockers.', 'Plus 5 questions ouvertes sur les pertes de temps, les cas d’usage et les blocages.')}
          </p>
        </section>

        {/* What you get */}
        <section className="border-t border-border py-14">
          <p className="eyebrow">{L('What you get', 'Ce que vous obtenez')}</p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {outputs.map((o) => (
              <div key={o.n} className="rounded-xl bg-card p-5 ring-1 ring-border">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-[12px] font-semibold text-white">{o.n}</span>
                <h3 className="mt-3 text-[16px] font-semibold text-foreground">{o.title}</h3>
                <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">{o.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="border-t border-border py-14">
          <p className="eyebrow">{L('How it works', 'Comment ça se passe')}</p>
          <ol className="mt-6 grid gap-6 md:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.title} className="flex gap-3">
                <span className="text-[28px] font-semibold leading-none text-brand">{i + 1}</span>
                <div>
                  <h3 className="text-[15px] font-semibold text-foreground">{s.title}</h3>
                  <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-10 flex items-start gap-2 rounded-lg bg-card px-4 py-3 text-[13px] leading-relaxed text-muted-foreground ring-1 ring-border">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-ink" />
            {L(
              'Not an evaluation of anyone. Only the Dust team and your project lead see the answers, and anyone can ask for theirs to be deleted.',
              'Ce n’est l’évaluation de personne. Seuls l’équipe Dust et votre chef de projet voient les réponses, et chacun peut demander la suppression des siennes.'
            )}
          </p>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-[1040px] flex-wrap items-center justify-between gap-2 px-4 py-6 text-[12px] text-muted-foreground">
          <span>© {new Date().getFullYear()} Dust · {L('Deployment scoping', 'Cadrage du déploiement')}</span>
          <a href="https://dust.tt" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">dust.tt</a>
        </div>
      </footer>
    </div>
  );
};

export default Home;
