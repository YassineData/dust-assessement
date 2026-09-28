// Demo mode: four fictional Dust rollouts, generated deterministically in the browser.
// Nothing is read from or written to the real database while demo mode is on.

import { V2_QUESTIONS, computeScores, type AnswerValue, type DimensionId } from '@/lib/assessment-v2';

export const DEMO_FLAG = 'dust_demo';

export const isDemoMode = () => {
  try {
    return localStorage.getItem(DEMO_FLAG) === '1';
  } catch {
    return false;
  }
};

interface DemoCompany {
  id: string;
  code: string;
  name: string;
  domain: string;
  employees: number;
  registered: number;
  completedShare: number;
  level: number; // target readiness centre
  offsets: Partial<Record<DimensionId, number>>;
  teams: string[];
  createdAt: string;
  label?: string;
}

// Four companies from 234 to 1,192 employees, one per readiness band.
const COMPANIES: DemoCompany[] = [
  {
    id: 'demo-northwind', code: 'NWLOG234', name: 'Northwind Logistique', domain: 'northwind-logistique.fr',
    employees: 234, registered: 71, completedShare: 0.82, level: 42,
    offsets: { usage: -6, depth: -10, gov: -8, pain: 22, value: -6, team: -4 },
    teams: ['operations', 'sales', 'support', 'finance', 'hr'], createdAt: '2026-08-28T08:00:00Z',
  },
  {
    id: 'demo-bellmont', code: 'BELLM518', name: 'Bellmont Assurances', domain: 'bellmont-assurances.fr',
    employees: 518, registered: 142, completedShare: 0.84, level: 58,
    offsets: { gov: -18, will: 12, depth: -6, reach: 2, pain: 14, value: 4 },
    teams: ['sales', 'support', 'legal', 'data', 'finance', 'operations'], createdAt: '2026-09-02T08:00:00Z',
  },
  {
    id: 'demo-orsay', code: 'ORSAY847', name: 'Orsay Retail', domain: 'orsay-retail.com',
    employees: 847, registered: 203, completedShare: 0.84, level: 71,
    offsets: { usage: 8, team: -12, teach: -6, gov: 4, pain: 10, value: 8 },
    teams: ['marketing', 'sales', 'product', 'engineering', 'success', 'operations'], createdAt: '2026-09-08T08:00:00Z',
  },
  {
    id: 'demo-veloria', code: 'VELOR119', name: 'Veloria Santé', domain: 'veloria-sante.fr',
    employees: 1192, registered: 286, completedShare: 0.85, level: 84,
    offsets: { depth: 6, reach: 4, gov: 10, pain: 4, value: 14 },
    teams: ['engineering', 'data', 'product', 'legal', 'marketing', 'hr', 'success'], createdAt: '2026-09-12T08:00:00Z',
  },
  {
    // Earlier pilot at the same client: lets the demo compare two rollouts of one account.
    id: 'demo-veloria-pilot', code: 'VELOPIL1', name: 'Veloria Santé', domain: 'veloria-sante.fr',
    employees: 1192, registered: 96, completedShare: 0.9, level: 60, label: 'Dust pilot · spring 2026',
    offsets: { depth: -6, reach: -4, gov: -12, pain: 10, value: 2 },
    teams: ['engineering', 'data', 'product'], createdAt: '2026-04-14T08:00:00Z',
  },
];

const TEAM_LABEL_EN: Record<string, string> = {
  sales: 'Sales / Revenue', marketing: 'Marketing', support: 'Customer Support', success: 'Customer Success',
  product: 'Product', engineering: 'Engineering', data: 'Data', finance: 'Finance', legal: 'Legal',
  hr: 'HR / People', operations: 'Operations', other: 'Other',
};

