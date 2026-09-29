import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ClipboardList, Lock, ShieldCheck, Sparkles, Timer, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { DustWordmark } from '@/components/DustMark';
import { Reveal } from '@/components/Reveal';
import { useLanguage } from '@/contexts/LanguageContext';

/* The Dust brand shapes (brand guide: circle, arch, square, quarter circles), in brand colors. */
type Shape = 'circle' | 'arch' | 'square' | 'quarterR' | 'quarterL';
const RADIUS: Record<Shape, string> = {
  circle: '9999px',
  arch: '9999px 9999px 0 0',
  square: '0',
  quarterR: '0 100% 0 0',
  quarterL: '100% 0 0 0',
};
const GRID: { shape: Shape; color: string; spin?: boolean }[] = [
  { shape: 'circle', color: '#418B5C' },
  { shape: 'arch', color: '#9FDBFF' },
  { shape: 'quarterR', color: '#1C91FF', spin: true },
  { shape: 'square', color: '#FFC3DF' },
  { shape: 'quarterL', color: '#FE9C1A', spin: true },
  { shape: 'circle', color: '#E2F78C' },
  { shape: 'arch', color: '#FFE262' },
  { shape: 'quarterR', color: '#E14322', spin: true },
  { shape: 'square', color: '#1C91FF' },
];

const ShapeGrid = () => (
  <div className="grid grid-cols-3 gap-2.5 sm:gap-3" aria-hidden="true">
    {GRID.map((g, i) => (
      <div
        key={i}
        className={g.spin ? 'home-shape home-shape-spin' : 'home-shape'}
        style={{ background: g.color, borderRadius: RADIUS[g.shape], '--d': `${i * 90}ms`, '--s': `${i * 1.3}s` } as CSSProperties}
      />
    ))}
  </div>
);

