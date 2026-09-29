import { useEffect, useState, type CSSProperties } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Looping walk-through of the product for the home page: teams answer → starting point →
 * people → plan. Example data only. Tabs can be clicked; hovering pauses the loop.
 */

const SCENE_MS = 5200;
type Lang = 'en' | 'fr';

const d = (ms: number, extra: Record<string, string> = {}) => ({ '--d': `${ms}ms`, ...extra }) as CSSProperties;

/** Counts from 0 to `to` once, after `delay` ms. */
const useCountUp = (to: number, delay = 0, duration = 1100) => {
  const [v, setV] = useState(0);
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setV(to);
      return;
    }
    let raf = 0;
    const t0 = performance.now() + delay;
    const tick = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - t0) / duration));
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, delay, duration]);
  return v;
};

const SurveyScene = ({ lang }: { lang: Lang }) => {
  const fr = lang === 'fr';
  const answers = useCountUp(142, 900, 2600);
  const scale = fr ? ['Pas d’accord', '', 'Neutre', '', 'D’accord'] : ['Disagree', '', 'Neutral', '', 'Agree'];
  return (
    <div className="flex h-full flex-col">
      <div className="ps-in rounded-xl bg-background p-4 ring-1 ring-border" style={d(0)}>
        <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
          <span>{fr ? 'Étape 3 sur 3 · Motivation' : 'Step 3 of 3 · Motivation'}</span>
          <span className="tabular-nums">24 / 26</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="ps-bar h-full rounded-full bg-brand" style={d(150, { '--w': '92%' })} />
        </div>
        <p className="mt-4 text-[15px] font-medium leading-snug text-foreground">
          {fr ? 'J’ai hâte d’essayer de nouveaux outils d’IA dans mon travail.' : 'I look forward to trying new AI tools in my work.'}
        </p>
        <div className="mt-3 grid grid-cols-5 gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="flex flex-col items-center gap-1">
              <span
                className={cn('flex h-9 w-full items-center justify-center rounded-lg bg-card text-[13px] font-semibold text-foreground ring-1 ring-border', n === 4 && 'ps-pick')}
                style={n === 4 ? d(1100) : undefined}
              >
                {n}
              </span>
              <span className="h-3 text-center text-[9px] leading-tight text-muted-foreground">{scale[n - 1]}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="ps-in rounded-xl bg-background p-3 ring-1 ring-border" style={d(400)}>
          <p className="text-[11px] text-muted-foreground">{fr ? 'Réponses reçues' : 'Answers received'}</p>
          <p className="mt-0.5 text-[26px] font-semibold tabular-nums leading-none text-foreground">{answers}</p>
        </div>
        <div className="ps-in rounded-xl bg-background p-3 ring-1 ring-border" style={d(550)}>
          <p className="text-[11px] text-muted-foreground">{fr ? 'Temps moyen' : 'Average time'}</p>
          <p className="mt-0.5 text-[26px] font-semibold leading-none text-foreground">
            4<span className="text-[14px] font-medium text-muted-foreground"> min</span>
          </p>
        </div>
      </div>
      <p className="ps-in mt-3 flex items-center gap-1.5 text-[12px] text-muted-foreground" style={d(1500)}>
        <Check className="h-3.5 w-3.5 text-ok-ink" />
        {fr ? 'Enregistré au fil de l’eau, sur mobile ou ordinateur' : 'Saved as they go, on a phone or a laptop'}
      </p>
    </div>
  );
};

const StartScene = ({ lang }: { lang: Lang }) => {
  const fr = lang === 'fr';
  const score = useCountUp(64, 200);
  const dims = fr
    ? [['Usage de l’IA', 72, 61], ['Capacité à construire', 58, 55], ['Motivation', 81, 70], ['Posture de formateur', 44, 49], ['Gouvernance', 67, 60]]
    : [['AI usage today', 72, 61], ['Builder depth', 58, 55], ['Motivation', 81, 70], ['Teaching posture', 44, 49], ['Governance', 67, 60]];
  return (
    <div className="flex h-full flex-col">
      <div className="ps-in flex items-end gap-4" style={d(0)}>
        <div>
          <p className="text-[11px] font-medium text-muted-foreground">{fr ? 'Indice de maturité IA' : 'AI readiness index'}</p>
          <p className="text-[52px] font-semibold tabular-nums leading-none tracking-[-0.02em] text-foreground">
            {score}
            <span className="text-[16px] font-medium text-muted-foreground">/100</span>
          </p>
        </div>
        <span className="ps-pop mb-1.5 rounded-full bg-ok-soft px-2.5 py-1 text-[11px] font-semibold text-ok-ink" style={d(1200)}>
          {fr ? '+6 pts vs benchmark' : '+6 pts vs benchmark'}
        </span>
      </div>
      <div className="mt-5 space-y-3">
        {dims.map(([name, v, bench], i) => (
          <div key={name as string} className="ps-in" style={d(250 + i * 110)}>
            <div className="flex justify-between text-[12px]">
              <span className="text-foreground">{name}</span>
              <span className="font-semibold tabular-nums text-foreground">{v}</span>
            </div>
            <div className="relative mt-1 h-2 rounded-full bg-muted">
              <div className={cn('ps-bar h-full rounded-full', (v as number) < 50 ? 'bg-risk' : 'bg-brand')} style={d(350 + i * 110, { '--w': `${v}%` })} />
              <span className="absolute -top-1 h-4 w-0.5 rounded bg-ink" style={{ left: `${bench}%` }} />
            </div>
          </div>
        ))}
      </div>
      <p className="ps-in mt-4 text-[11px] text-muted-foreground" style={d(1100)}>
        {fr ? 'Barre : vos équipes · trait : les autres déploiements Dust' : 'Bar: your teams · tick: other Dust rollouts'}
      </p>
    </div>
  );
};