const FIRST = ['Camille', 'Hugo', 'Léa', 'Nathan', 'Chloé', 'Lucas', 'Inès', 'Louis', 'Manon', 'Jules', 'Sarah', 'Adam', 'Emma', 'Tom', 'Jade', 'Gabriel', 'Louise', 'Arthur', 'Alice', 'Raphaël', 'Lina', 'Paul', 'Rose', 'Victor', 'Anna', 'Maël', 'Julia', 'Noah', 'Zoé', 'Ethan', 'Clara', 'Sacha', 'Mila', 'Théo', 'Lou', 'Nina', 'Samuel', 'Eva', 'Karim', 'Yasmine', 'Mehdi', 'Sofia', 'Antoine', 'Margaux', 'Baptiste', 'Élise', 'Quentin', 'Pauline'];
const LAST = ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier', 'Morel', 'Girard', 'André', 'Mercier', 'Dupont', 'Lambert', 'Bonnet', 'François', 'Martinez', 'Legrand', 'Garnier', 'Faure', 'Rousseau', 'Blanc', 'Guerin', 'Muller', 'Henry', 'Roussel', 'Nicolas', 'Perrin', 'Morin', 'Mathieu', 'Clement', 'Gauthier', 'Dumont', 'Lopez', 'Fontaine', 'Chevalier'];

const OPEN_POOL = {
  timeSink: [
    'Préparer les comptes rendus de réunions clients',
    'Chercher la bonne version d’un document dans nos drives',
    'Répondre aux mêmes questions internes sur les process',
    'Mettre en forme les reportings hebdomadaires',
    'Relancer les équipes pour obtenir des chiffres',
    'Qualifier les demandes entrantes avant de les router',
  ],
  useCase: [
    'Un assistant qui rédige le compte rendu et les prochaines étapes après chaque appel',
    'Un agent qui répond aux questions RH à partir de notre base documentaire',
    'Résumer les tickets support et proposer une réponse',
    'Préparer une première version des appels d’offres',
    'Analyser les retours clients et sortir les tendances du mois',
    'Générer les fiches produit à partir des specs',
  ],
  valueOwner: ['Toute l’équipe commerciale', 'Le support niveau 1', 'Les managers opérationnels', 'L’équipe juridique', 'Le marketing produit'],
  success: [
    'Gagner une demi-journée par semaine sur le reporting',
    'Que les nouveaux arrivants trouvent l’info seuls',
    'Réduire le délai de réponse aux clients',
    'Que chaque équipe ait au moins un agent utilisé tous les jours',
  ],
  blocker: [
    'Ne pas savoir ce que j’ai le droit d’y mettre comme données',
    'Le manque de temps pour apprendre',
    'Des réponses pas assez fiables au début',
    'Un outil de plus à ouvrir',
  ],
};

const BASE_OFFSET: Partial<Record<DimensionId, number>> = { teach: -38, reach: -12, depth: -6, will: 0 };

const A: AnswerValue[] = ['disagree', 'somewhatDisagree', 'neutral', 'somewhatAgree', 'agree'];

// Small deterministic PRNG so the demo is identical on every load.
const mulberry32 = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const gauss = (rnd: () => number) => {
  const u = Math.max(rnd(), 1e-9);
  const v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};