/**
 * Public home page (dust-assessment.com). Readers here are client employees and managers who
 * reached the bare domain: explain the survey, reassure on data, let them enter a code.
 * The internal pitch for the Dust team lives at /internal.
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

  const facts = [
    { icon: Timer, title: L('Less than 5 minutes', 'Moins de 5 minutes'), body: L('A few words about you, five open questions, then 26 quick statements. On a phone or a laptop.', 'Quelques mots sur vous, cinq questions ouvertes, puis 26 affirmations rapides. Sur téléphone ou ordinateur.') },
    { icon: ShieldCheck, title: L('Not an evaluation', 'Pas une évaluation'), body: L('There are no right or wrong answers. Nobody is graded: we look at teams, not at individual performance.', 'Il n’y a pas de bonne ou de mauvaise réponse. Personne n’est noté : on regarde les équipes, pas la performance individuelle.') },
    { icon: Sparkles, title: L('A rollout that fits you', 'Un déploiement qui vous ressemble'), body: L('Your answers decide which teams start first, which agents we build and who we train.', 'Vos réponses décident des équipes qui démarrent, des agents à construire et des personnes à former.') },
  ];

  const steps = [
    { icon: ClipboardList, title: L('You answer', 'Vous répondez'), body: L('Through the link your company shared. Your progress is saved as you go.', 'Via le lien partagé par votre entreprise. Vos réponses sont enregistrées au fil de l’eau.') },
    { icon: Users, title: L('We read the whole team', 'On lit l’ensemble de l’équipe'), body: L('Where AI already helps, where time is lost, who wants to build or to teach.', 'Où l’IA aide déjà, où le temps se perd, qui veut construire ou transmettre.') },
    { icon: ArrowRight, title: L('Your rollout starts', 'Votre déploiement démarre'), body: L('Training, first use cases and support shaped around what your teams told us.', 'Formation, premiers cas d’usage et accompagnement construits sur ce que vos équipes nous ont dit.') },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1080px] items-center justify-between px-4">
          <DustWordmark subtitle={L('AI Readiness Assessment', 'Évaluation de maturité IA')} />
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
              <Link to="/dashboard">
                <Lock className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{L('Dust team', 'Équipe Dust')}</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-[1080px] items-center gap-12 px-4 pb-16 pt-14 sm:pt-20 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-16">
          <div className="home-rise">
            <p className="eyebrow">{L('A Dust survey', 'Un questionnaire Dust')}</p>
            <h1 className="mt-3 text-[38px] font-semibold leading-[1.05] tracking-[-0.02em] text-foreground sm:text-[54px]">
              {L('Help us shape your AI rollout.', 'Aidez-nous à construire votre déploiement IA.')}
            </h1>
            <p className="mt-5 max-w-[560px] text-[16px] leading-relaxed text-muted-foreground sm:text-[17px]">
              {L(
                'Your company is rolling out Dust. This short survey tells us how your teams use AI today, so the rollout fits the way you actually work.',
                'Votre entreprise déploie Dust. Ce court questionnaire nous dit comment vos équipes utilisent l’IA aujourd’hui, pour que le déploiement colle à votre façon de travailler.'
              )}
            </p>

            <form onSubmit={openCode} className="mt-8 max-w-[460px] rounded-xl bg-card p-4 shadow-sm ring-1 ring-border">
              <label htmlFor="home-code" className="text-[13px] font-medium text-foreground">
                {L('Received a code instead of a link?', 'Vous avez reçu un code plutôt qu’un lien ?')}
              </label>
              <div className="mt-2 flex gap-2">
                <Input
                  id="home-code"
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
              <p className="mt-2 text-[12px] text-muted-foreground">
                {L('With a link, just open it: you will land straight on the survey.', 'Avec un lien, ouvrez-le simplement : vous arriverez directement sur le questionnaire.')}
              </p>
            </form>
          </div>

          <div className="mx-auto w-[200px] sm:w-[300px]">
            <ShapeGrid />
          </div>
        </section>

        {/* Three facts */}
        <section className="border-y border-border bg-card">
          <div className="mx-auto grid max-w-[1080px] gap-8 px-4 py-14 md:grid-cols-3">
            {facts.map((f, i) => (
              <Reveal key={f.title} delay={i * 100}>
                <f.icon className="h-5 w-5 text-brand-ink" />
                <h2 className="mt-3 text-[17px] font-semibold text-foreground">{f.title}</h2>
                <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">{f.body}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-[1080px] px-4 py-16">
          <Reveal>
            <p className="eyebrow">{L('How it works', 'Comment ça marche')}</p>
            <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.01em] text-foreground">{L('Five minutes from you, a rollout built around your teams.', 'Cinq minutes de votre temps, un déploiement construit autour de vos équipes.')}</h2>
          </Reveal>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {steps.map((s, i) => (
              <Reveal key={s.title} delay={i * 120}>
                <li className="h-full rounded-xl bg-card p-5 ring-1 ring-border">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-[13px] font-semibold text-white">{i + 1}</span>
                  <h3 className="mt-4 text-[16px] font-semibold text-foreground">{s.title}</h3>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">{s.body}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </section>

        {/* Data */}
        <section className="mx-auto max-w-[1080px] px-4 pb-20">
          <Reveal>
            <div className="grid gap-6 rounded-2xl bg-ink p-7 text-white sm:p-10 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-sky">{L('Your answers', 'Vos réponses')}</p>
                <h2 className="mt-2 text-[24px] font-semibold leading-snug">{L('Only used to plan the rollout.', 'Utilisées uniquement pour préparer le déploiement.')}</h2>
                <p className="mt-3 max-w-[620px] text-[14px] leading-relaxed text-white/75">
                  {L(
                    'Only the Dust team and the person running the project at your company can see them. To have your answers deleted, just ask the person who sent you the link.',
                    'Seules l’équipe Dust et la personne qui pilote le projet chez vous les voient. Pour faire supprimer vos réponses, il suffit de le demander à la personne qui vous a envoyé le lien.'
                  )}
                </p>
              </div>
              <Button asChild variant="secondary" className="justify-self-start">
                <a href="https://dust.tt" target="_blank" rel="noopener noreferrer">
                  {L('Discover Dust', 'Découvrir Dust')}
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-[1080px] flex-wrap items-center justify-between gap-2 px-4 py-6 text-[12px] text-muted-foreground">
          <span>© {new Date().getFullYear()} Dust · {L('AI Readiness Assessment', 'Évaluation de maturité IA')}</span>
          <a href="https://dust.tt" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">dust.tt</a>
        </div>
      </footer>
    </div>
  );
};

export default Home;