const PeopleScene = ({ lang }: { lang: Lang }) => {
  const fr = lang === 'fr';
  const tiles = [
    { label: fr ? 'Formateurs' : 'Peer trainers', n: 9, color: '#1C91FF' },
    { label: 'Builders', n: 14, color: '#9FDBFF' },
    { label: 'Champions', n: 17, color: '#418B5C' },
    { label: 'Sponsors', n: 5, color: '#FE9C1A' },
  ];
  const names = ['Camille R.', 'Hugo L.', 'Léa G.', 'Nathan M.', 'Inès B.', 'Tom D.'];
  return (
    <div className="flex h-full flex-col">
      <div className="grid grid-cols-2 gap-2.5">
        {tiles.map((t, i) => (
          <div key={t.label} className="ps-pop rounded-xl bg-background p-3 ring-1 ring-border" style={d(i * 120)}>
            <span className="block h-1.5 w-8 rounded-full" style={{ background: t.color }} />
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">{t.label}</p>
            <p className="text-[28px] font-semibold tabular-nums leading-none text-foreground">{t.n}</p>
          </div>
        ))}
      </div>
      <p className="ps-in mt-4 text-[12px] font-medium text-foreground" style={d(600)}>
        {fr ? 'Vos formateurs, nommément' : 'Your peer trainers, by name'}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {names.map((n, i) => (
          <span key={n} className="ps-pop rounded-full bg-brand-soft px-2.5 py-1 text-[12px] font-medium text-brand-ink" style={d(750 + i * 90)}>
            {n}
          </span>
        ))}
      </div>
    </div>
  );
};

const PlanScene = ({ lang }: { lang: Lang }) => {
  const fr = lang === 'fr';
  const steps = fr
    ? [
        ['Lancer avec Sales et Support', 'Commencer ici', 'bg-brand-soft text-brand-ink'],
        ['Former 9 volontaires comme relais', 'Ce mois-ci', 'bg-ok-soft text-ok-ink'],
        ['Construire l’agent « comptes rendus »', 'Demande n°1', 'bg-pink-soft text-pink-ink'],
      ]
    : [
        ['Launch with Sales and Support', 'Start here', 'bg-brand-soft text-brand-ink'],
        ['Train 9 volunteers as peer trainers', 'This month', 'bg-ok-soft text-ok-ink'],
        ['Build the “meeting notes” agent', 'Top request', 'bg-pink-soft text-pink-ink'],
      ];
  return (
    <div className="flex h-full flex-col">
      <ol className="space-y-2.5">
        {steps.map(([title, tag, tone], i) => (
          <li key={title} className="ps-in flex items-center gap-3 rounded-xl bg-background p-3 ring-1 ring-border" style={d(i * 180)}>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-[12px] font-semibold text-white">{i + 1}</span>
            <span className="min-w-0 flex-1 text-[13px] font-medium leading-snug text-foreground">{title}</span>
            <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold', tone)}>{tag}</span>
          </li>
        ))}
      </ol>
      <div className="ps-in mt-4 rounded-xl bg-ink p-3.5 text-white" style={d(800)}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-sky">{fr ? 'Ce qu’ils ont écrit' : 'In their words'}</p>
        <p className="mt-1 text-[13px] leading-snug">
          {fr ? '« Rédiger les comptes rendus de réunion client me prend des heures chaque semaine. »' : '“Writing up client meeting notes takes me hours every week.”'}
        </p>
      </div>
    </div>
  );
};

export const ProductStory = ({ lang }: { lang: Lang }) => {
  const fr = lang === 'fr';
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const scenes = [
    { label: fr ? 'Réponses' : 'Answers', el: <SurveyScene lang={lang} /> },
    { label: fr ? 'Point de départ' : 'Starting point', el: <StartScene lang={lang} /> },
    { label: fr ? 'Vos relais' : 'Your people', el: <PeopleScene lang={lang} /> },
    { label: fr ? 'Le plan' : 'The plan', el: <PlanScene lang={lang} /> },
  ];

  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => setI((v) => (v + 1) % scenes.length), SCENE_MS);
    return () => clearTimeout(t);
  }, [i, paused, scenes.length]);

  return (
    <div
      className={cn('relative rounded-2xl bg-card p-4 shadow-[0_24px_60px_-24px_rgba(28,34,45,0.35)] ring-1 ring-border sm:p-5', paused && 'ps-paused')}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div role="tablist" aria-label={fr ? 'Étapes' : 'Steps'} className="grid grid-cols-4 gap-1.5">
        {scenes.map((s, n) => (
          <button
            key={s.label}
            type="button"
            role="tab"
            aria-selected={n === i}
            onClick={() => setI(n)}
            className="group text-left focus-visible:outline-none"
          >
            <span className="block h-1 overflow-hidden rounded-full bg-muted">
              {n < i && <span className="block h-full w-full bg-ink" />}
              {n === i && <span key={`t${i}`} className="ps-timer block h-full bg-ink" style={{ '--t': `${SCENE_MS}ms` } as CSSProperties} />}
            </span>
            <span className={cn('mt-1.5 block truncate text-[11px] font-medium transition-colors', n === i ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground')}>
              {s.label}
            </span>
          </button>
        ))}
      </div>
      <div key={i} role="tabpanel" className="mt-4 min-h-[318px]">
        {scenes[i].el}
      </div>
      <p className="mt-2 text-right text-[10px] uppercase tracking-[0.08em] text-muted-foreground">{fr ? 'Données d’exemple' : 'Example data'}</p>
    </div>
  );
};