const pickOne = <T,>(rnd: () => number, xs: T[]) => xs[Math.floor(rnd() * xs.length)];
const pickSome = <T,>(rnd: () => number, xs: T[], n: number) => {
  const pool = [...xs];
  const out: T[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  return out;
};
const slug = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');

type Row = Record<string, unknown>;

let cache: { campaigns: Row[]; participants: Row[] } | null = null;

export const DEMO_CODES = COMPANIES.map((c) => c.code);

export const getDemoData = () => {
  if (cache) return cache;
  const campaigns: Row[] = COMPANIES.map((c) => ({
    id: c.id,
    code: c.code,
    company_name: c.name,
    campaign_name: c.label ?? `Dust rollout · ${c.employees.toLocaleString('en-US')} employees`,
    creator_email: 'demo@dust.tt',
    creator_first_name: 'Dust',
    creator_last_name: 'Demo',
    created_at: c.createdAt,
    assessment_type: 'generic',
    language: 'en',
  }));

  const participants: Row[] = [];
  COMPANIES.forEach((c, ci) => {
    const rnd = mulberry32(1000 + ci * 7919);
    const used = new Set<string>();
    for (let i = 0; i < c.registered; i++) {
      let first = pickOne(rnd, FIRST);
      let last = pickOne(rnd, LAST);
      let guard = 0;
      while (used.has(`${first} ${last}`) && guard++ < 20) {
        first = pickOne(rnd, FIRST);
        last = pickOne(rnd, LAST);
      }
      used.add(`${first} ${last}`);

      const r = rnd();
      const status = r < c.completedShare ? 'completed' : r < c.completedShare + 0.09 ? 'in_progress' : 'not_started';

      // Latent readiness for this person, plus a few clear archetypes so every class appears.
      const personal = c.level + gauss(rnd) * 11;
      const archetype = rnd();
      const target: Record<string, number> = {};
      V2_QUESTIONS.forEach((q) => {
        if (target[q.dimension] !== undefined) return;
        // Teaching posture and reach are rarer than usage everywhere; each dimension varies per person.
        const base = BASE_OFFSET[q.dimension] ?? 0;
        let t = personal + base + (c.offsets[q.dimension] ?? 0) + gauss(rnd) * 14;
        if (archetype < 0.07 && ['teach', 'will', 'depth'].includes(q.dimension)) t += q.dimension === 'teach' ? 48 : 18;
        else if (archetype < 0.13 && ['reach', 'depth'].includes(q.dimension)) t += 20;
        else if (archetype < 0.18 && ['gov', 'team', 'reach'].includes(q.dimension)) t += 20;
        else if (archetype < 0.26 && q.dimension === 'will') t += 20;
        else if (archetype < 0.26 && q.dimension === 'depth') t -= 22;
        else if (archetype > 0.93 && ['will', 'usage'].includes(q.dimension)) t -= 26;
        target[q.dimension] = Math.max(2, Math.min(98, t));
      });
      const answers: Record<string, AnswerValue> = {};
      V2_QUESTIONS.forEach((q) => {
        let v = 1 + target[q.dimension] / 25 + gauss(rnd) * 0.55;
        if (q.reverse) v = 6 - v;
        answers[q.id] = A[Math.max(0, Math.min(4, Math.round(v) - 1))];
      });

      const team = pickOne(rnd, c.teams);
      const wantsToTrain = target.teach > 55 ? rnd() < 0.8 : rnd() < 0.15;
      const context = {
        team,
        level: pickOne(rnd, ['ic', 'ic', 'ic', 'lead', 'manager', 'manager', 'director', 'exec']),
        bandwidth: target.teach > 60 ? pickOne(rnd, ['1to3h', 'halfday', 'lt1h']) : pickOne(rnd, ['none', 'lt1h', 'lt1h', '1to3h']),
        tools: pickSome(rnd, ['chatgpt', 'claude', 'copilot', 'gemini', 'dust', 'inhouse', 'personal'], 1 + Math.floor(rnd() * 3)),
        rolloutRole: [
          'use',
          ...(target.depth > 60 ? ['build'] : []),
          ...(wantsToTrain ? ['train'] : []),
          ...(target.gov > 65 && rnd() < 0.5 ? ['govern'] : []),
        ],
        expectedValue: pickSome(rnd, ['time', 'workflow', 'quality', 'knowledge', 'crossteam', 'govern'], 1 + Math.floor(rnd() * 3)),
      };
      const open = rnd() < 0.7
        ? {
            timeSink: pickOne(rnd, OPEN_POOL.timeSink),
            useCase: pickOne(rnd, OPEN_POOL.useCase),
            valueOwner: pickOne(rnd, OPEN_POOL.valueOwner),
            success: pickOne(rnd, OPEN_POOL.success),
            blocker: pickOne(rnd, OPEN_POOL.blocker),
          }
        : {};

      const completedAt = new Date(new Date(c.createdAt).getTime() + (1 + rnd() * 18) * 86400000).toISOString();
      const scores = computeScores(answers);
      participants.push({
        id: `${c.id}-p${i}`,
        campaign_id: c.id,
        first_name: first,
        last_name: last,
        email: `${slug(first)}.${slug(last)}@${c.domain}`,
        company_name: c.name,
        team: status === 'not_started' ? null : TEAM_LABEL_EN[team],
        status,
        global_score: status === 'completed' ? scores.readiness : null,
        item_scores: status === 'completed' ? scores : null,
        responses: status === 'not_started' ? null : { version: 2, answers: status === 'completed' ? answers : {}, context, open: status === 'completed' ? open : {} },
        profile: null,
        started_at: c.createdAt,
        completed_at: status === 'completed' ? completedAt : null,
        created_at: c.createdAt,
        updated_at: completedAt,
      });
    }
  });

  cache = { campaigns, participants };
  return cache;
};

/** Switch the app to demo mode (reloads the page onto the console). */
export const enterDemo = () => {
  const campaigns = getDemoCampaignList();
  const first = campaigns[0];
  try {
    localStorage.setItem(DEMO_FLAG, '1');
    localStorage.setItem('dashboard_session_v2', JSON.stringify({
      access: { campaignId: first.id, companyName: first.company_name, creatorEmail: 'demo@dust.tt', campaignCode: first.code },
      lastActivity: Date.now(),
      isAdmin: true,
      isSuperAdmin: true,
      allCampaigns: campaigns,
    }));
  } catch {
    return;
  }
  window.location.href = '/dashboard';
};

export const getDemoCampaignList = () =>
  getDemoData().campaigns.map((c) => ({
    id: c.id as string,
    code: c.code as string,
    company_name: c.company_name as string,
    campaign_name: c.campaign_name as string,
    creator_email: c.creator_email as string,
    created_at: c.created_at as string,
  }));

/* ------------------------------------------------------------------ */
/* Fetch interceptor for Supabase REST calls                            */
/* ------------------------------------------------------------------ */

const matchFilter = (row: Row, key: string, raw: string) => {
  const dot = raw.indexOf('.');
  if (dot < 0) return true;
  const op = raw.slice(0, dot);
  const val = decodeURIComponent(raw.slice(dot + 1));
  const cell = row[key];
  switch (op) {
    case 'eq':
      return String(cell).toLowerCase() === val.toLowerCase();
    case 'neq':
      return String(cell).toLowerCase() !== val.toLowerCase();
    case 'in': {
      const list = val.replace(/^\(|\)$/g, '').split(',').map((s) => s.replace(/^"|"$/g, '').toLowerCase());
      return list.includes(String(cell).toLowerCase());
    }
    case 'ilike':
    case 'like': {
      const re = new RegExp('^' + val.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/[%*]/g, '.*') + '$', 'i');
      return re.test(String(cell ?? ''));
    }
    case 'is':
      return val === 'null' ? cell === null || cell === undefined : String(cell) === val;
    default:
      return true;
  }
};

