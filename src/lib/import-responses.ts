import {
  AnswerValue,
  CONTEXT_FIELDS,
  DIMENSIONS,
  DimensionId,
  READINESS_DIMENSION_IDS,
  ContextAnswers,
  OPEN_FIELDS,
  OpenAnswers,
  V2_QUESTIONS,
  computeScores,
} from '@/lib/assessment-v2';

/* ------------------------------------------------------------------ */
/* Reading the file: CSV/TSV or .xlsx (Google Sheets / Forms export)    */
/* ------------------------------------------------------------------ */

export interface Table {
  headers: string[];
  rows: string[][];
}

const parseDelimited = (text: string): string[][] => {
  const firstLine = text.slice(0, text.indexOf('\n') > 0 ? text.indexOf('\n') : text.length);
  const delim = ['\t', ';', ','].reduce((best, d) => (firstLine.split(d).length > firstLine.split(best).length ? d : best), ',');
  const out: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell === '') quoted = true;
    else if (ch === delim) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      out.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    out.push(row);
  }
  return out;
};

/** Minimal .xlsx reader (zip + XML), so no spreadsheet library is needed. Reads the first sheet. */
const readXlsx = async (buf: ArrayBuffer): Promise<string[][]> => {
  const v = new DataView(buf);
  const bytes = new Uint8Array(buf);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 66000); i--) {
    if (v.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('not_xlsx');
  const count = v.getUint16(eocd + 10, true);
  let p = v.getUint32(eocd + 16, true);
  const entries = new Map<string, { method: number; size: number; offset: number }>();
  const dec = new TextDecoder();
  for (let k = 0; k < count; k++) {
    const method = v.getUint16(p + 10, true);
    const size = v.getUint32(p + 20, true);
    const nameLen = v.getUint16(p + 28, true);
    const extraLen = v.getUint16(p + 30, true);
    const commentLen = v.getUint16(p + 32, true);
    const offset = v.getUint32(p + 42, true);
    entries.set(dec.decode(bytes.subarray(p + 46, p + 46 + nameLen)), { method, size, offset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  const read = async (name: string) => {
    const e = entries.get(name);
    if (!e) return null;
    const start = e.offset + 30 + v.getUint16(e.offset + 26, true) + v.getUint16(e.offset + 28, true);
    const data = bytes.slice(start, start + e.size);
    if (e.method === 0) return dec.decode(data);
    const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return await new Response(stream).text();
  };
  const xml = (s: string) => new DOMParser().parseFromString(s, 'application/xml');

  const shared: string[] = [];
  const ss = await read('xl/sharedStrings.xml');
  if (ss) xml(ss).querySelectorAll('si').forEach((si) => shared.push([...si.querySelectorAll('t')].map((t) => t.textContent ?? '').join('')));

  const sheetName = entries.has('xl/worksheets/sheet1.xml')
    ? 'xl/worksheets/sheet1.xml'
    : [...entries.keys()].filter((n) => n.startsWith('xl/worksheets/') && n.endsWith('.xml')).sort()[0];
  const sheet = sheetName ? await read(sheetName) : null;
  if (!sheet) throw new Error('no_sheet');

  const colIndex = (ref: string) => {
    const letters = ref.replace(/\d+/g, '');
    let n = 0;
    for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
    return n - 1;
  };
  const out: string[][] = [];
  xml(sheet).querySelectorAll('sheetData > row').forEach((r) => {
    const row: string[] = [];
    r.querySelectorAll('c').forEach((c) => {
      const t = c.getAttribute('t');
      const val = t === 'inlineStr' ? c.querySelector('is')?.textContent ?? '' : c.querySelector('v')?.textContent ?? '';
      row[colIndex(c.getAttribute('r') || 'A')] = t === 's' ? shared[Number(val)] ?? '' : val;
    });
    out.push(Array.from(row, (x) => x ?? ''));
  });
  return out;
};

export const readTable = async (file: File): Promise<Table> => {
  const grid = /\.xlsx$/i.test(file.name) ? await readXlsx(await file.arrayBuffer()) : parseDelimited(await file.text());
  const clean = grid.filter((r) => r.some((c) => (c ?? '').trim() !== ''));
  if (clean.length < 2) throw new Error('empty');
  const width = Math.max(...clean.map((r) => r.length));
  const pad = (r: string[]) => Array.from({ length: width }, (_, i) => (r[i] ?? '').trim());
  return { headers: pad(clean[0]), rows: clean.slice(1).map(pad) };
};

/* ------------------------------------------------------------------ */
/* Matching columns to the survey                                       */
/* ------------------------------------------------------------------ */

export type Target =
  | 'ignore'
  | 'custom'
  | `dim:${string}`
  | 'email'
  | 'fullName'
  | 'firstName'
  | 'lastName'
  | 'submittedAt'
  | `ctx:${string}`
  | `open:${string}`
  | `q:${string}`;

export const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const STOP = new Set(['the', 'and', 'for', 'you', 'your', 'are', 'les', 'des', 'que', 'qui', 'une', 'pour', 'dans', 'est', 'with', 'what', 'which', 'this', 'that', 'vous', 'votre', 'pas']);
const tokens = (s: string) => new Set(norm(s).split(' ').filter((w) => w.length > 2 && !STOP.has(w)));
const similarity = (a: string, b: string) => {
  const A = tokens(a);
  const B = tokens(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  A.forEach((w) => B.has(w) && inter++);
  return (2 * inter) / (A.size + B.size);
};

const CTX_HINTS: Record<string, RegExp> = {
  team: /\b(team|equipe|department|departement|service|function)\b/,
  level: /\b(level|niveau|seniority|grade)\b/,
  bandwidth: /\b(bandwidth|time you could give|temps que vous pourriez)\b/,
  tools: /\b(ai tools|outils d ia|tools you use|outils)\b/,
  rolloutRole: /\b(role|rôle)\b.*\b(rollout|deploiement|play|jouer)\b/,
  expectedValue: /\b(outcome|outcomes|benefit|resultat|valeur)\b/,
};

/** Best guess for each column. Every guess can be changed by hand before importing. */
export const guessTargets = (headers: string[]): Target[] => {
  const used = new Map<string, { col: number; score: number }>();
  const guesses: Target[] = headers.map(() => 'ignore');

  headers.forEach((h, i) => {
    // Google Forms grids export as "Question [statement]": match on the statement.
    const inner = h.match(/\[(.+)\]\s*$/)?.[1] ?? h;
    const n = norm(h);
    let best: { t: Target; score: number } = { t: 'ignore', score: 0 };
    const offer = (t: Target, score: number) => {
      if (score > best.score) best = { t, score };
    };

    if (/\b(timestamp|horodateur|submitted|date)\b/.test(n)) offer('submittedAt', 1);
    if (/\b(e mail|email|mail|courriel)\b/.test(n)) offer('email', 1);
    if (/\b(first name|prenom|given name)\b/.test(n)) offer('firstName', 1);
    else if (/\b(last name|surname|nom de famille|family name)\b/.test(n)) offer('lastName', 1);
    else if (/\b(full name|nom complet|your name|name|nom)\b/.test(n) && !/\b(team|company|entreprise|tool|outil)\b/.test(n)) offer('fullName', 0.9);

    V2_QUESTIONS.forEach((q) => offer(`q:${q.id}`, Math.max(similarity(inner, q.text.en), similarity(inner, q.text.fr))));
    CONTEXT_FIELDS.forEach((f) => {
      const s = Math.max(similarity(h, f.label.en), similarity(h, f.label.fr));
      offer(`ctx:${f.id}`, CTX_HINTS[f.id]?.test(n) ? Math.max(s, 0.7) : s);
    });
    OPEN_FIELDS.forEach((f) => offer(`open:${f.id}`, Math.max(similarity(h, f.label.en), similarity(h, f.label.fr))));

    // Anything else is the form's own question: imported as is and shown in the console.
    if (best.score < 0.5) {
      guesses[i] = 'custom';
      return;
    }
    // One column per survey item: keep the closest match.
    const prev = used.get(best.t);
    if (prev && prev.score >= best.score) return;
    if (prev) guesses[prev.col] = 'custom';
    used.set(best.t, { col: i, score: best.score });
    guesses[i] = best.t;
  });
  return guesses;
};

/* ------------------------------------------------------------------ */
/* Converting values                                                    */
/* ------------------------------------------------------------------ */

const LIKERT: AnswerValue[] = ['disagree', 'somewhatDisagree', 'neutral', 'somewhatAgree', 'agree'];

/** Numbers are read on the column's own scale (1–5, 1–7, 0–10…) and brought back to 1–5. */
const likertFromText = (raw: string, range: { min: number; max: number }): AnswerValue | undefined => {
  const s = norm(raw);
  if (!s) return undefined;
  const num = s.match(/^(\d+(?:\.\d+)?)/);
  if (num) {
    const v = Number(num[1]);
    const scaled = range.max <= 5 && range.min >= 1 ? Math.round(v) : Math.round(1 + ((v - range.min) / (range.max - range.min)) * 4);
    return LIKERT[Math.min(5, Math.max(1, scaled)) - 1];
  }
  if (/(strongly|totally|completely|tout a fait|pas du tout|fortement)/.test(s)) {
    return /(disagree|desaccord|pas du tout|not at all)/.test(s) ? 'disagree' : 'agree';
  }
  if (/(neutral|neither|neutre|ni d accord|sans avis)/.test(s)) return 'neutral';
  if (/(disagree|desaccord|plutot pas|pas d accord)/.test(s)) return 'somewhatDisagree';
  if (/(agree|d accord|plutot)/.test(s)) return 'somewhatAgree';
  return undefined;
};

const choice = (fieldId: string, raw: string): { value?: string | string[]; other?: string } => {
  const f = CONTEXT_FIELDS.find((x) => x.id === fieldId);
  if (!f || !raw.trim()) return {};
  let rest = ` ${norm(raw)} `;
  const picked: string[] = [];
  // Longest labels first so "Personal use only, nothing at work" wins over shorter overlaps.
  [...f.options]
    .filter((o) => o.id !== 'other')
    .sort((a, b) => b.label.en.length - a.label.en.length)
    .forEach((o) => {
      for (const label of [o.label.en, o.label.fr]) {
        const l = ` ${norm(label)} `;
        if (l.trim() && rest.includes(l)) {
          picked.push(o.id);
          rest = rest.replace(l, ' ');
          break;
        }
      }
    });
  const leftover = rest.replace(/\b(other|autre)\b/g, ' ').trim();
  if (f.multiple) {
    if (leftover) picked.push('other');
    return { value: picked, other: leftover ? raw.trim() : undefined };
  }
  if (picked.length) return { value: picked[0] };
  return { value: 'other', other: raw.trim() };
};

const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

const SLASH_DATE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/;

/** "10/1/2026" is 1 October in an English export and 10 January in a French one: decided once per column. */
const dayFirst = (values: string[], header: string) => {
  for (const v of values) {
    const m = v.match(SLASH_DATE);
    if (m && Number(m[1]) > 12) return true;
    if (m && Number(m[2]) > 12) return false;
  }
  return /horodateur|date de|soumis/.test(norm(header));
};

const toDate = (raw: string, dmy: boolean): string | null => {
  if (!raw) return null;
  const n = Number(raw);
  if (Number.isFinite(n) && n > 20000 && n < 80000) return new Date((n - 25569) * 86400000).toISOString();
  const m = raw.match(SLASH_DATE);
  if (m) {
    const [day, month] = dmy ? [m[1], m[2]] : [m[2], m[1]];
    const d = new Date(Number(m[3]), Number(month) - 1, Number(day), Number(m[4] ?? 0), Number(m[5] ?? 0), Number(m[6] ?? 0));
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

export interface ImportRow {
  first_name: string;
  last_name: string;
  email: string;
  answered: number;
  complete: boolean;
  hasEmail: boolean;
  record: Record<string, unknown>;
}

/** Share of the 26 statements a row must answer to be scored like a finished survey. */
export const COMPLETE_SHARE = 0.8;

export const buildRows = (table: Table, targets: Target[], campaignId: string, companyName: string): ImportRow[] => {
  const col = (t: Target) => targets.indexOf(t);
  const qCols = targets.map((t, i) => (t.startsWith('q:') || t.startsWith('dim:') ? i : -1)).filter((i) => i >= 0);
  const colKey = (i: number) => `x:${norm(table.headers[i] || `column ${i + 1}`).replace(/ /g, '_').slice(0, 60)}`;
  const dims: Record<string, DimensionId> = {};
  targets.forEach((t, i) => {
    if (t.startsWith('dim:')) dims[colKey(i)] = t.slice(4) as DimensionId;
  });
  const rangeByCol = new Map<number, { min: number; max: number }>();
  qCols.forEach((i) => {
    const nums = table.rows.map((r) => parseFloat(r[i])).filter((n) => Number.isFinite(n));
    rangeByCol.set(i, { min: nums.some((n) => n === 0) ? 0 : 1, max: nums.length ? Math.max(5, ...nums) : 5 });
  });

  const dateCol = col('submittedAt');
  const dmy = dateCol >= 0 ? dayFirst(table.rows.map((r) => r[dateCol] ?? ''), table.headers[dateCol]) : true;
  const seen = new Set<string>();
  const out: ImportRow[] = [];
  table.rows.forEach((r, idx) => {
    const get = (t: Target) => (col(t) >= 0 ? r[col(t)] ?? '' : '');
    let first = get('firstName');
    let last = get('lastName');
    if (!first && !last && get('fullName')) {
      const parts = get('fullName').split(/\s+/);
      first = parts.shift() ?? '';
      last = parts.join(' ');
    }
    const rawEmail = get('email').toLowerCase().trim();
    const hasEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail);
    if (!first && !last && hasEmail) {
      const [a, b] = rawEmail.split('@')[0].split(/[._-]/);
      first = titleCase(a ?? '');
      last = titleCase(b ?? '');
    }
    const email = hasEmail ? rawEmail : `import-${idx + 1}-${norm(`${first} ${last}`).replace(/ /g, '.') || 'anonymous'}@no-email.invalid`;
    if (seen.has(email)) return;
    seen.add(email);

    const answers: Record<string, AnswerValue> = {};
    qCols.forEach((i) => {
      const a = likertFromText(r[i] ?? '', rangeByCol.get(i) ?? { min: 1, max: 5 });
      if (a) answers[targets[i].startsWith('q:') ? targets[i].slice(2) : colKey(i)] = a;
    });
    const context: ContextAnswers = {};
    const other: Record<string, string> = {};
    targets.forEach((t, i) => {
      if (!t.startsWith('ctx:')) return;
      const id = t.slice(4);
      const { value, other: o } = choice(id, r[i] ?? '');
      if (value && (!Array.isArray(value) || value.length)) (context as Record<string, unknown>)[id] = value;
      if (o) other[id] = o;
    });
    if (Object.keys(other).length) context.other = other;
    const open: OpenAnswers = {};
    targets.forEach((t, i) => {
      if (t.startsWith('open:') && r[i]) (open as Record<string, string>)[t.slice(5)] = r[i];
    });
    // The form's own questions are kept as asked and shown in the console.
    const custom: Record<string, string> = {};
    targets.forEach((t, i) => {
      if ((t === 'custom' || t.startsWith('dim:')) && r[i]) custom[table.headers[i] || `Column ${i + 1}`] = r[i];
    });

    const answered = Object.keys(answers).length;
    const ours = Object.keys(answers).filter((k) => !k.startsWith('x:')).length;
    // Scored when most of our statements are there, or when the form's own scored questions cover every readiness dimension.
    const covered = new Set<string>([
      ...V2_QUESTIONS.filter((q) => answers[q.id]).map((q) => q.dimension),
      ...Object.keys(answers).filter((k) => dims[k]).map((k) => dims[k]),
    ]);
    const complete = ours >= Math.ceil(V2_QUESTIONS.length * COMPLETE_SHARE) || READINESS_DIMENSION_IDS.every((d) => covered.has(d));
    const scores = computeScores(answers, context, dims);
    const teamId = context.team as string | undefined;
    const teamLabel = teamId === 'other' ? other.team : CONTEXT_FIELDS.find((f) => f.id === 'team')?.options.find((o) => o.id === teamId)?.label.en;
    const when = toDate(get('submittedAt'), dmy) ?? new Date().toISOString();

    out.push({
      first_name: first || 'Anonymous',
      last_name: last,
      email,
      answered,
      complete,
      hasEmail,
      record: {
        campaign_id: campaignId,
        first_name: first || 'Anonymous',
        last_name: last || '',
        email,
        company_name: companyName,
        team: teamLabel ? teamLabel.slice(0, 120) : null,
        status: complete ? 'completed' : 'in_progress',
        responses: { version: 2, answers, context, open, custom, dims, source: 'import' },
        item_scores: answered ? scores : null,
        global_score: complete ? scores.readiness : null,
        profile: null,
        started_at: when,
        completed_at: complete ? when : null,
      },
    });
  });
  return out;
};

export const targetLabel = (t: Target): string => {
  if (t === 'ignore') return 'Do not import';
  if (t === 'custom') return 'Own question · shown in the console';
  if (t.startsWith('dim:')) return `Own question · scored as ${DIMENSIONS.find((d) => d.id === t.slice(4))?.name.en ?? t}`;
  if (t === 'email') return 'Email';
  if (t === 'fullName') return 'Full name';
  if (t === 'firstName') return 'First name';
  if (t === 'lastName') return 'Last name';
  if (t === 'submittedAt') return 'Submitted at';
  if (t.startsWith('ctx:')) return `About you · ${CONTEXT_FIELDS.find((f) => f.id === t.slice(4))?.label.en ?? t}`;
  if (t.startsWith('open:')) return `Open · ${OPEN_FIELDS.find((f) => f.id === t.slice(5))?.label.en ?? t}`;
  const q = V2_QUESTIONS.find((x) => x.id === t.slice(2));
  return q ? `${q.id} · ${q.text.en}` : t;
};

export const ALL_TARGETS: Target[] = [
  'custom',
  ...DIMENSIONS.map((d) => `dim:${d.id}` as Target),
  'ignore',
  'email',
  'fullName',
  'firstName',
  'lastName',
  'submittedAt',
  ...CONTEXT_FIELDS.map((f) => `ctx:${f.id}` as Target),
  ...OPEN_FIELDS.map((f) => `open:${f.id}` as Target),
  ...V2_QUESTIONS.map((q) => `q:${q.id}` as Target),
];
