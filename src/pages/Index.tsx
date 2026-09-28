import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Check,
  ClipboardList,
  GraduationCap,
  LineChart,
  Link2,
  PlayCircle,
  RefreshCw,
  Sparkles,
  Target,
  X,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useLanguage } from '@/contexts/LanguageContext';
import { DustWordmark } from '@/components/DustMark';
import { DIMENSIONS, RESULT_CLASSES } from '@/lib/assessment-v2';
import { PROFILE_COLORS } from '@/lib/profile-style';
import { enterDemo } from '@/demo/demo-data';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* Motion helpers                                                       */
/* ------------------------------------------------------------------ */

const useInView = <T extends HTMLElement>(threshold = 0.2) => {
  const ref = useRef<T>(null);
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
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, inView };
};

const Reveal = ({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) => {
  const { ref, inView } = useInView<HTMLDivElement>(0.15);
  return (
    <div ref={ref} className={cn('lp-reveal', inView && 'is-visible', className)} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
};

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const SectionHead = ({ eyebrow, title, sub, dark }: { eyebrow: string; title: string; sub?: string; dark?: boolean }) => (
  <Reveal className="max-w-2xl">
    <p className={cn('eyebrow', dark && 'text-sky')}>{eyebrow}</p>
    <h2 className={cn('mt-2 text-[32px] font-semibold leading-tight tracking-tight', dark ? 'text-white' : 'text-foreground')}>{title}</h2>
    {sub && <p className={cn('mt-3 text-[15px] leading-relaxed', dark ? 'text-white/70' : 'text-muted-foreground')}>{sub}</p>}
  </Reveal>
);

/* ------------------------------------------------------------------ */
/* Hero product mock (animated)                                          */
/* ------------------------------------------------------------------ */

const HeroMock = ({ fr }: { fr: boolean }) => {
  const [score, setScore] = useState(0);
  useEffect(() => {
    if (reducedMotion()) {
      setScore(78);
      return;
    }
    let raf = 0;
    const start = performance.now() + 400;
    const tick = (now: number) => {
      const p = Math.max(0, Math.min(1, (now - start) / 1600));
      setScore(Math.round(78 * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const r = 42;
  const c = 2 * Math.PI * r;
  const bars = [
    { name: fr ? 'Pratique de l’IA' : 'AI fluency', v: 79, bench: 67 },
    { name: fr ? 'Motivation' : 'Motivation', v: 81, bench: 71 },
    { name: fr ? 'Capacité à construire' : 'Builder depth', v: 78, bench: 60 },
    { name: fr ? 'Posture de formateur' : 'Teaching posture', v: 48, bench: 55 },
  ];

  return (
    <div className="relative">
      <div className="lp-pop absolute -left-6 top-10 z-20 hidden sm:block" style={{ animationDelay: '1.4s' }}>
        <div className="lp-float rounded-lg bg-card px-3 py-2 shadow-xl ring-1 ring-border">
          <p className="flex items-center gap-2 text-[12px] font-semibold text-foreground">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-soft text-brand-ink"><GraduationCap className="h-3.5 w-3.5" /></span>
            {fr ? '67 formateurs potentiels' : '67 peer trainers found'}
          </p>
        </div>
      </div>
      <div className="lp-pop absolute -right-4 bottom-16 z-20 hidden sm:block" style={{ animationDelay: '1.9s' }}>
        <div className="lp-float rounded-lg bg-card px-3 py-2 shadow-xl ring-1 ring-border" style={{ animationDelay: '-3s' }}>
          <p className="flex items-center gap-2 text-[12px] font-semibold text-foreground">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-lime text-ink"><BadgeCheck className="h-3.5 w-3.5" /></span>
            {fr ? 'Pilote 53 → déploiement 78' : 'Pilot 53 → rollout 78'}
          </p>
        </div>
      </div>

      <div className="lp-pop relative z-10 overflow-hidden rounded-2xl bg-card shadow-2xl ring-1 ring-border" style={{ animationDelay: '0.2s' }}>
        <div className="flex items-center gap-1.5 border-b border-border bg-paper px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-risk/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-warn/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-ok/70" />
          <span className="ml-3 truncate text-[11px] text-muted-foreground">Veloria Santé · {fr ? 'Vue d’ensemble' : 'Overview'}</span>
          <span className="ml-auto flex items-center gap-1.5 text-[11px] font-medium text-ok-ink">
            <span className="relative flex h-2 w-2">
              <span className="lp-ping absolute inline-flex h-full w-full rounded-full bg-ok" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-ok" />
            </span>
            {fr ? 'En direct' : 'Live'}
          </span>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-[150px_1fr]">
          <div className="flex flex-col items-center justify-center">
            <div className="relative h-32 w-32">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                <circle cx="50" cy="50" r={r} fill="none" stroke="hsl(var(--lav-100))" strokeWidth="9" />
                <circle cx="50" cy="50" r={r} fill="none" stroke="hsl(var(--brand))" strokeWidth="9" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[34px] font-bold leading-none tabular-nums text-foreground">{score}</span>
                <span className="mono mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">/ 100</span>
              </div>
            </div>
            <span className="pill pill-green mt-2">{fr ? 'Des bases solides' : 'Strong foundations'}</span>
          </div>

          <div className="space-y-3">
            {bars.map((b, i) => (
              <div key={b.name}>
                <div className="mb-1 flex justify-between text-[12px]">
                  <span className="font-medium text-foreground">{b.name}</span>
                  <span className="mono font-semibold text-foreground">{b.v}</span>
                </div>
                <div className="relative h-2.5 overflow-hidden rounded-full bg-lav-100">
                  <div className="absolute inset-y-0 left-0 rounded-full bg-lav-200" style={{ width: `${b.bench}%` }} />
                  <div
                    className={cn('lp-grow absolute inset-y-0 left-0 rounded-full', b.v < 50 ? 'bg-risk' : 'bg-brand')}
                    style={{ width: `${b.v}%`, animationDelay: `${0.6 + i * 0.15}s` }}
                  />
                </div>
              </div>
            ))}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {RESULT_CLASSES.slice(0, 4).map((cl, i) => (
                <span
                  key={cl.id}
                  className="lp-pop inline-flex items-center gap-1.5 rounded-sm bg-paper px-2 py-1 text-[11px] font-medium text-foreground ring-1 ring-border"
                  style={{ animationDelay: `${1.2 + i * 0.12}s` }}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PROFILE_COLORS[cl.id] }} />
                  {fr ? cl.name.fr : cl.name.en}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Product screens (real captures, demo data)                            */
/* ------------------------------------------------------------------ */

const ProductTour = ({ fr }: { fr: boolean }) => {
  const tabs = [
    {
      id: 'overview',
      label: fr ? 'Vue d’ensemble' : 'Overview',
      img: '/landing/01-overview.jpg',
      title: fr ? 'Une lecture claire de l’entreprise' : 'A clear read of the account',
      body: fr
        ? 'Indice de maturité comparé à tous les autres déploiements, diagnostic, formateurs, champions et sceptiques identifiés automatiquement.'
        : 'Readiness index benchmarked against every other rollout, a diagnosis, and trainers, champions and skeptics found automatically.',
    },
    {
      id: 'compare',
      label: fr ? 'Comparer' : 'Compare',
      img: '/landing/04-compare.jpg',
      title: fr ? 'Comparer avec d’autres déploiements et secteurs' : 'Compare with past rollouts and sectors',
      body: fr
        ? 'Pilote de printemps à 53, déploiement complet à 78 : +25 points sur le même compte. Et la position face au secteur, thème par thème.'
        : 'Spring pilot at 53, full rollout at 78: +25 points on the same account. Plus where the client stands against its sector, theme by theme.',
    },
    {
      id: 'people',
      label: fr ? 'Personnes' : 'People',
      img: '/landing/06-participants.jpg',
      title: fr ? 'Savoir qui mobiliser en premier' : 'Know who to mobilize first',
      body: fr
        ? 'Le profil complet de chaque personne en un clic. Garde-fou : personne n’est désigné formateur sans l’avoir accepté.'
        : 'Each person’s full profile in one click. Guardrail: nobody is named a trainer unless they opted in.',
    },
    {
      id: 'plan',
      label: fr ? 'Plan' : 'Plan',
      img: '/landing/08-plan.jpg',
      title: fr ? 'Un plan de déploiement par profil' : 'A rollout plan per profile',
      body: fr
        ? 'Qui former en premier, quelles équipes prioriser, quelles sessions organiser. Prêt pour le kickoff.'
        : 'Who to train first, which teams to prioritize, which sessions to run. Ready for the kickoff.',
    },
  ];
  const [active, setActive] = useState(tabs[0].id);
  const current = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <div className="mt-10 grid gap-6 lg:grid-cols-[320px_1fr]">
      <div role="tablist" aria-label={fr ? 'Écrans du produit' : 'Product screens'} className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
        {tabs.map((t, i) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={t.id === active}
            onClick={() => setActive(t.id)}
            className={cn(
              'min-w-[220px] rounded-xl p-4 text-left ring-1 transition-all duration-200 lg:min-w-0',
              t.id === active ? 'bg-card shadow-md ring-brand' : 'bg-transparent ring-border hover:bg-card/70'
            )}
          >
            <span className="mono text-[12px] text-muted-foreground">0{i + 1} · {t.label}</span>
            <p className="mt-1 text-[15px] font-semibold text-foreground">{t.title}</p>
            <p className={cn('mt-1 text-[13px] leading-relaxed text-muted-foreground', t.id !== active && 'hidden lg:line-clamp-2 lg:block')}>{t.body}</p>
          </button>
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl bg-card shadow-2xl ring-1 ring-border">
        <div className="flex items-center gap-1.5 border-b border-border bg-paper px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-risk/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-warn/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-ok/70" />
          <span className="ml-3 truncate text-[11px] text-muted-foreground">Dust Assessment · {current.label}</span>
        </div>
        <img key={current.id} src={current.img} alt={current.title} className="lp-pop block w-full" loading="lazy" width={1600} height={1000} />
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* ROI calculator                                                        */
/* ------------------------------------------------------------------ */

const RoiCalculator = ({ fr }: { fr: boolean }) => {
  const [v, setV] = useState({ deploys: 15, disc: 8, champ: 4, qbr: 3, rate: 90 });
  const per = v.disc + v.champ + v.qbr;
  const quarter = per * v.deploys;
  const eur = quarter * v.rate;
  const n = (x: number) => Math.round(x).toLocaleString(fr ? 'fr-FR' : 'en-US');

  const fields: { key: keyof typeof v; label: string; step: number }[] = [
    { key: 'deploys', label: fr ? 'Nouveaux déploiements par trimestre' : 'New deployments per quarter', step: 1 },
    { key: 'disc', label: fr ? 'Heures de discovery économisées / déploiement' : 'Discovery hours saved / deployment', step: 0.5 },
    { key: 'champ', label: fr ? 'Heures de recherche de champions économisées' : 'Champion-search hours saved / deployment', step: 0.5 },
    { key: 'qbr', label: fr ? 'Heures de préparation QBR économisées' : 'QBR / renewal prep hours saved / deployment', step: 0.5 },
    { key: 'rate', label: fr ? 'Coût horaire chargé (€)' : 'Loaded cost per hour (€)', step: 5 },
  ];

  return (
    <div className="mt-10 grid gap-4 lg:grid-cols-[1fr_380px]">
      <div className="rounded-2xl bg-white/[0.06] p-6 ring-1 ring-white/10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/60">{fr ? 'Hypothèses (modifiables)' : 'Hypotheses (edit them)'}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {fields.map((f) => (
            <label key={f.key} className="grid gap-1.5 text-[13px] text-white/70">
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
                className="h-10 rounded-lg border border-white/15 bg-ink px-3 text-[15px] font-medium tabular-nums text-white outline-none focus-visible:ring-2 focus-visible:ring-sky"
              />
            </label>
          ))}
        </div>
        <p className="mt-4 text-[12px] leading-relaxed text-white/50">
          {fr
            ? 'Ce sont des hypothèses de travail, pas des résultats mesurés. Remplacez-les par les vrais chiffres de l’équipe.'
            : 'These are working hypotheses, not measured results. Replace them with the team’s real numbers.'}
        </p>
      </div>
      <div className="flex flex-col justify-between rounded-2xl bg-lime p-6 text-ink">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em]">{fr ? 'Temps rendu par trimestre' : 'Time back per quarter'}</p>
          <p className="mt-2 text-[56px] font-bold leading-none tracking-tight tabular-nums">{n(quarter)} h</p>
          <p className="mt-2 text-[14px] font-medium">
            {fr ? `≈ ${n(quarter / 8)} jours d’équipe · ${n(per)} h par déploiement` : `≈ ${n(quarter / 8)} team days · ${n(per)} h per deployment`}
          </p>
        </div>
        <div className="mt-6 border-t border-ink/15 pt-5">
          <p className="text-[40px] font-bold leading-none tracking-tight tabular-nums">€{n(eur)}</p>
          <p className="mt-2 text-[14px] font-medium">{fr ? `par trimestre · €${n(eur * 4)} par an` : `per quarter · €${n(eur * 4)} per year`}</p>
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

  const pains = [
    [L('We don’t know where teams really stand with AI', 'On ne sait pas où en sont vraiment les équipes avec l’IA'), L('Maturity is guessed during the first calls.', 'La maturité se devine pendant les premiers calls.')],
    [L('Use cases are discovered call after call', 'Les cas d’usage se découvrent call après call'), L('The same exploration, repeated at every kickoff.', 'La même exploration, répétée à chaque kickoff.')],
    [L('Champions are found by chance', 'Les champions se trouvent au hasard'), L('Whoever speaks up first, not whoever can lead.', 'Celui qui parle en premier, pas celui qui peut porter.')],
    [L('Training stays generic', 'Les formations restent génériques'), L('Same onboarding for experts and beginners.', 'Le même onboarding pour les experts et les débutants.')],
    [L('Impact is hard to prove after a few months', 'L’impact est difficile à prouver après quelques mois'), L('No baseline, so renewals rely on anecdotes.', 'Pas de baseline : les renouvellements reposent sur des anecdotes.')],
  ];

  const steps = [
    {
      icon: Link2,
      tint: 'bg-brand-soft text-brand-ink',
      title: L('Send one link before kickoff', 'Envoyer un lien avant le kickoff'),
      body: L('One link and one code per client. No list of names to import. 10 minutes, no account, English or French.', 'Un lien et un code par client. Pas de liste de noms. 10 minutes, sans compte, en français ou en anglais.'),
    },
    {
      icon: Sparkles,
      tint: 'bg-pink-soft text-pink-ink',
      title: L('Get the segmentation automatically', 'Obtenir la segmentation automatiquement'),
      body: L('Maturity by team, champions and trainers, priority use cases, risks and opportunities.', 'Maturité par équipe, champions et formateurs, cas d’usage prioritaires, risques et opportunités.'),
    },
    {
      icon: ClipboardList,
      tint: 'bg-lime-soft text-ok-ink ring-1 ring-lime',
      title: L('Start with a rollout plan', 'Démarrer avec un plan de déploiement'),
      body: L('Which teams first, which 2–3 use cases, who to train first, which sessions, which governance topics.', 'Quelles équipes d’abord, quels 2–3 cas d’usage, qui former en premier, quelles sessions, quels sujets de gouvernance.'),
    },
    {
      icon: RefreshCw,
      tint: 'bg-lav-100 text-brand-ink',
      title: L('Re-measure a few months later', 'Remesurer quelques mois plus tard'),
      body: L('Same link, second pass. The score moves, and we can show it: pilot 53 → rollout 78.', 'Même lien, second passage. Le score bouge et on peut le montrer : pilote 53 → déploiement 78.'),
    },
  ];

  const before = [
    L('Kickoff with little context', 'Kickoff avec peu de contexte'),
    L('Weeks of discovery calls', 'Des semaines de calls de discovery'),
    L('Champions found by chance', 'Champions trouvés au hasard'),
    L('Generic onboarding for everyone', 'Onboarding générique pour tous'),
    L('Impact told as anecdotes', 'Impact raconté en anecdotes'),
  ];
  const after = [
    L('Assessment sent before kickoff', 'Assessment envoyé avant le kickoff'),
    L('Kickoff opens with a plan', 'Le kickoff s’ouvre sur un plan'),
    L('Trainers & champions known on day one', 'Formateurs et champions connus dès le jour 1'),
    L('Training adapted to each profile', 'Formation adaptée à chaque profil'),
    L('Re-measure: a score that moves', 'Remesure : un score qui progresse'),
  ];

  const gains = [
    { title: L('Faster time-to-value', 'Valeur plus rapide'), body: L('The kickoff starts with the right people and 2–3 use cases, not a blank page.', 'Le kickoff démarre avec les bonnes personnes et 2–3 cas d’usage, pas une page blanche.'), bar: 'bg-sky' },
    { title: L('Proof for renewals', 'Preuve pour les renouvellements'), body: L('Baseline, then re-measure: “your score went from 53 to 78” beats anecdotes.', 'Baseline puis remesure : « votre score est passé de 53 à 78 » vaut mieux que des anecdotes.'), bar: 'bg-lime' },
    { title: L('Expansion signals', 'Signaux d’expansion'), body: L('Teams with high potential and low usage show where to grow the account.', 'Les équipes à fort potentiel et faible usage montrent où développer le compte.'), bar: 'bg-pink' },
    { title: L('A repeatable playbook', 'Un playbook répétable'), body: L('Same base for every client, personalization only where it adds value.', 'Une base commune pour chaque client, de la personnalisation seulement là où elle compte.'), bar: 'bg-white' },
  ];

  const teams = [
    {
      name: 'ADS / Deployment',
      tint: 'bg-brand-soft',
      dot: 'bg-brand',
      items: [
        L('Start every deployment with a clear plan', 'Démarrer chaque déploiement avec un plan clair'),
        L('Identify champions fast', 'Identifier vite les champions'),
        L('Adapt onboarding to the client’s real level', 'Adapter l’onboarding au niveau réel du client'),
        L('Stop re-exploring the same topics at each kickoff', 'Ne plus réexplorer les mêmes sujets à chaque kickoff'),
        L('Build a more repeatable playbook', 'Construire un playbook plus répétable'),
      ],
    },
    {
      name: 'Customer Success',
      tint: 'bg-lime-soft',
      dot: 'bg-ok',
      items: [
        L('A baseline to measure before / after', 'Une baseline pour mesurer l’avant / après'),
        L('Spot the teams that need help', 'Repérer les équipes qui ont besoin d’aide'),
        L('Prepare QBRs, renewals and expansions with concrete signals', 'Préparer QBR, renouvellements et expansions avec des signaux concrets'),
      ],
    },
    {
      name: 'Sales',
      tint: 'bg-pink-soft',
      dot: 'bg-pink-ink',
      items: [
        L('Pass richer context at handoff', 'Transmettre plus de contexte au handoff'),
        L('An early view of account potential and teams to address', 'Une première idée du potentiel du compte et des équipes à adresser'),
        L('Fuel expansion once the deployment shows results', 'Alimenter l’expansion quand le déploiement montre des résultats'),
      ],
    },
  ];

  const marqueeItems = [...DIMENSIONS, ...DIMENSIONS];
  const marqueeTints = ['bg-brand-soft', 'bg-pink-soft', 'bg-lime-soft', 'bg-lav-100', 'bg-warn-soft'];

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border/70 bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between gap-3 px-4 md:px-6">
          <Link to="/" className="rounded-md" aria-label="Dust">
            <DustWordmark subtitle="Assessment" />
          </Link>
          <nav className="hidden items-center gap-6 text-[13px] text-muted-foreground md:flex">
            <a href="#problem" className="transition-colors hover:text-foreground">{L('Why', 'Pourquoi')}</a>
            <a href="#how" className="transition-colors hover:text-foreground">{L('How it works', 'Comment ça marche')}</a>
            <a href="#product" className="transition-colors hover:text-foreground">{L('Product', 'Produit')}</a>
            <a href="#roi" className="transition-colors hover:text-foreground">ROI</a>
            <a href="#teams" className="transition-colors hover:text-foreground">{L('For our teams', 'Pour nos équipes')}</a>
          </nav>
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
              <Link to="/dashboard">{L('Sign in', 'Se connecter')}</Link>
            </Button>
            <Button size="sm" onClick={enterDemo}>
              <PlayCircle className="h-4 w-4" />
              {L('View demo', 'Voir la démo')}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative isolate">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="lp-blob absolute -left-24 top-10 h-72 w-72 rounded-full bg-pink opacity-60 blur-3xl" />
          <div className="lp-blob absolute right-[-60px] top-[-40px] h-80 w-80 rounded-full bg-sky opacity-70 blur-3xl" style={{ animationDelay: '-6s' }} />
          <div className="lp-blob absolute bottom-[-80px] left-1/3 h-72 w-72 rounded-full bg-lime opacity-60 blur-3xl" style={{ animationDelay: '-11s' }} />
          <div
            className="absolute inset-0 opacity-[0.35]"
            style={{ backgroundImage: 'radial-gradient(hsl(var(--line)) 1px, transparent 1px)', backgroundSize: '22px 22px' }}
          />
        </div>

        <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-4 pb-20 pt-14 md:px-6 lg:grid-cols-[1.05fr_1fr] lg:pb-28 lg:pt-20">
          <div>
            <span className="lp-pop inline-flex items-center gap-2 rounded-full bg-card/80 px-3 py-1 text-[12px] font-medium text-foreground shadow-sm ring-1 ring-border">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white"><Zap className="h-3 w-3" /></span>
              {L('Internal · AI Maturity Assessment for deployments', 'Interne · AI Maturity Assessment pour les déploiements')}
            </span>
            <h1 className="lp-pop mt-5 text-[40px] font-semibold leading-[1.05] tracking-[-0.03em] text-foreground sm:text-[54px]" style={{ animationDelay: '0.1s' }}>
              {L('Stop starting every deployment ', 'Arrêtons de démarrer chaque déploiement ')}
              <span className="relative inline-block">
                <span className="relative z-10">{L('from zero.', 'de zéro.')}</span>
                <span className="lp-grow absolute inset-x-0 bottom-1 z-0 h-4 rounded-sm bg-lime" style={{ animationDelay: '0.9s' }} />
              </span>
            </h1>
            <p className="lp-pop mt-5 max-w-xl text-[17px] leading-relaxed text-slate" style={{ animationDelay: '0.2s' }}>
              {L(
                'A 10-minute assessment sent to the client before kickoff. It tells us where teams stand with AI, who our champions are and what to roll out first, then proves progress a few months later.',
                'Un questionnaire de 10 minutes envoyé au client avant le kickoff. Il nous dit où en sont les équipes avec l’IA, qui sont nos champions et quoi déployer d’abord, puis prouve la progression quelques mois plus tard.'
              )}
            </p>
            <div className="lp-pop mt-8 flex flex-col gap-2 sm:flex-row" style={{ animationDelay: '0.3s' }}>
              <Button size="lg" className="h-11 px-6 text-[14px]" onClick={enterDemo}>
                <PlayCircle className="h-4 w-4" />
                {L('Explore the demo', 'Explorer la démo')}
              </Button>
              <Button size="lg" variant="outline" className="h-11 bg-card/80 px-6 text-[14px]" asChild>
                <Link to="/exemple">
                  <ClipboardList className="h-4 w-4" />
                  {L('Take the 10-min quiz', 'Faire le quiz (10 min)')}
                </Link>
              </Button>
            </div>
            <ul className="lp-pop mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-muted-foreground" style={{ animationDelay: '0.4s' }}>
              {[L('One link per client', 'Un lien par client'), L('No account for respondents', 'Sans compte pour les répondants'), L('English & French', 'Anglais & français')].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-ok" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <HeroMock fr={fr} />
        </div>
      </section>

      {/* Problem */}
      <section id="problem" className="scroll-mt-16 border-y border-border bg-card">
        <div className="mx-auto max-w-[1200px] px-4 py-20 md:px-6">
          <SectionHead
            eyebrow={L('The problem today', 'Le problème aujourd’hui')}
            title={L('Deployments run on intuition.', 'Les déploiements reposent sur l’intuition.')}
            sub={L('Today a deployment can start with very little context on the client.', 'Aujourd’hui, un déploiement peut démarrer avec très peu de contexte sur le client.')}
          />
          <div className="mt-10 grid gap-4 lg:grid-cols-[1fr_380px]">
            <div className="grid gap-3">
              {pains.map(([title, body], i) => (
                <Reveal key={title} delay={i * 70}>
                  <div className="flex items-start gap-4 rounded-xl bg-paper p-4 ring-1 ring-border">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-risk-soft text-risk"><X className="h-4 w-4" /></span>
                    <div>
                      <p className="text-[15px] font-semibold text-foreground">{title}</p>
                      <p className="mt-0.5 text-[13px] text-muted-foreground">{body}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
            <Reveal delay={200}>
              <div className="flex h-full flex-col justify-between rounded-2xl bg-pink p-7 text-ink">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em]">{L('Result', 'Résultat')}</p>
                  <p className="mt-3 text-[28px] font-semibold leading-tight tracking-tight">
                    {L('Each deployment depends on who is in the room.', 'Chaque déploiement dépend de qui est dans la pièce.')}
                  </p>
                </div>
                <ul className="mt-6 space-y-2 text-[15px] font-medium">
                  {[L('Slow to start', 'Long à démarrer'), L('Hard to standardize', 'Difficile à standardiser'), L('Hard to replicate', 'Difficile à répliquer'), L('Hard to prove', 'Difficile à prouver')].map((t) => (
                    <li key={t} className="flex items-center gap-2"><span className="h-2 w-2 rounded-sm bg-ink" />{t}</li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* How it simplifies */}
      <section id="how" className="mx-auto max-w-[1200px] scroll-mt-16 px-4 py-20 md:px-6">
        <SectionHead
          eyebrow={L('The idea', 'L’idée')}
          title={L('One standard assessment, then personalization where it matters.', 'Un assessment standard, puis de la personnalisation là où ça compte.')}
          sub={L('Instead of starting from scratch with each client, the deployment becomes productized.', 'Au lieu de repartir de zéro à chaque client, le déploiement devient productisé.')}
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={i * 110}>
              <div className="group h-full rounded-xl bg-card p-6 shadow-sm ring-1 ring-border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <div className="flex items-center justify-between">
                  <span className={cn('flex h-11 w-11 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110', s.tint)}>
                    <s.icon className="h-5 w-5" />
                  </span>
                  <span className="mono text-[13px] text-muted-foreground">0{i + 1}</span>
                </div>
                <h3 className="mt-5 text-[17px] font-semibold tracking-tight text-foreground">{s.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Before / after */}
        <div className="mt-12 grid items-stretch gap-4 md:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-2xl bg-paper p-6 ring-1 ring-border">
              <p className="eyebrow">{L('Without the assessment', 'Sans l’assessment')}</p>
              <ul className="mt-4 divide-y divide-border">
                {before.map((t) => (
                  <li key={t} className="flex items-center gap-3 py-3 text-[15px] text-muted-foreground">
                    <X className="h-4 w-4 shrink-0 text-risk" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={150}>
            <div className="h-full rounded-2xl bg-ink p-6 text-white">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-sky">{L('With the assessment', 'Avec l’assessment')}</p>
              <ul className="mt-4 divide-y divide-white/10">
                {after.map((t) => (
                  <li key={t} className="flex items-center gap-3 py-3 text-[15px] font-medium">
                    <Check className="h-4 w-4 shrink-0 text-lime" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Dimensions marquee */}
      <section className="overflow-hidden border-y border-border bg-card py-10">
        <Reveal className="mx-auto mb-6 max-w-[1200px] px-4 md:px-6">
          <p className="eyebrow">{L('What comes back: 9 dimensions, 6 rollout profiles', 'Ce qu’on récupère : 9 dimensions, 6 profils de déploiement')}</p>
        </Reveal>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-card to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-card to-transparent" />
          <div className="lp-marquee flex w-max gap-3">
            {marqueeItems.map((d, i) => (
              <div key={`${d.id}-${i}`} className={cn('flex w-[300px] shrink-0 flex-col rounded-xl p-5', marqueeTints[i % marqueeTints.length])}>
                <p className="text-[15px] font-semibold text-foreground">{fr ? d.name.fr : d.name.en}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-slate">{fr ? d.measures.fr : d.measures.en}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="mx-auto mt-6 flex max-w-[1200px] flex-wrap gap-2 px-4 md:px-6">
          {RESULT_CLASSES.map((cl) => (
            <span key={cl.id} className="inline-flex items-center gap-2 rounded-full bg-paper px-3 py-1.5 text-[13px] font-medium text-foreground ring-1 ring-border">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PROFILE_COLORS[cl.id] }} />
              {fr ? cl.name.fr : cl.name.en}
            </span>
          ))}
        </div>
      </section>

      {/* Product */}
      <section id="product" className="mx-auto max-w-[1200px] scroll-mt-16 px-4 py-20 md:px-6">
        <SectionHead
          eyebrow={L('The product', 'Le produit')}
          title={L('What the deployment team sees.', 'Ce que voit l’équipe de déploiement.')}
          sub={L('Real screens from the platform, with demo data (fictional companies).', 'De vraies captures de la plateforme, avec des données de démo (entreprises fictives).')}
        />
        <ProductTour fr={fr} />
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button size="lg" className="h-11 px-6 text-[14px]" onClick={enterDemo}>
            {L('Open the live demo', 'Ouvrir la démo')}
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button size="lg" variant="outline" className="h-11 px-6 text-[14px]" asChild>
            <Link to="/exemple">{L('See what the client answers', 'Voir ce que le client remplit')}</Link>
          </Button>
        </div>
      </section>

      {/* ROI */}
      <section id="roi" className="relative scroll-mt-16 overflow-hidden bg-ink py-20 text-white">
        <div aria-hidden className="lp-blob pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-brand opacity-30 blur-3xl" />
        <div aria-hidden className="lp-blob pointer-events-none absolute -bottom-24 left-10 h-64 w-64 rounded-full bg-pink opacity-20 blur-3xl" style={{ animationDelay: '-9s' }} />
        <div className="relative mx-auto max-w-[1200px] px-4 md:px-6">
          <SectionHead
            dark
            eyebrow={L('Why push it: the ROI', 'Pourquoi pousser : le ROI')}
            title={L('Hours back on every deployment, and revenue on top.', 'Des heures gagnées sur chaque déploiement, et du revenu en plus.')}
            sub={L('Time saved on discovery, champion search and QBR prep, multiplied by every deployment we run.', 'Le temps gagné sur la discovery, la recherche de champions et la préparation des QBR, multiplié par chaque déploiement.')}
          />
          <RoiCalculator fr={fr} />
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {gains.map((g, i) => (
              <Reveal key={g.title} delay={i * 90}>
                <div className="h-full rounded-2xl bg-white/[0.06] p-6 ring-1 ring-white/10">
                  <span className={cn('block h-1.5 w-10 rounded-full', g.bar)} />
                  <h3 className="mt-4 text-[17px] font-semibold tracking-tight">{g.title}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-white/70">{g.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Teams */}
      <section id="teams" className="mx-auto max-w-[1200px] scroll-mt-16 px-4 py-20 md:px-6">
        <SectionHead
          eyebrow={L('Value for the Dust team', 'Valeur pour l’équipe Dust')}
          title={L('One tool, three teams.', 'Un outil, trois équipes.')}
        />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {teams.map((t, i) => (
            <Reveal key={t.name} delay={i * 110}>
              <div className={cn('h-full rounded-2xl p-6', t.tint)}>
                <h3 className="text-[20px] font-semibold tracking-tight text-foreground">{t.name}</h3>
                <ul className="mt-4 space-y-3">
                  {t.items.map((it) => (
                    <li key={it} className="flex gap-3 text-[14px] leading-relaxed text-foreground">
                      <span className={cn('mt-2 h-2 w-2 shrink-0 rounded-sm', t.dot)} />
                      {it}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Proposal */}
      <section className="relative isolate overflow-hidden border-t border-border">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="lp-blob absolute left-10 top-6 h-56 w-56 rounded-full bg-sky opacity-60 blur-3xl" />
          <div className="lp-blob absolute bottom-0 right-20 h-56 w-56 rounded-full bg-pink opacity-60 blur-3xl" style={{ animationDelay: '-8s' }} />
        </div>
        <Reveal className="mx-auto max-w-[1000px] px-4 py-24 text-center md:px-6">
          <p className="eyebrow">{L('Not a heavy audit. Not another form.', 'Pas un audit lourd. Pas un énième formulaire.')}</p>
          <h2 className="mt-3 text-[36px] font-semibold leading-tight tracking-tight text-foreground sm:text-[44px]">
            {L('Proposal: run it on the next 3 kickoffs.', 'Proposition : le tester sur les 3 prochains kickoffs.')}
          </h2>
          <div className="mt-10 grid gap-3 text-left sm:grid-cols-3">
            {[
              { icon: Target, title: L('Prep time', 'Temps de préparation'), sub: L('before vs after', 'avant vs après') },
              { icon: GraduationCap, title: L('Time to first champion', 'Délai du premier champion'), sub: L('days, not weeks', 'des jours, pas des semaines') },
              { icon: LineChart, title: L('Score at month 3', 'Score au 3e mois'), sub: L('re-measure the cohort', 'remesurer la cohorte') },
            ].map((m) => (
              <div key={m.title} className="rounded-xl bg-card/90 p-5 shadow-sm ring-1 ring-border">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand-ink"><m.icon className="h-4 w-4" /></span>
                <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{L('We measure', 'On mesure')}</p>
                <p className="mt-1 text-[17px] font-semibold text-foreground">{m.title}</p>
                <p className="text-[13px] text-muted-foreground">{m.sub}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-col justify-center gap-2 sm:flex-row">
            <Button size="lg" className="h-11 px-6 text-[14px]" asChild>
              <Link to="/create-campaign">
                <Link2 className="h-4 w-4" />
                {L('Create a client link', 'Créer un lien client')}
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-11 bg-card/80 px-6 text-[14px]" onClick={enterDemo}>
              <PlayCircle className="h-4 w-4" />
              {L('View demo', 'Voir la démo')}
            </Button>
          </div>
          <p className="mt-8 text-[15px] font-medium text-foreground">
            {L('From artisanal deployments to data-guided ones, without losing personalization.', 'D’un déploiement artisanal à un déploiement guidé par la donnée, sans perdre la personnalisation.')}
          </p>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-6">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-3 px-4 text-[12px] text-muted-foreground sm:flex-row md:px-6">
          <DustWordmark />
          <p>{L('© 2026 Dust · AI Maturity Assessment · internal tool', '© 2026 Dust · AI Maturity Assessment · outil interne')}</p>
          <div className="flex items-center gap-4">
            <Link to="/assessment" className="transition-colors hover:text-foreground">{L('Take the assessment', 'Répondre au questionnaire')}</Link>
            <Link to="/admin" className="transition-colors hover:text-foreground">Admin</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