const RESERVED = new Set(['select', 'order', 'limit', 'offset', 'on_conflict', 'columns']);

export const installDemoInterceptor = () => {
  const realFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (!url.includes('/rest/v1/')) return realFetch(input, init);

    const path = url.split('/rest/v1/')[1].split('?')[0];
    const method = (init?.method || 'GET').toUpperCase();
    const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
      new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...extra } });

    if (path.startsWith('rpc/')) return json('DEMO' + Math.random().toString(36).slice(2, 6).toUpperCase());

    const data = getDemoData();
    let rows: Row[] = path === 'participants' ? data.participants : path === 'campaigns' ? data.campaigns : [];
    const params = new URL(url).searchParams;
    params.forEach((v, k) => {
      if (!RESERVED.has(k)) rows = rows.filter((r) => matchFilter(r, k, v));
    });

    const accept = new Headers(init?.headers).get('Accept') || '';
    const single = accept.includes('vnd.pgrst.object');

    // Writes are accepted and ignored: demo mode never touches the database.
    if (method === 'POST') return json(single ? { id: 'demo-new' } : [{ id: 'demo-new' }], 201);
    if (method !== 'GET' && method !== 'HEAD') return new Response(null, { status: 204 });

    const range = new Headers(init?.headers).get('Range');
    let slice = rows;
    if (range) {
      const [a, b] = range.split('-').map(Number);
      slice = rows.slice(a, b + 1);
    }
    return json(single ? slice[0] ?? null : slice, 200, { 'Content-Range': `0-${Math.max(0, slice.length - 1)}/${rows.length}` });
  };
};
