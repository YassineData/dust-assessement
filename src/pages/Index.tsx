import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, ClipboardList, Link2, MousePointerClick, X, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useLanguage } from '@/contexts/LanguageContext';
import { DustWordmark } from '@/components/DustMark';
import { enterDemo } from '@/demo/demo-data';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

const Reveal = ({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={cn('lp-reveal', inView && 'is-visible', className)} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
};

/** The pitch film (public/film), embedded as a player. It reports its height so the frame never scrolls. */
const FilmPlayer = ({ title }: { title: string }) => {
  const [height, setHeight] = useState<number | null>(null);
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === 'dust-film-height' && typeof e.data.h === 'number') setHeight(e.data.h);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);
  return (
    <div className="rounded-2xl bg-ink p-2 shadow-2xl ring-1 ring-black/10 sm:p-3">
      <iframe
        src="/film/index.html?embed=1"
        title={title}
        loading="lazy"
        allow="fullscreen; autoplay"
        allowFullScreen
        className="block w-full border-0"
        style={{ height: height ?? undefined, aspectRatio: height ? undefined : '16 / 10' }}
      />
    </div>
  );
};

const RoiCalculator = ({ fr }: { fr: boolean }) => {
  const [v, setV] = useState({ deploys: 15, disc: 8, champ: 4, qbr: 3, rate: 90 });
  const per = v.disc + v.champ + v.qbr;
  const quarter = per * v.deploys;
  const eur = quarter * v.rate;
  const n = (x: number) => Math.round(x).toLocaleString(fr ? 'fr-FR' : 'en-US');

  const fields: { key: keyof typeof v; label: string; step: number }[] = [
    { key: 'deploys', label: fr ? 'Déploiements par trimestre' : 'Deployments per quarter', step: 1 },
    { key: 'disc', label: fr ? 'Heures de discovery économisées' : 'Discovery hours saved', step: 0.5 },
    { key: 'champ', label: fr ? 'Heures de recherche de champions' : 'Champion-search hours saved', step: 0.5 },
    { key: 'qbr', label: fr ? 'Heures de préparation QBR' : 'QBR prep hours saved', step: 0.5 },
    { key: 'rate', label: fr ? 'Coût horaire chargé (€)' : 'Loaded cost per hour (€)', step: 5 },
  ];

  return (
    <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_340px]">
      <div className="rounded-2xl bg-card p-6 ring-1 ring-border">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map((f) => (
            <label key={f.key} className="grid gap-1.5 text-[13px] text-muted-foreground">
              {f.label}
              <input
                type="number"
                min={0}
                step={f.step}
                value={v[f.key]}
                onChange={(e) => {
                  const x = parseFloat(e.target.value);
                  setV((s) => ({ ...s, [f.key]: Number.isFinite(x) && x >= 0 ? x : 0 }));
                }}
                className="h-10 rounded-lg border border-border bg-paper px-3 text-[15px] font-medium tabular-nums text-foreground outline-none focus-visible:ring-2 focus-visible:ring-brand"
              />
            </label>
          ))}
        </div>
        <p className="mt-4 text-[12px] leading-relaxed text-muted-foreground">
          {fr
            ? 'Heures par déploiement. Hypothèses de travail, pas des résultats mesurés : remplacez-les par les vrais chiffres de l’équipe.'
            : 'Hours are per deployment. Working hypotheses, not measured results: replace them with the team’s real numbers.'}
        </p>
      </div>
      <div className="flex flex-col justify-between rounded-2xl bg-lime p-6 text-ink">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em]">{fr ? 'Temps rendu par trimestre' : 'Time back per quarter'}</p>
          <p className="mt-2 text-[52px] font-bold leading-none tracking-tight tabular-nums">{n(quarter)} h</p>
          <p className="mt-2 text-[14px] font-medium">{fr ? `≈ ${n(quarter / 8)} jours d’équipe` : `≈ ${n(quarter / 8)} team days`}</p>
        </div>
        <div className="mt-6 border-t border-ink/15 pt-4">
          <p className="text-[34px] font-bold leading-none tracking-tight tabular-nums">€{n(eur)}</p>
          <p className="mt-1.5 text-[13px] font-medium">{fr ? `par trimestre · €${n(eur * 4)} par an` : `per quarter · €${n(eur * 4)} per year`}</p>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Page                                                                  */
