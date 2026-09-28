import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Check,
  Clock,
  GraduationCap,
  Link2,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
  BadgeCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useLanguage } from '@/contexts/LanguageContext';
import { DustWordmark } from '@/components/DustMark';
import { DIMENSIONS, RESULT_CLASSES, V2_QUESTIONS } from '@/lib/assessment-v2';
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

const CountUp = ({ to, duration = 1400, suffix = '' }: { to: number; duration?: number; suffix?: string }) => {
  const { ref, inView } = useInView<HTMLSpanElement>(0.4);
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!inView) return;
    if (reducedMotion()) {
      setValue(to);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setValue(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);
  return (
    <span ref={ref} className="tabular-nums">
      {value}
      {suffix}
    </span>
  );
};

/* ------------------------------------------------------------------ */
/* Hero product mock (animated)                                          */
/* ------------------------------------------------------------------ */

const HeroMock = ({ fr }: { fr: boolean }) => {
  const [score, setScore] = useState(0);
  useEffect(() => {
    if (reducedMotion()) {
      setScore(72);
      return;
    }
    let raf = 0;
    const start = performance.now() + 400;
    const tick = (now: number) => {
      const p = Math.max(0, Math.min(1, (now - start) / 1600));
      setScore(Math.round(72 * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const r = 42;
  const c = 2 * Math.PI * r;
  const bars = [
    { name: fr ? 'Pratique de l’IA' : 'AI fluency', v: 81, bench: 64 },
    { name: fr ? 'Motivation' : 'Motivation', v: 76, bench: 58 },
    { name: fr ? 'Capacité à construire' : 'Builder depth', v: 63, bench: 52 },
    { name: fr ? 'Gouvernance' : 'Governance', v: 44, bench: 55 },
  ];

  return (
    <div className="relative">
      {/* Floating chips */}
      <div className="lp-pop absolute -left-6 top-10 z-20 hidden sm:block" style={{ animationDelay: '1.4s' }}>
        <div className="lp-float rounded-lg bg-card px-3 py-2 shadow-xl ring-1 ring-border">
          <p className="flex items-center gap-2 text-[12px] font-semibold text-foreground">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-soft text-brand-ink"><GraduationCap className="h-3.5 w-3.5" /></span>
            {fr ? '+3 formateurs identifiés' : '+3 trainers found'}
          </p>
        </div>
      </div>
      <div className="lp-pop absolute -right-4 bottom-16 z-20 hidden sm:block" style={{ animationDelay: '1.9s' }}>
        <div className="lp-float rounded-lg bg-card px-3 py-2 shadow-xl ring-1 ring-border" style={{ animationDelay: '-3s' }}>
          <p className="flex items-center gap-2 text-[12px] font-semibold text-foreground">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-lime text-ink"><BadgeCheck className="h-3.5 w-3.5" /></span>
            {fr ? '14 champions prêts' : '14 champions ready'}
          </p>
        </div>
      </div>

      <div className="lp-pop relative z-10 overflow-hidden rounded-2xl bg-card shadow-2xl ring-1 ring-border" style={{ animationDelay: '0.2s' }}>
        {/* window chrome */}
        <div className="flex items-center gap-1.5 border-b border-border bg-paper px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-risk/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-warn/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-ok/70" />
          <span className="ml-3 truncate text-[11px] text-muted-foreground">Dust Assessment · {fr ? 'Vue d’ensemble' : 'Overview'}</span>
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
            <span className="pill pill-green mt-2">{fr ? 'De bonnes bases' : 'Good foundations'}</span>
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
/* Page                                                                  */
/* ------------------------------------------------------------------ */

const Index = () => {
  const { language } = useLanguage();
  const fr = language !== 'en';

  const steps = [
    {
      icon: Link2,
      tint: 'bg-brand-soft text-brand-ink',
      title: fr ? 'Créez un lien' : 'Create a link',
      body: fr ? 'Un lien et un code par client. Pas de liste de noms à importer : vous l’envoyez, c’est tout.' : 'One link and one code per client. No list of names to import: just send it.',
    },
    {
      icon: Clock,
      tint: 'bg-pink-soft text-pink-ink',
      title: fr ? 'Les équipes répondent en 10 minutes' : 'Teams answer in 10 minutes',
      body: fr ? '44 affirmations, en français ou en anglais, avec sauvegarde automatique à chaque étape.' : '44 statements, in French or English, saved automatically at each step.',
    },
    {
      icon: Sparkles,
      tint: 'bg-lime-soft text-ok-ink ring-1 ring-lime',
      title: fr ? 'Déployez avec les bonnes personnes' : 'Roll out with the right people',
      body: fr ? 'Indice de maturité, formateurs, champions, sponsors et actions prioritaires, prêts pour le kickoff.' : 'Readiness index, trainers, champions, sponsors and priority actions, ready for the kickoff.',
    },
  ];

  const stats = [
    { value: 10, suffix: ' min', label: fr ? 'pour répondre' : 'to answer' },
    { value: V2_QUESTIONS.length, suffix: '', label: fr ? 'affirmations' : 'statements' },
    { value: DIMENSIONS.length, suffix: '', label: fr ? 'dimensions mesurées' : 'dimensions measured' },
    { value: RESULT_CLASSES.length, suffix: '', label: fr ? 'profils de déploiement' : 'rollout profiles' },
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
            <a href="#how" className="transition-colors hover:text-foreground">{fr ? 'Comment ça marche' : 'How it works'}</a>
            <a href="#profiles" className="transition-colors hover:text-foreground">{fr ? 'Profils' : 'Profiles'}</a>
            <a href="#console" className="transition-colors hover:text-foreground">{fr ? 'La console' : 'The console'}</a>
          </nav>
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
              <Link to="/dashboard">{fr ? 'Se connecter' : 'Sign in'}</Link>
            </Button>
            <Button size="sm" onClick={enterDemo}>
              <PlayCircle className="h-4 w-4" />
              {fr ? 'Voir la démo' : 'View demo'}
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
              {fr ? 'Évaluation de maturité IA · par Dust' : 'AI readiness assessment · by Dust'}
            </span>
            <h1 className="lp-pop mt-5 text-[40px] font-semibold leading-[1.05] tracking-[-0.03em] text-foreground sm:text-[54px]" style={{ animationDelay: '0.1s' }}>
              {fr ? 'Trouvez les personnes qui feront ' : 'Find the people who will make '}
              <span className="relative inline-block">
                <span className="relative z-10">{fr ? 'décoller' : 'your rollout'}</span>
                <span className="lp-grow absolute inset-x-0 bottom-1 z-0 h-4 rounded-sm bg-lime" style={{ animationDelay: '0.9s' }} />
              </span>{' '}
              {fr ? 'votre déploiement IA.' : 'take off.'}
            </h1>
            <p className="lp-pop mt-5 max-w-xl text-[17px] leading-relaxed text-slate" style={{ animationDelay: '0.2s' }}>
              {fr
                ? 'En 10 minutes, vos équipes révèlent leur pratique de l’IA, leur envie et leurs freins. Vous repartez avec un indice de maturité, vos futurs formateurs et champions, et un plan de déploiement concret.'
                : 'In 10 minutes, your teams reveal their AI practice, appetite and blockers. You get a readiness index, your future trainers and champions, and a concrete rollout plan.'}
            </p>
            <div className="lp-pop mt-8 flex flex-col gap-2 sm:flex-row" style={{ animationDelay: '0.3s' }}>
              <Button size="lg" className="h-11 px-6 text-[14px]" onClick={enterDemo}>
                <PlayCircle className="h-4 w-4" />
                {fr ? 'Explorer la démo' : 'Explore the demo'}
              </Button>
              <Button size="lg" variant="outline" className="h-11 bg-card/80 px-6 text-[14px]" asChild>
                <Link to="/create-campaign">
                  <Link2 className="h-4 w-4" />
                  {fr ? 'Créer un lien d’évaluation' : 'Create an assessment link'}
                </Link>
              </Button>
            </div>
            <ul className="lp-pop mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-muted-foreground" style={{ animationDelay: '0.4s' }}>
              {[fr ? 'Sans compte pour les répondants' : 'No account for respondents', fr ? 'Français & anglais' : 'French & English', fr ? 'Résultats en temps réel' : 'Real-time results'].map((t) => (
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

      {/* Stats */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto grid max-w-[1200px] grid-cols-2 px-4 md:grid-cols-4 md:px-6">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 80} className={cn('px-4 py-8 text-center', i % 2 === 1 && 'border-l border-border', i === 2 && 'md:border-l md:border-border')}>
              <p className="text-[40px] font-semibold leading-none tracking-tight text-foreground">
                <CountUp to={s.value} suffix={s.suffix} />
              </p>
              <p className="mt-2 text-[13px] text-muted-foreground">{s.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-[1200px] scroll-mt-16 px-4 py-20 md:px-6">
        <Reveal className="max-w-2xl">
          <p className="eyebrow">{fr ? 'Comment ça marche' : 'How it works'}</p>
          <h2 className="mt-2 text-[32px] font-semibold leading-tight tracking-tight text-foreground">
            {fr ? 'Du lien envoyé au plan de déploiement, en une semaine.' : 'From the link you send to a rollout plan, in a week.'}
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={i * 120}>
              <div className="group h-full rounded-xl bg-card p-6 shadow-sm ring-1 ring-border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <div className="flex items-center justify-between">
                  <span className={cn('flex h-11 w-11 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110', s.tint)}>
                    <s.icon className="h-5 w-5" />
                  </span>
                  <span className="mono text-[13px] text-muted-foreground">0{i + 1}</span>
                </div>
                <h3 className="mt-5 text-[18px] font-semibold tracking-tight text-foreground">{s.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Dimensions marquee */}
      <section className="overflow-hidden border-y border-border bg-card py-10">
        <Reveal className="mx-auto mb-6 max-w-[1200px] px-4 md:px-6">
          <p className="eyebrow">{fr ? 'Ce que l’on mesure' : 'What we measure'}</p>
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
      </section>

      {/* Profiles */}
      <section id="profiles" className="mx-auto max-w-[1200px] scroll-mt-16 px-4 py-20 md:px-6">
        <Reveal className="max-w-2xl">
          <p className="eyebrow">{fr ? '6 profils de déploiement' : '6 rollout profiles'}</p>
          <h2 className="mt-2 text-[32px] font-semibold leading-tight tracking-tight text-foreground">
            {fr ? 'Chacun a un rôle. Sachez lequel avant le kickoff.' : 'Everyone has a role. Know which one before the kickoff.'}
          </h2>
          <p className="mt-3 text-[15px] text-muted-foreground">
            {fr ? 'Des signaux, pas des verdicts : chaque profil vient avec l’action à mener.' : 'Signals, not verdicts: each profile comes with what to do next.'}
          </p>
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {RESULT_CLASSES.map((cl, i) => (
            <Reveal key={cl.id} delay={(i % 3) * 100}>
              <div className="group relative h-full overflow-hidden rounded-xl bg-card p-6 shadow-sm ring-1 ring-border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <span
                  className="absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-25 transition-transform duration-500 group-hover:scale-150"
                  style={{ backgroundColor: PROFILE_COLORS[cl.id] }}
                  aria-hidden
                />
                <span className="relative block h-1.5 w-10 rounded-full" style={{ backgroundColor: PROFILE_COLORS[cl.id] }} />
                <h3 className="relative mt-4 text-[17px] font-semibold tracking-tight text-foreground">{fr ? cl.name.fr : cl.name.en}</h3>
                <p className="relative mt-2 text-[14px] leading-relaxed text-muted-foreground">{fr ? cl.meaning.fr : cl.meaning.en}</p>
                <p className="relative mt-4 border-t border-border pt-3 text-[13px] leading-relaxed text-foreground">
                  <span className="font-semibold">{fr ? 'À faire : ' : 'Next: '}</span>
                  {fr ? cl.action.fr : cl.action.en}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Console preview */}
      <section id="console" className="relative scroll-mt-16 overflow-hidden bg-ink py-20 text-white">
        <div aria-hidden className="lp-blob pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-brand opacity-30 blur-3xl" />
        <div aria-hidden className="lp-blob pointer-events-none absolute -bottom-24 left-10 h-64 w-64 rounded-full bg-pink opacity-20 blur-3xl" style={{ animationDelay: '-9s' }} />
        <div className="relative mx-auto grid max-w-[1200px] items-center gap-10 px-4 md:px-6 lg:grid-cols-2">
          <Reveal>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-sky">{fr ? 'La console' : 'The console'}</p>
            <h2 className="mt-2 text-[32px] font-semibold leading-tight tracking-tight">
              {fr ? 'Tout ce qu’il faut pour piloter le déploiement.' : 'Everything you need to run the rollout.'}
            </h2>
            <ul className="mt-6 space-y-3 text-[15px] text-white/80">
              {[
                { icon: BarChart3, text: fr ? 'Indice de maturité et comparaison au benchmark global' : 'Readiness index benchmarked against every rollout' },
                { icon: Users, text: fr ? 'Formateurs, champions et sponsors identifiés, avec garde-fou sur le rôle déclaré' : 'Trainers, champions and sponsors, checked against the declared role' },
                { icon: ShieldCheck, text: fr ? 'Actions prioritaires par dimension, prêtes pour le kickoff' : 'Priority actions per dimension, ready for the kickoff' },
                { icon: Sparkles, text: fr ? 'Cas d’usage et freins remontés par les équipes' : 'Use cases and blockers raised by the teams' },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/10 text-sky"><Icon className="h-4 w-4" /></span>
                  <span className="pt-0.5">{text}</span>
                </li>
              ))}
            </ul>
            <Button size="lg" className="mt-8 h-11 bg-white px-6 text-[14px] text-ink hover:bg-white/90" onClick={enterDemo}>
              {fr ? 'Ouvrir la démo' : 'Open the demo'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Reveal>

          <Reveal delay={150}>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: fr ? 'Participation' : 'Participation', value: 244, suffix: '', sub: fr ? '85 % de complétion' : '85% completion', tint: 'text-sky' },
                { label: fr ? 'Formateurs potentiels' : 'Peer trainers', value: 67, suffix: '', sub: fr ? '27 % de la cohorte' : '27% of cohort', tint: 'text-sky' },
                { label: 'Champions', value: 137, suffix: '', sub: fr ? 'builders qui rayonnent' : 'active builders', tint: 'text-lime' },
                { label: fr ? 'Indice de maturité' : 'Readiness index', value: 76, suffix: '/100', sub: fr ? 'Des bases solides' : 'Strong foundations', tint: 'text-pink' },
              ].map((k) => (
                <div key={k.label} className="rounded-xl bg-white/[0.06] p-5 ring-1 ring-white/10 transition-colors duration-300 hover:bg-white/[0.1]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-white/60">{k.label}</p>
                  <p className="mt-2 text-[34px] font-semibold leading-none tracking-tight">
                    <CountUp to={k.value} suffix={k.suffix} />
                  </p>
                  <p className={cn('mt-2 text-[12px] font-medium', k.tint)}>{k.sub}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-center text-[12px] text-white/50">{fr ? 'Chiffres issus de la démo · Veloria Santé, 1 192 salariés (fictif)' : 'Demo figures · Veloria Santé, 1,192 employees (fictional)'}</p>
          </Reveal>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative isolate overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="lp-blob absolute left-10 top-6 h-56 w-56 rounded-full bg-sky opacity-60 blur-3xl" />
          <div className="lp-blob absolute bottom-0 right-20 h-56 w-56 rounded-full bg-pink opacity-60 blur-3xl" style={{ animationDelay: '-8s' }} />
        </div>
        <Reveal className="mx-auto max-w-[900px] px-4 py-24 text-center md:px-6">
          <h2 className="text-[36px] font-semibold leading-tight tracking-tight text-foreground sm:text-[44px]">
            {fr ? 'Prêt à lancer votre première évaluation ?' : 'Ready to launch your first assessment?'}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[16px] text-slate">
            {fr ? 'Créez un lien en 30 secondes et envoyez-le à votre client. Les résultats arrivent en temps réel.' : 'Create a link in 30 seconds and send it to your client. Results come in real time.'}
          </p>
          <div className="mt-8 flex flex-col justify-center gap-2 sm:flex-row">
            <Button size="lg" className="h-11 px-6 text-[14px]" asChild>
              <Link to="/create-campaign">
                <Link2 className="h-4 w-4" />
                {fr ? 'Créer un lien' : 'Create a link'}
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-11 bg-card/80 px-6 text-[14px]" onClick={enterDemo}>
              <PlayCircle className="h-4 w-4" />
              {fr ? 'Voir la démo' : 'View demo'}
            </Button>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-6">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-3 px-4 text-[12px] text-muted-foreground sm:flex-row md:px-6">
          <DustWordmark />
          <p>{fr ? '© 2026 Dust. Évaluation de la maturité IA de vos équipes.' : '© 2026 Dust. AI readiness assessment for your teams.'}</p>
          <div className="flex items-center gap-4">
            <Link to="/assessment" className="transition-colors hover:text-foreground">{fr ? 'Répondre au questionnaire' : 'Take the assessment'}</Link>
            <Link to="/admin" className="transition-colors hover:text-foreground">Administration</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