/* ------------------------------------------------------------------ */

const Index = () => {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const L = (en: string, frText: string) => (fr ? frText : en);

  const today = [
    L('We guess where teams stand with AI', 'On devine où en sont les équipes avec l’IA'),
    L('Use cases are discovered call after call', 'Les cas d’usage se découvrent call après call'),
    L('Champions are found by chance', 'Les champions se trouvent au hasard'),
    L('Training stays generic', 'Les formations restent génériques'),
    L('Impact is hard to prove at renewal', 'L’impact est difficile à prouver au renouvellement'),
  ];
  const withIt = [
    L('Maturity by team, before kickoff', 'La maturité par équipe, avant le kickoff'),
    L('The 2–3 use cases to push first', 'Les 2–3 cas d’usage à pousser d’abord'),
    L('Trainers & champions known on day one', 'Formateurs et champions connus dès le jour 1'),
    L('Onboarding adapted to each profile', 'Un onboarding adapté à chaque profil'),
    L('A baseline to re-measure: 53 → 78', 'Une baseline à remesurer : 53 → 78'),
  ];

  const teams = [
    {
      name: 'ADS / Deployment',
      dot: 'bg-brand',
      items: [L('Start with a clear plan', 'Démarrer avec un plan clair'), L('Find champions fast', 'Trouver vite les champions'), L('A repeatable playbook', 'Un playbook répétable')],
    },
    {
      name: 'Customer Success',
      dot: 'bg-ok',
      items: [L('A before / after baseline', 'Une baseline avant / après'), L('Spot teams that need help', 'Repérer les équipes en difficulté'), L('QBRs & renewals backed by data', 'QBR et renouvellements chiffrés')],
    },
    {
      name: 'Sales',
      dot: 'bg-pink-ink',
      items: [L('Richer handoff context', 'Un handoff plus riche'), L('Early view of account potential', 'Le potentiel du compte, tôt'), L('Expansion signals', 'Des signaux d’expansion')],
    },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border/70 bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1100px] items-center justify-between gap-3 px-4 md:px-6">
          <Link to="/" className="rounded-md" aria-label="Dust">
            <DustWordmark subtitle="Assessment" />
          </Link>
          <nav className="hidden items-center gap-6 text-[13px] text-muted-foreground md:flex">
            <a href="#film" className="transition-colors hover:text-foreground">{L('Watch', 'Vidéo')}</a>
            <a href="#why" className="transition-colors hover:text-foreground">{L('Why', 'Pourquoi')}</a>
            <a href="#roi" className="transition-colors hover:text-foreground">ROI</a>
            <a href="#teams" className="transition-colors hover:text-foreground">{L('Teams', 'Équipes')}</a>
          </nav>
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
              <Link to="/dashboard">{L('Sign in', 'Se connecter')}</Link>
            </Button>
            <Button size="sm" onClick={enterDemo}>
              <MousePointerClick className="h-4 w-4" />
              {L('Try it', 'Essayer')}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero + film */}
      <section className="relative isolate">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="lp-blob absolute -left-24 top-10 h-72 w-72 rounded-full bg-pink opacity-50 blur-3xl" />
          <div className="lp-blob absolute right-[-60px] top-[-40px] h-80 w-80 rounded-full bg-sky opacity-60 blur-3xl" style={{ animationDelay: '-6s' }} />
          <div className="lp-blob absolute bottom-40 left-1/3 h-72 w-72 rounded-full bg-lime opacity-50 blur-3xl" style={{ animationDelay: '-11s' }} />
        </div>

        <div className="mx-auto max-w-[1100px] px-4 pb-16 pt-14 text-center md:px-6 lg:pt-20">
          <span className="lp-pop inline-flex items-center gap-2 rounded-full bg-card/80 px-3 py-1 text-[12px] font-medium text-foreground shadow-sm ring-1 ring-border">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white"><Zap className="h-3 w-3" /></span>
            {L('Internal · AI Maturity Assessment', 'Interne · AI Maturity Assessment')}
          </span>
          <h1 className="lp-pop mx-auto mt-5 max-w-3xl text-[40px] font-semibold leading-[1.05] tracking-[-0.03em] text-foreground sm:text-[56px]" style={{ animationDelay: '0.1s' }}>
            {L('Deploy with data, ', 'Déployer avec la donnée, ')}
            <span className="relative inline-block">
              <span className="relative z-10">{L('not guesswork.', 'pas à l’intuition.')}</span>
              <span className="lp-grow absolute inset-x-0 bottom-1 z-0 h-4 rounded-sm bg-lime" style={{ animationDelay: '0.9s' }} />
            </span>
          </h1>
          <p className="lp-pop mx-auto mt-5 max-w-2xl text-[17px] leading-relaxed text-slate" style={{ animationDelay: '0.2s' }}>
            {L(
              'An 8-minute survey sent before kickoff: team maturity, champions, priority use cases, and a baseline to measure progress.',
              'Un questionnaire de 8 minutes envoyé avant le kickoff : maturité des équipes, champions, cas d’usage prioritaires et une baseline pour mesurer la progression.'
            )}
          </p>
          <div className="lp-pop mt-7 flex flex-col justify-center gap-2 sm:flex-row" style={{ animationDelay: '0.3s' }}>
            <Button size="lg" className="h-11 px-6 text-[14px]" onClick={enterDemo}>
              <MousePointerClick className="h-4 w-4" />
              {L('Try the platform', 'Tester la plateforme')}
            </Button>
            <Button size="lg" variant="outline" className="h-11 bg-card/80 px-6 text-[14px]" asChild>
              <Link to="/exemple">
                <ClipboardList className="h-4 w-4" />
                {L('Take the 8-min survey', 'Répondre au questionnaire (8 min)')}
              </Link>
            </Button>
          </div>
          <p className="lp-pop mt-3 text-[13px] text-muted-foreground" style={{ animationDelay: '0.35s' }}>
            {L('Opens the live console with sample data from fictional companies. Nothing to install, no sign-in.', 'Ouvre la vraie console avec des données fictives. Rien à installer, sans connexion.')}
          </p>

          <div id="film" className="lp-pop mt-12 scroll-mt-20 text-left" style={{ animationDelay: '0.45s' }}>
            <FilmPlayer title={L('AI Maturity Assessment: pitch and demo', 'AI Maturity Assessment : pitch et démo')} />
            <p className="mt-3 text-center text-[13px] text-muted-foreground">
              {L('Watch the 2 min 30 video: pitch, product walkthrough and ROI · voice-over, subtitles available', 'Vidéo de 2 min 30 : pitch, présentation du produit et ROI · voix off, sous-titres disponibles')}
            </p>
          </div>
        </div>
      </section>

      {/* Why: today vs with the assessment */}
      <section id="why" className="scroll-mt-16 border-t border-border bg-card">
        <div className="mx-auto max-w-[1100px] px-4 py-16 md:px-6">
          <Reveal className="max-w-2xl">
            <p className="eyebrow">{L('Why', 'Pourquoi')}</p>
            <h2 className="mt-2 text-[30px] font-semibold leading-tight tracking-tight text-foreground">
              {L('From artisanal deployments to data-guided ones.', 'D’un déploiement artisanal à un déploiement guidé par la donnée.')}
            </h2>
          </Reveal>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <Reveal>
              <div className="h-full rounded-2xl bg-paper p-6 ring-1 ring-border">
                <p className="eyebrow">{L('Today', 'Aujourd’hui')}</p>
                <ul className="mt-3 divide-y divide-border">
                  {today.map((t) => (
                    <li key={t} className="flex items-center gap-3 py-3 text-[15px] text-muted-foreground">
                      <X className="h-4 w-4 shrink-0 text-risk" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div className="h-full rounded-2xl bg-ink p-6 text-white">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-sky">{L('With the assessment', 'Avec l’assessment')}</p>
                <ul className="mt-3 divide-y divide-white/10">
                  {withIt.map((t) => (
                    <li key={t} className="flex items-center gap-3 py-3 text-[15px] font-medium">
                      <Check className="h-4 w-4 shrink-0 text-lime" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ROI */}
      <section id="roi" className="mx-auto max-w-[1100px] scroll-mt-16 px-4 py-16 md:px-6">
        <Reveal className="max-w-2xl">
          <p className="eyebrow">{L('Why push it: the ROI', 'Pourquoi pousser : le ROI')}</p>
          <h2 className="mt-2 text-[30px] font-semibold leading-tight tracking-tight text-foreground">
            {L('Hours back on every deployment.', 'Des heures gagnées sur chaque déploiement.')}
          </h2>
          <p className="mt-2 text-[15px] text-muted-foreground">
            {L('Plus what doesn’t fit in a calculator: faster time-to-value, proof for renewals, expansion signals.', 'Et ce qui ne rentre pas dans un calcul : une valeur plus rapide, des preuves pour les renouvellements, des signaux d’expansion.')}
          </p>
        </Reveal>
        <Reveal>
          <RoiCalculator fr={fr} />
        </Reveal>
      </section>

      {/* Teams */}
      <section id="teams" className="scroll-mt-16 border-t border-border bg-card">
        <div className="mx-auto max-w-[1100px] px-4 py-16 md:px-6">
          <Reveal className="max-w-2xl">
            <p className="eyebrow">{L('Value for the Dust team', 'Valeur pour l’équipe Dust')}</p>
            <h2 className="mt-2 text-[30px] font-semibold leading-tight tracking-tight text-foreground">{L('One tool, three teams.', 'Un outil, trois équipes.')}</h2>
          </Reveal>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {teams.map((t, i) => (
              <Reveal key={t.name} delay={i * 100}>
                <div className="h-full rounded-2xl bg-paper p-6 ring-1 ring-border">
                  <h3 className="text-[17px] font-semibold tracking-tight text-foreground">{t.name}</h3>
                  <ul className="mt-3 space-y-2">
                    {t.items.map((it) => (
                      <li key={it} className="flex items-center gap-2.5 text-[14px] text-foreground">
                        <span className={cn('h-2 w-2 shrink-0 rounded-sm', t.dot)} />
                        {it}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Proposal */}
      <section className="border-t border-border">
        <Reveal className="mx-auto max-w-[900px] px-4 py-20 text-center md:px-6">
          <p className="eyebrow">{L('Not a heavy audit. Not another form.', 'Pas un audit lourd. Pas un énième formulaire.')}</p>
          <h2 className="mt-3 text-[34px] font-semibold leading-tight tracking-tight text-foreground sm:text-[40px]">
            {L('Proposal: run it on the next 3 kickoffs.', 'Proposition : le tester sur les 3 prochains kickoffs.')}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[15px] text-muted-foreground">
            {L('We measure prep time, time to first champion, and the score at month 3.', 'On mesure le temps de préparation, le délai du premier champion et le score au 3e mois.')}
          </p>
          <div className="mt-8 flex flex-col justify-center gap-2 sm:flex-row">
            <Button size="lg" className="h-11 px-6 text-[14px]" asChild>
              <Link to="/create-campaign">
                <Link2 className="h-4 w-4" />
                {L('Create a client link', 'Créer un lien client')}
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-11 px-6 text-[14px]" onClick={enterDemo}>
              {L('Try the platform', 'Tester la plateforme')}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-6">
        <div className="mx-auto flex max-w-[1100px] flex-col items-center justify-between gap-3 px-4 text-[12px] text-muted-foreground sm:flex-row md:px-6">
          <DustWordmark />
          <p>{L('© 2026 Dust · AI Maturity Assessment · internal tool', '© 2026 Dust · AI Maturity Assessment · outil interne')}</p>
          <div className="flex items-center gap-4">
            <Link to="/assessment" className="transition-colors hover:text-foreground">{L('Take the assessment', 'Répondre au questionnaire')}</Link>
            <Link to="/dashboard" className="transition-colors hover:text-foreground">{L('Sign in', 'Connexion')}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
